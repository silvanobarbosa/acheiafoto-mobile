import { useEffect, useRef } from "react";
import { View, ActivityIndicator, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/auth";
import { checkForUpdate } from "@/lib/update";
import { theme } from "@/lib/theme";

// Gate de entrada. Redireciona UMA vez (router.replace com guard) — NÃO usar <Redirect>
// declarativo aqui: o useSession refaz fetch e re-renderiza, e o <Redirect> dispararia de
// novo, jogando o usuário de volta pro Início de qualquer tela ("comportamento instável").
export default function Index() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const navigated = useRef(false);

  useEffect(() => {
    if (isPending || navigated.current) return;
    navigated.current = true;
    router.replace(session ? "/inicio" : "/login");
  }, [isPending, session, router]);

  useEffect(() => {
    checkForUpdate().then((u) => {
      if (u.hasUpdate && u.apkUrl) {
        Alert.alert("Atualização disponível", `Versão ${u.version} pronta.${u.notes ? `\n\n${u.notes}` : ""}`, [
          { text: "Depois", style: "cancel" },
          { text: "Baixar", onPress: () => Linking.openURL(u.apkUrl!) },
        ]);
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}
