# Передача проекта новому владельцу

Документ нужен как рабочий чек-лист для передачи проекта конечному пользователю: новый Telegram-владелец, новый Google Calendar, новый GitHub, новый VPS, новые домены и новый production-контур.

Важно: не хранить в этом файле полные секреты, токены, приватные ключи, пароли и JSON service account, если файл останется в репозитории. Для секретов фиксировать только место хранения, дату установки и результат проверки.

## 0. Паспорт передачи

- [ ] Дата начала передачи: `__________`
- [ ] Ответственный за передачу: `__________`
- [ ] Новый владелец продукта: `__________`
- [ ] Контакт владельца: `__________`
- [ ] Технический контакт владельца: `__________`
- [ ] Рабочий чат/канал передачи: `__________`
- [x] Где хранится хранилище секретов: временная локальная папка для передачи через флешку `Твой Бокс production secrets/`
- [x] Временная локальная папка-шаблон на компьютере текущего владельца создана: `Твой Бокс production secrets/`
- [x] Временная локальная папка-шаблон добавлена в `.gitignore`.
- [x] В папке оставлены только шаблоны под новые секреты; старые VPS/GitHub/Google ключи не передаются как финальный комплект.
- [ ] Дата фактического запуска нового production: `__________`

## 1. Что именно передаём

- [ ] Telegram-бот на `grammY`: `apps/bot`
- [ ] Backend API на `NestJS`: `apps/api`
- [ ] Telegram mini app на `Next.js`: `apps/mini-app`
- [ ] PostgreSQL внутри Docker Compose
- [ ] Google Calendar sync через Google Calendar API
- [ ] GitHub Actions autodeploy на VPS
- [ ] Caddy reverse proxy на VPS
- [ ] Production runbook: `docs/production-ops-runbook.md`
- [ ] Текущая карта аккаунтов: `docs/project-accounts-map.md`
- [ ] Деплой-инструкция: `docs/server-deploy.md`
- [ ] Автодеплой-инструкция: `docs/auto-deploy.md`

Результат сверки состава проекта:

```text
Что подтверждено:

Что требует отдельной передачи:

```

## 2. Новая карта аккаунтов и инфраструктуры

Заполнять по мере создания новых сущностей.

| Зона | Старое значение | Новое значение | Где доступ | Статус |
| --- | --- | --- | --- | --- |
| Telegram bot username | `@TvoyBox_bot` | `@TvoyBox_bot` | BotFather владельца | `transferred` |
| Telegram bot id | `8790733336` | `8790733336` | Telegram API/BotFather | `transferred` |
| Telegram owner account | текущий аккаунт владельца | `@RostPV` | Telegram | `transferred` |
| Admin Telegram ID | `492732093` | `1059303827` | server env | `ready` |
| Trainer Telegram ID | `492732093` | `1059303827` | server env | `ready` |
| GitHub account/org | `AnyaTobolova` | `rostpv` | GitHub | `transferred` |
| GitHub repo | `AnyaTobolova/TvoiBox_bot` | `rostpv/TvoiBox_bot` | GitHub | `transferred` |
| Production branch | `main` | `main` / `__________` | GitHub | `todo` |
| VPS provider/account | текущий VPS | `beget` | provider panel | `created` |
| VPS IP | `62.113.111.4` | `155.212.137.86` | provider panel | `created` |
| SSH deploy user | `deploy` | `deploy` / `__________` | VPS | `todo` |
| SSH root access | текущий root | `__________` | VPS/provider | `todo` |
| Domain zone | `anyatobolova.ru` | `tvoybox.ru` | DNS panel sweb.ru | `ready for DNS` |
| API domain | `api.anyatobolova.ru` | `api.tvoybox.ru` | DNS/Caddy/env | `ready for DNS` |
| Mini app domain | `app.anyatobolova.ru` | `app.tvoybox.ru` | DNS/Caddy/env | `ready for DNS` |
| Google account | текущий аккаунт | `rostpv@gmail.com` | Google | `created` |
| Google Cloud project | `tvoybox-bot` | `tvoyboxbot` | Google Cloud | `created` |
| Service account email | `tvoybox-bot@tvoybox-bot.iam.gserviceaccount.com` | `tvoybox-calendar@tvoyboxbot.iam.gserviceaccount.com` | Google Cloud | `created` |
| Calendar ID | `findirtobolova@gmail.com` | `7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com` | Google Calendar/env | `created` |

