// Global variables
let currentCategory = null;
let isHomePage = true;
let currentCount = 0;
let totalCount = 0;
let currentZikrText = "";
let currentZikrIndex = null;

// Enhanced global variables for UX improvements
let favorites = JSON.parse(localStorage.getItem("zekrFavorites")) || [];
let userPreferences = JSON.parse(localStorage.getItem("userPreferences")) || {
  fontSize: "medium",
  autoPlay: false,
  showFadl: true,
  soundEnabled: true,
  lastCategory: "all",
};
let dailyProgress = JSON.parse(localStorage.getItem("dailyProgress")) || {
  date: new Date().toDateString(),
  completedZekr: [],
  streak: parseInt(localStorage.getItem("dailyStreak")) || 0,
  totalCompletions: parseInt(localStorage.getItem("totalCompletions")) || 0,
};

// Check and update daily progress
function checkDailyProgress() {
  const today = new Date().toDateString();
  if (dailyProgress.date !== today) {
    // New day - reset daily progress but maintain streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      dailyProgress.date === yesterday.toDateString() &&
      dailyProgress.completedZekr.length > 0
    ) {
      dailyProgress.streak++;
    } else if (dailyProgress.completedZekr.length === 0) {
      dailyProgress.streak = 0;
    }

    dailyProgress.date = today;
    dailyProgress.completedZekr = [];
    saveDailyProgress();

    // Reset all azkar counts and swiper positions so each category starts fresh from the first zekr
    Object.keys(adhkarData).forEach((cat) => {
      adhkarData[cat].adhkar.forEach((z) => {
        z.currentCount = 0;
      });
      localStorage.removeItem("swiperPos_" + cat);
    });
    saveProgress();
  }
  updateProgressStats();
}

function saveDailyProgress() {
  localStorage.setItem("dailyProgress", JSON.stringify(dailyProgress));
  localStorage.setItem("dailyStreak", dailyProgress.streak.toString());
  localStorage.setItem(
    "totalCompletions",
    dailyProgress.totalCompletions.toString(),
  );
}

function getWeeklyCompletions() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // For now, return a simple calculation based on daily progress
  // This can be enhanced later with more detailed tracking
  return Math.min(
    dailyProgress.completedZekr.length * 7,
    dailyProgress.totalCompletions,
  );
}

function updateProgressStats() {
  const totalZekr = Object.values(adhkarData).reduce(
    (sum, category) => sum + category.adhkar.length,
    0,
  );
  const completedToday = dailyProgress.completedZekr.length;
  const completionRate =
    totalZekr > 0 ? Math.round((completedToday / totalZekr) * 100) : 0;
  const favoritesCount = favorites.length;

  // Update stats in the DOM if elements exist (matching HTML IDs)
  const dailyStreakEl = document.getElementById("dailyStreak");
  const totalCompletionsEl = document.getElementById("totalCompletions");
  const todayCompletionsEl = document.getElementById("todayCompletions");
  const weekCompletionsEl = document.getElementById("weekCompletions");

  if (dailyStreakEl) {
    dailyStreakEl.textContent = dailyProgress.streak || 0;
  }
  if (totalCompletionsEl) {
    totalCompletionsEl.textContent = dailyProgress.totalCompletions;
  }
  if (todayCompletionsEl) {
    todayCompletionsEl.textContent = completedToday;
  }
  if (weekCompletionsEl) {
    weekCompletionsEl.textContent = getWeeklyCompletions();
  }
}

// Notification system - centralized single toast manager
let notificationTimer = null;

function showNotification(message, type = "success", duration = 3000) {
  const notification = document.getElementById("notification") || document.querySelector(".notification");
  if (!notification) return;

  const icon = notification.querySelector("i");
  const textSpan = document.getElementById("notificationText") || notification.querySelector("span");

  // Update icon based on type
  if (icon) {
    if (type === "success") icon.className = "fas fa-check-circle";
    else if (type === "warning") icon.className = "fas fa-exclamation-triangle";
    else if (type === "error") icon.className = "fas fa-circle-xmark";
    else icon.className = "fas fa-info-circle";
  }

  // Update message
  if (textSpan) textSpan.textContent = message;

  // Update colors
  if (type === "success") {
    notification.style.background = "linear-gradient(135deg, #1a8a5c, #2d9d6e)";
  } else if (type === "info") {
    notification.style.background = "linear-gradient(135deg, #2b6cb0, #3182ce)";
  } else if (type === "warning") {
    notification.style.background = "linear-gradient(135deg, #d4a847, #b8860b)";
  } else if (type === "error") {
    notification.style.background = "linear-gradient(135deg, #e53e3e, #c53030)";
  }

  notification.classList.add("show");

  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  notificationTimer = setTimeout(() => {
    notification.classList.remove("show");
  }, duration || 3000);
}

// Celebration modal
function showCelebration(title, message, isComplete = false) {
  const celebration = document.querySelector(".celebration");
  if (!celebration) return;

  const icon = celebration.querySelector(".celebration-icon");
  const titleEl = celebration.querySelector("h3");
  const messageEl = celebration.querySelector("p");

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  if (icon) {
    icon.innerHTML = isComplete ? "🎉" : "⭐";
  }

  if (isComplete) {
    celebration.style.background = "linear-gradient(135deg, #b8860b, #48bb78)";
  } else {
    celebration.style.background = "linear-gradient(135deg, #1a8a5c, #d4a847)";
  }

  celebration.classList.add("show");
}

function hideCelebration() {
  const celebration = document.querySelector(".celebration");
  if (celebration) celebration.classList.remove("show");
}

// Font size controls
function setFontSize(size, showNotif = true) {
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".font-btn");

  // Remove active class from all buttons
  buttons.forEach((btn) => btn.classList.remove("active"));

  // Add active class to selected button
  const activeBtn = document.querySelector(
    `[onclick*="setFontSize('${size}')"]`,
  );
  if (activeBtn) activeBtn.classList.add("active");

  // Set CSS variable
  switch (size) {
    case "small":
      root.style.setProperty("--adhkar-font-size", "1.1rem");
      break;
    case "medium":
      root.style.setProperty("--adhkar-font-size", "1.3rem");
      break;
    case "large":
      root.style.setProperty("--adhkar-font-size", "1.6rem");
      break;
  }

  // Save preference
  userPreferences.fontSize = size;
  localStorage.setItem("userPreferences", JSON.stringify(userPreferences));

  // Only show notification if explicitly requested (user click)
  if (showNotif) {
    const sizeNames = { small: "صغير", medium: "متوسط", large: "كبير" };
    showNotification(`تم تغيير حجم الخط إلى ${sizeNames[size]}`);
  }
}

// Quick access functions
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  // showNotification("تم الانتقال إلى أعلى الصفحة");
}

function showFavorites() {
  if (favorites.length === 0) {
    showNotification("لم تضف أي أذكار إلى المفضلة بعد", "info");
    return;
  }

  // Create favorites display
  const favoriteZekr = [];
  Object.keys(adhkarData).forEach((categoryKey) => {
    const category = adhkarData[categoryKey];
    category.adhkar.forEach((zekr, index) => {
      const zekrId = `${categoryKey}_${index}`;
      if (favorites.includes(zekrId)) {
        favoriteZekr.push({
          category: category.title,
          zekr: zekr,
          categoryKey: categoryKey,
          index: index,
        });
      }
    });
  });

  showNotification(`عرض ${favorites.length} من الأذكار المفضلة`);
}

function showFavoritesPage() {
  if (favorites.length === 0) {
    showNotification("لم تضف أي أذكار إلى المفضلة بعد", "info");
    return;
  }

  // Navigate to favorites section
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    if (btn.dataset.category === "favorites") {
      btn.click();
    }
  });

  showNotification(`عرض ${favorites.length} من الأذكار المفضلة`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateFavoritesButton() {
  const favoritesBtn = document.getElementById("favoritesBtn");
  if (favoritesBtn) {
    if (favorites.length > 0) {
      favoritesBtn.classList.add("has-favorites");
    } else {
      favoritesBtn.classList.remove("has-favorites");
    }
  }
}

function toggleStats() {
  const stats = document.querySelector(".progress-stats");
  if (stats) {
    const isHidden = stats.style.display === "none";
    stats.style.display = isHidden ? "block" : "none";
    showNotification(isHidden ? "تم عرض الإحصائيات" : "تم إخفاء الإحصائيات");
  }
}

// Favorites system
function toggleFavorite(categoryKey, zekrIndex, event) {
  if (event) event.stopPropagation();

  const zekrId = `${categoryKey}_${zekrIndex}`;
  const index = favorites.indexOf(zekrId);
  const button = event ? event.target.closest(".favorite-btn") : null;

  if (index > -1) {
    favorites.splice(index, 1);
    if (button) button.classList.remove("active");
    showNotification("تم إزالة الذكر من المفضلة");
  } else {
    favorites.push(zekrId);
    if (button) button.classList.add("active");
    showNotification("تم إضافة الذكر إلى المفضلة");
  }

  localStorage.setItem("zekrFavorites", JSON.stringify(favorites));
  updateProgressStats();
  updateFavoritesButton();
}

function getCategoryDisplayName(category) {
  if (!category || !adhkarData[category]) return "غير محدد";
  return adhkarData[category].title;
}

// Enhanced completion tracking
function markZekrCompleted(categoryKey, zekrIndex) {
  const zekrId = `${categoryKey}_${zekrIndex}`;

  if (!dailyProgress.completedZekr.includes(zekrId)) {
    dailyProgress.completedZekr.push(zekrId);
    dailyProgress.totalCompletions++;
    saveDailyProgress();
    updateProgressStats();

    // Check for completion milestones
    const completed = dailyProgress.completedZekr.length;
    const total = Object.values(adhkarData).reduce(
      (sum, category) => sum + category.adhkar.length,
      0,
    );

    if (completed === total) {
      showCelebration(
        "مبروك! 🎉",
        "لقد أكملت جميع الأذكار اليوم! جزاك الله خيراً",
        true,
      );
    } else if (completed === Math.floor(total / 2)) {
      showCelebration(
        "إنجاز رائع! ⭐",
        "لقد أكملت نصف الأذكار اليوم، استمر بارك الله فيك",
      );
    } else if (completed % 5 === 0 && completed > 0) {
      showCelebration(
        "أحسنت! 🌟",
        `أكملت ${completed} من الأذكار، استمر في ذكر الله`,
      );
    }
  }
}

// DOM Elements
const homePage = document.getElementById("tab-home");
const azkarListView = document.getElementById("azkarListView");
const categoryPage = document.getElementById("categoryPage");
const categoriesContainer = document.getElementById("categoriesContainer");
const categoryTitle = document.getElementById("categoryTitle");
const categoryDescription = document.getElementById("categoryDescription");
const adhkarContainer = document.getElementById("adhkarContainer");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("counterModal");
const closeModal = document.querySelector(".close");
const countNumber = document.getElementById("countNumber");
const totalCountSpan = document.getElementById("totalCount");
const countBtn = document.getElementById("countBtn");
const resetBtn = document.getElementById("resetBtn");
const progressFill = document.getElementById("progressFill");
const modalTitle = document.getElementById("modalTitle");
const fadlText = document.getElementById("fadlText");
const homeBtn = document.getElementById("homeBtn");
const backBtn = document.getElementById("backBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

/* ─── Tab Switching System ─── */
function switchTab(tabId) {
  if (window.AppRouter) {
    window.AppRouter.switchTab(tabId, true);
    return;
  }
  // Fallback if AppRouter not yet ready
  document.querySelectorAll(".tab-content").forEach(function (section) {
    section.classList.remove("active-tab");
  });
  var target = document.getElementById(tabId);
  if (target) target.classList.add("active-tab");
  document.querySelectorAll(".bottom-nav-item").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
  var header = document.querySelector(".header");
  if (header) {
    header.style.display = tabId === "tab-home" ? "" : "none";
  }
  if (window.SafeStorage) {
    window.SafeStorage.set("activeTab", tabId);
  } else {
    try { localStorage.setItem("activeTab", tabId); } catch (e) {}
  }
}

// Theme management functions
function loadTheme() {
  const savedTheme = localStorage.getItem("adhkar-theme");

  if (savedTheme === "light") {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
  }

  updateThemeSwitcherUI();
}

function setAppTheme(mode) {
  document.body.classList.add("theme-transition");
  if (mode === "dark") {
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
    localStorage.setItem("adhkar-theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
    localStorage.setItem("adhkar-theme", "light");
  }

  updateThemeSwitcherUI();

  if (window.AdhanNative && typeof window.AdhanNative.updateStatusBar === "function") {
    try { window.AdhanNative.updateStatusBar(); } catch (e) {}
  }

  setTimeout(() => {
    document.body.classList.remove("theme-transition");
  }, 300);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  setAppTheme(isDark ? "light" : "dark");
}

function updateThemeSwitcherUI() {
  const isDark = document.body.classList.contains("dark-mode");
  const darkBtn = document.getElementById("themeDarkBtn");
  const lightBtn = document.getElementById("themeLightBtn");
  if (darkBtn) darkBtn.classList.toggle("active", isDark);
  if (lightBtn) lightBtn.classList.toggle("active", !isDark);
}

// Make functions globally accessible
window.loadTheme = loadTheme;
window.setAppTheme = setAppTheme;
window.toggleTheme = toggleTheme;
window.updateThemeSwitcherUI = updateThemeSwitcherUI;

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadTheme(); // Load saved theme preference
  loadProgress();
  // Initialise tab system
  var savedTab = localStorage.getItem("activeTab") || "tab-home";
  switchTab(savedTab);
  setupEventListeners();

  // Show install instructions on first visit (only in web browser mode)
  checkAndShowInstallInstructions();
});

function checkAndShowInstallInstructions() {
  if (isStandaloneMode()) return;

  const hasDownloaded = localStorage.getItem("hasDownloadedApk") === "true";
  // If user already downloaded the app, don't auto-show popup on page load
  if (hasDownloaded) return;

  const dismissed = localStorage.getItem("installInstructionsDismissed");
  const dismissedDate = localStorage.getItem(
    "installInstructionsDismissedDate",
  );
  const remindLater = localStorage.getItem("installInstructionsRemindLater");

  // If user clicked dismissed / understood, don't show again for 14 days
  if (dismissed && dismissedDate) {
    const daysSinceDismissed =
      (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 14) {
      return; // Don't show
    }
  }

  // If user clicked "remind later", don't show for 2 days
  if (remindLater) {
    const daysSinceRemind =
      (Date.now() - parseInt(remindLater)) / (1000 * 60 * 60 * 24);
    if (daysSinceRemind < 2) {
      return; // Don't show
    }
  }

  // Show instructions smoothly after a short delay for better UX
  setTimeout(() => {
    showManualInstallInstructions(false);
  }, 1200);
}

function handleApkDownload(event) {
  try {
    localStorage.setItem("hasDownloadedApk", "true");
    localStorage.setItem("installInstructionsDismissed", "true");
    localStorage.setItem("installInstructionsDismissedDate", Date.now().toString());
  } catch (err) {
    console.error("Storage error:", err);
  }

  showNotification("جارٍ بدء تحميل تطبيق ذَكِّرْ للأندرويد... 🎉");

  setTimeout(() => {
    dismissInstallModal(true);
  }, 1200);
}

function showManualInstallInstructions(forceShow = false) {
  // If running in standalone and not manually requested, skip
  if (!forceShow && isStandaloneMode()) return;

  // Prevent duplicate modals
  const existing = document.getElementById("installInstructionsModal");
  if (existing) existing.remove();

  const hasDownloaded = localStorage.getItem("hasDownloadedApk") === "true";

  const instructionsModal = document.createElement("div");
  instructionsModal.className = "modal";
  instructionsModal.style.display = "block";
  instructionsModal.id = "installInstructionsModal";

  let modalContentHtml = "";

  if (hasDownloaded) {
    modalContentHtml = `
      <div class="install-header">
        <div class="install-logo-wrap">
          <img src="images/icon-192.png" alt="شعار ذَكِّرْ" class="install-app-logo" />
        </div>
        <h3 class="install-title">تطبيق <span class="install-brand-name">«ذَكِّرْ»</span> للأندرويد</h3>
        <div class="installed-status-chip">
          <i class="fas fa-circle-check"></i>
          <span>التطبيق مُحمّل على جهازك بالفعل</span>
        </div>
        <p class="install-subtitle" style="margin-top: 0.6rem;">
          يمكنك إعادة تحميل التطبيق بصيغة APK في أي وقت لتحديثه أو تثبيته مجدداً:
        </p>
      </div>

      <div class="apk-download-hero">
        <div class="apk-badge-row">
          <span class="pt-chip pt-chip--em"><i class="fab fa-android"></i> نسخة أندرويد الرسمية</span>
          <span class="pt-chip pt-chip--gd"><i class="fas fa-file-arrow-down"></i> 8 ميجابايت</span>
        </div>

        <a class="apk-download-btn apk-download-btn--re" href="Download-APK/Zakr.apk" download="Zakr.apk" onclick="handleApkDownload(event)">
          <i class="fas fa-redo-alt"></i>
          إعادة تحميل التطبيق (APK)
        </a>
        <span class="apk-download-meta">
          <i class="fas fa-bolt"></i>
          تحميل مباشر وسريع
        </span>
      </div>

      <div class="install-buttons">
        <button onclick="dismissInstallModal(true)" class="install-btn secondary">
          <i class="fas fa-xmark"></i> إغلاق
        </button>
      </div>
    `;
  } else {
    modalContentHtml = `
      <div class="install-header">
        <div class="install-logo-wrap">
          <img src="images/icon-192.png" alt="شعار ذَكِّرْ" class="install-app-logo" />
        </div>
        <h3 class="install-title">حمّل تطبيق <span class="install-brand-name">«ذَكِّرْ»</span> الآن</h3>
        <p class="install-subtitle">احصل على التطبيق الكامل لتفعيل المؤذن وكافة المميزات بدون إنترنت</p>
      </div>

      <div class="adhan-feature-card">
        <div class="adhan-card-icon">
          <i class="fas fa-volume-high"></i>
        </div>
        <div class="adhan-card-body">
          <div class="adhan-card-title">
            <i class="fas fa-mosque"></i>
            تفعيل صوت الأذان والمؤذن
          </div>
          <p class="adhan-card-text">
            سماع الأذان لكل صلاة في موعدها الدقيق بأجمل الأصوات، مع تنبيهات تعمل في الخلفية وبدون إنترنت.
          </p>
        </div>
      </div>

      <div class="apk-download-hero">
        <div class="apk-badge-row">
          <span class="pt-chip pt-chip--em"><i class="fab fa-android"></i> تطبيق أندرويد (APK)</span>
          <span class="pt-chip pt-chip--gd"><i class="fas fa-shield-halved"></i> مجاني وبدون إعلانات</span>
        </div>

        <div class="apk-features-grid">
          <div class="apk-feat-chip">
            <i class="fas fa-wifi-slash"></i>
            <span>يعمل 100% بدون نت</span>
          </div>
          <div class="apk-feat-chip">
            <i class="fas fa-bell"></i>
            <span>تنبيهات الصلاة والأذكار</span>
          </div>
          <div class="apk-feat-chip">
            <i class="fas fa-book-quran"></i>
            <span>القرآن وتتبع الختمات</span>
          </div>
          <div class="apk-feat-chip">
            <i class="fas fa-hand-holding-heart"></i>
            <span>صدقة جارية بلا إعلانات</span>
          </div>
        </div>

        <a class="apk-download-btn" href="Download-APK/Zakr.apk" download="Zakr.apk" onclick="handleApkDownload(event)">
          <i class="fas fa-download"></i>
          تحميل التطبيق مباشرة (APK)
        </a>
        <span class="apk-download-meta">
          <i class="fas fa-bolt"></i>
          تحميل سريع ومباشر بحجم خفيف
        </span>
      </div>

      <div class="install-buttons">
        <button onclick="dismissInstallModal(false)" class="install-btn secondary">
          <i class="fas fa-xmark"></i> سأقوم بالتحميل لاحقاً
        </button>
      </div>
    `;
  }

  instructionsModal.innerHTML = `
    <div class="modal-content install-modal-content">
      <span class="close" onclick="dismissInstallModal(true)">&times;</span>
      <div class="install-content">
        ${modalContentHtml}
      </div>
    </div>
  `;

  document.body.appendChild(instructionsModal);
}

function dismissInstallModal(understood) {
  const modal = document.getElementById("installInstructionsModal");
  if (modal) {
    modal.remove();
  }

  // If user clicked "understood" or closed, don't show again for 14 days
  if (understood) {
    localStorage.setItem("installInstructionsDismissed", "true");
    localStorage.setItem("installInstructionsDismissedDate", Date.now().toString());
  }
  // If "remind me later", don't show for 2 days
  else {
    localStorage.setItem("installInstructionsRemindLater", Date.now().toString());
  }
}

// Setup event listeners
function setupEventListeners() {
  // Modal events (safe guards for removed legacy modal)
  if (closeModal) closeModal.addEventListener("click", closeCounterModal);
  window.addEventListener("click", function (e) {
    if (modal && e.target === modal) {
      closeCounterModal();
    }
    const qModal = document.getElementById("qiblaModal");
    if (qModal && e.target === qModal) {
      closeQiblaModal();
    }
  });

  if (countBtn) countBtn.addEventListener("click", incrementCounter);
  if (resetBtn) resetBtn.addEventListener("click", resetCounter);

  // Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if (modal && modal.style.display === "block") {
      if (e.key === "Escape") {
        closeCounterModal();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        incrementCounter();
      } else if (e.key === "r" || e.key === "R") {
        resetCounter();
      }
    }
  });
}

// Show azkar list (populate categories)
function _showHomePageInternal() {
  // Don't reset counters when leaving — preserve progress
  // Counters only reset when ALL azkar in a category are completed

  // Disconnect IntersectionObserver to prevent stale callbacks
  if (_swiperObserver) {
    _swiperObserver.disconnect();
    _swiperObserver = null;
  }
  _swiperIsScrolling = false;

  // Toggle internal azkar views
  if (azkarListView) azkarListView.classList.remove("hidden");
  if (categoryPage) categoryPage.classList.add("hidden");
  if (backBtn) backBtn.classList.add("hidden");
  isHomePage = true;
  currentCategory = null;

  // Populate categories once to eliminate flicker on subsequent tab switches
  if (categoriesContainer && categoriesContainer.children.length === 0) {
    Object.keys(adhkarData).forEach((categoryKey, index) => {
      createCategoryCard(categoryKey, adhkarData[categoryKey], index);
    });
  }

  // Time-aware suggestion card
  renderAzkarSuggestion();
}

/**
 * Render the time-aware Azkar suggestion card (Azkar tab).
 */
