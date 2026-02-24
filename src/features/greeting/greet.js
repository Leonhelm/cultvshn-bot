import { sendMessage } from "../../shared/api/index.js";
import { logInfo } from "../../shared/lib/index.js";
import { formatUserName } from "../../entities/user/index.js";
import { setLastBotMessage } from "../../entities/message/index.js";
import { saveChat } from "../../entities/chat/index.js";

export async function greet(msg) {
  const chatId = msg.chatId;
  const user = msg.from;

  if (!user) return;

  const name = formatUserName(user);
  const text = `Привет, ${name}! Твой chat id: ${chatId}`;

  logInfo(`Greeting user "${name}" in chat ${chatId}`);

  await saveChat(chatId, {
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
  });

  const sent = await sendMessage(chatId, text);
  await setLastBotMessage(chatId, sent.message_id);
}
