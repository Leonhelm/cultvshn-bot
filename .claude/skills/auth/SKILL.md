---
description: "Верификация чатов: роли, inline-кнопки, callback_query, /pending"
disable-model-invocation: false
user-invocable: true
---

# Auth — верификация чатов

## Флоу

```
Новый пользователь → upsertUnverifiedChat → notifyAdmins (inline-кнопки)
Админ нажимает "Впустить" → updateChatRole("verified") → уведомление юзеру
Админ нажимает "Не впускать" → updateChatRole("rejected") → уведомление юзеру
```

## Роли

| Роль | Поведение |
|------|-----------|
| `unverified` | Ждёт проверки, видит MSG_UNVERIFIED |
| `verified` | Полный доступ к командам |
| `admin` | Полный доступ + /pending + inline-кнопки верификации |
| `rejected` | Видит MSG_REJECTED_REPLY, заявка не создаётся повторно |

## Env

`ADMIN_CHAT_IDS` — опциональная, через запятую. Если пуста — уведомления не отправляются.

## Callback data

Формат: `verify:<chatId>` / `reject:<chatId>`. Лимит Telegram 64 байта — ок.

## Firestore

```ts
updateChatRole(chatId: string, role: ChatDoc["role"]): Promise<void>
getUnverifiedChats(): Promise<ChatDocWithId[]>
```

## Команда /pending (только admin)

Выводит список `role === "unverified"` из Firestore.

## Сообщения (messages.js)

| Константа | Тип | Назначение |
|-----------|-----|-----------|
| `MSG_ADMIN_COMMANDS` | string | Команды для админов (с /pending) |
| `MSG_REJECTED_REPLY` | string | Ответ отклонённому юзеру |
| `MSG_VERIFY_REQUEST` | fn(name, username?, chatId) | Уведомление админам |
| `BTN_VERIFY` | string | Кнопка "Впустить" |
| `BTN_REJECT` | string | Кнопка "Не впускать" |
| `MSG_VERIFIED` | string | Юзеру после верификации |
| `MSG_REJECTED` | string | Юзеру после отклонения |
| `MSG_VERIFY_DONE` | fn(name, action) | Обновление сообщения админу |
| `MSG_PENDING_EMPTY` | string | Нет ожидающих |
| `MSG_PENDING_ENTRY` | fn(name, username?, chatId) | Строка в списке /pending |

## Защита от race condition

Двойной клик: второй админ видит "Уже обработано~", сообщение обновляется.

## poll.js — таблица маршрутов (обновлённая)

| Условие | Действие |
|---------|----------|
| admin + `/pending` | Список unverified |
| verified/admin + `/info` | MSG_INFO |
| admin + прочее | MSG_ADMIN_COMMANDS |
| verified + прочее | MSG_COMMANDS |
| rejected | MSG_REJECTED_REPLY |
| unverified (новый) | upsert + notifyAdmins + MSG_UNVERIFIED |
| unverified (повторный) | MSG_UNVERIFIED |
| callback_query verify/reject | updateChatRole + уведомления |
