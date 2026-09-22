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
      var stored = localStorage.getItem(LS_READ_PFX + slug);
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return [];
  }

  function markChapterRead(slug, chapterIdx) {
    var read = getReadChapters(slug);
    if (read.indexOf(chapterIdx) === -1) {
      read.push(chapterIdx);
      localStorage.setItem(LS_READ_PFX + slug, JSON.stringify(read));
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
    var savedFont = localStorage.getItem(LS_FONT);
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
      '<div class="prophets-header-section"><h2 class="prophets-main-title"><i class="fas fa-book-open"></i> قصص الأنبياء</h2><p class="prophets-subtitle">ملخص قصص الأنبياء — قراءة موثقة ومفصلة من القرآن الكريم والسنة النبوية والتفسير</p></div>';
    html += '<div class="prophets-cards-grid">';

    prophetsIndex.forEach(function (p) {
      var available = p.chapterCount > 0;
      var cls = available
        ? "prophets-card"
        : "prophets-card prophets-card--locked";
      var badge = available
        ? '<span class="prophets-card-badge">' + p.chapterCount + " فصول</span>"
        : '<span class="prophets-card-badge prophets-card-badge--soon">قريبًا</span>';

      // Check if story is fully complete
      var storyComplete = available && isStoryComplete(p.slug, p.chapterCount);

      // Check reading progress
      var readChapters = getReadChapters(p.slug);
      var progressHTML = "";
      if (readChapters.length > 0 && available) {
        var pct = Math.round((readChapters.length / p.chapterCount) * 100);
        progressHTML =
          '<div class="prophets-card-progress"><div class="prophets-card-progress-fill" style="width:' +
          Math.min(pct, 100) +
          '%"></div></div>';
      } else {
        // fallback to old scroll-based progress
        var savedPos = localStorage.getItem(LS_POS_PFX + p.slug);
        if (savedPos && available) {
          try {
            var pos = JSON.parse(savedPos);
            var pct2 = Math.round(((pos.chapterIdx || 0) / p.chapterCount) * 100);
            progressHTML =
              '<div class="prophets-card-progress"><div class="prophets-card-progress-fill" style="width:' +
              Math.min(pct2, 100) +
              '%"></div></div>';
          } catch (e) { /* ignore */ }
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

      // Completed badge
      if (storyComplete) {
        html += '<div class="prophets-card-completed-badge"><i class="fas fa-check"></i></div>';
      }

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

    // Complete reading button section
    html += '<div class="pr-complete-section" id="prCompleteSection"></div>';

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
    // Drawer progress
    html += '<div class="pr-drawer-progress" id="prDrawerProgress"></div>';
    html += '<div class="pr-drawer-list" id="prDrawerList"></div>';
    html += "</div>";

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

    // Populate drawer
    renderDrawer();

    // Setup scroll listener for real-time progress
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
    }
    scrollHandler = function () {
      updateScrollProgress();
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
    var section = document.getElementById("prCompleteSection");
    if (!section || !currentProphet) return;

    var slug = currentProphet.slug;
    var alreadyRead = isChapterRead(slug, currentChapterIdx);

    var html = '';
    if (alreadyRead) {
      html += '<button class="pr-complete-btn pr-complete-btn--done" disabled>';
      html += '<i class="fas fa-check-circle"></i>';
      html += '<span>تمّت قراءة هذا الفصل ✓</span>';
      html += '</button>';
    } else {
      html += '<button class="pr-complete-btn" onclick="window._completeChapter()">';
      html += '<i class="fas fa-check-double"></i>';
      html += '<span>أتممت القراءة</span>';
      html += '</button>';
    }

    section.innerHTML = html;
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
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }

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
})();
