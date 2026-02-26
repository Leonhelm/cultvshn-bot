import { db } from "../../shared/db/index.js";

const orderListMessagesCollection = db.collection("orderListMessages");

export async function saveOrderListMessage(chatId, messageId, orderId) {
  await orderListMessagesCollection.add({
    chatId,
    messageId,
    orderId,
    createdAt: new Date(),
  });
}

export async function getOrderListMessagesByChat(chatId) {
  const snapshot = await orderListMessagesCollection
    .where("chatId", "==", chatId)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      docId: doc.id,
      chatId: d.chatId,
      messageId: d.messageId,
      orderId: d.orderId,
    };
  });
}

export async function deleteOrderListMessagesByChat(chatId) {
  const snapshot = await orderListMessagesCollection
    .where("chatId", "==", chatId)
    .get();

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function deleteOrderListMessageByOrder(orderId) {
  const snapshot = await orderListMessagesCollection
    .where("orderId", "==", orderId)
    .get();

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function getOrderListMessageByMessage(chatId, messageId) {
  const snapshot = await orderListMessagesCollection
    .where("chatId", "==", chatId)
    .where("messageId", "==", messageId)
    .limit(1)
    .get();

  if (snapshot.empty) return undefined;

  const doc = snapshot.docs[0];
  return { docId: doc.id };
}

export async function deleteOrderListMessageDoc(docId) {
  await orderListMessagesCollection.doc(docId).delete();
}
