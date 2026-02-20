# CLAUDE.md

Инструкции, соглашения и контекст проекта **cultvshn-bot** — Telegram-бот.

## Обзор проекта

Telegram-бот [@cultvshn_bot](https://t.me/cultvshn_bot). Точка входа: long polling (основная, на Keenetic OS 5).

## Стек технологий

- **Runtime:** Node.js 18.20.2 (ограничение Keenetic OS 5)
- **Язык:** JavaScript (.js) + декларации TypeScript (.d.ts), `strict: true`, `allowJs: true`
- **Без сборки:** файлы запускаются напрямую через `node`, без транспиляции
- **База данных:** Firebase Firestore (через `firebase-admin`)
- **Зависимости:**
  - `dotenv` (чтение .env)
  - `firebase-admin` (Firestore — хранение состояния бота, данных чатов, очередь сообщений)
  - Любая новая зависимость требует явного обоснования

## Архитектура: Feature-Sliced Design v2.1

Адаптация FSD под backend Telegram-бота. Слои `pages`, `widgets`, `processes` не применяются.

```
src/
├── app/                          # Слой приложения
│   ├── entrypoints/              # Точки входа
│   │   ├── poll.js               # Long polling (Keenetic OS 5)
│   │   └── poll-daemon.js        # Daemon-supervisor для poll.js
│   └── config/                   # Конфигурация приложения
│       ├── index.js
│       └── index.d.ts
│
├── features/                     # Фичи (пользовательские сценарии)
│   ├── greeting/                 # Приветствие: ФИО + chat id
│   │   ├── greet.js + greet.d.ts
│   │   ├── index.js + index.d.ts
│   └── chat-cleanup/             # Очистка окна чата
│       ├── cleanup.js + cleanup.d.ts
│       ├── index.js + index.d.ts
│
├── entities/                     # Доменные сущности
│   ├── chat/                     # Чат (данные пользователя + роль)
│   │   ├── chat-repository.js + chat-repository.d.ts
│   │   ├── index.js + index.d.ts
│   ├── user/                     # Пользователь (форматирование имени)
│   │   ├── format-user-name.js + format-user-name.d.ts
│   │   ├── index.js + index.d.ts
│   └── message/                  # Сообщение (очередь + last bot message)
│       ├── incoming-message.js + incoming-message.d.ts
│       ├── last-bot-message.js + last-bot-message.d.ts
│       ├── index.js + index.d.ts
│
└── shared/                       # Переиспользуемый код
    ├── api/                      # Клиент Telegram Bot API (fetch)
    │   ├── telegram-client.js + telegram-client.d.ts
    │   ├── index.js + index.d.ts
    ├── config/                   # Чтение переменных окружения (dotenv)
    │   ├── env.js + env.d.ts
    │   ├── index.js + index.d.ts
    ├── db/                       # Firebase Firestore (инициализация + offset)
    │   ├── firestore.js + firestore.d.ts
    │   ├── index.js + index.d.ts
    ├── lib/                      # Утилиты
    │   ├── logger.js + logger.d.ts
    │   ├── index.js + index.d.ts
    └── types/                    # Общие типы (.d.ts only — без .js)
        ├── telegram.d.ts
        └── index.d.ts
```

### Правила FSD

- Зависимости только сверху вниз: `app → features → entities → shared`
- Обратные зависимости запрещены (shared не импортирует из features)
- Каждый слайс экспортирует public API через `index.js` + `index.d.ts`
- Внутренности слайса недоступны снаружи — импорт только из `index.js`

### Правила .js + .d.ts

- Код — в `.js` файлах (чистый JavaScript, без аннотаций типов)
- Типы — в `.d.ts` файлах (декларации публичного API модуля)
- Слайс `shared/types/` содержит только `.d.ts` файлы (чистые типы, без runtime-кода)
- В `.js` файлах нет `import type` — такие импорты существуют только в `.d.ts`
- С `moduleResolution: Node16` путь `"./telegram.js"` в `.d.ts` корректно резолвится в `telegram.d.ts`

## Переменные окружения

Файл `.env` в корне проекта, читается через `dotenv`:

| Переменная                     | Описание                                        |
| ------------------------------ | ----------------------------------------------- |
| `TG_BOT_API_TOKEN`             | Токен Telegram-бота                             |
| `TG_BOT_ADMIN`                 | Chat ID админского чата                         |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON сервисного аккаунта Firebase (одной строкой) |

**Важно:** `.env` в `.gitignore`, секреты никогда не попадают в репозиторий.

Для получения `FIREBASE_SERVICE_ACCOUNT_JSON`:
1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key
2. Сжать в одну строку: `cat serviceAccountKey.json | jq -c .`

## Firebase Firestore

### Модель данных

**Коллекция `chats/{chatId}`** — данные чатов:

| Поле | Тип | Описание |
|------|-----|----------|
| `firstName` | string | Имя пользователя |
| `lastName` | string \| null | Фамилия |
| `username` | string \| null | Ник в Telegram |
| `role` | `"unverified"` \| `"verified"` \| `"admin"` | Роль (по умолчанию `"unverified"`) |
| `createdAt` | Date | Дата создания записи |
| `updatedAt` | Date | Дата последнего обновления |

**Коллекция `messages/{updateId}`** — очередь необработанных сообщений пользователей:

| Поле | Тип | Описание |
|------|-----|----------|
| `chatId` | number | ID чата |
| `messageId` | number | ID сообщения в Telegram |
| `from` | `{ id, first_name, last_name?, username? }` | Отправитель (формат TgUser) |
| `text` | string \| null | Текст сообщения |
| `date` | number | Unix timestamp |
| `createdAt` | Date | Время записи |

**Коллекция `botMessages/{chatId}`** — последнее сообщение бота на чат:

| Поле | Тип | Описание |
|------|-----|----------|
| `messageId` | number | ID сообщения бота |
| `createdAt` | Date | Время отправки |

**Документ `botState/offset`** — offset для getUpdates:

| Поле | Тип | Описание |
|------|-----|----------|
| `value` | number | Текущий offset |

### Двухфазная обработка (poll.js)

```
Фаза 1 — Fetch & Store:
  getUpdates(offset) → сохранить сообщения в Firestore (batch write) → сохранить offset

Фаза 2 — Process:
  Прочитать необработанные сообщения из Firestore
  Для каждого: cleanup → greet → saveChat → delete processed
```

Такое разделение гарантирует, что при падении процесса данные не теряются — необработанные сообщения остаются в Firestore.

## Точки входа

### 1. Long polling (`app/entrypoints/poll.js`)

- Запускается на Keenetic OS 5 напрямую: `node src/app/entrypoints/poll.js`
- **Фаза 1:** опрашивает Telegram API (`getUpdates`), сохраняет сообщения в Firestore
- **Фаза 2:** читает необработанные сообщения из Firestore, обрабатывает, удаляет из очереди
- Offset хранится в Firestore — при перезапуске продолжает с того же места

### 2. Poll daemon (`app/entrypoints/poll-daemon.js`)

- Supervisor-процесс: запускает `poll.js` как дочерний процесс
- Перезапускает при аварийном завершении (exit code !== 0)
- Exponential backoff: 1s → 2s → 4s → ... → 60s (сброс после 60s стабильной работы)
- При получении SIGTERM/SIGINT пробрасывает сигнал дочернему процессу
- Не перезапускает при чистом завершении (exit code 0)
- Поддерживает команду `stop` для остановки работающего daemon

## Доставка и запуск на Keenetic

Исходники скачиваются напрямую из main-ветки:

```
https://github.com/Leonhelm/cultvshn-bot/archive/refs/heads/main.zip
```

Без сборки — файлы запускаются as-is после `npm install`.

### Установка init.d скрипта (одноразово)

```bash
cp scripts/init.d/S99cultvshn-bot /opt/etc/init.d/S99cultvshn-bot
chmod +x /opt/etc/init.d/S99cultvshn-bot
```

Правим пути в /opt/etc/init.d/S99cultvshn-bot под свои расположения

### Управление

```bash
/opt/etc/init.d/S99cultvshn-bot start    # Запуск daemon
/opt/etc/init.d/S99cultvshn-bot stop     # Остановка
/opt/etc/init.d/S99cultvshn-bot restart  # Перезапуск
/opt/etc/init.d/S99cultvshn-bot status   # Проверка статуса
```

### Логи

```bash
tail -f /opt/var/log/cultvshn-bot.log
```

## Поведение чата

Окно чата должно оставаться чистым:

1. **Перед отправкой** нового сообщения бота — удалить предыдущее сообщение бота
2. **После получения** сообщения пользователя — немедленно удалить его

## Логирование

- Логируем основные действия: запуск, получение апдейтов, отправку/удаление сообщений, ошибки
- **Запрещено** логировать: токен бота, содержимое .env, полные ответы API с токеном, service account JSON
- Маскируем секреты: показываем только последние 4 символа токена (`***abcd`)

## Соглашения по коду

- Именование файлов: `kebab-case.js` + `kebab-case.d.ts`
- Именование типов/интерфейсов: `PascalCase`
- Именование переменных/функций: `camelCase`
- Именование констант окружения: `UPPER_SNAKE_CASE`
- Каждый слайс FSD содержит `index.js` + `index.d.ts` — public API слайса
- Не импортировать из внутренностей слайса напрямую, только через `index.js`
- Используем нативный `fetch` (доступен в Node.js 18)
- `async/await` вместо колбэков и `.then()`
- Явные типы возвращаемых значений у публичных функций (в `.d.ts`)

## Команды

```bash
npm run start:poll          # Запуск long polling (для отладки)
npm run start:poll-daemon   # Запуск long polling через daemon (production)
npm run stop:poll-daemon    # Остановка daemon
npm run typecheck           # Проверка типов (tsc --noEmit)
```
