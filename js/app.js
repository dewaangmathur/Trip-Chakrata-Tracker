// ═══════════════════════════════════════════
//  Trip Chakrata Tracker · app.js
//  Firebase Realtime DB · Viewer + Admin modes
// ═══════════════════════════════════════════

// ── Firebase ─────────────────────────────
const firebaseConfig = {
  databaseURL: "https://trip-helper-10270-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ── Config ───────────────────────────────
const MEMBERS  = ["Saloni","Dewaang","Chehak","Khushi","Priyam","Devansh","Bharat"];
const COLORS   = ["c0","c1","c2","c3","c4","c5","c6"];
const HEX      = ["#FF6B6B","#06D6A0","#5BC0EB","#FFD166","#A78BFA","#F97316","#818CF8"];
const PINS     = { Saloni:"1111", Dewaang:"2222", Chehak:"3333", Khushi:"4444", Priyam:"5555", Devansh:"6666", Bharat:"7777" };
const ADMIN_PW = "chakrata2026"; // change this!

// ── State ────────────────────────────────
let currentUser = null;
let isAdmin     = false; // true = member logged in OR admin pw entered
let isViewer    = false;
let expenses    = [];
let settlements = {}; // {txnId: {paidAt, note, paidBy}}
let activeDay   = "all";
let customDays  = [];
let editingId   = null;
let pendingTags = [];
let selectedCat = "🍔 Food";
let markingTxn  = null; // {id, from, to, amt}

// ═══════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  const saved = sessionStorage.getItem("chakrataUser");
  const savedAdmin = sessionStorage.getItem("chakrataAdmin");

  if (saved) {
    currentUser = saved;
    isAdmin     = true;
    isViewer    = false;
    showApp();
  } else if (savedAdmin === "1") {
    currentUser = "Admin";
    isAdmin     = true;
    isViewer    = false;
    showApp();
  } else {
    buildLoginGrid();
    setupPinInputs();
  }
});

// ── Login ─────────────────────────────────
function buildLoginGrid() {
  const g = document.getElementById("memberGrid");
  g.innerHTML = MEMBERS.map((m, i) => `
    <button class="member-login-btn" onclick="selectMember('${m}')" id="mbtn_${m}">
      <span class="m-avatar ${COLORS[i]}">${m[0]}</span>${m}
    </button>`).join("");
}

function selectMember(name) {
  document.querySelectorAll(".member-login-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("mbtn_" + name).classList.add("selected");
  currentUser = name;
  document.getElementById("pinSection").style.display = "block";
  document.getElementById("pinError").textContent = "";
  document.querySelectorAll(".pin-input").forEach(i => i.value = "");
  document.querySelectorAll(".pin-input")[0].focus();
}

function setupPinInputs() {
  const inputs = document.querySelectorAll(".pin-input");
  inputs.forEach((inp, idx) => {
    inp.addEventListener("input", () => {
      if (inp.value.length === 1 && idx < inputs.length - 1) inputs[idx + 1].focus();
      if (idx === inputs.length - 1 && inp.value.length === 1) doLogin();
    });
    inp.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !inp.value && idx > 0) inputs[idx - 1].focus();
      if (e.key === "Enter") doLogin();
    });
  });
}

function doLogin() {
  if (!currentUser) { document.getElementById("pinError").textContent = "Pick your name first!"; return; }
  const pin = [...document.querySelectorAll(".pin-input")].map(i => i.value).join("");
  if (pin === PINS[currentUser]) {
    sessionStorage.setItem("chakrataUser", currentUser);
    isAdmin = true; isViewer = false;
    showApp();
  } else {
    document.getElementById("pinError").textContent = "Wrong PIN!";
    document.querySelectorAll(".pin-input").forEach(i => i.value = "");
    document.querySelectorAll(".pin-input")[0].focus();
  }
}

function enterViewer() {
  currentUser = "Viewer";
  isAdmin = false; isViewer = true;
  showApp();
}

