import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useSession } from "@/lib/auth";
import { DevicePhotosProvider } from "@/lib/devicephotos";
import { checkForUpdate } from "@/lib/update";
import { theme } from "@/lib/theme";

// Segura o splash NATIVO até a sessão resolver. Assim o <Stack> fica SEMPRE montado (não
// trocamos a árvore React entre "splash" e "stack") — isso evita o erro de concurrent
// rendering no root que deixava o app instável / sem responder a toques.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Âncora = área autenticada é o destino padrão (re-render de sessão não reseta a navegação).
export const unstable_settings = { anchor: "(tabs)" };

// O gate de autenticação NÃO fica aqui — mora em (tabs)/_layout.tsx, como <Redirect>.
// <Stack.Protected> quebrava o boot frio com sessão salva (tela preta); o histórico completo
// está comentado lá.
export default function RootLayout() {
  // Só o isPending interessa aqui: o gate de autenticação mora em (tabs)/_layout.tsx.
  const { isPending } = useSession();

  // Esconde o splash nativo assim que a sessão resolve (cobre o flash login↔abas no boot).
  useEffect(() => {
    if (!isPending) SplashScreen.hideAsync().catch(() => {});
  }, [isPending]);

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

  return (
    <>
      <StatusBar style="light" />
      <DevicePhotosProvider>

        <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ferramenta/[key]" options={{ title: "" }} />
          <Stack.Screen name="foto/[id]" options={{ title: "" }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>

      </DevicePhotosProvider>
    </>
  );
}
