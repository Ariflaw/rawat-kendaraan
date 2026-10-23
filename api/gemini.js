module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY belum dikonfigurasi di Vercel.' });
    }

    const { base64Image } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan.' });
    }

    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `Analisis foto nota/struk servis kendaraan ini.
    Ekstrak data dan kembalikan HANYA format JSON valid tanpa tanda backtick Markdown seperti contoh berikut:
    {
      "date": "YYYY-MM-DD",
      "km": 12000,
      "shop": "Nama Bengkel",
      "note": "Catatan ringkas",
      "items": [
        {"name": "Oli mesin", "price": 50000}
      ]
    }`;

    // Menggunakan model gemini-2.5-flash sesuai anjuran sistem Google
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Gagal memproses gambar dari Google API.');
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return res.status(200).json({ success: true, data: data });
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal memproses gambar.' });
  }
};
