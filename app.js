const DAILY_LIMIT = 1000;
const REWARD_PER_TAP = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "crypto_cash_binance_ui_logo_fix_working";

let tg = null;
let state = { windowStart: 0, daily: 0, bank: 0 };

const particles = [];
let canvas, ctx, tapBtn, floatersEl;

document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  state = loadState();
  normalizeWindow(true);

  const dailyEl = document.getElementById("daily");
  const bankEl = document.getElementById("bank");
  const remainingEl = document.getElementById("remaining");
  const progressFillEl = document.getElementById("progressFill");
  const limitTextEl = document.getElementById("limitText");
  tapBtn = document.getElementById("tapBtn");
  const saveBtn = document.getElementById("saveBtn");
  const withdrawBtn = document.getElementById("withdrawBtn");
  const requestForm = document.getElementById("requestForm");
  const nameEl = document.getElementById("name");
  const directionEl = document.getElementById("direction");
  const amountEl = document.getElementById("amount");
  const commentEl = document.getElementById("comment");
  floatersEl = document.getElementById("floaters");
  const successBox = document.getElementById("successBox");
  const cooldownTimeEl = document.getElementById("cooldownTime");
  const clientNameTopEl = document.getElementById("clientNameTop");
  const clientIdTopEl = document.getElementById("clientIdTop");
  const clientAvatarEl = document.getElementById("clientAvatar");
  const dailyUsdEl = document.getElementById("dailyUsd");
  const bankUsdEl = document.getElementById("bankUsd");

  canvas = document.getElementById("sparkCanvas");
  ctx = canvas.getContext("2d");
  setupCanvas();
  window.addEventListener("resize", setupCanvas);
  requestAnimationFrame(loopParticles);

  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function fmt(n) { return new Intl.NumberFormat("ru-RU").format(n); }
  function ccToUsd(cc) { return (Number(cc || 0) / 1000 * 0.1).toFixed(3); }
  function totalCC() { return (Number(state.bank) || 0) + (Number(state.daily) || 0); }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function nextResetIn() {
    return Math.max(0, (state.windowStart + WINDOW_MS) - Date.now());
  }

  function normalizeWindow(forceSave = false) {
    if (!state.windowStart) {
      state.windowStart = Date.now();
      forceSave = true;
    }
    if (Date.now() >= state.windowStart + WINDOW_MS) {
      state.windowStart = Date.now();
      state.daily = 0;
      forceSave = true;
    }
    if (state.daily > DAILY_LIMIT) {
      state.daily = DAILY_LIMIT;
      forceSave = true;
    }
    if (forceSave) saveState();
  }

  function fillProfile() {
    const fallbackName = "Клиент";
    const fallbackId = "ID: —";

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const user = tg.initDataUnsafe.user;
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || fallbackName;
      const username = user.username ? "@" + user.username : fullName;
      clientNameTopEl.textContent = username;
      clientIdTopEl.textContent = `ID: ${user.id}`;
      clientAvatarEl.textContent = (user.first_name || fullName || "C").slice(0, 1).toUpperCase();
      if (!nameEl.value && fullName) nameEl.value = fullName;
    } else {
      clientNameTopEl.textContent = fallbackName;
      clientIdTopEl.textContent = fallbackId;
      clientAvatarEl.textContent = "C";
    }
  }

  function updateUI() {
    normalizeWindow();

    dailyEl.textContent = fmt(state.daily);
    bankEl.textContent = fmt(state.bank);
    dailyUsdEl.textContent = `≈ ${ccToUsd(state.daily)} USD`;
    bankUsdEl.textContent = `≈ ${ccToUsd(state.bank)} USD`;

    const rem = Math.max(0, DAILY_LIMIT - state.daily);
    remainingEl.textContent = fmt(rem);
    progressFillEl.style.width = `${Math.min(100, (state.daily / DAILY_LIMIT) * 100)}%`;
    cooldownTimeEl.textContent = formatDuration(nextResetIn());

    if (state.daily >= DAILY_LIMIT) {
      tapBtn.disabled = true;
      limitTextEl.textContent = "Лимит 1000 CC исчерпан. Тап снова будет доступен только через 24 часа.";
    } else {
      tapBtn.disabled = false;
      limitTextEl.textContent = "Жёсткий лимит: 1000 CC на каждые 24 часа.";
    }
  }

  function sendPayload(payload) {
    if (!tg) {
      alert("Mini app открыт не как Telegram WebApp. Открой его через кнопку бота /start.");
      return false;
    }
    try {
      tg.sendData(JSON.stringify(payload));
      return true;
    } catch (e) {
      alert("Не удалось отправить данные в бота.");
      return false;
    }
  }

  function spawnFloater(x, y, text) {
    const el = document.createElement("span");
    el.className = "floater";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--x", `${Math.floor(Math.random() * 80) - 40}px`);
    floatersEl.appendChild(el);
    setTimeout(() => el.remove(), 920);
  }

  function emitSparks(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.2;
      const speed = 1.5 + Math.random() * 2.8;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        life: 1,
        size: 1.6 + Math.random() * 2.2
      });
    }
  }

  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loopParticles() {
    if (!ctx || !canvas) {
      requestAnimationFrame(loopParticles);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= 0.02;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(247, 215, 119, ${Math.max(0, p.life)})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(loopParticles);
  }

  fillProfile();

  tapBtn.addEventListener("click", (e) => {
    normalizeWindow();
    if (state.daily >= DAILY_LIMIT) {
      updateUI();
      return;
    }

    const before = state.daily;
    state.daily = Math.min(DAILY_LIMIT, state.daily + REWARD_PER_TAP);
    const gained = state.daily - before;
    if (gained <= 0) return;

    if (navigator.vibrate) navigator.vibrate([15, 20, 15]);

    tapBtn.classList.add("pressed");
    setTimeout(() => tapBtn.classList.remove("pressed"), 120);

    const zoneRect = canvas.getBoundingClientRect();
    const x = e.clientX - zoneRect.left;
    const y = e.clientY - zoneRect.top;

    emitSparks(x, y);
    spawnFloater(x, y, `+${gained} CC`);

    saveState();
    updateUI();
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
  });

  withdrawBtn.addEventListener("click", () => {
    const total = totalCC();
    const ok = sendPayload({
      type: "cc_withdraw_request",
      total_cc: total,
      bank_cc: state.bank,
      daily_cc: state.daily,
      usd_value: (total / 1000 * 0.1).toFixed(3)
    });
    if (ok && tg) tg.close();
  });

  requestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const total = totalCC();
    const ok = sendPayload({
      type: "exchange_request",
      name: nameEl.value.trim() || "—",
      direction: directionEl.value,
      amount: amountEl.value.trim() || "—",
      comment: commentEl.value.trim() || "—",
      bank_cc: state.bank,
      daily_cc: state.daily,
      total_cc: total,
      usd_value: (total / 1000 * 0.1).toFixed(3)
    });
    if (ok) {
      successBox.classList.remove("hidden");
      setTimeout(() => successBox.classList.add("hidden"), 2500);
      if (tg) tg.close();
    }
  });

  updateUI();
  setInterval(updateUI, 1000);
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { windowStart: Date.now(), daily: 0, bank: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      windowStart: Number(parsed.windowStart) || Date.now(),
      daily: Number(parsed.daily) || 0,
      bank: Number(parsed.bank) || 0
    };
  } catch {
    return { windowStart: Date.now(), daily: 0, bank: 0 };
  }
}
