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

  function _closeQiblaInternal() {
    var modal = document.getElementById("qiblaModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";

    // Detach sensor listeners to save battery
    window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
    window.removeEventListener("deviceorientation", handleOrientation, true);
  }

  function openQiblaModal() {
    var modal = document.getElementById("qiblaModal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Fetch user location coords from SafeStorage/prayerLocation if available
    if (!userLocation) {
      var saved = global.SafeStorage ? global.SafeStorage.getJSON("prayerLocation") : null;
      if (saved && saved.latitude && saved.longitude) {
        userLocation = { lat: saved.latitude, lng: saved.longitude };
      } else {
        userLocation = { lat: 30.0444, lng: 31.2357 }; // Cairo default fallback
      }
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
    updateQiblaStatus("جاري تحديد الموقع...");

    if (!userLocation && navigator.geolocation) {
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
          updateQiblaStatus("يرجى السماح بالوصول للموقع");
          console.warn("[Qibla] Geolocation error:", error);
        }
      );
    } else if (userLocation) {
      displayStaticQibla();
      setupCompass();
    } else {
      updateQiblaStatus("المتصفح لا يدعم تحديد الموقع");
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

    if ("DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
      updateQiblaStatus("البوصلة تعمل - حرّك هاتفك بشكل أفقي");
    } else {
      var dir = Math.round(calculateQiblaDirection());
      updateQiblaStatus("اتجاه القبلة: " + dir + "° من الشمال");
    }
  }

  function handleOrientation(event) {
    var heading;

    if (event.webkitCompassHeading) {
      // iOS
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null && event.alpha !== undefined) {
      // Android
      heading = 360 - event.alpha;
    } else {
      return;
    }

    compassHeading = heading;
    updateCompassDisplay();
  }

  function updateCompassDisplay() {
    var needle = document.getElementById("compassNeedle");
    var degreesEl = document.getElementById("qiblaDegrees");

    if (!needle || !userLocation) return;

    var qiblaDirection = calculateQiblaDirection();
    var rotation = qiblaDirection - compassHeading;

    needle.style.transform = "translate(-50%, -100%) rotate(" + rotation + "deg)";

    if (degreesEl) {
      degreesEl.textContent = Math.round(qiblaDirection) + "°";
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