function renderAzkarSuggestion() {
  const host = document.getElementById("azkarSuggestion");
  if (!host) return;

  const mode = getHeroCardMode(new Date());
  const content = {
    morning: ["is-em", "fa-sun", "حان وقت أذكار الصباح", "من ٢٩ ذكرًا · نحو ٨ دقائق", "showCategoryPage('morning')", 30],
    midday: ["is-em", "fa-fingerprint", "حان وقت التسبيح", "سبّح واذكر الله بالمسبحة الإلكترونية", "openMisbaha()", 50],
    evening: ["", "fa-cloud-moon", "حان وقت أذكار المساء", "من ٢٦ ذكرًا · نحو ٨ دقائق", "showCategoryPage('evening')", 70],
    maghrib: ["is-em", "fa-fingerprint", "حان وقت ذكر الله", "وقت مناسب للتسبيح بالمسبحة الإلكترونية", "openMisbaha()", 80],
    night: ["", "fa-moon", "حان وقت أذكار النوم", "أذكار النوم وسورة الملك · نحو ٥ دقائق", "showCategoryPage('sleep')", 90],
    friday: ["is-gold", "fa-book-quran", "جمعة مباركة", "سورة الكهف والصلاة على النبي ﷺ", "openSurahAlKahf()", 65],
  }[mode];
  const [variant, icon, title, sub, action, progress] = content;

  host.innerHTML = `
    <div class="pt-suggest ${variant}">
      <div class="pt-suggest__top">
        <span class="pt-suggest__now">الآن</span>
        <span class="pt-suggest__ico"><i class="fas ${icon}"></i></span>
      </div>
      <h2 class="pt-suggest__title">${title}</h2>
      <p class="pt-suggest__sub">${sub}</p>
      <div class="pt-suggest__bar"><span style="width:${progress}%"></span></div>
      <button class="pt-suggest__cta" onclick="${action}">
        <i class="fas fa-play"></i>
        <span>ابدأ الأذكار</span>
      </button>
    </div>
  `;
}

/**
 * Show/hide the Azkar search field.
 */
function toggleAzkarSearch() {
  const box = document.getElementById("azkarSearchBox");
  const input = document.getElementById("azkarSearchInput");
  if (!box) return;
  const open = box.classList.toggle("is-open");
  if (open && input) {
    setTimeout(() => input.focus(), 60);
  } else if (input) {
    input.value = "";
    filterAzkarCategories("");
  }
}

/**
 * Filter the Azkar category grid by name.
 */
function filterAzkarCategories(query) {
  const q = (query || "").trim();
  const cards = document.querySelectorAll("#categoriesContainer .category-card");
  cards.forEach((card) => {
    const title = card.querySelector(".category-title");
    const match = !q || (title && title.textContent.includes(q));
    card.style.display = match ? "" : "none";
  });

  const suggestion = document.getElementById("azkarSuggestion");
  const misbahaRow = document.getElementById("misbahaLaunchBtn");
  if (suggestion) suggestion.style.display = q ? "none" : "";
  if (misbahaRow) misbahaRow.style.display = q ? "none" : "";
}

function showHomePage(syncRouter) {
  if (syncRouter !== false && window.AppRouter && window.AppRouter.isModalOpen("azkarCategory")) {
    window.AppRouter.closeModal("azkarCategory");
    return;
  }
  _showHomePageInternal();
}

// Show category page with adhkar
function showCategoryPage(categoryKey) {
  // Switch to azkar tab first
  switchTab("tab-azkar");
  // Then show detail view
  if (azkarListView) azkarListView.classList.add("hidden");
  categoryPage.classList.remove("hidden");
  if (backBtn) backBtn.classList.remove("hidden");
  isHomePage = false;
  currentCategory = categoryKey;

  loadCategory(categoryKey);

  // Scroll to top of page
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Register with AppRouter for Hardware Back Button handling
  if (window.AppRouter && !window.AppRouter.isModalOpen("azkarCategory")) {
    window.AppRouter.pushModal("azkarCategory", function () {
      _showHomePageInternal();
    });
  }
}

// SVG icons for category cards (matching the reference design)
const categoryIcons = {
  morning: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.6"/>
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#sunGlow)"/>
    <circle cx="50" cy="50" r="20" fill="#FFD700"/>
    <circle cx="50" cy="50" r="16" fill="#FFA500"/>
    <g stroke="#FFD700" stroke-width="3" stroke-linecap="round">
      <line x1="50" y1="10" x2="50" y2="22"/>
      <line x1="50" y1="78" x2="50" y2="90"/>
      <line x1="10" y1="50" x2="22" y2="50"/>
      <line x1="78" y1="50" x2="90" y2="50"/>
      <line x1="21" y1="21" x2="30" y2="30"/>
      <line x1="70" y1="70" x2="79" y2="79"/>
      <line x1="79" y1="21" x2="70" y2="30"/>
      <line x1="30" y1="70" x2="21" y2="79"/>
    </g>
  </svg>`,
  evening: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#87CEEB;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#moonGlow)"/>
    <path d="M55 20 C35 20, 20 40, 25 60 C30 80, 55 85, 70 70 C55 75, 40 60, 40 45 C40 30, 50 20, 55 20Z" fill="#C0D8E8"/>
    <path d="M55 20 C35 20, 20 40, 25 60 C30 80, 55 85, 70 70 C55 75, 40 60, 40 45 C40 30, 50 20, 55 20Z" fill="url(#moonGlow)" opacity="0.5"/>
    <circle cx="68" cy="28" r="2" fill="#FFD700"/>
    <circle cx="78" cy="40" r="1.5" fill="#FFD700"/>
    <circle cx="75" cy="55" r="2.5" fill="#FFD700"/>
    <circle cx="82" cy="30" r="1" fill="#FFD700"/>
    <circle cx="85" cy="48" r="1.5" fill="#FFD700"/>
    <path d="M65 22 l2 5 5 0 -4 3 1.5 5 -4.5-3 -4.5 3 1.5-5 -4-3 5 0z" fill="#FFD700" transform="scale(0.6) translate(35, 10)"/>
  </svg>`,
  prayer: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="prayGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.4"/>
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="40" r="35" fill="url(#prayGlow)"/>
    <path d="M35 75 C35 50, 30 40, 30 30 C30 20, 35 15, 40 25 C42 30, 43 40, 45 50 L50 35 L55 50 C57 40, 58 30, 60 25 C65 15, 70 20, 70 30 C70 40, 65 50, 65 75Z" fill="#E8D5B0" stroke="#D4A847" stroke-width="1"/>
    <path d="M42 30 C44 25, 46 22, 50 22 C54 22, 56 25, 58 30" fill="none" stroke="#FFD700" stroke-width="2" opacity="0.6"/>
    <circle cx="50" cy="18" r="3" fill="#FFD700" opacity="0.5"/>
  </svg>`,
  sleep: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#7B9EC7"/>
        <stop offset="100%" style="stop-color:#5A7FA0"/>
      </linearGradient>
    </defs>
    <rect x="15" y="55" width="70" height="20" rx="4" fill="url(#bedGrad)"/>
    <rect x="12" y="70" width="4" height="12" rx="2" fill="#5A7FA0"/>
    <rect x="84" y="70" width="4" height="12" rx="2" fill="#5A7FA0"/>
    <rect x="80" y="48" width="5" height="25" rx="2" fill="#5A7FA0"/>
    <ellipse cx="30" cy="50" rx="12" ry="8" fill="#A8C4DB"/>
    <circle cx="35" cy="42" r="8" fill="#D4B896"/>
    <text x="60" y="40" font-size="14" fill="#87CEEB" font-weight="bold" opacity="0.8">Z</text>
    <text x="68" y="30" font-size="10" fill="#87CEEB" font-weight="bold" opacity="0.6">Z</text>
    <text x="74" y="22" font-size="8" fill="#87CEEB" font-weight="bold" opacity="0.4">Z</text>
  </svg>`,
  wakeup: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sunriseGrad" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:0.6"/>
        <stop offset="50%" style="stop-color:#FFD700;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="60" width="100" height="40" fill="url(#sunriseGrad)" opacity="0.3"/>
    <circle cx="50" cy="62" r="18" fill="#FFD700"/>
    <circle cx="50" cy="62" r="14" fill="#FFA500"/>
    <line x1="10" y1="62" x2="90" y2="62" stroke="#C0D8E8" stroke-width="2" opacity="0.5"/>
    <g stroke="#FFD700" stroke-width="2.5" stroke-linecap="round" opacity="0.8">
      <line x1="50" y1="32" x2="50" y2="40"/>
      <line x1="25" y1="42" x2="32" y2="48"/>
      <line x1="75" y1="42" x2="68" y2="48"/>
      <line x1="15" y1="56" x2="24" y2="56"/>
      <line x1="85" y1="56" x2="76" y2="56"/>
    </g>
  </svg>`,
  general: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="personGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#87CEEB;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#personGlow)"/>
    <circle cx="50" cy="30" r="10" fill="#C0D8E8"/>
    <path d="M50 42 L50 65" stroke="#C0D8E8" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 48 L30 35" stroke="#C0D8E8" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 48 L70 35" stroke="#C0D8E8" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 65 L35 82" stroke="#C0D8E8" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 65 L65 82" stroke="#C0D8E8" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M45 15 C38 10, 30 15, 35 22 C28 18, 30 10, 38 8 C42 7, 46 10, 45 15Z" fill="#C0D8E8" opacity="0.8"/>
  </svg>`,
  food: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="foodGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="55" r="35" fill="url(#foodGlow)"/>
    <ellipse cx="50" cy="60" rx="30" ry="15" fill="none" stroke="#D4A847" stroke-width="2.5"/>
    <path d="M20 60 Q50 35 80 60" fill="none" stroke="#D4A847" stroke-width="2.5"/>
    <path d="M30 40 Q35 20 30 10" fill="none" stroke="#C0D8E8" stroke-width="2" opacity="0.5"/>
    <path d="M50 35 Q55 15 50 5" fill="none" stroke="#C0D8E8" stroke-width="2" opacity="0.5"/>
    <path d="M70 40 Q75 20 70 10" fill="none" stroke="#C0D8E8" stroke-width="2" opacity="0.5"/>
  </svg>`,
  travel: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="travelGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#87CEEB;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#travelGlow)"/>
    <path d="M50 20 L55 45 L75 50 L55 55 L50 80 L45 55 L25 50 L45 45Z" fill="#87CEEB" opacity="0.8"/>
    <circle cx="50" cy="50" r="6" fill="#5A7FA0"/>
    <ellipse cx="30" cy="30" rx="12" ry="5" fill="#C0D8E8" opacity="0.4"/>
    <ellipse cx="72" cy="25" rx="10" ry="4" fill="#C0D8E8" opacity="0.3"/>
  </svg>`,
  dua: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="duaGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#1a8a5c;stop-opacity:0.4"/>
        <stop offset="100%" style="stop-color:#1a8a5c;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#duaGlow)"/>
    <path d="M30 80 Q30 55 35 45 Q38 38 43 40 L47 50 L50 38 L53 50 L57 40 Q62 38 65 45 Q70 55 70 80Z" fill="#2d9d6e" opacity="0.8"/>
    <path d="M40 35 L50 20 L60 35" fill="none" stroke="#FFD700" stroke-width="2.5"/>
    <circle cx="50" cy="15" r="4" fill="#FFD700" opacity="0.7"/>
    <line x1="50" y1="8" x2="50" y2="3" stroke="#FFD700" stroke-width="1.5" opacity="0.5"/>
    <line x1="43" y1="10" x2="40" y2="6" stroke="#FFD700" stroke-width="1.5" opacity="0.5"/>
    <line x1="57" y1="10" x2="60" y2="6" stroke="#FFD700" stroke-width="1.5" opacity="0.5"/>
  </svg>`,
  rain: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="rainGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#87CEEB;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="40" r="35" fill="url(#rainGlow)"/>
    <ellipse cx="50" cy="35" rx="28" ry="16" fill="#8BA4B8"/>
    <ellipse cx="35" cy="32" rx="14" ry="12" fill="#A0B4C8"/>
    <ellipse cx="65" cy="32" rx="14" ry="12" fill="#A0B4C8"/>
    <ellipse cx="50" cy="28" rx="12" ry="10" fill="#B4C8DC"/>
    <line x1="30" y1="55" x2="28" y2="68" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <line x1="42" y1="55" x2="40" y2="72" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <line x1="54" y1="55" x2="52" y2="70" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <line x1="66" y1="55" x2="64" y2="68" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  </svg>`,
  distress: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="heartGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" style="stop-color:#E87C7C;stop-opacity:0.4"/>
        <stop offset="100%" style="stop-color:#E87C7C;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#heartGlow)"/>
    <path d="M50 80 C20 55 10 35 25 25 C35 18 45 25 50 35 C55 25 65 18 75 25 C90 35 80 55 50 80Z" fill="#E87C7C"/>
    <path d="M30 50 L40 50 L45 38 L50 55 L55 42 L60 50 L70 50" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  </svg>`,
  home: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="homeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#2d9d6e;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#2d9d6e;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#homeGlow)"/>
    <path d="M50 18 L15 48 L22 48 L22 78 L78 78 L78 48 L85 48Z" fill="#5A7FA0" stroke="#7B9EC7" stroke-width="1.5"/>
    <rect x="40" y="55" width="20" height="23" rx="2" fill="#D4A847" opacity="0.8"/>
    <circle cx="55" cy="67" r="2" fill="#A0843C"/>
    <rect x="28" y="52" width="10" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
    <rect x="62" y="52" width="10" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  </svg>`,
};

// Short labels + Font Awesome icons for the v2 Azkar grid
const categoryMeta = {
  morning: { label: "أذكار الصباح", icon: "fa-sun", color: "pt-c-gold" },
  evening: { label: "أذكار المساء", icon: "fa-cloud-moon", color: "pt-c-indigo" },
  prayer: { label: "أذكار الصلاة", icon: "fa-person-praying", color: "pt-c-em" },
  sleep: { label: "أذكار النوم", icon: "fa-bed", color: "pt-c-blue" },
  wakeup: { label: "أذكار الاستيقاظ", icon: "fa-bell", color: "pt-c-warm" },
  general: { label: "أذكار عامة", icon: "fa-hands-praying", color: "pt-c-purple" },
  eating: { label: "أذكار الطعام", icon: "fa-utensils", color: "pt-c-gold" },
  travel: { label: "أذكار السفر", icon: "fa-plane", color: "pt-c-sky" },
  dua: { label: "أدعية مأثورة", icon: "fa-hand-holding-heart", color: "pt-c-em" },
  rain: { label: "أذكار المطر", icon: "fa-cloud-rain", color: "pt-c-rain" },
  anxiety: { label: "أذكار الهم", icon: "fa-heart-pulse", color: "pt-c-pink" },
  home: { label: "أذكار المنزل", icon: "fa-house", color: "pt-c-em" },
};

// Create category card (instant render with zero layout flicker)
/**
 * Arabic-friendly "N azkar" label for category cards.
 */
function formatAzkarCount(count) {
  if (count === 1) return "ذكر واحد";
  if (count === 2) return "ذكران";
  if (count >= 3 && count <= 10) return `${toArabicNumerals(count)} أذكار`;
  return `${toArabicNumerals(count)} ذكرًا`;
}

function createCategoryCard(categoryKey, categoryData, index) {  const card = document.createElement("div");
  card.className = "category-card";
  card.setAttribute("data-category", categoryKey);

  const adhkarCount = categoryData.adhkar.length;
  const meta = categoryMeta[categoryKey] || {
    label: categoryData.title,
    icon: "fa-hands-praying",
    color: "pt-c-em",
  };

  card.innerHTML = `
    <div class="category-card-inner">
      <div class="category-card-icon ${meta.color}">
        <i class="fas ${meta.icon}"></i>
      </div>
      <div class="category-card-info">
        <h3 class="category-title">${meta.label}</h3>
        <div class="category-card-bottom">
          <span class="category-count-badge">${formatAzkarCount(adhkarCount)}</span>
          <span class="pt-card-chevron"><i class="fas fa-chevron-left"></i></span>
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", () => showCategoryPage(categoryKey));
  categoriesContainer.appendChild(card);
}

// ── Global scroll lock flag for programmatic scrolls ──
let _swiperIsScrolling = false;
let _swiperObserver = null;

// Load category as Swiper (scroll-snap) – uses IntersectionObserver for reliable index detection
function loadCategory(category) {
  const data = adhkarData[category];
  if (categoryTitle) categoryTitle.textContent = data.title;
  if (categoryDescription) categoryDescription.textContent = data.description;
  currentCategory = category;

  const track = document.getElementById("azkarSwiperTrack");
  const dotsWrap = document.getElementById("swiperDotsWrap");
  if (!track) return;

  // Disconnect previous observer if exists
  if (_swiperObserver) {
    _swiperObserver.disconnect();
    _swiperObserver = null;
  }

  track.innerHTML = "";
  if (dotsWrap) dotsWrap.innerHTML = "";

  // Build slides and dots
  data.adhkar.forEach((zikr, index) => {
    createAdhkarSlide(zikr, index, category, track);
    if (dotsWrap) {
      const dot = document.createElement("button");
      dot.className =
        "swiper-dot" +
        (zikr.currentCount >= zikr.count ? " done" : "") +
        (index === 0 ? " active" : "");
      dot.setAttribute("aria-label", `ذكر ${index + 1}`);
      dot.addEventListener("click", () => goToSlide(index));
      dotsWrap.appendChild(dot);
    }
  });

  // Apply saved font size
  loadSwiperFontSize();

  // Restore last position (instant – no animation on first render)
  // Reset to position 0 if it's a new day (so morning azkar start fresh)
  const today = new Date().toDateString();
  const savedPosData = localStorage.getItem("swiperPos_" + category);
  let savedPos = 0;
  if (savedPosData) {
    try {
      const parsed = JSON.parse(savedPosData);
      // Only restore position if same day
      if (parsed.date === today) {
        savedPos = parsed.index || 0;
      }
    } catch (e) {
      // Legacy format (just a number) — treat as expired
      savedPos = 0;
    }
  }
  const validPos = Math.min(Math.max(0, savedPos), data.adhkar.length - 1);
  requestAnimationFrame(() => {
    const slides = track.querySelectorAll(".azkar-slide");
    if (slides[validPos]) {
      slides[validPos].scrollIntoView({
        behavior: "instant",
        inline: "start",
        block: "nearest",
      });
    }
    updateSwiperUI(category, validPos);
  });

  // ── IntersectionObserver – reliably detect active slide ──
  // Fires when a slide crosses 50% visibility in the track viewport.
  // This eliminates the timing race condition between scroll-snap and
  // the old setTimeout-based scrollLeft calculation that caused skipping.
  _swiperObserver = new IntersectionObserver(
    (entries) => {
      // Skip if a programmatic scroll is in progress
      if (_swiperIsScrolling) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const slide = entry.target;
          const idx = parseInt(slide.dataset.index, 10);
          if (!isNaN(idx)) {
            updateSwiperUI(category, idx);
            saveSwiperPosition(category, idx);
          }
        }
      });
    },
    {
      root: track,
      threshold: 0.5, // fire when 50% of slide is visible
    },
  );

  // Observe all slides
  track.querySelectorAll(".azkar-slide").forEach((slide) => {
    _swiperObserver.observe(slide);
  });
}

// Format Dhikr text for maximum visual clarity
function formatZikrDisplayHtml(text) {
  if (!text) return "";
  let formatted = text.trim();

  // Highlight Bismillah as an ornamental header if present at the start
  const basmalaPattern = /^بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم\s*/;
  let hasBasmala = false;
  if (basmalaPattern.test(formatted)) {
    hasBasmala = true;
    formatted = formatted.replace(basmalaPattern, "").trim();
  }

  // Format Ayah brackets e.g. ﴿١﴾ with ornamental gold styling
  formatted = formatted.replace(
    /﴿\s*([٠-٩\d]+)\s*﴾/g,
    '<span class="quran-aya-num">﴿$1﴾</span>',
  );

  // Convert newlines to breaks
  formatted = formatted.replace(/\n/g, "<br>");

  if (hasBasmala) {
    return `<div class="bismillah-header">بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم</div><div class="zikr-content-lines">${formatted}</div>`;
  }
  return `<div class="zikr-content-lines">${formatted}</div>`;
}

// Toggle collapsible Fadl drawer
function toggleSlideFadl(triggerEl) {
  const card = triggerEl.closest(".slide-body");
  if (!card) return;
  const fadlBox = card.querySelector(".slide-fadl-box");
  if (fadlBox) {
    const isCollapsed = fadlBox.classList.contains("collapsed");
    fadlBox.classList.toggle("collapsed", !isCollapsed);
    triggerEl.classList.toggle("active", isCollapsed);
  }
}

// Share Dhikr helper
function shareZikr(text, source) {
  const cleanText = text.replace(/<[^>]*>/g, "");
  const shareData = {
    title: "تطبيق ذَكِّرْ",
    text: `${cleanText}\n[${source}]\n\nتم المشاركة من تطبيق ذَكِّرْ 🌙`,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    copyText(`${cleanText}\n[${source}]`);
    showNotification("تم نسخ الذكر للمشاركة");
  }
}

// Create one swiper slide with Reader-First layout
function createAdhkarSlide(zikr, index, category, track) {
  const isCompleted = zikr.currentCount >= zikr.count;
  const safeText = zikr.text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, " ");
  const safeSource = (zikr.source || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  const totalSlides = adhkarData[category]
    ? adhkarData[category].adhkar.length
    : 0;
  const isFirst = index === 0;
  const isLast = index === totalSlides - 1;
  const isLong = zikr.text.length > 180;

  // Circular ring calculation (radius 44 → circumference ≈ 276.46)
  const circumference = 276.46;
  const progressRatio = Math.min(1, zikr.currentCount / zikr.count);
  const ringOffset = circumference * (1 - progressRatio);
  const remainingCount = Math.max(0, zikr.count - zikr.currentCount);

  const slide = document.createElement("div");
  slide.className = "azkar-slide";
  slide.dataset.index = index;

  slide.innerHTML = `
    <div class="slide-body">
      <!-- ── Hero Reading Text Container ── -->
      <div class="slide-text-container">
        <div class="slide-zikr-text ${isLong ? "long-text" : ""}">
          ${formatZikrDisplayHtml(zikr.text)}
        </div>
      </div>

      <!-- ── Meta Row (Source & Fadl Trigger & Copy) ── -->
      <div class="slide-meta-row">
        <span class="slide-source-label">
          <i class="fas fa-book-open"></i> ${zikr.source}
        </span>
        <div class="slide-meta-actions">
          ${
            zikr.fadl
              ? `<button class="slide-fadl-toggle" onclick="toggleSlideFadl(this)" title="فضل الذكر" aria-label="فضل الذكر">
                   <i class="fas fa-star"></i> <span>فضل الذكر</span> <i class="fas fa-chevron-down arrow-indicator"></i>
                 </button>`
              : ""
          }
          <button class="slide-copy-btn" onclick="copyText('${safeText}')" title="نسخ الذكر" aria-label="نسخ الذكر">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>

      <!-- ── Collapsible Fadl Box ── -->
      ${
        zikr.fadl
          ? `<div class="slide-fadl-box collapsed">
               <div class="slide-fadl-content"><p>${zikr.fadl}</p></div>
             </div>`
          : ""
      }

      <!-- ── Ergonomic Thumb Counter Area ── -->
      <div class="slide-counter-area">
        <div class="slide-counter-row">
          <button
            class="slide-nav-arrow prev-arrow${isFirst ? " disabled" : ""}"
            onclick="swiperPrevSlide()"
            title="الذكر السابق"
            aria-label="الذكر السابق"
            ${isFirst ? "disabled" : ""}
          >
            <i class="fas fa-chevron-right"></i>
          </button>

          <!-- Circular Button with SVG Progress Ring -->
          <button
            class="slide-counter-btn${isCompleted ? " completed" : ""}"
            id="slideCounterBtn_${category}_${index}"
            ${isCompleted ? "disabled" : ""}
            aria-label="عدّ الذكر"
          >
            <svg class="counter-ring-svg" viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="44" />
              <circle 
                class="ring-progress" 
                id="ringProgress_${category}_${index}" 
                cx="50" 
                cy="50" 
                r="44" 
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${ringOffset};" 
              />
            </svg>
            <div class="counter-btn-inner">
              <span class="counter-num">${isCompleted ? "✓" : toArabicNumerals(remainingCount)}</span>
              <span class="counter-lbl">${isCompleted ? "مكتمل" : (zikr.count > 1 ? "متبقي" : "مرة")}</span>
            </div>
          </button>

          <button
            class="slide-nav-arrow next-arrow${isLast ? " disabled" : ""}"
            onclick="swiperNextSlide()"
            title="الذكر التالي"
            aria-label="الذكر التالي"
            ${isLast ? "disabled" : ""}
          >
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
        <div class="counter-status-hint">
          <span class="counter-hint-text">${
            isCompleted
              ? "تقبل الله طاعتكم ✓"
              : zikr.count > 1
                ? "اضغط في أي مكان للعدّ"
                : "اضغط للإتمام"
          }</span>
        </div>
      </div>
    </div>
  `;

  // Attach counter click
  const btn = slide.querySelector(".slide-counter-btn");
  if (btn)
    btn.addEventListener("click", () => decrementSlideCounter(category, index));

  // ── Tap Anywhere Mode ──────────────────────────────
  // Allows user to tap anywhere on the slide to count without aiming at the button
  slide.addEventListener("click", (e) => {
    if (
      e.target.closest(
        "button, a, .slide-fadl-toggle, .slide-fadl-box, .slide-copy-btn, .slide-nav-arrow",
      )
    ) {
      return;
    }
    decrementSlideCounter(category, index);
    createTapRipple(e, slide);
  });

  track.appendChild(slide);
}

// Visual feedback ripple for Tap Anywhere Mode
function createTapRipple(e, container) {
  if (!container) return;
  const ripple = document.createElement("span");
  ripple.className = "tap-anywhere-ripple";
  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 0.45;
  const clientX = e.clientX || rect.left + rect.width / 2;
  const clientY = e.clientY || rect.top + rect.height / 2;
  const x = clientX - rect.left - size / 2;
  const y = clientY - rect.top - size / 2;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  container.appendChild(ripple);
  setTimeout(() => {
    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
  }, 600);
}

// Increment zikr count directly on card
function incrementZikrCount(category, index) {
  const zikr = adhkarData[category].adhkar[index];

  if (zikr.currentCount < zikr.count) {
    zikr.currentCount++;

    // Add visual feedback - find the card and animate it
    const cards = document.querySelectorAll(".adhkar-card");
    if (cards[index]) {
      const card = cards[index];
      // Add pulse animation
      card.style.transform = "scale(0.98)";
      setTimeout(() => {
        card.style.transform = "scale(1)";
      }, 150);
    }

    // Vibration feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Save progress
    saveProgress();

    // Update the specific card progress without reloading the entire page
    updateCardProgress(category, index);

    // Check if this individual zikr is completed and mark it
    if (zikr.currentCount === zikr.count) {
      markZekrCompleted(category, index);
    }

    // Check if all adhkar in the category are completed
    const categoryData = adhkarData[category];
    const allCompleted = categoryData.adhkar.every(
      (adhkar) => adhkar.currentCount === adhkar.count,
    );

    if (allCompleted) {
      setTimeout(() => {
        showNotification("تم إكمال الاذكار! بارك الله فيك");
        // Reset counters after completion so they're fresh next time
        resetCategoryCounters(category);
      }, 300);
    }
  }
}

// Reset all adhkar in current category
function resetAllAdhkar() {
  if (!currentCategory) return;

  // Show confirmation dialog
  if (confirm("هل أنت متأكد من إعادة تعيين جميع الأذكار في هذا القسم؟")) {
    // Reset all adhkar counts in the current category
    adhkarData[currentCategory].adhkar.forEach((zikr) => {
      zikr.currentCount = 0;
    });

    // Save progress
    saveProgress();

    // Update all cards in the current view
    updateAllCardsProgress(currentCategory);

    // Show notification
    showNotification("تم إعادة تعيين جميع الأذكار");
  }
}

// Update all slides / cards progress without reloading
function updateAllCardsProgress(category) {
  if (!category) return;
  adhkarData[category].adhkar.forEach((zikr, index) => {
    updateCardProgress(category, index);
  });
}

// Reset all counters in a category when leaving it
// NOTE: This is now only called when ALL azkar are completed
function resetCategoryCounters(category) {
  if (!category || !adhkarData[category]) return;

  adhkarData[category].adhkar.forEach((zikr) => {
    zikr.currentCount = 0;
  });

  // Reset swiper position so category starts from first zekr next time
  saveSwiperPosition(category, 0);

  // Save progress
  saveProgress();
}

// Handle search
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  const cards = document.querySelectorAll(".adhkar-card");

  cards.forEach((card) => {
    const text = card.querySelector(".adhkar-text").textContent.toLowerCase();
    const source = card
      .querySelector(".adhkar-source")
      .textContent.toLowerCase();

    if (text.includes(searchTerm) || source.includes(searchTerm)) {
      card.style.display = "block";
      card.classList.add("fade-in");
    } else {
      card.style.display = "none";
    }
  });
}

// Open counter modal
function openCounter(text, count, category, index) {
  currentZikrText = text;
  totalCount = count;
  currentCount = adhkarData[category].adhkar[index].currentCount;
  currentCategory = category;
  currentZikrIndex = index;

  const zikr = adhkarData[category].adhkar[index];

  modalTitle.textContent = `العداد - ${count} ${count === 1 ? "مرة" : "مرات"}`;
  totalCountSpan.textContent = count;

  // Display the fadl (virtue/benefit) if available
  if (zikr.fadl) {
    fadlText.textContent = zikr.fadl;
    document.getElementById("fadlSection").style.display = "block";
  } else {
    document.getElementById("fadlSection").style.display = "none";
  }

  updateCounterDisplay();

  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

// Close counter modal
function closeCounterModal() {
  modal.style.display = "none";
  document.body.style.overflow = "auto";

  // No need to reload the entire category -
  // the progress is already updated in real-time
}

// Increment counter
function incrementCounter() {
  if (currentCount < totalCount) {
    currentCount++;

    // Update the data
    if (currentCategory && currentZikrIndex !== null) {
      adhkarData[currentCategory].adhkar[currentZikrIndex].currentCount =
        currentCount;
    }

    updateCounterDisplay();

    // Update the progress bar on the main category page without reloading
    updateCardProgress(currentCategory, currentZikrIndex);

    // Add click animation
    countBtn.style.transform = "scale(0.9)";
    setTimeout(() => {
      countBtn.style.transform = "scale(1)";
    }, 150);

    // Vibration feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Save progress
    saveProgress();

    // Update statistics
    updateProgressStats();

    // Check if completed
    if (currentCount === totalCount) {
      // Mark as completed for daily progress
      if (currentCategory && currentZikrIndex !== null) {
        markZekrCompleted(currentCategory, currentZikrIndex);
      }

      setTimeout(() => {
        showCompletionMessage();
      }, 300);
    }
  }
}

// Reset counter
function resetCounter() {
  currentCount = 0;

  // Update the data
  if (currentCategory && currentZikrIndex !== null) {
    adhkarData[currentCategory].adhkar[currentZikrIndex].currentCount = 0;
  }

  updateCounterDisplay();

  // Update the progress bar on the main category page without reloading
  updateCardProgress(currentCategory, currentZikrIndex);

  saveProgress();
}

// Update counter display
function updateCounterDisplay() {
  countNumber.textContent = toArabicNumerals(currentCount);
  const progress = (currentCount / totalCount) * 100;
  progressFill.style.width = `${progress}%`;

  // Change color based on progress
  if (progress === 100) {
    countNumber.style.color = "#b8860b";
    progressFill.style.background = "linear-gradient(90deg, #b8860b, #48bb78)";
  } else {
    countNumber.style.color = "#1a8a5c";
    progressFill.style.background = "linear-gradient(90deg, #1a8a5c, #d4a847)";
  }
}

// Update slide counter OR fallback to old card progress bar
function updateCardProgress(category, index) {
  if (!category || index === null) return;

  const zikr = adhkarData[category].adhkar[index];
  const isCompleted = zikr.currentCount >= zikr.count;

  // ─── Swiper slide counter ───
  const swiperBtn = document.getElementById(
    `slideCounterBtn_${category}_${index}`,
  );
  if (swiperBtn) {
    const numEl = swiperBtn.querySelector(".counter-num");
    const lblEl = swiperBtn.querySelector(".counter-lbl");
    const ringEl = document.getElementById(`ringProgress_${category}_${index}`);
    const areaEl = swiperBtn.closest(".slide-counter-area");
    const hintEl = areaEl ? areaEl.querySelector(".counter-hint-text") : null;

    const remaining = Math.max(0, zikr.count - zikr.currentCount);
    if (numEl) numEl.textContent = isCompleted ? "✓" : toArabicNumerals(remaining);
    if (lblEl) lblEl.textContent = isCompleted ? "مكتمل" : (zikr.count > 1 ? "متبقي" : "مرة");

    // Circular SVG Progress Ring update
    if (ringEl) {
      const circumference = 276.46; // 2 * PI * 44
      const ratio = Math.min(1, zikr.currentCount / zikr.count);
      const offset = circumference * (1 - ratio);
      ringEl.style.strokeDashoffset = offset;
    }

    if (isCompleted) {
      swiperBtn.classList.add("completed");
      swiperBtn.disabled = true;
      if (hintEl) hintEl.textContent = "تقبل الله طاعتكم ✓";
      swiperBtn.style.animation = "swiperCounterComplete 0.4s ease forwards";
      setTimeout(() => {
        if (swiperBtn) swiperBtn.style.animation = "";
      }, 500);
    } else {
      swiperBtn.classList.remove("completed");
      swiperBtn.disabled = false;
      if (hintEl)
        hintEl.textContent =
          zikr.count > 1 ? "اضغط في أي مكان للعدّ" : "اضغط للإتمام";
      swiperBtn.style.animation = "swiperCounterPulse 0.18s ease";
      setTimeout(() => {
        if (swiperBtn) swiperBtn.style.animation = "";
      }, 220);
    }
    // Sync dot state
    const dots = document.querySelectorAll(".swiper-dot");
    if (dots[index]) dots[index].classList.toggle("done", isCompleted);
    return;
  }

  // ─── Fallback: old adhkar-card ───
  const cards = document.querySelectorAll(".adhkar-card");
  if (cards[index]) {
    const card = cards[index];
    const progressBar = card.querySelector(".progress-fill");
    const progressText = card.querySelector(".progress-text");
    const countBtn = card.querySelector(".count-action-btn");
    const progressPercent = (zikr.currentCount / zikr.count) * 100;

    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`;
      progressBar.style.background = isCompleted
        ? "linear-gradient(90deg, #b8860b, #48bb78)"
        : "linear-gradient(90deg, #1a8a5c, #d4a847)";
    }
    if (progressText)
      progressText.textContent = isCompleted
        ? "مكتمل"
        : `${toArabicNumerals(zikr.currentCount)} / ${toArabicNumerals(zikr.count)}`;
    if (countBtn) {
      if (isCompleted) {
        countBtn.style.background = "#b8860b";
        countBtn.innerHTML = '<i class="fas fa-plus"></i> مكتمل';
      } else {
        countBtn.style.background = "#1a8a5c";
        countBtn.innerHTML = '<i class="fas fa-plus"></i> عدّ';
      }
    }
  }
}

