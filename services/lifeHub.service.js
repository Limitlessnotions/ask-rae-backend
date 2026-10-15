
import { db } from "../firebase/firebaseAdmin.js";

const MODULE_COLLECTIONS = {
  "mind-wellness": [
    "moodCheckins",
    "journalEntries",
    "gratitudeEntries",
    "wellnessSessions",
    "selfCarePlans",
    "confidenceExercises",
  ],
  "money-business": [
    "businessPlans",
    "budgets",
    "savingsGoals",
    "debtPlans",
  ],
  "social-media-coach": [
    "socialDrafts",
    "contentCalendars",
  ],
  "create-with-ai": [
    "generatedDocuments",
  ],
  "family-home": [
    "mealPlans",
    "groceryLists",
    "choreSchedules",
    "eventPlans",
  ],
  career: [
    "careerDocuments",
    "interviewSessions",
    "careerResources",
  ],
};

const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 120;

function getCollectionReference(uid, moduleSlug, collectionName) {
  if (!uid || typeof uid !== "string") {
    throw new Error("A valid authenticated user ID is required.");
  }

  const allowedCollections = MODULE_COLLECTIONS[moduleSlug];

  if (!allowedCollections || !allowedCollections.includes(collectionName)) {
    throw new Error("Invalid Life Hub module or collection.");
  }

  return db
    .collection("users")
    .doc(uid)
    .collection(collectionName);
}

function validateRecord(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("A valid record is required.");
  }

  const { title, content, metadata } = payload;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > MAX_TITLE_LENGTH
  ) {
    throw new Error("Title must be between 1 and 120 characters.");
  }

  if (
    typeof content !== "string" ||
    !content.trim() ||
    content.length > MAX_TEXT_LENGTH
  ) {
    throw new Error("Content must be between 1 and 20000 characters.");
  }

  if (
    metadata !== undefined &&
    (
      metadata === null ||
      typeof metadata !== "object" ||
      Array.isArray(metadata)
    )
  ) {
    throw new Error("Metadata must be an object.");
  }

  return {
    title: title.trim(),
    content: content.trim(),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

function serializeDocument(document) {
  return {
    id: document.id,
    ...document.data(),
  };
}

export function getLifeHubCollections() {
  return Object.fromEntries(
    Object.entries(MODULE_COLLECTIONS).map(([moduleSlug, collections]) => [
      moduleSlug,
      [...collections],
    ])
  );
}

export async function createLifeHubRecord({
  uid,
  moduleSlug,
  collectionName,
  payload,
}) {
  const collectionRef = getCollectionReference(
    uid,
    moduleSlug,
    collectionName
  );

  const validatedPayload = validateRecord(payload);
  const now = new Date();

  const record = {
    ...validatedPayload,
    moduleSlug,
    createdAt: now,
    updatedAt: now,
  };

  const documentRef = await collectionRef.add(record);

  return {
    id: documentRef.id,
    ...record,
  };
}

export async function listLifeHubRecords({
  uid,
  moduleSlug,
  collectionName,
  limit = 20,
  cursor = null,
}) {
  const collectionRef = getCollectionReference(
    uid,
    moduleSlug,
    collectionName
  );

  const pageSize = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    50
  );

  let query = collectionRef
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (cursor !== null) {
    if (typeof cursor !== "string" || !cursor.trim()) {
      throw new Error("Invalid pagination cursor.");
    }

    const cursorDocument = await collectionRef.doc(cursor).get();

    if (!cursorDocument.exists) {
      throw new Error("Pagination cursor was not found.");
    }

    query = query.startAfter(cursorDocument);
  }

  const snapshot = await query.get();
  const records = snapshot.docs.map(serializeDocument);

  return {
    records,
    nextCursor:
      snapshot.docs.length === pageSize
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null,
  };
}

export async function getLifeHubRecord({
  uid,
  moduleSlug,
  collectionName,
  recordId,
}) {
  if (typeof recordId !== "string" || !recordId.trim()) {
    throw new Error("A valid record ID is required.");
  }

  const collectionRef = getCollectionReference(
    uid,
    moduleSlug,
    collectionName
  );

  const document = await collectionRef.doc(recordId).get();

  if (!document.exists) {
    return null;
  }

  return serializeDocument(document);
}

export async function updateLifeHubRecord({
  uid,
  moduleSlug,
  collectionName,
  recordId,
  payload,
}) {
  if (typeof recordId !== "string" || !recordId.trim()) {
    throw new Error("A valid record ID is required.");
  }

  const collectionRef = getCollectionReference(
    uid,
    moduleSlug,
    collectionName
  );

  const validatedPayload = validateRecord(payload);
  const documentRef = collectionRef.doc(recordId);
  const existingDocument = await documentRef.get();

  if (!existingDocument.exists) {
    return null;
  }

  const updatedAt = new Date();

  await documentRef.update({
    ...validatedPayload,
    moduleSlug,
    updatedAt,
  });

  return {
    id: documentRef.id,
    ...existingDocument.data(),
    ...validatedPayload,
    moduleSlug,
    updatedAt,
  };
}

export async function deleteLifeHubRecord({
  uid,
  moduleSlug,
  collectionName,
  recordId,
}) {
  if (typeof recordId !== "string" || !recordId.trim()) {
    throw new Error("A valid record ID is required.");
  }

  const collectionRef = getCollectionReference(
    uid,
    moduleSlug,
    collectionName
  );

  const documentRef = collectionRef.doc(recordId);
  const document = await documentRef.get();

  if (!document.exists) {
    return false;
  }

  await documentRef.delete();

  return true;
}
