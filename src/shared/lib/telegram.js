import { env } from "../config/env.js";
import { logError } from "./logger.js";

const BASE_URL = `https://api.telegram.org/bot${env.TG_BOT_API_TOKEN}`;

/**
 * @param {string} method
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<any>}
 */
async function callApi(method, body) {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API ${method}: ${data.description}`);
  }

  return data.result;
}

/**
 * @param {number} offset
 * @param {number} timeout
 * @returns {Promise<Array<import("./telegram").TgUpdate>>}
 */
// не больше 10с — ограничение fetch в Node.js 18
export function getUpdates(offset, timeout = 8) {
  return callApi("getUpdates", {
    offset,
    timeout,
    allowed_updates: ["message"],
  });
}

/**
 * @param {number|string} chatId
 * @param {string} text
 * @param {Record<string, unknown>} [extra]
 * @returns {Promise<{message_id: number}>}
 */
export function sendMessage(chatId, text, extra) {
  return callApi("sendMessage", { chat_id: chatId, text, ...extra });
}

/**
 * @param {number|string} chatId
 * @param {number} messageId
 * @returns {Promise<boolean>}
 */
export async function deleteMessage(chatId, messageId) {
  try {
    await callApi("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
    return true;
  } catch (err) {
    logError(`deleteMessage(${chatId}, ${messageId})`, err);
    return false;
  }
}
