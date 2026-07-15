/* 籤到 — 互動核心
   儀式流程：入殿 → 稟告 → 請籤(擲筊) → 搖籤筒 → 三聖筊確認 → 展籤 → 解籤
   無後端、無追蹤；默念與籤袋只存 localStorage。 */

(() => {
"use strict";

const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 資料 ---------- */
let QIAN = [];

/* 六十四卦（id 決定卦與陰陽變，128 = 64 × 2） */
const GUA64 = ["乾","坤","屯","蒙","需","訟","師","比","小畜","履","泰","否","同人","大有","謙","豫","隨","蠱","臨","觀","噬嗑","賁","剝","復","無妄","大畜","頤","大過","坎","離","咸","恆","遯","大壯","晉","明夷","家人","睽","蹇","解","損","益","夬","姤","萃","升","困","井","革","鼎","震","艮","漸","歸妹","豐","旅","巽","兌","渙","節","中孚","小過","既濟","未濟"];
const WUXING = ["金", "木", "水", "火", "土"];
function guaOf(id) {
  if (id === 0) return { symbol: "☯", name: "籤王", bian: "", wx: "" };
  const gi = (id - 1) >> 1;
  return {
    symbol: String.fromCharCode(0x4DC0 + gi),
    name: GUA64[gi],
    bian: (id - 1) % 2 ? "陰" : "陽",
    wx: WUXING[id % 5],
  };
}

const QIAN_WANG = { // 籤王 · 1/512 彩蛋
  id: 0, level: "籤王", family: "彩蛋", title: "本日免問",
  jieyue: ["心中有數", "不必再問", "即知即行", "天亦點頭"],
  warning: "知而不行最誤事",
  genz: "連神明都幫你跳過廣告了，這集請直接看正片。",
  poem: ["天亦無言萬事通", "紙上無字勝千籤", "汝心已有答案在", "回去做它便是靈"],
  story: "有人搖出一支無字籤，慌忙求解。廟公瞄了一眼：「恭喜，神明今天放你一天假——祂說你自己早就知道答案了，別再問了。」那人愣在原地，忽然笑出聲來。",
  oracle: "籤王極罕，非吉非凶，是神明對你的信任投票：這件事你心裡其實已經決定了，缺的只是允許。現在，本殿正式允許你。",
  answers: { "事業": "照你想的做，今天不用開會", "功名": "你已通過最難的面試：自己這關", "財運": "不問明牌者，運勢自來", "感情": "心之所向，即是吉位", "健康": "睡個好覺，勝過百籤", "出行": "想去就去，天色正好" },
  zen: "最好的籤，是你已經知道答案。",
  charm: "你自己"
};

/* ---------- 隨機 ---------- */
function rand() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

/* ---------- 中文數字 ---------- */
function numTC(n) {
  const d = "一二三四五六七八九";
  if (n <= 0) return "";
  if (n <= 9) return d[n - 1];
  if (n === 10) return "十";
  if (n < 20) return "十" + d[n % 10 - 1];
  if (n < 100) return d[Math.floor(n / 10) - 1] + "十" + (n % 10 ? d[n % 10 - 1] : "");
  return "一百" + (n % 100 ? (n % 100 < 10 ? "零" + numTC(n % 100) : numTC(n % 100)) : "");
}

/* ---------- 音效（WebAudio 合成，零音檔） ---------- */
let AC = null;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function knock(time, freq = 190, gain = 0.5, decay = 0.09) {
  const ctx = ac();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(freq, time);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, time + decay);
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + decay);
  o.connect(g).connect(ctx.destination);
  o.start(time); o.stop(time + decay + 0.02);
  const n = ctx.createBufferSource(), nb = ctx.createBuffer(1, 2205, 44100);
  const data = nb.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  n.buffer = nb;
  const nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 2400;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(gain * 0.5, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  n.connect(nf).connect(ng).connect(ctx.destination);
  n.start(time);
}
function sndJiaoLand() { // 筊杯落地：噠、噠噠
  const t = ac().currentTime;
  knock(t, 210, .55); knock(t + 0.11, 180, .4); knock(t + 0.19, 195, .22, .06);
}
function sndRattleTick() { knock(ac().currentTime, 900 + rand() * 500, .12, .03); }
function sndStickOut() { const t = ac().currentTime; knock(t, 640, .3, .05); knock(t + .07, 820, .25, .05); }
function sndBell() { // 磬
  const ctx = ac(), t = ctx.currentTime;
  [523.25, 1046.5, 1567].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.22 / (i + 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2 - i * .4);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 2.3);
  });
}
function buzz(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

/* ---------- 場景切換與香進度 ---------- */
const SCENES = ["scene-enter", "scene-pray", "scene-ask", "scene-shake", "scene-confirm", "scene-reveal"];
function go(id) {
  document.querySelectorAll(".scene").forEach(s => s.classList.toggle("active", s.id === id));
  const step = SCENES.indexOf(id);
  if (step >= 0) $("#incenseBurn").style.width = (step / (SCENES.length - 1)) * 100 + "%";
}

/* ---------- 狀態 ---------- */
const state = {
  cat: null, murmur: "",
  drawnId: null, rejectedId: null, rejectedOnce: false,
  sheng: 0, busy: false,
};

/* ---------- 幕0 入殿 ---------- */
function initEnter() {
  const now = new Date();
  let lunar = "";
  try {
    const parts = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", { month: "long", day: "numeric" }).format(now);
    lunar = "農曆" + parts.replace(/\d+年/, "");
  } catch (e) { /* 舊瀏覽器無妨 */ }
  const week = "日一二三四五六"[now.getDay()];
  $("#todayLine").textContent = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} 週${week}${lunar ? " · " + lunar : ""}`;

  const YI = ["提案", "準時下班", "備份檔案", "讚美同事", "先做最小的事", "喝水", "拒絕一次", "整理桌面", "午睡十分鐘", "散步開會", "把訊息看完再回", "清空一個分頁"];
  const JI = ["全部回覆", "臨時加會", "已讀亂回", "熬夜改稿", "衝動購物", "跟別人比較", "硬撐", "開第五十個分頁", "在群組裡爭對錯", "假裝沒事", "空腹喝第三杯咖啡", "把心事帶回家"];
  const seed = Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`);
  const pick = (arr, s) => arr[s % arr.length];
  $("#dailyLuck").innerHTML = "";
  const dl = $("#dailyLuck");
  const dlDay = document.createElement("span");
  dlDay.className = "dl-day"; dlDay.textContent = "今日";
  dl.append(dlDay, document.createElement("br"),
    `宜：${pick(YI, seed)}。`, document.createElement("br"),
    `忌：${pick(JI, seed * 7 + 3)}。`);

  const bag = loadBag();
  if (bag.length) {
    const b = $("#btnHistory");
    b.hidden = false;
    b.textContent = `我的籤袋（${bag.length}）`;
  }
}