## 3. Решить стратегию передачи

- [x] Выбрали способ передачи Telegram-бота:
  - создать нового бота у нового владельца;
  - или передать существующего бота через актуальные действия в BotFather, если нужно сохранить username.
- [x] Выбрали способ передачи GitHub:
  - transfer текущего репозитория в новый аккаунт/org;
  - или создать новый репозиторий и запушить код туда.
- [x] Выбрали способ переноса базы:
  - начать с пустой базы;
  - или переносить production-данные PostgreSQL dump/restore.
- [x] Решили, нужен ли старый домен как fallback на время переключения.
- [x] Решили, кто владеет оплатой VPS, домена, Google Cloud и GitHub.

Принятые решения:

```text
Telegram:
Передаем существующего бота новому владельцу через BotFather -> Transfer Ownership.
Скрин подтверждает, что для @TvoyBox_bot доступна кнопка Transfer Ownership.

GitHub:
Переносим текущий репозиторий в GitHub-аккаунт или организацию клиента.

База:
Новый production запускается с пустой базой. Production-данные из текущей базы не переносим.

Домен:
Полностью переходим на новый домен владельца. Старый домен не планируется как production fallback.

Оплаты и владельцы сервисов:
VPS оплачивает и контролирует новый владелец.
Домен оплачивает и контролирует новый владелец.
Google account и Google Cloud принадлежат новому владельцу.
GitHub-репозиторий принадлежит новому владельцу.
Секреты и доступы хранятся у нового владельца в выбранном хранилище: зашифрованный архив или менеджер паролей.

```

## 3.1. Что подготовить до новых аккаунтов

Этот блок можно закрывать заранее, пока новый владелец ещё не передал GitHub, VPS, домен, Google и доступы к секретам.

### Пакет передачи

- [x] Подготовлен основной чек-лист передачи: `docs/project-handover-checklist.md`
- [x] Подготовлена пошаговая инструкция по новым сервисам: `docs/new-services-setup-instructions.md`
- [x] Подготовлен короткий список доступов, которые новый владелец должен создать или выдать: `docs/owner-access-request.md`
- [x] Подготовлена короткая инструкция для владельца: как проверить продукт после запуска: `docs/owner-production-check.md`
- [x] Подготовлена короткая инструкция для владельца: что делать, если бот, API или mini app не работают: `docs/owner-production-check.md`
- [x] Подготовлен список сервисов, которые переходят к новому владельцу:
  - Telegram/BotFather
  - GitHub
  - VPS/provider
  - DNS/domain registrar
  - Google account
  - Google Cloud
  - Google Calendar
  - хранилище секретов владельца

Результат:

```text
Что уже готово:
docs/project-handover-checklist.md
docs/handover-package-index.md
docs/new-services-setup-instructions.md
docs/handover-cutover-runbook.md
docs/owner-access-request.md
docs/owner-production-check.md
docs/password-manager-guide.md
docs/new-production-templates.md
docs/pre-transfer-audit.md

Что ещё нужно дописать:
После получения новых аккаунтов нужно вписать реальные значения: домен, VPS IP, GitHub repo, Telegram IDs, Google Project ID, service account email, Calendar ID.

Где лежит пакет передачи:
docs/

```

### Старые значения для замены

- [x] Собран список всех старых доменов, аккаунтов, ID и IP: `docs/pre-transfer-audit.md`
- [x] Найдены все упоминания старого Telegram-бота.
- [x] Найдены все упоминания старого домена.
- [x] Найдены все упоминания старого VPS IP.
- [x] Найдены все упоминания старого GitHub repo/account.
- [x] Найдены все упоминания старого Google Calendar ID и service account.
- [x] Для каждого найденного значения решено: заменить, оставить как историю или удалить.

Команда для поиска перед передачей:

```bash
rg -n "anyatobolova|TvoyBox|TvoiBox|62\\.113\\.111\\.4|492732093|findirtobolova|tvoybox-bot|AnyaTobolova" .
```

Результат:

```text
Что нужно заменить:
См. `docs/pre-transfer-audit.md`, раздел 5.

Что оставляем как историческую справку:
`Этапы разработки.md` и исторические runbook/prompt-файлы, если они нужны для контекста.

Что удаляем:
Решить после появления нового production и финального обновления документации.

```

