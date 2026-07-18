import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { signOut } from "@/lib/auth";
import { registerForPush } from "@/lib/push";
import { theme, radius } from "@/lib/theme";

const COLS = 3;
const GAP = 4;
const SIZE = (Dimensions.get("window").width - GAP * (COLS + 1)) / COLS;

export default function Gallery() {
  const router = useRouter();
  const [perm, setPerm] = useState<"loading" | "granted" | "denied">("loading");
  const [assets, setAssets] = useState<{ id: string; uri: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: 60,
      sortBy: [["creationTime", false]],
      after: cursor,
    });
    const mapped = page.assets.map((a) => ({ id: a.id, uri: a.uri }));
    setAssets((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setAfter(page.endCursor);
    setTotal(page.totalCount);
    return page.hasNextPage;
  }, []);

  useEffect(() => {
    (async () => {
      // acesso REAL à galeria do celular — o que o PWA não conseguia.
      const res = await MediaLibrary.requestPermissionsAsync(false);
      if (!res.granted) { setPerm("denied"); return; }
      setPerm("granted");
      await load();
      registerForPush(); // token p/ push (enviar ao backend depois)
    })();
  }, [load]);

  const onEnd = async () => {
    if (loadingMore || !after) return;
    setLoadingMore(true);
    const more = await load(after);
    if (!more) setAfter(undefined);
    setLoadingMore(false);
  };

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (perm === "loading") {
    return <View style={s.center}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }
  if (perm === "denied") {
    return (
      <View style={s.center}>
        <Text style={s.h}>Sem acesso às fotos</Text>
        <Text style={s.p}>Autorize o acesso à galeria nas configurações do aparelho para o app organizar suas memórias.</Text>
        <Pressable style={s.btn} onPress={() => MediaLibrary.requestPermissionsAsync(false).then((r) => setPerm(r.granted ? "granted" : "denied"))}>
          <Text style={s.btnText}>Permitir acesso</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={s.header}>
        <Text style={s.count}>{total.toLocaleString("pt-BR")} fotos no seu aparelho</Text>
        <Pressable onPress={logout}><Text style={s.link}>Sair</Text></Pressable>
      </View>
      <FlatList
        data={assets}
        keyExtractor={(a) => a.id}
        numColumns={COLS}
        contentContainerStyle={{ padding: GAP }}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={{ width: SIZE, height: SIZE, borderRadius: radius.sm, backgroundColor: theme.surface }} contentFit="cover" transition={120} />
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.primary} style={{ margin: 16 }} /> : null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  h: { color: theme.text, fontSize: 20, fontWeight: "700" },
  p: { color: theme.muted, fontSize: 14, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  count: { color: theme.muted, fontSize: 13 },
  link: { color: theme.primary, fontSize: 14, fontWeight: "600" },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, marginTop: 8 },
  btnText: { color: theme.primaryText, fontWeight: "700" },
});
