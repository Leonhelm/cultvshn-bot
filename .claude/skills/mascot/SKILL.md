---
description: "Маскот Мико-Мико: тексты, тон бота, messages.js"
disable-model-invocation: false
user-invocable: true
---

# Mascot — Мико-Мико

## Персонаж

**Мико-Мико** — аниме девочка-гриб, маскот бота. Общается от первого лица, мило, с грибными терминами и эмоджи.

- «Грибочек» — ласковое обращение к пользователю, **НЕ** синоним товара
- «Корзинка» — список покупок пользователя
- «Грибница» — сообщество верифицированных пользователей

## Файлы

```
src/shared/lib/
├── messages.js       # Все тексты бота
└── messages.d.ts     # Типы: MSG_* константы, ListResult, msgList()
```

## Типизация

- 100% strict `.d.ts` покрытие, без JSDoc в `.js`

## Константы сообщений

| Экспорт | Текст | Контекст |
|---------|-------|----------|
| `MSG_COMMANDS` | `Мои команды~ 🌿\n/list — твоя корзинка\n/info — обо мне` | Подпись в конце почти всех ответов |
| `MSG_LIST_HEADER` | `🍄 Твоя корзинка` | Заголовок списка покупок |
| `MSG_LIST_EMPTY` | `Корзинка пустая~ 🧺\nНапиши + и что нужно купить!\n\n{MSG_COMMANDS}` | Пустой `/list` |
| `MSG_ITEM_ADDED` | `Положила в корзинку~ 🍄✨\n\n{MSG_COMMANDS}` | Покупка добавлена |
| `MSG_ITEM_UPDATED` | `Уже есть~ Обновила дату 🍄✨\n\n{MSG_COMMANDS}` | Покупка уже в списке, дата обновлена |
| `MSG_ITEM_TOO_LONG` | `Ой, слишком длинное название~ 🍄 До 50 символов, грибочек!` | Превышение лимита символов |
| `MSG_ITEM_LIMIT` | `Ой, корзинка полная~ 🧺 Уже 50 покупок! Убери лишние через /list` | Лимит 50 покупок |
| `MSG_ITEM_NOT_FOUND` | `Не нашла в корзинке… 🔍\n\n{MSG_COMMANDS}` | Покупка не найдена |
| `MSG_UNVERIFIED` | `Подожди немножко~ 🍄 Тебя скоро добавят в грибницу!` | Неверифицированный |
| `MSG_INFO` | Представление Мико-Мико, как добавлять покупки, предсказания, автоудаление | Команда `/info` |
| `MSG_CB_ADDED` | `Обновила~ ✨` | Callback popup при нажатии 🍄 |
| `MSG_CB_DELETED` | `Убрала~ 🍂` | Callback popup при удалении |
| `MSG_CB_NOT_FOUND` | `Не нашла… 🍄` | Callback popup: покупка не найдена |

## Функции

### `msgList(items: ListItem[]): ListResult`

Формирует inline-клавиатуру для `/list`:
- Пустой массив → `{ text: MSG_LIST_EMPTY }`
- С элементами → `{ text: "🍄 Твоя корзинка (N)\n\n{MSG_COMMANDS}", reply_markup: { inline_keyboard } }`
- Сортировка: по nextPredicted (просроченные → ближайшие → без прогноза)
- Каждая строка клавиатуры: `[название (Nд)]` `[🍄]` `[🗑]` с callback_data `noop:<id>`, `add:<id>`, `del:<id>`

### `displayName(name?: string): string` (внутренняя)

- `undefined` → `"???"`
- Длина > 40 → обрезка до 39 + `…`
- Иначе → как есть

### `relativeDate(timestamp): string` (внутренняя)

Относительная дата: `только что`, `5м`, `2ч`, `3д`, `1мес`

### Тип `ListItem`

```ts
interface ListItem {
  id: string;
  name: string;
  addedDates?: Timestamp[];
  nextPredicted?: Timestamp | null;
  createdAt?: Timestamp;
}
```

### Тип `ListResult`

```ts
interface ListResult {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
  };
}
```

## Стиль для новых сообщений

- Тильда~ в конце фраз для мягкости
- Эмоджи: 🍄 🌿 🧺 🍂 🌸 ✨ 🍃 🔍 🛒 💡 ⚠️
- Грибная метафора: корзинка (список покупок), грибница (сообщество), положила/убрала (CRUD)
- `MSG_COMMANDS` в конце большинства ответов (кроме unverified и callback popups)
- Без технических терминов, без канцелярита
