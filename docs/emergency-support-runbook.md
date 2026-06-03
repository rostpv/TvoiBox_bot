# Аварийная инструкция поддержки

Документ нужен на случай, если проект сломается, бот перестанет отвечать, mini app не откроется, deploy упадет или на VPS снова закончится место.

Важно: здесь не хранятся пароли, токены, приватные SSH-ключи и JSON-ключи Google. Документ хранит только карту проекта и порядок действий.

## Быстрая карта проекта

- Telegram bot: `@TvoyBox_bot`
- Bot ID: `8790733336`
- GitHub repository: `https://github.com/rostpv/TvoiBox_bot`
- Production branch: `main`
- VPS provider: Beget
- VPS IP: `155.212.137.86`
- VPS user для экстренного доступа: `root`
- Deploy user: `deploy`
- Deploy root: `/opt/stack/tvoy-box-bot-deploy`
- Current release symlink: `/opt/stack/tvoy-box-bot-deploy/current`
- Shared env: `/opt/stack/tvoy-box-bot-deploy/shared/.env.server`
- Google service account JSON: `/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json`
- Local Postgres backups: `/opt/stack/tvoy-box-bot-deploy/shared/backups/postgres`
- Backup script: `/usr/local/sbin/tvoy-box-postgres-backup.sh`
- Backup cron: `/etc/cron.d/tvoy-box-postgres-backup`
- API: `https://api.tvoybox.ru`
- Mini app: `https://app.tvoybox.ru`
- Healthcheck: `https://api.tvoybox.ru/health`
- Google account владельца: `rostpv@gmail.com`
- Google Cloud project: `TvoyBoxBot`
- Google Cloud project ID: `tvoyboxbot`
- Service account: `tvoybox-calendar@tvoyboxbot.iam.gserviceaccount.com`
- Calendar: `Твой Бокс тренировки`
- Calendar ID: `7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com`

## Где что лежит

### На VPS

```bash
/opt/stack/tvoy-box-bot-deploy/
├── current -> releases/<sha>
├── releases/
└── shared/
    ├── .env.server
    └── .secrets/google-service-account.json
```

### В GitHub

- Secrets находятся в `Repository -> Settings -> Secrets and variables -> Actions`.
- Нужные secrets:
  - `VPS_HOST`
  - `VPS_PORT`
  - `VPS_USER`
  - `VPS_SSH_PRIVATE_KEY`
  - `VPS_KNOWN_HOSTS`

### В Beget

- VPS: `155.212.137.86`
- Файловый менеджер может показывать размер с задержкой. Реальную проверку места делать через SSH командой `df -h /`.

## Как быстро дать Codex доступ к серверу

1. Codex создает новый временный публичный SSH-ключ.
2. В Beget открыть VPS `155.212.137.86`.
3. Открыть файловый менеджер.
4. Открыть файл:

```text
/root/.ssh/authorized_keys
```

5. Добавить публичный ключ Codex новой строкой в конец файла.
6. Ничего старого в `authorized_keys` не удалять.
7. После завершения работ удалить временную строку Codex из `authorized_keys`.

