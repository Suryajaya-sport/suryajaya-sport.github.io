// admin.js - Dashboard Admin POS, Stok, Harga, & Upload Foto Produk (Surya Jaya Sport)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFtI_lwLU7cDcioDE1GpgC0AjKPZ1mHag",
  authDomain: "suryajayasport-3fd5e.firebaseapp.com",
  projectId: "suryajayasport-3fd5e",
  storageBucket: "suryajayasport-3fd5e.firebasestorage.app",
  messagingSenderId: "501860315687",
  appId: "1:501860315687:web:3692f12c2b59a1e16d9402"
};
const OWNER_UID = "ijWilxxrxRabwOX7KcndkuqrBOw1";
const APP_ID = "suryajayasport-3fd5e-app";
const WA_NUMBER = "6282320033333";
const CLOUDINARY_CLOUD = "mhfuwzby";
const CLOUDINARY_PRESET = "sjs_product_images";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// AVO dan Finotti dipisah sebagai 2 brand berbeda
const BRANDS = [
  { id: "yonex", name: "Yonex", cat: "Badminton", match: /\byonex\b/i },
  { id: "lining", name: "Li-Ning", cat: "Badminton & Sport", match: /\b(li-?ning|lining)\b/i },
  { id: "victor", name: "Victor", cat: "Badminton", match: /\bvictor\b/i },
  { id: "hiqua", name: "Hiqua", cat: "Badminton", match: /\b(hi-?qua|hiqua)\b/i },
  { id: "flypower", name: "Flypower", cat: "Badminton", match: /\bflypower\b/i },
  { id: "astec", name: "Astec", cat: "Badminton", match: /\bastec\b/i },
  { id: "rs", name: "RS", cat: "Reinforce Speed", match: /\b(rs|reinforce)\b/i },
  { id: "hundred", name: "Hundred", cat: "Badminton", match: /\bhundred\b/i },
  { id: "powermax", name: "Powermax", cat: "Badminton", match: /\bpower\s*max\b/i },
  { id: "avo", name: "AVO", cat: "Kaos Kaki & Sport", match: /\bavo\b/i },
  { id: "finotti", name: "Finotti", cat: "Sepatu & Futsal", match: /\bfinotti\b/i },
  { id: "specs", name: "Specs", cat: "Futsal & Bola", match: /\bspecs\b/i },
  { id: "ortuseight", name: "Ortuseight", cat: "Futsal & Running", match: /\b(ortuseight|ortus)\b/i },
  { id: "adidas", name: "Adidas", cat: "Sport & Futsal", match: /\badidas\b/i },
  { id: "nike", name: "Nike", cat: "Sport & Futsal", match: /\bnike\b/i },
  { id: "molten", name: "Molten", cat: "Bola Basket & Voli", match: /\bmolten\b/i },
  { id: "mikasa", name: "Mikasa", cat: "Bola Voli & Sepak", match: /\bmikasa\b/i },
  { id: "mizuno", name: "Mizuno", cat: "Badminton & Voli", match: /\bmizuno\b/i },
  { id: "asics", name: "Asics", cat: "Sepatu & Voli", match: /\basics\b/i },
  { id: "butterfly", name: "Butterfly", cat: "Tenis Meja", match: /\bbutterfly\b/i },
  { id: "dhs", name: "DHS", cat: "Double Happiness", match: /\b(dhs|double\s*happiness)\b/i },
  { id: "nitaku", name: "Nitaku", cat: "Pingpong", match: /\b(nitaku|nittaku)\b/i },
  { id: "donics", name: "Donics", cat: "Pingpong", match: /\b(donics?|donic)\b/i },
  { id: "doublefish", name: "Double Fish", cat: "Tenis Meja", match: /\bdouble\s*fish\b/i },
  { id: "yasaka", name: "Yasaka", cat: "Tenis Meja", match: /\byasaka\b/i },
  { id: "tama", name: "TAMA", cat: "Musik & Drum", match: /\btama\b/i },
  { id: "elixir", name: "Elixir", cat: "Senar Gitar", match: /\belixir\b/i }
];
const OTHER_BRAND = { id: "none", name: "No Brand", cat: "Produk lainnya", match: null };
const ALL_BRANDS = [...BRANDS, OTHER_BRAND];

let PRODUCTS = [];
let TRANSACTIONS = [];
let selectedBrandId = "";
let currentUser = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

