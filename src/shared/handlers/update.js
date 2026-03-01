import { logError } from "../lib/logger.js";
import {
  sendMessage,
  deleteMessage,
  answerCallbackQuery,
  editMessageText,
} from "../lib/telegram.js";
import {
  getChat,
  upsertUnverifiedChat,
  saveLink,
  countLinksByChat,
  listLinks,
  getLink,
  deleteLink,
} from "../lib/firestore.js";
import {
  MSG_COMMANDS,
  MSG_UNVERIFIED,
  MSG_LINK_SAVED,
  MSG_LINK_LIMIT,
  MSG_LINK_NOT_FOUND,
  MSG_INFO,
  MSG_CB_DELETED,
  MSG_CB_NOT_FOUND,
  msgList,
} from "../lib/messages.js";
import { extractMarketplaceLink } from "../marketplace/extract.js";

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
      const count = await countLinksByChat(String(chatId));
      if (count >= 10) {
        text = MSG_LINK_LIMIT;
      } else {
        await saveLink(String(chatId), msg.message_id, marketplaceUrl);
        text = MSG_LINK_SAVED;
      }
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
      await answerCallbackQuery(cb.id, MSG_CB_DELETED);
    } else {
      await answerCallbackQuery(cb.id, MSG_CB_NOT_FOUND);
    }
  } else {
    await answerCallbackQuery(cb.id);
  }
}

export async function processUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}
