// Prayer Times & Qibla Utility

export interface PrayerTimeItem {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  name: string;
  nameAr: string;
  time: string; // HH:MM (24h or 12h display)
  rawDate: Date;
  isNext: boolean;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default coordinates: Cairo, Egypt
export const DEFAULT_COORDS: Coordinates = {
  latitude: 30.0444,
  longitude: 31.2357,
};

// Kaaba coordinates
export const KAABA_COORDS: Coordinates = {
  latitude: 21.422487,
  longitude: 39.826206,
};

/**
 * Calculates Qibla direction (bearing in degrees from True North clockwise)
 */
export function calculateQiblaBearing(userCoords: Coordinates): number {
  const phi1 = (userCoords.latitude * Math.PI) / 180;
  const phi2 = (KAABA_COORDS.latitude * Math.PI) / 180;
  const deltaLambda = ((KAABA_COORDS.longitude - userCoords.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);

  let qibla = (Math.atan2(y, x) * 180) / Math.PI;
  qibla = (qibla + 360) % 360;
  return Math.round(qibla);
}

// Convert 24-hour string "HH:MM" to localized Arabic 12-hour string (e.g. "٠٤:٣٠ ص")
export function formatPrayerTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${hours}:${pad(minutes)} ${period}`;
}

/**
 * Basic offline astronomical prayer times calculation (Egyptian General Authority of Survey)
 */
export function calculateOfflinePrayers(date: Date, coords: Coordinates): PrayerTimeItem[] {
  const lat = coords.latitude;
  const lng = coords.longitude;

  // Day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Approximate solar declination and equation of time
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // in minutes
  const declination = 23.45 * Math.sin(((dayOfYear - 81) * 2 * Math.PI) / 365); // in degrees
  const decRad = (declination * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Solar noon (Dhuhr) in local time
  const timeZoneOffsetHours = -date.getTimezoneOffset() / 60;
  const noonMinutes = 720 - 4 * lng - eot + timeZoneOffsetHours * 60;

  // Helper for sun hour angle
  const calcHourAngle = (angle: number) => {
    const angleRad = (angle * Math.PI) / 180;
    const cosHA =
      (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad)) /
      (Math.cos(latRad) * Math.cos(decRad));
    if (cosHA > 1 || cosHA < -1) return null;
    return (Math.acos(cosHA) * 180) / Math.PI;
  };

  // Fajr: angle = -19.5 deg
  const fajrHA = calcHourAngle(-19.5) ?? 108;
  const fajrMin = noonMinutes - (fajrHA * 4);

  // Sunrise: angle = -0.833 deg
  const sunriseHA = calcHourAngle(-0.833) ?? 90;
  const sunriseMin = noonMinutes - (sunriseHA * 4);

  // Asr: shadow length = 1 + tan(|lat - dec|)
  const asrAlt = (Math.atan(1 / (1 + Math.tan(Math.abs(latRad - decRad)))) * 180) / Math.PI;
  const asrHA = calcHourAngle(asrAlt) ?? 50;
  const asrMin = noonMinutes + (asrHA * 4);

  // Maghrib: angle = -0.833 deg
  const maghribMin = noonMinutes + (sunriseHA * 4);

  // Isha: angle = -17.5 deg
  const ishaHA = calcHourAngle(-17.5) ?? 106;
  const ishaMin = noonMinutes + (ishaHA * 4);

  const createDate = (totalMinutes: number) => {
    const d = new Date(date);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    d.setHours(hrs, mins, 0, 0);
    return d;
  };

  const fajrDate = createDate(fajrMin);
  const sunriseDate = createDate(sunriseMin);
  const dhuhrDate = createDate(noonMinutes);
  const asrDate = createDate(asrMin);
  const maghribDate = createDate(maghribMin);
  const ishaDate = createDate(ishaMin);

  const rawPrayers: { id: PrayerTimeItem['id']; name: string; nameAr: string; rawDate: Date }[] = [
    { id: 'fajr', name: 'Fajr', nameAr: 'الفجر', rawDate: fajrDate },
    { id: 'sunrise', name: 'Sunrise', nameAr: 'الشروق', rawDate: sunriseDate },
    { id: 'dhuhr', name: 'Dhuhr', nameAr: 'الظهر', rawDate: dhuhrDate },
    { id: 'asr', name: 'Asr', nameAr: 'العصر', rawDate: asrDate },
    { id: 'maghrib', name: 'Maghrib', nameAr: 'المغرب', rawDate: maghribDate },
    { id: 'isha', name: 'Isha', nameAr: 'العشاء', rawDate: ishaDate },
  ];

  const now = new Date();
  let nextFound = false;

  return rawPrayers.map((p) => {
    let isNext = false;
    if (!nextFound && p.rawDate > now && p.id !== 'sunrise') {
      isNext = true;
      nextFound = true;
    }
    return {
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      time: formatPrayerTime(p.rawDate),
      rawDate: p.rawDate,
      isNext,
    };
  });
}

/**
 * Fetch prayer times from Aladhan API or fall back to calculation
 */
export async function getPrayerTimes(coords: Coordinates = DEFAULT_COORDS): Promise<PrayerTimeItem[]> {
  const now = new Date();
  const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=5`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const timings = data.data.timings;
      
      const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const prayerConfigs: { id: PrayerTimeItem['id']; name: string; nameAr: string; rawDate: Date }[] = [
        { id: 'fajr', name: 'Fajr', nameAr: 'الفجر', rawDate: parseTime(timings.Fajr) },
        { id: 'sunrise', name: 'Sunrise', nameAr: 'الشروق', rawDate: parseTime(timings.Sunrise) },
        { id: 'dhuhr', name: 'Dhuhr', nameAr: 'الظهر', rawDate: parseTime(timings.Dhuhr) },
        { id: 'asr', name: 'Asr', nameAr: 'العصر', rawDate: parseTime(timings.Asr) },
        { id: 'maghrib', name: 'Maghrib', nameAr: 'المغرب', rawDate: parseTime(timings.Maghrib) },
        { id: 'isha', name: 'Isha', nameAr: 'العشاء', rawDate: parseTime(timings.Isha) },
      ];

      let nextFound = false;
      return prayerConfigs.map((p) => {
        let isNext = false;
        if (!nextFound && p.rawDate > now && p.id !== 'sunrise') {
          isNext = true;
          nextFound = true;
        }
        return {
          id: p.id,
          name: p.name,
          nameAr: p.nameAr,
          time: formatPrayerTime(p.rawDate),
          rawDate: p.rawDate,
          isNext,
        };
      });
    }
  } catch {
    // API failed or offline - use offline calculation
  }

  return calculateOfflinePrayers(now, coords);
}

