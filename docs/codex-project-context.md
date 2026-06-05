# Стартовый контекст проекта для Codex

Дата актуализации: 2026-06-05.

Этот файл можно дать Codex в новом чате как основной стартовый документ. Он не содержит паролей, токенов, приватных ключей и JSON service account.

## Как начинать работу

1. Писать пользователю по-русски.
2. Рабочая папка владельца:

```text
C:\Users\User\OneDrive\Desktop\Согласование времени тренировок Твой Бокс
```

3. Сначала выполнить:

```bash
git status --short --branch
```

4. Перед code push в `main` помнить: production deploy запускается автоматически, если изменены не только документы. Документальные изменения в `docs/**` и корневые `*.md` deploy не запускают.
5. Не хранить и не выводить в чат секреты: Telegram token, `.env.server`, Google service account JSON, SSH private keys, database URL и пароли.

## Кратко о продукте

Проект `Твой Бокс` - production-система записи на персональные тренировки:

- Telegram bot: `@TvoyBox_bot`
- Telegram Mini App: `https://app.tvoybox.ru`
- Web-запись клиента вне Telegram: `https://app.tvoybox.ru/booking`
- Web-кабинет тренера: `https://app.tvoybox.ru/trainer`
- API: `https://api.tvoybox.ru`
- GitHub: `https://github.com/rostpv/TvoiBox_bot`
- Production branch: `main`
- VPS: `155.212.137.86`
- Deploy root: `/opt/stack/tvoy-box-bot-deploy`

Проект уже передан новому владельцу и работает в production. На 2026-06-05 проверки со стороны разработки завершены, дальше идёт ручное тестирование клиентами.

## Что уже сделано

Основной Telegram-сценарий сохранён. Web-запись добавлена параллельно, на общей базе, API, слотах, календаре и тренерском контуре.

Реализовано:

- клиентская web-регистрация без SMS и пароля: имя + телефон, email необязателен;
- сохранение web-клиента на устройстве через browser token;
- повторный вход с другого устройства по телефону с подтягиванием профиля;
- обязательное согласие на обработку персональных данных при новой web-регистрации;
- web-запись на слот с общими конфликтами Web/Web и Telegram/Web;
- источник заявки `Telegram` или `Web` в тренерском контуре;
- контакты web-клиента в заявке и Google Calendar;
- web-раздел `Мои тренировки`: актуальные, архив, отмена, перенос, принятие/отклонение предложения, удаление из списка;
- `.ics` для подтверждённых web-тренировок;
- web-функция `Нет подходящего времени`;
- web-кабинет тренера как резервный канал;
- диапазонное открытие/закрытие/переоткрытие слотов;
- тренерский web-кабинет использует тот же React-компонент `TrainerMiniApp`, что и Telegram trainer mini app.

Последний production release на момент актуализации:

```text
97ac03061a910a70d52d65aa5da74d3a396dde5a
```

## Архитектура репозитория

- `apps/api` - NestJS API, Prisma, бизнес-логика заявок, слотов, календаря и web-сессий.
- `apps/bot` - Telegram bot на grammY.
- `apps/mini-app` - Next.js приложение для Telegram Mini App, web-записи и web-кабинета тренера.
- `packages/*` - shared types/config/logger/utils/constants.
- `deploy/compose.server.yml` - production Docker Compose.
- `.github/workflows/deploy-production.yml` - GitHub Actions deploy.
- `scripts/deploy/*` - deploy/bootstrap scripts.
- `scripts/qa/web-booking-flow-check.mjs` - ручной QA smoke web-записи.

Главные frontend-файлы:

- `apps/mini-app/src/components/mini-app-root.tsx` - клиентский Telegram mini app и подключение trainer mini app.
- `apps/mini-app/src/components/web-booking-page.tsx` - web-запись клиента.
- `apps/mini-app/src/components/web-trainer-page.tsx` - web-вход тренера и обёртка над `TrainerMiniApp`.
- `apps/mini-app/src/components/trainer-mini-app.tsx` - общий тренерский mini app/web UI.
- `apps/mini-app/src/lib/mini-app-api.ts` - API client Telegram mini app/trainer.
- `apps/mini-app/src/lib/web-booking-api.ts` - API client web-записи.

Главные backend-файлы:

