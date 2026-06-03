# Настройка новых сервисов для передачи проекта

Пошаговая инструкция для первичной настройки новых аккаунтов и сервисов владельца: Telegram/BotFather, GitHub, VPS, DNS, Google account, Google Cloud и Google Calendar.

Важно: токены, пароли, private keys, SSH private key и Google service account JSON не вставлять в этот документ. Здесь фиксировать только ссылки, ID, email, дату настройки и место хранения секрета.

## 0. Перед началом

- [ ] У нового владельца выбрано хранилище секретов: зашифрованный архив или менеджер паролей.
- [ ] Если хранилища ещё нет, владелец выбрал простой вариант по `docs/password-manager-guide.md`.
- [ ] Новый владелец готов оплачивать VPS, домен и Google Cloud, если понадобится billing.
- [ ] У нового владельца есть доступ к Telegram, GitHub и Google-аккаунту.
- [ ] Согласовано, кто технически выполняет настройку.
- [ ] Согласовано окно переключения production: `__________`

Что заранее подготовить рядом:

- [ ] текущий репозиторий;
- [ ] `docs/project-handover-checklist.md`;
- [ ] `.env.server.example`;
- [ ] доступ к текущему BotFather;
- [ ] список будущих доменов:
  - API: `__________`
  - Mini app: `__________`
- [ ] новый VPS IP после покупки: `__________`

## 1. Telegram/BotFather

Цель: передать существующего production-бота новому владельцу и подготовить его к работе с новым сервером и доменом.

### 1.1. Подготовить Telegram-аккаунт нового владельца

- [ ] Новый владелец вошёл в Telegram.
- [ ] У нового владельца включена двухфакторная защита Telegram, если BotFather потребует это для передачи.
- [ ] Новый владелец написал текущему владельцу в Telegram, чтобы аккаунт было проще выбрать при transfer.
- [ ] Получен Telegram username нового владельца: `__________`
- [ ] Получен Telegram ID нового администратора: `__________`
- [ ] Получен Telegram ID тренера: `__________`

### 1.2. Передать бота через BotFather

- [ ] Текущий владелец открыл `@BotFather`.
- [ ] Выбран бот `@TvoyBox_bot`.
- [ ] Нажато `Transfer Ownership`.
- [ ] В BotFather выбран новый владелец.
- [ ] Новый владелец подтвердил принятие бота, если Telegram запросил подтверждение.
- [ ] Новый владелец проверил, что бот появился в его списке ботов BotFather.
- [ ] Зафиксирован bot username после передачи: `__________`
- [ ] Зафиксирован bot id после передачи: `__________`

Важно: не удалять старый production-контур до тех пор, пока новый сервер, домен, webhook и mini app не пройдут проверку.

### 1.3. Подготовить токен и настройки бота

- [ ] Новый владелец через BotFather перевыпустил или подтвердил актуальный API token.
- [ ] `TELEGRAM_BOT_TOKEN` сохранён в хранилище секретов владельца.
- [ ] Токен не отправлялся в обычный чат и не записан в документы.
- [ ] В BotFather проверено название бота.
- [ ] В BotFather проверено описание бота.
- [ ] В BotFather проверена аватарка бота.
- [ ] Если используется menu button / Web App, указан новый mini app URL: `https://__________`
- [ ] После нового deploy webhook будет выставлен приложением на новый `BOT_WEBHOOK_PUBLIC_URL`.

Результат Telegram:

```text
Дата:
Новый владелец Telegram:
Bot username:
Bot id:
Admin Telegram ID:
Trainer Telegram ID:
Где хранится TELEGRAM_BOT_TOKEN:
Комментарии:
```

## 2. GitHub

Цель: передать текущий репозиторий в GitHub-аккаунт или организацию нового владельца и подготовить новый autodeploy.

### 2.1. Подготовить принимающую сторону

- [ ] Новый владелец создал GitHub account или organization.
- [ ] Целевой owner GitHub: `__________`
- [ ] У целевого owner нет репозитория с таким же именем.
- [ ] Если переносим в organization, у текущего пользователя есть право создавать repo в этой organization.
- [ ] Новый владелец готов принять transfer по email/уведомлению GitHub.
- [ ] Согласовано новое имя repo:
  - оставить текущее: `__________`
  - или переименовать при/после transfer: `__________`

### 2.2. Передать репозиторий

