// Cloudflare Pages Function: functions/api/scan-invoice.js
// Accessible at /api/scan-invoice
// Runs on Cloudflare's edge, keeps the Gemini API key secret, solves CORS.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response("", { status: 200, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return new Response(JSON.stringify({ error: "Missing image data" }), { status: 400, headers: CORS });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server is missing GEMINI_API_KEY. Add it in Cloudflare Pages environment variables." }), { status: 500, headers: CORS });
    }

    const prompt = `You are an expert at reading Georgian supplier waybills (სასაქონლო ზედნადები) and invoices.
Extract all product lines from the table in this document. The table columns are typically:
# | product name (საქონლის დასახელება) | code (საქონლის კოდი) | unit (ერთეული) | quantity (რაოდენობა) | unit price (ერთეულის ფასი) | total price (ფასი)

For each product row, extract:
- name: the product name as written (could be Georgian or English or mixed)
- nameEn: English translation of the product name
- nameKa: Georgian translation of the product name
- code: the product barcode or code (საქონლის კოდი) if present, otherwise null
- price: the UNIT PRICE (ერთეულის ფასი) as a number, NOT the total
- unit: the unit of measurement (კგ, ცალი, ლ, etc)

Return ONLY a raw JSON array with no markdown, no code blocks, no explanation. Example:
[{"name":"TRUFFLE SAUCE","nameEn":"Truffle Sauce","nameKa":"ტრიუფელის სოუსი","code":"8056515242444","price":52.00,"unit":"ცალი"}]`;

    const geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8000,
      },
    });

    // Retry Gemini up to 3 times on transient overload / 429 / 5xx
    let geminiResponse, geminiData;
    for (let attempt = 0; attempt < 3; attempt++) {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        }
      );
      geminiData = await geminiResponse.json();
      if (geminiResponse.ok) break;
      const status = geminiResponse.status;
      const transient = status === 429 || status === 503 || status >= 500;
      if (!transient || attempt === 2) break;
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 2500));
    }

    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ error: geminiData.error?.message || "Gemini API error" }), { status: geminiResponse.status, headers: CORS });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start === -1 || end === -1) {
      return new Response(JSON.stringify({ error: `Gemini returned no JSON array. Raw: ${text.substring(0, 300)}` }), { status: 500, headers: CORS });
    }

    let items;
    try {
      items = JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      return new Response(JSON.stringify({ error: `Could not parse Gemini's response as JSON. Raw: ${text.substring(0, 300)}` }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ items }), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Unknown server error" }), { status: 500, headers: CORS });
  }
}
