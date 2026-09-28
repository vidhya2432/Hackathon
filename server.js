const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const port = Number(process.env.PORT || 8080);
const root = __dirname;
const db = new sqlite3.Database(path.join(root, "bharatfin.sqlite"));

app.use(express.json({ limit: "2mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "microphone=(self)");
  next();
});
app.use(express.static(root));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      user_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK (amount >= 0),
      category TEXT NOT NULL,
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      method TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL CHECK (target >= 0),
      current REAL NOT NULL CHECK (current >= 0),
      monthly REAL NOT NULL CHECK (monthly >= 0),
      PRIMARY KEY (user_id, id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      due_date TEXT NOT NULL,
      category TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS integration_consents (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      consented INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, provider)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS product_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      route TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key.toString("hex"))));
  });
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authUser(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  db.get("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP", [tokenHash(token)], (error, row) => {
    if (error) return res.status(500).json({ error: "Could not verify session" });
    if (!row) return res.status(401).json({ error: "Session expired" });
    req.userId = row.user_id;
    return next();
  });
}

function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function validateState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "A state object is required";
  if (!Array.isArray(state.transactions) || !Array.isArray(state.goals) || !Array.isArray(state.bills)) {
    return "State must include transactions, goals, and bills arrays";
  }
  if (JSON.stringify(state).length > 2 * 1024 * 1024) return "State payload is too large";
  for (const tx of state.transactions) {
    if (!validId(tx.id) || !["income", "expense"].includes(tx.type) || !Number.isFinite(Number(tx.amount))) {
      return "Invalid transaction data";
    }
  }
  for (const goal of state.goals) {
    if (!validId(goal.id) || !String(goal.name || "").trim()) return "Invalid goal data";
  }
  for (const bill of state.bills) {
    if (!validId(bill.id) || !String(bill.name || "").trim() || !Number.isFinite(Number(bill.amount))) return "Invalid bill data";
  }
  return null;
}

