/* ============================================================
   prophets.js — Prophets e-Reader Engine for ذَكِّرْ
   ============================================================ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────
  var prophetsIndex = null;
  var prophetsCache = new Map(); // slug → full JSON
  var currentProphet = null; // currently open prophet JSON
  var currentChapterIdx = 0;
  var readerFontSize = 18; // px
  var isFullscreen = false;
  var chapterDrawerOpen = false;
  var scrollHandler = null; // stored reference for cleanup

  var LS_FONT = "tazkeer_prophets_fontSize";
  var LS_POS_PFX = "tazkeer_prophet_pos_";
  var LS_READ_PFX = "tazkeer_prophet_read_"; // slug → JSON array of read chapter indices

  // ── Read Tracking Helpers ─────────────────────────────────
  function getReadChapters(slug) {
    try {
      if (window.SafeStorage) {
        var res = window.SafeStorage.getJSON(LS_READ_PFX + slug);
        if (Array.isArray(res)) return res;
      }
      var stored = localStorage.getItem(LS_READ_PFX + slug);
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return [];
  }

  function markChapterRead(slug, chapterIdx) {
    var read = getReadChapters(slug);
    if (read.indexOf(chapterIdx) === -1) {
      read.push(chapterIdx);
      if (window.SafeStorage) {
        window.SafeStorage.setJSON(LS_READ_PFX + slug, read);
      } else {
        try {
          localStorage.setItem(LS_READ_PFX + slug, JSON.stringify(read));
        } catch (e) {}
      }
    }
    return read;
  }

  function isChapterRead(slug, chapterIdx) {
    return getReadChapters(slug).indexOf(chapterIdx) !== -1;
  }

  function isStoryComplete(slug, totalChapters) {
    var read = getReadChapters(slug);
    return read.length >= totalChapters;
  }

  // ── Bootstrap ──────────────────────────────────────────────
  window.initProphetsTab = function () {
    var container = document.getElementById("prophetsPageContent");
    if (!container) return;

    // Load saved font size
    var savedFont = window.SafeStorage ? window.SafeStorage.get(LS_FONT) : localStorage.getItem(LS_FONT);
    if (savedFont) readerFontSize = parseInt(savedFont, 10) || 18;

    if (prophetsIndex) {
      renderGrid(container);
    } else {
      container.innerHTML =
        '<div class="prophets-loader"><div class="prophets-spinner"></div><span>جارٍ تحميل قائمة الأنبياء...</span></div>';
      fetch("data/prophets-index.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          prophetsIndex = data;
          renderGrid(container);
        })
        .catch(function () {
          container.innerHTML =
            '<div class="prophets-error"><i class="fas fa-exclamation-triangle"></i><p>تعذّر تحميل البيانات. تأكّد من الاتصال بالإنترنت.</p><button class="prophets-retry-btn" onclick="initProphetsTab()">إعادة المحاولة</button></div>';
        });
    }
  };

  // ── Grid View ──────────────────────────────────────────────
  var ULU_AZM = ["nuh", "ibrahim", "musa", "isa", "muhammad"];
  var prophetsFilter = "all";

  function arDigit(value) {
    if (typeof window.toArabicDigits === "function") {
      return window.toArabicDigits(value);
    }
    return String(value);
  }

  function shortName(name) {
    return String(name).replace(/\s*عليه\s+السلام\s*$/, "").trim();
  }

  function normalizeText(text) {
    return String(text)
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function readSavedPosition(slug) {
    try {
      if (window.SafeStorage) {
        var safe = window.SafeStorage.getJSON(LS_POS_PFX + slug);
        if (safe && typeof safe === "object") return safe;
      }
      var raw = localStorage.getItem(LS_POS_PFX + slug);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function buildContinueCard() {
    var best = null;
    prophetsIndex.forEach(function (p) {
      if (!(p.chapterCount > 0)) return;
      var read = getReadChapters(p.slug);
      if (read.length >= p.chapterCount) return;
      var pos = readSavedPosition(p.slug);
      if (!pos) return;
      if (!best || (pos.timestamp || 0) > (best.pos.timestamp || 0)) {
        best = { prophet: p, pos: pos, readCount: read.length };
      }
    });
    if (!best) return "";

    var chap = parseInt(best.pos.chapterIdx || 0, 10) + 1;
    var total = best.prophet.chapterCount;
    var continuePct = Math.min(100, Math.round((chap / total) * 100));

    return (
      '<button class="pt-proph-continue" onclick="window._openProphet(\'' +
      best.prophet.slug +
      "', " +
      parseInt(best.pos.chapterIdx || 0, 10) +
      ')">' +
      '<span class="pt-proph-continue__ico"><i class="fas fa-book-open-reader"></i></span>' +
      '<span class="pt-proph-continue__body">' +
      '<span class="pt-proph-continue__label">أكمل القراءة</span>' +
      '<span class="pt-proph-continue__name">' +
      best.prophet.name +
      "</span>" +
      '<span class="pt-proph-continue__meta">الفصل ' +
      arDigit(chap) +
      " من " +
      arDigit(total) +
      "</span>" +
      "</span>" +
      '<span class="pt-proph-continue__chev"><i class="fas fa-chevron-left"></i></span>' +
      '<span class="pt-proph-continue__bar"><span style="width:' +
      continuePct +
      '%"></span></span>' +
      "</button>"
    );
  }

  function renderGrid(container) {
    var html = '<div class="pt-page pt-prophets">';

    // ── Top bar ──
    html +=
      '<div class="pt-topbar">' +
      '<div class="pt-topbar__titles">' +
      '<h1 class="pt-title">قصص الأنبياء</h1>' +
      '<span class="pt-sub">' +
      arDigit(prophetsIndex.length) +
      " نبيًا · موثقة من القرآن والسنة</span>" +
      "</div>" +
      '<div class="pt-topbar__actions">' +
      '<button class="pt-iconbtn" onclick="window.focusProphetSearch()" title="بحث" aria-label="بحث">' +
      '<i class="fas fa-magnifying-glass"></i></button>' +
      "</div>" +
      "</div>";

    // ── Continue reading ──
    html += buildContinueCard();

    // ── Search ──
    html +=
      '<div class="pt-proph-search">' +
      '<i class="fas fa-magnifying-glass"></i>' +
      '<input type="search" id="prophetSearchInput" placeholder="ابحث عن نبيّ أو قصة..." ' +
      'autocomplete="off" oninput="window.filterProphets(this.value)" />' +
      "</div>";

    // ── Filters ──
    var filters = [
      { key: "all", label: "الكل" },
      { key: "ulul", label: "أولو العزم" },
      { key: "done", label: "مكتملة" },
      { key: "unread", label: "لم تُقرأ" },
    ];
    html += '<div class="pt-proph-filters" id="prophetsFilters">';
    filters.forEach(function (f) {
      html +=
        '<button class="pt-chip' +
        (prophetsFilter === f.key ? " active" : "") +
        '" data-filter="' +
        f.key +
        '" onclick="window.setProphetsFilter(\'' +
        f.key +
        "')\">" +
        f.label +
        "</button>";
    });
    html += "</div>";

    // ── Cards ──
    html += '<div class="pt-proph-grid" id="prophetsGrid">';

    prophetsIndex.forEach(function (p, index) {
      var available = p.chapterCount > 0;
      var isUlul = ULU_AZM.indexOf(p.slug) !== -1;
      var storyComplete = available && isStoryComplete(p.slug, p.chapterCount);
      var readChapters = getReadChapters(p.slug);

      // Progress: chapter read tracking, with scroll fallback
      var pct = 0;
      if (readChapters.length > 0 && available) {
        pct = Math.round((readChapters.length / p.chapterCount) * 100);
      } else if (available) {
        var pos = readSavedPosition(p.slug);
        if (pos) {
          pct = Math.round(((pos.chapterIdx || 0) / p.chapterCount) * 100);
        }
      }
      pct = Math.max(0, Math.min(pct, 100));

      var iconHTML = '<i class="fas fa-book-open"></i>';
      if (p.icon) {
        if (p.icon.indexOf("<") === 0) {
          iconHTML = p.icon;
        } else if (p.icon.indexOf("fa-") !== -1) {
          iconHTML = '<i class="' + p.icon + '"></i>';
        } else {
          iconHTML = p.icon;
        }
      }

      var orderNo = arDigit(p.order || index + 1);

      html +=
        '<button class="pt-proph-row' +
        (available ? "" : " pt-proph-row--soon") +
        '"' +
        ' data-slug="' +
        p.slug +
        '"' +
        ' data-ulul="' +
        (isUlul ? "1" : "0") +
        '"' +
        ' data-done="' +
        (storyComplete ? "1" : "0") +
        '"' +
        ' data-read="' +
        (pct > 0 ? "1" : "0") +
        '"' +
        ' data-search="' +
        normalizeText(p.name + " " + p.title + " " + (p.brief || "")) +
        '"' +
        (available
          ? ' onclick="window._openProphet(\'' + p.slug + "')\""
          : " disabled") +
        ">";

      // Start-side icon tile
      html += '<span class="pt-proph-row__ico">' + iconHTML + "</span>";

      // Body: name + subtitle + meta pills
      html += '<span class="pt-proph-row__body">';
      html +=
        '<span class="pt-proph-row__head">' +
        '<span class="pt-proph-row__num">' +
        orderNo +
        "</span>" +
        '<span class="pt-proph-row__name">' +
        shortName(p.name) +
        ' <em>عليه السلام</em>' +
        "</span>";

      // End side of the head line: completion check or «أولو العزم» badge
      if (storyComplete) {
        html +=
          '<span class="pt-proph-row__done" title="مكتملة"><i class="fas fa-check"></i></span>';
      } else if (isUlul) {
        html += '<span class="pt-proph-row__ulul">أولو العزم</span>';
      }
      html += "</span>";

      if (p.title) {
        html +=
          '<span class="pt-proph-row__title">' + p.title + "</span>";
      }
      html += '<span class="pt-proph-row__meta">';
      if (available) {
        if (p.chapterCount > 0) {
          html +=
            '<span class="pt-proph-row__pill">' +
            arDigit(p.chapterCount) +
            " فصول</span>";
        }
        if (p.readingTimeMinutes) {
          html +=
            '<span class="pt-proph-row__pill"><i class="fas fa-clock"></i> ' +
            arDigit(p.readingTimeMinutes) +
            " د</span>";
        }
        if (p.quranMentions) {
          html +=
            '<span class="pt-proph-row__pill"><i class="fas fa-book-open"></i> ' +
            arDigit(p.quranMentions) +
            " ذكرًا</span>";
        }
      } else {
        html += '<span class="pt-proph-row__pill">قريبًا</span>';
      }
      html += "</span>";
      html += "</span>";

      if (pct > 0) {
        html +=
          '<span class="pt-proph-row__progress"><span style="width:' +
          pct +
          '%"></span></span>';
      }

      html += "</button>";
    });

    html += "</div>";

    html +=
      '<div class="pt-proph-empty hidden" id="prophetsEmpty">' +
      '<span class="pt-proph-empty__ico"><i class="fas fa-magnifying-glass-minus"></i></span>' +
      '<p class="pt-proph-empty__title">لا توجد نتائج مطابقة</p>' +
      '<p class="pt-proph-empty__sub">جرّب كلمة أخرى أو غيّر الفلتر</p>' +
      '<button class="pt-proph-empty__btn" onclick="window.resetProphetsSearch()">عرض الكل</button>' +
      "</div>";

    html += "</div>";

    container.innerHTML = html;
    applyProphetsFilter();
  }

  /**
   * Apply the active filter chip + search query to the rendered cards.
   */
  function applyProphetsFilter() {
    var grid = document.getElementById("prophetsGrid");
    if (!grid) return;
    var input = document.getElementById("prophetSearchInput");
    var query = normalizeText(input ? input.value : "");
    var visible = 0;

    Array.prototype.forEach.call(grid.children, function (card) {
      var okFilter = true;
      if (prophetsFilter === "ulul") {
        okFilter = card.getAttribute("data-ulul") === "1";
      } else if (prophetsFilter === "done") {
        okFilter = card.getAttribute("data-done") === "1";
      } else if (prophetsFilter === "unread") {
        okFilter = card.getAttribute("data-read") !== "1";
      }
      var okQuery =
        !query || (card.getAttribute("data-search") || "").indexOf(query) !== -1;
      var show = okFilter && okQuery;
      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });

    var empty = document.getElementById("prophetsEmpty");
    if (empty) empty.classList.toggle("hidden", visible !== 0);
  }

  window.filterProphets = function (value) {
    applyProphetsFilter();
  };

  window.focusProphetSearch = function () {
    var input = document.getElementById("prophetSearchInput");
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();
  };

  window.resetProphetsSearch = function () {
    var input = document.getElementById("prophetSearchInput");
    if (input) input.value = "";
    prophetsFilter = "all";
    var wrap = document.getElementById("prophetsFilters");
    if (wrap) {
      Array.prototype.forEach.call(wrap.children, function (chip) {
        chip.classList.toggle("active", chip.getAttribute("data-filter") === "all");
      });
    }
    applyProphetsFilter();
    if (input) input.focus();
  };

  window.setProphetsFilter = function (key) {
    prophetsFilter = key || "all";
    var wrap = document.getElementById("prophetsFilters");
    if (wrap) {
      Array.prototype.forEach.call(wrap.children, function (chip) {
        chip.classList.toggle(
          "active",
          chip.getAttribute("data-filter") === prophetsFilter,
        );
      });
    }
    applyProphetsFilter();
  };

  // ── Open Prophet (lazy-load) ───────────────────────────────
  window._openProphet = function (slug, targetChapterIdx) {
    var container = document.getElementById("prophetsPageContent");
    if (!container) return;

    if (prophetsCache.has(slug)) {
      currentProphet = prophetsCache.get(slug);
      enterReader(container, targetChapterIdx);
      return;
    }

    container.innerHTML =
      '<div class="prophets-loader"><div class="prophets-spinner"></div><span>جارٍ تحميل القصة...</span></div>';

    fetch("data/prophets/" + slug + ".json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        prophetsCache.set(slug, data);
        currentProphet = data;
        enterReader(container, targetChapterIdx);
      })
      .catch(function () {
        container.innerHTML =
          '<div class="prophets-error"><i class="fas fa-exclamation-triangle"></i><p>تعذّر تحميل القصة.</p><button class="prophets-retry-btn" onclick="window._openProphet(\'' +
          slug +
          '\')">إعادة المحاولة</button><button class="prophets-retry-btn prophets-retry-secondary" onclick="initProphetsTab()">العودة</button></div>';
      });
  };

  // ── Auto-Hiding Chrome State ───────────────────────────────
  var lastScrollY = 0;
  var isChromeHidden = false;

  function setChromeVisibility(visible) {
    isChromeHidden = !visible;
    var topbar = document.getElementById("prTopbar");
    var pillBar = document.getElementById("prChapterPillBar");
    if (topbar) {
      topbar.classList.toggle("pr-topbar--hidden", !visible);
    }
    if (pillBar) {
      pillBar.classList.toggle("pr-pill-bar--hidden", !visible);
    }
  }

  function toggleChrome() {
    setChromeVisibility(isChromeHidden);
  }

  function handleAutoHidingScroll() {
    var currentY = window.scrollY;
    var delta = currentY - lastScrollY;

    if (Math.abs(delta) > 10) {
      if (delta > 0 && currentY > 60 && !isChromeHidden) {
        // Scrolling down -> hide chrome
        setChromeVisibility(false);
      } else if (delta < 0 && isChromeHidden) {
        // Scrolling up -> show chrome
        setChromeVisibility(true);
      }
      lastScrollY = currentY;
    }
  }

  // ── Reader View ────────────────────────────────────────────
  function enterReader(container, targetChapterIdx) {
    var p = currentProphet;
    if (!p || !p.chapters || p.chapters.length === 0) return;

    var resumeChapter = 0;
    if (typeof targetChapterIdx === "number" && targetChapterIdx >= 0 && targetChapterIdx < p.chapters.length) {
      resumeChapter = targetChapterIdx;
    } else {
      var savedPos = localStorage.getItem(LS_POS_PFX + p.slug);
      if (savedPos) {
        try {
          var pos = JSON.parse(savedPos);
          resumeChapter = pos.chapterIdx || 0;
        } catch (e) {
          /* ignore */
        }
      }
    }
    currentChapterIdx = resumeChapter;

    // Register with AppRouter for Hardware Back Button handling
    if (window.AppRouter && !window.AppRouter.isModalOpen("prophetReader")) {
      window.AppRouter.pushModal("prophetReader", function () {
        window._exitReader(false);
      });
    }

    renderReaderShell(container);
    renderChapter();

    // Show resume toast if not at beginning
    if (resumeChapter > 0) {
      showResumeToast(p.chapters[resumeChapter].title);
    }

    // Hide bottom nav for immersive reading
    var bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.style.display = "none";
  }

  function renderReaderShell(container) {
    var p = currentProphet;
    var html = "";

    // Top bar (auto-hiding)
    html += '<div class="pr-topbar" id="prTopbar">';
    html +=
      '<button class="pr-back-btn" onclick="window._exitReader()" title="العودة"><i class="fas fa-arrow-right"></i></button>';
    html += '<div class="pr-topbar-info">';
    html += '<span class="pr-topbar-name">' + p.name + "</span>";
    html += '<span class="pr-topbar-chapter" id="prTopbarChapter"></span>';
    html += "</div>";
    html +=
      '<button class="pr-toc-btn" id="prTocBtn" onclick="window._toggleDrawer()" title="فهرس الفصول"><i class="fas fa-list-ol"></i></button>';
    html += "</div>";

    // Reading progress bar
    html +=
      '<div class="pr-progress-bar" id="prProgressBar"><div class="pr-progress-fill" id="prProgressFill"></div></div>';

    // Reader controls
    html += '<div class="pr-controls" id="prControls">';
    html +=
      '<button class="pr-ctrl-btn" onclick="window._adjustFont(-2)" title="تصغير الخط"><span class="pr-font-label">أ-</span></button>';
    html +=
      '<button class="pr-ctrl-btn" onclick="window._adjustFont(2)" title="تكبير الخط"><span class="pr-font-label pr-font-label--lg">أ+</span></button>';
    html +=
      '<button class="pr-ctrl-btn" onclick="window._toggleFullscreen()" title="شاشة كاملة" id="prFullscreenBtn"><i class="fas fa-expand"></i></button>';
    html += '<span class="pr-reading-time" id="prReadingTime"></span>';
    html += "</div>";

    // Chapter content area
    html += '<div class="pr-chapter-content" id="prChapterContent"></div>';

    // Fast Chapter Navigation Pill Bar (fixed at bottom, auto-hiding with scroll)
    html += '<div class="pr-chapter-pill-bar" id="prChapterPillBar">';
    html += '  <div class="pr-pill-inner">';
    html += '    <button class="pr-pill-btn pr-pill-btn--prev" id="prPrevBtn" onclick="window._prevChapter()" title="الفصل السابق"><i class="fas fa-chevron-right"></i> <span>السابق</span></button>';
    html += '    <button class="pr-pill-btn pr-pill-btn--complete" id="prCompleteBtn" onclick="window._completeChapter()"><i class="fas fa-check-circle"></i> <span id="prCompleteBtnText">✓ أتممت الفصل</span></button>';
    html += '    <button class="pr-pill-btn pr-pill-btn--next" id="prNextBtn" onclick="window._nextChapter()" title="الفصل التالي"><span>الفصل التالي</span> <i class="fas fa-chevron-left"></i></button>';
    html += '  </div>';
    html += '  <span class="pr-pill-indicator" id="prNavIndicator"></span>';
    html += '</div>';

    // Chapter drawer / bottom sheet for mobile
    html +=
      '<div class="pr-drawer-overlay" id="prDrawerOverlay" onclick="window._toggleDrawer()"></div>';
    html += '<div class="pr-drawer" id="prDrawer">';
    html += '  <div class="pr-sheet-handle"></div>';
    html += '  <div class="pr-drawer-header">';
    html += '    <h3><i class="fas fa-list-ol"></i> فهرس فصول القصة</h3>';
    html +=
      '    <button class="pr-drawer-close" onclick="window._toggleDrawer()" title="إغلاق"><i class="fas fa-times"></i></button>';
    html += '  </div>';
    // Drawer progress
    html += '  <div class="pr-drawer-progress" id="prDrawerProgress"></div>';
    html += '  <div class="pr-drawer-list" id="prDrawerList"></div>';
    html += '</div>';

    // Scroll progress circle
    html += '<div class="pr-scroll-progress" id="prScrollProgress">';
    html += '<svg viewBox="0 0 36 36">';
    html += '<circle class="pr-scroll-progress-track" cx="18" cy="18" r="15.5"></circle>';
    html += '<circle class="pr-scroll-progress-fill" id="prScrollCircle" cx="18" cy="18" r="15.5" stroke-dasharray="97.39" stroke-dashoffset="97.39"></circle>';
    html += '</svg>';
    html += '<span class="pr-scroll-pct" id="prScrollPct">٠٪</span>';
    html += '</div>';

    // Resume toast
    html += '<div class="pr-resume-toast hidden" id="prResumeToast"></div>';

    container.innerHTML = html;

    // Tap in middle of screen to toggle chrome
    var contentEl = document.getElementById("prChapterContent");
    if (contentEl) {
      contentEl.addEventListener("click", function (e) {
        if (e.target.closest("button, a, .pr-quran-verse, .pr-hadith-box")) return;
        toggleChrome();
      });
    }

    // Populate drawer
    renderDrawer();

    // Setup scroll listener for real-time progress & auto-hiding chrome
    lastScrollY = window.scrollY;
    isChromeHidden = false;
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
    }
    scrollHandler = function () {
      updateScrollProgress();
      handleAutoHidingScroll();
      debouncedSavePosition();
    };
    window.addEventListener("scroll", scrollHandler);
  }

  var saveTimer = null;
  function debouncedSavePosition() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 1000);
  }

  function renderChapter() {
    var p = currentProphet;
    var ch = p.chapters[currentChapterIdx];
    if (!ch) return;

    var contentEl = document.getElementById("prChapterContent");
    if (!contentEl) return;

    var html =
      '<article class="pr-article" style="font-size:' + readerFontSize + 'px">';
    html += '<h2 class="pr-chapter-title">' + ch.title + "</h2>";
    html += '<div class="pr-basmala">بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ</div>';

    // Ornamental divider below title
    html += '<div class="pr-chapter-ornament"><span>❖</span></div>';

    html +=
      '<div class="pr-chapter-meta"><span>الفصل ' +
      convertToArabicNum(ch.chapterId) +
      " من " +
      convertToArabicNum(p.chapters.length) +
      "</span>";
    if (ch.readingTimeMinutes)
      html +=
        '<span><i class="fas fa-clock"></i> ' +
        ch.readingTimeMinutes +
        " دقيقة قراءة</span>";
    html += "</div>";

    // Paragraphs with drop cap on first
    ch.paragraphs.forEach(function (para, idx) {
      var cls = idx === 0 ? "pr-paragraph pr-paragraph--first" : "pr-paragraph";
      html += '<p class="' + cls + '">' + para + "</p>";
    });

    // Quranic verses
    if (ch.quranicVerses && ch.quranicVerses.length > 0) {
      // Ornamental divider before Quran section
      html += '<div class="pr-ornament-divider"><span>✦</span></div>';
      html += '<div class="pr-quran-section">';
      html +=
        '<h3 class="pr-section-label"><i class="fas fa-quran"></i> الآيات القرآنية</h3>';
      ch.quranicVerses.forEach(function (v) {
        html += '<blockquote class="pr-quran-verse">';
        html += '<p class="pr-quran-text">﴿ ' + v.text + " ﴾</p>";
        html += '<cite class="pr-quran-cite">' + v.surah + "</cite>";
        html += "</blockquote>";
      });
      html += "</div>";
    }

    // Hadiths
    if (ch.hadiths && ch.hadiths.length > 0) {
      html += '<div class="pr-ornament-divider"><span>✦</span></div>';
      html += '<div class="pr-hadith-section">';
      html +=
        '<h3 class="pr-section-label"><i class="fas fa-book"></i> الأحاديث النبوية</h3>';
      ch.hadiths.forEach(function (h) {
        html += '<blockquote class="pr-hadith-box">';
        html += '<p class="pr-hadith-text">« ' + h.text + " »</p>";
        html += '<cite class="pr-hadith-source">' + h.source + "</cite>";
        html += "</blockquote>";
      });
      html += "</div>";
    }

    // Sources section (show on last chapter or every chapter)
    if (p.sources && p.sources.length > 0) {
      html += '<div class="pr-sources-section">';
      html += '<div class="pr-sources-title"><i class="fas fa-bookmark"></i> المراجع والمصادر</div>';
      html += '<ul class="pr-sources-list">';
      p.sources.forEach(function (src) {
        html += '<li>' + src + '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }

    html += "</article>";
    contentEl.innerHTML = html;

    // Render complete button
    renderCompleteButton();

    // Update topbar chapter
    var topbarCh = document.getElementById("prTopbarChapter");
    if (topbarCh) topbarCh.textContent = ch.title;

    // Update reading time
    var readingTime = document.getElementById("prReadingTime");
    if (readingTime && ch.readingTimeMinutes) {
      readingTime.innerHTML =
        '<i class="fas fa-clock"></i> ' + ch.readingTimeMinutes + " دقيقة";
    }

    // Update nav indicator
    var navInd = document.getElementById("prNavIndicator");
    if (navInd)
      navInd.textContent =
        convertToArabicNum(currentChapterIdx + 1) +
        " / " +
        convertToArabicNum(p.chapters.length);

    // Update nav buttons
    var prevBtn = document.getElementById("prPrevBtn");
    var nextBtn = document.getElementById("prNextBtn");
    if (prevBtn)
      prevBtn.style.visibility = currentChapterIdx === 0 ? "hidden" : "visible";
    if (nextBtn)
      nextBtn.style.visibility =
        currentChapterIdx >= p.chapters.length - 1 ? "hidden" : "visible";

    // Update progress bar
    updateProgressBar();

    // Update drawer active state
    updateDrawerActive();

    // Update drawer progress
    updateDrawerProgress();

    // Save position
    savePosition();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Reset scroll progress
    setTimeout(updateScrollProgress, 100);
  }

  // ── Complete Reading Button ────────────────────────────────
  function renderCompleteButton() {
    if (!currentProphet) return;

    var slug = currentProphet.slug;
    var alreadyRead = isChapterRead(slug, currentChapterIdx);

    var btn = document.getElementById("prCompleteBtn");
    var btnText = document.getElementById("prCompleteBtnText");
    if (btn) {
      if (alreadyRead) {
        btn.classList.add("pr-pill-btn--done");
        if (btnText) btnText.textContent = "تمّ الفصل ✓";
        btn.disabled = true;
      } else {
        btn.classList.remove("pr-pill-btn--done");
        if (btnText) btnText.textContent = "✓ أتممت الفصل";
        btn.disabled = false;
      }
    }
  }

  // ── Complete Chapter Action ────────────────────────────────
  window._completeChapter = function () {
    if (!currentProphet) return;

    var slug = currentProphet.slug;
    var totalChapters = currentProphet.chapters.length;

    // Mark as read
    markChapterRead(slug, currentChapterIdx);

    // Show check animation + confetti
    showCompleteAnimation();

    // Update button to "done" state
    renderCompleteButton();

    // Update drawer
    updateDrawerActive();
    updateDrawerProgress();

    // Update progress bar
    updateProgressBar();

    // Check if all chapters are read → show completion screen
    if (isStoryComplete(slug, totalChapters)) {
      setTimeout(function () {
        showCompletionScreen();
      }, 1800);
    } else if (currentChapterIdx < totalChapters - 1) {
      // Auto-advance to next chapter after a short delay
      setTimeout(function () {
        currentChapterIdx++;
        renderChapter();
      }, 1800);
    }
  };

  // ── Complete Animation (Check + Confetti) ──────────────────
  function showCompleteAnimation() {
    // Check circle
    var animEl = document.createElement("div");
    animEl.className = "pr-complete-anim";
    animEl.innerHTML = '<div class="pr-check-circle"><i class="fas fa-check"></i></div>';
    document.body.appendChild(animEl);

    // Confetti
    var confettiEl = document.createElement("div");
    confettiEl.className = "pr-confetti";
    var colors = ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];
    for (var i = 0; i < 30; i++) {
      var piece = document.createElement("div");
      piece.className = "pr-confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.top = (Math.random() * 40 + 20) + "%";
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.5) + "s";
      piece.style.animationDuration = (1 + Math.random() * 1) + "s";
      piece.style.width = (6 + Math.random() * 8) + "px";
      piece.style.height = (6 + Math.random() * 8) + "px";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      confettiEl.appendChild(piece);
    }
    document.body.appendChild(confettiEl);

    // Cleanup
    setTimeout(function () {
      if (animEl.parentNode) animEl.parentNode.removeChild(animEl);
      if (confettiEl.parentNode) confettiEl.parentNode.removeChild(confettiEl);
    }, 2000);
  }

  // ── Story Completion Screen ────────────────────────────────
  function showCompletionScreen() {
    var container = document.getElementById("prophetsPageContent");
    if (!container || !currentProphet) return;

    var p = currentProphet;
    var readCount = getReadChapters(p.slug).length;
    var totalTime = 0;
    p.chapters.forEach(function (ch) {
      totalTime += ch.readingTimeMinutes || 0;
    });

    // Find next prophet
    var nextProphet = null;
    if (prophetsIndex) {
      for (var i = 0; i < prophetsIndex.length; i++) {
        if (prophetsIndex[i].slug === p.slug && i < prophetsIndex.length - 1) {
          nextProphet = prophetsIndex[i + 1];
          break;
        }
      }
    }

    var html = '<div class="pr-completion-screen">';

    // Icon
    html += '<div class="pr-completion-icon"><i class="fas fa-trophy"></i></div>';

    // Title
    html += '<h2 class="pr-completion-title">ما شاء الله! أتممت القصة</h2>';
    html += '<p class="pr-completion-subtitle">أتممت قراءة قصة ' + p.name + ' بنجاح. بارك الله فيك وزادك علمًا ونورًا.</p>';

    // Stats
    html += '<div class="pr-completion-stats">';
    html += '<div class="pr-completion-stat"><span class="pr-completion-stat-num">' + convertToArabicNum(readCount) + '</span><span class="pr-completion-stat-label">فصل مقروء</span></div>';
    html += '<div class="pr-completion-stat"><span class="pr-completion-stat-num">' + convertToArabicNum(totalTime) + '</span><span class="pr-completion-stat-label">دقيقة قراءة</span></div>';
    html += '<div class="pr-completion-stat"><span class="pr-completion-stat-num">' + convertToArabicNum(p.quranMentions) + '</span><span class="pr-completion-stat-label">ذكر في القرآن</span></div>';
    html += '</div>';

    // Dua
    html += '<div class="pr-completion-dua">اللّهم اجعلنا ممّن يتّبعون هدي أنبيائك ورسلك، وارزقنا شفاعة نبيّك محمد ﷺ يوم القيامة</div>';

    // Actions
    html += '<div class="pr-completion-actions">';
    if (nextProphet && nextProphet.chapterCount > 0) {
      html += '<button class="pr-completion-btn pr-completion-btn--primary" onclick="window._exitReader(); setTimeout(function(){ window._openProphet(\'' + nextProphet.slug + '\'); }, 300);">';
      html += '<i class="fas fa-arrow-left"></i>';
      html += '<span>القصة التالية: ' + nextProphet.name + '</span>';
      html += '</button>';
    }
    html += '<button class="pr-completion-btn pr-completion-btn--secondary" onclick="window._exitReader()">';
    html += '<i class="fas fa-th-large"></i>';
    html += '<span>العودة لقائمة الأنبياء</span>';
    html += '</button>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;

    // Show confetti for the completion too
    showCompleteAnimation();
  }

  // ── Scroll Progress (Real-time) ────────────────────────────
  function updateScrollProgress() {
    var scrollProg = document.getElementById("prScrollProgress");
    var circle = document.getElementById("prScrollCircle");
    var pctEl = document.getElementById("prScrollPct");
    var progressFill = document.getElementById("prProgressFill");

    if (!scrollProg || !circle) return;

    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      scrollProg.classList.remove("pr-scroll-progress--visible");
      return;
    }

    var pct = Math.min(Math.round((scrollTop / docHeight) * 100), 100);
    var circumference = 97.39; // 2 * PI * 15.5
    var offset = circumference - (pct / 100) * circumference;

    circle.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = convertToArabicNum(pct) + "٪";

    // Show/hide based on scroll
    if (scrollTop > 100) {
      scrollProg.classList.add("pr-scroll-progress--visible");
    } else {
      scrollProg.classList.remove("pr-scroll-progress--visible");
    }

    // Also update the top progress bar based on scroll
    if (progressFill) {
      progressFill.style.width = pct + "%";
    }
  }

  function renderDrawer() {
    var p = currentProphet;
    var listEl = document.getElementById("prDrawerList");
    if (!listEl || !p) return;

    var readChapters = getReadChapters(p.slug);

    var html = "";
    p.chapters.forEach(function (ch, idx) {
      var active = idx === currentChapterIdx ? " pr-drawer-item--active" : "";
      var isRead = readChapters.indexOf(idx) !== -1;
      var readCls = isRead ? " pr-drawer-item--read" : "";

      html +=
        '<button class="pr-drawer-item' +
        active +
        readCls +
        '" data-idx="' +
        idx +
        '" onclick="window._jumpToChapter(' +
        idx +
        ')">';

      if (isRead && !active) {
        html += '<span class="pr-drawer-num"><i class="fas fa-check" style="font-size:0.65rem"></i></span>';
      } else {
        html +=
          '<span class="pr-drawer-num">' +
          convertToArabicNum(ch.chapterId) +
          "</span>";
      }

      html += '<span class="pr-drawer-title">' + ch.title + "</span>";

      if (isRead) {
        html += '<span class="pr-drawer-check"><i class="fas fa-check-circle"></i></span>';
      }

      if (ch.readingTimeMinutes && !isRead)
        html +=
          '<span class="pr-drawer-time">' + ch.readingTimeMinutes + " د</span>";
      html += "</button>";
    });
    listEl.innerHTML = html;

    // Update drawer progress
    updateDrawerProgress();
  }

  function updateDrawerProgress() {
    var progressEl = document.getElementById("prDrawerProgress");
    if (!progressEl || !currentProphet) return;

    var readChapters = getReadChapters(currentProphet.slug);
    var total = currentProphet.chapters.length;
    var pct = Math.round((readChapters.length / total) * 100);

    var html = '';
    html += '<div class="pr-drawer-progress-bar"><div class="pr-drawer-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="pr-drawer-progress-text">' + convertToArabicNum(readChapters.length) + ' من ' + convertToArabicNum(total) + ' فصول مقروءة (' + convertToArabicNum(pct) + '٪)</div>';
    progressEl.innerHTML = html;
  }

  function updateDrawerActive() {
    var items = document.querySelectorAll(".pr-drawer-item");
    var readChapters = currentProphet ? getReadChapters(currentProphet.slug) : [];

    items.forEach(function (item, idx) {
      item.classList.toggle("pr-drawer-item--active", idx === currentChapterIdx);
      item.classList.toggle("pr-drawer-item--read", readChapters.indexOf(idx) !== -1);
    });
  }

  function updateProgressBar() {
    var fill = document.getElementById("prProgressFill");
    if (!fill || !currentProphet) return;
    // Progress bar is now scroll-based, but we set a baseline based on chapter position
    var pct = ((currentChapterIdx + 1) / currentProphet.chapters.length) * 100;
    // Don't override scroll-based progress if we're scrolled
    if (window.scrollY < 100) {
      fill.style.width = pct + "%";
    }
  }

  // ── Navigation ─────────────────────────────────────────────
  window._nextChapter = function () {
    if (
      !currentProphet ||
      currentChapterIdx >= currentProphet.chapters.length - 1
    )
      return;
    currentChapterIdx++;
    renderChapter();
  };

  window._prevChapter = function () {
    if (!currentProphet || currentChapterIdx <= 0) return;
    currentChapterIdx--;
    renderChapter();
  };

  window._jumpToChapter = function (idx) {
    if (!currentProphet || idx < 0 || idx >= currentProphet.chapters.length)
      return;
    currentChapterIdx = idx;
    renderChapter();
    window._toggleDrawer(); // close drawer
  };

  // ── Drawer ─────────────────────────────────────────────────
  window._toggleDrawer = function () {
    chapterDrawerOpen = !chapterDrawerOpen;
    var drawer = document.getElementById("prDrawer");
    var overlay = document.getElementById("prDrawerOverlay");
    if (drawer) drawer.classList.toggle("pr-drawer--open", chapterDrawerOpen);
    if (overlay)
      overlay.classList.toggle("pr-drawer-overlay--visible", chapterDrawerOpen);

    // Re-render drawer to update read states
    if (chapterDrawerOpen) {
      renderDrawer();
    }
  };

  // ── Reader Controls ────────────────────────────────────────
  window._adjustFont = function (delta) {
    readerFontSize = Math.max(14, Math.min(32, readerFontSize + delta));
    localStorage.setItem(LS_FONT, readerFontSize);
    var article = document.querySelector(".pr-article");
    if (article) article.style.fontSize = readerFontSize + "px";
  };

  window._toggleFullscreen = function () {
    var btn = document.getElementById("prFullscreenBtn");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
      isFullscreen = true;
      if (btn) btn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      document.exitFullscreen().catch(function () {});
      isFullscreen = false;
      if (btn) btn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  };

  // ── Exit Reader ────────────────────────────────────────────
  window._exitReader = function (syncRouter) {
    if (syncRouter !== false && window.AppRouter && window.AppRouter.isModalOpen("prophetReader")) {
      window.AppRouter.closeModal("prophetReader");
      return;
    }

    currentProphet = null;
    currentChapterIdx = 0;
    chapterDrawerOpen = false;

    // Reset chrome classes
    var topbar = document.getElementById("prTopbar");
    var pillBar = document.getElementById("prChapterPillBar");
    if (topbar) topbar.classList.remove("pr-topbar--hidden");
    if (pillBar) pillBar.classList.remove("pr-pill-bar--hidden");

    // Restore bottom nav
    var bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.style.display = "";

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }

    // Remove scroll listener
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }

    initProphetsTab();

    if (typeof window.updateContinueReadingPill === "function") {
      window.updateContinueReadingPill();
    }
  };

  // ── Persistence ────────────────────────────────────────────
  function savePosition() {
    if (!currentProphet) return;
    var data = {
      chapterIdx: currentChapterIdx,
      scrollY: window.scrollY,
      timestamp: Date.now(),
    };
    if (window.SafeStorage) {
      window.SafeStorage.setJSON(LS_POS_PFX + currentProphet.slug, data);
    } else {
      try {
        localStorage.setItem(LS_POS_PFX + currentProphet.slug, JSON.stringify(data));
      } catch (e) {}
    }

    // Save to global last reading for Home shortcut
    try {
      var ch = currentProphet.chapters[currentChapterIdx];
      var totalChapters = currentProphet.chapters.length;
      var pct = Math.round(((currentChapterIdx + 1) / totalChapters) * 100);
      var lastReadData = {
        type: "prophet",
        slug: currentProphet.slug,
        name: currentProphet.name,
        title: "قصة " + currentProphet.name,
        chapterIdx: currentChapterIdx,
        chapterTitle: ch ? ch.title : ("الفصل " + (currentChapterIdx + 1)),
        totalChapters: totalChapters,
        percent: pct,
        timestamp: Date.now()
      };
      if (window.SafeStorage) {
        window.SafeStorage.setJSON("tazkeer_last_reading", lastReadData);
      } else {
        localStorage.setItem("tazkeer_last_reading", JSON.stringify(lastReadData));
      }
      if (typeof window.updateContinueReadingPill === "function") {
        window.updateContinueReadingPill();
      }
    } catch (e) {}
  }

  function showResumeToast(chapterTitle) {
    var toast = document.getElementById("prResumeToast");
    if (!toast) return;
    toast.innerHTML =
      '<i class="fas fa-bookmark"></i> متابعة القراءة: ' + chapterTitle;
    toast.classList.remove("hidden");
    setTimeout(function () {
      toast.classList.add("hidden");
    }, 4000);
  }

  // ── Utilities ──────────────────────────────────────────────
  function convertToArabicNum(num) {
    var arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(num).replace(/[0-9]/g, function (d) {
      return arabicDigits[parseInt(d)];
    });
  }
})();
