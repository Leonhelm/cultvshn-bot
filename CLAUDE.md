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
│   ├── order/                    # Меню быстрых действий + управление заказами
│   │   ├── order.js + order.d.ts
│   │   ├── index.js + index.d.ts
│   ├── message-expiry/            # Автоудаление сообщений по TTL (1 час)
│   │   ├── expiry.js + expiry.d.ts
│   │   ├── index.js + index.d.ts
│   └── verification/             # Верификация пользователей
│       ├── verify.js + verify.d.ts
│       ├── index.js + index.d.ts
│
├── entities/                     # Доменные сущности
│   ├── chat/                     # Чат (данные пользователя + роль + состояние)
│   │   ├── chat-repository.js + chat-repository.d.ts
│   │   ├── index.js + index.d.ts
│   ├── order/                    # Заказы (ссылки пользователей)
│   │   ├── order-repository.js + order-repository.d.ts
│   │   ├── index.js + index.d.ts
│   ├── user/                     # Пользователь (форматирование имени + информации)
│   │   ├── format-user-name.js + format-user-name.d.ts
│   │   ├── index.js + index.d.ts
│   └── message/                  # Сообщения (очереди + отслеживание)
│       ├── incoming-message.js + incoming-message.d.ts
│       ├── incoming-callback.js + incoming-callback.d.ts
│       ├── tracked-message.js + tracked-message.d.ts
│       ├── confirmation-message.js + confirmation-message.d.ts
│       ├── order-list-message.js + order-list-message.d.ts
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
| `state` | string \| null | Состояние диалога (`"awaiting-order-link"` или `null`) |
| `createdAt` | Date | Дата создания записи |
| `updatedAt` | Date | Дата последнего обновления |

**Коллекция `orders/{autoId}`** — заказы (ссылки) пользователей:

| Поле | Тип | Описание |
|------|-----|----------|
| `chatId` | number | Chat ID владельца |
| `url` | string | Ссылка на заказ (ozon.ru или wildberries.ru) |
| `createdAt` | Date | Время создания |

**Коллекция `messages/{updateId}`** — очередь необработанных сообщений пользователей:

| Поле | Тип | Описание |
|------|-----|----------|
| `chatId` | number | ID чата |
| `messageId` | number | ID сообщения в Telegram |
| `from` | `{ id, first_name, last_name?, username? }` | Отправитель (формат TgUser) |
| `text` | string \| null | Текст сообщения |
| `date` | number | Unix timestamp |
| `createdAt` | Date | Время записи |

**Коллекция `trackedMessages/{autoId}`** — единый учёт всех сообщений для TTL (1 час):

| Поле | Тип | Описание |
|------|-----|----------|
| `chatId` | number | ID чата |
| `messageId` | number | ID сообщения в Telegram |
| `createdAt` | Date | Время создания записи |

**Коллекция `callbackQueries/{updateId}`** — очередь необработанных callback-запросов:

| Поле | Тип | Описание |
|------|-----|----------|
| `callbackQueryId` | string | Telegram callback_query.id |
| `fromChatId` | number | Chat ID отправителя (админа) |
| `from` | `{ id, first_name, last_name?, username? }` | Отправитель |
| `messageId` | number \| null | ID сообщения с кнопкой |
| `data` | string \| null | callback_data (см. таблицу callback routing) |
| `createdAt` | Date | Время записи |

**Коллекция `confirmationMessages/{autoId}`** — отслеживание сообщений подтверждения:

| Поле | Тип | Описание |
|------|-----|----------|
| `adminChatId` | number | Chat ID администратора |
| `messageId` | number | ID сообщения в Telegram (для удаления) |
| `targetChatId` | number | Chat ID неверифицированного пользователя |
| `createdAt` | Date | Время отправки |

**Коллекция `orderListMessages/{autoId}`** — отслеживание сообщений списка заказов:

| Поле | Тип | Описание |
|------|-----|----------|
| `chatId` | number | Chat ID пользователя |
| `messageId` | number | ID сообщения в Telegram |
| `orderId` | string | ID документа заказа |
| `createdAt` | Date | Время отправки |

**Документ `botState/offset`** — offset для getUpdates:

| Поле | Тип | Описание |
|------|-----|----------|
| `value` | number | Текущий offset |

### Четырёхфазная обработка (poll.js)

```
Фаза 1 — Fetch & Store:
  getUpdates(offset) → сохранить messages и callback_queries в Firestore (batch write)
  → сохранить пользовательские сообщения в trackedMessages (batch write) → сохранить offset

Фаза 2 — Process Messages:
  Прочитать необработанные сообщения из Firestore
  Для каждого: определить роль → маршрутизация:
    unverified → handleUnverifiedUser
    verified/admin (state = awaiting-order-link) → handleOrderLink
    verified/admin (без state) → showQuickMenu

Фаза 3 — Process Callbacks:
  Прочитать необработанные callback-запросы из Firestore
  Определить тип callback (verification / order) → маршрутизация:
    verification:
      verify → showQuickMenu
      reject → sendMessage("отклонён")
    order:
      add-order → promptForOrderLink
      list-orders → handleListOrders
      delete-order:{id} → handleDeleteOrder
      cancel → showQuickMenu

Фаза 4 — Process Expiry:
  Найти сообщения в trackedMessages с createdAt > 1 час назад
  Для каждого: удалить из Telegram → очистить связанные записи (confirmationMessages, orderListMessages)
  Удалить истёкшие записи из trackedMessages
  Для затронутых чатов без оставшихся сообщений:
    verified/admin → отправить меню быстрых действий
    unverified → ничего не делать
```

Такое разделение гарантирует, что при падении процесса данные не теряются — необработанные сообщения и callback-запросы остаются в Firestore.

## Точки входа

### 1. Long polling (`app/entrypoints/poll.js`)

- Запускается на Keenetic OS 5 напрямую: `node src/app/entrypoints/poll.js`
- **Фаза 1:** опрашивает Telegram API (`getUpdates`), сохраняет сообщения и callback-запросы в Firestore, отслеживает пользовательские сообщения в `trackedMessages`
- **Фаза 2:** читает необработанные сообщения, маршрутизирует по ролям и состоянию (unverified → верификация, verified/admin → меню быстрых действий или обработка ссылки заказа)
- **Фаза 3:** читает необработанные callback-запросы, маршрутизирует по типу (verification / order)
- **Фаза 4:** находит сообщения старше 1 часа в `trackedMessages`, удаляет из Telegram, очищает связанные записи; для пустых чатов verified/admin — отправляет меню
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

Без сборки — файлы запускаются as-is после `npm ci`.

### Deploy-скрипт (`scripts/deploy.sh`)

POSIX sh скрипт для автоматического деплоя и обновления на Keenetic OS 5 (git не установлен).

**Что делает:**

1. Скачивает zip-архив main-ветки с GitHub
2. Распаковывает в `cultvshn-bot-main/`
3. Создаёт symlink `.env` из базовой директории в проект
4. Запускает `npm ci` и `poll-daemon`
5. Каждые 60 минут проверяет наличие новой версии через GitHub API (`Accept: application/vnd.github.sha`)
6. При обнаружении новой версии — останавливает демона, обновляет, перезапускает

**Безопасность обновлений:**

- Перед скачиванием старая директория переименовывается в `.old` (rename-then-delete)
- При ошибке (download/extract/npm ci) — восстанавливается из `.old`
- SHA коммита сохраняется только после полного успеха деплоя
- При недоступности GitHub API — проверка пропускается, бот продолжает работать

**Layout на устройстве:**