function todayWita() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());
}
function shiftDaysWita(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function toast(msg, ok = true) {
  const t = document.createElement("div");
  t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg ${ok ? "bg-amber-400 text-slate-950" : "bg-rose-600 text-white"}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- Kompres & Upload Foto ke Cloudinary ----------
async function compressImageFile(file, maxSide = 1080, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function uploadToCloudinary(file, tagId = "item") {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar (JPG/PNG/WebP).");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran foto maksimal 5 MB.");
  const blob = await compressImageFile(file);
  const fd = new FormData();
  fd.append("file", blob, `${tagId}.jpg`);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  fd.append("folder", "products");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: "POST",
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Upload foto ke Cloudinary gagal.");
  }
  return data.secure_url;
}

// ---------- Modal ----------
function openModal(title, bodyHtml, onMount) {
  closeModal();
  const wrap = document.createElement("div");
  wrap.id = "sjsModal";
  wrap.className = "fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto";
  wrap.innerHTML = `<div class="w-full max-w-lg rounded-2xl border border-amber-400/50 bg-[#0b0e14] p-5 space-y-4 my-auto">
      <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 class="text-base font-black text-white">${esc(title)}</h3>
        <button type="button" data-modal-close class="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-bold text-white cursor-pointer">Tutup</button>
      </div>
      <div class="space-y-3">${bodyHtml}</div>
    </div>`;
  wrap.addEventListener("click", e => { if (e.target === wrap || e.target.closest("[data-modal-close]")) closeModal(); });
  document.body.appendChild(wrap);
  if (onMount) onMount(wrap);
  return wrap;
}
function closeModal() { $("sjsModal")?.remove(); }

const inputCls = "w-full rounded-xl bg-[#141821] border border-amber-400/25 px-3 py-2 text-sm text-white";
const labelCls = "block text-xs font-bold text-amber-300 mb-1";
const btnGold = "px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-black cursor-pointer";

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ---------- Login Pemilik ----------
function openLogin() {
  if (currentUser && currentUser.uid === OWNER_UID) {
    toast("Anda sudah login sebagai pemilik.");
    return;
  }
  openModal("Login Pemilik", `
    <div><label class="${labelCls}">Email Pemilik</label><input id="loginEmail" type="email" class="${inputCls}" autocomplete="username"></div>
    <div><label class="${labelCls}">Kata Sandi</label><input id="loginPass" type="password" class="${inputCls}" autocomplete="current-password"></div>
    <p id="loginErr" class="text-xs text-rose-400 hidden"></p>
    <div class="flex justify-end"><button type="button" id="btnDoLogin" class="${btnGold}">Masuk</button></div>
  `, wrap => {
    wrap.querySelector("#btnDoLogin").addEventListener("click", async () => {
      const email = wrap.querySelector("#loginEmail").value.trim();
      const pass = wrap.querySelector("#loginPass").value;
      const err = wrap.querySelector("#loginErr");
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeModal();
        toast("Login pemilik berhasil.");
      } catch (e) {
        showErr(err, "Login gagal. Periksa email dan kata sandi.");
      }
    });
  });
}

function requireOwner(action) {
  if (currentUser && currentUser.uid === OWNER_UID) { action(); return; }
  toast("Login pemilik dulu di bagian bawah halaman (Login Pemilik).", false);
  openLogin();
}

