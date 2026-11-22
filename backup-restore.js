import { backupCollections } from "./bookkeeping.js";

export const restoreLabels = {
  inventory: "Barang stok", transactions: "Nota penjualan", purchases: "Pembelian stok",
  expenses: "Pengeluaran", cashClosings: "Tutup kas", publicCatalog: "Entri katalog"
};

export const catalogRestoreFields = {
  name: "Nama barang", description: "Deskripsi", price: "Harga jual", imageUrl: "Tautan foto"
};

const stockGroups = ["inventory", "transactions", "purchases"];
const bookGroups = ["expenses", "cashClosings"];

function validId(id) {
  return typeof id === "string" && id.length > 0 && !id.includes("/") && id !== "." && id !== ".."
    && !/^__.*__$/.test(id) && new TextEncoder().encode(id).length <= 1500;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const money = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const units = value => Number.isSafeInteger(value) && value >= 0;
const text = (value, max) => typeof value === "string" && value.length <= max;
const optionalText = (value, max) => value === undefined || text(value, max);

function validRow(group, row) {
  if (!row || typeof row !== "object" || Array.isArray(row) || !validId(row.id)) return false;
  if (group === "inventory" || group === "publicCatalog") {
    const base = text(row.name, 160) && row.name.trim() && money(row.price) && units(row.stock)
      && optionalText(row.description, 400) && optionalText(row.imageUrl, 2048);
    if (group === "inventory") return base && money(row.cost) && optionalText(row.code, 80);
    const allowed = ["id", "name", "code", "size", "color", "price", "stock", "imageUrl", "description"];
    return base && text(row.code, 80) && optionalText(row.size, 40) && optionalText(row.color, 60)
      && Object.keys(row).every(key => allowed.includes(key));
  }
  if (!validDate(row.date)) return false;
  if (group === "expenses") return text(row.category, 80) && money(row.amount);
  if (group === "cashClosings") {
    return row.id === row.date && ["opening", "counted", "sales", "expenses", "cashIn", "cashOut"].every(key => money(row[key]))
      && Number.isFinite(row.expected) && Number.isFinite(row.difference);
  }
  if (group === "purchases") return validId(row.inventoryId) && units(row.qty) && row.qty > 0 && money(row.totalCost);
  return money(row.totalOmset) && money(row.totalModal) && Array.isArray(row.items) && row.items.length > 0
    && row.items.every(item => item && text(item.name, 500) && units(item.qty) && item.qty > 0
      && money(item.price) && money(item.cost) && (!item.inventoryId || validId(item.inventoryId)));
}

export function parseRestoreBackup(raw) {
  if (![1, 2].includes(raw?.version)) throw new Error("Pilih file cadangan Surya Jaya Sport versi 1 atau 2.");
  const data = {};
  for (const group of backupCollections) {
    const records = raw.version === 1 && group === "publicCatalog" ? [] : raw[group];
    if (!Array.isArray(records)) throw new Error("Bagian " + restoreLabels[group] + " belum lengkap di file cadangan.");
    const rows = new Map();
    for (const record of records) {
      if (!validRow(group, record) || rows.has(record.id)) {
        throw new Error("Ada isian tidak valid atau kode ganda pada " + restoreLabels[group] + ".");
      }
      rows.set(record.id, record);
    }
    data[group] = rows;
  }
  return { version: raw.version, exportedAt: raw.exportedAt, data };
}

export function restoreFingerprint(value) {
  return JSON.stringify(value, (_, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    return Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]));
  });
}

const same = (a, b) => restoreFingerprint(a) === restoreFingerprint(b);

export function restoreDocumentFields(record) {
  const { id, ...fields } = record;
  return fields;
}

function restoreCatalogFields(record, source, fields, includeImagePath) {
  const result = { ...record };
  for (const key of fields) {
    if (source[key] === undefined) delete result[key];
    else result[key] = source[key];
  }
  if (fields.includes("imageUrl") && includeImagePath) {
    if (source.imagePath === undefined) delete result.imagePath;
    else result.imagePath = source.imagePath;
  }
  return result;
}

function sameStockSnapshot(current, archived) {
  if (!archived || current.stock !== archived.stock || current.cost !== archived.cost) return false;
  return same(current.stockEdits || [], archived.stockEdits || []);
}

function checkCashClosing(day, closure, transactions, expenses) {
  if (!closure) return;
  const totalSales = [...transactions.values()]
    .filter(row => row.date === day && row.paymentMethod === "Cash" && !row.cancelledAt)
    .reduce((sum, row) => sum + Number(row.totalOmset || 0), 0);
  const totalExpenses = [...expenses.values()]
    .filter(row => row.date === day && row.method === "Cash")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (totalSales !== closure.sales || totalExpenses !== closure.expenses) {
    throw new Error("Catatan tutup kas " + day + " tidak cocok dengan penjualan tunai atau pengeluaran hasil pemulihan.");
  }
}

