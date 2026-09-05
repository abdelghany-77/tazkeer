import type { SurahMeta, JuzMeta } from '@/types';

export const TOTAL_QURAN_PAGES = 604;

export const QURAN_IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/akram-seid/quran-hd-images@main/images';

export function getPageImageUrl(pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return `${QURAN_IMAGE_BASE}/${padded}.jpg`;
}

export function toArabicNumber(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((d) => arabicDigits[parseInt(d)] ?? d)
    .join('');
}

export const SURAH_DATA: SurahMeta[] = [
  { number: 1, name: 'الفاتحة', startPage: 1 },
  { number: 2, name: 'البقرة', startPage: 2 },
  { number: 3, name: 'آل عمران', startPage: 50 },
  { number: 4, name: 'النساء', startPage: 77 },
  { number: 5, name: 'المائدة', startPage: 106 },
  { number: 6, name: 'الأنعام', startPage: 128 },
  { number: 7, name: 'الأعراف', startPage: 151 },
  { number: 8, name: 'الأنفال', startPage: 177 },
  { number: 9, name: 'التوبة', startPage: 187 },
  { number: 10, name: 'يونس', startPage: 208 },
  { number: 11, name: 'هود', startPage: 221 },
  { number: 12, name: 'يوسف', startPage: 235 },
  { number: 13, name: 'الرعد', startPage: 249 },
  { number: 14, name: 'إبراهيم', startPage: 255 },
  { number: 15, name: 'الحجر', startPage: 262 },
  { number: 16, name: 'النحل', startPage: 267 },
  { number: 17, name: 'الإسراء', startPage: 282 },
  { number: 18, name: 'الكهف', startPage: 293 },
  { number: 19, name: 'مريم', startPage: 305 },
  { number: 20, name: 'طه', startPage: 312 },
  { number: 21, name: 'الأنبياء', startPage: 322 },
  { number: 22, name: 'الحج', startPage: 332 },
  { number: 23, name: 'المؤمنون', startPage: 342 },
  { number: 24, name: 'النور', startPage: 350 },
  { number: 25, name: 'الفرقان', startPage: 359 },
  { number: 26, name: 'الشعراء', startPage: 367 },
  { number: 27, name: 'النمل', startPage: 377 },
  { number: 28, name: 'القصص', startPage: 385 },
  { number: 29, name: 'العنكبوت', startPage: 396 },
  { number: 30, name: 'الروم', startPage: 404 },
  { number: 31, name: 'لقمان', startPage: 411 },
  { number: 32, name: 'السجدة', startPage: 415 },
  { number: 33, name: 'الأحزاب', startPage: 418 },
  { number: 34, name: 'سبأ', startPage: 428 },
  { number: 35, name: 'فاطر', startPage: 434 },
  { number: 36, name: 'يس', startPage: 440 },
  { number: 37, name: 'الصافات', startPage: 446 },
  { number: 38, name: 'ص', startPage: 453 },
  { number: 39, name: 'الزمر', startPage: 458 },
  { number: 40, name: 'غافر', startPage: 467 },
  { number: 41, name: 'فصلت', startPage: 477 },
  { number: 42, name: 'الشورى', startPage: 483 },
  { number: 43, name: 'الزخرف', startPage: 489 },
  { number: 44, name: 'الدخان', startPage: 496 },
  { number: 45, name: 'الجاثية', startPage: 499 },
  { number: 46, name: 'الأحقاف', startPage: 502 },
  { number: 47, name: 'محمد', startPage: 507 },
  { number: 48, name: 'الفتح', startPage: 511 },
  { number: 49, name: 'الحجرات', startPage: 515 },
  { number: 50, name: 'ق', startPage: 518 },
  { number: 51, name: 'الذاريات', startPage: 520 },
  { number: 52, name: 'الطور', startPage: 523 },
  { number: 53, name: 'النجم', startPage: 526 },
  { number: 54, name: 'القمر', startPage: 528 },
  { number: 55, name: 'الرحمن', startPage: 531 },
  { number: 56, name: 'الواقعة', startPage: 534 },
  { number: 57, name: 'الحديد', startPage: 537 },
  { number: 58, name: 'المجادلة', startPage: 542 },
  { number: 59, name: 'الحشر', startPage: 545 },
  { number: 60, name: 'الممتحنة', startPage: 549 },
  { number: 61, name: 'الصف', startPage: 551 },
  { number: 62, name: 'الجمعة', startPage: 553 },
  { number: 63, name: 'المنافقون', startPage: 554 },
  { number: 64, name: 'التغابن', startPage: 556 },
  { number: 65, name: 'الطلاق', startPage: 558 },
  { number: 66, name: 'التحريم', startPage: 560 },
  { number: 67, name: 'الملك', startPage: 562 },
  { number: 68, name: 'القلم', startPage: 564 },
  { number: 69, name: 'الحاقة', startPage: 566 },
  { number: 70, name: 'المعارج', startPage: 568 },
  { number: 71, name: 'نوح', startPage: 570 },
  { number: 72, name: 'الجن', startPage: 572 },
  { number: 73, name: 'المزمل', startPage: 574 },
  { number: 74, name: 'المدثر', startPage: 575 },
  { number: 75, name: 'القيامة', startPage: 577 },
  { number: 76, name: 'الإنسان', startPage: 578 },
  { number: 77, name: 'المرسلات', startPage: 580 },
  { number: 78, name: 'النبأ', startPage: 582 },
  { number: 79, name: 'النازعات', startPage: 583 },
  { number: 80, name: 'عبس', startPage: 585 },
  { number: 81, name: 'التكوير', startPage: 586 },
  { number: 82, name: 'الانفطار', startPage: 587 },
  { number: 83, name: 'المطففين', startPage: 587 },
  { number: 84, name: 'الانشقاق', startPage: 589 },
  { number: 85, name: 'البروج', startPage: 590 },
  { number: 86, name: 'الطارق', startPage: 591 },
  { number: 87, name: 'الأعلى', startPage: 591 },
  { number: 88, name: 'الغاشية', startPage: 592 },
  { number: 89, name: 'الفجر', startPage: 593 },
  { number: 90, name: 'البلد', startPage: 594 },
  { number: 91, name: 'الشمس', startPage: 595 },
  { number: 92, name: 'الليل', startPage: 595 },
  { number: 93, name: 'الضحى', startPage: 596 },
  { number: 94, name: 'الشرح', startPage: 596 },
  { number: 95, name: 'التين', startPage: 597 },
  { number: 96, name: 'العلق', startPage: 597 },
  { number: 97, name: 'القدر', startPage: 598 },
  { number: 98, name: 'البينة', startPage: 598 },
  { number: 99, name: 'الزلزلة', startPage: 599 },
  { number: 100, name: 'العاديات', startPage: 599 },
  { number: 101, name: 'القارعة', startPage: 600 },
  { number: 102, name: 'التكاثر', startPage: 600 },
  { number: 103, name: 'العصر', startPage: 601 },
  { number: 104, name: 'الهمزة', startPage: 601 },
  { number: 105, name: 'الفيل', startPage: 601 },
  { number: 106, name: 'قريش', startPage: 602 },
  { number: 107, name: 'الماعون', startPage: 602 },
  { number: 108, name: 'الكوثر', startPage: 602 },
  { number: 109, name: 'الكافرون', startPage: 603 },
  { number: 110, name: 'النصر', startPage: 603 },
  { number: 111, name: 'المسد', startPage: 603 },
  { number: 112, name: 'الإخلاص', startPage: 604 },
  { number: 113, name: 'الفلق', startPage: 604 },
  { number: 114, name: 'الناس', startPage: 604 },
];

