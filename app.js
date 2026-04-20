const DAILY_LIMIT=1000,REWARD_PER_TAP=20,STORAGE_KEY="crypto_cash_direct_bot_v5";
let tg=null;
let state={date:"",daily:0,bank:0};

document.addEventListener("DOMContentLoaded",()=>{
  if(window.Telegram&&window.Telegram.WebApp){
    tg=window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    console.log("Telegram WebApp OK");
  }else{
    console.log("Telegram WebApp not found");
  }

  state=loadState();

  const dailyEl=document.getElementById("daily"),
        bankEl=document.getElementById("bank"),
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
        successBox=document.getElementById("successBox");

  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function fmt(n){return new Intl.NumberFormat("ru-RU").format(n);}
  function updateUI(){
    dailyEl.textContent=fmt(state.daily);
    bankEl.textContent=fmt(state.bank);
    const rem=Math.max(0,DAILY_LIMIT-state.daily);
    remainingEl.textContent=fmt(rem);
    progressFillEl.style.width=Math.min(100,state.daily/DAILY_LIMIT*100)+"%";
    if(state.daily>=DAILY_LIMIT){
      tapBtn.disabled=true;
      limitTextEl.textContent="Лимит на сегодня достигнут. Отправь CC в копилку.";
    }else{
      tapBtn.disabled=false;
      limitTextEl.textContent="Каждый тап даёт "+REWARD_PER_TAP+" CC.";
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

  tapBtn.addEventListener("click",()=>{
    if(state.daily>=DAILY_LIMIT)return;
    state.daily+=REWARD_PER_TAP;
    if(state.daily>DAILY_LIMIT)state.daily=DAILY_LIMIT;
    if(navigator.vibrate)navigator.vibrate(30);
    saveState();
    updateUI();
    spawnFloater("+"+REWARD_PER_TAP+" CC");
  });

  saveBtn.addEventListener("click",()=>{
    if(state.daily<=0){
      limitTextEl.textContent="Сначала заработай CC.";
      return;
    }
    state.bank+=state.daily;
    state.daily=0;
    saveState();
    updateUI();
    limitTextEl.textContent="CC отправлены в копилку.";
    spawnFloater("В копилку");
  });

  withdrawBtn.addEventListener("click",()=>{
    const total=state.bank+state.daily;
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
    const total=state.bank+state.daily;
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
});

function todayKey(){return new Date().toISOString().slice(0,10);}
function loadState(){
  const fallback={date:todayKey(),daily:0,bank:0};
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)return fallback;
  try{
    const p=JSON.parse(raw),bank=Number(p.bank)||0;
    if(p.date!==todayKey())return{date:todayKey(),daily:0,bank};
    return{date:p.date||todayKey(),daily:Number(p.daily)||0,bank};
  }catch{return fallback;}
}
