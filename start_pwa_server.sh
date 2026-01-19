#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Intentar obtener IP local (Linux/macOS compatible basic check)
IP="127.0.0.1"
if command -v ip >/dev/null; then
    IP="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {print $7; exit}')"
elif command -v ifconfig >/dev/null; then
    IP="$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n1 | awk '{print $2}')"
fi

URL="http://${IP}:${PORT}/"
echo "URL: ${URL}"
echo "Servidor en: ${BASE_DIR}"

if command -v qrencode >/dev/null; then
    QR_PATH="${BASE_DIR}/qr.png"
    qrencode -o "${QR_PATH}" "${URL}"
    echo "QR generado: ${QR_PATH}"
fi

python3 "${BASE_DIR}/server.py" --port "${PORT}" --directory "${BASE_DIR}"
