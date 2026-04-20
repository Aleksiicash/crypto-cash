const DAILY_LIMIT=1000;
const REWARD_PER_TAP=20;
const WINDOW_MS=24*60*60*1000;
const STORAGE_KEY="crypto_cash_direct_bot_v8";

let tg=null;
let state={windowStart:0,daily:0,bank:0};

document.addEventListener("DOMContentLoaded",()=>{
  if(window.Telegram&&window.Telegram.WebApp){
    tg=window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  state=loadState();
  normalizeWindow(true);

  const dailyEl=document.getElementById("daily"),
        bankEl=document.getElementById("bank"),
        clientTotalEl=document.getElementById("clientTotal"),
        remainingEl=document.getElementById("remaining"),
        progressFillEl=document.getElementById("progressFill"),
        limitTextEl=document.getElementById("limitText"),
        tapBtn=document.getElementById("tapBtn"),
        saveBtn=document.getElementById("saveBtn"),
        withdrawBtn=document.getElementById("withdrawBtn"),
        requestForm=document.getElementById("requestForm"),
        nameEl=document.getElementById("name"),
        directionEl=document.getElementById("direction"),
        amountEl=document.getElementById("amount"),
        commentEl=document.getElementById("comment"),
        floatersEl=document.getElementById("floaters"),
        successBox=document.getElementById("successBox"),
        cooldownTimeEl=document.getElementById("cooldownTime"),
        profileNameEl=document.getElementById("profileName"),
        profileSubEl=document.getElementById("profileSub"),
        avatarEl=document.getElementById("avatar"),
        clientLevelEl=document.getElementById("clientLevel"),
        windowTimerEl=document.getElementById("windowTimer");

  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function fmt(n){return new Intl.NumberFormat("ru-RU").format(n);}
  function totalCC(){return (Number(state.bank)||0)+(Number(state.daily)||0);}
  function levelByTotal(total){
    if(total>=50000) return "BLACK";
    if(total>=15000) return "GOLD";
    if(total>=5000) return "SILVER";
    return "STANDARD";
  }
  function formatDuration(ms){
    const totalSec=Math.max(0,Math.ceil(ms/1000));
    const h=String(Math.floor(totalSec/3600)).padStart(2,"0");
    const m=String(Math.floor((totalSec%3600)/60)).padStart(2,"0");
    const s=String(totalSec%60).padStart(2,"0");
    return `${h}:${m}:${s}`;
  }
  function nextResetIn(){
    return Math.max(0,(state.windowStart + WINDOW_MS) - Date.now());
  }
  function normalizeWindow(forceSave=false){
    if(!state.windowStart){
      state.windowStart=Date.now();
      forceSave=true;
    }
    if(Date.now() >= state.windowStart + WINDOW_MS){
      state.windowStart=Date.now();
      state.daily=0;
      forceSave=true;
    }
    if(state.daily > DAILY_LIMIT){
      state.daily = DAILY_LIMIT;
      forceSave=true;
    }
    if(forceSave) saveState();
  }
  function fillProfile(){
    if(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user){
      const user=tg.initDataUnsafe.user;
      const fullName=[user.first_name,user.last_name].filter(Boolean).join(" ").trim()||"Клиент Crypto Cash";
      profileNameEl.textContent=fullName;
      profileSubEl.textContent=user.username?`@${user.username} • ID ${user.id}`:`ID ${user.id}`;
      avatarEl.textContent=(user.first_name||"C").slice(0,1).toUpperCase();
      if(!nameEl.value && user.first_name) nameEl.value=fullName;
    }else{
      profileNameEl.textContent="Клиент Crypto Cash";
      profileSubEl.textContent="Личный кабинет доступен в Telegram mini app";
      avatarEl.textContent="CC";
    }
  }
  function updateUI(){
    normalizeWindow();
    dailyEl.textContent=fmt(state.daily);
    bankEl.textContent=fmt(state.bank);
    clientTotalEl.textContent=fmt(totalCC());
    const rem=Math.max(0,DAILY_LIMIT-state.daily);
    remainingEl.textContent=fmt(rem);
    progressFillEl.style.width=Math.min(100,(state.daily/DAILY_LIMIT)*100)+"%";
    const timer=formatDuration(nextResetIn());
    cooldownTimeEl.textContent=timer;
    windowTimerEl.textContent=timer;
    clientLevelEl.textContent=levelByTotal(totalCC());
    if(state.daily >= DAILY_LIMIT){
      tapBtn.disabled=true;
      limitTextEl.textContent="Лимит 1000 CC исчерпан. Новое окно откроется только через таймер выше.";
    }else{
      tapBtn.disabled=false;
      limitTextEl.textContent="Жёсткий лимит: 1000 CC на каждые 24 часа. Каждый тап даёт "+REWARD_PER_TAP+" CC.";
    }
  }
  function sendPayload(payload){
    if(!tg){
      alert("Mini app открыт не как Telegram WebApp. Открой его через кнопку бота /start.");
      return false;
    }
    try{
      tg.sendData(JSON.stringify(payload));
      return true;
    }catch(e){
      console.log("sendData error:",e);
      alert("Не удалось отправить данные в бота.");
      return false;
    }
  }
  function spawnFloater(text){
    const item=document.createElement("span");
    item.className="floater";
    item.textContent=text;
    item.style.setProperty("--x",(Math.floor(Math.random()*80)-40)+"px");
    floatersEl.appendChild(item);
    setTimeout(()=>item.remove(),900);
  }
  function showSuccess(){
    successBox.classList.remove("hidden");
    setTimeout(()=>successBox.classList.add("hidden"),2600);
  }

  fillProfile();

  tapBtn.addEventListener("click",()=>{
    normalizeWindow();
    if(state.daily >= DAILY_LIMIT){
      updateUI();
      return;
    }
    const before = state.daily;
    state.daily = Math.min(DAILY_LIMIT, state.daily + REWARD_PER_TAP);
    const gained = state.daily - before;
    if(gained <= 0){
      updateUI();
      return;
    }
    if(navigator.vibrate) navigator.vibrate(30);
    saveState();
    updateUI();
    spawnFloater("+" + gained + " CC");
  });

  saveBtn.addEventListener("click",()=>{
    if(state.daily<=0){
      limitTextEl.textContent="Сначала заработай CC.";
      return;
    }
    state.bank += state.daily;
    state.daily = 0;
    saveState();
    updateUI();
    limitTextEl.textContent="CC отправлены в копилку.";
    spawnFloater("В копилку");
  });

  withdrawBtn.addEventListener("click",()=>{
    const total=totalCC();
    const ok=sendPayload({
      type:"cc_withdraw_request",
      total_cc:total,
      bank_cc:state.bank,
      daily_cc:state.daily,
      usd_value:(total/1000).toFixed(2)
    });
    if(ok&&tg)tg.close();
  });

  requestForm.addEventListener("submit",e=>{
    e.preventDefault();
    const total=totalCC();
    const ok=sendPayload({
      type:"exchange_request",
      name:nameEl.value.trim()||"—",
      direction:directionEl.value,
      amount:amountEl.value.trim()||"—",
      comment:commentEl.value.trim()||"—",
      bank_cc:state.bank,
      daily_cc:state.daily,
      total_cc:total,
      usd_value:(total/1000).toFixed(2)
    });
    if(ok){
      showSuccess();
      if(tg)tg.close();
    }
  });

  updateUI();
  setInterval(updateUI,1000);
});

function loadState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw) return {windowStart:Date.now(), daily:0, bank:0};
  try{
    const p=JSON.parse(raw);
    return {
      windowStart:Number(p.windowStart)||Date.now(),
      daily:Number(p.daily)||0,
      bank:Number(p.bank)||0
    };
  }catch{
    return {windowStart:Date.now(), daily:0, bank:0};
  }
}
