export const MSG_COMMANDS = "Мои команды~ 🌿\n/list — твоя корзинка\n/info — обо мне";
export const MSG_LIST_HEADER = "🍄 Твоя корзинка";
export const MSG_LIST_EMPTY = `Корзинка пустая~ 🧺\nОтправь мне ссылочку!\n\n${MSG_COMMANDS}`;
export const MSG_LINK_SAVED = `Положила в корзинку~ 🍄✨\n\n${MSG_COMMANDS}`;
export const MSG_LINK_DELETED = `Убрала из корзинки~ 🍂\n\n${MSG_COMMANDS}`;
export const MSG_LINK_NOT_FOUND = `Не нашла эту ссылочку в корзинке… 🔍\n\n${MSG_COMMANDS}`;
export const MSG_UNVERIFIED = "Подожди немножко~ 🍄 Тебя скоро добавят в грибницу!";
export const MSG_LINK_LIMIT = "Ой, корзинка полная~ 🧺 Уже 10 товаров! Убери лишние через /list";
export const MSG_INFO = `Привет~ Я Мико-Мико, твоя грибная помощница! 🍄🌸\n\nОтправь мне ссылочку на товар с маркетплейса, и я положу его в корзинку~\n\nСейчас я умею работать с Ozon 🛒\n\n💡 Удобнее всего добавлять товар через кнопку «Поделиться» в приложении маркетплейса → Telegram → cultvshn\n\n⚠️ Я немножко забывчивая, поэтому лучше включи автоудаление сообщений в этом чате (оптимально 1 день) — так будет чище и уютнее~ 🍃\n\n${MSG_COMMANDS}`;
export const MSG_CB_DELETED = "Убрала~ 🍂";
export const MSG_CB_NOT_FOUND = "Не нашла… 🍄";

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
