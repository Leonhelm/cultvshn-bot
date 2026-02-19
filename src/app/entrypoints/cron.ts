import { env } from "../../shared/config/index.js";
import { getUpdates } from "../../shared/api/index.js";
import { logInfo, logError, maskToken } from "../../shared/lib/index.js";
import { greet } from "../../features/greeting/index.js";
import { deletePreviousBotMessage, deleteUserMessage } from "../../features/chat-cleanup/index.js";
import type { TgUpdate } from "../../shared/types/index.js";

async function handleUpdate(update: TgUpdate): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;

  await deletePreviousBotMessage(chatId);
  await greet(message);
  await deleteUserMessage(message);
}

async function processPendingUpdates(): Promise<void> {
  try {
    const updates = await getUpdates();

    logInfo(`Received ${updates.length} pending updates`);

    for (const update of updates) {
      try {
        await handleUpdate(update);
      } catch (error) {
        logError(`Error handling update ${update.update_id}`, error);
      }
    }
  } catch (error) {
    logError("Error fetching updates", error);
    throw error;
  }
}

logInfo(`Bot started (cron mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);
await processPendingUpdates();
logInfo("Cron job finished");
