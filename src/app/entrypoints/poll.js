import { env } from "../../shared/config/index.js";
import { getUpdates } from "../../shared/api/index.js";
import { logInfo, logError, maskToken } from "../../shared/lib/index.js";
import { greet } from "../../features/greeting/index.js";
import { deletePreviousBotMessage, deleteUserMessage } from "../../features/chat-cleanup/index.js";

async function handleUpdate(update) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;

  await deletePreviousBotMessage(chatId);
  await greet(message);
  await deleteUserMessage(message);
}

async function pollLoop() {
  let offset;

  while (true) {
    try {
      const updates = await getUpdates(offset);

      for (const update of updates) {
        try {
          await handleUpdate(update);
        } catch (error) {
          logError(`Error handling update ${update.update_id}`, error);
        }
        offset = update.update_id + 1;
      }
    } catch (error) {
      logError("Error fetching updates", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);
pollLoop();
