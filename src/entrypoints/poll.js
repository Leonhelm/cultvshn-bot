import { env } from "../shared/config/env.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger.js";
import {
  getUpdates,
  sendMessage,
  deleteMessage,
  answerCallbackQuery,
  editMessageText,
} from "../shared/lib/telegram.js";
import {
  getChat,
  upsertUnverifiedChat,
  saveItem,
  countItemsByChat,
  listItemsByChat,
  getItem,
  deleteItem,
  addItemDate,
  terminateFirestore,
} from "../shared/lib/firestore.js";
import {
  MSG_COMMANDS,
  MSG_UNVERIFIED,
  MSG_ITEM_ADDED,
  MSG_ITEM_UPDATED,
  MSG_ITEM_TOO_LONG,
  MSG_ITEM_LIMIT,
  MSG_ITEM_NOT_FOUND,
  MSG_INFO,
  MSG_CB_ADDED,
  MSG_CB_DELETED,
  MSG_CB_NOT_FOUND,
  msgList,
} from "../shared/lib/messages.js";

const ITEM_NAME_MAX = 50;
const ITEM_LIMIT = 50;

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

function parseAddCommand(text) {
  if (!text || !text.startsWith("+")) return null;
  const rest = text.slice(1).trim();
  return rest || null;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  if (!from) return;

  await trackAndDeletePrevious(chatId, msg.message_id, "user");

  const chatDoc = await getChat(String(chatId));
  const role = chatDoc?.role;

  if (role === "verified" || role === "admin") {
    const itemName = parseAddCommand(msg.text);

    let text;
    let extra;

    if (itemName) {
      if (itemName.length > ITEM_NAME_MAX) {
        text = MSG_ITEM_TOO_LONG;
      } else {
        const count = await countItemsByChat(String(chatId));
        if (count >= ITEM_LIMIT) {
          text = MSG_ITEM_LIMIT;
        } else {
          const result = await saveItem(String(chatId), itemName);
          text = result.created ? MSG_ITEM_ADDED : MSG_ITEM_UPDATED;
        }
      }
    } else if (msg.text === "/list") {
      const items = await listItemsByChat(String(chatId));
      const result = msgList(items);
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

  if (action === "add") {
    const found = await addItemDate(docId);
    if (found) {
      const items = await listItemsByChat(String(chatId));
      const result = msgList(items);
      await editMessageText(chatId, messageId, result.text, {
        reply_markup: result.reply_markup || { inline_keyboard: [] },
      });
      await answerCallbackQuery(cb.id, MSG_CB_ADDED);
    } else {
      await answerCallbackQuery(cb.id, MSG_CB_NOT_FOUND);
    }
  } else if (action === "del") {
    const item = await getItem(docId);
    if (item) {
      await deleteItem(docId);
      const items = await listItemsByChat(String(chatId));
      const result = msgList(items);
      await editMessageText(chatId, messageId, result.text, {
        reply_markup: result.reply_markup || { inline_keyboard: [] },
      });
      await answerCallbackQuery(cb.id, MSG_CB_DELETED);
    } else {
      await answerCallbackQuery(cb.id, MSG_CB_NOT_FOUND);
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
