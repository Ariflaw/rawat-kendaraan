const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY belum dikonfigurasi di Vercel Environment Variables.' });
    }

    const { base64Image } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan atau ukuran terlalu besar.' });
    }

    const base64Data = base64Image.split(',')[1] || base64Image;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Ganti menggunakan model gemini-1.5-flash yang stabil
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return res.status(200).json({ success: true, data: data });
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal memproses gambar.' });
  }
};
