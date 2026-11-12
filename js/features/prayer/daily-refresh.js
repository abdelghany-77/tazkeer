(function (global) {
  "use strict";

  var timer = null;
  var refreshCallback = null;
  var started = false;
  var lastDateKey = null;

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function checkDate() {
    if (!refreshCallback) return;
    var today = dateKey(new Date());
    if (lastDateKey === null) {
      lastDateKey = today;
      return;
    }
    if (today !== lastDateKey) {
      lastDateKey = today;
      refreshCallback("new-local-day");
    }
  }

  function scheduleNextMidnight() {
    if (timer !== null) global.clearTimeout(timer);
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
    timer = global.setTimeout(function () {
      checkDate();
      scheduleNextMidnight();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }

  function start(callback) {
    if (typeof callback !== "function") return;
    refreshCallback = callback;
    lastDateKey = dateKey(new Date());
    scheduleNextMidnight();
    if (started) return;
    started = true;
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkDate();
    });
  }

  global.PrayerDailyRefresh = {
    start: start,
    check: checkDate,
    stop: function () {
      if (timer !== null) global.clearTimeout(timer);
      timer = null;
      started = false;
      refreshCallback = null;
      lastDateKey = null;
    }
  };
})(window);
