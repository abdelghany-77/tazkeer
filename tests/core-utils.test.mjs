import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailySchedule,
  hasScheduleChanged,
  localDateKey,
  normalizeDailyReminders,
  nextLocalMidnight,
  parseLocalTime,
  shouldReplaceSchedule,
  stableNotificationId,
  validateSchedule,
} from "../js/core/schedule-utils.mjs";
import {
  BACKUP_SCHEMA_VERSION,
  createBackupPayload,
  validateBackupPayload,
} from "../js/core/storage-schema.mjs";

test("parses only valid local times", () => {
  assert.deepEqual(parseLocalTime("05:07"), { hours: 5, minutes: 7 });
  assert.equal(parseLocalTime("25:00"), null);
  assert.equal(parseLocalTime("5:07"), null);
});

test("normalizes enabled daily reminders and rejects malformed entries", () => {
  assert.deepEqual(
    normalizeDailyReminders([
      { key: "morning", time: "07:00", title: "صباح الخير" },
      { key: "disabled", time: "08:00", enabled: false },
      { key: "invalid", time: "8:00" },
    ]),
    [{ key: "morning", time: "07:00", title: "صباح الخير", body: "" }]
  );
});

test("builds stable local schedules and IDs", () => {
  const date = new Date(2026, 10, 10, 12, 0, 0);
  const schedule = buildDailySchedule(date, [
    { key: "morning", time: "07:00", body: "اذكر الله" },
    { key: "evening", time: "18:30", body: "أذكار المساء" },
  ]);

  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].date, "2026-11-10");
  assert.equal(new Date(schedule[0].time).getHours(), 7);
  assert.equal(
    schedule[0].id,
    stableNotificationId("azkar", "2026-11-10", "morning")
  );
  assert.notEqual(schedule[0].id, schedule[1].id);
});

test("rejects duplicate, expired, and malformed schedules", () => {
  const now = new Date(2026, 10, 10, 6, 0, 0).getTime();
  const valid = buildDailySchedule(new Date(now), [
    { key: "morning", time: "07:00" },
  ]);
  assert.equal(validateSchedule(valid, now), true);
  assert.equal(shouldReplaceSchedule(valid, now), true);
  assert.equal(
    validateSchedule([{ ...valid[0], id: valid[0].id } , { ...valid[0] }], now),
    false
  );
  assert.equal(validateSchedule([{ ...valid[0], time: now }], now), false);
});

test("validates and creates versioned backups", () => {
  const payload = createBackupPayload({ theme: "dark", progress: "{}" });
  assert.equal(payload.version, BACKUP_SCHEMA_VERSION);
  assert.equal(validateBackupPayload(payload).valid, true);
  assert.equal(validateBackupPayload({ ...payload, version: 99 }).valid, false);
  assert.equal(
    validateBackupPayload({ ...payload, keys: { progress: null } }).valid,
    false
  );
});

test("supports multiple reminders without duplicate stable IDs", () => {
  const reminders = Array.from({ length: 4 }, (_, index) => ({
    key: `reminder-${index}`,
    time: `${String(7 + index).padStart(2, "0")}:15`,
  }));
  const schedule = buildDailySchedule(new Date(2026, 10, 10, 0, 0), reminders);
  assert.equal(new Set(schedule.map((entry) => entry.id)).size, 4);
  assert.equal(new Set(schedule.map((entry) => entry.key)).size, 4);
});

test("uses local date boundaries for midnight and timezone transitions", () => {
  const date = new Date(2026, 10, 10, 23, 59, 59);
  assert.equal(localDateKey(date), "2026-11-10");
  assert.equal(localDateKey(nextLocalMidnight(date)), "2026-11-11");
  assert.notEqual(
    stableNotificationId("azkar", "2026-11-10", "morning"),
    stableNotificationId("azkar", "2026-11-11", "morning")
  );
});

test("detects schedule replacement and preserves unchanged schedules", () => {
  const schedule = buildDailySchedule(new Date(2026, 10, 10, 0, 0), [
    { key: "morning", time: "07:00" },
  ]);
  assert.equal(hasScheduleChanged(schedule, schedule.map((entry) => ({ ...entry }))), false);
  assert.equal(hasScheduleChanged(schedule, [{ ...schedule[0], time: schedule[0].time + 60000 }]), true);
  assert.equal(hasScheduleChanged(schedule, []), true);
});
