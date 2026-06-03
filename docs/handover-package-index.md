# Индекс пакета передачи

Карта документов, которые относятся к передаче проекта новому владельцу.

## Главный маршрут

1. `docs/project-handover-checklist.md`
   - главный чек-лист передачи;
   - прогресс;
   - принятые решения;
   - места для новых аккаунтов, ссылок и результатов.

2. `docs/new-services-setup-instructions.md`
   - пошаговая настройка новых сервисов;
   - Telegram/BotFather;
   - GitHub;
   - VPS/provider;
   - DNS/domain registrar;
   - Google account;
   - Google Cloud;
   - Google Calendar.

3. `docs/handover-cutover-runbook.md`
   - порядок действий в день переключения;
   - pre-flight;
   - go/no-go;
   - rollback;
   - действия после успешного запуска.

## Документы для владельца

4. `docs/owner-access-request.md`
   - текст, который можно отправить владельцу;
   - что он должен подготовить;
   - что можно прислать в чат;
   - что нельзя присылать в чат.

5. `docs/owner-production-check.md`
   - короткая пользовательская проверка после запуска;
   - клиентский сценарий;
   - тренерский сценарий;
   - уведомления и Google Calendar;
   - что собрать при ошибке.

6. `docs/password-manager-guide.md`
   - как хранить секреты, если менеджера паролей сейчас нет;
   - простой вариант с зашифрованным архивом;
   - что такое менеджер паролей;
   - какой выбрать, если владелец всё-таки хочет менеджер;
   - какие секреты туда сохранить;
   - как фиксировать место хранения секретов в документах.

## Технические шаблоны

7. `docs/new-production-templates.md`
   - DNS records;
   - Caddyfile template;
   - `.env.server` template;
   - GitHub Actions secrets;
   - workflow values;
   - первый deploy;
   - rollback.

8. `docs/pre-transfer-audit.md`
   - предварительная проверка репозитория перед GitHub transfer;
   - какие секреты не отслеживаются git;
   - какие старые значения нужно заменить;
   - какие файлы требуют внимания после появления нового домена и аккаунтов.

## Existing runbooks

9. `docs/project-accounts-map.md`
   - текущая карта старого production-контура;
   - после передачи обновить новыми значениями или пометить как старую карту.

10. `docs/production-ops-runbook.md`
   - рабочий runbook production;
   - после передачи заменить домены, GitHub, VPS и Google Calendar на новые.

11. `docs/server-deploy.md`
    - техническая инструкция server deploy;
    - после передачи обновить домены и пути, если документ остаётся в пакете.

12. `docs/auto-deploy.md`
    - инструкция по GitHub Actions autodeploy;
    - после передачи обновить repo, deploy root и healthcheck URL.

## Что сделать после появления новых аккаунтов

- [ ] Заполнить реальные значения в `docs/project-handover-checklist.md`.
- [ ] Обновить `docs/project-accounts-map.md`.
- [ ] Обновить `docs/production-ops-runbook.md`.
- [ ] Обновить `.github/workflows/deploy-production.yml`.
- [ ] Обновить доменную логику в коде, если новый домен отличается от `anyatobolova.ru`.
- [ ] Выполнить поиск из `docs/pre-transfer-audit.md`.
- [ ] Сделать commit документации и конфигурационных изменений.
