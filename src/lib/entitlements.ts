// Espelha o entitlements da web: plano free|premium + features. Usado pro gating
// das ferramentas (cadeado no free). O plano vem da sessão (better-auth user.plan).
export type Plan = "free" | "premium";
export type Feature = "core" | "search" | "whatsapp" | "scanner" | "timeline" | "pessoas" | "duplicates" | "vault";

const PREMIUM: Feature[] = ["whatsapp", "scanner", "timeline", "pessoas", "duplicates", "vault"];

export function hasFeature(plan: Plan | undefined, f: Feature): boolean {
  if (f === "core" || f === "search") return true;
  return plan === "premium" && PREMIUM.includes(f);
}

export function normalizePlan(p: string | null | undefined): Plan {
  return p === "premium" ? "premium" : "free";
}

// Ferramentas (mesmas do web). Cada uma abre /ferramenta/[key].
export const TOOLS: { key: string; label: string; desc: string; feature: Feature; icon: string; tint: string }[] = [
  { key: "whatsapp", label: "Filtro WhatsApp", desc: "Separa fotos reais de memes e boletos", feature: "whatsapp", icon: "message-circle", tint: "#34d399" },
  { key: "scanner", label: "Scanner", desc: "Digitaliza fotos impressas e negativos", feature: "scanner", icon: "crop", tint: "#fbbf24" },
  { key: "timeline", label: "Linha do tempo", desc: "Suas memórias organizadas por época", feature: "timeline", icon: "clock", tint: "#fb923c" },
  { key: "pessoas", label: "Pessoas", desc: "Agrupa suas fotos por quem aparece nelas", feature: "pessoas", icon: "users", tint: "#f472b6" },
  { key: "duplicates", label: "Duplicatas", desc: "Acha e remove fotos repetidas", feature: "duplicates", icon: "copy", tint: "#a1a1aa" },
  { key: "vault", label: "Cofre pessoal", desc: "As memórias mais preciosas, protegidas por biometria", feature: "vault", icon: "shield", tint: "#fb923c" },
];