function logout() {
  sessionStorage.removeItem("chakrataUser");
  sessionStorage.removeItem("chakrataAdmin");
  location.reload();
}

// ── Admin modal ───────────────────────────
function showAdminLogin() { document.getElementById("adminModal").style.display = "flex"; document.getElementById("adminPwInput").focus(); }
function closeAdminLogin() { document.getElementById("adminModal").style.display = "none"; document.getElementById("adminPwInput").value = ""; document.getElementById("adminPwError").textContent = ""; }
function doAdminLogin() {
  const pw = document.getElementById("adminPwInput").value;
  if (pw === ADMIN_PW) {
    sessionStorage.setItem("chakrataAdmin", "1");
    isAdmin = true; isViewer = false;
    currentUser = "Admin";
    closeAdminLogin();
    updateAdminUI();
    showToast("Admin access granted 🔓");
  } else {
    document.getElementById("adminPwError").textContent = "Wrong password!";
  }
}
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("adminModal").style.display === "flex") doAdminLogin();
});

// ═══════════════════════════════════════════
//  SHOW APP
// ═══════════════════════════════════════════
function showApp() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appShell").style.display = "block";

  updateAdminUI();
  buildParticipantChips();
  buildPayerSelects();
  setupTabs();
  setupDayPills();
  setupCatButtons();
  setupPinInputs();

  // Firebase listeners
  db.ref("expenses").on("value", snap => {
    expenses = [];
    snap.forEach(c => expenses.push({ id: c.key, ...c.val() }));
    renderFeed(); updateTotal(); renderHome();
  });

  db.ref("settlements").on("value", snap => {
    settlements = snap.val() || {};
    // re-render settle tab if active
    if (document.getElementById("tab-settle").classList.contains("active")) calculateSettlement();
  });
}

function updateAdminUI() {
  const idx    = MEMBERS.indexOf(currentUser);
  const isReal = idx !== -1;

  // Nav user chip
  const chip = document.getElementById("userChip");
  chip.innerHTML = `<span class="user-av ${isReal ? COLORS[idx] : "c2"}">${currentUser[0]}</span><span>${currentUser}</span>`;

  // Mode badge
  const badge = document.getElementById("modeBadge");
  badge.textContent = isAdmin ? (isViewer ? "" : "ADMIN") : "VIEWER";
  badge.className = "mode-badge " + (isAdmin ? "admin" : "viewer");

  // Viewer banner
  document.getElementById("viewerBanner").style.display = (!isAdmin || isViewer) ? "block" : "none";

  // Add form
  document.getElementById("addFormBody").style.display   = isAdmin ? "block" : "none";
  document.getElementById("addFormLocked").style.display = isAdmin ? "none"  : "flex";
  document.getElementById("directPayBody").style.display   = isAdmin ? "block" : "none";
  document.getElementById("directPayLocked").style.display = isAdmin ? "none"  : "flex";

  // Payer default
  const sel = document.getElementById("expPaidBy");
  if (sel && isReal) sel.value = currentUser;
}

// ═══════════════════════════════════════════
//  FORM SETUP
// ═══════════════════════════════════════════
function buildParticipantChips() {
  document.getElementById("participantChips").innerHTML =
    MEMBERS.map(m => `<span class="chip active" data-member="${m}" onclick="toggleChip(this)">${m}</span>`).join("");
}

function buildPayerSelects() {
  const opts = MEMBERS.map(m => `<option value="${m}" ${m === currentUser ? "selected" : ""}>${m}</option>`).join("");
  document.getElementById("expPaidBy").innerHTML = opts;
  document.getElementById("ptFrom").innerHTML    = opts;
  document.getElementById("ptTo").innerHTML      =
    MEMBERS.map(m => `<option value="${m}" ${m !== currentUser ? "selected" : ""}>${m}</option>`).join("");
}