export const JUZ_DATA: JuzMeta[] = [
  { number: 1, startPage: 1, name: 'الجزء الأول' },
  { number: 2, startPage: 22, name: 'الجزء الثاني' },
  { number: 3, startPage: 42, name: 'الجزء الثالث' },
  { number: 4, startPage: 62, name: 'الجزء الرابع' },
  { number: 5, startPage: 82, name: 'الجزء الخامس' },
  { number: 6, startPage: 102, name: 'الجزء السادس' },
  { number: 7, startPage: 121, name: 'الجزء السابع' },
  { number: 8, startPage: 142, name: 'الجزء الثامن' },
  { number: 9, startPage: 162, name: 'الجزء التاسع' },
  { number: 10, startPage: 182, name: 'الجزء العاشر' },
  { number: 11, startPage: 201, name: 'الجزء الحادي عشر' },
  { number: 12, startPage: 222, name: 'الجزء الثاني عشر' },
  { number: 13, startPage: 242, name: 'الجزء الثالث عشر' },
  { number: 14, startPage: 262, name: 'الجزء الرابع عشر' },
  { number: 15, startPage: 282, name: 'الجزء الخامس عشر' },
  { number: 16, startPage: 302, name: 'الجزء السادس عشر' },
  { number: 17, startPage: 322, name: 'الجزء السابع عشر' },
  { number: 18, startPage: 342, name: 'الجزء الثامن عشر' },
  { number: 19, startPage: 362, name: 'الجزء التاسع عشر' },
  { number: 20, startPage: 382, name: 'الجزء العشرون' },
  { number: 21, startPage: 402, name: 'الجزء الحادي والعشرون' },
  { number: 22, startPage: 422, name: 'الجزء الثاني والعشرون' },
  { number: 23, startPage: 442, name: 'الجزء الثالث والعشرون' },
  { number: 24, startPage: 462, name: 'الجزء الرابع والعشرون' },
  { number: 25, startPage: 482, name: 'الجزء الخامس والعشرون' },
  { number: 26, startPage: 502, name: 'الجزء السادس والعشرون' },
  { number: 27, startPage: 522, name: 'الجزء السابع والعشرون' },
  { number: 28, startPage: 542, name: 'الجزء الثامن والعشرون' },
  { number: 29, startPage: 562, name: 'الجزء التاسع والعشرون' },
  { number: 30, startPage: 582, name: 'الجزء الثلاثون' },
];

export function getSurahForPage(page: number): SurahMeta {
  for (let i = SURAH_DATA.length - 1; i >= 0; i--) {
    if (SURAH_DATA[i].startPage <= page) return SURAH_DATA[i];
  }
  return SURAH_DATA[0];
}

export function getJuzForPage(page: number): JuzMeta {
  for (let i = JUZ_DATA.length - 1; i >= 0; i--) {
    if (JUZ_DATA[i].startPage <= page) return JUZ_DATA[i];
  }
  return JUZ_DATA[0];
}

export function getSurahByNumber(surahNumber: number): SurahMeta | undefined {
  return SURAH_DATA.find((s) => s.number === surahNumber);
}

export function getSurahEndPage(surahNumber: number): number {
  if (surahNumber >= 114) return TOTAL_QURAN_PAGES;
  const nextSurah = SURAH_DATA.find((s) => s.number === surahNumber + 1);
  return nextSurah ? Math.max(nextSurah.startPage - 1, 1) : TOTAL_QURAN_PAGES;
}

export function getSurahPageRange(surahNumber: number): { startPage: number; endPage: number; totalPages: number } {
  const surah = getSurahByNumber(surahNumber);
  const startPage = surah ? surah.startPage : 1;
  const endPage = getSurahEndPage(surahNumber);
  return {
    startPage,
    endPage,
    totalPages: Math.max(1, endPage - startPage + 1),
  };
}

