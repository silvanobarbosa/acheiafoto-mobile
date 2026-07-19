import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions, TextInput } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { theme, radius } from "@/lib/theme";
import { useDevicePhotos } from "@/lib/devicephotos";

const W = Dimensions.get("window").width;
const COLS = 3;
const GAP = 3;
const SIZE = (W - GAP * (COLS + 1)) / COLS;

export default function Buscar() {
  const { perm, photos, total, loadMore, loadingMore, ask } = useDevicePhotos(90);
  const [q, setQ] = useState("");

  // sem ML: filtra por ano/mês digitado (ex: "2024", "julho"). Vazio = tudo.
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return photos;
    return photos.filter((p) => {
      const d = new Date(p.creationTime);
      const label = `${d.getFullYear()} ${d.toLocaleDateString("pt-BR", { month: "long" })}`.toLowerCase();
      return label.includes(t);
    });
  }, [photos, q]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
          {perm === "granted" ? `${total.toLocaleString("pt-BR")} fotos no aparelho` : "acesso às fotos"}
        </Text>
      </View>

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
          renderItem={({ item }) => (
            <Image source={{ uri: item.uri }} style={{ width: SIZE, height: SIZE, borderRadius: radius.sm, backgroundColor: theme.surface }} contentFit="cover" transition={100} />
          )}
          ListEmptyComponent={perm === "loading" ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>Nada encontrado.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.primary} style={{ margin: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12 },
  btnT: { color: theme.primaryText, fontWeight: "700" },
});
