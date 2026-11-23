#!/usr/bin/env python3
"""Terapkan perbaikan ke index.html Surya Jaya Sport.
Pakai:  python3 patch_sjs.py index.html
Hasil:  index.html diperbarui, salinan lama disimpan sebagai index.backup.html
Setiap perubahan diperiksa: jika teks lama tidak ditemukan tepat satu kali, skrip berhenti tanpa mengubah apa pun.
"""
import sys, shutil

path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
src = open(path, encoding="utf-8").read()

P = []  # (nama, lama, baru)

# 1. CSS cetak
P.append(("CSS cetak",
r'''#receiptPrintSheet, #stickerPrintSheet { display: block; }''',
r'''.no-print { display: none !important; }
      body[data-print="receipt"] > *:not(#receiptPrintSheet),
      body[data-print="sticker"] > *:not(#stickerPrintSheet) { display: none !important; }
      body[data-print="receipt"] #receiptPrintSheet,
      body[data-print="sticker"] #stickerPrintSheet { display: block; }
      #stickerPrintSheet img { width: 100%; height: auto; }
      @page { margin: 4mm; }'''))

# 1b. fungsi cetak + nota
P.append(("Cetak nota",
r'''function printReceiptNow() {''',
r'''function printMode(mode, html) {
      if (mode === "receipt") document.getElementById("receiptPrintSheet").innerHTML = html;
      if (mode === "sticker") {
        if (!lastStickerCanvas) return;
        document.getElementById("stickerPrintSheet").innerHTML = `<img alt="" src="${lastStickerCanvas.toDataURL("image/png")}">`;
      }
      document.body.dataset.print = mode;
      const done = () => { delete document.body.dataset.print; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    }
    function printReceiptNow() { return printMode("receipt", document.getElementById("receiptPreviewBody").innerHTML); }
    function _unusedPrintReceiptNow() {'''))

P.append(("Cetak stiker",
r'''document.getElementById("btnPrintSticker").addEventListener("click", () => { if (lastStickerCanvas) window.print(); });''',
r'''document.getElementById("btnPrintSticker").addEventListener("click", () => printMode("sticker"));'''))

P.append(("Cetak laporan",
r'''document.getElementById("btnPrintReport").addEventListener("click", () => window.print());''',
r'''document.getElementById("btnPrintReport").addEventListener("click", () => printMode("report"));'''))

# 2. Kode otomatis + cek kode ganda
P.append(("Kode otomatis",
r'''const nums = inventory.map(i => parseInt(String(i.code || "").replace(/\D/g, ""), 10)).filter(n => !isNaN(n));''',
r'''const nums = inventory.map(i => /^SJS-(\d+)$/i.exec(String(i.code || "").trim())?.[1]).filter(Boolean).map(Number);'''))

P.append(("Kode ganda",
r'''if (!code) code = nextAutoCode();''',
r'''if (!code) code = nextAutoCode();
      if (inventory.some(i => i.id !== editId && String(i.code || "").trim().toLowerCase() === code.toLowerCase())) return showToast("Kode barang sudah dipakai barang lain.");'''))

# 5. Cadangan + pengaturan
P.append(("Cadangan pengaturan",
r'''publicCatalog: pub.docs.map(d => ({ ...d.data(), id: d.id })), ...Object.fromEntries(entries)''',
r'''publicCatalog: pub.docs.map(d => ({ ...d.data(), id: d.id })), settings: { shopName, qrisPayload: savedQrisPayload, costCodeDigits }, ...Object.fromEntries(entries)'''))

# 6. Modal rata-rata tertimbang + cek barang ada
P.append(("Restock: cek barang",
r'''const stock = Number(cur.data()?.stock || 0) + qty;''',
r'''if (!cur.exists()) throw new Error("Barang sudah dihapus. Muat ulang daftar stok.");
          const stock = Number(cur.data()?.stock || 0) + qty;'''))

P.append(("Restock: modal rata-rata",
r'''tx.update(invRef, { stock, cost: unitCost, updatedAt: new Date().toISOString() });''',
r'''const oldStock = Math.max(0, Number(cur.data()?.stock || 0));
          const oldCost = Number(cur.data()?.cost || 0);
          const avgCost = total > 0 ? Math.round((oldStock * oldCost + qty * unitCost) / (oldStock + qty)) : oldCost;
          tx.update(invRef, { stock, cost: avgCost, updatedAt: new Date().toISOString() });'''))

P.append(("Teks restock",
r'''Harga modal ikut diperbarui ke harga beli per pcs terakhir.''',
r'''Harga modal dihitung rata-rata tertimbang dari stok lama dan pembelian baru.'''))

# 7. Konfirmasi pengeluaran dari asisten
P.append(("Konfirmasi pengeluaran asisten",
r'''const method = /transfer/i.test(expMatch[3] || "") ? "Transfer" : /kartu/i.test(expMatch[3] || "") ? "Kartu" : "Cash";''',
r'''const method = /transfer/i.test(expMatch[3] || "") ? "Transfer" : /kartu/i.test(expMatch[3] || "") ? "Kartu" : "Cash";
        if (!Number.isSafeInteger(amount) || amount <= 0) return assistantAdd("assistant", "Jumlah pengeluaran tidak valid.");
        if (!window.confirm(`Simpan pengeluaran "${expMatch[1]}" sebesar ${rp(amount)} (${method === "Cash" ? "Tunai" : method})?`)) return assistantAdd("assistant", "Pengeluaran tidak disimpan.");'''))

# CSV injection
P.append(("CSV helper",
r'''function rp(n) {''',
r'''function csvCell(v) {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }
    function rp(n) {'''))

P.append(("CSV pembeli",
r'''`"${(tx.customer || "").replace(/"/g, '""')}"`''',
r'''csvCell(tx.customer)'''))

P.append(("CSV barang",
r'''`"${(it.name || "").replace(/"/g, '""')}"`''',
r'''csvCell(it.name)'''))

# 8. SEO
P.append(("SEO",
r'''<meta property="og:site_name" content="Surya Jaya Sport">''',
r'''<meta property="og:site_name" content="Surya Jaya Sport">
  <meta property="og:url" content="https://suryajaya-sport.github.io/">
  <meta property="og:description" content="Perlengkapan badminton, futsal, catur, dan aksesori gitar di Tanjung Redeb, Berau. Cek harga dan stok, konfirmasi lewat WhatsApp.">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"SportingGoodsStore","name":"Surya Jaya Sport","url":"https://suryajaya-sport.github.io/","telephone":"+6282320033333","image":"https://suryajaya-sport.github.io/sjs-mark.png","address":{"@type":"PostalAddress","streetAddress":"Jl. Ahmad Yani 37","addressLocality":"Tanjung Redeb","addressRegion":"Kalimantan Timur","addressCountry":"ID"}}
  </script>'''))

out = src
for name, old, new in P:
    n = out.count(old)
    if n != 1:
        sys.exit(f"GAGAL pada '{name}': teks lama ditemukan {n} kali (harus 1). Tidak ada file yang diubah.")
    out = out.replace(old, new)

shutil.copyfile(path, "index.backup.html")
open(path, "w", encoding="utf-8").write(out)
print(f"Selesai: {len(P)} perubahan diterapkan. Cadangan: index.backup.html")
