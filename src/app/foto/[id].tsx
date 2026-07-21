import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Alert, Share } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList } from "react-native";
import * as MediaLibrary from "expo-media-library/legacy";
import { theme } from "@/lib/theme";
import { useDevicePhotos } from "@/lib/devicephotos";

const { width: W, height: H } = Dimensions.get("window");

/**
 * Visualizador de foto em tela cheia.
 *
 * Antes NAO EXISTIA: as miniaturas eram <Image> sem onPress — tocar numa foto nao fazia nada.
 * O dono descobriu isso quando a galeria finalmente carregou. Esta tela e o minimo pro app
 * deixar de ser vitrine: abrir, navegar entre as fotos, ver a data, compartilhar e apagar.
 *
 * Navegacao horizontal por FlatList paginada (uma foto por pagina) — mais previsivel que
 * gesto custom e nao depende de lib extra.
 */
export default function FotoViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { photos } = useDevicePhotos();
  const start = useMemo(() => Math.max(0, photos.findIndex((p) => p.id === id)), [photos, id]);
  const [idx, setIdx] = useState(start);

  const atual = photos[idx];

  const compartilhar = async () => {
    if (!atual) return;
    try {
      // Share nativo do RN aceita a uri do asset; evita dep extra pro caso simples.
      await Share.share({ url: atual.uri, message: "" });
    } catch {
      Alert.alert("Não foi possível compartilhar", "Tente novamente.");
    }
  };

  const apagar = () => {
    if (!atual) return;
    Alert.alert("Apagar foto?", "Ela vai para a lixeira do aparelho.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            // O Android mostra a própria confirmação do sistema (obrigatório no scoped storage).
            const ok = await MediaLibrary.deleteAssetsAsync([atual.id]);
            if (ok) router.back();
          } catch {
            Alert.alert("Não foi possível apagar", "O Android pode ter negado a permissão.");
          }
        },
      },
    ]);
  };

  if (!photos.length) {
    return (
      <View style={s.vazio}>
        <Stack.Screen options={{ title: "", headerStyle: { backgroundColor: "#000" }, headerTintColor: "#fff" }} />
        <Text style={{ color: theme.muted }}>Foto não encontrada.</Text>
      </View>
    );
  }

  const data = atual ? new Date(atual.creationTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen
        options={{
          title: `${idx + 1} de ${photos.length}`,
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
        }}
      />

      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={{ width: W, height: H * 0.75, alignItems: "center", justifyContent: "center" }}>
            <Image source={{ uri: item.uri }} style={{ width: W, height: H * 0.75 }} contentFit="contain" transition={120} />
          </View>
        )}
      />

      <View style={s.barra}>
        <Text style={s.data}>{data}</Text>
        <View style={s.acoes}>
          <Pressable style={s.acao} onPress={compartilhar}>
            <Feather name="share-2" size={20} color="#fff" />
            <Text style={s.acaoT}>Compartilhar</Text>
          </Pressable>
          <Pressable style={s.acao} onPress={apagar}>
            <Feather name="trash-2" size={20} color={theme.danger} />
            <Text style={[s.acaoT, { color: theme.danger }]}>Apagar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  vazio: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  barra: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: "rgba(0,0,0,0.85)" },
  data: { color: "#fff", fontSize: 14, textAlign: "center", marginBottom: 14 },
  acoes: { flexDirection: "row", justifyContent: "space-around" },
  acao: { alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 6 },
  acaoT: { color: "#fff", fontSize: 12 },
});
