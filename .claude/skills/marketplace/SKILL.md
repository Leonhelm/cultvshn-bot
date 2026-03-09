---
description: "Маркетплейсы: парсинг ссылок, бизнес-логика, overview, Firestore links"
disable-model-invocation: false
user-invocable: true
---

# Marketplace — модуль маркетплейсов

## Файлы

```
src/shared/marketplace/
├── extract.js + extract.d.ts         # Парсинг ссылок из Telegram-сообщений
src/shared/lib/
└── firestore.js + firestore.d.ts     # Функции для links (saveLink, listLinks и т.д.)
src/entrypoints/
└── overview-marketplaces.js          # Long-running: обзор ссылок (цикл каждые 10 мин)
```

## Типизация

- 100% strict `.d.ts` покрытие, без JSDoc в `.js`

## Поддерживаемые маркетплейсы

`ozon.ru` — единственный домен в `MARKETPLACE_HOSTS` в `extract.js`

## extract.js — парсинг ссылок

### Внутренние

- `MARKETPLACE_HOSTS: string[]` — `["ozon.ru"]`
- `isMarketplaceHost(hostname)` — проверяет точное совпадение или поддомен (`.ozon.ru`)
- `isMarketplaceUrl(urlStr)` — `new URL` + протокол http/https + `isMarketplaceHost`

### Экспорты

```ts
extractMarketplaceLink(
  text: string | undefined,
  entities: Array<{ type: string; offset: number; length: number; url?: string }> | undefined,
): string | null
```

Алгоритм:
1. Entities → ищет `type === "url"` (substring из text) или `type === "text_link"` (e.url)
2. Проверяет каждый candidate через `isMarketplaceUrl`
3. Fallback: regex `/https?:\/\/(?:www\.)?ozon\.ru\S*/i` + `isMarketplaceUrl`
4. Не найдено → `null`

```ts
getMarketplaceType(url: string): 'ozon' | null
```

Определяет тип маркетплейса по hostname.

## Firestore — коллекция `links/{chatId}_{messageId}`

| Поле | Тип | Описание |
|------|-----|---------|
| `url` | string | Сохранённый URL |
| `chatId` | string | ID чата |
| `createdAt` | Timestamp | Дата добавления |
| `checkedAt` | Timestamp? | Последняя проверка overview |
| `name` | string? | Название товара (из парсинга) |
| `price` | number? | Текущая цена, руб |
| `invalidAt` | Timestamp? | Когда парсинг не удался (нет поля = всё ок) |

### Типы

```ts
interface LinkDoc { url: string; chatId: string; createdAt: Timestamp; checkedAt?: Timestamp; name?: string; price?: number; invalidAt?: Timestamp }
interface LinkDocWithId extends LinkDoc { id: string }
```

### Функции firestore.js для ссылок

```ts
saveLink(chatId: string, messageId: number, url: string): Promise<void>
// Создаёт doc с id `{chatId}_{messageId}`, поля: url, chatId, createdAt (server)

countLinksByChat(chatId: string): Promise<number>
// Firestore count() агрегация по chatId

listLinks(): Promise<LinkDocWithId[]>
// Все ссылки, orderBy createdAt desc

getLink(docId: string): Promise<LinkDocWithId | null>

deleteLink(docId: string): Promise<void>

updateLinkData(docId: string, data: { name?: string; price?: number; invalidAt?: boolean }): Promise<void>
// Всегда ставит checkedAt = serverTimestamp
// invalidAt: true → serverTimestamp, false/undefined → FieldValue.delete()
```

## Лимит ссылок

Максимум **10 ссылок на чат**. Проверяется через `countLinksByChat()` перед `saveLink()` в poll.js.
При превышении — `MSG_LINK_LIMIT` (тексты: `/mascot`).

## Команды бота (verified/admin)

| Действие | Результат |
|----------|-----------|
| Отправка ссылки ozon.ru | Проверка лимита → `saveLink` → ответ |
| `/list` | `listLinks()` → `msgList()` → inline-клавиатура |
| callback `view:<id>` | `getLink` → URL |
| callback `del:<id>` | `deleteLink` → обновить inline-клавиатуру |

Роутинг: `/core`. Тексты ответов: `/mascot`.

## overview-marketplaces.js

Long-running процесс, цикл каждые 10 мин (`CHECK_INTERVAL_MS = 600000`).

1. `checkLinks()` — читает `listLinks()`, сортирует по `checkedAt` asc (без `checkedAt` → первые)
2. Логирует: `[ISO-дата | never] id — url`
3. `interruptibleSleep(ms)` — sleep шагами по 5с, проверяя `running`
4. Graceful shutdown: `SIGTERM`/`SIGINT` → `running = false` → цикл завершается → `terminateFirestore()` → `exit 0`

**Сейчас заглушка** — парсинга нет, `checkedAt` не обновляется.
Daemon-supervisor: `/deploy`.

## Как добавить новый маркетплейс

1. `extract.js` — добавить домен в `MARKETPLACE_HOSTS`
2. `extract.js` — обновить regex-fallback (сейчас hardcoded `ozon\.ru`)
3. `extract.js` — добавить ветку в `getMarketplaceType()`
4. `extract.d.ts` — расширить union тип возврата `getMarketplaceType`