/* ---------- 幕1 稟告 ---------- */
function initPray() {
  $("#catGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".cat");
    if (!btn) return;
    document.querySelectorAll(".cat").forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    state.cat = btn.dataset.cat;
    $("#btnPray").disabled = false;
    buzz(8);
  });
  $("#btnPray").addEventListener("click", () => {
    state.murmur = $("#murmur").value.trim();
    ac(); // 解鎖音訊
    go("scene-ask");
  });
}

/* ---------- 擲筊 ---------- */
// 回傳 "sheng" | "xiao" | "yin"
function throwOnce(pSheng, pXiao) {
  const r = rand();
  if (r < pSheng) return "sheng";
  if (r < pSheng + pXiao) return "xiao";
  return "yin";
}
function animateToss(pairEl, result) {
  return new Promise((res) => {
    const j1 = pairEl.querySelector(".j1"), j2 = pairEl.querySelector(".j2");
    // 聖筊=一平一凸、笑筊=雙平、陰筊=雙凸
    const faces = result === "sheng" ? (rand() < .5 ? ["flat", ""] : ["", "flat"])
      : result === "xiao" ? ["flat", "flat"] : ["", ""];
    [j1, j2].forEach(j => j.classList.remove("flat", "tossing"));
    if (reducedMotion) {
      if (faces[0]) j1.classList.add("flat");
      if (faces[1]) j2.classList.add("flat");
      sndJiaoLand(); buzz([20, 40, 20]);
      return res();
    }
    void pairEl.offsetWidth; // reflow 重啟動畫
    j1.classList.add("tossing"); j2.classList.add("tossing");
    // 滯空最高點（高速旋轉、殘影期）換面，落地時已是最終面
    setTimeout(() => {
      if (faces[0]) j1.classList.add("flat");
      if (faces[1]) j2.classList.add("flat");
    }, 460);
    setTimeout(() => { sndJiaoLand(); buzz([20, 40, 20]); }, 780);
    j2.querySelector(".jiao-body").addEventListener("animationend", () => {
      j1.classList.remove("tossing"); j2.classList.remove("tossing");
      res();
    }, { once: true });
  });
}
const JIAO_TEXT = {
  sheng: `<span class="r-sheng">聖筊</span><small>一平一凸——神明應允</small>`,
  xiao: `<span class="r-xiao">笑筊</span><small>雙平朝上——神明笑而不答，再默念一次，說清楚點</small>`,
  yin: `<span class="r-yin">陰筊</span><small>雙凸朝上——神明說：不是這樣</small>`,
};

