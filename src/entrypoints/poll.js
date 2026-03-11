import { env } from "../shared/config/env.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger.js";
import {
  getUpdates,
  sendMessage,
  answerCallbackQuery,
  editMessageText,
  deleteMessage,
} from "../shared/lib/telegram.js";
import {
  getChat,
  upsertUnverifiedChat,
  updateChatRole,
  getUnverifiedChats,
  terminateFirestore,
} from "../shared/lib/firestore.js";
import {
  MSG_COMMANDS,
  MSG_ADMIN_COMMANDS,
  MSG_UNVERIFIED,
  MSG_REJECTED_REPLY,
  MSG_INFO,
  MSG_VERIFY_REQUEST,
  BTN_VERIFY,
  BTN_REJECT,
  MSG_VERIFIED,
  MSG_REJECTED,
  MSG_VERIFY_DONE,
  MSG_PENDING_EMPTY,
  MSG_PENDING_ENTRY,
} from "../shared/lib/messages.js";

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

async function notifyAdmins(chatId, info) {
  const name = info.firstName + (info.lastName ? ` ${info.lastName}` : "");
  const text = MSG_VERIFY_REQUEST(name, info.username, String(chatId));
  const extra = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: BTN_VERIFY, callback_data: `verify:${chatId}` },
          { text: BTN_REJECT, callback_data: `reject:${chatId}` },
        ],
      ],
    },
  };

  for (const adminId of env.ADMIN_CHAT_IDS) {
    try {
      await sendMessage(adminId, text, extra);
    } catch (err) {
      logError(`Failed to notify admin ${adminId}`, err);
    }
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  if (!from) return;

  await trackAndDeletePrevious(chatId, msg.message_id, "user");

  const chatDoc = await getChat(String(chatId));
  const role = chatDoc?.role;

  if (role === "verified" || role === "admin") {
    let text;

    if (msg.text === "/info") {
      text = MSG_INFO;
    } else if (role === "admin" && msg.text === "/pending") {
      const list = await getUnverifiedChats();
      if (list.length === 0) {
        text = MSG_PENDING_EMPTY;
      } else {
        text =
          "Грибочки ждут проверки~ 🍄\n\n" +
          list
            .map((c) =>
              MSG_PENDING_ENTRY(
                c.firstName + (c.lastName ? ` ${c.lastName}` : ""),
                c.username,
                c.chatId,
              ),
            )
            .join("\n");
      }
    } else {
      text = role === "admin" ? MSG_ADMIN_COMMANDS : MSG_COMMANDS;
    }

    const sent = await sendMessage(chatId, text);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
  } else if (role === "rejected") {
    const sent = await sendMessage(chatId, MSG_REJECTED_REPLY);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
  } else {
    const isNew = !chatDoc;
    await upsertUnverifiedChat(String(chatId), {
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
    });

    if (isNew) {
      await notifyAdmins(chatId, {
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
      });
    }

    const sent = await sendMessage(chatId, MSG_UNVERIFIED);
    await trackAndDeletePrevious(chatId, sent.message_id, "bot");
  }
}

async function handleCallbackQuery(cbq) {
  const adminChatId = cbq.message?.chat.id;
  if (!adminChatId) return;

  const adminDoc = await getChat(String(adminChatId));
  if (adminDoc?.role !== "admin") {
    await answerCallbackQuery(cbq.id, "Нет доступа~");
    return;
  }

  const data = cbq.data;
  if (!data) return;

  const sep = data.indexOf(":");
  if (sep === -1) return;

  const action = data.slice(0, sep);
  const targetChatId = data.slice(sep + 1);
  if (!targetChatId || (action !== "verify" && action !== "reject")) return;

  const targetDoc = await getChat(targetChatId);
  if (!targetDoc || targetDoc.role !== "unverified") {
    await answerCallbackQuery(cbq.id, "Уже обработано~");
    if (cbq.message) {
      const name = targetDoc
        ? targetDoc.firstName +
          (targetDoc.lastName ? ` ${targetDoc.lastName}` : "")
        : "Неизвестный";
      const resolvedAction =
        targetDoc?.role === "verified" ? "verified" : "rejected";
      await editMessageText(
        adminChatId,
        cbq.message.message_id,
        MSG_VERIFY_DONE(name, resolvedAction),
      );
    }
    return;
  }

  const newRole = action === "verify" ? "verified" : "rejected";
  await updateChatRole(targetChatId, newRole);

  const userMsg = action === "verify" ? MSG_VERIFIED : MSG_REJECTED;
  try {
    await sendMessage(Number(targetChatId), userMsg);
  } catch (err) {
    logError(`Failed to notify user ${targetChatId}`, err);
  }

  const name =
    targetDoc.firstName +
    (targetDoc.lastName ? ` ${targetDoc.lastName}` : "");
  if (cbq.message) {
    await editMessageText(
      adminChatId,
      cbq.message.message_id,
      MSG_VERIFY_DONE(name, newRole),
    );
  }

  await answerCallbackQuery(cbq.id);
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
        }

        if (update.callback_query) {
          try {
            await handleCallbackQuery(update.callback_query);
          } catch (err) {
            logError(`Error handling callback query ${update.update_id}`, err);
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
