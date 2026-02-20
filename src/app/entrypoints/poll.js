import { env } from "../../shared/config/index.js";
import { getUpdates } from "../../shared/api/index.js";
import { logInfo, logError, maskToken } from "../../shared/lib/index.js";
import { getOffset, setOffsetBatch, createBatch } from "../../shared/db/index.js";
import {
  saveIncomingMessageBatch,
  getUnprocessedMessages,
  deleteProcessedMessage,
} from "../../entities/message/index.js";
import { greet } from "../../features/greeting/index.js";
import { deletePreviousBotMessage, deleteUserMessage } from "../../features/chat-cleanup/index.js";

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
      await deletePreviousBotMessage(msg.chatId);
      await greet(msg);
      await deleteUserMessage(msg.chatId, msg.messageId);
      await deleteProcessedMessage(msg.updateId);
    } catch (error) {
      logError(`Error processing message ${msg.updateId}`, error);
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
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);
await pollLoop();
