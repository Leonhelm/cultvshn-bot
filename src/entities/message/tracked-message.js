import { db } from "../../shared/db/index.js";

const trackedMessagesCollection = db.collection("trackedMessages");

export async function saveTrackedMessage(chatId, messageId) {
  await trackedMessagesCollection.add({
    chatId,
    messageId,
    createdAt: new Date(),
  });
}

export function saveTrackedMessageBatch(batch, chatId, messageId) {
  const ref = trackedMessagesCollection.doc();
  batch.set(ref, {
    chatId,
    messageId,
    createdAt: new Date(),
  });
}

export async function getExpiredTrackedMessages(cutoffDate) {
  const snapshot = await trackedMessagesCollection
    .where("createdAt", "<=", cutoffDate)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      docId: doc.id,
      chatId: d.chatId,
      messageId: d.messageId,
    };
  });
}

export async function deleteTrackedMessages(docIds) {
  const batch = db.batch();
  for (const id of docIds) {
    batch.delete(trackedMessagesCollection.doc(id));
  }
  await batch.commit();
}

export async function getTrackedMessageCountByChat(chatId) {
  const snapshot = await trackedMessagesCollection
    .where("chatId", "==", chatId)
    .count()
    .get();

  return snapshot.data().count;
}