Текущий временный ключ, добавленный для аудита места 2026-06-03:

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFRO1JbjiFoyNF+CtJtwTyA3MMdZD4i2Zn784zyplsNB user@DESKTOP-LQC9MKL
```

Этот ключ можно удалить, когда активная поддержка закончена.

## Быстрая диагностика

### Проверить публичную доступность

```bash
curl -fsSL https://api.tvoybox.ru/health
curl -I -L https://app.tvoybox.ru/
```

Ожидаемо:

- API возвращает JSON со `status: ok`.
- Mini app возвращает `HTTP/1.1 200 OK`.

### Проверить контейнеры на VPS

```bash
ssh root@155.212.137.86
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
```

Ожидаемые контейнеры:

- `tvoy-box-bot-api-1`
- `tvoy-box-bot-mini-app-1`
- `tvoy-box-bot-bot-1`
- `tvoy-box-bot-postgres-1`

### Проверить место на диске

```bash
df -h /
du -xh -d 1 / 2>/dev/null | sort -h | tail -20
docker system df
```

Если снова много места занимает Docker build cache, безопасная очистка:

```bash
docker builder prune -af
docker container prune -f
docker image prune -f
```

Нельзя запускать без отдельного решения:

```bash
docker system prune --volumes
```

Эта команда может удалить volume с базой данных.

### Бэкапы базы

На VPS настроен ежедневный локальный backup PostgreSQL.

- Расписание: каждый день в `03:15` по времени сервера.
- Хранение: последние `14` дней.
- Папка backup-файлов: `/opt/stack/tvoy-box-bot-deploy/shared/backups/postgres`.
- Скрипт: `/usr/local/sbin/tvoy-box-postgres-backup.sh`.
- Cron: `/etc/cron.d/tvoy-box-postgres-backup`.

Создать backup вручную:

```bash
/usr/local/sbin/tvoy-box-postgres-backup.sh
```

Посмотреть backup-файлы:

```bash
ls -lh /opt/stack/tvoy-box-bot-deploy/shared/backups/postgres
```

Проверить последний backup:

```bash
latest=$(ls -1t /opt/stack/tvoy-box-bot-deploy/shared/backups/postgres/tvoy-box-postgres-*.sql.gz | head -n 1)
gzip -t "$latest"
zcat "$latest" | sed -n '1,12p'
```

Посмотреть лог cron backup:

```bash
tail -100 /var/log/tvoy-box-postgres-backup.log
```

Восстановление из backup делать только после отдельного решения, потому что оно меняет состояние базы.

Общий порядок:

```bash
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml stop api bot mini-app
latest=$(ls -1t /opt/stack/tvoy-box-bot-deploy/shared/backups/postgres/tvoy-box-postgres-*.sql.gz | head -n 1)
zcat "$latest" | docker exec -i tvoy-box-bot-postgres-1 sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.server -f deploy/compose.server.yml up -d
curl -fsSL https://api.tvoybox.ru/health
```

Для полного восстановления на чистую базу может потребоваться предварительно очистить схему. Это действие не выполнять без проверки конкретной аварии.

### Проверить логи

```bash
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=200 api
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=200 bot
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=200 mini-app
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=200 postgres
```

## Если бот не отвечает

1. Проверить API:

```bash
curl -fsSL https://api.tvoybox.ru/health
```

2. Проверить контейнеры:

```bash
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
```

3. Проверить логи bot:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=300 bot
```

4. Перезапустить только bot:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml restart bot
```

## Если mini app не открывается

1. Проверить публичный URL:

```bash
curl -I -L https://app.tvoybox.ru/
```

2. Проверить контейнер:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml ps mini-app
```

3. Проверить логи:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=300 mini-app
```

4. Перезапустить только mini app:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml restart mini-app
```

## Если API или база не работают

1. Проверить health:

```bash
curl -fsSL https://api.tvoybox.ru/health
```

2. Проверить контейнеры:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml ps api postgres
```

3. Проверить логи:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=300 api
docker compose --env-file .env.server -f deploy/compose.server.yml logs --tail=300 postgres
```

4. Перезапускать аккуратно:

```bash
docker compose --env-file .env.server -f deploy/compose.server.yml restart api
```

Postgres перезапускать только если ясно, что проблема именно в нем.

## Если deploy упал

1. Открыть GitHub repository:

```text
https://github.com/rostpv/TvoiBox_bot
```

2. Перейти в `Actions -> Deploy Production`.
3. Открыть последний упавший run.
4. Смотреть шаг, на котором ошибка:
   - `Upload release bundle`
   - `Run remote deploy`
   - `Verify public health endpoint`

5. На VPS проверить текущую версию:

```bash
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
```

## Быстрый rollback

Использовать только если новый deploy сломал production.

```bash
ssh root@155.212.137.86
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ln -sfn /opt/stack/tvoy-box-bot-deploy/releases/<previous-sha> /opt/stack/tvoy-box-bot-deploy/current
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
curl -fsSL https://api.tvoybox.ru/health
```

`<previous-sha>` заменить на предыдущую папку релиза.

## Что не делать без отдельной проверки

- Не удалять `/opt/stack/tvoy-box-bot-deploy/shared`.
- Не удалять `.env.server`.
- Не удалять `.secrets/google-service-account.json`.
- Не запускать `docker system prune --volumes`.
- Не удалять Docker volume `tvoy-box-bot_postgres_data`.
- Не перевыпускать Telegram token без готовности сразу заменить его на сервере.
- Не менять DNS, если проблема только в приложении.

## Мини-чеклист для будущего обращения к Codex

Перед началом диагностики сообщить:

- [ ] Что именно не работает: bot / mini app / API / calendar / deploy / VPS.
- [ ] Когда началось.
- [ ] Что меняли перед поломкой.
- [ ] Есть ли свежий скрин ошибки.
- [ ] Есть ли доступ к Beget.
- [ ] Есть ли доступ к GitHub `rostpv/TvoiBox_bot`.
- [ ] Добавлен ли временный SSH-ключ Codex в `/root/.ssh/authorized_keys`.
