import { deleteMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import {
  getLastBotMessage,
  clearLastBotMessage,
  getOrderListMessagesByChat,
  deleteOrderListMessagesByChat,
} from "../../entities/message/index.js";

export async function deletePreviousBotMessage(chatId) {
  const lastMessageId = await getLastBotMessage(chatId);
  if (lastMessageId != null) {
    logInfo(`Deleting previous bot message ${lastMessageId} in chat ${chatId}`);
    await deleteMessage(chatId, lastMessageId);
    await clearLastBotMessage(chatId);
  }
}

export async function deleteUserMessage(chatId, messageId) {
  logInfo(`Deleting user message ${messageId} in chat ${chatId}`);
  await deleteMessage(chatId, messageId);
}

export async function deleteOrderListMessages(chatId) {
  const messages = await getOrderListMessagesByChat(chatId);
  if (messages.length === 0) return;

  logInfo(`Deleting ${messages.length} order list messages in chat ${chatId}`);
  for (const msg of messages) {
    await deleteMessage(chatId, msg.messageId);
  }
  await deleteOrderListMessagesByChat(chatId);
}
