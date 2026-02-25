// ========================================
// QURAN & KHATMAH FEATURE
// ========================================

// ===== CONSTANTS =====
const TOTAL_QURAN_PAGES = 604;
const QURAN_API_BASE = "https://api.alquran.cloud/v1/page";
const QURAN_EDITION = "quran-uthmani";

// ===== SURAH DATA (114 Surahs - Madina Mushaf) =====
const SURAH_DATA = [
  { number: 1, name: "الفاتحة", startPage: 1 },
  { number: 2, name: "البقرة", startPage: 2 },
  { number: 3, name: "آل عمران", startPage: 50 },
  { number: 4, name: "النساء", startPage: 77 },
  { number: 5, name: "المائدة", startPage: 106 },
  { number: 6, name: "الأنعام", startPage: 128 },
  { number: 7, name: "الأعراف", startPage: 151 },
  { number: 8, name: "الأنفال", startPage: 177 },
  { number: 9, name: "التوبة", startPage: 187 },
  { number: 10, name: "يونس", startPage: 208 },
  { number: 11, name: "هود", startPage: 221 },
  { number: 12, name: "يوسف", startPage: 235 },
  { number: 13, name: "الرعد", startPage: 249 },
  { number: 14, name: "إبراهيم", startPage: 255 },
  { number: 15, name: "الحجر", startPage: 262 },
  { number: 16, name: "النحل", startPage: 267 },
  { number: 17, name: "الإسراء", startPage: 282 },
  { number: 18, name: "الكهف", startPage: 293 },
  { number: 19, name: "مريم", startPage: 305 },
  { number: 20, name: "طه", startPage: 312 },
  { number: 21, name: "الأنبياء", startPage: 322 },
  { number: 22, name: "الحج", startPage: 332 },
  { number: 23, name: "المؤمنون", startPage: 342 },
  { number: 24, name: "النور", startPage: 350 },
  { number: 25, name: "الفرقان", startPage: 359 },
  { number: 26, name: "الشعراء", startPage: 367 },
  { number: 27, name: "النمل", startPage: 377 },
  { number: 28, name: "القصص", startPage: 385 },
  { number: 29, name: "العنكبوت", startPage: 396 },
  { number: 30, name: "الروم", startPage: 404 },
  { number: 31, name: "لقمان", startPage: 411 },
  { number: 32, name: "السجدة", startPage: 415 },
  { number: 33, name: "الأحزاب", startPage: 418 },
  { number: 34, name: "سبأ", startPage: 428 },
  { number: 35, name: "فاطر", startPage: 434 },
  { number: 36, name: "يس", startPage: 440 },
  { number: 37, name: "الصافات", startPage: 446 },
  { number: 38, name: "ص", startPage: 453 },
  { number: 39, name: "الزمر", startPage: 458 },
  { number: 40, name: "غافر", startPage: 467 },
  { number: 41, name: "فصلت", startPage: 477 },
  { number: 42, name: "الشورى", startPage: 483 },
  { number: 43, name: "الزخرف", startPage: 489 },
  { number: 44, name: "الدخان", startPage: 496 },
  { number: 45, name: "الجاثية", startPage: 499 },
  { number: 46, name: "الأحقاف", startPage: 502 },
  { number: 47, name: "محمد", startPage: 507 },
  { number: 48, name: "الفتح", startPage: 511 },
  { number: 49, name: "الحجرات", startPage: 515 },
  { number: 50, name: "ق", startPage: 518 },
  { number: 51, name: "الذاريات", startPage: 520 },
  { number: 52, name: "الطور", startPage: 523 },
  { number: 53, name: "النجم", startPage: 526 },
  { number: 54, name: "القمر", startPage: 528 },
  { number: 55, name: "الرحمن", startPage: 531 },
  { number: 56, name: "الواقعة", startPage: 534 },
  { number: 57, name: "الحديد", startPage: 537 },
  { number: 58, name: "المجادلة", startPage: 542 },
  { number: 59, name: "الحشر", startPage: 545 },
  { number: 60, name: "الممتحنة", startPage: 549 },
  { number: 61, name: "الصف", startPage: 551 },
  { number: 62, name: "الجمعة", startPage: 553 },
  { number: 63, name: "المنافقون", startPage: 554 },
  { number: 64, name: "التغابن", startPage: 556 },
  { number: 65, name: "الطلاق", startPage: 558 },
  { number: 66, name: "التحريم", startPage: 560 },
  { number: 67, name: "الملك", startPage: 562 },
  { number: 68, name: "القلم", startPage: 564 },
  { number: 69, name: "الحاقة", startPage: 566 },
  { number: 70, name: "المعارج", startPage: 568 },
  { number: 71, name: "نوح", startPage: 570 },
  { number: 72, name: "الجن", startPage: 572 },
  { number: 73, name: "المزمل", startPage: 574 },
  { number: 74, name: "المدثر", startPage: 575 },
  { number: 75, name: "القيامة", startPage: 577 },
  { number: 76, name: "الإنسان", startPage: 578 },
  { number: 77, name: "المرسلات", startPage: 580 },
  { number: 78, name: "النبأ", startPage: 582 },
  { number: 79, name: "النازعات", startPage: 583 },
  { number: 80, name: "عبس", startPage: 585 },
  { number: 81, name: "التكوير", startPage: 586 },
  { number: 82, name: "الانفطار", startPage: 587 },
  { number: 83, name: "المطففين", startPage: 587 },
  { number: 84, name: "الانشقاق", startPage: 589 },
  { number: 85, name: "البروج", startPage: 590 },
  { number: 86, name: "الطارق", startPage: 591 },
  { number: 87, name: "الأعلى", startPage: 591 },
  { number: 88, name: "الغاشية", startPage: 592 },
  { number: 89, name: "الفجر", startPage: 593 },
  { number: 90, name: "البلد", startPage: 594 },
  { number: 91, name: "الشمس", startPage: 595 },
  { number: 92, name: "الليل", startPage: 595 },
  { number: 93, name: "الضحى", startPage: 596 },
  { number: 94, name: "الشرح", startPage: 596 },
  { number: 95, name: "التين", startPage: 597 },
  { number: 96, name: "العلق", startPage: 597 },
  { number: 97, name: "القدر", startPage: 598 },
  { number: 98, name: "البينة", startPage: 598 },
  { number: 99, name: "الزلزلة", startPage: 599 },
  { number: 100, name: "العاديات", startPage: 599 },
  { number: 101, name: "القارعة", startPage: 600 },
  { number: 102, name: "التكاثر", startPage: 600 },
  { number: 103, name: "العصر", startPage: 601 },
  { number: 104, name: "الهمزة", startPage: 601 },
  { number: 105, name: "الفيل", startPage: 601 },
  { number: 106, name: "قريش", startPage: 602 },
  { number: 107, name: "الماعون", startPage: 602 },
  { number: 108, name: "الكوثر", startPage: 602 },
  { number: 109, name: "الكافرون", startPage: 603 },
  { number: 110, name: "النصر", startPage: 603 },
  { number: 111, name: "المسد", startPage: 603 },
  { number: 112, name: "الإخلاص", startPage: 604 },
  { number: 113, name: "الفلق", startPage: 604 },
  { number: 114, name: "الناس", startPage: 604 },
];

