---
description: "Модуль маркетплейсов: структура, добавление новых маркетплейсов, расширение парсинга"
disable-model-invocation: false
user-invocable: true
---

# Marketplace — модуль работы с маркетплейсами

## Структура модуля

```
src/shared/marketplace/
└── extract.js + extract.d.ts    # Парсинг ссылок маркетплейсов из Telegram-сообщений
```

## Как добавить новый маркетплейс

1. `extract.js` — добавить домен в `MARKETPLACE_HOSTS`
2. `extract.js` — обновить regex-фолбэк (строка с `match`)
3. `messages.js` — при необходимости обновить тексты

## Как расширять модуль

Новые файлы добавлять в `src/shared/marketplace/`.
Примеры будущих файлов: `normalize.js` (очистка URL), `validate.js` (проверка товара), `hosts.js` (вынос списка хостов).

## Связанные файлы вне модуля

- `src/shared/lib/firestore.js` — `saveLink()` сохраняет ссылку в Firestore
- `src/shared/lib/messages.js` — `MSG_LINK_SAVED` текст ответа
- `src/entrypoints/poll.js` — оркестрация: extract → save → respond
