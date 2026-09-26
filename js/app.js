// ──────────────────────────────────────────
//  WanderSplit · app.js
//  Firebase Realtime DB · 7 members · 2026
// ──────────────────────────────────────────

// ── Firebase config ──────────────────────
const firebaseConfig = {
  databaseURL: "https://trip-helper-10270-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ── Members ──────────────────────────────
const MEMBERS = ["Saloni","Dewaang","Chehak","Khushi","Priyam","Devansh","Bharat"];
const MEMBER_COLORS = ["c0","c1","c2","c3","c4","c5","c6"];

// ── State ────────────────────────────────
let expenses = [];
let activeDay = "all";
let customDays = [];

// ── Init ─────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildPayerGrid();
  buildParticipantChips();
  setupTabs();
  setupDayPills();
  listenFirebase();
  document.getElementById("tripNameDisplay").textContent = "Trip 2026 🌄";
  // default all participants selected
  document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.add("active"));
});

// ── Firebase listener ────────────────────
function listenFirebase() {
  db.ref("expenses").on("value", snap => {
    expenses = [];
    snap.forEach(child => {
      expenses.push({ id: child.key, ...child.val() });
    });
    renderFeed();
    updateTotal();
  });
}

// ── Build payer grid ─────────────────────
function buildPayerGrid() {
  const grid = document.getElementById("payerGrid");
  grid.innerHTML = MEMBERS.map((m, i) => `
    <div class="payer-item">
      <label>${m}</label>
      <input class="payer-amt" type="number" min="0" placeholder="0"
             id="payer_${m}" data-member="${m}" />
    </div>
  `).join("");
}

// ── Build participant chips ───────────────
function buildParticipantChips() {
  const container = document.getElementById("participantChips");
  container.innerHTML = MEMBERS.map((m, i) => `
    <span class="chip" data-member="${m}" onclick="toggleChip(this)">${m}</span>
  `).join("");
}

function toggleChip(el) {
  el.classList.toggle("active");
}

function selectAllParticipants() {
  document.querySelectorAll(".chip[data-member]").forEach(c => c.classList.add("active"));
}

// ── Tab switching ─────────────────────────
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

// ── Day pills ─────────────────────────────
function setupDayPills() {
  document.querySelectorAll(".day-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const day = pill.dataset.day;
      if (day === "custom") {
        openCustomDay();
        return;
      }
      document.querySelectorAll(".day-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDay = day;
      renderFeed();
    });
  });
}

function openCustomDay() {
  document.getElementById("customDayModal").style.display = "flex";
  document.getElementById("customDayInput").focus();
}
function closeCustomDay() {
  document.getElementById("customDayModal").style.display = "none";
  document.getElementById("customDayInput").value = "";
}
function saveCustomDay() {
  const val = document.getElementById("customDayInput").value.trim();
  if (!val) return;
  if (!customDays.includes(val)) {
    customDays.push(val);
    addDayPill(val);
    addDayTagOption(val);
  }
  closeCustomDay();
  // activate new pill
  document.querySelectorAll(".day-pill").forEach(p => {
    p.classList.remove("active");
    if (p.dataset.day === val) p.classList.add("active");
  });
  activeDay = val;
  renderFeed();
}

