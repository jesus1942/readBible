#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PWA_PORT="${PWA_PORT:-8080}"
API_PORT="${API_PORT:-3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-readbible_local}"

detect_ip() {
  local ip="127.0.0.1"
  if command -v ip >/dev/null 2>&1; then
    ip="$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {print $7; exit}')"
  elif command -v ifconfig >/dev/null 2>&1; then
    ip="$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n1 | awk '{print $2}')"
  fi
  echo "${ip:-127.0.0.1}"
}

APP_HOST="${APP_HOST:-$(detect_ip)}"
LOCAL_URL="http://${APP_HOST}:${PWA_PORT}/"
LOCAL_API_URL="http://${APP_HOST}:${API_PORT}/"

DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"
export DATABASE_URL
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${API_PORT}"
export APP_URL="${APP_URL:-${LOCAL_URL}}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:${PWA_PORT},http://localhost:${PWA_PORT},${LOCAL_URL%/}}"
export API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Falta comando requerido: $1" >&2
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(0.2)
result = sock.connect_ex(("127.0.0.1", port))
sock.close()
sys.exit(0 if result == 0 else 1)
PY
}

cleanup() {
  local exit_code=$?
  if [[ -n "${PWA_PID:-}" ]]; then
    kill "${PWA_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
  wait >/dev/null 2>&1 || true
  exit "${exit_code}"
}

trap cleanup INT TERM EXIT

require_cmd python3
require_cmd node
require_cmd npm
require_cmd psql
require_cmd createdb

if [[ ! -d "${BASE_DIR}/push-server/node_modules" ]]; then
  echo "Faltan dependencias en push-server." >&2
  echo "Ejecuta: cd push-server && npm install" >&2
  exit 1
fi

if port_in_use "${PWA_PORT}"; then
  echo "El puerto ${PWA_PORT} ya esta en uso. Cambia PWA_PORT o detene el proceso actual." >&2
  exit 1
fi

if port_in_use "${API_PORT}"; then
  echo "El puerto ${API_PORT} ya esta en uso. Cambia API_PORT o detene el proceso actual." >&2
  exit 1
fi

if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "No pude conectar a PostgreSQL en ${DB_HOST}:${DB_PORT} con usuario ${DB_USER}." >&2
  exit 1
fi

if [[ "$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'")" != "1" ]]; then
  echo "Creando base local ${DB_NAME}..."
  createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -T template0 "${DB_NAME}"
fi

echo "Levantando PWA en ${LOCAL_URL}"
python3 "${BASE_DIR}/server.py" --port "${PWA_PORT}" --directory "${BASE_DIR}" &
PWA_PID=$!

echo "Levantando API local en ${LOCAL_API_URL}"
(
  cd "${BASE_DIR}/push-server"
  node server.js
) &
API_PID=$!

sleep 2
if ! kill -0 "${PWA_PID}" >/dev/null 2>&1; then
  echo "La PWA no pudo iniciar. Revisa el error anterior." >&2
  exit 1
fi

if ! kill -0 "${API_PID}" >/dev/null 2>&1; then
  echo "La API no pudo iniciar. Revisa el error anterior." >&2
  exit 1
fi

echo "Stack local listo:"
echo "- PWA: ${LOCAL_URL}"
echo "- API: ${LOCAL_API_URL}"
echo "- DATABASE_URL: ${DATABASE_URL}"
if command -v qrencode >/dev/null 2>&1; then
  QR_PATH="${BASE_DIR}/qr.png"
  qrencode -o "${QR_PATH}" "${LOCAL_URL}"
  echo "- QR: ${QR_PATH}"
fi
echo
echo "Presiona Ctrl+C para detener ambos procesos."

wait "${PWA_PID}" "${API_PID}"
