import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { useDevicePhotos } from "@/lib/devicephotos";
import { TOOLS, hasFeature } from "@/lib/entitlements";

const W = Dimensions.get("window").width;
const THUMB = (W - 16 * 2 - 8 * 2) / 3;

export default function Home() {
  const router = useRouter();
  const { plan, name } = usePlan();
  const { perm, photos, total, ask, error } = useDevicePhotos();
  const isPremium = plan === "premium";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* saudação + plano */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{greet}{name ? `, ${name.split(" ")[0]}` : ""} 👋</Text>
          <View style={[s.badge, { backgroundColor: isPremium ? "rgba(251,146,60,0.15)" : theme.surface2 }]}>
            {isPremium && <Feather name="award" size={11} color={theme.warm} />}
            <Text style={{ color: isPremium ? theme.warm : theme.muted, fontSize: 11, fontWeight: "600" }}>{isPremium ? "Premium" : "Free"}</Text>
          </View>
        </View>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: "700", marginTop: 4 }}>Suas memórias,{"\n"}num só lugar.</Text>
      </View>

      {/* upsell (free) */}
      {!isPremium && (
        <Pressable onPress={() => router.push("/ferramenta/whatsapp")} style={[s.card, { marginBottom: 16, overflow: "hidden" }]}>
          <LinearGradient colors={["rgba(251,146,60,0.18)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[s.iconBox, { backgroundColor: "rgba(251,146,60,0.2)" }]}><Feather name="award" size={20} color={theme.warm} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>Desbloqueie o Premium</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Filtro WhatsApp, Scanner, Cofre e mais.</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* busca */}
      <Pressable onPress={() => router.push("/buscar")} style={[s.search, { marginBottom: 16 }]}>
        <Feather name="search" size={18} color={theme.muted} />
        <Text style={{ color: theme.muted, flex: 1 }}>Buscar em {total.toLocaleString("pt-BR")} fotos…</Text>
      </Pressable>

      {/* chips de ferramentas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TOOLS.map((t) => {
          const locked = !hasFeature(plan, t.feature);
          return (
            <Pressable key={t.key} onPress={() => router.push(`/ferramenta/${t.key}`)} style={[s.chip, locked && { opacity: 0.65 }]}>
              <View style={[s.chipIcon, { backgroundColor: t.tint + "26" }]}><Feather name={t.icon as never} size={14} color={t.tint} /></View>
              <Text style={{ color: theme.text, fontSize: 13 }}>{t.label.split(" ")[0]}</Text>
              {locked && <Feather name="lock" size={11} color={theme.warm} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* fotos recentes do aparelho */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>Recentes do aparelho</Text>
        {photos.length > 0 && <Pressable onPress={() => router.push("/buscar")}><Text style={{ color: theme.primary, fontSize: 13 }}>Ver tudo</Text></Pressable>}
      </View>

      {perm === "loading" ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
      ) : perm === "denied" ? (
        <View style={[s.card, { alignItems: "center", gap: 10 }]}>
          <Feather name="image" size={28} color={theme.primary} />
          <Text style={{ color: theme.text, fontWeight: "600" }}>Libere o acesso às fotos</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>O app organiza as fotos do seu aparelho — tudo local.</Text>
          {!!error && <Text style={{ color: theme.warm, fontSize: 12, textAlign: "center" }}>{error}</Text>}
          <Pressable style={s.btn} onPress={ask}><Text style={s.btnT}>Permitir acesso</Text></Pressable>
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={{ color: theme.primary, fontSize: 12 }}>Abrir ajustes do Android</Text>
          </Pressable>
        </View>
      ) : perm === "limited" ? (
        // Android 13+: usuário escolheu "Selecionar fotos". A galeria vem quase vazia e antes
        // isso aparecia como "nenhuma foto" — sem pista do motivo real.
        <View style={[s.card, { alignItems: "center", gap: 10 }]}>
          <Feather name="alert-triangle" size={26} color={theme.warm} />
          <Text style={{ color: theme.text, fontWeight: "600" }}>Você liberou só algumas fotos</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            Por isso aparecem {total.toLocaleString("pt-BR")} de {total === 1 ? "foto" : "fotos"} apenas.
            Para o app organizar tudo, permita o acesso a <Text style={{ color: theme.text }}>todas</Text> as fotos.
          </Text>
          <Pressable style={s.btn} onPress={() => Linking.openSettings()}>
            <Text style={s.btnT}>Permitir todas as fotos</Text>
          </Pressable>
        </View>
      ) : photos.length === 0 ? (
        <View style={[s.card, { alignItems: "center", gap: 8 }]}>
          <Text style={{ color: theme.muted, textAlign: "center" }}>Nenhuma foto encontrada no aparelho.</Text>
          {!!error && <Text style={{ color: theme.warm, fontSize: 12, textAlign: "center" }}>{error}</Text>}
          <Pressable onPress={ask}><Text style={{ color: theme.primary, fontSize: 13 }}>Tentar de novo</Text></Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {photos.slice(0, 12).map((p) => (
            // Toque abre a foto em tela cheia. Antes era <Image> solto: tocar nao fazia nada.
            <Pressable key={p.id} onPress={() => router.push(`/foto/${p.id}`)}>
              <Image source={{ uri: p.uri }} style={{ width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: theme.surface }} contentFit="cover" transition={120} />
            </Pressable>
          ))}
        </View>
      )}

      {/* fontes */}
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700", marginTop: 24, marginBottom: 10 }}>Fontes</Text>
      <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
        <View style={[s.iconBox, { backgroundColor: "rgba(251,191,36,0.15)" }]}><Feather name="smartphone" size={20} color={theme.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>Este dispositivo</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{total.toLocaleString("pt-BR")} fotos</Text>
        </View>
        <Feather name="check-circle" size={18} color={theme.success} />
      </View>
      <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, opacity: 0.6 }]}>
        <View style={[s.iconBox, { backgroundColor: theme.surface2 }]}><Feather name="cloud" size={20} color={theme.muted} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>Google Fotos / OneDrive</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>conectar nuvem — em breve</Text>
        </View>
        <Feather name="lock" size={14} color={theme.warm} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 13 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  chipIcon: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
  btnT: { color: theme.primaryText, fontWeight: "700" },
});
