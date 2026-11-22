import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { backupCollections, monthlyBookTotals } from "../bookkeeping.js";

// Restore into an isolated Firestore emulator with a demo project.
const database = "projects/demo-sjs-restore/databases/(default)";
const endpoint = `http://127.0.0.1:8080/v1/${database}/documents`;
const privatePrefix = "artifacts/suryajayasport-3fd5e-app/public/data/";
const collectionPath = group => group === "publicCatalog" ? group : privatePrefix + group;

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number" && Number.isFinite(value)) return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, field]) => [key, encodeValue(field)])) } };
  }
  throw new Error("Cadangan memiliki nilai yang tidak dapat dipulihkan.");
}

function decodeValue(value) {
  if (Object.hasOwn(value, "nullValue")) return null;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return value.doubleValue;
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, field]) => [key, decodeValue(field)]));
  }
  throw new Error("Emulator mengembalikan tipe data yang tidak dikenali.");
}

async function request(path, body) {
  const response = await fetch(endpoint + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Emulator menolak permintaan (HTTP ${response.status}).`);
  return response.json();
}

async function readCollection(group) {
  const rows = new Map();
  const query = new URLSearchParams({ pageSize: "200" });
  do {
    const page = await request(`/${collectionPath(group)}?${query}`);
    for (const document of page.documents || []) {
      const id = document.name.split("/").at(-1);
      rows.set(id, { ...decodeValue({ mapValue: { fields: document.fields } }), id });
    }
    query.set("pageToken", page.nextPageToken || "");
  } while (query.get("pageToken"));
  return rows;
}

function readBackup(backup) {
  if (![1, 2].includes(backup?.version)) throw new Error("Format cadangan harus versi 1 atau 2.");
  const groups = backup.version === 1 ? backupCollections.filter(group => group !== "publicCatalog") : backupCollections;
  const source = {};
  const writes = [];
  for (const group of groups) {
    if (!Array.isArray(backup[group])) throw new Error(`Cadangan tidak memiliki daftar ${group}.`);
    source[group] = new Map();
    for (const row of backup[group]) {
      const id = row?.id;
      if (typeof id !== "string" || !id || id.includes("/") || id === "." || id === ".."
          || Buffer.byteLength(id) > 1500 || source[group].has(id)) {
        throw new Error(`Kode dokumen kosong, tidak valid, atau ganda di ${group}.`);
      }
      const { id: documentId, ...fields } = row;
      const encoded = encodeValue(fields).mapValue.fields;
      source[group].set(documentId, row);
      writes.push(JSON.stringify({
        update: { name: `${database}/documents/${collectionPath(group)}/${documentId}`, fields: encoded },
        currentDocument: { exists: false }
      }));
    }
  }
  return { groups, source, writes };
}

async function writeBatches(writes) {
  let batch = [];
  let bytes = 0;
  for (const entry of writes) {
    const length = Buffer.byteLength(entry);
    if (batch.length >= 200 || (batch.length && bytes + length > 7_000_000)) {
      await request(":commit", '{"writes":[' + batch.join(",") + "]}");
      batch = [];
      bytes = 0;
    }
    batch.push(entry);
    bytes += length + 1;
  }
  if (batch.length) await request(":commit", '{"writes":[' + batch.join(",") + "]}");
}

async function restore(filename) {
  const { groups, source, writes } = readBackup(JSON.parse(await readFile(filename, "utf8")));
  // Never mix a backup with records already in the demo database.
  for (const group of backupCollections) {
    if ((await readCollection(group)).size) throw new Error("Database demo sudah berisi data. Mulai emulator kosong untuk menguji cadangan lain.");
  }
  await writeBatches(writes);

  const restored = {};
  for (const group of groups) {
    restored[group] = await readCollection(group);
    if (!isDeepStrictEqual(source[group], restored[group])) {
      throw new Error(`Hasil pemulihan ${group} berbeda dari cadangan.`);
    }
  }
  const rows = (data, group) => [...data[group].values()];
  const months = new Set([...rows(source, "transactions"), ...rows(source, "expenses")]
    .map(row => row.date?.slice(0, 7)).filter(Boolean));
  for (const month of months) {
    const totals = data => monthlyBookTotals(month, rows(data, "transactions"), rows(data, "expenses"));
    if (!isDeepStrictEqual(totals(source), totals(restored))) throw new Error(`Laporan bulan ${month} berbeda.`);
  }
  const counts = Object.fromEntries(groups.map(group => [group, restored[group].size]));
  console.log(JSON.stringify({ restored: counts, monthlyReportsVerified: months.size }, null, 2));
}

const [, , filename] = process.argv;
try {
  if (!filename || process.argv.length !== 3) throw new Error("Penggunaan: node scripts/restore-backup.mjs file-cadangan.json");
  await restore(filename);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
