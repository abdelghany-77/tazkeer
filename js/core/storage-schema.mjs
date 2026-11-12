export const BACKUP_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateBackupPayload(payload) {
  if (!isPlainObject(payload)) {
    return { valid: false, reason: "Backup must be an object." };
  }

  if (payload.type !== "tazkeer-progress-backup") {
    return { valid: false, reason: "Unsupported backup type." };
  }

  if (payload.version !== BACKUP_SCHEMA_VERSION) {
    return { valid: false, reason: "Unsupported backup version." };
  }

  if (!isPlainObject(payload.keys)) {
    return { valid: false, reason: "Backup keys are missing or invalid." };
  }

  const invalidKey = Object.keys(payload.keys).find(
    (key) => typeof key !== "string" || typeof payload.keys[key] !== "string"
  );
  if (invalidKey) {
    return { valid: false, reason: `Backup value is invalid for key: ${invalidKey}` };
  }

  return { valid: true, reason: null };
}

export function createBackupPayload(keys, exportedAt = new Date().toISOString()) {
  if (!isPlainObject(keys)) throw new TypeError("Backup keys must be an object.");
  return {
    app: "tazkeer",
    type: "tazkeer-progress-backup",
    version: BACKUP_SCHEMA_VERSION,
    exportedAt,
    keys: { ...keys },
  };
}
