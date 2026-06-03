# Production Ops Runbook

## Контур

- Bot: `@TvoyBox_bot`
- API: `https://api.tvoybox.ru`
- Mini App: `https://app.tvoybox.ru`
- GitHub repo: `https://github.com/rostpv/TvoiBox_bot`
- Branch: `main`
- VPS: `155.212.137.86`
- Deploy user: `deploy`
- Deploy root: `/opt/stack/tvoy-box-bot-deploy`

Передача проекта новому владельцу завершена. Итоговый прогресс и зафиксированные аккаунты: `docs/handover-progress.md`.

## Проверить публичные адреса

```bash
curl https://api.tvoybox.ru/health
curl https://app.tvoybox.ru/mini-api/health
curl -I https://app.tvoybox.ru/
```

## Проверить контейнеры на VPS

```bash
ssh deploy@155.212.137.86
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
```

Ожидаемые сервисы:

- `postgres`
- `api`
- `mini-app`
- `bot`

## Автодеплой

Deploy запускается через GitHub Actions при push в `main`.

Workflow:

```text
.github/workflows/deploy-production.yml
```

GitHub Actions secrets:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_KNOWN_HOSTS`

Последние зафиксированные production-деплои:

- run #18, `e862743` - настраиваемая длительность тренировки и слоты с минутами.
- run #19, `222f474` - повторный production deploy после fallback-проверки.
- run #20, `db47c54` - визуальная правка отступов в настройках тренера.

## Где лежат production-секреты на VPS

```text
/opt/stack/tvoy-box-bot-deploy/shared/.env.server
/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

Права должны быть не шире `600`.

## Ручной деплой на VPS

Обычно ручной деплой не нужен. Если нужно перезапустить текущий release:

```bash
ssh deploy@155.212.137.86
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
```

## Rollback

```bash
ssh deploy@155.212.137.86
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ln -sfn /opt/stack/tvoy-box-bot-deploy/releases/<previous-sha> /opt/stack/tvoy-box-bot-deploy/current
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
```

## Проверить Caddy

```bash
ssh root@155.212.137.86
caddy version
caddy validate --config /etc/caddy/Caddyfile
systemctl is-active caddy
```

Caddy должен обслуживать:

- `api.tvoybox.ru` -> API и Telegram webhook;
- `app.tvoybox.ru` -> Mini App;
- `app.tvoybox.ru/mini-api/*` -> API.

## Проверить Telegram webhook

Команду выполнять только там, где есть bot token. Token не записывать в документы и не пересылать в чат.

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Ожидаемый результат:

- `ok: true`;
- `url` начинается с `https://api.tvoybox.ru/`;
- нет `last_error_message`;
- `pending_update_count` не растёт постоянно.

## Секреты

В репозитории не должно быть:

- `.env`;
- `.env.server`;
- `.secrets`;
- Telegram token;
- Google service account JSON;
- SSH private keys;
- пароли базы данных.
