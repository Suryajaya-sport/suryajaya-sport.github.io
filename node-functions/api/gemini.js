<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name=claude:viewport-fit-sides content=cover><style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}</style><style>.md-table{overflow-x:auto}@media print{.md-table{overflow-x:visible}}</style><style>:root{color-scheme:light dark;--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)}@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)}}:root[data-theme="dark"]{color-scheme:dark;--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)}:root[data-theme="light"]{color-scheme:light}@media print{:root,:root[data-theme="dark"]{color-scheme:light;--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)}}body{background:var(--md-bg);color:var(--md-text);max-width:720px;margin:0 auto;padding:32px;display:flex;flex-direction:column;gap:10px;font:14px/1.55 -apple-system,BlinkMacSystemFont,'SF Pro','Segoe UI',sans-serif;overflow-wrap:break-word}body>:first-child{margin-top:0}h1,h2,h3,h4,h5,h6{margin:6px 0 0;line-height:1.25;font-weight:600;text-wrap:balance}h1{font-size:1.35em}h2{font-size:1.15em;color:var(--md-muted)}h3,h4,h5,h6{font-size:1em}p,ul,ol,blockquote,table,pre,hr{margin:0}strong{font-weight:600}a{color:var(--md-link);text-decoration:none}a:hover{text-decoration:underline}ul,ol{display:flex;flex-direction:column;gap:6px;padding-left:22px}ul{list-style:disc}ol{list-style:decimal}:is(li,td,th)>*+:is(p,ul,ol,blockquote){margin-top:6px}blockquote{display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--md-rule);padding-left:10px;color:var(--md-muted)}:not(pre)>code{background:var(--md-fill);padding:1px 3px;border-radius:4px;font:.92em 'SF Mono',ui-monospace,Menlo,Consolas,monospace}a>code{background:none;color:inherit}pre{background:var(--md-fill);padding:10px 12px;border-radius:6px;overflow-x:auto;font:12px/1.5 'SF Mono',ui-monospace,Menlo,Consolas,monospace;margin-block:4px}pre code{background:none;padding:0;font:inherit}table{width:100%;border-collapse:separate;border-spacing:2px;font:inherit}th,td{padding:6px 8px;border-radius:3px;text-align:left;vertical-align:top}th{background:var(--md-fill-strong);font-weight:600}td{background:var(--md-fill)}:is(th,td) :not(pre)>code{background:transparent}hr{border:0;border-top:1px solid var(--md-rule-strong);margin-block:10px}img{max-width:100%;height:auto;border-radius:4px}</style>
</head><body>
<pre><code>// EdgeOne Pages Edge Function: /api/gemini
// Environment variables di EdgeOne Pages (Project &gt; Settings &gt; Environment Variables):
//   GEMINI_API_KEY (wajib)
//   GEMINI_MODEL   (opsional; sesuai model di Google AI Studio, mis. gemini-4-hydrogen)

const SYSTEM_INSTRUCTION = `Kamu adalah Asisten AI Kasir &amp; Pembukuan untuk toko olahraga &#34;Surya Jaya Sport&#34;.
Tugasmu membantu kasir mencatat penjualan, menambah produk, dan memperbarui stok, serta menjawab pertanyaan tentang data toko.

Balas HANYA dalam JSON valid, tanpa markdown, dengan struktur:
{
  &#34;aksi&#34;: &#34;penjualan&#34; | &#34;tambah_produk&#34; | &#34;update_stok&#34; | &#34;tanya_jawab&#34;,
  &#34;pesan_balasan&#34;: &#34;kalimat singkat dan ramah untuk kasir dalam Bahasa Indonesia&#34;,
  &#34;data&#34;: {
    &#34;nama_barang&#34;: &#34;string atau null&#34;,
    &#34;kategori&#34;: &#34;string atau null&#34;,
    &#34;harga&#34;: number atau null,
    &#34;qty&#34;: number atau null,
    &#34;metode_bayar&#34;: &#34;Cash&#34; | &#34;QRIS&#34; | &#34;Kartu&#34; | &#34;Transfer&#34; | null
  }
}

Arti setiap aksi:
- &#34;penjualan&#34;: barang dijual. qty = jumlah terjual, harga = harga jual satuan (kosongkan jika tidak disebut), metode_bayar sesuai yang disebut (default &#34;Cash&#34;).
- &#34;tambah_produk&#34;: produk baru. qty = stok awal, harga = harga jual, kategori wajib diisi jika disebut.
- &#34;update_stok&#34;: ubah stok barang yang sudah ada. qty = JUMLAH STOK BARU (bukan selisih).
- &#34;tanya_jawab&#34;: pertanyaan atau ringkasan, atau perintah yang datanya belum lengkap. Dalam kasus data kurang, tulis di pesan_balasan data apa yang masih dibutuhkan.

Aturan:
- Jangan mengarang nama barang. Gunakan nama yang disebut pengguna.
- Jika nama barang atau jumlah tidak jelas, pilih &#34;tanya_jawab&#34; dan minta klarifikasi.
- Jawab pertanyaan tentang stok dan penjualan HANYA dari data konteks toko yang diberikan.
- Semua uang dalam Rupiah.`;

const json = (status, obj) =&gt;
  new Response(JSON.stringify(obj), {
    status,
    headers: { &#34;Content-Type&#34;: &#34;application/json&#34; },
  });

export async function onRequestPost(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: &#34;GEMINI_API_KEY belum diatur di EdgeOne Pages.&#34; });

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: &#34;Permintaan tidak valid&#34; });
  }

  const prompt = String(body.prompt || &#34;&#34;).slice(0, 1000);
  if (!prompt.trim()) return json(400, { error: &#34;Perintah kosong&#34; });
  const konteks = String(body.konteks || &#34;&#34;).slice(0, 6000);

  const model = context.env.GEMINI_MODEL || &#34;gemini-3.8-flash&#34;;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemText = `${SYSTEM_INSTRUCTION}\n\nData konteks toko (JSON):\n${konteks || &#34;(tidak ada)&#34;}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(50000),
      method: &#34;POST&#34;,
      headers: { &#34;Content-Type&#34;: &#34;application/json&#34; },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: &#34;user&#34;, parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: &#34;application/json&#34; },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      const region = context.server?.region || &#34;tidak diketahui&#34;;
      return json(res.status, { error: (result.error?.message || &#34;Gagal menghubungi Gemini API&#34;) + ` (region server: ${region})` });
    }

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || &#34;{}&#34;;
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return json(502, { error: &#34;Jawaban AI tidak bisa dibaca. Coba ulangi perintahnya.&#34; });
    }
    return json(200, parsed);
  } catch (err) {
    const timeout = err &amp;&amp; (err.name === &#34;TimeoutError&#34; || err.name === &#34;AbortError&#34;);
    return json(504, { error: timeout ? &#34;AI terlalu lama merespons. Coba lagi.&#34; : &#34;Gagal menghubungi layanan AI: &#34; + (err &amp;&amp; err.message ? err.message : &#34;&#34;) });
  }
}

</code></pre>

</body></html>