```
/tmp/mnt/181ADB641ADB3E06/projects/cultvshn/    (BASE_DIR)
├── .env                    # Секреты (создаётся вручную один раз)
├── .current-sha            # SHA текущего деплоя
├── deploy.pid              # PID deploy-скрипта
├── deploy.sh               # Скопирован из repo (chmod +x)
└── cultvshn-bot-main/      # Распакованный проект
    ├── .env                # Symlink → ../../.env
    ├── poll-daemon.pid
    ├── node_modules/
    ├── package.json
    └── src/
```

### Первоначальная установка (одноразово)

```bash
# 1. Создать базовую директорию
mkdir -p /tmp/mnt/181ADB641ADB3E06/projects/cultvshn

# 2. Создать .env с секретами
cat > /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/.env << 'EOF'
TG_BOT_API_TOKEN=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
EOF

# 3. Скачать deploy.sh
curl -sL -o /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/deploy.sh \
  "https://raw.githubusercontent.com/Leonhelm/cultvshn-bot/main/scripts/deploy.sh"
chmod +x /tmp/mnt/181ADB641ADB3E06/projects/cultvshn/deploy.sh

# 4. Установить init.d скрипт
curl -sL -o /opt/etc/init.d/S99cultvshn-bot \
  "https://raw.githubusercontent.com/Leonhelm/cultvshn-bot/main/scripts/init.d/S99cultvshn-bot"
chmod +x /opt/etc/init.d/S99cultvshn-bot

# 5. Запустить
/opt/etc/init.d/S99cultvshn-bot start
```

### Управление

```bash
/opt/etc/init.d/S99cultvshn-bot start    # Запуск deploy + daemon
/opt/etc/init.d/S99cultvshn-bot stop     # Остановка deploy + daemon
/opt/etc/init.d/S99cultvshn-bot restart  # Перезапуск
/opt/etc/init.d/S99cultvshn-bot status   # Проверка статуса (deploy + bot)
```

### Логи

```bash
tail -f /opt/var/log/cultvshn-bot.log    # Логи бота и deploy-скрипта
```

## Ролевая модель

| Роль | Описание | Поведение при сообщении |
|------|----------|------------------------|
| `unverified` | Неверифицированный пользователь (по умолчанию) | Получает «ожидайте подтверждения», админам рассылается запрос на верификацию |
| `verified` | Верифицированный пользователь | Получает меню быстрых действий (`features/order`) |
| `admin` | Администратор | Получает меню быстрых действий + может подтверждать/отклонять пользователей |

Первый администратор создаётся вручную в Firestore (установка `role: "admin"` для нужного chatId).

## Типы сообщений бота

Все сообщения (пользователя и бота) отслеживаются в `trackedMessages` и автоматически удаляются через 1 час. Никаких немедленных удалений — ни перед отправкой нового сообщения, ни при получении пользовательского.

| Тип | Описание | Жизненный цикл | Хранение в Firestore |
|-----|----------|-----------------|---------------------|
| **Пользовательские** | Входящие сообщения от пользователя | Живёт 1 час, затем авто-удаляется | `trackedMessages/{autoId}` |
| **Общения** | Основные ответы бота пользователю (меню, промпты, ошибки) | Живёт 1 час, затем авто-удаляется | `trackedMessages/{autoId}` |
| **Подтверждения** | Запросы на верификацию для админов (с inline-кнопками) | Живёт 1 час, затем авто-удаляется; Firestore-записи удаляются при verify/reject (guard) | `trackedMessages/{autoId}` + `confirmationMessages/{autoId}` |
| **Списка заказов** | Сообщения с заказами пользователя (с кнопкой «Удалить») | Живёт 1 час, затем авто-удаляется | `trackedMessages/{autoId}` + `orderListMessages/{autoId}` |
| **Информационные** | Уведомления о результатах (добавлен/не добавлен) | Живёт 1 час, затем авто-удаляется | `trackedMessages/{autoId}` |

Когда у верифицированного пользователя (или админа) не остаётся ни одного сообщения — бот автоматически отправляет меню быстрых действий. Для неверифицированных — ничего не происходит.

