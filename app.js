/* PITBOX — interactive prototype logic */
(function () {
  "use strict";

  const STORAGE_KEY = "pitbox.demo.v1";
  const TODAY = new Date(DB.today);
  const NUM = new Intl.NumberFormat("es-ES");
  const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  const DATE = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  const root = document.getElementById("screenRoot");
  const tabbar = document.getElementById("tabbar");
  const sheetRoot = document.getElementById("sheetRoot");
  const toastRoot = document.getElementById("toastRoot");

  const ICON_ALIAS = {
    oil: "droplet", air: "wind", spark: "bolt", chain: "link", fluid: "droplet",
    pump: "thermo", dsg: "cog", brake: "disc", arm: "suspension",
    vacuum: "gauge", filter: "filter", tire: "tire", pro: "pro"
  };

  const uid = () => Math.random().toString(36).slice(2, 9);
  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
  const fmtKm = (n) => NUM.format(Math.round(Number(n) || 0));
  const money = (n) => EUR.format(Number(n) || 0);
  const fmtDate = (iso) => {
    if (!iso || iso === "—") return "—";
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return DATE.format(d).replace(/\./g, "");
  };
  const addMonths = (date, months) => {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  };
  const isoToday = () => DB.today.slice(0, 10);
  const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trim() + "…" : String(s));

  function icon(name, extra) {
    const id = ICON_ALIAS[name] || name || "wrench";
    return '<svg class="ico ' + (extra || "") + '" aria-hidden="true"><use href="#i-' + id + '"></use></svg>';
  }

  function logoMark() {
    return '<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 40 40">' +
      '<rect width="40" height="40" rx="12" fill="#ff5a1f"/>' +
      '<circle cx="20" cy="20" r="9.5" fill="none" stroke="#08090a" stroke-width="2.6"/>' +
      '<path d="M20 20l5.6-5.9" stroke="#08090a" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M20 7.5v3M20 29.5v3M7.5 20h3M29.5 20h3" stroke="#08090a" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg></span>';
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.vehicles) && parsed.vehicles.length) {
          return parsed;
        }
      }
    } catch (err) { /* storage can be unavailable in private mode */ }
    return {
      version: 1,
      currentVehicleId: "golf",
      vehicles: JSON.parse(JSON.stringify(DB.vehicles)),
      pro: false,
      diagCredits: 1,
      reminders: true
    };
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* noop */ }
  }

  const state = loadState();
  let deferredInstall = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  const ui = {
    screen: "garage",
    params: {},
    history: [],
    vehicleTab: "resumen",
    maintenanceFilter: "Todos",
    partsQuery: "",
    diagMode: "acoustic",
    diagStage: "idle",
    diagUnlocked: false,
    visualPart: "disc",
    visualStage: "idle",
    selectedPlan: "annual",
    ambientFilter: true,
    bandFilter: true,
    plateValue: "",
    plateValid: false,
    plateDuplicate: false,
    engineChoice: "DNFB",
    micStream: null,
    audioCtx: null,
    analyser: null,
    recorder: null,
    recChunks: [],
    audioURL: null,
    audioMetrics: null,
    audioSamples: [],
    micMode: "idle",
    micPeakDb: -100,
    micHz: 0,
    micHzSamples: [],
    recStart: 0,
    recKeep: false,
    recTimer: null,
    audioSummary: null,
    audioEl: null,
    cameraStream: null,
    cameraLive: false,
    cameraStarting: false,
    cameraError: "",
    capturedFrame: "",
    visualMetrics: null,
    raf: null,
    timers: []
  };

  /* ------------------------------------------------------------------------
     Derived data
     ------------------------------------------------------------------------ */
  function currentVehicle() {
    return state.vehicles.find((v) => v.id === state.currentVehicleId) || state.vehicles[0];
  }

  function nextKm(c) { return (Number(c.lastKm) || 0) + Number(c.intervalKm || 0); }

  function compStatus(v, c) {
    const next = nextKm(c);
    const remaining = next - Number(v.km);
    let timeDue = null;
    let overdueTime = false;
    if (c.intervalMonths && c.lastDate && c.lastDate !== "—") {
      timeDue = addMonths(new Date(c.lastDate + "T12:00:00"), c.intervalMonths);
      overdueTime = timeDue < TODAY;
    }
    const overdue = remaining <= 0 || overdueTime;
    let pct = c.intervalKm ? clamp(remaining / c.intervalKm, 0, 1) : 1;
    if (overdueTime && remaining > 0) pct = Math.min(pct, 0.06);
    const kind = overdue ? "danger" : pct < 0.2 ? "warn" : "ok";
    return { next, remaining, pct, overdue, overdueTime, timeDue, kind };
  }

  function sortedComponents(v) {
    return [...v.components].sort((a, b) => {
      const sa = compStatus(v, a), sb = compStatus(v, b);
      const weight = { danger: 0, warn: 1, ok: 2 };
      return weight[sa.kind] - weight[sb.kind] || sa.remaining - sb.remaining;
    });
  }

  function nextComponents(v, count) {
    return sortedComponents(v).slice(0, count || 3);
  }

  function healthScore(v) {
    let score = 100;
    v.components.forEach((c) => {
      const s = compStatus(v, c);
      if (s.kind === "danger") score -= 14;
      else if (s.pct < 0.25) score -= 6;
      else if (s.pct < 0.4) score -= 3;
      else if (s.pct < 0.6) score -= 1;
    });
    return clamp(Math.round(score), 35, 99);
  }

  function healthSummary(v) {
    const statuses = v.components.map((c) => ({ c, s: compStatus(v, c) }));
    const danger = statuses.filter((x) => x.s.kind === "danger");
    const warn = statuses.filter((x) => x.s.kind === "warn");
    if (danger.length) {
      const names = danger.slice(0, 2).map((x) => x.c.name.toLowerCase()).join(" y ");
      return {
        chipClass: "chip--danger",
        chip: "Requiere atención",
        title: danger.length + " servicio" + (danger.length > 1 ? "s" : "") + " vencido" + (danger.length > 1 ? "s" : ""),
        text: "Prioriza " + names + " para no agravar la avería."
      };
    }
    if (warn.length) {
      return {
        chipClass: "chip--warn", chip: "Vigilar",
        title: warn.length + " punto" + (warn.length > 1 ? "s" : "") + " próximo" + (warn.length > 1 ? "s" : ""),
        text: "Todo bajo control, pero hay vencimientos cerca."
      };
    }
    return { chipClass: "chip--ok", chip: "Al día", title: "Mantenimiento al día", text: "Sin vencimientos en los próximos 5.000 km." };
  }

  function alertsFor(v) {
    const out = [];
    v.components.forEach((c) => {
      const s = compStatus(v, c);
      if (s.kind === "danger") {
        const meta = c.id === "brakefluid"
          ? "Cambio cada 24 meses · última " + fmtDate(c.lastDate)
          : "Vencido · " + fmtKm(Math.abs(s.remaining)) + " km por encima";
        out.push({ kind: "critical", icon: c.icon, title: c.name + (s.remaining <= 0 ? " vencido" : " fuera de plazo"), meta, component: c.id });
      } else if (s.remaining < 10000) {
        out.push({ kind: "warning", icon: c.icon, title: c.name + ": próximo cambio", meta: fmtKm(s.remaining) + " km restantes · a " + fmtKm(s.next) + " km", component: c.id });
      }
    });
    if (v.engineCode === "CJXC" && v.components.some((c) => c.id === "chain")) {
      out.push({
        kind: "info", icon: "chain", title: "Revisa la cadena a 150.000 km",
        meta: "Punto débil del CJXC · faltan " + fmtKm(Math.max(0, 150000 - v.km)) + " km",
        fault: "chain"
      });
    }
    if (v.engineCode === "DETA") {
      out.push({ kind: "info", icon: "filter", title: "Vigila el DPF en trayectos cortos", meta: "Patrón común en DETA · lectura de ceniza recomendada", fault: "dpf" });
    }
    return out.slice(0, 4);
  }

  function healthRingSVG(score) {
    const c = 2 * Math.PI * 22;
    const offset = c * (1 - score / 100);
    const color = score >= 80 ? "#35d0a0" : score >= 58 ? "#ffb020" : "#ff5252";
    return '<svg class="health-ring" viewBox="0 0 50 50" aria-hidden="true">' +
      '<circle class="ring-bg" cx="25" cy="25" r="22"/>' +
      '<circle class="ring-fill" cx="25" cy="25" r="22" stroke="' + color + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
      "</svg>";
  }

  function healthBarsHTML(score) {
    const on = Math.round(score / 10);
    const kind = score >= 80 ? "is-ok" : score >= 58 ? "is-warn" : "is-danger";
    let html = '<div class="health-bars">';
    for (let i = 0; i < 10; i++) {
      html += '<span class="' + (i < on ? "is-on " + kind : "") + '"></span>';
    }
    return html + "</div>";
  }

  function partIcon(category) {
    return ({
      Encendido: "bolt", Motor: "engine", Frenos: "disc",
      Refrigeración: "thermo", Chasis: "suspension"
    })[category] || "wrench";
  }

  function sevMeta(sev) {
    return sev === "alta"
      ? { cls: "tag--danger", label: "Riesgo alto" }
      : sev === "media"
        ? { cls: "tag--warn", label: "Riesgo medio" }
        : { cls: "", label: "Riesgo bajo" };
  }

  function maskVin(vin) {
    if (!vin) return "—";
    return vin.slice(0, 9) + "••••" + vin.slice(-2);
  }

  function hashFor(v) {
    let h = 2166136261;
    const s = v.id + "|" + v.vin + "|" + v.services.length + "|" + v.km;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function normalize(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function filterParts(query) {
    const q = normalize(query).trim();
    if (!q) return DB.parts.slice(0, 6);
    return DB.parts.filter((p) => normalize([
      p.name, p.category, p.oem, p.fitment, p.componentId, (p.compat || []).join(" ")
    ].join(" ")).includes(q));
  }

  function servicesOf(v) {
    return [...v.services].sort((a, b) => b.km - a.km);
  }

  function nearestPositive(v) {
    return v.components
      .map((c) => ({ c, s: compStatus(v, c) }))
      .filter((x) => x.s.remaining > 0)
      .sort((a, b) => a.s.remaining - b.s.remaining)[0];
  }

  /* ------------------------------------------------------------------------
     Navigation + render
     ------------------------------------------------------------------------ */
  const TAB_SCREENS = new Set(["garage", "maintenance", "parts", "diag"]);

  function clearScreenTimers() {
    if (ui.raf) cancelAnimationFrame(ui.raf);
    ui.raf = null;
    ui.timers.forEach((t) => clearTimeout(t));
    ui.timers = [];
  }

  function stopMicCapture(keepAudio) {
    ui.recKeep = !!keepAudio;
    const rec = ui.recorder;
    ui.recorder = null;
    if (rec && rec.state !== "inactive") { try { rec.stop(); } catch (err) { /* noop */ } }
    if (ui.micStream) {
      ui.micStream.getTracks().forEach((track) => track.stop());
      ui.micStream = null;
    }
    ui.analyser = null;
    if (ui.audioCtx) {
      try { ui.audioCtx.close(); } catch (err) { /* noop */ }
      ui.audioCtx = null;
    }
    if (!keepAudio) {
      if (ui.audioURL) URL.revokeObjectURL(ui.audioURL);
      ui.audioURL = null;
      ui.audioMetrics = null;
      ui.audioSamples = [];
      ui.recChunks = [];
    }
  }

  function stopCamera() {
    if (ui.cameraStream) ui.cameraStream.getTracks().forEach((track) => track.stop());
    ui.cameraStream = null;
    ui.cameraLive = false;
    const video = document.getElementById("cameraFeed");
    if (video) video.srcObject = null;
  }

  function stopMedia() {
    if (ui.recTimer) { clearTimeout(ui.recTimer); ui.recTimer = null; }
    stopMicCapture(false);
    stopCamera();
    if (ui.diagStage === "recording" || ui.diagStage === "analyzing") ui.diagStage = "idle";
    if (ui.visualStage === "scanning") ui.visualStage = "idle";
    ui.micMode = "idle";
  }

  function render() {
    clearScreenTimers();
    const v = currentVehicle();
    const view = VIEWS[ui.screen] || VIEWS.garage;
    root.innerHTML = '<div class="screen">' + view(v) + "</div>";
    const showTabs = TAB_SCREENS.has(ui.screen);
    tabbar.classList.toggle("is-hidden", !showTabs);
    tabbar.innerHTML = showTabs ? tabbarHTML(v) : "";
    root.classList.toggle("no-tabs", !showTabs);
    root.scrollTop = 0;
    updateSidebar();
    requestAnimationFrame(afterRender);
  }

  function afterRender() {
    if (ui.screen === "diag") {
      if (ui.diagMode === "acoustic" && ui.diagStage === "recording") startWave();
      if (ui.diagMode === "visual" && ui.cameraLive) attachCameraFeed();
    }
  }

  function tabbarHTML(v) {
    const alertDot = alertsFor(v).some((a) => a.kind === "critical");
    const items = [
      ["garage", "Garaje", "car", alertDot],
      ["maintenance", "Libro", "wrench", false],
      ["parts", "Piezas", "search", false],
      ["diag", "Diagnóstico", "wave", false]
    ];
    return items.map(([id, label, ico, dot]) =>
      '<button data-action="tab" data-tab="' + id + '" class="' + (ui.screen === id ? "is-active" : "") + '">' +
      icon(ico) + "<span>" + label + "</span>" +
      (dot ? '<i class="tab-badge"></i>' : "") +
      "</button>"
    ).join("");
  }

  function updateSidebar() {
    const map = { garage: "garage", vehicle: "vehicle", maintenance: "maintenance", parts: "parts", part: "parts", diag: "diag", pro: "pro", service: "maintenance", addVehicle: "garage" };
    document.querySelectorAll(".screen-nav button").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.screen === map[ui.screen]);
    });
  }

  function go(screen, params, opts) {
    const options = opts || {};
    if (screen !== "diag") stopMedia();
    closeSheet();
    if (!options.replace) ui.history.push({ screen: ui.screen, params: ui.params });
    if (screen === "vehicle") {
      ui.vehicleTab = (params && params.tab) || "resumen";
    }
    if (screen === "diag" && params && params.fault) {
      ui.diagMode = "acoustic";
      ui.diagStage = "idle";
      ui.diagUnlocked = false;
      ui.params = { fault: params.fault };
    } else {
      ui.params = params || {};
    }
    ui.screen = screen;
    render();
  }

  function switchTab(screen) {
    if (screen !== "diag") stopMedia();
    closeSheet();
    ui.history = [];
    ui.screen = screen;
    ui.params = {};
    render();
  }

  function back() {
    stopMedia();
    closeSheet();
    const prev = ui.history.pop();
    if (!prev) {
      switchTab("garage");
      return;
    }
    ui.screen = prev.screen;
    ui.params = prev.params || {};
    render();
  }

  /* ------------------------------------------------------------------------
     Toasts + sheets
     ------------------------------------------------------------------------ */
  function toast(message, ico) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = icon(ico || "check") + "<span>" + esc(message) + "</span>";
    toastRoot.appendChild(el);
    while (toastRoot.children.length > 3) toastRoot.removeChild(toastRoot.firstChild);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  let sheetCloseTimer = null;

  function openSheet(html) {
    if (sheetCloseTimer) { clearTimeout(sheetCloseTimer); sheetCloseTimer = null; }
    sheetRoot.innerHTML = '<div class="sheet-backdrop" data-action="close-sheet"></div>' +
      '<section class="sheet" role="dialog" aria-modal="true">' + html + "</section>";
    requestAnimationFrame(() => sheetRoot.classList.add("is-open"));
  }

  function closeSheet() {
    if (!sheetRoot.classList.contains("is-open")) return;
    sheetRoot.classList.remove("is-open");
    if (sheetCloseTimer) clearTimeout(sheetCloseTimer);
    sheetCloseTimer = setTimeout(() => {
      sheetRoot.innerHTML = "";
      sheetCloseTimer = null;
    }, 320);
  }

  function sheetHeader(eyebrow, title) {
    return '<div class="sheet-head"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h2 class="h2">' + esc(title) + '</h2></div>' +
      '<button class="sheet-close" data-action="close-sheet" aria-label="Cerrar">' + icon("close") + "</button></div>";
  }

  /* ------------------------------------------------------------------------
     Garage view
     ------------------------------------------------------------------------ */
  function topbar(v) {
    const alerts = alertsFor(v);
    return '<header class="topbar">' +
      '<div class="app-brand">' + logoMark() + '<div><b>PITBOX</b><small>garage operating system</small></div></div>' +
      '<div class="top-actions">' +
      '<button class="pro-mini" data-action="open-pro">' + icon("pro") + " PRO</button>" +
      '<button class="icon-btn" data-action="notifications" aria-label="Avisos">' + icon("bell") + (alerts.length ? '<span class="dot"></span>' : "") + "</button>" +
      '<button class="avatar" data-action="profile" aria-label="Perfil">' + esc(DB.owner.initials) + "</button>" +
      "</div></header>";
  }

  function alertCardHTML(a) {
    return '<button class="alert-card alert-card--' + (a.kind === "critical" ? "critical" : a.kind === "warning" ? "warning" : "info") + '"' +
      ' data-action="alert-open" data-component="' + esc(a.component || "") + '" data-fault="' + esc(a.fault || "") + '">' +
      '<span class="alert-icon">' + icon(a.icon) + "</span>" +
      '<span class="alert-body"><b>' + esc(a.title) + "</b><span>" + esc(a.meta) + "</span></span>" +
      icon("next") + "</button>";
  }

  function miniCompHTML(v, c) {
    const s = compStatus(v, c);
    const sideClass = s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "is-ok";
    return '<button class="mini-comp" data-action="open-component" data-id="' + c.id + '">' +
      '<span class="comp-sign">' + icon(c.icon) + "</span>" +
      '<span class="mini-comp-main"><b>' + esc(c.name) + "</b><span>A " + fmtKm(s.next) + " km · " + (c.overdueTime ? "plazo vencido" : "últ. " + fmtDate(c.lastDate)) + "</span></span>" +
      '<span class="mini-comp-side ' + sideClass + '"><b>' + (s.remaining <= 0 ? "VENCIDO" : fmtKm(s.remaining)) + "</b><span>" + (s.remaining <= 0 ? "REVISAR" : "KM REST.") + "</span></span>" +
      "</button>";
  }

  function faultMiniHTML(f) {
    const sev = sevMeta(f.severity);
    return '<button class="fault-mini" data-action="open-fault" data-id="' + f.id + '">' +
      '<div class="fault-mini-top">' + icon(f.icon) + '<span class="tag ' + sev.cls + '">' + sev.label + "</span></div>" +
      "<b>" + esc(f.title) + "</b>" +
      "<span>" + esc(trunc(f.symptom, 58)) + "</span>" +
      '<div class="mono-label">' + fmtKm(f.cases) + " casos · " + esc(f.band) + "</div>" +
      "</button>";
  }

  function renderGarage(v) {
    const health = healthScore(v);
    const alerts = alertsFor(v);
    const next = nextComponents(v, 3);
    const nearest = nearestPositive(v);
    const faults = (DB.faults[v.engineCode] || []).slice(0, 3);
    const other = state.vehicles.find((x) => x.id !== v.id);

    return topbar(v) +
      '<div class="greeting"><h1>Mi garaje<span>.</span></h1>' +
      "<p>" + state.vehicles.length + " vehículo" + (state.vehicles.length === 1 ? "" : "s") + " · " + fmtKm(v.km) + " km registrados</p></div>" +

      '<article class="hero-card" data-action="open-vehicle">' +
      '<div class="hero-media"><img src="' + v.image + '" alt="' + esc(v.name) + '">' +
      '<div class="hero-top"><span class="tag tag--accent">Principal</span>' +
      '<div class="hero-top-actions"><span class="hero-plate"><span>' + esc(v.plate) + "</span></span></div></div>" +
      "</div>" +
      '<div class="health-float" aria-label="Salud del vehículo ' + health + ' por ciento">' + healthRingSVG(health) + "<b>" + health + "</b></div>" +
      '<div class="hero-info">' +
      '<div class="hero-name-row"><div><div class="hero-name">' + esc(v.name) + '</div><div class="hero-trim">' + esc(v.trim) + " · " + v.year + "</div></div>" +
      '<span class="hero-more">' + icon("up-right") + "</span></div>" +
      '<div class="hero-chips"><span class="chip">' + esc(v.engineCode) + '</span><span class="chip">' + esc(v.engine.split(" ").slice(0, 2).join(" ")) + '</span><span class="chip">' + esc(v.chassis) + '</span><span class="chip">' + esc(v.gearbox.split(" · ")[0]) + "</span></div>" +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + health + "<small>%</small></b><span>Salud</span></div>" +
      '<div class="hero-stat"><b>' + (nearest ? fmtKm(nearest.s.remaining) : "—") + "<small>" + (nearest ? "km" : "") + "</small></b><span>" + (nearest ? esc(nearest.c.name.split(" ")[0]) : "Sin avisos") + "</span></div>" +
      '<div class="hero-stat"><b>' + v.services.length + "</b><span>Registros</span></div>" +
      "</div></div></article>" +

      '<div class="quick-grid">' +
      '<button class="quick-tile" data-action="open-service" data-component="oil"><span class="quick-icon">' + icon("wrench") + "</span><b>Registrar servicio</b><small>Añadir al libro</small></button>" +
      '<button class="quick-tile" data-action="tab" data-tab="parts"><span class="quick-icon quick-icon--blue">' + icon("search") + "</span><b>Buscar pieza OEM</b><small>Referencia exacta</small></button>" +
      '<button class="quick-tile" data-action="tab" data-tab="diag"><span class="quick-icon quick-icon--ok">' + icon("wave") + "</span><b>Grabar un ruido</b><small>Análisis 8 s</small></button>" +
      "</div>" +

      (alerts.length ? '<section class="section"><div class="section-head"><span class="section-title">Atención</span><button class="text-btn" data-action="notifications">Ver todo ' + icon("next") + "</button></div>" +
        '<div class="alert-stack">' + alerts.slice(0, 2).map(alertCardHTML).join("") + "</div></section>" : "") +

      '<section class="section"><div class="section-head"><span class="section-title">Próximos por km</span><button class="text-btn" data-action="open-vehicle">Ver ficha ' + icon("next") + "</button></div>" +
      '<div class="card card--pad">' + next.map((c) => miniCompHTML(v, c)).join("") + "</div></section>" +

      (faults.length ? '<section class="section"><div class="section-head"><span class="section-title">Fallos comunes · ' + esc(v.engineCode) + '</span><button class="text-btn" data-action="open-vehicle">Ver todos ' + icon("next") + "</button></div>" +
        '<div class="fault-strip">' + faults.map(faultMiniHTML).join("") + "</div></section>" : "") +

      '<section class="section"><div class="section-head"><span class="section-title">Garaje</span><button class="text-btn" data-action="open-add-vehicle">' + icon("plus") + " Añadir</button></div>" +
      (other ? (state.pro || !other.demoLocked
        ? '<button class="vehicle-pill" data-action="switch-vehicle" data-id="' + other.id + '"><span class="vehicle-thumb"><img src="' + other.image + '" alt=""></span><span class="vehicle-pill-main"><b>' + esc(other.name) + "</b><span>" + esc(other.engineCode) + " · " + fmtKm(other.km) + " km</span></span>" + icon("next") + "</button>"
        : '<button class="locked-vehicle" data-action="locked-vehicle"><span class="locked-thumb">' + icon("car") + '</span><span class="locked-main"><b>' + esc(other.name) + "</b><span>" + fmtKm(other.km) + " km · " + esc(other.engineCode) + "</span></span><span class=\"tag tag--accent\">Pro</span></button>")
        : '<button class="locked-vehicle" data-action="open-add-vehicle"><span class="locked-thumb">' + icon("plus") + '</span><span class="locked-main"><b>Añadir vehículo</b><span>Alta por matrícula y perfil de motor</span></span>' + icon("next") + "</button>") +
      "</section>" +

      '<div class="demo-note"><span class="status-dot"></span> Demo local · datos simulados · sin conexión OBD</div>';
  }

  /* ------------------------------------------------------------------------
     Vehicle detail
     ------------------------------------------------------------------------ */
  function componentItemHTML(v, c) {
    const s = compStatus(v, c);
    const barClass = s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "";
    const chipClass = s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "";
    const right = s.remaining <= 0 ? "VENCIDO" : fmtKm(s.remaining) + " KM";
    const nextLabel = s.overdueTime ? (c.intervalMonths + " MESES") : fmtKm(s.next) + " KM";
    return '<button class="comp-item" data-action="open-component" data-id="' + c.id + '">' +
      '<span class="comp-ico">' + icon(c.icon) + "</span>" +
      '<span class="comp-main"><span class="comp-main-top"><b>' + esc(c.name) + "</b><small>" + right + "</small></span>" +
      '<span class="comp-meta"><span class="progress"><i class="' + barClass + '" style="width:' + Math.max(4, Math.round(s.pct * 100)) + '%"></i></span><span class="comp-chip ' + chipClass + '">' + nextLabel + "</span></span></span>" +
      icon("next") + "</button>";
  }

  function healthPanelHTML(v) {
    const health = healthScore(v);
    const copy = healthSummary(v);
    return '<div class="health-panel"><div class="health-panel-top">' +
      '<div class="health-ring-wrap">' + healthRingSVG(health) + '<div class="health-ring-label"><b>' + health + "</b><span>SALUD</span></div></div>" +
      '<div class="health-copy"><span class="chip ' + copy.chipClass + '">' + copy.chip + "</span><h3>" + esc(copy.title) + "</h3><p>" + esc(copy.text) + "</p></div>" +
      "</div>" + healthBarsHTML(health) + "</div>";
  }

  function nextServiceListHTML(v, count) {
    const list = nextComponents(v, count || 3);
    return list.map((c) => {
      const s = compStatus(v, c);
      const cls = s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "";
      return '<button class="next-service" data-action="open-component" data-id="' + c.id + '" style="width:100%;text-align:left">' +
        '<span class="next-icon">' + icon(c.icon) + "</span>" +
        '<span class="next-main"><b>' + esc(c.name) + "</b><span>A " + fmtKm(s.next) + " km · " + fmtDate(c.lastDate) + "</span></span>" +
        '<span class="next-km ' + cls + '"><b>' + (s.remaining <= 0 ? "Vencido" : fmtKm(s.remaining) + " km") + "</b><span>RESTANTES</span></span>" +
        "</button>";
    }).join("");
  }

  function logTimelineHTML(services) {
    if (!services.length) {
      return '<div class="empty-state">' + icon("file") + "<b>Sin registros todavía</b><p>Registra el primer servicio para empezar el libro.</p></div>";
    }
    let year = null;
    let html = '<div class="log-timeline">';
    services.forEach((s, idx) => {
      const y = String(s.date || "").slice(0, 4) || "—";
      if (y !== year) {
        html += '<div class="log-year">' + y + "</div>";
        year = y;
      }
      html += '<div class="log-item ' + (idx === 0 ? "is-accent" : "") + '">' +
        '<div class="log-top"><div><div class="log-title">' + esc(s.type) + '</div><div class="log-date">' + fmtDate(s.date) + " · " + fmtKm(s.km) + " km</div></div>" +
        '<div class="log-cost">' + money(s.cost) + "</div></div>" +
        '<div class="log-parts">' + esc(s.parts) + "</div>" +
        '<div class="log-shop">' + icon("flag") + esc(s.shop) + "</div>" +
        "</div>";
    });
    return html + "</div>";
  }

  function renderVehicle(v) {
    const tab = ui.vehicleTab || "resumen";
    const tabs = [
      ["resumen", "Resumen"], ["componentes", "Componentes"],
      ["fallos", "Fallos"], ["historial", "Libro"]
    ];
    let content = "";
    if (tab === "componentes") {
      content = '<div class="section-head"><span class="section-title">' + v.components.length + ' componentes controlados</span><span class="mono-label">Control por km</span></div>' +
        '<div class="comp-list">' + sortedComponents(v).map((c) => componentItemHTML(v, c)).join("") + "</div>" +
        '<div class="form-hint">' + icon("info") + "<span>Los intervalos se recalculan automáticamente al registrar un servicio. Toca un componente para ver referencia, par de apriete y plazo.</span></div>";
    } else if (tab === "fallos") {
      const faults = DB.faults[v.engineCode] || [];
      const total = faults.reduce((a, f) => a + f.cases, 0);
      content = '<div class="card card--pad" style="margin-bottom:8px"><div class="row-between">' +
        '<div><span class="mono-label">Base de conocimiento · ' + esc(v.engineCode) + '</span>' +
        '<b class="h3" style="display:block;margin-top:5px">Fallos documentados</b>' +
        '<p class="tiny faint" style="margin-top:3px">Alertas cruzadas con tu motor y plataforma.</p></div>' +
        '<span class="chip">' + fmtKm(total) + " casos</span></div></div>" +
        faults.map((f) => {
          const sev = sevMeta(f.severity);
          return '<article class="fault-card"><div class="fault-top"><span class="fault-ico">' + icon(f.icon) + "</span>" +
            '<div class="fault-top-main"><div class="fault-title-row"><b>' + esc(f.title) + '</b><span class="tag ' + sev.cls + '">' + sev.label + "</span></div>" +
            "<p>" + esc(f.symptom) + "</p></div></div>" +
            '<div class="fault-foot"><span class="fault-cases"><b>' + fmtKm(f.cases) + "</b> casos · " + esc(f.band) + "</span>" +
            '<button class="btn btn--sm" data-action="diag-fault" data-id="' + f.id + '">' + icon("mic") + " Diagnosticar</button></div></article>";
        }).join("") +
        '<div class="disclaimer">' + icon("info") + "<span>Datos agregados de la comunidad y documentación técnica. Un diagnóstico orientativo no sustituye una inspección en taller.</span></div>";
    } else if (tab === "historial") {
      const list = servicesOf(v);
      content = '<div class="row-between" style="margin-bottom:8px"><span class="mono-label">' + list.length + " registros verificados</span>" +
        '<button class="text-btn" data-action="export-book">' + icon(state.pro ? "download" : "lock") + " Exportar</button></div>" +
        '<div class="card card--pad">' + logTimelineHTML(list) + "</div>";
    } else {
      content = healthPanelHTML(v) +
        '<section class="section"><div class="section-head"><span class="section-title">Próximos vencimientos</span><button class="text-btn" data-action="vehicle-tab" data-tab="componentes">Componentes ' + icon("next") + "</button></div>" +
        '<div class="card card--pad">' + nextServiceListHTML(v, 3) + "</div></section>" +
        '<section class="section"><div class="section-head"><span class="section-title">Ficha técnica</span><span class="mono-label">VIN + motor</span></div>' +
        '<div class="spec-grid">' +
        '<div class="spec"><span>Motor</span><b>' + esc(v.engine) + "</b></div>" +
        '<div class="spec"><span>Código motor</span><b>' + esc(v.engineCode) + "</b></div>" +
        '<div class="spec"><span>Plataforma</span><b>' + esc(v.chassis) + "</b></div>" +
        '<div class="spec"><span>Aceite</span><b>' + esc(v.oilSpec) + "</b></div>" +
        '<div class="spec"><span>Cambio</span><b>' + esc(v.gearbox) + "</b></div>" +
        '<div class="spec"><span>Par motor</span><b>' + esc(v.torque) + "</b></div>" +
        '<div class="spec"><span>VIN</span><b>' + esc(maskVin(v.vin)) + "</b></div>" +
        '<div class="spec"><span>Kilometraje</span><b>' + fmtKm(v.km) + " km</b></div>" +
        "</div></section>" +
        '<section class="section"><div class="engine-banner"><img src="assets/engine-bay.png" alt="Vano motor documentado"><div class="engine-banner-copy"><span class="mono-label">Documentación visual</span><b>' + esc(v.engineCode) + '</b><span>Vano motor · ' + esc(v.engine) + '</span></div></div></section>' +
        '<section class="section"><div class="section-head"><span class="section-title">Fallos comunes</span><button class="text-btn" data-action="vehicle-tab" data-tab="fallos">Ver ' + (DB.faults[v.engineCode] || []).length + " " + icon("next") + "</button></div>" +
        '<div class="fault-strip">' + (DB.faults[v.engineCode] || []).slice(0, 3).map(faultMiniHTML).join("") + "</div></section>";
    }

    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Ficha · ' + esc(v.engineCode) + "</div><h1 class=\"screen-title\">" + esc(v.name) + "</h1></div>" +
      '<div class="head-actions"><button class="icon-btn" data-action="edit-vehicle" aria-label="Editar">' + icon("edit") + "</button></div></div>" +

      '<div class="vehicle-banner"><img src="' + v.image + '" alt="' + esc(v.name) + '">' +
      '<div class="vehicle-banner-top"><span class="tag tag--glass">' + esc(v.plate) + '</span><span class="tag tag--glass">' + esc(v.engineCode) + "</span></div>" +
      '<div class="vehicle-banner-body"><div><div class="h2">' + fmtKm(v.km) + ' <span style="font-size:14px;color:var(--faint)">km</span></div><div class="mono-label">' + esc(v.engine) + " · " + v.year + "</div></div>" +
      '<span class="chip">' + esc(v.power) + "</span></div></div>" +

      '<div class="segment">' + tabs.map(([id, label]) =>
        '<button class="' + (tab === id ? "is-active" : "") + '" data-action="vehicle-tab" data-tab="' + id + '">' + label + "</button>"
      ).join("") + "</div>" +
      content +
      '<div class="sticky-cta"><button class="btn btn--primary btn--block" data-action="open-service">' + icon("plus") + " Registrar servicio</button></div>";
  }

  /* ------------------------------------------------------------------------
     Maintenance
     ------------------------------------------------------------------------ */
  function renderMaintenance(v) {
    const list = servicesOf(v);
    const last = list[0];
    const filters = ["Todos", "Motor", "Frenos", "Fluidos", "Chasis"];
    const filtered = ui.maintenanceFilter === "Todos" ? list : list.filter((s) => s.group === ui.maintenanceFilter);
    const hash = hashFor(v);
    const upnext = nextComponents(v, 4);

    return '<div class="screen-head"><div class="head-main"><div class="eyebrow">Libro digital</div><h1 class="screen-title">Mantenimiento</h1></div>' +
      '<div class="head-actions"><button class="icon-btn" data-action="notifications" aria-label="Avisos">' + icon("bell") + "</button></div></div>" +

      '<button class="vehicle-pill" data-action="vehicle-switcher">' +
      '<span class="vehicle-thumb"><img src="' + v.image + '" alt=""></span>' +
      '<span class="vehicle-pill-main"><b>' + esc(v.name) + "</b><span>" + fmtKm(v.km) + " km · " + esc(v.engineCode) + "</span></span>" +
      icon("down") + "</button>" +

      '<div class="book-card"><div class="book-top"><div><span class="mono-label">PitBox certified</span><h3>Libro de mantenimiento</h3>' +
      "<p>Un historial verificable que suma valor el día que vendas el coche.</p></div>" +
      '<span class="book-seal">' + icon("shield") + "</span></div>" +
      '<div class="book-meta"><div><span>Registros</span><b>' + list.length + "</b></div>" +
      "<div><span>Último</span><b>" + (last ? fmtKm(last.km) + " km" : "—") + "</b></div>" +
      "<div><span>Verificación</span><b>#" + hash.slice(0, 4) + "…" + hash.slice(-4) + "</b></div></div>" +
      '<div class="book-actions"><button class="btn btn--primary" data-action="export-book">' + icon(state.pro ? "download" : "lock") + " Exportar certificado</button>" +
      '<button class="btn btn--ghost" data-action="open-service" aria-label="Registrar servicio">' + icon("plus") + "</button></div></div>" +

      '<section class="section"><div class="section-head"><span class="section-title">Vencimientos por km</span><span class="mono-label">' + upnext.length + " próximos</span></div>" +
      '<div class="upnext-scroll">' + upnext.map((c) => {
        const s = compStatus(v, c);
        const cls = s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "";
        return '<button class="upnext-card" data-action="open-component" data-id="' + c.id + '">' +
          '<span class="upnext-top">' + icon(c.icon) + "<span>" + esc(c.group) + "</span></span>" +
          "<b>" + esc(c.name) + "</b>" +
          '<span class="upnext-km ' + cls + '">' + (s.remaining <= 0 ? "Vencido" : fmtKm(s.remaining)) + " <small>" + (s.remaining <= 0 ? "" : "km") + "</small></span>" +
          '<div class="mono-label">' + (s.overdueTime && s.remaining > 0 ? "Plazo de tiempo vencido" : "A " + fmtKm(s.next) + " km") + "</div></button>";
      }).join("") + "</div></section>" +

      '<section class="section"><div class="section-head"><span class="section-title">Historial</span><button class="text-btn" data-action="open-service">' + icon("plus") + " Registrar</button></div>" +
      '<div class="filter-row">' + filters.map((f) =>
        '<button class="filter-chip ' + (ui.maintenanceFilter === f ? "is-active" : "") + '" data-action="maintenance-filter" data-filter="' + f + '">' + f + "</button>"
      ).join("") + "</div>" +
      '<div class="card card--pad">' + logTimelineHTML(filtered) + "</div></section>" +

      '<div class="affiliate-note">' + icon("shield") + "<span>Cada registro queda vinculado al kilometraje y al componente. En Pro se sella con hash de verificación y QR de compraventa.</span></div>";
  }

  /* ------------------------------------------------------------------------
     Parts
     ------------------------------------------------------------------------ */
  function partCardHTML(p) {
    const from = Math.min.apply(null, p.offers.map((o) => o.price));
    return '<button class="part-card" data-action="open-part" data-id="' + p.id + '">' +
      '<span class="part-glyph">' + icon(partIcon(p.category)) + "</span>" +
      '<span class="part-main"><span class="mono-label">' + esc(p.category) + " · OEM</span>" +
      "<b>" + esc(p.name) + "</b><span class=\"part-oem\">" + esc(p.oem) + "</span><span class=\"part-fit\">" + esc(p.fitment) + "</span></span>" +
      '<span class="part-side"><span class="part-price">' + money(from) + '</span><span class="part-offers">desde · ' + p.offers.length + ' ofertas</span><span class="part-aff">' + icon("external") + " afiliado</span></span>" +
      "</button>";
  }

  function partResultsHTML(query) {
    const list = filterParts(query);
    if (!list.length) {
      return '<div class="empty-state">' + icon("search") + "<b>Sin referencias para “" + esc(query) + "”</b><p>Prueba con el código OEM, el nombre de la pieza o el motor del vehículo.</p></div>";
    }
    return list.map(partCardHTML).join("");
  }

  function renderParts() {
    const suggestions = [
      ["06K905601B", "Bujía"], ["06L115562", "Filtro aceite"],
      ["5Q0407151", "Brazo"], ["5Q0698151K", "Pastillas"]
    ];
    const count = filterParts(ui.partsQuery).length;
    return '<div class="screen-head"><div class="head-main"><div class="eyebrow">Base OEM · tiendas afiliadas</div><h1 class="screen-title">Recambios</h1></div>' +
      '<div class="head-actions"><button class="icon-btn" data-action="scan-part" aria-label="Escanear código">' + icon("scan") + "</button></div></div>" +

      '<div class="search-box">' + icon("search") +
      '<input id="partsSearch" data-search type="search" autocomplete="off" placeholder="Referencia, pieza o VIN…" value="' + esc(ui.partsQuery) + '" aria-label="Buscar recambio">' +
      '<button class="search-clear" data-action="clear-search" aria-label="Limpiar" style="display:' + (ui.partsQuery ? "grid" : "none") + '">' + icon("close") + "</button></div>" +
      '<div class="suggest-row">' + suggestions.map(([q, label]) =>
        '<button class="chip chip--button" data-action="part-suggest" data-q="' + q + '">' + esc(label) + " · " + q + "</button>"
      ).join("") + "</div>" +

      '<section class="section"><div class="section-head"><span class="section-title">Referencias</span><span class="mono-label" id="partCount">' + count + " resultados</span></div>" +
      '<div id="partResults">' + partResultsHTML(ui.partsQuery) + "</div></section>" +

      '<section class="section"><div class="blueprint-card"><h3>Despieces MQB</h3><p>Vistas explosionadas de los conjuntos que más se sustituyen en tu plataforma.</p>' +
      '<button class="text-btn" data-action="open-part" data-id="pads">Abrir ' + icon("up-right") + "</button>" +
      diagramSVG("brake") + "</div></section>" +

      '<div class="affiliate-note">' + icon("external") + "<span>PitBox puede recibir una comisión si compras a través de los enlaces de tienda. El precio que ves no cambia. Datos y stock simulados.</span></div>";
  }

  function offerRowHTML(o, best) {
    return '<button class="offer-row ' + (best ? "is-best" : "") + '" data-action="affiliate" data-shop="' + esc(o.shop) + '" data-brand="' + esc(o.brand) + '">' +
      '<span class="offer-brand">' + esc(o.brand.split(" ").map((x) => x[0]).join("").slice(0, 3).toUpperCase()) + "</span>" +
      '<span class="offer-main"><b>' + esc(o.brand) + ' <span class="tag ' + (best ? "tag--accent" : "") + '">' + esc(best ? "Mejor precio" : o.badge) + "</span></b>" +
      "<span>" + esc(o.ref) + " · " + esc(o.shop) + "</span></span>" +
      '<span class="offer-side"><span class="offer-price">' + money(o.price) + "</span><small>IVA incluido</small></span>" +
      '<span class="offer-go">' + icon("up-right") + "</span></button>";
  }

  function renderPart(v) {
    const p = DB.parts.find((x) => x.id === ui.params.id) || DB.parts[0];
    const offers = [...p.offers].sort((a, b) => a.price - b.price);
    const compatible = (p.engines || []).includes(v.engineCode);
    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Recambio OEM · ' + esc(p.category) + '</div><h1 class="screen-title">' + esc(p.name) + "</h1></div>" +
      '<div class="head-actions"><button class="icon-btn" data-action="copy-ref" data-ref="' + esc(p.oem) + '" aria-label="Copiar referencia">' + icon("copy") + "</button></div></div>" +

      '<div class="part-hero"><div class="part-hero-top"><div><div class="mono-label">Referencia original</div><div class="part-title">' + esc(p.name) + '</div>' +
      '<div class="oem-badge">' + esc(p.oem) + '<button data-action="copy-ref" data-ref="' + esc(p.oem) + '" aria-label="Copiar">' + icon("copy") + "</button></div></div>" +
      '<span class="part-glyph" style="width:52px;height:52px;flex:0 0 52px">' + icon(partIcon(p.category)) + "</span></div>" +
      (compatible
        ? '<div class="fit-box">' + icon("check") + "<div><b>Compatible con tu " + esc(v.name) + "</b><span>" + esc(v.engineCode) + " · " + esc(p.fitment) + "</span></div></div>"
        : '<div class="fit-box" style="background:var(--warn-soft);border-color:rgba(255,176,32,.22)">' + icon("alert") + '<div><b style="color:#ffd58a">Verifica compatibilidad</b><span style="color:rgba(255,213,138,.62)">Esta referencia no figura para ' + esc(v.engineCode) + ". Confirma por VIN.</span></div></div>") +
      "</div>" +

      (p.diagram ? '<section class="section"><div class="section-head"><span class="section-title">Despiece</span><span class="mono-label">' + esc(p.diagram === "brake" ? "Freno delantero" : "Tren delantero") + "</span></div>" +
        '<div class="blueprint-card" style="padding:10px">' + diagramSVG(p.diagram) + "</div></section>" : "") +

      '<section class="section"><div class="section-head"><span class="section-title">Especificaciones</span><span class="mono-label">Datos de montaje</span></div>' +
      '<div class="spec-grid">' + p.specs.map(([k, val]) => '<div class="spec"><span>' + esc(k) + "</span><b>" + esc(val) + "</b></div>").join("") + "</div></section>" +

      '<section class="section"><div class="offer-sort-row"><span class="section-title">Equivalentes y tiendas</span><span class="mono-label">' + offers.length + " ofertas</span></div>" +
      offers.map((o, i) => offerRowHTML(o, i === 0)).join("") +
      '<div class="affiliate-note">' + icon("external") + "<span>Enlaces de afiliado simulados. Comprueba siempre la referencia y la compatibilidad por VIN antes de comprar.</span></div></section>" +

      '<section class="section"><div class="section-head"><span class="section-title">Compatible también con</span></div><div class="chip-row">' +
      p.compat.map((c) => '<span class="chip">' + esc(c) + "</span>").join("") + "</div></section>" +

      (p.note ? '<div class="sheet-note">' + esc(p.note) + "</div>" : "") +

      '<div class="sticky-cta"><button class="btn btn--primary btn--block" data-action="service-part" data-component="' + esc(p.componentId) + '" data-ref="' + esc(p.oem) + '" data-work="' + esc(p.name) + '">' + icon("plus") + " Añadir al libro de mantenimiento</button></div>";
  }

  /* ------------------------------------------------------------------------
     Diagnostic
     ------------------------------------------------------------------------ */
  function contextBanner(v) {
    if (!ui.params.fault) return "";
    const f = (DB.faults[v.engineCode] || []).find((x) => x.id === ui.params.fault);
    if (!f) return "";
    return '<div class="card card--pad" style="margin-bottom:9px;border-color:rgba(255,90,31,.25)"><div class="row-between">' +
      '<div><span class="mono-label">Diagnóstico dirigido</span><b class="h3" style="display:block;margin-top:4px">' + esc(f.title) + "</b>" +
      '<p class="tiny faint" style="margin-top:3px">' + esc(trunc(f.symptom, 76)) + "</p></div>" +
      '<span class="chip chip--accent">' + esc(f.band) + "</span></div></div>";
  }

  function visualCameraHTML() {
    const parts = [["disc", "Disco delantero"], ["pads", "Pastillas"]];
    const scanning = ui.visualStage === "scanning";
    const result = ui.visualStage === "result" ? DB.visualResults[ui.visualPart] : null;
    const metrics = ui.visualMetrics;
    const captured = (ui.visualStage === "result" || scanning) && ui.capturedFrame;
    const source = captured ?
      '<img src="' + ui.capturedFrame + '" alt="Captura de la cámara">' :
      ui.cameraLive ? '<video id="cameraFeed" autoplay playsinline muted></video>' :
        '<img src="assets/brake-disc.png" alt="Referencia de demostración">';
    const liveLabel = scanning ? "Procesando" : ui.cameraLive ? "Cámara en vivo" : captured ? "Captura guardada" : ui.cameraStarting ? "Abriendo cámara" : "Referencia demo";
    const showActivate = !ui.cameraLive && !captured && !scanning;
    const hint = scanning ? "Comparando la captura con patrones de desgaste…" :
      ui.cameraLive ? "Encuadra la pieza y pulsa el disparador. La foto y las métricas son reales." :
        captured ? "Foto capturada en el dispositivo." :
          "Activa la cámara para fotografiar la pieza. Sin permiso se usa una referencia demo.";
    const resultHTML = result ? (metrics ?
      '<div class="card card--pad visual-result">' +
      '<div class="visual-status-row"><div><span class="mono-label">Resultado visual</span><h3>' + esc(result.title) + "</h3></div>" +
      '<span class="tag ' + (metrics.score >= 55 ? "tag--ok" : "tag--warn") + '">' + (metrics.score >= 55 ? "Captura válida" : "Captura mejorable") + "</span></div>" +
      '<div class="metric-grid"><div class="metric"><span>Resolución</span><b>' + metrics.width + " × " + metrics.height + '</b></div>' +
      '<div class="metric"><span>Luminancia media</span><b>' + Math.round(metrics.luminance) + ' / 255</b></div>' +
      '<div class="metric"><span>Nitidez</span><b>' + metrics.sharpness.toFixed(1).replace(".", ",") + '</b></div>' +
      '<div class="metric"><span>Calidad de captura</span><b>' + metrics.score + ' / 100</b></div></div>' +
      '<div class="demo-wear"><div class="row-between"><span class="mono-label">Desgaste estimado</span><span class="chip">Demo</span></div>' +
      '<b>' + esc(result.headline) + "</b><p>" + esc(result.note) + "</p>" +
      '<div class="metric-grid" style="margin-top:7px">' + result.metrics.slice(0, 2).map(([k, val]) => '<div class="metric"><span>' + esc(k) + "</span><b>" + esc(val) + "</b></div>").join("") + "</div></div>" +
      '<p class="visual-note">La foto y la calidad de captura son reales. La estimación de desgaste sigue siendo una referencia de demostración: no hay medición milimétrica sin calibración.</p>' +
      '<div class="row-between" style="margin-top:10px"><span class="mono-label">Calidad ' + metrics.score + "%</span>" +
      '<button class="btn btn--sm" data-action="visual-save">' + icon("plus") + " Registrar inspección</button></div></div>" :
      '<div class="card card--pad visual-result">' +
      '<div class="visual-status-row"><div><span class="mono-label">Resultado visual · demo</span><h3>' + esc(result.title) + "</h3></div>" +
      '<span class="tag ' + (result.status === "warning" ? "tag--warn" : "tag--ok") + '">' + esc(result.statusLabel) + "</span></div>" +
      '<div class="visual-headline">' + esc(result.headline) + "</div>" +
      '<div class="metric-grid">' + result.metrics.map(([k, val]) => '<div class="metric"><span>' + esc(k) + "</span><b>" + esc(val) + "</b></div>").join("") + "</div>" +
      '<p class="visual-note">' + esc(result.note) + "</p>" +
      '<div class="row-between" style="margin-top:10px"><span class="mono-label">Confianza demo ' + result.confidence + "%</span>" +
      '<button class="btn btn--sm" data-action="visual-save">' + icon("plus") + " Registrar inspección</button></div></div>") : "";
    return '<div class="chip-row" style="margin-bottom:8px">' + parts.map(([id, label]) =>
      '<button class="chip chip--button ' + (ui.visualPart === id ? "chip--accent" : "") + '" data-action="visual-part" data-part="' + id + '">' + label + "</button>"
    ).join("") + "</div>" +
      '<div class="camera-card ' + (scanning ? "camera-scanning" : "") + '">' + source +
      '<div class="camera-topline"><span class="camera-live"><span class="status-dot"></span>' + liveLabel + '</span><span class="tag tag--glass">MACRO · 1×</span></div>' +
      '<div class="camera-corners"><span></span><span></span><span></span><span></span></div>' +
      '<div class="camera-reticle"></div><div class="scan-line"></div>' +
      (showActivate ? '<div class="camera-activate"><button class="btn btn--sm btn--primary" data-action="camera-start" ' + (ui.cameraStarting ? "disabled" : "") + ">" + icon("camera") + (ui.cameraStarting ? " Abriendo…" : " Activar cámara real") + "</button>" +
        '<span class="camera-error">' + esc(ui.cameraError || "Requiere HTTPS o localhost") + "</span></div>" : "") +
      (result && !metrics ? '<div class="detect-box"><span>' + (ui.visualPart === "disc" ? "DESGASTE 64%" : "DESGASTE 46%") + "</span></div>" : "") +
      '<div class="camera-bottom"><span class="chip">' + (ui.visualPart === "disc" ? "Disco del. izq." : "Pastilla del. izq.") + "</span>" +
      '<button class="capture-btn" data-action="visual-capture" aria-label="Capturar" ' + (scanning ? "disabled" : "") + ">" + icon(scanning ? "scan" : "camera") + "</button></div></div>" +
      '<div class="rec-hint" style="margin-top:8px">' + icon("info") + " " + hint + "</div>" +
      resultHTML;
  }

  function diagAudioBars() {
    let html = "";
    for (let i = 0; i < 32; i++) {
      const h = 4 + Math.abs(Math.sin(i * 0.7)) * 14 + (i % 3) * 2;
      html += '<i class="' + (i < 20 ? "is-on" : "") + '" style="height:' + h.toFixed(0) + 'px"></i>';
    }
    return html;
  }

  function guideStepsHTML(steps, unlocked) {
    const one = '<div class="guide-step"><span class="guide-num">01</span><p>' + esc(steps[0]) + "</p></div>";
    if (unlocked) {
      return one + steps.slice(1).map((s, i) =>
        '<div class="guide-step"><span class="guide-num">' + pad2(i + 2) + "</span><p>" + esc(s) + "</p></div>"
      ).join("");
    }
    const rest = '<div class="guide-steps">' + steps.slice(1).map((s, i) =>
      '<div class="guide-step"><span class="guide-num">' + pad2(i + 2) + "</span><p>" + esc(s) + "</p></div>"
    ).join("") + "</div>";
    return one + '<div class="locked-guide"><div class="locked-content">' + rest + "</div>" +
      '<div class="lock-overlay">' + icon("lock") + "<b>Informe completo bloqueado</b><p>Desbloquea los " + (steps.length - 1) + " pasos restantes y guarda el análisis en tu libro.</p>" +
      '<button class="btn btn--sm btn--primary" data-action="diag-unlock">' + icon("pro") + " Desbloquear informe</button></div></div>";
  }

  function diagResultHTML(v) {
    const results = diagnosticResults();
    const top = results[0];
    const others = results.slice(1);
    const unlocked = state.pro || ui.diagUnlocked;
    const summary = ui.audioSummary;
    const real = !!(summary && summary.real);
    const duration = real ? summary.duration.toFixed(1).replace(".", ",") + " s" : "8,0 s";
    const readings = real ?
      '<div class="card card--pad section" style="margin-top:10px"><div class="row-between" style="margin-bottom:7px"><span class="mono-label">Lectura del micrófono</span><span class="chip chip--ok">' + icon("check") + " Real</span></div>" +
      '<div class="metric-grid" style="margin-top:0"><div class="metric"><span>Frecuencia dominante</span><b>' + fmtHz(summary.freq) + '</b></div>' +
      '<div class="metric"><span>Pico</span><b>' + fmtDb(summary.peakDb) + '</b></div>' +
      '<div class="metric"><span>Duración</span><b>' + duration + '</b></div>' +
      '<div class="metric"><span>Muestreo</span><b>' + (summary.sampleRate ? (summary.sampleRate / 1000).toFixed(1).replace(".", ",") + " kHz" : "—") + '</b></div></div>' +
      '<p class="visual-note">La frecuencia y el nivel son medidas reales del micrófono (dBFS, sin calibrar a dB SPL). La clasificación aplica reglas por bandas, no un modelo entrenado: úsala como orientación.</p></div>' : "";
    return '<div class="result-head"><div><div class="eyebrow">Análisis completado · ' + duration + '</div><h2>Resultado</h2><p>' + (real ? "Firma medida en el dispositivo · " + (summary.ambient ? "cancelación ambiental ON" : "sin cancelación") : "Firma acústica filtrada · 48 kHz · mono") + '</p></div>' +
      '<span class="chip ' + (unlocked ? "chip--ok" : "chip--accent") + '">' + (unlocked ? "Informe completo" : "Vista previa") + "</span></div>" +
      '<div class="match-card"><div class="match-top"><div><div class="match-label">Coincidencia principal</div><div class="match-title">' + esc(top.label) + "</div></div>" +
      '<div class="match-pct"><b>' + top.pct + "%</b><span>" + (real ? "AFINIDAD" : "MATCH") + "</span></div></div>" +
      '<p class="match-desc">' + esc(top.desc) + "</p>" +
      '<div class="audio-bar"><button class="audio-play" data-action="diag-play" aria-label="Reproducir">' + icon("play", "ico--fill") + "</button>" +
      '<div class="audio-wave">' + diagAudioBars() + '</div><span class="audio-time">' + duration + "</span></div>" +
      '<div class="match-meta"><div class="chip-row">' + (real ? '<span class="chip chip--accent">Medido ' + fmtHz(summary.freq) + '</span><span class="chip">Banda ' + esc(top.band) + '</span>' : '<span class="chip">' + esc(top.band) + '</span><span class="chip">Micrófono superior</span>') + "</div>" +
      '<span class="chip">' + esc(top.id === "chain" && v.engineCode === "CJXC" ? "Riesgo alto" : "Prioridad media") + "</span></div></div>" +

      readings +

      '<section class="section"><div class="section-head"><span class="section-title">Otras hipótesis</span><span class="mono-label">' + (real ? "Orden orientativo" : "Ordenadas") + '</span></div>' +
      '<div class="candidates">' + others.map((r) =>
        '<div class="candidate"><div class="candidate-main"><b>' + esc(r.label) + '</b><div class="cand-track"><i style="width:' + r.pct + '%"></i></div></div><span class="candidate-pct">' + r.pct + "%</span></div>"
      ).join("") + "</div></section>" +

      '<section class="section"><div class="card guide-card" style="padding:0;overflow:hidden">' +
      '<div class="guide-head" style="padding:14px 14px 0"><b>Guía de comprobación</b><span class="chip">' + top.steps.length + " pasos</span></div>" +
      '<div style="padding:0 14px 12px"><div class="guide-steps">' + guideStepsHTML(top.steps, unlocked) + "</div></div></div>" +
      (state.pro ? "" : '<div class="pass-strip" style="margin-top:7px">' + icon("pro") + '<div class="pass-main"><b>Pase diagnóstico</b><span>' + state.diagCredits + " disponible" + (state.diagCredits === 1 ? "" : "s") + " · informe completo</span></div>" +
        '<button class="btn btn--sm" data-action="buy-pass">3,99 €</button></div>') + "</section>" +

      '<div class="row" style="margin-top:12px;gap:7px">' +
      '<button class="btn btn--ghost" style="flex:1" data-action="diag-reset">' + icon("retry") + " Nuevo</button>" +
      '<button class="btn btn--primary" style="flex:1.4" data-action="diag-save">' + icon("check") + " Guardar informe</button></div>" +
      '<div class="disclaimer">' + icon("alert") + "<span>Diagnóstico orientativo basado en patrones de sonido. Confirma en taller antes de sustituir piezas.</span></div>";
  }

  function renderDiag(v) {
    const credits = state.pro ? "PRO" : state.diagCredits + (state.diagCredits === 1 ? " pase" : " pases");
    let body = "";
    if (ui.diagMode === "visual") {
      body = visualCameraHTML() +
        '<div class="disclaimer">' + icon("info") + "<span>La cámara captura una foto real y mide resolución, luz y nitidez. La estimación de desgaste es una referencia demo, no una medición calibrada.</span></div>" +
        (ui.visualStage === "result" ? '<button class="btn btn--ghost btn--block" style="margin-top:10px" data-action="visual-reset">' + icon("retry") + " Repetir captura</button>" : "");
    } else if (ui.diagStage === "recording") {
      const real = ui.micMode === "real";
      body = '<div class="recording-stage"><div class="rec-top"><span class="rec-live"><span class="status-dot"></span> ' + (real ? "Grabando · micrófono real" : "Grabando · demo") + "</span>" +
        '<span class="rec-timer"><span id="recTimer">00:00.0</span> <small>/ 00:08</small></span></div>' +
        '<div class="wave-panel"><canvas id="waveCanvas"></canvas><div class="wave-axis"></div><span class="wave-freq" id="waveFreq">—</span></div>' +
        '<div class="rec-stats"><div class="rec-stat"><span>' + (real ? "Pico" : "Pico demo") + '</span><b data-rec-peak>' + (real ? "silencio" : "68 dB") + '</b></div><div class="rec-stat"><span>Frecuencia</span><b data-rec-freq>—</b></div><div class="rec-stat"><span>Filtro</span><b>' + (ui.ambientFilter ? "ON" : "OFF") + '</b></div></div>' +
        '<div class="rec-hint">' + icon("info") + (real ? " Acerca el móvil al foco y evita golpear la carrocería. Se analiza la frecuencia dominante." : " Micrófono no disponible: esta captura se simula para que puedas probar el flujo.") + "</div>" +
        '<div class="rec-controls"><button class="stop-btn" data-action="diag-stop">' + icon("stop") + " Detener y analizar</button></div></div>";
    } else if (ui.diagStage === "analyzing") {
      body = '<div class="analyzing"><div class="scan-ring">' + icon("wave") + "</div>" +
        "<h3>Analizando la firma</h3><p>Comparando con 12.480 patrones de avería</p>" +
        '<div class="scan-steps"><div class="scan-step is-done"><span class="mini-dot"></span>Ruido ambiental filtrado</div>' +
        '<div class="scan-step is-done"><span class="mini-dot"></span>Espectro 0,2 – 8 kHz extraído</div>' +
        '<div class="scan-step is-active"><span class="mini-dot"></span>Coincidencia con patrones ' + esc(v.engineCode) + '…</div>' +
        '<div class="scan-step"><span class="mini-dot"></span>Generando guía de comprobación</div></div></div>';
    } else if (ui.diagStage === "result") {
      body = diagResultHTML(v);
    } else {
      body = contextBanner(v) +
        '<div class="diag-hero"><span class="diag-kicker">' + icon("scan") + " Análisis en local</span>" +
        "<h2>Escucha<br>lo que falla.</h2><p>Graba 8 segundos del motor o rodaje. PitBox filtra el ambiente y compara la firma con fallos conocidos de tu motor.</p>" +
        '<div class="diag-orbit"><span class="orbit-ring"></span><span class="orbit-ring orbit-ring--2"></span><span class="orbit-ring orbit-ring--3"></span>' +
        '<span class="orbit-tick orbit-tick--1"></span><span class="orbit-tick orbit-tick--2"></span><span class="orbit-tick orbit-tick--3"></span>' +
        '<button class="record-btn" data-action="diag-start" aria-label="Grabar ruido">' + icon("mic") + "</button></div>" +
        '<div class="record-label">Grabar 8 segundos</div>' +
        '<div class="diag-noise"><span class="noise-bars"><span></span><span></span><span></span><span></span><span></span></span> Ruido ambiente 34 dB · listo</div></div>' +
        '<div class="diag-tips"><div class="diag-tip">' + icon("mic") + "<b>1,5 m</b><span>del foco del ruido</span></div>" +
        '<div class="diag-tip">' + icon("engine") + "<b>Ralentí</b><span>o rodaje constante</span></div>" +
        '<div class="diag-tip">' + icon("wind") + "<b>Sin viento</b><span>ni eco de pared</span></div></div>" +
        '<div class="card card--pad section"><div class="row-between" style="margin-bottom:4px"><span class="mono-label">Ajustes de captura</span><span class="chip">Local</span></div>' +
        '<div class="switch-row"><div><b>Cancelación ambiental</b><span>Beamforming de doble micrófono</span></div>' +
        '<button class="switch ' + (ui.ambientFilter ? "is-on" : "") + '" data-action="toggle-filter" data-key="ambient" aria-label="Cancelación ambiental"></button></div>' +
        '<div class="switch-row"><div><b>Filtro de banda</b><span>0,2 – 8 kHz · motor y rodamientos</span></div>' +
        '<button class="switch ' + (ui.bandFilter ? "is-on" : "") + '" data-action="toggle-filter" data-key="band" aria-label="Filtro de banda"></button></div></div>' +
        '<div class="disclaimer">' + icon("info") + "<span>Prototipo: la captura y el análisis están simulados. La versión real usaría el micrófono y DSP en el dispositivo.</span></div>";
    }

    return '<div class="screen-head"><div class="head-main"><div class="eyebrow">Acústico + visión</div><h1 class="screen-title">Diagnóstico</h1></div>' +
      '<div class="head-actions"><button class="chip chip--accent" data-action="open-pro">' + icon("pro") + " " + credits + "</button></div></div>" +
      '<div class="segment diag-mode"><button class="' + (ui.diagMode === "acoustic" ? "is-active" : "") + '" data-action="diag-mode" data-mode="acoustic">Acústico</button>' +
      '<button class="' + (ui.diagMode === "visual" ? "is-active" : "") + '" data-action="diag-mode" data-mode="visual">Visual</button></div>' +
      body;
  }

  /* ------------------------------------------------------------------------
     Paywall / Pro
     ------------------------------------------------------------------------ */
  function renderPro(v) {
    const plan = DB.plans[ui.selectedPlan];
    const benefits = [
      ["car", "Varios vehículos", "Gestiona coches, motos o pequeños equipos en un solo garaje."],
      ["file", "Libro certificado", "Exporta un historial sellado con QR para la venta."],
      ["wave", "Informes completos", "Todos los pasos de comprobación y diagnósticos sin límite."],
      ["clock", "Avisos por km y tiempo", "Recordatorios antes de cada intervalo crítico."],
      ["search", "Ahorro en recambios", "Seguimiento de precios y referencias guardadas."]
    ];
    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Monetización</div><h1 class="screen-title">PitBox Pro</h1></div>' +
      '<span class="chip chip--accent">' + icon("pro") + " PRO</span></div>" +

      (state.pro ? '<div class="pro-active-banner">' + icon("shield") + "<div><b>Pro activo</b><span>Gracias por cuidar tu garaje. Todas las funciones están desbloqueadas.</span></div></div>" : "") +

      '<div class="pro-hero"><span class="pro-badge">' + icon("pro") + " PITBOX PRO</span>" +
      '<h2>Tu garaje,<br><em>certificado.</em></h2>' +
      "<p>Convierte cada servicio en un historial con valor. Multiplica coches, desbloquea informes completos y exporta el libro cuando vendas.</p>" +
      '<div class="chip-row"><span class="chip chip--accent">QR de verificación</span><span class="chip">Sin anuncios</span><span class="chip">Datos locales</span></div></div>' +

      (state.pro
        ? '<section class="section"><div class="page-actions" style="display:flex;gap:7px"><button class="btn btn--primary" style="flex:1" data-action="export-book">' + icon("download") + " Exportar libro</button><button class=\"btn btn--ghost\" data-action=\"toast\" data-msg=\"Suscripción de demo activa\">" + icon("settings") + "</button></div></section>"
        : '<section class="section"><div class="section-head"><span class="section-title">Elige tu acceso</span><span class="mono-label">Pago único o anual</span></div>' +
          '<button class="plan-card ' + (ui.selectedPlan === "annual" ? "is-selected" : "") + '" data-action="select-plan" data-plan="annual">' +
          '<span class="plan-radio"></span><span class="plan-main"><b>Pro anual <span class="tag tag--accent">Recomendado</span></b><span>24,99 €/año · cancela cuando quieras</span></span>' +
          '<span class="plan-price"><b>24,99 €</b><span>/ AÑO</span></span></button>' +
          '<button class="plan-card ' + (ui.selectedPlan === "lifetime" ? "is-selected" : "") + '" data-action="select-plan" data-plan="lifetime">' +
          '<span class="plan-radio"></span><span class="plan-main"><b>Pro de por vida</b><span>Un pago · todos tus coches para siempre</span></span>' +
          '<span class="plan-price"><b>49,99 €</b><span>ÚNICO</span></span></button>' +
          '<button class="btn btn--primary btn--block" style="margin-top:10px" data-action="activate-pro">' + icon("pro") + " Activar " + plan.name + " · " + plan.price + "</button>" +
          '<p class="pro-legal">Compra simulada en el prototipo · sin cargos reales.</p></section>') +

      '<section class="section"><div class="section-head"><span class="section-title">Todo lo que incluye</span></div><div class="pro-benefits">' +
      benefits.map(([ico, title, desc]) => '<div class="pro-benefit">' + icon(ico) + "<div><b>" + title + "</b><span>" + desc + "</span></div></div>").join("") +
      "</div></section>" +

      '<section class="section"><div class="section-head"><span class="section-title">Gratis vs Pro</span></div>' +
      '<div class="card card--pad"><table class="compare-table"><thead><tr><th></th><th>Free</th><th>Pro</th></tr></thead><tbody>' +
      '<tr><td>Vehículos</td><td>1</td><td>Ilimitados</td></tr>' +
      '<tr><td>Diagnóstico acústico</td><td>Vista previa</td><td>Completo</td></tr>' +
      '<tr><td>Libro certificado</td><td>' + icon("close", "ico--no") + "</td><td>" + icon("check", "ico--ok") + "</td></tr>" +
      '<tr><td>Alertas por km y fecha</td><td>Básicas</td><td>Avanzadas</td></tr>' +
      '<tr><td>Historial de recambios</td><td>' + icon("check", "ico--ok") + "</td><td>" + icon("check", "ico--ok") + "</td></tr>" +
      "</tbody></table></div></section>" +

      (!state.pro ? '<section class="section"><div class="pass-strip">' + icon("pro") + '<div class="pass-main"><b>¿Solo quieres un diagnóstico?</b><span>Informe completo sin suscripción</span></div>' +
        '<button class="btn btn--sm" data-action="buy-pass">3,99 € · pase</button></div></section>' : "") +

      '<p class="pro-legal">Los enlaces de recambios son de afiliación. PitBox Pro es una demostración de producto: no se procesa ningún pago.</p>';
  }

  /* ------------------------------------------------------------------------
     Service form
     ------------------------------------------------------------------------ */
  function nextDueHintHTML(c, v) {
    if (!c) return "Selecciona un componente para calcular el próximo vencimiento.";
    const s = compStatus(v, c);
    return "Próximo a <b>" + fmtKm(s.next) + " km</b> · " + (s.remaining <= 0 ? "vencido" : "dentro de " + fmtKm(s.remaining) + " km") + ".";
  }

  function renderService(v) {
    const selectedId = ui.params.componentId || "oil";
    const selected = v.components.find((c) => c.id === selectedId) || v.components[0];
    const fromPart = ui.params.ref || "";
    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Libro de mantenimiento</div><h1 class="screen-title">Registrar servicio</h1></div></div>' +

      '<button class="vehicle-pill" data-action="vehicle-switcher">' +
      '<span class="vehicle-thumb"><img src="' + v.image + '" alt=""></span>' +
      '<span class="vehicle-pill-main"><b>' + esc(v.name) + '</b><span>' + fmtKm(v.km) + " km actuales · " + esc(v.engineCode) + "</span></span>" + icon("down") + "</button>" +

      (fromPart ? '<div class="fit-box" style="margin:0 0 9px">' + icon("bag") + "<div><b>Desde recambio OEM</b><span>" + esc(fromPart) + " · añade el trabajo y la fecha</span></div></div>" : "") +

      '<form id="serviceForm" class="form-card" novalidate>' +
      '<div class="field"><label>Componente <small>*</small></label><select name="component" data-service-component required>' +
      v.components.map((c) => {
        const s = compStatus(v, c);
        return '<option value="' + c.id + '" ' + (c.id === selected.id ? "selected" : "") + ">" + esc(c.name) + " — " + (s.remaining <= 0 ? "vencido" : fmtKm(s.remaining) + " km") + "</option>";
      }).join("") + "</select></div>" +
      '<div class="field"><label>Trabajo realizado <small>*</small></label><input name="work" id="serviceWork" type="text" value="' + esc(ui.params.work || (selected ? selected.name : "")) + '" placeholder="Ej. Aceite y filtro"></div>' +
      '<div class="field-row"><div class="field"><label>Kilometraje</label><input name="km" type="number" min="0" step="1" value="' + v.km + '" required></div>' +
      '<div class="field"><label>Fecha</label><input name="date" type="date" value="' + isoToday() + '" required></div></div>' +
      '<div class="field-row"><div class="field"><label>Coste</label><input name="cost" type="number" min="0" step="0.01" placeholder="0,00" inputmode="decimal"></div>' +
      '<div class="field"><label>Taller</label><input name="shop" type="text" placeholder="Taller o autoservicio"></div></div>' +
      '<div class="field"><label>Referencia usada <small>Opcional</small></label><input name="ref" id="serviceRef" type="text" value="' + esc(fromPart || (selected ? selected.ref : "")) + '" placeholder="06L115562"></div>' +
      '<div class="field"><label>Notas</label><textarea name="notes" placeholder="Observaciones, marcas, pares…"></textarea></div>' +
      '<button class="upload-tile" type="button" data-action="upload">' + icon("camera") + "<span><b>Añadir foto del recibo</b><span>JPG o PNG · se adjunta al registro</span></span></button>" +
      '<div class="form-hint" id="nextDueHint">' + nextDueHintHTML(selected, v) + "</div>" +
      '<div class="switch-row" style="margin-top:7px"><div><b>Añadir recordatorio</b><span>Aviso 1.000 km antes del próximo cambio</span></div><button type="button" class="switch is-on" data-action="toast" data-msg="Recordatorio de demo activado" aria-label="Recordatorio"></button></div>' +
      '<button class="btn btn--primary btn--block" type="submit" style="margin-top:12px">' + icon("check") + " Guardar en el libro</button>" +
      "</form>" +

      '<div class="disclaimer">' + icon("info") + "<span>Al guardar, el intervalo del componente se recalcula desde el nuevo kilometraje. Datos de demo almacenados en tu navegador.</span></div>";
  }

  /* ------------------------------------------------------------------------
     Add vehicle
     ------------------------------------------------------------------------ */
  const PLATE_MODERN = /^[0-9]{4}[BCDFGHJKLMNPRSTVXYZ]{3}$/;
  const PLATE_HISTORIC = /^[A-Z]{1,2}[0-9]{4}[A-Z]{1,2}$/;

  function normalizePlate(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function formatPlate(value) {
    const raw = normalizePlate(value);
    if (/^[0-9]{4}[A-Z]{0,3}$/.test(raw)) return raw.slice(0, 4) + (raw.length > 4 ? " " + raw.slice(4) : "");
    const historic = raw.match(/^([A-Z]{1,2})([0-9]{4})([A-Z]{0,2})$/);
    if (historic) return (historic[1] + " " + historic[2] + " " + historic[3]).trim();
    return raw;
  }

  function isValidPlate(value) {
    const raw = normalizePlate(value);
    return PLATE_MODERN.test(raw) || PLATE_HISTORIC.test(raw);
  }

  function findPlateOwner(value) {
    const raw = normalizePlate(value);
    if (!raw) return null;
    return state.vehicles.find((v) => normalizePlate(v.plate) === raw) || null;
  }

  function profileTemplate(profile) {
    return DB.vehicles.find((v) => v.engineCode === profile.code) || null;
  }

  function profileComponents(profile) {
    if (profile.components) return profile.components;
    const template = profileTemplate(profile);
    return template ? template.components : [];
  }

  function plateStatusHTML() {
    if (!ui.plateValue) return icon("info") + "<span>Formato actual: 1234 ABC (sin vocales ni Ñ). También se aceptan matrículas históricas.</span>";
    if (!ui.plateValid) return icon("alert") + "<span>Matrícula no válida. Ejemplo: 4821 KTR.</span>";
    if (ui.plateDuplicate) {
      const owner = findPlateOwner(ui.plateValue);
      return icon("lock") + "<span>Ya está en tu garaje: " + esc(owner ? owner.name : "") + ".</span>";
    }
    return icon("check") + "<span>Matrícula válida · lista para el alta.</span>";
  }

  function updatePlateStatus() {
    const el = document.getElementById("plateStatus");
    if (el) el.innerHTML = plateStatusHTML();
  }

  function renderAddVehicle() {
    const profile = DB.engineProfiles.find((p) => p.code === ui.engineChoice) || DB.engineProfiles[0];
    const template = profileTemplate(profile);
    const components = profileComponents(profile);
    const freeAdd = state.pro || state.vehicles.length < 3;
    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Alta por matrícula</div><h1 class="screen-title">Añadir vehículo</h1></div></div>' +

      '<div class="card card--pad"><div class="section-head" style="margin-bottom:9px"><span class="section-title">Matrícula</span><span class="chip">' + (freeAdd ? "Incluido" : "Requiere Pro") + "</span></div>" +
      '<div class="field"><label for="plateInput">Matrícula del coche <small>España</small></label>' +
      '<div class="search-box" style="height:44px"><input id="plateInput" name="plate" type="text" maxlength="10" value="' + esc(formatPlate(ui.plateValue)) + '" placeholder="1234 ABC" autocomplete="off" autocapitalize="characters" spellcheck="false" style="font-family:var(--mono);font-size:15px;letter-spacing:.14em;text-transform:uppercase"></div></div>' +
      '<div class="form-hint" id="plateStatus">' + plateStatusHTML() + "</div>" +
      '<button class="btn btn--sm btn--block" style="margin-top:8px" data-action="fill-plate">' + icon("bolt") + " Usar matrícula de ejemplo</button></div>" +

      '<section class="section"><div class="section-head"><span class="section-title">Motor y plataforma</span><span class="mono-label">Perfil</span></div>' +
      '<div class="engine-list">' + DB.engineProfiles.map((p) =>
        '<button class="veh-option engine-option ' + (ui.engineChoice === p.code ? "is-active" : "") + '" data-action="engine-profile" data-engine="' + p.code + '">' +
        '<span class="engine-radio" aria-hidden="true"></span>' +
        '<span class="veh-option-main"><b>' + esc(p.label) + "</b><span>" + esc(p.spec) + "</span></span>" +
        '<span class="tag">' + esc(p.code) + "</span></button>"
      ).join("") + "</div>" +
      '<div class="form-hint">' + icon("info") + "<span>La matrícula no se consulta en la DGT: no hay una API pública gratuita por matrícula. Elige el perfil del motor para cargar sus intervalos y fallos típicos.</span></div></section>" +

      '<form id="addVehicleForm" class="form-card">' +
      '<div class="field"><label>Alias</label><input name="alias" type="text" placeholder="' + esc(template ? template.name : profile.name) + '"></div>' +
      '<div class="field-row"><div class="field"><label>Año</label><input name="year" type="number" min="1950" max="2027" value="' + profile.year + '" required></div>' +
      '<div class="field"><label>Kilometraje actual</label><input name="km" type="number" min="0" step="1" value="60000" required></div></div>' +
      '<div class="field"><label>VIN <small>Opcional</small></label><input name="vin" type="text" maxlength="17" placeholder="17 caracteres" style="font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase"></div>' +
      '<div class="form-hint">' + icon(state.pro ? "check" : "lock") + "<span>" + (freeAdd ? "Se crearán " + components.length + " componentes con sus intervalos. Podrás registrar servicios desde el primer día." : "El garaje de la demo incluye 3 vehículos. Activa Pro para añadir más.") + "</span></div>" +
      '<button class="btn btn--primary btn--block" type="submit" style="margin-top:11px">' + icon(freeAdd ? "plus" : "lock") + " Añadir al garaje</button></form>" +

      '<div class="disclaimer">' + icon("info") + "<span>Demo: la matrícula se valida y se guarda en tu navegador. El perfil de motor se elige manualmente; no se simula una consulta real a la DGT.</span></div>";
  }

  /* ------------------------------------------------------------------------
     Diagram SVG
     ------------------------------------------------------------------------ */
  function diagramSVG(type) {
    if (type === "suspension") {
      return '<svg class="blueprint-svg" viewBox="0 0 340 190" aria-label="Despiece del brazo de suspensión">' +
        '<path class="bp-faint" d="M20 25H320M20 165H320M30 15V175M310 15V175"/>' +
        '<path class="bp-line" d="M72 72 L232 100 L206 134 L84 118 Z"/>' +
        '<path class="bp-fill" d="M62 62 h28 v28 h-28 z"/><circle class="bp-line" cx="76" cy="76" r="17"/><circle class="bp-line" cx="76" cy="76" r="7"/>' +
        '<path class="bp-fill" d="M218 86 h30 v30 h-30 z"/><circle class="bp-accent" cx="233" cy="101" r="14"/><circle class="bp-line" cx="233" cy="101" r="5"/>' +
        '<path class="bp-line" d="M120 92 l14 34"/><circle class="bp-line" cx="134" cy="128" r="8"/>' +
        '<path class="bp-faint" d="M48 108 L24 140M270 116 L298 146"/>' +
        '<text class="bp-num" x="28" y="150">01</text><text class="bp-label" x="38" y="150">SILENTBLOCK</text>' +
        '<text class="bp-num" x="248" y="158">02</text><text class="bp-label" x="258" y="158">RÓTULA</text>' +
        '<text class="bp-num" x="142" y="146">03</text><text class="bp-label" x="152" y="146">BRAZO</text>' +
        '<text class="bp-num" x="104" y="52">04</text><text class="bp-label" x="114" y="52">TORNILLO</text>' +
        '<text class="bp-label" x="22" y="22">MQB · TREN DELANTERO</text><text class="bp-label" x="236" y="22">REF. 5Q0407151</text></svg>';
    }
    return '<svg class="blueprint-svg" viewBox="0 0 340 190" aria-label="Despiece del freno delantero">' +
      '<path class="bp-faint" d="M20 25H320M20 165H320M30 15V175M310 15V175"/>' +
      '<circle class="bp-line" cx="96" cy="96" r="54"/><circle class="bp-line" cx="96" cy="96" r="22"/><circle class="bp-fill" cx="96" cy="96" r="7"/>' +
      '<circle class="bp-faint" cx="96" cy="62" r="3"/><circle class="bp-faint" cx="127" cy="82" r="3"/><circle class="bp-faint" cx="127" cy="112" r="3"/><circle class="bp-faint" cx="96" cy="130" r="3"/><circle class="bp-faint" cx="65" cy="112" r="3"/><circle class="bp-faint" cx="65" cy="82" r="3"/>' +
      '<path class="bp-line" d="M96 42 A54 54 0 0 1 145 72"/><path class="bp-faint" d="M96 24 v14M96 154 v-14M30 96 h14M162 96 h-14"/>' +
      '<rect class="bp-fill" x="196" y="56" width="66" height="36" rx="9"/><rect class="bp-fill" x="196" y="104" width="66" height="36" rx="9"/>' +
      '<rect class="bp-accent" x="172" y="68" width="18" height="22" rx="3"/><rect class="bp-accent" x="172" y="106" width="18" height="22" rx="3"/>' +
      '<path class="bp-faint" d="M176 64V46M176 132v18M262 74h22M262 122h22"/>' +
      '<text class="bp-label" x="22" y="22">MQB · FRENO DELANTERO</text><text class="bp-label" x="238" y="22">REF. 5Q0698151K</text>' +
      '<text class="bp-num" x="170" y="46">01</text><text class="bp-label" x="180" y="46">PASTILLA EXT.</text>' +
      '<text class="bp-num" x="262" y="60">02</text><text class="bp-label" x="272" y="60">PINZA</text>' +
      '<text class="bp-num" x="22" y="170">03</text><text class="bp-label" x="32" y="170">DISCO 340 mm</text>' +
      '<text class="bp-num" x="200" y="170">04</text><text class="bp-label" x="210" y="170">TORNILLO GUÍA</text></svg>';
  }

  /* ------------------------------------------------------------------------
     Sheets
     ------------------------------------------------------------------------ */
  function openComponentSheet(id) {
    const v = currentVehicle();
    const c = v.components.find((x) => x.id === id);
    if (!c) return;
    const s = compStatus(v, c);
    const statusChip = s.kind === "danger" ? "chip--danger" : s.kind === "warn" ? "chip--warn" : "chip--ok";
    const statusText = s.kind === "danger" ? "Vencido" : s.kind === "warn" ? "Próximo" : "Al día";
    openSheet(sheetHeader("Componente · " + c.group, c.name) +
      '<div class="sheet-scroll"><div class="chip-row" style="margin-bottom:10px"><span class="chip ' + statusChip + '">' + statusText + '</span><span class="chip">' + fmtKm(v.km) + ' km actuales</span><span class="chip">' + esc(c.intervalKm ? fmtKm(c.intervalKm) + " km" : "") + "</span></div>" +
      '<div class="due-bar"><div class="due-bar-top"><span>PRÓXIMO A ' + fmtKm(s.next) + ' KM' + (s.timeDue ? " · " + fmtDate(s.timeDue.toISOString().slice(0, 10)) : "") + "</span><b>" + (s.remaining <= 0 ? "Vencido" : fmtKm(s.remaining) + " km") + "</b></div>" +
      '<div class="progress"><i class="' + (s.kind === "danger" ? "is-danger" : s.kind === "warn" ? "is-warn" : "") + '" style="width:' + Math.max(4, Math.round(s.pct * 100)) + '%"></i></div></div>' +
      '<div class="sheet-kv"><div><span>Último cambio</span><b>' + fmtDate(c.lastDate) + '</b></div><div><span>Kilometraje</span><b>' + (c.lastKm ? fmtKm(c.lastKm) + " km" : "Original") + '</b></div>' +
      '<div><span>Referencia</span><b>' + esc(c.ref) + '</b></div><div><span>Par de apriete</span><b>' + esc(c.torque) + '</b></div></div>' +
      '<div class="sheet-kv" style="margin-top:6px"><div><span>Especificación</span><b>' + esc(c.spec) + '</b></div><div><span>Intervalo</span><b>' + esc(c.intervalMonths ? c.intervalMonths + " meses / " + fmtKm(c.intervalKm) + " km" : fmtKm(c.intervalKm) + " km") + "</b></div></div>" +
      (c.note ? '<div class="sheet-note">' + esc(c.note) + "</div>" : "") +
      '<div class="row" style="margin-top:13px;gap:6px"><button class="btn btn--primary" style="flex:1" data-action="service-component" data-id="' + c.id + '">' + icon("plus") + " Registrar cambio</button>" +
      '<button class="btn btn--ghost" style="flex:1" data-action="search-component" data-id="' + c.id + '">' + icon("search") + " Buscar recambio</button></div>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:6px" data-action="close-sheet">Cerrar</button></div>');
  }

  function openFaultSheet(id) {
    const v = currentVehicle();
    const f = (DB.faults[v.engineCode] || []).find((x) => x.id === id);
    if (!f) return;
    const sev = sevMeta(f.severity);
    openSheet(sheetHeader("Fallo común · " + v.engineCode, f.title) +
      '<div class="sheet-scroll"><div class="chip-row" style="margin-bottom:11px"><span class="tag ' + sev.cls + '">' + sev.label + '</span><span class="chip">' + fmtKm(f.cases) + ' casos</span><span class="chip">' + esc(f.band) + "</span></div>" +
      '<div class="sheet-note" style="margin-top:0"><b style="color:var(--text)">Síntoma típico</b><br>' + esc(f.symptom) + "</div>" +
      '<div class="card card--pad" style="margin-top:9px"><span class="mono-label">Comprobación recomendada</span><p class="tiny" style="margin-top:5px;color:var(--dim);line-height:1.55">' + esc(f.check) + "</p>" +
      '<div class="row" style="margin-top:9px"><span class="chip">Ref. ' + esc(f.part) + "</span><span class=\"chip\">" + esc(v.chassis) + "</span></div></div>" +
      '<div class="row" style="margin-top:12px;gap:6px"><button class="btn btn--primary" style="flex:1" data-action="diag-fault" data-id="' + f.id + '">' + icon("mic") + " Grabar este ruido</button>" +
      '<button class="btn btn--ghost" data-action="search-component" data-id="' + (v.components.find((c) => c.oem === f.part) || v.components[0]).id + '">' + icon("search") + " Pieza</button></div>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:6px" data-action="close-sheet">Cerrar</button></div>');
  }

  function openNotifications() {
    const v = currentVehicle();
    const alerts = alertsFor(v);
    openSheet(sheetHeader("Avisos del garaje", "Atención") +
      '<div class="sheet-scroll">' +
      (alerts.length ? '<div class="alert-stack">' + alerts.map(alertCardHTML).join("") + "</div>" :
        '<div class="empty-state">' + icon("check") + "<b>Todo al día</b><p>No hay vencimientos ni avisos activos.</p></div>") +
      '<div class="form-hint">' + icon("bell") + "<span>Los avisos cruzan kilometraje, fecha y fallos documentados para tu motor.</span></div>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:12px" data-action="close-sheet">Cerrar</button></div>');
  }

  function openProfile() {
    const totalServices = state.vehicles.reduce((a, v) => a + v.services.length, 0);
    openSheet(sheetHeader("Cuenta", "Tu perfil") +
      '<div class="sheet-scroll"><div class="profile-head"><span class="profile-avatar">' + esc(DB.owner.initials) + "</span>" +
      "<div><b>" + esc(DB.owner.name) + "</b><span>" + esc(DB.owner.email) + "</span></div></div>" +
      '<div class="profile-stats"><div class="profile-stat"><b>' + state.vehicles.length + "</b><span>Vehículos</span></div>" +
      '<div class="profile-stat"><b>' + totalServices + "</b><span>Registros</span></div>" +
      '<div class="profile-stat"><b>' + (state.pro ? "PRO" : state.diagCredits) + "</b><span>" + (state.pro ? "Plan" : "Pases") + "</span></div></div>" +
      (state.pro
        ? '<div class="pro-active-banner">' + icon("shield") + "<div><b>PitBox Pro</b><span>Acceso completo activo en esta demo.</span></div></div>"
        : '<button class="btn btn--primary btn--block" style="margin-bottom:10px" data-action="open-pro">' + icon("pro") + " Descubrir PitBox Pro</button>") +
      '<button class="profile-row" data-action="export-book">' + icon("file") + "<span>Libro certificado</span>" + icon("next") + "</button>" +
      '<button class="profile-row" data-action="install-app">' + icon("download") + "<span>Instalar en el móvil</span>" + icon("next") + "</button>" +
      '<div class="profile-row" style="cursor:default">' + icon("bell") + "<span>Recordatorios por km</span>" +
      '<button class="switch ' + (state.reminders ? "is-on" : "") + '" data-action="toggle-reminders" aria-label="Recordatorios"></button></div>' +
      '<button class="profile-row" data-action="toast" data-msg="Ajustes de demo">' + icon("settings") + "<span>Ajustes</span>" + icon("next") + "</button>" +
      '<button class="profile-row" data-action="toast" data-msg="Privacidad: tus datos se guardan en el navegador">' + icon("shield") + "<span>Privacidad y datos</span>" + icon("next") + "</button>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:14px;color:var(--danger);border-color:rgba(255,82,82,.25)" data-action="reset-demo">' + icon("retry") + " Reiniciar demo</button>" +
      '<p class="pro-legal">Prototipo local · sin backend ni pagos reales.</p></div>');
  }

  function openVehicleSwitcher() {
    const active = currentVehicle();
    const rows = state.vehicles.map((veh, i) => {
      const locked = !state.pro && !!veh.demoLocked;
      return '<button class="veh-option ' + (veh.id === active.id ? "is-active" : "") + '" data-action="' + (locked ? "locked-vehicle" : "switch-vehicle") + '" data-id="' + veh.id + '">' +
        '<img src="' + veh.image + '" alt="">' +
        '<span class="veh-option-main"><b>' + esc(veh.name) + "</b><span>" + esc(veh.engineCode) + " · " + fmtKm(veh.km) + " km</span></span>" +
        (locked ? '<span class="tag tag--accent">Pro</span>' : veh.id === active.id ? '<span class="tag tag--ok">Activo</span>' : '<span class="tag">' + esc(veh.plate) + "</span>") +
        "</button>";
    }).join("");
    openSheet(sheetHeader("Garaje", "Cambiar vehículo") +
      '<div class="sheet-scroll">' + rows +
      '<button class="btn btn--ghost btn--block" style="margin-top:10px" data-action="open-add-vehicle">' + icon("plus") + " Añadir vehículo" + (state.pro || state.vehicles.length < 3 ? "" : " · Pro") + "</button>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:6px" data-action="close-sheet">Cerrar</button></div>');
  }

  function openCertSheet() {
    const v = currentVehicle();
    if (!state.pro) {
      closeSheet();
      go("pro");
      toast("El certificado está incluido en Pro", "lock");
      return;
    }
    openSheet(sheetHeader("Certificación", "Libro certificado") +
      '<div class="sheet-scroll">' + certPreviewHTML(v) +
      '<div class="cert-actions"><button class="btn btn--primary btn--block" data-action="print-cert">' + icon("download") + " Imprimir / Guardar PDF</button></div>" +
      '<div class="form-hint">' + icon("shield") + "<span>El documento incluye el historial completo y un hash de verificación. En la versión final se firmaría en servidor.</span></div>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:7px" data-action="close-sheet">Cerrar</button></div>');
  }

  /* ------------------------------------------------------------------------
     Certificate
     ------------------------------------------------------------------------ */
  function pseudoQR(seed) {
    const n = 23;
    let s = seed || 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const inFinder = (x, y) => (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    let cells = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (inFinder(x, y)) continue;
        if (rnd() > 0.52) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
    }
    const finder = (x, y) => '<rect x="' + (x + 0.5) + '" y="' + (y + 0.5) + '" width="6" height="6" fill="none" stroke="currentColor"/>' +
      '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>';
    return '<svg class="cert-qr" viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" role="img" aria-label="Código QR de verificación simulado" style="color:#171b1d;background:#fff">' +
      '<rect width="' + n + '" height="' + n + '" fill="#fff"/>' + cells + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + "</svg>";
  }

  function certPreviewHTML(v) {
    const last = servicesOf(v).slice(0, 3);
    const hash = hashFor(v);
    return '<div class="cert-preview"><div class="cert-head"><div class="cert-brand">' + logoMark() +
      "<div><b>PITBOX</b><span>CERTIFIED GARAGE RECORD</span></div></div>" + pseudoQR(parseInt(hash.slice(0, 4), 16)) + "</div>" +
      '<div class="cert-title">Libro de mantenimiento</div><div class="cert-sub">CERTIFICADO DIGITAL · EMITIDO ' + fmtDate(isoToday()).toUpperCase() + "</div>" +
      '<div class="cert-vehicle"><div><span>Vehículo</span><b>' + esc(v.name) + " · " + v.year + "</b></div><div style=\"text-align:right\"><span>Kilometraje</span><b>" + fmtKm(v.km) + " km</b></div></div>" +
      '<div class="cert-vehicle"><div><span>VIN</span><b>' + esc(maskVin(v.vin)) + '</b></div><div style="text-align:right"><span>Motor</span><b>' + esc(v.engineCode) + "</b></div></div>" +
      '<div class="cert-lines">' + (last.length ? last.map((s) =>
        '<div class="cert-line"><span>' + fmtDate(s.date) + " · " + fmtKm(s.km) + " km</span><span>" + esc(trunc(s.type, 30)) + "</span></div>"
      ).join("") : '<div class="cert-line"><span>Sin registros</span><span>—</span></div>') + "</div>" +
      '<div class="cert-foot"><div class="cert-hash">SHA ' + hash + " · " + v.services.length + " registros<br>pitbox.app/v/" + hash.toLowerCase() + '</div><div class="cert-seal">VERIFICADO</div></div></div>';
  }

  function fullCertHTML(v) {
    const services = [...v.services].sort((a, b) => a.km - b.km);
    const total = services.reduce((a, s) => a + (Number(s.cost) || 0), 0);
    const hash = hashFor(v);
    const rows = services.map((s) =>
      "<tr><td>" + fmtDate(s.date) + "</td><td>" + fmtKm(s.km) + " km</td><td>" + esc(s.type) + "</td><td>" + esc(s.parts) + "</td><td>" + esc(s.shop) + "</td><td class=\"r\">" + money(s.cost) + "</td></tr>"
    ).join("");
    return "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Libro de mantenimiento — " + esc(v.name) + "</title><style>" +
      "*{box-sizing:border-box}body{margin:0;background:#e9e9e4;font-family:Arial,Helvetica,sans-serif;color:#191d1f;padding:24px}" +
      ".pad{max-width:820px;margin:0 auto;background:#f7f7f3;padding:42px 46px;box-shadow:0 10px 40px rgba(0,0,0,.12)}" +
      ".top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #191d1f;padding-bottom:18px}" +
      ".brand{display:flex;gap:10px;align-items:center}.mark{width:38px;height:38px;border-radius:10px;background:#ff5a1f;color:#111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}" +
      ".brand h1{font-size:24px;letter-spacing:.16em;margin:0;line-height:1}.brand small{font-size:8px;letter-spacing:.18em;color:#687174;display:block;margin-top:4px}" +
      ".qr{width:74px;height:74px}.qr svg{width:100%;height:100%}" +
      "h2{font-size:32px;letter-spacing:.01em;margin:26px 0 4px;text-transform:uppercase}.sub{font-size:9px;letter-spacing:.16em;color:#687174;text-transform:uppercase}" +
      ".meta{display:flex;justify-content:space-between;gap:20px;margin-top:22px;padding:14px 0;border-top:1px solid #c9ccc7;border-bottom:1px solid #c9ccc7}" +
      ".meta div span{display:block;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#687174}.meta div b{display:block;font-size:11px;margin-top:4px}" +
      "table{width:100%;border-collapse:collapse;margin-top:20px;font-size:9.5px}th{font-size:8px;text-align:left;letter-spacing:.1em;text-transform:uppercase;color:#687174;border-bottom:1px solid #191d1f;padding:8px 6px}" +
      "td{border-bottom:1px solid #d4d6d1;padding:8px 6px;vertical-align:top}.r{text-align:right;white-space:nowrap}" +
      ".total{margin-top:12px;text-align:right;font-size:10px}.total b{font-size:14px}" +
      ".verify{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:30px;padding-top:16px;border-top:2px solid #191d1f}" +
      ".verify small{font-size:8px;line-height:1.8;color:#687174;word-break:break-all}.seal{width:86px;height:86px;border:2px solid #a33a17;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#a33a17;font-size:9px;letter-spacing:.12em;text-align:center;transform:rotate(-10deg);flex:0 0 86px}" +
      ".foot{margin-top:22px;font-size:8px;line-height:1.6;color:#687174}@media print{body{background:#fff;padding:0}.pad{box-shadow:none;max-width:none;padding:0}@page{margin:18mm}}</style></head><body><main class=\"pad\">" +
      '<div class="top"><div class="brand"><div class="mark">P</div><div><h1>PITBOX</h1><small>CERTIFIED GARAGE RECORD</small></div></div><div class="qr">' + pseudoQR(parseInt(hash.slice(0, 4), 16)) + "</div></div>" +
      "<h2>Libro de mantenimiento</h2><div class=\"sub\">Certificado digital · emitido el " + fmtDate(isoToday()) + "</div>" +
      '<div class="meta"><div><span>Vehículo</span><b>' + esc(v.name) + " · " + v.year + "</b></div><div><span>Matrícula</span><b>" + esc(v.plate) + "</b></div>" +
      "<div><span>VIN</span><b>" + esc(v.vin) + "</b></div><div><span>Kilometraje</span><b>" + fmtKm(v.km) + " km</b></div></div>" +
      "<table><thead><tr><th>Fecha</th><th>Km</th><th>Servicio</th><th>Piezas / referencia</th><th>Taller</th><th class=\"r\">Importe</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      '<div class="total">Coste registrado · <b>' + money(total) + "</b></div>" +
      '<div class="verify"><small>HASH DE VERIFICACIÓN<br>SHA ' + hash + "<br>pitbox.app/v/" + hash.toLowerCase() + "<br><br>Documento generado desde el libro digital PITBOX. Los registros son aportados por el titular.</small><div class=\"seal\">VERIFICADO<br>PITBOX</div></div>" +
      '<div class="foot">Este documento es una demostración de producto. Los datos, talleres e importes son simulados y no constituyen un certificado oficial.</div></main>' +
      "<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},450)})<\/script></body></html>";
  }

  function printCertificate() {
    const v = currentVehicle();
    let w = null;
    try { w = window.open("", "_blank"); } catch (err) { w = null; }
    if (!w) {
      toast("Permite ventanas emergentes para exportar", "alert");
      return;
    }
    w.document.open();
    w.document.write(fullCertHTML(v));
    w.document.close();
    w.focus();
    toast("Abriendo el certificado para imprimir", "download");
  }

  /* ------------------------------------------------------------------------
     Diagnostic actions
     ------------------------------------------------------------------------ */
  const REC_SECONDS = 8;

  function fmtHz(hz) {
    if (!hz) return "—";
    return hz >= 1000 ? (hz / 1000).toFixed(1).replace(".", ",") + " kHz" : Math.round(hz) + " Hz";
  }

  function fmtDb(db) {
    if (!Number.isFinite(db) || db <= -99) return "silencio";
    return db.toFixed(1).replace(".", ",") + " dBFS";
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function classifyFrequency(hz) {
    if (!hz) return null;
    if (hz < 900) return "chain";
    if (hz < 2800) return "alt";
    return "vac";
  }

  function diagnosticResults() {
    const base = DB.diagnostics[ui.params.fault] || DB.diagnostics.default;
    const summary = ui.audioSummary;
    if (!summary || !summary.real || ui.params.fault) return base;
    const guess = classifyFrequency(summary.freq);
    const top = base.find((r) => r.id === guess);
    if (!top) return base;
    const rest = base.filter((r) => r !== top);
    return [Object.assign({}, top, { pct: 64, measured: true })].concat(
      rest.map((r, i) => Object.assign({}, r, { pct: i === 0 ? 22 : 14 }))
    );
  }

  function armRecTimer() {
    if (ui.recTimer) clearTimeout(ui.recTimer);
    ui.recTimer = setTimeout(() => {
      if (ui.diagStage === "recording") stopRecording();
    }, (REC_SECONDS + 0.3) * 1000);
  }

  function startRecording() {
    if (ui.diagStage === "recording" || ui.micMode === "starting") return;
    ui.diagUnlocked = false;
    ui.audioSummary = null;
    ui.audioSamples = [];
    ui.micHzSamples = [];
    ui.micPeakDb = -100;
    ui.micHz = 0;
    ui.micMode = "starting";
    if (ui.audioURL) {
      try { URL.revokeObjectURL(ui.audioURL); } catch (err) { /* noop */ }
      ui.audioURL = null;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      startSimulatedRecording("Sin acceso al micrófono · análisis simulado");
      return;
    }
    toast("Solicitando permiso de micrófono…", "mic");
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: !!ui.ambientFilter,
        noiseSuppression: !!ui.ambientFilter,
        autoGainControl: false,
        channelCount: 1
      }
    }).then((stream) => {
      if (ui.screen !== "diag" || ui.diagMode !== "acoustic" || ui.diagStage !== "idle") {
        stream.getTracks().forEach((track) => track.stop());
        ui.micMode = "idle";
        return;
      }
      ui.micStream = stream;
      ui.micMode = "real";
      ui.recKeep = false;
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        ui.audioCtx = new Ctor();
        const source = ui.audioCtx.createMediaStreamSource(stream);
        const analyser = ui.audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        ui.analyser = analyser;
      } catch (err) {
        ui.analyser = null;
      }
      try {
        if (window.MediaRecorder) {
          const rec = new MediaRecorder(stream);
          rec.ondataavailable = (event) => {
            if (event.data && event.data.size) ui.recChunks.push(event.data);
          };
          rec.onstop = () => {
            if (!ui.recKeep || !ui.recChunks.length) return;
            try {
              ui.audioURL = URL.createObjectURL(new Blob(ui.recChunks, { type: rec.mimeType || "audio/webm" }));
            } catch (err) { /* noop */ }
          };
          rec.start();
          ui.recorder = rec;
        }
      } catch (err) { /* la grabación es opcional, el análisis continúa */ }
      ui.recStart = performance.now();
      ui.diagStage = "recording";
      render();
      armRecTimer();
      toast("Micrófono activo · captura real de 8 s", "mic");
    }).catch((err) => {
      const reason = err && err.name === "NotAllowedError" ? "Permiso de micrófono denegado" : "No se pudo abrir el micrófono";
      startSimulatedRecording(reason + " · análisis simulado");
    });
  }

  function startSimulatedRecording(message) {
    stopMicCapture(false);
    ui.micMode = "sim";
    ui.recStart = performance.now();
    ui.diagStage = "recording";
    render();
    armRecTimer();
    toast(message, "alert");
  }

  function startWave() {
    const canvas = document.getElementById("waveCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    if (!box.width) return;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    const w = canvas.width;
    const h = canvas.height;
    const t0 = ui.recStart || performance.now();
    const real = ui.micMode === "real" && ui.analyser;
    const analyser = real ? ui.analyser : null;
    const timeData = real ? new Uint8Array(analyser.fftSize) : null;
    const freqData = real ? new Uint8Array(analyser.frequencyBinCount) : null;
    const sampleRate = ui.audioCtx ? ui.audioCtx.sampleRate || 48000 : 48000;
    const binHz = real ? sampleRate / analyser.fftSize : 0;
    let lastStats = 0;
    let lastFreq = 0;

    const paint = (points) => {
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, h * 0.15, 0, h);
      grad.addColorStop(0, "rgba(255,90,31,.24)");
      grad.addColorStop(1, "rgba(255,90,31,0)");
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(w, h / 2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = "#ff5a1f";
      ctx.lineWidth = 1.5 * dpr;
      ctx.shadowColor = "rgba(255,90,31,.6)";
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      points.forEach((p, i) => {
        const y2 = h / 2 + (p.y - h / 2) * 0.35;
        i ? ctx.lineTo(p.x, y2) : ctx.moveTo(p.x, y2);
      });
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    };

    const tickTimer = (t) => {
      const timer = document.getElementById("recTimer");
      if (!timer) return;
      const sec = Math.min(REC_SECONDS, Math.floor(t));
      const tenths = Math.min(9, Math.floor((t % 1) * 10));
      timer.textContent = "00:" + pad2(sec) + "." + tenths;
    };

    const frame = (now) => {
      if (!document.body.contains(canvas)) return;
      const t = Math.min(REC_SECONDS, (now - t0) / 1000);
      let points;
      if (real) {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const x = (timeData[i] - 128) / 128;
          sum += x * x;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
        if (db > ui.micPeakDb) ui.micPeakDb = db;
        const bars = 70;
        points = [];
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / (bars - 1)) * (timeData.length - 1));
          points.push({ x: (i / (bars - 1)) * w, y: h / 2 + ((timeData[idx] - 128) / 128) * h * 0.46 });
        }
        if (now - lastFreq > 300) {
          lastFreq = now;
          analyser.getByteFrequencyData(freqData);
          const lo = Math.max(2, Math.ceil((ui.bandFilter ? 200 : 20) / binHz));
          const hi = Math.min(freqData.length - 1, Math.floor((ui.bandFilter ? 8000 : sampleRate / 2) / binHz));
          let best = 0;
          let idx = lo;
          for (let i = lo; i <= hi; i++) {
            if (freqData[i] > best) { best = freqData[i]; idx = i; }
          }
          if (best > 24) {
            ui.micHz = idx * binHz;
            ui.micHzSamples.push(ui.micHz);
          }
          const freqEl = document.querySelector("[data-rec-freq]");
          if (freqEl) freqEl.textContent = ui.micHz ? fmtHz(ui.micHz) : "—";
          const waveEl = document.getElementById("waveFreq");
          if (waveEl) waveEl.textContent = ui.micHz ? fmtHz(ui.micHz) : "—";
        }
        if (now - lastStats > 240) {
          lastStats = now;
          const peakEl = document.querySelector("[data-rec-peak]");
          if (peakEl) peakEl.textContent = fmtDb(ui.micPeakDb);
        }
      } else {
        const bars = 70;
        points = [];
        for (let i = 0; i < bars; i++) {
          const x = i / (bars - 1);
          const env = Math.sin(Math.PI * x) * 0.9 + 0.08;
          const amp = (Math.sin(x * 24 + t * 7.2) * 0.42 +
            Math.sin(x * 53 - t * 4.4) * 0.22 +
            Math.sin(x * 9 + t * 2.1) * 0.18 +
            (Math.random() - 0.5) * 0.2) * env;
          points.push({ x: x * w, y: h / 2 + amp * h * 0.35 });
        }
        if (now - lastFreq > 420) {
          lastFreq = now;
          const freq = 1.8 + Math.sin(t * 1.3) * 0.35 + Math.random() * 0.12;
          const freqEl = document.querySelector("[data-rec-freq]");
          if (freqEl) freqEl.textContent = freq.toFixed(1).replace(".", ",") + " kHz";
          const waveEl = document.getElementById("waveFreq");
          if (waveEl) waveEl.textContent = freq.toFixed(1).replace(".", ",") + " kHz";
        }
      }
      paint(points);
      tickTimer(t);
      if (t >= REC_SECONDS) {
        stopRecording();
        return;
      }
      ui.raf = requestAnimationFrame(frame);
    };
    ui.raf = requestAnimationFrame(frame);
  }

  function stopRecording() {
    if (ui.raf) cancelAnimationFrame(ui.raf);
    ui.raf = null;
    if (ui.recTimer) { clearTimeout(ui.recTimer); ui.recTimer = null; }
    ui.diagStage = "analyzing";
    if (ui.micMode === "real") {
      const summary = {
        real: true,
        peakDb: ui.micPeakDb,
        freq: median(ui.micHzSamples.filter(Boolean)),
        duration: Math.min(REC_SECONDS, Math.max(0.4, (performance.now() - ui.recStart) / 1000)),
        sampleRate: ui.audioCtx ? ui.audioCtx.sampleRate : 0,
        ambient: !!ui.ambientFilter,
        band: !!ui.bandFilter
      };
      ui.audioSummary = summary;
      ui.diagUnlocked = false;
      stopMicCapture(true);
    } else {
      ui.audioSummary = null;
      stopMicCapture(false);
    }
    ui.micMode = "idle";
    ui.micHzSamples = [];
    render();
    ui.timers.push(setTimeout(() => {
      if (ui.screen === "diag" && ui.diagMode === "acoustic" && ui.diagStage === "analyzing") {
        ui.diagStage = "result";
        render();
      }
    }, 2200));
  }

  function playDiagAudio() {
    animateAudio();
    if (ui.audioURL) {
      try {
        if (ui.audioEl) ui.audioEl.pause();
        ui.audioEl = new Audio(ui.audioURL);
        const playing = ui.audioEl.play();
        if (playing && playing.catch) playing.catch(() => toast("No se pudo reproducir la grabación", "alert"));
      } catch (err) {
        toast("No se pudo reproducir la grabación", "alert");
      }
    } else if (ui.audioSummary && ui.audioSummary.real) {
      toast("Grabación liberada al salir · reproducción simulada", "info");
    }
  }

  function unlockDiag() {
    if (state.pro) {
      ui.diagUnlocked = true;
      render();
      return;
    }
    if (state.diagCredits > 0) {
      state.diagCredits -= 1;
      save();
      ui.diagUnlocked = true;
      render();
      toast("Informe desbloqueado con tu pase", "check");
    } else {
      go("pro");
      toast("Necesitas un pase o Pro para el informe completo", "lock");
    }
  }

  function startCamera() {
    if (ui.cameraLive || ui.cameraStarting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.cameraError = "Este navegador no permite abrir la cámara";
      render();
      toast(ui.cameraError + " · puedes usar la referencia demo", "alert");
      return;
    }
    ui.cameraStarting = true;
    ui.cameraError = "";
    render();
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then((stream) => {
      ui.cameraStarting = false;
      if (ui.screen !== "diag" || ui.diagMode !== "visual") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      ui.cameraStream = stream;
      ui.cameraLive = true;
      ui.capturedFrame = "";
      ui.visualMetrics = null;
      ui.visualStage = "idle";
      render();
      toast("Cámara activa · enfoca la pieza", "camera");
    }).catch((err) => {
      ui.cameraStarting = false;
      ui.cameraError = err && err.name === "NotAllowedError" ? "Permiso de cámara denegado" : "No se pudo abrir la cámara";
      render();
      toast(ui.cameraError + " · captura demo disponible", "alert");
    });
  }

  function attachCameraFeed() {
    const video = document.getElementById("cameraFeed");
    if (!video || !ui.cameraStream) return;
    if (video.srcObject !== ui.cameraStream) video.srcObject = ui.cameraStream;
    const playing = video.play();
    if (playing && playing.catch) playing.catch(() => { /* autoplay puede requerir gesto */ });
  }

  function imageMetrics(source) {
    const small = document.createElement("canvas");
    const w = 160;
    const h = Math.max(1, Math.round((w * source.height) / source.width));
    small.width = w;
    small.height = h;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    let data;
    try { data = ctx.getImageData(0, 0, w, h).data; } catch (err) { return null; }
    const lum = new Float32Array(w * h);
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < w * h; i++) {
      const y = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
      lum[i] = y;
      sum += y;
      sumSq += y * y;
    }
    const mean = sum / (w * h);
    const sd = Math.sqrt(Math.max(0, sumSq / (w * h) - mean * mean));
    let lap = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        lap += Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]);
        n++;
      }
    }
    const sharpness = n ? lap / n : 0;
    const score = clamp(Math.round(Math.min(1, mean / 120) * 30 + Math.min(1, sd / 55) * 30 + Math.min(1, sharpness / 18) * 40), 0, 100);
    return {
      width: source.width,
      height: source.height,
      mp: (source.width * source.height) / 1e6,
      luminance: mean,
      contrast: sd,
      sharpness,
      score
    };
  }

  function captureVisual() {
    if (ui.visualStage === "scanning") return;
    if (ui.cameraLive) {
      const video = document.getElementById("cameraFeed");
      if (!video || !video.videoWidth) {
        toast("La cámara aún se está iniciando", "alert");
        return;
      }
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try { ui.capturedFrame = canvas.toDataURL("image/jpeg", 0.86); } catch (err) { ui.capturedFrame = ""; }
      ui.visualMetrics = imageMetrics(canvas);
      stopCamera();
    }
    ui.visualStage = "scanning";
    render();
    ui.timers.push(setTimeout(() => {
      if (ui.screen === "diag" && ui.diagMode === "visual" && ui.visualStage === "scanning") {
        ui.visualStage = "result";
        render();
      }
    }, ui.capturedFrame ? 1500 : 1750));
  }


  function animateAudio() {
    const bars = Array.from(document.querySelectorAll(".audio-wave i"));
    bars.forEach((b) => b.classList.remove("is-on"));
    let i = 0;
    const timer = setInterval(() => {
      if (i >= bars.length) { clearInterval(timer); return; }
      bars[i].classList.add("is-on");
      i++;
    }, 60);
  }

  /* ------------------------------------------------------------------------
     Actions
     ------------------------------------------------------------------------ */
  function saveService(form) {
    const v = currentVehicle();
    const fd = new FormData(form);
    const c = v.components.find((x) => x.id === fd.get("component"));
    const km = Math.max(0, parseInt(fd.get("km"), 10) || v.km);
    const date = String(fd.get("date") || isoToday());
    const cost = Math.max(0, parseFloat(fd.get("cost")) || 0);
    const work = String(fd.get("work") || "").trim() || (c ? c.name : "Servicio");
    const ref = String(fd.get("ref") || "").trim() || (c ? c.ref : "—");
    const shop = String(fd.get("shop") || "").trim() || "Registro manual";
    const note = String(fd.get("notes") || "").trim();
    const service = {
      id: "s" + uid(),
      date,
      km,
      type: work,
      group: c ? c.group : "Otros",
      parts: ref,
      cost,
      shop,
      note
    };
    v.services.unshift(service);
    if (c) {
      c.lastKm = km;
      c.lastDate = date;
    }
    if (km > v.km) v.km = km;
    save();
    ui.vehicleTab = "historial";
    go("maintenance", {}, { replace: true });
    toast(work + " registrado · libro actualizado", "check");
  }

  function addVehicleFromForm(form) {
    const fd = new FormData(form);
    const plateInput = document.getElementById("plateInput");
    const plate = formatPlate((plateInput && plateInput.value) || fd.get("plate") || ui.plateValue);
    ui.plateValue = plate;
    ui.plateValid = isValidPlate(plate);
    const owner = findPlateOwner(plate);
    ui.plateDuplicate = !!owner;
    if (!ui.plateValid) {
      render();
      toast("Matrícula no válida · formato 1234 ABC", "alert");
      return;
    }
    if (owner) {
      render();
      toast("Esa matrícula ya está en tu garaje: " + owner.name, "alert");
      return;
    }
    if (!state.pro && state.vehicles.length >= 3) {
      toast("Con 3 vehículos necesitas PitBox Pro", "lock");
      go("pro");
      return;
    }
    const profile = DB.engineProfiles.find((p) => p.code === ui.engineChoice) || DB.engineProfiles[0];
    const template = profileTemplate(profile);
    const alias = String(fd.get("alias") || "").trim() || (template ? template.name : profile.name);
    const year = clamp(parseInt(fd.get("year"), 10) || profile.year, 1950, 2027);
    const km = Math.max(0, parseInt(fd.get("km"), 10) || 0);
    const vin = String(fd.get("vin") || "").trim().toUpperCase();
    if (vin && vin.length !== 17) {
      toast("El VIN debe tener 17 caracteres o quedarse vacío", "alert");
      return;
    }
    const today = isoToday();
    const components = profileComponents(profile).map((c) => {
      const base = {
        id: c.id,
        name: c.name,
        icon: c.icon,
        group: c.group,
        intervalKm: c.intervalKm,
        ref: c.ref,
        torque: c.torque,
        spec: c.spec,
        note: c.note
      };
      if (c.intervalMonths) base.intervalMonths = c.intervalMonths;
      if (c.id === "oil" || c.id === "brakefluid") {
        base.lastKm = c.id === "oil" ? Math.max(0, km - 2500) : km;
        base.lastDate = today;
      } else {
        base.lastKm = 0;
        base.lastDate = "—";
      }
      return base;
    });
    const id = "v" + uid();
    const nv = {
      id,
      name: alias,
      trim: template ? template.trim : profile.trim,
      year,
      plate,
      vin: vin || "—",
      engineCode: profile.code,
      engine: template ? template.engine : profile.engine,
      chassis: template ? template.chassis : profile.chassis,
      power: template ? template.power : profile.power,
      torque: template ? template.torque : profile.torque,
      gearbox: template ? template.gearbox : profile.gearbox,
      fuel: template ? template.fuel : profile.fuel,
      oilSpec: template ? template.oilSpec : profile.oilSpec,
      km,
      image: "assets/car-hero.png",
      accent: profile.accent || "#8e9aa0",
      components,
      services: []
    };
    state.vehicles.push(nv);
    state.currentVehicleId = id;
    save();
    ui.plateValue = "";
    ui.plateValid = false;
    ui.plateDuplicate = false;
    switchTab("garage");
    toast(alias + " añadido · " + plate, "check");
  }

  function promptInstall() {
    if (deferredInstall) {
      deferredInstall.prompt();
      const choice = deferredInstall.userChoice;
      if (choice && choice.finally) choice.finally(() => { deferredInstall = null; });
      return;
    }
    if (isStandalone()) {
      toast("PITBOX ya está abierta como app instalada", "check");
      return;
    }
    if (isIOS) {
      toast("iPhone: Compartir → Añadir a pantalla de inicio", "info");
      return;
    }
    if (location.protocol === "file:") {
      toast("Para instalar, abre la app desde una URL HTTPS", "info");
      return;
    }
    toast("Abre el menú del navegador → Instalar aplicación", "info");
  }

  function resetDemo() {
    if (window.confirm("¿Reiniciar todos los datos de la demo?")) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* noop */ }
      window.location.reload();
    }
  }

  function copyRef(ref) {
    const text = ref || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    toast("Referencia copiada · " + text, "copy");
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action],[data-screen],[data-flow]");
    if (!target) return;
    if (target.dataset.screen) {
      event.preventDefault();
      if (target.dataset.screen === "vehicle") go("vehicle");
      else if (target.dataset.screen === "part") go("parts");
      else go(target.dataset.screen);
      return;
    }
    if (target.dataset.flow) {
      event.preventDefault();
      const flow = target.dataset.flow;
      if (flow === "service") go("service", { componentId: "oil" });
      else if (flow === "search") { ui.partsQuery = "06K905601B"; switchTab("parts"); }
      else if (flow === "diagnose") { ui.diagMode = "acoustic"; ui.diagStage = "idle"; ui.params = {}; switchTab("diag"); }
      else if (flow === "upgrade") go("pro");
      else if (flow === "certificate") openCertSheet();
      return;
    }
    const el = target;
    const action = el.dataset.action;
    const v = currentVehicle();
    if (!action) return;

    switch (action) {
      case "tab": switchTab(el.dataset.tab); break;
      case "back": back(); break;
      case "open-vehicle": ui.vehicleTab = "resumen"; go("vehicle"); break;
      case "vehicle-tab": ui.vehicleTab = el.dataset.tab; render(); break;
      case "open-component": openComponentSheet(el.dataset.id); break;
      case "service-component": closeSheet(); go("service", { componentId: el.dataset.id }); break;
      case "search-component": {
        const c = v.components.find((x) => x.id === el.dataset.id);
        closeSheet();
        const part = c ? DB.parts.find((p) => p.componentId === c.id || p.oem === c.ref) : null;
        if (part) go("part", { id: part.id });
        else {
          ui.partsQuery = "";
          switchTab("parts");
          toast("Sin recambio vinculado · busca por referencia OEM", "search");
        }
        break;
      }
      case "open-service": go("service", { componentId: el.dataset.component || "oil" }); break;
      case "open-part": go("part", { id: el.dataset.id }); break;
      case "part-suggest":
        ui.partsQuery = el.dataset.q;
        if (ui.screen === "parts") render();
        else switchTab("parts");
        break;
      case "clear-search": {
        ui.partsQuery = "";
        const input = document.getElementById("partsSearch");
        if (input) { input.value = ""; input.focus(); }
        updatePartsResults("");
        break;
      }
      case "affiliate":
        toast("Prototipo: abriría el enlace de afiliado de " + (el.dataset.shop || "la tienda"), "external");
        break;
      case "copy-ref": copyRef(el.dataset.ref); break;
      case "notifications": openNotifications(); break;
      case "profile": openProfile(); break;
      case "vehicle-switcher": openVehicleSwitcher(); break;
      case "switch-vehicle":
        state.currentVehicleId = el.dataset.id;
        save();
        closeSheet();
        ui.vehicleTab = "resumen";
        render();
        toast("Vehículo activo · " + currentVehicle().name, "car");
        break;
      case "locked-vehicle":
        closeSheet();
        go("pro");
        toast("Gestiona varios vehículos con Pro", "lock");
        break;
      case "open-add-vehicle":
        ui.plateValue = "";
        ui.plateValid = false;
        ui.plateDuplicate = false;
        go("addVehicle");
        break;
      case "open-pro": go("pro"); break;
      case "select-plan": ui.selectedPlan = el.dataset.plan; render(); break;
      case "activate-pro":
        state.pro = true;
        save();
        render();
        toast("Pro activado · compra simulada, sin cargo", "pro");
        break;
      case "buy-pass":
        state.diagCredits += 1;
        save();
        render();
        toast("Pase diagnóstico añadido · demo", "check");
        break;
      case "export-book": openCertSheet(); break;
      case "print-cert": printCertificate(); break;
      case "diag-mode": ui.diagMode = el.dataset.mode; if (ui.diagMode !== "visual") stopCamera(); render(); break;
      case "diag-start": startRecording(); break;
      case "diag-stop": stopRecording(); break;
      case "diag-reset":
        ui.diagStage = "idle";
        ui.diagUnlocked = false;
        ui.params = {};
        ui.audioSummary = null;
        ui.capturedFrame = "";
        ui.visualMetrics = null;
        ui.visualStage = "idle";
        stopMedia();
        render();
        break;
      case "diag-unlock": unlockDiag(); break;
      case "diag-play": playDiagAudio(); break;
      case "diag-save": toast("Informe guardado en el historial del vehículo", "check"); break;
      case "visual-part":
        ui.visualPart = el.dataset.part;
        ui.visualStage = "idle";
        ui.capturedFrame = "";
        ui.visualMetrics = null;
        render();
        break;
      case "camera-start": startCamera(); break;
      case "visual-capture": captureVisual(); break;
      case "visual-reset":
        ui.visualStage = "idle";
        ui.capturedFrame = "";
        ui.visualMetrics = null;
        render();
        break;
      case "visual-save": toast("Inspección visual añadida al historial", "check"); break;
      case "toggle-filter": {
        const key = el.dataset.key;
        if (key === "ambient") ui.ambientFilter = !ui.ambientFilter;
        else ui.bandFilter = !ui.bandFilter;
        el.classList.toggle("is-on", key === "ambient" ? ui.ambientFilter : ui.bandFilter);
        break;
      }
      case "toggle-reminders": state.reminders = !state.reminders; save(); el.classList.toggle("is-on", state.reminders); break;
      case "close-sheet": closeSheet(); break;
      case "alert-open": {
        const component = el.dataset.component;
        const fault = el.dataset.fault;
        if (component) openComponentSheet(component);
        else if (fault) { closeSheet(); go("diag", { fault }); }
        else closeSheet();
        break;
      }
      case "open-fault": openFaultSheet(el.dataset.id); break;
      case "diag-fault": closeSheet(); go("diag", { fault: el.dataset.id }); break;
      case "reset-demo": resetDemo(); break;
      case "install-app": promptInstall(); break;
      case "upload": toast("Prototipo: foto adjunta simulada", "camera"); break;
      case "scan-part": toast("Prototipo: escaneo de código de barras", "scan"); break;
      case "scan-plate": toast("Prototipo: OCR de matrícula con la cámara", "scan"); break;
      case "fill-plate":
        ui.plateValue = "4821 KTR";
        ui.plateValid = true;
        ui.plateDuplicate = !!findPlateOwner(ui.plateValue);
        render();
        break;
      case "engine-profile":
        ui.engineChoice = el.dataset.engine;
        render();
        break;
      case "service-part":
        go("service", { componentId: el.dataset.component, ref: el.dataset.ref, work: el.dataset.work });
        break;
      case "edit-vehicle": toast("Edición de ficha en la versión completa", "edit"); break;
      case "toast": toast(el.dataset.msg || "Acción de demo", "info"); break;
      default: break;
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "serviceForm") {
      event.preventDefault();
      saveService(event.target);
    } else if (event.target.id === "addVehicleForm") {
      event.preventDefault();
      addVehicleFromForm(event.target);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "plateInput") {
      ui.plateValue = event.target.value;
      ui.plateValid = isValidPlate(ui.plateValue);
      ui.plateDuplicate = !!findPlateOwner(ui.plateValue);
      updatePlateStatus();
      return;
    }
    if (event.target.matches("[data-search]")) {
      ui.partsQuery = event.target.value;
      updatePartsResults(ui.partsQuery);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-service-component]")) {
      const v = currentVehicle();
      const c = v.components.find((x) => x.id === event.target.value);
      const hint = document.getElementById("nextDueHint");
      if (hint) hint.innerHTML = nextDueHintHTML(c, v);
      const ref = document.getElementById("serviceRef");
      const work = document.getElementById("serviceWork");
      if (c && ref) ref.value = c.ref;
      if (c && work && !work.value.trim()) work.value = c.name;
    }
    if (event.target.id === "plateInput") {
      const formatted = formatPlate(event.target.value);
      ui.plateValue = formatted;
      ui.plateValid = isValidPlate(formatted);
      ui.plateDuplicate = !!findPlateOwner(formatted);
      if (formatted && formatted !== event.target.value) event.target.value = formatted;
      updatePlateStatus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
    if (event.key === "Enter" && event.target.matches("[data-search]")) {
      event.preventDefault();
      event.target.blur();
    }
  });

  function updatePartsResults(query) {
    const box = document.getElementById("partResults");
    const count = document.getElementById("partCount");
    const clear = document.querySelector("[data-action='clear-search']");
    if (!box) return;
    const list = filterParts(query);
    box.innerHTML = partResultsHTML(query);
    if (count) count.textContent = list.length + (list.length === 1 ? " resultado" : " resultados");
    if (clear) clear.style.display = query ? "grid" : "none";
  }

  /* ------------------------------------------------------------------------
     Views registry + boot
     ------------------------------------------------------------------------ */
  const VIEWS = {
    garage: renderGarage,
    vehicle: renderVehicle,
    maintenance: renderMaintenance,
    parts: renderParts,
    part: renderPart,
    diag: renderDiag,
    pro: renderPro,
    service: renderService,
    addVehicle: renderAddVehicle
  };

  const boot = new URLSearchParams(location.search);
  const bootScreen = boot.get("s");
  if (bootScreen && VIEWS[bootScreen]) {
    ui.screen = bootScreen;
    if (boot.get("tab")) ui.vehicleTab = boot.get("tab");
    if (boot.get("mode")) ui.diagMode = boot.get("mode");
    if (boot.get("stage") === "result") { ui.diagStage = "result"; ui.diagUnlocked = true; }
    if (boot.get("q")) ui.partsQuery = boot.get("q");
    if (bootScreen === "part") ui.params = { id: boot.get("id") || "spark" };
    if (bootScreen === "service") ui.params = { componentId: boot.get("component") || "oil" };
  }
  if (boot.get("cert") === "1") state.pro = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
  });
  window.addEventListener("appinstalled", () => { deferredInstall = null; });

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* SW opcional: la app funciona sin él */ });
  }

  render();
  if (boot.get("cert") === "1") openCertSheet();
})();
