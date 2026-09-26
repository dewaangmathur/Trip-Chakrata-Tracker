// ══════════════════════════════════════════
//  Trip Chakrata Tracker · app.js
//  Firebase Realtime DB · 7 members · 2026
// ══════════════════════════════════════════

// ── Firebase ──────────────────────────────
const firebaseConfig = { databaseURL: "https://trip-helper-10270-default-rtdb.firebaseio.com" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ── Members + PINs ────────────────────────
const MEMBERS = ["Saloni","Dewaang","Chehak","Khushi","Priyam","Devansh","Bharat"];
const PINS    = { Saloni:"1111", Dewaang:"2222", Chehak:"3333", Khushi:"4444", Priyam:"5555", Devansh:"6666", Bharat:"7777" };
const COLORS  = ["c0","c1","c2","c3","c4","c5","c6"];

// ── State ────────────────────────────────
let currentUser = null;
let expenses    = [];
let activeDay   = "all";
let customDays  = [];
let editingId   = null;
let pendingTags = [];
let selectedCategory = "🍔 Food";

// ══════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Check session
  const saved = sessionStorage.getItem("chakrataUser");
  if (saved) { currentUser = saved; showApp(); return; }
  buildLoginGrid();
  setupPinInputs();
});

function buildLoginGrid() {
  const grid = document.getElementById("memberSelectGrid");
  grid.innerHTML = MEMBERS.map((m, i) => `
    <button class="member-login-btn" onclick="selectMember('${m}')" id="mbtn_${m}">
      <span class="m-avatar ${COLORS[i]}">${m[0]}</span>
      ${m}
    </button>
  `).join("");
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
    });
  });
}

function doLogin() {
  if (!currentUser) { document.getElementById("pinError").textContent = "Pick a name first!"; return; }
  const pin = [...document.querySelectorAll(".pin-input")].map(i => i.value).join("");
  if (pin === PINS[currentUser]) {
    sessionStorage.setItem("chakrataUser", currentUser);
    showApp();
  } else {
    document.getElementById("pinError").textContent = "Wrong PIN, try again!";
    document.querySelectorAll(".pin-input").forEach(i => i.value = "");
    document.querySelectorAll(".pin-input")[0].focus();
  }
}

function logout() {
  sessionStorage.removeItem("chakrataUser");
  currentUser = null;
  document.getElementById("appShell").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";
  document.querySelectorAll(".pin-input").forEach(i => i.value = "");
  document.getElementById("pinSection").style.display = "none";
  document.querySelectorAll(".member-login-btn").forEach(b => b.classList.remove("selected"));
}

function showApp() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appShell").style.display = "block";

  const idx = MEMBERS.indexOf(currentUser);
  document.getElementById("navName").textContent = currentUser;
  const av = document.getElementById("navAvatar");
  av.textContent = currentUser[0];
  av.className = "user-avatar " + COLORS[idx];

  buildParticipantChips();
  buildPayerSelects();
  setupTabs();
  setupDayPills();
  setupCatButtons();
  listenFirebase();
}

// ══════════════════════════════════════════
//  FIREBASE
// ══════════════════════════════════════════
function listenFirebase() {
  db.ref("expenses").on("value", snap => {
    expenses = [];
    snap.forEach(child => expenses.push({ id: child.key, ...child.val() }));
    renderFeed();
    updateTotal();
    renderHome();
  });
}

// ══════════════════════════════════════════
//  FORM SETUP
// ══════════════════════════════════════════
function buildParticipantChips() {
  const c = document.getElementById("participantChips");
  c.innerHTML = MEMBERS.map(m => `<span class="chip active" data-member="${m}" onclick="toggleChip(this)">${m}</span>`).join("");
}

function buildPayerSelects() {
  const sel1 = document.getElementById("expPaidBy");
  const sel2 = document.getElementById("ptFrom");
  const sel3 = document.getElementById("ptTo");
  const opts = MEMBERS.map(m => `<option value="${m}" ${m === currentUser ? "selected" : ""}>${m}</option>`).join("");
  sel1.innerHTML = opts;
  sel2.innerHTML = opts;
  sel3.innerHTML = MEMBERS.map(m => `<option value="${m}" ${m !== currentUser ? "selected" : ""}>${m}</option>`).join("");
}

function toggleChip(el) { el.classList.toggle("active"); }
function selectAll()    { document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.add("active")); }
function selectNone()   { document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.remove("active")); }
function selectOthers() {
  document.querySelectorAll(".chip[data-member]").forEach(c => {
    c.dataset.member === currentUser ? c.classList.remove("active") : c.classList.add("active");
  });
}

