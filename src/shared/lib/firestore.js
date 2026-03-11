import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { env } from "../config/env.js";

const app = initializeApp({
  credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const db = getFirestore(app);
const chatsCol = db.collection("chats");

export async function getChat(chatId) {
  const snap = await chatsCol.doc(chatId).get();
  return snap.exists ? snap.data() : null;
}

export async function terminateFirestore() {
  await app.delete();
}

export async function updateChatRole(chatId, role) {
  await chatsCol.doc(chatId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getAdminChatIds() {
  const snap = await chatsCol.where("role", "==", "admin").get();
  return snap.docs.map((doc) => doc.id);
}

export async function getUnverifiedChats() {
  const snap = await chatsCol.where("role", "==", "unverified").get();
  return snap.docs.map((doc) => ({ chatId: doc.id, ...doc.data() }));
}

export async function upsertUnverifiedChat(chatId, info) {
  const ref = chatsCol.doc(chatId);
  const snap = await ref.get();

  if (snap.exists) return;

  await ref.set({
    firstName: info.firstName,
    ...(info.lastName && { lastName: info.lastName }),
    ...(info.username && { username: info.username }),
    role: "unverified",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