### Шаблоны нового production

- [x] Подготовлен шаблон `.env.server` без секретов: `docs/new-production-templates.md`
- [x] Подготовлен список GitHub Actions secrets:
  - `VPS_HOST`
  - `VPS_PORT`
  - `VPS_USER`
  - `VPS_SSH_PRIVATE_KEY`
  - `VPS_KNOWN_HOSTS`
- [x] Подготовлен Caddyfile-шаблон для новых доменов: `docs/new-production-templates.md`
- [x] Подготовлен список DNS-записей для нового домена: `docs/new-production-templates.md`
- [x] Подготовлены команды первого deploy и health-check: `docs/new-production-templates.md`
- [x] Подготовлены команды rollback: `docs/new-production-templates.md`
- [x] Подготовлена подсказка, какие значения менять в `.github/workflows/deploy-production.yml`: `docs/new-production-templates.md`

Результат:

```text
Шаблон env:
`docs/new-production-templates.md`, раздел 4.

Шаблон Caddy:
`docs/new-production-templates.md`, раздел 3.

DNS-записи:
`docs/new-production-templates.md`, раздел 2.

GitHub Actions:
`docs/new-production-templates.md`, разделы 5-6.

```

### Проверка репозитория перед transfer

- [x] Проверено, что в git не попадут `.env`, `.env.server`, `.secrets`.
- [x] Проверено, что в git не попадут Telegram tokens.
- [x] Проверено, что в git не попадут Google service account JSON или private key.
- [x] Проверено, что в git не попадут SSH private keys.
- [x] Проверен `.gitignore`.
- [x] Проверен `git status`.
- [x] Проверен текущий `main`.
- [ ] Документация закоммичена перед transfer, если решено передавать репозиторий целиком.

Команды для проверки:

```bash
git status --short
git ls-files .env .env.server .secrets
rg -n "TELEGRAM_BOT_TOKEN|BEGIN PRIVATE KEY|private_key|VPS_SSH_PRIVATE_KEY|GOOGLE_PRIVATE_KEY" .
```

Результат:

```text
Подозрительные находки:
Быстрый поиск нашёл имена env-переменных, placeholders, код чтения секретов и исторические записи; реальные полные секреты в tracked files этим поиском не выявлены.

Что исправлено:
Ничего исправлять по результатам быстрой проверки не потребовалось.

Можно передавать repo:
Да, после commit текущей документации и финального просмотра staged diff.

```

### Пустой запуск базы

- [ ] Подтверждено, что production стартует с пустой PostgreSQL-базой.
- [x] Подтверждено, что старые клиенты, слоты, заявки и тренировки не переносятся.
- [x] Подготовлена проверка первого запуска на чистой базе: `docs/owner-production-check.md`
- [x] Подготовлен сценарий создания первых слотов тренером: `docs/owner-production-check.md`
- [x] Подготовлен сценарий первой клиентской заявки: `docs/owner-production-check.md`

Результат:

```text
Стартуем с пустой базой:
Да, по принятому решению данные старого production не переносим. Технический старт чистой базы нужно проверить уже на новом VPS.
Что владелец должен создать первым:
Тренер должен открыть mini app и создать первые рабочие слоты.
Какие проверки выполнить после первого запуска:
См. `docs/owner-production-check.md`.

```

### Приёмочные сценарии

- [ ] Клиент нажимает `/start`.
- [ ] Клиент открывает mini app.
- [ ] Клиент отправляет заявку на слот.
- [ ] Тренер нажимает `/start`.
- [ ] Тренер открывает тренерский экран.
- [ ] Тренер видит заявку.
- [ ] Тренер подтверждает заявку.
- [ ] Клиент получает уведомление.
- [ ] Событие появляется в Google Calendar.
- [ ] Клиент получает или открывает `.ics`.
- [ ] Клиент отменяет тренировку.
- [ ] Тренер отменяет тренировку.
- [ ] Тренер предлагает перенос.
- [ ] Клиент принимает или отклоняет перенос.
- [ ] Проверен сценарий `Нет подходящего времени`.

Результат:

```text
Минимальный набор приёмки утверждён:
Кто будет проверять со стороны владельца:
Кто будет проверять технически:

```

### Текст для нового владельца

