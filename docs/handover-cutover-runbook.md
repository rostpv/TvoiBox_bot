# Runbook дня передачи и переключения production

Пошаговый сценарий для дня, когда проект переносится на новые аккаунты, новый VPS, новый домен и нового владельца.

## 0. Цель

В конце переключения должно быть так:

- [ ] бот находится у нового владельца в BotFather;
- [ ] репозиторий находится в GitHub владельца;
- [ ] GitHub Actions деплоит на новый VPS;
- [ ] новый домен открывает API и mini app;
- [ ] новый Google Calendar получает события;
- [ ] клиентский и тренерский сценарии проходят;
- [ ] старый production больше не является основной рабочей точкой.

## 1. Участники

- [ ] Ответственный за техническое переключение: `__________`
- [ ] Новый владелец продукта: `__________`
- [ ] Тренер для приёмки: `__________`
- [ ] Тестовый клиент для приёмки: `__________`
- [ ] Кто принимает решение `go/no-go`: `__________`
- [ ] Рабочий чат на время переключения: `__________`

## 2. Окно переключения

- [ ] Дата: `__________`
- [ ] Время начала: `__________`
- [ ] Плановое время окончания: `__________`
- [ ] Предельное время, после которого включаем rollback: `__________`
- [ ] Старый production не трогаем до успешной проверки нового контура.

## 3. Pre-flight за 24 часа

- [ ] Новый владелец подтвердил готовность всех сервисов.
- [ ] Telegram/BotFather готов к transfer.
- [ ] GitHub owner/org готов принять repo.
- [ ] VPS создан и доступен по SSH.
- [ ] DNS-записи созданы или готово окно для их создания.
- [ ] Google Cloud project создан.
- [ ] Google Calendar API включён.
- [ ] Service account создан.
- [ ] Google Calendar создан и расшарен на service account.
- [ ] Хранилище секретов владельца готово: зашифрованный архив или менеджер паролей.
- [ ] Есть безопасный способ передать временный технический доступ.
- [ ] Владелец понимает, что токены и private keys нельзя отправлять в чат.
- [ ] Текущий репозиторий чистый или понятны незакоммиченные изменения.

Результат:

```text
Дата pre-flight:
Готовность: да/нет
Блокеры:
Ответственный:
```

## 4. Pre-flight в день переключения

- [ ] Старый production работает до начала переключения.
- [ ] Проверен старый API health.
- [ ] Проверен старый mini app.
- [ ] Проверен доступ к текущему BotFather.
- [ ] Проверен доступ к текущему GitHub repo.
- [ ] Проверен доступ к новому VPS.
- [ ] Проверен доступ к DNS.
- [ ] Проверен доступ к Google Cloud и Calendar.
- [ ] Открыт `docs/new-production-templates.md`.
- [ ] Открыт `docs/new-services-setup-instructions.md`.
- [ ] Открыт этот runbook.

Команды для старого production, если нужен контроль:

```bash
curl https://api.anyatobolova.ru/health
curl -I https://app.anyatobolova.ru/
```

Результат:

```text
Стартовое состояние старого production:
Кто проверил:
Комментарии:
```

## 5. Шаги переключения

### 5.1. Telegram

- [ ] Через BotFather выполнен `Transfer Ownership`.
- [ ] Новый владелец принял бота.
- [ ] Новый владелец видит бота в своём BotFather.
- [ ] Новый владелец сохранил новый или актуальный `TELEGRAM_BOT_TOKEN` в хранилище секретов.
- [ ] Зафиксированы `ADMIN_TELEGRAM_ID` и `TRAINER_TELEGRAM_ID`.
- [ ] Старый webhook пока не сбрасываем вручную, новый deploy должен выставить webhook на новый домен.

Результат:

```text
Bot username:
Bot id:
Admin Telegram ID:
Trainer Telegram ID:
Token сохранён где:
```

### 5.2. GitHub

- [ ] Выполнен transfer repo в аккаунт/org владельца.
- [ ] Новый владелец принял transfer.
- [ ] Локальный `origin` обновлён на новый repo.
- [ ] GitHub Actions включены.
- [ ] GitHub Actions secrets заполнены:
  - `VPS_HOST`
  - `VPS_PORT`
  - `VPS_USER`
  - `VPS_SSH_PRIVATE_KEY`
  - `VPS_KNOWN_HOSTS`
- [ ] `.github/workflows/deploy-production.yml` обновлён под новый API healthcheck и deploy root.

Результат:

```text
New repo URL:
Actions URL:
Origin updated:
Workflow updated:
```

### 5.3. VPS

