# Передача проекта новому владельцу: прогресс и итоги

Дата актуализации: 2026-06-03.

Статус: передача завершена, production работает на сервисах нового владельца.

## Прогресс

- [x] Шаг 1: подготовить безопасное место для секретов и рабочий канал передачи.
- [x] Шаг 2: подготовить нового владельца к Telegram/BotFather transfer.
- [x] Шаг 3: передать Telegram-бота и зафиксировать новые Telegram-данные.
- [x] Шаг 4: передать GitHub-репозиторий владельцу.
- [x] Шаг 5: подготовить VPS и deploy-доступ.
- [x] Шаг 6: подготовить домен, DNS и Caddy.
- [x] Шаг 7: подготовить Google account, Google Cloud и Google Calendar.
- [x] Шаг 8: собрать `.env.server` и secrets на VPS.
- [x] Шаг 9: настроить GitHub Actions и выполнить первый deploy.
- [x] Шаг 10: проверить продукт и закрыть старый контур.

Итого: 10/10.

## Зафиксированные данные

### Telegram

- Владелец: `@RostPV`.
- Admin Telegram ID: `1059303827`.
- Trainer Telegram ID: `1059303827`.
- Бот: `@TvoyBox_bot`.
- Bot ID: `8790733336`.
- Бот передан новому владельцу: да.
- Новый владелец видит бота в BotFather: да.
- Новый Telegram token получен и используется в production.
- Token не хранится в репозитории и не записывается в документы.

### GitHub

- Новый владелец/аккаунт: `rostpv`.
- Репозиторий: `https://github.com/rostpv/TvoiBox_bot`.
- Production-ветка: `main`.
- Автодеплой: GitHub Actions, workflow `Deploy Production`.
- Последние успешные deploy-проверки:
  - run #18, `e862743` - настраиваемая длительность тренировки и слоты с минутами.
  - run #19, `222f474` - повторный production deploy после fallback-проверки.
  - run #20, `db47c54` - визуальная правка отступов в настройках тренера.

### VPS и домены

- VPS provider: Beget.
- VPS IP: `155.212.137.86`.
- ОС: Ubuntu 24.04.
- Deploy user: `deploy`.
- Deploy root: `/opt/stack/tvoy-box-bot-deploy`.
- API: `https://api.tvoybox.ru`.
- Mini App: `https://app.tvoybox.ru`.
- Основной домен: `tvoybox.ru`.
- DNS provider/registrar: `https://sweb.ru/`.
- DNS A `api` -> `155.212.137.86`: да.
- DNS A `app` -> `155.212.137.86`: да.
- AAAA для `api/app`: нет.
- Caddy обслуживает API, Mini App и `/mini-api/*`.

### Google

- Google account владельца: `rostpv@gmail.com`.
- Google Cloud project name: `TvoyBoxBot`.
- Google Cloud project ID: `tvoyboxbot`.
- Google Calendar API включён: да.
- Service account: `tvoybox-calendar@tvoyboxbot.iam.gserviceaccount.com`.
- Calendar name: `Твой Бокс тренировки`.
- Calendar ID: `7aae9ea0c61a5b02e754cfdbcc50df3d0f3da48a481c7b923882a6f3c0e7da95@group.calendar.google.com`.
- Service account добавлен в календарь с правом изменения мероприятий: да.
- JSON key создан и передан через локальную папку секретов: да.
- JSON key не хранится в репозитории.

## Production-проверки

- [x] API health отвечает `status: ok`.
- [x] Mini App открывается.
- [x] Бот отвечает на `/start`.
- [x] Кнопка Mini App появляется в Telegram.
- [x] Mini App открывается.
- [x] Клиент может открыть запись.
- [x] Клиент может отправить заявку.
- [x] Заявка видна тренеру.
- [x] Тренер подтверждает заявку.
- [x] Клиент получает уведомление.
- [x] Клиент получает `.ics`.
- [x] Событие появляется в Google Calendar.
- [x] Тренер отменяет тренировку.
- [x] Клиент получает уведомление об отмене.
- [x] Событие в Google Calendar отменяется/обновляется.
- [x] Тренер переносит тренировку.
- [x] Клиент получает уведомление о переносе.
- [x] Событие в Google Calendar обновляется без дубля.
- [x] Повторный перенос после fix не создаёт дубль в Google Calendar.
- [x] Настройки тренера поддерживают длительность тренировки 30-120 минут и время начала/окончания с минутами.

## Что считается закрытым старым контуром

- Старый GitHub-владелец больше не является владельцем production-репозитория.
- Production deploy идёт из `rostpv/TvoiBox_bot`.
- Production-секреты находятся у нового владельца и на новом VPS.
- Новый Google account/Cloud/Calendar используются в production.
- Новый домен и поддомены используются в production.
- Старые локальные папки и ключи, не относящиеся к production нового владельца, не нужны для работы продукта.

## Где смотреть эксплуатационные инструкции

- `docs/production-ops-runbook.md` - эксплуатация production, деплой, Caddy, secrets.
- `docs/owner-production-check.md` - чек-лист владельца после деплоя.
- `README.md` - краткая карта проекта и production-адреса.
