---
description: "Модуль маркетплейсов: парсинг, хранение и управление ссылками"
disable-model-invocation: false
user-invocable: true
---

# Marketplace — модуль работы с маркетплейсами

## Файлы модуля

```
src/shared/marketplace/
└── extract.js + extract.d.ts    # Парсинг ссылок из Telegram-сообщений; getMarketplaceType()

src/entrypoints/
├── overview-marketplaces.js             # Long-running: обзор ссылок (цикл каждые 10 мин)
└── overview-marketplaces-daemon.js      # Daemon-supervisor для overview-marketplaces.js
```

## Поддерживаемые маркетплейсы

`ozon.ru` — единственный домен в `MARKETPLACE_HOSTS` в `extract.js`

## Обзор ссылок (overview-marketplaces)

Daemon на устройстве (`overview-marketplaces-daemon.js` → `overview-marketplaces.js`):
- Long-running процесс, цикл каждые 10 мин
- Читает все ссылки из Firestore через `listLinks()`
- Сортирует по `checkedAt` asc: без `checkedAt` (никогда не проверялись) идут первыми
- Логирует через `logInfo`: `[<ISO дата> | never] <id> — <url>`
- Graceful shutdown по SIGTERM/SIGINT
- Сейчас заглушка — парсинга нет, `checkedAt` не обновляется
- Запуск/остановка через `S99cultvshn-bot` и `deploy.sh` (вместе с poll-daemon)

## Firestore-схема ссылок (`links/{chatId}_{messageId}`)

| Поле | Тип | Описание |
|------|-----|---------|
| `url` | string | Сохранённый URL |
| `chatId` | string | ID чата |
| `createdAt` | Timestamp | Дата добавления |
| `checkedAt` | Timestamp? | Последняя проверка |
| `name` | string? | Название товара |
| `price` | number? | Текущая цена, руб |
| `invalidAt` | Timestamp? | Когда парсинг не удался (поле отсутствует = всё ок) |

## Команды бота (verified/admin)

- Отправка ссылки ozon.ru → проверка лимита (10 на чат) → сохранение в `links/{chatId}_{messageId}`
- `/list` → список всех ссылок с инлайн-кнопками [Название] [🗑]
- callback `view:<id>` → показать URL ссылки
- callback `del:<id>` → удалить ссылку из Firestore

## Лимит ссылок

- Максимум **10 ссылок на чат** (проверяется через `countLinksByChat()` перед `saveLink()`)
- При превышении бот отвечает `MSG_LINK_LIMIT`
- `firestore.js` — `countLinksByChat(chatId)` использует Firestore `count()` агрегацию

## Как добавить новый маркетплейс

1. `extract.js` — добавить домен в `MARKETPLACE_HOSTS`
2. `extract.js` — обновить regex-фолбэк и добавить ветку в `getMarketplaceType()`

## Связанные файлы

- `firestore.js` — `saveLink()`, `listLinks()`, `getLink()`, `deleteLink()`, `updateLinkData()`
- `messages.js` — `MSG_LINK_SAVED`, `MSG_LINK_NOT_FOUND`, `msgList()`
- `poll.js` — оркестрация: extract → save / list / view / delete → respond
