---
description: "Список покупок: добавление, предсказания, shopping-overview"
disable-model-invocation: false
user-invocable: true
---

# Shopping — список покупок

## Файлы

```
src/shared/shopping/
├── predict.js + predict.d.ts        # Предсказание следующей покупки
src/shared/lib/
├── firestore.js                     # Коллекция items: CRUD + predictions
├── messages.js                      # MSG_ITEM_*, msgList()
src/entrypoints/
├── shopping-overview.js             # Фоновый процесс: обновление предсказаний (1 час)
└── shopping-overview-daemon.js      # Supervisor для shopping-overview.js
```

## Коллекция Firestore: `items/{chatId}_{slug}`

| Поле | Тип | Описание |
|------|-----|---------|
| `name` | string | Название покупки (1–50 символов) |
| `chatId` | string | ID чата |
| `createdAt` | Timestamp | Первое добавление |
| `addedDates` | Timestamp[] | До 10 дат нажатия "+", от новых к старым |
| `nextPredicted` | Timestamp \| null | Прогноз следующей покупки |

ID документа: `{chatId}_{slug(name)}` — slug из транслитерации/нормализации имени.

## Добавление покупки

- Пользователь пишет `+ фраза` (1–50 символов)
- Если фраза > 50 → `MSG_ITEM_TOO_LONG`
- Если лимит (50 items) → `MSG_ITEM_LIMIT`
- Новая → `saveItem()` → `MSG_ITEM_ADDED`
- Существующая → обновляет `addedDates` → `MSG_ITEM_UPDATED`

## /list — отображение

`msgList(items)` сортирует по `nextPredicted`:
1. `nextPredicted` в прошлом (просрочены) — сверху
2. `nextPredicted` в будущем — по возрастанию
3. Без `nextPredicted` — в конце, по `createdAt`

Каждый элемент: `[название (Nд)]` `[🍄]` `[🗑]`
- Название + относительная дата последнего "+"
- 🍄 → `add:{docId}` (обновить дату)
- 🗑 → `del:{docId}` (удалить)

## Предсказание (`predict.js`)

`predictNextDate(addedDates)`:
- < 2 дат → `null`
- ≥ 2 дат → средний интервал между последовательными датами → `lastDate + avgInterval`

## shopping-overview.js

- Интервал: 1 час (3_600_000 мс)
- Загружает все items → `predictNextDate()` → `updateItemPrediction()`
- Обновляет только изменённые предсказания
- Graceful shutdown: `SIGTERM`/`SIGINT`

## Функции Firestore

| Функция | Описание |
|---------|---------|
| `saveItem(chatId, name)` | Создать/обновить покупку, возвращает `{ created }` |
| `countItemsByChat(chatId)` | Количество покупок в чате |
| `listItemsByChat(chatId)` | Все покупки чата |
| `listAllItems()` | Все покупки (для overview) |
| `getItem(docId)` | Получить по ID |
| `deleteItem(docId)` | Удалить |
| `addItemDate(docId)` | Добавить дату в addedDates (max 10) |
| `updateItemPrediction(docId, nextPredicted)` | Обновить прогноз |

## Лимиты

- Название: 1–50 символов
- Покупок на чат: 50
- Дат в addedDates: 10
