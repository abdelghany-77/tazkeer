/**
 * ====================================================================
 * Qibla Module — Compass & Kaaba Direction Finder for ذَكِّرْ
 * ====================================================================
 * - Calculates precise Qibla degree using Great-Circle bearing formula
 * - Integrates with DeviceOrientation API (Gyroscope / Magnetometer)
 * - Calibrated with iOS & Android orientation angle normalization
 * - History API & Hardware Back Button integration via AppRouter
 */

(function (global) {
  "use strict";

  var KAABA_LAT = 21.4225;
  var KAABA_LNG = 39.8262;
  var compassHeading = 0;
  var userLocation = null;
  var nativeCompassListener = null;
  var currentNeedleAngle = null;
  var lastHapticAligned = false;

  function _closeQiblaInternal() {
    var modal = document.getElementById("qiblaModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";

    // 1. Detach native compass listener
    if (
      global.Capacitor &&
      global.Capacitor.isNativePlatform &&
      global.Capacitor.isNativePlatform() &&
      global.Capacitor.Plugins &&
      global.Capacitor.Plugins.AdhanScheduler
    ) {
      try {
        if (typeof global.Capacitor.Plugins.AdhanScheduler.stopCompass === "function") {
          global.Capacitor.Plugins.AdhanScheduler.stopCompass();
        }
      } catch (e) {}
    }

    if (nativeCompassListener && typeof nativeCompassListener.remove === "function") {
      try {
        nativeCompassListener.remove();
      } catch (e) {}
      nativeCompassListener = null;
    }

    // 2. Detach web sensor listeners
    window.removeEventListener("deviceorientationabsolute", handleOrientationAbsolute, true);
    window.removeEventListener("deviceorientation", handleOrientationStandard, true);
  }

  function openQiblaModal() {
    var modal = document.getElementById("qiblaModal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Always fetch latest user location coords from storage or Cairo default
    var saved = null;
    if (global.SafeStorage && typeof global.SafeStorage.getJSON === "function") {
      saved = global.SafeStorage.getJSON("prayerLocation");
    }
    if (!saved) {
      try {
        var raw = localStorage.getItem("prayerLocation");
        if (raw) saved = JSON.parse(raw);
      } catch (e) {}
    }
    if (saved && saved.latitude && saved.longitude) {
      userLocation = { lat: parseFloat(saved.latitude), lng: parseFloat(saved.longitude) };
    } else {
      userLocation = { lat: 30.0444, lng: 31.2357 }; // Cairo default fallback
    }

    displayStaticQibla();
    setupCompass();

    // Register with AppRouter for Hardware Back Button handling
    if (global.AppRouter) {
      global.AppRouter.pushModal("qibla", _closeQiblaInternal);
    }
  }

  function closeQiblaModal() {
    if (global.AppRouter && global.AppRouter.isModalOpen("qibla")) {
      global.AppRouter.closeModal("qibla");
    } else {
      _closeQiblaInternal();
    }
  }

  function initializeQiblaCompass() {
    var calibrateBtn = document.getElementById("qiblaCalibrateBtn");
    if (calibrateBtn) {
      calibrateBtn.addEventListener("click", requestQiblaPermissions);
    }
  }

  function requestQiblaPermissions() {
    updateQiblaStatus("جاري تحديد الموقع بدقة ومعايرة البوصلة...");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          displayStaticQibla();

          if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
          ) {
            // iOS 13+ permission flow
            DeviceOrientationEvent.requestPermission()
              .then(function (response) {
                if (response === "granted") {
                  setupCompass();
                } else {
                  updateQiblaStatus("اتجاه القبلة: " + Math.round(calculateQiblaDirection()) + "° من الشمال");
                }
              })
              .catch(function () {
                updateQiblaStatus("اتجاه القبلة: " + Math.round(calculateQiblaDirection()) + "° من الشمال");
              });
          } else {
            setupCompass();
          }
        },
        function (error) {
          displayStaticQibla();
          setupCompass();
          console.warn("[Qibla] Geolocation error:", error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      displayStaticQibla();
      setupCompass();
    }
  }

  function calculateQiblaDirection() {
    if (!userLocation) return 136; // Default Cairo

    var lat1 = userLocation.lat * (Math.PI / 180);
    var lng1 = userLocation.lng * (Math.PI / 180);
    var lat2 = KAABA_LAT * (Math.PI / 180);
    var lng2 = KAABA_LNG * (Math.PI / 180);

    var dLng = lng2 - lng1;

    var x = Math.sin(dLng) * Math.cos(lat2);
    var y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    var qibla = Math.atan2(x, y) * (180 / Math.PI);
    qibla = (qibla + 360) % 360;

    return qibla;
  }

  function setupCompass() {
    displayStaticQibla();
    currentNeedleAngle = null;
    lastHapticAligned = false;

    // 1. Try Native Capacitor Hardware Compass Plugin
    if (
      global.Capacitor &&
      global.Capacitor.isNativePlatform &&
      global.Capacitor.isNativePlatform() &&
      global.Capacitor.Plugins &&
      global.Capacitor.Plugins.AdhanScheduler &&
      typeof global.Capacitor.Plugins.AdhanScheduler.startCompass === "function"
    ) {
      try {
        var plugin = global.Capacitor.Plugins.AdhanScheduler;
        plugin.startCompass();

        if (!nativeCompassListener) {
          plugin.addListener("compassHeading", function (data) {
            if (data && typeof data.heading === "number") {
              compassHeading = data.heading;
              updateCompassDisplay();
            }
          }).then(function (listener) {
            nativeCompassListener = listener;
          });
        }

        updateQiblaStatus("البوصلة تعمل بالحساسات الأصلية - حرّك هاتفك بشكل أفقي");
        return;
      } catch (e) {
        console.warn("[Qibla] Native compass initialization error:", e);
      }
    }

    // 2. Web fallback (Browser / iOS)
    if ("DeviceOrientationEvent" in window) {
      if ("ondeviceorientationabsolute" in window) {
        window.addEventListener("deviceorientationabsolute", handleOrientationAbsolute, true);
      } else {
        window.addEventListener("deviceorientation", handleOrientationStandard, true);
      }
      updateQiblaStatus("البوصلة تعمل - حرّك هاتفك بشكل أفقي");
    } else {
      var dir = Math.round(calculateQiblaDirection());
      updateQiblaStatus("اتجاه القبلة: " + dir + "° من الشمال");
    }
  }

  function handleOrientationAbsolute(event) {
    if (event.alpha !== null && event.alpha !== undefined) {
      // 0 = North, 90 = West in deviceorientationabsolute on Android
      compassHeading = (360 - event.alpha) % 360;
      updateCompassDisplay();
    }
  }

  function handleOrientationStandard(event) {
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      // iOS webkitCompassHeading: 0 = North, 90 = East
      compassHeading = event.webkitCompassHeading;
      updateCompassDisplay();
    } else if (event.alpha !== null && event.alpha !== undefined && event.absolute) {
      compassHeading = (360 - event.alpha) % 360;
      updateCompassDisplay();
    }
  }

  function updateCompassDisplay() {
    var needle = document.getElementById("compassNeedle");
    var degreesEl = document.getElementById("qiblaDegrees");
    var statusEl = document.getElementById("qiblaStatus");

    if (!needle || !userLocation) return;

    var qiblaDirection = calculateQiblaDirection();
    var targetRotation = qiblaDirection - compassHeading;

    // Normalize to range [0, 360)
    targetRotation = ((targetRotation % 360) + 360) % 360;

    // Smooth shortest angular distance interpolation
    if (currentNeedleAngle === null) {
      currentNeedleAngle = targetRotation;
    } else {
      var diff = ((targetRotation - currentNeedleAngle) % 360);
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      currentNeedleAngle += diff;
    }

    needle.style.transform = "translate(-50%, -100%) rotate(" + currentNeedleAngle + "deg)";

    if (degreesEl) {
      degreesEl.textContent = Math.round(qiblaDirection) + "°";
    }

    // Alignment detection: check if needle points straight UP (within +/- 8 deg)
    var alignmentOffset = Math.abs(((currentNeedleAngle % 360) + 540) % 360 - 180);
    var isAligned = alignmentOffset <= 8;

    if (statusEl) {
      if (isAligned) {
        statusEl.innerHTML = '<span style="color:#10b981;font-weight:bold;">🕋 أنت الآن تواجه القبلة الشريفة تماماً!</span>';
        if (!lastHapticAligned) {
          lastHapticAligned = true;
          if (
            global.Capacitor &&
            global.Capacitor.Plugins &&
            global.Capacitor.Plugins.Haptics
          ) {
            try {
              global.Capacitor.Plugins.Haptics.vibrate({ duration: 150 });
            } catch (e) {}
          } else if (navigator.vibrate) {
            try { navigator.vibrate(150); } catch (e) {}
          }
        }
      } else {
        lastHapticAligned = false;
        statusEl.textContent = "وجّه هاتفك نحو الكعبة المشرفة (" + Math.round(qiblaDirection) + "°)";
      }
    }
  }

  function displayStaticQibla() {
    if (!userLocation) return;

    var qiblaDirection = calculateQiblaDirection();
    var degreesEl = document.getElementById("qiblaDegrees");
    var needle = document.getElementById("compassNeedle");

    if (degreesEl) {
      degreesEl.textContent = Math.round(qiblaDirection) + "°";
    }

    if (needle) {
      currentNeedleAngle = qiblaDirection;
      needle.style.transform = "translate(-50%, -100%) rotate(" + qiblaDirection + "deg)";
    }
  }

  function updateQiblaStatus(message) {
    var statusEl = document.getElementById("qiblaStatus");
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function scrollToQibla() {
    openQiblaModal();
  }

  // Global exports for HTML inline bindings
  global.initializeQiblaCompass = initializeQiblaCompass;
  global.openQiblaModal = openQiblaModal;
  global.closeQiblaModal = closeQiblaModal;
  global.requestQiblaPermissions = requestQiblaPermissions;
  global.calculateQiblaDirection = calculateQiblaDirection;
  global.displayStaticQibla = displayStaticQibla;
  global.updateQiblaStatus = updateQiblaStatus;
  global.scrollToQibla = scrollToQibla;
})(typeof window !== "undefined" ? window : this);