function toggleChip(el) { el.classList.toggle("active"); }
function selectAll()    { document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.add("active")); }
function selectNone()   { document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.remove("active")); }
function selectOthers() { document.querySelectorAll(".chip[data-member]").forEach(c => { c.dataset.member === currentUser ? c.classList.remove("active") : c.classList.add("active"); }); }

function setupCatButtons() {
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCat = btn.dataset.cat;
    });
  });
}

// Custom tags
function addCustomTag() {
  const inp = document.getElementById("customTagInput");
  const val = inp.value.trim();
  if (!val || pendingTags.includes(val)) { inp.value = ""; return; }
  pendingTags.push(val);
  renderPendingTags();
  inp.value = "";
}
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.activeElement.id === "customTagInput") addCustomTag();
});
function removeTag(tag) { pendingTags = pendingTags.filter(t => t !== tag); renderPendingTags(); }
function renderPendingTags() {
  document.getElementById("customTagsRow").innerHTML = pendingTags.map(t =>
    `<span class="custom-tag">#${esc(t)}<span class="custom-tag-del" onclick="removeTag('${esc(t)}')">✕</span></span>`
  ).join("");
}

// ═══════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "settle") calculateSettlement();
    });
  });
}

// ═══════════════════════════════════════════
//  DAY PILLS
// ═══════════════════════════════════════════
function setupDayPills() {
  document.querySelectorAll(".day-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      if (pill.dataset.day === "__add__") { openCustomDay(); return; }
      document.querySelectorAll(".day-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDay = pill.dataset.day;
      renderFeed();
    });
  });
}
function openCustomDay()  { document.getElementById("customDayModal").style.display = "flex"; document.getElementById("customDayInput").focus(); }
function closeCustomDay() { document.getElementById("customDayModal").style.display = "none"; document.getElementById("customDayInput").value = ""; }
function saveCustomDay() {
  const val = document.getElementById("customDayInput").value.trim();
  if (!val) return;
  if (!customDays.includes(val)) {
    customDays.push(val);
    const strip = document.getElementById("dayStrip");
    const addBtn = strip.querySelector('[data-day="__add__"]');
    const pill = document.createElement("button");
    pill.className = "day-pill"; pill.dataset.day = val; pill.textContent = val;
    pill.addEventListener("click", () => {
      document.querySelectorAll(".day-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active"); activeDay = val; renderFeed();
    });
    strip.insertBefore(pill, addBtn);
    const sel = document.getElementById("expDay");
    const opt = document.createElement("option"); opt.value = val; opt.textContent = val;
    sel.appendChild(opt);
  }
  closeCustomDay();
  document.querySelectorAll(".day-pill").forEach(p => { p.classList.remove("active"); if (p.dataset.day === val) p.classList.add("active"); });
  activeDay = val; renderFeed();
}

// ═══════════════════════════════════════════
//  ADD EXPENSE
// ═══════════════════════════════════════════
function addExpense() {
  if (!isAdmin) { showToast("Admin login required!"); return; }
  const desc = document.getElementById("expDesc").value.trim();
  if (!desc) { showToast("Enter a description!"); return; }
  const amt = parseFloat(document.getElementById("expAmt").value);
  if (!amt || amt <= 0) { showToast("Enter a valid amount!"); return; }
  const paidBy = document.getElementById("expPaidBy").value;
  const participants = [...document.querySelectorAll(".chip[data-member].active")].map(c => c.dataset.member);
  if (participants.length === 0) { showToast("Select at least one participant!"); return; }
  const day  = document.getElementById("expDay").value;
  const date = document.getElementById("expDate").value || new Date().toISOString().split("T")[0];
  const tags = [...pendingTags];

  db.ref("expenses").push({
    desc, amt, paidBy, participants, day, cat: selectedCat, date, tags,
    type: "expense", addedBy: currentUser, ts: Date.now()
  }).then(() => {
    showToast("Added! 🎉");
    document.getElementById("expDesc").value = "";
    document.getElementById("expAmt").value  = "";
    document.getElementById("expDate").value = "";
    pendingTags = []; renderPendingTags(); selectAll();
  }).catch(() => showToast("Firebase error — check DB rules!"));
}