// ---------- Tambah / Edit Produk (Upload Gambar, Harga, Stok, Brand) ----------
function openProductFormModal(existing = null) {
  requireOwner(() => {
    const isEdit = Boolean(existing);
    const currentBrand = existing ? (existing.brand || ALL_BRANDS.find(b => b.id === productBrand(existing))?.name || "") : "";
    openModal(isEdit ? `Edit Produk: ${existing.name}` : "Tambah Produk Baru", `
      <div>
        <label class="${labelCls}">Nama Barang *</label>
        <input id="npName" class="${inputCls}" value="${esc(existing?.name || "")}" placeholder="Contoh: Kaos Kaki AVO Futsal / Sepatu Finotti">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="${labelCls}">Kode Barang</label>
          <input id="npCode" class="${inputCls}" value="${esc(existing?.code || "")}" placeholder="SJS-xxx">
        </div>
        <div>
          <label class="${labelCls}">Merek / Brand</label>
          <select id="npBrand" class="${inputCls}">
            <option value="">No Brand</option>
            ${BRANDS.map(b => `<option value="${esc(b.name)}" ${currentBrand.toLowerCase() === b.name.toLowerCase() ? "selected" : ""}>${esc(b.name)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="${labelCls}">Ukuran (opsional)</label>
          <input id="npSize" class="${inputCls}" value="${esc(existing?.size || "")}" placeholder="L, 40, 24 lbs...">
        </div>
        <div>
          <label class="${labelCls}">Warna (opsional)</label>
          <input id="npColor" class="${inputCls}" value="${esc(existing?.color || "")}" placeholder="Hitam, Biru...">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="${labelCls}">Harga Jual (Rp) *</label>
          <input id="npPrice" type="number" min="0" class="${inputCls}" value="${existing ? Number(existing.price || 0) : ""}" placeholder="125000">
        </div>
        <div>
          <label class="${labelCls}">Stok (pcs) *</label>
          <input id="npStock" type="number" min="0" step="1" class="${inputCls}" value="${existing ? Number(existing.stock || 0) : ""}" placeholder="10">
        </div>
      </div>
      <div>
        <label class="${labelCls}">Foto Produk (1080×1080 / 800×800 px, maks 5 MB)</label>
        <input id="npPhotoFile" type="file" accept="image/jpeg,image/png,image/webp" class="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-amber-400 file:text-slate-950 file:font-extrabold cursor-pointer">
        <div id="npPhotoPreviewBox" class="mt-2 flex items-center gap-3 ${existing?.imageUrl ? "" : "hidden"}">
          <img id="npPhotoPreviewImg" src="${esc(existing?.imageUrl || "")}" alt="Pratinjau" class="w-16 h-16 rounded-xl object-contain bg-white border border-amber-400/50">
          <span id="npPhotoStatus" class="text-xs text-zinc-300">${existing?.imageUrl ? "Foto saat ini terpasang" : ""}</span>
        </div>
      </div>
      <div>
        <label class="${labelCls}">Deskripsi Singkat (opsional)</label>
        <textarea id="npDesc" rows="2" class="${inputCls}" placeholder="Keterangan produk untuk pembeli...">${esc(existing?.description || "")}</textarea>
      </div>
      <p id="npErr" class="text-xs text-rose-400 hidden"></p>
      <div class="flex items-center justify-between pt-2">
        ${isEdit ? `<button type="button" id="npDelete" class="px-3 py-2 rounded-xl bg-rose-950 text-rose-300 border border-rose-700 text-xs font-bold cursor-pointer">Hapus Produk</button>` : `<span></span>`}
        <button type="button" id="npSave" class="${btnGold}">Simpan Perubahan</button>
      </div>
    `, wrap => {
      const fileInput = wrap.querySelector("#npPhotoFile");
      const prevBox = wrap.querySelector("#npPhotoPreviewBox");
      const prevImg = wrap.querySelector("#npPhotoPreviewImg");
      const prevStat = wrap.querySelector("#npPhotoStatus");

      fileInput.addEventListener("change", () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        prevImg.src = URL.createObjectURL(f);
        prevStat.textContent = `Siap diunggah: ${f.name}`;
        prevBox.classList.remove("hidden");
      });

      if (isEdit) {
        wrap.querySelector("#npDelete")?.addEventListener("click", async () => {
          if (!confirm(`Hapus permanen "${existing.name}" dari katalog?`)) return;
          try {
            await deleteDoc(doc(db, "publicCatalog", existing.id));
            closeModal();
            toast("Produk dihapus.");
          } catch (e) {
            showErr(wrap.querySelector("#npErr"), "Gagal menghapus produk.");
          }
        });
      }

      wrap.querySelector("#npSave").addEventListener("click", async () => {
        const name = wrap.querySelector("#npName").value.trim();
        const code = wrap.querySelector("#npCode").value.trim();
        const brand = wrap.querySelector("#npBrand").value;
        const size = wrap.querySelector("#npSize").value.trim();
        const color = wrap.querySelector("#npColor").value.trim();
        const price = Number(wrap.querySelector("#npPrice").value);
        const stock = Math.trunc(Number(wrap.querySelector("#npStock").value));
        const description = wrap.querySelector("#npDesc").value.trim();
        const err = wrap.querySelector("#npErr");
        const saveBtn = wrap.querySelector("#npSave");

        if (!name) return showErr(err, "Nama barang wajib diisi.");
        if (!Number.isFinite(price) || price < 0) return showErr(err, "Harga jual harus angka 0 atau lebih.");
        if (!Number.isInteger(stock) || stock < 0) return showErr(err, "Stok harus bilangan bulat 0 atau lebih.");

        saveBtn.disabled = true;
        saveBtn.textContent = "Menyimpan...";
        try {
          let imageUrl = existing?.imageUrl || "";
          const chosenFile = fileInput.files?.[0];
          if (chosenFile) {
            saveBtn.textContent = "Mengunggah foto...";
            imageUrl = await uploadToCloudinary(chosenFile, existing?.id || code || "sjs");
          }
          const payload = {
            name,
            price,
            stock,
            code,
            brand,
            size,
            color,
            description,
            imageUrl,
            updatedAt: serverTimestamp()
          };
          if (isEdit) {
            await updateDoc(doc(db, "publicCatalog", existing.id), payload);
            toast("Produk & foto berhasil diperbarui.");
          } else {
            await addDoc(collection(db, "publicCatalog"), payload);
            toast("Produk baru berhasil disimpan.");
          }
          closeModal();
        } catch (e) {
          console.error(e);
          showErr(err, e.message || "Gagal menyimpan produk.");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Simpan Perubahan";
        }
      });
    });
  });
}

function actionUpdateStock() {
  requireOwner(() => {
    openModal("Update Stok Cepat", `
      <div><label class="${labelCls}">Cari produk</label><input id="usSearch" class="${inputCls}" placeholder="Ketik nama atau kode barang..."></div>
      <div id="usList" class="max-h-48 overflow-auto space-y-1 text-xs"></div>
      <div id="usEditor" class="hidden space-y-2 pt-2 border-t border-zinc-800">
        <p class="text-sm font-bold text-white" id="usName"></p>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="${labelCls}">Stok sekarang</label><input id="usCurrent" disabled class="${inputCls} opacity-70"></div>
          <div><label class="${labelCls}">Stok baru</label><input id="usNew" type="number" min="0" step="1" class="${inputCls}"></div>
        </div>
        <p id="usErr" class="text-xs text-rose-400 hidden"></p>
        <div class="flex justify-end"><button type="button" id="usSave" class="${btnGold}">Simpan Stok</button></div>
      </div>
    `, wrap => {
      let chosen = null;
      const renderList = () => {
        const q = wrap.querySelector("#usSearch").value.trim().toLowerCase();
        const list = PRODUCTS.filter(p => !q || String(p.name || "").toLowerCase().includes(q) || String(p.code || "").toLowerCase().includes(q)).slice(0, 30);
        wrap.querySelector("#usList").innerHTML = list.map(p =>
          `<button type="button" data-pick="${esc(p.id)}" class="w-full text-left px-2.5 py-2 rounded-lg bg-[#141821] text-white hover:bg-zinc-800 cursor-pointer flex justify-between"><span>${esc(p.name)}</span><span class="text-amber-300 font-bold">stok ${Number(p.stock ?? 0)}</span></button>`
        ).join("") || `<p class="text-zinc-400">Tidak ada produk.</p>`;
      };
      wrap.querySelector("#usSearch").addEventListener("input", renderList);
      wrap.querySelector("#usList").addEventListener("click", e => {
        const b = e.target.closest("[data-pick]");
        if (!b) return;
        chosen = PRODUCTS.find(p => p.id === b.dataset.pick);
        wrap.querySelector("#usName").textContent = chosen.name;
        wrap.querySelector("#usCurrent").value = Number(chosen.stock ?? 0);
        wrap.querySelector("#usNew").value = Number(chosen.stock ?? 0);
        wrap.querySelector("#usEditor").classList.remove("hidden");
      });
      wrap.querySelector("#usSave").addEventListener("click", async () => {
        const err = wrap.querySelector("#usErr");
        const val = Math.trunc(Number(wrap.querySelector("#usNew").value));
        if (!chosen) return showErr(err, "Pilih produk dulu.");
        if (!Number.isInteger(val) || val < 0) return showErr(err, "Stok harus bilangan bulat 0 atau lebih.");
        try {
          await updateDoc(doc(db, "publicCatalog", chosen.id), { stock: val, updatedAt: serverTimestamp() });
          closeModal();
          toast("Stok diperbarui.");
        } catch (e) {
          showErr(err, "Gagal menyimpan stok.");
        }
      });
      renderList();
    });
  });
}

// ---------- Render ----------
function productBrand(p) {
  if (p.brand) {
    const byName = ALL_BRANDS.find(b => b.name.toLowerCase() === String(p.brand).toLowerCase());
    if (byName) return byName.id;
  }
  const found = BRANDS.find(b => b.match.test(p.name || ""));
  return found ? found.id : "none";
}

function renderBrandGrid() {
  const counts = {};
  for (const p of PRODUCTS) { const id = productBrand(p); counts[id] = (counts[id] || 0) + 1; }
  $("brandTextGrid").innerHTML = ALL_BRANDS.map(b => {
    const isSel = b.id === selectedBrandId;
    return `<button type="button" data-brand="${b.id}" class="p-3 rounded-xl border text-center cursor-pointer transition ${isSel ? "border-amber-400 bg-amber-400 text-slate-950 font-black" : "border-amber-400/25 bg-[#121620] text-white hover:border-amber-400 font-bold"}">
      <span class="block text-sm">${esc(b.name)}</span>
      <span class="block text-[11px] opacity-80">${esc(b.cat)} · ${counts[b.id] || 0}</span>
    </button>`;
  }).join("");
}

function renderCatalog() {
  const q = ($("catalogSearchInput")?.value || "").trim().toLowerCase();
  const brand = ALL_BRANDS.find(b => b.id === selectedBrandId) || null;
  $("btnClearBrand").classList.toggle("hidden", !brand);
  const banner = $("brandSpecialBanner");
  const filtered = PRODUCTS.filter(p =>
    (!brand || productBrand(p) === brand.id) &&
    (!q || String(p.name || "").toLowerCase().includes(q) || String(p.code || "").toLowerCase().includes(q))
  );
  if (brand) {
    banner.classList.remove("hidden");
    $("brandSpecialTitle").textContent = `Produk ${brand.name}`;
    $("brandSpecialCount").textContent = `${filtered.length} produk ditemukan`;
  } else {
    banner.classList.add("hidden");
  }
  renderBrandGrid();
  const isOwnerLoggedIn = Boolean(currentUser && currentUser.uid === OWNER_UID);
  $("catalogGrid").innerHTML = filtered.length
    ? filtered.map(p => {
        const stock = Number(p.stock || 0);
        const waText = encodeURIComponent(`Halo Surya Jaya Sport, tanya stok ${p.name || ""}${p.code ? " (" + p.code + ")" : ""}`);
        return `<article class="gold-card overflow-hidden flex flex-col justify-between ${stock > 0 ? "" : "opacity-75"}">
          <div>
            <div class="aspect-square w-full bg-[#10141d] flex items-center justify-center overflow-hidden border-b border-zinc-800 relative">
              ${p.imageUrl
                ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" class="w-full h-full object-contain">`
                : `<span class="text-xs font-extrabold text-amber-300 px-3 text-center">${esc(p.name)}</span>`}
              ${isOwnerLoggedIn ? `<button type="button" data-edit-prod="${esc(p.id)}" class="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black shadow cursor-pointer"><i class="fa-solid fa-pen mr-1"></i>Edit / Foto</button>` : ""}
            </div>
            <div class="p-3.5 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold ${stock > 0 ? "text-emerald-400" : "text-rose-400"}">${stock > 0 ? `Stok ${stock} pcs` : "Habis"}</span>
                ${p.code ? `<span class="text-[11px] font-mono text-zinc-400">${esc(p.code)}</span>` : ""}
              </div>
              <h3 class="font-extrabold text-sm text-white leading-snug">${esc(p.name)}</h3>
            </div>
          </div>
          <div class="px-3.5 pb-3.5 pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
            <strong class="text-sm font-black text-amber-300">${rp(p.price)}</strong>
            <div class="flex items-center gap-1.5">
              ${isOwnerLoggedIn ? `<button type="button" data-edit-prod="${esc(p.id)}" class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold cursor-pointer">Edit</button>` : ""}
              <a href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black">${stock > 0 ? "Pesan WA" : "Tanya Stok"}</a>
            </div>
          </div>
        </article>`;
      }).join("")
    : `<p class="col-span-full text-center text-sm text-zinc-400 py-8">Belum ada produk untuk filter ini.</p>`;
}

function renderOps() {
  const inStock = PRODUCTS.filter(p => Number(p.stock || 0) > 0);
  const low = inStock.filter(p => Number(p.stock) < 5);
  $("opsActiveProd").textContent = String(inStock.length);
  $("opsLowStock").textContent = String(low.length);
  $("opsLowList").innerHTML = low.length
    ? low.map(p => `<div class="flex justify-between items-center gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${esc(p.name)}</span><div class="flex items-center gap-2 shrink-0"><strong class="text-rose-400">Sisa ${Number(p.stock)}</strong><button type="button" data-edit-prod="${esc(p.id)}" class="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 text-[10px] font-bold cursor-pointer">Edit</button></div></div>`).join("")
    : `<p class="text-emerald-400">Stok aman</p>`;

  const today = todayWita();
  const since7 = shiftDaysWita(today, -6);
  const todayTx = TRANSACTIONS.filter(t => !t.cancelledAt && t.date === today);
  $("opsTodaySales").textContent = rp(todayTx.reduce((s, t) => s + Number(t.totalOmset || 0), 0));
  $("opsTodayTx").textContent = String(todayTx.length);

  const weekMap = new Map();
  for (const tx of TRANSACTIONS) {
    if (tx.cancelledAt || tx.date < since7) continue;
    for (const it of (tx.items || [])) {
      const nm = String(it.name || "Barang").trim();
      weekMap.set(nm, (weekMap.get(nm) || 0) + Number(it.qty || 1));
    }
  }
  const topWeek = [...weekMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  $("opsTopWeek").innerHTML = topWeek.length
    ? topWeek.map(([nm, qty], i) => `<div class="flex justify-between gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${i + 1}. ${esc(nm)}</span><strong class="text-amber-300 shrink-0">${qty} pcs</strong></div>`).join("")
    : `<p class="text-zinc-400">Belum ada penjualan 7 hari terakhir.</p>`;
}

// ---------- Data Real-time ----------
onSnapshot(collection(db, "publicCatalog"), snap => {
  PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderOps();
  renderCatalog();
}, err => {
  console.error("Gagal memuat katalog:", err);
  $("catalogGrid").innerHTML = `<p class="col-span-full text-center text-sm text-rose-400 py-8">Katalog gagal dimuat. Muat ulang halaman.</p>`;
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  const btn = $("btnFooterOwnerLogin");
  if (btn) btn.textContent = user && user.uid === OWNER_UID ? "Keluar (Pemilik)" : "Login Pemilik";
  if (user && user.uid === OWNER_UID) {
    onSnapshot(collection(db, "artifacts", APP_ID, "public", "data", "transactions"), snap => {
      TRANSACTIONS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderOps();
    }, () => {});
  }
  renderCatalog();
});

// ---------- Event Listeners ----------
$("brandTextGrid").addEventListener("click", e => {
  const btn = e.target.closest("[data-brand]");
  if (!btn) return;
  selectedBrandId = selectedBrandId === btn.dataset.brand ? "" : btn.dataset.brand;
  renderCatalog();
});
$("btnClearBrand").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("btnBackAllCatalog").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("catalogSearchInput").addEventListener("input", renderCatalog);

$("btnViewAdmin").addEventListener("click", () => {
  $("adminSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll("[data-quick-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.quickAction;
    if (act === "produk") openProductFormModal(null);
    else if (act === "stok") actionUpdateStock();
    else if (act === "brand") {
      $("brandTextGrid").scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Pilih brand di daftar di bawah.");
    } else if (act === "qr") {
      toast("Gunakan halaman kasir/POS utama untuk cetak label QR thermal.", false);
    }
  });
});

document.addEventListener("click", e => {
  const editBtn = e.target.closest("[data-edit-prod]");
  if (!editBtn) return;
  const item = PRODUCTS.find(p => p.id === editBtn.dataset.editProd);
  if (item) openProductFormModal(item);
});

$("btnFooterOwnerLogin").addEventListener("click", () => {
  if (currentUser && currentUser.uid === OWNER_UID) {
    signOut(auth).then(() => toast("Anda sudah keluar."));
  } else {
    openLogin();
  }
});

renderOps();
renderCatalog();
