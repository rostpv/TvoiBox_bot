# Хранение секретов для владельца

Сейчас отдельного менеджера паролей может не быть, и это нормально. Для передачи проекта нам просто нужно выбрать безопасное место, где новый владелец будет хранить доступы.

Такое место дальше в инструкциях называется `хранилище секретов`. Это может быть:

- зашифрованный архив;
- менеджер паролей;
- локальная папка у владельца плюс отдельная резервная копия;
- корпоративное хранилище, если оно есть у владельца.

Главная идея простая: токены, пароли, private keys и Google JSON key не должны лежать в обычном чате, публичном документе или репозитории.

## Что туда нужно сохранить

- [ ] Telegram bot token
- [ ] VPS provider login
- [ ] VPS root password или root SSH access
- [ ] VPS deploy user access
- [ ] GitHub Actions SSH private key
- [ ] Google service account JSON key
- [ ] PostgreSQL password
- [ ] `DATABASE_URL`, если он содержит пароль
- [ ] `BOT_WEBHOOK_SECRET_TOKEN`
- [ ] `MINI_APP_AUTH_SECRET`
- [ ] DNS/domain registrar login
- [ ] GitHub recovery codes, если владелец хочет хранить их там

## Самый простой вариант без менеджера паролей

Если не хочется сейчас заводить Bitwarden, Proton Pass или 1Password, можно сделать проще: создать зашифрованный архив.

### Зашифрованный архив

- [ ] На компьютере владельца создать папку:

```text
Твой Бокс production secrets
```

- [ ] Внутри создать файл:

```text
access-map.txt
```

- [ ] В `access-map.txt` записать карту доступов:

```text
Telegram bot token:
лежит в этом архиве -> telegram-token.txt

VPS:
provider: __________
ip: __________
ssh port: __________
root access: см. vps-root.txt
deploy ssh key: см. github-actions-production-deploy-ed25519

Google:
project id: __________
service account email: __________
json key: google-service-account.json
calendar id: __________
```

- [ ] Положить туда файлы и заметки с секретами:
  - `telegram-token.txt`
  - `.env.server`
  - `google-service-account.json`
  - SSH private key для GitHub Actions
  - `vps-root.txt`, если парольный root-доступ ещё нужен
- [ ] Упаковать папку в архив `.7z` или `.zip` с длинным паролем.
- [ ] Пароль от архива не хранить рядом с архивом.
- [ ] Пароль передать отдельно: голосом, лично или в другом канале.
- [ ] Сделать резервную копию архива у владельца.

Этот вариант хуже полноценного менеджера паролей, но для передачи одного проекта он рабочий и понятный.

## Если всё-таки выбрать менеджер паролей

Самые понятные варианты:

1. Bitwarden
   - Облачный менеджер паролей.
   - Есть бесплатный вариант для личного использования.
   - Удобен, если владельцу нужно открывать доступы с телефона и компьютера.
   - Сайт: https://bitwarden.com/products/personal/

2. Proton Pass
   - Облачный менеджер паролей от Proton.
   - Удобен, если владелец уже пользуется Proton Mail/VPN.
   - Сайт: https://proton.me/pass

3. 1Password
   - Платный и удобный вариант для бизнеса/команды.
   - Хорошо подходит, если доступы должны быть у нескольких людей.
   - Сайт: https://1password.com/

4. KeePassXC
   - Локальный бесплатный менеджер паролей.
   - Хранит зашифрованную базу файлом на компьютере.
   - Хороший вариант для тех, кто не хочет облачный сервис.
   - Требует аккуратно делать резервные копии файла базы.
   - Сайт: https://keepassxc.org/

Рекомендация: если владелец готов завести менеджер, проще всего Bitwarden или Proton Pass. Если доступы будут у команды, удобнее Bitwarden organization или 1Password. Если не готов - использовать зашифрованный архив.

## Как создать Bitwarden

- [ ] Открыть https://bitwarden.com/products/personal/
- [ ] Нажать создание аккаунта / get started / sign up.
- [ ] Указать email владельца.
- [ ] Придумать master password.
- [ ] Сохранить master password офлайн в безопасном месте.
- [ ] Подтвердить email.
- [ ] Включить двухфакторную защиту.
- [ ] Установить расширение Bitwarden в браузер.
- [ ] Установить мобильное приложение, если владелец будет работать с телефона.
- [ ] Создать папку или collection: `Твой Бокс production`.

Что важно:

- master password нельзя терять;
- master password нельзя отправлять никому;
- если потерять master password, восстановить доступ к сейфу обычно невозможно;
- recovery codes от двухфакторной защиты нужно сохранить отдельно.

## Как записывать секреты в менеджере паролей

Для каждого секрета создавать отдельную запись.

Пример записи:

```text
Название: Твой Бокс - Telegram bot token
Username: @TvoyBox_bot
Password/Secret: <сам токен>
Notes:
- используется в TELEGRAM_BOT_TOKEN
- production bot
- дата создания/ротации: __________
```

## Минимальные правила безопасности

- [ ] Не отправлять токены и private keys в Telegram.
- [ ] Не вставлять секреты в Google Docs, Notion или обычные `.md` файлы.
- [ ] Не коммитить `.env`, `.env.server`, `.secrets`.
- [ ] Не хранить SSH private key в открытой папке без необходимости.
- [ ] Включить двухфакторную защиту у GitHub, Google, VPS provider и выбранного хранилища секретов.
- [ ] После передачи удалить временные доступы у технического исполнителя.
- [ ] Если токен случайно отправили в чат, считать его скомпрометированным и перевыпустить.

## Что фиксировать в наших инструкциях

В документах проекта писать не сам секрет, а только место хранения.

Если выбран зашифрованный архив:

```text
TELEGRAM_BOT_TOKEN: хранится в архиве `Твой Бокс production secrets.7z` -> telegram-token.txt
Google JSON key: хранится в архиве `Твой Бокс production secrets.7z` -> google-service-account.json
VPS root access: хранится в архиве `Твой Бокс production secrets.7z` -> vps-root.txt
```

Если выбран менеджер паролей:

```text
TELEGRAM_BOT_TOKEN: хранится в Bitwarden -> Твой Бокс production -> Telegram bot token
Google JSON key: хранится в Bitwarden -> Твой Бокс production -> Google service account JSON
VPS root access: хранится в Bitwarden -> Твой Бокс production -> VPS production
```

Так мы понимаем, где искать доступ, но не раскрываем его в репозитории.

