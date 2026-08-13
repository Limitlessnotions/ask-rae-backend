import { db } from "../firebase/firebaseAdmin.js";

/**
 * Get all accountability goals for a user.
 */
export async function getGoals(uid) {
  if (!uid) {
    throw new Error(
      "User ID is required."
    );
  }

  const snapshot =
    await db
      .collection("users")
      .doc(uid)
      .collection("accountabilityGoals")
      .orderBy(
        "createdAt",
        "desc"
      )
      .get();

  return snapshot.docs.map(
    (doc) => ({
      id: doc.id,
      ...doc.data(),
    })
  );
}

/**
 * Create a new accountability goal.
 *
 * Duplicate active goals are ignored.
 */
export async function createGoal(
  uid,
  {
    title,
    description = "",
    dueDate = null,
  }
) {
  if (!uid) {
    throw new Error(
      "User ID is required."
    );
  }

  const cleanTitle =
    typeof title === "string"
      ? title.trim()
      : "";

  if (!cleanTitle) {
    throw new Error(
      "Goal title is required."
    );
  }

  const goalsRef =
    db
      .collection("users")
      .doc(uid)
      .collection("accountabilityGoals");

  /**
   * Prevent duplicate active goals.
   */
  const existing =
    await goalsRef
      .where(
        "titleLower",
        "==",
        cleanTitle.toLowerCase()
      )
      .where(
        "completed",
        "==",
        false
      )
      .limit(1)
      .get();

  if (!existing.empty) {
    const existingDoc =
      existing.docs[0];

    return {
      id: existingDoc.id,
      ...existingDoc.data(),
    };
  }

  const now =
    new Date();

  const goal = {
    title: cleanTitle,

    titleLower:
      cleanTitle.toLowerCase(),

    description:
      typeof description === "string"
        ? description.trim()
        : "",

    completed: false,

    createdAt: now,

    updatedAt: now,

    dueDate:
      dueDate || null,
  };

  const ref =
    await goalsRef.add(goal);

  return {
    id: ref.id,
    ...goal,
  };
}

/**
 * Update an accountability goal.
 */
export async function updateGoal(
  uid,
  goalId,
  updates = {}
) {
  if (!uid) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!goalId) {
    throw new Error(
      "Goal ID is required."
    );
  }

  const ref =
    db
      .collection("users")
      .doc(uid)
      .collection("accountabilityGoals")
      .doc(goalId);

  const snapshot =
    await ref.get();

  if (!snapshot.exists) {
    throw new Error(
      "Goal not found."
    );
  }

  const data = {};

  if (
    typeof updates.title ===
    "string"
  ) {
    const cleanTitle =
      updates.title.trim();

    if (!cleanTitle) {
      throw new Error(
        "Goal title cannot be empty."
      );
    }

    data.title =
      cleanTitle;

    data.titleLower =
      cleanTitle.toLowerCase();
  }

  if (
    typeof updates.description ===
    "string"
  ) {
    data.description =
      updates.description.trim();
  }

  if (
    typeof updates.completed ===
    "boolean"
  ) {
    data.completed =
      updates.completed;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "dueDate"
    )
  ) {
    data.dueDate =
      updates.dueDate || null;
  }

  data.updatedAt =
    new Date();

  await ref.update(data);

  const updated =
    await ref.get();

  return {
    id: updated.id,
    ...updated.data(),
  };
}

/**
 * Delete an accountability goal.
 */
export async function deleteGoal(
  uid,
  goalId
) {
  if (!uid) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!goalId) {
    throw new Error(
      "Goal ID is required."
    );
  }

  const ref =
    db
      .collection("users")
      .doc(uid)
      .collection("accountabilityGoals")
      .doc(goalId);

  const snapshot =
    await ref.get();

  if (!snapshot.exists) {
    throw new Error(
      "Goal not found."
    );
  }

  await ref.delete();
}

/**
 * Get only active/incomplete goals.
 *
 * This is the accountability context
 * supplied to Rae.
 */
export async function getActiveGoals(
  uid
) {
  if (!uid) {
    throw new Error(
      "User ID is required."
    );
  }

  const snapshot =
    await db
      .collection("users")
      .doc(uid)
      .collection("accountabilityGoals")
      .where(
        "completed",
        "==",
        false
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(30)
      .get();

  return snapshot.docs.map(
    (doc) => ({
      id: doc.id,
      ...doc.data(),
    })
  );
}

/**
 * Create a goal from Rae's extracted
 * accountability goal.
 *
 * This is used by the chat controller
 * after extractGoal() identifies a
 * clear actionable intention.
 */
export async function createExtractedGoal(
  uid,
  goal
) {
  if (!goal) {
    return null;
  }

  if (
    typeof goal.title !==
      "string" ||
    !goal.title.trim()
  ) {
    return null;
  }

  return createGoal(
    uid,
    {
      title:
        goal.title,

      description:
        goal.description ||
        "",

      dueDate:
        goal.dueDate ||
        null,
    }
  );
}