// ===== JUZ DATA (30 Juz - Madina Mushaf) =====
const JUZ_DATA = [
  { number: 1, startPage: 1, name: "الجزء الأول" },
  { number: 2, startPage: 22, name: "الجزء الثاني" },
  { number: 3, startPage: 42, name: "الجزء الثالث" },
  { number: 4, startPage: 62, name: "الجزء الرابع" },
  { number: 5, startPage: 82, name: "الجزء الخامس" },
  { number: 6, startPage: 102, name: "الجزء السادس" },
  { number: 7, startPage: 121, name: "الجزء السابع" },
  { number: 8, startPage: 142, name: "الجزء الثامن" },
  { number: 9, startPage: 162, name: "الجزء التاسع" },
  { number: 10, startPage: 182, name: "الجزء العاشر" },
  { number: 11, startPage: 201, name: "الجزء الحادي عشر" },
  { number: 12, startPage: 222, name: "الجزء الثاني عشر" },
  { number: 13, startPage: 242, name: "الجزء الثالث عشر" },
  { number: 14, startPage: 262, name: "الجزء الرابع عشر" },
  { number: 15, startPage: 282, name: "الجزء الخامس عشر" },
  { number: 16, startPage: 302, name: "الجزء السادس عشر" },
  { number: 17, startPage: 322, name: "الجزء السابع عشر" },
  { number: 18, startPage: 342, name: "الجزء الثامن عشر" },
  { number: 19, startPage: 362, name: "الجزء التاسع عشر" },
  { number: 20, startPage: 382, name: "الجزء العشرون" },
  { number: 21, startPage: 402, name: "الجزء الحادي والعشرون" },
  { number: 22, startPage: 422, name: "الجزء الثاني والعشرون" },
  { number: 23, startPage: 442, name: "الجزء الثالث والعشرون" },
  { number: 24, startPage: 462, name: "الجزء الرابع والعشرون" },
  { number: 25, startPage: 482, name: "الجزء الخامس والعشرون" },
  { number: 26, startPage: 502, name: "الجزء السادس والعشرون" },
  { number: 27, startPage: 522, name: "الجزء السابع والعشرون" },
  { number: 28, startPage: 542, name: "الجزء الثامن والعشرون" },
  { number: 29, startPage: 562, name: "الجزء التاسع والعشرون" },
  { number: 30, startPage: 582, name: "الجزء الثلاثون" },
];

// ===== UTILITY FUNCTIONS =====

/**
 * Convert number to Arabic-Indic numerals
 */
function toArabicNumber(num) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((d) => arabicDigits[parseInt(d)])
    .join("");
}

/**
 * Get the primary surah for a given page
 */
function getSurahForPage(page) {
  for (let i = SURAH_DATA.length - 1; i >= 0; i--) {
    if (SURAH_DATA[i].startPage <= page) {
      return SURAH_DATA[i];
    }
  }
  return SURAH_DATA[0];
}

/**
 * Get the juz for a given page
 */
function getJuzForPage(page) {
  for (let i = JUZ_DATA.length - 1; i >= 0; i--) {
    if (JUZ_DATA[i].startPage <= page) {
      return JUZ_DATA[i];
    }
  }
  return JUZ_DATA[0];
}

/**
 * Get the hizb quarter for a given page (approximate)
 */
function getHizbForPage(page) {
  return Math.ceil((page / TOTAL_QURAN_PAGES) * 60);
}

// ===== KHATMAH STATE MANAGEMENT =====

const KHATMAH_STORAGE_KEY = "tazkeer_khatmah";
const QURAN_PAGE_CACHE_PREFIX = "quran_page_cache_";
const QURAN_BOOKMARK_KEY = "tazkeer_quran_bookmark";

/**
 * Get default Khatmah state
 */
function getDefaultKhatmahState() {
  return {
    isActive: false,
    goalType: "days", // 'days' or 'pages'
    goalValue: 30,
    dailyTarget: 0,
    startDate: null,
    lastReadPage: 1,
    completedPages: [], // array of page numbers read
    bookmarkedPage: null,
    totalPagesRead: 0,
  };
}

/**
 * Load Khatmah state from localStorage
 */
function loadKhatmahState() {
  try {
    const saved = localStorage.getItem(KHATMAH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultKhatmahState(), ...parsed };
    }
  } catch (e) {
    console.error("Error loading khatmah state:", e);
  }
  return getDefaultKhatmahState();
}

/**
 * Save Khatmah state to localStorage
 */
function saveKhatmahState(state) {
  try {
    localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving khatmah state:", e);
  }
}

/**
 * Calculate daily pages based on goal
 */
function calculateDailyTarget(goalType, goalValue) {
  if (goalType === "days") {
    return Math.ceil(TOTAL_QURAN_PAGES / goalValue);
  }
  return goalValue; // pages per day
}

/**
 * Calculate estimated days to finish
 */
function calculateEstimatedDays(goalType, goalValue) {
  if (goalType === "days") {
    return goalValue;
  }
  return Math.ceil(TOTAL_QURAN_PAGES / goalValue); // pages per day
}

/**
 * Get Khatmah completion percentage
 */
function getKhatmahProgress(state) {
  if (!state.isActive) return 0;
  return Math.min(
    100,
    Math.round((state.totalPagesRead / TOTAL_QURAN_PAGES) * 100),
  );
}

/**
 * Get today's reading target info
 */
