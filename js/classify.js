(function (BF) {
  const RULES = [
    { cat: "Food", keys: ["swiggy", "zomato", "food", "dinner", "lunch", "breakfast", "grocery", "groceries", "bigbasket", "blinkit", "mess", "tea", "coffee", "hotel", "restaurant", "biryani", "tiffin", "snacks", "milk", "vegetable"] },
    { cat: "Rent", keys: ["rent", "pg", "house rent", "landlord", "housing"] },
    { cat: "Transport", keys: ["uber", "ola", "rapido", "auto", "petrol", "diesel", "fuel", "metro", "bus", "train", "irctc", "transport", "cab"] },
    { cat: "Shopping", keys: ["amazon", "flipkart", "myntra", "ajio", "meesho", "shopping", "phone", "laptop", "clothes"] },
    { cat: "Entertainment", keys: ["netflix", "hotstar", "spotify", "movie", "pvr", "inox", "game", "entertainment"] },
    { cat: "EMI", keys: ["emi", "loan", "hdfc loan", "sbi loan", "bajaj", "installment"] },
    { cat: "Utilities", keys: ["electricity", "water", "wifi", "broadband", "jio", "airtel", "vi ", "gas", "utility", "recharge", "mobile"] },
    { cat: "Education", keys: ["school", "college", "course", "udemy", "fees", "tuition", "book"] },
    { cat: "Healthcare", keys: ["pharmacy", "hospital", "apollo", "medplus", "doctor", "medicine", "clinic"] },
  ];

  BF.classifyExpense = function classifyExpense(text) {
    const t = String(text || "").toLowerCase();
    for (const rule of RULES) {
      if (rule.keys.some((k) => t.includes(k))) return rule.cat;
    }
    return "Other";
  };

  BF.categoryEmoji = function categoryEmoji(cat) {
    return (
      {
        Food: "🍲",
        Rent: "🏠",
        Transport: "🚌",
        Shopping: "🛍️",
        Entertainment: "🎬",
        EMI: "🏦",
        Utilities: "💡",
        Education: "📚",
        Healthcare: "🩺",
        Other: "📦",
      }[cat] || "📦"
    );
  };
})(window.BF);