// ═══════════════════════════════════════════
//  ADD DIRECT PAYMENT
// ═══════════════════════════════════════════
function addDirectPayment() {
  if (!isAdmin) { showToast("Admin login required!"); return; }
  const from = document.getElementById("ptFrom").value;
  const to   = document.getElementById("ptTo").value;
  const amt  = parseFloat(document.getElementById("ptAmt").value);
  const desc = document.getElementById("ptDesc").value.trim();
  if (from === to) { showToast("From and To can't be same!"); return; }
  if (!amt || amt <= 0) { showToast("Enter a valid amount!"); return; }
  if (!desc) { showToast("Enter a reason!"); return; }

  db.ref("expenses").push({
    desc, amt, paidBy: from, paidTo: to, participants: [from, to],
    day: "Payment", cat: "💳 Payment", type: "direct",
    addedBy: currentUser, tags: [], ts: Date.now()
  }).then(() => {
    showToast(`Recorded! ${from} → ${to}`);
    document.getElementById("ptAmt").value  = "";
    document.getElementById("ptDesc").value = "";
  }).catch(() => showToast("Firebase error!"));
}

// ═══════════════════════════════════════════
//  RENDER FEED
// ═══════════════════════════════════════════
function renderFeed() {
  const feed = document.getElementById("expenseFeed");
  let list = activeDay === "all" ? [...expenses] : expenses.filter(e => e.day === activeDay);
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (list.length === 0) { feed.innerHTML = `<div class="empty-state">No expenses yet!</div>`; return; }

  feed.innerHTML = list.map(e => {
    const icon   = (e.cat || "📦").split(" ")[0];
    const isDirect = e.type === "direct";
    const isHotel  = e.day === "Hotel" || (e.cat || "").includes("Hotel");
    const canEdit  = isAdmin && (e.addedBy === currentUser || currentUser === "Admin");
    const dateStr  = e.date ? ` · ${fmtDate(e.date)}` : "";
    const tagsHtml = (e.tags || []).map(t => `<span class="exp-tag custom">#${esc(t)}</span>`).join("");
    const metaTxt  = isDirect
      ? `${e.paidBy} → ${e.paidTo}`
      : `Paid by ${e.paidBy} · ${(e.participants || []).join(", ")}`;

    return `
      <div class="exp-card">
        ${canEdit ? `
        <div class="exp-actions">
          <button class="exp-action-btn" onclick="openEdit('${e.id}')">✏️</button>
          <button class="exp-action-btn del" onclick="deleteExpense('${e.id}')">✕</button>
        </div>` : ""}
        <div class="exp-top">
          <div class="exp-cat-icon">${icon}</div>
          <div class="exp-info">
            <div class="exp-desc">${esc(e.desc)}</div>
            <div class="exp-meta">${metaTxt}${dateStr}</div>
          </div>
          <div class="exp-amount">₹${(e.amt || 0).toLocaleString("en-IN")}</div>
        </div>
        <div class="exp-footer">
          <span class="exp-tag day">${e.day}</span>
          <span class="exp-tag cat ${isHotel ? "" : ""} ${isDirect ? "direct" : ""}">${e.cat}</span>
          ${tagsHtml}
        </div>
      </div>`;
  }).join("");
}

function updateTotal() {
  const total = expenses.filter(e => e.type !== "direct").reduce((s, e) => s + (e.amt || 0), 0);
  document.getElementById("totalChip").textContent = `Total: ₹${total.toLocaleString("en-IN")}`;
}

function deleteExpense(id) {
  if (!isAdmin) { showToast("Admin only!"); return; }
  if (!confirm("Delete this expense?")) return;
  db.ref("expenses/" + id).remove().then(() => showToast("Deleted!"));
}

