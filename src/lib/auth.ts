import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// URL do backend JÁ existente (mesmo better-auth/Neon da web). O app nativo é só um
// cliente — NÃO carrega segredo (lição do APK do cockpit: EXPO_PUBLIC_* vira público).
export const API_BASE = "https://acheiafoto.reverblabs.com.br";

export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [
    expoClient({
      scheme: "acheiafoto",
      storagePrefix: "acheiafoto",
      storage: SecureStore, // sessão guardada no keychain/keystore do device
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