/* ---------- 幕2 請籤 ---------- */
let askTries = 0;
function initAsk() {
  $("#btnAskThrow").addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    $("#askResult").innerHTML = "";
    const p = askTries === 0 ? .70 : .85; // 誠心漸增
    const result = throwOnce(p, .18);
    askTries++;
    await animateToss($("#askJiao"), result);
    $("#askResult").innerHTML = JIAO_TEXT[result];
    if (result === "sheng") {
      $("#askGuide").textContent = "神明應允賜籤。";
      setTimeout(() => { go("scene-shake"); state.busy = false; }, 1400);
    } else {
      if (result === "yin") $("#askGuide").textContent = "時機未到？靜心片刻，再擲一次。";
      state.busy = false;
    }
  });
}

/* ---------- 幕3 搖籤筒 ---------- */
function drawStick() {
  if (rand() < 1 / 512) return 0; // 籤王
  let id;
  do { id = 1 + Math.floor(rand() * 128); } while (id === state.rejectedId);
  return id;
}
function initShake() {
  const tube = $("#tube"), fill = $("#shakeFill");
  let charge = 0, holdTimer = null, rattleTimer = null, done = false;

  function tick(amount) {
    if (done) return;
    charge = Math.min(1, charge + amount);
    fill.style.width = charge * 100 + "%";
    if (charge >= 1) finish();
  }
  function startHold(e) {
    if (done || state.busy) return;
    e.preventDefault();
    requestMotion();
    tube.classList.add("shaking");
    holdTimer = setInterval(() => tick(0.035), 60);
    rattleTimer = setInterval(() => { sndRattleTick(); if (rand() < .5) buzz(6); }, 150);
  }
  function endHold() {
    tube.classList.remove("shaking");
    clearInterval(holdTimer); clearInterval(rattleTimer);
  }
  function finish() {
    done = true; endHold();
    state.drawnId = drawStick();
    const label = state.drawnId === 0 ? "籤王" : "第" + numTC(state.drawnId) + "籤";
    const tip = tube.querySelector(".stick-tip");
    tip.innerHTML = "";
    [...label].forEach(ch => {
      const s = document.createElement("span");
      s.textContent = ch;
      tip.appendChild(s);
    });
    tube.classList.add("done");
    sndStickOut(); buzz([15, 30, 60]);
    $("#shakeGuide").textContent = "一支籤躍了出來——" + label;
    setTimeout(() => {
      if (state.drawnId === 0) { reveal(QIAN_WANG); } // 籤王免筊，直接展籤
      else {
        $("#confirmNum").textContent = label;
        resetConfirm();
        go("scene-confirm");
      }
      // 重置籤筒供下次使用
      setTimeout(() => { done = false; charge = 0; fill.style.width = "0%"; tube.classList.remove("done"); }, 800);
    }, 1500);
  }

  tube.addEventListener("pointerdown", startHold);
  addEventListener("pointerup", endHold);
  addEventListener("pointercancel", endHold);
  tube.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tick(0.12); sndRattleTick(); } });
  $("#btnNoShake").addEventListener("click", () => { if (!done) { charge = 1; tick(0); } });

  // 手機搖晃加速（iOS 需授權）
  let motionOK = false;
  function requestMotion() {
    if (motionOK) return;
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission().then(s => { if (s === "granted") bindMotion(); }).catch(() => {});
    } else if (typeof DeviceMotionEvent !== "undefined") bindMotion();
    motionOK = true;
  }
  function bindMotion() {
    let last = 0;
    addEventListener("devicemotion", (e) => {
      if (!$("#scene-shake").classList.contains("active") || done) return;
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const now = Date.now();
      if (mag > 22 && now - last > 120) { last = now; tick(0.09); sndRattleTick(); buzz(8); }
    });
  }
}