export function planRestore(backup, live, selection) {
  const { data } = backup;
  const { mode, id, date } = selection;
  const checks = new Map();
  const writes = [];
  const kept = [];
  let different = 0;
  let changes = [];

  function remember(group, id) {
    checks.set(group + "/" + id, { group, id, current: live[group].get(id) || null });
  }

  function stage(group, next) {
    remember(group, next.id);
    writes.push({ group, id: next.id, next });
  }

  function addMissing(group, candidates) {
    for (const row of candidates) {
      const current = live[group].get(row.id);
      if (current) {
        const differs = !same(current, row);
        kept.push({ group, row: current, differs });
        if (differs) different++;
      } else stage(group, row);
    }
  }

  if (mode === "catalog") {
    const archived = data.inventory.get(id);
    const current = live.inventory.get(id);
    if (!archived || !current) throw new Error("Pilih barang yang masih ada di menu Stok.");
    const fields = Object.keys(catalogRestoreFields).filter(key => selection.fields.includes(key));
    if (!fields.length) throw new Error("Pilih informasi barang yang akan dipulihkan.");
    remember("inventory", id);
    const next = restoreCatalogFields(current, archived, fields, true);
    if (!same(current, next)) stage("inventory", next);

    const published = live.publicCatalog.get(id);
    remember("publicCatalog", id);
    if (published) {
      const nextPublic = restoreCatalogFields(published, archived, fields, false);
      if (!validRow("publicCatalog", nextPublic)) throw new Error("Isi cadangan barang ini tidak cocok dengan katalog publik.");
      if (!same(published, nextPublic)) stage("publicCatalog", nextPublic);
    }
    changes = fields.map(field => ({
      label: catalogRestoreFields[field], before: current[field], after: archived[field]
    }));
  } else if (mode === "stock") {
    for (const group of stockGroups) {
      for (const [id, row] of live[group]) {
        const compatible = group === "inventory"
          ? sameStockSnapshot(row, data[group].get(id))
          : same(row, data[group].get(id));
        if (!compatible) throw new Error("Stok, nota, atau pembelian stok di toko sudah berbeda dari cadangan. Pemulihan kelompok ini dihentikan agar data terbaru tetap utuh.");
        remember(group, id);
      }
      addMissing(group, data[group].values());
    }
    for (const [id, row] of live.publicCatalog) {
      if (row.stock !== data.inventory.get(id)?.stock) throw new Error("Ada jumlah stok katalog yang berbeda dari cadangan.");
      remember("publicCatalog", id);
    }
    const days = new Set(writes.filter(write => write.group === "transactions"
      && write.next.paymentMethod === "Cash" && !write.next.cancelledAt).map(write => write.next.date));
    for (const day of days) {
      remember("cashClosings", day);
      for (const expense of live.expenses.values()) {
        if (expense.date === day) remember("expenses", expense.id);
      }
      checkCashClosing(day, live.cashClosings.get(day), data.transactions, live.expenses);
    }
  } else if (mode === "books") {
    if (!validDate(date)) throw new Error("Pilih tanggal pengeluaran atau tutup kas yang akan dipulihkan.");
    for (const group of bookGroups) {
      addMissing(group, [...data[group].values()].filter(row => row.date === date));
      for (const row of live[group].values()) {
        if (row.date === date) remember(group, row.id);
      }
    }
    if (writes.some(write => write.group === "cashClosings" || write.next.method === "Cash")) {
      remember("cashClosings", date);
      for (const row of live.transactions.values()) {
        if (row.date === date) remember("transactions", row.id);
      }
      const expenses = new Map(live.expenses);
      for (const write of writes) {
        if (write.group === "expenses") expenses.set(write.id, write.next);
      }
      checkCashClosing(date, live.cashClosings.get(date) || data.cashClosings.get(date), live.transactions, expenses);
    }
  } else if (mode === "full") {
    if (backup.version !== 2) throw new Error("Pulihkan semua data memerlukan cadangan versi 2 yang menyertakan katalog.");
    if (backupCollections.some(group => live[group].size > 0)) {
      throw new Error("Pulihkan semua data hanya tersedia jika stok, penjualan, pembukuan, dan katalog masih kosong.");
    }
    for (const [id, row] of data.publicCatalog) {
      if (row.stock !== data.inventory.get(id)?.stock) throw new Error("Isi stok dan katalog di file cadangan tidak cocok.");
    }
    for (const group of backupCollections) addMissing(group, data[group].values());
  } else {
    throw new Error("Pilih jenis data yang akan dipulihkan.");
  }

  if (writes.length > 500) throw new Error("Pilihan ini melebihi 500 dokumen per transaksi. Gunakan pilihan yang lebih kecil.");
  return { writes, checks: [...checks.values()], kept, different, changes };
}

export async function commitRestore(plan, runTransaction, docRef) {
  return runTransaction(async transaction => {
    const reads = await Promise.all(plan.checks.map(async check => {
      const doc = await transaction.get(docRef(check.group, check.id));
      return { check, current: doc.exists() ? { ...doc.data(), id: doc.id } : null };
    }));
    if (reads.some(({ check, current }) => !same(check.current, current))) {
      throw new Error("Data toko berubah sejak pratinjau. Buat pratinjau baru terlebih dahulu.");
    }
    for (const { group, id, next } of plan.writes) {
      transaction.set(docRef(group, id), restoreDocumentFields(next));
    }
  });
}
