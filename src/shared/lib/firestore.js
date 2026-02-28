import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { env } from "../config/env.js";

const app = initializeApp({
  credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const db = getFirestore(app);
const chatsCol = db.collection("chats");
const linksCol = db.collection("links");

export async function getChat(chatId) {
  const snap = await chatsCol.doc(chatId).get();
  return snap.exists ? (snap.data()) : null;
}

export async function saveLink(chatId, messageId, url) {
  const docId = `${chatId}_${messageId}`;
  await linksCol.doc(docId).set({
    url,
    chatId: String(chatId),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function countLinksByChat(chatId) {
  const snap = await linksCol.where("chatId", "==", String(chatId)).count().get();
  return snap.data().count;
}

export async function listLinks() {
  const snap = await linksCol.orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getLink(docId) {
  const snap = await linksCol.doc(docId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteLink(docId) {
  await linksCol.doc(docId).delete();
}

export async function updateLinkData(docId, data) {
  await linksCol.doc(docId).update({
    checkedAt: FieldValue.serverTimestamp(),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.price !== undefined && { price: data.price }),
    invalidAt:
      data.invalidAt === true ? FieldValue.serverTimestamp() : FieldValue.delete(),
  });
}

export async function terminateFirestore() {
  await app.delete();
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
