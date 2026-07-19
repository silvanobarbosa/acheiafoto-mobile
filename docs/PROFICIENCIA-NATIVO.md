# Proficiência em app nativo — o que precisamos fazer

## Diagnóstico honesto (por que travou)
As idas e vindas do Achei a Foto nativo **não foram o app** — foi **onde/como buildamos**:
- **Máquina fraca de RAM**: builds de 8–40min, daemon morrendo, ANR no emulador.
- **Cache do Metro corrompe a cada build incremental** → `Cannot find module` → tela preta no
  login/início. Voltava toda hora.
- **APK é arm64, emulador local é x86** → não dá pra testar o binário que o usuário instala →
  shippei no escuro → várias versões quebradas.
- **Toda mudança de JS exigia rebuild nativo** (40min) → loop lento e frágil.

## A virada: EAS (nuvem da Expo)
Buildar e atualizar na **nuvem**, não local. Três peças:

### 1. EAS Build — builds na nuvem (fim do inferno local)
- Build **limpo toda vez** (sem cache podre), ambiente Linux consistente, **keystore
  gerenciado** pela Expo, gera arm64 + link de instalação (internal distribution).
- Free: **15 builds Android/mês**, 1 concorrente, 45min timeout. Suficiente pra 1 app.
- Comando: `eas build -p android --profile preview` → APK pronto pra baixar.

### 2. EAS Update (OTA) — **o divisor de águas**
- Depois de **1** build nativo, mudanças de **JS/assets** (login, telas, navegação, logo =
  ~95% do que fizemos) vão **no ar em segundos** com `eas update`, **sem rebuild**.
- O celular pega a atualização **ao reabrir o app**. Free: **1.000 MAUs** + 100 GiB banda.
- Isso mata o loop "40min por ajuste" e o risco de cache podre (a nuvem builda limpo).

### 3. runtimeVersion: política **fingerprint**
- Garante compatibilidade entre o binário instalado e a atualização OTA.
- **fingerprint** detecta automaticamente quando algo nativo mudou → só aí exige rebuild.
- **OTA basta** quando: só mudou JS/assets, nenhuma lib nativa nova, sem upgrade de SDK.
- **Rebuild necessário** quando: add/remove lib nativa (ex: expo-linear-gradient), muda
  config nativa, sobe o Expo SDK.

## O novo ciclo de trabalho
- **Mudança nativa (rara)** → `eas build` (nuvem, limpo) → novo APK.
- **Mudança de JS (comum)** → `eas update` → no ar em segundos, sem rebuild, testável na hora.

## Fases seguintes (proficiência completa)
- **EAS Submit**: publicar na Play Store / App Store direto da nuvem (`eas submit`).
- **Crash monitoring (Sentry/expo)**: ver crashes de campo (a "tela preta" a gente ficava cego;
  com Sentry a gente vê o stack real sem depender de emulador).
- **CI**: `EXPO_TOKEN` no runner self-hosted da frota → build automático a cada push.
- **Testes**: 1 preview build num device real (ou arm64) + `expo start` dev pra iterar JS na hora.

## O que precisa de você (uma vez)
1. Conta Expo (grátis) em expo.dev.
2. **Access Token**: expo.dev → Account Settings → Access Tokens → cria → cola aqui.
   (Ou `eas login` interativo na sua máquina.)

## O que eu rodo com o token (tudo eu)
```
EXPO_TOKEN=... eas init                    # linka o projeto (projectId/owner)
EXPO_TOKEN=... eas update:configure        # OTA: updates.url + runtimeVersion + manifest
EXPO_TOKEN=... eas build -p android --profile preview   # APK limpo na nuvem
# dai em diante, correcao de JS:
EXPO_TOKEN=... eas update --channel preview --message "fix X"
```
→ APK no Telegram + a partir daí **fixes vão OTA**, sem rebuild.

## Segurança (regra da casa)
- Token Expo = credencial → só env, nunca no git/código.
- App nativo **nunca** carrega segredo (lição do APK do cockpit: `EXPO_PUBLIC_*` vira público).