// Show completion message
function showCompletionMessage() {
  const originalText = countBtn.innerHTML;
  countBtn.innerHTML = '<i class="fas fa-check"></i> تم الإكمال';
  countBtn.style.background = "#b8860b";

  setTimeout(() => {
    countBtn.innerHTML = originalText;
    countBtn.style.background = "#1a8a5c";
  }, 2000);
}

// Copy text to clipboard
function copyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);

  showNotification("تم نسخ النص");
}

// Touch/Swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;
let touchStartTarget = null; // used to skip swipe-back when inside swiper

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartTarget = e.target;
});

document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  const minSwipeDistance = 100;

  // Don't intercept swipes that start inside the azkar swiper track
  const swiperTrack = document.getElementById("azkarSwiperTrack");
  if (
    swiperTrack &&
    touchStartTarget &&
    swiperTrack.contains(touchStartTarget)
  ) {
    return;
  }

  if (Math.abs(swipeDistance) > minSwipeDistance && !isHomePage) {
    if (swipeDistance > 0) {
      // Swipe right - go back to category list
      showHomePage();
    }
  }
}

// ═══════════════════════════════════════════════════════
//  AZKAR SWIPER  –  helper functions
// ═══════════════════════════════════════════════════════

let _currentSwiperIndex = 0;

/** Programmatically scroll to the slide at [index] with smooth animation */
function goToSlide(index) {
  const track = document.getElementById("azkarSwiperTrack");
  if (!track || !currentCategory) return;

  // Lock the observer during programmatic scroll to prevent conflicts
  _swiperIsScrolling = true;

  const slides = track.querySelectorAll(".azkar-slide");
  if (slides[index]) {
    slides[index].scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }
  updateSwiperUI(currentCategory, index);
  saveSwiperPosition(currentCategory, index);

  // Release lock after scroll animation completes
  setTimeout(() => {
    _swiperIsScrolling = false;
  }, 450);
}

/** Navigate to next slide in swiper */
function swiperNextSlide() {
  if (!currentCategory || !adhkarData[currentCategory]) return;
  const total = adhkarData[currentCategory].adhkar.length;
  if (_currentSwiperIndex < total - 1) {
    goToSlide(_currentSwiperIndex + 1);
  }
}

/** Navigate to previous slide in swiper */
function swiperPrevSlide() {
  if (_currentSwiperIndex > 0) {
    goToSlide(_currentSwiperIndex - 1);
  }
}

/** Sync progress badge, progress line, dots, and nav arrows to reflect current slide index */
function updateSwiperUI(category, index) {
  if (!category || !adhkarData[category]) return;
  _currentSwiperIndex = index;
  const total = adhkarData[category].adhkar.length;

  // Convert to Arabic-Indic numerals for the badge
  const toAr = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const badge = document.getElementById("swiperProgressText");
  if (badge) badge.textContent = `${toAr(index + 1)} / ${toAr(total)}`;

  // Progress line fill
  const fill = document.getElementById("swiperProgressFill");
  if (fill) {
    const pct = total > 0 ? ((index + 1) / total) * 100 : 0;
    fill.style.width = pct + "%";
  }

  // Dots
  document.querySelectorAll(".swiper-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  // Enable/disable navigation buttons
  const prevBtn = document.getElementById("swiperPrevBtn");
  const nextBtn = document.getElementById("swiperNextBtn");
  if (prevBtn) prevBtn.classList.toggle("disabled", index <= 0);
  if (nextBtn) nextBtn.classList.toggle("disabled", index >= total - 1);
}

// Keyboard arrow & spacebar controls for Azkar swiper
document.addEventListener("keydown", (e) => {
  const catPage = document.getElementById("categoryPage");
  if (!catPage || catPage.classList.contains("hidden")) return;
  if (e.key === "ArrowLeft") {
    swiperNextSlide();
  } else if (e.key === "ArrowRight") {
    swiperPrevSlide();
  } else if (e.code === "Space" || e.key === " ") {
    // Spacebar to count on desktop
    e.preventDefault();
    if (currentCategory && _currentSwiperIndex !== null) {
      decrementSlideCounter(currentCategory, _currentSwiperIndex);
      const track = document.getElementById("azkarSwiperTrack");
      if (track) {
        const slides = track.querySelectorAll(".azkar-slide");
        if (slides[_currentSwiperIndex]) {
          createTapRipple({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, slides[_currentSwiperIndex]);
        }
      }
    }
  }
});

/**
 * Decrement the visual counter (internally increments currentCount toward
 * the goal, then auto-advances to the next slide on completion).
 */
function decrementSlideCounter(category, index) {
  const zikr = adhkarData[category].adhkar[index];
  if (zikr.currentCount >= zikr.count) return; // already done

  // Delegate to the shared increment logic (updates data + stats + marks done)
  incrementZikrCount(category, index);

  // Auto-advance to next slide on completion with ultra-fluid transition
  if (zikr.currentCount >= zikr.count) {
    // Add completion flash effect to counter button
    const swiperBtn = document.getElementById(
      `slideCounterBtn_${category}_${index}`,
    );
    if (swiperBtn) {
      swiperBtn.classList.add("completion-flash");
      setTimeout(() => swiperBtn.classList.remove("completion-flash"), 600);
    }

    const total = adhkarData[category].adhkar.length;
    if (index < total - 1) {
      // 600ms delay for ultra-fluid auto-advance (was 1500ms)
      setTimeout(() => goToSlide(index + 1), 600);
    }
  }
}

/** Persist which slide the user is on per category (with date for daily reset) */
function saveSwiperPosition(category, index) {
  localStorage.setItem(
    "swiperPos_" + category,
    JSON.stringify({
      index: index,
      date: new Date().toDateString(),
    }),
  );
}

// ── Font-size stepping ──────────────────────────────
const SWIPER_FONT_SIZES = [0.85, 1.05, 1.25, 1.45, 1.7, 2.0]; // rem steps
let swiperFontSizeIndex = 2; // default → 1.25 rem (smaller to avoid header overlap)

// ── Floating settings menu ──────────────────────────
function toggleSwiperSettings() {
  const menu = document.getElementById("swiperFloatingMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

// Close floating menu on outside click
document.addEventListener("click", function (e) {
  const menu = document.getElementById("swiperFloatingMenu");
  const btn = document.getElementById("swiperSettingsBtn");
  if (!menu || menu.classList.contains("hidden")) return;
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

function adjustSwiperFont(delta) {
  swiperFontSizeIndex = Math.max(
    0,
    Math.min(SWIPER_FONT_SIZES.length - 1, swiperFontSizeIndex + delta),
  );
  applyCurrentSwiperFont();
  localStorage.setItem("swiperFontSizeIndex", swiperFontSizeIndex);
}

function applyCurrentSwiperFont() {
  const size = SWIPER_FONT_SIZES[swiperFontSizeIndex];
  document.querySelectorAll(".slide-zikr-text").forEach((el) => {
    if (el.classList.contains("long-text")) {
      el.style.fontSize = (size * 0.88) + "rem";
    } else {
      el.style.fontSize = size + "rem";
    }
  });
}

function loadSwiperFontSize() {
  const saved = localStorage.getItem("swiperFontSizeIndex");
  if (saved !== null) swiperFontSizeIndex = parseInt(saved, 10);
  applyCurrentSwiperFont();
}

// ═══════════════════════════════════════════════════════

// Save progress to localStorage (date-aware)
function saveProgress() {
  localStorage.setItem(
    "adhkarProgress",
    JSON.stringify({
      date: new Date().toDateString(),
      data: adhkarData,
    }),
  );
}

// Load progress from localStorage (starts fresh on a new day)
function loadProgress() {
  const saved = localStorage.getItem("adhkarProgress");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const today = new Date().toDateString();
      const savedDate = parsed.date;
      const savedData = parsed.data || parsed;

      // If data is from a previous day, start fresh from the first zekr
      if (savedDate && savedDate !== today) {
        Object.keys(adhkarData).forEach((categoryKey) => {
          adhkarData[categoryKey].adhkar.forEach((zikr) => {
            zikr.currentCount = 0;
          });
          localStorage.removeItem("swiperPos_" + categoryKey);
        });
        saveProgress();
        return;
      }

      // Update currentCount for all adhkar if same day
      Object.keys(savedData).forEach((categoryKey) => {
        if (
          adhkarData[categoryKey] &&
          savedData[categoryKey] &&
          savedData[categoryKey].adhkar
        ) {
          savedData[categoryKey].adhkar.forEach((savedZikr, index) => {
            if (adhkarData[categoryKey].adhkar[index]) {
              adhkarData[categoryKey].adhkar[index].currentCount =
                savedZikr.currentCount || 0;
            }
          });
        }
      });
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  }
}

// Auto-save progress
setInterval(saveProgress, 10000); // Save every 10 seconds

// Service Worker for offline functionality (optional)
// Capacitor serves the app from a local https://localhost origin where a
// service worker would fight asset updates, so only register it on the web.
const isCapacitorNative =
  typeof window.Capacitor !== "undefined" &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

if ("serviceWorker" in navigator) {
  if (isCapacitorNative) {
    // Upgrading from a build that registered a service worker? Remove it so
    // the WebView always loads the assets bundled with the current APK.
    // CacheStorage is intentionally left untouched (Quran page downloads).
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {
        /* non-fatal */
      });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          // Service worker registered successfully
        })
        .catch((registrationError) => {
          console.error(
            "Service worker registration failed:",
            registrationError,
          );
        });
    });
  }
}

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    const suggestions = document.querySelector(".search-suggestions");
    if (suggestions) suggestions.style.display = "none";
  }
});

// Enhanced initialization
function initializeEnhancedFeatures() {
  // Load user preferences without showing notification
  if (userPreferences.fontSize) {
    setFontSize(userPreferences.fontSize, false);
  }

  // Check daily progress
  checkDailyProgress();

  // Update stats
  updateProgressStats();

  // Remove search functionality since search is removed

  // Add quick access button listeners
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  const quickHomeBtn = document.getElementById("quickHomeBtn");
  const favoritesBtn = document.getElementById("favoritesBtn");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const settingsHeaderBtn = document.getElementById("settingsHeaderBtn") || document.getElementById("themeToggle");
  const homeBtn = document.getElementById("homeBtn");
  const backBtn = document.getElementById("backBtn");
  const installBtn = document.getElementById("installBtn");

  if (scrollTopBtn) scrollTopBtn.addEventListener("click", scrollToTop);
  if (quickHomeBtn)
    quickHomeBtn.addEventListener("click", function () {
      switchTab("tab-home");
    });
  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", showFavoritesPage);
    updateFavoritesButton();
  }
  if (resetAllBtn) resetAllBtn.addEventListener("click", resetAllAdhkar);
  if (settingsHeaderBtn) {
    settingsHeaderBtn.addEventListener("click", function () {
      if (typeof openAdhanModal === "function") {
        openAdhanModal();
      } else {
        toggleTheme();
      }
    });
  }
  if (homeBtn)
    homeBtn.addEventListener("click", function () {
      switchTab("tab-home");
    });
  if (backBtn)
    backBtn.addEventListener("click", function () {
      showHomePage();
      switchTab("tab-azkar");
    });
  if (installBtn) installBtn.addEventListener("click", showInstallModal);

  // Show/hide quick access buttons at end of page
  window.addEventListener("scroll", () => {
    const scrollPosition = window.pageYOffset;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const quickAccessBtn = document.querySelector(".quick-access");
    const quickHomeBtn = document.querySelector(".quick-home");

    // Calculate how far from bottom (percentage)
    const scrolledPercentage =
      ((scrollPosition + windowHeight) / documentHeight) * 100;

    // Show buttons only when scrolled 90% or more of the page (very near the end)
    if (scrolledPercentage >= 90) {
      if (quickAccessBtn) quickAccessBtn.style.display = "flex";
      if (quickHomeBtn) quickHomeBtn.style.display = "flex";
    } else {
      if (quickAccessBtn) quickAccessBtn.style.display = "none";
      if (quickHomeBtn) quickHomeBtn.style.display = "none";
    }
  }); // Initialize enhanced theme
  initializeEnhancedTheme();

  // Show install prompt on first visit
  showInstallPrompt();
}

