(function (BF) {
  BF.detectRecurring = function detectRecurring(transactions) {
    const groups = {};
    (transactions || [])
      .filter((t) => t.type === "expense" && t.merchant)
      .forEach((t) => {
        const key = String(t.merchant).trim().toLowerCase().replace(/\s+/g, " ");
        (groups[key] ||= []).push(t);
      });
    return Object.entries(groups)
      .map(([key, items]) => {
        const sorted = items.slice().sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length < 2) return null;
        const amounts = sorted.map((t) => Number(t.amount) || 0);
        const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
        const stable = amounts.every((amount) => average === 0 || Math.abs(amount - average) / average <= 0.15);
        const gaps = sorted.slice(1).map((t, i) => Math.abs(BF.daysUntil(t.date) - BF.daysUntil(sorted[i].date)));
        const interval = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
        if (!stable || interval < 20 || interval > 40) return null;
        return {
          merchant: sorted[sorted.length - 1].merchant,
          category: sorted[sorted.length - 1].category,
          amount: Math.round(average),
          interval: Math.round(interval),
          occurrences: sorted.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.amount - a.amount);
  };

  BF.cashflowForecast = function cashflowForecast(state, snapshot) {
    const history = snapshot.months.filter((month) => month.expenses > 0);
    const averageExpense = history.length
      ? history.reduce((sum, month) => sum + month.expenses, 0) / history.length
      : snapshot.expenses;
    const recurring = BF.detectRecurring(state.transactions);
    const recurringMonthly = recurring.reduce((sum, item) => sum + item.amount, 0);
    const projectedExpenses = Math.round(Math.max(averageExpense, recurringMonthly));
    const projectedSurplus = Math.round(snapshot.income - projectedExpenses);
    return {
      averageExpense: Math.round(averageExpense),
      projectedExpenses,
      projectedSurplus,
      outlook: projectedSurplus >= 0 ? "positive" : "tight",
      recurring,
    };
  };

  function inMonth(tx, key) {
    return BF.monthKey(tx.date) === key && tx.type !== "income";
  }

  BF.compute = function compute(state) {
    const nowKey = BF.monthKey(BF.todayISO());
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevKey = BF.monthKey(prev.toISOString().slice(0, 10));

    const txs = state.transactions || [];
    const incomeTx = txs.filter((t) => t.type === "income" && BF.monthKey(t.date) === nowKey);
    const income = incomeTx.reduce((s, t) => s + t.amount, 0) || state.profile.monthlyIncome || 0;

    const monthExp = txs.filter((t) => inMonth(t, nowKey));
    const prevExp = txs.filter((t) => inMonth(t, prevKey));
    const expenses = monthExp.reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;

    const byCat = {};
    const prevByCat = {};
    BF.CATEGORIES.forEach((c) => {
      byCat[c] = 0;
      prevByCat[c] = 0;
    });
    monthExp.forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
    prevExp.forEach((t) => (prevByCat[t.category] = (prevByCat[t.category] || 0) + t.amount));

    const essential = monthExp.filter((t) => BF.ESSENTIAL.has(t.category)).reduce((s, t) => s + t.amount, 0);
    const discretionary = monthExp.filter((t) => BF.DISCRETIONARY.has(t.category)).reduce((s, t) => s + t.amount, 0);
    const emi = byCat.EMI || 0;
    const savings = state.profile.savingsBalance || 0;
    const ratio = income ? expenses / income : 0;
    const emiBurden = income ? emi / income : 0;

    const changes = BF.CATEGORIES.map((cat) => {
      const cur = byCat[cat] || 0;
      const last = prevByCat[cat] || 0;
      const pct = last ? ((cur - last) / last) * 100 : cur ? 100 : 0;
      return { cat, cur, last, pct };
    }).filter((x) => x.cur || x.last);

    const upcoming = (state.bills || [])
      .map((b) => ({ ...b, days: BF.daysUntil(b.dueDate) }))
      .sort((a, b) => a.days - b.days);

    const emergencyMonthly = essential || 0;
    const emergencyMonths = emergencyMonthly ? savings / emergencyMonthly : 0;

    const goals = (state.goals || []).map((g) => {
      const left = Math.max(0, g.target - g.current);
      const suggested = surplus > 0 ? Math.min(surplus * 0.6, Math.ceil(left / 8 / 100) * 100) : 0;
      return { ...g, progress: g.target ? g.current / g.target : 0, left, suggested };
    });

    const wellness = BF.wellnessScore({
      income,
      expenses,
      surplus,
      ratio,
      emiBurden,
      emergencyMonths,
      savingsProgress: goals[0] ? goals[0].progress : savings > 0 ? 0.2 : 0,
      variableIncome: state.profile.variableIncome,
    });

    const pressure = BF.stressForecast({ surplus, upcoming, ratio, emi, savings, essential });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const e = txs.filter((t) => inMonth(t, key)).reduce((s, t) => s + t.amount, 0);
      const inc = txs.filter((t) => t.type === "income" && BF.monthKey(t.date) === key).reduce((s, t) => s + t.amount, 0) ||
        (key === nowKey ? income : state.profile.monthlyIncome);
      months.push({
        key,
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        expenses: e,
        income: inc,
        savings: Math.max(0, inc - e),
      });
    }

    const snapshot = {
      nowKey,
      prevKey,
      income,
      expenses,
      surplus,
      savings,
      ratio,
      emi,
      emiBurden,
      essential,
      discretionary,
      byCat,
      prevByCat,
      changes,
      upcoming,
      emergencyMonthly,
      emergencyMonths,
      goals,
      wellness,
      pressure,
      months,
      monthExp,
    };
    snapshot.recurring = BF.detectRecurring(txs);
    snapshot.forecast = BF.cashflowForecast(state, snapshot);
    return snapshot;
  };

  BF.wellnessScore = function wellnessScore(p) {
    const factors = [];
    let score = 0;

    if (p.surplus > 0) {
      score += 22;
      factors.push({ ok: true, label: "Monthly surplus", detail: "You are spending less than you earn." });
    } else {
      factors.push({ ok: false, label: "No monthly surplus", detail: "Expenses are matching or exceeding income." });
    }

    if (p.ratio <= 0.7) {
      score += 18;
      factors.push({ ok: true, label: "Expense ratio comfortable", detail: `You are using ${Math.round(p.ratio * 100)}% of income.` });
    } else if (p.ratio <= 0.85) {
      score += 10;
      factors.push({ ok: false, warn: true, label: "High spending share", detail: `About ${Math.round(p.ratio * 100)}% of income is spent.` });
    } else {
      factors.push({ ok: false, label: "Very high expense ratio", detail: "Little room remains for savings or surprises." });
    }

    if (p.emiBurden === 0) {
      score += 16;
      factors.push({ ok: true, label: "No EMI burden", detail: "No loan instalment is reducing cash flow." });
    } else if (p.emiBurden < 0.3) {
      score += 12;
      factors.push({ ok: true, label: "EMI is manageable", detail: `EMI uses ${Math.round(p.emiBurden * 100)}% of income.` });
    } else {
      score += 4;
      factors.push({ ok: false, label: "EMI is heavy", detail: "Loan payments are taking a large share of income." });
    }

    if (p.emergencyMonths >= 3) {
      score += 22;
      factors.push({ ok: true, label: "Emergency reserve", detail: `Reserve covers about ${p.emergencyMonths.toFixed(1)} months.` });
    } else if (p.emergencyMonths >= 1) {
      score += 12;
      factors.push({ ok: false, warn: true, label: "Emergency reserve building", detail: `Currently about ${p.emergencyMonths.toFixed(1)} month of essentials.` });
    } else {
      score += 4;
      factors.push({ ok: false, warn: true, label: "Thin emergency buffer", detail: "Savings cover less than one month of essentials." });
    }

    if (p.savingsProgress >= 0.5) {
      score += 12;
      factors.push({ ok: true, label: "Savings progress", detail: "Goal progress is on a healthy path." });
    } else if (p.savingsProgress > 0) {
      score += 8;
      factors.push({ ok: true, label: "Savings started", detail: "You have begun setting money aside." });
    } else {
      factors.push({ ok: false, label: "No savings progress yet", detail: "A small automatic transfer can help." });
    }

    if (p.variableIncome) {
      score -= 4;
      factors.push({ ok: false, warn: true, label: "Variable income", detail: "Irregular income needs a larger cash buffer." });
    } else {
      score += 10;
      factors.push({ ok: true, label: "Income stability", detail: "This month assumes a regular salary inflow." });
    }

    score = Math.max(12, Math.min(96, score));
    let label = "Needs attention";
    if (score >= 75) label = "Strong";
    else if (score >= 55) label = "Stable";
    else if (score >= 40) label = "Building";
    return { score, label, factors };
  };

  BF.stressForecast = function stressForecast({ surplus, upcoming, ratio, emi, savings, essential }) {
    const near = upcoming.filter((b) => b.days >= 0 && b.days <= 10);
    const nearTotal = near.reduce((s, b) => s + b.amount, 0);
    let level = "Low";
    const reasons = [];
    if (ratio >= 0.8) reasons.push("You are already using about 80% or more of this month's income.");
    if (nearTotal > surplus) {
      reasons.push(`Upcoming payments of ${BF.formatINR(nearTotal)} are larger than the remaining surplus of ${BF.formatINR(surplus)}.`);
      level = "High";
    } else if (near.length) {
      reasons.push(`${near[0].name} of ${BF.formatINR(near[0].amount)} is due in ${near[0].days} days.`);
      level = surplus - nearTotal < 2000 ? "Medium" : "Low";
    }
    if (savings < essential) reasons.push("Emergency savings are smaller than one month of essential costs.");
    if (emi && surplus < emi) {
      level = "High";
      reasons.push("Current surplus is below the EMI amount.");
    }
    if (!reasons.length) reasons.push("No concentrated payment cluster is visible in the next 10 days.");
    if (level === "Low" && ratio >= 0.75) level = "Medium";
    return { level, reasons, near, nearTotal };
  };

  BF.simulatePurchase = function simulatePurchase(snap, amount, label) {
    const amt = Number(amount) || 0;
    const remaining = snap.surplus - amt;
    const emiSoon = snap.upcoming.find((b) => /emi/i.test(b.name) && b.days <= 14);
    let risk = "Low";
    if (remaining < 0) risk = "High";
    else if (emiSoon && remaining < emiSoon.amount) risk = "High";
    else if (remaining < 2500 || (emiSoon && amt > snap.surplus * 0.45)) risk = "Moderate";
    const reasons = [
      `A ${BF.formatINR(amt)} purchase${label ? " (" + label + ")" : ""} would reduce this month's surplus from ${BF.formatINR(snap.surplus)} to ${BF.formatINR(remaining)}.`,
    ];
    if (emiSoon) reasons.push(`Your ${emiSoon.name} of ${BF.formatINR(emiSoon.amount)} is due in ${emiSoon.days} days.`);
    if (remaining < 2000 && remaining >= 0) reasons.push("The remaining buffer would be thin for daily spending.");
    if (remaining < 0) reasons.push("This purchase would push the month into a shortfall unless another expense is reduced.");
    const action =
      risk === "High"
        ? "Consider waiting until after the EMI/bills are paid, or reduce another discretionary expense first."
        : risk === "Moderate"
          ? "You can proceed only if you protect the EMI amount and keep a small daily buffer."
          : "This looks affordable if your remaining bills stay as planned.";
    return {
      amount: amt,
      label: label || "Purchase",
      currentSurplus: snap.surplus,
      remaining,
      emi: emiSoon,
      risk,
      reasons,
      action,
      goalImpact: Math.max(0, (snap.goals[0] ? snap.goals[0].left : 0) - Math.max(0, remaining)),
      emergencyMonthsAfter: snap.emergencyMonthly ? Math.max(0, snap.savings / snap.emergencyMonthly - amt / snap.emergencyMonthly) : 0,
    };
  };

  BF.buildNotifications = function buildNotifications(snap, state) {
    const notes = [];
    const emi = snap.upcoming.find((b) => /emi/i.test(b.name));
    if (emi && emi.days >= 0) {
      notes.push({
        id: "emi",
        title: "Upcoming EMI",
        body: `EMI due in ${emi.days} days: ${BF.formatINR(emi.amount)}.`,
        tone: "info",
      });
    }
    const food = snap.byCat.Food || 0;
    if (food && food >= 0.8 * 5000) {
      notes.push({
        id: "food",
        title: "Food budget",
        body: `You have spent ${BF.formatINR(food)} on food this month — about ${Math.round((food / (snap.income || 1)) * 100)}% of income.`,
        tone: "info",
      });
    }
    const goal = snap.goals[0];
    if (goal && goal.left > 0 && goal.left <= 2500) {
      notes.push({
        id: "goal",
        title: "Savings target",
        body: `You are ${BF.formatINR(goal.left)} away from “${goal.name}”.`,
        tone: "ok",
      });
    }
    const foodChange = snap.changes.find((c) => c.cat === "Food");
    if (foodChange && foodChange.pct >= 10) {
      notes.push({
        id: "pattern",
        title: "Spending pattern",
        body: `Food spending increased by about ${Math.round(foodChange.pct)}% compared with last month.`,
        tone: "info",
      });
    }
    if (snap.surplus > 0) {
      notes.push({
        id: "surplus",
        title: "Surplus reminder",
        body: `This month's surplus is currently ${BF.formatINR(snap.surplus)}. Setting aside even a part of it builds your reserve.`,
        tone: "ok",
      });
    }
    return notes;
  };
})(window.BF);
