export function assistantKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
}

export function understandShopQuestion(input) {
  const text = input.trim().replace(/[?!]+$/, "").trim();
  const normalized = assistantKey(text);
  const sale = text.match(/^(?:(?:tolong|barusan|baru saja|mau)\s+)*(?:(?:catat(?:kan)?|input|simpan|buat(?:kan)?)\s+(?:nota(?:\s+(?:jual(?:an)?|penjualan))?|jual(?:an)?|penjualan)(?:\s+(?:untuk|barang))?|jual(?:an)?|terjual|laku)\s+(\d.*)$/i);
  if (sale && !/^\d+\s+hari\b/i.test(sale[1])) return { type: "sale", term: sale[1] };

  if (/\b(?:barang baru|produk baru|peluang|di luar stok|diluar stok|stok baru)\b/.test(normalized)) {
    return { type: "opportunity" };
  }
  if (/\b(?:restok|restock|re[- ]stok|isi stok|isi ulang stok|distok|distock|tambah stok|belanja stok|kulak(?:an)?|beli stok)\b/.test(normalized)
      || /\b(?:barang|produk|model|stok)\b.*\b(?:perlu|layak|harus|sebaiknya)\b.*\b(?:beli|dibeli|diisi ulang|stok)\b/.test(normalized)) {
    return { type: "restock" };
  }
  const stock = text.match(/^(?:tolong\s+)?(?:(?:cek|lihat|berapa|bisa cek)\s+)?(?:sisa stok|stok|harga|stoknya|harganya)\s+(.+)$/i)
    || text.match(/^(.+?)\s+(?:stoknya|harganya|sisa stoknya)\s+berapa$/i);
  if (stock) return { type: "stock", term: stock[1].replace(/\s+(?:(?:ada|sisa)\s+)?berapa(?:\s+(?:lagi|pcs))?$/i, "") };
  if (/\b(?:terlaris|paling laku|lagi laku|laku|diminati|disukai|disuka|favorit|paling banyak terjual)\b/.test(normalized)) {
    return { type: "popular" };
  }
  if (/\b(?:laporan|laba|rugi|profit|untung|keuntungan|omset|omzet|hpp|penjualan|pengeluaran|pendapatan)\b/.test(normalized)) {
    return { type: "report" };
  }
  return { type: "help" };
}

export function assistantSaleParts(command) {
  const options = new Map();
  const parts = command.split(/(?:\s*,\s*|\s+)(bayar|dibayar|pembayaran|cara bayar|pembeli|atas nama|tanggal)\s+/i);
  let itemsText = parts[0].trim();
  for (let index = 1; index < parts.length; index += 2) {
    const label = assistantKey(parts[index]);
    const key = ["bayar", "dibayar", "pembayaran", "cara bayar"].includes(label) ? "bayar"
      : label === "atas nama" ? "pembeli" : label;
    const value = parts[index + 1].trim();
    if (!value || options.has(key)) throw new Error("Periksa bagian " + key + " pada perintah.");
    options.set(key, value);
  }
  if (!options.has("bayar")) {
    const suffix = itemsText.match(/\s+(?:pakai|via|secara)\s+(tunai|cash|qris|kartu|transfer)\s*$/i);
    if (suffix) {
      itemsText = itemsText.slice(0, suffix.index);
      options.set("bayar", suffix[1]);
    }
  }
  const items = itemsText.split(/\s*\+\s*(?=\d+\s)|\s+dan\s+(?=\d+\s)/i);
  return { items, options };
}

export function shopDemandFilter(text) {
  return assistantKey(text.match(/\b(?:untuk|kategori)\s+(.+?)(?=\s+(?:\d+\s+hari|bulan (?:ini|lalu)|minggu (?:ini|lalu)|hari ini|kemarin)\b|$)/i)?.[1]);
}

export function assistantComparisonPeriod({ start, end }, shiftDate) {
  const days = 1 + Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
  if (start.endsWith("-01") && start.slice(0, 7) === end.slice(0, 7)) {
    const previousMonthEnd = shiftDate(start, -1);
    const previousDay = Math.min(Number(end.slice(-2)), Number(previousMonthEnd.slice(-2)));
    return { start: previousMonthEnd.slice(0, 7) + "-01",
      end: previousMonthEnd.slice(0, 8) + String(previousDay).padStart(2, "0") };
  }
  return { start: shiftDate(start, -days), end: shiftDate(start, -1) };
}
