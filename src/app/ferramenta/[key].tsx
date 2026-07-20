import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { useDevicePhotos } from "@/lib/devicephotos";
import { TOOLS, hasFeature, type Feature } from "@/lib/entitlements";

const W = Dimensions.get("window").width;
const TH = (W - 16 * 2 - 8 * 2) / 3;

const CONTENT: Record<string, { stats: [string, string][]; body: string }> = {
  whatsapp: { stats: [["1.284", "lixo detectado"], ["3,2 GB", "a liberar"], ["8.940", "fotos reais"]], body: "A IA separa fotos reais de memes, boletos e “bom dia”. Selecione e limpe em segundos." },
  scanner: { stats: [["218", "escaneadas"], ["12", "negativos"], ["4K", "resolução"]], body: "Digitalize fotos impressas e negativos antigos, com correção de cor e melhoria por IA." },
  timeline: { stats: [["6", "pessoas"], ["137,7k", "memórias"], ["18", "anos"]], body: "Suas memórias organizadas por pessoa e por época, automaticamente." },
  duplicates: { stats: [["42", "grupos"], ["1,8 GB", "recuperável"], ["156", "cópias"]], body: "Encontra fotos repetidas, você escolhe qual manter e recupera espaço." },
  vault: { stats: [["4", "álbuns"], ["892", "protegidas"], ["🔒", "biometria"]], body: "Guarde as memórias mais preciosas com proteção extra, só no aparelho." },
};

export default function Ferramenta() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { plan } = usePlan();
  const { photos } = useDevicePhotos();
  const tool = TOOLS.find((t) => t.key === key);
  const locked = tool ? !hasFeature(plan, tool.feature as Feature) : false;

  if (!tool) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: tool.label, headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.text }} />

      {locked ? (
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: "rgba(251,146,60,0.2)", width: 60, height: 60, borderRadius: 20 }]}><Feather name="award" size={28} color={theme.warm} /></View>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Recurso Premium</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>{tool.desc} faz parte do Premium.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>Assine em acheiafoto.reverblabs.com.br para liberar.</Text>
        </View>
      ) : (
        <>
          <Text style={{ color: theme.muted, fontSize: 14, marginBottom: 16 }}>{CONTENT[tool.key]?.body}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {(CONTENT[tool.key]?.stats || []).map(([v, l], i) => (
              <View key={i} style={[s.stat]}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>{v}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{l}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: theme.text, fontWeight: "700", marginBottom: 10 }}>Prévia</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {photos.slice(0, 9).map((p) => (
              <Image key={p.id} source={{ uri: p.uri }} style={{ width: TH, height: TH, borderRadius: radius.sm, backgroundColor: theme.surface }} contentFit="cover" />
            ))}
          </View>
          <Pressable style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnT}>Aplicar em {tool.label.split(" ")[0]}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  iconBox: { alignItems: "center", justifyContent: "center" },
  stat: { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, padding: 12, alignItems: "center" },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  btnT: { color: theme.primaryText, fontWeight: "700" },
});
