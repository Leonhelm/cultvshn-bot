import { db } from "../../shared/db/index.js";

const botMessagesCollection = db.collection("botMessages");

export async function setLastBotMessage(chatId, messageId) {
  await botMessagesCollection.doc(String(chatId)).set({
    messageId,
    createdAt: new Date(),
  });
}

export async function getLastBotMessage(chatId) {
  const doc = await botMessagesCollection.doc(String(chatId)).get();
  if (!doc.exists) {
    return undefined;
  }
  return doc.data().messageId;
}

export async function clearLastBotMessage(chatId) {
  await botMessagesCollection.doc(String(chatId)).delete();
}
