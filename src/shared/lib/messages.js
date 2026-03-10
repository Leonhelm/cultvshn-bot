export const MSG_COMMANDS =
  "Мои команды~ 🌿\n/list — твоя корзинка\n/info — обо мне";
export const MSG_LIST_HEADER = "🍄 Твоя корзинка";
export const MSG_LIST_EMPTY = `Корзинка пустая~ 🧺\nНапиши + и что нужно купить!\n\n${MSG_COMMANDS}`;
export const MSG_ITEM_ADDED = `Положила в корзинку~ 🍄✨\n\n${MSG_COMMANDS}`;
export const MSG_ITEM_UPDATED = `Уже есть~ Обновила дату 🍄✨\n\n${MSG_COMMANDS}`;
export const MSG_ITEM_TOO_LONG =
  "Ой, слишком длинное название~ 🍄 До 50 символов, грибочек!";
export const MSG_ITEM_LIMIT =
  "Ой, корзинка полная~ 🧺 Уже 50 покупок! Убери лишние через /list";
export const MSG_ITEM_NOT_FOUND = `Не нашла в корзинке… 🔍\n\n${MSG_COMMANDS}`;
export const MSG_UNVERIFIED =
  "Подожди немножко~ 🍄 Тебя скоро добавят в грибницу!";
export const MSG_INFO = `Привет~ Я Мико-Мико, твоя грибная помощница! 🍄🌸

Я веду твою корзинку покупок~ 🧺

📝 Напиши + и название — я запомню!
Например: + молоко или + сливочное масло

🍄 Нажимай 🍄 напротив покупки каждый раз, когда покупаешь — я запомню дату~
Со временем я научусь предсказывать, когда тебе понадобится этот товар, и подниму его в списочке повыше~ ✨

🗑 Нажми 🗑 чтобы убрать из корзинки

⚠️ Лучше включи автоудаление сообщений в этом чате (оптимально 1 день) — так будет чище и уютнее~ 🍃

${MSG_COMMANDS}`;
export const MSG_CB_ADDED = "Обновила~ ✨";
export const MSG_CB_DELETED = "Убрала~ 🍂";
export const MSG_CB_NOT_FOUND = "Не нашла… 🍄";

const MAX_NAME_LENGTH = 40;

function displayName(name) {
  if (!name) return "???";
  return name.length > MAX_NAME_LENGTH
    ? name.slice(0, MAX_NAME_LENGTH - 1) + "…"
    : name;
}

function relativeDate(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const ms = timestamp.toMillis();
  const diffMs = now - ms;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin}м`;
  if (diffHrs < 24) return `${diffHrs}ч`;
  if (diffDays < 30) return `${diffDays}д`;
  return `${Math.floor(diffDays / 30)}мес`;
}

export function msgList(items) {
  if (items.length === 0) return { text: MSG_LIST_EMPTY };

  const now = Date.now();

  const sorted = items.slice().sort((a, b) => {
    const aTime = a.nextPredicted ? a.nextPredicted.toMillis() : Infinity;
    const bTime = b.nextPredicted ? b.nextPredicted.toMillis() : Infinity;

    if (aTime === Infinity && bTime === Infinity) {
      const aCreated = a.createdAt ? a.createdAt.toMillis() : 0;
      const bCreated = b.createdAt ? b.createdAt.toMillis() : 0;
      return aCreated - bCreated;
    }

    const aDiff = Math.abs(aTime - now);
    const bDiff = Math.abs(bTime - now);

    const aPast = aTime <= now;
    const bPast = bTime <= now;

    if (aPast && !bPast) return -1;
    if (!aPast && bPast) return 1;
    if (aPast && bPast) return aDiff - bDiff;
    return aTime - bTime;
  });

  const text = `${MSG_LIST_HEADER} (${sorted.length})\n\n${MSG_COMMANDS}`;

  const inline_keyboard = sorted.map((item) => {
    const lastAdded = item.addedDates?.[0];
    const rel = relativeDate(lastAdded);
    const label = rel
      ? `${displayName(item.name)} (${rel})`
      : displayName(item.name);

    return [
      { text: label, callback_data: `noop:${item.id}` },
      { text: "🍄", callback_data: `add:${item.id}` },
      { text: "🗑", callback_data: `del:${item.id}` },
    ];
  });

  return { text, reply_markup: { inline_keyboard } };
}
