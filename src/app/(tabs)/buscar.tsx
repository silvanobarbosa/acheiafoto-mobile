import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions, TextInput, Alert, Share } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { theme, radius } from "@/lib/theme";
import { useDevicePhotos } from "@/lib/devicephotos";

const W = Dimensions.get("window").width;
const COLS = 3;
const GAP = 3;
const SIZE = (W - GAP * (COLS + 1)) / COLS;

/**
 * Galeria completa — com SELEÇÃO e AÇÕES REAIS.
 *
 * Antes as miniaturas eram <Image> sem onPress: não dava pra abrir nem selecionar nada.
 * Agora: toque abre a foto; toque longo entra em modo seleção; com itens selecionados dá
 * pra compartilhar e apagar de verdade (deleteAssetsAsync — o Android pede a confirmação
 * dele, obrigatória no scoped storage).
 */
export default function Buscar() {
  const router = useRouter();
  const { perm, photos, total, loadMore, loadingMore, ask } = useDevicePhotos();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const modoSelecao = sel.size > 0;

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return photos;
    return photos.filter((p) => {
      const d = new Date(p.creationTime);
      const label = `${d.getFullYear()} ${d.toLocaleDateString("pt-BR", { month: "long" })}`.toLowerCase();
      return label.includes(t);
    });
  }, [photos, q]);

  const alternar = useCallback((id: string) => {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const limpar = () => setSel(new Set());

  const compartilhar = async () => {
    const ids = [...sel];
    const uris = photos.filter((p) => ids.includes(p.id)).map((p) => p.uri);
    if (!uris.length) return;
    try {
      // Share nativo aceita uma url por vez; para varias, compartilha a primeira e avisa.
      await Share.share({ url: uris[0], message: uris.length > 1 ? `${uris.length} fotos selecionadas` : "" });
    } catch {
      Alert.alert("Não foi possível compartilhar");
    }
  };

  const apagar = () => {
    const ids = [...sel];
    if (!ids.length) return;
    Alert.alert(
      `Apagar ${ids.length} ${ids.length === 1 ? "foto" : "fotos"}?`,
      "Elas vão para a lixeira do aparelho.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              const ok = await MediaLibrary.deleteAssetsAsync(ids);
              if (ok) {
                limpar();
                await ask(); // recarrega a galeria depois de apagar
              }
            } catch {
              Alert.alert("Não foi possível apagar", "O Android pode ter negado a permissão.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {modoSelecao ? (
        <View style={s.barraSel}>
          <Pressable onPress={limpar} hitSlop={10}><Feather name="x" size={22} color={theme.text} /></Pressable>
          <Text style={{ color: theme.text, fontWeight: "700", flex: 1, marginLeft: 14 }}>
            {sel.size} selecionada{sel.size > 1 ? "s" : ""}
          </Text>
          <Pressable onPress={compartilhar} hitSlop={10} style={{ paddingHorizontal: 12 }}>
            <Feather name="share-2" size={20} color={theme.text} />
          </Pressable>
          <Pressable onPress={apagar} hitSlop={10} style={{ paddingHorizontal: 4 }}>
            <Feather name="trash-2" size={20} color={theme.danger} />
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: 12 }}>
          <View style={s.search}>
            <Feather name="search" size={18} color={theme.muted} />
            <TextInput
              style={{ flex: 1, color: theme.text }}
              placeholder="Filtrar por ano ou mês (ex: 2024, julho)"
              placeholderTextColor={theme.muted}
              value={q}
              onChangeText={setQ}
            />
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
            {perm === "granted" || perm === "limited"
              ? `${total.toLocaleString("pt-BR")} fotos · toque para abrir, segure para selecionar`
              : "acesso às fotos"}
          </Text>
        </View>
      )}

      {perm === "denied" ? (
        <View style={s.center}>
          <Feather name="image" size={28} color={theme.primary} />
          <Text style={{ color: theme.text, fontWeight: "600", marginTop: 8 }}>Sem acesso às fotos</Text>
          <Pressable style={s.btn} onPress={ask}><Text style={s.btnT}>Permitir</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={COLS}
          contentContainerStyle={{ padding: GAP }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          onEndReached={() => !q && loadMore()}
          onEndReachedThreshold={0.6}
          renderItem={({ item }) => {
            const marcada = sel.has(item.id);
            return (
              <Pressable
                onPress={() => (modoSelecao ? alternar(item.id) : router.push(`/foto/${item.id}`))}
                onLongPress={() => alternar(item.id)}
                delayLongPress={250}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: SIZE, height: SIZE, borderRadius: radius.sm, backgroundColor: theme.surface, opacity: marcada ? 0.55 : 1 }}
                  contentFit="cover"
                  transition={100}
                />
                {marcada && (
                  <View style={s.check}>
                    <Feather name="check" size={14} color={theme.primaryText} />
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={perm === "loading" ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>Nada encontrado.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.primary} style={{ margin: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11 },
  barraSel: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.surface, borderBottomColor: theme.border, borderBottomWidth: 1 },
  check: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12 },
  btnT: { color: theme.primaryText, fontWeight: "700" },
});
