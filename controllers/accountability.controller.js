import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getActiveGoals,
} from "../services/accountability.service.js";

/**
 * GET /api/accountability
 *
 * Get all accountability goals
 * belonging to the authenticated user.
 */
export async function getUserGoals(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const goals =
      await getGoals(uid);

    return res.json({
      success: true,
      goals,
    });
  } catch (error) {
    console.error(
      "Get accountability goals error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to retrieve accountability goals.",
    });
  }
}

/**
 * GET /api/accountability/active
 *
 * Get only incomplete goals.
 *
 * Rae uses this endpoint/context to
 * understand what the user is currently
 * working toward.
 */
export async function getUserActiveGoals(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const goals =
      await getActiveGoals(uid);

    return res.json({
      success: true,
      goals,
    });
  } catch (error) {
    console.error(
      "Get active accountability goals error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to retrieve active accountability goals.",
    });
  }
}

/**
 * POST /api/accountability
 *
 * Create a new accountability goal.
 */
export async function addUserGoal(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const {
      title,
      description,
      dueDate,
    } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Goal title is required.",
      });
    }

    const goal =
      await createGoal(uid, {
        title,
        description,
        dueDate,
      });

    return res.status(201).json({
      success: true,
      goal,
    });
  } catch (error) {
    console.error(
      "Create accountability goal error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to create accountability goal.",
    });
  }
}

/**
 * PATCH /api/accountability/:goalId
 *
 * Update an accountability goal.
 */
export async function editUserGoal(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const { goalId } =
      req.params;

    const {
      title,
      description,
      completed,
      dueDate,
    } = req.body;

    const goal =
      await updateGoal(
        uid,
        goalId,
        {
          title,
          description,
          completed,
          dueDate,
        }
      );

    return res.json({
      success: true,
      goal,
    });
  } catch (error) {
    console.error(
      "Update accountability goal error:",
      error
    );

    if (
      error.message ===
      "Goal not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to update accountability goal.",
    });
  }
}

/**
 * DELETE /api/accountability/:goalId
 *
 * Delete an accountability goal.
 */
export async function removeUserGoal(
  req,
  res
) {
  try {
    const { uid } = req.user;

    const { goalId } =
      req.params;

    await deleteGoal(
      uid,
      goalId
    );

    return res.json({
      success: true,
      message:
        "Accountability goal deleted.",
    });
  } catch (error) {
    console.error(
      "Delete accountability goal error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to delete accountability goal.",
    });
  }
}