function getTodayTarget(state) {
  if (!state.isActive || !state.startDate) return { target: 0, read: 0 };

  const startDate = new Date(state.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const expectedPages = Math.min(
    (daysDiff + 1) * state.dailyTarget,
    TOTAL_QURAN_PAGES,
  );
  const todayStart = daysDiff * state.dailyTarget + 1;
  const todayEnd = Math.min(
    todayStart + state.dailyTarget - 1,
    TOTAL_QURAN_PAGES,
  );

  // Count pages read today (approximately - pages from todayStart to todayEnd)
  let todayRead = 0;
  for (let p = todayStart; p <= todayEnd; p++) {
    if (state.completedPages.includes(p)) {
      todayRead++;
    }
  }

  return {
    target: state.dailyTarget,
    read: todayRead,
    rangeStart: todayStart,
    rangeEnd: todayEnd,
    dayNumber: daysDiff + 1,
  };
}

/**
 * Get the current wird (daily reading portion) for the active khatmah
 */
function getCurrentWird(state) {
  if (!state.isActive) return null;
  const dt = state.dailyTarget;
  if (!dt || dt <= 0) return null;

  const wirdIndex = Math.floor(state.totalPagesRead / dt);
  const startPage = wirdIndex * dt + 1;
  const endPage = Math.min(startPage + dt - 1, TOTAL_QURAN_PAGES);

  if (startPage > TOTAL_QURAN_PAGES) {
    const lastWirdStart = (Math.ceil(TOTAL_QURAN_PAGES / dt) - 1) * dt + 1;
    return {
      wirdNumber: Math.ceil(TOTAL_QURAN_PAGES / dt),
      startPage: lastWirdStart,
      endPage: TOTAL_QURAN_PAGES,
      totalPages: TOTAL_QURAN_PAGES - lastWirdStart + 1,
      pagesRead: TOTAL_QURAN_PAGES - lastWirdStart + 1,
      isComplete: true,
      khatmahComplete: true,
    };
  }

  let pagesRead = 0;
  for (let p = startPage; p <= endPage; p++) {
    if (state.completedPages.includes(p)) pagesRead++;
  }

  return {
    wirdNumber: wirdIndex + 1,
    startPage,
    endPage,
    totalPages: endPage - startPage + 1,
    pagesRead,
    isComplete: pagesRead >= endPage - startPage + 1,
    khatmahComplete: state.totalPagesRead >= TOTAL_QURAN_PAGES,
  };
}

// ===== BOOKMARK MANAGEMENT =====

function loadBookmark() {
  try {
    const saved = localStorage.getItem(QURAN_BOOKMARK_KEY);
    return saved ? parseInt(saved) : null;
  } catch (e) {
    return null;
  }
}

function saveBookmark(page) {
  localStorage.setItem(QURAN_BOOKMARK_KEY, String(page));
}

function removeBookmark() {
  localStorage.removeItem(QURAN_BOOKMARK_KEY);
}

// ===== API & PAGE FETCHING =====

const pageCache = {};

/**
 * Fetch page text from AlQuran Cloud API (with caching)
 */
async function fetchPageText(pageNumber) {
  // Check memory cache
  if (pageCache[pageNumber]) return pageCache[pageNumber];

  // Check localStorage cache
  const cacheKey = QURAN_PAGE_CACHE_PREFIX + pageNumber;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      pageCache[pageNumber] = parsed;
      return parsed;
    }
  } catch (e) {
    /* ignore */
  }

  // Fetch from API
  const response = await fetch(
    `${QURAN_API_BASE}/${pageNumber}/${QURAN_EDITION}`,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  if (data.code !== 200 || !data.data || !data.data.ayahs) {
    throw new Error("Invalid API response");
  }

  const ayahs = data.data.ayahs.map((a) => {
    let text = a.text;
    // Strip embedded bismillah from first ayah of each surah (except Al-Fatiha & At-Tawbah)
    if (a.numberInSurah === 1 && a.surah.number !== 1 && a.surah.number !== 9) {
      // Normalize both strings to NFC so combining marks are in canonical order
      const norm = text.normalize("NFC");
      const bism = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".normalize("NFC");
      if (norm.startsWith(bism)) {
        text = norm.substring(bism.length).trim();
      }
    }
    return {
      number: a.number,
      text: text,
      numberInSurah: a.numberInSurah,
      surahNumber: a.surah.number,
      surahName:
        SURAH_DATA.find((s) => s.number === a.surah.number)?.name ||
        a.surah.name,
    };
  });

  // Cache results
  pageCache[pageNumber] = ayahs;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(ayahs));
  } catch (e) {
    /* storage full */
  }

  return ayahs;
}

/**
 * Render page text as Mushaf-style HTML
 */
function renderPageHTML(ayahs) {
  let html = "";
  let currentSurah = null;

  ayahs.forEach((ayah) => {
    if (currentSurah !== ayah.surahNumber) {
      currentSurah = ayah.surahNumber;

      // Show our styled bismillah and strip it from the API ayah text
      if (
        ayah.numberInSurah === 1 &&
        currentSurah !== 1 &&
        currentSurah !== 9
      ) {
        html += `<div class="bismillah-text">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>`;
      }
    }

    // Remove the API's embedded bismillah from the first ayah
    let text = ayah.text;

    html += `<span class="ayah-text">${text}</span>`;
    html += `<span class="ayah-number"> ﴿${toArabicNumber(ayah.numberInSurah)}﴾ </span>`;
  });

  return html;
}

// ===== QURAN VIEWER STATE =====

let quranViewerState = {
  currentPage: 1,
  isLoading: false,
  currentView: "setup", // 'setup', 'dashboard', 'reader', 'surah-list'
  mode: "free", // 'khatmah' or 'free'
  wirdStart: 1,
  wirdEnd: TOTAL_QURAN_PAGES,
};

let khatmahState = loadKhatmahState();

// ===== UI RENDERING FUNCTIONS =====

/**
 * Show the Quran page (called from category card click)
 */
function showQuranPage() {
  khatmahState = loadKhatmahState();

  if (quranViewerState.currentView === "reader") {
    renderMushafViewer();
  } else if (quranViewerState.currentView === "surah-list") {
    renderSurahList();
  } else if (khatmahState.isActive) {
    renderKhatmahDashboard();
  } else {
    renderKhatmahSetup();
  }
}

/**
 * Render Khatmah Setup Screen
 */
function renderKhatmahSetup() {
  quranViewerState.currentView = "setup";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  const bookmark = loadBookmark();
  const hasBookmark = bookmark !== null;

  container.innerHTML = `
    <div class="khatmah-setup">
      <div class="khatmah-setup-header">
        <h2><i class="fas fa-quran"></i> ابدأ ختمة جديدة</h2>
        <p>حدد هدفك وابدأ رحلتك مع القرآن الكريم</p>
      </div>

      <div class="khatmah-setup-card">
        <!-- Goal Type Selection -->
        <div class="goal-type-selector">
          <button class="goal-type-btn active" data-type="days" onclick="selectGoalType('days')">
            <i class="fas fa-calendar-alt"></i>
            <span class="goal-label">إنهاء في عدد أيام</span>
            <span class="goal-desc">حدد عدد الأيام لإتمام الختمة</span>
          </button>
          <button class="goal-type-btn" data-type="pages" onclick="selectGoalType('pages')">
            <i class="fas fa-file-alt"></i>
            <span class="goal-label">صفحات يومياً</span>
            <span class="goal-desc">حدد عدد الصفحات التي تقرأها يومياً</span>
          </button>
        </div>

        <!-- Goal Value Input -->
        <div class="goal-input-group">
          <label class="goal-input-label" id="goalInputLabel">عدد الأيام لإتمام الختمة</label>
          <div class="goal-input-wrapper">
            <input type="range" id="goalValueSlider" min="1" max="365" value="30"
              oninput="updateGoalPreview()" />
            <div class="goal-value-display" id="goalValueDisplay">30 يوم</div>
          </div>
        </div>

        <!-- Calculation Preview -->
        <div class="calculation-preview" id="calculationPreview">
          <div class="calc-row">
            <span>الصفحات اليومية المطلوبة</span>
            <span class="calc-value" id="calcDailyPages">21 صفحة</span>
          </div>
          <div class="calc-row">
            <span>الأجزاء اليومية تقريباً</span>
            <span class="calc-value" id="calcDailyJuz">جزء واحد</span>
          </div>
          <div class="calc-row">
            <span>الوقت المقدر يومياً</span>
            <span class="calc-value" id="calcDailyTime">~42 دقيقة</span>
          </div>
        </div>

        <!-- Start Button -->
        <button class="khatmah-start-btn" onclick="startKhatmah()">
          <i class="fas fa-play-circle"></i>
          ابدأ الختمة
        </button>

        <!-- Quick Read (no khatmah) -->
        <button class="quick-read-btn" onclick="renderSurahList()">
          <i class="fas fa-book-open"></i>
          قراءة حرة بدون ختمة
        </button>

        ${
          hasBookmark
            ? `<button class="quick-read-btn" onclick="openFreeReader(${bookmark})" style="margin-top:0.5rem;">
            <i class="fas fa-bookmark"></i>
            متابعة القراءة (صفحة ${bookmark})
          </button>`
            : ""
        }
      </div>
    </div>
  `;

  // Initialize calculation preview
  updateGoalPreview();
}