- [ ] Текущий владелец открыл репозиторий на GitHub.
- [ ] Открыт раздел `Settings`.
- [ ] Внизу страницы найден блок `Danger Zone`.
- [ ] Нажато `Transfer`.
- [ ] Указан новый owner.
- [ ] Подтверждён transfer.
- [ ] Новый владелец принял transfer. Для personal-account transfer приглашение нужно принять быстро, потому что оно может истечь.
- [ ] Проверено, что новый repo доступен: `__________`
- [ ] Проверено, что ветка `main` на месте.
- [ ] Проверено, что issues, PR, releases и settings сохранились, если они нужны.

### 2.3. Обновить origin локально

После transfer на рабочей машине обновить remote:

```bash
git remote -v
git remote set-url origin git@github.com:<new-owner>/<repo>.git
git remote -v
git fetch origin
```

- [ ] `origin` указывает на новый repo.
- [ ] `git fetch origin` проходит.

### 2.4. Настроить GitHub Actions secrets

В новом repo открыть:

```text
Settings -> Secrets and variables -> Actions
```

Создать или заменить:

- [ ] `VPS_HOST`
- [ ] `VPS_PORT`
- [ ] `VPS_USER`
- [ ] `VPS_SSH_PRIVATE_KEY`
- [ ] `VPS_KNOWN_HOSTS`

Важно: для нового VPS лучше создать новый SSH key и не переносить старый deploy key.

### 2.5. Обновить workflow под новый production

Проверить файл:

```text
.github/workflows/deploy-production.yml
```

Обновить:

- [ ] `DEPLOY_ROOT`, если меняется путь на VPS.
- [ ] `LEGACY_ROOT`, если новый сервер не использует старый legacy path.
- [ ] `RELEASE_ARCHIVE_NAME`, если нужно убрать старое имя проекта.
- [ ] `PRODUCTION_HEALTHCHECK_URL=https://<new-api-domain>/health`

Результат GitHub:

```text
Дата:
Новый repo URL:
GitHub owner:
Actions URL:
Secrets заполнены:
Remote origin обновлён:
Комментарии:
```

## 3. VPS/provider

Цель: купить или подготовить новый сервер владельца и сделать его готовым к Docker, Caddy и GitHub Actions deploy.

### 3.1. Создать сервер

- [ ] Новый владелец вошёл в панель VPS/provider.
- [ ] Создан новый VPS.
- [ ] Рекомендуемая ОС: Ubuntu LTS или другая Linux ОС, совместимая с Docker и Caddy.
- [ ] Зафиксирован публичный IPv4: `__________`
- [ ] Зафиксирован SSH-порт: `__________`
- [ ] Root-доступ сохранён в хранилище секретов владельца.
- [ ] Настроен firewall provider, если он есть.
- [ ] Открыты порты:
  - `22/tcp` или другой SSH-порт;
  - `80/tcp`;
  - `443/tcp`.

### 3.2. Базовая подготовка ОС

Под root или sudo-пользователем:

```bash
apt update
apt upgrade -y
```

- [ ] ОС обновлена.
- [ ] Проверен вход по SSH.
- [ ] Часовой пояс сервера согласован с проектом: `Europe/Moscow`.

### 3.3. Установить Docker и Caddy

- [ ] Установлен Docker Engine.
- [ ] Установлен Docker Compose plugin.
- [ ] Установлен Caddy.
- [ ] Проверены версии:

```bash
docker --version
docker compose version
caddy version
```

### 3.4. Создать deploy user

```bash
adduser deploy
usermod -aG docker deploy
```

- [ ] Создан user `deploy` или другой согласованный user: `__________`
- [ ] User добавлен в группу `docker`.
- [ ] Проверено, что после нового SSH-login user может выполнять `docker ps`.

### 3.5. Настроить SSH key для GitHub Actions

На локальной машине или безопасной машине администратора создать отдельный ключ:

```bash
ssh-keygen -t ed25519 -C "github-actions-production-deploy" -f ./github-actions-production-deploy-ed25519
```

- [ ] Public key добавлен в `/home/deploy/.ssh/authorized_keys`.
- [ ] Private key добавлен в GitHub secret `VPS_SSH_PRIVATE_KEY`.
- [ ] Private key сохранён в хранилище секретов владельца.
- [ ] Получен known_hosts:

```bash
ssh-keyscan -p <ssh-port> <vps-ip>
```

- [ ] Результат `ssh-keyscan` добавлен в GitHub secret `VPS_KNOWN_HOSTS`.

