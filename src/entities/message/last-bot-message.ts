const lastBotMessages = new Map<number, number>();

export function setLastBotMessage(chatId: number, messageId: number): void {
  lastBotMessages.set(chatId, messageId);
}

export function getLastBotMessage(chatId: number): number | undefined {
  return lastBotMessages.get(chatId);
}

export function clearLastBotMessage(chatId: number): void {
  lastBotMessages.delete(chatId);
}
