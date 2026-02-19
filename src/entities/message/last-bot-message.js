const lastBotMessages = new Map();

export function setLastBotMessage(chatId, messageId) {
  lastBotMessages.set(chatId, messageId);
}

export function getLastBotMessage(chatId) {
  return lastBotMessages.get(chatId);
}

export function clearLastBotMessage(chatId) {
  lastBotMessages.delete(chatId);
}
