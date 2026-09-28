(function (BF) {
  const ROUTES = {
    splash: () => BF.views.splash(),
    onboarding: (s) => BF.views.onboarding(s),
    language: (s) => BF.views.language(s),
    login: () => BF.views.login(),
    signup: () => BF.views.signup(),
    "setup-profile": (s) => BF.views.setupProfile(s),
    "setup-income": (s) => BF.views.setupIncome(s),
    "setup-expenses": (s) => BF.views.setupExpenses(s),
    budget: (s) => BF.views.budget(s),
    home: (s) => BF.views.home(s),
    transactions: (s) => BF.views.transactions(s),
    "add-expense": (s) => BF.views.addExpense(s),
    "voice-expense": (s) => BF.views.voiceExpense(s),
    copilot: (s) => BF.views.copilot(s),
    afford: (s) => BF.views.afford(s),
    whatif: (s) => BF.views.whatif(s),
    insights: (s) => BF.views.insights(s),
    analytics: (s) => BF.views.analytics(s),
    goals: (s) => BF.views.goals(s),
    emi: (s) => BF.views.emi(s),
    emergency: (s) => BF.views.emergency(s),
    notifications: (s) => BF.views.notifications(s),
    profile: (s) => BF.views.profile(s),
    "edit-profile": (s) => BF.views.editProfile(s),
    "language-settings": (s) => BF.views.languageSettings(s),
    privacy: (s) => BF.views.privacy(s),
    about: () => BF.views.about(),
  };

  function route() {
    return (location.hash.replace(/^#\/?/, "") || "splash").split("?")[0];
  }

  BF.go = function go(name) {
    location.hash = "#/" + name;
  };

  function renderLock() {
    const box = document.getElementById("lock-overlay");
    const s = BF.store.state;
    if (!(s.pinEnabled && s.locked && s.authenticated)) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = `<div style="text-align:center">
      <div class="brand-mark" style="margin:0 auto 12px">₹</div>
      <h2>BharatFin AI</h2>
      <p>Enter PIN to view your numbers</p>
      <div id="dots" style="margin:12px;letter-spacing:8px">••••</div>
      <div class="lock-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "←"]
        .map((n) => `<button data-d="${n}">${n}</button>`)
        .join("")}</div>
    </div>`;
    let buf = "";
    box.onclick = (e) => {
      const d = e.target.getAttribute("data-d");
      if (d === null || d === "") return;
      if (d === "←") buf = buf.slice(0, -1);
      else buf += d;
      document.getElementById("dots").textContent = "•".repeat(buf.length).padEnd(4, "·");
      if (buf.length === 4) {
        if (buf === s.pin) {
          BF.store.update((st) => (st.locked = false));
          render();
        } else {
          BF.toast("Incorrect PIN");
          buf = "";
        }
      }
    };
  }

  function render() {
    const s = BF.store.state;
    document.body.classList.toggle("dark-mode", s.theme === "dark");
    const name = route();
    if (name !== "splash") {
      const metricsUser = encodeURIComponent(localStorage.getItem("bharatfin-user-id") || "anonymous");
      fetch("/api/metrics?userId=" + metricsUser, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: "route_view", route: name }),
      }).catch(() => {
        console.warn("Pilot metrics unavailable.");
      });
    }
    const view = ROUTES[name] || ROUTES.splash;
    document.getElementById("app").innerHTML = view(s);
    const status = document.getElementById("status-bar");
    status.classList.toggle("has-theme-toggle", name !== "splash" && name !== "onboarding" && name !== "language" && name !== "login" && name !== "signup");
    status.setAttribute("data-theme-label", s.theme === "dark" ? "Light mode" : "Dark mode");
    status.innerHTML = `<span class="status-icons">BharatFin AI</span><span class="status-actions">${status.classList.contains("has-theme-toggle") ? `<button class="theme-toggle" data-action="toggle-theme" aria-label="Switch to ${s.theme === "dark" ? "light" : "dark"} mode">${s.theme === "dark" ? "☀" : "☾"}<span>${s.theme === "dark" ? "Light" : "Dark"}</span></button>` : ""}</span>`;
    renderLock();
    bind();
    // Paint the route first; charts are the only expensive part of navigation.
    if (document.querySelector("canvas")) {
      requestAnimationFrame(() => {
        if (route() === name) BF.mountCharts(s);
      });
    }
    window.renderBharatFin = render;
  }

  function ask(text) {
    const q = String(text || "").trim();
    if (!q) return;
    const res = BF.answer(q, BF.store.state);
    BF.store.update((st) => {
      st.recognizedSpeech = q;
      st.messages = (st.messages || []).concat([
        { role: "user", text: q },
        { role: "ai", text: res.text },
      ]);
      if (res.extra && res.extra.type === "draft_expense") {
        st._draft = {
          amount: res.extra.amount,
          category: res.extra.category,
          merchant: res.extra.description.slice(0, 40),
          date: BF.todayISO(),
          method: "UPI",
        };
      }

      if (res.parsed.intent === "afford" && res.extra && res.extra.sim) {
        st._affordAmt = res.extra.sim.amount;
        st._affordItem = res.extra.sim.label;
      }
    });
    BF.speech.speak(res.text, res.parsed.lang);
    if (res.parsed.intent === "afford") BF.go("afford");
    else if (res.extra && res.extra.type === "draft_expense") {
      BF.toast("Voice expense understood — confirm to save");
      BF.go("add-expense");
    } else BF.go("copilot");
  }

  async function authenticate(action) {
    const isSignup = action === "signup";
    const payload = isSignup
      ? {
          name: document.getElementById("su-name").value.trim(),
          email: document.getElementById("su-email").value.trim(),
          password: document.getElementById("su-pass").value,
        }
      : {
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("pass").value,
        };
    if (!payload.email || !payload.password || (isSignup && !payload.name)) return BF.toast("Complete all required fields");
    try {
      const response = await fetch("/api/auth/" + (isSignup ? "signup" : "login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Authentication failed");
      BF.store.setUser(result.userId);
      if (!isSignup) await BF.store.load();
      BF.store.update((st) => {
        st.authenticated = true;
        st.consent = true;
        if (isSignup) st.profile.name = payload.name;
      });
      BF.go(isSignup ? "setup-profile" : "home");
    } catch (error) {
      BF.toast(error.message);
    }
  }

  function langSpeech() {
    const id = BF.store.state.language;
    const found = BF.LANGS.find((l) => l.id === id);
    return (found && found.speech) || "en-IN";
  }

  function listenInto(inputId, onFinal) {
    const btn = document.querySelector(".mic, [data-action='mic-ask'], [data-action='voice-exp']");
    if (btn) btn.classList.add("listening");
    BF.speech.listen({
      lang: langSpeech(),
      onText(t) {
        const el = document.getElementById(inputId);
        if (el) el.value = t;
        BF.store.state.recognizedSpeech = t;
      },
      onEnd() {
        if (btn) btn.classList.remove("listening");
        const el = document.getElementById(inputId);
        if (onFinal && el && el.value) onFinal(el.value);
      },
      onError(err) {
        if (btn) btn.classList.remove("listening");
        BF.toast("Mic unavailable (" + err + "). Type instead, or use localhost.");
      },
    });
  }

  function bind() {
    const root = document.getElementById("app");
    const status = document.getElementById("status-bar");
    status.onclick = (e) => {
      const theme = e.target.closest("[data-action='toggle-theme']");
      if (theme) {
        BF.store.update((st) => (st.theme = st.theme === "dark" ? "light" : "dark"));
        render();
      }
    };
    root.onclick = (e) => {
      const go = e.target.closest("[data-go]");
      if (go) {
        BF.go(go.getAttribute("data-go"));
        return;
      }
      const act = e.target.closest("[data-action]");
      if (!act) return;
      const a = act.getAttribute("data-action");
      const s = BF.store.state;

      if (a === "onboard-next") {
        BF.store.update((st) => {
          st.onboardingStep = (st.onboardingStep || 0) + 1;
        });
        if (BF.store.state.onboardingStep >= 5) BF.go("language");
        else render();
      }
      if (a === "set-lang") {
        BF.store.update((st) => (st.language = act.getAttribute("data-lang")));
        render();
      }
      if (a === "login" || a === "signup") authenticate(a);
      if (a === "persona") {
        BF.store.update((st) => (st.profile.persona = act.getAttribute("data-id")));
        render();
      }
      if (a === "save-profile") {
        const profileName = String(document.getElementById("name").value || "").trim();
        const city = String(document.getElementById("city").value || "").trim();
        if (!profileName || !city) return BF.toast("Enter your name and city");
        BF.store.update((st) => {
          st.profile.name = profileName;
          st.profile.city = city;
        });
        BF.go("setup-income");
      }
      if (a === "save-settings") {
        BF.store.update((st) => {
          st.profile.name = String(document.getElementById("settings-name").value || "").trim() || st.profile.name;
          st.profile.city = String(document.getElementById("settings-city").value || "").trim() || st.profile.city;
          st.profile.persona = document.getElementById("settings-persona").value;
          st.notificationsEnabled = document.getElementById("notifications-enabled").checked;
        });
        BF.toast("Profile settings saved");
        BF.go("profile");
      }
      if (a === "save-income") {
        const monthlyIncome = Number(document.getElementById("income").value);
        const savingsBalance = Number(document.getElementById("savings").value);
        if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0 || !Number.isFinite(savingsBalance) || savingsBalance < 0) {
          return BF.toast("Enter valid income and savings values");
        }
        BF.store.update((st) => {
          st.profile.monthlyIncome = monthlyIncome;
          st.profile.savingsBalance = savingsBalance;
          st.profile.variableIncome = document.getElementById("variable").checked;
          st.financial.monthlyIncome = monthlyIncome;
          const ym = BF.monthKey(BF.todayISO());
          const inc = st.transactions.find((t) => t.type === "income" && BF.monthKey(t.date) === ym);
          if (inc) inc.amount = st.profile.monthlyIncome;
          else if (monthlyIncome > 0) st.transactions.push({ id: BF.uid(), type: "income", amount: monthlyIncome, category: "Income", merchant: "Monthly income", date: BF.todayISO(), method: "Bank" });
        });
        BF.go("setup-expenses");
      }
      if (a === "finish-setup") {
        BF.store.update((st) => {
          const fields = ["Rent", "Food", "Transport", "EMI", "Utilities", "Shopping", "Entertainment", "Other"];
          const ym = BF.monthKey(BF.todayISO());
          st.transactions = st.transactions.filter((t) => !(t.type === "expense" && BF.monthKey(t.date) === ym));
          fields.forEach((category) => {
            const value = Number(document.getElementById("setup-" + category).value);
            if (!Number.isFinite(value) || value < 0) return;
            st.financial[category === "Other" ? "otherExpenses" : category.toLowerCase()] = value;
            if (value > 0) st.transactions.push({ id: BF.uid(), type: "expense", amount: value, category, merchant: category, date: BF.todayISO(), method: "Bank" });
          });
          st.onboarded = true;
        });
        BF.go("home");
      }
      if (a === "filter-cat") {
        BF.store.state._cat = act.getAttribute("data-id");
        render();
      }
      if (a === "export-tx") {
        const rows = s.transactions
          .filter((t) => t.type === "expense")
          .sort((x, y) => y.date.localeCompare(x.date));
        const csv = [
          ["Date", "Merchant", "Category", "Amount", "Payment method"],
          ...rows.map((t) => [t.date, t.merchant, t.category, t.amount, t.method]),
        ]
          .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
          .join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "bharatfin-transactions.csv";
        link.click();
        URL.revokeObjectURL(url);
        BF.toast("Transactions exported");
      }
      if (a === "edit-tx") {
        const tx = s.transactions.find((t) => t.id === act.getAttribute("data-id"));
        BF.store.state._draft = { ...tx };
        BF.go("add-expense");
      }
      if (a === "save-tx") {
        const amount = Number(document.getElementById("amt").value);
        const merchant = String(document.getElementById("merch").value || "").trim();
        const date = document.getElementById("date").value;
        if (!Number.isFinite(amount) || amount <= 0) return BF.toast("Enter an amount greater than ₹0");
        if (!merchant) return BF.toast("Add a merchant or description");
        if (!date) return BF.toast("Choose a transaction date");
        const draft = {
          id: (s._draft && s._draft.id) || BF.uid(),
          type: "expense",
          amount: Math.round(amount * 100) / 100,
          category: document.getElementById("cat").value,
          merchant,
          date,
          method: document.getElementById("method").value,
        };
        if (!draft.category) draft.category = BF.classifyExpense(draft.merchant);
        BF.store.update((st) => {
          const i = st.transactions.findIndex((t) => t.id === draft.id);
          if (i >= 0) st.transactions[i] = draft;
          else st.transactions.push(draft);
          st._draft = null;
        });
        BF.toast("Saved");
        BF.go("transactions");
      }
      if (a === "del-tx") {
        const id = s._draft && s._draft.id;
        BF.store.update((st) => {
          st.transactions = st.transactions.filter((t) => t.id !== id);
          st._draft = null;
        });
        BF.go("transactions");
      }
      if (a === "voice-exp") listenInto("voice-text");
      if (a === "parse-voice") {
        const raw = document.getElementById("voice-text").value;
        const parsed = BF.detectIntent(raw.startsWith("I spent") || raw ? raw : "I spent " + raw);
        const amount = parsed.amount || BF.extractAmount(raw);
        const category = parsed.category || BF.classifyExpense(raw);
        document.getElementById("voice-parse").innerHTML = `<strong>Amount:</strong> ${BF.formatINR(amount || 0)}<br><strong>Category:</strong> ${category}<br><strong>Description:</strong> ${BF.escape(raw)}`;
        BF.store.state._draft = { amount: amount || "", category, merchant: raw.slice(0, 48) || category, date: BF.todayISO(), method: "UPI" };
        BF.toast("Draft ready — review before saving");
        render();
      }
      if (a === "confirm-voice") {
        BF.go("add-expense");
      }
      if (a === "cancel-voice") {
        BF.store.update((st) => (st._draft = null));
        BF.go("transactions");
      }
      if (a === "ask") ask(act.getAttribute("data-q"));
      if (a === "send-ask") ask(document.getElementById("ask").value);
      if (a === "mic-ask") listenInto("ask");
      if (a === "run-afford") {
        BF.store.state._affordAmt = document.getElementById("aff-amt").value;
        BF.store.state._affordItem = document.getElementById("aff-item").value;
        render();
      }
      if (a === "afford-live") {
        BF.store.state._affordAmt = act.value;
        const amount = document.getElementById("aff-amt");
        if (amount) amount.value = act.value;
        render();
      }
      if (a === "analytics-category") {
        BF.store.state._analyticsCat = act.getAttribute("data-id");
        render();
      }
      if (a === "save-budget") {
        const fields = ["Rent", "Food", "Transport", "EMI", "Utilities", "Shopping", "Entertainment", "Other"];
        BF.store.update((st) => {
          const ym = BF.monthKey(BF.todayISO());
          st.transactions = st.transactions.filter((t) => !(t.type === "expense" && BF.monthKey(t.date) === ym && fields.includes(t.category)));
          fields.forEach((category) => {
            const value = Number(document.getElementById("budget-" + category).value) || 0;
            st.financial[category === "Other" ? "otherExpenses" : category.toLowerCase()] = value;
            if (value) st.transactions.push({ id: BF.uid(), type: "expense", amount: value, category, merchant: category + " budget", date: BF.todayISO(), method: "Bank" });
          });
        });
        BF.toast("Budget updated — dashboard recalculated");
        BF.go("home");
      }
      if (a === "run-whatif") {
        BF.store.state._whatif = {
          income: Number(document.getElementById("whatif-income").value) || 0,
          rent: Number(document.getElementById("whatif-rent").value) || 0,
          emi: Number(document.getElementById("whatif-emi").value) || 0,
        };
        render();
      }
      if (a === "set-emergency-months") {
        BF.store.state._emergencyMonths = Number(act.getAttribute("data-value")) || 3;
        render();
      }
      if (a === "cashflow-window") {
        BF.store.state._cashflowWindow = Number(act.getAttribute("data-value")) || 30;
        render();
      }
      if (a === "set-emergency-essential") {
        BF.store.state._emergencyEssential = Number(document.getElementById("emergency-essential").value) || 0;
        render();
      }
      if (a === "add-goal-money") {
        const id = act.getAttribute("data-id");
        const amount = Number(document.getElementById("goal-add-" + id).value) || 0;
        if (amount <= 0) return BF.toast("Enter an amount to add");
        BF.store.update((st) => {
          const goal = st.goals.find((g) => g.id === id);
          if (goal) goal.current += amount;
        });
        render();
      }
      if (a === "delete-goal") {
        const id = act.getAttribute("data-id");
        BF.store.update((st) => (st.goals = st.goals.filter((g) => g.id !== id)));
        render();
      }
      if (a === "read-notification") {
        BF.store.update((st) => (st.notificationsRead[act.getAttribute("data-id")] = true));
        render();
      }
      if (a === "add-goal") {
        const name = document.getElementById("gname").value;
        const target = Number(document.getElementById("gamt").value);
        if (!name || !target) return BF.toast("Add a name and target");
        BF.store.update((st) => st.goals.push({ id: BF.uid(), name, target, current: 0, monthly: 0 }));
        render();
      }
      if (a === "reset") {
        localStorage.removeItem("bharatfin-ai-v1");
        BF.store.load();
        BF.go("splash");
      }
      if (a === "toggle-pin") {
        BF.store.update((st) => {
          st.pinEnabled = document.getElementById("pinon").checked;
          st.locked = false;
        });
        BF.toast("Privacy settings saved");
        render();
      }
      if (a === "toggle-theme") {
        BF.store.update((st) => (st.theme = st.theme === "dark" ? "light" : "dark"));
        render();
      }
      if (a === "wipe") {
        BF.store.update((st) => {
          st.transactions = [];
          st.goals = [];
          st.messages = [];
          st.profile.savingsBalance = 0;
        });
        BF.toast("Financial records deleted on this device");
        BF.go("home");
      }
      if (a === "lock-now") {
        BF.store.update((st) => {
          if (st.pinEnabled) st.locked = true;
        });
        render();
      }
    };
    root.oninput = (e) => {
      const control = e.target.closest("[data-action='afford-live']");
      if (!control) return;
      BF.store.state._affordAmt = control.value;
      const amount = document.getElementById("aff-amt");
      if (amount) amount.value = control.value;
      render();
    };

    const search = document.getElementById("search");
    if (search) {
      search.oninput = () => {
        BF.store.state._q = search.value;
      };
      search.onchange = () => render();
    }
  }

  window.addEventListener("hashchange", render);
  BF.store.load();
  if (!location.hash) location.hash = "#/splash";
  else render();
})(window.BF);
