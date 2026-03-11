export const MSG_COMMANDS =
  "Мои команды~ 🌿\n/info — обо мне";
export const MSG_ADMIN_COMMANDS =
  "Мои команды~ 🌿\n/info — обо мне\n/pending — грибочки на проверке";
export const MSG_UNVERIFIED =
  "Подожди немножко~ 🍄 Тебя скоро добавят в грибницу!";
export const MSG_REJECTED_REPLY =
  "Тебя не добавили в грибницу~ 🍂";
export const MSG_INFO = `Привет~ Я Мико-Мико, твоя грибная помощница! 🍄🌸

${MSG_COMMANDS}`;

export const MSG_VERIFY_REQUEST = (name, username, chatId) =>
  `Новый грибочек стучится в грибницу~ 🍄\n\n` +
  `Имя: ${name}\n` +
  (username ? `Юзернейм: @${username}\n` : "") +
  `ID: ${chatId}`;

export const BTN_VERIFY = "Впустить в грибницу 🌿";
export const BTN_REJECT = "Не впускать 🍂";

export const MSG_VERIFIED =
  "Добро пожаловать в грибницу~ 🍄🌸 Теперь ты с нами!";
export const MSG_REJECTED =
  "К сожалению, тебя не добавили в грибницу~ 🍂";

export const MSG_VERIFY_DONE = (name, action) =>
  action === "verified"
    ? `✅ ${name} — добавлен(а) в грибницу~`
    : `🍂 ${name} — не добавлен(а) в грибницу~`;

export const MSG_PENDING_EMPTY =
  "Все грибочки проверены~ 🌿 Никто не ждёт!";
export const MSG_PENDING_ENTRY = (name, username, chatId) =>
  `• ${name}${username ? ` (@${username})` : ""} [${chatId}]`;
