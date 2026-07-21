#!/usr/bin/env bash
# Teste de fumaça de APK: instala, dá boot FRIO 3x e falha se o app crashar no boot.
#
# Por que existe: a vc13 subiu com a arvore de rotas quebrada (inlineRequires + require.context
# do expo-router). O sintoma pro dono era TELA PRETA — nenhuma mensagem, nenhum erro visivel.
# Passou por typecheck, passou por build de nuvem, e so apareceu no aparelho. A unica coisa
# que pega isso e ligar o app de verdade e ler o logcat.
#
# TESTA LOGADO, nao so recem-instalado. A primeira versao deste script so dava boot com o
# app zerado (sem sessao) e deu APROVADO numa APK que quebrava 3/3 em boot frio COM sessao
# salva — que e justamente o estado de todo usuario real. Boot deslogado exercita meia arvore
# de rotas; o defeito morava na outra metade.
#
# Uso: bash scripts/smoke-apk.sh caminho/do.apk [email] [senha]
set -euo pipefail

APK="${1:?uso: smoke-apk.sh <arquivo.apk>}"
PKG="com.reverblabs.acheiafoto"
BOOTS="${BOOTS:-3}"
ESPERA="${ESPERA:-25}"

command -v adb >/dev/null || { echo "adb nao esta no PATH"; exit 2; }
[ -f "$APK" ] || { echo "APK nao encontrado: $APK"; exit 2; }
adb get-state >/dev/null 2>&1 || { echo "nenhum device/emulador conectado"; exit 2; }

# Padroes que significam "o JS morreu". Nao sao warnings: cada um deixa tela preta.
FATAIS='Cannot find module|ErrorBoundary. of undefined|FATAL EXCEPTION|handleHostException|AndroidRuntime: Shutting down'

EMAIL="${2:-}"
SENHA="${3:-}"

echo "instalando $APK ..."
adb install -r -d "$APK" >/dev/null
adb shell pm grant "$PKG" android.permission.READ_MEDIA_IMAGES >/dev/null 2>&1 || true

# Fase de login: sem sessao salva, o teste nao exercita o caminho que quebra.
if [ -n "$EMAIL" ] && [ -n "$SENHA" ]; then
  echo "logando como $EMAIL ..."
  adb shell am force-stop "$PKG"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep "$ESPERA"
  adb shell input tap 540 1183; sleep 1
  # `input text` engole caracteres em textos longos: digita em pedacos.
  echo "$EMAIL" | fold -w 10 | while read -r p; do adb shell input text "$p"; sleep 2; done
  adb shell input tap 540 1352; sleep 1
  adb shell input text "$SENHA"; sleep 3
  adb shell input keyevent 4; sleep 2
  adb shell input tap 540 1606; sleep 20
  if adb shell dumpsys window 2>/dev/null | grep -q "mCurrentFocus.*$PKG"; then
    echo "  sessao criada"
  else
    echo "  AVISO: nao confirmei o login — o teste abaixo pode nao cobrir o caso logado"
  fi
fi

falhas=0
for i in $(seq 1 "$BOOTS"); do
  adb logcat -c
  adb shell am force-stop "$PKG"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep "$ESPERA"

  achado=$(adb logcat -d 2>/dev/null | grep -E "$FATAIS" | head -5 || true)
  if [ -n "$achado" ]; then
    falhas=$((falhas + 1))
    echo "boot $i: FALHOU"
    echo "$achado" | sed 's/^/    /'
  elif ! adb shell pidof "$PKG" >/dev/null 2>&1; then
    falhas=$((falhas + 1))
    echo "boot $i: FALHOU (processo morreu)"
  else
    echo "boot $i: ok"
  fi
done

echo
if [ "$falhas" -gt 0 ]; then
  echo "REPROVADO: $falhas de $BOOTS boots quebraram. Nao liberar esta APK."
  exit 1
fi
echo "APROVADO: $BOOTS de $BOOTS boots limpos."