- [ ] На VPS установлен Docker.
- [ ] На VPS установлен Docker Compose plugin.
- [ ] На VPS установлен Caddy.
- [ ] Создан `deploy` user.
- [ ] `deploy` user имеет доступ к Docker.
- [ ] Создан deploy root.
- [ ] На VPS создан `shared/.env.server`.
- [ ] На VPS положен `shared/.secrets/google-service-account.json`.
- [ ] Проверены права на secrets.

Результат:

```text
VPS IP:
Deploy root:
Docker OK:
Caddy OK:
Secrets uploaded:
```

### 5.4. DNS и Caddy

- [ ] DNS `api.<domain>` указывает на новый VPS.
- [ ] DNS `app.<domain>` указывает на новый VPS.
- [ ] Caddyfile обновлён.
- [ ] Caddy config валиден.
- [ ] Caddy reload выполнен.

Проверка:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl is-active caddy
```

Результат:

```text
API domain:
App domain:
DNS OK:
Caddy OK:
```

### 5.5. Google

- [ ] Google Calendar API включён.
- [ ] Service account JSON key лежит на VPS.
- [ ] Calendar shared на service account.
- [ ] В `.env.server` указан новый `GOOGLE_CALENDAR_ID`.

Результат:

```text
Project ID:
Service account email:
Calendar ID:
```

### 5.6. Первый deploy

- [ ] Запущен GitHub Actions workflow `Deploy Production`.
- [ ] Шаг upload release прошёл.
- [ ] Шаг remote deploy прошёл.
- [ ] Healthcheck прошёл.
- [ ] Контейнеры на VPS running/healthy.

Проверка:

```bash
curl https://<api-domain>/health
curl https://<app-domain>/mini-api/health
curl -I https://<app-domain>/
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Результат:

```text
Workflow run URL:
Release SHA:
API health:
Mini app:
Webhook URL:
```

## 6. Go/no-go проверка

Новый production можно считать рабочим только если выполнено всё:

- [ ] API health отвечает.
- [ ] Mini app открывается по HTTPS.
- [ ] `/mini-api/health` отвечает.
- [ ] Telegram webhook смотрит на новый API domain.
- [ ] Клиент нажал `/start`.
- [ ] Клиент открыл mini app.
- [ ] Тренер нажал `/start`.
- [ ] Тренер открыл тренерский экран.
- [ ] Тренер создал или видит слот.
- [ ] Клиент отправил заявку.
- [ ] Тренер подтвердил заявку.
- [ ] Клиент получил уведомление.
- [ ] Событие появилось в новом Google Calendar.
- [ ] Проверена отмена или перенос.

Решение:

```text
GO / NO-GO:
Кто принял решение:
Дата и время:
Комментарии:
```

## 7. Rollback

Rollback нужен, если новый production не проходит go/no-go, а исправление не укладывается в окно переключения.

### 7.1. Если сломан новый deploy, но старый контур не трогали

- [ ] Оставить старый production основным.
- [ ] Не распространять новый домен пользователям.
- [ ] Вернуть webhook бота на старый контур, если он уже был переключён и нужно срочно восстановить старую работу.
- [ ] Зафиксировать причину no-go.

### 7.2. Если нужно откатить release на новом VPS

```bash
ssh deploy@<vps-ip>
ls -lah /opt/stack/tvoy-box-bot-deploy/releases
readlink -f /opt/stack/tvoy-box-bot-deploy/current
ln -sfn /opt/stack/tvoy-box-bot-deploy/releases/<previous-sha> /opt/stack/tvoy-box-bot-deploy/current
cd /opt/stack/tvoy-box-bot-deploy/current
bash scripts/deploy/deploy-server.sh
```

Проверка:

```bash
curl https://<api-domain>/health
curl -I https://<app-domain>/
```

### 7.3. Если проблема в DNS/Caddy

- [ ] Вернуть предыдущий Caddyfile backup, если он есть.
- [ ] Проверить `caddy validate`.
- [ ] Выполнить `systemctl reload caddy`.
- [ ] Проверить домены.

Результат rollback:

```text
Rollback нужен: да/нет
Причина:
Что откатили:
Старый production работает:
Следующая попытка:
```

## 8. После успешного go

- [ ] Владелец подтвердил, что новый production работает.
- [ ] Владелец получил ссылки на все документы передачи.
- [ ] Старый контур оставлен только как временный fallback до даты: `__________`
- [ ] Назначена дата окончательного выключения старого VPS/доменов/секретов: `__________`
- [ ] Старые токены, SSH keys и Google keys будут отозваны после стабилизации.
- [ ] Документация обновлена новыми значениями.

Финальная отметка:

```text
Дата запуска:
Запуск принял:
Открытые задачи:
Дата выключения старого контура:
```