- [x] Подготовлен список того, что должен сделать новый владелец:
  - принять бота в Telegram;
  - принять или создать GitHub repo/org;
  - купить или подготовить VPS;
  - купить или подготовить домен;
  - создать Google account/Cloud project;
  - создать или выбрать Google Calendar;
  - подготовить хранилище секретов: зашифрованный архив или менеджер паролей.
- [x] Подготовлено сообщение с просьбой не пересылать токены и private keys в чат.
- [x] Подготовлено сообщение с просьбой фиксировать секреты в выбранном хранилище владельца.
- [x] Подготовлен runbook окна переключения: `docs/handover-cutover-runbook.md`
- [ ] Подготовлено окно переключения: дата и время, когда старый контур перестаёт быть основным.

Результат:

```text
Сообщение владельцу готово:
Да, `docs/owner-access-request.md`.
Окно переключения:
Runbook готов: `docs/handover-cutover-runbook.md`. Ждём дату и время от владельца.
Кто принимает финальное решение о запуске:
Новый владелец продукта.

```

## 4. Подготовить Telegram

- [x] Новый владелец вошёл в свой Telegram-аккаунт.
- [x] Через `@BotFather` создан новый production-бот или принят существующий бот.
- [x] Зафиксирован новый/целевой Telegram owner username: `@RostPV`
- [x] Зафиксирован текущий bot username перед transfer: `@TvoyBox_bot`
- [x] Зафиксирован текущий bot id перед transfer: `8790733336`
- [x] Новый/актуальный `TELEGRAM_BOT_TOKEN` сохранён в хранилище секретов: `Твой Бокс production secrets/telegram-token.txt`
- [x] Полный bot token не записан в репозиторий и документы.
- [ ] Старый Telegram token отозван/перевыпущен новым владельцем: нет, требуется перед финальным production.
- [x] Получен Telegram ID администратора: `1059303827`
- [x] Получен Telegram ID тренера: `1059303827`
- [x] Если админ и тренер один человек, это явно подтверждено.
- [ ] Если нужно несколько админов/тренеров, принято решение о доработке, потому что текущая env-схема хранит `ADMIN_TELEGRAM_ID` и `TRAINER_TELEGRAM_ID`.
- [ ] В BotFather настроено название бота: `__________`
- [ ] В BotFather настроено описание бота: `__________`
- [ ] В BotFather настроена аватарка бота: `__________`
- [ ] Если используется menu button / Web App в BotFather, указан новый mini app URL: `__________`
- [ ] Старый тестовый бот `@testtvoy_bot`, если ещё существует, не используется в новом production.

Результат Telegram-проверки:

```text
Дата: 2026-06-03
Кто проверил: текущий владелец
Бот виден в BotFather: да
Transfer Ownership доступен: да
Целевой владелец: @RostPV
Admin Telegram ID: 1059303827
Trainer Telegram ID: 1059303827
Бот отвечает на /start: проверить после deploy нового production
Кнопка mini app появилась: проверить после deploy нового production
Комментарии: transfer завершён 2026-06-03; новый владелец @RostPV видит @TvoyBox_bot в BotFather.
Token получен и сохранён локально 2026-06-03; старый token пока не отозван.
```

## 5. Подготовить Google Calendar

- [x] Новый владелец создал или выбрал Google-аккаунт для календаря: `rostpv@gmail.com`
- [x] Создан production-календарь или выбран основной календарь: `Твой Бокс тренировки`
- [x] Зафиксирован `GOOGLE_CALENDAR_ID`: `7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com`
- [x] Создан Google Cloud project: `TvoyBoxBot`, Project ID: `tvoyboxbot`
- [x] В проекте включён Google Calendar API.
- [x] Создан service account: `tvoybox-calendar`
- [x] Зафиксирован service account email: `tvoybox-calendar@tvoyboxbot.iam.gserviceaccount.com`
- [x] Создан JSON key для service account.
- [x] JSON key сохранён в хранилище секретов: `Твой Бокс production secrets/google-service-account.json`
- [x] JSON key положен на новый VPS в:
  `/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json`
- [x] Файл на VPS доступен только нужному пользователю, права не шире `600`.
- [x] Новый календарь расшарен на service account email.
- [x] Права service account в календаре позволяют создавать и менять события: `Изменение мероприятий`.
- [x] В `.env.server` на VPS указан новый `GOOGLE_CALENDAR_ID`.
- [x] В `.env.server` указаны:
  - `GOOGLE_CALENDAR_SYNC_MODE=real`
  - `GOOGLE_SERVICE_ACCOUNT_JSON_SOURCE=../.secrets/google-service-account.json`
  - `GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/google-service-account.json`
