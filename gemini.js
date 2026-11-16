// EdgeOne Pages Edge Function: /api/gemini
// Environment variables di EdgeOne Pages (Project > Settings > Environment Variables):
//   GEMINI_API_KEY (wajib)
//   GEMINI_MODEL   (opsional; sesuai model di Google AI Studio, mis. gemini-4-hydrogen)

const SYSTEM_INSTRUCTION = `Kamu adalah Asisten AI Kasir & Pembukuan untuk toko olahraga "Surya Jaya Sport".
Tugasmu membantu kasir mencatat penjualan, menambah produk, dan memperbarui stok, serta menjawab pertanyaan tentang data toko.

Balas HANYA dalam JSON valid, tanpa markdown, dengan struktur:
{
  "aksi": "penjualan" | "tambah_produk" | "update_stok" | "tanya_jawab",
  "pesan_balasan": "kalimat singkat dan ramah untuk kasir dalam Bahasa Indonesia",
  "data": {
    "nama_barang": "string atau null",
    "kategori": "string atau null",
    "harga": number atau null,
    "qty": number atau null,
    "metode_bayar": "Cash" | "QRIS" | "Kartu" | "Transfer" | null
  }
}

Arti setiap aksi:
- "penjualan": barang dijual. qty = jumlah terjual, harga = harga jual satuan (kosongkan jika tidak disebut), metode_bayar sesuai yang disebut (default "Cash").
- "tambah_produk": produk baru. qty = stok awal, harga = harga jual, kategori wajib diisi jika disebut.
- "update_stok": ubah stok barang yang sudah ada. qty = JUMLAH STOK BARU (bukan selisih).
- "tanya_jawab": pertanyaan atau ringkasan, atau perintah yang datanya belum lengkap. Dalam kasus data kurang, tulis di pesan_balasan data apa yang masih dibutuhkan.

Aturan:
- Jangan mengarang nama barang. Gunakan nama yang disebut pengguna.
- Jika nama barang atau jumlah tidak jelas, pilih "tanya_jawab" dan minta klarifikasi.
- Jawab pertanyaan tentang stok dan penjualan HANYA dari data konteks toko yang diberikan.
- Semua uang dalam Rupiah.`;

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: "GEMINI_API_KEY belum diatur di EdgeOne Pages." });

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "Permintaan tidak valid" });
  }

  const prompt = String(body.prompt || "").slice(0, 1000);
  if (!prompt.trim()) return json(400, { error: "Perintah kosong" });
  const konteks = String(body.konteks || "").slice(0, 6000);

  const model = context.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemText = `${SYSTEM_INSTRUCTION}\n\nData konteks toko (JSON):\n${konteks || "(tidak ada)"}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      return json(res.status, { error: result.error?.message || "Gagal menghubungi Gemini API" });
    }

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return json(502, { error: "Jawaban AI tidak bisa dibaca. Coba ulangi perintahnya." });
    }
    return json(200, parsed);
  } catch (err) {
    return json(500, { error: "Gagal menghubungi layanan AI" });
  }
}
