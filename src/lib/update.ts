import * as Application from "expo-application";
import { API_BASE } from "./auth";

// Aviso de atualização p/ distribuição por APK (fora das lojas): consulta a última
// versão publicada e, se for maior que a instalada, devolve o link do novo APK.
// Backend a criar: GET /api/app/version -> { version: "1.2.0", apkUrl, notes }.
export type UpdateInfo = { hasUpdate: boolean; version?: string; apkUrl?: string; notes?: string };

function gt(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`${API_BASE}/api/app/version`, { headers: { accept: "application/json" } });
    if (!res.ok) return { hasUpdate: false };
    const j = (await res.json()) as { version?: string; versionCode?: number; apkUrl?: string; notes?: string };

    // Preferir versionCode: o EAS incrementa sozinho a cada build (autoIncrement), enquanto o
    // versionName depende de alguém lembrar de editar o app.json — e isso JÁ drifitou (ficou
    // preso em 1.0.4 enquanto o site anunciava 1.0.10), fazendo o app pedir atualização em
    // TODA abertura, pra sempre. Comparação por número é a que não depende de disciplina humana.
    const localCode = Number(Application.nativeBuildVersion);
    if (j.versionCode && Number.isFinite(localCode) && localCode > 0) {
      if (Number(j.versionCode) > localCode) {
        return { hasUpdate: true, version: j.version, apkUrl: j.apkUrl, notes: j.notes };
      }
      return { hasUpdate: false };
    }

    // Fallback: comparação por versionName (servidor antigo, sem versionCode).
    const current = Application.nativeApplicationVersion || "0.0.0";
    if (j.version && gt(j.version, current)) {
      return { hasUpdate: true, version: j.version, apkUrl: j.apkUrl, notes: j.notes };
    }
    return { hasUpdate: false };
  } catch {
    return { hasUpdate: false };
  }
}