// Enhanced theme initialization
function initializeEnhancedTheme() {
  // Add transition class after theme is set
  setTimeout(() => {
    document.body.classList.add("theme-transition");
  }, 100);
}

// Enhanced counter modal opening
const originalOpenCounterModal = openCounterModal;
function openCounterModal(category, index) {
  // Call original function
  originalOpenCounterModal(category, index);

  // Add favorite button to modal
  addFavoriteButtonToModal(category, index);
}

function addFavoriteButtonToModal(category, index) {
  const modal = document.getElementById("counterModal");
  if (!modal) return;

  const zekrId = `${category}_${index}`;
  const isFavorite = favorites.includes(zekrId);

  // Remove existing favorite button if any
  const existingBtn = modal.querySelector(".modal-favorite-btn");
  if (existingBtn) existingBtn.remove();

  // Add favorite button
  const favoriteBtn = document.createElement("button");
  favoriteBtn.className = `modal-favorite-btn ${isFavorite ? "active" : ""}`;
  favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
  favoriteBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 60px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    z-index: 1001;
    color: ${isFavorite ? "#e53e3e" : "#e2e8f0"};
  `;

  favoriteBtn.onclick = (e) => toggleFavorite(category, index, e);

  modal.querySelector(".modal-content").appendChild(favoriteBtn);
}

// Enhanced count function with completion tracking
const originalCount = count;
function count() {
  // Call original count function
  originalCount();

  // Check if zikr is completed and mark it
  if (currentZikrIndex !== null && currentCategory) {
    const zikr = adhkarData[currentCategory].adhkar[currentZikrIndex];
    if (zikr && zikr.currentCount === zikr.count) {
      markZekrCompleted(currentCategory, currentZikrIndex);
    }
  }
}

// Category favorite functions
function toggleCategoryFavorite(categoryKey, event) {
  if (event) event.stopPropagation();

  const categoryFavorites =
    JSON.parse(localStorage.getItem("categoryFavorites")) || [];
  const index = categoryFavorites.indexOf(categoryKey);
  const button = event ? event.target.closest(".category-favorite-btn") : null;

  if (index > -1) {
    categoryFavorites.splice(index, 1);
    if (button) button.classList.remove("active");
    showNotification("تم إزالة التصنيف من المفضلة");
  } else {
    categoryFavorites.push(categoryKey);
    if (button) button.classList.add("active");
    showNotification("تم إضافة التصنيف إلى المفضلة");
  }

  localStorage.setItem("categoryFavorites", JSON.stringify(categoryFavorites));
}

function isCategoryFavorite(categoryKey) {
  const categoryFavorites =
    JSON.parse(localStorage.getItem("categoryFavorites")) || [];
  return categoryFavorites.includes(categoryKey);
}

// Enhanced displayCategories function to add favorite buttons
const originalDisplayCategories = displayCategories;
function displayCategories() {
  originalDisplayCategories();

  // Add favorite buttons to category cards after they're created
  setTimeout(() => {
    const categoryCards = document.querySelectorAll(".category-card");
    categoryCards.forEach((card, index) => {
      const categoryKey = Object.keys(adhkarData)[index];
      if (categoryKey) {
        addFavoriteButtonToCategory(card, categoryKey);
      }
    });
  }, 100);
}

function addFavoriteButtonToCategory(card, categoryKey) {
  // Remove existing button if any
  const existingBtn = card.querySelector(".category-favorite-btn");
  if (existingBtn) existingBtn.remove();

  // Create favorite button
  const favoriteBtn = document.createElement("button");
  favoriteBtn.className = `category-favorite-btn ${
    isCategoryFavorite(categoryKey) ? "active" : ""
  }`;
  favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
  favoriteBtn.onclick = (e) => toggleCategoryFavorite(categoryKey, e);

  // Add to card
  card.style.position = "relative";
  card.appendChild(favoriteBtn);
}

let deferredInstallPrompt = null;

function isStandaloneMode() {
  const isCapacitor = Boolean(
    (typeof window !== "undefined" && window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) ||
    (typeof document !== "undefined" && document.body && document.body.classList.contains("is-native-app"))
  );
  return (
    isCapacitor ||
    (typeof window !== "undefined" && (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    )) ||
    (typeof document !== "undefined" && document.referrer && document.referrer.includes("android-app://"))
  );
}

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function updateInstallButtonVisibility() {
  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.classList.remove("hidden");
  }
  const topbarBtn = document.getElementById("topbarDownloadBtn");
  if (topbarBtn) {
    topbarBtn.classList.remove("hidden");
  }
}

function initializeInstallPrompt() {
  updateInstallButtonVisibility();
}

function showInstallPrompt() {
  showManualInstallInstructions(false);
}

async function showInstallModal() {
  // Always open the full APK download / re-download modal
  showManualInstallInstructions(true);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtonVisibility();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  localStorage.setItem("hasSeenInstallPrompt", "true");
  showNotification("تم تثبيت التطبيق بنجاح");
  updateInstallButtonVisibility();
});

document.addEventListener("DOMContentLoaded", () => {
  updateInstallButtonVisibility();
});

// Enhanced UX Features
let isOnline = navigator.onLine;
let keyboardShortcutsVisible = false;

// Initialize enhanced UX features
function initializeEnhancedUX() {
  setupOfflineDetection();
  setupKeyboardShortcuts();
  setupTouchFeedback();
  setupSmoothAnimations();
  setupAccessibilityFeatures();
  setupPerformanceOptimizations();
}

// Offline Detection - Unified via initializeOfflineDetection
function setupOfflineDetection() {
  // Handled cleanly and uniformly by initializeOfflineDetection to avoid overlapping banners
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  const shortcutsDiv = document.createElement("div");
  shortcutsDiv.className = "keyboard-shortcuts";
  shortcutsDiv.innerHTML = `
    <h4>اختصارات لوحة المفاتيح</h4>
    <div class="shortcut"><span>الرئيسية</span><span class="key">H</span></div>
    <div class="shortcut"><span>البحث</span><span class="key">/</span></div>
    <div class="shortcut"><span>الوضع المظلم</span><span class="key">D</span></div>
    <div class="shortcut"><span>تكبير الخط</span><span class="key">+</span></div>
    <div class="shortcut"><span>تصغير الخط</span><span class="key">-</span></div>
    <div class="shortcut"><span>الأعلى</span><span class="key">↑</span></div>
    <div class="shortcut"><span>الأسفل</span><span class="key">↓</span></div>
  `;
  shortcutsDiv.style.display = "none";
  document.body.appendChild(shortcutsDiv);

  document.addEventListener("keydown", (e) => {
    // Toggle shortcuts visibility with ?
    if (e.key === "?") {
      keyboardShortcutsVisible = !keyboardShortcutsVisible;
      shortcutsDiv.style.display = keyboardShortcutsVisible ? "block" : "none";
      return;
    }

    // Hide shortcuts on any other key
    if (keyboardShortcutsVisible && e.key !== "?") {
      keyboardShortcutsVisible = false;
      shortcutsDiv.style.display = "none";
    }

    // Navigation shortcuts
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "h":
          e.preventDefault();
          showHomePage();
          break;
        case "/":
          e.preventDefault();
          const searchInput = document.getElementById("searchInput");
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;
        case "d":
          e.preventDefault();
          toggleTheme();
          break;
        case "+":
        case "=":
          e.preventDefault();
          changeFontSize("increase");
          break;
        case "-":
          e.preventDefault();
          changeFontSize("decrease");
          break;
        case "arrowup":
          e.preventDefault();
          scrollToTop();
          break;
        case "arrowdown":
          e.preventDefault();
          scrollToBottom();
          break;
      }
    }
  });
}

// Touch Feedback
function setupTouchFeedback() {
  // Add haptic feedback for mobile devices
  const addHapticFeedback = (element, type = "light") => {
    element.addEventListener("touchstart", () => {
      if (navigator.vibrate) {
        navigator.vibrate(type === "heavy" ? 50 : 20);
      }
    });
  };

  // Add haptic feedback to interactive elements
  document
    .querySelectorAll(".count-btn, .action-btn, .nav-btn")
    .forEach((btn) => {
      addHapticFeedback(btn, "light");
    });

  document.querySelectorAll(".category-card, .adhkar-card").forEach((card) => {
    addHapticFeedback(card, "light");
  });
}

// Smooth Animations
function setupSmoothAnimations() {
  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = "0s";
        entry.target.style.animationPlayState = "running";
      }
    });
  }, observerOptions);

  // Add animation classes to elements
  document
    .querySelectorAll(".category-card, .adhkar-card, .stat-item")
    .forEach((el, index) => {
      el.style.animation = "slideInUp 0.6s ease forwards";
      el.style.animationDelay = `${index * 0.1}s`;
      el.style.animationPlayState = "paused";
      observer.observe(el);
    });
}

// Accessibility Features
function setupAccessibilityFeatures() {
  // Add ARIA labels and roles
  document.querySelectorAll(".count-btn").forEach((btn) => {
    btn.setAttribute("aria-label", "زيادة العداد");
  });

  document.querySelectorAll(".reset-btn").forEach((btn) => {
    btn.setAttribute("aria-label", "إعادة تعيين العداد");
  });

  // Add skip links for screen readers
  const skipLink = document.createElement("a");
  skipLink.href = "#main";
  skipLink.className = "skip-link";
  skipLink.textContent = "تخطي إلى المحتوى الرئيسي";
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Add skip link styles
  const style = document.createElement("style");
  style.textContent = `
    .skip-link {
      position: absolute;
      top: -60px;
      left: 6px;
      background: #1a8a5c;
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
      transition: top 0.3s;
    }
    .skip-link:focus {
      top: 6px;
    }
  `;
  document.head.appendChild(style);
}

// Performance Optimizations
function setupPerformanceOptimizations() {
  // Debounce search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let searchTimeout;
    const originalOnInput = searchInput.oninput;
    searchInput.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (originalOnInput) originalOnInput.call(searchInput, e);
      }, 300);
    };
  }

  // Lazy load images if any
  const images = document.querySelectorAll("img[data-src]");
  if (images.length > 0) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy");
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  }
}

// Enhanced Notification System - Unified delegate to centralized showNotification
function showEnhancedNotification(message, type = "success", duration = 3000) {
  showNotification(message, type, duration);
}

function getNotificationIcon(type) {
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  return icons[type] || icons.info;
}

function getNotificationColor(type) {
  const colors = {
    success: "#b8860b",
    error: "#e53e3e",
    warning: "#d69e2e",
    info: "#1a8a5c",
  };
  return colors[type] || colors.info;
}

// Enhanced Loading States
function showLoadingState(element, text = "جاري التحميل...") {
  if (typeof element === "string") {
    element = document.querySelector(element);
  }

  if (!element) return;

  element.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 20px;">
      <div class="loading-spinner"></div>
      <span>${text}</span>
    </div>
  `;
  element.style.opacity = "0.7";
}

function hideLoadingState(element) {
  if (typeof element === "string") {
    element = document.querySelector(element);
  }

  if (!element) return;

  element.style.opacity = "1";
}

// Skeleton Loading
function showSkeletonLoading(container, count = 3) {
  if (typeof container === "string") {
    container = document.querySelector(container);
  }

  if (!container) return;

  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-card skeleton";
    skeleton.innerHTML = `
      <div class="skeleton skeleton-text long"></div>
      <div class="skeleton skeleton-text medium"></div>
      <div class="skeleton skeleton-text short"></div>
    `;
    container.appendChild(skeleton);
  }
}

// Enhanced Completion Celebration
function showCompletionCelebration(message = "مبروك! تم إكمال الأذكار") {
  const celebration = document.createElement("div");
  celebration.className = "completion-celebration";
  celebration.innerHTML = `
    <h3>مبروك!</h3>
    <p>${message}</p>
    <button onclick="this.parentElement.remove()" style="
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      cursor: pointer;
      margin-top: 15px;
    ">حسناً</button>
  `;

  document.body.appendChild(celebration);

  // Play celebration sound if available
  playSound("celebration");

  // Remove after 5 seconds
  setTimeout(() => {
    if (celebration.parentElement) {
      celebration.style.animation = "fadeOut 0.5s ease";
      setTimeout(() => celebration.remove(), 500);
    }
  }, 5000);
}

// Sound Effects (optional)
function playSound(type) {
  // Only play if user has interacted (browsers block autoplay)
  if (!document.hasUserInteracted) return;

  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "celebration":
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          659,
          audioContext.currentTime + 0.1,
        );
        oscillator.frequency.setValueAtTime(
          784,
          audioContext.currentTime + 0.2,
        );
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5,
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case "click":
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.1,
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
    }
  } catch (e) {
    // Silently fail if Web Audio API is not supported
  }
}

// Utility Functions
function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function changeFontSize(direction) {
  const body = document.body;
  const currentSize = parseFloat(getComputedStyle(body).fontSize);
  let newSize;

  if (direction === "increase" && currentSize < 24) {
    newSize = currentSize + 2;
  } else if (direction === "decrease" && currentSize > 14) {
    newSize = currentSize - 2;
  } else {
    return;
  }

  body.style.fontSize = newSize + "px";
  localStorage.setItem("fontSize", newSize);

  showEnhancedNotification(
    direction === "increase" ? "تم تكبير الخط" : "تم تصغير الخط",
    "info",
    2000,
  );
}

// Enhanced Search with Highlighting
function highlightSearchResults(text, query) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Progress Ring Animation
function animateProgressRing(ringElement, progress) {
  const circle = ringElement.querySelector(".progress-ring-circle-fill");
  if (circle) {
    const circumference = 188.4; // 2 * π * r (r = 30)
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }
}

// Enhanced Error Handling
function handleError(error, context = "general") {
  console.error(`Error in ${context}:`, error);

  const errorMessages = {
    network: "خطأ في الشبكة. يرجى التحقق من الاتصال بالإنترنت.",
    storage: "خطأ في حفظ البيانات. قد تفقد بعض التغييرات.",
    general: "حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.",
  };

  showEnhancedNotification(
    errorMessages[context] || errorMessages.general,
    "error",
    5000,
  );
}

// ==================== Prayer Times Section ====================

let prayerTimesData = null;
let countdownInterval = null;

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Prayer names mapping
const prayerNames = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Sunset: "المغرب",
  Maghrib: "المغرب",
  Isha: "العشاء",
  Imsak: "الإمساك",
  Midnight: "منتصف الليل",
};

// Prayer icons
const prayerIcons = {
  Fajr: "fa-cloud-moon",
  Sunrise: "fa-sun",
  Dhuhr: "fa-sun",
  Asr: "fa-cloud-sun",
  Sunset: "fa-cloud-sun",
  Maghrib: "fa-cloud-sun",
  Isha: "fa-moon",
};

// Initialize Prayer Times - Instant load with Cairo default and local cache
async function initializePrayerTimes() {
  const section = document.getElementById("prayerTimesSection");
  if (!section) return;

  // 1. Determine location before reading the cache so another city's timings
  // are never shown as today's timings.
  const savedLocation = localStorage.getItem("prayerLocation");
  let lat = 30.0444;
  let lng = 31.2357;
  let city = "القاهرة";

  if (savedLocation) {
    try {
      const loc = JSON.parse(savedLocation);
      lat = loc.latitude || lat;
      lng = loc.longitude || lng;
      city = loc.city || city;
    } catch (e) {
      console.warn("Saved location parse error", e);
    }
  }

  // 2. Render only a cache created today for the current coordinates.
  const cachedCity = localStorage.getItem("cachedPrayerCity") || city;
  const cachedDate = localStorage.getItem("cachedPrayerDate");
  const cachedLat = Number(localStorage.getItem("cachedPrayerLatitude"));
  const cachedLng = Number(localStorage.getItem("cachedPrayerLongitude"));
  const todayKey = localDateKey(new Date());
  const cacheMatchesLocation =
    Number.isFinite(cachedLat) &&
    Number.isFinite(cachedLng) &&
    Math.abs(cachedLat - lat) < 0.01 &&
    Math.abs(cachedLng - lng) < 0.01;
  const cachedDataStr =
    cachedDate === todayKey && cacheMatchesLocation
      ? localStorage.getItem("cachedPrayerTimes")
      : null;

  if (cachedDataStr) {
    try {
      prayerTimesData = JSON.parse(cachedDataStr);
      displayPrayerTimes(cachedCity);
      startCountdown();
      const loading = document.getElementById("prayerTimesLoading");
      if (loading) loading.style.display = "none";
    } catch (e) {
      console.warn("Cached prayer times error", e);
    }
  }

  // 3. Fetch today's timings in background.
  fetchPrayerTimes(lat, lng, city);

  // Setup event listeners
  const locationBtn = document.getElementById("locationBtn");
  const retryBtn = document.getElementById("retryPrayerTimes");

  if (locationBtn) {
    locationBtn.addEventListener("click", requestLocation);
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", () => fetchPrayerTimes(lat, lng, city));
  }
}

function refreshPrayerTimesForCurrentLocation(reason) {
  const savedLocation = localStorage.getItem("prayerLocation");
  let location = {
    latitude: 30.0444,
    longitude: 31.2357,
    city: "القاهرة",
  };
  if (savedLocation) {
    try {
      const parsed = JSON.parse(savedLocation);
      location = {
        latitude: Number(parsed.latitude) || location.latitude,
        longitude: Number(parsed.longitude) || location.longitude,
        city: parsed.city || location.city,
      };
    } catch (error) {
      console.warn("Saved location parse error during daily refresh:", error);
    }
  }
  console.log("[PrayerTimes] Refreshing schedule:", reason || "manual");
  return fetchPrayerTimes(location.latitude, location.longitude, location.city);
}

// Request user location
async function requestLocation() {
  const loading = document.getElementById("prayerTimesLoading");
  const error = document.getElementById("prayerTimesError");
  const grid = document.getElementById("prayerTimesGrid");

  if (loading) loading.style.display = "block";
  if (error) error.classList.add("hidden");
  if (grid) grid.innerHTML = "";

  if (!navigator.geolocation) {
    showPrayerTimesError("المتصفح لا يدعم تحديد الموقع");
    return;
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true,
      });
    });

    const { latitude, longitude } = position.coords;

    // Get city name from reverse geocoding
    const cityName = await getCityName(latitude, longitude);

    // Save location
    localStorage.setItem(
      "prayerLocation",
      JSON.stringify({
        latitude,
        longitude,
        city: cityName,
      }),
    );

    await fetchPrayerTimes(latitude, longitude, cityName);
  } catch (err) {
    console.error("Location error:", err);
    // Use Cairo as default location if geolocation fails or is denied
    const cairoLat = 30.0444;
    const cairoLng = 31.2357;
    const cairoName = "القاهرة";

    // Save Cairo as default location
    localStorage.setItem(
      "prayerLocation",
      JSON.stringify({
        latitude: cairoLat,
        longitude: cairoLng,
        city: cairoName,
      }),
    );

    await fetchPrayerTimes(cairoLat, cairoLng, cairoName);
  }
}

// Get city name from coordinates
async function getCityName(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ar`,
    );
    const data = await response.json();
    return data.city || data.locality || data.principalSubdivision || "موقعك";
  } catch (err) {
    console.error("Geocoding error:", err);
    return "موقعك";
  }
}

// Fetch prayer times from API
async function fetchPrayerTimes(latitude, longitude, cityName) {
  const loading = document.getElementById("prayerTimesLoading");
  const error = document.getElementById("prayerTimesError");

  try {
    const today = new Date();
    const timestamp = Math.floor(today.getTime() / 1000);

    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=5`,
    );

    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();

    if (data.code === 200 && data.data) {
      prayerTimesData = data.data.timings;

      // Cache the prayer times for offline use
      localStorage.setItem(
        "cachedPrayerTimes",
        JSON.stringify(prayerTimesData),
      );
      localStorage.setItem("cachedPrayerCity", cityName);
      localStorage.setItem("cachedPrayerDate", localDateKey(today));
      localStorage.setItem("cachedPrayerLatitude", String(latitude));
      localStorage.setItem("cachedPrayerLongitude", String(longitude));

      displayPrayerTimes(cityName);
      startCountdown();
      reconcilePrayerSchedules(cityName);

      if (loading) loading.style.display = "none";
      if (error) error.classList.add("hidden");
    } else {
      throw new Error("Invalid API response");
    }
  } catch (err) {
    console.error("Prayer times fetch error:", err);

    // Check cache
    const cachedDate = localStorage.getItem("cachedPrayerDate");
    const cachedLat = Number(localStorage.getItem("cachedPrayerLatitude"));
    const cachedLng = Number(localStorage.getItem("cachedPrayerLongitude"));
    const cacheMatchesRequest =
      cachedDate === localDateKey(new Date()) &&
      Number.isFinite(cachedLat) &&
      Number.isFinite(cachedLng) &&
      Math.abs(cachedLat - latitude) < 0.01 &&
      Math.abs(cachedLng - longitude) < 0.01;
    const cachedDataStr = cacheMatchesRequest
      ? localStorage.getItem("cachedPrayerTimes")
      : null;
    const cachedCity = localStorage.getItem("cachedPrayerCity");

    if (cachedDataStr) {
      try {
        prayerTimesData = JSON.parse(cachedDataStr);
        displayPrayerTimes(cachedCity || cityName);
        startCountdown();
        reconcilePrayerSchedules(cachedCity || cityName);

        if (loading) loading.style.display = "none";
        if (error) error.classList.add("hidden");
      } catch (e) {
        showPrayerTimesError("تعذر تحميل مواقيت الصلاة");
      }
    } else {
      showPrayerTimesError("تعذر تحميل مواقيت الصلاة");
    }
  }

  function reconcilePrayerSchedules(cityName) {
    if (window.AdhanNative && window.AdhanNative.onPrayerTimesUpdated) {
      try {
        window.AdhanNative.onPrayerTimesUpdated(prayerTimesData, cityName);
      } catch (error) {
        console.warn("Adhan sync hook error:", error);
      }
    }
    if (typeof window.syncAzkarNativeSchedule === "function") {
      window.syncAzkarNativeSchedule();
    }
  }
}

// Display prayer times cards
function displayPrayerTimes(cityName) {
  const grid = document.getElementById("prayerTimesGrid");
  const locationEl = document.getElementById("cityName");

  if (locationEl) {
    locationEl.textContent = cityName;
  }

  if (!grid || !prayerTimesData) return;

  // Main prayers to display (including Sunrise)
  const mainPrayers = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const now = new Date();
  const nextPrayer = getNextPrayerKey(now);

  grid.innerHTML = mainPrayers
    .map((prayer) => {
      const time = prayerTimesData[prayer];
      const formattedTime = formatToArabic12Hour(time);
      const name = prayerNames[prayer];
      const icon = prayerIcons[prayer] || "fa-clock";
      const pDate = prayerDateFor(prayer, now);
      const isPast = pDate && pDate <= now;
      const isNext = prayer === nextPrayer;

      return `
        <div class="prayer-card${isPast ? " is-past" : ""}${isNext ? " next-prayer" : ""}" data-prayer="${prayer}">
          <div class="prayer-icon">
            <i class="fas ${icon}"></i>
          </div>
          <div class="prayer-info">
            <div class="prayer-name">${name}</div>
            <div class="prayer-time">${formattedTime || "--:--"}</div>
          </div>
        </div>
      `;
    })
    .join("");

  const nextTimeEl = document.getElementById("nextPrayerTime");
  if (nextTimeEl && nextPrayer && prayerTimesData[nextPrayer]) {
    nextTimeEl.textContent = formatToArabic12Hour(prayerTimesData[nextPrayer]);
  }

  updateDynamicHeroCard(now);
  renderAzkarSuggestion();
}

