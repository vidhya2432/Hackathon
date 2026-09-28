(function (BF) {
  const KEY = "bharatfin-ai-v1";
  const USER_KEY = "bharatfin-user-id";
  function apiUrl() {
    let userId = localStorage.getItem(USER_KEY);
    if (!userId) {
      userId = "guest-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(USER_KEY, userId);
    }
    userId = encodeURIComponent(userId);
    return "/api/state?userId=" + userId;
  }

  BF.emptyState = function emptyState() {
    return {
      version: 2,
      onboarded: false,
      onboardingStep: 0,
      authenticated: false,
      consent: false,
      pinEnabled: false,
      pin: "",
      locked: false,
      language: "en",
      profile: {
        name: "",
        city: "",
        persona: "",
        monthlyIncome: 0,
        variableIncome: false,
        savingsBalance: 0,
        savingsTarget: 0,
      },
      financial: {
        monthlyIncome: 0,
        rent: 0,
        food: 0,
        transport: 0,
        emi: 0,
        utilities: 0,
        shopping: 0,
        entertainment: 0,
        otherExpenses: 0,
        savings: 0,
        monthlyGoal: 0,
      },
      transactions: [],
      bills: [],
      goals: [],
      messages: [],
      notificationsRead: {},
      notificationsEnabled: true,
      theme: "dark",
      recognizedSpeech: "",
    };
  };

  BF.store = {
    state: null,
    listeners: [],
    remoteSaveTimer: null,
    persistRemote() {
      return fetch(apiUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: this.state }),
      }).then((response) => {
        if (!response.ok) throw new Error("Remote state save failed");
        return response.json();
      });
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.state = raw ? JSON.parse(raw) : BF.emptyState();
      } catch {
        this.state = BF.emptyState();
      }
      if (!this.state.version) this.state = BF.emptyState();
      if (!Array.isArray(this.state.transactions)) this.state.transactions = [];
      if (!Array.isArray(this.state.bills)) this.state.bills = [];
      if (!Array.isArray(this.state.goals)) this.state.goals = [];
      if (!this.state.profile) this.state.profile = BF.emptyState().profile;
      if (!this.state.notificationsRead) this.state.notificationsRead = {};
      if (typeof this.state.notificationsEnabled !== "boolean") this.state.notificationsEnabled = true;
      if (!this.state.theme) this.state.theme = "dark";
      if (!this.state.financial) this.state.financial = BF.emptyState().financial;
      return fetch(apiUrl())
        .then((response) => {
          if (response.status === 404) {
            return this.persistRemote().then(() => ({ state: this.state }));
          }
          if (!response.ok) throw new Error("Remote state unavailable");
          return response.json();
        })
        .then((payload) => {
          if (!payload.state) throw new Error("Remote state is empty");
          const isCurrentState = Boolean(payload.state.version);
          this.state = isCurrentState ? payload.state : BF.emptyState();
          localStorage.setItem(KEY, JSON.stringify(this.state));
          const persisted = isCurrentState ? Promise.resolve() : this.persistRemote();
          this.listeners.forEach((fn) => fn(this.state));
          if (typeof window.renderBharatFin === "function") window.renderBharatFin();
          return persisted;
        })
        .catch(() => {
          console.warn("Remote state unavailable; using local storage.");
        });
    },
    save() {
      localStorage.setItem(KEY, JSON.stringify(this.state));
      clearTimeout(this.remoteSaveTimer);
      this.remoteSaveTimer = setTimeout(() => {
        this.persistRemote().catch(() => {
          console.warn("Remote state save failed; local storage remains available.");
        });
      }, 150);
      this.listeners.forEach((fn) => fn(this.state));
    },
    setUser(userId) {
      if (!userId) throw new Error("A user id is required");
      localStorage.setItem(USER_KEY, userId);
    },
    reset() {
      this.state = BF.emptyState();
      this.save();
    },
    update(fn) {
      fn(this.state);
      this.save();
    },
  };
})(window.BF);
