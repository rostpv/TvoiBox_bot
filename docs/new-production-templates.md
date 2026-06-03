# Шаблоны нового production

Здесь собраны заготовки для нового сервера, домена, Caddy, GitHub Actions и `.env.server`.

Секреты не вставлять в этот документ. Для секретных значений использовать placeholders и менеджер паролей владельца.

## 1. Значения, которые нужно выбрать

| Значение | Пример | Новое значение |
| --- | --- | --- |
| Project slug | `tvoy-box-bot` | `__________` |
| Stack name | `tvoy-box-bot` | `__________` |
| Deploy root | `/opt/stack/tvoy-box-bot-deploy` | `__________` |
| API domain | `api.example.ru` | `__________` |
| Mini app domain | `app.example.ru` | `__________` |
| VPS IP | `203.0.113.10` | `__________` |
| API host port | `3300` | `__________` |
| Bot host port | `3301` | `__________` |
| Mini app host port | `3302` | `__________` |
| PostgreSQL DB | `tvoy_box` | `__________` |
| PostgreSQL user | `tvoy_box` | `__________` |
| Calendar ID | `calendar@example.com` | `__________` |

## 2. DNS records

```text
Type: A
Name: api
Value: <VPS_IP>
TTL: default

Type: A
Name: app
Value: <VPS_IP>
TTL: default
```

Не добавлять `AAAA`, если IPv6 на VPS не настроен.

## 3. Caddyfile template

Заменить:

- `<api-domain>`
- `<app-domain>`
- `<bot-webhook-path>`
- порты, если выбраны не `3300`, `3301`, `3302`

```caddyfile
{
    servers {
        protocols h1 h2
    }
}

<api-domain> {
    handle <bot-webhook-path> {
        reverse_proxy 127.0.0.1:3301
    }

    handle {
        reverse_proxy 127.0.0.1:3300
    }
}

<app-domain> {
    handle_path /mini-api/* {
        reverse_proxy 127.0.0.1:3300
    }

    handle {
        reverse_proxy 127.0.0.1:3302
    }
}
```

Проверка:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl is-active caddy
```

## 4. `.env.server` template

```env
STACK_NAME=<stack-name>

NODE_ENV=production
TZ=Europe/Moscow

APP_NAME=tvoy-box-training-scheduler
APP_HOST=0.0.0.0
APP_PORT=3000
API_LOG_LEVEL=info

API_BIND_IP=127.0.0.1
API_PORT=3300
MINI_APP_BIND_IP=127.0.0.1
MINI_APP_PORT=3302
API_BASE_URL=http://api:3000
PUBLIC_API_DOMAIN=<api-domain>
PUBLIC_APP_DOMAIN=<app-domain>
NEXT_PUBLIC_API_BASE_URL=https://<api-domain>

BOT_LOG_LEVEL=info
BOT_DRY_RUN=false
BOT_DELIVERY_MODE=webhook
BOT_BIND_IP=127.0.0.1
BOT_PORT=3301
BOT_WEBHOOK_HOST=0.0.0.0
BOT_WEBHOOK_PORT=8081
BOT_WEBHOOK_PATH=/telegram/webhook/<long-random-path>
BOT_WEBHOOK_PUBLIC_URL=https://<api-domain>/telegram/webhook/<long-random-path>
BOT_WEBHOOK_SECRET_TOKEN=<secret-from-password-manager>
ADMIN_TELEGRAM_ID=<admin-telegram-id>
TRAINER_TELEGRAM_ID=<trainer-telegram-id>
TELEGRAM_BOT_TOKEN=<secret-from-password-manager>
MINI_APP_AUTH_SECRET=<secret-from-password-manager>
MINI_APP_ALLOWED_ORIGINS=https://<app-domain>

POSTGRES_DB=<postgres-db>
POSTGRES_USER=<postgres-user>
POSTGRES_PASSWORD=<secret-from-password-manager>
DATABASE_URL=postgresql://<postgres-user>:<postgres-password>@postgres:5432/<postgres-db>

GOOGLE_CALENDAR_SYNC_MODE=real
GOOGLE_CALENDAR_ID=<google-calendar-id>
GOOGLE_SERVICE_ACCOUNT_JSON_SOURCE=../.secrets/google-service-account.json
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/google-service-account.json
```

## 5. GitHub Actions secrets

Создать в:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions
```

```text
VPS_HOST=<vps-ip>
VPS_PORT=<ssh-port>
VPS_USER=deploy
VPS_SSH_PRIVATE_KEY=<private-key-from-password-manager>
VPS_KNOWN_HOSTS=<ssh-keyscan-result>
```

`VPS_KNOWN_HOSTS` получить командой:

```bash
ssh-keyscan -p <ssh-port> <vps-ip>
```

## 6. Workflow values

Проверить `.github/workflows/deploy-production.yml`:

```yaml
DEPLOY_ROOT: /opt/stack/tvoy-box-bot-deploy
LEGACY_ROOT: /opt/stack/tvoy-box-bot
RELEASE_ARCHIVE_NAME: tvoy-box-bot-${{ github.sha }}.tar.gz
PRODUCTION_HEALTHCHECK_URL: https://<api-domain>/health
```

Для нового сервера обычно важно заменить минимум:

- `DEPLOY_ROOT`
- `LEGACY_ROOT`, если legacy-каталог не используется
- `RELEASE_ARCHIVE_NAME`, если меняется slug проекта
- `PRODUCTION_HEALTHCHECK_URL`

## 7. Первый deploy

```bash
git push origin main
```

Потом открыть:

```text
GitHub repo -> Actions -> Deploy Production
```

Проверить:

```bash
curl https://<api-domain>/health
curl https://<app-domain>/mini-api/health
curl -I https://<app-domain>/
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## 8. Rollback

```bash
ssh deploy@<vps-ip>
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ln -sfn /opt/stack/tvoy-box-bot-deploy/releases/<previous-sha> /opt/stack/tvoy-box-bot-deploy/current
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
```

После rollback:

```bash
curl https://<api-domain>/health
curl -I https://<app-domain>/
```