/**
 * Render Surah List for free reading mode
 */
function renderSurahList() {
  quranViewerState.currentView = "surah-list";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  const bookmark = loadBookmark();

  let html = `<div class="surah-list-view">
    <div class="surah-list-header">
      <h2><i class="fas fa-book-open"></i> \u0641\u0647\u0631\u0633 \u0627\u0644\u0633\u0648\u0631</h2>
      <p>\u0627\u062e\u062a\u0631 \u0633\u0648\u0631\u0629 \u0644\u0628\u062f\u0621 \u0627\u0644\u0642\u0631\u0627\u0621\u0629</p>
    </div>`;

  if (bookmark) {
    const bSurah = getSurahForPage(bookmark);
    html += `<button class="surah-bookmark-resume" onclick="openFreeReader(${bookmark})">
      <i class="fas fa-bookmark"></i>
      <span>\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0646 \u0635\u0641\u062d\u0629 ${toArabicNumber(bookmark)} - \u0633\u0648\u0631\u0629 ${bSurah.name}</span>
      <i class="fas fa-chevron-left"></i>
    </button>`;
  }

  html += `<div class="surah-list-grid">`;

  SURAH_DATA.forEach((surah, i) => {
    const endPage =
      i < SURAH_DATA.length - 1
        ? SURAH_DATA[i + 1].startPage - 1
        : TOTAL_QURAN_PAGES;
    const pageCount = endPage - surah.startPage + 1;
    html += `
      <button class="surah-list-card" onclick="openFreeReader(${surah.startPage})">
        <span class="surah-list-number">${toArabicNumber(surah.number)}</span>
        <div class="surah-list-info">
          <span class="surah-list-name">${surah.name}</span>
          <span class="surah-list-meta">\u0635\u0641\u062d\u0629 ${toArabicNumber(surah.startPage)} \u2022 ${toArabicNumber(pageCount)} \u0635\u0641\u062d\u0629</span>
        </div>
        <i class="fas fa-chevron-left surah-list-arrow"></i>
      </button>`;
  });

  html += `</div>`;
  html += `<button class="surah-list-back" onclick="renderKhatmahSetup()">
    <i class="fas fa-arrow-right"></i> \u0627\u0644\u0639\u0648\u062f\u0629
  </button>`;
  html += `</div>`;

  container.innerHTML = html;
}

/**
 * Open the Mushaf in free reading mode at a specific page
 */
function openFreeReader(page) {
  quranViewerState.mode = "free";
  quranViewerState.wirdStart = 1;
  quranViewerState.wirdEnd = TOTAL_QURAN_PAGES;
  quranViewerState.currentPage = page || 1;
  renderMushafViewer();
}

/**
 * Open the Mushaf in khatmah mode, restricted to current wird
 */
function openKhatmahReader() {
  khatmahState = loadKhatmahState();
  const wird = getCurrentWird(khatmahState);
  if (!wird || wird.khatmahComplete) return;

  quranViewerState.mode = "khatmah";
  quranViewerState.wirdStart = wird.startPage;
  quranViewerState.wirdEnd = wird.endPage;

  const lrp = khatmahState.lastReadPage;
  const resumePage =
    lrp >= wird.startPage && lrp <= wird.endPage ? lrp : wird.startPage;
  quranViewerState.currentPage = resumePage;
  renderMushafViewer();
}

/**
 * Called when user finishes reading all pages in a wird
 */
function completeWirdAndReturn() {
  if (typeof showNotification === "function") {
    showNotification(
      "\u0623\u062a\u0645\u0645\u062a \u0627\u0644\u0648\u0631\u062f! \u0628\u0627\u0631\u0643 \u0627\u0644\u0644\u0647 \u0641\u064a\u0643 \ud83c\udf1f",
    );
  }
  renderKhatmahDashboard();
}

/**
 * Render Khatmah Dashboard
 */
