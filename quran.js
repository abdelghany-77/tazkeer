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

// ===== ARABIC SEARCH NORMALIZATION =====
function normalizeArabic(str) {
  if (!str) return "";
  return str
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)) // Convert Eastern Arabic digits to Western digits
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // Remove tashkeel (diacritics) & tatweel
    .replace(/[أإآٱ]/g, "ا")             // Normalize alef
    .replace(/ة/g, "ه")                  // Normalize taa marbouta
    .replace(/ى/g, "ي")                  // Normalize alef maqsura
    .trim()
    .toLowerCase();
}

// ===== QURAN BULK OFFLINE DOWNLOAD MANAGER =====
const QURAN_CACHE_NAME_JS = "tazkeer-quran-pages-v1";

const quranOfflineState = {
  status: "idle", // 'idle' | 'downloading' | 'paused' | 'completed'
  downloadedPages: 0,
  totalPages: TOTAL_QURAN_PAGES,
  isChecking: false,
};

/**
 * Check how many Quran pages are currently cached in CacheStorage.
 */
async function checkOfflineQuranStatus() {
  if (quranOfflineState.isChecking) return;
  quranOfflineState.isChecking = true;

  try {
    if ('caches' in window) {
      const cache = await caches.open(QURAN_CACHE_NAME_JS);
      const keys = await cache.keys();
      let cachedCount = 0;

      for (const req of keys) {
        if (req.url.includes("quran-hd-images") || req.url.match(/\/\d{3}\.jpg/)) {
          cachedCount++;
        }
      }

      quranOfflineState.downloadedPages = Math.min(cachedCount, TOTAL_QURAN_PAGES);
      if (quranOfflineState.downloadedPages >= TOTAL_QURAN_PAGES) {
        quranOfflineState.status = "completed";
      } else if (quranOfflineState.status !== "downloading" && quranOfflineState.status !== "paused") {
        quranOfflineState.status = quranOfflineState.downloadedPages > 0 ? "paused" : "idle";
      }
    }
  } catch (e) {
    console.warn("Could not check offline cache status:", e);
  } finally {
    quranOfflineState.isChecking = false;
    updateOfflineCardUI();
  }
}

/**
 * Start or resume bulk offline download of 604 pages.
 */
async function startOfflineQuranDownload() {
  if (quranOfflineState.status === "downloading") return;

  if (!('caches' in window)) {
    if (typeof showNotification === "function") {
      showNotification("متصفحك لا يدعم تخزين الصفحات أوفلاين");
    }
    return;
  }

  quranOfflineState.status = "downloading";
  updateOfflineCardUI();

  if (typeof showNotification === "function") {
    showNotification("بدأ تحميل المصحف أوفلاين...");
  }

  try {
    const cache = await caches.open(QURAN_CACHE_NAME_JS);
    const CONCURRENCY = 6;
    let pagesToFetch = [];

    for (let page = 1; page <= TOTAL_QURAN_PAGES; page++) {
      const url = getPageImageUrl(page);
      const match = await cache.match(url);
      if (!match) {
        pagesToFetch.push(page);
      } else {
        imageCache.set(url, true);
      }
    }

    quranOfflineState.downloadedPages = TOTAL_QURAN_PAGES - pagesToFetch.length;
    updateOfflineCardUI();

    if (pagesToFetch.length === 0) {
      quranOfflineState.status = "completed";
      updateOfflineCardUI();
      if (typeof showNotification === "function") {
        showNotification("المصحف محمل بالكامل ومتوفر بدون إنترنت! 🎉");
      }
      return;
    }

    for (let i = 0; i < pagesToFetch.length; i += CONCURRENCY) {
      if (quranOfflineState.status !== "downloading") break;

      const batch = pagesToFetch.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (pageNumber) => {
          if (quranOfflineState.status !== "downloading") return;

          const url = getPageImageUrl(pageNumber);
          try {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) {
              await cache.put(url, resp.clone());
              imageCache.set(url, true);
              quranOfflineState.downloadedPages++;
              updateOfflineCardUI();
            }
          } catch (err) {
            console.warn(`Failed to fetch page ${pageNumber}:`, err);
          }
        })
      );
    }

    if (quranOfflineState.downloadedPages >= TOTAL_QURAN_PAGES) {
      quranOfflineState.status = "completed";
      if (typeof showNotification === "function") {
        showNotification("تم اكتمال تنزيل المصحف كاملاً بدون إنترنت! 🎉");
      }
    } else if (quranOfflineState.status === "downloading") {
      quranOfflineState.status = "paused";
    }
  } catch (err) {
    console.error("Bulk download error:", err);
    quranOfflineState.status = "paused";
  } finally {
    updateOfflineCardUI();
  }
}

/**
 * Pause offline download.
 */
function pauseOfflineQuranDownload() {
  quranOfflineState.status = "paused";
  updateOfflineCardUI();
  if (typeof showNotification === "function") {
    showNotification("تم إيقاف التحميل مؤقتاً");
  }
}

/**
 * Delete cached offline Quran pages to free up device storage.
 */
async function deleteOfflineQuranCache() {
  if (!confirm("هل أنت متأكد من حذف صفحات المصحف المحملة؟ ستحتاج إلى اتصال بالإنترنت للقراءة مجدداً.")) {
    return;
  }

  try {
    if ('caches' in window) {
      await caches.delete(QURAN_CACHE_NAME_JS);
      quranOfflineState.downloadedPages = 0;
      quranOfflineState.status = "idle";
      imageCache.clear();
      pageBlobUrlCache.forEach((blobUrl) => {
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      });
      pageBlobUrlCache.clear();
      updateOfflineCardUI();
      if (typeof showNotification === "function") {
        showNotification("تم حذف صفحات المصحف المحملة وإفراغ المساحة");
      }
    }
  } catch (e) {
    console.error("Error deleting cache:", e);
  }
}

/**
 * Update the UI of all Offline Cards dynamically.
 */
/**
 * Update the UI of all Offline Cards dynamically.
 */
function updateOfflineCardUI() {
  const percent = Math.round((quranOfflineState.downloadedPages / TOTAL_QURAN_PAGES) * 100);

  const widgets = document.querySelectorAll(".quran-offline-widget");
  widgets.forEach(widget => {
    widget.setAttribute("data-status", quranOfflineState.status);
    widget.outerHTML = renderOfflineQuranCardHtml();
  });
}

/**
 * Generate HTML string for the Offline Quran Download Action Button / Widget.
 */
function renderOfflineQuranCardHtml() {
  const percent = Math.round((quranOfflineState.downloadedPages / TOTAL_QURAN_PAGES) * 100);
  const isCompleted = quranOfflineState.status === "completed";
  const isDownloading = quranOfflineState.status === "downloading";
  const isPaused = quranOfflineState.status === "paused";

  return `
    <div class="quran-offline-widget" id="quranOfflineWidget" data-status="${quranOfflineState.status}">
      ${isCompleted ? `
        <div class="quran-offline-pill quran-offline-done">
          <i class="fas fa-check-circle"></i>
          <span>المصحف محمل أوفلاين</span>
          <button class="quran-offline-mini-del" onclick="deleteOfflineQuranCache()" title="حذف التنزيل">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      ` : isDownloading || isPaused ? `
        <div class="quran-offline-progress-box">
          <div class="quran-offline-progress-info">
            <span class="quran-offline-prog-title">
              <i class="${isDownloading ? 'fas fa-spinner fa-spin' : 'fas fa-pause-circle'}"></i>
              ${isDownloading ? 'جاري تنزيل المصحف...' : 'التحميل متوقف مؤقتاً'}
            </span>
            <span class="quran-offline-count-text">${toArabicNumber(quranOfflineState.downloadedPages)} / ${toArabicNumber(TOTAL_QURAN_PAGES)} صفحة (${toArabicNumber(percent)}٪)</span>
          </div>
          <div class="quran-offline-progress-track">
            <div class="quran-offline-progress-fill" style="width: ${percent}%"></div>
          </div>
          <div class="quran-offline-prog-actions">
            ${isDownloading ? `
              <button class="quran-offline-btn-pause" onclick="pauseOfflineQuranDownload()">
                <i class="fas fa-pause"></i> إيقاف مؤقت
              </button>
            ` : `
              <button class="quran-offline-btn-start" onclick="startOfflineQuranDownload()">
                <i class="fas fa-play"></i> استئناف
              </button>
              <button class="quran-offline-mini-del" onclick="deleteOfflineQuranCache()" title="حذف">
                <i class="fas fa-trash-alt"></i>
              </button>
            `}
          </div>
        </div>
      ` : `
        <button class="quran-offline-main-btn" onclick="startOfflineQuranDownload()" title="تحميل 604 صفحة للقراءة أوفلاين (~70MB)">
          <span>تنزيل المصحف أوفلاين</span>
          <i class="fas fa-cloud-download-alt"></i>
        </button>
      `}
    </div>
  `;
}

