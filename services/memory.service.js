import { db } from "../firebase/firebaseAdmin.js";

/**
 * Get memories belonging to a user.
 */
export async function getMemories(uid) {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("memories")
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Save a new memory.
 *
 * Prevents exact duplicate memories.
 */
export async function saveMemory(
  uid,
  content,
  category = "general"
) {
  const cleanContent = content?.trim();

  if (!cleanContent) {
    return null;
  }

  const existing = await db
    .collection("users")
    .doc(uid)
    .collection("memories")
    .where("content", "==", cleanContent)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("memories")
    .add({
      content: cleanContent,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  return ref.id;
}

/**
 * Save multiple memories while avoiding duplicates.
 */
export async function saveMemories(
  uid,
  memories = []
) {
  const saved = [];

  for (const memory of memories) {
    if (!memory?.content) {
      continue;
    }

    const id = await saveMemory(
      uid,
      memory.content,
      memory.category || "general"
    );

    if (id) {
      saved.push(id);
    }
  }

  return saved;
}

/**
 * Delete a specific memory.
 */
export async function deleteMemory(
  uid,
  memoryId
) {
  await db
    .collection("users")
    .doc(uid)
    .collection("memories")
    .doc(memoryId)
    .delete();
}