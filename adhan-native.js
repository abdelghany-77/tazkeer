/**
 * tazkeer - Background Adhan Scheduler Engine (CapacitorJS Native & Web Fallback)
 *
 * Supports:
 * - Native Android exact alarms (AlarmManager.setExactAndAllowWhileIdle)
 * - Custom high-importance notification channels (sound: res/raw/adhan.mp3, res/raw/adhan_fajr.mp3)
 * - Screen-locked and app-killed playback
 * - 7-day upcoming prayer schedule
 * - Per-prayer mute/unmute toggles
 * - Standard Web Audio fallback for web browsers
 */

(function () {
  "use strict";

  // Constants
  const STORAGE_KEY_SETTINGS = "tazkeer_adhan_settings";
  const CHANNEL_REGULAR_ID = "adhan_regular_channel";
  const CHANNEL_FAJR_ID = "adhan_fajr_channel";

  const PRAYER_NAMES = {
    Fajr: "الفجر",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء",
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
    // Default: all 5 prayers enabled
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
   * Check if adhan is enabled for a specific prayer
   */
  function isAdhanEnabled(prayer) {
    if (prayer === "Sunrise") return false;
    const settings = getAdhanSettings();
    return settings[prayer] !== false;
  }

  /**
   * Get current notification permission status: 'granted' | 'denied' | 'default' | 'unsupported'
   */
  async function getNotificationPermissionStatus() {
    const plugin = getLocalNotificationsPlugin();
    if (plugin) {
      try {
        const check = await plugin.checkPermissions();
        return check.display; // 'granted', 'denied', or 'prompt'
      } catch (e) {
        return "prompt";
      }
    } else if (typeof Notification !== "undefined") {
      return Notification.permission; // 'granted', 'denied', 'default'
    }
    return "unsupported";
  }

  /**
   * Request native or web notification permissions
   */
  async function requestNotificationPermissions() {
    const plugin = getLocalNotificationsPlugin();
    if (plugin) {
      try {
        const check = await plugin.checkPermissions();
        if (check.display !== "granted") {
          const req = await plugin.requestPermissions();
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
   * Update the Compact Adhan Permission Alert in UI
   */
  async function updateStatusBarUI() {
    const bar = document.getElementById("adhanPermMiniBar");
    if (!bar) return;

    const icon = document.getElementById("adhanPermMiniIcon");
    const text = document.getElementById("adhanPermMiniText");
    const btn = document.getElementById("adhanPermMiniBtn");
    const btnText = document.getElementById("adhanPermMiniBtnText");

    if (status === "granted") {
      bar.classList.remove("hidden", "denied");
      bar.classList.add("granted");
      if (icon) icon.className = "fas fa-volume-high";
      if (text) text.textContent = "صوت الأذان مفعّل لجميع الصلوات";
      if (btnText) btnText.textContent = "مفعّل ✓";
      if (btn) {
        btn.className = "adhan-perm-mini-btn active-granted";
        btn.onclick = () =>
          showToast(
            "صوت الأذان مفعّل.. يمكنك كتم أي صلاة من علامة الجرس على بطاقتها",
            "info",
          );
      }
    } else if (status === "denied") {
      bar.classList.remove("hidden");
      bar.classList.add("denied");
      if (icon) icon.className = "fas fa-exclamation-triangle";
      if (text) text.textContent = "الإشعارات محظورة في المتصفح";
      if (btnText) btnText.textContent = "طريقة السماح";
      if (btn) btn.onclick = () => showPermissionHelpModal();
    } else {
      // 'default' or 'prompt'
      bar.classList.remove("hidden", "denied");
      if (icon) icon.className = "fas fa-bell";
      if (text) text.textContent = "تفعيل صوت الأذان";
      if (btnText) btnText.textContent = "تفعيل";
      if (btn) btn.onclick = () => handlePermissionButtonClick();
    }
  }

  /**
   * Handle click on the permission button
   */
  async function handlePermissionButtonClick() {
    const status = await getNotificationPermissionStatus();
    if (status === "granted") {
      showToast("إشعارات الأذان مفعّلة بالفعل على هذا الجهاز", "success");
      await updateStatusBarUI();
      return;
    }
    if (status === "denied") {
      showPermissionHelpModal();
      return;
    }

    // Request permission now from direct user click
    const granted = await requestNotificationPermissions();
    await updateStatusBarUI();

    if (granted) {
      showToast("تم تفعيل إشعارات الأذان بنجاح", "success");
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
        console.warn(e);
      }
    } else {
      const newStatus = await getNotificationPermissionStatus();
      if (newStatus === "denied") {
        showPermissionHelpModal();
      }
    }
  }

  /**
   * Show modal / guidance on how to enable notifications if blocked
   */
  function showPermissionHelpModal() {
    const msg =
      "لتفعيل الأذان التلقائي في المتصفح:\n\n" +
      "1. اضغط على رمز إعدادات الموقع أو علامة القفل بجوار الرابط أعلى الصفحة.\n" +
      "2. اضبط خيار (الإشعارات / Notifications) على (سماح / Allow).\n" +
      "3. أعد تحميل الصفحة ليتم جدولة الأذان تلقائياً في مواقيت الصلاة.";
    alert(msg);
  }

  /**
   * Initialize Android Notification Channels with Custom Raw Audio
   */
  async function setupNotificationChannels() {
    if (channelsInitialized) return true;
    const plugin = getLocalNotificationsPlugin();
    if (!plugin) return false;

    try {
      // 1. Regular Adhan Channel (Dhuhr, Asr, Maghrib, Isha)
      await plugin.createChannel({
        id: CHANNEL_REGULAR_ID,
        name: "أذان الصلوات المفروضة",
        description:
          "صوت الأذان لمواقيت الصلوات الخمس (الظهر، العصر، المغرب، العشاء)",
        sound: "adhan.mp3", // points to res/raw/adhan.mp3
        importance: 5, // NotificationManager.IMPORTANCE_MAX (High priority, pops on screen)
        visibility: 1, // NotificationCompat.VISIBILITY_PUBLIC (Shows on Lockscreen)
        vibration: true,
        lights: true,
        lightColor: "#10B981",
      });

      // 2. Fajr Adhan Channel (Fajr with "الصلاة خير من النوم")
      await plugin.createChannel({
        id: CHANNEL_FAJR_ID,
        name: "أذان صلاة الفجر",
        description: "صوت أذان صلاة الفجر بصوت ندي وبنداء الصلاة خير من النوم",
        sound: "adhan_fajr.mp3", // points to res/raw/adhan_fajr.mp3
        importance: 5, // NotificationManager.IMPORTANCE_MAX
        visibility: 1, // VISIBILITY_PUBLIC
        vibration: true,
        lights: true,
        lightColor: "#10B981",
      });

      channelsInitialized = true;
      console.log(
        "[AdhanEngine] Native notification channels created successfully.",
      );
      return true;
    } catch (err) {
      console.error(
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
   * Schedule 7 days of upcoming prayer adhans using Exact Alarms
   */
  async function schedule7DaysAdhan(latitude, longitude, todayTimings) {
    console.log("[AdhanEngine] Scheduling upcoming 7 days of Adhan...");

    const plugin = getLocalNotificationsPlugin();
    const settings = getAdhanSettings();

    // Ensure permissions and channels
    if (plugin) {
      await requestNotificationPermissions();
      await setupNotificationChannels();
    }

    const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const now = new Date();
    const notificationsToSchedule = [];

    // Attempt to fetch exact monthly calendar for optimal 7-day accuracy
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
      console.warn(
        "[AdhanEngine] Could not fetch calendar, projecting from today timings:",
        e,
      );
    }

    // Build schedule for the upcoming 7 days
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
        // Skip if muted by user
        if (settings[prayer] === false) {
          return;
        }

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

        // Skip if already in the past
        if (prayerDate.getTime() <= now.getTime()) {
          return;
        }

        const isFajr = prayer === "Fajr";
        const prayerNameAr = PRAYER_NAMES[prayer];
        const channelId = isFajr ? CHANNEL_FAJR_ID : CHANNEL_REGULAR_ID;
        const soundFile = isFajr ? "adhan_fajr.mp3" : "adhan.mp3";

        // Unique deterministic 32-bit ID
        const notificationId = (dayOffset + 1) * 100 + prayerIndex;

        const notificationObj = {
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
            allowWhileIdle: true, // Uses AlarmManager.setExactAndAllowWhileIdle natively!
          },
          extra: {
            prayer: prayer,
            dayOffset: dayOffset,
            scheduledTime: prayerDate.toISOString(),
          },
        };

        notificationsToSchedule.push(notificationObj);
      });
    }

    if (plugin) {
      try {
        // Cancel previously scheduled prayer notifications to avoid duplicate alarms
        const pending = await plugin.getPending();
        if (
          pending &&
          pending.notifications &&
          pending.notifications.length > 0
        ) {
          // Cancel any scheduled notifications with ID < 90000 (reserving 99999 for test)
          const idsToCancel = pending.notifications
            .filter((n) => n.id < 90000)
            .map((n) => ({ id: n.id }));

          if (idsToCancel.length > 0) {
            await plugin.cancel({ notifications: idsToCancel });
            console.log(
              `[AdhanEngine] Cancelled ${idsToCancel.length} previous alarms.`,
            );
          }
        }

        if (notificationsToSchedule.length > 0) {
          await plugin.schedule({ notifications: notificationsToSchedule });
          console.log(
            `[AdhanEngine] Successfully scheduled ${notificationsToSchedule.length} native exact alarms.`,
          );
        }
      } catch (err) {
        console.error("[AdhanEngine] Native scheduling error:", err);
      }
    } else {
      console.log(
        `[AdhanEngine] Web environment: ${notificationsToSchedule.length} prayer times registered for countdown.`,
      );
    }

    return notificationsToSchedule.length;
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
      const audioPath = isFajr ? "audio/adhan_fajr.mp3" : "audio/adhan.mp3";
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
      console.error("[AdhanEngine] Audio playback error:", e);
    }
  }

  /**
   * Called automatically when exact prayer time is reached
   */
  function onPrayerTimeReached(prayer) {
    if (prayer === 'Sunrise') return;

    if (!isAdhanEnabled(prayer)) {
      console.log(`[AdhanEngine] Adhan for ${prayer} is muted by user.`);
      return;
    }

    const prayerNameAr = PRAYER_NAMES[prayer] || prayer;
    const isFajr = prayer === 'Fajr';

    console.log(`[AdhanEngine] Prayer time reached: ${prayer}. Triggering Adhan...`);

    // 1. Play audio
    playWebAdhan(isFajr);

    // 2. Web Notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`حان الآن موعد أذان ${prayerNameAr}`, {
          body: isFajr
            ? 'حي على الصلاة، حي على الفلاح (الصلاة خير من النوم)'
            : `حي على الصلاة، حي على الفلاح - صلاة ${prayerNameAr} يرحمكم الله`,
          icon: 'icon.png'
        });
      } catch (e) {
        console.warn('[AdhanEngine] Notification error:', e);
      }
    }

    // 3. User feedback
    showToast(`حان الآن موعد أذان ${prayerNameAr}.. تقبل الله طاعتكم`, 'success');
  }

  // Pre-unlock Web Audio on first user interaction to comply with browser autoplay policy
  let audioUnlocked = false;
  function primeAudio() {
    if (audioUnlocked) return;
    try {
      const silent = new Audio('audio/adhan.mp3');
      silent.volume = 0.01;
      silent.play().then(() => {
        silent.pause();
        silent.currentTime = 0;
        audioUnlocked = true;
        console.log('[AdhanEngine] Web Audio unlocked for auto-play.');
      }).catch(() => {});
    } catch(e) {}
  }
  document.addEventListener('click', primeAudio, { once: true });
  document.addEventListener('touchstart', primeAudio, { once: true });

  /**
   * Stop currently playing Adhan audio
   */
  function stopAdhan() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  /**
   * Test Native Adhan Notification after 5 seconds
   */
  async function testAdhanNotification(isFajr = false) {
    const isGranted = await requestNotificationPermissions();
    if (!isGranted) {
      showToast("يرجى السماح بالإشعارات لتجربة الأذان التلقائي", "warning");
      return;
    }

    const testTime = new Date(Date.now() + 5000);
    const plugin = getLocalNotificationsPlugin();

    if (plugin) {
      await setupNotificationChannels();
      try {
        await plugin.schedule({
          notifications: [
            {
              id: 99999,
              title: isFajr
                ? "تجربة أذان الفجر (ذَكِّرْ)"
                : "تجربة الأذان (ذَكِّرْ)",
              body: "الله أكبر الله أكبر.. يعمل الأذان التلقائي بنجاح حتى والشاشة مقفلة!",
              channelId: isFajr ? CHANNEL_FAJR_ID : CHANNEL_REGULAR_ID,
              sound: isFajr ? "adhan_fajr.mp3" : "adhan.mp3",
              smallIcon: "ic_stat_icon_config_sample",
              iconColor: "#10B981",
              schedule: {
                at: testTime,
                allowWhileIdle: true, // Triggers AlarmManager.setExactAndAllowWhileIdle
              },
            },
          ],
        });

        showToast(
          "🔔 سيعمل الأذان خلال 5 ثوانٍ.. يمكنك قفل الشاشة لاختباره الآن!",
          "success",
        );
      } catch (err) {
        console.error("[AdhanEngine] Native test schedule error:", err);
        showToast("حدث خطأ أثناء جدولة الأذان التجريبي", "error");
      }
    } else {
      // Web Fallback
      showToast("🔔 سيعمل الأذان التجريبي خلال 5 ثوانٍ..", "info");
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
      }, 5000);
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

    // Refresh UI toggle button in prayer cards
    updateToggleButtonsUI();

    // Reschedule alarms with new settings
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
      console.warn("[AdhanEngine] Failed to auto-reschedule on toggle:", e);
    }

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
   * Initialize Engine
   */
  async function init() {
    console.log(
      "[AdhanEngine] Initializing Adhan Engine (Native:",
      isNativePlatform(),
      ")...",
    );

    if (isNativePlatform()) {
      await setupNotificationChannels();

      const plugin = getLocalNotificationsPlugin();
      if (plugin) {
        // Listen to notification clicks/actions
        try {
          plugin.addListener(
            "localNotificationActionPerformed",
            (notification) => {
              console.log("[AdhanEngine] Notification clicked:", notification);
            },
          );
        } catch (e) {
          console.warn("[AdhanEngine] Listener error:", e);
        }
      }
    }

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
    requestNotificationPermissions,
    handlePermissionButtonClick,
    getNotificationPermissionStatus,
    showPermissionHelpModal,
  };
})();
