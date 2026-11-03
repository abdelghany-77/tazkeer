/**
 * ====================================================================
 * AppRouter — Hardware Back Button & Tab Navigation Manager for ذَكِّرْ
 * ====================================================================
 * - Smooth instant tab switching with per-tab scroll position memory
 * - Mobile/Android Hardware Back Button support via History API (popstate)
 * - Intercepts back navigation to close open modals, overlays & readers
 * - Returns to Home tab before exiting the application
 */

(function (global) {
  "use strict";

  var currentTab = "tab-home";
  var tabScrollPositions = {
    "tab-home": 0,
    "tab-azkar": 0,
    "tab-quran": 0,
    "tab-prophets": 0,
    "tab-profile": 0
  };

  // Stack of active modal/reader closures
  // Each entry: { id: string, closeFn: Function }
  var modalStack = [];
  var isNavigatingViaHistory = false;

  var AppRouter = {
    /**
     * Get current active tab ID
     */
    getCurrentTab: function () {
      return currentTab;
    },

    /**
     * Switch to target tab with scroll preservation
     * @param {string} tabId
     * @param {boolean} [pushState=true]
     */
    switchTab: function (tabId, pushState) {
      if (typeof pushState !== "boolean") pushState = true;
      var target = document.getElementById(tabId);
      if (!target) return;
      if (currentTab === tabId && target.classList.contains("active-tab")) {
        return;
      }

      // 1. Save scroll position of the outgoing tab
      if (currentTab) {
        tabScrollPositions[currentTab] = window.scrollY || document.documentElement.scrollTop || 0;
      }

      // 2. If any modal or sub-reader is open while switching tabs, close it cleanly
      while (modalStack.length > 0) {
        var topModal = modalStack.pop();
        try {
          if (typeof topModal.closeFn === "function") {
            topModal.closeFn(true); // pass true for silent/immediate close
          }
        } catch (e) {
          console.warn("[AppRouter] Error auto-closing modal on tab switch:", e);
        }
      }
      document.body.classList.remove("modal-open");

      // 3. Switch active classes
      document.querySelectorAll(".tab-content").forEach(function (section) {
        section.classList.remove("active-tab");
      });
      target.classList.add("active-tab");

      // 4. Update bottom nav buttons and guarantee bottom nav visibility
      var bottomNav = document.getElementById("bottomNav");
      if (bottomNav) {
        bottomNav.style.display = "";
      }
      document.querySelectorAll(".bottom-nav-item").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });

      // 5. Header visibility: shown only on Home tab
      var header = document.querySelector(".header");
      if (header) {
        header.style.display = tabId === "tab-home" ? "" : "none";
      }

      currentTab = tabId;

      // 6. Persist to SafeStorage
      if (global.SafeStorage) {
        global.SafeStorage.set("activeTab", tabId);
      }

      // 7. Update browser history (for Hardware Back button to work between tabs)
      if (pushState && !isNavigatingViaHistory) {
        var hash = "#" + tabId.replace("tab-", "");
        try {
          window.history.pushState({ tab: tabId, view: "tab" }, "", hash);
        } catch (e) {}
      }

      // 8. Restore saved scroll position instantly (zero layout jump)
      var savedScrollY = tabScrollPositions[tabId] || 0;
      // Tab-specific initializations
      AppRouter.triggerTabInit(tabId);

      window.scrollTo({
        top: savedScrollY,
        behavior: "auto"
      });
    },

    /**
     * Trigger feature initialization hooks when a tab becomes active
     * @param {string} tabId
     */
    triggerTabInit: function (tabId) {
      if (tabId === "tab-home") {
        if (typeof global.updateDynamicHeroCard === "function") global.updateDynamicHeroCard();
        if (typeof global.updateContinueReadingPill === "function") global.updateContinueReadingPill();
        if (typeof global.initializePrayerTimes === "function") global.initializePrayerTimes();
        if (typeof global.updateRamadanCountdown === "function") global.updateRamadanCountdown();
      } else if (tabId === "tab-azkar") {
        var categoryPage = document.getElementById("categoryPage");
        var azkarListView = document.getElementById("azkarListView");
        var categoriesContainer = document.getElementById("categoriesContainer");
        if (categoriesContainer && categoriesContainer.children.length === 0) {
          if (typeof global.showHomePage === "function") global.showHomePage();
        } else if (categoryPage && categoryPage.classList.contains("hidden")) {
          if (azkarListView) azkarListView.classList.remove("hidden");
        }
      } else if (tabId === "tab-quran") {
        if (typeof global.initQuranTab === "function") global.initQuranTab();
      } else if (tabId === "tab-prophets") {
        if (typeof global.initProphetsTab === "function") global.initProphetsTab();
      } else if (tabId === "tab-profile") {
        if (typeof global.updateProfileTab === "function") global.updateProfileTab();
        if (typeof global.updateStatsDashboard === "function") global.updateStatsDashboard();
        if (typeof global.updateWeeklyChart === "function") global.updateWeeklyChart();
      }
    },

    /**
     * Register an open modal or sub-reader into the History stack
     * @param {string} modalId - Unique identifier (e.g. 'misbaha', 'qibla', 'fastingGuide', 'quranReader', 'prophetReader')
     * @param {Function} closeFn - Callback to invoke when closing this modal
     */
    pushModal: function (modalId, closeFn) {
      // Avoid duplicate registrations
      for (var i = 0; i < modalStack.length; i++) {
        if (modalStack[i].id === modalId) return;
      }

      modalStack.push({ id: modalId, closeFn: closeFn });
      document.body.classList.add("modal-open");

      try {
        window.history.pushState(
          { modal: modalId, tab: currentTab, view: "modal" },
          "",
          window.location.hash || "#" + currentTab.replace("tab-", "")
        );
      } catch (e) {
        console.warn("[AppRouter] history.pushState error:", e);
      }
    },

    /**
     * Close a modal through user interface action (e.g. clicking '×' or return button).
     * Automatically triggers history.back() if this modal created a history entry.
     * @param {string} modalId
     */
    closeModal: function (modalId) {
      var idx = -1;
      for (var i = 0; i < modalStack.length; i++) {
        if (modalStack[i].id === modalId) {
          idx = i;
          break;
        }
      }

      if (idx === -1) return;

      if (idx !== modalStack.length - 1) return;
      var entry = modalStack.pop();

      // Execute close callback directly
      if (entry && typeof entry.closeFn === "function") {
        try {
          entry.closeFn(false);
        } catch (e) {
          console.warn("[AppRouter] Error closing modal:", e);
        }
      }

      // If top state was this modal, step back in history to clean up
      if (window.history.state && window.history.state.modal === modalId) {
        try {
          isNavigatingViaHistory = true;
          window.history.back();
          setTimeout(function () {
            isNavigatingViaHistory = false;
          }, 100);
        } catch (e) {}
      }
      if (modalStack.length === 0) {
        document.body.classList.remove("modal-open");
      }
    },

    /**
     * Check if a specific modal or any modal is currently open
     * @param {string} [modalId]
     * @returns {boolean}
     */
    isModalOpen: function (modalId) {
      if (modalId) {
        return modalStack.some(function (m) {
          return m.id === modalId;
        });
      }
      return modalStack.length > 0;
    },

    /**
     * Initialize router and attach popstate handler
     */
    init: function () {
      // 1. Establish base history state
      var savedTab = global.SafeStorage
        ? global.SafeStorage.get("activeTab", "tab-home")
        : "tab-home";

      // If URL has a valid hash, honor it
      var hash = (window.location.hash || "").replace("#", "");
      if (hash && document.getElementById("tab-" + hash)) {
        savedTab = "tab-" + hash;
      }

      try {
        window.history.replaceState({ tab: savedTab, view: "tab" }, "", "#" + savedTab.replace("tab-", ""));
      } catch (e) {}

      // 2. Listen to hardware / browser back & forward events
      window.addEventListener("popstate", function (e) {
        // A) If any modal/reader is active, close the topmost one
        if (modalStack.length > 0) {
          var topModal = modalStack.pop();
          if (topModal && typeof topModal.closeFn === "function") {
            try {
              topModal.closeFn(false);
            } catch (err) {
              console.warn("[AppRouter] Popstate close error:", err);
            }
          }
          if (modalStack.length === 0) {
            document.body.classList.remove("modal-open");
          }
          return;
        }

        // B) If no modal is active and state contains a tab:
        if (e.state && e.state.tab) {
          isNavigatingViaHistory = true;
          AppRouter.switchTab(e.state.tab, false);
          isNavigatingViaHistory = false;
          return;
        }

        // C) If user pressed Back on secondary tab without a history entry, return to Home tab
        if (currentTab !== "tab-home") {
          isNavigatingViaHistory = true;
          AppRouter.switchTab("tab-home", false);
          isNavigatingViaHistory = false;
        }
      });

      // 3. Activate starting tab
      AppRouter.switchTab(savedTab, false);
    }
  };

  // Global bridge for inline HTML onclick handlers
  global.AppRouter = AppRouter;
  global.switchTab = function (tabId) {
    AppRouter.switchTab(tabId, true);
  };

  // Auto-init router when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      AppRouter.init();
    });
  } else {
    AppRouter.init();
  }
})(typeof window !== "undefined" ? window : this);
