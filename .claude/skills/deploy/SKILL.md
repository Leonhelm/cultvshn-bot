---
description: "Деплой, daemon-supervisors и управление cultvshn-bot на Keenetic OS 5+"
disable-model-invocation: false
user-invocable: true
---

# Deploy — Keenetic OS 5+

## Файлы

```
scripts/
├── deploy.sh                               # Автодеплой: скачивание, обновление, рестарт
└── init.d/
    └── S99cultvshn-bot                     # Keenetic init.d сервис
src/entrypoints/
└── poll-daemon.js                          # Supervisor для poll.js
```

## Механика deploy.sh

- Скачивает zip main-ветки, распаковывает в `cultvshn-bot-main/`, symlink `.env`, `npm ci`, запускает `poll-daemon`
- Каждые 60 мин проверяет SHA через GitHub API; при изменении — stop демона → deploy → start; при ошибке — откат из `.old`
- SHA сохраняется только после успешного деплоя
- Базовая директория: `/tmp/mnt/181ADB641ADB3E06/projects/cultvshn`
- Layout: `.env`, `cultvshn-bot-main/`, `deploy.pid`, `.current-sha`
- Логи: `/opt/var/log/cultvshn-bot.log`

## Daemon-supervisor

`poll-daemon.js` управляет child-процессом `poll.js`.

### Поведение

- `startDaemon()` — spawn child через `node`, записывает PID в файл (`poll-daemon.pid`)
- При аварийном exit child (code ≠ 0): перезапуск с exponential backoff
  - Начало: 1с, множитель: ×2, потолок: 60с
  - Сброс backoff если child проработал ≥ 60с (стабильный)
- При exit code 0: НЕ перезапускает (graceful shutdown)
- Пробрасывает `SIGTERM`/`SIGINT` дочернему процессу
- Если child не завершился за 15с → `SIGKILL`
- `SIGHUP` игнорируется (nohup-совместимость)

### Команды

```bash
node src/entrypoints/poll-daemon.js           # start
node src/entrypoints/poll-daemon.js stop      # stop (SIGTERM → 15s → SIGKILL)
```

### `stopDaemon()`

Читает PID-файл → `SIGTERM` → poll 500ms → deadline 15s → `SIGKILL` → удаляет PID-файл.

## Первоначальная установка (одноразово)

```bash
# 1. Создать базовую директорию
mkdir -p /tmp/mnt/181ADB641ADB3E06/projects/cultvshn

# 2. Создать .env с секретами
cat > /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/.env << 'EOF'
TG_BOT_API_TOKEN=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
EOF

# 3. Скачать deploy.sh
curl -sL -o /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/deploy.sh \
  "https://raw.githubusercontent.com/Leonhelm/cultvshn-bot/main/scripts/deploy.sh"
chmod +x /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/deploy.sh

# 4. Установить init.d скрипт
curl -sL -o /opt/etc/init.d/S99cultvshn-bot \
  "https://raw.githubusercontent.com/Leonhelm/cultvshn-bot/main/scripts/init.d/S99cultvshn-bot"
chmod +x /opt/etc/init.d/S99cultvshn-bot

# 5. Запустить
/opt/etc/init.d/S99cultvshn-bot start
```

## Управление

```bash
/opt/etc/init.d/S99cultvshn-bot start    # Запуск deploy + демон
/opt/etc/init.d/S99cultvshn-bot stop     # Остановка deploy + демон
/opt/etc/init.d/S99cultvshn-bot restart  # Перезапуск всех компонентов
/opt/etc/init.d/S99cultvshn-bot status   # Статус: deploy, bot
tail -f /opt/var/log/cultvshn-bot.log    # Логи
```
