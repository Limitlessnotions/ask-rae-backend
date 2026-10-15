
import {
  createLifeHubRecord as createRecord,
  listLifeHubRecords as listRecords,
  getLifeHubRecord as getRecord,
  updateLifeHubRecord as updateRecord,
  deleteLifeHubRecord as deleteRecord,
} from "../services/lifeHub.service.js";

function getRequestContext(req) {
  return {
    uid: req.user?.uid,
    moduleSlug: req.params.moduleSlug,
    collectionName: req.params.collection,
  };
}

function handleError(res, error, fallbackMessage) {
  const message = error?.message || "";

  if (
    message.startsWith("Invalid ") ||
    message.startsWith("A valid ") ||
    message.startsWith("Title must ") ||
    message.startsWith("Content must ") ||
    message.startsWith("Metadata must ")
  ) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (message === "Pagination cursor was not found.") {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  console.error("Life Hub request failed:", error?.message || "Unknown error");

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

export async function createLifeHubRecord(req, res) {
  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const record = await createRecord({
      ...getRequestContext(req),
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      record,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to save the Life Hub record."
    );
  }
}

export async function listLifeHubRecords(req, res) {
  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const result = await listRecords({
      ...getRequestContext(req),
      limit: req.query.limit,
      cursor: req.query.cursor || null,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve Life Hub records."
    );
  }
}

export async function getLifeHubRecord(req, res) {
  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const record = await getRecord({
      ...getRequestContext(req),
      recordId: req.params.recordId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Life Hub record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve the Life Hub record."
    );
  }
}

export async function updateLifeHubRecord(req, res) {
  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const record = await updateRecord({
      ...getRequestContext(req),
      recordId: req.params.recordId,
      payload: req.body,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Life Hub record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to update the Life Hub record."
    );
  }
}

export async function deleteLifeHubRecord(req, res) {
  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const deleted = await deleteRecord({
      ...getRequestContext(req),
      recordId: req.params.recordId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Life Hub record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Life Hub record deleted.",
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to delete the Life Hub record."
    );
  }
}
