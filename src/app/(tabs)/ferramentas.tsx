import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { TOOLS, hasFeature } from "@/lib/entitlements";

export default function Ferramentas() {
  const router = useRouter();
  const { plan } = usePlan();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: "700", marginBottom: 4 }}>Ferramentas</Text>
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 16 }}>Organize, limpe e proteja suas fotos.</Text>

      {TOOLS.map((t) => {
        const locked = !hasFeature(plan, t.feature);
        return (
          <Pressable key={t.key} onPress={() => router.push(`/ferramenta/${t.key}`)} style={[s.row, locked && { opacity: 0.7 }]}>
            <View style={[s.icon, { backgroundColor: t.tint + "26" }]}><Feather name={t.icon as never} size={22} color={t.tint} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{t.label}</Text>
                {locked && <Feather name="lock" size={12} color={theme.warm} />}
              </View>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{t.desc}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.muted} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
