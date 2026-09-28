(function (BF) {
  BF.speech = {
    supported() {
      return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    },
    listen({ lang, onText, onEnd, onError }) {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        onError && onError("Voice input needs Chrome/Edge on localhost.");
        return { stop() {} };
      }
      const rec = new Ctor();
      rec.lang = lang || "en-IN";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        onText && onText((final || interim).trim(), Boolean(final));
      };
      rec.onerror = (e) => onError && onError(e.error || "mic-error");
      rec.onend = () => onEnd && onEnd();
      rec.start();
      return rec;
    },
    speak(text, lang) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const map = { en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN", ml: "ml-IN", kn: "kn-IN", tanglish: "en-IN" };
      u.lang = map[lang] || "en-IN";
      u.rate = 0.96;
      window.speechSynthesis.speak(u);
    },
  };
})(window.BF);
