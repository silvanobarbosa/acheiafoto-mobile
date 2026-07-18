# Achei a Foto — app nativo (Expo / React Native)

App **nativo** (iOS + Android) do Achei a Foto. Substitui o PWA porque só o nativo
acessa a **galeria real** do celular (`expo-media-library`) — o que a web não consegue.

**Reusa 100% o backend web** (`https://acheiafoto.reverblabs.com.br`): better-auth,
Neon, premium/convite/billing, gateway de IA. O app é só o cliente — **nunca carrega
segredo** (lição do APK do cockpit: `EXPO_PUBLIC_*` vira público dentro do binário).

## MVP entregue (scaffold)
- Login (better-auth via `@better-auth/expo`, sessão no keychain/keystore).
- **Galeria real** do aparelho (`expo-media-library`) — grid paginado.
- Push (`expo-notifications`) + **aviso de atualização** por APK (`checkForUpdate`).
- Tema âmbar (mesmas cores da web).

## Rodar local
```bash
npm install
npx expo start            # abre no Expo Go (dev)
```

## Gerar o APK (distribuição por link — fase 1)
Precisa de conta Expo (grátis). **Só você roda** (login interativo):
```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview     # gera APK, devolve link de download
```
O link do APK é o que você compartilha. iOS (depois): `eas build -p ios` — exige
**Apple Developer** (US$ 99/ano).

## Mudanças necessárias no BACKEND web (achei-a-foto)
Pra o nativo funcionar 100%, aplicar no repo `achei-a-foto`:
1. **Auth nativo:** adicionar o plugin `expo()` do `@better-auth/expo` no
   `src/lib/auth-kit/server.ts` e incluir `acheiafoto://` em `trustedOrigins`.
2. **Aviso de atualização:** `GET /api/app/version` -> `{ version, apkUrl, notes }`.
3. **Push:** `POST /api/push/register` (guarda o Expo push token do device) + disparo
   via Expo Push API a partir do hub.

## Lojas (fase 2, pós-MVP)
`eas build --profile production` (Android app-bundle / iOS) -> `eas submit`.
Apple US$ 99/ano - Google Play US$ 25 (uma vez).

## Governança
Repo `silvanobarbosa/acheiafoto-mobile`, registrado na frota ReverbLabs.