### 3.6. Подготовить deploy root

```bash
mkdir -p /opt/stack/tvoy-box-bot-deploy/releases
mkdir -p /opt/stack/tvoy-box-bot-deploy/shared/.secrets
mkdir -p /opt/stack/tvoy-box-bot-deploy/shared/logs
chown -R deploy:deploy /opt/stack/tvoy-box-bot-deploy
chmod 700 /opt/stack/tvoy-box-bot-deploy/shared/.secrets
```

- [ ] Deploy root создан.
- [ ] Права выставлены.
- [ ] На сервер будет положен `shared/.env.server`.
- [ ] На сервер будет положен `shared/.secrets/google-service-account.json`.

Результат VPS:

```text
Дата:
Provider:
Server IP:
SSH port:
Deploy user:
Deploy root:
Docker:
Caddy:
Где хранится root/deploy доступ:
Комментарии:
```

## 4. DNS/domain registrar

Цель: направить новые домены на VPS и подготовить HTTPS через Caddy.

### 4.1. Подготовить домен

- [ ] Новый владелец купил домен или дал доступ к DNS-зоне.
- [ ] Домен: `__________`
- [ ] DNS registrar/control panel: `__________`
- [ ] У владельца есть доступ к оплате и продлению домена.

### 4.2. Создать DNS-записи

В DNS-зоне создать:

- [ ] `A` record для API:
  - name/host: `api`
  - value: `<VPS_IP>`
  - result domain: `api.<domain>`
- [ ] `A` record для mini app:
  - name/host: `app`
  - value: `<VPS_IP>`
  - result domain: `app.<domain>`
- [ ] `AAAA` records не добавлены, если IPv6 на VPS не настроен.
- [ ] Старые конфликтующие записи удалены или обновлены.

### 4.3. Проверить DNS

```bash
nslookup api.<domain>
nslookup app.<domain>
```

Или:

```bash
dig api.<domain> A
dig app.<domain> A
```

- [ ] API domain резолвится в новый VPS IP.
- [ ] Mini app domain резолвится в новый VPS IP.
- [ ] DNS propagation завершился или принято решение ждать.

Результат DNS:

```text
Дата:
Domain:
API domain:
Mini app domain:
VPS IP:
Registrar:
DNS проверен:
Комментарии:
```

## 5. Google account

Цель: подготовить Google-аккаунт владельца как владельца Google Cloud project и календаря.

### 5.1. Подготовить аккаунт

- [ ] Новый владелец вошёл в Google account.
- [ ] Google account: `__________`
- [ ] Включена двухфакторная защита.
- [ ] Владелец понимает, что этот аккаунт будет владельцем Google Cloud project и календаря.
- [ ] Доступы к аккаунту не передаются через чат.
- [ ] Recovery email/phone настроены у владельца.

### 5.2. Billing

- [ ] В Google Cloud у владельца создан или выбран billing account, если Google попросит billing.
- [ ] Владелец подтвердил, что оплата Google Cloud на его стороне.
- [ ] Billing account: `__________`

Результат Google account:

```text
Дата:
Google account:
2FA включена:
Billing готов:
Комментарии:
```

## 6. Google Cloud

Цель: создать Cloud project, включить Google Calendar API, создать service account и JSON key для server-side синхронизации календаря.

### 6.1. Создать Google Cloud project

- [ ] Открыть Google Cloud Console.
- [ ] Создать новый project.
- [ ] Project name: `__________`
- [ ] Project ID: `__________`
- [ ] Project number: `__________`
- [ ] Привязать billing account, если Google попросит.

### 6.2. Включить Google Calendar API

- [ ] В Google Cloud Console открыть `APIs & Services -> Library`.
- [ ] Найти `Google Calendar API`.
- [ ] Нажать `Enable`.
- [ ] Проверить, что API включён в нужном project.

### 6.3. Создать service account

- [ ] Открыть `IAM & Admin -> Service Accounts`.
- [ ] Нажать `Create service account`.
- [ ] Service account name: `__________`
- [ ] Service account ID: `__________`
- [ ] Зафиксировать service account email:
  `__________@__________.iam.gserviceaccount.com`
- [ ] Project-level роли не выдавать шире необходимого. Для доступа к календарю решающим будет sharing самого календаря на service account email.

### 6.4. Создать JSON key

