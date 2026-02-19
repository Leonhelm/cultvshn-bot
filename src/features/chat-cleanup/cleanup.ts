import { deleteMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import type { TgMessage } from "../../shared/types/index.js";
import { getLastBotMessage, clearLastBotMessage } from "../../entities/message/index.js";

export async function deletePreviousBotMessage(chatId: number): Promise<void> {
  const lastMessageId = getLastBotMessage(chatId);
  if (lastMessageId != null) {
    logInfo(`Deleting previous bot message ${lastMessageId} in chat ${chatId}`);
    await deleteMessage(chatId, lastMessageId);
    clearLastBotMessage(chatId);
  }
}

export async function deleteUserMessage(message: TgMessage): Promise<void> {
  logInfo(`Deleting user message ${message.message_id} in chat ${message.chat.id}`);
  await deleteMessage(message.chat.id, message.message_id);
}
