/**
 * ====================================================================
 * Misbaha Module — Digital Tasbeeh & Haptics Engine for ذَكِّرْ
 * ====================================================================
 * - Electronic Sebha with vibration haptics & target goals (33, 50, 100, ∞)
 * - Round counters, cumulative totals, and preset Dhikr selection
 * - Tap-Anywhere mode on modal surface with dynamic SVG circular progress
 * - History API & Hardware Back Button integration via AppRouter
 */

(function (global) {
  "use strict";

  var misbahaCount = 0;
  var misbahaTarget = 33;
  var misbahaRounds = 0;
  var misbahaTotal = 0;
  var misbahaDhikr = "سبحان الله";
  var MISBAHA_CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.48

  function _toArabicNumerals(str) {
    return String(str).replace(/\d/g, function (d) {
      return "٠١٢٣٤٥٦٧٨٩"[d];
    });
  }

  function loadMisbahaState() {
    try {
      var state = global.SafeStorage
        ? global.SafeStorage.getJSON("misbahaState")
        : JSON.parse(localStorage.getItem("misbahaState") || "null");

      if (state) {
        misbahaCount = state.count || 0;
        misbahaTarget = state.target !== undefined ? state.target : 33;
        misbahaRounds = state.rounds || 0;
        misbahaTotal = state.total || 0;
        misbahaDhikr = state.dhikr || "سبحان الله";
      }
    } catch (e) {
      console.warn("[Misbaha] Error loading state:", e);
    }
  }

  function saveMisbahaState() {
    var data = {
      count: misbahaCount,
      target: misbahaTarget,
      rounds: misbahaRounds,
      total: misbahaTotal,
      dhikr: misbahaDhikr
    };
    if (global.SafeStorage) {
      global.SafeStorage.setJSON("misbahaState", data);
    } else {
      try {
        localStorage.setItem("misbahaState", JSON.stringify(data));
      } catch (e) {}
    }
  }

  function updateMisbahaUI() {
    var countNum = document.getElementById("misbahaCountNum");
    var countTarget = document.getElementById("misbahaCountTarget");
    var dhikrText = document.getElementById("mishbahaDhikrText");
    var roundsVal = document.getElementById("misbahaRoundsVal");
    var totalVal = document.getElementById("misbahaTotalValue");
    var ringFill = document.getElementById("misbahaRingFill");

    if (countNum) countNum.textContent = _toArabicNumerals(misbahaCount);
    if (countTarget) {
      countTarget.textContent = misbahaTarget > 0 ? "/ " + _toArabicNumerals(misbahaTarget) : "/ ∞";
    }
    if (dhikrText) dhikrText.textContent = misbahaDhikr;
    if (roundsVal) roundsVal.textContent = _toArabicNumerals(misbahaRounds);
    if (totalVal) totalVal.textContent = _toArabicNumerals(misbahaTotal);

    // Update circular SVG progress ring
    if (ringFill) {
      if (misbahaTarget > 0) {
        var progress = Math.min(misbahaCount / misbahaTarget, 1);
        var offset = MISBAHA_CIRCUMFERENCE * (1 - progress);
        ringFill.style.strokeDasharray = MISBAHA_CIRCUMFERENCE;
        ringFill.style.strokeDashoffset = offset;
      } else {
        // Infinite mode: continuously animate rotating ring
        ringFill.style.strokeDasharray = MISBAHA_CIRCUMFERENCE;
        ringFill.style.strokeDashoffset = 0;
      }
    }

    // Update preset pills active state
    var presetBtns = document.querySelectorAll(".misbaha-preset");
    presetBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-dhikr") === misbahaDhikr);
    });

    // Update target buttons active state
    var targetBtns = document.querySelectorAll(".misbaha-target-btn");
    targetBtns.forEach(function (btn) {
      var btnTarget = parseInt(btn.getAttribute("data-target"), 10);
      btn.classList.toggle("active", btnTarget === misbahaTarget);
    });
  }

  function _closeMisbahaInternal() {
    var overlay = document.getElementById("misbahaOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }
  }

  function openMisbaha() {
    loadMisbahaState();
    var overlay = document.getElementById("misbahaOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      updateMisbahaUI();

      // Tap-Anywhere on container for convenience
      var container = overlay.querySelector(".misbaha-container");
      if (container && !container._hasTapAnywhere) {
        container._hasTapAnywhere = true;
        container.addEventListener("click", function (e) {
          if (
            e.target.closest(
              "button, .misbaha-preset, .misbaha-target-btn, .misbaha-close-btn, .misbaha-reset-btn, .misbaha-tap-btn"
            )
          ) {
            return;
          }
          incrementMisbaha();
        });
      }
    }

    // Register with AppRouter for Hardware Back Button
    if (global.AppRouter) {
      global.AppRouter.pushModal("misbaha", _closeMisbahaInternal);
    }
  }

  function closeMisbaha() {
    if (global.AppRouter && global.AppRouter.isModalOpen("misbaha")) {
      global.AppRouter.closeModal("misbaha");
    } else {
      _closeMisbahaInternal();
    }
  }

  function setMisbahaTarget(target) {
    misbahaTarget = parseInt(target, 10) || 0;
    if (misbahaTarget > 0 && misbahaCount >= misbahaTarget) {
      misbahaCount = 0;
    }
    saveMisbahaState();
    updateMisbahaUI();
  }

  function selectMisbahaPreset(btn) {
    if (!btn) return;
    misbahaDhikr = btn.getAttribute("data-dhikr") || btn.textContent.trim();
    saveMisbahaState();
    updateMisbahaUI();
  }

  function incrementMisbaha() {
    var tapBtn = document.getElementById("misbahaTapBtn");

    if (misbahaTarget > 0) {
      if (misbahaCount >= misbahaTarget) {
        misbahaCount = 0;
        if (tapBtn) tapBtn.classList.remove("completed-flash");
      }

      misbahaCount++;
      misbahaTotal++;

      if (misbahaCount === misbahaTarget) {
        misbahaRounds++;
        if (tapBtn) {
          tapBtn.classList.add("completed-flash");
          setTimeout(function () {
            tapBtn.classList.remove("completed-flash");
          }, 1200);
        }
        if (navigator.vibrate) {
          navigator.vibrate([60, 60, 120]);
        }
        if (typeof global.showNotification === "function") {
          global.showNotification("أتممت الدورة " + _toArabicNumerals(misbahaRounds) + "! بارك الله فيك 🌟");
        }
      } else {
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    } else {
      // Infinite mode
      misbahaCount++;
      misbahaTotal++;
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }

    // Pulse animation
    if (tapBtn) {
      tapBtn.classList.remove("pulse");
      void tapBtn.offsetWidth; // trigger reflow
      tapBtn.classList.add("pulse");
    }

    saveMisbahaState();
    updateMisbahaUI();
  }

  function resetMisbaha() {
    if (misbahaCount === 0 && misbahaTotal === 0 && misbahaRounds === 0) return;

    if (confirm("هل تريد تصفير عداد المسبحة والدورات؟")) {
      misbahaCount = 0;
      misbahaTotal = 0;
      misbahaRounds = 0;
      var tapBtn = document.getElementById("misbahaTapBtn");
      if (tapBtn) tapBtn.classList.remove("completed-flash");
      saveMisbahaState();
      updateMisbahaUI();
      if (typeof global.showNotification === "function") {
        global.showNotification("تم تصفير المسبحة بنجاح");
      }
    }
  }

  // Global exports for HTML inline bindings
  global.loadMisbahaState = loadMisbahaState;
  global.saveMisbahaState = saveMisbahaState;
  global.updateMisbahaUI = updateMisbahaUI;
  global.openMisbaha = openMisbaha;
  global.closeMisbaha = closeMisbaha;
  global.setMisbahaTarget = setMisbahaTarget;
  global.selectMisbahaPreset = selectMisbahaPreset;
  global.incrementMisbaha = incrementMisbaha;
  global.resetMisbaha = resetMisbaha;
})(typeof window !== "undefined" ? window : this);

