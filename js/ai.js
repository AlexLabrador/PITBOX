/* PITBOX — análisis interno de audio e imagen */
(function () {
  "use strict";

  const ENDPOINT = "/api/ai";
  const MAX_AUDIO_SECONDS = 20;
  const REQUEST_TIMEOUT = 60000;

  const URGENCIAS = ["baja", "media", "alta", "inmediata"];
  const GRAVEDADES = ["leve", "moderada", "grave"];

  function endpoint() {
    const override = typeof window !== "undefined" && window.PITBOX_AI_ENDPOINT;
    return String(override || ENDPOINT).replace(/\/+$/, "");
  }

  async function callModel(payload, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || REQUEST_TIMEOUT);
    let response;
    try {
      response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") throw new Error("El análisis tardó demasiado. Inténtalo otra vez.");
      throw new Error("No se pudo completar el análisis. Revisa tu conexión e inténtalo de nuevo.");
    }
    clearTimeout(timer);
    if (!response.ok) {
      try {
        const detail = await response.text();
        if (window.console && console.warn) console.warn("PITBOX analysis", response.status, String(detail).slice(0, 300));
      } catch (err) { /* sin cuerpo de error */ }
      throw new Error(httpMessage(response.status));
    }
    try {
      return await response.json();
    } catch (err) {
      throw new Error("No se pudo completar el análisis. Inténtalo de nuevo.");
    }
  }

  function httpMessage(status) {
    if (status === 400) return "No se pudo interpretar la captura. Prueba con otra foto o audio.";
    if (status === 429) return "Hay demasiadas solicitudes. Espera un momento y vuelve a intentarlo.";
    if (status === 413) return "La captura es demasiado grande. Prueba con un audio o una foto más cortos.";
    if (status >= 500) return "El análisis no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.";
    if (status === 401 || status === 403 || status === 404 || status === 405) return "El análisis no está disponible en este momento.";
    return "No se pudo completar el análisis. Inténtalo de nuevo.";
  }

  function vehicleContext(v) {
    if (!v) return "Vehículo no especificado.";
    const rows = [
      ["Marca", v.brand],
      ["Modelo", v.model],
      ["Versión", v.version],
      ["Año", v.year],
      ["Kilometraje", v.km ? Math.round(Number(v.km)) + " km" : ""],
      ["Motor", v.engine],
      ["Código de motor", v.engineCode],
      ["Cilindrada", v.displacement ? v.displacement + " cc" : ""],
      ["Potencia", v.power],
      ["Combustible", v.fuel],
      ["Cambio", v.gearbox]
    ].filter((row) => row[1]);
    return rows.map((row) => "- " + row[0] + ": " + row[1]).join("\n");
  }

  const SYSTEM_PROMPT = [
    "Eres un asistente de diagnóstico preliminar para conductores sin conocimientos de mecánica.",
    "No eres un mecánico, no puedes certificar una avería y no sustituyes una inspección física.",
    "Tu trabajo es interpretar la evidencia de una foto o un audio y proponer posibilidades ordenadas por probabilidad, con comprobaciones sencillas que el usuario pueda hacer o pedir en un taller.",
    "",
    "Reglas estrictas:",
    "1. Usa solo lo que se ve o se oye y el contexto del vehículo. No inventes datos, medidas ni códigos de avería.",
    "2. Si la imagen no muestra una pieza de coche o el audio no contiene un ruido mecánico, dilo con claridad y baja la confianza. Ignora voces, música o conversaciones.",
    "3. Devuelve entre 1 y 3 hallazgos. Las probabilidades son estimaciones, no certezas, y no deben sumar más de 100.",
    "4. No estimes milímetros de desgaste, presión exacta ni temperatura. Puedes describir desgaste, óxido, deformación, grietas, fugas, brillo o color.",
    "5. En frenos, neumáticos, dirección o suspensión, prioriza la seguridad: indica si no debería circular.",
    "6. Las comprobaciones deben ser concretas, seguras y sin desmontar piezas críticas.",
    "7. Las preguntas deben discriminar entre las hipótesis y tener opciones cortas. Máximo 3.",
    "8. Escribe en español de España, con lenguaje sencillo, sin tecnicismos innecesarios.",
    "9. Devuelve únicamente el JSON que cumple el esquema. Sin markdown, sin texto adicional.",
    "",
    "Contexto del vehículo:",
    "{VEHICLE}",
    "",
    "Modo de captura: {MODE}",
    "{MODE_HINT}",
    "Síntoma descrito por el usuario: {SYMPTOM}",
    "Mediciones del dispositivo: {METRICS}"
  ].join("\n");

  const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
      resumen: { type: "STRING" },
      confianza: { type: "INTEGER" },
      urgencia: { type: "STRING", enum: URGENCIAS },
      hallazgos: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            componente: { type: "STRING" },
            sospecha: { type: "STRING" },
            probabilidad: { type: "INTEGER" },
            evidencia: { type: "STRING" },
            gravedad: { type: "STRING", enum: GRAVEDADES },
            accion: { type: "STRING" }
          },
          required: ["componente", "sospecha", "probabilidad", "evidencia", "gravedad", "accion"]
        }
      },
      comprobaciones: { type: "ARRAY", items: { type: "STRING" } },
      preguntas: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            pregunta: { type: "STRING" },
            opciones: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["pregunta", "opciones"]
        }
      },
      no_concluyente: { type: "STRING" },
      coste: { type: "STRING" },
      aviso: { type: "STRING" }
    },
    required: ["resumen", "confianza", "urgencia", "hallazgos", "comprobaciones", "no_concluyente", "aviso"]
  };

  function clip(value, max) {
    const s = String(value == null ? "" : value).trim();
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  function modeCopy(mode, partHint) {
    if (mode === "audio") {
      return {
        label: "Audio del vehículo grabado con el micrófono del teléfono",
        hint: "Analiza el sonido como evidencia acústica: chirridos, golpeteos, soplidos, zumbidos, rozamientos o variaciones al acelerar o girar. Describe el patrón y su cadencia, no transcribas el audio."
      };
    }
    return {
      label: "Foto tomada por el usuario con la cámara del teléfono",
      hint: "Analiza la imagen como evidencia visual. Zona indicada por el usuario: " + (partHint || "sin indicar") + ". Describe forma, color, desgaste, óxido, deformación, grietas, fugas o elementos sueltos que se vean."
    };
  }

  function buildUserText(opts) {
    const mode = opts.mode === "audio" ? "audio" : "image";
    const copy = modeCopy(mode, opts.partHint);
    const vehicle = vehicleContext(opts.vehicle);
    const metrics = opts.metrics ? clip(opts.metrics, 240) : "sin mediciones adicionales";
    const symptom = opts.symptom ? clip(opts.symptom, 400) : "no indicado";
    const system = SYSTEM_PROMPT
      .replace("{VEHICLE}", vehicle)
      .replace("{MODE}", copy.label)
      .replace("{MODE_HINT}", copy.hint)
      .replace("{SYMPTOM}", symptom)
      .replace("{METRICS}", metrics);
    return { system: system, user: "Analiza la captura adjunta y devuelve el diagnóstico preliminar en el JSON acordado." };
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function resample(samples, fromRate, toRate) {
    if (!samples.length || !fromRate || fromRate === toRate) return samples;
    const ratio = fromRate / toRate;
    const length = Math.max(1, Math.floor(samples.length / ratio));
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = samples[idx] || 0;
      const b = samples[idx + 1] != null ? samples[idx + 1] : a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function encodeWav(samples, sampleRate) {
    if (!samples || !samples.length) return "";
    const rate = 16000;
    const data = resample(samples, sampleRate || 48000, rate);
    const buffer = new ArrayBuffer(44 + data.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + data.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, data.length * 2, true);
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return bytesToBase64(new Uint8Array(buffer));
  }

  function mergedFloat32(chunks) {
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    chunks.forEach((c) => { out.set(c, offset); offset += c.length; });
    return out;
  }

  async function audioFileToWav(file) {
    if (!window.AudioContext && !window.webkitAudioContext) throw new Error("Este navegador no puede procesar audio.");
    const Ctor = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctor();
    try {
      const buffer = await file.arrayBuffer();
      let decoded;
      try {
        decoded = await ctx.decodeAudioData(buffer.slice(0));
      } catch (err) {
        throw new Error("No se pudo leer ese audio. Prueba con un archivo WAV, MP3 o M4A.");
      }
      const channel = decoded.getChannelData(0);
      const max = Math.floor(MAX_AUDIO_SECONDS * decoded.sampleRate);
      const samples = channel.length > max ? channel.subarray(0, max) : channel;
      return { wav: encodeWav(samples, decoded.sampleRate), duration: samples.length / decoded.sampleRate };
    } finally {
      try { ctx.close(); } catch (err) { /* noop */ }
    }
  }

  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        try { resolve(canvas.toDataURL("image/jpeg", 0.85)); } catch (err) { reject(new Error("No se pudo procesar la imagen.")); }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("El archivo no es una imagen compatible."));
      };
      img.src = url;
    });
  }

  function stripDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
  }

  function parseJson(text) {
    let clean = String(text || "").trim();
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
    return JSON.parse(clean);
  }

  function textFromResponse(data) {
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    return parts.filter((p) => p && p.text && !p.thought).map((p) => p.text).join("").trim();
  }

  function normalize(result) {
    const out = {
      resumen: clip(result.resumen, 600),
      confianza: Math.max(0, Math.min(100, Math.round(Number(result.confianza) || 0))),
      urgencia: URGENCIAS.includes(result.urgencia) ? result.urgencia : "media",
      hallazgos: [],
      comprobaciones: [],
      preguntas: [],
      no_concluyente: clip(result.no_concluyente, 500),
      coste: clip(result.coste, 160),
      aviso: clip(result.aviso, 400) || "Diagnóstico orientativo. Confirma siempre con un mecánico antes de sustituir piezas."
    };
    (Array.isArray(result.hallazgos) ? result.hallazgos : []).slice(0, 3).forEach((h) => {
      if (!h) return;
      out.hallazgos.push({
        componente: clip(h.componente, 90) || "Componente sin identificar",
        sospecha: clip(h.sospecha, 220),
        probabilidad: Math.max(0, Math.min(100, Math.round(Number(h.probabilidad) || 0))),
        evidencia: clip(h.evidencia, 320),
        gravedad: GRAVEDADES.includes(h.gravedad) ? h.gravedad : "moderada",
        accion: clip(h.accion, 320)
      });
    });
    if (!out.hallazgos.length) out.hallazgos.push({
      componente: "Sin identificación clara",
      sospecha: "La captura no aporta evidencia suficiente",
      probabilidad: 0,
      evidencia: out.no_concluyente || "No se detecta un patrón claro.",
      gravedad: "leve",
      accion: "Repite la captura con más luz, más cerca y sin ruido de fondo."
    });
    out.hallazgos.sort((a, b) => b.probabilidad - a.probabilidad);
    out.comprobaciones = (Array.isArray(result.comprobaciones) ? result.comprobaciones : []).slice(0, 6).map((s) => clip(s, 220)).filter(Boolean);
    out.preguntas = (Array.isArray(result.preguntas) ? result.preguntas : []).slice(0, 3).map((q) => ({
      pregunta: clip(q && q.pregunta, 200),
      opciones: (q && Array.isArray(q.opciones) ? q.opciones : []).slice(0, 4).map((o) => clip(o, 60)).filter(Boolean)
    })).filter((q) => q.pregunta);
    return out;
  }

  async function analyze(opts) {
    const mode = opts.mode === "audio" ? "audio" : "image";
    const copy = buildUserText(Object.assign({}, opts, { mode: mode }));
    const parts = [{ text: copy.user }];
    if (mode === "audio") {
      if (!opts.audioBase64) throw new Error("No hay audio que analizar.");
      parts.push({ inlineData: { mimeType: "audio/wav", data: opts.audioBase64 } });
    } else {
      const image = stripDataUrl(opts.imageDataUrl);
      if (!image) throw new Error("No hay una foto válida que analizar.");
      parts.push({ inlineData: image });
    }
    const contents = [{ role: "user", parts: parts }];
    if (opts.prior && opts.answer) {
      contents.push({ role: "model", parts: [{ text: JSON.stringify(opts.prior) }] });
      contents.push({ role: "user", parts: [{ text: "El usuario responde a tus preguntas: " + clip(opts.answer, 700) + ". Reajusta el diagnóstico con esta información. Devuelve el JSON completo actualizado." }] });
    }
    const payload = {
      systemInstruction: { parts: [{ text: copy.system }] },
      contents: contents,
      generationConfig: {
        temperature: 0.15,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    };
    const data = await callModel(payload);
    const text = textFromResponse(data);
    if (!text) throw new Error("No se obtuvo un diagnóstico. Prueba con otra captura.");
    let parsed;
    try { parsed = parseJson(text); } catch (err) {
      throw new Error("No se pudo interpretar la respuesta. Vuelve a intentarlo.");
    }
    return normalize(parsed);
  }

  const ILLO_CACHE = new Map();

  function illustrationPrompt(mode, component, suspicion) {
    const subject = clip(component || "pieza del coche", 90);
    const issue = clip(suspicion || "desgaste visible", 140);
    return "Ilustración técnica editorial para una app de mantenimiento de coches. " +
      "Muestra de forma clara y didáctica: " + subject + ". Problema probable: " + issue + ". " +
      "Estilo vectorial limpio, sombras suaves, fondo neutro oscuro, vista de detalle. " +
      "Sin texto, sin letras, sin números, sin logotipos, sin marcas, sin personas. " +
      "No es una foto real; debe leerse como un esquema ilustrativo.";
  }

  async function generatedIllustration(prompt) {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] }
    };
    let data;
    try {
      data = await callModel(body, 50000);
    } catch (err) {
      body.generationConfig.responseModalities = ["TEXT", "IMAGE"];
      data = await callModel(body, 50000);
    }
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    for (const part of parts) {
      const inline = part && (part.inlineData || part.inline_data);
      if (inline && inline.data) {
        return "data:" + (inline.mimeType || inline.mime_type || "image/png") + ";base64," + inline.data;
      }
    }
    return "";
  }

  const WIKI_QUERIES = {
    tyre: "Neumático",
    disc: "Freno de disco",
    pads: "Pastilla de freno",
    engine: "Motor de combustión interna",
    leak: "Fuga de aceite",
    suspension: "Suspensión (automóvil)",
    steering: "Dirección asistida",
    other: "Automóvil"
  };

  async function wikiImage(query, lang) {
    const q = clip(query || "Automóvil", 60);
    const url = "https://" + (lang || "es") + ".wikipedia.org/w/api.php?action=query&format=json&origin=*" +
      "&generator=search&gsrsearch=" + encodeURIComponent(q) + "&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=720";
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    const pages = data && data.query && data.query.pages;
    if (!pages) return "";
    const first = Object.keys(pages).map((k) => pages[k])[0];
    return (first && first.thumbnail && first.thumbnail.source) || "";
  }

  async function illustrate(opts) {
    const key = (opts.component || "") + "|" + (opts.suspicion || "");
    if (ILLO_CACHE.has(key)) return ILLO_CACHE.get(key);
    let image = "";
    let source = "ai";
    try {
      image = await generatedIllustration(illustrationPrompt(opts.mode, opts.component, opts.suspicion));
    } catch (err) {
      image = "";
    }
    if (!image) {
      source = "wiki";
      const fallbackQuery = WIKI_QUERIES[opts.part] || opts.component || "Automóvil";
      try { image = await wikiImage(opts.component || fallbackQuery); } catch (err) { image = ""; }
      if (!image) {
        try { image = await wikiImage(fallbackQuery); } catch (err) { image = ""; }
      }
      if (!image) {
        try { image = await wikiImage(fallbackQuery, "en"); } catch (err) { image = ""; }
      }
    }
    const result = image ? { url: image, source: source } : null;
    ILLO_CACHE.set(key, result);
    return result;
  }

  window.PitBoxAI = {
    analyze: analyze,
    illustrate: illustrate,
    encodeWav: encodeWav,
    mergedFloat32: mergedFloat32,
    audioFileToWav: audioFileToWav,
    imageFileToDataUrl: imageFileToDataUrl,
    maxAudioSeconds: MAX_AUDIO_SECONDS
  };
})();
