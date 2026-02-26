import { sendMessageWithMarkup, answerCallbackQuery, deleteMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import { setLastBotMessage, saveOrderListMessage, deleteOrderListMessageByOrder } from "../../entities/message/index.js";
import { setChatState } from "../../entities/chat/index.js";
import { saveOrder, getOrdersByChat, getOrder, deleteOrder } from "../../entities/order/index.js";

const QUICK_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "Добавить заказ", callback_data: "add-order" },
      { text: "Список заказов", callback_data: "list-orders" },
    ],
  ],
};

const CANCEL_KEYBOARD = {
  inline_keyboard: [[{ text: "Отмена", callback_data: "cancel" }]],
};

function parseOrderUrl(text) {
  try {
    const url = new URL(text);
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "ozon.ru" ||
      hostname.endsWith(".ozon.ru") ||
      hostname === "wildberries.ru" ||
      hostname.endsWith(".wildberries.ru")
    ) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

export async function showQuickMenu(chatId, textPrefix) {
  const text = textPrefix
    ? `${textPrefix}\n\nВыберите действие:`
    : "Выберите действие:";

  const sent = await sendMessageWithMarkup(chatId, text, QUICK_MENU_KEYBOARD);
  await setLastBotMessage(chatId, sent.message_id);
}

export async function promptForOrderLink(callbackQueryId, chatId) {
  await answerCallbackQuery(callbackQueryId);
  await setChatState(chatId, "awaiting-order-link");

  logInfo(`Prompting for order link in chat ${chatId}`);
  const sent = await sendMessageWithMarkup(
    chatId,
    "Отправьте ссылку на заказ (ozon.ru или wildberries.ru)",
    CANCEL_KEYBOARD,
  );
  await setLastBotMessage(chatId, sent.message_id);
}

export async function handleOrderLink(msg) {
  const chatId = msg.chatId;
  const text = msg.text?.trim();

  if (!text) {
    const sent = await sendMessageWithMarkup(
      chatId,
      "Отправьте ссылку на заказ (ozon.ru или wildberries.ru)",
      CANCEL_KEYBOARD,
    );
    await setLastBotMessage(chatId, sent.message_id);
    return;
  }

  const url = parseOrderUrl(text);

  if (!url) {
    logInfo(`Invalid order URL from chat ${chatId}`);
    const sent = await sendMessageWithMarkup(
      chatId,
      "Ссылка должна быть с домена ozon.ru или wildberries.ru",
      CANCEL_KEYBOARD,
    );
    await setLastBotMessage(chatId, sent.message_id);
    return;
  }

  logInfo(`Saving order for chat ${chatId}`);
  await saveOrder(chatId, url);
  await setChatState(chatId, null);
  await showQuickMenu(chatId, "Заказ сохранён");
}

export async function handleListOrders(callbackQueryId, chatId) {
  await answerCallbackQuery(callbackQueryId);

  logInfo(`Listing orders for chat ${chatId}`);
  const orders = await getOrdersByChat(chatId);

  if (orders.length === 0) {
    await showQuickMenu(chatId, "У вас нет сохранённых заказов");
    return;
  }

  for (const order of orders) {
    const sent = await sendMessageWithMarkup(chatId, order.url, {
      inline_keyboard: [
        [{ text: "Удалить", callback_data: `delete-order:${order.orderId}` }],
      ],
    });
    await saveOrderListMessage(chatId, sent.message_id, order.orderId);
  }

  await showQuickMenu(chatId);
}

export async function handleDeleteOrder(callback) {
  const { callbackQueryId, fromChatId, data, messageId } = callback;

  const match = data.match(/^delete-order:(.+)$/);
  if (!match) return;

  const orderId = match[1];
  await answerCallbackQuery(callbackQueryId);

  const order = await getOrder(orderId);
  if (!order || order.chatId !== fromChatId) {
    logInfo(`Order ${orderId} not found or not owned by chat ${fromChatId}`);
    return;
  }

  logInfo(`Deleting order ${orderId} for chat ${fromChatId}`);
  await deleteOrder(orderId);
  if (messageId) await deleteMessage(fromChatId, messageId);
  await deleteOrderListMessageByOrder(orderId);
}

export async function handleCancelOrder(callbackQueryId, chatId) {
  await answerCallbackQuery(callbackQueryId);
  await setChatState(chatId, null);

  logInfo(`Order flow cancelled in chat ${chatId}`);
  await showQuickMenu(chatId);
}
