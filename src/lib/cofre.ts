// Cofre pessoal — área PRIVADA do app, fora da galeria pública, protegida por biometria na tela.
//
// Decisões de projeto (honestas):
// - NÃO mexe nos originais. Guardar = COPIAR o arquivo para o diretório privado do app
//   (`documentDirectory/cofre/`). O MediaLibrary não varre esse diretório, então a cópia não
//   aparece na galeria/Fotos. O original continua onde estava — o dono decide apagar depois.
// - Copiamos a partir do `localUri` (file://) que o MediaLibrary resolve, e não do `uri`
//   content:// direto — o FileSystem legacy não copia content:// de forma confiável
//   (mesmo gotcha visto na análise de duplicatas).
// - Índice num JSON dentro do próprio diretório (que já é privado do app).
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";

const DIR = FileSystem.documentDirectory + "cofre/";
const INDEX = DIR + "index.json";

export type CofreItem = { id: string; uri: string; nome: string; addedAt: number };

async function garantirDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

async function lerIndice(): Promise<CofreItem[]> {
  try {
    const txt = await FileSystem.readAsStringAsync(INDEX);
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function gravarIndice(items: CofreItem[]) {
  await FileSystem.writeAsStringAsync(INDEX, JSON.stringify(items));
}

export async function listarCofre(): Promise<CofreItem[]> {
  await garantirDir();
  const items = await lerIndice();
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

/** Copia uma foto da galeria (pelo id do asset) para o cofre. Idempotente por id. */
export async function guardarNoCofre(assetId: string): Promise<boolean> {
  await garantirDir();
  const items = await lerIndice();
  if (items.some((i) => i.id === assetId)) return true; // já está no cofre
  const info = await MediaLibrary.getAssetInfoAsync(assetId);
  const src = info.localUri || info.uri;
  if (!src) return false;
  const ext = ((src.split("?")[0].split(".").pop() || "jpg").toLowerCase()).slice(0, 4);
  const dest = `${DIR}${assetId.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
  await FileSystem.copyAsync({ from: src, to: dest });
  items.push({ id: assetId, uri: dest, nome: info.filename || "Foto", addedAt: Date.now() });
  await gravarIndice(items);
  return true;
}

/** Remove do cofre (apaga só a CÓPIA privada; o original na galeria segue intacto). */
export async function tirarDoCofre(id: string): Promise<void> {
  const items = await lerIndice();
  const it = items.find((i) => i.id === id);
  if (it) {
    try { await FileSystem.deleteAsync(it.uri, { idempotent: true }); } catch { /* já não existe */ }
  }
  await gravarIndice(items.filter((i) => i.id !== id));
}

export async function contarCofre(): Promise<number> {
  try { return (await lerIndice()).length; } catch { return 0; }
}
