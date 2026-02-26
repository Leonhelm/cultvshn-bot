import { db } from "../../shared/db/index.js";
import { logInfo } from "../../shared/lib/index.js";

const chatsCollection = db.collection("chats");

export async function saveChat(chatId, data) {
  const docRef = chatsCollection.doc(String(chatId));
  const doc = await docRef.get();

  if (doc.exists) {
    logInfo(`Updating chat ${chatId}`);
    await docRef.update({
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      username: data.username ?? null,
      updatedAt: new Date(),
    });
  } else {
    logInfo(`Creating chat ${chatId}`);
    await docRef.set({
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      username: data.username ?? null,
      role: "unverified",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getChat(chatId) {
  const doc = await chatsCollection.doc(String(chatId)).get();
  if (!doc.exists) {
    return null;
  }
  const d = doc.data();
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    username: d.username,
    role: d.role,
    state: d.state ?? null,
    createdAt: d.createdAt.toDate(),
    updatedAt: d.updatedAt.toDate(),
  };
}

export async function setChatState(chatId, state) {
  await chatsCollection.doc(String(chatId)).update({
    state: state ?? null,
    updatedAt: new Date(),
  });
}

export async function updateChatRole(chatId, role) {
  logInfo(`Setting role "${role}" for chat ${chatId}`);
  await chatsCollection.doc(String(chatId)).update({
    role,
    updatedAt: new Date(),
  });
}

export async function getChatsByRole(role) {
  const snapshot = await chatsCollection.where("role", "==", role).get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      chatId: Number(doc.id),
      firstName: d.firstName,
      lastName: d.lastName,
      username: d.username,
      role: d.role,
      createdAt: d.createdAt.toDate(),
      updatedAt: d.updatedAt.toDate(),
    };
  });
}
