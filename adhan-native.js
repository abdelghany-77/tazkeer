/**
 * tazkeer - Background Adhan Scheduler & Playback Engine (CapacitorJS Native & Web Fallback)
 *
 * Capabilities:
 * - Native Android exact alarms (AlarmManager.setExactAndAllowWhileIdle)
 * - Native ForegroundService media playback (MediaPlayer with AudioFocus and WakeLock)
 * - Notification with interactive "Stop Adhan" action button
 * - Native BootReceiver to restore scheduled alarms on device reboot / timezone change
 * - App-killed and screen-locked full Adhan playback
 * - 7-day upcoming prayer schedule with offline caching
 * - Per-prayer mute/unmute toggles
 * - Multiple muezzin selection (Mishary Alafasy, Abdulbasit, Makkah)
 * - Standard Web Audio and notification fallback for browsers
 */

(function () {
  "use strict";

  // Storage Keys & Channels
  const STORAGE_KEY_SETTINGS = "tazkeer_adhan_settings";
  const STORAGE_KEY_MUEZZIN = "tazkeer_adhan_muezzin";
  const CHANNEL_REGULAR_ID = "adhan_regular_v3";
  const CHANNEL_FAJR_ID = "adhan_fajr_v3";

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
   * Get AdhanScheduler native plugin safely
   */
  function getAdhanSchedulerPlugin() {
    if (isNativePlatform() && window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.AdhanScheduler || null;
    }
    return null;
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
        btn.onclick = () => openAdhanSettingsModal();
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
          btn.onclick = () => openAdhanSettingsModal();
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
    const clean = timeStr.split(" ")[0].trim();
    const parts = clean.split(":");
    if (parts.length < 2) return null;
    return {
      hours: parseInt(parts[0], 10),
      minutes: parseInt(parts[1], 10),
    };
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
  function triggerReschedule() {
    try {
      const cachedDataStr = localStorage.getItem("cachedPrayerTimes");
      const locStr = localStorage.getItem("prayerLocation");
      if (cachedDataStr && locStr) {
        const timings = JSON.parse(cachedDataStr);
        const loc = JSON.parse(locStr);
        schedule7DaysAdhan(
          loc.latitude || 30.0444,
          loc.longitude || 31.2357,
          timings,
        );
      }
    } catch (e) {
      console.warn("[AdhanEngine] Failed to auto-reschedule:", e);
    }
  }

  /**
   * Schedule 7 days of upcoming prayer adhans using Native Exact Alarms
   */
  async function schedule7DaysAdhan(latitude, longitude, todayTimings) {
    console.log("[AdhanEngine] Scheduling upcoming 7 days of Adhan...");

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

    // Attempt to fetch exact monthly calendar for 7-day astronomical accuracy
    let monthlyCalendar = null;
    try {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const res = await fetch(
        `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=5`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.code === 200 && Array.isArray(json.data)) {
          monthlyCalendar = json.data;
        }
      }
    } catch (e) {
      console.warn("[AdhanEngine] Using today's timings projection:", e);
    }

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayOffset,
      );
      let dayTimings = todayTimings;

      if (monthlyCalendar) {
        const dayOfMonth = targetDay.getDate();
        const found = monthlyCalendar.find((d) => {
          const dateObj = d.date && d.date.gregorian;
          return dateObj && parseInt(dateObj.day, 10) === dayOfMonth;
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

        // Backup LocalNotification
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
      } catch (err) {
        console.error("[AdhanEngine] Error scheduling native alarms:", err);
      }
    }

    // 2. Schedule LocalNotifications
    if (localPlugin) {
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
      // On native platform, native AlarmManager and ForegroundService handle playback.
      // Do not duplicate audio in WebView.
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
        <div class="modal-card adhan-settings-card">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fas fa-sliders"></i> إعدادات الأذان والتنبيهات</h3>
            <button class="modal-close-btn" onclick="window.TazkeerAdhan.closeAdhanSettingsModal()">&times;</button>
          </div>
          <div class="modal-body" id="adhanSettingsModalBody">
            <div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> جاري فحص الإعدادات...</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.classList.remove("hidden");
    await renderAdhanSettingsContent();
  }

  /**
   * Close Adhan Settings Modal
   */
  function closeAdhanSettingsModal() {
    const modal = document.getElementById("adhanSettingsModal");
    if (modal) {
      modal.classList.add("hidden");
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

    let nextAlarmInfo = "غير مجدول حالياً";
    const nativePlugin = getAdhanSchedulerPlugin();
    if (nativePlugin) {
      try {
        const alarmsData = await nativePlugin.getScheduledAlarms();
        if (alarmsData && alarmsData.nextAlarm) {
          const nextDate = new Date(alarmsData.nextAlarm.timeMillis);
          nextAlarmInfo = `${alarmsData.nextAlarm.prayerName} - ${nextDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
        }
      } catch (e) {}
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
            <button class="diag-btn secondary" onclick="window.TazkeerAdhan.triggerReschedule(); window.TazkeerAdhan.renderAdhanSettingsContent();">
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
    }

    // Reconcile alarms when the application resumes from background
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[AdhanEngine] App resumed to foreground, reconciling alarms and UI...",
        );
        updateStatusBarUI();
        updateToggleButtonsUI();
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
    renderAdhanSettingsContent,
    setSelectedMuezzin,
    getSelectedMuezzin,
    triggerReschedule,
  };
})();