/* ---------- 幕4 三聖筊確認 ---------- */
function resetConfirm() {
  state.sheng = 0;
  document.querySelectorAll(".tally").forEach(t => t.classList.remove("got"));
  $("#confirmResult").innerHTML = "";
  $("#btnConfirmThrow").textContent = "擲筊";
  $("#btnConfirmThrow").disabled = false;
}
function initConfirm() {
  $("#btnConfirmThrow").addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    $("#confirmResult").innerHTML = "";
    const p = state.rejectedOnce ? .97 : .90;
    const result = throwOnce(p, .05);
    await animateToss($("#confirmJiao"), result);
    $("#confirmResult").innerHTML = JIAO_TEXT[result];
    if (result === "sheng") {
      document.querySelector(`.tally[data-i="${state.sheng}"]`).classList.add("got");
      state.sheng++;
      if (state.sheng >= 3) {
        $("#confirmResult").innerHTML = `<span class="r-sheng">三聖筊</span><small>此籤是你的了</small>`;
        $("#btnConfirmThrow").textContent = "三聖筊！";
        $("#btnConfirmThrow").disabled = true;
        const entry = QIAN.find(q => q.id === state.drawnId);
        setTimeout(() => { reveal(entry); state.busy = false; }, 1300);
        return;
      }
      $("#btnConfirmThrow").textContent = `再擲（${state.sheng}/3）`;
    } else if (result === "yin") {
      // 退籤——真實廟宇最刺激的一刻
      state.rejectedOnce = true;
      state.rejectedId = state.drawnId;
      $("#confirmResult").innerHTML = `<span class="r-yin">陰筊</span><small>此籤非汝之籤，請回籤筒重抽</small>`;
      setTimeout(() => {
        $("#shakeGuide").textContent = "神明說再抽一次。按住籤筒——";
        resetConfirm();
        go("scene-shake");
        state.busy = false;
      }, 1900);
      return;
    }
    state.busy = false;
  });
}