function renderKhatmahDashboard() {
  quranViewerState.currentView = "dashboard";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  khatmahState = loadKhatmahState();
  const progress = getKhatmahProgress(khatmahState);
  const wird = getCurrentWird(khatmahState);
  const totalWirds = Math.ceil(TOTAL_QURAN_PAGES / khatmahState.dailyTarget);

  // Calculate stroke-dashoffset for progress ring
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (progress / 100) * circumference;

  const daysElapsed = khatmahState.startDate
    ? Math.floor(
        (new Date() - new Date(khatmahState.startDate)) / (1000 * 60 * 60 * 24),
      ) + 1
    : 0;

  const estimatedDaysLeft =
    khatmahState.dailyTarget > 0
      ? Math.ceil(
          (TOTAL_QURAN_PAGES - khatmahState.totalPagesRead) /
            khatmahState.dailyTarget,
        )
      : 0;

  // Wird progress
  const wirdPercent = wird
    ? Math.min(100, Math.round((wird.pagesRead / wird.totalPages) * 100))
    : 0;
  const wirdSurahStart = wird ? getSurahForPage(wird.startPage) : null;
  const wirdSurahEnd = wird ? getSurahForPage(wird.endPage) : null;

  container.innerHTML = `
    <div class="khatmah-dashboard">
      <div class="khatmah-dashboard-header">
        <h2><i class="fas fa-quran"></i> \u062e\u062a\u0645\u062a\u0643</h2>
      </div>

      <!-- Progress Ring -->
      <div class="khatmah-progress-ring-container">
        <div class="progress-ring-wrapper">
          <svg class="progress-ring-svg" viewBox="0 0 200 200">
            <circle class="progress-ring-bg" cx="100" cy="100" r="80"></circle>
            <circle class="progress-ring-fill" cx="100" cy="100" r="80"
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}"></circle>
          </svg>
          <div class="progress-ring-text">
            <span class="progress-ring-percent">${progress}%</span>
            <span class="progress-ring-label">${khatmahState.totalPagesRead} / ${TOTAL_QURAN_PAGES} \u0635\u0641\u062d\u0629</span>
          </div>
        </div>
      </div>

      <!-- Current Wird Card -->
      ${
        wird && !wird.khatmahComplete
          ? `
      <div class="wird-card">
        <div class="wird-card-header">
          <h3><i class="fas fa-book-reader"></i> \u0627\u0644\u0648\u0631\u062f \u0627\u0644\u062d\u0627\u0644\u064a</h3>
          <span class="wird-badge">\u0627\u0644\u0648\u0631\u062f ${toArabicNumber(wird.wirdNumber)} \u0645\u0646 ${toArabicNumber(totalWirds)}</span>
        </div>
        <div class="wird-card-pages">
          \u0635\u0641\u062d\u0629 ${toArabicNumber(wird.startPage)} \u0625\u0644\u0649 ${toArabicNumber(wird.endPage)}
        </div>
        <div class="wird-card-surahs">
          ${wirdSurahStart && wirdSurahEnd ? (wirdSurahStart.name === wirdSurahEnd.name ? wirdSurahStart.name : `${wirdSurahStart.name} \u2014 ${wirdSurahEnd.name}`) : ""}
        </div>
        <div class="wird-card-progress">
          <div class="wird-card-progress-bar">
            <div class="wird-card-progress-fill" style="width: ${wirdPercent}%"></div>
          </div>
          <span class="wird-card-progress-text">${toArabicNumber(wird.pagesRead)} / ${toArabicNumber(wird.totalPages)} \u0635\u0641\u062d\u0629</span>
        </div>
        ${wird.isComplete ? `<div class="wird-complete-badge"><i class="fas fa-check-circle"></i> \u0623\u062a\u0645\u0645\u062a \u0647\u0630\u0627 \u0627\u0644\u0648\u0631\u062f</div>` : ""}
      </div>`
          : ""
      }

      ${
        wird && wird.khatmahComplete
          ? `
      <div class="khatmah-complete-card-dashboard">
        <div class="complete-icon">\ud83c\udf89</div>
        <h3>\u0623\u062a\u0645\u0645\u062a \u0627\u0644\u062e\u062a\u0645\u0629!</h3>
        <p>\u062a\u0642\u0628\u0644 \u0627\u0644\u0644\u0647 \u0645\u0646\u0643 \u0648\u062c\u0639\u0644\u0643 \u0645\u0646 \u0623\u0647\u0644 \u0627\u0644\u0642\u0631\u0622\u0646</p>
      </div>`
          : ""
      }

      <!-- Stats Grid -->
      <div class="khatmah-stats-grid">
        <div class="khatmah-stat-card">
          <i class="fas fa-file-alt"></i>
          <span class="khatmah-stat-value">${khatmahState.dailyTarget}</span>
          <span class="khatmah-stat-label">\u0635\u0641\u062d\u0629 / \u0648\u0631\u062f</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-calendar-check"></i>
          <span class="khatmah-stat-value">${daysElapsed}</span>
          <span class="khatmah-stat-label">\u064a\u0648\u0645 \u0645\u0636\u0649</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-hourglass-half"></i>
          <span class="khatmah-stat-value">${estimatedDaysLeft}</span>
          <span class="khatmah-stat-label">\u064a\u0648\u0645 \u0645\u062a\u0628\u0642\u064a</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-bookmark"></i>
          <span class="khatmah-stat-value">${khatmahState.lastReadPage}</span>
          <span class="khatmah-stat-label">\u0622\u062e\u0631 \u0635\u0641\u062d\u0629</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="khatmah-actions" style="margin-top: 1.5rem;">
        ${
          wird && !wird.khatmahComplete
            ? `
        <button class="khatmah-read-btn" onclick="openKhatmahReader()">
          <i class="fas fa-book-open"></i>
          ${wird.isComplete ? "\u0627\u0644\u0648\u0631\u062f \u0627\u0644\u062a\u0627\u0644\u064a" : "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0648\u0631\u062f"}
        </button>`
            : ""
        }
        <button class="khatmah-reset-btn" onclick="resetKhatmah()">
          <i class="fas fa-redo"></i>
          \u062e\u062a\u0645\u0629 \u062c\u062f\u064a\u062f\u0629
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Mushaf Viewer
 */
function renderMushafViewer() {
  quranViewerState.currentView = "reader";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  const page = quranViewerState.currentPage;
  const surah = getSurahForPage(page);
  const juz = getJuzForPage(page);
  const bookmark = loadBookmark();
  const isBookmarked = bookmark === page;

  // Mode-aware navigation boundaries
  const isKhatmahMode = quranViewerState.mode === "khatmah";
  const navStart = isKhatmahMode ? quranViewerState.wirdStart : 1;
  const navEnd = isKhatmahMode ? quranViewerState.wirdEnd : TOTAL_QURAN_PAGES;
  const wirdNum = isKhatmahMode
    ? Math.floor((navStart - 1) / khatmahState.dailyTarget) + 1
    : 0;
  const totalWirds = isKhatmahMode
    ? Math.ceil(TOTAL_QURAN_PAGES / khatmahState.dailyTarget)
    : 0;
  const wirdProgress = isKhatmahMode
    ? Math.round(((page - navStart + 1) / (navEnd - navStart + 1)) * 100)
    : khatmahState.isActive
      ? getKhatmahProgress(khatmahState)
      : Math.round((page / TOTAL_QURAN_PAGES) * 100);

  container.innerHTML = `
    <div class="mushaf-viewer">
      <!-- Top Bar -->
      <div class="mushaf-top-bar">
        <button class="mushaf-back-btn" onclick="exitMushafViewer()">
          <i class="fas fa-arrow-right"></i>
          \u0631\u062c\u0648\u0639
        </button>

        <div class="mushaf-font-controls">
          <span class="mushaf-font-label">\u062d\u062c\u0645 \u0627\u0644\u062e\u0637</span>
          <button class="mushaf-font-btn" onclick="changeMushafFont(-0.1)">
            <i class="fas fa-minus"></i>
          </button>
          <button class="mushaf-font-btn" onclick="changeMushafFont(0.1)">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <div class="mushaf-top-actions">
          <div class="mushaf-page-jump">
            <input type="number" id="pageJumpInput" min="${navStart}" max="${navEnd}"
              placeholder="${page}" onkeydown="handlePageJump(event)" />
            <button class="mushaf-page-jump-btn" onclick="jumpToPage()">
              \u0627\u0646\u062a\u0642\u0627\u0644
            </button>
          </div>
          <button class="mushaf-action-btn ${isBookmarked ? "bookmarked" : ""}"
            id="bookmarkBtn"
            onclick="toggleBookmark(${page})" title="\u0639\u0644\u0627\u0645\u0629 \u0645\u0631\u062c\u0639\u064a\u0629">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
      </div>

      ${
        isKhatmahMode
          ? `
      <!-- Wird Info Banner -->
      <div class="wird-banner">
        <span class="wird-banner-label">\u0627\u0644\u0648\u0631\u062f ${toArabicNumber(wirdNum)} \u0645\u0646 ${toArabicNumber(totalWirds)}</span>
        <span class="wird-banner-pages">\u0635\u0641\u062d\u0629 ${toArabicNumber(page - navStart + 1)} \u0645\u0646 ${toArabicNumber(navEnd - navStart + 1)}</span>
      </div>`
          : ""
      }

      <!-- Page Header -->
      <div class="mushaf-page-header">
        <span class="mushaf-surah-name">\u0633\u0648\u0631\u0629 ${surah.name}</span>
        <span class="mushaf-juz-info">\u0627\u0644\u062c\u0632\u0621 ${toArabicNumber(juz.number)}</span>
        <span class="mushaf-page-number">\u0635\u0641\u062d\u0629 ${toArabicNumber(page)}</span>
      </div>

      <!-- Page Content -->
      <div class="mushaf-page-container">
        <div class="mushaf-page-content" id="mushafPageContent">
          <div class="mushaf-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629...</p>
          </div>
        </div>
      </div>

      <!-- Page Footer with Nav & Progress -->
      <div class="mushaf-page-footer">
        <div class="mushaf-nav">
          <button class="mushaf-nav-btn" onclick="mushafNextPage()" ${
            page >= navEnd ? "disabled" : ""
          }>
            <i class="fas fa-chevron-right"></i>
            \u0627\u0644\u062a\u0627\u0644\u064a
          </button>
          <span class="mushaf-nav-current">${isKhatmahMode ? `${page - navStart + 1} / ${navEnd - navStart + 1}` : `${page} / ${TOTAL_QURAN_PAGES}`}</span>
          <button class="mushaf-nav-btn" onclick="mushafPrevPage()" ${
            page <= navStart ? "disabled" : ""
          }>
            \u0627\u0644\u0633\u0627\u0628\u0642
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
        ${
          isKhatmahMode && page >= navEnd
            ? `
        <button class="wird-complete-btn" onclick="completeWirdAndReturn()">
          <i class="fas fa-check-circle"></i> \u0623\u062a\u0645\u0645\u062a \u0627\u0644\u0648\u0631\u062f
        </button>`
            : ""
        }
        <div class="mushaf-progress">
          <div class="mushaf-progress-fill" style="width: ${wirdProgress}%"></div>
        </div>
      </div>
    </div>
  `;

  // Fetch and render page text
  loadMushafPageContent(page);

  // Setup swipe support
  setupMushafSwipe();
}

// ===== USER INTERACTION HANDLERS =====

/**
 * Select goal type in setup
 */
function selectGoalType(type) {
  // Update button states
  document.querySelectorAll(".goal-type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  // Update slider and label
  const slider = document.getElementById("goalValueSlider");
  const label = document.getElementById("goalInputLabel");

  if (type === "days") {
    slider.min = 1;
    slider.max = 365;
    slider.value = 30;
    label.textContent = "عدد الأيام لإتمام الختمة";
  } else {
    slider.min = 1;
    slider.max = 30;
    slider.value = 5;
    label.textContent = "عدد الصفحات اليومية";
  }

  // Store selected type
  document
    .querySelector(".khatmah-setup-card")
    .setAttribute("data-goal-type", type);

  updateGoalPreview();
}

/**
 * Update goal calculation preview
 */
function updateGoalPreview() {
  const activeType =
    document.querySelector(".goal-type-btn.active")?.dataset.type || "days";
  const slider = document.getElementById("goalValueSlider");
  const value = parseInt(slider.value);

  // Update display
  const display = document.getElementById("goalValueDisplay");
  if (activeType === "days") {
    display.textContent = `${value} يوم`;
  } else {
    display.textContent = `${value} صفحة`;
  }

  // Calculate
  const dailyPages = calculateDailyTarget(activeType, value);
  const estimatedDays = calculateEstimatedDays(activeType, value);
  const dailyJuz = dailyPages / 20; // ~20 pages per juz
  const dailyMinutes = Math.round(dailyPages * 2); // ~2 min per page

  // Update preview
  const calcDailyPages = document.getElementById("calcDailyPages");
  const calcDailyJuz = document.getElementById("calcDailyJuz");
  const calcDailyTime = document.getElementById("calcDailyTime");

  if (calcDailyPages) {
    calcDailyPages.textContent = `${dailyPages} صفحة`;
  }
  if (calcDailyJuz) {
    if (dailyJuz >= 1) {
      calcDailyJuz.textContent = `${dailyJuz.toFixed(1)} جزء`;
    } else {
      calcDailyJuz.textContent = `${Math.round(dailyJuz * 4)}/4 حزب`;
    }
  }
  if (calcDailyTime) {
    if (dailyMinutes >= 60) {
      const hours = Math.floor(dailyMinutes / 60);
      const mins = dailyMinutes % 60;
      calcDailyTime.textContent = `~${hours} ساعة${
        mins > 0 ? ` و ${mins} دقيقة` : ""
      }`;
    } else {
      calcDailyTime.textContent = `~${dailyMinutes} دقيقة`;
    }
  }
}

/**
 * Start a new Khatmah
 */
function startKhatmah() {
  const activeType =
    document.querySelector(".goal-type-btn.active")?.dataset.type || "days";
  const slider = document.getElementById("goalValueSlider");
  const value = parseInt(slider.value);

  const dailyTarget = calculateDailyTarget(activeType, value);

  khatmahState = {
    isActive: true,
    goalType: activeType,
    goalValue: value,
    dailyTarget: dailyTarget,
    startDate: new Date().toISOString(),
    lastReadPage: 1,
    completedPages: [],
    bookmarkedPage: null,
    totalPagesRead: 0,
  };

  saveKhatmahState(khatmahState);

  // Show notification
  if (typeof showNotification === "function") {
    showNotification(`تم بدء ختمة جديدة - ${dailyTarget} صفحة يومياً`);
  }

  // Show dashboard
  renderKhatmahDashboard();
}

/**
 * Reset Khatmah
 */
function resetKhatmah() {
  if (!confirm("هل أنت متأكد من إعادة تعيين الختمة؟ سيتم فقد كل التقدم.")) {
    return;
  }

  khatmahState = getDefaultKhatmahState();
  saveKhatmahState(khatmahState);

  if (typeof showNotification === "function") {
    showNotification("تم إعادة تعيين الختمة");
  }

  renderKhatmahSetup();
}

/**
 * Start quick read without Khatmah
 */
function startQuickRead(startPage) {
  renderSurahList();
}

/**
 * Open Mushaf Viewer at specific page (free mode)
 */
function openMushafViewer(page) {
  quranViewerState.mode = "free";
  quranViewerState.wirdStart = 1;
  quranViewerState.wirdEnd = TOTAL_QURAN_PAGES;
  quranViewerState.currentPage = page || 1;
  renderMushafViewer();
}

/**
 * Exit Mushaf Viewer back to appropriate screen
 */
function exitMushafViewer() {
  if (quranViewerState.mode === "khatmah" && khatmahState.isActive) {
    renderKhatmahDashboard();
  } else {
    renderSurahList();
  }
}

// ===== MUSHAF PAGE LOADING =====

/**
 * Load and render a Mushaf page
 */
async function loadMushafPageContent(pageNumber) {
  const contentEl = document.getElementById("mushafPageContent");
  if (!contentEl) return;

  quranViewerState.isLoading = true;

  contentEl.innerHTML = `
    <div class="mushaf-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل الصفحة...</p>
    </div>`;

  try {
    const ayahs = await fetchPageText(pageNumber);
    const html = renderPageHTML(ayahs);

    contentEl.innerHTML = html;
    contentEl.classList.add("mushaf-page-animate-in");

    setTimeout(() => {
      contentEl.classList.remove("mushaf-page-animate-in");
    }, 400);

    markPageAsRead(pageNumber);
  } catch (error) {
    console.error("Error loading page:", error);
    contentEl.innerHTML = `
      <div class="mushaf-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>تعذر تحميل الصفحة. تأكد من اتصالك بالإنترنت.</p>
        <button class="mushaf-error-retry" onclick="loadMushafPageContent(${pageNumber})">
          <i class="fas fa-redo"></i> إعادة المحاولة
        </button>
      </div>`;
  }

  quranViewerState.isLoading = false;
}

/**
 * Mark a page as read and update Khatmah progress
 */
function markPageAsRead(pageNumber) {
  if (khatmahState.isActive) {
    if (!khatmahState.completedPages.includes(pageNumber)) {
      khatmahState.completedPages.push(pageNumber);
      khatmahState.totalPagesRead = khatmahState.completedPages.length;
    }
    khatmahState.lastReadPage = pageNumber;
    saveKhatmahState(khatmahState);

    // Check if Khatmah is complete
    if (khatmahState.totalPagesRead >= TOTAL_QURAN_PAGES) {
      showKhatmahCompletion();
    }
  }
}

/**
 * Show Khatmah completion celebration
 */
function showKhatmahCompletion() {
  const overlay = document.createElement("div");
  overlay.className = "khatmah-complete-overlay";
  overlay.innerHTML = `
    <div class="khatmah-complete-card">
      <div class="complete-icon">🎉</div>
      <h3>مبروك! أتممت الختمة</h3>
      <p>تقبل الله منك وجعلك من أهل القرآن.<br>
      اللهم اجعل القرآن ربيع قلوبنا ونور صدورنا وجلاء أحزاننا وذهاب همومنا.</p>
      <button onclick="this.closest('.khatmah-complete-overlay').remove()">
        <i class="fas fa-check"></i> الحمد لله
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ===== PAGE NAVIGATION =====

/**
 * Go to next page (RTL: left to right means next page number)
 */
function mushafNextPage() {
  const maxPage =
    quranViewerState.mode === "khatmah"
      ? quranViewerState.wirdEnd
      : TOTAL_QURAN_PAGES;
  if (quranViewerState.isLoading || quranViewerState.currentPage >= maxPage)
    return;

  quranViewerState.currentPage++;
  navigateToCurrentPage("next");
}

/**
 * Go to previous page
 */
function mushafPrevPage() {
  const minPage =
    quranViewerState.mode === "khatmah" ? quranViewerState.wirdStart : 1;
  if (quranViewerState.isLoading || quranViewerState.currentPage <= minPage)
    return;

  quranViewerState.currentPage--;
  navigateToCurrentPage("prev");
}

/**
 * Navigate to current page with animation
 */
function navigateToCurrentPage(direction) {
  const page = quranViewerState.currentPage;
  const surah = getSurahForPage(page);
  const juz = getJuzForPage(page);
  const bookmark = loadBookmark();
  const isBookmarked = bookmark === page;

  // Mode-aware boundaries
  const isKhatmahMode = quranViewerState.mode === "khatmah";
  const navStart = isKhatmahMode ? quranViewerState.wirdStart : 1;
  const navEnd = isKhatmahMode ? quranViewerState.wirdEnd : TOTAL_QURAN_PAGES;
  const wirdProgress = isKhatmahMode
    ? Math.round(((page - navStart + 1) / (navEnd - navStart + 1)) * 100)
    : khatmahState.isActive
      ? getKhatmahProgress(khatmahState)
      : Math.round((page / TOTAL_QURAN_PAGES) * 100);

  // Update header
  const surahNameEl = document.querySelector(".mushaf-surah-name");
  const juzInfoEl = document.querySelector(".mushaf-juz-info");
  const pageNumberEl = document.querySelector(".mushaf-page-number");
  const navCurrentEl = document.querySelector(".mushaf-nav-current");
  const progressFillEl = document.querySelector(".mushaf-progress-fill");
  const bookmarkBtn = document.getElementById("bookmarkBtn");

  if (surahNameEl)
    surahNameEl.textContent = `\u0633\u0648\u0631\u0629 ${surah.name}`;
  if (juzInfoEl)
    juzInfoEl.textContent = `\u0627\u0644\u062c\u0632\u0621 ${toArabicNumber(juz.number)}`;
  if (pageNumberEl)
    pageNumberEl.textContent = `\u0635\u0641\u062d\u0629 ${toArabicNumber(page)}`;
  if (navCurrentEl)
    navCurrentEl.textContent = isKhatmahMode
      ? `${page - navStart + 1} / ${navEnd - navStart + 1}`
      : `${page} / ${TOTAL_QURAN_PAGES}`;
  if (progressFillEl) progressFillEl.style.width = `${wirdProgress}%`;

  // Update wird banner
  const wirdBannerPages = document.querySelector(".wird-banner-pages");
  if (wirdBannerPages) {
    wirdBannerPages.textContent = `\u0635\u0641\u062d\u0629 ${toArabicNumber(page - navStart + 1)} \u0645\u0646 ${toArabicNumber(navEnd - navStart + 1)}`;
  }

  // Update bookmark button
  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle("bookmarked", isBookmarked);
  }

  // Update nav button states
  const navBtns = document.querySelectorAll(".mushaf-nav-btn");
  if (navBtns[0]) navBtns[0].disabled = page >= navEnd;
  if (navBtns[1]) navBtns[1].disabled = page <= navStart;

  // Show/hide wird complete button
  const existingWirdBtn = document.querySelector(".wird-complete-btn");
  if (isKhatmahMode && page >= navEnd && !existingWirdBtn) {
    const footer = document.querySelector(".mushaf-page-footer");
    const progressBar = document.querySelector(".mushaf-progress");
    if (footer && progressBar) {
      const btn = document.createElement("button");
      btn.className = "wird-complete-btn";
      btn.innerHTML =
        '<i class="fas fa-check-circle"></i> \u0623\u062a\u0645\u0645\u062a \u0627\u0644\u0648\u0631\u062f';
      btn.onclick = completeWirdAndReturn;
      footer.insertBefore(btn, progressBar);
    }
  } else if (existingWirdBtn && page < navEnd) {
    existingWirdBtn.remove();
  }

  // Update page jump placeholder
  const jumpInput = document.getElementById("pageJumpInput");
  if (jumpInput) jumpInput.placeholder = page;

  // Add slide animation
  const contentEl = document.getElementById("mushafPageContent");
  if (contentEl) {
    contentEl.classList.add(
      direction === "next" ? "mushaf-slide-right" : "mushaf-slide-left",
    );
    setTimeout(() => {
      contentEl.classList.remove("mushaf-slide-right", "mushaf-slide-left");
    }, 400);
  }

  // Load new page content
  loadMushafPageContent(page);
}

