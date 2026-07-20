import { useEffect, useRef } from "react";
import { View, ActivityIndicator, Alert, Linking } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSession } from "@/lib/auth";
import { checkForUpdate } from "@/lib/update";
import { theme } from "@/lib/theme";

// Âncora = a área autenticada é o destino padrão da navegação. Sem isto, um re-render
// (ex.: refetch da sessão do better-auth) podia resetar a pilha e jogar o usuário de volta
// pra tela inicial ("volta pro Início em uma série de acessos").
export const unstable_settings = { anchor: "(tabs)" };

// Gate por ROTAS PROTEGIDAS (não mais por uma tela-index que fazia router.replace). O
// expo-router mostra só as telas cujo guard é true e redireciona sozinho quando a sessão
// muda (login entra → abas; logout → login). Zero navegação manual = zero bounce.
export default function RootLayout() {
  const { data: session, isPending } = useSession();
  const resolvedOnce = useRef(false);
  if (!isPending) resolvedOnce.current = true;

  useEffect(() => {
    checkForUpdate()
      .then((u) => {
        if (u.hasUpdate && u.apkUrl) {
          Alert.alert(
            "Atualização disponível",
            `Versão ${u.version} pronta.${u.notes ? `\n\n${u.notes}` : ""}`,
            [
              { text: "Depois", style: "cancel" },
              { text: "Baixar", onPress: () => Linking.openURL(u.apkUrl!) },
            ],
          );
        }
      })
      .catch(() => {});
  }, []);

  // Splash só até a PRIMEIRA resolução da sessão — não pisca em refetches posteriores.
  if (!resolvedOnce.current) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const authed = !!session;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Protected guard={authed}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ferramenta/[key]" options={{ title: "" }} />
        </Stack.Protected>
        <Stack.Protected guard={!authed}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
