---
description: "Модуль маркетплейсов: парсинг, хранение и управление ссылками"
disable-model-invocation: false
user-invocable: true
---

# Marketplace — модуль работы с маркетплейсами

## Файлы модуля

```
src/shared/marketplace/
└── extract.js + extract.d.ts    # Парсинг ссылок маркетплейсов из Telegram-сообщений
```

## Поддерживаемые маркетплейсы

`ozon.ru`, `wildberries.ru` — домены в `MARKETPLACE_HOSTS` массиве в `extract.js`

## Как добавить новый маркетплейс

1. `extract.js` — добавить домен в `MARKETPLACE_HOSTS`
2. `extract.js` — обновить regex-фолбэк (строка с `match`)

## Команды бота (verified/admin)

- Отправка ссылки ozon.ru/wildberries.ru → сохранение в `links/{chatId}_{messageId}`
- `/list` → список всех ссылок с командами `/mp_view_{id}` и `/mp_delete_{id}`
- `/mp_view_{id}` → показать URL ссылки
- `/mp_delete_{id}` → удалить ссылку из Firestore, подтверждение

## Связанные файлы

- `firestore.js` — `saveLink()`, `listLinks()`, `getLink()`, `deleteLink()`
- `messages.js` — `MSG_LINK_SAVED`, `MSG_LINK_DELETED`, `MSG_LINK_NOT_FOUND`, `msgList()`
- `poll.js` — оркестрация: extract → save / list / view / delete → respond
