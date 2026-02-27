# CLAUDE.md

## ВАЖНО
- С каждым изменением актуализируй CLAUDE.md
- Пиши кратко, переиспользуй формулировки, экономь токены
- При анализе ориентируйся только на CLAUDE.md

## Проект
- cultvshn-bot — Telegram long-polling bot (под Keenetic OS 5+)

## Зависимости
- Runtime: **Node.js 18.20.2** (без сборки)
- Язык: JS + `.d.ts` для публичных типов. `strict: true`, `allowJs: true`
- DB: **Firebase Firestore** (`firebase-admin`)
- Конфигурация: `.env` через `dotenv`. Секреты в `.gitignore`

## Структура

```
scripts/                            # Скрипты по запуску и обновлению cultvshn-bot на Keenetic OS 5+
src/
├── entrypoints/                    # Точки входа
│   ├── poll.js                     # Long polling + обработка сообщений
│   └── poll-daemon.js              # Daemon-supervisor для poll.js
└── shared/                         # Переиспользуемый код
    ├── config/                     # Чтение переменных окружения (dotenv)
    │   └── env.js + env.d.ts
    └── lib/                        # Утилиты
        ├── logger.js + logger.d.ts
        ├── messages.js + messages.d.ts   # Тексты ответов бота
        ├── telegram.js + telegram.d.ts   # Telegram Bot API (fetch)
        └── firestore.js + firestore.d.ts # Firestore CRUD
```

## Переменные окружения
- `TG_BOT_API_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (одной строкой)
Файл `.env` — только локально

## Firestore — коллекции
- `chats/{chatId}`: `firstName, lastName?, username?, role ('unverified'|'verified'|'admin'), state?, createdAt, updatedAt`

## Поведение сообщений (реализовано в poll.js)
- verified/admin → «Доступные команды:\n/list»
- verified/admin + `/list` → «Та нажал на /list – молодец»
- unverified → «Тебя скоро добавят, подожди немного.» + upsert в chats/{chatId}
- Тексты ответов — `messages.js`
- Предыдущие сообщения бота и пользователя удаляем (in-memory Map по chatId), оставляем только последнее

## poll-daemon (supervisor)
- Запускает `poll.js` как child, перезапускает при аварийном exit (code ≠ 0)
- Exponential backoff: 1s → 2s → 4s … cap 60s; сброс при стабильной работе
- Пробрасывает SIGTERM/SIGINT дочернему процессу. Не перезапускает при exit 0

## Deploy (Keenetic, кратко)
- `deploy.sh`: скачивает zip main, распаковывает в `cultvshn-bot-main/`, symlink `.env`, `npm ci`, запускает `poll-daemon`
- Обновление: каждые 60 мин проверка SHA; при ошибке — откат из `.old`. SHA сохраняется только после успешного деплоя
- Layout: базовая директория содержит по умолчанию `.env`, `cultvshn-bot-main/`
