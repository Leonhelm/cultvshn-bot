import { deleteMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import { getLastBotMessage, clearLastBotMessage } from "../../entities/message/index.js";

export async function deletePreviousBotMessage(chatId) {
  const lastMessageId = getLastBotMessage(chatId);
  if (lastMessageId != null) {
    logInfo(`Deleting previous bot message ${lastMessageId} in chat ${chatId}`);
    await deleteMessage(chatId, lastMessageId);
    clearLastBotMessage(chatId);
  }
}

export async function deleteUserMessage(message) {
  logInfo(`Deleting user message ${message.message_id} in chat ${message.chat.id}`);
  await deleteMessage(message.chat.id, message.message_id);
}
