import { db } from "../../shared/db/index.js";

const confirmationsCollection = db.collection("confirmationMessages");

export async function saveConfirmationMessage(adminChatId, messageId, targetChatId) {
  await confirmationsCollection.add({
    adminChatId,
    messageId,
    targetChatId,
    createdAt: new Date(),
  });
}

export async function getConfirmationsByTarget(targetChatId) {
  const snapshot = await confirmationsCollection
    .where("targetChatId", "==", targetChatId)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      docId: doc.id,
      adminChatId: d.adminChatId,
      messageId: d.messageId,
      targetChatId: d.targetChatId,
    };
  });
}

export async function deleteConfirmationsByTarget(targetChatId) {
  const snapshot = await confirmationsCollection
    .where("targetChatId", "==", targetChatId)
    .get();

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}
