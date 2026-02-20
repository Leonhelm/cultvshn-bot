import { db } from "../../shared/db/index.js";

const messagesCollection = db.collection("messages");

function buildMessageDoc(message) {
  return {
    chatId: message.chat.id,
    messageId: message.message_id,
    from: {
      id: message.from?.id ?? 0,
      first_name: message.from?.first_name ?? "",
      last_name: message.from?.last_name ?? null,
      username: message.from?.username ?? null,
    },
    text: message.text ?? null,
    date: message.date,
    createdAt: new Date(),
  };
}

export function saveIncomingMessageBatch(batch, updateId, message) {
  const docRef = messagesCollection.doc(String(updateId));
  batch.set(docRef, buildMessageDoc(message));
}

export async function saveIncomingMessage(updateId, message) {
  await messagesCollection.doc(String(updateId)).set(buildMessageDoc(message));
}

export async function getUnprocessedMessages() {
  const snapshot = await messagesCollection.orderBy("date").get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      updateId: Number(doc.id),
      chatId: d.chatId,
      messageId: d.messageId,
      from: d.from,
      text: d.text,
      date: d.date,
    };
  });
}

export async function deleteProcessedMessage(updateId) {
  await messagesCollection.doc(String(updateId)).delete();
}