// ═══════════════════════════════════════════
//  EDIT
// ═══════════════════════════════════════════
function openEdit(id) {
  if (!isAdmin) { showToast("Admin only!"); return; }
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById("editDesc").value = e.desc || "";
  document.getElementById("editAmt").value  = e.amt  || "";
  document.getElementById("editDay").value  = e.day  || "Day 1";
  document.getElementById("editCat").value  = e.cat  || "📦 Other";
  document.getElementById("editModal").style.display = "flex";
}
function closeEdit() { document.getElementById("editModal").style.display = "none"; editingId = null; }
function saveEdit() {
  if (!editingId) return;
  const updates = {
    desc: document.getElementById("editDesc").value.trim(),
    amt:  parseFloat(document.getElementById("editAmt").value),
    day:  document.getElementById("editDay").value,
    cat:  document.getElementById("editCat").value,
  };
  if (!updates.desc || !updates.amt) { showToast("Fill all fields!"); return; }
  db.ref("expenses/" + editingId).update(updates).then(() => { showToast("Saved ✅"); closeEdit(); });
}

// ═══════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════
function renderHome() {
  const real = expenses.filter(e => e.type !== "direct");
  const total = real.reduce((s, e) => s + (e.amt || 0), 0);

  // Stats
  const bal = computeBalances();
  const myBal = Math.round((bal[currentUser] || 0) * 100) / 100;
  let myShare = 0;
  real.forEach(e => { if ((e.participants || []).includes(currentUser)) myShare += (e.amt || 0) / (e.participants.length || 1); });

  document.getElementById("homeStats").innerHTML = `
    <div class="stat-box"><div class="stat-num">₹${total.toLocaleString("en-IN")}</div><div class="stat-label">Total Spent</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--blue)">${real.length}</div><div class="stat-label">Expenses</div></div>
    <div class="stat-box"><div class="stat-num" style="color:var(--yellow)">₹${Math.round(myShare).toLocaleString("en-IN")}</div><div class="stat-label">Your Share</div></div>
    <div class="stat-box"><div class="stat-num" style="color:${myBal >= 0 ? "var(--green)" : "var(--red)"}">${myBal >= 0 ? "+" : ""}₹${Math.abs(myBal).toFixed(0)}</div><div class="stat-label">${myBal >= 0 ? "You get back" : "You owe"}</div></div>
  `;

  // Paid summary
  const paidT = {};
  MEMBERS.forEach(m => { paidT[m] = 0; });
  real.forEach(e => { if (e.paidBy) paidT[e.paidBy] = (paidT[e.paidBy] || 0) + (e.amt || 0); });
  document.getElementById("homePaidGrid").innerHTML = MEMBERS.map((m, i) => `
    <div class="paid-card">
      <div class="paid-av ${COLORS[i]}">${m[0]}</div>
      <div class="paid-name">${m}</div>
      <div class="paid-amt">₹${(paidT[m] || 0).toLocaleString("en-IN")}</div>
      <div class="paid-pct">${paidT[m] && total ? Math.round(paidT[m] / total * 100) : 0}% of trip</div>
    </div>`).join("");

  // Recent
  const recent = [...expenses].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8);
  const af = document.getElementById("homeActivity");
  if (!recent.length) { af.innerHTML = `<div class="empty-state">No activity yet!</div>`; return; }
  af.innerHTML = recent.map(e => `
    <div class="activity-item">
      <div class="act-icon">${(e.cat || "📦").split(" ")[0]}</div>
      <div class="act-info">
        <div class="act-desc">${esc(e.desc)}</div>
        <div class="act-meta">${e.type === "direct" ? `${e.paidBy} → ${e.paidTo}` : `Paid by ${e.paidBy} · ${e.day}`}</div>
      </div>
      <div class="act-amt">₹${(e.amt || 0).toLocaleString("en-IN")}</div>
    </div>`).join("");
}

