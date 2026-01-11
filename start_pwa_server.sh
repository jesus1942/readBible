#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
BASE_DIR="/home/jesusolguin/Escritorio/pimba/pwa"

IP="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {print $7; exit}')"
if [ -z "$IP" ]; then
  echo "No se pudo detectar IP local."
  exit 1
fi

URL="http://${IP}:${PORT}/"
QR_PATH="${BASE_DIR}/qr.png"

qrencode -o "${QR_PATH}" "${URL}"
echo "QR generado: ${QR_PATH}"
echo "URL: ${URL}"
echo "Servidor en: ${BASE_DIR}"

python3 "${BASE_DIR}/server.py" --port "${PORT}" --directory "${BASE_DIR}"
