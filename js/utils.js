const BF = window.BF || (window.BF = {});

BF.CATEGORIES = [
  "Food",
  "Rent",
  "Transport",
  "Shopping",
  "Entertainment",
  "EMI",
  "Utilities",
  "Education",
  "Healthcare",
  "Other",
];

BF.ESSENTIAL = new Set(["Rent", "Food", "EMI", "Utilities", "Healthcare", "Education", "Transport"]);
BF.DISCRETIONARY = new Set(["Shopping", "Entertainment", "Other"]);

BF.formatINR = function formatINR(n) {
  const num = Math.round(Number(n) || 0);
  const abs = Math.abs(num).toLocaleString("en-IN");
  return (num < 0 ? "-₹" : "₹") + abs;
};

BF.todayISO = function todayISO() {
  return new Date().toISOString().slice(0, 10);
};

BF.daysUntil = function daysUntil(iso) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso + "T00:00:00");
  return Math.round((b - a) / 86400000);
};

BF.prettyDate = function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

BF.monthKey = function monthKey(iso) {
  return (iso || BF.todayISO()).slice(0, 7);
};

BF.uid = function uid() {
  return "t_" + Math.random().toString(36).slice(2, 9);
};

BF.greeting = function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

BF.el = function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
};

BF.escape = function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

BF.toast = function toast(msg) {
  const n = document.getElementById("toast");
  n.textContent = msg;
  n.hidden = false;
  clearTimeout(BF._tt);
  BF._tt = setTimeout(() => {
    n.hidden = true;
  }, 2600);
};

BF.icon = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>`,
  tx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></svg>`,
  insights: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19V9M10 19V5M15 19v-7M20 19V8"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"/></svg>`,
};
