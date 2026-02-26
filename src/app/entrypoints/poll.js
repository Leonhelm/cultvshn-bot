import { env } from "../../shared/config/index.js";
import { getUpdates, sendMessage } from "../../shared/api/index.js";
import { logInfo, logError, maskToken } from "../../shared/lib/index.js";
import { getOffset, setOffsetBatch, createBatch } from "../../shared/db/index.js";
import {
  saveIncomingMessageBatch,
  saveTrackedMessageBatch,
  saveTrackedMessage,
  getUnprocessedMessages,
  deleteProcessedMessage,
  saveIncomingCallbackBatch,
  getUnprocessedCallbacks,
  deleteProcessedCallback,
} from "../../entities/message/index.js";
import { getChat } from "../../entities/chat/index.js";
import { processExpiredMessages, getChatsNeedingMenu } from "../../features/message-expiry/index.js";
import { handleUnverifiedUser, handleVerificationCallback } from "../../features/verification/index.js";
import {
  showQuickMenu,
  promptForOrderLink,
  handleOrderLink,
  handleListOrders,
  handleDeleteOrder,
  handleCancelOrder,
} from "../../features/order/index.js";

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function fetchAndStore() {
  let offset = await getOffset();
  const updates = await getUpdates(offset);

  if (updates.length === 0) return;

  logInfo(`Received ${updates.length} updates, storing to Firestore`);

  const batch = createBatch();

  for (const update of updates) {
    if (update.message) {
      saveIncomingMessageBatch(batch, update.update_id, update.message);
      saveTrackedMessageBatch(batch, update.message.chat.id, update.message.message_id);
    }
    if (update.callback_query) {
      saveIncomingCallbackBatch(batch, update.update_id, update.callback_query);
    }
    offset = update.update_id + 1;
  }

  setOffsetBatch(batch, offset);
  await batch.commit();
}

async function processMessages() {
  const messages = await getUnprocessedMessages();

  for (const msg of messages) {
    if (!running) break;

    try {
      const chat = await getChat(msg.chatId);
      const role = chat ? chat.role : "unverified";

      if (role === "unverified") {
        await handleUnverifiedUser(msg);
      } else {
        const state = chat ? chat.state : null;

        if (state === "awaiting-order-link") {
          await handleOrderLink(msg);
        } else {
          await showQuickMenu(msg.chatId);
        }
      }

      await deleteProcessedMessage(msg.updateId);
    } catch (error) {
      logError(`Error processing message ${msg.updateId}`, error);
    }
  }
}

function getCallbackType(data) {
  if (!data) return "unknown";
  if (data === "add-order") return "order";
  if (data === "list-orders") return "order";
  if (data.startsWith("delete-order:")) return "order";
  if (data === "cancel") return "order";
  if (/^(verify|reject):\d+$/.test(data)) return "verification";
  return "unknown";
}

async function processCallbacks() {
  const callbacks = await getUnprocessedCallbacks();

  for (const cb of callbacks) {
    if (!running) break;

    try {
      const callbackType = getCallbackType(cb.data);

      if (callbackType === "verification") {
        const result = await handleVerificationCallback(cb);

        if (result && result.action === "verify") {
          await showQuickMenu(result.targetChatId);
        }

        if (result && result.action === "reject") {
          const sent = await sendMessage(result.targetChatId, "К сожалению, ваш запрос был отклонён");
          await saveTrackedMessage(result.targetChatId, sent.message_id);
        }
      } else if (callbackType === "order") {
        const chat = await getChat(cb.fromChatId);
        const role = chat ? chat.role : "unverified";

        if (role !== "verified" && role !== "admin") {
          await deleteProcessedCallback(cb.updateId);
          continue;
        }

        if (cb.data === "add-order") {
          await promptForOrderLink(cb.callbackQueryId, cb.fromChatId);
        } else if (cb.data === "list-orders") {
          await handleListOrders(cb.callbackQueryId, cb.fromChatId);
        } else if (cb.data?.startsWith("delete-order:")) {
          await handleDeleteOrder(cb);
        } else if (cb.data === "cancel") {
          await handleCancelOrder(cb.callbackQueryId, cb.fromChatId);
        }
      }

      await deleteProcessedCallback(cb.updateId);
    } catch (error) {
      logError(`Error processing callback ${cb.updateId}`, error);
    }
  }
}

async function processExpiry() {
  const affectedChatIds = await processExpiredMessages();
  if (affectedChatIds.length === 0) return;

  const chatsNeedingMenu = await getChatsNeedingMenu(affectedChatIds);
  for (const chatId of chatsNeedingMenu) {
    if (!running) break;
    try {
      await showQuickMenu(chatId);
    } catch (error) {
      logError(`Error sending menu to empty chat ${chatId}`, error);
    }
  }
}

async function pollLoop() {
  while (running) {
    try {
      await fetchAndStore();
    } catch (error) {
      logError("Error fetching updates", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
      await processMessages();
    } catch (error) {
      logError("Error processing messages", error);
    }

    try {
      await processCallbacks();
    } catch (error) {
      logError("Error processing callbacks", error);
    }

    try {
      await processExpiry();
    } catch (error) {
      logError("Error processing message expiry", error);
    }
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);
await pollLoop();
