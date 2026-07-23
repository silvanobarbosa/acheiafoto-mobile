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

# No git-bash do Windows: `adb install` precisa de caminho WINDOWS, e `adb shell` precisa que
# o MSYS NAO converta /sdcard/... em C:\Program Files\Git\sdcard\... Sao exigencias opostas,
# entao converte a APK aqui e desliga a conversao para o resto.
if command -v cygpath >/dev/null 2>&1; then APK=$(cygpath -w "$APK"); fi
export MSYS_NO_PATHCONV=1
adb get-state >/dev/null 2>&1 || { echo "nenhum device/emulador conectado"; exit 2; }

# Padroes que significam "o JS morreu". Nao sao warnings: cada um deixa tela preta.
FATAIS='Cannot find module|ErrorBoundary. of undefined|FATAL EXCEPTION|handleHostException|AndroidRuntime: Shutting down'

EMAIL="${2:-}"
SENHA="${3:-}"

echo "instalando $APK ..."
if ! adb install -r -d "$APK" 2>&1 | tee /tmp/.smoke-install | grep -q "Success"; then
  # INSTALL_FAILED_UPDATE_INCOMPATIBLE: o aparelho tem uma APK assinada com outra chave
  # (tipico depois de testar um repack local). Desinstalar e a unica saida — e apaga a
  # sessao, por isso a fase de login vem DEPOIS desta etapa.
  if grep -q "signatures do not match" /tmp/.smoke-install; then
    echo "  assinatura diferente da instalada — desinstalando antes"
    adb uninstall "$PKG" >/dev/null 2>&1 || true
    adb install "$APK" >/dev/null
  else
    cat /tmp/.smoke-install; exit 2
  fi
fi
adb shell pm grant "$PKG" android.permission.READ_MEDIA_IMAGES >/dev/null 2>&1 || true

# Fase de login: sem sessao salva, o teste nao exercita o caminho que quebra.
if [ -n "$EMAIL" ] && [ -n "$SENHA" ]; then
  echo "logando como $EMAIL ..."
  adb shell am force-stop "$PKG"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1

  # ESPERA O ELEMENTO, nao um tempo fixo. Em instalacao nova, com galeria grande, o app fica
  # mais de 25s no splash: o script digitava no vazio e os campos ficavam em branco — e os
  # boots seguintes mediam o caso deslogado, dando verde falso.
  pronto=0
  for _ in $(seq 1 20); do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    if adb shell cat /sdcard/ui.xml 2>/dev/null | grep -q "Bem-vindo de volta"; then pronto=1; break; fi
    sleep 5
  done
  [ "$pronto" = 1 ] || { echo "  ERRO: tela de login nao apareceu — abortando"; exit 3; }

  adb shell input tap 540 1183; sleep 1
  # `input text` engole caracteres em textos longos: digita em pedacos de 10.
  #
  # NAO usar `... | while read`: `adb shell` LE O STDIN e devora o resto do pipe, entao só o
  # primeiro pedaco era digitado. O campo ficava com "qa-mobile@" e o login falhava — e eu
  # perdia tempo procurando defeito no app, que estava certo.
  pedacos=$(echo "$EMAIL" | fold -w 10)
  for p in $pedacos; do adb shell input text "$p" </dev/null; sleep 2; done
  adb shell input tap 540 1352; sleep 1
  adb shell input text "$SENHA" </dev/null; sleep 3
  adb shell input keyevent 4; sleep 2
  adb shell input tap 540 1606; sleep 20
  # VERIFICACAO DE VERDADE: le a tela. Checar foco de janela nao serve — o app "em foco" na
  # tela de LOGIN passava como sessao criada, e os 3 boots seguintes mediam o caso deslogado,
  # que e justamente o que NAO quebra. Este teste ja deu verde falso duas vezes assim.
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  tela=$(adb shell cat /sdcard/ui.xml 2>/dev/null | tr '>' '\n')
  if echo "$tela" | grep -q "Bem-vindo de volta"; then
    echo "  ERRO: continua na tela de login — sessao NAO foi criada."
    echo "  Sem sessao, o teste mede o caso que nunca quebra. Abortando em vez de aprovar."
    exit 3
  fi
  echo "  sessao confirmada (app fora da tela de login)"
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