function addDayPill(label) {
  const strip = document.getElementById("dayStrip");
  const customBtn = strip.querySelector('[data-day="custom"]');
  const pill = document.createElement("button");
  pill.className = "day-pill";
  pill.dataset.day = label;
  pill.textContent = label;
  pill.addEventListener("click", () => {
    document.querySelectorAll(".day-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    activeDay = label;
    renderFeed();
  });
  strip.insertBefore(pill, customBtn);
}

function addDayTagOption(label) {
  const row = document.getElementById("dayTagRow");
  const tag = document.createElement("label");
  tag.className = "tag-chip";
  tag.innerHTML = `<input type="radio" name="expDay" value="${label}" /> ${label}`;
  row.appendChild(tag);
}

// ── Add Expense ───────────────────────────
function addExpense() {
  const desc = document.getElementById("expDesc").value.trim();
  if (!desc) { showToast("Please enter a description!"); return; }

  // Collect payer amounts
  const payers = {};
  let totalPaid = 0;
  MEMBERS.forEach(m => {
    const val = parseFloat(document.getElementById(`payer_${m}`).value) || 0;
    if (val > 0) { payers[m] = val; totalPaid += val; }
  });
  if (totalPaid === 0) { showToast("Enter at least one payer amount!"); return; }

  // Participants
  const participants = [...document.querySelectorAll(".chip[data-member].active")].map(c => c.dataset.member);
  if (participants.length === 0) { showToast("Select at least one participant!"); return; }

  const day = document.querySelector('input[name="expDay"]:checked')?.value || "Day 1";
  const cat = document.querySelector('input[name="expCat"]:checked')?.value || "📦 Other";
  const date = document.getElementById("expDate").value || "";

  const exp = { desc, payers, participants, day, cat, date, amt: totalPaid, ts: Date.now() };
  db.ref("expenses").push(exp)
    .then(() => {
      showToast("Expense added! 🎉");
      clearForm();
    })
    .catch(() => showToast("Error saving. Check DB rules!"));
}

function clearForm() {
  document.getElementById("expDesc").value = "";
  document.getElementById("expDate").value = "";
  MEMBERS.forEach(m => { document.getElementById(`payer_${m}`).value = ""; });
}

// ── Render Feed ───────────────────────────
function renderFeed() {
  const feed = document.getElementById("expenseFeed");
  let filtered = activeDay === "all" ? [...expenses] : expenses.filter(e => e.day === activeDay);
  filtered.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (filtered.length === 0) {
    feed.innerHTML = `<div class="empty-state">No expenses for this day yet!</div>`;
    return;
  }

  feed.innerHTML = filtered.map(e => {
    const payerStr = Object.entries(e.payers || {}).map(([n, a]) => `${n} ₹${a}`).join(", ");
    const catIcon = (e.cat || "📦 Other").split(" ")[0];
    const dateStr = e.date ? ` · ${formatDate(e.date)}` : "";
    const isHotel = e.day === "Hotel" || (e.cat || "").includes("Hotel");
    return `
      <div class="exp-card">
        <button class="del-btn" onclick="deleteExpense('${e.id}')">✕</button>
        <div class="exp-card-top">
          <div class="exp-cat-icon">${catIcon}</div>
          <div class="exp-info">
            <div class="exp-desc">${esc(e.desc)}</div>
            <div class="exp-meta">${e.participants?.join(", ") || ""}${dateStr}</div>
          </div>
          <div class="exp-amt">₹${(e.amt || 0).toLocaleString("en-IN")}</div>
        </div>
        <div class="exp-tags">
          <span class="exp-tag day">${e.day || ""}</span>
          <span class="exp-tag cat ${isHotel ? "hotel-tag" : ""}">${e.cat || ""}</span>
        </div>
        <div class="exp-payers">Paid by: ${payerStr}</div>
      </div>
    `;
  }).join("");
}

function updateTotal() {
  const total = expenses.reduce((s, e) => s + (e.amt || 0), 0);
  document.getElementById("totalChip").textContent = `Total: ₹${total.toLocaleString("en-IN")}`;
}

function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  db.ref("expenses/" + id).remove().then(() => showToast("Deleted!"));
}

