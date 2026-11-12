const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function parseLocalTime(value) {
  const match = typeof value === "string" ? value.match(TIME_PATTERN) : null;
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function stableNotificationId(namespace, dateKey, reminderKey) {
  const hash = hashString(`${namespace}:${dateKey}:${reminderKey}`);
  return 10000 + (hash % 1000000000);
}

export function normalizeDailyReminders(reminders) {
  if (!Array.isArray(reminders)) return [];

  return reminders
    .filter((reminder) => reminder && reminder.enabled !== false)
    .map((reminder) => ({
      key: String(reminder.key || ""),
      time: String(reminder.time || ""),
      title: String(reminder.title || "تذكير الأذكار"),
      body: String(reminder.body || ""),
    }))
    .filter((reminder) => reminder.key && parseLocalTime(reminder.time));
}

export function buildDailySchedule(date, reminders, namespace = "azkar") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return [];

  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return normalizeDailyReminders(reminders).map((reminder) => {
    const time = parseLocalTime(reminder.time);
    const at = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.hours,
      time.minutes,
      0,
      0
    );

    return {
      id: stableNotificationId(namespace, dateKey, reminder.key),
      date: dateKey,
      time: at.getTime(),
      timeOfDay: reminder.time,
      key: reminder.key,
      title: reminder.title,
      body: reminder.body,
    };
  });
}

export function validateSchedule(schedule, now = Date.now()) {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;

  const ids = new Set();
  return schedule.every((entry) => {
    if (!entry || !Number.isInteger(entry.id) || ids.has(entry.id)) return false;
    if (!Number.isFinite(entry.time) || entry.time <= now) return false;
    if (!parseLocalTime(entry.timeOfDay)) return false;
    if (typeof entry.date !== "string" || !entry.date) return false;
    ids.add(entry.id);
    return true;
  });
}

export function shouldReplaceSchedule(nextSchedule, now = Date.now()) {
  return validateSchedule(nextSchedule, now);
}

export function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function nextLocalMidnight(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function hasScheduleChanged(previous, next) {
  if (!Array.isArray(previous) || !Array.isArray(next)) return true;
  if (previous.length !== next.length) return true;
  return previous.some((entry, index) => {
    const candidate = next[index];
    return !candidate ||
      entry.id !== candidate.id ||
      entry.time !== candidate.time ||
      entry.title !== candidate.title ||
      entry.body !== candidate.body;
  });
}
