import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { usePrefs } from "@/lib/prefs";
import { useDevicePhotos } from "@/lib/devicephotos";
import { hasFeature } from "@/lib/entitlements";
import { reconhecerPessoas, TETO_ANALISE, type Pessoa, type ProgressoPessoas } from "@/lib/pessoas";

const W = Dimensions.get("window").width;

/**
 * Pessoas — agrupa as fotos por quem aparece nelas, com reconhecimento facial RODANDO NO
 * APARELHO (nada sai do celular). Estados: analisando (com progresso) → grade de pessoas →
 * fotos de uma pessoa. Se o modelo não subir neste aparelho, mostra erro honesto (o resto do
 * app segue normal).
 */
export default function Pessoas() {
  const { plan } = usePlan();
  const { thumbsPorLinha } = usePrefs();
  const { photos } = useDevicePhotos();
  const router = useRouter();
  const liberado = hasFeature(plan, "pessoas");

  const [fase, setFase] = useState<"analisando" | "pronto" | "erro">("analisando");
  const [prog, setProg] = useState<ProgressoPessoas>({ feitas: 0, total: 0 });
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [sel, setSel] = useState<Pessoa | null>(null);

  const COLS = thumbsPorLinha;
  const TH = (W - 16 * 2 - 8 * (COLS - 1)) / COLS;

  useEffect(() => {
    if (!liberado) return;
    let vivo = true;
    (async () => {
      setFase("analisando");
      try {
        const res = await reconhecerPessoas(photos, (p) => { if (vivo) setProg(p); });
        if (!vivo) return;
        setPessoas(res);
        setFase("pronto");
      } catch {
        if (vivo) setFase("erro");
      }
    })();
    return () => { vivo = false; };
    // roda uma vez com a galeria carregada; não refaz a cada rolagem (mesma lição da análise).
  }, [liberado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!liberado) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
        <Stack.Screen options={{ title: "Pessoas" }} />
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: "rgba(244,114,182,0.2)", width: 60, height: 60, borderRadius: 20 }]}>
            <Feather name="users" size={28} color="#f472b6" />
          </View>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Recurso Premium</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>Agrupar fotos por pessoa faz parte do Premium.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>Assine em acheiafoto.reverblabs.com.br para liberar.</Text>
        </View>
      </ScrollView>
    );
  }

  // fotos de uma pessoa selecionada
  if (sel) {
    const uris = new Map(photos.map((p) => [p.id, p.uri]));
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Stack.Screen options={{ title: `Pessoa ${sel.id}` }} />
        <Pressable onPress={() => setSel(null)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 14 }}>Todas as pessoas</Text>
        </Pressable>
        <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 12 }}>{sel.qtd} {sel.qtd === 1 ? "foto" : "fotos"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sel.fotoIds.map((id) => {
            const uri = uris.get(id);
            if (!uri) return null;
            return (
              <Pressable key={id} onPress={() => router.push(`/foto/${id}`)}>
                <Image source={{ uri }} style={{ width: TH, height: TH, borderRadius: radius.sm }} contentFit="cover" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Pessoas" }} />

      {fase === "analisando" ? (
        <View style={{ alignItems: "center", paddingVertical: 48, gap: 14 }}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>Reconhecendo rostos…</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            {prog.total ? `${prog.feitas} de ${prog.total} fotos` : "preparando o modelo…"}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center", maxWidth: 260 }}>
            Tudo acontece no seu aparelho — nenhuma foto é enviada para servidores.
          </Text>
        </View>
      ) : fase === "erro" ? (
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: theme.surface2, width: 60, height: 60, borderRadius: 20 }]}>
            <Feather name="alert-triangle" size={26} color={theme.warm} />
          </View>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>Não foi possível reconhecer</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            O reconhecimento facial não pôde iniciar neste aparelho. Nada foi enviado a lugar nenhum.
          </Text>
        </View>
      ) : pessoas.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
          <Feather name="users" size={40} color={theme.surface2} />
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            Nenhuma pessoa recorrente encontrada nas {Math.min(photos.length, TETO_ANALISE)} fotos analisadas.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 16 }}>
            {pessoas.length} {pessoas.length === 1 ? "pessoa encontrada" : "pessoas encontradas"} · toque para ver as fotos
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {pessoas.map((p) => (
              <Pressable key={p.id} onPress={() => setSel(p)} style={{ alignItems: "center", width: (W - 16 * 2 - 12 * 2) / 3 }}>
                <Image source={{ uri: p.thumbUri }} style={{ width: (W - 16 * 2 - 12 * 2) / 3, height: (W - 16 * 2 - 12 * 2) / 3, borderRadius: radius.md }} contentFit="cover" />
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginTop: 6 }}>Pessoa {p.id}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{p.qtd} fotos</Text>
              </Pressable>
            ))}
          </View>
          {photos.length > TETO_ANALISE && (
            <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center", marginTop: 20 }}>
              Analisadas as {TETO_ANALISE} fotos mais recentes de {photos.length.toLocaleString("pt-BR")}.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
