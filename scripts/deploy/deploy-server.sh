#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="deploy/compose.server.yml"

cd "$ROOT_DIR"

if [[ ! -f ".env.server" ]]; then
  echo "Файл .env.server не найден. Скопируй .env.server.example в .env.server и заполни секреты."
  exit 1
fi

STACK_NAME="$(grep -E '^STACK_NAME=' .env.server | head -n 1 | cut -d '=' -f 2- || true)"
API_PORT_VALUE="$(grep -E '^API_PORT=' .env.server | head -n 1 | cut -d '=' -f 2- || true)"

if [[ -z "${STACK_NAME}" ]]; then
  echo "В .env.server не задан STACK_NAME."
  exit 1
fi

echo "[$STACK_NAME] Поднимаю PostgreSQL..."
docker compose --env-file .env.server -f "$COMPOSE_FILE" up -d postgres

echo "[$STACK_NAME] Собираю образы приложения..."
docker compose --env-file .env.server -f "$COMPOSE_FILE" build migrate api bot

echo "[$STACK_NAME] Применяю Prisma-схему..."
docker compose --env-file .env.server -f "$COMPOSE_FILE" run --rm migrate

echo "[$STACK_NAME] Запускаю API и бота..."
docker compose --env-file .env.server -f "$COMPOSE_FILE" up -d api bot

echo "Стек ${STACK_NAME} запущен."
echo "Проверка API: curl http://127.0.0.1:${API_PORT_VALUE:-3300}/health"