/* ---------- 幕5 展籤與解籤 ---------- */
const ANSWER_ORDER = ["事業", "功名", "財運", "感情", "健康", "出行"];
let current = null;
function spans(el, text, extra) {
  el.innerHTML = "";
  if (extra) el.appendChild(extra);
  [...text].forEach(ch => {
    const s = document.createElement("span");
    if (ch === "・") s.className = "col-dot";
    s.textContent = ch;
    el.appendChild(s);
  });
}
function reveal(entry, fromBag = false) {
  current = entry;
  // 右欄籤序（直排）
  spans($("#paperNum"), entry.id === 0 ? "籤王駕到" : "第" + numTC(entry.id) + "籤");
  // 左欄卦象五行（直排）
  const g = guaOf(entry.id);
  const gs = document.createElement("span");
  gs.className = "gua-symbol";
  gs.textContent = g.symbol;
  spans($("#paperGua"), `${g.name}${g.bian ? "・" + g.bian : ""}${g.wx ? "・屬" + g.wx : ""}`, gs);
  // 吉凶朱印（直排）
  const lv = $("#paperLevel");
  spans(lv, entry.level);
  lv.className = "level-stamp lv-" + entry.level;
  $("#paperTitle").textContent = entry.title;
  // 解曰四句（右起直排）
  const jy = $("#jieyue");
  jy.innerHTML = "";
  (entry.jieyue || []).forEach(ph => {
    const col = document.createElement("div");
    col.className = "jy-col";
    [...ph].forEach(ch => {
      const s = document.createElement("span");
      s.textContent = ch;
      col.appendChild(s);
    });
    jy.appendChild(col);
  });
  $("#paperWarning").textContent = entry.warning || "";
  const poem = $("#poem");
  poem.innerHTML = "";
  entry.poem.forEach((line, i) => {
    const div = document.createElement("div");
    div.className = "poem-line";
    div.style.setProperty("--i", i);
    [...line].forEach(ch => {
      const s = document.createElement("span");
      s.textContent = ch;
      div.appendChild(s);
    });
    poem.appendChild(div);
  });
  $("#readStory").textContent = entry.story;
  $("#readOracle").textContent = entry.oracle;
  $("#readGenz").textContent = entry.genz || "";
  const dl = $("#answers");
  dl.innerHTML = "";
  const order = state.cat && !fromBag
    ? [state.cat, ...ANSWER_ORDER.filter(k => k !== state.cat)]
    : ANSWER_ORDER;
  order.forEach(k => {
    const row = document.createElement("div");
    row.className = "answer-row" + (k === state.cat && !fromBag ? " asked" : "");
    row.innerHTML = `<dt>${k}</dt><dd></dd>`;
    row.querySelector("dd").textContent = entry.answers[k] || "";
    dl.appendChild(row);
  });
  $("#readZen").textContent = entry.zen;
  $("#readCharm").textContent = entry.charm;
  $("#streakLine").textContent = fromBag ? "" : streakLine();
  if (!fromBag) { saveBagAuto(entry); }
  $("#btnSave").hidden = fromBag;
  go("scene-reveal");
  $("#scene-reveal").scrollTop = 0;
  setTimeout(sndBell, reducedMotion ? 100 : 2900);
  setTimeout(() => buzz([10, 60, 30]), reducedMotion ? 100 : 2900);
}

