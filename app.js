// A++ Signal Webtool (no journal) + Auto-Trade (Vercel API)
// Persists LAST_SIGNAL in localStorage for long-term stats (user browser).

(function(){
  const LS_KEY = "ajs_last_signal_v1";
  // Helper selectors
  const $ = (s,r=document)=>r.querySelector(s);

  // Load saved date default to today
  $("#date").value = new Date().toISOString().slice(0,10);

  // Build signal from form
  function buildSignal(){
    const tps = [];
    const tp1 = num($("#tp1").value); if (!isNaN(tp1)) tps.push(tp1);
    const tp2 = num($("#tp2").value); if (!isNaN(tp2)) tps.push(tp2);
    const tp3 = num($("#tp3").value); if (!isNaN(tp3)) tps.push(tp3);

    const sig = {
      date: $("#date").value || new Date().toISOString().slice(0,10),
      market: ($("#market").value||"").trim(),
      side: $("#side").value,
      orderType: $("#orderType").value,
      entry: num($("#entry").value),
      sl: num($("#sl").value),
      tps,
      crv: num($("#crv").value),
      tp1Prob: num($("#tp1Prob").value),
      contracts: int($("#contracts").value, 1),
      note: ($("#note").value||"").trim()
    };
    // Basic validation
    if (!sig.market) throw new Error("Bitte Market wählen.");
    if (!sig.side) throw new Error("Bitte Side wählen.");
    if (sig.orderType === "Limit" && !isFinite(sig.entry)) throw new Error("Bei Limit bitte Entry angeben.");
    return sig;
  }

  function show(sig){
    const txt = [
      `Datum: ${sig.date}`,
      `Markt: ${sig.market}`,
      `Side: ${sig.side}`,
      `Order: ${sig.orderType}`,
      `Entry: ${fmt(sig.entry)}`,
      `SL: ${fmt(sig.sl)}`,
      `TPs: ${sig.tps.map(fmt).join(", ") || "-"}`,
      `CRV: ${fmt(sig.crv)}`,
      `TP1-Prob: ${fmt(sig.tp1Prob)}`,
      `Contracts: ${sig.contracts}`,
      sig.note ? `Note: ${sig.note}` : ""
    ].filter(Boolean).join("\n");
    $("#preview").textContent = txt;
  }

  function fmt(v){ return (v==null || isNaN(v)) ? "-" : String(v); }
  function num(s){ const x=Number(String(s).replace(",", ".")); return isFinite(x) ? x : NaN; }
  function int(s, d=0){ const x=parseInt(s,10); return Number.isInteger(x) ? x : d; }

  // Build button
  $("#btnBuild").addEventListener("click", ()=>{
    try{
      const sig = buildSignal();
      window.LAST_SIGNAL = sig;
      localStorage.setItem(LS_KEY, JSON.stringify(sig));
      $("#msg").textContent = "Signal erstellt und gespeichert (LAST_SIGNAL)";
      show(sig);
    }catch(e){
      $("#msg").textContent = "Fehler: " + e.message;
    }
  });

  // Copy text
  $("#btnCopy").addEventListener("click", async ()=>{
    try{
      // Ensure LAST_SIGNAL
      const sig = window.LAST_SIGNAL || JSON.parse(localStorage.getItem(LS_KEY)||"{}");
      if (!sig || !sig.market) throw new Error("Kein LAST_SIGNAL vorhanden.");
      const txt = $("#preview").textContent.trim();
      await navigator.clipboard.writeText(txt);
      $("#msg").textContent = "Signal-Text in Zwischenablage.";
    }catch(e){
      $("#msg").textContent = "Kopieren fehlgeschlagen: " + e.message;
    }
  });

  // Auto-Trade via Vercel API
  $("#btnAutoTrade").addEventListener("click", async ()=>{
    try{
      const base = ($("#apiBase").value||"/api").replace(/\/$/,"");
      const sig = window.LAST_SIGNAL || JSON.parse(localStorage.getItem(LS_KEY)||"{}");
      if (!sig || !sig.market) throw new Error("Kein LAST_SIGNAL vorhanden. Erst „Signal erstellen“ klicken.");
      // Only trade crypto for OKX demo
      const isCrypto = /^(BTC|ETH|SOL|XRP|DOGE|SHIB|ADA|BNB)$/i.test(sig.market);
      if (!isCrypto){ throw new Error("Auto-Trade Demo unterstützt nur Crypto (USD-M Perp)."); }
      if (!sig.contracts){
        const c = prompt("Contracts:", "1");
        if (!c) return;
        sig.contracts = Number(c);
      }
      const r = await fetch(base + "/trade", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify(sig)
      });
      const j = await r.json();
      $("#msg").textContent = "Order gesendet. Status " + r.status + ". Antwort siehe unten.";
      $("#pingOut").textContent = JSON.stringify(j, null, 2);
    }catch(e){
      $("#msg").textContent = "Fehler: " + e.message;
    }
  });

  // Ping
  $("#btnPing").addEventListener("click", async ()=>{
    try{
      const base = ($("#apiBase").value||"/api").replace(/\/$/,"");
      const r = await fetch(base + "/ping");
      const j = await r.json();
      $("#pingOut").textContent = JSON.stringify(j, null, 2);
      $("#msg").textContent = "Ping ok.";
    }catch(e){
      $("#msg").textContent = "Ping fehlgeschlagen: " + e.message;
    }
  });

  // Restore LAST_SIGNAL preview if present
  try{
    const cached = JSON.parse(localStorage.getItem(LS_KEY)||"");
    if (cached && cached.market){ window.LAST_SIGNAL = cached; show(cached); }
  }catch(_){}
})();