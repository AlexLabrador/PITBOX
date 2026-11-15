/*
 * Backend interno de PITBOX para el análisis de audio e imagen.
 *
 * La app llama siempre a POST /api/ai: no conoce modelos, claves ni proveedor.
 * Despliega este worker en la misma ruta /api/ai del dominio donde publiques
 * la app (Cloudflare Worker con la ruta configurada) y define el secreto
 * GEMINI_API_KEY. Opcional: TEXT_MODEL, IMAGE_MODEL y ALLOWED_ORIGIN.
 *
 * Añade rate limiting en Cloudflare antes de abrirlo al público: sin límite,
 * cualquiera puede consumir tu cuota.
 */

const MAX_BODY = 12 * 1024 * 1024;
const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({}, headers, { "Content-Type": "application/json" })
  });
}

export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);

    const url = new URL(request.url);
    if (url.pathname !== "/api/ai" && url.pathname !== "/") {
      return json({ error: "not_found" }, 404, headers);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "not_configured" }, 503, headers);
    }

    const body = await request.text();
    if (body.length > MAX_BODY) return json({ error: "payload_too_large" }, 413, headers);

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      return json({ error: "invalid_json" }, 400, headers);
    }

    const modalities = payload && payload.generationConfig && payload.generationConfig.responseModalities;
    const wantsImage = Array.isArray(modalities) && modalities.indexOf("IMAGE") !== -1;
    const model = wantsImage
      ? (env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL)
      : (env.TEXT_MODEL || DEFAULT_TEXT_MODEL);

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: body
      }
    );

    if (!upstream.ok) {
      return json({ error: "analysis_failed" }, upstream.status, headers);
    }
    return new Response(await upstream.text(), {
      status: 200,
      headers: Object.assign({}, headers, { "Content-Type": "application/json" })
    });
  }
};
