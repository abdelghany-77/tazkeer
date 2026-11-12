/**
 * ============================================================================
 * adhan-native.js — Tazkeer Adhan engine (web <-> Capacitor bridge)
 * ============================================================================
 *
 * Responsibilities:
 *  1. Detect the native Android shell.
 *  2. Build a rolling 7-day prayer schedule from AlAdhan (with offline cache).
 *  3. Push that schedule into the native AlarmManager plugin.
 *  4. Render the muezzin / per-prayer / permissions settings UI.
 *  5. Reconcile the schedule on app start, resume and prayer-time refresh.
 *
 * The web layer never plays the adhan itself: on Android the native
 * AdhanPlaybackService does, which is the only way to guarantee audio while
 * the app is killed or the device is in Doze.
 *
 * Public API: window.AdhanNative
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var SETTINGS_KEY = "adhanSettings.v2";
  var CALENDAR_PREFIX = "adhanCalendar.v2";
  var CALENDAR_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  var RESYNC_THROTTLE_MS = 5 * 60 * 1000;
  var PERMISSION_THROTTLE_MS = 4 * 1000;

  var PRAYERS = [
    { key: "Fajr", name: "الفجر", icon: "fa-cloud-moon" },
    { key: "Dhuhr", name: "الظهر", icon: "fa-sun" },
    { key: "Asr", name: "العصر", icon: "fa-cloud-sun" },
    { key: "Maghrib", name: "المغرب", icon: "fa-moon" },
    { key: "Isha", name: "العشاء", icon: "fa-star" }
  ];

  /**
   * Bundled, offline muezzin catalogue.
   *
   * `sound` maps to a file in android/app/src/main/res/raw/<sound>.mp3.
   * Fajr always uses the dedicated Fajr recording so the
   * "الصلاة خير من النوم" line is present.
   *
   * Licensing: the three bundled recordings come from Internet Archive items
   * explicitly marked Public Domain Mark 1.0 (see AUDIO-NOTICE.md). To add a
   * licensed Alafasy recording, drop `adhan_alafasy.mp3` into res/raw and add:
   *
   *   alafasy: {
   *     id: "alafasy",
   *     name: "الشيخ مشاري العفاسي",
   *     desc: "أذان بصوت الشيخ مشاري العفاسي",
   *     sound: "adhan_alafasy",
   *     fajrSound: "adhan_fajr",
   *     icon: "fa-microphone"
   *   }
   */
  var MUEZZINS = {
    alafasy: {
      id: "alafasy",
      name: "الشيخ مشاري العفاسي",
      desc: "أذان بصوت الشيخ مشاري العفاسي",
      sound: "adhan",
      fajrSound: "adhan_fajr",
      icon: "fa-microphone"
    },
    abdulbasit: {
      id: "abdulbasit",
      name: "الشيخ عبد الباسط عبد الصمد",
      desc: "أذان بصوت الشيخ عبد الباسط عبد الصمد",
      sound: "adhan_abdulbasit",
      fajrSound: "adhan_fajr",
      icon: "fa-microphone-lines"
    },
    makkah: {
      id: "makkah",
      name: "أذان الحرم المكي",
      desc: "تسجيل من الحرم المكي الشريف",
      sound: "adhan_makkah",
      fajrSound: "adhan_fajr",
      icon: "fa-mosque"
    },
    doha: {
      id: "doha",
      name: "أذان الدوحة",
      desc: "تسجيل إذاعي من مساجد الدوحة",
      sound: "adhan",
      fajrSound: "adhan_fajr",
      icon: "fa-volume-high"
    }
  };

  var DEFAULT_PRAYERS = {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true
  };

  var state = {
    settings: null,
    permissions: null,
    nextAlarm: null,
    scheduledCount: 0,
    lastSync: 0,
    lastSignal: 0,
    lastResumeSync: 0,
    lastPermissionCheck: 0,
    syncing: false,
    lastError: null
  };

  // ---------------------------------------------------------------------------
  // Environment / storage helpers
  // ---------------------------------------------------------------------------

  function isNativePlatform() {
    return Boolean(
      global.Capacitor &&
        typeof global.Capacitor.isNativePlatform === "function" &&
        global.Capacitor.isNativePlatform()
    );
  }

  function platformName() {
    try {
      return global.Capacitor && global.Capacitor.getPlatform
        ? global.Capacitor.getPlatform()
        : "web";
    } catch (e) {
      return "web";
    }
  }

  function getPlugin() {
    try {
      if (!isNativePlatform()) return null;
      return (
        (global.Capacitor &&
          global.Capacitor.Plugins &&
          global.Capacitor.Plugins.AdhanScheduler) ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  function notify(message, type) {
    if (typeof global.showNotification === "function") {
      global.showNotification(message, type || "success", 3600);
    } else if (typeof global.showEnhancedNotification === "function") {
      global.showEnhancedNotification(message, type || "success", 3600);
    } else {
      console.log("[Adhan]", message);
    }
  }

  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[Adhan] localStorage write failed", e);
      return false;
    }
  }

  function clamp(value, min, max, fallback) {
    var number = Number(value);
    if (!isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  function normalizeSettings(raw) {
    var input = raw && typeof raw === "object" ? raw : {};
    var prayers = {};
    PRAYERS.forEach(function (prayer) {
      prayers[prayer.key] =
        input.prayers && typeof input.prayers[prayer.key] === "boolean"
          ? input.prayers[prayer.key]
          : DEFAULT_PRAYERS[prayer.key];
    });

    return {
      enabled: input.enabled !== false, // Defaults to true (auto-enabled on first launch)
      muezzin: MUEZZINS[input.muezzin] ? input.muezzin : "alafasy",
      volume: clamp(input.volume, 0.05, 1, 1),
      prayers: prayers,
      daysAhead: 7,
      notifyOnly: input.notifyOnly === true
    };
  }

  function loadSettings() {
    return normalizeSettings(readJSON(SETTINGS_KEY, null));
  }

  function saveSettings() {
    writeJSON(SETTINGS_KEY, state.settings);
  }

  function getSettings() {
    if (!state.settings) state.settings = loadSettings();
    return state.settings;
  }

  function updateSettings(patch) {
    var next = normalizeSettings(
      Object.assign({}, getSettings(), patch || {})
    );
    if (patch && patch.prayers) {
      next.prayers = Object.assign({}, getSettings().prayers, patch.prayers);
    }
    state.settings = next;
    saveSettings();
    return next;
  }

  // ---------------------------------------------------------------------------
  // Date helpers (local timezone, no external dependencies)
  // ---------------------------------------------------------------------------

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function dateKey(date) {
    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate())
    );
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function parseTimeValue(value) {
    var match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    var hours = parseInt(match[1], 10);
    var minutes = parseInt(match[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return { hours: hours, minutes: minutes, text: pad2(hours) + ":" + pad2(minutes) };
  }

  function parseAladhanDay(day) {
    if (!day || !day.date) return null;
    var gregorian = day.date.gregorian;
    if (gregorian && typeof gregorian.date === "string") {
      var parts = gregorian.date.split("-");
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[2], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[0], 10)
        );
      }
    }
    if (typeof day.date.timestamp === "number") {
      return new Date(day.date.timestamp * 1000);
    }
    return null;
  }

  function formatNextAlarm(alarm) {
    if (!alarm || !alarm.time) return "";
    var when = new Date(Number(alarm.time));
    if (isNaN(when.getTime())) return "";

    var today = startOfDay(new Date());
    var target = startOfDay(when);
    var dayLabel;
    var diff = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diff <= 0) {
      dayLabel = "اليوم";
    } else if (diff === 1) {
      dayLabel = "غداً";
    } else {
      try {
        dayLabel = new Intl.DateTimeFormat("ar-EG", {
          weekday: "long"
        }).format(when);
      } catch (e) {
        dayLabel = dateKey(when);
      }
    }

    var timeLabel;
    try {
      timeLabel = new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(when);
    } catch (e) {
      timeLabel = pad2(when.getHours()) + ":" + pad2(when.getMinutes());
    }

    var prayerName = "";
    PRAYERS.forEach(function (prayer) {
      if (prayer.key === alarm.prayer) prayerName = prayer.name;
    });
    if (!prayerName && alarm.label) prayerName = alarm.label;

    return dayLabel + " · " + timeLabel + (prayerName ? " · " + prayerName : "");
  }

  // ---------------------------------------------------------------------------
  // AlAdhan calendar (7-day rolling window + offline cache)
  // ---------------------------------------------------------------------------

  function getLocation() {
    var saved = readJSON("prayerLocation", null);
    if (saved && isFinite(saved.latitude) && isFinite(saved.longitude)) {
      return {
        lat: Number(saved.latitude),
        lng: Number(saved.longitude),
        city: saved.city || "موقعك"
      };
    }
    return { lat: 30.0444, lng: 31.2357, city: "القاهرة" };
  }

  function calendarCacheKey(lat, lng, year, month) {
    return (
      CALENDAR_PREFIX +
      "." +
      lat.toFixed(2) +
      "." +
      lng.toFixed(2) +
      "." +
      year +
      "-" +
      month
    );
  }

  function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("request timeout"));
      }, timeoutMs);

      global
        .fetch(url, { cache: "no-store" })
        .then(
          function (response) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(response);
          },
          function (error) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        );
    });
  }

  async function fetchMonthDays(lat, lng, year, month) {
    var key = calendarCacheKey(lat, lng, year, month);
    var cached = readJSON(key, null);
    if (
      cached &&
      Array.isArray(cached.days) &&
      cached.days.length &&
      Date.now() - Number(cached.savedAt || 0) < CALENDAR_TTL_MS
    ) {
      return cached.days;
    }

    var url =
      "https://api.aladhan.com/v1/calendar?latitude=" +
      encodeURIComponent(lat) +
      "&longitude=" +
      encodeURIComponent(lng) +
      "&method=5&month=" +
      month +
      "&year=" +
      year;

    var response = await fetchWithTimeout(url, 15000);
    if (!response.ok) throw new Error("AlAdhan HTTP " + response.status);

    var payload = await response.json();
    if (!payload || !Array.isArray(payload.data)) {
      throw new Error("AlAdhan returned an invalid calendar payload");
    }

    writeJSON(key, { savedAt: Date.now(), days: payload.data });
    return payload.data;
  }

  async function collectDays(lat, lng, daysAhead) {
    var today = startOfDay(new Date());
    var monthRequests = {};
    var index;

    for (index = 0; index < daysAhead; index++) {
      var cursor = addDays(today, index);
      monthRequests[cursor.getFullYear() + "-" + (cursor.getMonth() + 1)] = {
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1
      };
    }

    var monthKeys = Object.keys(monthRequests);
    var monthResults = await Promise.all(
      monthKeys.map(function (key) {
        var item = monthRequests[key];
        return fetchMonthDays(lat, lng, item.year, item.month).catch(function (
          error
        ) {
          console.warn(
            "[Adhan] Calendar fetch failed for " + key + ":",
            error && error.message
          );
          return null;
        });
      })
    );

    var byDate = {};
    monthResults.forEach(function (days) {
      if (!Array.isArray(days)) return;
      days.forEach(function (day) {
        var parsed = parseAladhanDay(day);
        if (parsed && day.timings) {
          byDate[dateKey(parsed)] = day.timings;
        }
      });
    });

    var collected = [];
    for (index = 0; index < daysAhead; index++) {
      var date = addDays(today, index);
      var timings = byDate[dateKey(date)];
      if (timings) {
        collected.push({ date: date, timings: timings });
      }
    }

    // Offline fallback for *today only*: reuse the timings cached by script.js
    // so a device that has never downloaded a calendar still gets today's
    // remaining adhans.
    if (!collected.length) {
      var cachedToday = readJSON("cachedPrayerTimes", null);
      var cachedDate = global.localStorage.getItem("cachedPrayerDate");
      var cachedLat = Number(global.localStorage.getItem("cachedPrayerLatitude"));
      var cachedLng = Number(global.localStorage.getItem("cachedPrayerLongitude"));
      var cacheMatchesLocation =
        Number.isFinite(cachedLat) &&
        Number.isFinite(cachedLng) &&
        Math.abs(cachedLat - lat) < 0.01 &&
        Math.abs(cachedLng - lng) < 0.01;
      if (
        cachedToday &&
        typeof cachedToday === "object" &&
        cachedDate === dateKey(today) &&
        cacheMatchesLocation
      ) {
        collected.push({ date: today, timings: cachedToday });
      }
    }

    return collected;
  }

  function buildAlarms(days, settings) {
    var muezzin = MUEZZINS[settings.muezzin] || MUEZZINS.makkah;
    var now = Date.now();
    var alarms = [];

    days.forEach(function (day, dayIndex) {
      PRAYERS.forEach(function (prayer, prayerIndex) {
        if (!settings.prayers[prayer.key]) return;

        var parsed = parseTimeValue(day.timings[prayer.key]);
        if (!parsed) return;

        var when = new Date(
          day.date.getFullYear(),
          day.date.getMonth(),
          day.date.getDate(),
          parsed.hours,
          parsed.minutes,
          0,
          0
        );
        var time = when.getTime();
        if (!isFinite(time) || time <= now + 3000) return;

        var isFajr = prayer.key === "Fajr";
        alarms.push({
          id: dayIndex * 10 + prayerIndex,
          time: time,
          date: dateKey(when),
          timeOfDay: parsed.text,
          prayer: prayer.key,
          label: "حان الآن وقت صلاة " + prayer.name,
          sound: isFajr ? muezzin.fajrSound : muezzin.sound,
          fajr: isFajr,
          volume: settings.volume
        });
      });
    });

    alarms.sort(function (a, b) {
      return a.time - b.time;
    });
    return alarms;
  }

  // ---------------------------------------------------------------------------
  // Native synchronisation
  // ---------------------------------------------------------------------------

  async function syncSchedule(reason) {
    var settings = getSettings();
    var plugin = getPlugin();

    if (!isNativePlatform() || !plugin) {
      renderStatus();
      return false;
    }

    if (state.syncing) return false;
    state.syncing = true;
    state.lastError = null;
    renderStatus();

    try {
      if (!settings.enabled) {
        await plugin.cancelAllAlarms();
        state.nextAlarm = null;
        state.scheduledCount = 0;
        state.lastSync = Date.now();
        return true;
      }

      var location = getLocation();
      var days = await collectDays(location.lat, location.lng, settings.daysAhead);

      if (!days.length) {
        state.lastError =
          "لا توجد بيانات مواقيت محفوظة. اتصل بالإنترنت مرة واحدة لجدولة الأذان.";
        // Do not wipe a previously working native schedule.
        await refreshNextAlarm();
        return false;
      }

      var alarms = buildAlarms(days, settings);
      if (!alarms.length) {
        state.lastError = "مواقيت الصلاة الحالية غير صالحة للجدولة.";
        await refreshNextAlarm();
        return false;
      }
      var result = await plugin.scheduleAlarms({ alarms: alarms });

      state.lastSync = Date.now();
      state.scheduledCount =
        result && typeof result.scheduled === "number"
          ? result.scheduled
          : alarms.length;
      state.nextAlarm = alarms.length
        ? {
            time: alarms[0].time,
            prayer: alarms[0].prayer,
            label: alarms[0].label
          }
        : null;

      if (!result.exactAlarms) {
        state.lastError =
          "المنبهات الدقيقة غير مفعّلة — قد يتأخر الأذان. فعّلها من قسم التشغيل الموثوق.";
      }

      console.log(
        "[Adhan] Synced " +
          state.scheduledCount +
          "/" +
          alarms.length +
          " alarms (" +
          (reason || "manual") +
          ")"
      );

      await refreshNextAlarm();
      return state.scheduledCount > 0;
    } catch (error) {
      state.lastError = (error && error.message) || "تعذر جدولة الأذان";
      console.error("[Adhan] schedule sync failed:", error);
      return false;
    } finally {
      state.syncing = false;
      renderStatus();
    }
  }

  async function refreshNextAlarm() {
    var plugin = getPlugin();
    if (!plugin) {
      state.nextAlarm = null;
      state.scheduledCount = 0;
      renderStatus();
      return;
    }

    try {
      var result = await plugin.getScheduledAlarms();
      var alarms = result && result.alarms ? result.alarms : [];
      alarms.sort(function (a, b) {
        return Number(a.time) - Number(b.time);
      });
      state.nextAlarm = alarms.length ? alarms[0] : null;
      state.scheduledCount = alarms.length;
    } catch (error) {
      console.warn("[Adhan] Could not read native schedule", error);
    }
    renderStatus();
  }

  function scheduleResync(delayMs) {
    if (state._resyncTimer) clearTimeout(state._resyncTimer);
    state._resyncTimer = setTimeout(function () {
      if (isNativePlatform() && getSettings().enabled) {
        syncSchedule("configuration");
      }
    }, Math.max(0, delayMs || 800));
  }

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  async function refreshPermissions(force) {
    var plugin = getPlugin();

    if (!plugin) {
      state.permissions = { native: false };
      updatePermissionUI();
      return state.permissions;
    }

    var now = Date.now();
    if (
      !force &&
      state.permissions &&
      state.permissions.native &&
      now - state.lastPermissionCheck < PERMISSION_THROTTLE_MS
    ) {
      updatePermissionUI();
      return state.permissions;
    }

    try {
      state.permissions = await plugin.checkPermissions();
      state.permissions.native = true;
    } catch (error) {
      console.warn("[Adhan] checkPermissions failed", error);
      state.permissions = { native: true, error: error && error.message };
    }

    state.lastPermissionCheck = Date.now();
    updatePermissionUI();
    return state.permissions;
  }

  function permissionRowId(kind) {
    if (kind === "notifications") return "adhanPermNotif";
    if (kind === "exact") return "adhanPermExact";
    if (kind === "battery") return "adhanPermBattery";
    return "";
  }

  function setPermissionRow(kind, ok, description) {
    var row = document.getElementById(permissionRowId(kind));
    if (!row) return;
    var badge = row.querySelector(".adhan-perm-badge");
    var desc = row.querySelector(".adhan-perm-desc");
    var button = row.querySelector(".adhan-perm-fix");

    if (badge) {
      badge.classList.toggle("is-ok", !!ok);
      badge.innerHTML = ok
        ? '<i class="fas fa-check"></i>'
        : '<i class="fas fa-exclamation"></i>';
    }
    if (desc) desc.textContent = description;
    if (button) {
      button.disabled = !!ok || !isNativePlatform();
      button.textContent = ok ? "تم" : "تفعيل";
    }
  }

  function updatePermissionUI() {
    var permissions = state.permissions || { native: false };

    if (!isNativePlatform()) {
      setPermissionRow(
        "notifications",
        false,
        "تعمل الإشعارات في تطبيق أندرويد فقط"
      );
      setPermissionRow(
        "exact",
        false,
        "المنبهات الدقيقة متاحة داخل تطبيق أندرويد"
      );
      setPermissionRow(
        "battery",
        false,
        "استثناء البطارية متاح داخل تطبيق أندرويد"
      );
      return;
    }

    if (permissions.error) {
      setPermissionRow("notifications", false, "تعذر قراءة حالة الإشعارات");
      setPermissionRow("exact", false, "تعذر قراءة حالة المنبهات الدقيقة");
      setPermissionRow("battery", false, "تعذر قراءة حالة البطارية");
      return;
    }

    var notificationsOk =
      permissions.notifications === true &&
      permissions.notificationRuntimePermission !== false;
    setPermissionRow(
      "notifications",
      notificationsOk,
      notificationsOk
        ? "إشعار الأذان سيظهر على الشاشة"
        : "اسمح بالإشعارات ليظهر تنبيه الأذان"
    );

    var exactOk = permissions.exactAlarms === true;
    setPermissionRow(
      "exact",
      exactOk,
      exactOk
        ? "المنبهات الدقيقة مفعّلة — الأذان في الثانية المحددة"
        : "فعّل «المنبهات والتذكيرات» لضبط الأذان بدقة"
    );

    var batteryOk = permissions.batteryOptimizations === true;
    setPermissionRow(
      "battery",
      batteryOk,
      batteryOk
        ? "التطبيق مستثنى من توفير البطارية"
        : "قد يؤخر توفير البطارية الأذان — أضف استثناءً"
    );
  }

  async function fixPermission(kind) {
    var plugin = getPlugin();
    if (!plugin) {
      notify(
        "إعدادات الأذان المتقدمة تعمل داخل تطبيق أندرويد فقط.",
        "info"
      );
      return;
    }

    var method = {
      notifications: "requestNotificationPermission",
      exact: "requestExactAlarmPermission",
      battery: "requestBatteryOptimizationExemption"
    }[kind];

    if (!method || typeof plugin[method] !== "function") return;

    try {
      await plugin[method]();
      if (kind === "notifications") {
        notify("تم تحديث إذن الإشعارات", "success");
      } else {
        notify("اتبع الخطوات في شاشة الإعدادات ثم عُد للتطبيق", "info");
      }
    } catch (error) {
      console.warn("[Adhan] permission request failed", error);
      notify("تعذر فتح إعدادات النظام. افتح إعدادات التطبيق يدوياً.", "error");
    }

    setTimeout(function () {
      refreshPermissions(true);
    }, 1200);
  }

  // ---------------------------------------------------------------------------
  // UI rendering
  // ---------------------------------------------------------------------------

  function arNum(value) {
    if (typeof global.toArabicDigits === "function") {
      return global.toArabicDigits(value);
    }
    var digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(value).replace(/[0-9]/g, function (d) {
      return digits[+d];
    });
  }

  function renderMuezzinList() {
    var container = document.getElementById("adhanMuezzinList");
    if (!container) return;

    var current = getSettings().muezzin;
    var html = "";
    Object.keys(MUEZZINS).forEach(function (key) {
      var item = MUEZZINS[key];
      html +=
        '<button type="button" class="adhan-muezzin-card' +
        (key === current ? " is-selected" : "") +
        '" data-muezzin="' +
        key +
        '" onclick="AdhanNative.selectMuezzin(\'' +
        key +
        "')\">" +
        '<span class="adhan-muezzin-icon"><i class="fas ' +
        item.icon +
        '"></i></span>' +
        '<span class="adhan-muezzin-text">' +
        '<span class="adhan-muezzin-name">' +
        item.name +
        "</span>" +
        '<span class="adhan-muezzin-desc">' +
        item.desc +
        "</span>" +
        "</span>" +
        '<span class="adhan-muezzin-check"><i class="fas fa-circle-check"></i></span>' +
        "</button>";
    });

    container.innerHTML = html;
  }

  function renderPrayerGrid() {
    var container = document.getElementById("adhanPrayerGrid");
    if (!container) return;
    var settings = getSettings();
    var html = "";

    PRAYERS.forEach(function (prayer) {
      html +=
        '<button type="button" class="adhan-prayer-chip' +
        (settings.prayers[prayer.key] ? " is-on" : "") +
        '" data-prayer="' +
        prayer.key +
        '" onclick="AdhanNative.togglePrayer(\'' +
        prayer.key +
        "')\">" +
        '<i class="fas ' +
        prayer.icon +
        '"></i>' +
        "<span>" +
        prayer.name +
        "</span>" +
        "</button>";
    });

    container.innerHTML = html;
  }

  function renderStatus() {
    var settings = getSettings();
    var native = isNativePlatform();
    var plugin = getPlugin();

    var toggle = document.getElementById("adhanEnabledToggle");
    if (toggle) toggle.checked = settings.enabled;

    var volume = document.getElementById("adhanVolume");
    if (volume) volume.value = String(Math.round(settings.volume * 100));
    var volumeValue = document.getElementById("adhanVolumeValue");
    if (volumeValue)
      volumeValue.textContent = arNum(Math.round(settings.volume * 100)) + "%";

    var statusPill = document.getElementById("adhanStatusPill");
    var summary = document.getElementById("adhanSummary");
    var headerButton = document.getElementById("adhanHeaderBtn");

    var statusText;
    if (!native) {
      statusText = "وضع المتصفح";
    } else if (!plugin) {
      statusText = "غير مهيأ";
    } else if (!settings.enabled) {
      statusText = "متوقف";
    } else if (state.scheduledCount > 0) {
      statusText = "مفعّل · " + arNum(state.scheduledCount) + " موعد";
    } else {
      statusText = "مفعّل";
    }

    if (statusPill) {
      statusPill.textContent = statusText;
      statusPill.classList.toggle(
        "is-on",
        native && !!plugin && settings.enabled
      );
    }

    if (headerButton) {
      headerButton.classList.toggle("is-active", settings.enabled);
    }

    var summaryHtml = "";
    if (!native) {
      summaryHtml =
        '<i class="fas fa-mobile-screen-button"></i><span>الأذان في الخلفية يعمل داخل تطبيق أندرويد. في المتصفح تعمل المواقيت فقط.</span>';
    } else if (!settings.enabled) {
      summaryHtml =
        '<i class="fas fa-bell-slash"></i><span>الأذان متوقف — فعّله ليصدح في وقت كل صلاة حتى لو كان التطبيق مغلقاً.</span>';
    } else if (state.nextAlarm) {
      summaryHtml =
        '<i class="fas fa-bell"></i><span>الأذان القادم: <strong>' +
        formatNextAlarm(state.nextAlarm) +
        "</strong></span>";
    } else if (state.lastError) {
      summaryHtml =
        '<i class="fas fa-triangle-exclamation"></i><span>' +
        state.lastError +
        "</span>";
    } else {
      summaryHtml =
        '<i class="fas fa-hourglass-half"></i><span>جاري تجهيز جدول الأذان للأيام القادمة...</span>';
    }

    if (summary) summary.innerHTML = summaryHtml;

    var nextInfo = document.getElementById("adhanNextInfo");
    if (nextInfo) {
      if (!native) {
        nextInfo.innerHTML =
          '<i class="fas fa-circle-info"></i><span>افتح التطبيق على أندرويد لتفعيل المحرك الأصلي للأذان.</span>';
      } else if (state.nextAlarm) {
        nextInfo.innerHTML =
          '<i class="fas fa-clock"></i><span>الموعد القادم: <strong>' +
          formatNextAlarm(state.nextAlarm) +
          "</strong></span>";
      } else if (state.lastError) {
        nextInfo.innerHTML =
          '<i class="fas fa-triangle-exclamation"></i><span>' +
          state.lastError +
          "</span>";
      } else {
        nextInfo.innerHTML =
          '<i class="fas fa-circle-info"></i><span>لا توجد مواعيد مجدولة حالياً.</span>';
      }
    }

    var webNotice = document.getElementById("adhanWebNotice");
    if (webNotice) {
      webNotice.classList.toggle("is-visible", !native);
    }

    var footnote = document.getElementById("adhanFootnote");
    if (footnote) {
      footnote.textContent = native
        ? "التسجيلات الصوتية مضمّنة داخل التطبيق وتعمل بدون إنترنت."
        : "لتشغيل الأذان في الخلفية ثبّت نسخة أندرويد من التطبيق.";
    }
  }

  function render() {
    renderMuezzinList();
    renderPrayerGrid();
    renderStatus();
    updatePermissionUI();
  }

  // ---------------------------------------------------------------------------
  // UI actions
  // ---------------------------------------------------------------------------

  async function setEnabled(enabled) {
    if (!isNativePlatform()) {
      if (enabled) {
        notify(
          "ميزة الأذان في الخلفية تعمل داخل تطبيق أندرويد فقط.",
          "info"
        );
      }
      // Reset the switch: the web build cannot schedule native alarms, so
      // persisting enabled=true here would only mislead the user.
      renderStatus();
      return;
    }

    updateSettings({ enabled: !!enabled });
    renderStatus();

    var plugin = getPlugin();
    if (!plugin) {
      notify("جاري تهيئة محرك الأذان... أعد فتح التطبيق.", "info");
      return;
    }

    if (!enabled) {
      try {
        await plugin.cancelAllAlarms();
      } catch (error) {
        console.warn("[Adhan] cancelAllAlarms failed", error);
      }
      state.nextAlarm = null;
      state.scheduledCount = 0;
      renderStatus();
      notify("تم إيقاف الأذان", "info");
      return;
    }

    try {
      await plugin.requestNotificationPermission();
    } catch (error) {
      console.warn("[Adhan] notification permission request failed", error);
    }

    await refreshPermissions(true);
    var ok = await syncSchedule("enabled");
    if (ok) {
      notify("تم تفعيل الأذان — سيعمل حتى لو أُغلق التطبيق", "success");
    } else {
      notify(
        state.lastError || "تعذر جدولة الأذان. تحقق من الاتصال والموقع.",
        "error"
      );
    }
    render();
  }

  function selectMuezzin(id) {
    if (!MUEZZINS[id]) return;
    updateSettings({ muezzin: id });
    renderMuezzinList();
    renderStatus();
    notify("تم اختيار: " + MUEZZINS[id].name, "success");
    scheduleResync(900);
  }

  function togglePrayer(key) {
    var settings = getSettings();
    if (!Object.prototype.hasOwnProperty.call(settings.prayers, key)) return;
    var next = Object.assign({}, settings.prayers);
    next[key] = !next[key];
    updateSettings({ prayers: next });
    renderPrayerGrid();
    renderStatus();
    scheduleResync(900);
  }

  function setVolume(value) {
    var normalized = clamp(Number(value) / 100, 0.05, 1, 1);
    updateSettings({ volume: normalized });
    var volumeValue = document.getElementById("adhanVolumeValue");
    if (volumeValue)
      volumeValue.textContent = Math.round(normalized * 100) + "%";

    var plugin = getPlugin();
    if (plugin && typeof plugin.setVolume === "function") {
      plugin.setVolume({ volume: normalized }).catch(function () {});
    }

    scheduleResync(1600);
  }

  async function testAdhanNow(seconds) {
    var plugin = getPlugin();
    if (!plugin) {
      notify("تجربة الأذان متاحة داخل تطبيق أندرويد فقط.", "info");
      return;
    }

    var settings = getSettings();
    var muezzin = MUEZZINS[settings.muezzin] || MUEZZINS.makkah;
    var delay = Math.max(1, Number(seconds) || 10);

    try {
      await plugin.requestNotificationPermission();
    } catch (error) {
      /* non-fatal */
    }

    try {
      var result = await plugin.testAdhan({
        delaySeconds: delay,
        soundRes: muezzin.sound,
        prayer: "تجربة",
        volume: settings.volume
      });

      if (result && result.scheduled) {
        notify(
          "سيُشغَّل الأذان بعد " + delay + " ثانية. يمكنك إغلاق التطبيق الآن.",
          "success"
        );
      } else {
        notify("تعذر جدولة تجربة الأذان.", "error");
      }
    } catch (error) {
      console.warn("[Adhan] test failed", error);
      notify("تعذر تشغيل تجربة الأذان.", "error");
    }
  }

  async function testFajrAdhan() {
    var plugin = getPlugin();
    if (!plugin) {
      notify("تجربة الأذان متاحة داخل تطبيق أندرويد فقط.", "info");
      return;
    }
    var settings = getSettings();
    try {
      await plugin.testAdhan({
        delaySeconds: 10,
        soundRes: "adhan_fajr",
        prayer: "الفجر",
        volume: settings.volume
      });
      notify("سيُشغَّل أذان الفجر التجريبي بعد 10 ثوانٍ.", "success");
    } catch (error) {
      notify("تعذر تشغيل تجربة أذان الفجر.", "error");
    }
  }

  async function stopPlayback() {
    var plugin = getPlugin();
    if (!plugin) {
      notify("لا يوجد أذان قيد التشغيل.", "info");
      return;
    }
    try {
      await plugin.stopPlayback();
      notify("تم إيقاف الأذان", "info");
    } catch (error) {
      notify("تعذر إيقاف الأذان.", "error");
    }
  }

  async function resyncNow() {
    if (!isNativePlatform()) {
      notify("إعادة المزامنة تعمل داخل تطبيق أندرويد فقط.", "info");
      return;
    }
    var ok = await syncSchedule("manual");
    await refreshPermissions(true);
    if (ok) {
      notify("تمت مزامنة مواعيد الأذان بنجاح.", "success");
    } else {
      notify(state.lastError || "تعذرت مزامنة مواعيد الأذان.", "error");
    }
  }

  // ---------------------------------------------------------------------------
  // Modal integration
  // ---------------------------------------------------------------------------

  function _closeAdhanInternal() {
    var modal = document.getElementById("adhanModal");
    if (modal) modal.style.display = "none";
    if (
      document.body.style.overflow === "hidden" &&
      (!global.AppRouter || !global.AppRouter.isModalOpen())
    ) {
      document.body.style.overflow = "";
    }
  }

  function openAdhanModal() {
    var modal = document.getElementById("adhanModal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    render();
    if (typeof global.updateThemeSwitcherUI === "function") {
      global.updateThemeSwitcherUI();
    }
    refreshPermissions(true);
    refreshNextAlarm();

    // Sync Azkar Reminder toggle state
    var azkarToggle = document.getElementById("azkarReminderToggle");
    if (azkarToggle && typeof global.isAzkarReminderEnabled === "function") {
      azkarToggle.checked = global.isAzkarReminderEnabled();
    }

    // Show first-launch welcome banner if applicable
    var firstLaunchBanner = document.getElementById("adhanFirstLaunchBanner");
    if (firstLaunchBanner) {
      if (sessionStorage.getItem("tazkeer_is_first_launch") === "true") {
        firstLaunchBanner.style.display = "block";
      } else {
        firstLaunchBanner.style.display = "none";
      }
    }

    if (
      global.AppRouter &&
      typeof global.AppRouter.pushModal === "function" &&
      !global.AppRouter.isModalOpen("adhan")
    ) {
      global.AppRouter.pushModal("adhan", _closeAdhanInternal);
    }
  }

  function closeAdhanModal() {
    if (
      global.AppRouter &&
      typeof global.AppRouter.isModalOpen === "function" &&
      global.AppRouter.isModalOpen("adhan")
    ) {
      global.AppRouter.closeModal("adhan");
    } else {
      _closeAdhanInternal();
    }
  }

  // ---------------------------------------------------------------------------
  // App shell: zoom lockdown, safe areas, status bar, resume hooks
  // ---------------------------------------------------------------------------

  function setupAppLockdown() {
    // Viewport meta already sets user-scalable=no; these guards cover WebView
    // builds that ignore it and iOS Safari.
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (event) {
      document.addEventListener(
        event,
        function (e) {
          e.preventDefault();
        },
        { passive: false }
      );
    });

    document.addEventListener(
      "touchmove",
      function (e) {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // Prevent double-tap to zoom
    var lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
          var tag = e.target && e.target.tagName;
          if (
            tag !== "BUTTON" &&
            tag !== "A" &&
            tag !== "INPUT" &&
            tag !== "TEXTAREA" &&
            tag !== "SELECT"
          ) {
            e.preventDefault();
          }
        }
        lastTouchEnd = now;
      },
      { passive: false }
    );
  }

  function updateStatusBar() {
    if (!isNativePlatform()) return;
    var statusBar =
      global.Capacitor &&
      global.Capacitor.Plugins &&
      global.Capacitor.Plugins.StatusBar;
    if (!statusBar) return;

    var darkMode = document.body.classList.contains("dark-mode");
    try {
      statusBar.setStyle({ style: darkMode ? "LIGHT" : "DARK" });
      statusBar.setBackgroundColor({
        color: darkMode ? "#0b1418" : "#f4f7f5"
      });
    } catch (error) {
      /* non-fatal */
    }
  }

  function setupNativeShell() {
    if (!isNativePlatform()) return;

    document.documentElement.classList.add("capacitor-native");
    document.body.classList.add("capacitor-native");
    document.body.classList.add("is-native-app");

    // Suppress any web install prompts/modals in the native app
    var installBtn = document.getElementById("installBtn");
    if (installBtn) installBtn.classList.add("hidden");
    var installModal = document.getElementById("installInstructionsModal");
    if (installModal) installModal.remove();

    try {
      var statusBar =
        global.Capacitor &&
        global.Capacitor.Plugins &&
        global.Capacitor.Plugins.StatusBar;
      if (statusBar) {
        statusBar.setOverlaysWebView({ overlay: false }).catch(function () {});
        updateStatusBar();
      }
    } catch (error) {
      /* non-fatal */
    }

    try {
      var observer = new MutationObserver(updateStatusBar);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"]
      });
    } catch (error) {
      /* MutationObserver unavailable */
    }

    try {
      var appPlugin =
        global.Capacitor &&
        global.Capacitor.Plugins &&
        global.Capacitor.Plugins.App;
      if (appPlugin && typeof appPlugin.addListener === "function") {
        appPlugin.addListener("appStateChange", function (appState) {
          if (appState && appState.isActive) onResume();
        });
        appPlugin.addListener("appUrlOpen", function (event) {
          var match = event && event.url && event.url.match(/tazkeer:\/\/open\/([^?]+)/);
          if (match && /^tab-(home|azkar|quran|prophets|profile)$/.test(match[1])) {
            if (typeof global.switchTab === "function") global.switchTab(match[1]);
          }
        });
      }
    } catch (error) {
      /* non-fatal */
    }
  }

  function onResume() {
    if (!isNativePlatform()) return;
    render();
    refreshPermissions(true);

    if (!getSettings().enabled) {
      refreshNextAlarm();
      return;
    }

    if (Date.now() - state.lastResumeSync > 60 * 1000) {
      state.lastResumeSync = Date.now();
      syncSchedule("resume");
    } else {
      refreshNextAlarm();
    }
  }

  /**
   * Called by script.js after AlAdhan returns fresh timings.
   * Reconciles the native schedule a few seconds later so the two network
   * calls do not race each other.
   */
  function onPrayerTimesUpdated(timings, city) {
    if (timings && typeof timings === "object") state.fallbackTimings = timings;
    if (!isNativePlatform()) {
      renderStatus();
      return;
    }

    renderStatus();
    if (!getSettings().enabled) return;
    if (Date.now() - state.lastSignal < RESYNC_THROTTLE_MS) return;
    state.lastSignal = Date.now();
    scheduleResync(1200);
  }

  async function getPrayerDays(daysAhead) {
    var location = getLocation();
    var count = Number(daysAhead) || 7;
    return collectDays(location.lat, location.lng, Math.max(1, Math.min(14, count)));
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function init() {
    state.settings = loadSettings();
    setupAppLockdown();
    setupNativeShell();
    render();
    refreshPermissions(true);

    if (isNativePlatform() && getSettings().enabled) {
      // Let the webview settle before doing network + native work.
      setTimeout(function () {
        syncSchedule("app-start");
      }, 900);
    } else {
      refreshNextAlarm();
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) onResume();
    });

    // Reconciliation heartbeat while the UI is open (the native alarm
    // schedule itself does not depend on this).
    setInterval(
      function () {
        if (
          !document.hidden &&
          isNativePlatform() &&
          getSettings().enabled
        ) {
          syncSchedule("heartbeat");
        }
      },
      30 * 60 * 1000
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  var AdhanNative = {
    isNativePlatform: isNativePlatform,
    platformName: platformName,
    getSettings: getSettings,
    updateSettings: updateSettings,
    refresh: render,
    refreshPermissions: refreshPermissions,
    refreshNextAlarm: refreshNextAlarm,
    syncSchedule: syncSchedule,
    getPrayerDays: getPrayerDays,
    onPrayerTimesUpdated: onPrayerTimesUpdated,
    openModal: openAdhanModal,
    closeModal: closeAdhanModal,
    setEnabled: setEnabled,
    selectMuezzin: selectMuezzin,
    togglePrayer: togglePrayer,
    setVolume: setVolume,
    testNow: testAdhanNow,
    testFajr: testFajrAdhan,
    stopPlayback: stopPlayback,
    resync: resyncNow,
    fixPermission: fixPermission,
    formatNextAlarm: formatNextAlarm,
    PRAYERS: PRAYERS,
    MUEZZINS: MUEZZINS
  };

  global.AdhanNative = AdhanNative;

  // Compatibility globals for inline HTML handlers / existing code.
  global.openAdhanModal = openAdhanModal;
  global.closeAdhanModal = closeAdhanModal;
  global.testAdhanNow = testAdhanNow;
  global.stopAdhanPlayback = stopPlayback;
  global.resyncAdhanSchedule = resyncNow;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