- [x] Проверены credentials:

```bash
corepack pnpm qa:google-calendar-creds .env.server
```

Результат Google Calendar-проверки:

```text
Дата:
Service account email:
Calendar ID:
7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com
Проверка ключа прошла:
да, `corepack pnpm qa:google-calendar-creds` на локальном env с новым JSON прошёл успешно.
Тестовое событие создалось:
Комментарии:
```

## 6. Подготовить новый GitHub

- [x] Новый владелец создал GitHub account/org: `rostpv`
- [x] Создан/принят repository: `rostpv/TvoiBox_bot`
- [x] Выбран production branch: `main`
- [x] Код перенесён в новый репозиторий.
- [x] Локальный `origin` обновлён: `https://github.com/rostpv/TvoiBox_bot.git`
- [x] Проверено, что в репозиторий не попали `.env`, `.env.server`, `.secrets`, приватные ключи и service account JSON.
- [x] Проверено, что `.gitignore` закрывает локальные секреты.
- [x] В новом репозитории включены GitHub Actions.
- [x] В `Settings -> Secrets and variables -> Actions` добавлены secrets:
  - [x] `VPS_HOST`
  - [x] `VPS_PORT`
  - [x] `VPS_USER`
  - [x] `VPS_SSH_PRIVATE_KEY`
  - [x] `VPS_KNOWN_HOSTS`
- [x] В `.github/workflows/deploy-production.yml` обновлены hardcoded значения под новый контур:
  - [x] `DEPLOY_ROOT`
  - [x] `LEGACY_ROOT`, если используется
  - [x] `RELEASE_ARCHIVE_NAME`, если нужно сменить имя
  - [x] `PRODUCTION_HEALTHCHECK_URL=https://api.tvoybox.ru/health`
- [ ] Первый ручной запуск `workflow_dispatch` или тестовый push в `main` выполнен.
- [ ] Workflow `Deploy Production` завершился успешно.

Результат GitHub-проверки:

```text
Новый repo URL: https://github.com/rostpv/TvoiBox_bot
Actions URL:
Production workflow run URL:
Коммит первого успешного деплоя:
Комментарии: transfer GitHub выполнен, репозиторий виден у нового владельца. GitHub Actions secrets обновлены под VPS 155.212.137.86 по подтверждению пользователя. Deploy SSH key и known_hosts проверены локально. Первый GitHub Actions run после переноса падал из-за BOM в `.env.server`; env перезаписан без BOM, нужен новый зелёный прогон.
```

## 7. Подготовить новый VPS

- [x] Создан новый сервер у владельца.
- [x] Зафиксирован публичный IPv4: `155.212.137.86`
- [x] Зафиксирован SSH-порт: `22`, стандартный порт, если provider не указал другой.
- [x] Новый SSH key для первичного root-доступа к VPS создан локально:
  `Твой Бокс production secrets/new-vps-root-ed25519`
- [x] Public key добавлен в панель VPS при создании сервера.
- [x] Обновлены пакеты ОС.
- [x] Установлены Docker и Docker Compose plugin.
- [x] Установлен Caddy.
- [x] Создан deploy user: `deploy`
- [x] Deploy user добавлен в группу `docker`.
- [x] Для GitHub Actions создан отдельный SSH key:
  `Твой Бокс production secrets/github-actions-production-deploy-ed25519`
- [x] Public key добавлен в `/home/deploy/.ssh/authorized_keys`.
- [x] Private key сохранён только в GitHub Actions secret `VPS_SSH_PRIVATE_KEY` и/или хранилище секретов.
- [x] Получен `VPS_KNOWN_HOSTS` для GitHub Actions:
  `Твой Бокс production secrets/vps-known-hosts.txt`
- [x] Создан deploy root:
  `/opt/stack/tvoy-box-bot-deploy`
- [x] Созданы каталоги:
  - `/opt/stack/tvoy-box-bot-deploy/releases`
  - `/opt/stack/tvoy-box-bot-deploy/shared`
  - `/opt/stack/tvoy-box-bot-deploy/shared/.secrets`
  - `/opt/stack/tvoy-box-bot-deploy/shared/logs`