/**
 * Jump to specific page number
 */
function jumpToPage() {
  const input = document.getElementById("pageJumpInput");
  if (!input) return;

  const page = parseInt(input.value);
  const minPage =
    quranViewerState.mode === "khatmah" ? quranViewerState.wirdStart : 1;
  const maxPage =
    quranViewerState.mode === "khatmah"
      ? quranViewerState.wirdEnd
      : TOTAL_QURAN_PAGES;

  if (isNaN(page) || page < minPage || page > maxPage) {
    if (typeof showNotification === "function") {
      showNotification(
        `\u0631\u0642\u0645 \u0635\u0641\u062d\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d (${minPage} - ${maxPage})`,
      );
    }
    return;
  }

  const prevPage = quranViewerState.currentPage;
  quranViewerState.currentPage = page;
  input.value = "";
  navigateToCurrentPage(page > prevPage ? "next" : "prev");
}

/**
 * Handle Enter key in page jump input
 */
function handlePageJump(event) {
  if (event.key === "Enter") {
    jumpToPage();
  }
}

// ===== BOOKMARK =====

/**
 * Toggle bookmark on current page
 */
function toggleBookmark(page) {
  const currentBookmark = loadBookmark();
  const bookmarkBtn = document.getElementById("bookmarkBtn");

  if (currentBookmark === page) {
    removeBookmark();
    if (bookmarkBtn) bookmarkBtn.classList.remove("bookmarked");
    if (typeof showNotification === "function") {
      showNotification("تم إزالة العلامة المرجعية");
    }
  } else {
    saveBookmark(page);
    if (bookmarkBtn) bookmarkBtn.classList.add("bookmarked");
    if (typeof showNotification === "function") {
      showNotification(`تم حفظ العلامة المرجعية - صفحة ${page}`);
    }
  }
}

