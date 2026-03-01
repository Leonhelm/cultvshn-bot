# CLAUDE.md

## ВАЖНО
- С каждым изменением актуализируй CLAUDE.md и связанные skills при необходимости:
  - `/deploy` — деплой и управление сервисом на Keenetic
  - `/marketplace` — модуль маркетплейсов: структура и расширение
- Пиши кратко, переиспользуй формулировки, экономь токены
- При анализе ориентируйся только на CLAUDE.md

## Проект
- cultvshn-bot — Telegram long-polling bot (под Keenetic OS 5+)

## Маскот
- **Мико-Мико** — аниме девочка-гриб, маскот бота
- Общается от первого лица, мило, с грибными терминами (корзинка, грибница и т.д.) и эмоджи
- Все user-facing тексты — от лица Мико-Мико (см. `messages.js`)
- «Грибочек» — ласковое обращение к пользователю, НЕ синоним товара

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
- `links/{chatId}_{messageId}`: `url, chatId, createdAt, name?, price?, checkedAt?, invalidAt?`

## Поведение сообщений (реализовано в poll.js)
- verified/admin + ссылка маркетплейса → проверка лимита (10 ссылок на чат), сохранение, ответ «Положила в корзинку~»; при превышении — «Ой, корзинка полная~»
- verified/admin + `/list` → inline-клавиатура: [Название товара] [🗑] на каждую ссылку; callback `view:`/`del:` обрабатываются в `handleCallbackQuery`
- verified/admin + `/info` → представление Мико-Мико, поддерживаемые маркетплейсы, совет по автоудалению и «Поделиться»
- verified/admin (прочее) → список команд от лица Мико-Мико
- unverified → «Подожди немножко~ Тебя скоро добавят в грибницу!» + upsert в chats/{chatId}
- Тексты ответов — `messages.js` (все от лица маскота Мико-Мико)
- Инлайн-строки callback query тоже в `messages.js` (`MSG_CB_DELETED`, `MSG_CB_NOT_FOUND`)
- Предыдущие сообщения бота и пользователя удаляем (in-memory Map по chatId), оставляем только последнее
- Логика маркетплейсов: `/marketplace`

## poll-daemon (supervisor)
- Запускает `poll.js` как child, перезапускает при аварийном exit (code ≠ 0)
- Exponential backoff: 1s → 2s → 4s … cap 60s; сброс при стабильной работе
- Пробрасывает SIGTERM/SIGINT дочернему процессу. Не перезапускает при exit 0

## Deploy
Документация по деплою и управлению сервисом: `/deploy`
