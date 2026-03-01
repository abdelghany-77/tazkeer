// ========================================
// QURAN & KHATMAH FEATURE
// Pure Image-Based Mushaf Viewer
// ========================================

// ===== CONSTANTS =====
const TOTAL_QURAN_PAGES = 604;
const QURAN_IMAGE_BASE =
  "https://cdn.jsdelivr.net/gh/akram-seid/quran-hd-images@main/images";

// In-memory image cache for instant navigation
const imageCache = new Map();

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

function toArabicNumber(num) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((d) => arabicDigits[parseInt(d)])
    .join("");
}

function getSurahForPage(page) {
  for (let i = SURAH_DATA.length - 1; i >= 0; i--) {
    if (SURAH_DATA[i].startPage <= page) return SURAH_DATA[i];
  }
  return SURAH_DATA[0];
}

function getJuzForPage(page) {
  for (let i = JUZ_DATA.length - 1; i >= 0; i--) {
    if (JUZ_DATA[i].startPage <= page) return JUZ_DATA[i];
  }
  return JUZ_DATA[0];
}

function getHizbForPage(page) {
  return Math.ceil((page / TOTAL_QURAN_PAGES) * 60);
}

/**
 * Build the image URL for a given Mushaf page.
 */
function getPageImageUrl(pageNumber) {
  const padded = String(pageNumber).padStart(3, "0");
  return `${QURAN_IMAGE_BASE}/${padded}.jpg`;
}

// ===== KHATMAH STATE MANAGEMENT =====

const KHATMAH_STORAGE_KEY = "tazkeer_khatmah";
const QURAN_BOOKMARK_KEY = "tazkeer_quran_bookmark";

function getDefaultKhatmahState() {
  return {
    isActive: false,
    goalType: "days",
    goalValue: 30,
    dailyTarget: 0,
    startDate: null,
    lastReadPage: 1,
    completedPages: [],
    bookmarkedPage: null,
    totalPagesRead: 0,
  };
}

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

function saveKhatmahState(state) {
  try {
    localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving khatmah state:", e);
  }
}

function calculateDailyTarget(goalType, goalValue) {
  if (goalType === "days") return Math.ceil(TOTAL_QURAN_PAGES / goalValue);
  return goalValue;
}

function calculateEstimatedDays(goalType, goalValue) {
  if (goalType === "days") return goalValue;
  return Math.ceil(TOTAL_QURAN_PAGES / goalValue);
}

function getKhatmahProgress(state) {
  if (!state.isActive) return 0;
  const kStart = state.khatmahStartPage || 1;
  const totalPages = TOTAL_QURAN_PAGES - kStart + 1;
  return Math.min(100, Math.round((state.totalPagesRead / totalPages) * 100));
}

