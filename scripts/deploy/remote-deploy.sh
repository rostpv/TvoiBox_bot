#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/stack/tvoy-box-bot-deploy}"
RELEASE_NAME="${RELEASE_NAME:?RELEASE_NAME is required}"
RELEASE_ARCHIVE="${RELEASE_ARCHIVE:?RELEASE_ARCHIVE is required}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

RELEASES_DIR="${DEPLOY_ROOT}/releases"
SHARED_DIR="${DEPLOY_ROOT}/shared"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_NAME}"
CURRENT_LINK="${DEPLOY_ROOT}/current"

retry_curl() {
  local url="$1"
  local label="$2"
  local attempts="${3:-24}"
  local delay_seconds="${4:-5}"

  for ((attempt=1; attempt<=attempts; attempt++)); do
    if curl -fsS "$url" >/dev/null; then
      echo "[auto-deploy] ${label} is ready (${url})"
      return 0
    fi

    echo "[auto-deploy] waiting for ${label} (${attempt}/${attempts})"
    sleep "${delay_seconds}"
  done

  echo "[auto-deploy] ${label} did not become ready: ${url}"
  return 1
}

echo "[auto-deploy] DEPLOY_ROOT=${DEPLOY_ROOT}"
echo "[auto-deploy] RELEASE_NAME=${RELEASE_NAME}"

mkdir -p "${RELEASES_DIR}" "${SHARED_DIR}/.secrets" "${SHARED_DIR}/logs"

if [[ ! -f "${SHARED_DIR}/.env.server" ]]; then
  echo "[auto-deploy] Missing ${SHARED_DIR}/.env.server"
  exit 1
fi

if [[ ! -f "${SHARED_DIR}/.secrets/google-service-account.json" ]]; then
  echo "[auto-deploy] Missing ${SHARED_DIR}/.secrets/google-service-account.json"
  exit 1
fi

rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"
tar -xzf "${RELEASE_ARCHIVE}" -C "${RELEASE_DIR}"

ln -sfn "${SHARED_DIR}/.env.server" "${RELEASE_DIR}/.env.server"
ln -sfn "${SHARED_DIR}/.secrets" "${RELEASE_DIR}/.secrets"
ln -sfn "${SHARED_DIR}/logs" "${RELEASE_DIR}/logs"

find "${RELEASE_DIR}/scripts/deploy" -type f -name "*.sh" -exec sed -i 's/\r$//' {} +
chmod +x "${RELEASE_DIR}/scripts/deploy/deploy-server.sh"

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

cd "${CURRENT_LINK}"
bash scripts/deploy/deploy-server.sh

API_PORT_VALUE="$(grep -E '^API_PORT=' .env.server | head -n 1 | cut -d '=' -f 2- || true)"
retry_curl "http://127.0.0.1:${API_PORT_VALUE:-3300}/health" "API health"
MINI_APP_PORT_VALUE="$(grep -E '^MINI_APP_PORT=' .env.server | head -n 1 | cut -d '=' -f 2- || true)"
retry_curl "http://127.0.0.1:${MINI_APP_PORT_VALUE:-3302}/" "Mini app root"

if [[ -f "${RELEASE_ARCHIVE}" ]]; then
  rm -f "${RELEASE_ARCHIVE}"
fi

mapfile -t OLD_RELEASES < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -n | awk '{print $2}')

if (( ${#OLD_RELEASES[@]} > KEEP_RELEASES )); then
  REMOVE_COUNT=$(( ${#OLD_RELEASES[@]} - KEEP_RELEASES ))
  for ((i=0; i<REMOVE_COUNT; i++)); do
    if [[ "${OLD_RELEASES[$i]}" == "${RELEASE_DIR}" ]]; then
      continue
    fi
    rm -rf "${OLD_RELEASES[$i]}"
  done
fi

echo "[auto-deploy] Release ${RELEASE_NAME} deployed successfully"
