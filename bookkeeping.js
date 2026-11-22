export const backupCollections = ["inventory", "transactions", "purchases", "expenses", "cashClosings", "publicCatalog"];

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