function sendState(res, userId) {
  db.get("SELECT state_json, updated_at FROM app_state WHERE user_id = ?", [userId], (error, row) => {
    if (error) return res.status(500).json({ error: "Could not read application state" });
    if (!row) return res.status(404).json({ error: "State not found" });
    try {
      return res.json({ state: JSON.parse(row.state_json), updatedAt: row.updated_at });
    } catch {
      return res.status(500).json({ error: "Stored application state is invalid" });
    }
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bharatfin-ai", database: "sqlite" });
});

app.get("/api/health/ready", (_req, res) => {
  db.get("SELECT 1 AS ready", (error) => {
    if (error) return res.status(503).json({ ok: false, database: "unavailable" });
    return res.json({ ok: true, database: "ready" });
  });
});

app.post("/api/metrics", (req, res) => {
  const userId = String(req.query.userId || "anonymous").slice(0, 80);
  const eventName = String(req.body && req.body.eventName || "").trim();
  const route = String(req.body && req.body.route || "").trim().slice(0, 80);
  if (!/^[a-z0-9_.-]{2,60}$/i.test(eventName)) return res.status(400).json({ error: "Invalid event name" });
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === "object" ? JSON.stringify(req.body.metadata) : null;
  if (metadata && metadata.length > 2000) return res.status(400).json({ error: "Event metadata is too large" });
  db.run("INSERT INTO product_events (user_id, event_name, route, metadata_json) VALUES (?, ?, ?, ?)", [userId, eventName, route || null, metadata], (error) => {
    if (error) return res.status(500).json({ error: "Could not record event" });
    return res.status(202).json({ accepted: true });
  });
});

app.get("/api/metrics/summary", (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  db.all(
    "SELECT event_name AS event, COUNT(*) AS count FROM product_events WHERE created_at >= datetime('now', ?) GROUP BY event_name ORDER BY count DESC",
    [`-${days} days`],
    (error, rows) => {
      if (error) return res.status(500).json({ error: "Could not read metrics" });
      return res.json({ days, events: rows });
    }
  );
});

app.get("/api/resources", (_req, res) => {
  res.json({
    resources: [
      { id: "budget-basics", title: "Build a monthly budget", type: "guide", language: "en", description: "Separate essentials, flexible spending, and savings before planning purchases." },
      { id: "emergency-fund", title: "Start an emergency fund", type: "guide", language: "en", description: "Build toward one month of essential costs, then gradually target three months." },
      { id: "upi-safety", title: "Safer digital payments", type: "safety", language: "en", description: "Never share your UPI PIN, OTP, card PIN, or banking password with anyone." },
    ],
  });
});

app.get("/api/partners/offers", (_req, res) => {
  res.json({
    disclosure: "These are optional informational links, not endorsements or financial advice.",
    offers: [
      { id: "financial-literacy", partner: "Community financial education", category: "education", active: true },
      { id: "employer-wellness", partner: "Workplace financial wellness", category: "wellness", active: true },
    ],
  });
});

app.post("/api/auth/signup", async (req, res) => {
  const email = String(req.body && req.body.email || "").trim().toLowerCase();
  const name = String(req.body && req.body.name || "").trim();
  const password = String(req.body && req.body.password || "");
  if (!validEmail(email) || !name || password.length < 8) {
    return res.status(400).json({ error: "Name, valid email, and an 8-character password are required" });
  }
  const userId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  try {
    const passwordHash = await hashPassword(password, salt);
    db.run("INSERT INTO users (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)", [userId, email, name, passwordHash, salt], (error) => {
      if (error) return res.status(error.code === "SQLITE_CONSTRAINT" ? 409 : 500).json({ error: error.code === "SQLITE_CONSTRAINT" ? "Email already registered" : "Could not create account" });
      return res.status(201).json({ userId, email, name });
    });
  } catch {
    return res.status(500).json({ error: "Could not create account" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body && req.body.email || "").trim().toLowerCase();
  const password = String(req.body && req.body.password || "");
  db.get("SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?", [email], async (error, user) => {
    if (error) return res.status(500).json({ error: "Could not sign in" });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    try {
      const candidate = await hashPassword(password, user.password_salt);
      const matches = crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(user.password_hash, "hex"));
      if (!matches) return res.status(401).json({ error: "Invalid email or password" });
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      db.run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash(token), user.id, expires], (saveError) => {
        if (saveError) return res.status(500).json({ error: "Could not create session" });
        return res.json({ token, userId: user.id, email: user.email, name: user.name, expiresAt: expires });
      });
    } catch {
      return res.status(500).json({ error: "Could not sign in" });
    }
  });
});

app.post("/api/auth/logout", authUser, (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  db.run("DELETE FROM sessions WHERE token_hash = ?", [tokenHash(token)], (error) => {
    if (error) return res.status(500).json({ error: "Could not sign out" });
    return res.json({ ok: true });
  });
});

app.delete("/api/account", authUser, (req, res) => {
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    ["app_state", "transactions", "goals", "bills", "integration_consents", "sessions", "users"].forEach((table) => {
      db.run(`DELETE FROM ${table} WHERE ${table === "users" ? "id" : table === "sessions" ? "user_id" : "user_id"} = ?`, [req.userId]);
    });
    db.run("COMMIT", (error) => {
      if (error) return res.status(500).json({ error: "Could not delete account data" });
      return res.json({ ok: true });
    });
  });
});

app.get("/api/state", (req, res) => {
  sendState(res, String(req.query.userId || "demo-user"));
});

app.get("/api/integrations", (req, res) => {
  const userId = String(req.query.userId || "demo-user");
  db.all("SELECT provider, consented, updated_at AS updatedAt FROM integration_consents WHERE user_id = ?", [userId], (error, rows) => {
    if (error) return res.status(500).json({ error: "Could not read integration consent" });
    return res.json({ integrations: rows.map((row) => ({ ...row, consented: Boolean(row.consented) })) });
  });
});