// Build a Date for a prayer time on the current day
function prayerDateFor(prayer, now) {
  if (!prayerTimesData || !prayerTimesData[prayer]) return null;
  const cleanTime = String(prayerTimesData[prayer]).split(" ")[0];
  const [hours, minutes] = cleanTime.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
}

// First obligatory prayer still ahead today (falls back to Fajr tomorrow)
function getNextPrayerKey(now) {
  if (!prayerTimesData) return null;
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const prayer of prayers) {
    const pDate = prayerDateFor(prayer, now);
    if (pDate && pDate > now) return prayer;
  }
  return "Fajr";
}

// Arabic-Indic 12-hour formatter for prayer chips
function formatToArabic12Hour(time24) {
  if (!time24) return "";
  const cleanTime = String(time24).split(" ")[0];
  const [hours, minutes] = cleanTime.split(":");
  let hour = parseInt(hours, 10);
  if (isNaN(hour)) return "";
  const period = hour >= 12 ? "م" : "ص";
  hour = hour % 12 || 12;
  const mins = parseInt(minutes, 10) || 0;
  return `${toArabicNumerals(hour)}:${toArabicNumerals(String(mins).padStart(2, "0"))} ${period}`;
}

// Convert 24-hour time to 12-hour AM/PM format (Arabic)
function formatTo12Hour(time24) {
  if (!time24) return "";
  const cleanTime = time24.split(" ")[0];
  const [hours, minutes] = cleanTime.split(":");
  let hour = parseInt(hours, 10);
  const period = hour >= 12 ? "م" : "ص";

  hour = hour % 12 || 12; // Convert 0 to 12 for midnight

  return `${hour}:${minutes} ${period}`;
}

// Start countdown to next prayer
function startCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

// Helper to format remaining time in proper Arabic grammar
function formatArabicRemainingTime(hours, minutes, seconds) {
  const getUnit = (count, singular, dual, plural) => {
    if (count <= 0) return null;
    if (count === 1) return singular;
    if (count === 2) return dual;
    if (count >= 3 && count <= 10) return `${count} ${plural}`;
    return `${count} ${singular}`;
  };

  const hStr = getUnit(hours, "ساعة", "ساعتان", "ساعات");
  const mStr = getUnit(minutes, "دقيقة", "دقيقتان", "دقائق");
  const sStr = getUnit(seconds, "ثانية", "ثانيتان", "ثوانٍ");

  const parts = [hStr, mStr, sStr].filter(Boolean);

  if (parts.length === 0) return "متبقي أقل من ثانية";

  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    result += ` و${parts[i]}`;
  }

  return `متبقي ${result}`;
}

// Update countdown display
function updateCountdown() {
  if (!prayerTimesData) return;

  const now = new Date();
  const chain = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  let nextPrayer = null;
  let targetDate = null;
  let previousDate = null;
  let previousPrayer = null;

  // Next obligatory prayer (Sunrise is a boundary, never "the next prayer")
  for (const prayer of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
    const pDate = prayerDateFor(prayer, now);
    if (pDate && pDate > now) {
      nextPrayer = prayer;
      targetDate = pDate;
      break;
    }
  }

  // Previous boundary on the Fajr → Sunrise → … → Isha chain
  for (const prayer of chain) {
    const pDate = prayerDateFor(prayer, now);
    if (pDate && pDate <= now) {
      previousPrayer = prayer;
      previousDate = pDate;
    }
  }

  // Before Fajr: the previous point is yesterday's Isha
  if (!previousDate) {
    const ishaDate = prayerDateFor("Isha", now);
    if (ishaDate) {
      previousPrayer = "Isha";
      previousDate = new Date(ishaDate.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  // If no obligatory prayer remains today, next is Fajr tomorrow
  if (!nextPrayer) {
    nextPrayer = "Fajr";
    const fajrDate = prayerDateFor("Fajr", now);
    targetDate = fajrDate
      ? new Date(fajrDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 5, 0, 0, 0);
  }

  const diffMs = targetDate - now;

  if (diffMs <= 0) {
    if (typeof displayPrayerTimes === "function") {
      const cityName = localStorage.getItem("cachedPrayerCity") || "";
      displayPrayerTimes(cityName);
    }
    return;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  const countdownText = toArabicNumerals(
    `${hours}:${pad(minutes)}:${pad(seconds)}`,
  );

  const nextPrayerNameEl = document.getElementById("nextPrayerName");
  const countdownTimeEl = document.getElementById("countdownTime");
  const nextPrayerTimeEl = document.getElementById("nextPrayerTime");
  const elapsedEl = document.getElementById("prayerElapsed");
  const progressEl = document.getElementById("prayerProgressFill");

  if (nextPrayerNameEl) {
    nextPrayerNameEl.textContent = prayerNames[nextPrayer] || nextPrayer;
  }

  if (nextPrayerTimeEl && prayerTimesData[nextPrayer]) {
    nextPrayerTimeEl.textContent = formatToArabic12Hour(
      prayerTimesData[nextPrayer],
    );
  }

  if (countdownTimeEl) {
    countdownTimeEl.textContent = countdownText;
  }

  // Previous point label: "منذ الشروق ٦:١٦ ص"
  if (elapsedEl) {
    if (previousDate && previousPrayer) {
      const prevName = prayerNames[previousPrayer] || previousPrayer;
      const prevTime = prayerTimesData[previousPrayer]
        ? formatToArabic12Hour(prayerTimesData[previousPrayer])
        : "";
      elapsedEl.textContent = `منذ ${prevName}${prevTime ? " " + prevTime : ""}`;
    } else {
      elapsedEl.textContent = "منذ الفجر";
    }
  }

  // Progress from previous prayer to the next one
  if (progressEl) {
    let progress = 0;
    if (previousDate) {
      const span = targetDate - previousDate;
      progress = span > 0 ? ((now - previousDate) / span) * 100 : 0;
    }
    progress = Math.min(100, Math.max(0, progress));
    progressEl.style.width = progress.toFixed(1) + "%";
  }

  // Highlight next prayer card and dim finished ones
  document.querySelectorAll(".prayer-card").forEach((card) => {
    const key = card.getAttribute("data-prayer");
    const pDate = prayerDateFor(key, now);
    card.classList.toggle("is-past", !!(pDate && pDate <= now));
    card.classList.toggle("next-prayer", key === nextPrayer);
  });
}

// Show prayer times error
function showPrayerTimesError(message) {
  const loading = document.getElementById("prayerTimesLoading");
  const error = document.getElementById("prayerTimesError");

  if (loading) loading.style.display = "none";

  if (error) {
    error.classList.remove("hidden");
    const errorText = error.querySelector("p");
    if (errorText) {
      errorText.textContent = message;
    }
  }
}

// Initialize enhanced features when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Mark that user has interacted (for audio)
  document.hasUserInteracted = false;
  document.addEventListener(
    "click",
    () => {
      document.hasUserInteracted = true;
    },
    { once: true },
  );

  // Restore font size preference
  const savedFontSize = localStorage.getItem("fontSize");
  if (savedFontSize) {
    document.body.style.fontSize = savedFontSize + "px";
  }

  // Fast-boot prayer times & core UX immediately
  try {
    initializePrayerTimes();
  } catch (err) {
    console.error("Fast-boot prayer times error:", err);
  }

  if (
    window.PrayerDailyRefresh &&
    typeof window.PrayerDailyRefresh.start === "function"
  ) {
    window.PrayerDailyRefresh.start(refreshPrayerTimesForCurrentLocation);
  }

  try {
    initializeEnhancedFeatures();
  } catch (err) {
    console.error("Fast-boot enhanced features error:", err);
  }

  try {
    initializeEnhancedUX();
  } catch (err) {
    console.error("Fast-boot enhanced UX error:", err);
  }

  try {
    initializeNewFeatures();
  } catch (err) {
    console.error("Fast-boot new features error:", err);
  }

  // Delayed check for install prompt
  setTimeout(() => {
    try {
      showInstallPrompt();
    } catch (e) {}
  }, 1000);
});

// ========================================
// NEW FEATURES INITIALIZATION
// ========================================

function initializeNewFeatures() {
  try {
    initializeStatsDashboard();
  } catch (e) {
    console.warn("initializeStatsDashboard error", e);
  }

  if (typeof initializeQiblaCompass === "function") {
    try {
      initializeQiblaCompass();
    } catch (e) {
      console.warn("initializeQiblaCompass error", e);
    }
  }

  if (typeof initializeReadingModes === "function") {
    try {
      initializeReadingModes();
    } catch (e) {
      console.warn("initializeReadingModes error", e);
    }
  }

  if (typeof initializeOfflineDetection === "function") {
    try {
      initializeOfflineDetection();
    } catch (e) {
      console.warn("initializeOfflineDetection error", e);
    }
  }
}

// Global hook to refresh all user data in memory after JSON import or restore
function refreshAllUserData() {
  try {
    dailyProgress = JSON.parse(localStorage.getItem("dailyProgress")) || {
      date: new Date().toDateString(),
      completedZekr: [],
      streak: parseInt(localStorage.getItem("dailyStreak")) || 0,
      totalCompletions: parseInt(localStorage.getItem("totalCompletions")) || 0,
    };
    weeklyProgress = JSON.parse(localStorage.getItem("weeklyProgress")) || {};

    if (typeof loadProgress === "function") loadProgress();
    if (typeof checkDailyProgress === "function") checkDailyProgress();
    if (typeof updateStatsDashboard === "function") updateStatsDashboard();
    if (typeof updateWeeklyChart === "function") updateWeeklyChart();
    if (typeof updateQuranWeeklyChart === "function") updateQuranWeeklyChart();
    if (typeof updateProfileTab === "function") updateProfileTab();
    if (typeof loadKhatmahState === "function") loadKhatmahState();
    if (typeof initializePrayerTimes === "function") initializePrayerTimes();
  } catch (e) {
    console.warn("refreshAllUserData error", e);
  }
}
window.refreshAllUserData = refreshAllUserData;

// ========================================
// STATISTICS DASHBOARD
// ========================================

// Weekly progress data stored in localStorage
let weeklyProgress = JSON.parse(localStorage.getItem("weeklyProgress")) || {};

function initializeStatsDashboard() {
  // Update stats on load
  updateStatsDashboard();
  updateWeeklyChart();
  if (typeof updateQuranWeeklyChart === "function") {
    updateQuranWeeklyChart();
  }
}

function updateStatsDashboard() {
  const today = new Date().toDateString();

  try {
    const storedProgress = JSON.parse(localStorage.getItem("dailyProgress") || "null");
    if (storedProgress && Array.isArray(storedProgress.completedZekr)) {
      dailyProgress = storedProgress;
    }
  } catch (error) {
    console.warn("Unable to refresh profile progress", error);
  }

  if (dailyProgress.date !== today) {
    checkDailyProgress();
  }

  // Get or initialize today's progress
  if (!weeklyProgress[today]) {
    weeklyProgress[today] = 0;
  }

  // Calculate streak
  let streak = calculateStreak();

  // Get today's count
  let todayCount = dailyProgress.completedZekr
    ? dailyProgress.completedZekr.length
    : 0;
  weeklyProgress[today] = todayCount;
  localStorage.setItem("weeklyProgress", JSON.stringify(weeklyProgress));

  // Get weekly count
  let weekCount = calculateWeeklyCount();

  // Get total count
  let totalCount = dailyProgress.totalCompletions || 0;

  // Update the profile stats (numbers always shown, "٠" at zero)
  var bestStreak = calculateBestStreak();
  var streakWrap = document.getElementById("streakValueWrap");
  var streakBadgeEl = document.getElementById("streakBadge");
  var streakSubEl = document.getElementById("streakSub");
  if (streakWrap) {
    if (streak > 0) {
      streakWrap.classList.remove("is-zero");
      streakWrap.innerHTML =
        '<b id="streakCount">' + toArabicNumerals(streak) +
        '</b><span id="streakSuffix"> يومًا متتاليًا</span>';
    } else {
      streakWrap.classList.add("is-zero");
      streakWrap.innerHTML = "ابدأ سلسلتك اليوم";
    }
  }
  if (streakBadgeEl) streakBadgeEl.hidden = streak === 0;
  if (streakSubEl) {
    if (streak > 0) {
      streakSubEl.innerHTML =
        "أطول سلسلة لك: <b>" + toArabicNumerals(bestStreak) + "</b><span> يومًا</span>";
    } else {
      streakSubEl.textContent = "أنجز ذكراً واحداً لتبدأ";
    }
  }
  setPtStatValue(document.getElementById("todayCount"), todayCount);
  setPtStatValue(document.getElementById("weekCount"), weekCount);
  setPtStatValue(document.getElementById("totalCount"), totalCount);

  updateAzkarTodayRing();

  // Update summary cards (top KPIs)
  var summaryAzkarVal = document.getElementById("summaryAzkarVal");
  var summaryStreakVal = document.getElementById("summaryStreakVal");
  if (summaryAzkarVal)
    summaryAzkarVal.textContent = toArabicNumerals(todayCount);
  if (summaryStreakVal) summaryStreakVal.textContent = toArabicNumerals(streak);

  // Update azkar category bars
  updateAzkarCategoryBars();
}

// Writes a counter value, using a designed muted dash instead of the
// Arabic-Indic zero (which renders as a tiny dot at display sizes).
function setPtStatValue(el, value) {
  if (!el) return;
  var n = Number(value) || 0;
  el.textContent = toArabicNumerals(n);
  el.setAttribute("data-value", String(n));
}

// Longest run of consecutive days with at least one completed zekr.
function calculateBestStreak() {
  var days = Object.keys(weeklyProgress)
    .filter(function (key) {
      return (weeklyProgress[key] || 0) > 0;
    })
    .map(function (key) {
      return new Date(key).getTime();
    })
    .filter(function (time) {
      return !isNaN(time);
    })
    .sort(function (a, b) {
      return a - b;
    });

  if (!days.length) return 0;

  var best = 1;
  var run = 1;
  var dayMs = 24 * 60 * 60 * 1000;

  for (var i = 1; i < days.length; i++) {
    var prev = new Date(days[i - 1]);
    var cur = new Date(days[i]);
    // Compare mid-day so DST shifts never break the diff.
    prev.setHours(12, 0, 0, 0);
    cur.setHours(12, 0, 0, 0);
    var diff = Math.round((cur - prev) / dayMs);
    if (diff === 1) {
      run++;
    } else if (diff > 1) {
      run = 1;
    }
    if (run > best) best = run;
  }

  return best;
}

// Today's Azkar completion, by item and by fully-completed category.
function getAzkarTodayProgress() {
  var completed = (dailyProgress && dailyProgress.completedZekr) || [];
  var keys = Object.keys(adhkarData || {});
  var done = 0;
  var total = 0;
  var sectionsDone = 0;

  keys.forEach(function (key) {
    var list = (adhkarData[key] && adhkarData[key].adhkar) || [];
    if (!list.length) return;
    var sectionComplete = true;
    list.forEach(function (_, index) {
      total++;
      if (completed.indexOf(key + "_" + index) !== -1) {
        done++;
      } else {
        sectionComplete = false;
      }
    });
    if (sectionComplete) sectionsDone++;
  });

  return {
    done: done,
    total: total,
    sectionsDone: sectionsDone,
    sectionsTotal: keys.length,
  };
}

function updateAzkarTodayRing() {
  var ring = document.getElementById("azkarRing");
  var pctEl = document.getElementById("azkarRingPct");
  var subEl = document.getElementById("azkarSub");

  if (!ring && !pctEl && !subEl) return;

  var progress = getAzkarTodayProgress();
  var pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  if (ring) ring.style.setProperty("--p", String(pct));
  if (pctEl) {
    pctEl.textContent = toArabicNumerals(pct) + "٪";
  }
  if (subEl) {
    subEl.textContent =
      progress.done > 0
        ? toArabicNumerals(progress.done) +
          " من " +
          toArabicNumerals(progress.total) +
          " ذكرًا"
        : "لم تبدأ بعد";
    subEl.classList.toggle("is-zero", progress.done === 0);
  }
}

function updateAzkarCategoryBars() {
  var completed = dailyProgress.completedZekr || [];
  var morningTotal = adhkarData.morning ? adhkarData.morning.adhkar.length : 0;
  var eveningTotal = adhkarData.evening ? adhkarData.evening.adhkar.length : 0;
  // tasbeeh-like counts come from "general" category
  var tasbihTotal = adhkarData.general ? adhkarData.general.adhkar.length : 0;

  var morningDone = completed.filter(function (id) {
    return id.startsWith("morning_");
  }).length;
  var eveningDone = completed.filter(function (id) {
    return id.startsWith("evening_");
  }).length;
  var tasbihDone = completed.filter(function (id) {
    return id.startsWith("general_");
  }).length;

  var barMorning = document.getElementById("barMorning");
  var barEvening = document.getElementById("barEvening");
  var barTasbih = document.getElementById("barTasbih");
  var numMorning = document.getElementById("numMorning");
  var numEvening = document.getElementById("numEvening");
  var numTasbih = document.getElementById("numTasbih");

  if (barMorning)
    barMorning.style.width =
      (morningTotal ? (morningDone / morningTotal) * 100 : 0) + "%";
  if (barEvening)
    barEvening.style.width =
      (eveningTotal ? (eveningDone / eveningTotal) * 100 : 0) + "%";
  if (barTasbih)
    barTasbih.style.width =
      (tasbihTotal ? (tasbihDone / tasbihTotal) * 100 : 0) + "%";

  if (numMorning) numMorning.textContent = morningDone + "/" + morningTotal;
  if (numEvening) numEvening.textContent = eveningDone + "/" + eveningTotal;
  if (numTasbih) numTasbih.textContent = tasbihDone + "/" + tasbihTotal;
}

function calculateStreak() {
  let streak = 0;
  let currentDate = new Date();

  // Check consecutive days
  while (true) {
    const dateStr = currentDate.toDateString();
    const count = weeklyProgress[dateStr] || 0;

    if (count > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function calculateWeeklyCount() {
  let count = 0;
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    count += weeklyProgress[dateStr] || 0;
  }

  return count;
}

// First day of the displayed week (Saturday) at local midnight.
function getChartWeekStart() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // getDay(): Sunday = 0 … Saturday = 6. Saturday is the week start.
  const offset = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

// One renderer for both charts: today's week (Sat → Fri), future slots dashed,
// zero days empty (no stub bars) and the current day highlighted.
function renderWeeklyChart(containerId, source) {
  const chartContainer = document.getElementById(containerId);
  if (!chartContainer) return;

  const cols = chartContainer.querySelectorAll(".chart-bar-col");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = getChartWeekStart();

  const dayValues = {};
  let maxVal = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const val = source[date.toDateString()] || 0;
    dayValues[date.getDay()] = val;
    if (val > maxVal) maxVal = val;
  }

  cols.forEach((col) => {
    const dayNum = parseInt(col.getAttribute("data-day"), 10);
    const dayIndex = (dayNum + 1) % 7; // Sat = 0, Sun = 1, …
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);

    const bar = col.querySelector(".chart-bar-fill");
    const valueDiv = col.querySelector(".chart-bar-value");
    const val = dayValues[dayNum] || 0;

    const isToday = date.getTime() === today.getTime();
    const isFuture = date.getTime() > today.getTime();
    const isZero = !isFuture && val === 0;

    col.classList.toggle("today", isToday);
    col.classList.toggle("is-future", isFuture);
    col.classList.toggle("is-zero", isZero);

    if (isFuture || isZero) {
      if (bar) bar.style.height = "0%";
      if (valueDiv) valueDiv.textContent = "";
      return;
    }

    const pct = Math.max(6, Math.round((val / maxVal) * 100));
    if (bar) bar.style.height = pct + "%";
    if (valueDiv) valueDiv.textContent = toArabicNumerals(val);
  });
}

function updateWeeklyChart() {
  renderWeeklyChart("azkarChart", weeklyProgress);
}


// Quran weekly reading progress
let quranWeeklyProgress =
  JSON.parse(localStorage.getItem("quranWeeklyProgress")) || {};

function trackQuranDailyReading() {
  const today = new Date().toDateString();
  if (!quranWeeklyProgress[today]) {
    quranWeeklyProgress[today] = 0;
  }
  quranWeeklyProgress[today]++;
  localStorage.setItem(
    "quranWeeklyProgress",
    JSON.stringify(quranWeeklyProgress),
  );
}

function updateQuranWeeklyChart() {
  renderWeeklyChart("quranChart", quranWeeklyProgress);
}

function switchChartTab(chartType) {
  // Toggle tabs
  document.querySelectorAll(".chart-tab").forEach(function (tab) {
    tab.classList.toggle(
      "active",
      tab.getAttribute("data-chart") === chartType,
    );
  });

  // Toggle chart panels
  var azkarChart = document.getElementById("azkarChart");
  var quranChart = document.getElementById("quranChart");

  if (chartType === "azkar") {
    if (azkarChart) azkarChart.classList.remove("hidden");
    if (quranChart) quranChart.classList.add("hidden");
  } else {
    if (azkarChart) azkarChart.classList.add("hidden");
    if (quranChart) quranChart.classList.remove("hidden");
    updateQuranWeeklyChart();
  }
}

// ========================================
// QIBLA COMPASS (Extracted to js/modules/qibla.js)
// ========================================
// Handled seamlessly via js/modules/qibla.js with AppRouter & SafeStorage

// ========================================
// READING MODES
// ========================================

let autoScrollInterval = null;
let autoScrollSpeed = 2; // 1=slow, 2=medium, 3=fast
let isAutoScrolling = false;
let focusModeIndex = 0;
let focusModeAdhkar = [];
let isNightReading = false;

function initializeReadingModes() {
  // Load saved preferences
  isNightReading = localStorage.getItem("nightReading") === "true";
  if (isNightReading) {
    document.body.classList.add("night-reading");
    updateNightReadingButton();
  }
}

function toggleAutoScroll() {
  const btn = document.getElementById("autoScrollBtn");
  const control = document.getElementById("autoScrollControl");

  if (isAutoScrolling) {
    // Stop auto-scroll
    clearInterval(autoScrollInterval);
    isAutoScrolling = false;
    if (btn) btn.classList.remove("active");
    if (control) control.classList.add("hidden");
  } else {
    // Start auto-scroll
    isAutoScrolling = true;
    if (btn) btn.classList.add("active");
    if (control) control.classList.remove("hidden");
    startAutoScroll();
  }
}

function startAutoScroll() {
  const speeds = [30, 50, 80]; // pixels per second
  const pixelsPerTick = speeds[autoScrollSpeed - 1] / 60;

  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
  }

  autoScrollInterval = setInterval(() => {
    window.scrollBy(0, pixelsPerTick);

    // Stop at bottom
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 100
    ) {
      toggleAutoScroll();
    }
  }, 16); // ~60fps
}

function changeScrollSpeed(delta) {
  autoScrollSpeed = Math.max(1, Math.min(3, autoScrollSpeed + delta));

  const labels = ["بطيء", "متوسط", "سريع"];
  const label = document.getElementById("scrollSpeedLabel");
  if (label) {
    label.textContent = "سرعة: " + labels[autoScrollSpeed - 1];
  }

  // Restart scroll with new speed
  if (isAutoScrolling) {
    startAutoScroll();
  }
}