// ===== FONT SIZE =====

let mushafFontSize = parseFloat(
  localStorage.getItem("mushafFontSize") || "1.5",
);

/**
 * Change Mushaf font size
 */
function changeMushafFont(delta) {
  mushafFontSize = Math.max(1.0, Math.min(2.5, mushafFontSize + delta));
  localStorage.setItem("mushafFontSize", mushafFontSize.toString());

  const contentEl = document.getElementById("mushafPageContent");
  if (contentEl) {
    contentEl.style.fontSize = mushafFontSize + "rem";
  }
}

// ===== SWIPE NAVIGATION =====

let mushafTouchStartX = 0;
let mushafTouchStartY = 0;
let mushafTouchEndX = 0;
let mushafTouchEndY = 0;

/**
 * Setup swipe gesture support for Mushaf viewer
 */
function setupMushafSwipe() {
  const viewer = document.querySelector(".mushaf-viewer");
  if (!viewer) return;

  // Remove old listeners to prevent duplicates
  viewer.removeEventListener("touchstart", mushafTouchStart);
  viewer.removeEventListener("touchend", mushafTouchEnd);

  viewer.addEventListener("touchstart", mushafTouchStart, { passive: true });
  viewer.addEventListener("touchend", mushafTouchEnd, { passive: true });
}

