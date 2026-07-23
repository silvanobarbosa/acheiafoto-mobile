import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { signOut } from "@/lib/auth";
import { usePrefs, MIN_THUMBS, MAX_THUMBS } from "@/lib/prefs";

function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(true);
  return (
    <View style={s.prefRow}>
      <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{label}</Text>
      <Switch value={on} onValueChange={setOn} trackColor={{ true: theme.primary, false: theme.surface2 }} thumbColor="#fff" />
    </View>
  );
}

export default function Ajustes() {
  const { thumbsPorLinha, setThumbsPorLinha } = usePrefs();
  const { plan, email, name } = usePlan();
  const [signingOut, setSigningOut] = useState(false);
  const isPremium = plan === "premium";
  const initials = (name || email || "?").trim().slice(0, 2).toUpperCase();

  const logout = async () => {
    setSigningOut(true);
    // signOut limpa a sessão → o guard de rota protegida no _layout leva pro login sozinho.
    try { await signOut(); } catch { /* segue */ }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: "700", marginBottom: 16 }}>Ajustes</Text>

      {/* conta */}
      <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
        <View style={s.avatar}><Text style={{ color: theme.primaryText, fontWeight: "700" }}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>{name || "Você"}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{email}</Text>
        </View>
      </View>

      {/* plano */}
      <Text style={s.h}>Plano</Text>
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isPremium && <Feather name="award" size={16} color={theme.warm} />}
          <Text style={{ color: theme.text, fontWeight: "600" }}>{isPremium ? "Premium" : "Plano Free"}</Text>
        </View>
        {isPremium ? (
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>Assinatura ativa — todos os recursos liberados.</Text>
        ) : (
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>Ferramentas premium bloqueadas. Faça upgrade no site.</Text>
        )}
      </View>

      {/* preferências */}
      <Text style={s.h}>Preferências</Text>

      {/* Densidade das miniaturas — vale para TODAS as grades (busca, álbum, período).
          Mais por linha = menores; menos = maiores. Tocar numa foto abre em tela cheia. */}
      <View style={s.card}>
        <Text style={{ color: theme.text, fontSize: 14, marginBottom: 4 }}>Miniaturas por linha</Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 12 }}>
          {thumbsPorLinha} por linha — {thumbsPorLinha <= 3 ? "maiores" : "menores"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {Array.from({ length: MAX_THUMBS - MIN_THUMBS + 1 }, (_, i) => MIN_THUMBS + i).map((n) => (
            <Pressable
              key={n}
              onPress={() => setThumbsPorLinha(n)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center",
                backgroundColor: n === thumbsPorLinha ? theme.primary : theme.surface2,
              }}
            >
              <Text style={{ color: n === thumbsPorLinha ? theme.primaryText : theme.text, fontWeight: "700" }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.card, { marginTop: 12 }]}>
        <Toggle label="Indexar só no Wi‑Fi" />
        <Toggle label="Processamento de IA no aparelho" />
        <Toggle label="Backup automático" />
        <Toggle label="Notificações de novas memórias" />
      </View>

      {/* privacidade */}
      <View style={[s.card, { flexDirection: "row", gap: 10, marginTop: 12 }]}>
        <Feather name="shield" size={18} color={theme.success} />
        <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }}>Suas fotos ficam no aparelho. A IA roda local, sem enviar nada a servidores.</Text>
      </View>

      {/* sair */}
      <Pressable onPress={logout} disabled={signingOut} style={[s.logout, signingOut && { opacity: 0.5 }]}>
        <Feather name="log-out" size={18} color={theme.danger} />
        <Text style={{ color: theme.danger, fontWeight: "600" }}>{signingOut ? "Saindo…" : "Sair da conta"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  h: { color: theme.text, fontSize: 13, fontWeight: "700", marginTop: 18, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: 14, marginTop: 24 },
});
