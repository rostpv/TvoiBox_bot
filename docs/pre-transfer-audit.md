# Предварительная проверка перед transfer репозитория

Дата проверки: `2026-06-01`

Цель: заранее понять, что можно передавать в новый GitHub и какие старые значения потом нужно заменить.

## 1. Git status

Результат:

```text
Текущая ветка: main
Незакоммиченные изменения: только новые/изменённые документы передачи.
```

Перед transfer желательно сделать отдельный commit с документацией передачи.

## 2. Локальные секреты и git

Проверка:

```bash
git ls-files .env .env.server .secrets .env.example .env.server.example
```

Результат:

```text
В git отслеживаются только шаблоны:
.env.example
.env.server.example

Локальные .env, .env.server и .secrets не отслеживаются.
```

Проверка `.gitignore`:

```text
.secrets/
.env
.env.server
.env.local
.env.*.local
ID google calendar.txt
logs/
runtime-logs/
```

Вывод:

```text
Базовая защита от случайной передачи локальных env/secrets есть.
```

## 3. Быстрый поиск чувствительных маркеров

Проверка:

```bash
rg -n "TELEGRAM_BOT_TOKEN|BEGIN PRIVATE KEY|private_key|VPS_SSH_PRIVATE_KEY|GOOGLE_PRIVATE_KEY" --glob '!node_modules/**' --glob '!pnpm-lock.yaml' .
```

Результат:

```text
Найдены упоминания имён переменных, placeholders, код чтения env/JSON и исторические записи в документации.
Полные реальные токены, private keys или JSON service account в отслеживаемых файлах этим быстрым поиском не выявлены.
```

Что важно:

- [ ] Перед transfer ещё раз просмотреть staged diff.
- [ ] Не коммитить локальные `.env`, `.env.server`, `.secrets`.
- [ ] Не коммитить файлы из менеджера паролей или скачанный Google JSON.

## 4. Старые значения, которые нужно заменить после появления новых аккаунтов

Команда:

```bash
rg -l "anyatobolova|TvoyBox|TvoiBox|62\\.113\\.111\\.4|492732093|findirtobolova|tvoybox-bot|AnyaTobolova" .
```

Файлы, где есть старые значения:

```text
docs/auto-deploy.md
docs/future-agent-prompt.md
docs/mini-app-soft-launch.md
docs/mini-app-soft-launch-runbook.md
docs/new-services-setup-instructions.md
docs/production-ops-runbook.md
docs/telegram-test-bot.md
docs/server-deploy.md
docs/project-handover-checklist.md
docs/project-accounts-map.md
Этапы разработки.md
apps/mini-app/src/lib/mini-app-preview.ts
apps/mini-app/src/lib/mini-app-api.ts
apps/mini-app/src/components/mini-app-root.tsx
scripts/deploy/install-codex-key.ps1
scripts/qa/stage28-telegram-initdata-flow-check.mjs
```

## 5. Как обрабатывать старые значения

Заменить при настройке нового production:

- [ ] `api.anyatobolova.ru`
- [ ] `app.anyatobolova.ru`
- [ ] `anyatobolova.ru`
- [ ] `62.113.111.4`
- [ ] `AnyaTobolova/TvoiBox_bot`
- [ ] `AnyaTobolova`
- [ ] `findirtobolova@gmail.com`
- [ ] `tvoybox-bot@tvoybox-bot.iam.gserviceaccount.com`
- [ ] `tvoybox-bot`
- [ ] `492732093`, если новый admin/trainer Telegram ID другой.

Оставить как историческую справку или переносной контекст:

- [ ] `Этапы разработки.md`, если нужен полный журнал проекта.
- [ ] `docs/future-agent-prompt.md`, если он остаётся как исторический prompt и будет отдельно обновлён.
- [ ] Старые runbook-разделы, если они явно помечены как старый контур.

Проверить отдельно в коде:

- [ ] `apps/mini-app/src/lib/mini-app-api.ts` — там есть доменная логика для `anyatobolova.ru`; при новом домене её нужно обновить.
- [ ] `apps/mini-app/src/lib/mini-app-preview.ts` — preview trainer ID может быть старым, заменить при необходимости.
- [ ] `scripts/qa/stage28-telegram-initdata-flow-check.mjs` — dev/prod domain checks могут быть завязаны на старый домен.
- [ ] `.github/workflows/deploy-production.yml` — healthcheck URL и deploy naming.

## 6. Вывод перед transfer

```text
Репозиторий можно готовить к transfer после commit документации.
Новые значения доменов, GitHub owner, VPS IP, Google Calendar и Telegram IDs нужно заменить отдельным шагом, когда новый владелец предоставит аккаунты.
```

