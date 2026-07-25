// Reconhecimento facial NO APARELHO (a promessa do app: IA local, sem subir foto).
//
// Pipeline por foto: detecta rostos (ML Kit) → recorta cada rosto e redimensiona p/ 160×160
// (image-manipulator) → decodifica os pixels (jpeg-js) → normaliza → embedding 512-dim
// (FaceNet via TFLite) → L2-normaliza. Depois agrupa embeddings por similaridade (clustering
// guloso) = "mesma pessoa".
//
// DEFENSIVO de propósito: cada foto roda em try/catch; uma que falhe é pulada, não derruba o
// lote. Se o modelo/nativo não carregar neste aparelho, `prepararModelo` lança e a tela mostra
// erro honesto — o resto do app não é afetado.
import * as MediaLibrary from "expo-media-library/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { loadTensorflowModel, type TensorflowModel } from "react-native-fast-tflite";
import jpeg from "jpeg-js";

const TAM = 160;                 // entrada do FaceNet (160×160×3)
const LIMIAR = 0.62;             // similaridade de cosseno p/ "mesma pessoa" (FaceNet L2-norm)
const MIN_FOTOS_PESSOA = 2;      // um "grupo" só vira pessoa se aparece em ≥2 fotos
export const TETO_ANALISE = 400; // v1: analisa as N fotos mais recentes (com progresso)

export type Pessoa = { id: number; qtd: number; thumbUri: string; fotoIds: string[] };
export type ProgressoPessoas = { feitas: number; total: number };

let modelo: TensorflowModel | null = null;

/** Carrega o FaceNet uma vez. Lança se o nativo/modelo não estiver disponível no aparelho. */
export async function prepararModelo(): Promise<void> {
  if (!modelo) {
    // require do asset .tflite (registrado no metro.config.js). 'default' = delegate de CPU
    // (sem GPU/NNAPI) — mais compatível entre aparelhos; velocidade é aceitável p/ o teto de fotos.
    // delegates: [] = delegate padrão de CPU (mais compatível entre aparelhos). GPU/NNAPI
    // acelera mas não funciona em todo modelo — CPU é a escolha segura p/ o v1.
    modelo = await loadTensorflowModel(require("../../assets/models/facenet_512.tflite"), []);
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ParaBytes(b64: string): Uint8Array {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i]), b = B64.indexOf(s[i + 1]), c = B64.indexOf(s[i + 2]), d = B64.indexOf(s[i + 3]);
    out[p++] = (a << 2) | (b >> 4);
    if (c >= 0 && s[i + 2] !== undefined) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0 && s[i + 3] !== undefined) out[p++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, p);
}

/** Recorta o rosto, redimensiona 160×160 e devolve o tensor de entrada normalizado. */
async function faceParaTensor(uri: string, frame: { left: number; top: number; width: number; height: number }): Promise<Float32Array | null> {
  try {
    const r = await ImageManipulator.manipulateAsync(
      uri,
      [
        { crop: { originX: Math.max(0, frame.left), originY: Math.max(0, frame.top), width: frame.width, height: frame.height } },
        { resize: { width: TAM, height: TAM } },
      ],
      { base64: true, compress: 1, format: ImageManipulator.SaveFormat.JPEG },
    );
    if (!r.base64) return null;
    const { data } = jpeg.decode(base64ParaBytes(r.base64), { useTArray: true });
    const t = new Float32Array(TAM * TAM * 3);
    for (let i = 0, j = 0; i < data.length; i += 4) {
      t[j++] = (data[i] - 127.5) / 128;      // R
      t[j++] = (data[i + 1] - 127.5) / 128;  // G
      t[j++] = (data[i + 2] - 127.5) / 128;  // B
    }
    return t;
  } catch {
    return null;
  }
}

function l2(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const o = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) o[i] = v[i] / n;
  return o;
}
function cos(a: Float32Array, b: Float32Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d; // já normalizados → produto interno = cosseno
}

type Cluster = { centro: Float32Array; soma: Float32Array; qtd: number; thumbUri: string; fotos: Set<string> };

/**
 * Roda o reconhecimento nas fotos mais recentes e devolve as pessoas (grupos com ≥2 fotos).
 * `fotos` = lista da galeria (id + uri). `aoProgredir` reporta o andamento.
 */
export async function reconhecerPessoas(
  fotos: { id: string; uri: string }[],
  aoProgredir?: (p: ProgressoPessoas) => void,
): Promise<Pessoa[]> {
  await prepararModelo();
  const alvo = fotos.slice(0, TETO_ANALISE);
  const clusters: Cluster[] = [];

  for (let i = 0; i < alvo.length; i++) {
    aoProgredir?.({ feitas: i, total: alvo.length });
    const f = alvo[i];
    try {
      // ML Kit precisa de file:// — resolve o localUri (content:// não é lido de forma confiável)
      const info = await MediaLibrary.getAssetInfoAsync(f.id);
      const src = info.localUri || info.uri || f.uri;
      const faces = await FaceDetection.detect(src, { performanceMode: "fast", landmarkMode: "none", contourMode: "none" });
      for (const face of faces) {
        const fr = face.frame;
        if (!fr || fr.width < 40 || fr.height < 40) continue; // rosto pequeno demais = ruído
        const tensor = await faceParaTensor(src, fr);
        if (!tensor) continue;
        // run recebe/devolve ArrayBuffer[]. Entrada = o buffer do tensor; saída = 512 floats.
        const outBuf = (await modelo!.run([tensor.buffer as ArrayBuffer]))[0];
        const emb = l2(new Float32Array(outBuf));
        // atribui ao cluster mais parecido, ou cria novo
        let melhor = -1, best = LIMIAR;
        for (let c = 0; c < clusters.length; c++) {
          const sim = cos(emb, clusters[c].centro);
          if (sim > best) { best = sim; melhor = c; }
        }
        if (melhor >= 0) {
          const cl = clusters[melhor];
          for (let k = 0; k < emb.length; k++) cl.soma[k] += emb[k];
          cl.qtd++;
          cl.centro = l2(cl.soma);
          cl.fotos.add(f.id);
        } else {
          clusters.push({ centro: emb, soma: Float32Array.from(emb), qtd: 1, thumbUri: f.uri, fotos: new Set([f.id]) });
        }
      }
    } catch {
      // foto problemática → pula
    }
  }
  aoProgredir?.({ feitas: alvo.length, total: alvo.length });

  return clusters
    .filter((c) => c.fotos.size >= MIN_FOTOS_PESSOA)
    .sort((a, b) => b.fotos.size - a.fotos.size)
    .map((c, i) => ({ id: i + 1, qtd: c.fotos.size, thumbUri: c.thumbUri, fotoIds: [...c.fotos] }));
}
