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
    visualPart: "tyre",
    visualStage: "idle",
    selectedPlan: "annual",
    ambientFilter: true,
    bandFilter: true,
    plateValue: "",
    plateValid: false,
    plateDuplicate: false,
    engineChoice: "DNFB",
    addMode: "catalog",
    catalogBrand: "",
    catalogModel: "",
    catalogBrandCustom: "",
    catalogModelCustom: "",
    catalogFuel: "gasolina",
    catalogVersion: "",
    catalogYear: "",
    catalogStep: 0,
    catalogSearch: { brand: "", model: "", engine: "" },
    catalogGen: -1,
    catalogEng: -1,
    catalogManual: false,
    catalogCc: "",
    catalogPower: "",
    catalogCode: "",
    catalogGearbox: "",
    catalogScroll: false,
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
    pcmChunks: [],
    pcmTotal: 0,
    processor: null,
    audioWav: "",
    audioUploadName: "",
    aiSymptom: "",
    aiResult: null,
    aiError: "",
    aiBusy: false,
    aiRound: 0,
    aiAnswers: {},
    aiImage: null,
    aiImageStatus: "idle",
    aiFollowupBusy: false,
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
     Fotos de referencia del modelo (Wikimedia Commons)
     ------------------------------------------------------------------------ */
  const PLACEHOLDER_IMAGE = "assets/car-placeholder.svg";

  function vehicleImageSrc(v) {
    return (v && v.photo && v.photo.src) || (v && v.image) || PLACEHOLDER_IMAGE;
  }

  function vehiclePhotoCreditsHTML(v, variant) {
    const photo = v && v.photo;
    const cls = "photo-credit" + (variant ? " photo-credit--" + variant : "");
    const ready = photo && photo.page && photo.credit;
    return '<a class="' + cls + '" data-photo-credit="' + esc(v.id) + '"' +
      (ready ? ' href="' + esc(photo.page) + '" target="_blank" rel="noopener noreferrer" title="Imagen de referencia del modelo · Wikimedia Commons"' : " hidden") +
      ">" + (ready ? "Imagen de referencia · " + esc(photo.credit) + " · " + esc(photo.license) : "") + "</a>";
  }

  function vehiclePhotoAttrs(v) {
    return ' data-vehicle-photo="' + esc(v.id) + '"';
  }

  function paintVehiclePhoto(v) {
    if (!v) return;
    const src = vehicleImageSrc(v);
    const images = document.querySelectorAll('[data-vehicle-photo="' + v.id + '"]');
    for (let i = 0; i < images.length; i++) {
      if (images[i].getAttribute("src") !== src) images[i].setAttribute("src", src);
    }
    const credits = document.querySelectorAll('[data-photo-credit="' + v.id + '"]');
    for (let i = 0; i < credits.length; i++) {
      const el = credits[i];
      if (v.photo && v.photo.page && v.photo.credit) {
        el.setAttribute("href", v.photo.page);
        el.setAttribute("title", "Imagen de referencia del modelo · Wikimedia Commons");
        el.textContent = "Imagen de referencia · " + v.photo.credit + " · " + v.photo.license;
        el.hidden = false;
      } else {
        el.removeAttribute("href");
        el.hidden = true;
      }
    }
  }

  function resolveVehiclePhoto(v) {
    if (!v || !window.PitBoxCarImage) return;
    const key = v.photoKey && window.PitBoxCarImage.has(v.photoKey)
      ? v.photoKey
      : window.PitBoxCarImage.keyFor(v);
    if (!key || !window.PitBoxCarImage.has(key)) return;
    if (v.image === "assets/car-hero.png" && key !== "volkswagen|golf|mk7") {
      v.image = PLACEHOLDER_IMAGE;
      save();
      paintVehiclePhoto(v);
    }
    if (v.photo && v.photo.src) { paintVehiclePhoto(v); return; }
    window.PitBoxCarImage.resolve(key).then((photo) => {
      if (!photo) return;
      v.photo = photo;
      v.photoKey = key;
      save();
      paintVehiclePhoto(v);
    });
  }

  function hydrateCarPhotos() {
    state.vehicles.forEach(resolveVehiclePhoto);
  }

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
    const watch = faultsFor(v).find((f) => f.alert);
    if (watch) {
      out.push({ kind: "info", icon: watch.icon, title: watch.alert, meta: "Fallo documentado · fuente verificada en la ficha", fault: watch.id });
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
    if (ui.processor) {
      try { ui.processor.disconnect(); } catch (err) { /* noop */ }
      ui.processor.onaudioprocess = null;
      ui.processor = null;
    }
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
    if (ui.catalogScroll) {
      ui.catalogScroll = false;
      const target = document.querySelector(".car-panel, .car-summary, .car-manual");
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
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
      resetDiagnosis();
      ui.diagMode = "acoustic";
      ui.diagStage = "idle";
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

  function faultModelKey(v) {
    let brand = v.brand;
    let model = v.model;
    if ((!brand || !model) && v.photoKey) {
      const parts = v.photoKey.split("|");
      brand = brand || parts[0];
      model = model || parts[1];
    }
    if (!brand || !model) return "";
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const target = norm(brand) + "|" + norm(model);
    return Object.keys(DB.modelFaults).find((k) => {
      const p = k.split("|");
      return norm(p[0]) + "|" + norm(p[1]) === target;
    }) || "";
  }

  function vehicleModelLabel(v) {
    if (v.model) return v.model;
    if (v.photoKey) {
      const m = v.photoKey.split("|")[1];
      if (m) return m.charAt(0).toUpperCase() + m.slice(1);
    }
    return v.engineCode;
  }

  function faultsFor(v) {
    if (!v) return [];
    const key = faultModelKey(v);
    const year = parseInt(v.year, 10);
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const engine = norm(v.engine);
    const gearbox = norm(v.gearbox);
    const matches = (f) => {
      if (f.gens && v.generationCode && !f.gens.includes(v.generationCode)) return false;
      if (f.years && year && (year < f.years[0] || year > f.years[1])) return false;
      if (f.engines && engine && !f.engines.some((e) => engine.includes(norm(e)))) return false;
      if (f.gear === "auto" && !/(dsg|s tronic|tiptronic|multitronic|auto)/.test(gearbox)) return false;
      return true;
    };
    const all = (key ? DB.modelFaults[key] || [] : []).concat(DB.faults[v.engineCode] || []);
    const seen = {};
    return all.filter((f) => matches(f) && !seen[f.id] && (seen[f.id] = 1));
  }

  function faultSourceHTML(f, compact) {
    if (!f.source || !f.source.url) return "";
    return '<a class="fault-src' + (compact ? " fault-src--compact" : "") + '" href="' + esc(f.source.url) + '" target="_blank" rel="noopener noreferrer">' +
      icon("up-right") + "<span>" + esc(f.source.label) + (f.source.updated ? " · act. " + fmtDate(f.source.updated) : "") + "</span></a>";
  }

  function faultMiniHTML(f) {
    const sev = sevMeta(f.severity);
    return '<button class="fault-mini" data-action="open-fault" data-id="' + f.id + '">' +
      '<div class="fault-mini-top">' + icon(f.icon) + '<span class="tag ' + sev.cls + '">' + sev.label + "</span></div>" +
      "<b>" + esc(f.title) + "</b>" +
      "<span>" + esc(trunc(f.symptom, 58)) + "</span>" +
      '<div class="mono-label">' + (f.source ? "Fuente · " + esc(f.source.label) : "") + "</div>" +
      "</button>";
  }

  function renderGarage(v) {
    const health = healthScore(v);
    const alerts = alertsFor(v);
    const next = nextComponents(v, 3);
    const nearest = nearestPositive(v);
    const faults = faultsFor(v).slice(0, 3);
    const other = state.vehicles.find((x) => x.id !== v.id);

    return topbar(v) +
      '<div class="greeting"><h1>Mi garaje<span>.</span></h1>' +
      "<p>" + state.vehicles.length + " vehículo" + (state.vehicles.length === 1 ? "" : "s") + " · " + fmtKm(v.km) + " km registrados</p></div>" +

      '<article class="hero-card" data-action="open-vehicle">' +
      '<div class="hero-media"><img class="vehicle-photo" src="' + esc(vehicleImageSrc(v)) + '"' + vehiclePhotoAttrs(v) + ' alt="' + esc(v.name) + '">' + vehiclePhotoCreditsHTML(v) +
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

      (faults.length ? '<section class="section"><div class="section-head"><span class="section-title">Fallos comunes · ' + esc(vehicleModelLabel(v)) + '</span><button class="text-btn" data-action="open-vehicle">Ver todos ' + icon("next") + "</button></div>" +
        '<div class="fault-strip">' + faults.map(faultMiniHTML).join("") + "</div></section>" : "") +

      '<section class="section"><div class="section-head"><span class="section-title">Garaje</span><button class="text-btn" data-action="open-add-vehicle">' + icon("plus") + " Añadir</button></div>" +
      (other ? (state.pro || !other.demoLocked
        ? '<button class="vehicle-pill" data-action="switch-vehicle" data-id="' + other.id + '"><span class="vehicle-thumb"><img class="vehicle-photo" src="' + esc(vehicleImageSrc(other)) + '"' + vehiclePhotoAttrs(other) + ' alt=""></span><span class="vehicle-pill-main"><b>' + esc(other.name) + "</b><span>" + esc(other.engineCode) + " · " + fmtKm(other.km) + " km</span></span>" + icon("next") + "</button>"
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
    const faultList = faultsFor(v);
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
      const faults = faultsFor(v);
      content = (faults.length ? '<div class="card card--pad" style="margin-bottom:8px"><div class="row-between">' +
        '<div><span class="mono-label">Base verificada · ' + esc(v.model || v.name) + ' · ' + esc(v.engineCode) + '</span>' +
        '<b class="h3" style="display:block;margin-top:5px">Fallos documentados</b>' +
        '<p class="tiny faint" style="margin-top:3px">Patrones publicados por fuentes técnicas, con enlace a la fuente.</p></div>' +
        '<span class="chip">' + faults.length + " con fuente</span></div></div>" +
        faults.map((f) => {
          const sev = sevMeta(f.severity);
          return '<article class="fault-card"><div class="fault-top"><span class="fault-ico">' + icon(f.icon) + "</span>" +
            '<div class="fault-top-main"><div class="fault-title-row"><b>' + esc(f.title) + '</b><span class="tag ' + sev.cls + '">' + sev.label + "</span></div>" +
            "<p>" + esc(f.symptom) + "</p></div></div>" +
            '<div class="fault-foot"><span class="fault-cases">' + (f.km ? esc(f.km) + " · " : "") + faultSourceHTML(f, true) + "</span>" +
            '<button class="btn btn--sm" data-action="diag-fault" data-id="' + f.id + '">' + icon("mic") + " Diagnosticar</button></div></article>";
        }).join("") +
        '<div class="disclaimer">' + icon("info") + "<span>Fichas elaboradas a partir de fuentes técnicas enlazadas. Un patrón documentado no confirma una avería: la inspección en taller sigue siendo necesaria.</span></div>"
        : '<div class="empty-state">' + icon("info") + "<b>Sin fallos documentados verificados</b><p>Todavía no hay patrones de avería con fuente técnica publicada para este modelo y año. El diagnóstico acústico sigue disponible.</p></div>");
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
        (v.displacement ? '<div class="spec"><span>Cilindrada</span><b>' + fmtKm(v.displacement) + " cc</b></div>" : "") +
        '<div class="spec"><span>Potencia</span><b>' + esc(v.power) + "</b></div>" +
        '<div class="spec"><span>Combustible</span><b>' + esc(v.fuel) + "</b></div>" +
        '<div class="spec"><span>Código motor</span><b>' + esc(v.engineCode) + "</b></div>" +
        (v.generation ? '<div class="spec"><span>Generación</span><b>' + esc(v.generation) + "</b></div>" : "") +
        (v.body ? '<div class="spec"><span>Carrocería</span><b>' + esc(v.body) + "</b></div>" : "") +
        (v.generationYears ? '<div class="spec"><span>Producción</span><b>' + esc(v.generationYears) + "</b></div>" : "") +
        (v.engineYears ? '<div class="spec"><span>Motorización</span><b>' + esc(v.engineYears) + "</b></div>" : "") +
        '<div class="spec"><span>Plataforma</span><b>' + esc(v.chassis) + "</b></div>" +
        '<div class="spec"><span>Aceite</span><b>' + esc(v.oilSpec) + "</b></div>" +
        '<div class="spec"><span>Cambio</span><b>' + esc(v.gearbox) + "</b></div>" +
        '<div class="spec"><span>Par motor</span><b>' + esc(v.torque) + "</b></div>" +
        '<div class="spec"><span>VIN</span><b>' + esc(maskVin(v.vin)) + "</b></div>" +
        '<div class="spec"><span>Kilometraje</span><b>' + fmtKm(v.km) + " km</b></div>" +
        "</div></section>" +
        '<section class="section"><div class="engine-banner"><img src="assets/engine-bay.png" alt="Vano motor documentado"><div class="engine-banner-copy"><span class="mono-label">Documentación visual</span><b>' + esc(v.engineCode) + '</b><span>Vano motor · ' + esc(v.engine) + '</span></div></div></section>' +
        (faultList.length
          ? '<section class="section"><div class="section-head"><span class="section-title">Fallos comunes</span><button class="text-btn" data-action="vehicle-tab" data-tab="fallos">Ver ' + faultList.length + " " + icon("next") + "</button></div>" +
            '<div class="fault-strip">' + faultList.slice(0, 3).map(faultMiniHTML).join("") + "</div></section>"
          : '<section class="section"><div class="section-head"><span class="section-title">Fallos comunes</span><span class="mono-label">Perfil genérico</span></div>' +
            '<div class="card card--pad"><p class="tiny faint">Sin patrones de avería documentados para este perfil. El diagnóstico acústico sigue disponible con patrones genéricos.</p></div></section>');
    }

    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Ficha · ' + esc(v.engineCode) + "</div><h1 class=\"screen-title\">" + esc(v.name) + "</h1></div>" +
      '<div class="head-actions"><button class="icon-btn" data-action="edit-vehicle" aria-label="Editar">' + icon("edit") + "</button></div></div>" +

      '<div class="vehicle-banner"><img class="vehicle-photo" src="' + esc(vehicleImageSrc(v)) + '"' + vehiclePhotoAttrs(v) + ' alt="' + esc(v.name) + '">' +
      '<div class="vehicle-banner-top"><span class="tag tag--glass">' + esc(v.plate) + '</span><span class="tag tag--glass">' + esc(v.engineCode) + "</span></div>" +
      '<div class="vehicle-banner-body"><div><div class="h2">' + fmtKm(v.km) + ' <span style="font-size:14px;color:var(--faint)">km</span></div><div class="mono-label">' + esc(v.engine) + " · " + v.year + "</div></div>" +
      '<span class="chip">' + esc(v.power) + "</span></div></div>" + vehiclePhotoCreditsHTML(v, "row") +

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
    const reports = (state.diagnoses || []).filter((d) => d.vehicleId === v.id);

    return '<div class="screen-head"><div class="head-main"><div class="eyebrow">Libro digital</div><h1 class="screen-title">Mantenimiento</h1></div>' +
      '<div class="head-actions"><button class="icon-btn" data-action="notifications" aria-label="Avisos">' + icon("bell") + "</button></div></div>" +

      '<button class="vehicle-pill" data-action="vehicle-switcher">' +
      '<span class="vehicle-thumb"><img class="vehicle-photo" src="' + esc(vehicleImageSrc(v)) + '"' + vehiclePhotoAttrs(v) + ' alt=""></span>' +
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

      (reports.length ? '<section class="section"><div class="section-head"><span class="section-title">Diagnósticos guardados</span><span class="mono-label">' + reports.length + (reports.length === 1 ? " informe" : " informes") + "</span></div>" +
        '<div class="card card--pad">' + reports.map((d) => {
          const r = d.result || {};
          const top = (r.hallazgos && r.hallazgos[0]) || {};
          const u = aiUrgency(r.urgencia);
          return '<div class="log-item"><div class="log-top"><div><div class="log-title">' + esc(top.sospecha || "Diagnóstico") + "</div>" +
            '<div class="log-date">' + fmtDate(d.date) + " · " + (d.mode === "image" ? "Imagen" : "Audio") + '</div></div><span class="chip ' + u.chip + '">' + u.label + "</span></div>" +
            '<div class="log-parts">' + esc(r.resumen || "") + "</div></div>";
        }).join("") + "</div></section>" : "") +

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
    const f = faultsFor(v).find((x) => x.id === ui.params.fault);
    if (!f) return "";
    return '<div class="card card--pad" style="margin-bottom:9px;border-color:rgba(255,90,31,.25)"><div class="row-between">' +
      '<div><span class="mono-label">Diagnóstico dirigido</span><b class="h3" style="display:block;margin-top:4px">' + esc(f.title) + "</b>" +
      '<p class="tiny faint" style="margin-top:3px">' + esc(trunc(f.symptom, 76)) + "</p></div>" +
      '<span class="chip chip--accent">' + esc(f.years ? f.years[0] + "–" + f.years[1] : "Documentado") + "</span></div></div>";
  }

  const VISUAL_PARTS = [
    ["tyre", "Neumático"],
    ["disc", "Frenos"],
    ["engine", "Motor"],
    ["leak", "Fugas"],
    ["suspension", "Suspensión"],
    ["other", "Otra pieza"]
  ];

  function visualCameraHTML() {
    const scanning = ui.visualStage === "scanning";
    const result = ui.visualStage === "result" ? ui.aiResult : null;
    const captured = (ui.visualStage === "result" || scanning || ui.visualStage === "error") && ui.capturedFrame;
    const source = captured ?
      '<img src="' + ui.capturedFrame + '" alt="Captura de la cámara">' :
      ui.cameraLive ? '<video id="cameraFeed" autoplay playsinline muted></video>' :
        '<img src="assets/brake-disc.png" alt="Referencia de la cámara">';
    const liveLabel = scanning ? "Analizando la captura" : ui.cameraLive ? "Cámara en vivo" : captured ? "Captura guardada" : ui.cameraStarting ? "Abriendo cámara" : "Cámara apagada";
    const showActivate = !ui.cameraLive && !captured && !scanning;
    const hint = scanning ? "Analizando la foto y leyendo la evidencia visible…" :
      ui.cameraLive ? "Encuadra la pieza y pulsa el disparador. La foto se analiza al capturarla." :
        captured ? "Foto capturada en el dispositivo." :
          "Activa la cámara o sube una foto. Sin cámara no hay diagnóstico visual.";
    const partLabel = (VISUAL_PARTS.find((p) => p[0] === ui.visualPart) || VISUAL_PARTS[0])[1];
    const errorHTML = ui.visualStage === "error" && ui.aiError
      ? '<div class="ai-error">' + icon("alert") + "<span>" + esc(ui.aiError) + '</span></div><button class="btn btn--ghost btn--block" style="margin-top:8px" data-action="visual-reset">' + icon("retry") + " Probar otra foto</button>"
      : "";
    return '<div class="chip-row" style="margin-bottom:8px">' + VISUAL_PARTS.map(([id, label]) =>
      '<button class="chip chip--button ' + (ui.visualPart === id ? "chip--accent" : "") + '" data-action="visual-part" data-part="' + id + '">' + esc(label) + "</button>"
    ).join("") + "</div>" +
      '<div class="camera-card ' + (scanning ? "camera-scanning" : "") + '">' + source +
      '<div class="camera-topline"><span class="camera-live"><span class="status-dot"></span>' + liveLabel + '</span><span class="tag tag--glass">' + esc(partLabel) + '</span></div>' +
      '<div class="camera-corners"><span></span><span></span><span></span><span></span></div>' +
      '<div class="camera-reticle"></div><div class="scan-line"></div>' +
      (showActivate ? '<div class="camera-activate"><button class="btn btn--sm btn--primary" data-action="camera-start" ' + (ui.cameraStarting ? "disabled" : "") + ">" + icon("camera") + (ui.cameraStarting ? " Abriendo…" : " Activar cámara") + "</button>" +
        '<span class="camera-error">' + esc(ui.cameraError || "Requiere HTTPS o localhost") + "</span></div>" : "") +
      '<div class="camera-bottom"><span class="chip">' + esc(partLabel) + "</span>" +
      '<button class="capture-btn" data-action="visual-capture" aria-label="Capturar" ' + (scanning || !ui.cameraLive ? "disabled" : "") + ">" + icon(scanning ? "scan" : "camera") + "</button></div></div>" +
      '<input type="file" id="visualFileInput" accept="image/*" hidden>' +
      '<div class="row" style="margin-top:8px;gap:7px"><button class="btn btn--ghost btn--sm" style="flex:1" data-action="visual-upload">' + icon("file") + " Subir una foto</button>" +
      (captured ? '<button class="btn btn--ghost btn--sm" style="flex:1" data-action="visual-retake">' + icon("camera") + " Repetir</button>" : "") + "</div>" +
      '<div class="rec-hint" style="margin-top:8px">' + icon("info") + " " + hint + "</div>" +
      errorHTML +
      (result ? aiResultHTML("image") : "");
  }


  const URGENCY = {
    baja: { label: "Prioridad baja", chip: "chip--ok" },
    media: { label: "Revisar pronto", chip: "chip--accent" },
    alta: { label: "Revisar cuanto antes", chip: "chip--danger" },
    inmediata: { label: "No circular", chip: "chip--danger" }
  };

  function aiUrgency(u) {
    return URGENCY[u] || URGENCY.media;
  }

  function aiIllustrationHTML() {
    if (ui.aiImageStatus === "loading") {
      return '<div class="ai-illo ai-illo--loading"><span class="ai-illo-shimmer"></span><div><b>Preparando imagen</b><span>Se crea a partir del hallazgo principal.</span></div></div>';
    }
    if (ui.aiImage && ui.aiImage.url) {
      const label = ui.aiImage.source === "ai" ? "Ilustración orientativa · no es una foto de tu vehículo" : "Imagen de referencia obtenida de Wikipedia";
      return '<figure class="ai-illo"><img src="' + esc(ui.aiImage.url) + '" alt="Ilustración del componente sospechoso" loading="lazy" referrerpolicy="no-referrer">' +
        '<figcaption>' + icon("info") + "<span>" + label + "</span></figcaption></figure>";
    }
    if (ui.aiImageStatus === "none") {
      return '<div class="ai-illo ai-illo--empty">' + icon("info") + "<span>No se pudo obtener una ilustración para este hallazgo. El diagnóstico sigue siendo válido.</span></div>";
    }
    return "";
  }

  function paintIllustration() {
    const el = document.getElementById("aiIllustration");
    if (el) el.innerHTML = aiIllustrationHTML();
  }

  function startIllustration(mode) {
    const result = ui.aiResult;
    if (!result || !result.hallazgos.length) return;
    const top = result.hallazgos[0];
    ui.aiImage = null;
    ui.aiImageStatus = "loading";
    paintIllustration();
    PitBoxAI.illustrate({
      mode: mode,
      component: top.componente,
      suspicion: top.sospecha,
      part: ui.visualPart
    }).then((image) => {
      if (ui.aiResult !== result) return;
      ui.aiImage = image;
      ui.aiImageStatus = image ? "ready" : "none";
      paintIllustration();
    }).catch(() => {
      if (ui.aiResult !== result) return;
      ui.aiImageStatus = "none";
      paintIllustration();
    });
  }

  function aiReadingsHTML(mode) {
    if (mode === "audio") {
      const s = ui.audioSummary;
      if (!s || !s.real) return "";
      const duration = s.duration ? s.duration.toFixed(1).replace(".", ",") + " s" : "—";
      return '<div class="card card--pad section"><div class="row-between" style="margin-bottom:7px"><span class="mono-label">Lectura del micrófono</span><span class="chip chip--ok">' + icon("check") + " Real</span></div>" +
        '<div class="metric-grid" style="margin-top:0">' +
        (s.freq ? '<div class="metric"><span>Frecuencia dominante</span><b>' + fmtHz(s.freq) + "</b></div>" : "") +
        (Number.isFinite(s.peakDb) ? '<div class="metric"><span>Pico</span><b>' + fmtDb(s.peakDb) + "</b></div>" : "") +
        '<div class="metric"><span>Duración</span><b>' + duration + "</b></div>" +
        '<div class="metric"><span>Origen</span><b>' + (s.uploaded ? "Archivo" : "Micrófono") + "</b></div></div>" +
        '<div class="row-between" style="margin-top:9px"><button class="btn btn--ghost btn--sm" data-action="diag-play" ' + (ui.audioURL ? "" : "disabled") + ">" + icon("play") + " Escuchar captura</button>" +
        '<span class="mono-label">' + esc(s.uploaded ? (ui.audioUploadName || "Archivo") : "Grabación de 8 s") + "</span></div>" +
        '<p class="visual-note">Nivel en dBFS sin calibrar a dB SPL. La interpretación se hace a partir del audio, no con una regla fija.</p></div>';
    }
    const m = ui.visualMetrics;
    if (!m) return "";
    return '<div class="card card--pad section"><div class="row-between" style="margin-bottom:7px"><span class="mono-label">Calidad de la captura</span><span class="tag ' + (m.score >= 55 ? "tag--ok" : "tag--warn") + '">' + (m.score >= 55 ? "Válida" : "Mejorable") + "</span></div>" +
      '<div class="metric-grid" style="margin-top:0"><div class="metric"><span>Resolución</span><b>' + m.width + " × " + m.height + "</b></div>" +
      '<div class="metric"><span>Luminancia</span><b>' + Math.round(m.luminance) + " / 255</b></div>" +
      '<div class="metric"><span>Nitidez</span><b>' + m.sharpness.toFixed(1).replace(".", ",") + "</b></div>" +
      '<div class="metric"><span>Calidad</span><b>' + m.score + " / 100</b></div></div>" +
      '<p class="visual-note">La foto y estas métricas se miden en el dispositivo. El diagnóstico se calcula sobre la imagen.</p></div>';
  }

  function aiResultHTML(mode) {
    const r = ui.aiResult;
    if (!r) return "";
    const u = aiUrgency(r.urgencia);
    const showQuestions = ui.aiRound < 1 && r.preguntas.length;
    const safety = r.urgencia === "alta" || r.urgencia === "inmediata"
      ? '<div class="ai-safety">' + icon("alert") + "<div><b>Seguridad primero</b><span>" +
        (r.urgencia === "inmediata" ? "No circules con el coche hasta que lo revise un profesional." : "Evita trayectos largos y revisa el coche cuanto antes.") + "</span></div></div>"
      : "";
    return '<div class="result-head"><div><div class="eyebrow">' + icon("bolt") + " Diagnóstico · " + (mode === "audio" ? "audio" : "imagen") + '</div><h2>Resultado</h2><p>Basado en la captura y en los datos de tu ' + esc(currentVehicle().name) + ".</p></div>" +
      '<span class="chip ' + u.chip + '">' + u.label + "</span></div>" +

      safety +

      (ui.aiError ? '<div class="ai-error">' + icon("alert") + "<span>" + esc(ui.aiError) + "</span></div>" : "") +

      '<div class="ai-summary card card--pad"><div class="row-between" style="margin-bottom:8px"><span class="mono-label">Lectura del análisis</span><span class="chip">' + r.confianza + "% confianza</span></div>" +
      "<p>" + esc(r.resumen) + "</p>" +
      (r.no_concluyente ? '<p class="ai-limit">' + icon("info") + "<span>" + esc(r.no_concluyente) + "</span></p>" : "") + "</div>" +

      '<section class="section"><div class="section-head"><span class="section-title">Posibilidades</span><span class="mono-label">' + r.hallazgos.length + " hipótesis</span></div>" +
      '<div class="ai-findings">' + r.hallazgos.map((h, i) => {
        const g = h.gravedad === "grave" ? "chip--danger" : h.gravedad === "moderada" ? "chip--accent" : "chip--ok";
        return '<article class="ai-finding"><div class="ai-finding-head"><div><span class="mono-label">' + (i === 0 ? "Más probable" : "Alternativa") + "</span><b>" + esc(h.sospecha) + "</b><span class=\"ai-part\">" + esc(h.componente) + "</span></div>" +
          '<span class="ai-prob">' + h.probabilidad + "%</span></div>" +
          '<div class="cand-track"><i style="width:' + h.probabilidad + '%"></i></div>' +
          '<p class="ai-evidence">' + esc(h.evidencia) + "</p>" +
          '<div class="row-between"><span class="chip ' + g + '">' + esc(h.gravedad) + '</span><span class="ai-action">' + esc(h.accion) + "</span></div></article>";
      }).join("") + "</div></section>" +

      (r.comprobaciones.length ? '<section class="section"><div class="section-head"><span class="section-title">Qué comprobar</span><span class="mono-label">Sin desmontar</span></div>' +
        '<div class="ai-checks">' + r.comprobaciones.map((c, i) => '<div class="ai-check"><span>' + pad2(i + 1) + "</span><p>" + esc(c) + "</p></div>").join("") + "</div></section>" : "") +

      (showQuestions ? '<section class="section"><div class="section-head"><span class="section-title">Ayúdame a afinar</span><span class="mono-label">Opcional</span></div>' +
        '<div class="ai-questions">' + r.preguntas.map((q, qi) =>
          '<div class="ai-question"><b>' + esc(q.pregunta) + '</b><div class="chip-row">' + q.opciones.map((o) =>
            '<button class="chip chip--button ' + (ui.aiAnswers[qi] === o ? "chip--accent" : "") + '" data-action="ai-answer" data-q="' + qi + '" data-value="' + esc(o) + '">' + esc(o) + "</button>"
          ).join("") + "</div></div>"
        ).join("") +
        '<div class="field" style="margin-top:10px"><label>¿Algo más? <small>opcional</small></label><textarea data-ai-followup placeholder="Ej.: solo suena al girar a la izquierda y el volante se nota duro">' + esc(ui.aiFollowup) + "</textarea></div>" +
        '<button class="btn btn--primary btn--block" style="margin-top:8px" data-action="ai-followup" ' + (ui.aiFollowupBusy ? "disabled" : "") + ">" +
        icon("bolt") + (ui.aiFollowupBusy ? " Afinando diagnóstico…" : " Afinar diagnóstico") + "</button></div></section>" : "") +

      (ui.aiRound > 0 ? '<div class="ai-refined">' + icon("check") + " Diagnóstico afinado con tus respuestas.</div>" : "") +

      aiReadingsHTML(mode) +

      '<section class="section" id="aiIllustration">' + aiIllustrationHTML() + "</section>" +

      '<div class="ai-cost-row">' + (r.coste ? '<span>' + icon("bag") + " " + esc(r.coste) + "</span>" : "") + "</div>" +

      '<div class="row" style="margin-top:12px;gap:7px">' +
      '<button class="btn btn--ghost" style="flex:1" data-action="' + (mode === "audio" ? "diag-reset" : "visual-reset") + '">' + icon("retry") + " Nuevo</button>" +
      '<button class="btn btn--primary" style="flex:1.4" data-action="' + (mode === "audio" ? "diag-save" : "visual-save") + '">' + icon("check") + " Guardar informe</button></div>" +
      '<div class="disclaimer">' + icon("alert") + "<span>" + esc(r.aviso) + " Esta app no sustituye a un mecánico: sirve para identificar una posibilidad y confirmarla en el taller.</span></div>";
  }

  function renderDiag(v) {
    const credits = state.pro ? "PRO" : state.diagCredits + (state.diagCredits === 1 ? " pase" : " pases");
    let body = "";
    if (ui.diagMode === "visual") {
      body = visualCameraHTML() +
        '<div class="disclaimer">' + icon("shield") + "<span>La foto se procesa solo al analizar. La app no la guarda en ningún servidor propio. El resultado es orientativo y no sustituye a un mecánico.</span></div>";
    } else if (ui.diagStage === "recording") {
      body = '<div class="recording-stage"><div class="rec-top"><span class="rec-live"><span class="status-dot"></span> Grabando · micrófono real</span>' +
        '<span class="rec-timer"><span id="recTimer">00:00.0</span> <small>/ 00:08</small></span></div>' +
        '<div class="wave-panel"><canvas id="waveCanvas"></canvas><div class="wave-axis"></div><span class="wave-freq" id="waveFreq">—</span></div>' +
        '<div class="rec-stats"><div class="rec-stat"><span>Pico</span><b data-rec-peak>silencio</b></div><div class="rec-stat"><span>Frecuencia</span><b data-rec-freq>—</b></div><div class="rec-stat"><span>Filtro</span><b>' + (ui.ambientFilter ? "ON" : "OFF") + '</b></div></div>' +
        '<div class="rec-hint">' + icon("info") + " Acerca el móvil al ruido y evita golpear la carrocería. Al detener, el audio se procesa para el diagnóstico." + "</div>" +
        '<div class="rec-controls"><button class="stop-btn" data-action="diag-stop">' + icon("stop") + " Detener y analizar</button></div></div>";
    } else if (ui.diagStage === "analyzing") {
      body = '<div class="analyzing"><div class="scan-ring">' + icon("bolt") + "</div>" +
        "<h3>Analizando la captura</h3><p>Interpretando el audio y los datos de tu coche</p>" +
        '<div class="scan-steps"><div class="scan-step is-done"><span class="mini-dot"></span>Audio capturado y normalizado</div>' +
        '<div class="scan-step is-done"><span class="mini-dot"></span>Contexto del vehículo añadido</div>' +
        '<div class="scan-step is-active"><span class="mini-dot"></span>Interpretando la evidencia acústica…</div>' +
        '<div class="scan-step"><span class="mini-dot"></span>Redactando comprobaciones seguras</div></div></div>';
    } else if (ui.diagStage === "result") {
      body = aiResultHTML("audio");
    } else if (ui.diagStage === "error") {
      body = '<div class="ai-error-card">' + icon("alert") + "<h3>No se pudo completar el análisis</h3><p>" + esc(ui.aiError || "Error desconocido.") + "</p>" +
        '<div class="row" style="gap:7px;margin-top:12px"><button class="btn btn--ghost" style="flex:1" data-action="diag-reset">' + icon("retry") + " Volver</button>" +
        (ui.audioWav ? '<button class="btn btn--primary" style="flex:1.2" data-action="diag-retry">' + icon("bolt") + " Reintentar</button>" : "") + "</div></div>";
    } else {
      body = contextBanner(v) +
        '<div class="diag-hero"><span class="diag-kicker">' + icon("bolt") + " Diagnóstico acústico</span>" +
        "<h2>Graba el ruido.<br>Escucha qué falla.</h2><p>Ocho segundos de motor, rodaje o giro de volante. La app cruza el sonido con el motor de tu coche y te dice qué puede ser y qué comprobar.</p>" +
        '<div class="diag-orbit"><span class="orbit-ring"></span><span class="orbit-ring orbit-ring--2"></span><span class="orbit-ring orbit-ring--3"></span>' +
        '<span class="orbit-tick orbit-tick--1"></span><span class="orbit-tick orbit-tick--2"></span><span class="orbit-tick orbit-tick--3"></span>' +
        '<button class="record-btn" data-action="diag-start" aria-label="Grabar ruido">' + icon("mic") + "</button></div>" +
        '<div class="record-label">Grabar 8 segundos</div></div>' +
        '<div class="field" style="margin-top:12px"><label>¿Qué notas? <small>opcional, ayuda mucho</small></label><textarea data-ai-symptom placeholder="Ej.: chirrido al girar el volante en parado">' + esc(ui.aiSymptom) + "</textarea></div>" +
        '<input type="file" id="audioFileInput" accept="audio/*" hidden>' +
        '<button class="btn btn--ghost btn--block" style="margin-top:8px" data-action="audio-upload">' + icon("file") + " Subir un audio grabado</button>" +
        '<div class="diag-tips"><div class="diag-tip">' + icon("mic") + "<b>1,5 m</b><span>del foco del ruido</span></div>" +
        '<div class="diag-tip">' + icon("engine") + "<b>Ralentí</b><span>o rodaje constante</span></div>" +
        '<div class="diag-tip">' + icon("wind") + "<b>Sin viento</b><span>ni eco de pared</span></div></div>" +
        '<div class="card card--pad section"><div class="row-between" style="margin-bottom:4px"><span class="mono-label">Ajustes de captura</span><span class="chip">Local</span></div>' +
        '<div class="switch-row"><div><b>Cancelación ambiental</b><span>Reduce ruido constante del entorno</span></div>' +
        '<button class="switch ' + (ui.ambientFilter ? "is-on" : "") + '" data-action="toggle-filter" data-key="ambient" aria-label="Cancelación ambiental"></button></div>' +
        '<div class="switch-row"><div><b>Filtro de banda</b><span>0,2 – 8 kHz · motor y rodamientos</span></div>' +
        '<button class="switch ' + (ui.bandFilter ? "is-on" : "") + '" data-action="toggle-filter" data-key="band" aria-label="Filtro de banda"></button></div></div>' +
        '<div class="disclaimer">' + icon("shield") + "<span>El audio se procesa solo al analizar. No se envía tu nombre, matrícula ni VIN. El resultado es orientativo: identifica una posibilidad y confírmala con un mecánico.</span></div>";
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
      '<span class="vehicle-thumb"><img class="vehicle-photo" src="' + esc(vehicleImageSrc(v)) + '"' + vehiclePhotoAttrs(v) + ' alt=""></span>' +
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

  /* ------------------------------------------------------------------------
     Selector de vehículo tipo Autodoc: marca → versión → motorización
     ------------------------------------------------------------------------ */
  function catalogBrandEntry() {
    return DB.vehicleCatalog.find((b) => b.brand === ui.catalogBrand) || null;
  }

  function catalogUsesManual() {
    return ui.catalogManual;
  }

  function catalogModelRows() {
    const entry = catalogBrandEntry();
    if (!entry) return [];
    const rows = [];
    entry.models.forEach((model) => {
      const gens = DB.generations[ui.catalogBrand + "|" + model] || [];
      if (gens.length) {
        gens.forEach((gen, index) => rows.push({ model, gen, index }));
      } else {
        rows.push({ model, gen: null, index: -1, variants: DB.engineVariants[ui.catalogBrand + "|" + model] || [] });
      }
    });
    return rows;
  }

  function catalogGeneration() {
    if (!ui.catalogBrand || !ui.catalogModel || ui.catalogGen < 0) return null;
    const gens = DB.generations[ui.catalogBrand + "|" + ui.catalogModel] || [];
    return gens[ui.catalogGen] || null;
  }

  function catalogEngineList() {
    if (!ui.catalogBrand || !ui.catalogModel) return [];
    const all = DB.engineVariants[ui.catalogBrand + "|" + ui.catalogModel] || [];
    const gen = catalogGeneration();
    if (!gen) return all;
    const tagged = all.filter((e) => e.g === gen.code);
    if (tagged.length) return tagged;
    const byYears = all.filter((e) => Number(e.to) >= gen.from && Number(e.from) <= gen.to);
    return byYears.length ? byYears : all;
  }

  function catalogEngine() {
    if (ui.catalogEng < 0) return null;
    return catalogEngineList()[ui.catalogEng] || null;
  }

  function engineKw(e) {
    if (!e) return 0;
    if (e.kw) return e.kw;
    return Math.round((Number(e.power) || 0) * 0.7355);
  }

  function enginePowerText(e) {
    if (!e) return "";
    const cv = Number(e.power) || 0;
    const kw = engineKw(e);
    return kw && cv ? kw + " kW / " + cv + " CV" : (cv ? cv + " CV" : "—");
  }

  function dateRangeText(from, fromM, to, toM) {
    if (!from) return "—";
    const left = (fromM ? pad2(fromM) + "." : "") + from;
    const right = !to || to >= 2026 ? "…" : (toM ? pad2(toM) + "." : "") + to;
    return left + " – " + right;
  }

  function generationRange(gen) {
    return gen ? dateRangeText(gen.from, gen.fromM, gen.to, gen.toM) : "";
  }

  function engineRange(e) {
    return e ? dateRangeText(e.from, e.fromM, e.to, e.toM) : "";
  }

  function engineFullLabel(e) {
    if (!e) return "";
    return /\d+\s*CV/i.test(e.label) ? e.label : e.label + " · " + enginePowerText(e);
  }

  function engineTitle(e) {
    return engineFullLabel(e);
  }

  function fuelLabel(key) {
    return (DB.fuelProfiles[key] || DB.fuelProfiles.gasolina).label;
  }

  function catalogFuelKey() {
    const eng = catalogEngine();
    return eng && DB.fuelProfiles[eng.fuel] ? eng.fuel : ui.catalogFuel;
  }

  function catalogFuelProfile() {
    return DB.fuelProfiles[catalogFuelKey()] || DB.fuelProfiles.gasolina;
  }

  function catalogKnownProfile() {
    const eng = catalogEngine();
    const code = eng && eng.code
      ? String(eng.code).toUpperCase()
      : (catalogUsesManual() ? String(ui.catalogCode || "").trim().toUpperCase() : "");
    if (!code) return null;
    return DB.engineProfiles.find((p) => p.code === code) || null;
  }

  function catalogActiveProfile() {
    return catalogKnownProfile() || catalogFuelProfile();
  }

  function catalogTotals() {
    return DB.vehicleCatalog.reduce((acc, b) => ({ brands: acc.brands + 1, models: acc.models + b.models.length }), { brands: 0, models: 0 });
  }

  function catalogDisplayName() {
    if (catalogUsesManual()) {
      return [ui.catalogBrandCustom.trim(), ui.catalogModelCustom.trim()].filter(Boolean).join(" ");
    }
    return [ui.catalogBrand, ui.catalogModel].filter(Boolean).join(" ");
  }

  function modelRowMatches(row, q) {
    if (!q) return true;
    return normalize([
      row.model,
      row.gen ? row.gen.name : "",
      row.gen ? row.gen.chassis : "",
      row.gen ? row.gen.body : "",
      row.gen ? generationRange(row.gen) : ""
    ].join(" ")).includes(q);
  }

  function engineMatches(e, q) {
    if (!q) return true;
    return normalize([
      e.label, e.code || "", fuelLabel(e.fuel), engineRange(e), e.cc || "", e.power || ""
    ].join(" ")).includes(q);
  }

  function catalogBrandListHTML() {
    const q = normalize(ui.catalogSearch.brand).trim();
    const rows = DB.vehicleCatalog.filter((b) => !q || normalize(b.brand).includes(q));
    if (!rows.length) return '<div class="car-empty">' + icon("search") + "<span>Sin marcas para esa búsqueda.</span></div>";
    return rows.map((b) => '<button type="button" class="car-option' + (ui.catalogBrand === b.brand ? " is-active" : "") + '" data-action="catalog-brand" data-brand="' + esc(b.brand) + '">' +
      '<span class="car-option-main"><span class="car-option-title">' + esc(b.brand) + "</span>" +
      '<span class="car-option-sub">' + b.models.length + " modelos en el catálogo</span></span>" +
      (ui.catalogBrand === b.brand ? icon("check") : icon("next")) + "</button>").join("");
  }

  function catalogModelListHTML() {
    const q = normalize(ui.catalogSearch.model).trim();
    const rows = catalogModelRows().filter((row) => modelRowMatches(row, q));
    if (!rows.length) return '<div class="car-empty">' + icon("search") + "<span>Sin versiones para esa búsqueda. Prueba otra palabra o usa los datos manuales.</span></div>";
    let out = "";
    let group = "";
    rows.forEach((row) => {
      if (row.model !== group) {
        group = row.model;
        out += '<div class="car-group-label">' + esc(row.model) + "</div>";
      }
      if (row.gen) {
        const active = ui.catalogModel === row.model && ui.catalogGen === row.index;
        out += '<button type="button" class="car-option car-option--gen' + (active ? " is-active" : "") + '" data-action="catalog-generation" data-model="' + esc(row.model) + '" data-gen="' + row.index + '">' +
          '<span class="car-option-main"><span class="car-option-title">' + esc(row.gen.name + " (" + row.gen.chassis + ")") + "</span>" +
          '<span class="car-option-sub">' + esc((row.gen.body || "Carrocería única") + " · " + generationRange(row.gen)) + "</span></span>" +
          '<span class="car-option-meta">' + esc(row.gen.code) + "</span></button>";
      } else {
        const starts = row.variants.map((v) => Number(v.from)).filter(Boolean);
        const ends = row.variants.map((v) => Number(v.to)).filter(Boolean);
        const range = starts.length ? dateRangeText(Math.min.apply(null, starts), 0, Math.max.apply(null, ends), 0) : "";
        const meta = row.variants.length + " motorizaciones" + (range ? " · " + range : "");
        out += '<button type="button" class="car-option' + (ui.catalogModel === row.model && ui.catalogGen === -1 ? " is-active" : "") + '" data-action="catalog-generation" data-model="' + esc(row.model) + '" data-gen="-1">' +
          '<span class="car-option-main"><span class="car-option-title">' + esc(row.model) + "</span>" +
          '<span class="car-option-sub">' + esc(meta) + "</span></span>" +
          (row.variants.length ? icon("next") : "") + "</button>";
      }
    });
    return out;
  }

  function catalogEngineListHTML() {
    const all = catalogEngineList();
    const q = normalize(ui.catalogSearch.engine).trim();
    const list = all.map((e, i) => ({ e, i })).filter((item) => engineMatches(item.e, q));
    if (!list.length) {
      return '<div class="car-empty">' + icon("alert") + "<span>" + (all.length ? "Sin motorizaciones para esa búsqueda." : "Sin motorizaciones detalladas para esta versión. Usa los datos manuales.") + "</span></div>";
    }
    return list.map((item) => {
      const e = item.e;
      const active = ui.catalogEng === item.i;
      const meta = [e.cc ? fmtKm(e.cc) + " cc" : "", fuelLabel(e.fuel), e.gearbox || "", engineRange(e)].filter(Boolean).join(" · ");
      return '<button type="button" class="car-option' + (active ? " is-active" : "") + '" data-action="catalog-engine" data-eng="' + item.i + '">' +
        '<span class="car-option-main"><span class="car-option-title">' + esc(e.label) + " <em>" + esc(enginePowerText(e)) + "</em></span>" +
        '<span class="car-option-sub">' + esc(meta) + "</span></span>" +
        (e.code ? '<span class="car-option-meta">' + esc(e.code) + "</span>" : "") + "</button>";
    }).join("");
  }

  function catalogPanelHTML(step) {
    const kinds = ["brand", "model", "engine"];
    const kind = kinds[step];
    const config = {
      brand: { placeholder: "Buscar marca", list: catalogBrandListHTML },
      model: { placeholder: "Buscar modelo o versión", list: catalogModelListHTML },
      engine: { placeholder: "Buscar motorización", list: catalogEngineListHTML }
    }[kind];
    return '<div class="car-panel">' +
      '<div class="car-search">' + icon("search") +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="' + config.placeholder + '" value="' + esc(ui.catalogSearch[kind]) + '" data-catalog-search="' + kind + '">' +
      "</div>" +
      '<div class="car-list" id="catalogList">' + config.list() + "</div></div>";
  }

  function catalogStepHTML(step, label, value, enabled, complete) {
    const open = ui.catalogStep === step;
    return '<button type="button" class="car-step' + (open ? " is-open" : "") + (complete ? " is-complete" : "") + (enabled ? "" : " is-disabled") + '" data-action="catalog-step" data-step="' + step + '" aria-expanded="' + (open ? "true" : "false") + '"' + (enabled ? "" : " disabled") + ">" +
      '<span class="car-step-num">' + (complete ? icon("check") : String(step + 1)) + "</span>" +
      '<span class="car-step-main"><span class="car-step-label">' + label + "</span>" +
      '<span class="car-step-value">' + esc(value || "Sin seleccionar") + "</span></span>" +
      icon("down") + "</button>";
  }

  function catalogStepsHTML() {
    const gen = catalogGeneration();
    const eng = catalogEngine();
    let modelValue = "";
    if (gen) modelValue = gen.name + " (" + gen.chassis + ") · " + generationRange(gen);
    else if (ui.catalogModel) modelValue = ui.catalogModel + " · " + catalogEngineList().length + " motorizaciones";
    let out = '<div class="car-picker">';
    out += catalogStepHTML(0, "Elija una marca", ui.catalogBrand, true, !!ui.catalogBrand);
    if (ui.catalogStep === 0) out += catalogPanelHTML(0);
    out += catalogStepHTML(1, "Elija un modelo", modelValue, !!ui.catalogBrand, !!ui.catalogModel);
    if (ui.catalogStep === 1) out += catalogPanelHTML(1);
    out += catalogStepHTML(2, "Elija un tipo de motor", engineTitle(eng), !!ui.catalogModel, !!eng);
    if (ui.catalogStep === 2) out += catalogPanelHTML(2);
    return out + "</div>";
  }

  function catalogSummaryHTML() {
    const gen = catalogGeneration();
    const eng = catalogEngine();
    if (!eng) return "";
    const profile = catalogActiveProfile();
    const known = catalogKnownProfile();
    const parts = profileComponents(profile);
    const cells = [
      ["Generación", gen ? gen.name : ui.catalogModel],
      ["Carrocería", gen ? gen.body : "—"],
      ["Chasis", gen ? gen.chassis : "—"],
      ["Producción", gen ? generationRange(gen) : "—"],
      ["Motor", eng.label],
      ["Potencia", enginePowerText(eng)],
      ["Cilindrada", eng.cc ? fmtKm(eng.cc) + " cc" : "—"],
      ["Combustible", fuelLabel(eng.fuel)],
      ["Cambio", eng.gearbox || "—"],
      ["Código motor", eng.code || "—"],
      ["Motorización", engineRange(eng)],
      ["Mantenimiento", parts.length + " componentes"]
    ];
    return '<div class="car-summary">' +
      '<div class="car-summary-head"><div>' +
      '<span class="car-summary-kicker">' + esc(ui.catalogBrand) + "</span>" +
      '<b class="car-summary-title">' + esc(ui.catalogModel) + "</b>" +
      '<span class="car-summary-sub">' + esc(gen ? gen.name + " (" + gen.chassis + ")" : ui.catalogModel) + "</span></div>" +
      '<span class="car-summary-tag">' + (known ? "Perfil " + esc(known.code) : "Genérico") + "</span></div>" +
      '<div class="car-summary-grid">' + cells.map(([k, val]) => "<div><span>" + esc(k) + "</span><b>" + esc(val) + "</b></div>").join("") + "</div>" +
      '<div class="car-summary-note">' + icon(known ? "check" : "info") + "<span>" + (known
        ? "Se cargarán los intervalos y piezas específicas del motor " + esc(known.code) + "."
        : "Este motor no tiene perfil específico: se usarán intervalos genéricos de " + esc(fuelLabel(eng.fuel).toLowerCase()) + ".") + "</span></div>" +
      '<button type="button" class="car-reset" data-action="catalog-reset">' + icon("retry") + " Cambiar vehículo</button></div>";
  }

  function catalogManualHTML() {
    const fields = [
      ["catalogBrandCustom", "Marca", "Isuzu", ui.catalogBrandCustom],
      ["catalogModelCustom", "Modelo", "D-Max", ui.catalogModelCustom]
    ];
    return '<div class="car-manual">' +
      '<div class="section-head" style="margin-bottom:9px"><span class="section-title">Datos manuales</span><span class="mono-label">Sin catálogo</span></div>' +
      '<div class="form-hint" style="margin-top:0;margin-bottom:10px">' + icon("info") + "<span>El catálogo demo no cubre esta versión. Rellena los datos técnicos: se usará un perfil genérico de mantenimiento.</span></div>" +
      '<div class="field-row">' + fields.map(([id, label, placeholder, value]) => '<div class="field"><label for="' + id + '">' + label + "</label>" +
        '<input id="' + id + '" type="text" placeholder="' + placeholder + '" value="' + esc(value) + '" autocomplete="off"></div>').join("") + "</div>" +
      '<div class="field-row"><div class="field"><label for="catalogFuel">Combustible</label><select id="catalogFuel">' +
      Object.keys(DB.fuelProfiles).map((key) => '<option value="' + key + '"' + (ui.catalogFuel === key ? " selected" : "") + ">" + esc(DB.fuelProfiles[key].label) + "</option>").join("") +
      '</select></div><div class="field"><label for="catalogCc">Cilindrada <small>cc</small></label>' +
      '<input id="catalogCc" type="number" min="0" max="10000" placeholder="1896" value="' + esc(ui.catalogCc) + '" autocomplete="off"></div></div>' +
      '<div class="field-row"><div class="field"><label for="catalogPower">Potencia <small>CV</small></label>' +
      '<input id="catalogPower" type="number" min="0" max="2000" placeholder="163" value="' + esc(ui.catalogPower) + '" autocomplete="off"></div>' +
      '<div class="field"><label for="catalogGearbox">Cambio</label><input id="catalogGearbox" type="text" placeholder="Manual 6v" value="' + esc(ui.catalogGearbox) + '" autocomplete="off"></div></div>' +
      '<div class="field-row"><div class="field"><label for="catalogCode">Código motor <small>Opcional</small></label>' +
      '<input id="catalogCode" type="text" placeholder="RZ4E" value="' + esc(ui.catalogCode) + '" style="font-family:var(--mono);text-transform:uppercase" autocomplete="off"></div>' +
      '<div class="field"><label for="catalogVersion">Versión / acabado <small>Opcional</small></label>' +
      '<input id="catalogVersion" type="text" placeholder="LSX" value="' + esc(ui.catalogVersion) + '" autocomplete="off"></div></div>' +
      '<button type="button" class="car-manual-back" data-action="catalog-catalog">' + icon("back") + " Volver al selector de catálogo</button></div>";
  }

  function catalogPickerHTML() {
    if (ui.addMode !== "catalog") return "";
    if (catalogUsesManual()) return catalogManualHTML();
    const totals = catalogTotals();
    return catalogStepsHTML() + catalogSummaryHTML() +
      '<div class="car-manual-link-wrap"><button type="button" class="car-manual-link" data-action="catalog-manual">' +
      icon("info") + " ¿No encuentras tu coche? Introducir datos manualmente</button></div>" +
      '<div class="form-hint">' + icon("check") + "<span>Selección automática: marca, versión y motor rellenan año, cilindrada, potencia, cambio y código de motor. Catálogo demo con " + totals.brands + " marcas y " + totals.models + " modelos.</span></div>";
  }

  function syncCatalogFields() {
    const alias = document.querySelector('#addVehicleForm input[name="alias"]');
    if (alias) alias.placeholder = catalogDisplayName() || "Mi coche";
    const hint = document.getElementById("componentHint");
    if (hint) {
      const count = profileComponents(catalogActiveProfile()).length;
      const freeAdd = state.pro || state.vehicles.length < 3;
      hint.textContent = freeAdd
        ? "Se crearán " + count + " componentes con sus intervalos. Podrás registrar servicios desde el primer día."
        : "El garaje de la demo incluye 3 vehículos. Activa Pro para añadir más.";
    }
  }

  function resetCatalogWizard() {
    ui.catalogBrand = "";
    ui.catalogModel = "";
    ui.catalogBrandCustom = "";
    ui.catalogModelCustom = "";
    ui.catalogFuel = "gasolina";
    ui.catalogVersion = "";
    ui.catalogYear = "";
    ui.catalogStep = 0;
    ui.catalogSearch = { brand: "", model: "", engine: "" };
    ui.catalogGen = -1;
    ui.catalogEng = -1;
    ui.catalogManual = false;
    ui.catalogCc = "";
    ui.catalogPower = "";
    ui.catalogCode = "";
    ui.catalogGearbox = "";
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
    const catalogMode = ui.addMode === "catalog";
    const profile = catalogMode ? catalogActiveProfile() : (DB.engineProfiles.find((p) => p.code === ui.engineChoice) || DB.engineProfiles[0]);
    const template = catalogMode ? null : profileTemplate(profile);
    const components = profileComponents(profile);
    const freeAdd = state.pro || state.vehicles.length < 3;
    const picker = catalogPickerHTML();
    const engineBlock = '<div class="engine-list">' + DB.engineProfiles.map((p) =>
      '<button class="veh-option engine-option ' + (ui.engineChoice === p.code ? "is-active" : "") + '" data-action="engine-profile" data-engine="' + p.code + '">' +
      '<span class="engine-radio" aria-hidden="true"></span>' +
      '<span class="veh-option-main"><b>' + esc(p.label) + "</b><span>" + esc(p.spec) + "</span></span>" +
      '<span class="tag">' + esc(p.code) + "</span></button>"
    ).join("") + "</div>" +
      '<div class="form-hint">' + icon("info") + "<span>La matrícula no se consulta en la DGT: no hay una API pública gratuita por matrícula. Elige el perfil del motor para cargar sus intervalos y fallos típicos.</span></div>";
    const yearValue = catalogMode ? (ui.catalogYear || "") : profile.year;
    const missingEngine = catalogMode && !ui.catalogManual && !catalogEngine();
    const modeLabel = catalogMode ? (ui.catalogManual ? "Manual · datos técnicos" : "Marca · versión · motor") : "Perfil de motor";

    return '<div class="screen-head"><button class="icon-btn" data-action="back" aria-label="Atrás">' + icon("back") + "</button>" +
      '<div class="head-main"><div class="eyebrow">Alta de vehículo</div><h1 class="screen-title">Añadir vehículo</h1></div></div>' +

      '<div class="card card--pad"><div class="section-head" style="margin-bottom:9px"><span class="section-title">Matrícula</span><span class="chip">' + (freeAdd ? "Incluido" : "Requiere Pro") + "</span></div>" +
      '<div class="field"><label for="plateInput">Matrícula del coche <small>España</small></label>' +
      '<div class="search-box" style="height:44px"><input id="plateInput" name="plate" type="text" maxlength="10" value="' + esc(formatPlate(ui.plateValue)) + '" placeholder="1234 ABC" autocomplete="off" autocapitalize="characters" spellcheck="false" style="font-family:var(--mono);font-size:15px;letter-spacing:.14em;text-transform:uppercase"></div></div>' +
      '<div class="form-hint" id="plateStatus">' + plateStatusHTML() + "</div>" +
      '<button class="btn btn--sm btn--block" style="margin-top:8px" data-action="fill-plate">' + icon("bolt") + " Usar matrícula de ejemplo</button></div>" +

      '<section class="section"><div class="section-head"><span class="section-title">Vehículo</span><span class="mono-label">' + modeLabel + "</span></div>" +
      '<div class="segment" style="margin-top:0"><button class="' + (catalogMode ? "is-active" : "") + '" data-action="add-mode" data-mode="catalog">Catálogo</button>' +
      '<button class="' + (catalogMode ? "" : "is-active") + '" data-action="add-mode" data-mode="engine">Motor</button></div>' +
      (catalogMode ? picker + (missingEngine ? '<div class="form-hint">' + icon("alert") + "<span>Completa los tres pasos: marca, versión y tipo de motor. El año y la ficha técnica se rellenan solos.</span></div>" : "") : engineBlock) + "</section>" +

      '<form id="addVehicleForm" class="form-card">' +
      '<div class="field"><label>Alias</label><input name="alias" type="text" placeholder="' + esc(catalogMode ? catalogDisplayName() : (template ? template.name : profile.name)) + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="catalogYearInput">Año <small>' + (catalogMode && !ui.catalogManual ? "Auto" : "Requerido") + '</small></label>' +
      '<input id="catalogYearInput" name="year" type="number" min="1950" max="2027" value="' + esc(yearValue) + '" placeholder="' + (catalogMode ? "Elige el motor" : "") + '" required></div>' +
      '<div class="field"><label>Kilometraje actual</label><input name="km" type="number" min="0" step="1" value="60000" required></div></div>' +
      '<div class="field"><label>VIN <small>Opcional</small></label><input name="vin" type="text" maxlength="17" placeholder="17 caracteres" style="font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase"></div>' +
      '<div class="form-hint">' + icon(state.pro ? "check" : "lock") + '<span id="componentHint">' + (freeAdd ? "Se crearán " + components.length + " componentes con sus intervalos. Podrás registrar servicios desde el primer día." : "El garaje de la demo incluye 3 vehículos. Activa Pro para añadir más.") + "</span></div>" +
      '<button class="btn btn--primary btn--block" type="submit" style="margin-top:11px">' + icon(freeAdd ? "plus" : "lock") + " Añadir al garaje</button></form>" +

      '<div class="disclaimer">' + icon("info") + "<span>" + (catalogMode ? "Selección automática tipo catálogo: no se consulta la DGT ni un decodificador VIN externo. Revisa el año y guarda." : "Demo: la matrícula se valida y se guarda en tu navegador. El perfil de motor se elige manualmente; no se simula una consulta real a la DGT.") + "</span></div>";
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
    const f = faultsFor(v).find((x) => x.id === id);
    if (!f) return;
    const sev = sevMeta(f.severity);
    const comp = f.part ? v.components.find((c) => c.oem === f.part) : null;
    openSheet(sheetHeader("Fallo documentado · " + vehicleModelLabel(v), f.title) +
      '<div class="sheet-scroll"><div class="chip-row" style="margin-bottom:11px"><span class="tag ' + sev.cls + '">' + sev.label + "</span>" +
      (f.years ? '<span class="chip">' + f.years[0] + "–" + f.years[1] + "</span>" : "") +
      (f.km ? '<span class="chip">' + esc(f.km) + "</span>" : "") +
      '<span class="chip">' + esc(v.engineCode) + "</span></div>" +
      '<div class="sheet-note" style="margin-top:0"><b style="color:var(--text)">Síntoma típico</b><br>' + esc(f.symptom) + "</div>" +
      '<div class="card card--pad" style="margin-top:9px"><span class="mono-label">Comprobación recomendada</span><p class="tiny" style="margin-top:5px;color:var(--dim);line-height:1.55">' + esc(f.check) + "</p>" +
      (f.part ? '<div class="row" style="margin-top:9px"><span class="chip">Ref. ' + esc(f.part) + '</span><span class="chip">' + esc(v.chassis) + "</span></div>" : "") + "</div>" +
      '<div class="fault-source">' + icon("shield") + '<div><span class="mono-label">Fuente verificada</span>' + faultSourceHTML(f) + "</div></div>" +
      '<div class="row" style="margin-top:12px;gap:6px"><button class="btn btn--primary" style="flex:1" data-action="diag-fault" data-id="' + f.id + '">' + icon("mic") + " Grabar este ruido</button>" +
      (comp ? '<button class="btn btn--ghost" style="flex:1" data-action="search-component" data-id="' + comp.id + '">' + icon("search") + " Pieza</button>" : "") + "</div>" +
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
      '<button class="profile-row" data-action="toast" data-msg="Privacidad: el audio y la foto solo se procesan al analizar y no se guardan en la app">' + icon("shield") + "<span>Privacidad y datos</span>" + icon("next") + "</button>" +
      '<button class="btn btn--ghost btn--block" style="margin-top:14px;color:var(--danger);border-color:rgba(255,82,82,.25)" data-action="reset-demo">' + icon("retry") + " Reiniciar demo</button>" +
      '<p class="pro-legal">Prototipo · sin pagos reales.</p></div>');
  }

  function openVehicleSwitcher() {
    const active = currentVehicle();
    const rows = state.vehicles.map((veh, i) => {
      const locked = !state.pro && !!veh.demoLocked;
      return '<button class="veh-option ' + (veh.id === active.id ? "is-active" : "") + '" data-action="' + (locked ? "locked-vehicle" : "switch-vehicle") + '" data-id="' + veh.id + '">' +
        '<img class="vehicle-photo" src="' + esc(vehicleImageSrc(veh)) + '"' + vehiclePhotoAttrs(veh) + ' alt="">' +
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

  function armRecTimer() {
    if (ui.recTimer) clearTimeout(ui.recTimer);
    ui.recTimer = setTimeout(() => {
      if (ui.diagStage === "recording") stopRecording();
    }, (REC_SECONDS + 0.3) * 1000);
  }

  function resetAiState() {
    ui.aiResult = null;
    ui.aiError = "";
    ui.aiBusy = false;
    ui.aiRound = 0;
    ui.aiAnswers = {};
    ui.aiFollowup = "";
    ui.aiFollowupBusy = false;
    ui.aiImage = null;
    ui.aiImageStatus = "idle";
  }

  function resetDiagnosis() {
    stopMedia();
    resetAiState();
    ui.diagStage = "idle";
    ui.visualStage = "idle";
    ui.audioSummary = null;
    ui.audioWav = "";
    ui.pcmChunks = [];
    ui.pcmTotal = 0;
    ui.capturedFrame = "";
    ui.visualMetrics = null;
    ui.cameraError = "";
    if (ui.audioURL) {
      try { URL.revokeObjectURL(ui.audioURL); } catch (err) { /* noop */ }
      ui.audioURL = null;
    }
  }

  function startRecording() {
    if (ui.diagStage === "recording" || ui.micMode === "starting") return;
    resetAiState();
    ui.audioSummary = null;
    ui.audioSamples = [];
    ui.micHzSamples = [];
    ui.micPeakDb = -100;
    ui.micHz = 0;
    ui.micMode = "starting";
    ui.audioUploadName = "";
    ui.pcmChunks = [];
    ui.pcmTotal = 0;
    ui.audioWav = "";
    if (ui.audioURL) {
      try { URL.revokeObjectURL(ui.audioURL); } catch (err) { /* noop */ }
      ui.audioURL = null;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.micMode = "idle";
      ui.aiError = "Este navegador no permite usar el micrófono. Sube un audio grabado.";
      ui.diagStage = "error";
      render();
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
        const processor = ui.audioCtx.createScriptProcessor(4096, 1, 1);
        const mute = ui.audioCtx.createGain();
        mute.gain.value = 0;
        source.connect(processor);
        processor.connect(mute);
        mute.connect(ui.audioCtx.destination);
        processor.onaudioprocess = (event) => {
          if (ui.diagStage !== "recording") return;
          const channel = event.inputBuffer.getChannelData(0);
          const max = Math.floor(PitBoxAI.maxAudioSeconds * (ui.audioCtx ? ui.audioCtx.sampleRate : 48000));
          if (ui.pcmTotal >= max) return;
          const take = channel.length > max - ui.pcmTotal ? channel.subarray(0, max - ui.pcmTotal) : channel;
          ui.pcmChunks.push(new Float32Array(take));
          ui.pcmTotal += take.length;
        };
        ui.processor = processor;
      } catch (err) {
        ui.analyser = null;
        ui.processor = null;
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
      } catch (err) { /* la reproducción es opcional */ }
      ui.recStart = performance.now();
      ui.diagStage = "recording";
      render();
      armRecTimer();
      toast("Micrófono activo · captura real de 8 s", "mic");
    }).catch((err) => {
      const reason = err && err.name === "NotAllowedError" ? "Permiso de micrófono denegado" : "No se pudo abrir el micrófono";
      ui.micMode = "idle";
      ui.aiError = reason + ". Puedes subir un audio grabado.";
      ui.diagStage = "error";
      render();
    });
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
    if (ui.micMode !== "real") { ui.micMode = "idle"; return; }
    let wav = "";
    if (ui.pcmChunks.length) {
      const rate = ui.audioCtx ? ui.audioCtx.sampleRate : 48000;
      wav = PitBoxAI.encodeWav(PitBoxAI.mergedFloat32(ui.pcmChunks), rate);
    }
    const duration = Math.min(REC_SECONDS, Math.max(0.4, (performance.now() - ui.recStart) / 1000));
    ui.audioSummary = {
      real: true,
      uploaded: false,
      peakDb: ui.micPeakDb,
      freq: median(ui.micHzSamples.filter(Boolean)),
      duration: duration,
      sampleRate: ui.audioCtx ? ui.audioCtx.sampleRate : 0,
      ambient: !!ui.ambientFilter,
      band: !!ui.bandFilter
    };
    ui.audioWav = wav;
    ui.pcmChunks = [];
    ui.pcmTotal = 0;
    ui.micMode = "idle";
    ui.micHzSamples = [];
    stopMicCapture(true);
    if (!wav) {
      ui.aiError = "No se pudo procesar el audio del micrófono. Prueba a subir un archivo de audio.";
      ui.diagStage = "error";
      render();
      return;
    }
    runAiAnalysis("audio");
  }

  function captureMetricsText(mode) {
    if (mode === "audio") {
      const s = ui.audioSummary;
      if (!s) return "";
      const bits = [];
      if (s.freq) bits.push("frecuencia dominante aproximada " + Math.round(s.freq) + " Hz");
      if (Number.isFinite(s.peakDb)) bits.push("pico " + s.peakDb.toFixed(1) + " dBFS");
      if (s.duration) bits.push("duración " + s.duration.toFixed(1) + " s");
      return "Audio: " + bits.join(", ") + ". Nivel en dBFS sin calibrar; no es una medición de presión sonora.";
    }
    const m = ui.visualMetrics;
    if (!m) return "";
    return "Foto: " + m.width + "x" + m.height + " px, luminancia media " + Math.round(m.luminance) +
      "/255, nitidez " + m.sharpness.toFixed(1) + ". Calidad de captura " + m.score + "/100.";
  }

  function symptomContext() {
    let text = ui.aiSymptom.trim();
    if (ui.params && ui.params.fault) {
      const fault = faultsFor(currentVehicle()).find((x) => x.id === ui.params.fault);
      if (fault) text = (text ? text + " · " : "") + "Diagnóstico dirigido: " + fault.title + ". " + fault.symptom;
    }
    return text;
  }

  function runAiAnalysis(mode) {
    resetAiState();
    ui.aiBusy = true;
    if (mode === "audio") ui.diagStage = "analyzing";
    else ui.visualStage = "scanning";
    render();
    PitBoxAI.analyze({
      vehicle: currentVehicle(),
      mode: mode,
      symptom: symptomContext(),
      audioBase64: ui.audioWav,
      imageDataUrl: ui.capturedFrame,
      metrics: captureMetricsText(mode),
      partHint: (VISUAL_PARTS.find((p) => p[0] === ui.visualPart) || VISUAL_PARTS[0])[1]
    }).then((result) => {
      ui.aiResult = result;
      ui.aiBusy = false;
      if (mode === "audio") ui.diagStage = "result";
      else ui.visualStage = "result";
      render();
      startIllustration(mode);
    }).catch((err) => {
      ui.aiBusy = false;
      ui.aiError = err && err.message ? err.message : "No se pudo analizar la captura.";
      if (mode === "audio") ui.diagStage = "error";
      else ui.visualStage = "error";
      render();
    });
  }

  function runFollowup() {
    if (!ui.aiResult || ui.aiFollowupBusy) return;
    const answers = Object.keys(ui.aiAnswers)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => "P" + (Number(key) + 1) + ": " + ui.aiAnswers[key]);
    if (ui.aiFollowup.trim()) answers.push(ui.aiFollowup.trim());
    if (!answers.length) {
      toast("Responde al menos una pregunta", "alert");
      return;
    }
    const mode = ui.diagMode === "visual" ? "image" : "audio";
    ui.aiFollowupBusy = true;
    ui.aiError = "";
    render();
    PitBoxAI.analyze({
      vehicle: currentVehicle(),
      mode: mode,
      symptom: symptomContext(),
      audioBase64: ui.audioWav,
      imageDataUrl: ui.capturedFrame,
      metrics: captureMetricsText(mode),
      partHint: (VISUAL_PARTS.find((p) => p[0] === ui.visualPart) || VISUAL_PARTS[0])[1],
      prior: ui.aiResult,
      answer: answers.join(" · ")
    }).then((result) => {
      ui.aiResult = result;
      ui.aiRound += 1;
      ui.aiFollowupBusy = false;
      ui.aiAnswers = {};
      ui.aiFollowup = "";
      render();
      startIllustration(mode);
    }).catch((err) => {
      ui.aiFollowupBusy = false;
      ui.aiError = err && err.message ? err.message : "No se pudo afinar el diagnóstico.";
      render();
    });
  }

  function saveReport(mode) {
    if (!ui.aiResult) return;
    if (!Array.isArray(state.diagnoses)) state.diagnoses = [];
    state.diagnoses.unshift({
      id: uid(),
      vehicleId: currentVehicle().id,
      createdAt: Date.now(),
      date: isoToday(),
      mode: mode,
      symptom: ui.aiSymptom,
      result: ui.aiResult
    });
    state.diagnoses = state.diagnoses.slice(0, 20);
    save();
    toast("Informe guardado en el libro del vehículo", "check");
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
    } else {
      toast("La grabación ya no está disponible en esta sesión", "info");
    }
  }

  function startCamera() {
    if (ui.cameraLive || ui.cameraStarting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.cameraError = "Este navegador no permite abrir la cámara";
      render();
      toast(ui.cameraError + " · usa «Subir una foto»", "alert");
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
      toast(ui.cameraError + " · usa «Subir una foto»", "alert");
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
    if (!ui.cameraLive) {
      toast("Activa la cámara o sube una foto", "info");
      return;
    }
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
    if (!ui.capturedFrame) {
      toast("No se pudo guardar la foto. Prueba otra vez.", "alert");
      return;
    }
    runAiAnalysis("image");
  }

  function handleVisualFile(file) {
    if (!file) return;
    toast("Procesando la foto…", "camera");
    PitBoxAI.imageFileToDataUrl(file).then((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        ui.capturedFrame = dataUrl;
        ui.visualMetrics = imageMetrics(img);
        stopCamera();
        runAiAnalysis("image");
      };
      img.onerror = () => {
        ui.aiError = "No se pudo leer la imagen.";
        ui.visualStage = "error";
        render();
      };
      img.src = dataUrl;
    }).catch((err) => {
      ui.aiError = err && err.message ? err.message : "No se pudo procesar la imagen.";
      ui.visualStage = "error";
      render();
    });
  }

  function handleAudioFile(file) {
    if (!file) return;
    toast("Procesando el audio…", "file");
    PitBoxAI.audioFileToWav(file).then((converted) => {
      if (!converted.wav) throw new Error("El archivo no contiene audio utilizable.");
      ui.audioWav = converted.wav;
      ui.audioUploadName = file.name || "Audio";
      if (ui.audioURL) {
        try { URL.revokeObjectURL(ui.audioURL); } catch (err) { /* noop */ }
      }
      ui.audioURL = URL.createObjectURL(file);
      ui.audioSummary = {
        real: true,
        uploaded: true,
        duration: converted.duration,
        sampleRate: 16000
      };
      ui.micMode = "idle";
      runAiAnalysis("audio");
    }).catch((err) => {
      ui.aiError = err && err.message ? err.message : "No se pudo procesar el audio.";
      ui.diagStage = "error";
      render();
    });
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
    const catalogMode = ui.addMode === "catalog";
    const manualCatalog = catalogMode && catalogUsesManual();
    const gen = catalogMode ? catalogGeneration() : null;
    const eng = catalogMode ? catalogEngine() : null;
    let profile;
    let template = null;
    let brandName = "";
    let modelName = "";
    let version = "";
    let engineLabel = "";
    let displacement = 0;
    let powerCv = 0;
    let kw = 0;
    let gearbox = "";
    let engineCodeInput = "";
    let fuelKey = "gasolina";
    let year;
    if (catalogMode) {
      const readCatalog = (id) => {
        const el = document.getElementById(id);
        return el ? String(el.value || "").trim() : "";
      };
      if (manualCatalog) {
        brandName = (readCatalog("catalogBrandCustom") || ui.catalogBrandCustom).trim();
        modelName = (readCatalog("catalogModelCustom") || ui.catalogModelCustom).trim();
        if (!brandName) {
          toast("Escribe la marca del vehículo", "alert");
          return;
        }
        if (!modelName) {
          toast("Escribe el modelo del vehículo", "alert");
          return;
        }
        const fuelField = readCatalog("catalogFuel");
        fuelKey = DB.fuelProfiles[fuelField] ? fuelField : (DB.fuelProfiles[ui.catalogFuel] ? ui.catalogFuel : "gasolina");
        year = clamp(parseInt(fd.get("year"), 10) || 0, 1950, 2027);
        if (!year) {
          toast("Indica el año del vehículo", "alert");
          return;
        }
        const ccRaw = readCatalog("catalogCc");
        const powerRaw = readCatalog("catalogPower");
        version = readCatalog("catalogVersion");
        gearbox = readCatalog("catalogGearbox");
        engineCodeInput = readCatalog("catalogCode").toUpperCase().replace(/[^A-Z0-9]/g, "");
        displacement = ccRaw ? clamp(parseInt(ccRaw, 10) || 0, 0, 10000) : 0;
        powerCv = powerRaw ? clamp(parseInt(powerRaw, 10) || 0, 0, 2000) : 0;
        kw = powerCv ? Math.round(powerCv * 0.7355) : 0;
        profile = (engineCodeInput ? DB.engineProfiles.find((p) => p.code === engineCodeInput) : null) || DB.fuelProfiles[fuelKey] || DB.fuelProfiles.gasolina;
        const pieces = [];
        if (displacement) pieces.push((displacement / 1000).toFixed(1) + " L");
        pieces.push((DB.fuelProfiles[fuelKey] || DB.fuelProfiles.gasolina).label);
        if (powerCv) pieces.push(powerCv + " CV");
        engineLabel = pieces.join(" ");
      } else {
        if (!eng) {
          toast("Selecciona la marca, la versión y el motor exacto", "alert");
          return;
        }
        brandName = ui.catalogBrand;
        modelName = ui.catalogModel;
        fuelKey = DB.fuelProfiles[eng.fuel] ? eng.fuel : "gasolina";
        year = clamp(parseInt(fd.get("year"), 10) || Math.min(Number(eng.to) || 2026, 2026), 1950, 2027);
        displacement = Number(eng.cc) || 0;
        powerCv = Number(eng.power) || 0;
        kw = engineKw(eng);
        gearbox = eng.gearbox || "";
        engineCodeInput = String(eng.code || "").toUpperCase();
        profile = (engineCodeInput ? DB.engineProfiles.find((p) => p.code === engineCodeInput) : null) || DB.fuelProfiles[fuelKey] || DB.fuelProfiles.gasolina;
        version = gen ? gen.name + (gen.body ? " · " + gen.body : "") : modelName;
        engineLabel = engineFullLabel(eng);
      }
    } else {
      profile = DB.engineProfiles.find((p) => p.code === ui.engineChoice) || DB.engineProfiles[0];
      template = profileTemplate(profile);
      year = clamp(parseInt(fd.get("year"), 10) || profile.year, 1950, 2027);
    }
    const alias = String(fd.get("alias") || "").trim() || (catalogMode ? brandName + " " + modelName : (template ? template.name : profile.name));
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
      trim: catalogMode ? (version || "Datos manuales") : (template ? template.trim : profile.trim),
      year,
      plate,
      vin: vin || "—",
      engineCode: catalogMode ? (engineCodeInput || profile.code) : profile.code,
      engine: catalogMode ? engineLabel : (template ? template.engine : profile.engine),
      chassis: catalogMode ? (gen && gen.chassis ? gen.chassis : profile.chassis) : (template ? template.chassis : profile.chassis),
      power: catalogMode ? (powerCv ? (kw ? kw + " kW / " + powerCv + " CV" : powerCv + " CV") : profile.power) : (template ? template.power : profile.power),
      torque: catalogMode ? profile.torque : (template ? template.torque : profile.torque),
      gearbox: catalogMode ? (gearbox || profile.gearbox) : (template ? template.gearbox : profile.gearbox),
      fuel: catalogMode ? (DB.fuelProfiles[fuelKey] || DB.fuelProfiles.gasolina).label : (template ? template.fuel : profile.fuel),
      oilSpec: catalogMode ? profile.oilSpec : (template ? template.oilSpec : profile.oilSpec),
      km,
      image: PLACEHOLDER_IMAGE,
      accent: profile.accent || "#8e9aa0",
      components,
      services: []
    };
    if (catalogMode) {
      nv.brand = brandName;
      nv.model = modelName;
      if (displacement) nv.displacement = displacement;
      if (gen) {
        nv.generation = gen.name;
        nv.generationCode = gen.code;
        nv.body = gen.body;
        nv.generationYears = generationRange(gen);
      }
      if (eng) nv.engineYears = engineRange(eng);
      if (kw) nv.kw = kw;
    }
    nv.photoKey = window.PitBoxCarImage ? window.PitBoxCarImage.keyFor(nv) : "";
    state.vehicles.push(nv);
    state.currentVehicleId = id;
    save();
    resetCatalogWizard();
    ui.plateValue = "";
    ui.plateValid = false;
    ui.plateDuplicate = false;
    switchTab("garage");
    resolveVehiclePhoto(nv);
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
    if (event.target.closest(".photo-credit")) return;
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
      case "diag-mode": {
        const next = el.dataset.mode === "visual" ? "visual" : "acoustic";
        if (next === ui.diagMode) break;
        resetDiagnosis();
        ui.diagMode = next;
        render();
        break;
      }
      case "diag-start": startRecording(); break;
      case "diag-stop": stopRecording(); break;
      case "diag-reset":
        ui.params = {};
        resetDiagnosis();
        render();
        break;
      case "diag-retry":
        if (ui.audioWav) runAiAnalysis("audio");
        else toast("No queda audio para reintentar", "alert");
        break;
      case "diag-play": playDiagAudio(); break;
      case "diag-save": saveReport("audio"); break;
      case "ai-followup": runFollowup(); break;
      case "ai-answer":
        ui.aiAnswers[el.dataset.q] = el.dataset.value;
        render();
        break;
      case "audio-upload": {
        const input = document.getElementById("audioFileInput");
        if (input) input.click();
        break;
      }
      case "visual-upload": {
        const input = document.getElementById("visualFileInput");
        if (input) input.click();
        break;
      }
      case "visual-part":
        ui.visualPart = el.dataset.part;
        resetDiagnosis();
        render();
        break;
      case "camera-start": startCamera(); break;
      case "visual-capture": captureVisual(); break;
      case "visual-reset":
        resetDiagnosis();
        render();
        break;
      case "visual-retake":
        resetDiagnosis();
        render();
        startCamera();
        break;
      case "visual-retry":
        if (ui.capturedFrame) runAiAnalysis("image");
        else toast("No queda una foto para reintentar", "alert");
        break;
      case "visual-save": saveReport("image"); break;
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
      case "add-mode":
        ui.addMode = el.dataset.mode === "engine" ? "engine" : "catalog";
        render();
        break;
      case "catalog-step": {
        const step = Number(el.dataset.step);
        if (step === 1 && !ui.catalogBrand) break;
        if (step === 2 && !ui.catalogModel) break;
        ui.catalogStep = step;
        ui.catalogSearch[["brand", "model", "engine"][step]] = "";
        ui.catalogScroll = true;
        render();
        break;
      }
      case "catalog-brand":
        ui.catalogBrand = el.dataset.brand || "";
        ui.catalogModel = "";
        ui.catalogGen = -1;
        ui.catalogEng = -1;
        ui.catalogYear = "";
        ui.catalogFuel = "gasolina";
        ui.catalogSearch = { brand: "", model: "", engine: "" };
        ui.catalogStep = 1;
        ui.catalogScroll = true;
        render();
        break;
      case "catalog-generation":
        ui.catalogModel = el.dataset.model || "";
        ui.catalogGen = Number(el.dataset.gen);
        ui.catalogEng = -1;
        ui.catalogYear = "";
        ui.catalogSearch.model = "";
        ui.catalogSearch.engine = "";
        ui.catalogStep = 2;
        ui.catalogScroll = true;
        render();
        break;
      case "catalog-engine": {
        const eng = catalogEngineList()[Number(el.dataset.eng)];
        if (!eng) break;
        ui.catalogEng = Number(el.dataset.eng);
        ui.catalogFuel = DB.fuelProfiles[eng.fuel] ? eng.fuel : "gasolina";
        ui.catalogYear = String(Math.min(Number(eng.to) || 2026, 2026));
        ui.catalogSearch.engine = "";
        ui.catalogStep = 3;
        ui.catalogScroll = true;
        render();
        break;
      }
      case "catalog-reset":
        ui.catalogBrand = "";
        ui.catalogModel = "";
        ui.catalogGen = -1;
        ui.catalogEng = -1;
        ui.catalogYear = "";
        ui.catalogFuel = "gasolina";
        ui.catalogSearch = { brand: "", model: "", engine: "" };
        ui.catalogStep = 0;
        ui.catalogManual = false;
        ui.catalogScroll = true;
        render();
        break;
      case "catalog-manual":
        ui.catalogManual = true;
        ui.catalogStep = 3;
        ui.catalogScroll = true;
        render();
        break;
      case "catalog-catalog":
        ui.catalogManual = false;
        ui.catalogStep = 0;
        ui.catalogScroll = true;
        render();
        break;
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
    if (event.target.matches("[data-ai-symptom]")) {
      ui.aiSymptom = event.target.value;
      return;
    }
    if (event.target.matches("[data-ai-followup]")) {
      ui.aiFollowup = event.target.value;
      return;
    }
    if (event.target.matches("[data-catalog-search]")) {
      const kind = event.target.getAttribute("data-catalog-search");
      ui.catalogSearch[kind] = event.target.value;
      const box = document.getElementById("catalogList");
      if (box) {
        box.innerHTML = kind === "brand" ? catalogBrandListHTML() : kind === "model" ? catalogModelListHTML() : catalogEngineListHTML();
      }
      return;
    }
    if (event.target.id === "catalogYearInput") {
      ui.catalogYear = event.target.value;
      return;
    }
    if (event.target.id === "catalogBrandCustom") {
      ui.catalogBrandCustom = event.target.value;
      syncCatalogFields();
      return;
    }
    if (event.target.id === "catalogModelCustom") {
      ui.catalogModelCustom = event.target.value;
      syncCatalogFields();
      return;
    }
    if (event.target.id === "catalogVersion") {
      ui.catalogVersion = event.target.value;
      return;
    }
    if (event.target.id === "catalogCc") {
      ui.catalogCc = event.target.value;
      syncCatalogFields();
      return;
    }
    if (event.target.id === "catalogPower") {
      ui.catalogPower = event.target.value;
      syncCatalogFields();
      return;
    }
    if (event.target.id === "catalogGearbox") {
      ui.catalogGearbox = event.target.value;
      syncCatalogFields();
      return;
    }
    if (event.target.id === "catalogCode") {
      ui.catalogCode = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      syncCatalogFields();
      return;
    }
    if (event.target.matches("[data-search]")) {
      ui.partsQuery = event.target.value;
      updatePartsResults(ui.partsQuery);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "visualFileInput") {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      handleVisualFile(file);
      return;
    }
    if (event.target.id === "audioFileInput") {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      handleAudioFile(file);
      return;
    }
    if (event.target.id === "catalogFuel") {
      ui.catalogFuel = event.target.value;
      syncCatalogFields();
      return;
    }
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

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !/[?&]dev=1/.test(location.search)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* SW opcional: la app funciona sin él */ });
  }

  render();
  hydrateCarPhotos();
  if (boot.get("cert") === "1") openCertSheet();
})();
