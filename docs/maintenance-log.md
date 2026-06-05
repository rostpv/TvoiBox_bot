# Maintenance log

## 2026-06-05: финальная очистка после web-этапа

Контекст: проверки web-записи и web-кабинета тренера завершены, владелец передаёт функциональность на ручное тестирование клиентам.

### GitHub

- Проверен локальный `git status`: рабочее дерево было чистым.
- Удалена уже влитая ветка `codex/web-booking-foundation`:
  - локально;
  - в remote `origin`.
- После `git fetch --prune` осталась только ветка `main`.
- GitHub Actions artifacts: `0`.
- Git tags: отсутствуют.
- Workflow runs не удалялись: это полезный журнал production deploy и не рабочие файлы проекта.

### VPS

До очистки:

- `/`: `21G` занято из `29G`, свободно около `7.1G`.
- Docker build cache: около `14.57GB`.
- Releases: 5 директорий, всего около `23M`.
- Остановленный контейнер: `tvoy-box-bot-migrate-1`.
- В `/tmp` был временный deploy script `/tmp/remote-deploy.sh`.

Выполнено:

- удалён `/tmp/remote-deploy.sh`;
- выполнен `docker container prune -f`;
- выполнен `docker builder prune -af`;
- выполнен `docker image prune -f`;
- временный SSH-ключ Codex удалён из `/root/.ssh/authorized_keys`.

После очистки:

- `/`: занято около `7.9G` из `29G`, свободно около `21G`;
- Docker build cache: `0B`;
- production-контейнеры остались запущены;
- `api` и `mini-app` healthy;
- Postgres volume не трогался;
- автоматические и manual backups не удалялись;
- releases не удалялись, потому что их ровно 5 и они нужны для rollback.

### Что не чистилось

- `/opt/stack/tvoy-box-bot-deploy/shared`;
- `.env.server`;
- `.secrets/google-service-account.json`;
- Postgres Docker volume;
- backup-файлы базы;
- release-директории rollback;
- GitHub workflow run history.