/**
 * Scroll smooth to specific Juz in surah index
 */
function scrollToJuz(juzNumber) {
  const juz = JUZ_DATA.find(j => j.number === juzNumber);
  if (!juz) return;
  const targetSurah = getSurahForPage(juz.startPage);
  if (!targetSurah) return;

  document.querySelectorAll('.juz-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-juz') == juzNumber);
  });

  const card = document.querySelector(`.surah-list-card[data-number="${targetSurah.number}"], .surah-list-item[data-number="${targetSurah.number}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('surah-highlight');
    setTimeout(() => card.classList.remove('surah-highlight'), 1800);
  }
}

// ===== SURAH LIVE FILTER / SEARCH =====
function filterSurahList(query) {
  const rawQuery = (query || "").trim();
  const normQuery = normalizeArabic(rawQuery);
  const cards = document.querySelectorAll("#surahListGrid .surah-list-card, #surahListGrid .surah-list-item");
  const clearBtn = document.getElementById("surahSearchClear");
  const emptyState = document.getElementById("surahSearchEmpty");

  if (clearBtn) {
    clearBtn.style.display = rawQuery.length > 0 ? "flex" : "none";
  }

  let visibleCount = 0;
  const normQueryNoAl = normQuery.startsWith("ال") ? normQuery.slice(2) : normQuery;

  cards.forEach(card => {
    const name = card.getAttribute("data-name") || "";
    const number = card.getAttribute("data-number") || "";
    const arabicNumber = card.getAttribute("data-arabic-number") || "";
    const type = card.getAttribute("data-type") || "";
    const juz = card.getAttribute("data-juz") || "";
    const normName = card.getAttribute("data-norm-name") || "";
    const normNameNoAl = normName.startsWith("ال") ? normName.slice(2) : normName;
    const normJuz = normalizeArabic(juz);
    const startPage = card.getAttribute("data-page") || "";

    if (
      !normQuery ||
      normName.includes(normQuery) ||
      (normQueryNoAl.length >= 2 && normNameNoAl.includes(normQueryNoAl)) ||
      number.includes(normQuery) ||
      arabicNumber.includes(rawQuery) ||
      name.includes(rawQuery) ||
      type.includes(normQuery) ||
      normJuz.includes(normQuery) ||
      startPage.includes(normQuery)
    ) {
      card.style.display = "";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  if (emptyState) {
    emptyState.classList.toggle("hidden", visibleCount > 0);
  }
}

function clearSurahSearch() {
  const input = document.getElementById("surahSearchInput");
  if (input) {
    input.value = "";
    filterSurahList("");
    input.focus();
  }
}

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

// 28 Medinan Surahs
const MEDINAN_SURAH_NUMBERS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110
]);

SURAH_DATA.forEach(s => {
  s.type = MEDINAN_SURAH_NUMBERS.has(s.number) ? "مدنية" : "مكية";
});

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
  return String(num).replace(/[0-9]/g, (d) => arabicDigits[parseInt(d, 10)]);
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

// In-memory cache of object URLs created from CacheStorage (pageNumber -> blobUrl)
const pageBlobUrlCache = new Map();

/**
 * Asynchronously resolve the image source for a Quran page.
 * If the page was downloaded offline to CacheStorage, returns an object URL (blob:...).
 * Otherwise falls back to the remote CDN URL.
 */
async function getPageImageSrc(pageNumber) {
  if (pageBlobUrlCache.has(pageNumber)) {
    return pageBlobUrlCache.get(pageNumber);
  }

  const url = getPageImageUrl(pageNumber);
  if ('caches' in window) {
    try {
      const cache = await caches.open(QURAN_CACHE_NAME_JS);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        const blobUrl = URL.createObjectURL(blob);
        pageBlobUrlCache.set(pageNumber, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn("Could not retrieve page from cache:", e);
    }
  }
  return url;
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
    const parsed = window.SafeStorage
      ? window.SafeStorage.getJSON(KHATMAH_STORAGE_KEY)
      : JSON.parse(localStorage.getItem(KHATMAH_STORAGE_KEY) || "null");
    if (parsed) {
      return { ...getDefaultKhatmahState(), ...parsed };
    }
  } catch (e) {
    console.error("Error loading khatmah state:", e);
  }
  return getDefaultKhatmahState();
}

function saveKhatmahState(state) {
  try {
    if (window.SafeStorage) {
      window.SafeStorage.setJSON(KHATMAH_STORAGE_KEY, state);
    } else {
      localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(state));
    }
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
    const saved = window.SafeStorage
      ? window.SafeStorage.get(QURAN_BOOKMARK_KEY)
      : localStorage.getItem(QURAN_BOOKMARK_KEY);
    return saved ? parseInt(saved) : null;
  } catch (e) {
    return null;
  }
}

function saveBookmark(page) {
  if (window.SafeStorage) {
    window.SafeStorage.set(QURAN_BOOKMARK_KEY, String(page));
  } else {
    try {
      localStorage.setItem(QURAN_BOOKMARK_KEY, String(page));
    } catch (e) {}
  }
}

function removeBookmark() {
  if (window.SafeStorage) {
    window.SafeStorage.remove(QURAN_BOOKMARK_KEY);
  } else {
    try {
      localStorage.removeItem(QURAN_BOOKMARK_KEY);
    } catch (e) {}
  }
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
 * Load a page image, returning a promise. Uses in-memory cache and offline CacheStorage.
 */
async function loadPageImage(pageNumber) {
  const url = getPageImageUrl(pageNumber);
  if (pageBlobUrlCache.has(pageNumber)) return Promise.resolve(true);
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url));

  const resolvedSrc = await getPageImageSrc(pageNumber);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = resolvedSrc;
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
 * Show the Quran page (called from tab switch)
 */
function showQuranPage() {
  khatmahState = loadKhatmahState();
  initMushafTheme();

  if (quranViewerState.currentView === "reader") {
    renderMushafViewer();
  } else if (quranViewerState.currentView === "dashboard") {
    renderKhatmahDashboard();
  } else {
    renderQuranHome();
  }
}

// Number of verses per surah (index + 1 = surah number), total 6236.
const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
  26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
  6, 3, 5, 4, 5, 6,
];

/**
 * Render the Quran landing view: continue hero, khatmah card, offline slot,
 * search and the surah/juz/bookmark indexes.
 */
function renderQuranHome() {
  restoreBottomNav();
  quranViewerState.currentView = "home";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  khatmahState = loadKhatmahState();
  const bookmark = loadBookmark();
  const bookmarkSurah = bookmark ? getSurahForPage(bookmark) : null;
  const bookmarkJuz = bookmark ? getJuzForPage(bookmark) : null;

  const progress = khatmahState.isActive
    ? getKhatmahProgress(khatmahState)
    : 0;
  const totalPages =
    TOTAL_QURAN_PAGES - (khatmahState.khatmahStartPage || 1) + 1;
  const progressPct = Math.min(100, Math.max(0, progress));

  let html = `<div class="pt-page pt-quran">

    <div class="pt-topbar">
      <div class="pt-topbar__titles">
        <h1 class="pt-title">القرآن الكريم</h1>
        <span class="pt-sub">٦٠٤ صفحة · ١١٤ سورة</span>
      </div>
      <div class="pt-topbar__actions">
        <button class="pt-iconbtn" onclick="switchQuranListTab('bookmarks')" title="المحفوظات" aria-label="المحفوظات">
          <i class="fas fa-bookmark"></i>
        </button>
      </div>
    </div>

    <!-- Continue reading hero -->
    <div class="pt-qhero">
      <span class="pt-qhero__label">${bookmark ? "متابعة القراءة" : "ابدأ من سورة الفاتحة"}</span>
      <div class="pt-qhero__row">
        <div>
          <div class="pt-qhero__name">${bookmark ? "سورة " + bookmarkSurah.name : "الفاتحة"}</div>
          <div class="pt-qhero__meta">${
            bookmark
              ? `صفحة ${toArabicNumber(bookmark)} · جزء ${toArabicNumber(bookmarkJuz.number)}`
              : "صفحة ١ · جزء ١"
          }</div>
        </div>
        <span class="pt-qhero__glyph"><i class="fas fa-book-quran"></i></span>
      </div>
      <div class="pt-qhero__bar">
        <span style="width:${bookmark ? Math.max(4, Math.round((bookmark / TOTAL_QURAN_PAGES) * 100)) : 0}%"></span>
      </div>
      <button class="pt-qhero__cta" onclick="openFreeReader(${bookmark || 1})">
        <i class="fas fa-play"></i>
        <span>${bookmark ? "متابعة من حيث توقفت" : "ابدأ القراءة"}</span>
      </button>
    </div>

    <!-- Khatmah card -->
    <div class="pt-card pt-khatma">
      ${
        khatmahState.isActive
          ? `<div class="pt-ring pt-khatma__ring" style="--p:${progressPct}">
        <span class="pt-khatma__ring-num">${toArabicNumber(progressPct)}٪</span>
      </div>`
          : `<span class="pt-tint pt-c-gd pt-khatma__tile"><i class="fas fa-book-quran"></i></span>`
      }
      <div class="pt-khatma__body">
        <div class="pt-khatma__title">${
          khatmahState.isActive ? "ختمتك الحالية" : "ابدأ ختمة جديدة"
        }</div>
        <div class="pt-khatma__sub">${
          khatmahState.isActive
            ? `${toArabicNumber(khatmahState.totalPagesRead || 0)} من ${toArabicNumber(totalPages)} صفحة`
            : "حدّد هدفك اليومي ودعنا نتابع معك"
        }</div>
        ${
          khatmahState.isActive
            ? `<div class="pt-bar" style="margin-top:4px">
          <div class="pt-bar__fill pt-bar__fill--gd" style="width:${progressPct}%"></div>
        </div>`
            : ""
        }
        <button class="pt-khatma__cta" onclick="${
          khatmahState.isActive
            ? "renderKhatmahDashboard()"
            : "openKhatmahSheet()"
        }">
          <i class="fas fa-${khatmahState.isActive ? "chart-pie" : "plus"}"></i>
          <span>${khatmahState.isActive ? "إدارة الختمة" : "ابدأ الختمة"}</span>
        </button>
      </div>
    </div>

    <!-- Offline downloader -->
    <div id="quranOfflineSlot">${renderOfflineQuranCardHtml()}</div>

    <!-- Search -->
    <div class="pt-qsearch">
      <i class="fas fa-magnifying-glass"></i>
      <input type="text" id="surahSearchInput" placeholder="ابحث باسم السورة أو رقمها..."
        oninput="filterSurahList(this.value)" autocomplete="off" />
      <button class="surah-search-clear" id="surahSearchClear" onclick="clearSurahSearch()"
        title="مسح" style="display:none"><i class="fas fa-xmark"></i></button>
    </div>

    <!-- Index tabs -->
    <div class="pt-seg" id="quranIndexTabs">
      <button class="pt-seg__btn active" data-qindex="surah" onclick="switchQuranListTab('surah')">السور</button>
      <button class="pt-seg__btn" data-qindex="juz" onclick="switchQuranListTab('juz')">الأجزاء</button>
      <button class="pt-seg__btn" data-qindex="bookmarks" onclick="switchQuranListTab('bookmarks')">المحفوظات</button>
    </div>

    <!-- Surah index -->
    <div class="pt-surah-list" id="surahListGrid">`;

  SURAH_DATA.forEach((surah, i) => {
    const endPage =
      i < SURAH_DATA.length - 1
        ? SURAH_DATA[i + 1].startPage
        : TOTAL_QURAN_PAGES;
    const normName = normalizeArabic(surah.name);
    const ayahCount = SURAH_AYAH_COUNTS[i] || 0;

    html += `
      <button class="pt-surah surah-list-card surah-list-item"
        data-name="${surah.name}"
        data-number="${surah.number}"
        data-arabic-number="${toArabicNumber(surah.number)}"
        data-page="${surah.startPage}"
        data-type="${surah.type}"
        data-juz="جزء ${getJuzForPage(surah.startPage).number}"
        data-norm-name="${normName}"
        onclick="openFreeReader(${surah.startPage}, ${endPage})">
        <span class="pt-surah__num"><span>${toArabicNumber(surah.number)}</span></span>
        <span class="pt-surah__info">
          <span class="pt-surah__name">سورة ${surah.name}</span>
          <span class="pt-surah__meta">${toArabicNumber(ayahCount)} آية · ${surah.type}</span>
        </span>
        <span class="pt-surah__page">ص ${toArabicNumber(surah.startPage)}</span>
      </button>`;
  });

  html += `</div>

    <!-- Juz index -->
    <div class="pt-surah-list hidden" id="juzListGrid">`;

  JUZ_DATA.forEach((juz) => {
    const surahName = getSurahForPage(juz.startPage)
      ? getSurahForPage(juz.startPage).name
      : "";
    html += `
      <button class="pt-juz" onclick="openFreeReader(${juz.startPage})">
        <span class="pt-juz__num">${toArabicNumber(juz.number)}</span>
        <span>${juz.name}${surahName ? " · " + surahName : ""}</span>
        <span class="pt-juz__page">ص ${toArabicNumber(juz.startPage)}</span>
      </button>`;
  });

  html += `</div>

    <!-- Bookmarks -->
    <div class="pt-surah-list hidden" id="bookmarkListGrid">
      ${
        bookmark
          ? `<button class="pt-surah" onclick="openFreeReader(${bookmark})">
              <span class="pt-surah__num"><span><i class="fas fa-bookmark"></i></span></span>
              <span class="pt-surah__info">
                <span class="pt-surah__name">${bookmarkSurah.name}</span>
                <span class="pt-surah__meta">صفحة ${toArabicNumber(bookmark)} · جزء ${toArabicNumber(bookmarkJuz.number)}</span>
              </span>
              <span class="pt-surah__page">متابعة</span>
            </button>`
          : `<div class="pt-surah-search-empty">
              <i class="fas fa-bookmark"></i>
              لا توجد علامة مرجعية بعد. افتح المصحف وأضف علامة من أعلى الصفحة.
            </div>`
      }
    </div>

    <div class="pt-surah-search-empty hidden" id="surahSearchEmpty">
      <i class="fas fa-magnifying-glass-minus"></i>
      <p>لا توجد سورة تطابق البحث</p>
    </div>

  </div>`;

  container.innerHTML = html;

  // Restore the last used index tab within the session
  if (quranViewerState.listTab && quranViewerState.listTab !== "surah") {
    switchQuranListTab(quranViewerState.listTab);
  }

  checkOfflineQuranStatus();
}

/**
 * Switch between the surah / juz / bookmark indexes.
 */
function switchQuranListTab(tab) {
  quranViewerState.listTab = tab;
  const surahGrid = document.getElementById("surahListGrid");
  const juzGrid = document.getElementById("juzListGrid");
  const bookmarksGrid = document.getElementById("bookmarkListGrid");
  if (!surahGrid) return;

  if (surahGrid) surahGrid.classList.toggle("hidden", tab !== "surah");
  if (juzGrid) juzGrid.classList.toggle("hidden", tab !== "juz");
  if (bookmarksGrid) bookmarksGrid.classList.toggle("hidden", tab !== "bookmarks");

  document.querySelectorAll("#quranIndexTabs .pt-seg__btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-qindex") === tab);
  });

  const search = document.getElementById("surahSearchInput");
  const searchWrap = search ? search.closest(".pt-qsearch") : null;
  if (searchWrap) searchWrap.style.display = tab === "juz" ? "none" : "";
}

/**
 * Open the khatmah setup bottom sheet.
 */
function openKhatmahSheet() {
  const sheet = document.getElementById("khatmahSheet");
  const content = document.getElementById("khatmahSheetContent");
  if (!sheet || !content) return;

  content.innerHTML = getKhatmahSetupHtml();
  sheet.classList.add("is-open");
  document.body.classList.add("modal-open");
  renderGoalPresets("days");
  updateGoalPreview();

  if (window.AppRouter && !window.AppRouter.isModalOpen("khatmahSheet")) {
    window.AppRouter.pushModal("khatmahSheet", function () {
      closeKhatmahSheet(false);
    });
  }
}

function closeKhatmahSheet(syncRouter) {
  const sheet = document.getElementById("khatmahSheet");
  if (sheet) sheet.classList.remove("is-open");
  if (document.body && (!window.AppRouter || !window.AppRouter.isModalOpen())) {
    document.body.classList.remove("modal-open");
  }
  if (
    syncRouter !== false &&
    window.AppRouter &&
    window.AppRouter.isModalOpen("khatmahSheet")
  ) {
    window.AppRouter.closeModal("khatmahSheet");
  }
}

/**
 * Build the khatmah setup form markup (rendered inside the bottom sheet).
 */
function getKhatmahSetupHtml() {
  return `
    <div class="khatmah-setup">
      <div class="khatmah-setup-card" data-start-page="1" data-goal-type="days">
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
            <input type="text" inputmode="numeric" pattern="[٠-٩0-9]*" dir="ltr" id="goalValueNumber" min="1" max="365" value="٣٠"
              maxlength="3" oninput="syncGoalFromNumber()" class="goal-number-input" />
            <button class="goal-adjust-btn" onclick="adjustGoalValue(1)"><i class="fas fa-plus"></i></button>
            <span class="goal-unit-label" id="goalUnitLabel">يوم</span>
          </div>
          <div class="pt-preset-chips" id="goalPresetChips"></div>
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

        <button class="quick-read-btn" onclick="startFreeReading()">
          <i class="fas fa-book-open"></i>
          قراءة حرة بدون ختمة
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Khatmah Setup Screen (legacy entry point → bottom sheet).
 */
