import { deleteMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import {
  getExpiredTrackedMessages,
  deleteTrackedMessages,
  getTrackedMessageCountByChat,
  getConfirmationByMessage,
  deleteConfirmationDoc,
  getOrderListMessageByMessage,
  deleteOrderListMessageDoc,
} from "../../entities/message/index.js";
import { getChat } from "../../entities/chat/index.js";

const MESSAGE_TTL_MS = 60 * 60 * 1000;

async function cleanupRelatedRecords(chatId, messageId) {
  const confirmation = await getConfirmationByMessage(chatId, messageId);
  if (confirmation) {
    await deleteConfirmationDoc(confirmation.docId);
  }

  const orderListMessage = await getOrderListMessageByMessage(chatId, messageId);
  if (orderListMessage) {
    await deleteOrderListMessageDoc(orderListMessage.docId);
  }
}

export async function processExpiredMessages() {
  const cutoff = new Date(Date.now() - MESSAGE_TTL_MS);
  const expired = await getExpiredTrackedMessages(cutoff);

  if (expired.length === 0) return [];

  logInfo(`Expiring ${expired.length} tracked messages`);

  for (const msg of expired) {
    await deleteMessage(msg.chatId, msg.messageId);
    await cleanupRelatedRecords(msg.chatId, msg.messageId);
  }

  await deleteTrackedMessages(expired.map((m) => m.docId));

  const uniqueChatIds = [...new Set(expired.map((m) => m.chatId))];
  return uniqueChatIds;
}

export async function getChatsNeedingMenu(chatIds) {
  const result = [];

  for (const chatId of chatIds) {
    const count = await getTrackedMessageCountByChat(chatId);
    if (count > 0) continue;

    const chat = await getChat(chatId);
    if (chat && (chat.role === "verified" || chat.role === "admin")) {
      result.push(chatId);
    }
  }

  return result;
}