- [ ] Открыть созданный service account.
- [ ] Открыть вкладку `Keys`.
- [ ] Нажать `Add key -> Create new key`.
- [ ] Выбрать тип `JSON`.
- [ ] Скачать JSON key.
- [ ] Сразу сохранить JSON key в хранилище секретов владельца.
- [ ] Не отправлять JSON key в чат.
- [ ] После подготовки VPS положить JSON key на сервер:

```text
/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

- [ ] На сервере выставить права:

```bash
chown deploy:deploy /opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
chmod 600 /opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

Результат Google Cloud:

```text
Дата:
Project name:
Project ID:
Service account email:
Google Calendar API enabled:
Где хранится JSON key:
Комментарии:
```

## 7. Google Calendar

Цель: создать календарь владельца и дать service account право создавать, обновлять и удалять события.

### 7.1. Создать календарь

- [ ] Открыть Google Calendar в браузере.
- [ ] В блоке `Other calendars` нажать `+`.
- [ ] Выбрать `Create new calendar`.
- [ ] Название календаря: `__________`
- [ ] Описание календаря: `__________`
- [ ] Нажать `Create calendar`.
- [ ] Открыть настройки созданного календаря.
- [ ] Найти `Calendar ID`.
- [ ] Зафиксировать `GOOGLE_CALENDAR_ID`: `__________`

Можно использовать основной календарь владельца, но отдельный календарь удобнее: проще проверять события, права и отключение проекта.

### 7.2. Расшарить календарь на service account

- [ ] В настройках календаря открыть раздел sharing/access.
- [ ] Добавить service account email:
  `__________@__________.iam.gserviceaccount.com`
- [ ] Выдать право `Make changes to events` / `Вносить изменения в мероприятия`.
- [ ] Не делать календарь публичным.
- [ ] Сохранить настройки.

### 7.3. Подготовить env-значения

В будущем `.env.server` на VPS:

```env
GOOGLE_CALENDAR_SYNC_MODE=real
GOOGLE_CALENDAR_ID=<calendar-id>
GOOGLE_SERVICE_ACCOUNT_JSON_SOURCE=../.secrets/google-service-account.json
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/google-service-account.json
```

- [ ] `GOOGLE_CALENDAR_ID` совпадает с новым календарём.
- [ ] Service account email совпадает с JSON key.
- [ ] Calendar sharing сделан именно на service account email.

### 7.4. Проверить после deploy

После первого deploy:

- [ ] Проверить credentials:

```bash
cd /opt/stack/tvoy-box-bot-deploy/current
corepack pnpm qa:google-calendar-creds .env.server
```

- [ ] Создать тестовую запись через бота/mini app.
- [ ] Подтвердить заявку тренером.
- [ ] Проверить, что событие появилось в новом Google Calendar.
- [ ] Проверить, что отмена/перенос обновляют событие.

Результат Google Calendar:

```text
Дата:
Calendar name:
Calendar ID:
Service account email:
Права на календарь:
Тестовое событие создано:
Комментарии:
```

## 8. Финальная сверка перед первым deploy

- [ ] Telegram bot передан владельцу.
- [ ] `TELEGRAM_BOT_TOKEN` есть в секретах владельца.
- [ ] GitHub repo передан владельцу.
- [ ] GitHub Actions secrets заполнены.
- [ ] VPS создан и подготовлен.
- [ ] DNS указывает на VPS.
- [ ] Caddy готов принять `api` и `app` домены.
- [ ] Google Cloud project создан.
- [ ] Google Calendar API включён.
- [ ] Service account создан.
- [ ] JSON key сохранён и положен на VPS.
- [ ] Google Calendar создан.
- [ ] Calendar shared на service account.
- [ ] `.env.server` собран на VPS.
- [ ] В workflow указан новый healthcheck URL.

Готовность к deploy:

```text
Дата:
Готово к первому deploy: да/нет
Что блокирует:
Кто ответственный:
```

## Источники для сверки интерфейсов

- GitHub Docs: repository transfer: https://docs.github.com/ru/repositories/creating-and-managing-repositories/transferring-a-repository
- Google Cloud Docs: enabling APIs: https://docs.cloud.google.com/apis/docs/getting-started
- Google Cloud Docs: create service accounts: https://docs.cloud.google.com/iam/docs/service-accounts-create
- Google Cloud Docs: create service account keys: https://docs.cloud.google.com/iam/docs/keys-create-delete
- Google Calendar Help: create calendar: https://support.google.com/calendar/answer/37095
- Google Calendar Help: share calendar: https://support.google.com/calendar/answer/37082
