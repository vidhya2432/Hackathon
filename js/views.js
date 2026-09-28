(function (BF) {
  function nav(active) {
    const items = [
      ["home", BF.icon.home, BF.t("home")],
      ["transactions", BF.icon.tx, BF.t("tx")],
      ["insights", BF.icon.insights, BF.t("insights")],
      ["copilot", BF.icon.ai, BF.t("ai")],
      ["profile", BF.icon.user, BF.t("profile")],
    ];
    return `<nav class="nav"><div class="nav-brand"><span class="nav-brand-mark">₹</span><span>BharatFin AI</span></div>${items
      .map(
        ([id, ico, label]) =>
          `<button class="${active === id ? "active" : ""}" data-go="${id}">${ico}<span>${label}</span></button>`
      )
      .join("")}</nav>`;
  }

  function back(to) {
    return `<button class="back" data-go="${to}">← Back</button>`;
  }

  BF.views = {};

  BF.views.splash = () => `
    <section class="splash">
      <div>
        <div class="kicker">FinTech for Bharat</div>
        <div class="brand-mark" style="margin:18px 0">₹</div>
        <h1 class="display" style="font-size:40px;line-height:1.05">BharatFin AI</h1>
        <p style="opacity:.85;margin-top:8px">${BF.t("tagline")}</p>
        <div class="tricolor"></div>
        <p style="font-size:13px;opacity:.8">AI · Voice · தமிழ் · हिन्दी · Accessibility</p>
      </div>
      <div class="lower">
        <p class="subtitle">A simple way to understand and manage your money.</p>
        <div style="height:16px"></div>
        <button class="btn btn-primary" data-go="onboarding">Meet your copilot</button>
      </div>
    </section>`;

  const ONB = [
    { t: "Meet your AI Financial Copilot", d: "Ask your money a question. You do not need finance jargon." },
    { t: "Understand where your money goes.", d: "Every number is explained in plain language: what it means for you." },
    { t: "Ask questions in your language.", d: "English, Tamil, Hindi, Telugu, Malayalam, Kannada — and Tanglish." },
    { t: "Speak instead of typing.", d: "Add expenses and ask about EMI, surplus, or affordability with your voice." },
    { t: "Make better-informed spending decisions.", d: "Simulate a purchase before you buy. Educational guidance only." },
  ];

  BF.views.onboarding = (s) => {
    const i = s.onboardingStep || 0;
    const o = ONB[i];
    return `<section class="screen">
      <p class="kicker">Onboarding ${i + 1}/5</p>
      <h1 style="font-size:32px;margin:12px 0">${o.t}</h1>
      <p class="subtitle">${o.d}</p>
      <div class="card" style="margin:22px 0;min-height:160px;display:grid;place-items:center;text-align:center">
        <div>
          <div style="font-size:42px">${["🤝", "🔍", "🗣️", "🎤", "🎯"][i]}</div>
          <p class="subtitle" style="margin-top:8px">User input → AI understanding → analysis → explanation → action</p>
        </div>
      </div>
      <div class="dots">${ONB.map((_, x) => `<span class="${x === i ? "on" : ""}"></span>`).join("")}</div>
      <button class="btn btn-primary" data-action="onboard-next">${i === 4 ? BF.t("getStarted") : "Continue"}</button>
      ${i ? `<button class="btn btn-ghost" data-go="language">Skip</button>` : ""}
    </section>`;
  };

  BF.views.language = (s) => `
    <section class="screen">
      ${back("onboarding")}
      <p class="kicker">Language</p>
      <h1 style="margin:8px 0 6px">Choose your language</h1>
      <p class="subtitle">Choose your preferred language.</p>
      <div style="height:12px"></div>
      ${BF.LANGS.map(
        (l) => `<button class="lang-card ${s.language === l.id ? "active" : ""}" data-action="set-lang" data-lang="${l.id}">
          <span><strong>${l.native}</strong><br><small>${l.label}</small></span>
          <span>${s.language === l.id ? "✓" : ""}</span>
        </button>`
      ).join("")}
      <button class="btn btn-primary" data-go="login">Continue</button>
    </section>`;

  BF.views.login = () => `
    <section class="screen">
      ${back("language")}
      <p class="kicker">Welcome back</p>
      <h1 style="margin:8px 0 16px">Login / Sign up</h1>
      <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required /></div>
      <div class="field"><label for="pass">Password</label><input id="pass" type="password" autocomplete="current-password" required /></div>
      <button class="btn btn-primary" data-action="login">Enter dashboard</button>
      <button class="btn btn-outline" data-go="signup" style="margin-top:8px">Create a new account</button>
    </section>`;

  BF.views.signup = () => `
    <section class="screen">
      ${back("login")}
      <h1>Create account</h1>
      <div class="field"><label for="su-name">Name</label><input id="su-name" autocomplete="name" required /></div>
      <div class="field"><label for="su-email">Email</label><input id="su-email" type="email" autocomplete="email" required /></div>
      <div class="field"><label for="su-pass">Password</label><input id="su-pass" type="password" autocomplete="new-password" minlength="8" required /></div>
      <label class="subtitle"><input type="checkbox" id="consent" checked /> I consent to BharatFin AI analysing the financial numbers I type, only on this device.</label>
      <div style="height:12px"></div>
      <button class="btn btn-primary" data-action="signup">Continue to profile</button>
    </section>`;

  BF.views.setupProfile = (s) => `
    <section class="screen">
      <p class="kicker">Financial profile</p>
      <h1>Who is this copilot for?</h1>
      <div class="field"><label>Your name</label><input id="name" value="${BF.escape(s.profile.name)}" /></div>
      <div class="field"><label>City</label><input id="city" value="${BF.escape(s.profile.city)}" /></div>
      <p class="subtitle">Persona</p>
      <div class="chip-row" style="margin:8px 0 16px">
        ${[
          ["student", "College student"],
          ["professional", "First salary"],
          ["tier2", "Tier-2/3 family"],
          ["gig", "Gig / variable income"],
        ]
          .map(
            ([id, l]) =>
              `<button class="chip ${s.profile.persona === id ? "active" : ""}" data-action="persona" data-id="${id}">${l}</button>`
          )
          .join("")}
      </div>
      <button class="btn btn-primary" data-action="save-profile">Next: income</button>
    </section>`;

  BF.views.setupIncome = (s) => `
    <section class="screen">
      ${back("setup-profile")}
      <h1>Income setup</h1>
      <p class="subtitle">Use take-home monthly income. For gig work, enter a typical recent month.</p>
      <div class="field"><label>Monthly income (₹)</label><input id="income" type="number" value="${s.profile.monthlyIncome}" /></div>
      <label class="subtitle"><input type="checkbox" id="variable" ${s.profile.variableIncome ? "checked" : ""}/> My income changes every month</label>
      <div class="field" style="margin-top:12px"><label>Current savings balance (₹)</label><input id="savings" type="number" value="${s.profile.savingsBalance}" /></div>
      <button class="btn btn-primary" data-action="save-income">Next: expenses</button>
    </section>`;

  BF.views.setupExpenses = (s) => `
    <section class="screen">
      ${back("setup-income")}
      <h1>Typical monthly expenses</h1>
      <p class="subtitle">Add only the expenses you actually have. You can edit them later.</p>
      <div class="card" style="margin:12px 0">
        ${["Rent", "Food", "Transport", "EMI", "Utilities", "Shopping", "Entertainment", "Other"].map((category) => `
          <div class="field"><label for="setup-${category}">${category} (₹)</label><input id="setup-${category}" type="number" min="0" step="0.01" value="${s.financial[category === "Other" ? "otherExpenses" : category.toLowerCase()] || ""}" /></div>
        `).join("")}
      </div>
      <button class="btn btn-primary" data-action="finish-setup">Go to dashboard</button>
    </section>`;

  BF.views.budget = (s) => {
    const current = BF.compute(s).byCat;
    const fields = ["Rent", "Food", "Transport", "EMI", "Utilities", "Shopping", "Entertainment", "Other"];
    return `<section class="screen">
      ${back("home")}
      <p class="kicker">Live financial data</p>
      <h1>Edit monthly budget</h1>
      <p class="subtitle">Change any amount and save to instantly recalculate your surplus, wellness, forecasts and insights.</p>
      <div class="card" style="margin-top:14px">
        ${fields.map((c) => `<div class="field"><label>${c} (₹)</label><input id="budget-${c}" type="number" min="0" value="${current[c] || 0}" /></div>`).join("")}
        <button class="btn btn-primary" data-action="save-budget">Update dashboard</button>
      </div>
    </section>`;
  };

  BF.views.home = (s) => {
    const snap = BF.compute(s);
    const food = snap.changes.find((c) => c.cat === "Food");
    const emi = snap.upcoming.find((b) => /emi/i.test(b.name));
    const p = Math.round(snap.wellness.score);
    return `<section class="screen">
      <div class="hero-header">
        <div>
          <h1>${BF.greeting()}, ${BF.escape(s.profile.name)} 👋</h1>
          <p class="subtitle">${BF.t("snapshot")}</p>
        </div>
        <button class="avatar" data-go="profile">${s.profile.name.slice(0, 1)}</button>
      </div>
      <div class="grid-4">
        <button class="summary-card income" data-go="budget"><div class="label">${BF.t("income")}</div><div class="value">${BF.formatINR(snap.income)}</div></button>
        <button class="summary-card expense" data-go="transactions"><div class="label">${BF.t("expenses")}</div><div class="value">${BF.formatINR(snap.expenses)}</div></button>
        <button class="summary-card surplus" data-go="whatif"><div class="label">${BF.t("surplus")}</div><div class="value">${BF.formatINR(snap.surplus)}</div></button>
        <button class="summary-card savings" data-go="goals"><div class="label">${BF.t("savings")}</div><div class="value">${BF.formatINR(snap.savings)}</div></button>
      </div>
      <div class="card quick-metrics">
        <div><span class="label">Savings rate</span><strong>${snap.income ? Math.round(Math.max(0, snap.surplus) / snap.income * 100) : 0}%</strong></div>
        <div><span class="label">Expense ratio</span><strong>${snap.income ? Math.round(snap.expenses / snap.income * 100) : 0}%</strong></div>
        <div><span class="label">Next 7 days</span><strong>${BF.formatINR(snap.pressure.nearTotal)}</strong></div>
      </div>
      <div class="card" style="margin:14px 0;display:flex;gap:14px;align-items:center">
        <div class="wellness-ring" style="--p:${p}"><div class="inner">${snap.wellness.label}<br><small>${p}</small></div></div>
        <div>
          <p class="kicker">${BF.t("wellness")}</p>
          <p style="font-weight:800;margin:4px 0">Financial wellness: ${snap.wellness.label}</p>
          ${snap.wellness.factors
            .slice(0, 4)
            .map((f) => `<div class="${f.ok ? "check" : "warnc"}">${f.ok ? "✓" : "⚠"} ${f.label}</div>`)
            .join("")}
        </div>
      </div>
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-saffron" data-go="afford">${BF.t("afford")}</button>
        <button class="btn btn-primary" data-go="copilot">Ask AI</button>
      </div>
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-outline" data-go="budget">Edit monthly budget</button>
        <button class="btn btn-outline" data-go="whatif">What if?</button>
      </div>
      <div class="card">
        <p class="kicker">${BF.t("aiInsights")}</p>
        <div class="insight"><div class="ico">💡</div><div><strong>Insight</strong><p class="subtitle">Your food spending ${food && food.pct > 0 ? "increased by " + Math.round(food.pct) + "% compared with last month." : "is in line with last month."}</p></div></div>
        <div class="insight"><div class="ico">📅</div><div><strong>Upcoming</strong><p class="subtitle">${emi ? `EMI payment due in ${emi.days} days. Keep ${BF.formatINR(emi.amount)} ready.` : "No EMI stored."}</p></div></div>
        <div class="insight"><div class="ico">🛡</div><div><strong>Emergency fund</strong><p class="subtitle">Current reserve covers about ${snap.emergencyMonths.toFixed(1)} month of essentials (${BF.formatINR(snap.emergencyMonthly)}/month).</p></div></div>
        <div class="insight"><div class="ico">🎯</div><div><strong>Goal</strong><p class="subtitle">${s.profile.savingsTarget > 0 ? `You are ${BF.formatINR(Math.max(0, s.profile.savingsTarget - snap.surplus))} away from your ${BF.formatINR(s.profile.savingsTarget)} savings target.` : "Create a savings goal to track progress here."}</p></div></div>
      </div>
      <div class="card" style="margin-top:12px">
        <p class="kicker">Your AI Coach</p>
        <h3 style="margin:4px 0 8px">Small actions, explained clearly</h3>
        <div class="btn-row">
          <button class="btn btn-outline" data-action="ask" data-q="How can I save ₹500 more?">Save ₹500 more</button>
          <button class="btn btn-outline" data-action="ask" data-q="Analyse my food spending">Analyse food spending</button>
          <button class="btn btn-outline" data-go="goals">Set savings goal</button>
        </div>
      </div>
      ${nav("home")}
    </section>`;
  };

  BF.views.transactions = (s) => {
    const q = (s._q || "").toLowerCase();
    const cat = s._cat || "All";
    const list = s.transactions
      .filter((t) => t.type === "expense")
      .filter((t) => (cat === "All" ? true : t.category === cat))
      .filter((t) => !q || (t.merchant + t.category).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
    return `<section class="screen">
      <div class="hero-header"><h1>Transactions</h1><div class="btn-row"><button class="btn btn-outline" data-action="export-tx">Export CSV</button><button class="btn btn-primary" style="width:auto;padding:10px 12px" data-go="add-expense">+ Add</button></div></div>
      <div class="field"><label for="search">Search transactions</label><input id="search" placeholder="Search merchant or category" value="${BF.escape(s._q || "")}" /></div>
      <div class="chip-row" style="margin-bottom:8px">
        ${["All", ...BF.CATEGORIES].map((c) => `<button class="chip ${cat === c ? "active" : ""}" data-action="filter-cat" data-id="${c}">${c}</button>`).join("")}
      </div>
      <button class="btn btn-outline" data-go="voice-expense">🎤 Add using voice</button>
      <div class="card" style="margin-top:12px">
        ${list
          .slice(0, 40)
          .map(
            (t) => `<div class="tx">
            <div class="cat-dot">${BF.categoryEmoji(t.category)}</div>
            <div><strong>${BF.escape(t.merchant)}</strong><div class="meta">${t.category} · ${BF.prettyDate(t.date)} · ${t.method}</div></div>
            <div style="text-align:right"><div class="amt">${BF.formatINR(t.amount)}</div>
              <button class="back" data-action="edit-tx" data-id="${t.id}">Edit</button></div>
          </div>`
          )
          .join("")}
      </div>
      ${nav("transactions")}
    </section>`;
  };

  BF.views.addExpense = (s) => {
    const d = s._draft || { amount: "", category: "Food", merchant: "", date: BF.todayISO(), method: "UPI" };
    return `<section class="screen">
      ${back("transactions")}
      <h1>${d.id ? "Edit" : "Add"} expense</h1>
      <div class="field"><label for="amt">Amount (₹)</label><input id="amt" type="number" min="0.01" step="0.01" required value="${d.amount}" /></div>
      <div class="field"><label>Category</label>
        <select id="cat">${BF.CATEGORIES.map((c) => `<option ${d.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
      </div>
      <div class="field"><label for="merch">Description / merchant</label><input id="merch" maxlength="80" required value="${BF.escape(d.merchant)}" /></div>
      <div class="field"><label for="date">Date</label><input id="date" type="date" required value="${d.date}" /></div>
      <div class="field"><label>Payment method</label>
        <select id="method">${["Cash", "UPI", "Card", "Bank"].map((m) => `<option ${d.method === m ? "selected" : ""}>${m}</option>`).join("")}</select>
      </div>
      <button class="btn btn-primary" data-action="save-tx">Save</button>
      ${d.id ? `<button class="btn btn-ghost" data-action="del-tx">Delete</button>` : ""}
      <button class="btn btn-outline" data-go="voice-expense" style="margin-top:8px">🎤 Fill with voice</button>
    </section>`;
  };

  BF.views.voiceExpense = (s) => `
    <section class="screen">
      ${back("add-expense")}
      <h1>Voice expense entry</h1>
      <p class="subtitle">Say an expense such as “I spent ₹350 on dinner.”</p>
      <div class="mic-wrap"><button class="mic" data-action="voice-exp" aria-label="Speak">🎤</button></div>
      <div class="field"><label>Recognized speech</label><textarea id="voice-text" placeholder="Your words will show here"></textarea></div>
      <div id="voice-parse" class="card subtitle">Amount, category and description will appear after you speak or type.</div>
      <button class="btn btn-primary" data-action="parse-voice">Understand & save draft</button>
      ${s._draft ? `<div class="card" style="margin-top:12px"><p class="kicker">Detected expense</p><div class="impact-row"><span>Amount</span><strong>${BF.formatINR(s._draft.amount || 0)}</strong></div><div class="impact-row"><span>Category</span><strong>${BF.escape(s._draft.category || "Other")}</strong></div><div class="impact-row"><span>Description</span><strong>${BF.escape(s._draft.merchant || "")}</strong></div><div class="btn-row"><button class="btn btn-primary" data-action="confirm-voice">Add expense</button><button class="btn btn-outline" data-go="add-expense">Edit</button><button class="btn btn-ghost" data-action="cancel-voice">Cancel</button></div></div>` : ""}
    </section>`;

  BF.views.copilot = (s) => {
    const prompts = [
      "How much did I spend this month?",
      "Can I afford ₹3,000?",
      "Where am I spending too much?",
      "How much should I save?",
      "When is my next EMI?",
      "Show my monthly cash flow",
      "Forecast my next month",
      "Indha maasam naan evlo selavu pannirukken?",
      "₹3000 phone vaangalaama?",
    ];
    const msgs = s.messages.length
      ? s.messages
      : [{ role: "ai", text: "Ask a question about your money." }];
    return `<section class="screen">
      <p class="kicker">${BF.t("copilot")}</p>
      <h1>Ask your money</h1>
      <p class="subtitle">${BF.t("copilotSub")}</p>
      <div class="chip-row" style="margin:10px 0">${BF.LANGS.slice(0, 4)
        .concat(BF.LANGS.slice(6))
        .map((l) => `<button class="chip ${s.language === l.id ? "active" : ""}" data-action="set-lang" data-lang="${l.id}">${l.native}</button>`)
        .join("")}</div>
      <div class="chip-row">${prompts.map((p) => `<button class="chip" data-action="ask" data-q="${BF.escape(p)}">${p}</button>`).join("")}</div>
      <div class="chat" style="margin-top:12px">${msgs
        .map((m) => `<div class="bubble ${m.role === "user" ? "user" : "ai"}">${BF.escape(m.text)}</div>`)
        .join("")}</div>
      <div class="field" style="margin-top:10px"><label>Recognized / typed question</label>
        <input id="ask" placeholder="${BF.t("typeQ")}" value="${BF.escape(s.recognizedSpeech || "")}" /></div>
      <div class="btn-row">
        <button class="btn btn-outline" data-action="mic-ask">🎤 ${BF.t("speak")}</button>
        <button class="btn btn-primary" data-action="send-ask">Ask</button>
      </div>
      ${nav("copilot")}
    </section>`;
  };

  BF.views.afford = (s) => {
    const snap = BF.compute(s);
    const amt = Number(s._affordAmt || 3000);
    const sim = BF.simulatePurchase(snap, amt, s._affordItem || "new phone");
    const needle = sim.risk === "Low" ? 12 : sim.risk === "Moderate" ? 48 : 86;
    return `<section class="screen">
      ${back("home")}
      <p class="kicker">Affordability simulator</p>
      <h1>Can I afford this?</h1>
      <p class="subtitle">Not a yes/no. We show the impact on surplus, EMI and buffer.</p>
      <div class="field"><label>Purchase amount (₹)</label><input id="aff-amt" type="number" value="${amt}" /></div>
      <div class="field"><label>What is it?</label><input id="aff-item" value="${BF.escape(s._affordItem || "new phone")}" /></div>
      <input id="aff-slider" type="range" min="0" max="20000" step="100" value="${amt}" data-action="afford-live" />
      <button class="btn btn-primary" data-action="run-afford">Simulate impact</button>
      <div class="card" style="margin-top:14px">
        <h3>Purchase impact</h3>
        <div class="impact-row"><span>Current surplus</span><strong>${BF.formatINR(sim.currentSurplus)}</strong></div>
        <div class="impact-row"><span>Purchase</span><strong>-${BF.formatINR(sim.amount)}</strong></div>
        <div class="impact-row"><span>Remaining surplus</span><strong>${BF.formatINR(sim.remaining)}</strong></div>
        <div class="impact-row"><span>Upcoming EMI</span><strong>${sim.emi ? BF.formatINR(sim.emi.amount) + " in " + sim.emi.days + " days" : "None soon"}</strong></div>
        <div class="impact-row"><span>Risk indicator</span><span class="pill ${sim.risk === "Low" ? "ok" : sim.risk === "Moderate" ? "warn" : "risk"}">${sim.risk}</span></div>
        <div class="impact-row"><span>Emergency reserve after purchase</span><strong>${sim.emergencyMonthsAfter.toFixed(1)} months</strong></div>
        <div class="risk-meter"><div class="needle" style="left:${needle}%"></div></div>
        <p><strong>Reason</strong></p>
        ${sim.reasons.map((r) => `<p class="subtitle">• ${r}</p>`).join("")}
        <p style="margin-top:8px">${sim.action}</p>
      </div>
    </section>`;
  };

  BF.views.whatif = (s) => {
    const base = BF.compute(s);
    const w = s._whatif || { income: base.income, rent: base.byCat.Rent || 0, emi: base.emi };
    const projectedExpenses = base.expenses - (base.byCat.Rent || 0) - base.emi + w.rent + w.emi;
    const projectedSurplus = w.income - projectedExpenses;
    return `<section class="screen">
      ${back("home")}
      <p class="kicker">Scenario planning</p>
      <h1>What if?</h1>
      <p class="subtitle">Change income, rent or EMI to see how your monthly cash flow could move.</p>
      <div class="card">
        <div class="field"><label>Monthly income (₹)</label><input id="whatif-income" type="number" value="${w.income}" /></div>
        <div class="field"><label>Monthly rent (₹)</label><input id="whatif-rent" type="number" value="${w.rent}" /></div>
        <div class="field"><label>Monthly EMI (₹)</label><input id="whatif-emi" type="number" value="${w.emi}" /></div>
        <button class="btn btn-primary" data-action="run-whatif">Update scenario</button>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>Projected result</h3>
        <div class="impact-row"><span>Projected expenses</span><strong>${BF.formatINR(projectedExpenses)}</strong></div>
        <div class="impact-row"><span>Projected surplus</span><strong>${BF.formatINR(projectedSurplus)}</strong></div>
        <div class="impact-row"><span>Expense ratio</span><strong>${w.income ? Math.round(projectedExpenses / w.income * 100) : 0}%</strong></div>
        <span class="pill ${projectedSurplus >= 0 ? "ok" : "risk"}">${projectedSurplus >= 0 ? "Cash flow remains positive" : "Scenario creates a shortfall"}</span>
      </div>
    </section>`;
  };

  BF.views.insights = (s) => {
    const snap = BF.compute(s);
    return `<section class="screen">
      <h1>Insights</h1>
      <p class="subtitle">Simple pictures of what changed — plus a sentence on what to do.</p>
      <div class="card" style="margin:12px 0"><h3>Monthly expense trend</h3><div class="chart-box"><canvas id="c-line"></canvas></div></div>
      <div class="card"><h3>Category distribution</h3><div class="chart-box"><canvas id="c-donut"></canvas></div></div>
      <div class="card" style="margin-top:12px"><h3>Income vs expenses</h3><div class="chart-box"><canvas id="c-bar"></canvas></div></div>
      <div class="card" style="margin-top:12px"><h3>Monthly savings</h3><div class="chart-box"><canvas id="c-save"></canvas></div></div>
      <div class="card" style="margin-top:12px">
        <h3>Spending changes</h3>
        ${snap.changes
          .filter((c) => c.last)
          .map(
            (c) =>
              `<div class="impact-row"><span>${c.cat}</span><strong style="color:${c.pct > 8 ? "var(--rose)" : c.pct < -8 ? "var(--leaf)" : "inherit"}">${c.pct > 0 ? "+" : ""}${Math.round(c.pct)}%</strong></div>`
          )
          .join("")}
      </div>
      <div class="card" style="margin-top:12px">
        <h3>Financial stress forecast</h3>
        <span class="pill ${snap.pressure.level === "Low" ? "ok" : snap.pressure.level === "Medium" ? "warn" : "risk"}">${snap.pressure.level} pressure</span>
        ${snap.pressure.reasons.map((r) => `<p class="subtitle" style="margin-top:8px">• ${r}</p>`).join("")}
      </div>
      <div class="card" style="margin-top:12px">
        <h3>Next-month cash-flow forecast</h3>
        <div class="impact-row"><span>Expected expenses</span><strong>${BF.formatINR(snap.forecast.projectedExpenses)}</strong></div>
        <div class="impact-row"><span>Projected surplus</span><strong>${BF.formatINR(snap.forecast.projectedSurplus)}</strong></div>
        <p class="subtitle" style="margin-top:8px">${snap.forecast.recurring.length ? `${snap.forecast.recurring.length} recurring payment${snap.forecast.recurring.length === 1 ? "" : "s"} detected.` : "Add more dated transactions to identify recurring payments."}</p>
      </div>
      <div class="chip-row" style="margin-top:12px">
        <button class="chip" data-go="analytics">Spending analytics</button>
        <button class="chip" data-go="goals">Goals</button>
        <button class="chip" data-go="emi">EMI</button>
        <button class="chip" data-go="emergency">Emergency fund</button>
      </div>
      ${nav("insights")}
    </section>`;
  };

  BF.views.analytics = (s) => {
    const snap = BF.compute(s);
    const top = Object.entries(snap.byCat).sort((a, b) => b[1] - a[1])[0];
    return `<section class="screen">
      ${back("insights")}
      <h1>Spending analytics</h1>
      <div class="card">
        <p><strong>Top category:</strong> ${top[0]} (${BF.formatINR(top[1])}).</p>
        <p style="margin-top:8px"><strong>Why?</strong> Essentials are ${BF.formatINR(snap.essential)}; discretionary is ${BF.formatINR(snap.discretionary)}.</p>
        <p style="margin-top:8px"><strong>Next step:</strong> Keep EMI and rent fixed. Trim food or shopping to increase surplus.</p>
      </div>
      <div class="card" style="margin-top:12px">
        ${Object.entries(snap.byCat)
          .filter(([, v]) => v)
          .map(([k, v]) => `<button class="impact-row analytics-category" data-action="analytics-category" data-id="${k}"><span>${BF.categoryEmoji(k)} ${k}</span><strong>${BF.formatINR(v)}</strong></button>`)
          .join("")}
        ${s._analyticsCat ? `<div class="notice" style="margin-top:12px"><strong>${s._analyticsCat} transactions</strong>${s.transactions.filter((t) => t.type === "expense" && t.category === s._analyticsCat).map((t) => `<div class="impact-row"><span>${BF.escape(t.merchant)}</span><strong>${BF.formatINR(t.amount)}</strong></div>`).join("") || "<p>No transactions in this category.</p>"}</div>` : ""}
      </div>
    </section>`;
  };

  BF.views.goals = (s) => {
    const snap = BF.compute(s);
    return `<section class="screen">
      ${back("insights")}
      <h1>Financial goals</h1>
      ${snap.goals
        .map(
          (g) => `<div class="card" style="margin:10px 0">
          <h3>${BF.escape(g.name)}</h3>
          <p class="subtitle">Target ${BF.formatINR(g.target)} · Current ${BF.formatINR(g.current)}</p>
          <div class="progress" style="margin:10px 0"><span style="width:${Math.min(100, g.progress * 100)}%"></span></div>
          <p>Progress ${Math.round(g.progress * 100)}%</p>
          <p class="subtitle">Suggested this month: ${BF.formatINR(g.suggested)}</p>
          <div class="btn-row"><input id="goal-add-${g.id}" type="number" placeholder="Add money" /><button class="btn btn-outline" data-action="add-goal-money" data-id="${g.id}">Add money</button><button class="btn btn-ghost" data-action="delete-goal" data-id="${g.id}">Delete</button></div>
        </div>`
        )
        .join("")}
      <div class="field"><label>New goal name</label><input id="gname" placeholder="e.g. Family trip" /></div>
      <div class="field"><label>Target (₹)</label><input id="gamt" type="number" /></div>
      <button class="btn btn-primary" data-action="add-goal">Create goal</button>
    </section>`;
  };

  BF.views.emi = (s) => {
    const snap = BF.compute(s);
    const windowDays = Number(s._cashflowWindow || 30);
    const bills = snap.upcoming.filter((b) => b.days >= 0 && b.days <= windowDays);
    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    return `<section class="screen">
      ${back("home")}
      <h1>EMI / upcoming payments</h1>
      <div class="chip-row" style="margin:12px 0"><button class="chip ${windowDays === 7 ? "active" : ""}" data-action="cashflow-window" data-value="7">7 days</button><button class="chip ${windowDays === 15 ? "active" : ""}" data-action="cashflow-window" data-value="15">15 days</button><button class="chip ${windowDays === 30 ? "active" : ""}" data-action="cashflow-window" data-value="30">30 days</button></div>
      <div class="card" style="margin-bottom:12px"><div class="impact-row"><span>Due within ${windowDays} days</span><strong>${BF.formatINR(total)}</strong></div><div class="impact-row"><span>Payments</span><strong>${bills.length}</strong></div></div>
      <div class="card">
        ${bills
          .map(
            (b) => `<div class="tx">
            <div class="cat-dot">📅</div>
            <div><strong>${BF.escape(b.name)}</strong><div class="meta">${b.days} days · ${b.dueDate}</div></div>
            <div class="amt">${BF.formatINR(b.amount)}</div>
          </div>`
          )
          .join("") || '<p class="subtitle">No payments in this period.</p>'}
      </div>
    </section>`;
  };

  BF.views.emergency = (s) => {
    const snap = BF.compute(s);
    const months = Number(s._emergencyMonths || 3);
    const essential = Number(s._emergencyEssential || snap.emergencyMonthly);
    const target = essential * months;
    const remaining = Math.max(0, target - snap.savings);
    const monthly = Math.ceil(remaining / 12 / 100) * 100;
    return `<section class="screen">
      ${back("home")}
      <h1>Emergency fund</h1>
      <p class="subtitle">Estimated from essential monthly expenses (rent, food, EMI, transport, utilities, healthcare, education).</p>
      <div class="card">
        <div class="field"><label>Essential monthly expenses (₹)</label><input id="emergency-essential" type="number" value="${essential}" /></div>
        <button class="btn btn-outline" data-action="set-emergency-essential">Recalculate reserve</button>
        <div class="chip-row"><button class="chip ${months === 1 ? "active" : ""}" data-action="set-emergency-months" data-value="1">1 month</button><button class="chip ${months === 3 ? "active" : ""}" data-action="set-emergency-months" data-value="3">3 months</button><button class="chip ${months === 6 ? "active" : ""}" data-action="set-emergency-months" data-value="6">6 months</button></div>
        <div class="impact-row"><span>Essential monthly</span><strong>${BF.formatINR(snap.emergencyMonthly)}</strong></div>
        <div class="impact-row"><span>1-month reserve</span><strong>${BF.formatINR(snap.emergencyMonthly)}</strong></div>
        <div class="impact-row"><span>3-month reserve</span><strong>${BF.formatINR(snap.emergencyMonthly * 3)}</strong></div>
        <div class="impact-row"><span>6-month reserve</span><strong>${BF.formatINR(snap.emergencyMonthly * 6)}</strong></div>
        <div class="impact-row"><span>You have now</span><strong>${BF.formatINR(snap.savings)} (~${snap.emergencyMonths.toFixed(1)} mo)</strong></div>
        <div class="impact-row"><span>Selected target / remaining</span><strong>${BF.formatINR(target)} / ${BF.formatINR(remaining)}</strong></div>
        <div class="impact-row"><span>Suggested monthly contribution</span><strong>${BF.formatINR(monthly)}</strong></div>
      </div>
    </section>`;
  };

  BF.views.notifications = (s) => {
    const notes = BF.buildNotifications(BF.compute(s), s);
    return `<section class="screen">
      ${back("profile")}
      <h1>Notifications</h1>
      <p class="subtitle">${s.notificationsEnabled ? "Notifications are on." : "Notifications are off."}</p>
      ${s.notificationsEnabled ? notes.map((n) => `<div class="card" style="margin:10px 0;opacity:${s.notificationsRead[n.id] ? ".62" : "1"}"><strong>${n.title}</strong><p class="subtitle">${n.body}</p>${s.notificationsRead[n.id] ? '<span class="pill ok">Read</span>' : `<button class="btn btn-outline" data-action="read-notification" data-id="${n.id}" style="margin-top:8px">Mark as read</button>`}</div>`).join("") : '<div class="notice" style="margin-top:14px">Turn notifications on in Edit profile to receive updates here.</div>'}
    </section>`;
  };

  BF.views.profile = (s) => `
    <section class="screen">
      <div class="hero-header">
        <div><p class="kicker">Account</p><h1>${BF.escape(s.profile.name)}</h1><p class="subtitle">${BF.escape(s.profile.city)} · ${s.profile.persona}</p></div>
        <button class="avatar" data-go="edit-profile">${s.profile.name.slice(0, 1)}</button>
      </div>
      <div class="card" style="margin:12px 0">
        <button class="lang-card" data-go="edit-profile"><span>Edit profile</span><span>›</span></button>
        <button class="lang-card" data-go="language-settings"><span>Language settings</span><span>›</span></button>
        <button class="lang-card" data-action="toggle-theme"><span>Theme</span><span>${s.theme === "dark" ? "Dark" : "Light"} · ›</span></button>
        <button class="lang-card" data-go="privacy"><span>Privacy & security</span><span>›</span></button>
        <button class="lang-card" data-go="notifications"><span>Notifications</span><span>›</span></button>
        <button class="lang-card" data-go="about"><span>Why BharatFin (comparison)</span><span>›</span></button>
      </div>
      <button class="btn btn-outline" data-action="reset">Reset my data</button>
      ${nav("profile")}
    </section>`;

  BF.views.editProfile = (s) => `
    <section class="screen">
      ${back("profile")}
      <p class="kicker">Account settings</p>
      <h1>Edit profile</h1>
      <div class="card" style="margin-top:14px">
        <div class="field"><label>Name</label><input id="settings-name" value="${BF.escape(s.profile.name)}" /></div>
        <div class="field"><label>City</label><input id="settings-city" value="${BF.escape(s.profile.city)}" /></div>
        <div class="field"><label>Profile type</label><select id="settings-persona">${[
          ["student", "College student"],
          ["professional", "First salary"],
          ["tier2", "Tier-2/3 family"],
          ["gig", "Gig / variable income"],
        ].map(([id, label]) => `<option value="${id}" ${s.profile.persona === id ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <label class="subtitle" style="display:block;margin:14px 0"><input type="checkbox" id="notifications-enabled" ${s.notificationsEnabled ? "checked" : ""}/> Enable notifications</label>
        <button class="btn btn-primary" data-action="save-settings">Save changes</button>
      </div>
    </section>`;

  BF.views.languageSettings = (s) => BF.views.language(s).replace('data-go="login"', 'data-go="profile"').replace(back("onboarding"), back("profile"));

  BF.views.privacy = (s) => `
    <section class="screen">
      ${back("profile")}
      <h1>Privacy & security</h1>
      <div class="card">
        <p><strong>Privacy</strong><br><span class="subtitle">Your financial data is stored through your connected account and local fallback.</span></p>
        <label class="subtitle" style="display:block;margin:10px 0"><input type="checkbox" id="pinon" ${s.pinEnabled ? "checked" : ""}/> Enable PIN lock</label>
      </div>
      <button class="btn btn-outline" data-action="toggle-pin" style="margin-top:10px">Save privacy settings</button>
      <button class="btn btn-outline" data-action="lock-now" style="margin-top:8px" ${s.pinEnabled ? "" : "disabled"}>Lock now</button>
      <button class="btn btn-ghost" data-action="wipe">Delete all financial records</button>
    </section>`;

  BF.views.about = () => `
    <section class="screen">
      ${back("profile")}
      <p class="kicker">Positioning</p>
      <h1>Understand your money. Simply.</h1>
      <p class="subtitle">Existing apps are not all the same. Common gaps this prototype addresses:</p>
      ${[
        ["Transaction tracking", "Users still interpret numbers themselves", "AI explains the situation in simple language"],
        ["English-first UI", "Access barrier for regional-language users", "Indian languages + voice + Tanglish"],
        ["Static reports", "Mostly historical spending", "History + future affordability simulation"],
        ["Complex terminology", "Hard for beginners", "Conversational explanations"],
        ["Manual entry", "Time-consuming", "Voice entry + auto classification"],
      ]
        .map(
          ([a, b, c]) => `<div class="card" style="margin:10px 0"><p><strong>Existing pattern:</strong> ${a}</p>
          <p class="subtitle">${b}</p><p style="margin-top:6px"><strong>BharatFin:</strong> ${c}</p></div>`
        )
        .join("")}
    </section>`;

  BF.mountCharts = function mountCharts(s) {
    if (!window.Chart || !document.querySelector("canvas")) return;
    ["c-line", "c-donut", "c-bar", "c-save"].forEach((id) => {
      const node = document.getElementById(id);
      if (node && Chart.getChart(node)) Chart.getChart(node).destroy();
    });
    const snap = BF.compute(s);
    const teal = "#0b5c52";
    const saffron = "#d36a1f";
    const gold = "#c9a227";
    const chartText = s.theme === "dark" ? "#b8c9c0" : "#6b746c";
    const line = document.getElementById("c-line");
    if (line) {
      new Chart(line, {
        type: "line",
        data: {
          labels: snap.months.map((m) => m.label),
          datasets: [{ label: "Expenses", data: snap.months.map((m) => m.expenses), borderColor: teal, backgroundColor: "rgba(11,92,82,.12)", fill: true, tension: 0.35 }],
        },
        options: { plugins: { legend: { display: false }, }, scales: { x: { ticks: { color: chartText } }, y: { ticks: { color: chartText, callback: (v) => "₹" + v } } } },
      });
    }
    const donut = document.getElementById("c-donut");
    if (donut) {
      const entries = Object.entries(snap.byCat).filter(([, v]) => v);
      new Chart(donut, {
        type: "doughnut",
        data: {
          labels: entries.map((e) => e[0]),
          datasets: [{ data: entries.map((e) => e[1]), backgroundColor: ["#0b5c52", "#d36a1f", "#c9a227", "#3f7a4c", "#b44a3a", "#14786c", "#8a6a32", "#5c7a8a", "#7a4c6c", "#6b746c"] }],
        },
        options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12, color: chartText } } } },
      });
    }
    const bar = document.getElementById("c-bar");
    if (bar) {
      new Chart(bar, {
        type: "bar",
        data: {
          labels: snap.months.map((m) => m.label),
          datasets: [
            { label: "Income", data: snap.months.map((m) => m.income), backgroundColor: teal },
            { label: "Expenses", data: snap.months.map((m) => m.expenses), backgroundColor: saffron },
          ],
        },
        options: { plugins: { legend: { position: "bottom", labels: { color: chartText } } }, scales: { x: { ticks: { color: chartText } }, y: { ticks: { color: chartText } } } },
      });
    }
    const sav = document.getElementById("c-save");
    if (sav) {
      new Chart(sav, {
        type: "line",
        data: {
          labels: snap.months.map((m) => m.label),
          datasets: [{ label: "Savings", data: snap.months.map((m) => m.savings), borderColor: gold, tension: 0.35 }],
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: chartText } }, y: { ticks: { color: chartText } } } },
      });
    }
  };
})(window.BF);