app.put("/api/integrations/:provider/consent", (req, res) => {
  const userId = String(req.query.userId || "demo-user");
  const provider = String(req.params.provider || "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(provider)) return res.status(400).json({ error: "Invalid provider" });
  if (!req.body || typeof req.body.consented !== "boolean") return res.status(400).json({ error: "Consent must be true or false" });
  db.run(
    `INSERT INTO integration_consents (user_id, provider, consented, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, provider) DO UPDATE SET consented = excluded.consented, updated_at = CURRENT_TIMESTAMP`,
    [userId, provider, req.body.consented ? 1 : 0],
    (error) => {
      if (error) return res.status(500).json({ error: "Could not save integration consent" });
      return res.json({ provider, consented: req.body.consented });
    }
  );
});

app.get("/api/reminders", (req, res) => {
  const userId = String(req.query.userId || "demo-user");
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  db.get("SELECT state_json FROM app_state WHERE user_id = ?", [userId], (error, row) => {
    if (error) return res.status(500).json({ error: "Could not read reminders" });
    if (!row) return res.status(404).json({ error: "State not found" });
    try {
      const today = new Date();
      const limit = new Date(today);
      limit.setDate(limit.getDate() + days);
      const reminders = (JSON.parse(row.state_json).bills || []).filter((bill) => {
        const due = new Date(`${bill.dueDate}T00:00:00`);
        return !Number.isNaN(due.getTime()) && due >= new Date(today.toDateString()) && due <= limit;
      });
      return res.json({ reminders });
    } catch {
      return res.status(500).json({ error: "Stored application state is invalid" });
    }
  });
});

app.put("/api/state", (req, res) => {
  const userId = String(req.query.userId || "demo-user");
  const state = req.body && req.body.state;
  const validationError = validateState(state);
  if (validationError) return res.status(400).json({ error: validationError });
  const json = JSON.stringify(state);
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run(
      `INSERT INTO app_state (user_id, state_json, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP`,
      [userId, json]
    );
    db.run("DELETE FROM transactions WHERE user_id = ?", [userId]);
    db.run("DELETE FROM goals WHERE user_id = ?", [userId]);
    db.run("DELETE FROM bills WHERE user_id = ?", [userId]);
    const txStmt = db.prepare("INSERT INTO transactions (id, user_id, type, amount, category, merchant, date, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    state.transactions.forEach((tx) => txStmt.run(tx.id, userId, tx.type, Number(tx.amount), String(tx.category || "Other"), String(tx.merchant || ""), String(tx.date || ""), String(tx.method || "Other")));
    txStmt.finalize();
    const goalStmt = db.prepare("INSERT INTO goals (id, user_id, name, target, current, monthly) VALUES (?, ?, ?, ?, ?, ?)");
    state.goals.forEach((goal) => goalStmt.run(goal.id, userId, String(goal.name), Number(goal.target) || 0, Number(goal.current) || 0, Number(goal.monthly) || 0));
    goalStmt.finalize();
    const billStmt = db.prepare("INSERT INTO bills (id, user_id, name, amount, due_date, category) VALUES (?, ?, ?, ?, ?, ?)");
    state.bills.forEach((bill) => billStmt.run(bill.id, userId, String(bill.name), Number(bill.amount) || 0, String(bill.dueDate || ""), String(bill.category || "Other")));
    billStmt.finalize((error) => {
      if (error) {
        return db.run("ROLLBACK", () => res.status(500).json({ error: "Could not save application state" }));
      }
      db.run("COMMIT", (commitError) => {
        if (commitError) return res.status(500).json({ error: "Could not save application state" });
        return sendState(res, userId);
      });
    });
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(root, "index.html"));
});

const server = app.listen(port, () => {
  console.log(`BharatFin AI full-stack server running at http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing server.`);
  server.close(() => db.close(() => process.exit(0)));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
