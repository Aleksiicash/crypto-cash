
const tg = window.Telegram.WebApp;
tg.expand();

// USER DATA
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const user = tg.initDataUnsafe.user;
  document.getElementById("username").innerText = user.first_name;
  document.getElementById("userid").innerText = "ID: " + user.id;
}

// TAP EFFECT
const btn = document.getElementById("tapBtn");

btn.addEventListener("click", (e) => {
  if (navigator.vibrate) navigator.vibrate(50);

  let plus = document.createElement("div");
  plus.innerText = "+1";
  plus.style.position = "fixed";
  plus.style.left = e.clientX + "px";
  plus.style.top = e.clientY + "px";
  plus.style.color = "gold";
  plus.style.fontSize = "20px";
  plus.style.transition = "all 1s ease";

  document.body.appendChild(plus);

  setTimeout(() => {
    plus.style.top = (e.clientY - 100) + "px";
    plus.style.opacity = "0";
  }, 50);

  setTimeout(() => plus.remove(), 1000);
});
