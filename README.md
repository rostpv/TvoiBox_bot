# Твой Бокс: бот записи на тренировки

Production-проект Telegram-бота и Telegram Mini App для записи на персональные тренировки.

## Production

- Бот: `@TvoyBox_bot`
- API: `https://api.tvoybox.ru`
- Mini App: `https://app.tvoybox.ru`
- GitHub: `https://github.com/rostpv/TvoiBox_bot`
- Рабочая ветка для production-деплоя: `main`
- VPS: `155.212.137.86`
- Deploy root: `/opt/stack/tvoy-box-bot-deploy`

Все production-деплои идут из `main` через GitHub Actions.

Текущий статус передачи: завершена, см. `docs/handover-progress.md`.

## Что внутри

- `apps/api` - backend API на NestJS.
- `apps/bot` - Telegram-бот на grammY.
- `apps/mini-app` - Telegram Mini App на Next.js.
- `packages/*` - общие типы, конфигурация, логирование и утилиты.
- `deploy/compose.server.yml` - production Docker Compose.
- `scripts/deploy/*` - серверные deploy-скрипты.
- `.github/workflows/deploy-production.yml` - автодеплой production.

## Production deploy

Автодеплой запускается при push в `main`.

GitHub Actions secrets:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_KNOWN_HOSTS`

На VPS должны существовать:

```text
/opt/stack/tvoy-box-bot-deploy/shared/.env.server
/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

Проверка после деплоя:

```bash
curl https://api.tvoybox.ru/health
curl https://app.tvoybox.ru/mini-api/health
curl -I https://app.tvoybox.ru/
```

## Локальный запуск для разработки

```bash
corepack pnpm install
corepack pnpm dev:db:up
corepack pnpm dev:api
corepack pnpm dev:mini-app
```

Для локального запуска нужны локальные `.env`-файлы. Они не хранятся в репозитории.

## Важные документы

- `docs/handover-progress.md` - итоговый прогресс передачи проекта новому владельцу.
- `docs/production-ops-runbook.md` - эксплуатация production.
- `docs/owner-production-check.md` - короткий чек-лист проверки владельцем.
- `docs/post-handover-backlog.md` - выполненные после передачи задачи и будущий backlog.

## Секреты

Не хранить в GitHub:

- Telegram bot token
- `.env` и `.env.server`
- Google service account JSON
- SSH private keys
- пароли и database URL с реальными значениями