function setupCatButtons() {
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCategory = btn.dataset.cat;
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
function removeTag(tag) {
  pendingTags = pendingTags.filter(t => t !== tag);
  renderPendingTags();
}
function renderPendingTags() {
  document.getElementById("customTagsRow").innerHTML = pendingTags.map(t =>
    `<span class="custom-tag">#${esc(t)}<span class="custom-tag-del" onclick="removeTag('${esc(t)}')">✕</span></span>`
  ).join("");
}

// ══════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
//  DAY PILLS
// ══════════════════════════════════════════
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
function openCustomDay() { document.getElementById("customDayModal").style.display = "flex"; document.getElementById("customDayInput").focus(); }
function closeCustomDay() { document.getElementById("customDayModal").style.display = "none"; document.getElementById("customDayInput").value = ""; }
function saveCustomDay() {
  const val = document.getElementById("customDayInput").value.trim();
  if (!val) return;
  if (!customDays.includes(val)) {
    customDays.push(val);
    // add pill
    const strip = document.getElementById("dayStrip");
    const addBtn = strip.querySelector('[data-day="__add__"]');
    const pill = document.createElement("button");
    pill.className = "day-pill";
    pill.dataset.day = val;
    pill.textContent = val;
    pill.addEventListener("click", () => {
      document.querySelectorAll(".day-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDay = val;
      renderFeed();
    });
    strip.insertBefore(pill, addBtn);
    // add option in day select
    const sel = document.getElementById("expDay");
    const opt = document.createElement("option");
    opt.value = val; opt.textContent = val;
    sel.appendChild(opt);
    // add in edit day
    const esel = document.getElementById("editDay");
    const eopt = document.createElement("option");
    eopt.value = val; eopt.textContent = val;
    esel.appendChild(eopt);
  }
  closeCustomDay();
  document.querySelectorAll(".day-pill").forEach(p => {
    p.classList.remove("active");
    if (p.dataset.day === val) p.classList.add("active");
  });
  activeDay = val;
  renderFeed();
}

// ══════════════════════════════════════════
//  ADD EXPENSE
// ══════════════════════════════════════════
function addExpense() {
  const desc = document.getElementById("expDesc").value.trim();
  if (!desc) { showToast("Enter a description!"); return; }
  const amt = parseFloat(document.getElementById("expAmt").value);
  if (!amt || amt <= 0) { showToast("Enter a valid amount!"); return; }
  const paidBy = document.getElementById("expPaidBy").value;
  const participants = [...document.querySelectorAll(".chip[data-member].active")].map(c => c.dataset.member);
  if (participants.length === 0) { showToast("Select at least one participant!"); return; }
  const day  = document.getElementById("expDay").value;
  const cat  = selectedCategory;
  const date = document.getElementById("expDate").value || "";
  const tags = [...pendingTags];

  const exp = { desc, amt, paidBy, participants, day, cat, date, tags, type: "expense", addedBy: currentUser, ts: Date.now() };
  db.ref("expenses").push(exp)
    .then(() => {
      showToast("Added! 🎉");
      document.getElementById("expDesc").value = "";
      document.getElementById("expAmt").value = "";
      document.getElementById("expDate").value = "";
      pendingTags = [];
      renderPendingTags();
      selectAll();
    })
    .catch(() => showToast("Firebase error — check DB rules!"));
}

// ══════════════════════════════════════════
//  ADD DIRECT PAYMENT
// ══════════════════════════════════════════
function addDirectPayment() {
  const from = document.getElementById("ptFrom").value;
  const to   = document.getElementById("ptTo").value;
  const amt  = parseFloat(document.getElementById("ptAmt").value);
  const desc = document.getElementById("ptDesc").value.trim();
  if (from === to) { showToast("From and To can't be the same!"); return; }
  if (!amt || amt <= 0) { showToast("Enter a valid amount!"); return; }
  if (!desc) { showToast("Enter a reason!"); return; }

  const pay = { desc, amt, paidBy: from, paidTo: to, participants: [from, to], day: "Payment", cat: "💳 Payment", type: "direct", addedBy: currentUser, tags: [], ts: Date.now() };
  db.ref("expenses").push(pay)
    .then(() => {
      showToast(`Payment recorded! ${from} → ${to} ₹${amt}`);
      document.getElementById("ptAmt").value = "";
      document.getElementById("ptDesc").value = "";
    })
    .catch(() => showToast("Firebase error!"));
}

// ══════════════════════════════════════════
//  RENDER FEED
// ══════════════════════════════════════════
function renderFeed() {
  const feed = document.getElementById("expenseFeed");
  let list = activeDay === "all" ? [...expenses] : expenses.filter(e => e.day === activeDay);
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (list.length === 0) {
    feed.innerHTML = `<div class="empty-state">No expenses here yet!</div>`;
    return;
  }

  feed.innerHTML = list.map(e => {
    const mine = e.addedBy === currentUser || e.paidBy === currentUser;
    const catIcon = (e.cat || "📦").split(" ")[0];
    const dateStr = e.date ? ` · ${fmtDate(e.date)}` : "";
    const isHotel = e.day === "Hotel" || (e.cat || "").includes("Hotel");
    const isDirect = e.type === "direct";
    const tagsHtml = (e.tags || []).map(t => `<span class="exp-tag custom">#${esc(t)}</span>`).join("");
    const canEdit = e.addedBy === currentUser;
    const canDel  = e.addedBy === currentUser;

    return `
      <div class="exp-card">
        ${canEdit || canDel ? `
        <div class="exp-actions">
          ${canEdit ? `<button class="exp-action-btn" onclick="openEdit('${e.id}')">✏️ Edit</button>` : ""}
          ${canDel  ? `<button class="exp-action-btn del" onclick="deleteExpense('${e.id}')">✕</button>` : ""}
        </div>` : ""}
        <div class="exp-card-top">
          <div class="exp-cat-icon">${catIcon}</div>
          <div class="exp-info">
            <div class="exp-desc">${esc(e.desc)}</div>
            <div class="exp-meta">
              ${isDirect ? `${e.paidBy} → ${e.paidTo}` : `Paid by ${e.paidBy} · Split: ${(e.participants || []).join(", ")}`}${dateStr}
            </div>
          </div>
          <div class="exp-amt">₹${(e.amt || 0).toLocaleString("en-IN")}</div>
        </div>
        <div class="exp-footer">
          <span class="exp-tag day">${e.day}</span>
          <span class="exp-tag cat ${isHotel ? "hotel-tag" : ""} ${isDirect ? "direct" : ""}">${e.cat}</span>
          ${tagsHtml}
          ${mine ? '<span style="font-size:10px;color:var(--accent);font-weight:600">● yours</span>' : ""}
        </div>
      </div>
    `;
  }).join("");
}

function updateTotal() {
  const total = expenses.filter(e => e.type !== "direct").reduce((s, e) => s + (e.amt || 0), 0);
  document.getElementById("totalChip").textContent = `Total: ₹${total.toLocaleString("en-IN")}`;
}

function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  db.ref("expenses/" + id).remove().then(() => showToast("Deleted!"));
}

// ══════════════════════════════════════════
//  EDIT
// ══════════════════════════════════════════
function openEdit(id) {
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
  db.ref("expenses/" + editingId).update(updates).then(() => { showToast("Saved! ✅"); closeEdit(); });
}

// ══════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════
function renderHome() {
  const realExp = expenses.filter(e => e.type !== "direct");
  const total   = realExp.reduce((s, e) => s + (e.amt || 0), 0);
  document.getElementById("homeTotalAmt").textContent = "₹" + total.toLocaleString("en-IN");
  document.getElementById("homeTotalExp").textContent = realExp.length;

  // Balance for current user
  const bal = computeBalances();
  const myBal = Math.round((bal[currentUser] || 0) * 100) / 100;
  const myShareEl  = document.getElementById("homeMyShare");
  const myNetEl    = document.getElementById("homeMyNet");
  const myLabelEl  = document.getElementById("homeMyNetLabel");

  let myShare = 0;
  realExp.forEach(e => {
    if ((e.participants || []).includes(currentUser)) myShare += (e.amt || 0) / (e.participants.length || 1);
  });
  myShareEl.textContent = "₹" + myShare.toFixed(0);
  myNetEl.textContent = (myBal >= 0 ? "+" : "") + "₹" + Math.abs(myBal).toFixed(0);
  myNetEl.style.color = myBal >= 0 ? "var(--accent-g)" : "var(--accent-r)";
  myLabelEl.textContent = myBal >= 0 ? "You get back" : "You owe";

  // Paid summary
  const paidTotals = {};
  MEMBERS.forEach(m => { paidTotals[m] = 0; });
  realExp.forEach(e => { if (e.paidBy) paidTotals[e.paidBy] = (paidTotals[e.paidBy] || 0) + (e.amt || 0); });
  const grid = document.getElementById("paidSummaryGrid");
  grid.innerHTML = MEMBERS.map((m, i) => `
    <div class="paid-card">
      <div class="paid-card-avatar ${COLORS[i]}">${m[0]}</div>
      <div class="paid-card-name">${m}</div>
      <div class="paid-card-amt">₹${(paidTotals[m] || 0).toLocaleString("en-IN")}</div>
      <div class="paid-card-share">paid ${paidTotals[m] && total ? Math.round(paidTotals[m]/total*100) : 0}% of trip</div>
    </div>
  `).join("");

  // Recent 8
  const recent = [...expenses].sort((a,b) => (b.ts||0)-(a.ts||0)).slice(0, 8);
  const af = document.getElementById("activityFeed");
  if (recent.length === 0) { af.innerHTML = `<div class="empty-state">No activity yet!</div>`; return; }
  af.innerHTML = recent.map(e => {
    const icon = (e.cat || "📦").split(" ")[0];
    const isDirect = e.type === "direct";
    const meta = isDirect ? `${e.paidBy} → ${e.paidTo}` : `Paid by ${e.paidBy} · ${e.day}`;
    return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-info">
          <div class="activity-desc">${esc(e.desc)}</div>
          <div class="activity-meta">${meta}</div>
        </div>
        <div class="activity-amt">₹${(e.amt||0).toLocaleString("en-IN")}</div>
      </div>
    `;
  }).join("");
}

// ══════════════════════════════════════════
//  SETTLEMENT
// ══════════════════════════════════════════
function computeBalances() {
  const balance = {};
  MEMBERS.forEach(m => { balance[m] = 0; });

  expenses.forEach(exp => {
    if (exp.type === "direct") {
      // Direct payment: paidBy gets credit, paidTo gets debited
      balance[exp.paidBy] = (balance[exp.paidBy] || 0) + (exp.amt || 0);
      balance[exp.paidTo] = (balance[exp.paidTo] || 0) - (exp.amt || 0);
      return;
    }
    const participants = exp.participants || MEMBERS;
    const share = (exp.amt || 0) / participants.length;
    balance[exp.paidBy] = (balance[exp.paidBy] || 0) + (exp.amt || 0);
    participants.forEach(p => { balance[p] = (balance[p] || 0) - share; });
  });

  return balance;
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
      </div>
    `;
  }).join("");

  // Transactions
  const txs = minimizeTransactions(balance);
  const settlDiv = document.getElementById("settlementResult");
  if (txs.length === 0) {
    settlDiv.innerHTML = `<div class="empty-state">🎉 Everyone's settled!</div>`;
    document.getElementById("receiptActions").style.display = "none";
  } else {
    settlDiv.innerHTML = txs.map(t => `
      <div class="settle-row">
        <div class="settle-from">${t.from}</div>
        <div class="settle-arrow">→</div>
        <div class="settle-amt">₹${t.amt.toFixed(2)}</div>
        <div class="settle-arrow">→</div>
        <div class="settle-to">${t.to}</div>
      </div>
    `).join("");
    document.getElementById("receiptActions").style.display = "flex";
  }

  // Per-person
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
        <div class="person-name"><span class="person-avatar ${COLORS[i]}">${m[0]}</span>${m}</div>
        <div class="person-stat">Paid: <span>₹${(paidT[m]||0).toFixed(2)}</span></div>
        <div class="person-stat">Share: <span>₹${(shareT[m]||0).toFixed(2)}</span></div>
        <div class="person-stat">Net: <span class="balance-amt ${cls}" style="font-size:13px">${b>=0?"+":""}₹${Math.abs(b).toFixed(2)}</span></div>
      </div>
    `;
  }).join("");
}

function minimizeTransactions(balance) {
  let debtors   = Object.entries(balance).filter(([_,a]) => a < -0.005).map(([p,a]) => [p,-a]).sort((a,b) => b[1]-a[1]);
  let creditors = Object.entries(balance).filter(([_,a]) => a > 0.005).map(([p,a]) => [p,a]).sort((a,b) => b[1]-a[1]);
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

// ── Copy / Share ──────────────────────────
function copySettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["🏔️ Chakrata Trip — Final Settlement", ""];
  rows.forEach(r => {
    const from = r.querySelector(".settle-from").textContent;
    const to   = r.querySelector(".settle-to").textContent;
    const amt  = r.querySelector(".settle-amt").textContent;
    lines.push(`${from} → ${to}: ${amt}`);
  });
  lines.push("", document.getElementById("totalChip").textContent);
  navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Copied! 📋"));
}
function shareSettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["🏔️ Chakrata Trip Settlement\n"];
  rows.forEach(r => {
    lines.push(`💸 ${r.querySelector(".settle-from").textContent} → ${r.querySelector(".settle-to").textContent}: ${r.querySelector(".settle-amt").textContent}`);
  });
  lines.push("\n" + document.getElementById("totalChip").textContent);
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
