export const MSG_COMMANDS = "Доступные команды:\n/list · /info";
export const MSG_LIST_HEADER = "📦 Сохранённые товары";
export const MSG_LIST_EMPTY = `Список пуст.\n\n${MSG_COMMANDS}`;
export const MSG_LINK_SAVED = `Ссылка сохранена!\n\n${MSG_COMMANDS}`;
export const MSG_LINK_DELETED = `Ссылка удалена!\n\n${MSG_COMMANDS}`;
export const MSG_LINK_NOT_FOUND = `Ссылка не найдена.\n\n${MSG_COMMANDS}`;
export const MSG_UNVERIFIED = "Тебя скоро добавят, подожди немного.";
export const MSG_INFO = `Привет! Я бот для отслеживания товаров с маркетплейсов.\n\nОтправь мне ссылку на товар с Ozon или Wildberries, и я сохраню его.\n\n${MSG_COMMANDS}`;

const MAX_NAME_LENGTH = 40;

/** @param {string} [name] */
function displayName(name) {
  if (!name) return "Неизвестный товар";
  return name.length > MAX_NAME_LENGTH
    ? name.slice(0, MAX_NAME_LENGTH - 1) + "…"
    : name;
}

/** @param {Array<{id: string, name?: string}>} links */
export function msgList(links) {
  if (links.length === 0) return { text: MSG_LIST_EMPTY };

  const text = `${MSG_LIST_HEADER} (${links.length})\n\n${MSG_COMMANDS}`;

  const inline_keyboard = links.map((l) => [
    { text: displayName(l.name), callback_data: `view:${l.id}` },
    { text: "🗑", callback_data: `del:${l.id}` },
  ]);

  return { text, reply_markup: { inline_keyboard } };
}
