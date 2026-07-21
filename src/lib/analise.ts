import * as MediaLibrary from "expo-media-library/legacy";
import * as FileSystem from "expo-file-system/legacy";
import type { DevicePhoto } from "./devicephotos";

/**
 * Análises REAIS da galeria — sem número inventado.
 *
 * As telas de ferramenta mostravam estatísticas fixas no código ("1.284 lixo detectado",
 * "42 grupos de duplicatas"). Nada disso era medido: era maquete. Aqui as contas saem dos
 * arquivos do próprio aparelho. Quando algo não dá pra medir de verdade, a tela diz que
 * está em desenvolvimento em vez de inventar.
 */

/**
 * Carrega fotos para ANALISE, paginando a galeria inteira ate `max`.
 *
 * Por que nao usar a lista do DevicePhotosProvider: aquela lista e paginada para a UI (90 por
 * vez, cresce conforme o usuario rola). As ferramentas liam ela e analisavam so as 90 mais
 * recentes — mas escreviam o resultado como se fosse a galeria toda. Com 2.500 fotos no
 * aparelho, "1 grupo de copias, 15 MB recuperaveis" era conclusao tirada de 3,6% do acervo.
 * Numero real, escopo falso — que na pratica engana igual a estatistica inventada de antes.
 *
 * Devolve tambem o `total` da galeria para a tela poder dizer o que ficou de fora.
 */
export async function carregarParaAnalise(max = 2000): Promise<{ fotos: DevicePhoto[]; total: number }> {
  const fotos: DevicePhoto[] = [];
  let after: string | undefined;
  let total = 0;

  for (;;) {
    const p = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: 500,
      sortBy: [["creationTime", false]],
      after,
    });
    total = p.totalCount;
    for (const a of p.assets) fotos.push({ id: a.id, uri: a.uri, creationTime: a.creationTime });
    if (!p.hasNextPage || fotos.length >= max) break;
    after = p.endCursor;
  }

  return { fotos: fotos.slice(0, max), total };
}

export type GrupoDuplicata = { chave: string; fotos: DevicePhoto[] };

/**
 * Duplicatas por assinatura de arquivo (tamanho em bytes + dimensões).
 * Não é hash perceptual — não acha "foto parecida", acha CÓPIA do mesmo arquivo, que é o
 * caso comum (reenvio de WhatsApp, download repetido). Honesto e barato: nada de baixar
 * e comparar pixel de milhares de imagens no celular.
 */
export async function acharDuplicatas(fotos: DevicePhoto[], limite = 400): Promise<GrupoDuplicata[]> {
  const amostra = fotos.slice(0, limite);
  const mapa = new Map<string, DevicePhoto[]>();

  for (const f of amostra) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(f.id);
      const uri = (info as unknown as { localUri?: string }).localUri || f.uri;
      // TAMANHO REAL vem do FileSystem. A MediaLibrary NAO expoe fileSize (conferido nos
      // tipos da lib): a versao anterior lia um campo inexistente, dava 0 e PULAVA toda
      // foto — a tela dizia "nenhuma copia encontrada" mesmo com a galeria cheia de copias.
      const st = await FileSystem.getInfoAsync(uri);
      const bytes = st.exists ? (st as unknown as { size?: number }).size ?? 0 : 0;
      const w = (info as unknown as { width?: number }).width ?? 0;
      const h = (info as unknown as { height?: number }).height ?? 0;
      if (!bytes) continue;
      const chave = `${bytes}x${w}x${h}`;
      const lista = mapa.get(chave) || [];
      lista.push(f);
      mapa.set(chave, lista);
    } catch {
      /* asset ilegivel: ignora em vez de derrubar a analise */
    }
  }

  return [...mapa.entries()]
    .filter(([, l]) => l.length > 1)
    .map(([chave, fotos]) => ({ chave, fotos }))
    .sort((a, b) => b.fotos.length - a.fotos.length);
}

export type AlbumWhats = { id: string; titulo: string; total: number };

/**
 * Fotos vindas do WhatsApp: procura os álbuns do WhatsApp na galeria.
 * O WhatsApp guarda em pastas próprias ("WhatsApp Images", "WhatsApp Documents"...), então
 * dá pra identificar pelo álbum — sem precisar de IA e sem chutar.
 */
export async function acharAlbunsWhatsApp(): Promise<AlbumWhats[]> {
  try {
    const albuns = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: false });
    return albuns
      .filter((a) => /whats/i.test(a.title))
      .map((a) => ({ id: a.id, titulo: a.title, total: a.assetCount ?? 0 }))
      .sort((a, b) => b.total - a.total);
  } catch {
    return [];
  }
}

export type PeriodoLinha = { rotulo: string; ano: number; mes: number; fotos: DevicePhoto[] };

/** Linha do tempo: agrupa por ano/mês usando a data real de criação do arquivo. */
export function agruparPorPeriodo(fotos: DevicePhoto[]): PeriodoLinha[] {
  const mapa = new Map<string, PeriodoLinha>();
  for (const f of fotos) {
    const d = new Date(f.creationTime);
    const ano = d.getFullYear();
    const mes = d.getMonth();
    const k = `${ano}-${mes}`;
    if (!mapa.has(k)) {
      // "janeiro de 2026" -> "Janeiro de 2026". O CSS `textTransform: capitalize` da RN
      // capitaliza TODA palavra e produzia "Janeiro De 1970".
      const bruto = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      mapa.set(k, {
        rotulo: bruto.charAt(0).toUpperCase() + bruto.slice(1),
        ano,
        mes,
        fotos: [],
      });
    }
    mapa.get(k)!.fotos.push(f);
  }
  return [...mapa.values()].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes));
}

/** Soma legível de bytes (para "espaço a liberar" com número real). */
export function formatarBytes(b: number): string {
  if (b <= 0) return "0 MB";
  const mb = b / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export async function somarBytes(fotos: DevicePhoto[]): Promise<number> {
  let t = 0;
  for (const f of fotos) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(f.id);
      const uri = (info as unknown as { localUri?: string }).localUri || f.uri;
      const st = await FileSystem.getInfoAsync(uri);
      if (st.exists) t += (st as unknown as { size?: number }).size ?? 0;
    } catch { /* ignora */ }
  }
  return t;
}
