const DAILY_LIMIT = 1000;
const REWARD_PER_TAP = 20;
const STORAGE_KEY = "crypto_cash_cc_vip_terminal";
const TELEGRAM_USERNAME = "@managercryptocash";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const fallback = { date: todayKey(), daily: 0, bank: 0 };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    const bank = Number(parsed.bank) || 0;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), daily: 0, bank };
    }
    return {
      date: parsed.date || todayKey(),
      daily: Number(parsed.daily) || 0,
      bank
    };
  } catch {
    return fallback;
  }
}

let state = loadState();

const splash = document.getElementById("splash");
const dailyEl = document.getElementById("daily");
const bankEl = document.getElementById("bank");
const remainingEl = document.getElementById("remaining");
const progressFillEl = document.getElementById("progressFill");
const limitTextEl = document.getElementById("limitText");
const tapBtn = document.getElementById("tapBtn");
const saveBtn = document.getElementById("saveBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const floatersEl = document.getElementById("floaters");

const requestForm = document.getElementById("requestForm");
const nameEl = document.getElementById("name");
const contactEl = document.getElementById("contact");
const directionEl = document.getElementById("direction");
const amountEl = document.getElementById("amount");
const commentEl = document.getElementById("comment");

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function fmt(num) {
  return new Intl.NumberFormat("ru-RU").format(num);
}

function updateUI() {
  dailyEl.textContent = fmt(state.daily);
  bankEl.textContent = fmt(state.bank);

  const remaining = Math.max(0, DAILY_LIMIT - state.daily);
  remainingEl.textContent = fmt(remaining);
  progressFillEl.style.width = Math.min(100, (state.daily / DAILY_LIMIT) * 100) + "%";

  if (state.daily >= DAILY_LIMIT) {
    tapBtn.disabled = true;
    limitTextEl.textContent = "Лимит на сегодня достигнут. Отправь CC в копилку.";
  } else {
    tapBtn.disabled = false;
    limitTextEl.textContent = "Каждый тап даёт " + REWARD_PER_TAP + " CC.";
  }
}

function spawnFloater(text) {
  const item = document.createElement("span");
  item.className = "floater";
  item.textContent = text;
  item.style.setProperty("--x", (Math.floor(Math.random() * 80) - 40) + "px");
  floatersEl.appendChild(item);
  setTimeout(() => item.remove(), 900);
}

tapBtn.addEventListener("click", () => {
  if (state.daily >= DAILY_LIMIT) return;
  state.daily += REWARD_PER_TAP;
  if (state.daily > DAILY_LIMIT) state.daily = DAILY_LIMIT;
  saveState();
  updateUI();
  spawnFloater("+" + REWARD_PER_TAP + " CC");
});

saveBtn.addEventListener("click", () => {
  if (state.daily <= 0) {
    limitTextEl.textContent = "Сначала заработай CC.";
    return;
  }
  state.bank += state.daily;
  state.daily = 0;
  saveState();
  updateUI();
  spawnFloater("В копилку");
});

withdrawBtn.addEventListener("click", () => {
  const text = encodeURIComponent("Хочу обменять накопления CC: " + state.bank + " CC");
  window.open("https://t.me/" + TELEGRAM_USERNAME + "?text=" + text, "_blank");
});

requestForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const lines = [
    "Новая заявка Crypto Cash",
    "Имя: " + (nameEl.value.trim() || "—"),
    "Контакт: " + (contactEl.value.trim() || "—"),
    "Направление: " + directionEl.value,
    "Сумма: " + (amountEl.value.trim() || "—"),
    "Комментарий: " + (commentEl.value.trim() || "—")
  ];
  const text = encodeURIComponent(lines.join("\n"));
  window.open("https://t.me/" + TELEGRAM_USERNAME + "?text=" + text, "_blank");
});

window.addEventListener("load", () => {
  setTimeout(() => splash.classList.add("hidden"), 1600);
});

updateUI();
