(function (BF) {
  const AMOUNT_RE = /(?:₹|rs\.?|rupees?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+(?:\.[0-9]+)?)\s*(?:₹|rs\.?|rupees?|inr)?/i;

  BF.extractAmount = function extractAmount(text) {
    const m = String(text).match(AMOUNT_RE);
    if (!m) return null;
    return Number(String(m[1]).replace(/,/g, ""));
  };

  BF.extractPurchase = function extractPurchase(text) {
    const amount = BF.extractAmount(text);
    const t = text.toLowerCase();
    let item = "this purchase";
    const items = ["phone", "laptop", "bike", "scooter", "dress", "shoes", "bag", "watch", "earbuds", "course"];
    for (const it of items) if (t.includes(it)) item = it;
    if (t.includes("vaanga") || t.includes("phone")) item = item === "this purchase" ? "phone" : item;
    return { amount, item };
  };

  BF.detectIntent = function detectIntent(text) {
    const raw = String(text || "").trim();
    const t = raw.toLowerCase();
    const lang = BF.detectLanguage(raw);
    const amount = BF.extractAmount(raw);

    const addKeys = ["i spent", "spent", "pay panniten", "selavu panniten", "add expense", "செலவு", "kharcha kiya"];
    if (addKeys.some((k) => t.includes(k)) && amount && !/can i|afford|vaangalaama|வாங்க/.test(t)) {
      return { intent: "add_expense", lang, amount, category: BF.classifyExpense(raw), description: raw };
    }

    if (
      /afford|can i (buy|spend)|vaangalaama|வாங்கலாமா|kharid|afford ஆகுமா|what happens if i spend/.test(t) ||
      (amount && /phone|laptop|buy|spend ₹|spend rs/.test(t) && /can|should|vaanga|this month/.test(t))
    ) {
      const p = BF.extractPurchase(raw);
      return { intent: "afford", lang, amount: p.amount || amount, item: p.item };
    }

    if (/emi|installment|loan due|eppo pay|next emi|எமஐ|ईएमआई/.test(t)) return { intent: "next_emi", lang };
    if (/emergency|reserve|buffer|அவசர/.test(t)) return { intent: "emergency", lang };
    if (/save|savings|sambadhi|சேமி|how much should i save|evlo savings/.test(t)) return { intent: "save", lang };
    if (/cash flow|surplus|mitham|மீதம்/.test(t) && !/spend/.test(t)) return { intent: "cashflow", lang };
    if (/forecast|predict|next month|future spending|recurring|subscription|regular payment/.test(t)) return { intent: "forecast", lang };
    if (/too much|where am i spending|most|adhikam|அதிக/.test(t)) return { intent: "overspend", lang };
    if (/compare|last month|increase|yen expenses|why did my expenses/.test(t)) return { intent: "compare", lang };
    if (/food|swiggy|saappadu|சாப்பாடு|food-ku/.test(t) && /spend|selavu|evlo|how much/.test(t))
      return { intent: "category", lang, category: "Food" };
    if (/where did my money go|evlo selavu|how much did i spend|total expense|செலவு பண்ணிருக்கேன்|kharcha/.test(t))
      return { intent: "spend_month", lang };
    if (/stress|pressure|tight|kastam/.test(t)) return { intent: "stress", lang };
    if (/wellness|health score|nalla irukka/.test(t)) return { intent: "wellness", lang };
    if (/hello|hi |vanakkam|namaste/.test(t)) return { intent: "greet", lang };
    return { intent: "general", lang, amount };
  };

  function explain(what, why, action, lang) {
    if (lang === "tanglish") {
      return `Enna nadandhuchu: ${what}\nYen: ${why}\nEnna pannalaam: ${action}`;
    }
    if (lang === "ta") {
      return `என்ன நடந்தது: ${what}\nஏன்: ${why}\nஎன்ன செய்யலாம்: ${action}`;
    }
    if (lang === "hi") {
      return `क्या हुआ: ${what}\nक्यों: ${why}\nक्या कर सकते हैं: ${action}`;
    }
    return `What happened: ${what}\nWhy it happened: ${why}\nWhat you can do: ${action}`;
  }

  BF.answer = function answer(query, state) {
    const snap = BF.compute(state);
    const parsed = BF.detectIntent(query);
    const lang = parsed.lang;
    const inr = BF.formatINR;
    let text = "";
    let extra = null;

    if (parsed.intent === "add_expense") {
      extra = { type: "draft_expense", amount: parsed.amount, category: parsed.category, description: parsed.description };
      if (lang === "tanglish") text = `${inr(parsed.amount)} ${parsed.category} category-la add panna ready. Confirm pannunga.`;
      else if (lang === "ta") text = `${inr(parsed.amount)} ${parsed.category} என சேர்க்க தயாராக உள்ளது. உறுதிப்படுத்தவும்.`;
      else text = `I understood ${inr(parsed.amount)} as ${parsed.category}. Confirm to save this expense.`;
    } else if (parsed.intent === "afford") {
      const sim = BF.simulatePurchase(snap, parsed.amount || 0, parsed.item);
      extra = { type: "afford", sim };
      if (lang === "tanglish") {
        text = `Ippa unga surplus ${inr(sim.currentSurplus)}. ${inr(sim.amount)} ${sim.label} vaanginaa, ungalukku ungef ${inr(sim.remaining)} dhaan mikum. Risk: ${sim.risk}. ${sim.action}`;
      } else if (lang === "ta") {
        text = `தற்போதைய மீதம் ${inr(sim.currentSurplus)}. ${inr(sim.amount)} செலவானால் ${inr(sim.remaining)} மிகும். அபாயம்: ${sim.risk}. ${sim.action}`;
      } else {
        text = `You currently have ${inr(sim.currentSurplus)} available surplus. A ${inr(sim.amount)} ${sim.label} would leave about ${inr(sim.remaining)} for the rest of the month. Risk: ${sim.risk}. ${sim.action}`;
      }
    } else if (parsed.intent === "spend_month") {
      if (lang === "tanglish") {
        text = `Indha maasam unga total expense ${inr(snap.expenses)}. Unga income ${inr(snap.income)}. So unga monthly surplus ${inr(snap.surplus)}.`;
      } else if (lang === "ta") {
        text = `இந்த மாதம் மொத்த செலவு ${inr(snap.expenses)}. வருமானம் ${inr(snap.income)}. மீதம் ${inr(snap.surplus)}.`;
      } else if (lang === "hi") {
        text = `इस महीने कुल खर्च ${inr(snap.expenses)} है। आय ${inr(snap.income)} है, इसलिए शेष ${inr(snap.surplus)} है।`;
      } else {
        text = explain(
          `This month you have spent ${inr(snap.expenses)} against income of ${inr(snap.income)}.`,
          `That is about ${Math.round(snap.ratio * 100)}% of income.`,
          `Monthly surplus is ${inr(snap.surplus)}. Protect upcoming bills before extra shopping.`,
          lang
        );
      }
    } else if (parsed.intent === "next_emi") {
      const emi = snap.upcoming.find((b) => /emi/i.test(b.name)) || snap.upcoming[0];
      if (!emi) text = "No upcoming EMI is stored yet.";
      else if (lang === "tanglish") text = `Ungal EMI ${inr(emi.amount)} ${emi.days} days-la due. Adha amount ready-ya vechikonga.`;
      else if (lang === "ta") text = `அடுத்த EMI ${inr(emi.amount)} — ${emi.days} நாட்களில் செலுத்த வேண்டும்.`;
      else text = `Your next EMI of ${inr(emi.amount)} is due in ${emi.days} days (${emi.dueDate}). Keep at least that amount available.`;
    } else if (parsed.intent === "save") {
      const suggest = Math.max(0, Math.round((snap.surplus * 0.5) / 100) * 100);
      if (lang === "tanglish") text = `Ippa surplus ${inr(snap.surplus)}. Realistic-a ${inr(suggest)} save panna try pannalam, remaining daily buffer-ku vechikalam.`;
      else text = explain(
        `After current expenses, surplus is ${inr(snap.surplus)}.`,
        `A 50% surplus-to-savings split still leaves money for daily needs and EMI.`,
        `A realistic starting target is about ${inr(suggest)} this month.`,
        lang
      );
    } else if (parsed.intent === "overspend") {
      const top = Object.entries(snap.byCat).sort((a, b) => b[1] - a[1])[0];
      const food = snap.changes.find((c) => c.cat === "Food");
      let why = `${top[0]} is currently the largest category at ${inr(top[1])}.`;
      if (food && food.pct > 0) why += ` Food also rose by about ${Math.round(food.pct)}% vs last month.`;
      text = explain(`Most money this month is going to ${top[0]}.`, why, "Try trimming discretionary food or shopping by ₹500–₹1,000 and keep EMI untouched.", lang);
    } else if (parsed.intent === "compare") {
      const food = snap.changes.find((c) => c.cat === "Food");
      const bits = snap.changes
        .filter((c) => Math.abs(c.pct) >= 4 && c.last)
        .map((c) => `${c.cat} ${c.pct >= 0 ? "+" : ""}${Math.round(c.pct)}%`)
        .join(", ");
      text = explain(
        `This month's expenses are ${inr(snap.expenses)}.`,
        bits || "Some categories changed compared with last month.",
        food && food.pct > 10 ? "Food is the main increase. A ₹500–₹1,000 trim would slow the rise." : "Keep essentials steady and review discretionary categories.",
        lang
      );
    } else if (parsed.intent === "category") {
      const cat = parsed.category || "Food";
      const ch = snap.changes.find((c) => c.cat === cat);
      if (lang === "tanglish") {
        text = `Indha month ${cat}-ku ${inr(snap.byCat[cat] || 0)} spend pannirukken. Last month ${inr(ch ? ch.last : 0)}.`;
      } else {
        text = `${cat} this month: ${inr(snap.byCat[cat] || 0)}${ch && ch.last ? ` (last month ${inr(ch.last)}, ${Math.round(ch.pct)}% change)` : ""}.`;
      }
    } else if (parsed.intent === "emergency") {
      text = explain(
        `Essential monthly costs are about ${inr(snap.emergencyMonthly)}.`,
        `Savings of ${inr(snap.savings)} cover roughly ${snap.emergencyMonths.toFixed(1)} month(s).`,
        `1-month reserve ${inr(snap.emergencyMonthly)}, 3-month ${inr(snap.emergencyMonthly * 3)}, 6-month ${inr(snap.emergencyMonthly * 6)}. Build gradually.`,
        lang
      );
    } else if (parsed.intent === "cashflow") {
      text = `Income ${inr(snap.income)} − essentials ${inr(snap.essential)} − discretionary ${inr(snap.discretionary)} = surplus ${inr(snap.surplus)}.`;
    } else if (parsed.intent === "forecast") {
      const recurring = snap.forecast.recurring.slice(0, 3);
      const recurringText = recurring.length
        ? `Recurring payments detected: ${recurring.map((item) => `${item.merchant} (${inr(item.amount)})`).join(", ")}.`
        : "No reliable recurring payments detected yet.";
      text = `Based on recent months, expected expenses are about ${inr(snap.forecast.projectedExpenses)} and projected surplus is ${inr(snap.forecast.projectedSurplus)}. ${recurringText}`;
    } else if (parsed.intent === "stress") {
      text = `Financial pressure looks ${snap.pressure.level}. ${snap.pressure.reasons.join(" ")}`;
    } else if (parsed.intent === "wellness") {
      text = `Personal Financial Wellness Indicator: ${snap.wellness.label} (${snap.wellness.score}/100). This is not a credit score. ${snap.wellness.factors[0].detail}`;
    } else if (parsed.intent === "greet") {
      text = lang === "ta" ? "வணக்கம். உங்கள் பணத்தைப் பற்றி கேளுங்கள்." : lang === "tanglish" ? "Vanakkam! Ungal panam pathi keelungal." : "Hello. Ask me about spending, EMI, savings, or whether you can afford a purchase.";
    } else {
      text = explain(
        `Income ${inr(snap.income)}, expenses ${inr(snap.expenses)}, surplus ${inr(snap.surplus)}.`,
        `Largest categories and upcoming bills shape what is safely spendable.`,
        `Try: “How much did I spend this month?” or “Can I afford ₹3,000?”`,
        lang
      );
    }

    return { text, parsed, extra };
  };
})(window.BF);
