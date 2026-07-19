import { useEffect } from "react";
import { View, ActivityIndicator, Alert, Linking } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "@/lib/auth";
import { checkForUpdate } from "@/lib/update";
import { theme } from "@/lib/theme";

export default function Index() {
  const { data: session, isPending } = useSession();

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

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }
  return <Redirect href={session ? "/inicio" : "/login"} />;
}
