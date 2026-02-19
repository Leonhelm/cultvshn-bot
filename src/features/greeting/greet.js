import { sendMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import { formatUserName } from "../../entities/user/index.js";
import { setLastBotMessage } from "../../entities/message/index.js";

export async function greet(incoming) {
  const chatId = incoming.chat.id;
  const user = incoming.from;

  if (!user) return;

  const name = formatUserName(user);
  const text = `Привет, ${name}! Твой chat id: ${chatId}`;

  logInfo(`Greeting user "${name}" in chat ${chatId}`);

  const sent = await sendMessage(chatId, text);
  setLastBotMessage(chatId, sent.message_id);
}
