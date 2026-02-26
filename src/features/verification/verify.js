import { sendMessage, sendMessageWithMarkup, answerCallbackQuery } from "../../shared/api/index.js";
import { logInfo, logError } from "../../shared/lib/index.js";
import { formatUserInfo } from "../../entities/user/index.js";
import { saveChat, getChat, updateChatRole, getChatsByRole } from "../../entities/chat/index.js";
import {
  saveTrackedMessage,
  saveConfirmationMessage,
  getConfirmationsByTarget,
  deleteConfirmationsByTarget,
} from "../../entities/message/index.js";

export async function handleUnverifiedUser(msg) {
  const chatId = msg.chatId;
  const user = msg.from;

  if (!user) return;

  logInfo(`Handling unverified user "${user.first_name}" in chat ${chatId}`);

  await saveChat(chatId, {
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
  });

  await deleteConfirmationsByTarget(chatId);

  const sent = await sendMessage(chatId, "Ожидайте подтверждения администратором");
  await saveTrackedMessage(chatId, sent.message_id);

  const admins = await getChatsByRole("admin");
  const userInfo = formatUserInfo(user);
  const keyboard = {
    inline_keyboard: [
      [
        { text: "Добавить", callback_data: `verify:${chatId}` },
        { text: "Отклонить", callback_data: `reject:${chatId}` },
      ],
    ],
  };

  for (const admin of admins) {
    try {
      const adminMsg = await sendMessageWithMarkup(
        admin.chatId,
        `Добавить пользователя ${userInfo}?`,
        keyboard,
        "HTML",
      );
      await saveConfirmationMessage(admin.chatId, adminMsg.message_id, chatId);
      await saveTrackedMessage(admin.chatId, adminMsg.message_id);
    } catch (error) {
      logError(`Failed to send confirmation to admin ${admin.chatId}`, error);
    }
  }
}

export async function handleVerificationCallback(callback) {
  const { callbackQueryId, fromChatId, data } = callback;

  if (!data) {
    await answerCallbackQuery(callbackQueryId);
    return null;
  }

  const match = data.match(/^(verify|reject):(\d+)$/);
  if (!match) {
    await answerCallbackQuery(callbackQueryId);
    return null;
  }

  const action = match[1];
  const targetChatId = Number(match[2]);

  await answerCallbackQuery(callbackQueryId);

  const adminChat = await getChat(fromChatId);
  if (!adminChat || adminChat.role !== "admin") {
    logInfo(`Non-admin ${fromChatId} attempted verification callback, ignoring`);
    return null;
  }

  const targetChat = await getChat(targetChatId);
  if (!targetChat) {
    logInfo(`Target chat ${targetChatId} not found for verification callback`);
    return null;
  }

  const confirmations = await getConfirmationsByTarget(targetChatId);
  if (confirmations.length === 0) {
    logInfo(`No confirmation messages found for target ${targetChatId}, likely already processed`);
    return null;
  }

  const userInfo = formatUserInfo({
    id: targetChatId,
    first_name: targetChat.firstName,
    last_name: targetChat.lastName,
    username: targetChat.username,
  });

  if (action === "verify") {
    logInfo(`Admin ${fromChatId} verified user ${targetChatId}`);
    await updateChatRole(targetChatId, "verified");

    for (const conf of confirmations) {
      if (conf.adminChatId !== fromChatId) {
        const infoMsg = await sendMessage(conf.adminChatId, `Пользователь ${userInfo} добавлен`);
        await saveTrackedMessage(conf.adminChatId, infoMsg.message_id);
      }
    }
    await deleteConfirmationsByTarget(targetChatId);

    return { action: "verify", targetChatId };
  }

  if (action === "reject") {
    logInfo(`Admin ${fromChatId} rejected user ${targetChatId}`);

    for (const conf of confirmations) {
      if (conf.adminChatId !== fromChatId) {
        const infoMsg = await sendMessage(conf.adminChatId, `Пользователь ${userInfo} не был добавлен`);
        await saveTrackedMessage(conf.adminChatId, infoMsg.message_id);
      }
    }
    await deleteConfirmationsByTarget(targetChatId);

    return { action: "reject", targetChatId };
  }

  return null;
}
