/* ============================================================
   prophets.js — Prophets e-Reader Engine for ذَكِّرْ
   ============================================================ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────
  let prophetsIndex = null;
  let prophetsCache = new Map(); // slug → full JSON
  let currentProphet = null; // currently open prophet JSON
  let currentChapterIdx = 0;
  let readerFontSize = 18; // px
  let isFullscreen = false;
  let chapterDrawerOpen = false;

  const LS_FONT = "tazkeer_prophets_fontSize";
  const LS_POS_PFX = "tazkeer_prophet_pos_";

  // ── Bootstrap ──────────────────────────────────────────────
  window.initProphetsTab = function () {
    const container = document.getElementById("prophetsPageContent");
    if (!container) return;

    // Load saved font size
    const savedFont = localStorage.getItem(LS_FONT);
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
  function renderGrid(container) {
    var html = '<div class="prophets-grid-view">';
    html +=
      '<div class="prophets-header-section"><h2 class="prophets-main-title"><i class="fas fa-book-open"></i> قصص الأنبياء</h2><p class="prophets-subtitle">اقرأ ملخص سيرة الأنبياء  </p></div>';
    html += '<div class="prophets-cards-grid">';

    prophetsIndex.forEach(function (p) {
      var available = p.chapterCount > 0;
      var cls = available
        ? "prophets-card"
        : "prophets-card prophets-card--locked";
      var badge = available
        ? '<span class="prophets-card-badge">' + p.chapterCount + " فصول</span>"
        : '<span class="prophets-card-badge prophets-card-badge--soon">قريبًا</span>';

      // Check reading progress
      var savedPos = localStorage.getItem(LS_POS_PFX + p.slug);
      var progressHTML = "";
      if (savedPos && available) {
        try {
          var pos = JSON.parse(savedPos);
          var pct = Math.round(((pos.chapterIdx || 0) / p.chapterCount) * 100);
          progressHTML =
            '<div class="prophets-card-progress"><div class="prophets-card-progress-fill" style="width:' +
            Math.min(pct, 100) +
            '%"></div></div>';
        } catch (e) {
          /* ignore */
        }
      }

      var iconHTML = "";
      if (p.icon) {
        if (p.icon.indexOf("<") === 0) {
          iconHTML = p.icon;
        } else if (p.icon.indexOf("fa-") !== -1 || p.icon.indexOf("fa") === 0) {
          iconHTML = '<i class="' + p.icon + '"></i>';
        } else {
          iconHTML = p.icon;
        }
      }

      html +=
        '<button class="' +
        cls +
        '" ' +
        (available
          ? "onclick=\"window._openProphet('" + p.slug + "')\""
          : "disabled") +
        ">";
      html += '<div class="prophets-card-icon">' + iconHTML + "</div>";
      html += '<div class="prophets-card-body">';
      html += '<h3 class="prophets-card-name">' + p.name + "</h3>";
      html += '<p class="prophets-card-title">' + p.title + "</p>";
      html += '<div class="prophets-card-meta">';
      html +=
        '<span class="prophets-card-quran"><i class="fas fa-quran"></i> ذُكر ' +
        p.quranMentions +
        " مرّة</span>";
      if (available && p.readingTimeMinutes) {
        html +=
          '<span class="prophets-card-time"><i class="fas fa-clock"></i> ' +
          p.readingTimeMinutes +
          " دقيقة</span>";
      }
      html += "</div>";
      html += progressHTML;
      html += "</div>";
      html += badge;
      html += "</button>";
    });

    html += "</div></div>";
    container.innerHTML = html;
  }

  // ── Open Prophet (lazy-load) ───────────────────────────────
  window._openProphet = function (slug) {
    var container = document.getElementById("prophetsPageContent");
    if (!container) return;

    if (prophetsCache.has(slug)) {
      currentProphet = prophetsCache.get(slug);
      enterReader(container);
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
        enterReader(container);
      })
      .catch(function () {
        container.innerHTML =
          '<div class="prophets-error"><i class="fas fa-exclamation-triangle"></i><p>تعذّر تحميل القصة.</p><button class="prophets-retry-btn" onclick="window._openProphet(\'' +
          slug +
          '\')">إعادة المحاولة</button><button class="prophets-retry-btn prophets-retry-secondary" onclick="initProphetsTab()">العودة</button></div>';
      });
  };

  // ── Reader View ────────────────────────────────────────────
  function enterReader(container) {
    var p = currentProphet;
    if (!p || !p.chapters || p.chapters.length === 0) return;

    // Check for saved position
    var savedPos = localStorage.getItem(LS_POS_PFX + p.slug);
    var resumeChapter = 0;
    if (savedPos) {
      try {
        var pos = JSON.parse(savedPos);
        resumeChapter = pos.chapterIdx || 0;
      } catch (e) {
        /* ignore */
      }
    }
    currentChapterIdx = resumeChapter;

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

    // Top bar
    html += '<div class="pr-topbar" id="prTopbar">';
    html +=
      '<button class="pr-back-btn" onclick="window._exitReader()"><i class="fas fa-arrow-right"></i></button>';
    html += '<div class="pr-topbar-info">';
    html += '<span class="pr-topbar-name">' + p.name + "</span>";
    html += '<span class="pr-topbar-chapter" id="prTopbarChapter"></span>';
    html += "</div>";
    html +=
      '<button class="pr-toc-btn" onclick="window._toggleDrawer()" title="فهرس الفصول"><i class="fas fa-list"></i></button>';
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

    // Chapter nav
    html += '<div class="pr-chapter-nav" id="prChapterNav">';
    html +=
      '<button class="pr-nav-btn pr-nav-prev" id="prPrevBtn" onclick="window._prevChapter()"><i class="fas fa-chevron-right"></i> الفصل السابق</button>';
    html += '<span class="pr-nav-indicator" id="prNavIndicator"></span>';
    html +=
      '<button class="pr-nav-btn pr-nav-next" id="prNextBtn" onclick="window._nextChapter()">الفصل التالي <i class="fas fa-chevron-left"></i></button>';
    html += "</div>";

    // Chapter drawer (offscreen)
    html +=
      '<div class="pr-drawer-overlay" id="prDrawerOverlay" onclick="window._toggleDrawer()"></div>';
    html += '<div class="pr-drawer" id="prDrawer">';
    html += '<div class="pr-drawer-header">';
    html += '<h3><i class="fas fa-list-ol"></i> فهرس الفصول</h3>';
    html +=
      '<button class="pr-drawer-close" onclick="window._toggleDrawer()"><i class="fas fa-times"></i></button>';
    html += "</div>";
    html += '<div class="pr-drawer-list" id="prDrawerList"></div>';
    html += "</div>";

    // Resume toast
    html += '<div class="pr-resume-toast hidden" id="prResumeToast"></div>';

    container.innerHTML = html;

    // Populate drawer
    renderDrawer();

    // Scroll listener for progress saving
    var contentEl = document.getElementById("prChapterContent");
    if (contentEl) {
      window.addEventListener("scroll", debounce(savePosition, 1000));
    }
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

    // Paragraphs
    ch.paragraphs.forEach(function (para) {
      html += '<p class="pr-paragraph">' + para + "</p>";
    });

    // Quranic verses
    if (ch.quranicVerses && ch.quranicVerses.length > 0) {
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

    html += "</article>";
    contentEl.innerHTML = html;

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

    // Save position
    savePosition();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderDrawer() {
    var p = currentProphet;
    var listEl = document.getElementById("prDrawerList");
    if (!listEl || !p) return;

    var html = "";
    p.chapters.forEach(function (ch, idx) {
      var active = idx === currentChapterIdx ? " pr-drawer-item--active" : "";
      html +=
        '<button class="pr-drawer-item' +
        active +
        '" data-idx="' +
        idx +
        '" onclick="window._jumpToChapter(' +
        idx +
        ')">';
      html +=
        '<span class="pr-drawer-num">' +
        convertToArabicNum(ch.chapterId) +
        "</span>";
      html += '<span class="pr-drawer-title">' + ch.title + "</span>";
      if (ch.readingTimeMinutes)
        html +=
          '<span class="pr-drawer-time">' + ch.readingTimeMinutes + " د</span>";
      html += "</button>";
    });
    listEl.innerHTML = html;
  }

  function updateDrawerActive() {
    var items = document.querySelectorAll(".pr-drawer-item");
    items.forEach(function (item, idx) {
      item.classList.toggle(
        "pr-drawer-item--active",
        idx === currentChapterIdx,
      );
    });
  }

  function updateProgressBar() {
    var fill = document.getElementById("prProgressFill");
    if (!fill || !currentProphet) return;
    var pct = ((currentChapterIdx + 1) / currentProphet.chapters.length) * 100;
    fill.style.width = pct + "%";
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
  window._exitReader = function () {
    currentProphet = null;
    currentChapterIdx = 0;
    chapterDrawerOpen = false;

    // Restore bottom nav
    var bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.style.display = "";

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }

    // Remove scroll listener
    window.removeEventListener("scroll", debounce(savePosition, 1000));

    initProphetsTab();
  };

  // ── Persistence ────────────────────────────────────────────
  function savePosition() {
    if (!currentProphet) return;
    var data = {
      chapterIdx: currentChapterIdx,
      scrollY: window.scrollY,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      LS_POS_PFX + currentProphet.slug,
      JSON.stringify(data),
    );
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

  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }
})();
