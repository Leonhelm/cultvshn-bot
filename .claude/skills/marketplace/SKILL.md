---
description: "Модуль маркетплейсов: парсинг, хранение и управление ссылками"
disable-model-invocation: false
user-invocable: true
---

# Marketplace — модуль работы с маркетплейсами

## Файлы модуля

```
src/shared/marketplace/
├── extract.js + extract.d.ts    # Парсинг ссылок из Telegram-сообщений; getMarketplaceType()
├── parser.js + parser.d.ts      # Получение названия и цены товара; parseMarketplace()
└── monitor.js                   # Фоновый мониторинг каждые 30 мин; startMarketplaceMonitor()
```

## Поддерживаемые маркетплейсы

`ozon.ru`, `wildberries.ru` — домены в `MARKETPLACE_HOSTS` в `extract.js`

## Стратегии парсинга

### Wildberries
- Извлекает product ID из URL: `/catalog/{id}/`
- Запрашивает публичный API: `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm={id}`
- Имя: `brand / name` из JSON. Цена: `salePriceU / 100` (копейки → рубли)

### Ozon
- Загружает HTML с браузерными заголовками (`User-Agent`, `Accept-Language: ru-RU`), следует редиректам (в т.ч. короткие ссылки `/t/…`)
- Стратегия 1: `<script type="application/ld+json">` — schema.org Product
- Стратегия 2: meta-теги `og:title` + `product:price:amount`
- Стратегия 3: `<script id="__NEXT_DATA__">` — Next.js page props

## Мониторинг цен

`startMarketplaceMonitor()` — запускается при старте бота, повтор каждые 30 минут:
- Для каждой ссылки вызывает `parseMarketplace(url)` → `{name, price} | null`
- Успех: `updateLinkData(id, {name, price, invalidAt: false})` → обновляет `name`, `price`, `checkedAt`, очищает `invalidAt`
- Неудача: `updateLinkData(id, {invalidAt: true})` → ставит `invalidAt` (timestamp) в Firestore

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

- Отправка ссылки ozon.ru/wildberries.ru → сохранение в `links/{chatId}_{messageId}`
- `/list` → список всех ссылок с командами `/mp_view_{id}` и `/mp_delete_{id}`
- `/mp_view_{id}` → показать URL ссылки
- `/mp_delete_{id}` → удалить ссылку из Firestore

## Как добавить новый маркетплейс

1. `extract.js` — добавить домен в `MARKETPLACE_HOSTS`
2. `extract.js` — обновить regex-фолбэк (строка с `match`) и добавить ветку в `getMarketplaceType()`
3. `parser.js` — добавить `parseNewMarketplace(url)` и ветку в `parseMarketplace()`

## Связанные файлы

- `parser.js` — `parseMarketplace()` → `{name, price} | null`
- `firestore.js` — `saveLink()`, `listLinks()`, `getLink()`, `deleteLink()`, `updateLinkData()`
- `messages.js` — `MSG_LINK_SAVED`, `MSG_LINK_DELETED`, `MSG_LINK_NOT_FOUND`, `msgList()`
- `poll.js` — оркестрация: extract → save / list / view / delete → respond
