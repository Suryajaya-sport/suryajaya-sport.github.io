import { parseRestoreBackup, planRestore, restoreFingerprint, restoreLabels } from "./backup-restore.js";

const modeHelp = {
  catalog: "Pulihkan informasi satu barang. Jumlah stok memakai catatan saat ini.",
  stock: "Lengkapi catatan yang hilang jika stok, nota, dan pembelian masih cocok dengan cadangan.",
  books: "Tambahkan pengeluaran atau tutup kas untuk satu tanggal. Catatan yang sudah ada tetap dipakai.",
  full: "Pulihkan seluruh cadangan versi 2 ke database toko yang masih kosong."
};

export function wireBackupRestore({ canRestore, open, formatMoney, readCurrent, save }) {
  const get = id => document.getElementById(id);
  const dialog = get("backupRestoreDialog");
  const form = get("backupRestoreForm");
  const file = get("restoreBackupFile");
  const mode = get("restoreBackupMode");
  const date = get("restoreBooksDate");
  const product = get("restoreCatalogProduct");
  const preview = get("restoreBackupPreview");
  const previewButton = get("previewBackupRestore");
  const confirm = get("confirmBackupRestore");
  const apply = get("applyBackupRestore");
  const close = dialog.querySelector(".workspace-dialog-close");
  const status = dialog.querySelector("[data-dialog-status]");
  const catalogFields = [...form.querySelectorAll("[name=restoreCatalogField]")];
  const controls = [file, mode, date, product, ...catalogFields, close, confirm];
  let backup = null;
  let reviewed = null;
  let busy = false;

  function setBusy(value) {
    busy = value;
    for (const field of controls) field.disabled = value;
    previewButton.disabled = value || !backup;
    apply.disabled = value || !reviewed?.writes.length || !confirm.checked;
  }

  function invalidatePreview() {
    reviewed = null;
    preview.hidden = true;
    confirm.checked = false;
    apply.disabled = true;
  }

  function showMode() {
    get("restoreCatalogOptions").hidden = mode.value !== "catalog";
    get("restoreBooksOptions").hidden = mode.value !== "books";
    get("restoreModeHelp").textContent = modeHelp[mode.value];
  }

  function fillProducts() {
    product.replaceChildren(new Option(backup ? "Pilih barang" : "Pilih file cadangan dulu", ""));
    if (!backup) return;
    const products = [...backup.data.inventory.values()].sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name, "id"));
    for (const item of products) product.add(new Option([item.code, item.name].filter(Boolean).join(" · "), item.id));
    const days = [...backup.data.expenses.values(), ...backup.data.cashClosings.values()].map(item => item.date).sort();
    date.value = days.at(-1) || "";
  }

  function selection() {
    return { mode: mode.value, id: product.value, date: date.value,
      fields: catalogFields.filter(field => field.checked).map(field => field.value) };
  }

  function appendMessage(container, message, emphasized = false) {
    const line = document.createElement("p");
    line.className = emphasized ? "font-bold" : "break-words text-slate-700";
    line.textContent = message;
    container.append(line);
  }

  function appendRecords(container, title, records) {
    if (!records.length) return;
    const detail = document.createElement("details");
    const summary = document.createElement("summary");
    const list = document.createElement("ul");
    summary.className = "cursor-pointer font-bold text-blue-900";
    summary.textContent = title + " (" + records.length + ")";
    list.className = "mt-2 max-h-48 space-y-2 overflow-auto border-t border-slate-200 pt-2";
    for (const { group, row, differs } of records) {
      const line = document.createElement("li");
      const description = group === "transactions" ? "SJS-" + row.id.slice(-6).toUpperCase()
        : [row.code, row.name || row.category].filter(Boolean).join(" · ");
      line.className = "break-words";
      line.textContent = [restoreLabels[group], description, row.date, differs ? "versi toko dipertahankan" : ""].filter(Boolean).join(" · ");
      list.append(line);
    }
    detail.append(summary, list);
    container.append(detail);
  }

  function showPreview(plan, choice) {
    reviewed = plan;
    confirm.checked = false;
    const details = get("restoreBackupChanges");
    details.replaceChildren();
    const counts = new Map();
    for (const { group } of plan.writes) counts.set(group, (counts.get(group) || 0) + 1);
    const summary = [...counts].map(([group, n]) => n + " " + restoreLabels[group].toLowerCase()).join(", ");
    appendMessage(details, summary ? (choice.mode === "catalog" ? "Akan diperbarui " : "Akan ditambahkan ") + summary
      : "Tidak ada data yang perlu dipulihkan untuk pilihan ini.", true);
    if (plan.kept.length) {
      appendMessage(details, plan.kept.length + " catatan sudah ada dan dilewati."
        + (plan.different ? " " + plan.different + " di antaranya berbeda dari cadangan." : ""));
    }
    if (choice.mode === "catalog") {
      const display = value => typeof value === "number" ? formatMoney(value) : value ?? "—";
      for (const { label, before, after } of plan.changes) {
        if (before === after) continue;
        appendMessage(details, label + " · Saat ini " + display(before) + " → Cadangan " + display(after));
      }
    } else {
      appendRecords(details, "Catatan yang akan ditambahkan", plan.writes.map(write => ({group: write.group, row: write.next})));
      appendRecords(details, "Catatan yang sudah ada", plan.kept);
    }
    get("restoreConfirmLabel").hidden = !plan.writes.length;
    apply.hidden = !plan.writes.length;
    preview.hidden = false;
    preview.scrollIntoView({ block: "nearest" });
  }

  function showError(error) {
    status.textContent = error instanceof SyntaxError ? "File tidak bisa dibaca sebagai JSON."
      : error?.code ? "Pemulihan gagal. Periksa koneksi dan buat pratinjau baru." : error.message;
  }

  get("openBackupRestore").addEventListener("click", () => {
    if (!canRestore() || busy) return;
    form.reset();
    backup = null;
    get("restoreBackupInfo").textContent = "";
    fillProducts();
    showMode();
    invalidatePreview();
    setBusy(false);
    open();
  });
  dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
  form.addEventListener("change", event => {
    if (event.target === file || event.target === confirm) return;
    invalidatePreview();
    showMode();
    status.textContent = "";
  });
  confirm.addEventListener("change", () => setBusy(false));

  file.addEventListener("change", async () => {
    if (!canRestore() || busy) return;
    backup = null;
    fillProducts();
    invalidatePreview();
    get("restoreBackupInfo").textContent = "";
    status.textContent = "";
    const chosen = file.files[0];
    if (!chosen) {
      setBusy(false);
      return;
    }
    try {
      setBusy(true);
      backup = parseRestoreBackup(JSON.parse(await chosen.text()));
      if (!dialog.open || !canRestore()) return;
      fillProducts();
      const timestamp = new Date(backup.exportedAt);
      get("restoreBackupInfo").textContent = "Cadangan versi " + backup.version
        + (Number.isFinite(timestamp.valueOf()) ? " · " + timestamp.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "");
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canRestore() || !backup || busy) return;
    const choice = selection();
    invalidatePreview();
    setBusy(true);
    status.textContent = "Membandingkan file cadangan dengan data toko…";
    try {
      const live = await readCurrent();
      if (!dialog.open || !canRestore()) return;
      showPreview(planRestore(backup, live, choice), choice);
      status.textContent = "";
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  });

  apply.addEventListener("click", async () => {
    if (!canRestore() || !reviewed?.writes.length || !confirm.checked || busy) return;
    const choice = selection();
    setBusy(true);
    status.textContent = "Memeriksa ulang data toko sebelum menyimpan…";
    try {
      const live = await readCurrent();
      if (!dialog.open || !canRestore()) return;
      const latest = planRestore(backup, live, choice);
      if (restoreFingerprint(latest) !== restoreFingerprint(reviewed)) {
        showPreview(latest, choice);
        status.textContent = "Data toko berubah. Periksa pratinjau terbaru sebelum menyimpan.";
        return;
      }
      await save(latest);
      invalidatePreview();
      status.textContent = "Pemulihan selesai. " + latest.writes.length + " catatan disimpan.";
    } catch (error) {
      invalidatePreview();
      showError(error);
    } finally {
      setBusy(false);
    }
  });
}
