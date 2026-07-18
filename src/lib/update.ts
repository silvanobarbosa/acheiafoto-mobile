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
    const current = Application.nativeApplicationVersion || "0.0.0";
    const res = await fetch(`${API_BASE}/api/app/version`, { headers: { accept: "application/json" } });
    if (!res.ok) return { hasUpdate: false };
    const j = (await res.json()) as { version?: string; apkUrl?: string; notes?: string };
    if (j.version && gt(j.version, current)) {
      return { hasUpdate: true, version: j.version, apkUrl: j.apkUrl, notes: j.notes };
    }
    return { hasUpdate: false };
  } catch {
    return { hasUpdate: false };
  }
}
