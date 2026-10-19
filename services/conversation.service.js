
import { db } from "../firebase/firebaseAdmin.js";

const conversationsRef = (uid) =>
  db.collection("users").doc(uid).collection("conversations");

const messagesRef = (uid, conversationId) =>
  conversationsRef(uid)
    .doc(conversationId)
    .collection("messages");

export async function createConversation(uid, firstMessage = "") {
  const now = new Date();
  const title = firstMessage.trim().slice(0, 60) || "New chat";

  const ref = await conversationsRef(uid).add({
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  });

  return {
    id: ref.id,
    title,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    messageCount: 0,
  };
}

export async function saveConversationMessage(
  uid,
  conversationId,
  message
) {
  const conversationRef = conversationsRef(uid).doc(conversationId);
  const messageRef = messagesRef(uid, conversationId);

  const conversation = await conversationRef.get();

  if (!conversation.exists) {
    throw new Error("Conversation not found.");
  }

  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const latestConversation = await transaction.get(conversationRef);

    if (!latestConversation.exists) {
      throw new Error("Conversation not found.");
    }

    transaction.set(messageRef.doc(message.id), {
      role: message.role,
      content: message.content,
      createdAt: now,
    });

    transaction.update(conversationRef, {
      updatedAt: now,
      messageCount:
        (latestConversation.data()?.messageCount || 0) + 1,
    });
  });
}

export async function getConversationMessages(
  uid,
  conversationId,
  limit = 30
) {
  const conversation = await conversationsRef(uid)
    .doc(conversationId)
    .get();

  if (!conversation.exists) {
    throw new Error("Conversation not found.");
  }

  const snapshot = await messagesRef(uid, conversationId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis?.() ?? Date.now(),
    }))
    .reverse();
}

export async function listConversations(uid, limit = 50) {
  const snapshot = await conversationsRef(uid)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      title: data.title || "New chat",
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
      updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
      messageCount: data.messageCount || 0,
    };
  });
}
