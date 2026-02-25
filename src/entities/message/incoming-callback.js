import { db } from "../../shared/db/index.js";

const callbacksCollection = db.collection("callbackQueries");

function buildCallbackDoc(callbackQuery) {
  return {
    callbackQueryId: callbackQuery.id,
    fromChatId: callbackQuery.from?.id ?? 0,
    from: {
      id: callbackQuery.from?.id ?? 0,
      first_name: callbackQuery.from?.first_name ?? "",
      last_name: callbackQuery.from?.last_name ?? null,
      username: callbackQuery.from?.username ?? null,
    },
    messageId: callbackQuery.message?.message_id ?? null,
    data: callbackQuery.data ?? null,
    createdAt: new Date(),
  };
}

export function saveIncomingCallbackBatch(batch, updateId, callbackQuery) {
  const docRef = callbacksCollection.doc(String(updateId));
  batch.set(docRef, buildCallbackDoc(callbackQuery));
}

export async function getUnprocessedCallbacks() {
  const snapshot = await callbacksCollection.orderBy("createdAt").get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      updateId: Number(doc.id),
      callbackQueryId: d.callbackQueryId,
      fromChatId: d.fromChatId,
      from: d.from,
      messageId: d.messageId,
      data: d.data,
    };
  });
}

export async function deleteProcessedCallback(updateId) {
  await callbacksCollection.doc(String(updateId)).delete();
}