/* ---------- 連續籤到 ---------- */
function streakLine() {
  const key = "qiandao.streak";
  const today = new Date().toDateString();
  let s = {};
  try { s = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {}
  if (s.last !== today) {
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    s.count = s.last === yesterday ? (s.count || 0) + 1 : 1;
    s.last = today;
    localStorage.setItem(key, JSON.stringify(s));
  }
  return s.count > 1 ? `已連續籤到 ${s.count} 天` : "今日籤到，功德 +1";
}

/* ---------- 籤袋 ---------- */
function loadBag() {
  try { return JSON.parse(localStorage.getItem("qiandao.bag")) || []; } catch (e) { return []; }
}
let savedThisRound = false;
function saveBagAuto(entry) { savedThisRound = false; }
function initBag() {
  $("#btnSave").addEventListener("click", () => {
    if (!current) return;
    if (savedThisRound) { openBag(); return; }
    const bag = loadBag();
    bag.unshift({ id: current.id, level: current.level, title: current.title, cat: state.cat, date: new Date().toISOString().slice(0, 10), murmur: state.murmur });
    localStorage.setItem("qiandao.bag", JSON.stringify(bag.slice(0, 60)));
    savedThisRound = true;
    $("#btnSave").textContent = "查看籤袋";
    buzz(20);
  });
  function openBag() {
    const bag = loadBag(), ul = $("#bagList");
    ul.innerHTML = "";
    if (!bag.length) ul.innerHTML = `<li class="bag-empty">籤袋空空，先去求一支。</li>`;
    bag.forEach(item => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = `<span class="b-lv"></span><span class="b-title"></span><span class="b-date"></span>`;
      btn.querySelector(".b-lv").textContent = item.level;
      btn.querySelector(".b-title").textContent = (item.id === 0 ? "籤王" : "第" + numTC(item.id) + "籤") + " · " + item.title;
      btn.querySelector(".b-date").textContent = item.date;
      btn.addEventListener("click", () => {
        const entry = item.id === 0 ? QIAN_WANG : QIAN.find(q => q.id === item.id);
        if (entry) reveal(entry, true);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    go("scene-bag");
  }
  $("#btnHistory").addEventListener("click", openBag);
  $("#btnBagBack").addEventListener("click", () => go("scene-enter"));
}

/* ---------- 分享籤卡（Canvas） ---------- */
async function drawShareCard(entry) {
  const cv = $("#shareCanvas"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  await document.fonts.ready;
  const KAI = '"LXGW WenKai TC","Noto Serif TC",serif';
  // 夜色底
  const bg = ctx.createRadialGradient(W / 2, -H * .1, 100, W / 2, H * .5, H);
  bg.addColorStop(0, "#2a1f16"); bg.addColorStop(.5, "#171210"); bg.addColorStop(1, "#100c0a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 籤紙
  const px = 150, py = 260, pw = W - 300, ph = H - 640;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#f5edda";
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  ctx.strokeStyle = "#c43a20"; ctx.lineWidth = 6;
  ctx.strokeRect(px + 34, py + 34, pw - 68, ph - 68);
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 48, py + 48, pw - 96, ph - 96);
  // 頭部
  ctx.fillStyle = "#c43a20";
  ctx.font = `44px ${KAI}`;
  ctx.textAlign = "center";
  ctx.fillText("籤 到 殿", W / 2, py + 130);
  ctx.fillStyle = "#2b2118";
  ctx.font = `34px ${KAI}`;
  const numLabel = entry.id === 0 ? "籤王" : "第" + numTC(entry.id) + "籤";
  ctx.fillText(`${numLabel} · ${entry.level}`, W / 2, py + 190);
  ctx.font = `52px ${KAI}`;
  ctx.fillText(entry.title, W / 2, py + 280);
  ctx.strokeStyle = "rgba(43,33,24,.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 160, py + 320); ctx.lineTo(W / 2 + 160, py + 320); ctx.stroke();
  // 直排詩文：右→左四列
  ctx.font = `58px ${KAI}`;
  ctx.fillStyle = "#1f1810";
  const colGap = 118, charGap = 84;
  const startX = W / 2 + colGap * 1.5;
  const startY = py + 430;
  entry.poem.forEach((line, c) => {
    const x = startX - c * colGap;
    [...line].forEach((ch, r) => ctx.fillText(ch, x, startY + r * charGap));
  });
  // 印章
  ctx.save();
  ctx.translate(px + 118, py + ph - 118);
  ctx.rotate(-0.07);
  ctx.fillStyle = "rgba(196,58,32,.92)";
  ctx.fillRect(-62, -62, 124, 124);
  ctx.fillStyle = "#f5edda";
  ctx.font = `40px ${KAI}`;
  // 印章讀序：右列由上而下（籤到），再左列（之印）
  ctx.fillText("籤", 36, -18); ctx.fillText("之", -32, -18);
  ctx.fillText("到", 36, 46); ctx.fillText("印", -32, 46);
  ctx.restore();
  // 解曰四句（紙面下緣）
  if (entry.jieyue && entry.jieyue.length === 4) {
    ctx.fillStyle = "#8c2512";
    ctx.font = `31px ${KAI}`;
    ctx.fillText("解曰　" + entry.jieyue.join("・"), W / 2, py + ph - 225);
  }
  if (entry.warning) {
    ctx.fillStyle = "rgba(43,33,24,.75)";
    ctx.font = `27px ${KAI}`;
    ctx.fillText("◆ " + entry.warning + " ◆", W / 2, py + ph - 155);
  }
  // 籤尾語 + 落款（含導流網址）
  ctx.fillStyle = "#c9a227";
  ctx.font = `42px ${KAI}`;
  ctx.fillText(`「${entry.zen}」`, W / 2, py + ph + 120);
  ctx.fillStyle = "#8a7f72";
  ctx.font = "30px system-ui, sans-serif";
  ctx.fillText("籤到 — 上班前，先打卡籤到", W / 2, H - 150);
  ctx.fillStyle = "#c9a227";
  ctx.font = "34px system-ui, sans-serif";
  ctx.fillText(location.host, W / 2, H - 92);
  return new Promise(res => cv.toBlob(res, "image/png"));
}
/* 每籤專屬頁網址（導流回站） */
function siteUrl(id) {
  const base = new URL(".", location.href);
  return id > 0 ? new URL(`q/${id}.html`, base).href.replace(/^https?:\/\//, "") : base.href.replace(/^https?:\/\//, "");
}
function fullUrl(id) { return "https://" + siteUrl(id).replace(/^https:\/\//, ""); }
function initShare() {
  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  $("#btnShare").addEventListener("click", async () => {
    if (!current) return;
    const btn = $("#btnShare");
    btn.disabled = true; btn.textContent = "正在裝裱…";
    let done = "打卡分享";
    try {
      const blob = await drawShareCard(current);
      const file = new File([blob], `qiandao-${current.id}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "籤到",
          text: `我在籤到抽到${current.level}——「${current.zen}」 ${fullUrl(current.id)}`,
        });
      } else {
        // 桌機／不支援檔案分享：存圖＋複製連結一次完成
        downloadBlob(blob, file.name);
        try { await navigator.clipboard.writeText(fullUrl(current.id)); done = "已存圖並複製連結"; }
        catch (e) { done = "已存圖"; }
      }
    } catch (e) { /* 使用者取消分享 */ }
    btn.disabled = false; btn.textContent = done;
    if (done !== "打卡分享") setTimeout(() => { btn.textContent = "打卡分享"; }, 2200);
  });
  $("#btnSaveImg").addEventListener("click", async () => {
    if (!current) return;
    const btn = $("#btnSaveImg");
    btn.textContent = "裝裱中…";
    try {
      const blob = await drawShareCard(current);
      const file = new File([blob], `qiandao-${current.id}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // 分享面板內選「儲存影像」即可存入相簿
        await navigator.share({ files: [file], title: "籤到籤卡" });
        btn.textContent = "已送出";
      } else {
        downloadBlob(blob, file.name);
        btn.textContent = "已存";
      }
    } catch (e) { btn.textContent = "存圖片"; }
    setTimeout(() => { btn.textContent = "存圖片"; }, 2000);
  });
  $("#btnCopyLink").addEventListener("click", async () => {
    if (!current) return;
    const btn = $("#btnCopyLink");
    const text = `第${numTC(current.id) || "？"}籤・${current.title}（${current.level}）「${current.zen}」 ${fullUrl(current.id)}`;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "已複製";
    } catch (e) {
      if (navigator.share) { try { await navigator.share({ text }); } catch (e2) {} }
    }
    setTimeout(() => { btn.textContent = "複製連結"; }, 1800);
  });
}

/* ---------- 再求一籤 ---------- */
function initAgain() {
  $("#btnAgain").addEventListener("click", () => {
    state.cat = null; state.murmur = ""; state.drawnId = null;
    state.rejectedId = null; state.rejectedOnce = false; state.sheng = 0;
    askTries = 0;
    document.querySelectorAll(".cat").forEach(c => c.classList.remove("selected"));
    $("#btnPray").disabled = true;
    $("#murmur").value = "";
    $("#askResult").innerHTML = ""; $("#askGuide").textContent = "擲筊請示：可否賜籤？";
    $("#shakeGuide").textContent = "按住籤筒搖晃，直到一支籤躍出。";
    $("#btnSave").textContent = "收籤袋"; $("#btnSave").hidden = false;
    resetConfirm();
    go("scene-pray");
  });
}

/* ---------- 啟動 ---------- */
async function boot() {
  initEnter(); initPray(); initAsk(); initShake(); initConfirm(); initBag(); initShare(); initAgain();
  $("#btnEnter").addEventListener("click", () => { ac(); go("scene-pray"); });
  try {
    const res = await fetch("data/qian.json?v=5");
    QIAN = await res.json();
  } catch (e) {
    $("#dailyLuck").textContent = "籤庫暫時取不下來，請稍後再來。";
    $("#btnEnter").disabled = true;
  }
}
boot();

})();