function mushafTouchStart(e) {
  mushafTouchStartX = e.changedTouches[0].screenX;
  mushafTouchStartY = e.changedTouches[0].screenY;
}

function mushafTouchEnd(e) {
  mushafTouchEndX = e.changedTouches[0].screenX;
  mushafTouchEndY = e.changedTouches[0].screenY;
  handleMushafSwipe();
}

function handleMushafSwipe() {
  const deltaX = mushafTouchEndX - mushafTouchStartX;
  const deltaY = Math.abs(mushafTouchEndY - mushafTouchStartY);
  const minSwipeDistance = 80;

  // Only handle horizontal swipes (not vertical scrolling)
  if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
    if (deltaX > 0) {
      // Swipe right → next page (RTL: right = forward)
      mushafNextPage();
    } else {
      // Swipe left → previous page (RTL: left = backward)
      mushafPrevPage();
    }
  }
}

// ===== KEYBOARD NAVIGATION =====

document.addEventListener("keydown", function (e) {
  // Only handle when Mushaf viewer is active
  if (quranViewerState.currentView !== "reader") return;

  const quranTab = document.getElementById("tab-quran");
  if (!quranTab || !quranTab.classList.contains("active-tab")) return;

  switch (e.key) {
    case "ArrowRight":
      e.preventDefault();
      mushafNextPage();
      break;
    case "ArrowLeft":
      e.preventDefault();
      mushafPrevPage();
      break;
    case "b":
    case "B":
      e.preventDefault();
      toggleBookmark(quranViewerState.currentPage);
      break;
    case "Escape":
      e.preventDefault();
      exitMushafViewer();
      break;
  }
});

// ===== TAB INTEGRATION =====

/**
 * Called by switchTab('tab-quran') in script.js
 */
function initQuranTab() {
  showQuranPage();
}

/**
 * Called by switchTab('tab-profile') in script.js
 */
function updateProfileTab() {
  khatmahState = loadKhatmahState();
  var content = document.getElementById("profileKhatmahContent");
  if (!content) return;

  if (!khatmahState.isActive) {
    content.innerHTML =
      '<p class="profile-empty-state">لم تبدأ ختمة بعد. اذهب إلى تبويب القرآن لبدء ختمة جديدة.</p>';
  } else {
    var progress = getKhatmahProgress(khatmahState);
    var daysElapsed = khatmahState.startDate
      ? Math.floor(
          (new Date() - new Date(khatmahState.startDate)) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;
    content.innerHTML = `
      <div class="profile-khatmah-progress">
        <div class="profile-khatmah-bar">
          <div class="profile-khatmah-fill" style="width:${progress}%"></div>
        </div>
        <div class="profile-khatmah-info">
          <span>${progress}% مكتمل</span>
          <span>${khatmahState.totalPagesRead} / ${TOTAL_QURAN_PAGES} صفحة</span>
        </div>
      </div>`;
  }

  // Update reading stats
  var totalDaysEl = document.getElementById("profileTotalDays");
  var pagesReadEl = document.getElementById("profilePagesRead");
  var currentPageEl = document.getElementById("profileCurrentPage");
  if (totalDaysEl) {
    var days = khatmahState.startDate
      ? Math.floor(
          (new Date() - new Date(khatmahState.startDate)) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;
    totalDaysEl.textContent = days;
  }
  if (pagesReadEl) pagesReadEl.textContent = khatmahState.totalPagesRead || 0;
  if (currentPageEl) currentPageEl.textContent = khatmahState.lastReadPage || 0;
}

/**
 * Initialize Quran feature (called on DOM ready)
 */
function initQuranFeature() {
  mushafFontSize = parseFloat(localStorage.getItem("mushafFontSize") || "1.5");
  khatmahState = loadKhatmahState();

  // Clear old page cache so bismillah-stripped text is fetched fresh
  const cacheCleared = localStorage.getItem("quran_cache_v3");
  if (!cacheCleared) {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(QURAN_PAGE_CACHE_PREFIX)) localStorage.removeItem(key);
    });
    localStorage.setItem("quran_cache_v3", "1");
  }

  // Preload first page in background
  if (navigator.onLine) {
    const bookmark = loadBookmark();
    const startPage =
      bookmark || (khatmahState.isActive ? khatmahState.lastReadPage : 1);
    fetchPageText(startPage).catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initQuranFeature, 200);
});
