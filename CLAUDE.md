# CLAUDE.md

## ВАЖНО
- С каждым изменением актуализируй CLAUDE.md и связанные skills при необходимости:
  - `/deploy` — деплой и управление сервисом на Keenetic
  - `/marketplace` — модуль маркетплейсов: структура и расширение
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
    ├── lib/                        # Утилиты
    │   ├── logger.js + logger.d.ts
    │   ├── messages.js + messages.d.ts   # Тексты ответов бота
    │   ├── telegram.js + telegram.d.ts   # Telegram Bot API (fetch)
    │   └── firestore.js + firestore.d.ts # Firestore CRUD
    └── marketplace/                # Модуль маркетплейсов (skill: /marketplace)
        └── extract.js + extract.d.ts    # Парсинг ссылок
```

## Переменные окружения
- `TG_BOT_API_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (одной строкой)
Файл `.env` — только локально

## Firestore — коллекции
- `chats/{chatId}`: `firstName, lastName?, username?, role ('unverified'|'verified'|'admin'), state?, createdAt, updatedAt`
- `links/{chatId}_{messageId}`: `url, chatId, createdAt`

## Поведение сообщений (реализовано в poll.js)
- verified/admin + ссылка маркетплейса → сохранение, ответ «Ссылка сохранена!»
- verified/admin + `/list` → список ссылок с `/mp_view_{id}` и `/mp_delete_{id}`
- verified/admin + `/mp_view_{id}` → URL ссылки или «Ссылка не найдена.»
- verified/admin + `/mp_delete_{id}` → удаление ссылки или «Ссылка не найдена.»
- verified/admin (прочее) → «Доступные команды:\n/list»
- unverified → «Тебя скоро добавят, подожди немного.» + upsert в chats/{chatId}
- Тексты ответов — `messages.js`
- Предыдущие сообщения бота и пользователя удаляем (in-memory Map по chatId), оставляем только последнее
- Логика маркетплейсов: `/marketplace`

## poll-daemon (supervisor)
- Запускает `poll.js` как child, перезапускает при аварийном exit (code ≠ 0)
- Exponential backoff: 1s → 2s → 4s … cap 60s; сброс при стабильной работе
- Пробрасывает SIGTERM/SIGINT дочернему процессу. Не перезапускает при exit 0

## Deploy
Документация по деплою и управлению сервисом: `/deploy`
