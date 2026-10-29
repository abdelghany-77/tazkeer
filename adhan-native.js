/**
 * tazkeer - Background Adhan Scheduler & Playback Engine (CapacitorJS Native & Web Fallback)
 *
 * Capabilities:
 * - Native Android exact alarms (AlarmManager.setExactAndAllowWhileIdle)
 * - Native ForegroundService media playback (MediaPlayer with AudioFocus and WakeLock)
 * - Notification with interactive "Stop Adhan" action button
 * - Native BootReceiver to restore scheduled alarms on device reboot / timezone change
 * - App-killed and screen-locked full Adhan playback
 * - 30-day upcoming prayer schedule with offline caching
 * - Per-prayer mute/unmute toggles
 * - Multiple muezzin selection (Mishary Alafasy, Abdulbasit, Makkah)
 * - Standard Web Audio and notification fallback for browsers
 */

(function () {
  "use strict";

  // Storage Keys & Channels
  const STORAGE_KEY_SETTINGS = "tazkeer_adhan_settings";
  const STORAGE_KEY_MUEZZIN = "tazkeer_adhan_muezzin";
  const CHANNEL_REGULAR_ID = "adhan_regular_v4";
  const CHANNEL_FAJR_ID = "adhan_fajr_v4";
  const SCHEDULE_DAYS = 30;

  const PRAYER_NAMES = {
    Fajr: "الفجر",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء",
  };

  const MUEZZINS = {
    alafasy: {
      id: "alafasy",
      name: "مشاري راشد العفاسي",
      regularSound: "adhan.mp3",
      fajrSound: "adhan_fajr.mp3",
    },
    abdulbasit: {
      id: "abdulbasit",
      name: "عبد الباسط عبد الصمد",
      regularSound: "adhan_abdulbasit.mp3",
      fajrSound: "adhan_fajr.mp3",
    },
    makkah: {
      id: "makkah",
      name: "أذان الحرم المكي الشريف",
      regularSound: "adhan_makkah.mp3",
      fajrSound: "adhan_makkah_fajr.mp3",
    },
  };

  // State
  let currentAudio = null;
  let channelsInitialized = false;
  let exactAlarmWarningShown = false;

  /**
   * Detect if running inside Capacitor native container (Android/iOS)
   */
  function isNativePlatform() {
    return Boolean(
      typeof window !== "undefined" &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform(),
    );
  }

  /**
   * Get AdhanScheduler native plugin safely.
   * Falls back to Capacitor.registerPlugin() for custom plugins that are not
   * listed in capacitor.plugins.json (this plugin is registered from MainActivity).
   */
  let cachedAdhanPlugin = null;
  function getAdhanSchedulerPlugin() {
    if (!isNativePlatform() || !window.Capacitor) return null;

    if (window.Capacitor.Plugins && window.Capacitor.Plugins.AdhanScheduler) {
      return window.Capacitor.Plugins.AdhanScheduler;
    }

    if (!cachedAdhanPlugin && typeof window.Capacitor.registerPlugin === "function") {
      try {
        cachedAdhanPlugin = window.Capacitor.registerPlugin("AdhanScheduler");
      } catch (e) {
        console.warn("[AdhanEngine] Could not register AdhanScheduler plugin:", e);
      }
    }
    return cachedAdhanPlugin || null;
  }

  /**
   * Get LocalNotifications plugin safely
   */
  function getLocalNotificationsPlugin() {
    if (isNativePlatform() && window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.LocalNotifications || null;
    }
    return null;
  }

  /**
   * Get user preferences for prayer adhan
   */
  function getAdhanSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("[AdhanEngine] Error reading adhan settings:", e);
    }
    return {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true,
    };
  }

  /**
   * Save user preferences for prayer adhan
   */
  function saveAdhanSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("[AdhanEngine] Error saving adhan settings:", e);
    }
  }

  /**
   * Get selected Muezzin ID
   */
  function getSelectedMuezzin() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUEZZIN);
      if (saved && MUEZZINS[saved]) {
        return saved;
      }
    } catch (e) {}
    return "alafasy";
  }

  /**
   * Set selected Muezzin ID
   */
  function setSelectedMuezzin(muezzinId) {
    if (!MUEZZINS[muezzinId]) return;
    localStorage.setItem(STORAGE_KEY_MUEZZIN, muezzinId);
    showToast(`تم اختيار صوت: ${MUEZZINS[muezzinId].name}`, "success");

    // Auto reschedule alarms with new muezzin sound
    triggerReschedule();
  }

  /**
   * Check if adhan is enabled for a specific prayer
   */
  function isAdhanEnabled(prayer) {
    if (prayer === "Sunrise") return false;
    const settings = getAdhanSettings();
    return settings[prayer] !== false;
  }

  /**
   * Get permissions summary: notifications, exact alarms, battery optimization
   */
  async function checkDetailedPermissions() {
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      try {
        const perms = await nativePlugin.checkPermissions();
        return {
          platform: "native",
          notifications: perms.notifications || "denied",
          exactAlarm: perms.exactAlarm || "denied",
          canScheduleExact: Boolean(perms.canScheduleExact),
          batteryOptimizationIgnored: Boolean(perms.batteryOptimizationIgnored),
        };
      } catch (err) {
        console.warn("[AdhanEngine] Native checkPermissions error:", err);
      }
    }

    // Web fallback check
    let notif = "unsupported";
    if (typeof Notification !== "undefined") {
      notif = Notification.permission;
    }
    return {
      platform: "web",
      notifications: notif,
      exactAlarm: "unsupported",
      canScheduleExact: false,
      batteryOptimizationIgnored: false,
    };
  }

  /**
   * Get notification permission status
   */
  async function getNotificationPermissionStatus() {
    const perms = await checkDetailedPermissions();
    return perms.notifications;
  }

  /**
   * Request native or web notification permissions
   */
  async function requestNotificationPermissions() {
    const localPlugin = getLocalNotificationsPlugin();
    if (localPlugin) {
      try {
        const check = await localPlugin.checkPermissions();
        if (check.display !== "granted") {
          const req = await localPlugin.requestPermissions();
          return req.display === "granted";
        }
        return true;
      } catch (err) {
        console.error("[AdhanEngine] Native permissions error:", err);
        return false;
      }
    } else if (typeof Notification !== "undefined") {
      try {
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          return perm === "granted";
        }
        return Notification.permission === "granted";
      } catch (e) {
        console.warn("[AdhanEngine] Web Notification error:", e);
        return false;
      }
    }
    return false;
  }

  /**
   * Request Exact Alarm Permission from Android system settings
   */
  async function requestExactAlarmPermission() {
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      const confirmPrompt =
        "يتطلب نظام أندرويد إذناً خاصاً لتشغيل الأذان في موعده بالثانية.\n\n" +
        "سيتم الآن فتح إعدادات الهاتف (المنبهات والتذكيرات / Alarms & Reminders).\n" +
        "يرجى تفعيل خيار 'السماح بضبط المنبهات والتذكيرات' ثم العودة للتطبيق.";

      if (confirm(confirmPrompt)) {
        try {
          await nativePlugin.requestExactAlarmPermission();
        } catch (e) {
          console.error("[AdhanEngine] Error opening exact alarm settings:", e);
        }
      }
    } else {
      showPermissionHelpModal();
    }
  }

  /**
   * Request Battery Optimization Exemption
   */
  async function requestBatteryOptimizationExemption() {
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      const confirmPrompt =
        "لمنع نظام أندرويد من تجميد التطبيق أو إيقاف صوت الأذان في الخلفية:\n\n" +
        "يرجى اختيار 'غير مقيّد / Unrestricted' أو استثناء التطبيق من تحسين البطارية.";

      if (confirm(confirmPrompt)) {
        try {
          await nativePlugin.requestBatteryOptimizationExemption();
        } catch (e) {
          console.error("[AdhanEngine] Error requesting battery exemption:", e);
        }
      }
    }
  }

  /**
   * Update the Compact Adhan Permission Alert in UI
   */
  async function updateStatusBarUI() {
    const bar = document.getElementById("adhanPermMiniBar");
    if (!bar) return;

    const icon = document.getElementById("adhanPermMiniIcon");
    const text = document.getElementById("adhanPermMiniText");
    const btn = document.getElementById("adhanPermMiniBtn");
    const btnText = document.getElementById("adhanPermMiniBtnText");

    const perms = await checkDetailedPermissions();

    if (perms.platform === "native") {
      if (perms.notifications !== "granted") {
        bar.classList.remove("hidden", "granted");
        bar.classList.add("denied");
        if (icon) icon.className = "fas fa-bell-slash";
        if (text) text.textContent = "إشعارات الأذان معطلة";
        if (btnText) btnText.textContent = "سماح";
        if (btn) btn.onclick = () => handlePermissionButtonClick();
        return;
      }

      if (!perms.canScheduleExact) {
        bar.classList.remove("hidden", "granted");
        bar.classList.add("denied");
        if (icon) icon.className = "fas fa-clock";
        if (text) text.textContent = "مطلوب إذن المنبه الدقيق ليعمل بالخلفية";
        if (btnText) btnText.textContent = "تفعيل";
        if (btn) btn.onclick = () => requestExactAlarmPermission();
        return;
      }

      // Everything granted natively
      bar.classList.remove("hidden", "denied");
      bar.classList.add("granted");
      if (icon) icon.className = "fas fa-volume-high";
      if (text) text.textContent = "صوت الأذان";
      if (btnText) btnText.textContent = "مفعّل ✓";
      if (btn) {
        btn.className = "adhan-perm-mini-btn active-granted";
        btn.onclick = () => {
          showToast("صوت وتنبيهات الأذان مفعّلة بنجاح ✓", "info");
        };
      }
    } else {
      // Web platform
      if (perms.notifications === "granted") {
        bar.classList.remove("hidden", "denied");
        bar.classList.add("granted");
        if (icon) icon.className = "fas fa-volume-high";
        if (text) text.textContent = "صوت الأذان";
        if (btnText) btnText.textContent = "مفعّل ✓";
        if (btn) {
          btn.className = "adhan-perm-mini-btn active-granted";
          btn.onclick = () => {
            showToast("صوت وتنبيهات الأذان مفعّلة بنجاح ✓", "info");
          };
        }
      } else if (perms.notifications === "denied") {
        bar.classList.remove("hidden");
        bar.classList.add("denied");
        if (icon) icon.className = "fas fa-exclamation-triangle";
        if (text) text.textContent = "الإشعارات محظورة في المتصفح";
        if (btnText) btnText.textContent = "طريقة السماح";
        if (btn) btn.onclick = () => showPermissionHelpModal();
      } else {
        bar.classList.remove("hidden", "denied");
        if (icon) icon.className = "fas fa-bell";
        if (text) text.textContent = "تفعيل صوت الأذان";
        if (btnText) btnText.textContent = "تفعيل";
        if (btn) btn.onclick = () => handlePermissionButtonClick();
      }
    }
  }

  /**
   * Handle click on the mini permission button
   */
  async function handlePermissionButtonClick() {
    const perms = await checkDetailedPermissions();

    if (perms.notifications !== "granted") {
      const granted = await requestNotificationPermissions();
      await updateStatusBarUI();
      if (!granted) {
        showPermissionHelpModal();
        return;
      }
    }

    if (perms.platform === "native" && !perms.canScheduleExact) {
      await requestExactAlarmPermission();
      await updateStatusBarUI();
      return;
    }

    showToast("صوت الأذان مفعّل بنجاح", "success");
    triggerReschedule();
    await updateStatusBarUI();
  }

  /**
   * Show modal / guidance on how to enable notifications and exact alarms
   */
  function showPermissionHelpModal() {
    if (isNativePlatform()) {
      const msg =
        "لضمان سماع صوت الأذان في موعده بدقة والتطبيق مغلق وشاشة الهاتف مقفلة:\n\n" +
        "1. إعدادات الهاتف > التطبيقات > تطبيق (ذَكِّرْ)\n" +
        "2. الإشعارات: تفعيل السماح بالإشعارات وصوت التنبيه.\n" +
        "3. المنبهات والتذكيرات (Alarms & Reminders): تفعيل السماح بضبط المنبهات الدقيقة.\n" +
        "4. البطارية: اختر (غير مقيّد / Unrestricted) لمنع النظام من تجميد التطبيق في الخلفية.";
      alert(msg);
      return;
    }
    const msg =
      "لتفعيل الأذان التلقائي في المتصفح:\n\n" +
      "1. اضغط على رمز إعدادات الموقع أو علامة القفل بجوار الرابط أعلى المتصفح.\n" +
      "2. اضبط خيار (الإشعارات / Notifications) على (سماح / Allow).\n" +
      "3. أعد تحميل الصفحة ليتم جدولة الأذان تلقائياً في مواقيت الصلاة.\n\n" +
      "ملاحظة: لتشغيل الأذان في الخلفية بشكل موثوق والتطبيق مغلق، يرجى استخدام نسخة تطبيق الأندرويد (APK).";
    alert(msg);
  }

  /**
   * Initialize Android Notification Channels
   */
  async function setupNotificationChannels() {
    if (channelsInitialized) return true;
    const localPlugin = getLocalNotificationsPlugin();
    if (!localPlugin) return false;

    try {
      await localPlugin.createChannel({
        id: CHANNEL_REGULAR_ID,
        name: "أذان الصلوات المفروضة",
        description: "صوت الأذان لمواقيت الصلوات الخمس",
        sound: "adhan.mp3",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#10B981",
      });

      await localPlugin.createChannel({
        id: CHANNEL_FAJR_ID,
        name: "أذان صلاة الفجر",
        description: "صوت أذان صلاة الفجر بنداء الصلاة خير من النوم",
        sound: "adhan_fajr.mp3",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#10B981",
      });

      channelsInitialized = true;
      return true;
    } catch (err) {
      console.warn(
        "[AdhanEngine] Failed to create notification channels:",
        err,
      );
      return false;
    }
  }

  /**
   * Helper: Parse "HH:MM" or "HH:MM (EEST)" into { hours, minutes }
   */
  function parseTimeString(timeStr) {
    if (!timeStr) return null;
    const normalized = String(timeStr).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    const clean = normalized.split(" ")[0].trim();
    const parts = clean.split(":");
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return {
      hours,
      minutes,
    };
  }

  /**
   * Helper: Format Date object to Arabic 12-hour string (e.g. "2:47 م")
   */
  function formatArabicTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "م" : "ص";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  /**
   * Helper: Get cached timings from localStorage or in-memory
   */
  function getCachedTimings() {
    try {
      const cachedDataStr = localStorage.getItem("cachedPrayerTimes");
      if (cachedDataStr) {
        const parsed = JSON.parse(cachedDataStr);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    if (typeof window.prayerTimesData === "object" && window.prayerTimesData) {
      return window.prayerTimesData;
    }
    return null;
  }

  /**
   * Helper: Calculate next upcoming enabled prayer from timings
   */
  function getNextPrayerInfo(settings, timings) {
    if (!timings) return null;
    const now = new Date();
    const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    // 1. Check remaining prayers today
    for (const prayer of prayerKeys) {
      if (settings && settings[prayer] === false) continue;
      const rawTime = timings[prayer];
      const parsed = parseTimeString(rawTime);
      if (!parsed) continue;

      const pDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parsed.hours,
        parsed.minutes,
        0,
        0,
      );

      if (pDate.getTime() > now.getTime()) {
        const prayerNameAr = PRAYER_NAMES[prayer] || prayer;
        return {
          prayerKey: prayer,
          name: `صلاة ${prayerNameAr}`,
          date: pDate,
          isTomorrow: false,
        };
      }
    }

    // 2. If no remaining prayers today, find the first enabled prayer tomorrow
    for (const prayer of prayerKeys) {
      if (settings && settings[prayer] === false) continue;
      const rawTime = timings[prayer];
      const parsed = parseTimeString(rawTime);
      if (!parsed) continue;

      const pDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        parsed.hours,
        parsed.minutes,
        0,
        0,
      );

      const prayerNameAr = PRAYER_NAMES[prayer] || prayer;
      return {
        prayerKey: prayer,
        name: `صلاة ${prayerNameAr} (غداً)`,
        date: pDate,
        isTomorrow: true,
      };
    }

    return null;
  }

  /**
   * Helper: Show toast notification in UI
   */
  function showToast(message, type = "info") {
    if (typeof window.showEnhancedNotification === "function") {
      window.showEnhancedNotification(message, type, 4000);
    } else {
      console.log(`[Toast ${type}]:`, message);
    }
  }

  /**
   * Helper: Trigger recalculation and reschedule from saved prayer times
   */
  async function triggerReschedule() {
    try {
      let timings = getCachedTimings();

      let lat = 30.0444;
      let lng = 31.2357;
      let city = "القاهرة";
      const locStr = localStorage.getItem("prayerLocation");
      if (locStr) {
        try {
          const loc = JSON.parse(locStr);
          if (loc.latitude) lat = loc.latitude;
          if (loc.longitude) lng = loc.longitude;
          if (loc.city) city = loc.city;
        } catch (e) {}
      } else {
        try {
          localStorage.setItem(
            "prayerLocation",
            JSON.stringify({ latitude: lat, longitude: lng, city }),
          );
        } catch (e) {}
      }

      // If timings still not available, trigger fetch
      if (!timings && typeof window.fetchPrayerTimes === "function") {
        await window.fetchPrayerTimes(lat, lng, city);
        timings = getCachedTimings();
      }

      if (timings) {
        return await schedule7DaysAdhan(lat, lng, timings);
      }
    } catch (e) {
      console.warn("[AdhanEngine] Failed to auto-reschedule:", e);
    }
    return 0;
  }

  /**
   * Schedule 30 days of upcoming prayer adhans using Native Exact Alarms
   */
  async function schedule7DaysAdhan(latitude, longitude, todayTimings) {
    console.log("[AdhanEngine] Scheduling upcoming 30 days of Adhan...");

    const nativePlugin = getAdhanSchedulerPlugin();
    const localPlugin = getLocalNotificationsPlugin();
    const settings = getAdhanSettings();
    const selectedMuezzinKey = getSelectedMuezzin();
    const muezzinObj = MUEZZINS[selectedMuezzinKey] || MUEZZINS.alafasy;

    if (localPlugin) {
      await setupNotificationChannels();
    }

    const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const now = new Date();
    const nativeAlarmsList = [];
    const localNotificationsList = [];

    // Attempt to fetch exact monthly calendars covering the whole scheduling
    // window (current month + next 2 months) with a shared timeout.
    let monthlyCalendar = null;
    try {
      const monthsToFetch = [];
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        monthsToFetch.push({
          year: monthDate.getFullYear(),
          month: monthDate.getMonth() + 1,
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const responses = await Promise.all(
        monthsToFetch.map(({ year, month }) =>
          fetch(
            `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=5`,
            { signal: controller.signal },
          )
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null),
        ),
      );
      clearTimeout(timer);

      const combinedCalendar = [];
      for (const json of responses) {
        if (json && json.code === 200 && Array.isArray(json.data)) {
          combinedCalendar.push(...json.data);
        }
      }
      if (combinedCalendar.length > 0) {
        monthlyCalendar = combinedCalendar;
      }
    } catch (e) {
      console.warn("[AdhanEngine] Using today's timings projection (offline / fast fallback):", e);
    }

    for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS; dayOffset++) {
      const targetDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayOffset,
      );
      let dayTimings = todayTimings;

      if (monthlyCalendar) {
        const targetMonth = targetDay.getMonth() + 1;
        const dayOfMonth = targetDay.getDate();
        const found = monthlyCalendar.find((d) => {
          const dateObj = d.date && d.date.gregorian;
          return (
            dateObj &&
            parseInt(dateObj.day, 10) === dayOfMonth &&
            parseInt(dateObj.month && dateObj.month.number, 10) === targetMonth
          );
        });
        if (found && found.timings) {
          dayTimings = found.timings;
        }
      }

      if (!dayTimings) continue;

      prayerKeys.forEach((prayer, prayerIndex) => {
        if (settings[prayer] === false) return; // Muted by user

        const rawTime = dayTimings[prayer];
        const parsed = parseTimeString(rawTime);
        if (!parsed) return;

        const prayerDate = new Date(
          targetDay.getFullYear(),
          targetDay.getMonth(),
          targetDay.getDate(),
          parsed.hours,
          parsed.minutes,
          0,
          0,
        );

        if (prayerDate.getTime() <= now.getTime()) return; // In the past

        const isFajr = prayer === "Fajr";
        const prayerNameAr = PRAYER_NAMES[prayer];
        const soundFile = isFajr
          ? muezzinObj.fajrSound
          : muezzinObj.regularSound;
        const channelId = isFajr ? CHANNEL_FAJR_ID : CHANNEL_REGULAR_ID;
        const notificationId = (dayOffset + 1) * 100 + prayerIndex;

        // Native Alarm item for AlarmManager & ForegroundService
        nativeAlarmsList.push({
          id: notificationId,
          timeMillis: prayerDate.getTime(),
          prayerKey: prayer,
          prayerName: `صلاة ${prayerNameAr}`,
          soundRes: soundFile,
        });

        // LocalNotifications are only a fallback for builds where the native
        // AdhanScheduler plugin is missing. Scheduling them alongside the
        // native alarms would play the adhan twice at the same second.
        if (!nativePlugin) {
          localNotificationsList.push({
            id: notificationId,
            title: `حان الآن موعد أذان ${prayerNameAr}`,
            body: isFajr
              ? "حي على الصلاة، حي على الفلاح (الصلاة خير من النوم)"
              : `حي على الصلاة، حي على الفلاح - صلاة ${prayerNameAr} يرحمكم الله`,
            channelId: channelId,
            sound: soundFile,
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#10B981",
            schedule: {
              at: prayerDate,
              allowWhileIdle: true,
            },
          });
        }
      });
    }

    // 1. Native Scheduling via AdhanScheduler Plugin (ForegroundService + AlarmManager)
    if (nativePlugin) {
      try {
        const res = await nativePlugin.scheduleAlarms({
          alarms: nativeAlarmsList,
        });
        console.log(
          `[AdhanEngine] Native AlarmManager scheduled ${res.scheduledCount} exact alarms.`,
        );

        // Without the exact-alarm permission Android cannot reliably wake the
        // app in the background, so the adhan may be silent when the app is
        // closed. Warn the user once per session.
        const perms = await nativePlugin.checkPermissions();
        if (!perms.canScheduleExact && !exactAlarmWarningShown) {
          exactAlarmWarningShown = true;
          showToast(
            "لسماع الأذان والتطبيق مغلق، فعّل إذن (المنبهات والتذكيرات) من شريط الأذان أعلى الصفحة",
            "warning",
          );
        }
      } catch (err) {
        console.error("[AdhanEngine] Error scheduling native alarms:", err);
      }
    }

    // 2. Schedule LocalNotifications only as a fallback without native alarms
    if (localPlugin && !nativePlugin) {
      try {
        const pending = await localPlugin.getPending();
        if (
          pending &&
          pending.notifications &&
          pending.notifications.length > 0
        ) {
          const idsToCancel = pending.notifications
            .filter((n) => n.id < 90000)
            .map((n) => ({ id: n.id }));
          if (idsToCancel.length > 0) {
            await localPlugin.cancel({ notifications: idsToCancel });
          }
        }
        if (localNotificationsList.length > 0) {
          await localPlugin.schedule({ notifications: localNotificationsList });
        }
      } catch (err) {
        console.warn("[AdhanEngine] LocalNotifications scheduling error:", err);
      }
    }

    return nativeAlarmsList.length;
  }

  /**
   * Play Adhan audio in Web environment
   */
  function playWebAdhan(isFajr = false) {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      const selectedMuezzinKey = getSelectedMuezzin();
      const muezzinObj = MUEZZINS[selectedMuezzinKey] || MUEZZINS.alafasy;
      const audioFileName = isFajr
        ? muezzinObj.fajrSound
        : muezzinObj.regularSound;
      const audioPath = `audio/${audioFileName}`;

      currentAudio = new Audio(audioPath);
      currentAudio
        .play()
        .then(() => {
          showToast("يُرفع الآن صوت الأذان.. تقبل الله طاعتكم", "success");
        })
        .catch((err) => {
          console.warn(
            "[AdhanEngine] Web audio autoplay blocked by browser:",
            err,
          );
          showToast("حان وقت الصلاة (يرجى النقر لتشغيل الأذان)", "warning");
        });
    } catch (e) {
      console.error("[AdhanEngine] Web Audio playback error:", e);
    }
  }

  /**
   * Called automatically when exact prayer time is reached in foreground
   */
  async function onPrayerTimeReached(prayer) {
    if (prayer === "Sunrise") return;
    if (!isAdhanEnabled(prayer)) return;

    // Check if native Android audio is already running via ForegroundService
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      try {
        const res = await nativePlugin.isPlaying();
        if (res && res.isPlaying) {
          console.log(
            "[AdhanEngine] Native Adhan is already playing via ForegroundService.",
          );
          return;
        }
      } catch (e) {}

      // Give the native alarm a moment to launch the foreground service, then
      // re-check. If it still did not start (e.g. the exact-alarm permission
      // was revoked), fall back to WebView playback while the app is visible
      // instead of staying silent.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const res2 = await nativePlugin.isPlaying();
        if (res2 && res2.isPlaying) return;
      } catch (e) {}

      console.warn(
        "[AdhanEngine] Native adhan did not start, falling back to in-app playback.",
      );
      if (document.visibilityState === "visible") {
        playWebAdhan(prayer === "Fajr");
      }
      return;
    }

    // On Web only:
    const prayerNameAr = PRAYER_NAMES[prayer] || prayer;
    const isFajr = prayer === "Fajr";
    console.log(`[AdhanEngine] Web prayer reached: ${prayer}`);
    playWebAdhan(isFajr);

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(`حان الآن موعد أذان ${prayerNameAr}`, {
          body: isFajr
            ? "حي على الصلاة، حي على الفلاح (الصلاة خير من النوم)"
            : `حي على الصلاة، حي على الفلاح - صلاة ${prayerNameAr} يرحمكم الله`,
          icon: "icon.png",
        });
      } catch (e) {}
    }

    showToast(
      `حان الآن موعد أذان ${prayerNameAr}.. تقبل الله طاعتكم`,
      "success",
    );
  }

  /**
   * Prime Web Audio on user gesture to bypass browser autoplay restrictions
   */
  let audioUnlocked = false;
  function primeAudio() {
    if (audioUnlocked) return;
    try {
      const silent = new Audio("audio/adhan.mp3");
      silent.volume = 0.01;
      silent
        .play()
        .then(() => {
          silent.pause();
          silent.currentTime = 0;
          audioUnlocked = true;
          console.log("[AdhanEngine] Web Audio primed for autoplay.");
        })
        .catch(() => {});
    } catch (e) {}
  }
  document.addEventListener("click", primeAudio, { once: true });
  document.addEventListener("touchstart", primeAudio, { once: true });

  /**
   * Stop currently playing Adhan audio (Native + Web)
   */
  async function stopAdhan() {
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      try {
        await nativePlugin.stopPlayback();
      } catch (e) {
        console.warn("[AdhanEngine] Error stopping native Adhan:", e);
      }
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    showToast("تم إيقاف صوت الأذان", "info");
  }

  /**
   * Test Native / Web Adhan Notification after specified seconds
   */
  async function testAdhanNotification(isFajr = false, delaySeconds = 5) {
    const isGranted = await requestNotificationPermissions();
    if (!isGranted) {
      showToast("يرجى السماح بالإشعارات لتجربة الأذان التلقائي", "warning");
      return;
    }

    const nativePlugin = getAdhanSchedulerPlugin();
    const selectedMuezzinKey = getSelectedMuezzin();
    const muezzinObj = MUEZZINS[selectedMuezzinKey] || MUEZZINS.alafasy;
    const soundRes = isFajr ? muezzinObj.fajrSound : muezzinObj.regularSound;

    if (nativePlugin) {
      try {
        await nativePlugin.testAdhan({
          delaySeconds: delaySeconds,
          prayerKey: isFajr ? "Fajr" : "Dhuhr",
          prayerName: isFajr ? "صلاة الفجر" : "صلاة الظهر",
          soundRes: soundRes,
        });

        if (delaySeconds > 0) {
          showToast(
            `🔔 سيبدأ الأذان (${muezzinObj.name}) خلال ${delaySeconds} ثوانٍ.. يمكنك قفل الشاشة لاختباره الآن!`,
            "success",
          );
        } else {
          showToast(`🔔 بدأ تشغيل الأذان (${muezzinObj.name}) الآن`, "success");
        }
        return;
      } catch (err) {
        console.error("[AdhanEngine] Native testAdhan error:", err);
      }
    }

    // Web Fallback
    if (delaySeconds > 0) {
      showToast(
        `🔔 سيبدأ الأذان التجريبي خلال ${delaySeconds} ثوانٍ..`,
        "info",
      );
      setTimeout(() => {
        playWebAdhan(isFajr);
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification("تجربة الأذان (ذَكِّرْ)", {
            body: "الله أكبر الله أكبر.. حان وقت الصلاة",
            icon: "icon.png",
          });
        }
      }, delaySeconds * 1000);
    } else {
      playWebAdhan(isFajr);
    }
  }

  /**
   * Toggle Adhan for a specific prayer
   */
  function toggleAdhan(prayer, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (prayer === "Sunrise") return;

    const settings = getAdhanSettings();
    const newState = !settings[prayer];
    settings[prayer] = newState;
    saveAdhanSettings(settings);

    const prayerNameAr = PRAYER_NAMES[prayer] || prayer;
    if (newState) {
      showToast(`تم تفعيل تنبيه أذان ${prayerNameAr}`, "success");
    } else {
      showToast(`تم كتم أذان ${prayerNameAr}`, "info");
    }

    updateToggleButtonsUI();
    triggerReschedule();
    return newState;
  }

  /**
   * Update all toggle buttons in DOM
   */
  function updateToggleButtonsUI() {
    const settings = getAdhanSettings();
    document.querySelectorAll(".prayer-card[data-prayer]").forEach((card) => {
      const prayer = card.getAttribute("data-prayer");
      if (prayer === "Sunrise") return;

      const isEnabled = settings[prayer] !== false;
      let btn = card.querySelector(".prayer-adhan-btn");

      if (!btn) {
        btn = document.createElement("button");
        btn.className = "prayer-adhan-btn";
        btn.setAttribute("type", "button");
        btn.onclick = (e) => toggleAdhan(prayer, e);
        card.appendChild(btn);
      }

      btn.className = `prayer-adhan-btn ${isEnabled ? "active" : "muted"}`;
      btn.title = isEnabled
        ? `كتم أذان ${PRAYER_NAMES[prayer]}`
        : `تفعيل أذان ${PRAYER_NAMES[prayer]}`;
      btn.setAttribute("aria-label", btn.title);
      btn.innerHTML = `<i class="fas ${isEnabled ? "fa-bell" : "fa-bell-slash"}"></i>`;
    });
  }

  /**
   * Open Adhan Settings & Diagnostics Modal
   */
  async function openAdhanSettingsModal() {
    let modal = document.getElementById("adhanSettingsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "adhanSettingsModal";
      modal.className = "modal-overlay hidden";
      modal.innerHTML = `
        <div class="modal-card adhan-settings-card" role="dialog" aria-modal="true" aria-labelledby="adhanSettingsTitle">
          <div class="modal-header">
            <h3 class="modal-title" id="adhanSettingsTitle"><i class="fas fa-sliders"></i> إعدادات الأذان والتنبيهات</h3>
            <button class="modal-close-btn" type="button" aria-label="إغلاق" onclick="window.TazkeerAdhan.closeAdhanSettingsModal()">&times;</button>
          </div>
          <div class="modal-body" id="adhanSettingsModalBody">
            <div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> جاري فحص الإعدادات...</div>
          </div>
        </div>
      `;

      // Close when clicking outside on the backdrop overlay
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeAdhanSettingsModal();
        }
      });

      document.body.appendChild(modal);
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    await renderAdhanSettingsContent();
  }

  /**
   * Close Adhan Settings Modal
   */
  function closeAdhanSettingsModal() {
    const modal = document.getElementById("adhanSettingsModal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  /**
   * Save settings and close modal
   */
  function saveAndCloseSettings() {
    closeAdhanSettingsModal();
    showToast("تم حفظ إعدادات الأذان بنجاح ✓", "success");
  }

  /**
   * Handle user clicking the "Refresh" (تحديث) button in the modal
   */
  async function handleManualReschedule(btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
    }
    try {
      await triggerReschedule();
      await renderAdhanSettingsContent();
      showToast("تم تحديث مواعيد وجدولة الأذان بنجاح ✓", "success");
    } catch (err) {
      console.error("[AdhanEngine] Manual reschedule error:", err);
      await renderAdhanSettingsContent();
      showToast("حدث خطأ أثناء التحديث، يرجى المحاولة لاحقاً", "error");
    }
  }

  /**
   * Render settings and permission diagnostic details
   */
  async function renderAdhanSettingsContent() {
    const container = document.getElementById("adhanSettingsModalBody");
    if (!container) return;

    const perms = await checkDetailedPermissions();
    const selectedMuezzin = getSelectedMuezzin();
    const settings = getAdhanSettings();
    const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    let nextAlarmInfo = "غير مجدول حالياً";
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      try {
        let alarmsData = await nativePlugin.getScheduledAlarms();
        // If native plugin is available but has 0 scheduled alarms, auto-reschedule once
        if (!alarmsData || !alarmsData.nextAlarm) {
          await triggerReschedule();
          alarmsData = await nativePlugin.getScheduledAlarms();
        }
        if (alarmsData && alarmsData.nextAlarm) {
          const nextDate = new Date(alarmsData.nextAlarm.timeMillis);
          nextAlarmInfo = `${alarmsData.nextAlarm.prayerName} - ${formatArabicTime(nextDate)}`;
        }
      } catch (e) {
        console.warn("[AdhanEngine] Error querying native alarms:", e);
      }
    }

    // Web Fallback or secondary calculation if native plugin not present or returned null
    if (nextAlarmInfo === "غير مجدول حالياً") {
      const timings = getCachedTimings();
      const nextInfo = getNextPrayerInfo(settings, timings);
      if (nextInfo) {
        nextAlarmInfo = `${nextInfo.name} - ${formatArabicTime(nextInfo.date)}`;
      } else {
        const anyEnabled = prayerKeys.some((p) => settings[p] !== false);
        if (!anyEnabled) {
          nextAlarmInfo = "جميع أصوات الأذان مكتومة في الإعدادات";
        }
      }
    }

    const notifGranted = perms.notifications === "granted";
    const exactGranted =
      perms.exactAlarm === "granted" || perms.canScheduleExact;
    const batteryOptimized = perms.batteryOptimizationIgnored;

    container.innerHTML = `
      <div class="adhan-diagnostic-list">
        <!-- Status Row: Notifications -->
        <div class="diag-item">
          <div class="diag-info">
            <span class="diag-label"><i class="fas fa-bell"></i> إذن الإشعارات</span>
            <span class="diag-sub">مطلوب لعرض تنبيه الصلاة على الشاشة</span>
          </div>
          <div class="diag-action">
            ${
              notifGranted
                ? '<span class="status-badge success">مسموح ✓</span>'
                : '<button class="diag-btn warning" onclick="window.TazkeerAdhan.requestNotificationPermissions().then(() => window.TazkeerAdhan.renderAdhanSettingsContent())">تفعيل</button>'
            }
          </div>
        </div>

        <!-- Status Row: Exact Alarms (Android 12+) -->
        ${
          perms.platform === "native"
            ? `
        <div class="diag-item">
          <div class="diag-info">
            <span class="diag-label"><i class="fas fa-clock"></i> المنبهات الدقيقة (Exact Alarms)</span>
            <span class="diag-sub">مطلوب لتشغيل الأذان في موعده بالثانية والتطبيق مغلق</span>
          </div>
          <div class="diag-action">
            ${
              exactGranted
                ? '<span class="status-badge success">مسموح ✓</span>'
                : '<button class="diag-btn warning" onclick="window.TazkeerAdhan.requestExactAlarmPermission()">تفعيل</button>'
            }
          </div>
        </div>

        <!-- Status Row: Battery Optimization -->
        <div class="diag-item">
          <div class="diag-info">
            <span class="diag-label"><i class="fas fa-battery-full"></i> استثناء توفير البطارية</span>
            <span class="diag-sub">لمنع أندرويد من تجميد التطبيق بعد فترة خمول</span>
          </div>
          <div class="diag-action">
            ${
              batteryOptimized
                ? '<span class="status-badge success">غير مقيّد ✓</span>'
                : '<button class="diag-btn secondary" onclick="window.TazkeerAdhan.requestBatteryOptimizationExemption()">ضبط</button>'
            }
          </div>
        </div>
        `
            : ""
        }

        <!-- Status Row: Next Scheduled Alarm -->
        <div class="diag-item highlight">
          <div class="diag-info">
            <span class="diag-label"><i class="fas fa-calendar-check"></i> موعد الأذان القادم</span>
            <span class="diag-sub" id="nextAlarmDisplay">${nextAlarmInfo}</span>
          </div>
          <div class="diag-action">
            <button class="diag-btn secondary" onclick="window.TazkeerAdhan.handleManualReschedule(this)">
              <i class="fas fa-sync-alt"></i> تحديث
            </button>
          </div>
        </div>

        <!-- Muezzin Selection -->
        <div class="muezzin-select-section">
          <label class="muezzin-section-title"><i class="fas fa-microphone"></i> اختيار صوت المؤذن:</label>
          <div class="muezzin-options-grid">
            ${Object.values(MUEZZINS)
              .map(
                (m) => `
              <button type="button" class="muezzin-card-btn ${selectedMuezzin === m.id ? "active" : ""}" 
                      onclick="window.TazkeerAdhan.setSelectedMuezzin('${m.id}'); window.TazkeerAdhan.renderAdhanSettingsContent();">
                <i class="fas ${selectedMuezzin === m.id ? "fa-circle-check" : "fa-circle"}"></i>
                <span>${m.name}</span>
              </button>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- Action Buttons: Test and Stop -->
        <div class="adhan-settings-actions">
          <button type="button" class="test-adhan-btn" onclick="window.TazkeerAdhan.testAdhanNotification(false, 5)">
            <i class="fas fa-play"></i> تجربة الأذان (بعد 5 ثوانٍ)
          </button>
          <button type="button" class="stop-adhan-btn" onclick="window.TazkeerAdhan.stopAdhan()">
            <i class="fas fa-stop"></i> إيقاف الأذان
          </button>
        </div>

        <!-- Save Button -->
        <button type="button" class="save-adhan-settings-btn" onclick="window.TazkeerAdhan.saveAndCloseSettings()">
          <i class="fas fa-check-circle"></i> حفظ الإعدادات
        </button>
      </div>
    `;
  }

  /**
   * Initialize Engine
   */
  async function init() {
    console.log(
      "[AdhanEngine] Initializing Native Background Adhan Engine (Platform:",
      isNativePlatform() ? "Android Native" : "Web",
      ")...",
    );

    if (isNativePlatform()) {
      await setupNotificationChannels();

      const localPlugin = getLocalNotificationsPlugin();
      if (localPlugin) {
        try {
          localPlugin.addListener(
            "localNotificationActionPerformed",
            (notification) => {
              console.log("[AdhanEngine] Notification clicked:", notification);
            },
          );
        } catch (e) {}
      }

      // Cancel notifications scheduled by older builds, which fired in
      // addition to the native foreground service and played the adhan twice.
      const nativePlugin = getAdhanSchedulerPlugin();
      if (nativePlugin && localPlugin) {
        try {
          const pending = await localPlugin.getPending();
          const legacyIds = (pending.notifications || [])
            .filter((n) => n.id < 90000)
            .map((n) => ({ id: n.id }));
          if (legacyIds.length > 0) {
            await localPlugin.cancel({ notifications: legacyIds });
          }
        } catch (e) {
          console.warn(
            "[AdhanEngine] Error clearing legacy local notifications:",
            e,
          );
        }
      }
    }

    // Reconcile alarms when the application resumes from background
    let lastResumeReschedule = 0;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AdhanEngine] App resumed to foreground, reconciling alarms and UI...",
        );
        updateStatusBarUI();
        updateToggleButtonsUI();

        // Re-register the upcoming alarms (throttled) so a schedule that was
        // lost while the app was killed / force-stopped is restored immediately.
        const nowTs = Date.now();
        if (nowTs - lastResumeReschedule > 60000) {
          lastResumeReschedule = nowTs;
          triggerReschedule();
        }
      }
    });

    // Observe prayer grid updates to attach toggles
    const grid = document.getElementById("prayerTimesGrid");
    if (grid) {
      const observer = new MutationObserver(() => {
        updateToggleButtonsUI();
      });
      observer.observe(grid, { childList: true });
    }

    updateToggleButtonsUI();
    updateStatusBarUI();

    // Close settings modal on Escape key press
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAdhanSettingsModal();
      }
    });

    // Auto-schedule on startup from cached prayer times
    triggerReschedule();
  }

  // Auto-init on DOMContentLoaded or immediate if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose global API
  window.TazkeerAdhan = {
    isNativePlatform,
    isAdhanEnabled,
    toggleAdhan,
    schedule7DaysAdhan,
    testAdhanNotification,
    playWebAdhan,
    onPrayerTimeReached,
    stopAdhan,
    updateToggleButtonsUI,
    updateStatusBarUI,
    checkDetailedPermissions,
    requestNotificationPermissions,
    requestExactAlarmPermission,
    requestBatteryOptimizationExemption,
    handlePermissionButtonClick,
    getNotificationPermissionStatus,
    showPermissionHelpModal,
    openAdhanSettingsModal,
    closeAdhanSettingsModal,
    saveAndCloseSettings,
    renderAdhanSettingsContent,
    setSelectedMuezzin,
    getSelectedMuezzin,
    triggerReschedule,
    handleManualReschedule,
    getNextPrayerInfo,
    formatArabicTime,
    getCachedTimings,
  };
})();
