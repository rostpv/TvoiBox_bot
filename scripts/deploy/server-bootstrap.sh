#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin найден."
else
  echo "docker compose недоступен."
  exit 1
fi

mkdir -p /opt/stacks

cat <<'EOF'
Базовая структура готова.

Рекомендуемый шаблон для каждого нового проекта:
1. git clone <repo> /opt/stacks/<stack-name>
2. cd /opt/stacks/<stack-name>
3. cp .env.server.example .env.server
4. Отредактировать STACK_NAME, API_PORT, DATABASE_URL, токены и секреты.
5. docker compose --env-file .env.server -f deploy/compose.server.yml up -d --build

Изоляция между проектами достигается за счет:
- уникального STACK_NAME;
- отсутствия container_name;
- отдельной bridge-сети ${STACK_NAME}_internal;
- отдельного volume ${STACK_NAME}_postgres_data;
- публикации API только на 127.0.0.1 и на отдельном порту.
EOF
