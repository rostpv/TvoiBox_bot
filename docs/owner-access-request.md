# Сообщение новому владельцу: что нужно подготовить

Этот текст можно отправить владельцу перед началом настройки новых сервисов. Секреты, токены, private keys и JSON-файлы не пересылать в обычный чат. Их нужно хранить в выбранном хранилище владельца: зашифрованном архиве или менеджере паролей.

Если у владельца сейчас нет такого хранилища, сначала отправить ему `docs/password-manager-guide.md`. Там есть простой вариант без менеджера паролей: зашифрованный архив.

## Короткое сообщение

```text
Для передачи проекта нужно подготовить новые сервисы на вашей стороне:

1. Telegram
- Принять текущего бота через BotFather -> Transfer Ownership.
- Сообщить Telegram ID администратора и тренера.
- Сохранить bot token в вашем хранилище секретов, не отправлять его в чат.

2. GitHub
- Подготовить GitHub-аккаунт или организацию, куда переносим репозиторий.
- Принять transfer репозитория.
- После подготовки VPS добавить GitHub Actions secrets для автодеплоя.

3. VPS
- Купить или подготовить новый VPS.
- Дать IP, SSH-порт и безопасный способ временного технического доступа.
- Оплата и дальнейшее владение сервером остаются на вашей стороне.

4. Домен и DNS
- Купить или подготовить новый домен.
- Создать DNS-записи api.<домен> и app.<домен> на IP нового VPS.

5. Google
- Подготовить Google-аккаунт владельца.
- Создать Google Cloud project.
- Включить Google Calendar API.
- Создать service account и JSON key.
- Создать Google Calendar и расшарить его на service account.

6. Секреты
- Подготовить место для секретов: зашифрованный архив или менеджер паролей.
- Сохранять туда Telegram token, SSH private key, Google JSON key, root/deploy доступы VPS, PostgreSQL password, webhook secret и mini app secret.

После этого мы сможем собрать новый production-контур, проверить бота, mini app, заявки, уведомления и синхронизацию с календарём.
```

## Что владелец должен прислать в чат

Эти данные можно присылать в обычный чат, потому что они не являются секретами:

- [ ] Telegram username владельца: `__________`
- [ ] Telegram ID администратора: `__________`
- [ ] Telegram ID тренера: `__________`
- [ ] GitHub owner/account/org: `__________`
- [ ] Новый repo URL после transfer: `__________`
- [ ] VPS provider: `__________`
- [ ] VPS public IP: `__________`
- [ ] SSH port: `__________`
- [ ] Домен: `__________`
- [ ] API domain: `__________`
- [ ] Mini app domain: `__________`
- [ ] Google account владельца: `__________`
- [ ] Google Cloud Project ID: `__________`
- [ ] Service account email: `__________`
- [ ] Google Calendar ID: `__________`

## Что нельзя присылать в обычный чат

- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] SSH private key
- [ ] root password VPS
- [ ] deploy user password
- [ ] Google service account JSON
- [ ] `POSTGRES_PASSWORD`
- [ ] `DATABASE_URL` с паролем
- [ ] `BOT_WEBHOOK_SECRET_TOKEN`
- [ ] `MINI_APP_AUTH_SECRET`
- [ ] любые backup/dump файлы с персональными данными

## Что нужно сохранить в хранилище секретов

- [ ] Telegram bot token
- [ ] VPS provider login
- [ ] VPS root access
- [ ] VPS deploy user access
- [ ] GitHub Actions deploy SSH private key
- [ ] Google service account JSON key
- [ ] PostgreSQL password
- [ ] Mini app auth secret
- [ ] Telegram webhook secret
- [ ] Данные DNS/domain registrar

Если менеджера паролей нет, эти данные можно хранить в зашифрованном архиве `Твой Бокс production secrets.7z`, а пароль от архива передать отдельно.