- [x] На сервер положен `/opt/stack/tvoy-box-bot-deploy/shared/.env.server`.
- [x] На сервер положен `/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json`.
- [x] Проверены права на `.env.server` и `.secrets/google-service-account.json`.

Можно использовать подготовительный скрипт как ориентир:

```bash
bash scripts/deploy/setup-server-autodeploy.sh
```

Результат VPS-подготовки:

```text
Provider:
beget
Server IP:
155.212.137.86
SSH user:
root для первичной настройки, deploy для автодеплоя
Deploy root:
/opt/stack/tvoy-box-bot-deploy
Docker version:
установлен Docker и Docker Compose plugin
Caddy version:
v2.11.4
Комментарии:
Caddy обновлён с Ubuntu-пакета 2.6.2 до официального stable 2.11.4, потому что 2.6.2 падал при выпуске сертификата для второго домена.
```

## 8. Настроить DNS и Caddy

- [x] В DNS-зоне нового домена создан `A` record для API:
  `api.tvoybox.ru -> 155.212.137.86`
- [x] В DNS-зоне нового домена создан `A` record для mini app:
  `app.tvoybox.ru -> 155.212.137.86`
- [x] `AAAA` records не добавлялись, если IPv6 на сервере не настроен.
- [x] DNS propagation проверен: `api.tvoybox.ru` и `app.tvoybox.ru` резолвятся в `155.212.137.86`.
- [x] В `/etc/caddy/Caddyfile` добавлен API host.
- [x] В `/etc/caddy/Caddyfile` добавлен mini app host.
- [x] Для API настроено проксирование:
  - webhook path -> `127.0.0.1:3301`
  - все остальные API paths -> `127.0.0.1:3300`
- [x] Для mini app настроено проксирование:
  - `/mini-api/*` -> `127.0.0.1:3300`
  - все остальные paths -> `127.0.0.1:3302`
- [x] В Caddy global block сохранено отключение HTTP/3/QUIC для стабильности Android Telegram WebView:

```caddyfile
{
    servers {
        protocols h1 h2
    }
}
```

- [x] Caddy config прошёл проверку:

```bash
caddy validate --config /etc/caddy/Caddyfile
```

- [x] Caddy перезагружен:

```bash
systemctl reload caddy
systemctl is-active caddy
```

- [x] Caddy обновлён до `v2.11.4`.
- [x] HTTPS-сертификат выпущен для `api.tvoybox.ru`.
- [x] HTTPS-сертификат выпущен для `app.tvoybox.ru`.
- [x] Публичный API health отвечает `200`.
- [x] Публичный mini app root отвечает `200`.
- [x] Публичный mini app API proxy отвечает `200`.

Результат DNS/Caddy-проверки:

```text
API domain:
api.tvoybox.ru
Mini app domain:
app.tvoybox.ru
DNS проверен:
да, оба поддомена -> 155.212.137.86
Caddy validate:
Valid configuration
Caddy reload:
active
Комментарии:
Caddy настроен на новом VPS 2026-06-03. После обновления Caddy до v2.11.4 оба домена получили Let's Encrypt сертификаты и публичные проверки прошли.
```

## 9. Собрать новый `.env.server`

Серверный env должен лежать на VPS:

```text
/opt/stack/tvoy-box-bot-deploy/shared/.env.server
```

Заполнить и проверить минимум:

- [x] `STACK_NAME=tvoy-box-bot` или новое уникальное имя: `tvoy-box-bot`
- [x] `NODE_ENV=production`
- [x] `TZ=Europe/Moscow`
- [x] `API_BIND_IP=127.0.0.1`
- [x] `API_PORT=3300` или свободный порт: `3300`
- [x] `MINI_APP_BIND_IP=127.0.0.1`
- [x] `MINI_APP_PORT=3302` или свободный порт: `3302`
- [x] `PUBLIC_API_DOMAIN=api.tvoybox.ru`
- [x] `PUBLIC_APP_DOMAIN=app.tvoybox.ru`
- [x] `NEXT_PUBLIC_API_BASE_URL=https://api.tvoybox.ru`
- [x] `BOT_DELIVERY_MODE=webhook`
- [x] `BOT_BIND_IP=127.0.0.1`
- [x] `BOT_PORT=3301` или свободный порт: `3301`
- [x] `BOT_WEBHOOK_HOST=0.0.0.0`
- [x] `BOT_WEBHOOK_PORT=8081`
- [x] `BOT_WEBHOOK_PATH=/telegram/webhook/<generated-secret-path>`
- [x] `BOT_WEBHOOK_PUBLIC_URL=https://api.tvoybox.ru<BOT_WEBHOOK_PATH>`
- [x] `BOT_WEBHOOK_SECRET_TOKEN` создан и сохранён в секретах.
- [x] `ADMIN_TELEGRAM_ID=1059303827`
- [x] `TRAINER_TELEGRAM_ID=1059303827`
- [x] `TELEGRAM_BOT_TOKEN` установлен, но не записан в документы.
- [x] `MINI_APP_AUTH_SECRET` создан и сохранён в секретах.
- [x] `MINI_APP_ALLOWED_ORIGINS=https://app.tvoybox.ru`
- [x] `POSTGRES_DB=tvoy_box`
- [x] `POSTGRES_USER=tvoy_box`
- [x] `POSTGRES_PASSWORD` создан и сохранён в секретах.
- [x] `DATABASE_URL=postgresql://...@postgres:5432/...` совпадает с DB/user/password.
- [x] `GOOGLE_CALENDAR_SYNC_MODE=real`
- [x] `GOOGLE_CALENDAR_ID=7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com`
- [x] `GOOGLE_SERVICE_ACCOUNT_JSON_SOURCE=../.secrets/google-service-account.json`
- [x] `GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/google-service-account.json`

Результат env-проверки:

```text
Файл создан:
да, локально и на VPS
Права файла:
`600` на VPS
Секреты сверены:
да, обязательные значения заполнены, `.env.server` перезаписан UTF-8 без BOM
Комментарии:
На VPS файл лежит в `/opt/stack/tvoy-box-bot-deploy/shared/.env.server`; Google JSON лежит в `shared/.secrets/google-service-account.json`.
```

## 10. Первый production deploy

- [x] Новый код находится в ветке `main`.
- [x] GitHub Actions secrets заполнены.
- [x] На VPS есть `shared/.env.server`.
- [x] На VPS есть `shared/.secrets/google-service-account.json`.
- [ ] Запущен `Deploy Production` через GitHub Actions.
- [ ] Шаг `Upload release bundle` прошёл.
- [ ] Шаг `Run remote deploy` прошёл.
- [ ] Шаг `Verify public health endpoint` прошёл.
- [x] На VPS проверены контейнеры:

```bash
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
```

- [x] API health отвечает:

```bash
curl https://<api-domain>/health
```

- [x] Mini app root отвечает:

```bash
curl -I https://<app-domain>/
```

- [x] Mini app API proxy отвечает:

```bash
curl https://<app-domain>/mini-api/health
```

- [x] Telegram webhook проверен:

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Результат первого deploy:

