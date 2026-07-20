#!/usr/bin/env bash
# Mede TRAVAMENTO do app no emulador, com galeria realista.
#
# Por que existe: o APK de release e arm64 e NAO roda no emulador x86 do PC. Sem uma variante
# universal (perfil `emu` no eas.json) toda mudanca ia pro usuario sem nunca ter sido executada
# — foi assim que "travando com frequencia" chegou nele. Alem disso, medir com a galeria VAZIA
# nao vale nada: o caminho que quebra so aparece com milhares de fotos.
#
# Uso:
#   bash scripts/medir-travamento.sh popular          # enche o emulador com 2500 fotos
#   bash scripts/medir-travamento.sh medir <apk>      # instala o apk e mede
#
# Saida: frames_perdidos_total e pior_frame_ms (quanto MENOR, melhor).
# Baseline conhecido (build com 3 consultas concorrentes, 2500 fotos): 102 frames / 1874 ms.

set -uo pipefail
SDK="${LOCALAPPDATA:-$HOME}/Android/Sdk"
export PATH="$PATH:$SDK/platform-tools:$SDK/emulator"
export MSYS_NO_PATHCONV=1   # git-bash converte /data/... em caminho Windows e quebra o adb push
PKG=com.reverblabs.acheiafoto
QTD=${QTD:-2500}

popular() {
  local base="assets/images/memories-grid.jpg"
  adb shell "mkdir -p /sdcard/Pictures/Camera"
  adb push "$base" /sdcard/Pictures/Camera/IMG_0001.jpg >/dev/null
  adb shell "cd /sdcard/Pictures/Camera && for i in \$(seq 2 $QTD); do cp IMG_0001.jpg IMG_\$i.jpg; done"
  # indexa no MediaStore (senao o app nao enxerga os arquivos)
  adb shell 'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/Camera' >/dev/null 2>&1
  adb shell 'content call --uri content://media --method scan_volume --arg external_primary' >/dev/null 2>&1
  sleep 20
  echo "indexadas: $(adb shell 'content query --uri content://media/external/images/media --projection _id 2>/dev/null | wc -l')"
}

medir() {
  local apk="$1"
  adb uninstall $PKG >/dev/null 2>&1
  adb install -r "$apk" | tail -1
  adb shell pm grant $PKG android.permission.READ_MEDIA_IMAGES 2>/dev/null
  adb shell am force-stop $PKG; sleep 2; adb logcat -c
  adb shell am start -n $PKG/.MainActivity >/dev/null 2>&1; sleep 18

  # login (coordenadas do layout atual; ajuste se a tela mudar)
  adb shell input tap 690 1404 >/dev/null 2>&1; sleep 1          # dispensa aviso de update
  adb shell input tap 540 1220 >/dev/null 2>&1; sleep 1
  adb shell input text "dev" >/dev/null 2>&1
  adb shell input keyevent 77 >/dev/null 2>&1                    # @
  adb shell input text "reverblabs.com.br" >/dev/null 2>&1
  adb shell input tap 540 1388 >/dev/null 2>&1; sleep 1
  adb shell input text "Hogo2738" >/dev/null 2>&1
  adb shell input keyevent 111 >/dev/null 2>&1                   # fecha teclado
  adb shell input tap 540 1571 >/dev/null 2>&1; sleep 14

  # percorre as telas que leem a galeria
  adb shell input tap 404 2274 >/dev/null 2>&1; sleep 6          # Buscar
  adb shell input tap 672 2274 >/dev/null 2>&1; sleep 5          # Ferramentas
  adb shell input tap 540 620  >/dev/null 2>&1; sleep 6          # abre ferramenta
  adb shell input tap 111 2274 >/dev/null 2>&1; sleep 5          # volta Inicio

  local pid sk maxd
  pid=$(adb shell pidof $PKG | tr -d '\r')
  sk=$(adb logcat -d 2>/dev/null | grep "Skipped .* frames" | grep " $pid " | grep -oE "Skipped [0-9]+" | awk '{s+=$2} END{print s+0}')
  maxd=$(adb logcat -d 2>/dev/null | grep "Davey" | grep -oE "duration=[0-9]+" | cut -d= -f2 | sort -rn | head -1)
  echo "frames_perdidos_total=$sk  pior_frame_ms=${maxd:-0}"
  adb logcat -d 2>/dev/null | grep -ciE "Cannot find module|FATAL EXCEPTION" | xargs -I{} echo "erros_fatais={}"
}

case "${1:-}" in
  popular) popular ;;
  medir)   medir "${2:?informe o caminho do apk}" ;;
  *) echo "uso: $0 popular | medir <apk>"; exit 2 ;;
esac