## Верификация пользователей (`features/verification`)

### Поток верификации

1. **Неверифицированный пользователь пишет** → получает сообщение общения «Ожидайте подтверждения администратором» → всем админам рассылается сообщение подтверждения с inline-клавиатурой: «Добавить пользователя {имя} {фамилия} {ссылка на профиль}?» + кнопки «Добавить» / «Отклонить»
2. **Админ нажимает «Добавить»** → пользователь становится `verified` → получает меню быстрых действий → Firestore-записи подтверждений удаляются (guard от повторных нажатий), Telegram-сообщения остаются до истечения TTL → другим админам приходит информационное сообщение «Пользователь ... добавлен»
3. **Админ нажимает «Отклонить»** → пользователь остаётся `unverified` → получает сообщение об отклонении → Firestore-записи подтверждений удаляются (guard), Telegram-сообщения остаются до истечения TTL → другим админам приходит информационное сообщение «Пользователь ... не был добавлен»

### Повторные сообщения от неверифицированного

При каждом сообщении неверифицированного пользователя: Firestore-записи старых подтверждений удаляются, рассылаются новые. Старые Telegram-сообщения подтверждений остаются у админов до истечения TTL (1 час).

### FSD-совместимость

`features/verification` импортирует только из `entities` и `shared`. Оркестрация между `features/verification`, `features/order` и `features/message-expiry` происходит в `app`-слое (`poll.js`).

## Меню быстрых действий (`features/order`)

Верифицированным пользователям и администраторам при любом сообщении показывается меню с inline-кнопками:
- **Добавить заказ** — добавление ссылки на заказ
- **Список заказов** — просмотр сохранённых заказов

### Добавление заказа

1. Пользователь нажимает «Добавить заказ» → бот отправляет промпт «Отправьте ссылку на заказ» + кнопка «Отмена»
2. Пользователь отправляет ссылку → валидация домена (`ozon.ru` / `wildberries.ru`, включая поддомены)
3. **Домен совпадает** → ссылка сохраняется в `orders/{autoId}`, показывается меню с текстом «Заказ сохранён»
4. **Домен не совпадает / не URL** → сообщение об ошибке, можно повторить или отменить
5. **Отмена** → возврат к меню

Состояние `"awaiting-order-link"` хранится в поле `state` документа `chats/{chatId}`.

### Список заказов

1. Пользователь нажимает «Список заказов» → бот отправляет по одному сообщению на каждый заказ (URL + кнопка «Удалить»), в конце — меню
2. **Нет заказов** → меню с текстом «У вас нет сохранённых заказов»
3. **Удалить** → заказ удаляется из Firestore, запись в `orderListMessages` удаляется; Telegram-сообщение остаётся до истечения TTL (1 час)
4. Сообщения списка отслеживаются в `orderListMessages` и `trackedMessages`, удаляются автоматически через 1 час

### Callback data routing

| Паттерн | Тип | Описание |
|---------|-----|----------|
| `verify:{chatId}` / `reject:{chatId}` | verification | Верификация пользователей |
| `add-order` | order | Начало добавления заказа |
| `list-orders` | order | Показ списка заказов |
| `delete-order:{orderId}` | order | Удаление заказа |
| `cancel` | order | Отмена текущего действия |

### FSD-совместимость

`features/order` импортирует из `entities/order`, `entities/message`, `entities/chat` и `shared`. Не импортирует из других features — оркестрация через `poll.js`.

## Поведение чата

Все сообщения (пользователя и бота) живут ровно **1 час**, затем автоматически удаляются из чата (Фаза 4 — `processExpiry`). Немедленных удалений нет — ни перед отправкой нового сообщения, ни при получении пользовательского.

Если после истечения TTL у верифицированного пользователя (или админа) не остаётся ни одного отслеживаемого сообщения — бот автоматически отправляет меню быстрых действий. Для неверифицированных — ничего не происходит.

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
