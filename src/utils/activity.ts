import { getItem, saveItem, getTodayDateKey } from './storage';

export interface DailyActivityRecord {
  quranPages: number;
  readPageNumbers: number[];
  adhkarCount: number;
  completedCategories: string[];
}

export type WeeklyActivityLog = Record<string, DailyActivityRecord>;

const STORAGE_KEY = 'tazkeer_weekly_activity_log';

export async function getActivityLog(): Promise<WeeklyActivityLog> {
  return await getItem<WeeklyActivityLog>(STORAGE_KEY, {});
}

export async function recordQuranPageRead(page: number): Promise<void> {
  const today = getTodayDateKey();
  const log = await getActivityLog();
  const current = log[today] || {
    quranPages: 0,
    readPageNumbers: [],
    adhkarCount: 0,
    completedCategories: [],
  };

  if (!current.readPageNumbers.includes(page)) {
    current.readPageNumbers.push(page);
    current.quranPages = current.readPageNumbers.length;
    log[today] = current;
    await saveItem(STORAGE_KEY, log);
  }
}

export async function recordAdhkarCompletion(categoryKey: string): Promise<void> {
  const today = getTodayDateKey();
  const log = await getActivityLog();
  const current = log[today] || {
    quranPages: 0,
    readPageNumbers: [],
    adhkarCount: 0,
    completedCategories: [],
  };

  if (!current.completedCategories.includes(categoryKey)) {
    current.completedCategories.push(categoryKey);
    current.adhkarCount = current.completedCategories.length;
    log[today] = current;
    await saveItem(STORAGE_KEY, log);
  }
}

export interface DayActivityData {
  id: string;
  name: string;
  dateKey: string;
  dayIndex: number;
  quranPages: number;
  adhkarCount: number;
  isToday: boolean;
}

export function getWeekDayDates(): { dateKey: string; name: string; dayIndex: number }[] {
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Arabic week starts on Saturday (index 6)
  // Distance from Saturday: if current is Sat (6) -> 0 days back; if Sun (0) -> 1 day back; Mon (1) -> 2 days back...
  const daysSinceSaturday = (currentDayIndex + 1) % 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() - daysSinceSaturday);

  const days: { dateKey: string; name: string; dayIndex: number }[] = [];
  const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    days.push({
      dateKey,
      name: dayNames[(d.getDay() + 1) % 7], // Saturday = 0 in array
      dayIndex: d.getDay(),
    });
  }

  return days;
}
