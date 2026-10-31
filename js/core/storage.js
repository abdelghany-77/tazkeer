/**
 * ====================================================================
 * SafeStorage — Fault-Tolerant Storage Manager for ذَكِّرْ (Tazkeer)
 * ====================================================================
 * Provides a resilient, type-safe wrapper around window.localStorage
 * with in-memory fallback for Incognito/Private Browsing & QuotaExceededError.
 * 100% backward compatible with existing raw localStorage keys.
 */

(function (global) {
  "use strict";

  var isStorageAvailable = (function () {
    try {
      var testKey = "__tazkeer_probe__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn("[SafeStorage] LocalStorage is unavailable or restricted. Using memory fallback.", e);
      return false;
    }
  })();

  var _memoryStore = new Map();

  var SafeStorage = {
    isAvailable: isStorageAvailable,

    /**
     * Retrieve a string value by key
     * @param {string} key
     * @param {*} [fallback=null]
     * @returns {string|*}
     */
    get: function (key, fallback) {
      if (fallback === undefined) fallback = null;
      if (!isStorageAvailable) {
        return _memoryStore.has(key) ? _memoryStore.get(key) : fallback;
      }
      try {
        var val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (e) {
        console.warn('[SafeStorage] Failed to read key: "' + key + '"', e);
        return _memoryStore.has(key) ? _memoryStore.get(key) : fallback;
      }
    },

    /**
     * Save a string value by key
     * @param {string} key
     * @param {*} value
     * @returns {boolean} True if successfully stored in localStorage
     */
    set: function (key, value) {
      var strVal = String(value);
      if (!isStorageAvailable) {
        _memoryStore.set(key, strVal);
        return false;
      }
      try {
        window.localStorage.setItem(key, strVal);
        return true;
      } catch (e) {
        console.error('[SafeStorage] QuotaExceeded or write error for key: "' + key + '"', e);
        _memoryStore.set(key, strVal);
        return false;
      }
    },

    /**
     * Remove a key
     * @param {string} key
     */
    remove: function (key) {
      _memoryStore.delete(key);
      if (!isStorageAvailable) return;
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn('[SafeStorage] Failed to remove key: "' + key + '"', e);
      }
    },

    /**
     * Retrieve and parse JSON
     * @param {string} key
     * @param {*} [fallback=null]
     * @returns {*}
     */
    getJSON: function (key, fallback) {
      if (fallback === undefined) fallback = null;
      var raw = this.get(key, null);
      if (raw === null || raw === undefined) return fallback;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[SafeStorage] Failed to parse JSON for key: "' + key + '"', e);
        return fallback;
      }
    },

    /**
     * Serialize and save JSON
     * @param {string} key
     * @param {*} value
     * @returns {boolean}
     */
    setJSON: function (key, value) {
      try {
        var serialized = JSON.stringify(value);
        return this.set(key, serialized);
      } catch (e) {
        console.error('[SafeStorage] Failed to serialize JSON for key: "' + key + '"', e);
        return false;
      }
    },

    /**
     * Export all key-values matching an optional prefix (for user backup)
     * @param {string} [prefix="tazkeer"]
     * @returns {Object}
     */
    exportAll: function (prefix) {
      var dump = {};
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (!prefix || k.indexOf(prefix) === 0 || k === "activeTab" || k === "theme" || k === "prayerLocation") {
            dump[k] = this.get(k);
          }
        }
      } catch (e) {
        console.warn("[SafeStorage] Error exporting data:", e);
      }
      return dump;
    }
  };

  global.SafeStorage = SafeStorage;
  global.safeStorage = SafeStorage;

  /**
   * Export all user progress and preferences as a downloadable JSON file
   */
  global.exportUserData = function () {
    try {
      var data = {};
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        data[key] = window.localStorage.getItem(key);
      }
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var now = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = "tazkeer-backup-" + now + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof global.showNotification === "function") {
        global.showNotification("تم تصدير الإنجازات والبيانات بنجاح 📁");
      }
    } catch (err) {
      console.error("[SafeStorage] Export error:", err);
      alert("تعذر تصدير البيانات: " + err.message);
    }
  };

  /**
   * Trigger the hidden file input for JSON import
   */
  global.triggerImportData = function () {
    var input = document.getElementById("importJsonInput");
    if (input) input.click();
  };

  /**
   * Import and restore data from an uploaded JSON file
   */
  global.importUserData = function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (typeof data !== "object" || data === null) {
          throw new Error("تنسيق الملف غير صالح");
        }
        var count = 0;
        Object.keys(data).forEach(function (key) {
          try {
            var val = data[key];
            window.localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
            count++;
          } catch (itemErr) {}
        });

        if (typeof global.showNotification === "function") {
          global.showNotification("تم استيراد " + count + " عنصر بنجاح! جاري التحديث...");
        }

        setTimeout(function () {
          window.location.reload();
        }, 1200);
      } catch (err) {
        console.error("[SafeStorage] Import error:", err);
        alert("فشل استيراد الملف: يرجى التأكد من اختيار ملف JSON صالح لتطبيق ذَكِّرْ.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };
})(typeof window !== "undefined" ? window : this);