// ── Settlement Logic ─────────────────────
function calculateSettlement() {
  const balance = {};
  MEMBERS.forEach(m => { balance[m] = 0; });

  expenses.forEach(exp => {
    const participants = exp.participants || MEMBERS;
    const share = (exp.amt || 0) / participants.length;
    Object.entries(exp.payers || {}).forEach(([n, a]) => { balance[n] = (balance[n] || 0) + a; });
    participants.forEach(p => { balance[p] = (balance[p] || 0) - share; });
  });

  // Render balance cards
  const balGrid = document.getElementById("balanceSummary");
  balGrid.innerHTML = MEMBERS.map((m, i) => {
    const b = Math.round((balance[m] || 0) * 100) / 100;
    const cls = b > 0.005 ? "positive" : b < -0.005 ? "negative" : "zero";
    const label = b > 0.005 ? "gets back" : b < -0.005 ? "owes" : "settled";
    return `
      <div class="balance-card">
        <div class="balance-name">${m}</div>
        <div class="balance-amt ${cls}">${b >= 0 ? "+" : ""}₹${Math.abs(b).toFixed(2)}</div>
        <div class="balance-label">${label}</div>
      </div>
    `;
  }).join("");

  // Minimize transactions
  const transactions = minimizeTransactions(balance);

  const settlDiv = document.getElementById("settlementResult");
  if (transactions.length === 0) {
    settlDiv.innerHTML = `<div class="empty-state">🎉 Everyone's settled up!</div>`;
    document.getElementById("receiptActions").style.display = "none";
  } else {
    settlDiv.innerHTML = transactions.map(t => `
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

  // Per-person breakdown
  renderPersonBreakdown(balance);
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
    if (debtors[i][1] < 0.005) i++;
    if (creditors[j][1] < 0.005) j++;
  }
  return txs;
}

function renderPersonBreakdown(balance) {
  const grid = document.getElementById("personBreakdown");
  const paidTotals = {};
  const splitTotals = {};
  MEMBERS.forEach(m => { paidTotals[m] = 0; splitTotals[m] = 0; });
  expenses.forEach(exp => {
    Object.entries(exp.payers || {}).forEach(([n, a]) => { paidTotals[n] = (paidTotals[n] || 0) + a; });
    const share = (exp.amt || 0) / (exp.participants?.length || 1);
    (exp.participants || MEMBERS).forEach(p => { splitTotals[p] = (splitTotals[p] || 0) + share; });
  });

  grid.innerHTML = MEMBERS.map((m, i) => {
    const b = Math.round((balance[m] || 0) * 100) / 100;
    const cls = b > 0 ? "positive" : b < 0 ? "negative" : "zero";
    return `
      <div class="person-card">
        <div class="person-name">
          <span class="person-avatar ${MEMBER_COLORS[i]}">${m[0]}</span>
          ${m}
        </div>
        <div class="person-stat">Paid: <span>₹${(paidTotals[m] || 0).toFixed(2)}</span></div>
        <div class="person-stat">Share: <span>₹${(splitTotals[m] || 0).toFixed(2)}</span></div>
        <div class="person-stat">Net: <span class="balance-amt ${cls}" style="font-size:13px">${b >= 0 ? "+" : ""}₹${Math.abs(b).toFixed(2)}</span></div>
      </div>
    `;
  }).join("");
}

// ── Copy / Share ──────────────────────────
function copySettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["WanderSplit Settlement:", ""];
  rows.forEach(row => {
    const from = row.querySelector(".settle-from").textContent;
    const to   = row.querySelector(".settle-to").textContent;
    const amt  = row.querySelector(".settle-amt").textContent;
    lines.push(`${from} → ${to}: ${amt}`);
  });
  lines.push("", `Total expenses: ${document.getElementById("totalChip").textContent}`);
  navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Copied! 📋"));
}

function shareSettlement() {
  const rows = document.querySelectorAll(".settle-row");
  const lines = ["✈️ WanderSplit Settlement\n"];
  rows.forEach(row => {
    const from = row.querySelector(".settle-from").textContent;
    const to   = row.querySelector(".settle-to").textContent;
    const amt  = row.querySelector(".settle-amt").textContent;
    lines.push(`💸 ${from} → ${to}: ${amt}`);
  });
  lines.push(`\n${document.getElementById("totalChip").textContent}`);
  const text = lines.join("\n");
  if (navigator.share) {
    navigator.share({ title: "WanderSplit", text });
  } else {
    navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard! 📤"));
  }
}

// ── Helpers ───────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y,mo,d] = iso.split("-");
  return `${d}/${mo}/${y}`;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
