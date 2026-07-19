import { useSession } from "./auth";
import { normalizePlan, type Plan } from "./entitlements";

// Plano do usuário logado (better-auth additionalField `plan`).
export function usePlan(): { plan: Plan; email: string; name: string } {
  const { data } = useSession();
  const u = (data?.user || {}) as { plan?: string; email?: string; name?: string };
  return { plan: normalizePlan(u.plan), email: u.email || "", name: u.name || "" };
}
