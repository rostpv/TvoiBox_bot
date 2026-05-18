# Деплой на VPS в Docker без конфликтов между проектами

## Принцип изоляции

Каждый проект запускается как отдельный Docker Compose stack.
Изоляция достигается за счет четырех правил:

1. У каждого проекта свой `STACK_NAME`.
2. В compose нет `container_name`, поэтому Docker сам префиксует имена контейнеров по stack name.
3. У каждого проекта свои volume и network:
   - `${STACK_NAME}_postgres_data`
   - `${STACK_NAME}_internal`
4. API публикуется только на `127.0.0.1` VPS и на отдельном порту.

Это значит, что на одном VPS могут одновременно жить:

- `tvoy-box-bot`
- `crm-bot`
- `fitness-admin`

и они не будут делить контейнеры, тома, сеть или PostgreSQL.

## Что лежит в репозитории

- `deploy/compose.server.yml` - production stack
- `.env.server.example` - пример серверных переменных
- `infra/docker/Dockerfile.api` - образ для API
- `infra/docker/Dockerfile.bot` - образ для бота
- `scripts/deploy/server-bootstrap.sh` - базовая подготовка VPS
- `scripts/deploy/deploy-server.sh` - локальный запуск stack на сервере

## Первый запуск на сервере

```bash
mkdir -p /opt/stacks
git clone <REPO_URL> /opt/stacks/tvoy-box-bot
cd /opt/stacks/tvoy-box-bot
cp .env.server.example .env.server
```

После этого в `.env.server` обязательно заполнить:

- `STACK_NAME`
- `API_PORT`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_ID`
- `TRAINER_TELEGRAM_ID`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- Google Calendar переменные, если используется синхронизация

Запуск:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml up -d --build
```

Проверка:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml ps
curl http://127.0.0.1:3300/health
```

## Как добавить на тот же VPS следующий проект

Для нового проекта нужен новый каталог и другой `STACK_NAME`.

Пример:

```bash
git clone <ANOTHER_REPO_URL> /opt/stacks/crm-bot
cd /opt/stacks/crm-bot
cp .env.server.example .env.server
```

Минимум, что должно отличаться от первого проекта:

- `STACK_NAME=crm-bot`
- `API_PORT=3310`
- `POSTGRES_DB=crm_bot`
- `POSTGRES_USER=crm_bot`
- `POSTGRES_PASSWORD=<другой пароль>`
- `DATABASE_URL=postgresql://crm_bot:<пароль>@postgres:5432/crm_bot`

Дальше запуск тот же:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml up -d --build
```

## Чего не делать

- Не задавать одинаковый `STACK_NAME` разным проектам.
- Не прописывать `container_name`.
- Не публиковать PostgreSQL наружу через `ports`.
- Не использовать один и тот же `API_PORT` у двух проектов.

## Если на VPS уже есть другой Docker-проект

Это не мешает, если:

- у нового проекта свой каталог;
- у нового проекта свой `STACK_NAME`;
- новый проект не занимает уже занятый host port.

Проверить занятые контейнеры и порты можно так:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```
