# Future Agent Prompt

Ты работаешь с проектом Telegram bot + mini app для клуба "Твой Бокс".
Пиши пользователю на русском языке.

## Где проект

Локальная папка проекта:

```text
C:\Users\User\OneDrive\Desktop\Согласование времени тренировок Твой Бокс
```

Основная ветка:

```text
main
```

Активный production bot:

```text
@TvoyBox_bot
```

Dev/test-контур выключен. `@testtvoy_bot` больше не используется.

## Что прочитать первым

1. `AGENTS.md`, если он есть в корне или передан пользователем.
   - Главное правило: отвечать пользователю на русском.

2. `Этапы разработки.md`
   - Главный журнал решений, этапов, инцидентов, проверок и финального состояния.
   - Особенно смотри последние записи этапа 30.

3. `docs/project-accounts-map.md`
   - Карта аккаунтов и инфраструктуры.
   - Там описаны Telegram, GitHub, VPS, Docker, Caddy, домены, Google Calendar и что нельзя удалять.

4. `docs/production-ops-runbook.md`
   - Регламент сопровождения.
   - Там есть smoke-check, deploy, rollback, проверка календаря, уведомлений и типовые сбои.

5. `docs/server-deploy.md`
   - Технические детали Docker/VPS/Caddy.

6. `docs/auto-deploy.md`
   - Как работает GitHub Actions deploy в production.

7. `README.md`
   - Общий обзор проекта и команд.

## Текущее production-состояние

Production-схема завершена и работает.

Активны:

- Telegram bot: `@TvoyBox_bot`
- API: `https://api.anyatobolova.ru`
- Mini app: `https://app.anyatobolova.ru`
- GitHub branch: `main`
- GitHub workflow: `Deploy Production`

Dev/test:

- remote branch `dev` удалена;
- local branch `dev` удалена;
- dev/test Docker stack удалён с VPS;
- dev-deploy workflow удалён из репозитория;
- `@testtvoy_bot` больше не нужен.

## VPS и Docker

VPS:

```text
62.113.111.4
```

SSH key:

```text
~/.ssh/codex_vps_deploy_ed25519
```

Production root:

```text
/opt/stack/tvoy-box-bot-deploy
```

Current release:

```text
/opt/stack/tvoy-box-bot-deploy/current
```

Shared env/secrets:

```text
/opt/stack/tvoy-box-bot-deploy/shared/.env.server
/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

Не печатай и не записывай в документы значения токенов, паролей, private keys.

Production Docker services:

- `tvoy-box-bot-api-1`
- `tvoy-box-bot-bot-1`
- `tvoy-box-bot-mini-app-1`
- `tvoy-box-bot-postgres-1`

Быстрая проверка:

```bash
ssh -i ~/.ssh/codex_vps_deploy_ed25519 deploy@62.113.111.4
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
curl https://api.anyatobolova.ru/health
curl https://app.anyatobolova.ru/mini-api/health
curl -I https://app.anyatobolova.ru/
```

## Caddy

Caddy config:

```text
/etc/caddy/Caddyfile
```

HTTP/3/QUIC отключён специально, чтобы Android Telegram WebView стабильнее открывал mini app без VPN:

```caddyfile
{
    servers {
        protocols h1 h2
    }
}
```

Production routes:

- `api.anyatobolova.ru` -> API `127.0.0.1:3300`
- Telegram webhook path -> bot listener `127.0.0.1:3301`
- `app.anyatobolova.ru` -> mini app `127.0.0.1:3302`
- `app.anyatobolova.ru/mini-api/*` -> API `127.0.0.1:3300`

## GitHub

Repository:

```text
AnyaTobolova/TvoiBox_bot
```

Workflow:

```text
.github/workflows/deploy-production.yml
```

Deploy rule:

- push to `main` triggers production deploy;
- runtime secrets are not stored in GitHub repo;
- app secrets live on VPS in `shared/.env.server`.

## Google Calendar

Service account:

```text
tvoybox-bot@tvoybox-bot.iam.gserviceaccount.com
```

Production calendar id:

```text
findirtobolova@gmail.com
```

Calendar integration:

- trainer calendar sync goes through Google Calendar API;
- client fallback uses `.ics` files;
- Telegram/Android may download/open `.ics` through browser flow, this is a platform limitation.

## Что уже проверено

Пользователь подтвердил:

- клиентский mini app работает;
- тренерский mini app работает;
- бот fallback-меню работает;
- заявки и запросы без слота работают;
- ответы тренера приходят клиенту;
- архив/удаление работает;
- календарные `.ics` файлы приходят;
- Telegram links внутри календарных событий работают;
- без VPN после Caddy HTTP/3-off mini app загружается.

## Что не считать багом без дополнительной проверки

- `.ics` может открываться через браузер/download-flow, а не сразу через системный chooser календаря. Это ограничение Telegram Android WebView.
- Старые Telegram inline-кнопки могут вести на старый URL. После deploy нужно нажать `/start` и использовать свежую кнопку.
- GitHub push в `main` запускает production deploy даже для документационных изменений.

## Что нельзя удалять

Не удаляй без отдельного согласования:

- `/opt/stack/tvoy-box-bot-deploy/shared/.env.server`
- `/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json`
- `tvoy-box-bot_postgres_data`
- production releases в `/opt/stack/tvoy-box-bot-deploy/releases`
- Caddy config `/etc/caddy/Caddyfile`

## Оставшиеся будущие задачи

Это не блокеры запуска:

- поменять временный root-пароль VPS, если ещё не поменяли;
- если токен production bot снова пересылался в чат, перевыпустить его ещё раз без пересылки в чат;
- следить за мобильной доступностью `app`/`api`, при повторных проблемах рассмотреть CDN/proxy;
- до 2026-09-16 проверить GitHub Actions на совместимость с Node.js 24;
- по желанию убрать временный query-параметр `apiBaseUrl` из bot mini app URL, если production frontend стабильно работает через `NEXT_PUBLIC_API_BASE_URL`.

## Как действовать при новой задаче

1. Сначала прочитай `Этапы разработки.md`, `docs/project-accounts-map.md` и `docs/production-ops-runbook.md`.
2. Проверь `git status`.
3. Не откатывай чужие изменения.
4. Не трогай secrets.
5. Если меняешь код, запускай релевантные проверки.
6. После push в `main` дождись `Deploy Production` и проверь:

```bash
curl https://api.anyatobolova.ru/health
curl https://app.anyatobolova.ru/mini-api/health
```

7. Обновляй `Этапы разработки.md` после существенных действий.
