import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { env } from "../config/index.js";

const app = initializeApp({
  credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const db = getFirestore(app);
const chatsCol = db.collection("chats");

/**
 * @param {string} chatId
 * @returns {Promise<import("./firestore").ChatDoc | null>}
 */
export async function getChat(chatId) {
  const snap = await chatsCol.doc(chatId).get();
  return snap.exists ? /** @type {any} */ (snap.data()) : null;
}

/**
 * @param {string} chatId
 * @param {{ firstName: string; lastName?: string; username?: string }} info
 * @returns {Promise<void>}
 */
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
