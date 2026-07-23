import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { theme, radius } from "@/lib/theme";
import { usePrefs } from "@/lib/prefs";

/**
 * Grade de um ÁLBUM (ou pasta) — miniaturas menores, na densidade escolhida em Ajustes.
 *
 * Isto resolve dois pedidos do dono: (1) tocar numa pasta do WhatsApp / coleção abria NADA,
 * porque os cards não tinham ação; (2) quando algo abria, ia direto pra tela cheia, sem passar
 * por miniaturas. Aqui a coleção vira grade; tocar numa miniatura abre a foto em tela cheia.
 *
 * Recebe `id` = id do álbum na MediaLibrary. Título opcional via param `titulo`.
 */
const GAP = 3;

type Item = { id: string; uri: string };

export default function Album() {
  const { id, titulo } = useLocalSearchParams<{ id: string; titulo?: string }>();
  const router = useRouter();
  const { thumbsPorLinha } = usePrefs();
  const [fotos, setFotos] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [after, setAfter] = useState<string | undefined>();
  const [temMais, setTemMais] = useState(true);

  const W = Dimensions.get("window").width;
  const size = (W - GAP * (thumbsPorLinha + 1)) / thumbsPorLinha;

  const carregar = async (cursor?: string) => {
    const p = await MediaLibrary.getAssetsAsync({
      album: id,
      mediaType: "photo",
      first: 120,
      sortBy: [["creationTime", false]],
      after: cursor,
    });
    setFotos((prev) => {
      const novos = p.assets.map((a) => ({ id: a.id, uri: a.uri }));
      return cursor ? [...prev, ...novos] : novos;
    });
    setAfter(p.endCursor);
    setTemMais(p.hasNextPage);
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      try { await carregar(); } finally { if (vivo) setCarregando(false); }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: titulo || "Álbum", headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.text }} />
      {carregando ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : fotos.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: theme.muted }}>Nenhuma foto nesta pasta.</Text>
        </View>
      ) : (
        <FlatList
          data={fotos}
          key={thumbsPorLinha} /* remonta ao trocar a densidade */
          numColumns={thumbsPorLinha}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: GAP }}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (temMais) carregar(after); }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/foto/${item.id}`)} style={{ margin: GAP / 2 }}>
              <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="cover" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({});
