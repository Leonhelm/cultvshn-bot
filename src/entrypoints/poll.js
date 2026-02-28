import { env } from "../shared/config/env.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger.js";
import {
  getUpdates,
  sendMessage,
  deleteMessage,
  answerCallbackQuery,
  editMessageText,
} from "../shared/lib/telegram.js";
import { getChat, upsertUnverifiedChat, saveLink, listLinks, getLink, deleteLink, terminateFirestore } from "../shared/lib/firestore.js";
import { MSG_COMMANDS, MSG_UNVERIFIED, MSG_LINK_SAVED, MSG_LINK_NOT_FOUND, MSG_INFO, msgList } from "../shared/lib/messages.js";
import { extractMarketplaceLink } from "../shared/marketplace/extract.js";

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const lastMessages = new Map();

async function trackAndDeletePrevious(chatId, messageId, kind) {
  const entry = lastMessages.get(chatId) ?? {};
  const key = kind === "bot" ? "botMsgId" : "userMsgId";

  const prevId = entry[key];
  if (prevId) {
    await deleteMessage(chatId, prevId);
  }

  entry[key] = messageId;
  lastMessages.set(chatId, entry);
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  if (!from) return;

  await trackAndDeletePrevious(chatId, msg.message_id, "user");

  const chatDoc = await getChat(String(chatId));
  const role = chatDoc?.role;

  if (role === "verified" || role === "admin") {
    const marketplaceUrl = extractMarketplaceLink(msg.text, msg.entities);

    let text;
    let extra;

    if (marketplaceUrl) {
      await saveLink(String(chatId), msg.message_id, marketplaceUrl);
      text = MSG_LINK_SAVED;
    } else if (msg.text === "/list") {
      const links = await listLinks();
      const result = msgList(links);
      text = result.text;
      if (result.reply_markup) extra = { reply_markup: result.reply_markup };
    } else if (msg.text === "/info") {
      text = MSG_INFO;
    } else {
      text = MSG_COMMANDS;
    }

    const sent = await sendMessage(chatId, text, extra);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
  } else {
    await upsertUnverifiedChat(String(chatId), {
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
    });

    const sent = await sendMessage(chatId, MSG_UNVERIFIED);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
  }
}

async function handleCallbackQuery(cb) {
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (!chatId || !messageId || !cb.data) {
    await answerCallbackQuery(cb.id);
    return;
  }

  const [action, ...rest] = cb.data.split(":");
  const docId = rest.join(":");

  if (action === "view") {
    const link = await getLink(docId);
    const text = link ? `${link.url}\n\n${MSG_COMMANDS}` : MSG_LINK_NOT_FOUND;
    const sent = await sendMessage(chatId, text);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
    await answerCallbackQuery(cb.id);
  } else if (action === "del") {
    const link = await getLink(docId);
    if (link) {
      await deleteLink(docId);
      const links = await listLinks();
      const result = msgList(links);
      await editMessageText(chatId, messageId, result.text, {
        reply_markup: result.reply_markup || { inline_keyboard: [] },
      });
      await answerCallbackQuery(cb.id, "Удалено!");
    } else {
      await answerCallbackQuery(cb.id, "Ссылка не найдена.");
    }
  } else {
    await answerCallbackQuery(cb.id);
  }
}

let offset = 0;

async function pollLoop() {
  while (running) {
    try {
      const updates = await getUpdates(offset);

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.message) {
          try {
            await handleMessage(update.message);
          } catch (err) {
            logError(`Error handling message ${update.update_id}`, err);
          }
        } else if (update.callback_query) {
          try {
            await handleCallbackQuery(update.callback_query);
          } catch (err) {
            logError(`Error handling callback ${update.update_id}`, err);
          }
        }
      }
    } catch (error) {
      logError("Error fetching updates", error);
      if (running) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);

await pollLoop();

await terminateFirestore();
logInfo("Cleanup complete, exiting");
process.exit(0);