function renderKhatmahSetup() {
  renderQuranHome();
  openKhatmahSheet();
}

/**
 * Render Surah List (legacy entry point → home + surah index).
 */
function renderSurahList() {
  renderQuranHome();
  switchQuranListTab("surah");
}

/**
 * Open the Mushaf in free reading mode at a specific page.
 * If endPage is provided, navigation is scoped to that range (surah boundaries).
 */
function openFreeReader(page, endPage) {
  quranViewerState.mode = "free";
  quranViewerState.currentPage = page || 1;
  if (endPage) {
    quranViewerState.wirdStart = page;
    quranViewerState.wirdEnd = endPage;
  } else {
    quranViewerState.wirdStart = 1;
    quranViewerState.wirdEnd = TOTAL_QURAN_PAGES;
  }
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
 * Helper to ensure the bottom navigation bar is visible outside reader mode
 */
function restoreBottomNav() {
  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "";
}

/**
 * Called when user finishes reading all pages in a wird
 */
function completeWirdAndReturn() {
  restoreBottomNav();

  if (window.AppRouter && window.AppRouter.isModalOpen("quranReader")) {
    window.AppRouter.closeModal("quranReader");
  }

  const wird = getCurrentWird(khatmahState);
  if (wird && wird.khatmahComplete) {
    showKhatmahCompletion();
  } else if (typeof showNotification === "function") {
    showNotification("أتممت الورد! بارك الله فيك 🌿");
  }
  renderKhatmahDashboard();
}

/**
 * Render Khatmah Dashboard
 */
function renderKhatmahDashboard() {
  restoreBottomNav();
  quranViewerState.currentView = "dashboard";
  const container = document.getElementById("quranPageContent");
  if (!container) return;

  khatmahState = loadKhatmahState();
  const progress = getKhatmahProgress(khatmahState);
  const wird = getCurrentWird(khatmahState);
  const kStart = khatmahState.khatmahStartPage || 1;
  const adjustedTotal = TOTAL_QURAN_PAGES - kStart + 1;
  const totalWirds = Math.ceil(adjustedTotal / khatmahState.dailyTarget);

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
    <div class="pt-page pt-quran pt-kdash">

      <div class="pt-topbar">
        <div class="pt-topbar__titles">
          <span class="pt-greet">متابعة الورد</span>
          <h1 class="pt-title">ختمتك</h1>
          <span class="pt-sub">${
            wird
              ? `الورد ${toArabicNumber(wird.wirdNumber)} من ${toArabicNumber(totalWirds)}`
              : "ختمة مكتملة"
          }</span>
        </div>
        <div class="pt-topbar__actions">
          <button class="pt-iconbtn" onclick="renderQuranHome()" title="رجوع" aria-label="رجوع">
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- Progress -->
      <div class="pt-card pt-kdash-hero">
        <div class="pt-ring pt-kdash-hero__ring" style="--p:${progress}">
          <span class="pt-kdash-hero__pct">${toArabicNumber(progress)}٪</span>
        </div>
        <div class="pt-kdash-hero__body">
          <div class="pt-kdash-hero__title">${toArabicNumber(khatmahState.totalPagesRead)} من ${toArabicNumber(adjustedTotal)} صفحة</div>
          <div class="pt-kdash-hero__meta">${toArabicNumber(daysElapsed)} يوم مضى · ${toArabicNumber(estimatedDaysLeft)} يوم متبقٍّ</div>
          <div class="pt-bar"><div class="pt-bar__fill pt-bar__fill--gd" style="width:${progress}%"></div></div>
        </div>
      </div>

      <!-- Current Wird -->
      ${
        wird && !wird.khatmahComplete
          ? `
      <div class="pt-card pt-wird">
        <div class="pt-wird__head">
          <span class="pt-tint pt-tint--sm pt-c-gd"><i class="fas fa-book-reader"></i></span>
          <div class="pt-wird__titles">
            <span class="pt-wird__title">الورد الحالي</span>
            <span class="pt-wird__sub">صفحة ${toArabicNumber(wird.startPage)} إلى ${toArabicNumber(wird.endPage)}</span>
          </div>
          ${wird.isComplete ? `<span class="pt-chip pt-chip--gd"><i class="fas fa-check"></i> مكتمل</span>` : ""}
        </div>
        <div class="pt-wird__surahs">${wirdSurahStart && wirdSurahEnd ? (wirdSurahStart.name === wirdSurahEnd.name ? wirdSurahStart.name : `${wirdSurahStart.name} — ${wirdSurahEnd.name}`) : ""}</div>
        <div class="pt-bar"><div class="pt-bar__fill" style="width:${wirdPercent}%"></div></div>
        <div class="pt-wird__meta">
          <span>${toArabicNumber(wird.pagesRead)} / ${toArabicNumber(wird.totalPages)} صفحة</span>
          <span>${toArabicNumber(wirdPercent)}٪</span>
        </div>
      </div>`
          : ""
      }

      ${
        wird && wird.khatmahComplete
          ? `
      <div class="pt-card pt-kdash-done">
        <span class="pt-kdash-done__ico">🎉</span>
        <div class="pt-kdash-done__title">أتممت الختمة بحمد الله!</div>
        <div class="pt-kdash-done__sub">تقبل الله منك وجعلك من أهل القرآن وخاصته</div>
        <button class="pt-btn pt-btn--block" onclick="showKhatmahDuaModal(false)">
          <i class="fas fa-hands-praying"></i> دعاء ختم القرآن الكريم
        </button>
      </div>`
          : ""
      }

      <!-- Stats -->
      <div class="pt-stat-grid">
        <div class="pt-stat">
          <span class="pt-tint pt-tint--sm pt-c-em"><i class="fas fa-file-lines"></i></span>
          <span class="pt-stat__txt">
            <span class="pt-stat__val">${toArabicNumber(khatmahState.dailyTarget)}</span>
            <span class="pt-stat__label">صفحة / ورد</span>
          </span>
        </div>
        <div class="pt-stat">
          <span class="pt-tint pt-tint--sm pt-c-blue"><i class="fas fa-calendar-check"></i></span>
          <span class="pt-stat__txt">
            <span class="pt-stat__val">${toArabicNumber(daysElapsed)}</span>
            <span class="pt-stat__label">يوم مضى</span>
          </span>
        </div>
        <div class="pt-stat">
          <span class="pt-tint pt-tint--sm pt-c-gold"><i class="fas fa-hourglass-half"></i></span>
          <span class="pt-stat__txt">
            <span class="pt-stat__val">${toArabicNumber(estimatedDaysLeft)}</span>
            <span class="pt-stat__label">يوم متبقٍّ</span>
          </span>
        </div>
        <div class="pt-stat">
          <span class="pt-tint pt-tint--sm pt-c-indigo"><i class="fas fa-bookmark"></i></span>
          <span class="pt-stat__txt">
            <span class="pt-stat__val">${toArabicNumber(khatmahState.lastReadPage)}</span>
            <span class="pt-stat__label">آخر صفحة</span>
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-kdash-actions">
        ${
          wird && !wird.khatmahComplete
            ? `
        <button class="pt-btn pt-btn--block" onclick="openKhatmahReader()">
          <i class="fas fa-book-open"></i>
          ${wird.isComplete ? "الورد التالي" : "متابعة الورد"}
        </button>`
            : ""
        }
        <button class="pt-btn pt-btn--ghost pt-btn--block" onclick="renderSurahList()">
          <i class="fas fa-book-reader"></i>
          قراءة حرة (فهرس السور)
        </button>
        <button class="pt-kdash-reset" onclick="resetKhatmah()">
          <i class="fas fa-redo"></i>
          إعادة تعيين الختمة
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

  // Register with AppRouter for Hardware Back Button handling
  if (window.AppRouter && !window.AppRouter.isModalOpen("quranReader")) {
    window.AppRouter.pushModal("quranReader", function () {
      exitMushafViewer(false);
    });
  }

  const page = quranViewerState.currentPage;
  const surah = getSurahForPage(page);
  const juz = getJuzForPage(page);
  const bookmark = loadBookmark();
  const isBookmarked = bookmark === page;

  // Mode-aware navigation boundaries
  const isKM = quranViewerState.mode === "khatmah";
  const navStart = quranViewerState.wirdStart;
  const navEnd = quranViewerState.wirdEnd;
  const progressPercent = Math.round(
    ((page - navStart + 1) / (navEnd - navStart + 1)) * 100,
  );

  // Save global last reading for Home shortcut
  try {
    localStorage.setItem("tazkeer_last_reading", JSON.stringify({
      type: "quran",
      surahName: surah ? surah.name : "القرآن الكريم",
      title: "سورة " + (surah ? surah.name : "القرآن الكريم"),
      page: page,
      juz: juz ? juz.number : 1,
      percent: progressPercent,
      timestamp: Date.now()
    }));
    if (typeof window.updateContinueReadingPill === "function") {
      window.updateContinueReadingPill();
    }
  } catch (e) {}

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

  const cachedBlobSrc = pageBlobUrlCache.get(page);
  const imageUrl = cachedBlobSrc || getPageImageUrl(page);

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
              <span class="settings-section-label">التنزيل أوفلاين</span>
              <button class="settings-theme-btn" onclick="startOfflineQuranDownload()">
                <i class="fas fa-cloud-download-alt"></i>
                <span class="quran-offline-pct-text">${quranOfflineState.status === 'completed' ? 'المصحف أوفلاين ✅' : 'تنزيل المصحف أوفلاين'}</span>
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
          crossorigin="anonymous"
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

      <!-- Bottom Bar (Fixed Height Morphing Footer) -->
      <div class="mushaf-bottom-bar ${atWirdEnd ? "at-wird-end" : ""}" id="mushafBottomBar">
        <div class="mushaf-progress-wrapper" id="mushafProgressWrapper">
          <div class="mushaf-bottom-info">
            <span class="mushaf-page-counter">${page - navStart + 1} / ${navEnd - navStart + 1}</span>
            <span class="mushaf-progress-percent">${progressPercent}%</span>
          </div>
          <div class="mushaf-progress-track">
            <div class="mushaf-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        ${
          isKM
            ? `<button class="wird-complete-btn" id="wirdCompleteBtn" onclick="completeWirdAndReturn()" aria-label="أتممت الورد">
          <i class="fas fa-check-circle"></i> <span>أتممت الورد</span>
        </button>`
            : ""
        }
        ${
          page === TOTAL_QURAN_PAGES
            ? `<button class="khatmah-dua-nav-btn" onclick="showKhatmahDuaModal(false)" aria-label="دعاء ختم القرآن">
          <i class="fas fa-hands-praying"></i> <span>دعاء الختمة</span>
        </button>`
            : ""
        }
      </div>
    </div>
  `;

  // Wait for image to load
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");

  if (imgEl) {
    // If not already resolved to a blob URL, attempt resolving from offline CacheStorage
    if (!cachedBlobSrc) {
      getPageImageSrc(page).then((resolvedSrc) => {
        if (imgEl && resolvedSrc && resolvedSrc.startsWith("blob:")) {
          imgEl.src = resolvedSrc;
        }
      });
    }

    // Check if image is already cached — show instantly
    const cachedUrl = getPageImageUrl(page);
    if (cachedBlobSrc || imageCache.has(cachedUrl)) {
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
      imgEl.onerror = async function () {
        // Fallback: Check if the page exists in CacheStorage before showing error
        if ('caches' in window) {
          try {
            const cache = await caches.open(QURAN_CACHE_NAME_JS);
            const match = await cache.match(getPageImageUrl(page));
            if (match) {
              const blob = await match.blob();
              const blobUrl = URL.createObjectURL(blob);
              pageBlobUrlCache.set(page, blobUrl);
              imgEl.onerror = null;
              imgEl.src = blobUrl;
              return;
            }
          } catch (e) {
            console.warn("Offline cache fallback failed:", e);
          }
        }

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
async function retryLoadPage() {
  const page = quranViewerState.currentPage;
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");

  if (imgEl && loadingEl) {
    loadingEl.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل الصفحة...</p>`;
    loadingEl.classList.remove("hidden");
    imgEl.classList.add("loading");

    const src = await getPageImageSrc(page);
    if (src && src.startsWith("blob:")) {
      imgEl.src = src;
    } else {
      imgEl.src = getPageImageUrl(page) + "?t=" + Date.now();
    }
  }
}

