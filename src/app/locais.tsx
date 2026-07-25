import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { theme, radius } from "@/lib/theme";
import { useDevicePhotos } from "@/lib/devicephotos";

/**
 * Locais e fontes — de onde o Achei a Foto lê as fotos.
 *
 * Honesto: hoje o app lê o ESTE APARELHO (galeria local). Nuvem (Google Fotos/Drive/iCloud) e
 * computador (HD externo/notebook) precisam de login OAuth + o backend web fazendo a ponte —
 * isso conecta pelo site (acheiafoto.reverblabs.com.br), não dentro do app ainda. Em vez de
 * mostrar um botão que não faz nada, cada fonte diz o estado real e leva para onde resolve.
 */
const SITE = "https://acheiafoto.reverblabs.com.br/locais";

const FONTES_EXTERNAS: { chave: string; nome: string; desc: string; icon: string }[] = [
  { chave: "google-fotos", nome: "Google Fotos", desc: "Sua biblioteca na nuvem do Google", icon: "cloud" },
  { chave: "drive", nome: "Google Drive / OneDrive", desc: "Fotos guardadas em drives de nuvem", icon: "hard-drive" },
  { chave: "computador", nome: "Computador (HD externo / notebook)", desc: "Pastas do PC e discos externos", icon: "monitor" },
];

export default function Locais() {
  const { photos, total, perm } = useDevicePhotos();
  const qtd = total || photos.length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Locais e fontes" }} />
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 16 }}>
        De onde o Achei a Foto lê suas fotos. Conecte mais fontes para achar tudo num lugar só.
      </Text>

      {/* Este aparelho — ativo */}
      <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 }]}>
        <View style={[s.icon, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
          <Feather name="smartphone" size={22} color={theme.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>Este aparelho</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            {perm === "granted" || perm === "limited"
              ? `${qtd.toLocaleString("pt-BR")} fotos na galeria`
              : "Toque para permitir o acesso à galeria"}
          </Text>
        </View>
        <View style={s.badgeOn}><Text style={s.badgeOnT}>Ativo</Text></View>
      </View>

      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 12, marginBottom: 8, marginLeft: 4 }}>Conectar mais locais</Text>

      {FONTES_EXTERNAS.map((f) => (
        <Pressable key={f.chave} onPress={() => Linking.openURL(`${SITE}?fonte=${f.chave}`)} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 }]}>
          <View style={[s.icon, { backgroundColor: theme.surface2 }]}>
            <Feather name={f.icon as never} size={22} color={theme.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{f.nome}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{f.desc}</Text>
          </View>
          <View style={s.badgeSoon}><Text style={s.badgeSoonT}>Conectar</Text></View>
        </Pressable>
      ))}

      <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 }}>
        Nuvem e computador conectam pelo site, com login seguro. O app abre a página certa para
        você concluir — assim suas fotos de todos os lugares aparecem juntas aqui.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 14 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeOn: { backgroundColor: "rgba(52,211,153,0.15)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOnT: { color: theme.success, fontSize: 11, fontWeight: "700" },
  badgeSoon: { backgroundColor: "rgba(251,191,36,0.15)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  badgeSoonT: { color: theme.primary, fontSize: 11, fontWeight: "700" },
});
