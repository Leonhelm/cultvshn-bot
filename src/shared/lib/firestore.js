import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { env } from "../config/env.js";

const app = initializeApp({
  credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const db = getFirestore(app);
const chatsCol = db.collection("chats");
const itemsCol = db.collection("items");

export async function getChat(chatId) {
  const snap = await chatsCol.doc(chatId).get();
  return snap.exists ? snap.data() : null;
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-zа-яё0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function makeItemDocId(chatId, name) {
  return `${chatId}_${slugify(name)}`;
}

export async function saveItem(chatId, name) {
  const docId = makeItemDocId(chatId, name);
  const ref = itemsCol.doc(docId);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data();
    const dates = data.addedDates || [];
    const updated = [Timestamp.now(), ...dates].slice(0, 10);
    await ref.update({ addedDates: updated });
    return { created: false };
  }

  await ref.set({
    name: name.trim(),
    chatId: String(chatId),
    createdAt: FieldValue.serverTimestamp(),
    addedDates: [Timestamp.now()],
    nextPredicted: null,
  });
  return { created: true };
}

export async function countItemsByChat(chatId) {
  const snap = await itemsCol
    .where("chatId", "==", String(chatId))
    .count()
    .get();
  return snap.data().count;
}

export async function listItemsByChat(chatId) {
  const snap = await itemsCol
    .where("chatId", "==", String(chatId))
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listAllItems() {
  const snap = await itemsCol.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getItem(docId) {
  const snap = await itemsCol.doc(docId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteItem(docId) {
  await itemsCol.doc(docId).delete();
}

export async function addItemDate(docId) {
  const snap = await itemsCol.doc(docId).get();
  if (!snap.exists) return false;

  const data = snap.data();
  const dates = data.addedDates || [];
  const updated = [Timestamp.now(), ...dates].slice(0, 10);
  await itemsCol.doc(docId).update({ addedDates: updated });
  return true;
}

export async function updateItemPrediction(docId, nextPredicted) {
  await itemsCol.doc(docId).update({ nextPredicted });
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
