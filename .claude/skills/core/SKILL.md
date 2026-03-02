---
description: "Ядро бота: Telegram API, Firestore, env, logger, роутинг poll.js"
disable-model-invocation: false
user-invocable: true
---

# Core — ядро бота

## Типизация

- 100% strict `.d.ts` покрытие, без JSDoc в `.js`
- `tsconfig.json`: `strict: true`, `allowJs: true`, `noEmit: true`

## Файлы

```
src/shared/config/
├── env.js + env.d.ts          # Переменные окружения
src/shared/lib/
├── logger.js + logger.d.ts    # Логирование
├── telegram.js + telegram.d.ts # Telegram Bot API
├── firestore.js + firestore.d.ts # Firestore CRUD
src/entrypoints/
└── poll.js                    # Long-polling + роутинг сообщений
```

## env.js

Загружает `dotenv/config`, валидирует при импорте:

```ts
export declare const env: {
  readonly TG_BOT_API_TOKEN: string;
  readonly FIREBASE_SERVICE_ACCOUNT_JSON: string;
};
```

`requireEnv(name)` — внутренняя, бросает `Error` если переменная отсутствует.

## logger.js

```ts
logInfo(message: string): void           // [ISO] INFO: message
logError(message: string, error?: unknown): void  // [ISO] ERROR: message — error.message
maskToken(token: string): string         // ***last4
```

## telegram.js

`callApi(method, body)` — внутренняя, POST к `https://api.telegram.org/bot{TOKEN}/{method}`.
Ограничение: timeout long-polling ≤ 8с (Node.js 18 fetch bug).

### Типы

```ts
interface TgUser { id: number; first_name: string; last_name?: string; username?: string }
interface TgMessageEntity { type: string; offset: number; length: number; url?: string }
interface TgMessage { message_id: number; chat: { id: number }; from?: TgUser; text?: string; entities?: TgMessageEntity[]; date: number }
interface TgCallbackQuery { id: string; from: TgUser; message?: TgMessage; data?: string }
interface TgUpdate { update_id: number; message?: TgMessage; callback_query?: TgCallbackQuery }
```

### Экспорты

| Функция | Сигнатура | Telegram метод |
|---------|-----------|----------------|
| `getUpdates` | `(offset: number, timeout?: number) → Promise<TgUpdate[]>` | getUpdates |
| `sendMessage` | `(chatId, text, extra?) → Promise<{ message_id }>` | sendMessage |
| `answerCallbackQuery` | `(callbackQueryId, text?) → Promise<boolean>` | answerCallbackQuery |
| `editMessageText` | `(chatId, messageId, text, extra?) → Promise<TgMessage>` | editMessageText |
| `deleteMessage` | `(chatId, messageId) → Promise<boolean>` | deleteMessage (catch → false) |

## firestore.js

Firebase Admin SDK, `initializeApp` + `cert` из `FIREBASE_SERVICE_ACCOUNT_JSON`.
Коллекции: `chats`, `links`.

### Коллекция `chats/{chatId}`

| Поле | Тип | Описание |
|------|-----|---------|
| `firstName` | string | Имя |
| `lastName` | string? | Фамилия |
| `username` | string? | @username |
| `role` | `'unverified' \| 'verified' \| 'admin'` | Роль |
| `state` | string? | Состояние (резерв) |
| `createdAt` | Timestamp | Создание |
| `updatedAt` | Timestamp | Обновление |

### Функции чатов

```ts
getChat(chatId: string): Promise<ChatDoc | null>
upsertUnverifiedChat(chatId: string, info: { firstName: string; lastName?: string; username?: string }): Promise<void>
terminateFirestore(): Promise<void>
```

### Функции ссылок

Документированы в `/marketplace` (доменная модель маркетплейсов):
`saveLink`, `countLinksByChat`, `listLinks`, `getLink`, `deleteLink`, `updateLinkData`

## poll.js — роутинг сообщений

Long-polling entrypoint. Graceful shutdown: `SIGTERM`/`SIGINT` → `running = false` → цикл завершается → `terminateFirestore()` → `exit 0`.

### In-memory трекинг

`lastMessages: Map<chatId, { botMsgId?, userMsgId? }>` — хранит ID последних сообщений.
`trackAndDeletePrevious(chatId, messageId, kind: 'bot'|'user')` — удаляет предыдущее, запоминает новое.

### handleMessage — таблица маршрутов

| Условие | Действие |
|---------|----------|
| verified/admin + ссылка маркетплейса | Проверка лимита → сохранение → `MSG_LINK_SAVED` / `MSG_LINK_LIMIT` |
| verified/admin + `/list` | `msgList(links)` → inline-клавиатура |
| verified/admin + `/info` | `MSG_INFO` |
| verified/admin + прочее | `MSG_COMMANDS` |
| unverified | `upsertUnverifiedChat()` → `MSG_UNVERIFIED` |

Каждый ответ: `sendMessage` → `trackAndDeletePrevious(bot)`.
Каждое входящее: `trackAndDeletePrevious(user)`.

### handleCallbackQuery

| Callback data | Действие |
|---------------|----------|
| `view:<docId>` | `getLink` → URL + `MSG_COMMANDS` / `MSG_LINK_NOT_FOUND` |
| `del:<docId>` | `deleteLink` → обновить `/list` inline → `MSG_CB_DELETED` / `MSG_CB_NOT_FOUND` |

### pollLoop

`while (running)` → `getUpdates(offset)` → route `message` / `callback_query`.
При ошибке: `logError` + sleep 5с (если `running`).
