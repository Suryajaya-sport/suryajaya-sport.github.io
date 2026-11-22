export const backupCollections = ["inventory", "transactions", "purchases", "expenses", "cashClosings", "publicCatalog"];
export const salePaymentMethods = new Set(["Cash", "QRIS", "Kartu", "Transfer"]);

export function paymentCorrectionPatch(sale, correction, actor, now) {
  if (!sale || sale.cancelledAt) throw new Error("Koreksi hanya tersedia untuk nota yang masih aktif.");
  const history = sale.paymentCorrections ?? [];
  const from = sale.paymentMethod || "";
  if (correction.from !== from || correction.revision !== history.length) {
    throw new Error("Cara bayar sudah berubah. Tutup dan buka kembali nota untuk memeriksa perubahan.");
  }
  const to = correction.to;
  if (!salePaymentMethods.has(to) || to === from) throw new Error("Pilih cara bayar yang berbeda.");
  const reason = correction.reason.trim();
  if (!reason || reason.length > 160) throw new Error("Isi alasan koreksi, maksimal 160 karakter.");
  if (history.length >= 100) throw new Error("Nota ini sudah mencapai batas koreksi cara bayar.");
  return {
    paymentMethod: to,
    paymentCorrections: [...history, { from, to, reason, correctedAt: now, correctedBy: actor }]
  };
}

export function monthlyBookTotals(month, transactions, expenses) {
  const inMonth = row => Boolean(month && row.date?.startsWith(month + "-"));
  let revenue = 0;
  let cost = 0;
  for (const row of transactions) {
    if (row.cancelledAt || !inMonth(row)) continue;
    revenue += Number(row.totalOmset || 0);
    cost += Number(row.totalModal || 0);
  }
  const spending = expenses.filter(inMonth).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { revenue, cost, spending, profit: revenue - cost - spending };
}

export function cashClosingChanges(saved, live) {
  const sales = live.sales - saved.sales;
  const expenses = live.expenses - saved.expenses;
  const expected = saved.expected + sales - expenses;
  return { needsReview: sales !== 0 || expenses !== 0, sales, expenses, difference: saved.counted - expected };
}

export function cashClosingRecord(snapshot, current, correction, actor, now) {
  if (!current && !correction) return { ...snapshot, createdAt: now, closedBy: actor };
  if (!current) throw new Error("Catatan tutup kas sudah berubah. Buka ulang tanggal ini.");
  if (!correction) throw new Error("Kas tanggal ini sudah ditutup. Gunakan Koreksi tutup kas.");

  const history = Array.isArray(current.corrections) ? current.corrections : [];
  if (correction.revision !== history.length) {
    throw new Error("Ada koreksi baru dari perangkat lain. Buka ulang koreksi untuk melihat angka terbaru.");
  }
  const reason = correction.reason.trim();
  if (!reason || reason.length > 160) throw new Error("Isi alasan koreksi, maksimal 160 karakter.");

  const before = Object.fromEntries(Object.keys(snapshot).map(key => [key, current[key] ?? null]));
  if (Object.keys(snapshot).every(key => snapshot[key] === before[key])) {
    throw new Error("Ubah angka yang perlu dikoreksi terlebih dahulu.");
  }
  return {
    ...current,
    ...snapshot,
    corrections: [...history, { correctedAt: now, correctedBy: actor, reason, before, after: snapshot }]
  };
}
