import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "../config/index.js";
import { logInfo } from "../lib/index.js";

const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);

const app = initializeApp({
  credential: cert(serviceAccount),
});

logInfo(`Firestore initialized (project: ${serviceAccount.project_id})`);

export const db = getFirestore(app);

const OFFSET_DOC_PATH = "botState/offset";

export async function getOffset() {
  const doc = await db.doc(OFFSET_DOC_PATH).get();
  if (!doc.exists) {
    return undefined;
  }
  return doc.data().value;
}

export async function setOffset(value) {
  await db.doc(OFFSET_DOC_PATH).set({ value });
}

export function setOffsetBatch(batch, value) {
  batch.set(db.doc(OFFSET_DOC_PATH), { value });
}

export function createBatch() {
  return db.batch();
}
