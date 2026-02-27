---
description: "Документация по деплою и управлению cultvshn-bot на Keenetic OS 5+"
disable-model-invocation: false
user-invocable: true
---

# Deploy — Keenetic OS 5+

## Механика deploy.sh
- Скачивает zip main-ветки, распаковывает в `cultvshn-bot-main/`, symlink `.env`, `npm ci`, запускает `poll-daemon`
- Каждые 5 мин проверяет SHA через GitHub API; при изменении — stop → deploy → start; при ошибке — откат из `.old`
- SHA сохраняется только после успешного деплоя
- Layout: базовая директория содержит `.env`, `cultvshn-bot-main/`, `deploy.pid`
- Базовая директория: `/tmp/mnt/181ADB641ADB3E06/projects/cultvshn`

## Первоначальная установка (одноразово)

```
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

```
/opt/etc/init.d/S99cultvshn-bot start    # Запуск deploy + daemon
/opt/etc/init.d/S99cultvshn-bot stop     # Остановка deploy + daemon
/opt/etc/init.d/S99cultvshn-bot restart  # Перезапуск
/opt/etc/init.d/S99cultvshn-bot status   # Проверка статуса (deploy + bot)
tail -f /opt/var/log/cultvshn-bot.log    # Логи
```