function getTodayTarget(state) {
  if (!state.isActive || !state.startDate) return { target: 0, read: 0 };
  const startDate = new Date(state.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const todayStart = daysDiff * state.dailyTarget + 1;
  const todayEnd = Math.min(
    todayStart + state.dailyTarget - 1,
    TOTAL_QURAN_PAGES,
  );
  let todayRead = 0;
  for (let p = todayStart; p <= todayEnd; p++) {
    if (state.completedPages.includes(p)) todayRead++;
  }
  return {
    target: state.dailyTarget,
    read: todayRead,
    rangeStart: todayStart,
    rangeEnd: todayEnd,
    dayNumber: daysDiff + 1,
  };
}

function getCurrentWird(state) {
  if (!state.isActive) return null;
  const dt = state.dailyTarget;
  if (!dt || dt <= 0) return null;

  const kStart = state.khatmahStartPage || 1;
  const totalPages = TOTAL_QURAN_PAGES - kStart + 1;

  const wirdIndex = Math.floor(state.totalPagesRead / dt);
  const startPage = kStart + wirdIndex * dt;
  const endPage = Math.min(startPage + dt - 1, TOTAL_QURAN_PAGES);

  if (startPage > TOTAL_QURAN_PAGES) {
    const totalWirds = Math.ceil(totalPages / dt);
    const lastWirdStart = kStart + (totalWirds - 1) * dt;
    return {
      wirdNumber: totalWirds,
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
    khatmahComplete: state.totalPagesRead >= totalPages,
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

// ===== IMAGE PRELOADER =====

/**
 * Load a page image, returning a promise. Uses in-memory cache.
 */
function loadPageImage(pageNumber) {
  const url = getPageImageUrl(pageNumber);
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Preload adjacent page images for smoother navigation.
 * Loads ±2 pages ahead and ±1 behind using idle callback.
 */
function preloadAdjacentPages(page) {
  const pagesToPreload = [page + 1, page + 2, page + 3, page - 1];
  const schedule =
    typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : setTimeout;

  pagesToPreload.forEach((p, i) => {
    if (p >= 1 && p <= TOTAL_QURAN_PAGES) {
      // Stagger preloads to avoid bandwidth contention
      schedule(() => loadPageImage(p), { timeout: 2000 + i * 500 });
    }
  });
}

// ===== UI RENDERING FUNCTIONS =====

/**
 * Show the Quran page (called from category card click)
 */
function showQuranPage() {
  khatmahState = loadKhatmahState();
  initMushafTheme();

  if (quranViewerState.currentView === "reader") {
    renderMushafViewer();
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
          <div class="goal-input-number-row">
            <button class="goal-adjust-btn" onclick="adjustGoalValue(-1)"><i class="fas fa-minus"></i></button>
            <input type="number" id="goalValueNumber" min="1" max="365" value="30"
              oninput="syncGoalFromNumber()" class="goal-number-input" />
            <button class="goal-adjust-btn" onclick="adjustGoalValue(1)"><i class="fas fa-plus"></i></button>
            <span class="goal-unit-label" id="goalUnitLabel">يوم</span>
          </div>
        </div>

        <!-- Juz Start Picker -->
        <div class="goal-input-group">
          <label class="goal-input-label">بداية الختمة</label>
          <div class="juz-start-picker">
            <button class="juz-start-btn active" data-start="1" onclick="selectStartJuz(1)">
              <i class="fas fa-book-open"></i> من البداية
            </button>
            <div class="juz-start-select-wrapper">
              <select id="juzStartSelect" class="juz-start-select" onchange="selectStartJuz(this.value)">
                <option value="0" selected disabled>اختر جزءاً</option>
                ${JUZ_DATA.map((j) => `<option value="${j.startPage}">${j.name} (ص ${j.startPage})</option>`).join("")}
              </select>
            </div>
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
      <h2><i class="fas fa-book-open"></i> فهرس السور</h2>
      <p>اختر سورة لبدء القراءة</p>
    </div>`;

  if (bookmark) {
    const bSurah = getSurahForPage(bookmark);
    html += `<button class="surah-bookmark-resume" onclick="openFreeReader(${bookmark})">
      <i class="fas fa-bookmark"></i>
      <span>متابعة من صفحة ${toArabicNumber(bookmark)} - سورة ${bSurah.name}</span>
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
          <span class="surah-list-meta">صفحة ${toArabicNumber(surah.startPage)} • ${toArabicNumber(pageCount)} صفحة</span>
        </div>
        <i class="fas fa-chevron-left surah-list-arrow"></i>
      </button>`;
  });

  html += `</div>`;
  html += `<button class="surah-list-back" onclick="showQuranPage()">
    <i class="fas fa-arrow-right"></i> العودة
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
    showNotification("أتممت الورد! بارك الله فيك 🌟");
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
  const kStart = khatmahState.khatmahStartPage || 1;
  const adjustedTotal = TOTAL_QURAN_PAGES - kStart + 1;
  const totalWirds = Math.ceil(adjustedTotal / khatmahState.dailyTarget);

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
          (adjustedTotal - khatmahState.totalPagesRead) /
            khatmahState.dailyTarget,
        )
      : 0;

  const wirdPercent = wird
    ? Math.min(100, Math.round((wird.pagesRead / wird.totalPages) * 100))
    : 0;
  const wirdSurahStart = wird ? getSurahForPage(wird.startPage) : null;
  const wirdSurahEnd = wird ? getSurahForPage(wird.endPage) : null;

  container.innerHTML = `
    <div class="khatmah-dashboard">

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
            <span class="progress-ring-label">${khatmahState.totalPagesRead} / ${adjustedTotal} صفحة</span>
          </div>
        </div>
      </div>

      <!-- Current Wird Card -->
      ${
        wird && !wird.khatmahComplete
          ? `
      <div class="wird-card">
        <div class="wird-card-header">
          <h3><i class="fas fa-book-reader"></i> الورد الحالي</h3>
          <span class="wird-badge">الورد ${toArabicNumber(wird.wirdNumber)} من ${toArabicNumber(totalWirds)}</span>
        </div>
        <div class="wird-card-pages">
          صفحة ${toArabicNumber(wird.startPage)} إلى ${toArabicNumber(wird.endPage)}
        </div>
        <div class="wird-card-surahs">
          ${wirdSurahStart && wirdSurahEnd ? (wirdSurahStart.name === wirdSurahEnd.name ? wirdSurahStart.name : `${wirdSurahStart.name} — ${wirdSurahEnd.name}`) : ""}
        </div>
        <div class="wird-card-progress">
          <div class="wird-card-progress-bar">
            <div class="wird-card-progress-fill" style="width: ${wirdPercent}%"></div>
          </div>
          <span class="wird-card-progress-text">${toArabicNumber(wird.pagesRead)} / ${toArabicNumber(wird.totalPages)} صفحة</span>
        </div>
        ${wird.isComplete ? `<div class="wird-complete-badge"><i class="fas fa-check-circle"></i> أتممت هذا الورد</div>` : ""}
      </div>`
          : ""
      }

      ${
        wird && wird.khatmahComplete
          ? `
      <div class="khatmah-complete-card-dashboard">
        <div class="complete-icon">🎉</div>
        <h3>أتممت الختمة!</h3>
        <p>تقبل الله منك وجعلك من أهل القرآن</p>
      </div>`
          : ""
      }

      <!-- Stats Grid -->
      <div class="khatmah-stats-grid">
        <div class="khatmah-stat-card">
          <i class="fas fa-file-alt"></i>
          <span class="khatmah-stat-value">${khatmahState.dailyTarget}</span>
          <span class="khatmah-stat-label">صفحة / ورد</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-calendar-check"></i>
          <span class="khatmah-stat-value">${daysElapsed}</span>
          <span class="khatmah-stat-label">يوم مضى</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-hourglass-half"></i>
          <span class="khatmah-stat-value">${estimatedDaysLeft}</span>
          <span class="khatmah-stat-label">يوم متبقي</span>
        </div>
        <div class="khatmah-stat-card">
          <i class="fas fa-bookmark"></i>
          <span class="khatmah-stat-value">${khatmahState.lastReadPage}</span>
          <span class="khatmah-stat-label">آخر صفحة</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="khatmah-actions" style="margin-top: 1.5rem;">
        ${
          wird && !wird.khatmahComplete
            ? `
        <button class="khatmah-read-btn" onclick="openKhatmahReader()">
          <i class="fas fa-book-open"></i>
          ${wird.isComplete ? "الورد التالي" : "متابعة الورد"}
        </button>`
            : ""
        }
        <button class="khatmah-reset-btn" onclick="resetKhatmah()">
          <i class="fas fa-redo"></i>
          ختمة جديدة
        </button>
      </div>
    </div>
  `;
}

// ============================================================
// IMAGE-BASED MUSHAF VIEWER
// ============================================================

/**
 * Render the full-screen image-based Mushaf viewer.
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
  const isKM = quranViewerState.mode === "khatmah";
  const navStart = isKM ? quranViewerState.wirdStart : 1;
  const navEnd = isKM ? quranViewerState.wirdEnd : TOTAL_QURAN_PAGES;
  const progressPercent = isKM
    ? Math.round(((page - navStart + 1) / (navEnd - navStart + 1)) * 100)
    : khatmahState.isActive
      ? getKhatmahProgress(khatmahState)
      : Math.round((page / TOTAL_QURAN_PAGES) * 100);

  // Wird info for banner
  const wirdNum = isKM
    ? Math.floor(
        (navStart - (khatmahState.khatmahStartPage || 1)) /
          khatmahState.dailyTarget,
      ) + 1
    : 0;
  const totalWirds = isKM
    ? Math.ceil(
        (TOTAL_QURAN_PAGES - (khatmahState.khatmahStartPage || 1) + 1) /
          khatmahState.dailyTarget,
      )
    : 0;
  const atWirdEnd = isKM && page >= navEnd;

  // Hide bottom nav for immersive reading
  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "none";

  const imageUrl = getPageImageUrl(page);

  container.innerHTML = `
    <div class="mushaf-container" id="mushafContainer">
      <!-- Header -->
      <div class="mushaf-header">
        <div class="mushaf-header-right">
          <button class="mushaf-back-btn" onclick="exitMushafViewer()" title="رجوع">
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <div class="mushaf-header-center">
          <span class="mushaf-surah-name">سورة ${surah.name}</span>
          <span class="mushaf-page-info">صفحة ${toArabicNumber(page)} · جزء ${toArabicNumber(juz.number)}</span>
        </div>
        <div class="mushaf-header-left">
          <button class="mushaf-action-btn" id="settingsBtn" onclick="toggleMushafSettings()" title="الإعدادات">
            <i class="fas fa-cog"></i>
          </button>
          <button class="mushaf-action-btn ${isBookmarked ? "bookmarked" : ""}"
            id="bookmarkBtn"
            onclick="toggleBookmark(${page})" title="علامة مرجعية">
            <i class="fas fa-bookmark"></i>
          </button>

          <!-- Settings Dropdown -->
          <div class="mushaf-settings-dropdown" id="mushafSettingsDropdown">
            <div class="settings-section">
              <span class="settings-section-label">المظهر</span>
              <button class="settings-theme-btn" onclick="toggleMushafTheme()">
                <i class="fas fa-${document.body.classList.contains("mushaf-dark-mode") ? "sun" : "moon"}" id="mushafThemeIcon"></i>
                <span>تبديل المظهر</span>
              </button>
            </div>
            <div class="settings-section">
              <span class="settings-section-label">انتقال لصفحة</span>
              <div class="settings-page-jump">
                <input type="number" id="pageJumpInput" min="${navStart}" max="${navEnd}"
                  placeholder="${page}" onkeydown="handlePageJump(event)" />
                <button class="settings-page-jump-btn" onclick="jumpToPage()">انتقال</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Area -->
      <div class="mushaf-image-area" id="mushafImageArea">
        <img
          class="mushaf-page-img loading"
          id="mushafPageImg"
          src="${imageUrl}"
          alt="صفحة ${page} من المصحف"
          draggable="false"
        />

        <!-- Tap Zones -->
        <div class="mushaf-tap-zone mushaf-tap-zone--next" id="tapZoneNext"></div>
        <div class="mushaf-tap-zone mushaf-tap-zone--prev" id="tapZonePrev"></div>

        <!-- Loading Overlay -->
        <div class="mushaf-loading-overlay" id="mushafLoading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>جاري تحميل الصفحة...</p>
        </div>
      </div>

      ${
        atWirdEnd
          ? `<button class="wird-complete-btn" onclick="completeWirdAndReturn()">
        <i class="fas fa-check-circle"></i> أتممت الورد
      </button>`
          : ""
      }

      <!-- Bottom Bar (Progress) -->
      <div class="mushaf-bottom-bar">
        <div class="mushaf-bottom-info">
          <span>${isKM ? `${page - navStart + 1} / ${navEnd - navStart + 1}` : `${page} / ${TOTAL_QURAN_PAGES}`}</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="mushaf-progress-track">
          <div class="mushaf-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
    </div>
  `;

  // Wait for image to load
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");

  if (imgEl) {
    // Check if image is already cached — show instantly
    const cachedUrl = getPageImageUrl(page);
    if (imageCache.has(cachedUrl)) {
      imgEl.classList.remove("loading");
      if (loadingEl) loadingEl.classList.add("hidden");
      quranViewerState.isLoading = false;
    } else {
      quranViewerState.isLoading = true;
      imgEl.onload = function () {
        imageCache.set(cachedUrl, imgEl);
        imgEl.classList.remove("loading");
        if (loadingEl) loadingEl.classList.add("hidden");
        quranViewerState.isLoading = false;
      };
      imgEl.onerror = function () {
        imgEl.classList.remove("loading");
        if (loadingEl) {
          loadingEl.innerHTML = `
            <div class="mushaf-error-overlay">
              <i class="fas fa-exclamation-triangle"></i>
              <p>تعذر تحميل الصفحة. تأكد من اتصالك بالإنترنت.</p>
              <button class="mushaf-error-retry" onclick="retryLoadPage()">
                <i class="fas fa-redo"></i> إعادة المحاولة
              </button>
            </div>`;
          loadingEl.classList.remove("hidden");
        }
        quranViewerState.isLoading = false;
      };
    }
  }

  // Mark page as read
  markPageAsRead(page);

  // Persist current page
  persistCurrentPage(page);

  // Preload adjacent pages
  preloadAdjacentPages(page);

  // Setup interactions
  setupTapNavigation();
  setupMushafSwipe();
}

/**
 * Retry loading the current page image.
 */
function retryLoadPage() {
  const page = quranViewerState.currentPage;
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");

  if (imgEl && loadingEl) {
    loadingEl.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل الصفحة...</p>`;
    loadingEl.classList.remove("hidden");
    imgEl.classList.add("loading");
    imgEl.src = getPageImageUrl(page) + "?t=" + Date.now();
  }
}

/**
 * Navigate to a new page (without full re-render).
 */
function navigateToPage(newPage, direction) {
  const isKM = quranViewerState.mode === "khatmah";
  const navStart = isKM ? quranViewerState.wirdStart : 1;
  const navEnd = isKM ? quranViewerState.wirdEnd : TOTAL_QURAN_PAGES;

  if (newPage < navStart || newPage > navEnd) return;

  quranViewerState.currentPage = newPage;

  const surah = getSurahForPage(newPage);
  const juz = getJuzForPage(newPage);
  const bookmark = loadBookmark();
  const isBookmarked = bookmark === newPage;

  const progressPercent = isKM
    ? Math.round(((newPage - navStart + 1) / (navEnd - navStart + 1)) * 100)
    : khatmahState.isActive
      ? getKhatmahProgress(khatmahState)
      : Math.round((newPage / TOTAL_QURAN_PAGES) * 100);

  // Update header
  const surahNameEl = document.querySelector(".mushaf-surah-name");
  const pageInfoEl = document.querySelector(".mushaf-page-info");
  if (surahNameEl) surahNameEl.textContent = `سورة ${surah.name}`;
  if (pageInfoEl)
    pageInfoEl.textContent = `صفحة ${toArabicNumber(newPage)} · جزء ${toArabicNumber(juz.number)}`;

  // Update bookmark
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle("bookmarked", isBookmarked);
    bookmarkBtn.setAttribute("onclick", `toggleBookmark(${newPage})`);
  }

  // Update wird banner
  const wirdBannerPages = document.querySelector(".wird-banner-pages");
  if (wirdBannerPages) {
    wirdBannerPages.textContent = `صفحة ${toArabicNumber(newPage - navStart + 1)} من ${toArabicNumber(navEnd - navStart + 1)}`;
  }

  // Update bottom info
  const bottomInfo = document.querySelector(".mushaf-bottom-info");
  if (bottomInfo) {
    bottomInfo.innerHTML = `
      <span>${isKM ? `${newPage - navStart + 1} / ${navEnd - navStart + 1}` : `${newPage} / ${TOTAL_QURAN_PAGES}`}</span>
      <span>${progressPercent}%</span>`;
  }

  // Update progress bar
  const progressFill = document.querySelector(".mushaf-progress-fill");
  if (progressFill) progressFill.style.width = `${progressPercent}%`;

  // Update page jump placeholder
  const jumpInput = document.getElementById("pageJumpInput");
  if (jumpInput) jumpInput.placeholder = newPage;

  // Show/hide wird complete button
  const atWirdEnd = isKM && newPage >= navEnd;
  let wirdBtn = document.querySelector(".wird-complete-btn");
  if (atWirdEnd && !wirdBtn) {
    const bottomBar = document.querySelector(".mushaf-bottom-bar");
    if (bottomBar) {
      const btn = document.createElement("button");
      btn.className = "wird-complete-btn";
      btn.innerHTML = '<i class="fas fa-check-circle"></i> أتممت الورد';
      btn.onclick = completeWirdAndReturn;
      bottomBar.parentNode.insertBefore(btn, bottomBar);
    }
  } else if (!atWirdEnd && wirdBtn) {
    wirdBtn.remove();
  }

  // Animate and swap image
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");
  const newUrl = getPageImageUrl(newPage);
  const isCached = imageCache.has(newUrl);

  if (imgEl) {
    // Apply flip animation
    const animClass = direction === "next" ? "flip-next" : "flip-prev";
    imgEl.classList.add(animClass);

    // If cached, swap instantly with just the flip animation (no loading spinner)
    if (isCached) {
      setTimeout(() => {
        imgEl.src = newUrl;
        imgEl.alt = `صفحة ${newPage} من المصحف`;
        imgEl.classList.remove(animClass);
      }, 150);
    } else {
      imgEl.classList.add("loading");
      if (loadingEl) loadingEl.classList.remove("hidden");
      quranViewerState.isLoading = true;

      // After animation start, swap src
      setTimeout(() => {
        imgEl.src = newUrl;
        imgEl.alt = `صفحة ${newPage} من المصحف`;

        imgEl.onload = function () {
          imageCache.set(newUrl, true);
          imgEl.classList.remove("loading");
          imgEl.classList.remove(animClass);
          if (loadingEl) loadingEl.classList.add("hidden");
          quranViewerState.isLoading = false;
        };
        imgEl.onerror = function () {
          imgEl.classList.remove("loading");
          imgEl.classList.remove(animClass);
          if (loadingEl) {
            loadingEl.innerHTML = `
              <div class="mushaf-error-overlay">
                <i class="fas fa-exclamation-triangle"></i>
                <p>تعذر تحميل الصفحة</p>
                <button class="mushaf-error-retry" onclick="retryLoadPage()">
                  <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
              </div>`;
            loadingEl.classList.remove("hidden");
          }
          quranViewerState.isLoading = false;
        };
      }, 150);
    }
  }

  // Mark page as read & persist
  markPageAsRead(newPage);
  persistCurrentPage(newPage);

  // Preload adjacent pages
  preloadAdjacentPages(newPage);
}

/**
 * Persist current page to localStorage for resume.
 */
function persistCurrentPage(page) {
  try {
    localStorage.setItem("tazkeer_mushaf_current_page", String(page));
  } catch (e) {
    /* ignore */
  }
}

// ===== PAGE NAVIGATION =====

function mushafNextPage() {
  const maxPage =
    quranViewerState.mode === "khatmah"
      ? quranViewerState.wirdEnd
      : TOTAL_QURAN_PAGES;
  if (quranViewerState.isLoading || quranViewerState.currentPage >= maxPage)
    return;
  navigateToPage(quranViewerState.currentPage + 1, "next");
}

function mushafPrevPage() {
  const minPage =
    quranViewerState.mode === "khatmah" ? quranViewerState.wirdStart : 1;
  if (quranViewerState.isLoading || quranViewerState.currentPage <= minPage)
    return;
  navigateToPage(quranViewerState.currentPage - 1, "prev");
}

// ===== TAP-TO-FLIP NAVIGATION =====

function setupTapNavigation() {
  const nextZone = document.getElementById("tapZoneNext");
  const prevZone = document.getElementById("tapZonePrev");

  if (nextZone) {
    nextZone.addEventListener("click", function (e) {
      createTapRipple(e, this);
      mushafNextPage();
    });
  }
  if (prevZone) {
    prevZone.addEventListener("click", function (e) {
      createTapRipple(e, this);
      mushafPrevPage();
    });
  }
}

function createTapRipple(event, zone) {
  const ripple = document.createElement("div");
  ripple.className = "mushaf-tap-ripple";
  const rect = zone.getBoundingClientRect();
  ripple.style.left = event.clientX - rect.left + "px";
  ripple.style.top = event.clientY - rect.top + "px";
  zone.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

// ===== SWIPE NAVIGATION =====

let mushafTouchStartX = 0;
let mushafTouchStartY = 0;
let mushafTouchEndX = 0;
let mushafTouchEndY = 0;

function setupMushafSwipe() {
  const imgArea = document.getElementById("mushafImageArea");
  if (!imgArea) return;

  imgArea.removeEventListener("touchstart", mushafTouchStart);
  imgArea.removeEventListener("touchend", mushafTouchEnd);

  imgArea.addEventListener("touchstart", mushafTouchStart, { passive: true });
  imgArea.addEventListener("touchend", mushafTouchEnd, { passive: true });
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

// ===== MARK PAGE AS READ =====

function markPageAsRead(pageNumber) {
  if (khatmahState.isActive) {
    if (!khatmahState.completedPages.includes(pageNumber)) {
      khatmahState.completedPages.push(pageNumber);
      khatmahState.totalPagesRead = khatmahState.completedPages.length;
    }
    khatmahState.lastReadPage = pageNumber;
    saveKhatmahState(khatmahState);

    // Check if Khatmah is complete
    const kStart = khatmahState.khatmahStartPage || 1;
    const kTotal = TOTAL_QURAN_PAGES - kStart + 1;
    if (khatmahState.totalPagesRead >= kTotal) {
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

// ===== USER INTERACTION HANDLERS =====

function selectGoalType(type) {
  document.querySelectorAll(".goal-type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const numInput = document.getElementById("goalValueNumber");
  const label = document.getElementById("goalInputLabel");
  const unitLabel = document.getElementById("goalUnitLabel");

  if (type === "days") {
    numInput.min = 1;
    numInput.max = 365;
    numInput.value = 30;
    label.textContent = "عدد الأيام لإتمام الختمة";
    unitLabel.textContent = "يوم";
  } else {
    numInput.min = 1;
    numInput.max = 30;
    numInput.value = 5;
    label.textContent = "عدد الصفحات اليومية";
    unitLabel.textContent = "صفحة";
  }

  document
    .querySelector(".khatmah-setup-card")
    ?.setAttribute("data-goal-type", type);
  updateGoalPreview();
}

function syncGoalFromNumber() {
  const numInput = document.getElementById("goalValueNumber");
  updateGoalPreview();
}

function adjustGoalValue(delta) {
  const numInput = document.getElementById("goalValueNumber");
  let val = parseInt(numInput.value) + delta;
  val = Math.max(parseInt(numInput.min), Math.min(parseInt(numInput.max), val));
  numInput.value = val;
  updateGoalPreview();
}

function selectStartJuz(startPage) {
  startPage = parseInt(startPage);
  const fromBeginBtn = document.querySelector('.juz-start-btn[data-start="1"]');
  const select = document.getElementById("juzStartSelect");

  if (startPage === 1) {
    fromBeginBtn?.classList.add("active");
    if (select) select.value = "0";
  } else {
    fromBeginBtn?.classList.remove("active");
    if (select) select.value = String(startPage);
  }

  document
    .querySelector(".khatmah-setup-card")
    ?.setAttribute("data-start-page", startPage);
  updateGoalPreview();
}

function updateGoalPreview() {
  const activeType =
    document.querySelector(".goal-type-btn.active")?.dataset.type || "days";
  const numInput = document.getElementById("goalValueNumber");
  const value = parseInt(numInput?.value || 30);

  const startPage = parseInt(
    document
      .querySelector(".khatmah-setup-card")
      ?.getAttribute("data-start-page") || "1",
  );
  const totalPages = TOTAL_QURAN_PAGES - startPage + 1;

  let dailyPages, estimatedDays;
  if (activeType === "days") {
    dailyPages = Math.ceil(totalPages / value);
    estimatedDays = value;
  } else {
    dailyPages = value;
    estimatedDays = Math.ceil(totalPages / value);
  }
  const dailyJuz = dailyPages / 20;
  const dailyMinutes = Math.round(dailyPages * 2);

  const calcDailyPages = document.getElementById("calcDailyPages");
  const calcDailyJuz = document.getElementById("calcDailyJuz");
  const calcDailyTime = document.getElementById("calcDailyTime");

  if (calcDailyPages) calcDailyPages.textContent = `${dailyPages} صفحة`;
  if (calcDailyJuz) {
    calcDailyJuz.textContent =
      dailyJuz >= 1
        ? `${dailyJuz.toFixed(1)} جزء`
        : `${Math.round(dailyJuz * 4)}/4 حزب`;
  }
  if (calcDailyTime) {
    if (dailyMinutes >= 60) {
      const hours = Math.floor(dailyMinutes / 60);
      const mins = dailyMinutes % 60;
      calcDailyTime.textContent = `~${hours} ساعة${mins > 0 ? ` و ${mins} دقيقة` : ""}`;
    } else {
      calcDailyTime.textContent = `~${dailyMinutes} دقيقة`;
    }
  }
}

function startKhatmah() {
  const activeType =
    document.querySelector(".goal-type-btn.active")?.dataset.type || "days";
  const numInput = document.getElementById("goalValueNumber");
  const value = parseInt(numInput?.value || 30);

  const khatmahStartPage = parseInt(
    document
      .querySelector(".khatmah-setup-card")
      ?.getAttribute("data-start-page") || "1",
  );
  const totalPages = TOTAL_QURAN_PAGES - khatmahStartPage + 1;
  const dailyTarget =
    activeType === "days" ? Math.ceil(totalPages / value) : value;

  khatmahState = {
    isActive: true,
    goalType: activeType,
    goalValue: value,
    dailyTarget: dailyTarget,
    startDate: new Date().toISOString(),
    lastReadPage: khatmahStartPage,
    khatmahStartPage: khatmahStartPage,
    completedPages: [],
    bookmarkedPage: null,
    totalPagesRead: 0,
  };

  saveKhatmahState(khatmahState);

  if (typeof showNotification === "function") {
    showNotification(`تم بدء ختمة جديدة - ${dailyTarget} صفحة يومياً`);
  }

  renderKhatmahDashboard();
}

function resetKhatmah() {
  if (!confirm("هل أنت متأكد من إعادة تعيين الختمة؟ سيتم فقد كل التقدم."))
    return;

  khatmahState = getDefaultKhatmahState();
  saveKhatmahState(khatmahState);

  if (typeof showNotification === "function") {
    showNotification("تم إعادة تعيين الختمة");
  }

  renderKhatmahSetup();
}

function openMushafViewer(page) {
  quranViewerState.mode = "free";
  quranViewerState.wirdStart = 1;
  quranViewerState.wirdEnd = TOTAL_QURAN_PAGES;
  quranViewerState.currentPage = page || 1;
  renderMushafViewer();
}

function exitMushafViewer() {
  // Restore bottom nav visibility
  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "";

  if (quranViewerState.mode === "khatmah" && khatmahState.isActive) {
    renderKhatmahDashboard();
  } else {
    renderSurahList();
  }
}

// ===== PAGE JUMP =====

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
      showNotification(`رقم صفحة غير صحيح (${minPage} - ${maxPage})`);
    }
    return;
  }

  const prevPage = quranViewerState.currentPage;
  input.value = "";
  toggleMushafSettings(); // close dropdown
  navigateToPage(page, page > prevPage ? "next" : "prev");
}

function handlePageJump(event) {
  if (event.key === "Enter") jumpToPage();
}

// ===== BOOKMARK =====

function toggleBookmark(page) {
  const currentBookmark = loadBookmark();
  const bookmarkBtn = document.getElementById("bookmarkBtn");

  if (currentBookmark === page) {
    removeBookmark();
    if (bookmarkBtn) bookmarkBtn.classList.remove("bookmarked");
    if (typeof showNotification === "function")
      showNotification("تم إزالة العلامة المرجعية");
  } else {
    saveBookmark(page);
    if (bookmarkBtn) bookmarkBtn.classList.add("bookmarked");
    if (typeof showNotification === "function")
      showNotification(`تم حفظ العلامة المرجعية - صفحة ${page}`);
  }
}

// ===== SETTINGS DROPDOWN =====

function initMushafTheme() {
  const savedTheme = localStorage.getItem("mushaf-theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.remove("mushaf-dark-mode");
  } else {
    document.body.classList.add("mushaf-dark-mode");
  }
}

function toggleMushafTheme() {
  const isDark = document.body.classList.toggle("mushaf-dark-mode");
  localStorage.setItem("mushaf-theme", isDark ? "dark" : "light");

  const icon = document.getElementById("mushafThemeIcon");
  if (icon) {
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
  }
}

function toggleMushafSettings() {
  const dropdown = document.getElementById("mushafSettingsDropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("mushafSettingsDropdown");
  const settingsBtn = document.getElementById("settingsBtn");
  if (dropdown && dropdown.classList.contains("show")) {
    if (
      !dropdown.contains(e.target) &&
      e.target !== settingsBtn &&
      !settingsBtn.contains(e.target)
    ) {
      dropdown.classList.remove("show");
    }
  }
});

// ===== KEYBOARD NAVIGATION =====

document.addEventListener("keydown", function (e) {
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

function initQuranTab() {
  showQuranPage();
}

function updateProfileTab() {
  khatmahState = loadKhatmahState();

  /* ── Khatmah ring in summary card ── */
  var progress = khatmahState.isActive ? getKhatmahProgress(khatmahState) : 0;
  var ring = document.getElementById("khatmahRing");
  var pctEl = document.getElementById("khatmahPct");
  if (ring) {
    var circumference = 2 * Math.PI * 34; // r = 34
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset =
      circumference - (circumference * progress) / 100;
  }
  if (pctEl) pctEl.textContent = progress + "%";

  /* ── Khatmah detail inside card ── */
  var content = document.getElementById("profileKhatmahContent");
  if (content) {
    if (!khatmahState.isActive) {
      content.innerHTML =
        '<p class="dash-empty">لم تبدأ ختمة بعد. اذهب إلى تبويب القرآن لبدء ختمة جديدة.</p>';
    } else {
      content.innerHTML = `
        <div class="profile-khatmah-progress">
          <div class="profile-khatmah-bar">
            <div class="profile-khatmah-fill" style="width:${progress}%"></div>
          </div>
          <div class="profile-khatmah-info">
            <span>${progress}% مكتمل</span>
            <span>${khatmahState.totalPagesRead} / ${TOTAL_QURAN_PAGES - (khatmahState.khatmahStartPage || 1) + 1} صفحة</span>
          </div>
        </div>`;
    }
  }

  /* ── Quran mini-stats ── */
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

// ===== INITIALIZATION =====

function initQuranFeature() {
  khatmahState = loadKhatmahState();
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initQuranFeature, 200);
});