/**
 * Navigate to a new page (without full re-render).
 */
function navigateToPage(newPage, direction) {
  const isKM = quranViewerState.mode === "khatmah";
  const navStart = quranViewerState.wirdStart;
  const navEnd = quranViewerState.wirdEnd;

  if (newPage < navStart || newPage > navEnd) return;

  quranViewerState.currentPage = newPage;

  const surah = getSurahForPage(newPage);
  const juz = getJuzForPage(newPage);
  const bookmark = loadBookmark();
  const isBookmarked = bookmark === newPage;

  const progressPercent = Math.round(
    ((newPage - navStart + 1) / (navEnd - navStart + 1)) * 100,
  );

  // Save global last reading for Home shortcut
  try {
    localStorage.setItem("tazkeer_last_reading", JSON.stringify({
      type: "quran",
      surahName: surah ? surah.name : "القرآن الكريم",
      title: "سورة " + (surah ? surah.name : "القرآن الكريم"),
      page: newPage,
      juz: juz ? juz.number : 1,
      percent: progressPercent,
      timestamp: Date.now()
    }));
    if (typeof window.updateContinueReadingPill === "function") {
      window.updateContinueReadingPill();
    }
  } catch (e) {}

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
      <span>${newPage - navStart + 1} / ${navEnd - navStart + 1}</span>
      <span>${progressPercent}%</span>`;
  }

  // Update progress bar
  const progressFill = document.querySelector(".mushaf-progress-fill");
  if (progressFill) progressFill.style.width = `${progressPercent}%`;

  // Update page jump placeholder
  const jumpInput = document.getElementById("pageJumpInput");
  if (jumpInput) jumpInput.placeholder = newPage;

  // Toggle bottom bar state between progress and completion button
  const atWirdEnd = isKM && newPage >= navEnd;
  const bottomBar = document.querySelector(".mushaf-bottom-bar");
  if (bottomBar) {
    bottomBar.classList.toggle("at-wird-end", atWirdEnd);

    if (isKM) {
      let wirdBtn = bottomBar.querySelector(".wird-complete-btn");
      if (!wirdBtn) {
        wirdBtn = document.createElement("button");
        wirdBtn.className = "wird-complete-btn";
        wirdBtn.id = "wirdCompleteBtn";
        wirdBtn.setAttribute("aria-label", "أتممت الورد");
        wirdBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>أتممت الورد</span>';
        wirdBtn.onclick = completeWirdAndReturn;
        bottomBar.appendChild(wirdBtn);
      }
    }

    let duaBtn = bottomBar.querySelector(".khatmah-dua-nav-btn");
    if (newPage === TOTAL_QURAN_PAGES) {
      if (!duaBtn) {
        duaBtn = document.createElement("button");
        duaBtn.className = "khatmah-dua-nav-btn";
        duaBtn.setAttribute("aria-label", "دعاء ختم القرآن");
        duaBtn.innerHTML = '<i class="fas fa-hands-praying"></i> <span>دعاء الختمة</span>';
        duaBtn.onclick = function () {
          showKhatmahDuaModal(false);
        };
        bottomBar.appendChild(duaBtn);
      }
    } else if (duaBtn) {
      duaBtn.remove();
    }
  }

  // Defensive clean-up in case an old external button exists
  const strayWirdBtn = document.querySelector(".mushaf-container > .wird-complete-btn");
  if (strayWirdBtn) strayWirdBtn.remove();

  // Animate and swap image
  const imgEl = document.getElementById("mushafPageImg");
  const loadingEl = document.getElementById("mushafLoading");
  const remoteUrl = getPageImageUrl(newPage);
  const cachedBlob = pageBlobUrlCache.get(newPage);
  const isCached = cachedBlob || imageCache.has(remoteUrl);

  if (imgEl) {
    // Apply flip animation
    const animClass = direction === "next" ? "flip-next" : "flip-prev";
    imgEl.classList.add(animClass);

    const applyPageSrc = async () => {
      const targetSrc = cachedBlob || (await getPageImageSrc(newPage));
      imgEl.src = targetSrc;
      imgEl.alt = `صفحة ${newPage} من المصحف`;

      if (targetSrc.startsWith("blob:") || imageCache.has(remoteUrl)) {
        imgEl.classList.remove("loading");
        imgEl.classList.remove(animClass);
        if (loadingEl) loadingEl.classList.add("hidden");
        quranViewerState.isLoading = false;
      } else {
        imgEl.classList.add("loading");
        if (loadingEl) loadingEl.classList.remove("hidden");
        quranViewerState.isLoading = true;

        imgEl.onload = function () {
          imageCache.set(remoteUrl, true);
          imgEl.classList.remove("loading");
          imgEl.classList.remove(animClass);
          if (loadingEl) loadingEl.classList.add("hidden");
          quranViewerState.isLoading = false;
        };
        imgEl.onerror = async function () {
          if ('caches' in window) {
            try {
              const cache = await caches.open(QURAN_CACHE_NAME_JS);
              const match = await cache.match(remoteUrl);
              if (match) {
                const blob = await match.blob();
                const blobUrl = URL.createObjectURL(blob);
                pageBlobUrlCache.set(newPage, blobUrl);
                imgEl.onerror = null;
                imgEl.src = blobUrl;
                return;
              }
            } catch (e) {}
          }
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
      }
    };

    setTimeout(() => {
      applyPageSrc();
    }, 150);
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
  if (
    quranViewerState.isLoading ||
    quranViewerState.currentPage >= quranViewerState.wirdEnd
  )
    return;
  navigateToPage(quranViewerState.currentPage + 1, "next");
}

function mushafPrevPage() {
  if (
    quranViewerState.isLoading ||
    quranViewerState.currentPage <= quranViewerState.wirdStart
  )
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
  // Track for weekly Quran chart
  if (typeof trackQuranDailyReading === "function") {
    trackQuranDailyReading();
  }

  // Only update khatmah progress when reading in khatmah mode
  if (khatmahState.isActive && quranViewerState.mode === "khatmah") {
    if (!khatmahState.completedPages.includes(pageNumber)) {
      khatmahState.completedPages.push(pageNumber);
      khatmahState.totalPagesRead = khatmahState.completedPages.length;
    }
    khatmahState.lastReadPage = pageNumber;
    saveKhatmahState(khatmahState);

    // Check if Khatmah is complete
    const kStart = khatmahState.khatmahStartPage || 1;
    const kTotal = TOTAL_QURAN_PAGES - kStart + 1;
    if (khatmahState.totalPagesRead >= kTotal && !khatmahState.isComplete) {
      showKhatmahCompletion();
    }
  }
}

// ===== KHATMAH DUA SYSTEM & CELEBRATION =====

const KHATMAH_DUA_PLAIN = `اللَّهُمَّ ارْحَمْنِي بالقُرْءَانِ وَاجْعَلهُ لِي إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً ۞
اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَانَسِيتُ وَعَلِّمْنِي مِنْهُ مَاجَهِلْتُ وَارْزُقْنِي تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ وَاجْعَلْهُ لِي حُجَّةً يَارَبَّ العَالَمِينَ ۞
اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي وَاجْعَلِ الحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ وَاجْعَلِ المَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ ۞
اللَّهُمَّ اجْعَلْ خَيْرَ عُمْرِي آخِرَهُ وَخَيْرَ عَمَلِي خَوَاتِمَهُ وَخَيْرَ أَيَّامِي يَوْمَ أَلْقَاكَ فِيهِ ۞
اللَّهُمَّ إِنِّي أَسْأَلُكَ عِيشَةً هَنِيَّةً وَمِيتَةً سَوِيَّةً وَمَرَدًّا غَيْرَ مُخْزٍ وَلاَ فَاضِحٍ ۞
اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ المَسْأَلةِ وَخَيْرَ الدُّعَاءِ وَخَيْرَ النَّجَاحِ وَخَيْرَ العِلْمِ وَخَيْرَ العَمَلِ وَخَيْرَ الثَّوَابِ وَخَيْرَ الحَيَاةِ وَخيْرَ المَمَاتِ وَثَبِّتْنِي وَثَقِّلْ مَوَازِينِي وَحَقِّقْ إِيمَانِي وَارْفَعْ دَرَجَتِي وَتَقَبَّلْ صَلاَتِي وَاغْفِرْ خَطِيئَاتِي وَأَسْأَلُكَ العُلَا مِنَ الجَنَّةِ ۞
اللَّهُمَّ إِنِّي أَسْأَلُكَ مُوجِبَاتِ رَحْمَتِكَ وَعَزَائِمَ مَغْفِرَتِكَ وَالسَّلاَمَةَ مِنْ كُلِّ إِثْمٍ وَالغَنِيمَةَ مِنْ كُلِّ بِرٍّ وَالفَوْزَ بِالجَنَّةِ وَالنَّجَاةَ مِنَ النَّارِ ۞
اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الأُمُورِ كُلِّهَا وَأجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الآخِرَةِ ۞
اللَّهُمَّ اقْسِمْ لَنَا مِنْ خَشْيَتِكَ مَاتَحُولُ بِهِ بَيْنَنَا وَبَيْنَ مَعْصِيَتِكَ وَمِنْ طَاعَتِكَ مَاتُبَلِّغُنَا بِهَا جَنَّتَكَ وَمِنَ اليَقِينِ مَاتُهَوِّنُ بِهِ عَلَيْنَا مَصَائِبَ الدُّنْيَا وَمَتِّعْنَا بِأَسْمَاعِنَا وَأَبْصَارِنَا وَقُوَّتِنَا مَاأَحْيَيْتَنَا وَاجْعَلْهُ الوَارِثَ مِنَّا وَاجْعَلْ ثَأْرَنَا عَلَى مَنْ ظَلَمَنَا وَانْصُرْنَا عَلَى مَنْ عَادَانَا وَلاَ تجْعَلْ مُصِيبَتَنَا فِي دِينِنَا وَلاَ تَجْعَلِ الدُّنْيَا أَكْبَرَ هَمِّنَا وَلَا مَبْلَغَ عِلْمِنَا وَلاَ تُسَلِّطْ عَلَيْنَا مَنْ لَا يَرْحَمُنَا ۞
اللَّهُمَّ لَا تَدَعْ لَنَا ذَنْبًا إِلَّا غَفَرْتَهُ وَلَا هَمَّا إِلَّا فَرَّجْتَهُ وَلَا دَيْنًا إِلَّا قَضَيْتَهُ وَلَا حَاجَةً مِنْ حَوَائِجِ الدُّنْيَا وَالآخِرَةِ إِلَّا قَضَيْتَهَا يَاأَرْحَمَ الرَّاحِمِينَ ۞
رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ وَصَلَّى اللهُ عَلَى سَيِّدِنَا وَنَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَأَصْحَابِهِ الأَخْيَارِ وَسَلَّمَ تَسْلِيمًا كَثِيراً.`;

/**
 * Show Khatmah completion celebration and prompt Khatmah Duaa
 */
function showKhatmahCompletion() {
  if (!khatmahState.isComplete) {
    khatmahState.isComplete = true;
    saveKhatmahState(khatmahState);

    // Increment completed khatmah count safely
    var completedCount = parseInt(
      (window.SafeStorage
        ? window.SafeStorage.get("completedKhatmahCount")
        : localStorage.getItem("completedKhatmahCount")) || "0",
      10
    );
    completedCount++;
    if (window.SafeStorage) {
      window.SafeStorage.set("completedKhatmahCount", String(completedCount));
    } else {
      localStorage.setItem("completedKhatmahCount", String(completedCount));
    }

    if (typeof updateQuranProfileStats === "function") {
      updateQuranProfileStats();
    }
  }

  showKhatmahDuaModal(true);
}

/**
 * Open the Khatmah Dua Modal
 * @param {boolean} [isCelebration=false]
 */
function showKhatmahDuaModal(isCelebration) {
  const existing = document.getElementById("khatmahDuaModalOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "khatmahDuaModalOverlay";
  overlay.className = "khatmah-dua-overlay";

  overlay.innerHTML = `
    <div class="khatmah-dua-card" role="dialog" aria-modal="true" aria-labelledby="khatmahDuaTitle">
      ${
        isCelebration
          ? `<div class="khatmah-celebration-ribbon">
               <span>🎉</span>
               <span>مبارك عليك إتمام ختمة القرآن الكريم! تقبل الله طاعتك</span>
               <span>🎉</span>
             </div>`
          : ""
      }
      <div class="khatmah-dua-header">
        <div class="khatmah-dua-badge">
          <i class="fas fa-quran"></i> ختام مبارك
        </div>
        <h2 class="khatmah-dua-title" id="khatmahDuaTitle">دعاء ختم القرآن الكريم</h2>
        <p class="khatmah-dua-subtitle">اللهم اجعل القرآن العظيم ربيع قلوبنا ونور صدورنا وجلاء أحزاننا</p>
        <button class="khatmah-dua-close" onclick="closeKhatmahDuaModal()" aria-label="إغلاق">&times;</button>
      </div>

      <div class="khatmah-dua-body">
        <p>اللَّهُمَّ ارْحَمْنِي بالقُرْءَانِ وَاجْعَلهُ لِي إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَانَسِيتُ وَعَلِّمْنِي مِنْهُ مَاجَهِلْتُ وَارْزُقْنِي تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ وَاجْعَلْهُ لِي حُجَّةً يَارَبَّ العَالَمِينَ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي وَاجْعَلِ الحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ وَاجْعَلِ المَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ اجْعَلْ خَيْرَ عُمْرِي آخِرَهُ وَخَيْرَ عَمَلِي خَوَاتِمَهُ وَخَيْرَ أَيَّامِي يَوْمَ أَلْقَاكَ فِيهِ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ إِنِّي أَسْأَلُكَ عِيشَةً هَنِيَّةً وَمِيتَةً سَوِيَّةً وَمَرَدًّا غَيْرَ مُخْزٍ وَلاَ فَاضِحٍ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ المَسْأَلةِ وَخَيْرَ الدُّعَاءِ وَخَيْرَ النَّجَاحِ وَخَيْرَ العِلْمِ وَخَيْرَ العَمَلِ وَخَيْرَ الثَّوَابِ وَخَيْرَ الحَيَاةِ وَخيْرَ المَمَاتِ وَثَبِّتْنِي وَثَقِّلْ مَوَازِينِي وَحَقِّقْ إِيمَانِي وَارْفَعْ دَرَجَتِي وَتَقَبَّلْ صَلاَتِي وَاغْفِرْ خَطِيئَاتِي وَأَسْأَلُكَ العُلَا مِنَ الجَنَّةِ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ إِنِّي أَسْأَلُكَ مُوجِبَاتِ رَحْمَتِكَ وَعَزَائِمَ مَغْفِرَتِكَ وَالسَّلاَمَةَ مِنْ كُلِّ إِثْمٍ وَالغَنِيمَةَ مِنْ كُلِّ بِرٍّ وَالفَوْزَ بِالجَنَّةِ وَالنَّجَاةَ مِنَ النَّارِ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الأُمُورِ كُلِّهَا وَأجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الآخِرَةِ <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ اقْسِمْ لَنَا مِنْ خَشْيَتِكَ مَاتَحُولُ بِهِ بَيْنَنَا وَبَيْنَ مَعْصِيَتِكَ وَمِنْ طَاعَتِكَ مَاتُبَلِّغُنَا بِهَا جَنَّتَكَ وَمِنَ اليَقِينِ مَاتُهَوِّنُ بِهِ عَلَيْنَا مَصَائِبَ الدُّنْيَا وَمَتِّعْنَا بِأَسْمَاعِنَا وَأَبْصَارِنَا وَقُوَّتِنَا مَاأَحْيَيْتَنَا وَاجْعَلْهُ الوَارِثَ مِنَّا وَاجْعَلْ ثَأْرَنَا عَلَى مَنْ ظَلَمَنَا وَانْصُرْنَا عَلَى مَنْ عَادَانَا وَلاَ تجْعَلْ مُصِيبَتَنَا فِي دِينِنَا وَلاَ تَجْعَلِ الدُّنْيَا أَكْبَرَ هَمِّنَا وَلَا مَبْلَغَ عِلْمِنَا وَلاَ تُسَلِّطْ عَلَيْنَا مَنْ لَا يَرْحَمُنَا <span class="dua-ayah-stop">۞</span></p>
        <p>اللَّهُمَّ لَا تَدَعْ لَنَا ذَنْبًا إِلَّا غَفَرْتَهُ وَلَا هَمَّا إِلَّا فَرَّجْتَهُ وَلَا دَيْنًا إِلَّا قَضَيْتَهُ وَلَا حَاجَةً مِنْ حَوَائِجِ الدُّنْيَا وَالآخِرَةِ إِلَّا قَضَيْتَهَا يَاأَرْحَمَ الرَّاحِمِينَ <span class="dua-ayah-stop">۞</span></p>
        <p class="dua-closing">رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ وَصَلَّى اللهُ عَلَى سَيِّدِنَا وَنَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَأَصْحَابِهِ الأَخْيَارِ وَسَلَّمَ تَسْلِيمًا كَثِيراً.</p>
      </div>

      <div class="khatmah-dua-footer">
        <button class="khatmah-dua-btn primary" onclick="closeKhatmahDuaModal()">
          <i class="fas fa-check"></i> تقبل الله منا ومنكم
        </button>
        <button class="khatmah-dua-btn secondary" id="copyKhatmahDuaBtn" onclick="copyKhatmahDua()">
          <i class="fas fa-copy"></i> <span>نسخ الدعاء</span>
        </button>
        <button class="khatmah-dua-btn secondary" onclick="shareKhatmahDua()">
          <i class="fas fa-share-alt"></i> <span>مشاركة</span>
        </button>
      </div>
    </div>
  `;

  // Close when clicking backdrop
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeKhatmahDuaModal();
    }
  });

  document.body.appendChild(overlay);

  // Register with AppRouter for mobile hardware back button
  if (window.AppRouter && !window.AppRouter.isModalOpen("khatmahDuaModal")) {
    window.AppRouter.pushModal("khatmahDuaModal", function () {
      const el = document.getElementById("khatmahDuaModalOverlay");
      if (el) el.remove();
    });
  }
}

function closeKhatmahDuaModal() {
  const overlay = document.getElementById("khatmahDuaModalOverlay");
  if (overlay) overlay.remove();

  if (window.AppRouter && window.AppRouter.isModalOpen("khatmahDuaModal")) {
    window.AppRouter.closeModal("khatmahDuaModal");
  }
}

function copyKhatmahDua() {
  const btn = document.getElementById("copyKhatmahDuaBtn");
  const origHtml = btn ? btn.innerHTML : "";

  function notifyCopied() {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> <span>تم النسخ!</span>';
      setTimeout(() => {
        if (btn) btn.innerHTML = origHtml;
      }, 2000);
    }
    if (typeof showNotification === "function") {
      showNotification("تم نسخ دعاء ختم القرآن الكريم بنجاح ✨");
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(KHATMAH_DUA_PLAIN)
      .then(notifyCopied)
      .catch(() => {
        fallbackCopyText(KHATMAH_DUA_PLAIN);
        notifyCopied();
      });
  } else {
    fallbackCopyText(KHATMAH_DUA_PLAIN);
    notifyCopied();
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
}

function shareKhatmahDua() {
  if (navigator.share) {
    navigator
      .share({
        title: "دعاء ختم القرآن الكريم - تطبيق ذَكِّرْ",
        text: KHATMAH_DUA_PLAIN,
      })
      .catch(() => {});
  } else {
    copyKhatmahDua();
  }
}

window.showKhatmahDuaModal = showKhatmahDuaModal;
window.closeKhatmahDuaModal = closeKhatmahDuaModal;
window.copyKhatmahDua = copyKhatmahDua;
window.shareKhatmahDua = shareKhatmahDua;

// ===== USER INTERACTION HANDLERS =====

function selectGoalType(type) {
  document.querySelectorAll(".goal-type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const numInput = document.getElementById("goalValueNumber");
  const label = document.getElementById("goalInputLabel");
  const unitLabel = document.getElementById("goalUnitLabel");

  if (type === "days") {
    numInput.setAttribute("min", "1");
    numInput.setAttribute("max", "365");
    setGoalValue(30);
    label.textContent = "عدد الأيام لإتمام الختمة";
    unitLabel.textContent = "يوم";
  } else {
    numInput.setAttribute("min", "1");
    numInput.setAttribute("max", "30");
    setGoalValue(5);
    label.textContent = "عدد الصفحات اليومية";
    unitLabel.textContent = "صفحة";
  }

  document
    .querySelector(".khatmah-setup-card")
    ?.setAttribute("data-goal-type", type);
  renderGoalPresets(type);
  updateGoalPreview();
}

const GOAL_PRESETS = {
  days: [7, 15, 30, 60],
  pages: [2, 5, 10, 20],
};

const ARABIC_DIGITS_SET = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Convert Arabic-Indic digits in a string to Latin digits and drop everything else.
 */
function goalDigitsToLatin(value) {
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS_SET.indexOf(d)))
    .replace(/[^0-9]/g, "");
}

function getGoalLimits() {
  const el = document.getElementById("goalValueNumber");
  const min = parseInt(el?.getAttribute("min") || "1", 10) || 1;
  const max = parseInt(el?.getAttribute("max") || "365", 10) || 365;
  return { min, max };
}

/**
 * Read the goal input as a Latin integer (supports Arabic-Indic digits).
 */
function getGoalValue(fallback) {
  const el = document.getElementById("goalValueNumber");
  const parsed = parseInt(goalDigitsToLatin(el ? el.value : ""), 10);
  if (!isNaN(parsed)) return parsed;
  return fallback === undefined ? 30 : fallback;
}

function setGoalValue(value) {
  const el = document.getElementById("goalValueNumber");
  if (el) el.value = toArabicNumber(String(value));
}

/**
 * Build the quick preset chips for the current goal type.
 */
function renderGoalPresets(type) {
  const wrap = document.getElementById("goalPresetChips");
  if (!wrap) return;
  const key = type === "pages" ? "pages" : "days";
  const values = GOAL_PRESETS[key];
  wrap.innerHTML = values
    .map(
      (v) =>
        `<button class="pt-preset-chip" data-preset="${v}" onclick="selectGoalPreset(${v})">${toArabicNumber(v)}</button>`,
    )
    .join("");
  highlightGoalPreset();
}

function highlightGoalPreset() {
  const current = getGoalValue(NaN);
  document.querySelectorAll("#goalPresetChips .pt-preset-chip").forEach((chip) => {
    chip.classList.toggle(
      "active",
      parseInt(chip.dataset.preset, 10) === current,
    );
  });
}

function selectGoalPreset(value) {
  const { min, max } = getGoalLimits();
  const val = Math.max(min, Math.min(max, parseInt(value, 10) || min));
  setGoalValue(val);
  updateGoalPreview();
}

/**
 * Leave the khatmah setup and open the surah index for free reading.
 */
function startFreeReading() {
  closeKhatmahSheet();
  renderSurahList();
}

function syncGoalFromNumber() {
  const el = document.getElementById("goalValueNumber");
  if (el) {
    const { min, max } = getGoalLimits();
    const raw = goalDigitsToLatin(el.value).slice(0, 3);
    if (!raw) {
      el.value = "";
    } else {
      const val = Math.max(min, Math.min(max, parseInt(raw, 10)));
      el.value = toArabicNumber(val);
    }
  }
  highlightGoalPreset();
  updateGoalPreview();
}

function adjustGoalValue(delta) {
  const { min, max } = getGoalLimits();
  const current = getGoalValue(min);
  const val = Math.max(min, Math.min(max, current + delta));
  setGoalValue(val);
  highlightGoalPreset();
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
  const value = getGoalValue(30);

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

  if (calcDailyPages) calcDailyPages.textContent = `${toArabicNumber(dailyPages)} صفحة`;
  if (calcDailyJuz) {
    calcDailyJuz.textContent =
      dailyJuz >= 1
        ? `${toArabicNumber(dailyJuz.toFixed(1))} جزء`
        : `${toArabicNumber(Math.round(dailyJuz * 4))}/٤ حزب`;
  }
  if (calcDailyTime) {
    if (dailyMinutes >= 60) {
      const hours = Math.floor(dailyMinutes / 60);
      const mins = dailyMinutes % 60;
      calcDailyTime.textContent = `~${toArabicNumber(hours)} ساعة${mins > 0 ? ` و ${toArabicNumber(mins)} دقيقة` : ""}`;
    } else {
      calcDailyTime.textContent = `~${toArabicNumber(dailyMinutes)} دقيقة`;
    }
  }
}

function startKhatmah() {
  const activeType =
    document.querySelector(".goal-type-btn.active")?.dataset.type || "days";
  const value = getGoalValue(30);

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
    showNotification(
      `تم بدء ختمة جديدة - ${toArabicNumber(dailyTarget)} صفحة يومياً`,
    );
  }

  closeKhatmahSheet();
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

function exitMushafViewer(syncRouter) {
  // Always restore bottom nav immediately upon exiting
  restoreBottomNav();

  if (syncRouter !== false && window.AppRouter && window.AppRouter.isModalOpen("quranReader")) {
    window.AppRouter.closeModal("quranReader");
    return;
  }

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
  const minPage = quranViewerState.wirdStart;
  const maxPage = quranViewerState.wirdEnd;

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

  /* ── Khatmah ring in the profile card ── */
  var progress = khatmahState.isActive ? getKhatmahProgress(khatmahState) : 0;
  var ring = document.getElementById("khatmahRing");
  var pctEl = document.getElementById("khatmahPct");
  var pagesSub = document.getElementById("khatmahPagesSub");
  var hasProgress = khatmahState.isActive && progress > 0;

  if (ring) {
    ring.style.setProperty("--p", String(progress));
  }
  if (pctEl) {
    pctEl.textContent = toArabicNumber(progress) + "٪";
  }

  if (pagesSub) {
    if (!khatmahState.isActive) {
      pagesSub.textContent = "لم تبدأ ختمة";
    } else {
      var totalPages =
        TOTAL_QURAN_PAGES - (khatmahState.khatmahStartPage || 1) + 1;
      pagesSub.textContent =
        toArabicNumber(khatmahState.totalPagesRead || 0) +
        " من " +
        toArabicNumber(totalPages) +
        " ص";
    }
  }

  /* ── Legacy detail hook (hidden, kept for compatibility) ── */
  var content = document.getElementById("profileKhatmahContent");
  if (content) {
    if (!khatmahState.isActive) {
      content.innerHTML = "";
    } else {
      var totalPagesLegacy =
        TOTAL_QURAN_PAGES - (khatmahState.khatmahStartPage || 1) + 1;
      content.innerHTML = `
        <div class="profile-khatmah-info">
          <span>${toArabicNumber(progress)}٪ مكتمل</span>
          <span>${toArabicNumber(khatmahState.totalPagesRead || 0)} / ${toArabicNumber(totalPagesLegacy)} صفحة</span>
        </div>
        <div class="profile-khatmah-bar">
          <div class="profile-khatmah-fill" style="width:${progress}%"></div>
        </div>`;
    }
  }

  /* ── Quran stats ── */
  var totalDaysEl = document.getElementById("profileTotalDays");
  var pagesReadEl = document.getElementById("profilePagesRead");
  var currentPageEl = document.getElementById("profileCurrentPage");
  var khatmahCountEl = document.getElementById("profileKhatmahCount");

  if (totalDaysEl) {
    var readingDays = 0;
    try {
      var quranProgress = JSON.parse(
        localStorage.getItem("quranWeeklyProgress") || "{}",
      );
      readingDays = Object.keys(quranProgress).filter(function (key) {
        return (quranProgress[key] || 0) > 0;
      }).length;
    } catch (e) {
      readingDays = 0;
    }
    if (typeof setPtStatValue === "function") {
      setPtStatValue(totalDaysEl, readingDays);
    } else {
      totalDaysEl.textContent = toArabicNumber(readingDays);
    }
  }
  if (pagesReadEl)
    pagesReadEl.textContent = toArabicNumber(khatmahState.totalPagesRead || 0);
  if (currentPageEl)
    currentPageEl.textContent = toArabicNumber(khatmahState.lastReadPage || 0);

  // Khatmah count
  if (khatmahCountEl) {
    var completedKhatmahCount = parseInt(
      localStorage.getItem("completedKhatmahCount") || "0",
      10,
    );
    if (typeof setPtStatValue === "function") {
      setPtStatValue(khatmahCountEl, completedKhatmahCount);
    } else {
      khatmahCountEl.textContent = toArabicNumber(completedKhatmahCount);
    }
  }

  // Update Quran weekly chart too
  if (typeof updateQuranWeeklyChart === "function") {
    updateQuranWeeklyChart();
  }
}

// ===== INITIALIZATION =====

function initQuranFeature() {
  khatmahState = loadKhatmahState();
  checkOfflineQuranStatus();
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initQuranFeature, 200);
});