```text
Дата:
2026-06-03
GitHub Actions run:
первый run после переноса был неуспешен из-за BOM в `.env.server`; новый успешный run ещё нужен
Release SHA:
da40a866a2a01aeeb0e99dfac96934c5eb0ad8a5
API health:
`https://api.tvoybox.ru/health` -> 200
Mini app health:
`https://app.tvoybox.ru/` -> 200; `https://app.tvoybox.ru/mini-api/health` -> 200
Webhook URL:
домен `api.tvoybox.ru`, секретный путь не записываем
Комментарии:
Ручной deploy на VPS прошёл успешно, контейнеры подняты и публичные проверки прошли. Осталось получить зелёный GitHub Actions deploy run.
```

## 11. Проверить продукт глазами пользователя

- [ ] Открыть production-бота в Telegram.
- [ ] Нажать `/start`.
- [ ] У клиента появилась кнопка `Открыть mini app`.
- [ ] Mini app открывается внутри Telegram.
- [ ] Клиент видит главное меню.
- [ ] Клиент может открыть запись на тренировку.
- [ ] Клиент может отправить заявку на слот.
- [ ] Клиент может открыть `Мои записи`.
- [ ] Клиент может пройти сценарий `Нет подходящего времени`.
- [ ] Тренер нажал `/start`.
- [ ] У тренера открывается тренерский экран.
- [ ] Тренер видит заявки.
- [ ] Тренер может открыть/закрыть слоты.
- [ ] Тренер может подтвердить заявку.
- [ ] Клиент получает Telegram-уведомление после подтверждения.
- [ ] Клиент получает или открывает `.ics` календарный файл.
- [ ] В Google Calendar тренера появляется событие.
- [ ] Проверена отмена клиентом.
- [ ] Проверена отмена тренером.
- [ ] Проверен перенос тренировки.
- [ ] Проверены уведомления по сценарию без подходящего времени.

Результат пользовательской проверки:

```text
Дата:
Клиентский Telegram ID:
Тренерский Telegram ID:
Запись создана:
Календарь синхронизировался:
Уведомления пришли:
Проблемы:
Что исправить:
```

## 12. Обновить документацию под нового владельца

- [ ] Обновить `docs/project-accounts-map.md`.
- [ ] Обновить домены в `docs/production-ops-runbook.md`.
- [ ] Обновить домены и IP в `docs/server-deploy.md`, если документ передаётся владельцу.
- [ ] Обновить `docs/auto-deploy.md`.
- [ ] Обновить `README.md`, если там остаются старые сведения о ветках или доменах.
- [ ] Обновить `.env.server.example`, если меняются рекомендуемые домены, порты или stack name.
- [ ] Проверить `.github/workflows/deploy-production.yml` на старые домены/IP/пути.
- [ ] Поискать старые значения перед передачей:

```bash
rg -n "anyatobolova|TvoyBox|TvoiBox|62\\.113\\.111\\.4|492732093|findirtobolova|tvoybox-bot|AnyaTobolova" .
```

- [ ] Для каждого найденного старого значения решено:
  - заменить;
  - оставить как историческую справку;
  - удалить.

Результат обновления документации:

```text
Какие файлы обновлены:
Что оставлено как история:
Что нужно не забыть позже:
```

## 13. Безопасность и закрытие старого контура

- [ ] Старый bot token перевыпущен или старый бот остановлен. Сейчас: token не отозван, нужно сделать перед финальным production.
- [ ] Старый webhook снят, если старый бот больше не нужен.
- [ ] Старые GitHub Actions secrets удалены или репозиторий передан владельцу.
- [ ] Старые SSH keys отозваны с VPS, если больше не нужны.
- [ ] Старый Google service account key удалён или отключён.
- [ ] Старый календарь больше не получает production-записи.
- [ ] Старый VPS остановлен или оставлен как fallback до даты: `__________`
- [ ] Если старый VPS остаётся fallback, зафиксирован план выключения.
- [ ] Старые домены больше не ведут пользователей в production, если это не нужно.
- [ ] Новый владелец получил доступы ко всем платным сервисам.
- [ ] Новый владелец подтвердил, где лежат секреты.

Результат закрытия старого контура:

```text
Что выключено:
Что оставлено временно:
Дата окончательного выключения:
Ответственный:
```

## 14. Финальная приёмка владельцем

- [ ] Владелец может зайти в GitHub repo.
- [ ] Владелец видит GitHub Actions.
- [ ] Владелец может открыть VPS/provider panel.
- [ ] Владелец знает, где DNS-зона.
- [ ] Владелец знает, где Google Cloud project.
- [ ] Владелец знает, где Google Calendar.
- [ ] Владелец управляет production-ботом через BotFather.
- [ ] Владелец получил инструкцию по обычной проверке production.
- [ ] Владелец получил инструкцию по deploy.
- [ ] Владелец получил инструкцию по rollback.
- [ ] Владелец подтвердил, что продукт работает.

Финальная отметка:

```text
Дата передачи:
Передала:
Принял:
Замечания владельца:
Открытые задачи после передачи:
```

## 15. Быстрые команды после передачи

Проверить production:

```bash
curl https://<api-domain>/health
curl https://<app-domain>/mini-api/health
curl -I https://<app-domain>/
```

Проверить контейнеры на VPS:

```bash
ssh deploy@<vps-ip>
cd /opt/stack/tvoy-box-bot-deploy/current
docker compose --env-file .env.server -f deploy/compose.server.yml ps
```

Проверить Caddy:

```bash
ssh root@<vps-ip>
caddy validate --config /etc/caddy/Caddyfile
systemctl is-active caddy
```

Откатиться на предыдущий release:

```bash
ssh deploy@<vps-ip>
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ln -sfn /opt/stack/tvoy-box-bot-deploy/releases/<previous-sha> /opt/stack/tvoy-box-bot-deploy/current
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
```