// ═══════════════════════════════════════════
//  SETTLEMENT
// ═══════════════════════════════════════════
function computeBalances() {
  const balance = {};
  MEMBERS.forEach(m => { balance[m] = 0; });
  expenses.forEach(exp => {
    if (exp.type === "direct") {
      balance[exp.paidBy] = (balance[exp.paidBy] || 0) + (exp.amt || 0);
      balance[exp.paidTo] = (balance[exp.paidTo] || 0) - (exp.amt || 0);
      return;
    }
    const parts = exp.participants || MEMBERS;
    const share = (exp.amt || 0) / parts.length;
    balance[exp.paidBy] = (balance[exp.paidBy] || 0) + (exp.amt || 0);
    parts.forEach(p => { balance[p] = (balance[p] || 0) - share; });
  });
  return balance;
}

function minimizeTransactions(balance) {
  let debtors   = Object.entries(balance).filter(([,a]) => a < -0.005).map(([p,a]) => [p,-a]).sort((a,b) => b[1]-a[1]);
  let creditors = Object.entries(balance).filter(([,a]) => a > 0.005).map(([p,a]) => [p,a]).sort((a,b) => b[1]-a[1]);
  const txs = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const [from, owe] = debtors[i];
    const [to, gets]  = creditors[j];
    const amt = Math.min(owe, gets);
    txs.push({ from, to, amt: Math.round(amt * 100) / 100 });
    debtors[i][1]   -= amt;
    creditors[j][1] -= amt;
    if (debtors[i][1]   < 0.005) i++;
    if (creditors[j][1] < 0.005) j++;
  }
  return txs;
}

function calculateSettlement() {
  const balance = computeBalances();

  // Balance cards
  document.getElementById("balanceSummary").innerHTML = MEMBERS.map((m, i) => {
    const b = Math.round((balance[m] || 0) * 100) / 100;
    const cls = b > 0.005 ? "positive" : b < -0.005 ? "negative" : "zero";
    const lbl = b > 0.005 ? "gets back" : b < -0.005 ? "owes" : "settled";
    return `
      <div class="balance-card">
        <div class="balance-name">${m}</div>
        <div class="balance-amt ${cls}">${b >= 0 ? "+" : ""}₹${Math.abs(b).toFixed(2)}</div>
        <div class="balance-label">${lbl}</div>
      </div>`;
  }).join("");

  // Transactions
  const txs = minimizeTransactions(balance);
  const settlDiv = document.getElementById("settlementResult");

  if (!txs.length) {
    settlDiv.innerHTML = `<div class="empty-state">🎉 Everyone's settled!</div>`;
    document.getElementById("settleActions").style.display = "none";
  } else {
    settlDiv.innerHTML = txs.map((t, idx) => {
      const txnId = `${t.from}_${t.to}_${idx}`;
      const paid  = settlements[txnId];
      const canMark = isAdmin && !paid;

      return `
        <div class="settle-row ${paid ? "paid" : ""}">
          <div class="settle-num">${idx + 1}</div>
          <div class="settle-from">${t.from}</div>
          <div class="settle-arrow">→</div>
          <div class="settle-badge">₹${t.amt.toFixed(2)}</div>
          <div class="settle-arrow">→</div>
          <div class="settle-to">${t.to}</div>
          ${paid
            ? `<span class="settle-paid-tag">✅ Paid ${paid.paidAt ? fmtDate(paid.paidAt) : ""}</span>`
            : canMark
              ? `<button class="mark-paid-btn" onclick="openMarkPaid('${txnId}','${t.from}','${t.to}',${t.amt})">Mark paid</button>`
              : ""
          }
        </div>`;
    }).join("");
    document.getElementById("settleActions").style.display = "flex";
  }

  // Per-person breakdown
  const paidT = {}, shareT = {};
  MEMBERS.forEach(m => { paidT[m] = 0; shareT[m] = 0; });
  expenses.filter(e => e.type !== "direct").forEach(e => {
    paidT[e.paidBy] = (paidT[e.paidBy] || 0) + (e.amt || 0);
    const sh = (e.amt || 0) / ((e.participants || MEMBERS).length);
    (e.participants || MEMBERS).forEach(p => { shareT[p] = (shareT[p] || 0) + sh; });
  });
  document.getElementById("personBreakdown").innerHTML = MEMBERS.map((m, i) => {
    const b = Math.round((balance[m] || 0) * 100) / 100;
    const cls = b > 0 ? "positive" : b < 0 ? "negative" : "zero";
    return `
      <div class="person-card">
        <div class="person-name"><span class="person-av ${COLORS[i]}">${m[0]}</span>${m}</div>
        <div class="person-stat">Paid: <span>₹${(paidT[m] || 0).toFixed(2)}</span></div>
        <div class="person-stat">Share: <span>₹${(shareT[m] || 0).toFixed(2)}</span></div>
        <div class="person-stat">Net: <span class="${cls}">₹${b >= 0 ? "+" : ""}${Math.abs(b).toFixed(2)}</span></div>
      </div>`;
  }).join("");
}

