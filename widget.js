// Widget Daily Dhikr Data
const widgetAdhkar = [
  {
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    source: "البخاري ومسلم",
    fadl: "كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن",
    count: 10,
  },
  {
    text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    source: "البخاري ومسلم",
    fadl: "من قالها عشر مرات كُتب له بها مائة حسنة، ومُحي عنه بها مائة سيئة",
    count: 10,
  },
  {
    text: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ، الْحَيُّ الْقَيُّومُ، وَأَتُوبُ إِلَيْهِ",
    source: "أبو داود والترمذي",
    fadl: "من قالها غُفر له وإن كان فر من الزحف",
    count: 3,
  },
  {
    text: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    source: "البخاري ومسلم",
    fadl: "من صلى على النبي صلاة صلى الله عليه بها عشراً",
    count: 10,
  },
  {
    text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    source: "البخاري ومسلم",
    fadl: "كنز من كنوز الجنة",
    count: 10,
  },
  {
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    source: "صحيح مسلم",
    fadl: "تسبيح عظيم أجره لا يُحصى",
    count: 3,
  },
  {
    text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    source: "النسائي",
    fadl: "دعاء الاستغاثة بالحي القيوم، من دعا به أُصلح شأنه كله",
    count: 3,
  },
];

// Widget State
let widgetState = {
  currentZikr: null,
  currentCount: 0,
  dailyIndex: 0,
};

// Initialize widget
document.addEventListener("DOMContentLoaded", function () {
  loadDailyZikr();
  setupWidgetEvents();
});

function loadDailyZikr() {
  // Get daily zikr based on date
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  widgetState.dailyIndex = dayOfYear % widgetAdhkar.length;
  widgetState.currentZikr = widgetAdhkar[widgetState.dailyIndex];

  // Load saved progress for today
  const savedDate = localStorage.getItem("widgetDate");
  const savedCount = localStorage.getItem("widgetCount");

  if (savedDate === today.toDateString() && savedCount) {
    widgetState.currentCount = parseInt(savedCount);
  } else {
    widgetState.currentCount = 0;
    localStorage.setItem("widgetDate", today.toDateString());
    localStorage.setItem("widgetCount", "0");
  }

  updateWidgetDisplay();
}

function setupWidgetEvents() {
  const countBtn = document.getElementById("widgetCountBtn");
  if (countBtn) {
    countBtn.addEventListener("click", incrementWidgetCount);
  }
}

function incrementWidgetCount() {
  if (widgetState.currentCount >= widgetState.currentZikr.count) {
    return;
  }

  widgetState.currentCount++;
  localStorage.setItem("widgetCount", widgetState.currentCount.toString());

  updateWidgetDisplay();

  // Vibration feedback
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }

  // Button animation
  const btn = document.getElementById("widgetCountBtn");
  if (btn) {
    btn.style.transform = "scale(0.9)";
    setTimeout(() => {
      btn.style.transform = "scale(1)";
    }, 150);
  }

  // Check completion
  if (widgetState.currentCount === widgetState.currentZikr.count) {
    const btn = document.getElementById("widgetCountBtn");
    if (btn) {
      btn.classList.add("completed");
      btn.innerHTML = '<i class="fas fa-check"></i>';
    }
  }
}

function updateWidgetDisplay() {
  const zikrEl = document.getElementById("widgetZikr");
  const sourceEl = document.getElementById("widgetSource");
  const fadlEl = document.getElementById("widgetFadl");
  const countEl = document.getElementById("widgetCount");
  const countBtn = document.getElementById("widgetCountBtn");

  if (widgetState.currentZikr) {
    if (zikrEl) zikrEl.textContent = widgetState.currentZikr.text;
    if (sourceEl) sourceEl.textContent = widgetState.currentZikr.source;
    if (fadlEl) fadlEl.textContent = widgetState.currentZikr.fadl;
    if (countEl)
      countEl.textContent = `${widgetState.currentCount} / ${widgetState.currentZikr.count}`;

    if (widgetState.currentCount >= widgetState.currentZikr.count) {
      if (countBtn) {
        countBtn.classList.add("completed");
        countBtn.innerHTML = '<i class="fas fa-check"></i>';
      }
    }
  }
}

// Embed code generator for external sites
function getEmbedCode() {
  return `<iframe 
    src="https://abdelghany-77.github.io/tazkeer/widget.html" 
    width="100%" 
    height="400" 
    frameborder="0" 
    style="border-radius: 20px; max-width: 400px;">
  </iframe>`;
}
