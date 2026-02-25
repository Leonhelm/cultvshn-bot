import { env } from "../../shared/config/index.js";
import { getUpdates, sendMessage } from "../../shared/api/index.js";
import { logInfo, logError, maskToken } from "../../shared/lib/index.js";
import { getOffset, setOffsetBatch, createBatch } from "../../shared/db/index.js";
import {
  saveIncomingMessageBatch,
  getUnprocessedMessages,
  deleteProcessedMessage,
  saveIncomingCallbackBatch,
  getUnprocessedCallbacks,
  deleteProcessedCallback,
  setLastBotMessage,
} from "../../entities/message/index.js";
import { getChat } from "../../entities/chat/index.js";
import { greet } from "../../features/greeting/index.js";
import { deletePreviousBotMessage, deleteUserMessage } from "../../features/chat-cleanup/index.js";
import { handleUnverifiedUser, handleVerificationCallback } from "../../features/verification/index.js";

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
      await deleteUserMessage(msg.chatId, msg.messageId);

      const chat = await getChat(msg.chatId);
      const role = chat ? chat.role : "unverified";

      if (role === "unverified") {
        await deletePreviousBotMessage(msg.chatId);
        await handleUnverifiedUser(msg);
      } else {
        await deletePreviousBotMessage(msg.chatId);
        await greet(msg);
      }

      await deleteProcessedMessage(msg.updateId);
    } catch (error) {
      logError(`Error processing message ${msg.updateId}`, error);
    }
  }
}

async function processCallbacks() {
  const callbacks = await getUnprocessedCallbacks();

  for (const cb of callbacks) {
    if (!running) break;

    try {
      const result = await handleVerificationCallback(cb);

      if (result && result.action === "verify") {
        await deletePreviousBotMessage(result.targetChatId);
        const chat = await getChat(result.targetChatId);
        if (chat) {
          await greet({
            chatId: result.targetChatId,
            from: {
              id: result.targetChatId,
              first_name: chat.firstName,
              last_name: chat.lastName,
              username: chat.username,
            },
          });
        }
      }

      if (result && result.action === "reject") {
        await deletePreviousBotMessage(result.targetChatId);
        const sent = await sendMessage(result.targetChatId, "К сожалению, ваш запрос был отклонён");
        await setLastBotMessage(result.targetChatId, sent.message_id);
      }

      await deleteProcessedCallback(cb.updateId);
    } catch (error) {
      logError(`Error processing callback ${cb.updateId}`, error);
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
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);
await pollLoop();