// ── Mark Paid ──────────────────────────────
function openMarkPaid(txnId, from, to, amt) {
  if (!isAdmin) { showToast("Admin only!"); return; }
  markingTxn = { id: txnId, from, to, amt };
  document.getElementById("markPaidTitle").textContent  = "Mark as Paid ✅";
  document.getElementById("markPaidDesc").textContent   = `${from} pays ${to} ₹${amt.toFixed(2)}`;
  document.getElementById("markPaidDate").value         = new Date().toISOString().split("T")[0];
  document.getElementById("markPaidNote").value         = "";
  document.getElementById("markPaidModal").style.display = "flex";
}
function closeMarkPaid() { document.getElementById("markPaidModal").style.display = "none"; markingTxn = null; }
function confirmMarkPaid() {
  if (!markingTxn) return;
  const date = document.getElementById("markPaidDate").value;
  const note = document.getElementById("markPaidNote").value.trim();
  db.ref("settlements/" + markingTxn.id).set({
    paidAt:   date,
    note:     note,
    markedBy: currentUser,
    from:     markingTxn.from,
    to:       markingTxn.to,
    amt:      markingTxn.amt,
    ts:       Date.now()
  }).then(() => {
    showToast(`✅ ${markingTxn.from} → ${markingTxn.to} marked paid!`);
    closeMarkPaid();
    calculateSettlement();
  }).catch(() => showToast("Firebase error!"));
}

// ── Copy / Share ──────────────────────────
function copySettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["🏔️ Chakrata Trip Settlement", ""];
  rows.forEach((r, i) => {
    const from  = r.querySelector(".settle-from").textContent;
    const to    = r.querySelector(".settle-to").textContent;
    const amt   = r.querySelector(".settle-badge")?.textContent || "";
    const paid  = r.classList.contains("paid") ? " ✅" : "";
    lines.push(`${i+1}. ${from} → ${to}: ${amt}${paid}`);
  });
  lines.push("", document.getElementById("totalChip").textContent);
  navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Copied! 📋"));
}
function shareSettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["🏔️ Chakrata Trip Settlement\n"];
  rows.forEach((r, i) => {
    const from = r.querySelector(".settle-from").textContent;
    const to   = r.querySelector(".settle-to").textContent;
    const amt  = r.querySelector(".settle-badge")?.textContent || "";
    const paid = r.classList.contains("paid") ? " ✅" : "";
    lines.push(`${i+1}. ${from} → ${to}: ${amt}${paid}`);
  });
  const text = lines.join("\n");
  if (navigator.share) navigator.share({ title: "Chakrata Settlement", text });
  else navigator.clipboard.writeText(text).then(() => showToast("Copied! 📤"));
}

// ── Helpers ───────────────────────────────
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmtDate(iso) { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; }
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
