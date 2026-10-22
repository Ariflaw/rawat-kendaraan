// api/gemini.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Atur Header CORS agar bisa dipanggil frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'Gambar base64 tidak ditemukan' });
    }

    // Ambil API Key dari Environment Variable Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'API Key Gemini belum diset di Vercel.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = "Analisis foto nota/faktur bengkel servis kendaraan ini. " +
      "Ekstrak data dalam format JSON murni TANPA tanda markdown/backticks (seperti ```json): " +
      "{" +
      "  \"date\": \"YYYY-MM-DD\"," +
      "  \"km\": nomor_km_jika_ada_atau_0," +
      "  \"shop\": \"Nama Bengkel\"," +
      "  \"note\": \"Catatan singkat / nomor plat / tipe kendaraan\"," +
      "  \"items\": [{\"name\": \"Nama Komponen/Suku Cadang\", \"price\": nominal_angka}]," +
      "  \"extraItems\": [{\"name\": \"Nama Jasa Servis/Lainnya\", \"price\": nominal_angka}]" +
      "}";

    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: result.error?.message || 'Gagal dari Gemini AI' });
    }

    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ success: false, error: 'Respon dari AI Gemini kosong.' });
    }

    let textResponse = result.candidates[0].content.parts[0].text;
    let cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

    const firstOpen = cleanJson.indexOf('{');
    const lastClose = cleanJson.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
    }

    const parsedData = JSON.parse(cleanJson);
    return res.status(200).json({ success: true, data: parsedData });

  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error: ' + e.toString() });
  }
}