function enterFocusMode() {
  if (!currentCategory || !adhkarData[currentCategory]) {
    showNotification("يرجى اختيار قسم الأذكار أولاً", "info");
    return;
  }

  focusModeAdhkar = adhkarData[currentCategory].adhkar;
  focusModeIndex = 0;

  const overlay = document.getElementById("focusModeOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    updateFocusDisplay();
  }
}

function exitFocusMode() {
  const overlay = document.getElementById("focusModeOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
}

function focusPrev() {
  if (focusModeIndex > 0) {
    focusModeIndex--;
    updateFocusDisplay();
  }
}

function focusNext() {
  if (focusModeIndex < focusModeAdhkar.length - 1) {
    focusModeIndex++;
    updateFocusDisplay();
  }
}

function updateFocusDisplay() {
  const zikr = focusModeAdhkar[focusModeIndex];
  if (!zikr) return;

  const textEl = document.getElementById("focusText");
  const sourceEl = document.getElementById("focusSource");
  const fadlEl = document.getElementById("focusFadl");
  const counterEl = document.getElementById("focusCounter");
  const countTextEl = document.getElementById("focusCountText");
  const progressEl = document.getElementById("focusProgressFill");

  if (textEl) textEl.textContent = zikr.text;
  if (sourceEl) sourceEl.textContent = zikr.source;
  if (fadlEl) fadlEl.textContent = zikr.fadl || "";
  if (counterEl)
    counterEl.textContent = `${focusModeIndex + 1}/${focusModeAdhkar.length}`;
  if (countTextEl)
    countTextEl.textContent = `${zikr.currentCount}/${zikr.count}`;

  const progress = (zikr.currentCount / zikr.count) * 100;
  if (progressEl) progressEl.style.width = progress + "%";

  // Update prev/next buttons
  const prevBtn = document.getElementById("focusPrevBtn");
  const nextBtn = document.getElementById("focusNextBtn");
  if (prevBtn) prevBtn.disabled = focusModeIndex === 0;
  if (nextBtn) nextBtn.disabled = focusModeIndex === focusModeAdhkar.length - 1;
}

function incrementFocusCount() {
  const zikr = focusModeAdhkar[focusModeIndex];
  if (!zikr || zikr.currentCount >= zikr.count) return;

  zikr.currentCount++;
  saveProgress();
  updateFocusDisplay();
  updateCardProgress(currentCategory, focusModeIndex);

  // Vibration feedback
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }

  // Check completion
  if (zikr.currentCount === zikr.count) {
    markZekrCompleted(currentCategory, focusModeIndex);
    updateStatsDashboard();
    updateWeeklyChart();

    // Auto-advance after completion
    setTimeout(() => {
      if (focusModeIndex < focusModeAdhkar.length - 1) {
        focusNext();
      } else {
        showNotification("مبروك! أكملت جميع الأذكار");
        exitFocusMode();
      }
    }, 500);
  }
}

function toggleNightReading() {
  isNightReading = !isNightReading;
  localStorage.setItem("nightReading", isNightReading);

  if (isNightReading) {
    document.body.classList.add("night-reading");
  } else {
    document.body.classList.remove("night-reading");
  }

  updateNightReadingButton();
  showNotification(
    isNightReading
      ? "تم تفعيل وضع القراءة الليلية"
      : "تم إلغاء وضع القراءة الليلية",
  );
}

function updateNightReadingButton() {
  const btn = document.getElementById("nightReadingBtn");
  if (btn) {
    btn.classList.toggle("active", isNightReading);
  }
}

// ========================================
// OFFLINE DETECTION
// ========================================

function initializeOfflineDetection() {
  const banner = document.getElementById("offlineBanner");
  if (!banner) return;

  let offlineTimer = null;

  function handleOffline() {
    isOnline = false;
    const span = banner.querySelector("span");
    const icon = banner.querySelector("i");
    if (span) span.textContent = "لا يوجد اتصال بالإنترنت - التطبيق يعمل بكامل وظائفه بدون اتصال";
    if (icon) icon.className = "fas fa-wifi-slash";
    banner.classList.remove("online-recovered");
    banner.classList.remove("hidden");

    if (offlineTimer) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
      banner.classList.add("hidden");
    }, 4000);
  }

  function handleOnline() {
    isOnline = true;
    const span = banner.querySelector("span");
    const icon = banner.querySelector("i");
    if (span) span.textContent = "تم استعادة الاتصال بالإنترنت بنجاح";
    if (icon) icon.className = "fas fa-wifi";
    banner.classList.add("online-recovered");
    banner.classList.remove("hidden");

    if (offlineTimer) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
      banner.classList.add("hidden");
      banner.classList.remove("online-recovered");
    }, 2500);
  }

  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);

  // Check initial status only if already offline on load
  if (!navigator.onLine) {
    handleOffline();
  }
}

// Update stats when zikr is completed
const originalMarkZekrCompleted = markZekrCompleted;
markZekrCompleted = function (categoryKey, zekrIndex) {
  originalMarkZekrCompleted(categoryKey, zekrIndex);
  updateStatsDashboard();
  updateWeeklyChart();
};

// Keyboard shortcuts for focus mode
document.addEventListener("keydown", function (e) {
  const focusOverlay = document.getElementById("focusModeOverlay");
  if (focusOverlay && !focusOverlay.classList.contains("hidden")) {
    if (e.key === "Escape") {
      exitFocusMode();
    } else if (e.key === "ArrowRight") {
      focusPrev();
    } else if (e.key === "ArrowLeft") {
      focusNext();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      incrementFocusCount();
    }
  }
});

// ========================================
// DATE AND DAILY DUAA FEATURE
// ========================================

/**
 * Updates the date section with current Hijri and Gregorian dates
 * and displays a daily random Duaa.
 */
/**
 * Live Digital Clock for the Hero Calendar
 */
let liveClockInterval = null;
function startLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  const updateClock = () => {
    const el = document.getElementById("liveClockText");
    if (!el) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const period = hours >= 12 ? "م" : "ص";
    hours = hours % 12 || 12;
    el.textContent = `${hours}:${minutes}:${seconds} ${period}`;
  };
  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);
}

/**
 * Updates the date section with current Hijri and Gregorian dates,
 * renders interactive calendar strip with fasting indicators,
 * and displays a daily random Duaa.
 */
function updateDailyInfo() {
  const now = new Date();

  // Start live clock
  startLiveClock();

  // 1. Greeting (static) + weekday for the Hijri line
  const weekdayName = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
  }).format(now);

  // 2. Update Gregorian Date
  const gregorianMonthElement = document.getElementById("gregorianMonth");
  const gregorianDateElement = document.getElementById("gregorianDate");
  const gregorianFullDate = document.getElementById("gregorianFullDate");

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const gregMonthName = new Intl.DateTimeFormat("ar-EG", {
    month: "long",
  }).format(now);

  if (gregorianDateElement) {
    gregorianDateElement.textContent = `${dd} / ${mm} / ${yyyy}`;
  }
  if (gregorianMonthElement) {
    gregorianMonthElement.textContent = gregMonthName;
  }
  if (gregorianFullDate) {
    gregorianFullDate.textContent = `${dd} ${gregMonthName} ${yyyy} م`;
  }

  // 3. Update Hijri Date
  const hijriMonthElement = document.getElementById("hijriMonth");
  const hijriDateElement = document.getElementById("hijriDate");
  const hijriFullDate = document.getElementById("hijriFullDate");

  const hijri = getHijriDate(now);
  if (hijriDateElement) {
    hijriDateElement.textContent = `${hijri.day} / ${hijri.month} / ${hijri.year}`;
  }
  if (hijriMonthElement) {
    hijriMonthElement.textContent = hijri.monthName;
  }
  if (hijriFullDate) {
    hijriFullDate.textContent = `${weekdayName} ${toArabicDigits(hijri.day)} ${hijri.monthName} ${toArabicDigits(hijri.year)}`;
  }

  // Update Header with Hijri Date for Duaa
  const duaaHeader = document.getElementById("duaaHeader");
  if (duaaHeader) {
    duaaHeader.textContent = `دعاء اليوم `;
  }

  // 4. Update Daily Duaa
  updateDailyDuaa(now);

  // 5. Friday Banner — show only on Fridays (day 5 = Friday)
  const fridayBanner = document.getElementById("fridayBanner");
  if (fridayBanner) {
    if (now.getDay() === 5) {
      fridayBanner.classList.remove("hidden");
    } else {
      fridayBanner.classList.add("hidden");
    }
  }

  // 6. Fasting Reminder Banner & Calendar Alert & 7-Day Strip
  updateFastingReminder(now);
  updateCalendarFastingAlert(now);
  renderInteractiveCalendar(now);

  // 7. Dynamic Time-Aware Hero Card & Continue Reading Pill
  updateDynamicHeroCard(now);
  updateContinueReadingPill();

  // 8. Ramadan Live Countdown
  startRamadanCountdownTicker();
}

// ========================================
// RAMADAN COUNTDOWN SYSTEM
// ========================================

let ramadanCountdownInterval = null;
let cachedRamadanTarget = null;

function getNextRamadanTarget(now) {
  if (cachedRamadanTarget && cachedRamadanTarget > now) {
    return cachedRamadanTarget;
  }

  let testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i <= 365; i++) {
    const h = getHijriDate(testDate);
    if (h.month === 9 && h.day === 1) {
      testDate.setHours(0, 0, 0, 0);
      cachedRamadanTarget = testDate;
      return testDate;
    }
    testDate.setDate(testDate.getDate() + 1);
  }

  return null;
}

/**
 * Adds (or subtracts) whole days to a date without mutating it.
 */
function addDaysToDate(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Arabic-aware day count wording: "يوم واحد" / "يومان" / "٣ أيام" / "٩٠ يومًا".
 */
function formatDaysCount(count) {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n === 0) return "اليوم";
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n <= 10) return toArabicDigits(n) + " أيام";
  return toArabicDigits(n) + " يومًا";
}

/**
 * Genitive day count for "بعد …": "بعد يوم" / "بعد يومين" / "بعد ٣ أيام".
 */
function formatDaysAfter(count) {
  const n = Math.max(1, Math.round(Number(count) || 0));
  if (n === 1) return "يوم";
  if (n === 2) return "يومين";
  if (n <= 10) return toArabicDigits(n) + " أيام";
  return toArabicDigits(n) + " يومًا";
}

/**
 * Event name without the parenthetical date, for compact rows.
 */
