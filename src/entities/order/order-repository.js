import { db } from "../../shared/db/index.js";
import { logInfo } from "../../shared/lib/index.js";

const ordersCollection = db.collection("orders");

export async function saveOrder(chatId, url) {
  logInfo(`Saving order for chat ${chatId}`);
  const docRef = await ordersCollection.add({
    chatId,
    url,
    createdAt: new Date(),
  });
  return docRef.id;
}

export async function getOrdersByChat(chatId) {
  const snapshot = await ordersCollection
    .where("chatId", "==", chatId)
    .orderBy("createdAt")
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      orderId: doc.id,
      chatId: d.chatId,
      url: d.url,
      createdAt: d.createdAt.toDate(),
    };
  });
}

export async function getOrder(orderId) {
  const doc = await ordersCollection.doc(orderId).get();
  if (!doc.exists) {
    return null;
  }
  const d = doc.data();
  return {
    orderId: doc.id,
    chatId: d.chatId,
    url: d.url,
    createdAt: d.createdAt.toDate(),
  };
}

export async function deleteOrder(orderId) {
  logInfo(`Deleting order ${orderId}`);
  await ordersCollection.doc(orderId).delete();
}
