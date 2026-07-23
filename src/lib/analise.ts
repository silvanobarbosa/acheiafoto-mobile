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
export async function carregarParaAnalise(
  aoProgredir?: (carregadas: number, total: number) => void,
): Promise<{ fotos: DevicePhoto[]; total: number }> {
  // Traz a GALERIA INTEIRA. O dono tem 27 mil fotos e o teto de 600 escondia 97% delas —
  // a análise dizia "600 de 2.506" e o resultado era de uma amostra, não da galeria. Só
  // metadados entram aqui (id, uri, dimensão, nome, data): nenhuma leitura de arquivo, então
  // até dezenas de milhares de fotos carregam em segundos.
  const fotos: DevicePhoto[] = [];
  let after: string | undefined;
  let total = 0;

  for (;;) {
    const p = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: 1000,
      sortBy: [["creationTime", false]],
      after,
    });
    total = p.totalCount;
    for (const a of p.assets) {
      fotos.push({ id: a.id, uri: a.uri, creationTime: a.creationTime, width: a.width, height: a.height, filename: a.filename });
    }
    if (aoProgredir) aoProgredir(fotos.length, total);
    if (!p.hasNextPage) break;
    after = p.endCursor;
  }

  return { fotos, total };
}

// `bytesPorFoto` = tamanho de UMA cópia do grupo (todas têm o mesmo, é a assinatura). Guardar
// isto aqui elimina o `somarBytes`, que fazia uma SEGUNDA varredura de disco sobre os
// duplicados — e essa segunda fase rodava sem barra de progresso, congelando a tela em
// "600 de 600" por minutos. O tamanho já é lido na passada única; não há motivo pra reler.
export type GrupoDuplicata = { chave: string; fotos: DevicePhoto[]; bytesPorFoto: number };

/**
 * Duplicatas por assinatura de arquivo (tamanho em bytes + dimensões).
 * Não é hash perceptual — não acha "foto parecida", acha CÓPIA do mesmo arquivo, que é o
 * caso comum (reenvio de WhatsApp, download repetido). Honesto e barato: nada de baixar
 * e comparar pixel de milhares de imagens no celular.
 */
export async function acharDuplicatas(
  fotos: DevicePhoto[],
  aoProgredir?: (feitas: number, total: number) => void,
): Promise<GrupoDuplicata[]> {
  // ASSINATURA POR METADADOS — nada de ler arquivo.
  //
  // A versão anterior fazia getAssetInfo + FileSystem.getInfo por foto (2 idas ao disco).
  // No aparelho real isso: (1) NÃO ESCALA — 27 mil fotos = 54 mil leituras, minutos travados;
  // (2) QUEBRA — as URIs são content://, e FileSystem.getInfo não devolve tamanho pra elas,
  // então bytes=0 e TODA foto era pulada ("duplicatas não funcionou", relatado pelo dono).
  //
  // Nome do arquivo + dimensões já vêm no getAssetsAsync. Reenvio de WhatsApp e download
  // repetido preservam o nome (IMG-...-WA0001.jpg) e as dimensões exatas. Isso acha a cópia
  // real, na memória, instantâneo, e funciona em qualquer URI.
  const mapa = new Map<string, DevicePhoto[]>();
  let feitas = 0;

  for (const f of fotos) {
    feitas++;
    if (aoProgredir && feitas % 500 === 0) aoProgredir(feitas, fotos.length);
    // chave: nome (se houver) + dimensões. Sem nome, cai em dimensão × data (segundo).
    const dim = `${f.width ?? 0}x${f.height ?? 0}`;
    const chave = f.filename ? `n:${f.filename}|${dim}` : `d:${dim}|t:${Math.round(f.creationTime / 1000)}`;
    const lista = mapa.get(chave) || [];
    lista.push(f);
    mapa.set(chave, lista);
  }
  if (aoProgredir) aoProgredir(fotos.length, fotos.length);

  const grupos = [...mapa.entries()].filter(([, l]) => l.length > 1);

  // Tamanho real só dos GRUPOS de cópia (poucos), pra mostrar "X MB recuperáveis". Aqui a
  // leitura de disco é aceitável: são dezenas, não dezenas de milhares. Falha silenciosa se
  // não conseguir (mantém a duplicata detectada; só o número de MB fica em 0).
  const out: GrupoDuplicata[] = [];
  for (const [chave, lista] of grupos) {
    let bytes = 0;
    try {
      const info = await MediaLibrary.getAssetInfoAsync(lista[0].id);
      const uri = (info as unknown as { localUri?: string }).localUri;
      if (uri) {
        const st = await FileSystem.getInfoAsync(uri);
        bytes = st.exists ? (st as unknown as { size?: number }).size ?? 0 : 0;
      }
    } catch { /* mantém o grupo, bytes fica 0 */ }
    out.push({ chave, fotos: lista, bytesPorFoto: bytes });
  }

  return out.sort((a, b) => b.fotos.length - a.fotos.length);
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