function cleanEventName(name) {
  return String(name || "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

/**
 * Ramadan state for the reminders strip / sheet.
 * While inside Ramadan the target is null and `day` holds today's Hijri day.
 */
function getRamadanState(now) {
  const date = now || new Date();
  const hijri = getHijriDate(date);

  if (hijri.month === 9) {
    return {
      inRamadan: true,
      day: hijri.day,
      daysLeft: Math.max(0, 30 - hijri.day),
      pct: Math.min(100, (hijri.day / 30) * 100),
      target: null,
    };
  }

  const target = getNextRamadanTarget(date);
  if (!target) {
    return { inRamadan: false, day: 0, daysLeft: 0, pct: 0, target: null };
  }

  const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysLeft = Math.max(0, Math.round((target - startOfToday) / 86400000));
  return {
    inRamadan: false,
    day: 0,
    daysLeft,
    pct: Math.max(3, Math.min(100, 100 - (daysLeft / 354) * 100)),
    target,
  };
}

/**
 * Voluntary-fasting state for the reminders strip / sheet.
 * kind: "forbidden" | "today" | "tomorrow" | "upcoming" | "none"
 */
function getFastingState(now) {
  const date = now || new Date();

  const forbidden = getForbiddenFastReason(date);
  if (forbidden) return { kind: "forbidden", reason: forbidden, events: [] };

  const todayEvents = checkFastingOccasions(date);
  if (todayEvents.length > 0) {
    return { kind: "today", days: 0, events: todayEvents, event: todayEvents[0] };
  }

  for (let i = 1; i <= 14; i++) {
    const future = addDaysToDate(date, i);
    const events = checkFastingOccasions(future);
    if (events.length > 0) {
      return {
        kind: i === 1 ? "tomorrow" : "upcoming",
        days: i,
        date: future,
        events: events,
        event: events[0],
      };
    }
  }

  return { kind: "none", events: [] };
}

function getFastingReminderType(event) {
  if (!event) return "تذكير بالصيام";
  if (event.name && event.name.includes("الأيام البيض")) return "تذكير بالصيام · أيام بيض";
  if (event.badge === "سنة أسبوعية") return "تذكير بالصيام · سنة أسبوعية";
  return event.badge ? `تذكير بالصيام · ${event.badge}` : "تذكير بالصيام";
}

/**
 * Next fasting dates (one entry per day, occasions merged).
 */
function getUpcomingFastingDays(now, maxDays, limit) {
  const date = now || new Date();
  const out = [];
  const max = maxDays || 45;
  const cap = limit || 5;

  for (let i = 1; i <= max && out.length < cap; i++) {
    const future = addDaysToDate(date, i);
    const events = checkFastingOccasions(future);
    if (events.length > 0) out.push({ date: future, events: events });
  }
  return out;
}

/**
 * Renders the compact Home reminders strip (Ramadan + voluntary fasting).
 * Kept compact — all details live in the «تذكير الصيام» bottom sheet.
 */
function updateRemindersStrip(now) {
  const date = now || new Date();
  const ramadan = getRamadanState(date);
  const fasting = getFastingState(date);

  const ramadanChipEl = document.getElementById("remindRamadanSeg");
  const ramadanLabelEl = document.getElementById("remindRamadanLabel");
  const ramadanValueEl = document.getElementById("remindRamadanValue");
  const ramadanDateEl = document.getElementById("remindRamadanDate");
  const ramadanBarEl = document.getElementById("remindRamadanBar");
  const fastingSegEl = document.getElementById("remindFastingSeg");
  const fastingLabelEl = document.getElementById("remindFastingLabel");
  const fastingValueEl = document.getElementById("remindFastingValue");
  const targetLabelEl = document.getElementById("ramadanTargetDateLabel");

  // ── Ramadan chip ──
  const hijriYear = ramadan.inRamadan ? getHijriDate(date).year : getHijriDate(ramadan.target || date).year;
  if (ramadanLabelEl) {
    if (ramadan.inRamadan) {
      ramadanLabelEl.textContent = `رمضان ${toArabicDigits(hijriYear)} · الشهر الحالي`;
    } else if (ramadan.target) {
      const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const targetDay = toArabicDigits(ramadan.target.getDate());
      const targetMonth = arabicMonths[ramadan.target.getMonth()];
      ramadanLabelEl.textContent = `رمضان ${toArabicDigits(hijriYear)} · متوقع ${targetDay} ${targetMonth}`;
    } else {
      ramadanLabelEl.textContent = `رمضان ${toArabicDigits(hijriYear)} · متوقع`;
    }
  }
  if (ramadanValueEl) {
    if (ramadan.inRamadan) {
      ramadanValueEl.innerHTML = `متبقي ${toArabicDigits(ramadan.daysLeft)} يوماً`;
    } else if (ramadan.target) {
      ramadanValueEl.innerHTML = `بعد ${toArabicDigits(ramadan.daysLeft)} يوماً`;
    } else {
      ramadanValueEl.textContent = "—";
    }
  }
  if (ramadanBarEl) {
    const pct = ramadan.inRamadan
      ? (ramadan.day / 30) * 100
      : Math.max(8, Math.min(100, ((354 - ramadan.daysLeft) / 354) * 100));
    ramadanBarEl.style.width = pct.toFixed(1) + "%";
  }
  if (targetLabelEl && ramadan.target) {
    targetLabelEl.textContent = "متوقع: " + formatHijriDateLong(ramadan.target);
  }

  // ── Fasting chip ──
  const showFasting = true;
  const spanning = !showFasting;

  if (ramadanChipEl) ramadanChipEl.classList.toggle("is-span-2", spanning);
  if (ramadanDateEl) {
    if (spanning && ramadan.target) {
      ramadanDateEl.hidden = false;
      ramadanDateEl.textContent = "متوقع " + formatHijriDateLong(ramadan.target);
    } else {
      ramadanDateEl.hidden = true;
    }
  }

  if (!fastingSegEl) return;
  if (!showFasting) {
    fastingSegEl.style.display = "none";
    return;
  }
  fastingSegEl.style.display = "";
  if (!fastingLabelEl || !fastingValueEl) return;

  const event = fasting.event || (fasting.events && fasting.events[0]);
  if (!event) {
    const next = getUpcomingFastingDays(date, 45, 1)[0];
    if (!next) {
      fastingLabelEl.textContent = "تذكير الصيام";
      fastingValueEl.textContent = "لا يوجد موعد قريب";
      return;
    }
    fasting.days = Math.max(1, Math.round((next.date - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000));
    fasting.date = next.date;
    fasting.event = next.events[0];
    fasting.kind = "upcoming";
  }

  const arabicWeekdays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const fajrRaw = (prayerTimesData && prayerTimesData.Fajr) || "04:47";
  const formattedFajr = formatToArabic12Hour(fajrRaw) || "٤:٤٧ ص";
  const maghribRaw = (prayerTimesData && prayerTimesData.Maghrib) || "17:02";
  const formattedMaghrib = formatToArabic12Hour(maghribRaw) || "٥:٠٢ م";

  if (fasting.kind === "today") {
    const todayDayName = arabicWeekdays[date.getDay()];
    fastingLabelEl.textContent = `تذكير بالصيام · اليوم ${todayDayName}`;
    fastingValueEl.textContent = `الإفطار عند المغرب ${formattedMaghrib}`;
  } else if (fasting.kind === "tomorrow") {
    const tmrDayName = arabicWeekdays[(date.getDay() + 1) % 7];
    const reminderType = getFastingReminderType(fasting.event);
    fastingLabelEl.textContent = reminderType ? `${reminderType} · غداً ${tmrDayName}` : `تذكير بالصيام · غداً ${tmrDayName}`;
    fastingValueEl.textContent = `السحور قبل الفجر ${formattedFajr}`;
  } else {
    const targetDayName = fasting.date ? arabicWeekdays[fasting.date.getDay()] : "";
    const reminderType = getFastingReminderType(fasting.event);
    if (reminderType && targetDayName) {
      fastingLabelEl.textContent = `${reminderType} · ${targetDayName}`;
    } else if (targetDayName) {
      fastingLabelEl.textContent = `تذكير بالصيام · ${targetDayName}`;
    } else {
      fastingLabelEl.textContent = "تذكير بالصيام";
    }
    fastingValueEl.textContent = `السحور قبل الفجر ${formattedFajr}`;
  }
}

function getRamadanCountdownParts(target, now) {
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(remaining / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

function getNextMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/**
 * "H:MM:SS" remaining until Maghrib, with Arabic digits inside a bdi.
 */
function iftarCountdown(now) {
  try {
    const time = prayerTimesData && prayerTimesData.Maghrib;
    if (!time) return "المغرب";
    const [h, m] = String(time).split(" ")[0].split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "المغرب";
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    const diff = Math.floor((target - now) / 1000);
    if (diff <= 0) return "المغرب";
    const pad = (n) => String(n).padStart(2, "0");
    const text = toArabicNumerals(
      `${Math.floor(diff / 3600)}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`,
    );
    return `<bdi dir="ltr" style="unicode-bidi:isolate">${text}</bdi>`;
  } catch (e) {
    return "المغرب";
  }
}

/**
 * Short label for the strip ("صيام الخميس" → "الخميس").
 */
function shortFastingName(event) {
  if (!event || !event.name) return "";
  return String(event.name).replace(/^صيام\s+/, "");
}

/**
 * "٨ فبراير ٢٠٢٧ م" style long date.
 */
function formatGregorianDateLong(date) {
  try {
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
  }
}

/**
 * "١ رمضان ١٤٤٩ هـ" style Hijri date.
 */
function formatHijriDateLong(date) {
  const hijri = getHijriDate(date);
  return `${toArabicDigits(hijri.day)} ${hijri.monthName} ${toArabicDigits(hijri.year)} هـ`;
}

function updateRamadanCountdown() {
  updateRemindersStrip(new Date());
  const sheetBody = document.getElementById("remindersSheetBody");
  if (sheetBody && sheetBody.querySelector('[data-rsheet-focus="ramadan"]')) {
    sheetBody.innerHTML = buildRemindersSheetHtml("ramadan");
  }
}

function toArabicDigits(num) {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => digits[+w]);
}

function startRamadanCountdownTicker() {
  if (ramadanCountdownInterval) {
    clearInterval(ramadanCountdownInterval);
  }
  updateRamadanCountdown();
  ramadanCountdownInterval = setInterval(updateRamadanCountdown, 60000);
}
window.updateRamadanCountdown = updateRamadanCountdown;

// ========================================
// FASTING REMINDER & CALENDAR SYSTEM
// ========================================

/**
 * Gets Hijri date parts for a given Gregorian date.
 * Returns { day: number, month: number, year: number, monthName: string }
 */
function getHijriDate(date) {
  try {
    const hijriNumeric = new Intl.DateTimeFormat(
      "en-US-u-ca-islamic-umalqura",
      {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      },
    );
    const hijriNamed = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      month: "long",
    });

    const parts = hijriNumeric.formatToParts(date);
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");
    const month = parseInt(parts.find((p) => p.type === "month")?.value || "0");
    const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
    const monthName = hijriNamed.format(date);

    return { day, month, year, monthName };
  } catch (e) {
    return { day: 1, month: 1, year: 1448, monthName: "محرم" };
  }
}

/**
 * Returns the reason a given date is a forbidden fast day, or null.
 * Festivals of breaking the fast and the days of Tashreeq must never
 * carry a fasting reminder.
 */
function getForbiddenFastReason(date) {
  const hijri = getHijriDate(date);
  // 1 شوال — عيد الفطر
  if (hijri.month === 10 && hijri.day === 1) return "عيد الفطر";
  // 10 ذو الحجة — عيد الأضحى (يوم النحر)
  if (hijri.month === 12 && hijri.day === 10) return "عيد الأضحى";
  // 11–13 ذو الحجة — أيام التشريق
  if (hijri.month === 12 && hijri.day >= 11 && hijri.day <= 13) {
    return "أيام التشريق";
  }
  return null;
}

/**
 * Checks all Islamic fasting occasions for a given date.
 * Returns an array of fasting events, each with { name, detail, badge, priority }.
 */
function checkFastingOccasions(date) {
  const hijri = getHijriDate(date);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
  const events = [];

  // Ramadan is an obligatory fast (no voluntary-fasting reminder needed),
  // and the Eids / days of Tashreeq are forbidden fast days.
  if (hijri.month === 9) return [];
  if (getForbiddenFastReason(date)) return [];

  // ── 1. يوم عاشوراء (10 محرم) + تاسوعاء (9 محرم) ──
  if (hijri.month === 1 && hijri.day === 10) {
    events.push({
      name: "يوم عاشوراء",
      detail: "١٠ محرم — يُكفِّر السنة التي قبله",
      badge: "سنة مؤكدة",
      priority: 1,
    });
  }
  if (hijri.month === 1 && hijri.day === 9) {
    events.push({
      name: "يوم تاسوعاء",
      detail: "٩ محرم — يُستحب صيامه مع عاشوراء مخالفةً لأهل الكتاب",
      badge: "سنة مؤكدة",
      priority: 1,
    });
  }

  // ── 2. يوم عرفة (9 ذو الحجة) لغير الحاج ──
  if (hijri.month === 12 && hijri.day === 9) {
    events.push({
      name: "يوم عرفة",
      detail: "٩ ذو الحجة — يُكفِّر سنتين (التي قبله والتي بعده)",
      badge: "سنة مؤكدة",
      priority: 1,
    });
  }

  // ── 3. الأيام البيض (13-14-15 من كل شهر هجري) ──
  if (hijri.day >= 13 && hijri.day <= 15) {
    events.push({
      name: `الأيام البيض (${hijri.day} ${hijri.monthName})`,
      detail: `صيام ثلاثة أيام من كل شهر كصيام الدهر كله`,
      badge: "سنة شهرية",
      priority: 3,
    });
  }

  // ── 4. ستة أيام من شوال ──
  if (hijri.month === 10 && hijri.day >= 2 && hijri.day <= 7) {
    events.push({
      name: "أيام شوال الستة",
      detail: `${hijri.day} شوال — من صام رمضان ثم أتبعه ستًّا من شوال كان كصيام الدهر`,
      badge: "سنة سنوية",
      priority: 2,
    });
  }

  // ── 5. صيام العشر الأوائل من ذي الحجة (1-8) ──
  if (hijri.month === 12 && hijri.day >= 1 && hijri.day <= 8) {
    events.push({
      name: "تسع ذي الحجة",
      detail: `${hijri.day} ذو الحجة — ما من أيام العمل الصالح فيها أحبّ إلى الله من هذه الأيام`,
      badge: "مستحب",
      priority: 2,
    });
  }

  // ── 6. صيام شعبان ──
  if (hijri.month === 8 && hijri.day >= 1 && hijri.day <= 15) {
    events.push({
      name: `صيام شعبان`,
      detail: `${hijri.day} شعبان — شهرٌ تُرفع فيه الأعمال إلى الله وكان النبي ﷺ يُكثر من صيامه`,
      badge: "مستحب",
      priority: 4,
    });
  }

  // ── 7. صيام محرم ──
  if (hijri.month === 1 && hijri.day !== 9 && hijri.day !== 10) {
    events.push({
      name: "صيام المحرم",
      detail: `${hijri.day} محرم — أفضل الصيام بعد رمضان شهر الله المحرم`,
      badge: "مستحب",
      priority: 5,
    });
  }

  // ── 8. الإثنين والخميس من كل أسبوع ──
  if (dayOfWeek === 1) {
    // Monday
    events.push({
      name: "صيام الإثنين",
      detail: "يوم تُعرض فيه الأعمال على الله وأحب أن يُعرض عملي وأنا صائم",
      badge: "سنة أسبوعية",
      priority: 6,
    });
  }
  if (dayOfWeek === 4) {
    // Thursday
    events.push({
      name: "صيام الخميس",
      detail: "يوم تُعرض فيه الأعمال على الله وأحب أن يُعرض عملي وأنا صائم",
      badge: "سنة أسبوعية",
      priority: 6,
    });
  }

  // Sort by priority (lower = more important)
  events.sort((a, b) => a.priority - b.priority);
  return events;
}

/**
 * Renders the 7-day interactive week strip in the calendar card.
 */
function renderInteractiveCalendar(now) {
  const strip = document.getElementById("calWeekStrip");
  if (!strip) return;

  const dayNamesArabic = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  // 7 days: 2 days before today up to 4 days ahead
  const days = [];
  for (let offset = -2; offset <= 4; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    days.push(d);
  }

  strip.innerHTML = days
    .map((date) => {
      const isToday = date.toDateString() === now.toDateString();
      const dayOfWeek = date.getDay();
      const dayName = dayNamesArabic[dayOfWeek];
      const hijri = getHijriDate(date);
      const gregDay = date.getDate();
      const occasions = checkFastingOccasions(date);
      const isFasting = occasions.length > 0;
      const topOccasion = isFasting ? occasions[0] : null;

      return `
        <div class="cal-day-pill ${isToday ? "cal-day--today" : ""} ${isFasting ? "cal-day--fasting" : ""}"
             onclick="selectCalendarDay('${date.toISOString()}', ${isToday}, ${isFasting})"
             role="button"
             tabindex="0"
             title="${isToday ? "اليوم - " : ""}${isFasting ? topOccasion.name + " - " + topOccasion.detail : dayName}">
          ${isToday ? '<span class="cal-today-top-bar"></span>' : ""}
          <span class="cal-day-name">${dayName}</span>
          <span class="cal-day-hijri-num">${hijri.day}</span>
          <span class="cal-day-greg-num">${gregDay}</span>
          ${isFasting ? '<span class="cal-fasting-tag">صيام</span>' : ""}
        </div>
      `;
    })
    .join("");
}

/**
 * Handles clicking a day in the 7-day strip.
 */
function selectCalendarDay(dateStr, isToday, isFasting) {
  const date = new Date(dateStr);
  const panel = document.getElementById("calDayDetailPanel");
  const content = document.getElementById("calDayDetailContent");
  if (!panel || !content) return;

  const dayNames = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  const dayName = dayNames[date.getDay()];
  const hijri = getHijriDate(date);
  const gregFormatted = `${date.getDate()} / ${date.getMonth() + 1} / ${date.getFullYear()}`;
  const occasions = checkFastingOccasions(date);

  let html = `
    <div class="cal-panel-top">
      <div class="cal-panel-header">
        <span class="cal-panel-day">${dayName} ${isToday ? "— اليوم" : ""}</span>
        <span class="cal-panel-date">${hijri.day} ${hijri.monthName} ${hijri.year} هـ &bull; ${gregFormatted} م</span>
      </div>
    </div>
  `;

  if (occasions.length > 0) {
    html += `
      <div class="cal-panel-fasting-box">
        <div class="cal-panel-fasting-title">
          <i class="fas fa-calendar-day modal-gold-icon"></i>
          <strong>${occasions[0].name}</strong>
          <span class="foc-badge foc-badge--gold">${occasions[0].badge}</span>
        </div>
        <p class="cal-panel-fasting-detail">${occasions[0].detail}</p>
        ${
          occasions.length > 1
            ? `<p class="cal-panel-extra">وأيضاً: ${occasions
                .slice(1)
                .map((e) => e.name)
                .join("، ")}</p>`
            : ""
        }
        <button class="cal-panel-guide-btn" onclick="openFastingGuideModal()">
          <i class="fas fa-book-open"></i> قراءة دليل وفضائل الصيام
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="cal-panel-regular-box">
        <p><i class="far fa-calendar-check"></i> يوم مبارك — رطّب لسانك بذكر الله وقراءة القرآن</p>
      </div>
    `;
  }

  content.innerHTML = html;
  panel.classList.remove("hidden");
}

function closeCalDayDetail() {
  const panel = document.getElementById("calDayDetailPanel");
  if (panel) panel.classList.add("hidden");
}

/**
 * Updates the Home reminders strip (fasting segment).
 * The strip replaced the old always-visible fasting card.
 */
function updateCalendarFastingAlert(now) {
  updateRemindersStrip(now || new Date());
}

/**
 * Builds the «تذكير الصيام» bottom-sheet body from live Hijri data.
 * @param {Date} [atDate] Optional reference date (defaults to now).
 */
function buildRemindersSheetHtml(tab, atDate) {
  if (tab instanceof Date) {
    atDate = tab;
    tab = "fasting";
  }
  const activeTab = tab === "ramadan" ? "ramadan" : "fasting";
  const now = atDate || new Date();
  const ramadan = getRamadanState(now);
  const fasting = getFastingState(now);
  const upcoming = getUpcomingFastingDays(now, 45, 5);

  const dayNames = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  // ── Ramadan block ──
  let ramadanHtml = "";
  if (ramadan.inRamadan) {
    const remainderText =
      ramadan.daysLeft > 0
        ? `بقي ${formatDaysCount(ramadan.daysLeft)} على نهاية الشهر — تقبّل الله صيامك وقيامك.`
        : "اليوم آخر أيام الشهر — تقبّل الله صيامك وقيامك.";
    ramadanHtml = `
      <div class="pt-rsheet__block is-gold" data-rsheet="ramadan">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="fas fa-moon"></i> رمضان المبارك</span>
          <span class="pt-rsheet__chip">الشهر الحالي</span>
        </div>
        <div class="pt-rsheet__big">
          <span class="pt-rsheet__num">${toArabicDigits(ramadan.day)}</span>
          <span class="pt-rsheet__unit">من رمضان</span>
        </div>
        <p class="pt-rsheet__hint">${remainderText}</p>
        <div class="pt-rsheet__bar"><span style="width:${ramadan.pct.toFixed(1)}%"></span></div>
      </div>`;
  } else if (ramadan.target) {
    ramadanHtml = `
      <div class="pt-rsheet__block is-gold" data-rsheet="ramadan">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="fas fa-moon"></i> رمضان المبارك</span>
          <span class="pt-rsheet__chip">متوقع</span>
        </div>
        <div class="pt-rsheet__big">
          <span class="pt-rsheet__num">${toArabicDigits(ramadan.daysLeft)}</span>
          <span class="pt-rsheet__unit">يومًا متبقيًا</span>
        </div>
        <div class="pt-rsheet__date">${formatHijriDateLong(ramadan.target)}</div>
        <p class="pt-rsheet__hint">الموافق ${formatGregorianDateLong(ramadan.target)} — التاريخ متوقع فلكيًا وقد يتغيّر يومًا حسب الرؤية.</p>
        <div class="pt-rsheet__bar"><span style="width:${ramadan.pct.toFixed(1)}%"></span></div>
      </div>`;
  }

  // ── Fasting block ──
  let fastingHtml = "";
  if (fasting.kind === "forbidden") {
    fastingHtml = `
      <div class="pt-rsheet__block" data-rsheet="fasting">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="far fa-calendar-alt"></i> صيام التطوع</span>
          <span class="pt-rsheet__chip">لا صيام</span>
        </div>
        <p class="pt-rsheet__date">${fasting.reason} — لا يجوز صيامه.</p>
        <p class="pt-rsheet__hint">«أيام التشريق أيام أكل وشرب وذكر لله» — رواه مسلم. يعود تذكير الصيام بعد انتهاء هذه الأيام.</p>
      </div>`;
  } else if (fasting.kind === "today") {
    fastingHtml = `
      <div class="pt-rsheet__block is-em" data-rsheet="fasting">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="far fa-calendar-alt"></i> صيام التطوع</span>
          <span class="pt-rsheet__chip">اليوم</span>
        </div>
        <p class="pt-rsheet__date">${fasting.events.map((e) => cleanEventName(e.name)).join(" · ")}</p>
        <p class="pt-rsheet__hint">${fasting.event.detail} — تقبّل الله صيامك.</p>
      </div>`;
  } else if (fasting.kind === "tomorrow") {
    fastingHtml = `
      <div class="pt-rsheet__block" data-rsheet="fasting">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="far fa-calendar-alt"></i> صيام التطوع</span>
          <span class="pt-rsheet__chip">غدًا</span>
        </div>
        <p class="pt-rsheet__date">${fasting.events.map((e) => cleanEventName(e.name)).join(" · ")}</p>
        <p class="pt-rsheet__hint">${fasting.event.detail} — انوِ الصيام وجهّز سحورك.</p>
      </div>`;
  } else if (fasting.kind === "upcoming") {
    fastingHtml = `
      <div class="pt-rsheet__block" data-rsheet="fasting">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="far fa-calendar-alt"></i> صيام التطوع</span>
          <span class="pt-rsheet__chip">بعد ${formatDaysAfter(fasting.days)}</span>
        </div>
        <p class="pt-rsheet__date">${fasting.events.map((e) => cleanEventName(e.name)).join(" · ")}</p>
        <p class="pt-rsheet__hint">${fasting.event.detail}</p>
      </div>`;
  } else {
    fastingHtml = `
      <div class="pt-rsheet__block" data-rsheet="fasting">
        <div class="pt-rsheet__top">
          <span class="pt-rsheet__kicker"><i class="far fa-calendar-alt"></i> صيام التطوع</span>
          <span class="pt-rsheet__chip">سنة</span>
        </div>
        <p class="pt-rsheet__date">الإثنين والخميس والأيام البيض</p>
        <p class="pt-rsheet__hint">نوّع صيامك واغتنم الأجر — يُستحب صيام الإثنين والخميس و١٣ و١٤ و١٥ من كل شهر هجري.</p>
      </div>`;
  }

  // ── Upcoming fasting days ──
  let upcomingHtml = "";
  if (upcoming.length > 0) {
    upcomingHtml = `
      <div class="pt-rsheet__section">
        <h3 class="pt-rsheet__section-title"><i class="fas fa-calendar-day"></i> أقرب أيام الصيام</h3>
        <div class="pt-rsheet__list">
          ${upcoming
            .map((item, index) => {
              const hijri = getHijriDate(item.date);
              const names = item.events.map((e) => cleanEventName(e.name)).join(" · ");
              const chip = index === 0 ? "الأقرب" : item.events[0].badge;
              return `
            <div class="pt-rsheet__item">
              <div class="pt-rsheet__item-main">
                <span class="pt-rsheet__item-title">${names}</span>
                <span class="pt-rsheet__item-sub">${dayNames[item.date.getDay()]} · ${toArabicDigits(hijri.day)} ${hijri.monthName}</span>
              </div>
              <span class="pt-rsheet__item-chip${index === 0 ? " is-next" : ""}">${chip}</span>
            </div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  // ── Rules + note + guide ──
  const rulesHtml = `
    <div class="pt-rsheet__section">
      <h3 class="pt-rsheet__section-title"><i class="fas fa-list-check"></i> سنن الصيام</h3>
      <div class="pt-rsheet__rules">
        <span class="pt-chip">الإثنين والخميس</span>
        <span class="pt-chip">الأيام البيض ١٣–١٥</span>
        <span class="pt-chip">ستة من شوال</span>
        <span class="pt-chip">عاشوراء وتاسوعاء</span>
        <span class="pt-chip">يوم عرفة</span>
        <span class="pt-chip">تسع ذي الحجة</span>
      </div>
      <div class="pt-rsheet__note">
        <i class="fas fa-circle-info"></i>
        <span>لا صيام في يومَي العيد ولا في أيام التشريق (١١–١٣ ذو الحجة)، ويُكره إفراد الجمعة أو السبت بالصيام.</span>
      </div>
    </div>`;

  const ramadanCountdownTarget = ramadan.inRamadan ? getNextMidnight(now) : ramadan.target;
  const ramadanCountdown = ramadanCountdownTarget
    ? getRamadanCountdownParts(ramadanCountdownTarget, now)
    : { days: ramadan.daysLeft, hours: 0, minutes: 0 };
  const ramadanFocusHtml = ramadanCountdownTarget
    ? `
      <div class="pt-rsheet-focus" data-rsheet-focus="ramadan">
        <div class="pt-rsheet-focus__heading">
          <div>
            <h3>رمضان ${toArabicDigits(getHijriDate(ramadan.target || now).year)}</h3>
            <p>${ramadan.inRamadan ? "اليوم من رمضان · يتجدد العداد مع بداية اليوم التالي" : "الموعد المتوقع " + formatGregorianDateLong(ramadan.target) + " · يعتمد على رؤية الهلال"}</p>
          </div>
          <span class="pt-rsheet-focus__moon"><i class="fas fa-moon"></i></span>
        </div>
        <div class="pt-rsheet-focus__stats">
          <div class="pt-rsheet-focus__stat is-gold">
            <strong>${toArabicDigits(ramadan.inRamadan ? ramadan.daysLeft : ramadanCountdown.days)}</strong>
            <span>يومًا</span>
          </div>
          <div class="pt-rsheet-focus__stat">
            <strong>${toArabicDigits(ramadanCountdown.hours)}</strong>
            <span>ساعة</span>
          </div>
          <div class="pt-rsheet-focus__stat">
            <strong>${toArabicDigits(ramadanCountdown.minutes)}</strong>
            <span>دقيقة</span>
          </div>
        </div>
        <div class="pt-rsheet-focus__progress">
          <div><span>${ramadan.inRamadan ? "اليوم " + toArabicDigits(ramadan.day) + " من رمضان" : "مرّ " + toArabicDigits(Math.max(0, 100 - ramadan.daysLeft)) + "٪ من العام منذ رمضان الماضي"}</span><span>${toArabicDigits(ramadan.daysLeft)} يومًا متبقيًا</span></div>
          <span class="pt-rsheet-focus__progress-bar"><i style="width:${Math.min(100, Math.max(4, ramadan.pct))}%"></i></span>
        </div>
        <p class="pt-rsheet-focus__dua">اللهم بلّغنا رمضان</p>
      </div>`
    : "";

  return `
    <div class="pt-rsheet-tabs" role="tablist">
      <button type="button" class="${activeTab === "fasting" ? "is-active" : ""}" onclick="window.selectRemindersTab('fasting')">الصيام</button>
      <button type="button" class="${activeTab === "ramadan" ? "is-active" : ""}" onclick="window.selectRemindersTab('ramadan')">رمضان</button>
    </div>
    ${activeTab === "ramadan" ? ramadanFocusHtml : `
      ${ramadanHtml}
      ${ramadan.inRamadan ? "" : fastingHtml}
      ${upcomingHtml}
      ${rulesHtml}
      <button type="button" class="pt-rsheet__cta" onclick="openFastingGuideFromReminders()">
        <i class="fas fa-book-open"></i>
        دليل وفضائل الصيام
      </button>
    `}
  `;
}

/**
 * Opens the reminders bottom sheet, registered with AppRouter so that the
 * Android back button closes it before anything else.
 * @param {string} [tab] Optional section to focus ("ramadan" | "fasting").
 * @param {Date} [atDate] Optional reference date (defaults to now).
 */
function openRemindersSheet(tab, atDate) {
  const sheet = document.getElementById("remindersSheet");
  const body = document.getElementById("remindersSheetBody");
  if (!sheet || !body) return;

  body.innerHTML = buildRemindersSheetHtml(tab, atDate);
  sheet.classList.add("is-open");
  document.body.classList.add("modal-open");

  const panel = sheet.querySelector(".pt-sheet__panel");
  if (panel) panel.scrollTop = 0;

  if (window.AppRouter && !window.AppRouter.isModalOpen("remindersSheet")) {
    window.AppRouter.pushModal("remindersSheet", function () {
      closeRemindersSheet(false);
    });
  }

}

function closeRemindersSheet(syncRouter) {
  const sheet = document.getElementById("remindersSheet");
  if (sheet) sheet.classList.remove("is-open");
  if (document.body && (!window.AppRouter || !window.AppRouter.isModalOpen())) {
    document.body.classList.remove("modal-open");
  }
  if (
    syncRouter !== false &&
    window.AppRouter &&
    window.AppRouter.isModalOpen("remindersSheet")
  ) {
    window.AppRouter.closeModal("remindersSheet");
  }
}

function selectRemindersTab(tab) {
  const body = document.getElementById("remindersSheetBody");
  if (!body) return;
  body.innerHTML = buildRemindersSheetHtml(tab);
  const panel = document.querySelector("#remindersSheet .pt-sheet__panel");
  if (panel) panel.scrollTop = 0;
}

/**
 * Leaves the sheet and opens the full fasting guide modal above it.
 */
function openFastingGuideFromReminders() {
  closeRemindersSheet();
  window.setTimeout(function () {
    if (typeof openFastingGuideModal === "function") openFastingGuideModal();
  }, 180);
}

window.openRemindersSheet = openRemindersSheet;
window.selectRemindersTab = selectRemindersTab;
window.closeRemindersSheet = closeRemindersSheet;
window.openFastingGuideFromReminders = openFastingGuideFromReminders;

/**
 * Updates the standalone fasting reminder banner.
 */
function updateFastingReminder(now) {
  const banner = document.getElementById("fastingBanner");
  if (!banner) return;

  const label = document.getElementById("fastingLabel");
  const subtitle = document.getElementById("fastingSubtitle");
  const badge = document.getElementById("fastingBadge");
  const badgeText = document.getElementById("fastingBadgeText");

  const todayEvents = checkFastingOccasions(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEvents = checkFastingOccasions(tomorrow);

  const messages = [];

  if (todayEvents.length > 0) {
    const mainEvent = todayEvents[0];
    messages.push({
      label: `🌙 اليوم ${mainEvent.name}`,
      subtitle: mainEvent.detail,
      badge: mainEvent.badge,
      isToday: true,
      priority: mainEvent.priority,
    });
  }

  if (tomorrowEvents.length > 0) {
    const mainEvent = tomorrowEvents[0];
    if (messages.length === 0 || mainEvent.priority <= 3) {
      messages.push({
        label: `🌅 غدًا ${mainEvent.name}`,
        subtitle: mainEvent.detail,
        badge: mainEvent.badge,
        isToday: false,
        priority: mainEvent.priority,
      });
    }
  }

  if (messages.length === 0) {
    banner.classList.add("hidden");
    return;
  }

  const bestMsg = messages.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.priority - b.priority;
  })[0];

  if (label) label.textContent = bestMsg.label;
  if (subtitle) {
    let subtitleText = bestMsg.subtitle;
    const allEvents = bestMsg.isToday ? todayEvents : tomorrowEvents;
    if (allEvents.length > 1) {
      const otherNames = allEvents
        .slice(1, 3)
        .map((e) => e.name)
        .join("، ");
      subtitleText += ` | وأيضًا: ${otherNames}`;
    }
    subtitle.textContent = subtitleText;
  }
  if (badgeText) badgeText.textContent = bestMsg.badge;
  if (badge) badge.style.display = "";

  banner.classList.remove("hidden");
}

/**
 * Opens Surah Al-Kahf directly in the Mushaf reader.
 */
function openSurahAlKahf() {
  switchTab("tab-quran");
  setTimeout(() => {
    if (typeof openFreeReader === "function") {
      openFreeReader(293, 304);
    }
  }, 150);
}

/**
 * Opens Surah Al-Mulk directly in the Mushaf reader.
 */
function openSurahAlMulk() {
  switchTab("tab-quran");
  setTimeout(() => {
    if (typeof openFreeReader === "function") {
      openFreeReader(562, 564);
    }
  }, 150);
}

/**
 * Dynamic Time-Aware Hero Card
 * Contextually highlights what matters most right now:
 * - Fajr to Sunrise / Morning: Morning Azkar
 * - Asr to Maghrib / Evening: Evening Azkar
 * - Friday: Surah Al-Kahf & Salawat with golden glow
 * - Night / Pre-sleep: Sleep Azkar & Surah Al-Mulk
 * - Midday: General Dhikr & Misbaha
 */
// ========================================
// AZKAR REMINDER NOTIFICATION SYSTEM
// ========================================
let _lastHeroMode = null;
let _azkarReminderInterval = null;

/**
 * Returns the current hero card mode based on time of day.
 */
function getHeroCardMode(now) {
  now = now || new Date();
  const isFriday = now.getDay() === 5;
  if (isFriday) return "friday";

  const toMinutes = (value, fallback) => {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const fajr = toMinutes(prayerTimesData && prayerTimesData.Fajr, 270);
  const dhuhr = toMinutes(prayerTimesData && prayerTimesData.Dhuhr, 720);
  const asr = toMinutes(prayerTimesData && prayerTimesData.Asr, 930);
  const maghrib = toMinutes(
    prayerTimesData && (prayerTimesData.Maghrib || prayerTimesData.Sunset),
    1095,
  );
  const isha = toMinutes(prayerTimesData && prayerTimesData.Isha, 1185);

  if (current >= fajr && current < dhuhr) return "morning";
  if (current >= dhuhr && current < asr) return "midday";
  if (current >= asr && current < maghrib) return "evening";
  if (current >= maghrib && current < isha) return "maghrib";
  return "night";
}

/**
 * Returns user-facing notification text for each hero mode.
 */
function getAzkarReminderText(mode) {
  switch (mode) {
    case "morning":
      return {
        title: "أذكار الصباح",
        body: "حان وقت أذكار الصباح، حصنك ليومك بإذن الله"
      };
    case "evening":
      return {
        title: "أذكار المساء",
        body: "حان وقت أذكار المساء، طمأنينة لقلبك وحفظ من كل سوء"
      };
    case "night":
      return {
        title: "أذكار النوم",
        body: "لا تنسَ أذكار النوم وسورة الملك قبل أن تنام"
      };
    case "friday":
      return {
        title: "يوم الجمعة المبارك",
        body: "لا تنسَ قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ"
      };
    case "midday":
      return {
        title: "استراحة ذكر",
        body: "رطّب لسانك بذكر الله وتسبيحه بعد الظهر"
      };
    default:
      return null;
  }
}

/**
 * Check if azkar reminders are enabled (defaults to true).
 */
function isAzkarReminderEnabled() {
  try {
    const val = localStorage.getItem("tazkeer_azkar_reminder");
    if (val === null) return true; // default enabled
    return val === "true";
  } catch (e) {
    return true;
  }
}

/**
 * Toggle azkar reminder on/off.
 */
function setAzkarReminderEnabled(enabled) {
  try {
    localStorage.setItem("tazkeer_azkar_reminder", String(enabled));
  } catch (e) {}
  // Update toggle UI if exists
  const toggle = document.getElementById("azkarReminderToggle");
  if (toggle) toggle.checked = enabled;
  syncAzkarNativeSchedule();
}

function azkarStableId(dateKey, reminderKey) {
  let hash = 2166136261;
  const value = "azkar:" + dateKey + ":" + reminderKey;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 10000 + (hash >>> 0) % 2000000000;
}

function azkarTimeFor(prayerKey, fallback) {
  const value = prayerTimesData && prayerTimesData[prayerKey];
  return /^\d{1,2}:\d{2}/.test(String(value || "")) ? String(value).slice(0, 5) : fallback;
}

async function buildAzkarNativeSchedule() {
  const fallbackDay = {
    date: new Date(),
    timings: prayerTimesData || {},
  };
  let days = [fallbackDay];
  if (
    window.AdhanNative &&
    typeof window.AdhanNative.getPrayerDays === "function"
  ) {
    try {
      const collected = await window.AdhanNative.getPrayerDays(7);
      if (Array.isArray(collected) && collected.length > 0) days = collected;
    } catch (error) {
      console.warn("[Azkar] Prayer calendar unavailable; using today's timings", error);
    }
  }

  const reminders = [
    { key: "morning", prayer: "Fajr", section: "tab-azkar" },
    { key: "midday", prayer: "Dhuhr", section: "tab-home" },
    { key: "evening", prayer: "Asr", section: "tab-azkar" },
    { key: "night", prayer: "Isha", section: "tab-azkar" },
  ];
  const schedule = [];
  const addOneHour = (date, timeValue) => {
    const match = String(timeValue || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const at = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Number(match[1]),
      Number(match[2]),
      0,
      0,
    );
    at.setMinutes(at.getMinutes() + 60);
    return at;
  };
  const formatLocalTime = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;

  days.forEach((day) => {
    const date = day.date instanceof Date ? day.date : new Date(day.date);
    const timings = day.timings || {};
    if (Number.isNaN(date.getTime())) return;
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    reminders.forEach((reminder) => {
      const at = addOneHour(date, timings[reminder.prayer]);
      if (!at) return;
      if (at.getTime() <= Date.now() + 5000) return;
      const text = getAzkarReminderText(reminder.key);
      if (!text) return;
      schedule.push({
        id: azkarStableId(dateKey, reminder.key),
        date: dateKey,
        time: at.getTime(),
        timeOfDay: formatLocalTime(at),
        key: reminder.key,
        title: text.title,
        body: text.body,
        section: reminder.section
      });
    });

    if (typeof checkFastingOccasions === "function") {
      const events = checkFastingOccasions(date);
      if (Array.isArray(events) && events.length > 0) {
        const reminderDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() - 1,
          20,
          0,
          0,
          0,
        );
        if (reminderDate.getTime() > Date.now() + 5000) {
          const event = events[0];
          const eventLabel =
            (event && (event.name || event.badge)) || "نافلة";
          const fastingDateKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");
          schedule.push({
            id: azkarStableId(fastingDateKey, "fasting"),
            date: [
              reminderDate.getFullYear(),
              String(reminderDate.getMonth() + 1).padStart(2, "0"),
              String(reminderDate.getDate()).padStart(2, "0"),
            ].join("-"),
            time: reminderDate.getTime(),
            timeOfDay: "20:00",
            key: "fasting",
            title: "تذكير بالصيام",
            body: `غدًا موعد الصيام: ${eventLabel}`,
            section: "tab-home",
          });
        }
      }
    }
  });
  return schedule;
}

async function syncAzkarNativeSchedule() {
  const plugin =
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.AdhanScheduler;
  if (!plugin) return false;
  try {
    if (!isAzkarReminderEnabled()) {
      await plugin.cancelAzkarReminders();
      return true;
    }
    const reminders = await buildAzkarNativeSchedule();
    if (!reminders.length) return false;
    const result = await plugin.scheduleAzkarReminders({ reminders });
    if (result && result.scheduled === 0) {
      console.warn("[Azkar] Native scheduler accepted no reminders");
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Azkar] Native schedule sync failed:", error);
    return false;
  }
}

/**
 * Plays a clean, pleasant notification chime:
 * 1. Native device notification tone via Capacitor AdhanScheduler.playNotificationSound()
 * 2. In-app melodious chime via Web Audio API
 */
function playAzkarChime() {
  // 1. Try native device notification tone
  if (
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.AdhanScheduler &&
    typeof window.Capacitor.Plugins.AdhanScheduler.playNotificationSound === "function"
  ) {
    try {
      window.Capacitor.Plugins.AdhanScheduler.playNotificationSound();
    } catch (e) {}
  }

  // 2. In-app gentle chime using Web Audio API
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const notes = [587.33, 739.99, 880.0]; // D5, F#5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    }
  } catch (e) {}
}

/**
 * Send a system notification (browser Notification API or Capacitor).
 */
function sendAzkarSystemNotification(titleText, bodyText) {
  // Play audible chime immediately
  playAzkarChime();

  // Try native Android AdhanScheduler plugin first (high-priority channel with native sound)
  if (
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.AdhanScheduler &&
    typeof window.Capacitor.Plugins.AdhanScheduler.sendAzkarNotification === "function"
  ) {
    try {
      window.Capacitor.Plugins.AdhanScheduler.sendAzkarNotification({
        title: titleText,
        body: bodyText
      });
      return;
    } catch (e) {
      console.warn("[Azkar] Native sendAzkarNotification error:", e);
    }
  }

  // Fallback: Capacitor LocalNotifications
  if (
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.LocalNotifications
  ) {
    try {
      window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            id: 99000 + Math.floor(Math.random() * 999),
            title: titleText,
            body: bodyText,
            smallIcon: "ic_stat_adhan",
            sound: "default",
            schedule: { at: new Date(Date.now() + 300) }
          }
        ]
      });
      return;
    } catch (e) {}
  }

  // Fallback: Web Notification API
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(titleText, {
          body: bodyText,
          icon: "images/icons/icon-192x192.png",
          tag: "azkar-reminder",
          renotify: true
        });
      } catch (e) {}
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (perm) {
        if (perm === "granted") {
          try {
            new Notification(titleText, {
              body: bodyText,
              icon: "images/icons/icon-192x192.png",
              tag: "azkar-reminder",
              renotify: true
            });
          } catch (e) {}
        }
      });
    }
  }
}