- `apps/api/prisma/schema.prisma` - модели БД.
- `apps/api/src/modules/web-booking/*` - web endpoints клиента и trainer web session.
- `apps/api/src/modules/mini-app/*` - Telegram mini app endpoints и auth.
- `apps/api/src/modules/bookings/*` - заявки, подтверждение, отмена, перенос, `.ics`.
- `apps/api/src/modules/slots/*` - слоты и диапазонное управление.
- `apps/api/src/modules/no-slot-requests/*` - запросы без подходящего времени.
- `apps/api/src/modules/google-calendar/*` - Google Calendar sync.
- `apps/api/src/modules/telegram-notifications/*` - уведомления через Telegram.

## Production и секреты

На VPS должны существовать:

```text
/opt/stack/tvoy-box-bot-deploy/shared/.env.server
/opt/stack/tvoy-box-bot-deploy/shared/.secrets/google-service-account.json
```

В `.env.server` важны, среди прочего:

- `TELEGRAM_BOT_TOKEN`
- `MINI_APP_AUTH_SECRET`
- `TRAINER_TELEGRAM_ID` или `ADMIN_TELEGRAM_ID`
- `DATABASE_URL`
- `GOOGLE_CALENDAR_*`
- `WEB_TRAINER_LOGIN_SECRET`

GitHub Actions secrets:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_KNOWN_HOSTS`

Если нужен SSH-доступ Codex к VPS, владелец должен временно добавить новый публичный ключ в `/root/.ssh/authorized_keys` через Beget. После работ ключ обязательно удалить. Порядок описан в `docs/emergency-support-runbook.md`.

## Deploy

Обычный production deploy:

1. Изменения попадают в `main`.
2. GitHub Actions workflow `Deploy Production` собирает release archive.
3. Archive загружается на VPS.
4. `/tmp/remote-deploy.sh` разворачивает release в `/opt/stack/tvoy-box-bot-deploy/releases/<sha>`.
5. Symlink `current` переключается на новый release.
6. Docker Compose пересобирает/поднимает `api`, `bot`, `mini-app`, `postgres`.
7. Healthcheck проверяет `https://api.tvoybox.ru/health`.

Workflow игнорирует документацию:

```text
docs/**
*.md
```

Поэтому docs-only push безопасен и не запускает production deploy.

## Проверки

Быстрые production checks:

```bash
curl -fsSL https://api.tvoybox.ru/health
curl -I -L https://app.tvoybox.ru/
curl -I -L https://app.tvoybox.ru/booking
curl -I -L https://app.tvoybox.ru/trainer
```

Перед code deploy web-записи:

```bash
corepack pnpm qa:web-booking
```

Перед frontend/code commit обычно запускать:

```bash
corepack pnpm --filter @tvoy-box/api typecheck
corepack pnpm --filter @tvoy-box/mini-app typecheck
corepack pnpm --filter @tvoy-box/api build
corepack pnpm --filter @tvoy-box/mini-app build
```

## Текущее состояние после финальной проверки

GitHub:

- remote branch осталась только `main`;
- временная ветка `codex/web-booking-foundation` удалена после merge в `main`;
- GitHub Actions artifacts: `0`;
- tags: нет.

VPS:

- build cache Docker очищен;
- остановленный migrate-контейнер удалён;
- временный `/tmp/remote-deploy.sh` удалён;
- releases оставлены в количестве 5 для rollback;
- Postgres volume и backups не трогались;
- временный SSH-ключ Codex удалён из `/root/.ssh/authorized_keys`.

После очистки на VPS было около 21 ГБ свободного места на `/`.

## Что не закрыто специально

- Клиентское ручное тестирование идёт у владельца/клиентов после 2026-06-05.
- Push-уведомления web-клиентам вне Telegram пока отложены: email могут не указать, web push требует отдельной PWA/service worker/push-subscription инфраструктуры.
- SMS/WhatsApp-подтверждение телефона не реализовано.
- Сложная ролевая система тренера не реализована: на первом этапе один защищённый вход через `WEB_TRAINER_LOGIN_SECRET`.

## Важные документы

- `README.md` - краткая карта проекта.
- `docs/codex-project-context.md` - этот стартовый документ.
- `docs/production-ops-runbook.md` - эксплуатация production.
- `docs/emergency-support-runbook.md` - аварийные действия, SSH-доступ, диагностика.
- `docs/web-booking-implementation-plan.md` - история и план внедрения web-записи.
- `docs/post-handover-backlog.md` - выполненное после передачи и будущие задачи.
- `docs/maintenance-log.md` - лог технической очистки и обслуживания.