function toArabicDigits(val: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(val)
    .split('')
    .map((d) => (/\d/.test(d) ? arabicDigits[parseInt(d, 10)] : d))
    .join('');
}

/**
 * Arabic Hijri date formatting: DD / MM / YYYY MonthName
 * e.g. ٢٣ / ٠٣ / ١٤٤٨ ربيع الأول
 */
export function getFormattedHijriDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1448', 10);

    const dayStr = toArabicDigits(String(day).padStart(2, '0'));
    const monthStr = toArabicDigits(String(month).padStart(2, '0'));
    const yearStr = toArabicDigits(year);

    const nameFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      month: 'long',
    });
    const monthName = nameFormatter.format(date);

    return `${dayStr} / ${monthStr} / ${yearStr} ${monthName}`;
  } catch {
    return '٢٣ / ٠٣ / ١٤٤٨ ربيع الأول';
  }
}

/**
 * Arabic Gregorian date formatting: DD / MM / YYYY MonthName
 * e.g. ٠٥ / ٠٩ / ٢٠٢٦ سبتمبر
 */
export function getFormattedGregorianDate(date: Date = new Date()): string {
  try {
    const dayNum = date.getDate();
    const monthNum = date.getMonth() + 1;
    const yearNum = date.getFullYear();

    const dayStr = toArabicDigits(String(dayNum).padStart(2, '0'));
    const monthStr = toArabicDigits(String(monthNum).padStart(2, '0'));
    const yearStr = toArabicDigits(yearNum);

    const monthName = new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date);

    return `${dayStr} / ${monthStr} / ${yearStr} ${monthName}`;
  } catch {
    return '٠٥ / ٠٩ / ٢٠٢٦ سبتمبر';
  }
}