/**
 * Manually test Azkar Reminder and Sound from Settings
 */
function testAzkarReminder() {
  const currentMode = getHeroCardMode(new Date());
  const reminder = getAzkarReminderText(currentMode) || {
    title: "تذكير الأذكار",
    body: "تجربة إشعار وصوت تنبيه الأذكار، يعمل بنجاح"
  };
  showNotification(reminder.body, "info", 5000);
  sendAzkarSystemNotification(reminder.title, reminder.body);
}

/**
 * Check first launch and open settings modal automatically
 */
function checkFirstLaunchSettings() {
  try {
    const KEY = "tazkeer_first_launch_v2";
    const done = localStorage.getItem(KEY);
    if (!done) {
      localStorage.setItem(KEY, "true");
      sessionStorage.setItem("tazkeer_is_first_launch", "true");
      setTimeout(function () {
        if (typeof openAdhanModal === "function") {
          openAdhanModal();
        }
      }, 700);
    }
  } catch (e) {}
}

/**
 * Checks if the hero card mode changed and sends a reminder notification.
 * Called periodically every 60 seconds.
 */
function checkAzkarReminderTransition() {
  const now = new Date();
  const currentMode = getHeroCardMode(now);

  if (currentMode !== _lastHeroMode) {
    updateDynamicHeroCard(now);
    renderAzkarSuggestion();
  }

  const nativeNotifications =
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform();
  if (!nativeNotifications && isAzkarReminderEnabled() && _lastHeroMode !== null && currentMode !== _lastHeroMode) {
    const reminder = getAzkarReminderText(currentMode);
    if (reminder) {
      // In-app toast
      showNotification(reminder.body, "info", 6000);
      // System notification (for background/locked screen)
      sendAzkarSystemNotification(reminder.title, reminder.body);
    }
  }

  _lastHeroMode = currentMode;
}

/**
 * Start the periodic azkar reminder checker (every 60s).
 */
function startAzkarReminderEngine() {
  // Initialize current mode without sending notification
  _lastHeroMode = getHeroCardMode(new Date());

  if (_azkarReminderInterval) clearInterval(_azkarReminderInterval);
  _azkarReminderInterval = setInterval(checkAzkarReminderTransition, 60000);
}

// Start engine & check first launch on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  startAzkarReminderEngine();
  checkFirstLaunchSettings();
  syncAzkarNativeSchedule();
});

// Global exports
window.isAzkarReminderEnabled = isAzkarReminderEnabled;
window.setAzkarReminderEnabled = setAzkarReminderEnabled;
window.testAzkarReminder = testAzkarReminder;
window.playAzkarChime = playAzkarChime;
window.syncAzkarNativeSchedule = syncAzkarNativeSchedule;

function updateDynamicHeroCard(now) {
  const container = document.getElementById("dynamicHeroCard");
  if (!container) return;
  now = now || new Date();

  const mode = getHeroCardMode(now);

  let icon = "fa-hands-praying";
  let title = "ألا بذكر الله تطمئن القلوب";
  let sub = "رطّب لسانك بذكر الله في سائر يومك";
  let action = "openMisbaha()";
  let ctaIcon = "fa-circle-notch";
  let ctaLabel = "المسبحة";

  if (mode === "friday") {
    icon = "fa-mosque";
    title = "سورة الكهف والصلاة على النبي";
    sub = "يوم الجمعة المبارك · اغتنم فضله";
    action = "openSurahAlKahf()";
    ctaIcon = "fa-book-quran";
    ctaLabel = "اقرأ";
  } else if (mode === "morning") {
    icon = "fa-sun";
    title = "أذكار الصباح";
    sub = "حِصنك ليومك · ابدأ الآن";
    action = "showCategoryPage('morning')";
    ctaIcon = "fa-play";
    ctaLabel = "ابدأ";
  } else if (mode === "midday") {
    icon = "fa-fingerprint";
    title = "التسبيح بالمسبحة";
    sub = "رطّب لسانك بذكر الله في وسط يومك";
    action = "openMisbaha()";
    ctaIcon = "fa-circle-notch";
    ctaLabel = "سبّح";
  } else if (mode === "evening") {
    icon = "fa-cloud-moon";
    title = "أذكار المساء";
    sub = "طمأنينة لقلبك · ابدأ الآن";
    action = "showCategoryPage('evening')";
    ctaIcon = "fa-play";
    ctaLabel = "ابدأ";
  } else if (mode === "maghrib") {
    icon = "fa-fingerprint";
    title = "ذكر الله";
    sub = "رطّب لسانك بالتسبيح بعد المغرب";
    action = "openMisbaha()";
    ctaIcon = "fa-circle-notch";
    ctaLabel = "سبّح";
  } else if (mode === "night") {
    icon = "fa-moon";
    title = "أذكار النوم";
    sub = "أذكار تحفظك حتى تصبح بإذن الله";
    action = "showCategoryPage('sleep')";
    ctaIcon = "fa-bed";
    ctaLabel = "ابدأ";
  }

  container.className = "pt-azkar-strip pt-azkar-strip--" + mode;
  container.innerHTML = `
    <div class="pt-azkar-strip__ico"><i class="fas ${icon}"></i></div>
    <div class="pt-azkar-strip__txt">
      <div class="pt-azkar-strip__title">${title}</div>
      <div class="pt-azkar-strip__sub">${sub}</div>
    </div>
    <button class="pt-azkar-strip__play" onclick="${action}" title="${ctaLabel}" aria-label="${ctaLabel}">
      <i class="fas ${ctaIcon}"></i>
    </button>
  `;
}

/**
 * Continue Reading Shortcut Pill
 */
function updateContinueReadingPill() {
  const pill = document.getElementById("continueReadingPill");
  if (!pill) return;

  let lastRead = null;
  try {
    const raw = localStorage.getItem("tazkeer_last_reading");
    if (raw) lastRead = JSON.parse(raw);
  } catch (e) {}

  if (!lastRead) {
    pill.classList.add("hidden");
    return;
  }

  let iconHTML = '<i class="fas fa-book-open"></i>';
  let title = "";
  let sub = "";
  let pct = `${lastRead.percent || 0}%`;

  if (lastRead.type === "prophet") {
    iconHTML = '<i class="fas fa-feather-pointed"></i>';
    title = `متابعة: ${lastRead.title}`;
    sub = lastRead.chapterTitle ? lastRead.chapterTitle : "";
  } else if (lastRead.type === "quran") {
    iconHTML = '<i class="fas fa-book-quran"></i>';
    title = `متابعة: ${lastRead.title}`;
    sub = `صفحة ${toArabicNumerals(lastRead.page)} · جزء ${toArabicNumerals(lastRead.juz || 1)}`;
  }

  pill.innerHTML = `
    <div class="cr-icon-wrap">${iconHTML}</div>
    <div class="cr-info">
      <div class="cr-title">${title}</div>
      <div class="cr-sub">${sub}</div>
    </div>
    <div class="cr-actions">
      <span class="cr-pct-badge">${pct}</span>
      <button class="cr-resume-btn" onclick="resumeLastReading()" title="استئناف القراءة">
        <span>متابعة</span>
        <i class="fas fa-chevron-left"></i>
      </button>
    </div>
  `;
  pill.classList.remove("hidden");
}

function resumeLastReading() {
  let lastRead = null;
  try {
    const raw = localStorage.getItem("tazkeer_last_reading");
    if (raw) lastRead = JSON.parse(raw);
  } catch (e) {}
  if (!lastRead) return;

  if (lastRead.type === "prophet") {
    switchTab("tab-prophets");
    setTimeout(() => {
      if (typeof window._openProphet === "function") {
        window._openProphet(lastRead.slug, lastRead.chapterIdx);
      }
    }, 150);
  } else if (lastRead.type === "quran") {
    switchTab("tab-quran");
    setTimeout(() => {
      if (typeof openFreeReader === "function") {
        openFreeReader(lastRead.page);
      }
    }, 150);
  }
}

window.updateContinueReadingPill = updateContinueReadingPill;
window.resumeLastReading = resumeLastReading;

/**
 * Duaa Management
 */
let currentDailyDuaa = null;

function updateDailyDuaa(date) {
  let allDuaas = [];
  if (
    typeof dailyDuasCollection !== "undefined" &&
    dailyDuasCollection.length > 0
  ) {
    allDuaas = dailyDuasCollection;
  } else if (
    typeof adhkarData !== "undefined" &&
    adhkarData.dua &&
    adhkarData.dua.adhkar
  ) {
    allDuaas = adhkarData.dua.adhkar;
  }

  if (allDuaas.length === 0) return;

  const seedString = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const seed = stringToSeed(seedString);
  const randomIndex = Math.floor(random(seed) * allDuaas.length);
  setDisplayedDuaa(allDuaas[randomIndex]);
}

function setDisplayedDuaa(duaa) {
  currentDailyDuaa = duaa;
  const textEl = document.getElementById("dailyDuaaText");
  const sourceEl = document.getElementById("duaaSourceText");
  if (textEl && duaa) {
    textEl.style.opacity = "0";
    setTimeout(() => {
      textEl.textContent = `«${duaa.text}»`;
      if (sourceEl) {
        sourceEl.textContent = duaa.source || "أدعية مختارة من الكتاب والسنة";
      }
      textEl.style.opacity = "1";
    }, 150);
  }
}

function nextRandomDuaa() {
  let allDuaas = [];
  if (
    typeof dailyDuasCollection !== "undefined" &&
    dailyDuasCollection.length > 0
  ) {
    allDuaas = dailyDuasCollection;
  } else if (
    typeof adhkarData !== "undefined" &&
    adhkarData.dua &&
    adhkarData.dua.adhkar
  ) {
    allDuaas = adhkarData.dua.adhkar;
  }
  if (allDuaas.length === 0) return;

  const nextIndex = Math.floor(Math.random() * allDuaas.length);
  setDisplayedDuaa(allDuaas[nextIndex]);
}

function copyCurrentDuaa() {
  if (!currentDailyDuaa || !currentDailyDuaa.text) return;
  const fullText = `«${currentDailyDuaa.text}»\n${currentDailyDuaa.source ? "[" + currentDailyDuaa.source + "]" : ""}\n— عبر تطبيق ذَكِّرْ`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        onDuaaCopied();
      })
      .catch(() => {
        fallbackCopy(fullText);
      });
  } else {
    fallbackCopy(fullText);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    onDuaaCopied();
  } catch (err) {}
  document.body.removeChild(ta);
}

function onDuaaCopied() {
  const label = document.getElementById("copyDuaaLabel");
  if (label) {
    const orig = label.textContent;
    label.textContent = "تم النسخ ✓";
    setTimeout(() => {
      label.textContent = orig;
    }, 2000);
  }
  const notif = document.getElementById("notification");
  const notifText = document.getElementById("notificationText");
  if (notif && notifText) {
    notifText.textContent = "تم نسخ الدعاء بنجاح!";
    notif.classList.add("show");
    setTimeout(() => notif.classList.remove("show"), 2500);
  }
}

function shareCurrentDuaa() {
  if (!currentDailyDuaa || !currentDailyDuaa.text) return;
  const fullText = `«${currentDailyDuaa.text}»\n${currentDailyDuaa.source ? "[" + currentDailyDuaa.source + "]" : ""}\n— عبر تطبيق ذَكِّرْ`;

  if (navigator.share) {
    navigator
      .share({
        title: "دعاء اليوم - تطبيق ذَكِّرْ",
        text: fullText,
      })
      .catch(() => {});
  } else {
    copyCurrentDuaa();
  }
}

/**
 * Fasting Guide Modal Controller
 */
function _closeFastingGuideModalInternal() {
  const modal = document.getElementById("fastingGuideModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function openFastingGuideModal() {
  const modal = document.getElementById("fastingGuideModal");
  if (modal) {
    modal.style.display = "flex";
    if (window.AppRouter && !window.AppRouter.isModalOpen("fastingGuide")) {
      window.AppRouter.pushModal("fastingGuide", _closeFastingGuideModalInternal);
    }
  }
}

function closeFastingGuideModal() {
  if (window.AppRouter && window.AppRouter.isModalOpen("fastingGuide")) {
    window.AppRouter.closeModal("fastingGuide");
  } else {
    _closeFastingGuideModalInternal();
  }
}

/**
 * Scroll smoothly to Qibla compass
 */
function scrollToQibla() {
  const qibla = document.getElementById("qiblaSection");
  if (qibla) {
    qibla.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Simple pseudo-random number generator seeded with a string
function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function random(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  const fastingModal = document.getElementById("fastingGuideModal");
  if (fastingModal && e.target === fastingModal) {
    closeFastingGuideModal();
  }
});

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  updateDailyInfo();
});

/* ========================================
   GLOBAL NUMBERS TO ARABIC CONVERTER
   ======================================== */
function toArabicNumerals(str) {
  return String(str).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function convertNodeTextToArabic(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (
      node.parentElement &&
      node.parentElement.tagName !== "STYLE" &&
      node.parentElement.tagName !== "SCRIPT" &&
      node.parentElement.tagName !== "LINK" // Just in case
    ) {
      if (/\d/.test(node.nodeValue)) {
        node.nodeValue = toArabicNumerals(node.nodeValue);
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(node.tagName)) return;
    if (
      node.classList &&
      (node.classList.contains("fa") || node.classList.contains("fas"))
    )
      return; // skip font awesome base
    node.childNodes.forEach(convertNodeTextToArabic);
  }
}

// Ensure the conversion runs after everything else initializes
setTimeout(() => {
  convertNodeTextToArabic(document.body);

  // Watch for dynamic changes globally
  const numObserver = new MutationObserver((mutations) => {
    // Collect all unique nodes to change to prevent recursive mutation loops
    const textNodesToUpdate = new Set();

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((added) => {
          convertNodeTextToArabic(added);
        });
      } else if (mutation.type === "characterData") {
        const val = mutation.target.nodeValue;
        if (/\d/.test(val)) {
          const parent = mutation.target.parentElement;
          if (
            parent &&
            parent.tagName !== "STYLE" &&
            parent.tagName !== "SCRIPT"
          ) {
            textNodesToUpdate.add(mutation.target);
          }
        }
      }
    });

    // Apply the updates safely
    textNodesToUpdate.forEach((node) => {
      const newVal = toArabicNumerals(node.nodeValue);
      if (node.nodeValue !== newVal) {
        node.nodeValue = newVal;
      }
    });
  });

  numObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}, 100);

/* ================================================================
   MISBAHA (Digital Prayer Beads) — Extracted to js/modules/misbaha.js
   ================================================================ */
// Managed via js/modules/misbaha.js with Haptics, AppRouter & SafeStorage;

// Carousel scroll listener for Quick Actions indicator dots
document.addEventListener("DOMContentLoaded", function () {
  const quickGrid = document.getElementById("homeQuickGrid");
  if (quickGrid) {
    quickGrid.addEventListener("scroll", function () {
      const dots = document.querySelectorAll("#homeQuickDots .hq-dot");
      if (!dots.length) return;
      const scrollLeft = Math.abs(quickGrid.scrollLeft);
      const maxScroll = quickGrid.scrollWidth - quickGrid.clientWidth;
      if (maxScroll <= 0) return;
      const ratio = scrollLeft / maxScroll;
      const activeIdx = ratio > 0.4 ? 1 : 0;
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === activeIdx);
      });
    });
  }
});
