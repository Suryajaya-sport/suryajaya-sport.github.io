// admin.js (v2) - Halaman Admin POS & Katalog, Surya Jaya Sport
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
const WA_NUMBER = "6282320033333";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const BRANDS = [
  { id: "yonex", name: "Yonex", cat: "Badminton", match: /\byonex\b/i },
  { id: "lining", name: "Li-Ning", cat: "Badminton & Sport", match: /\b(li-?ning|lining)\b/i },
  { id: "victor", name: "Victor", cat: "Badminton", match: /\bvictor\b/i },
  { id: "hiqua", name: "Hiqua", cat: "Badminton", match: /\b(hi-?qua|hiqua)\b/i },
  { id: "flypower", name: "Flypower", cat: "Badminton", match: /\bflypower\b/i },
  { id: "astec", name: "Astec", cat: "Badminton", match: /\bastec\b/i },
  { id: "rs", name: "RS", cat: "Reinforce Speed", match: /\b(rs|reinforce)\b/i },
  { id: "butterfly", name: "Butterfly", cat: "Tenis Meja", match: /\bbutterfly\b/i },
  { id: "dhs", name: "DHS", cat: "Double Happiness", match: /\b(dhs|double\s*happiness)\b/i },
  { id: "nitaku", name: "Nitaku", cat: "Pingpong", match: /\b(nitaku|nittaku)\b/i },
  { id: "donics", name: "Donics", cat: "Pingpong", match: /\b(donics?|donic)\b/i },
  { id: "doublefish", name: "Double Fish", cat: "Tenis Meja", match: /\bdouble\s*fish\b/i },
  { id: "specs", name: "Specs", cat: "Futsal & Bola", match: /\bspecs\b/i },
  { id: "ortuseight", name: "Ortuseight", cat: "Futsal & Running", match: /\b(ortuseight|ortus)\b/i },
  { id: "finotti", name: "Finotti", cat: "Sepatu & Futsal", match: /\b(finotti|avo)\b/i },
  { id: "adidas", name: "Adidas", cat: "Sport & Futsal", match: /\badidas\b/i },
  { id: "nike", name: "Nike", cat: "Sport & Futsal", match: /\bnike\b/i },
  { id: "molten", name: "Molten", cat: "Bola Basket & Voli", match: /\bmolten\b/i },
  { id: "mikasa", name: "Mikasa", cat: "Bola Voli & Sepak", match: /\bmikasa\b/i },
  { id: "mizuno", name: "Mizuno", cat: "Badminton & Voli", match: /\bmizuno\b/i },
  { id: "asics", name: "Asics", cat: "Sepatu & Voli", match: /\basics\b/i }
];
const OTHER_BRAND = { id: "none", name: "No Brand", cat: "Produk lainnya", match: null };
const ALL_BRANDS = [...BRANDS, OTHER_BRAND];

let PRODUCTS = [];
let selectedBrandId = "";
let currentUser = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

// ---------- Notifikasi kecil ----------
function toast(msg, ok = true) {
  const t = document.createElement("div");
  t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg ${ok ? "bg-amber-400 text-slate-950" : "bg-rose-600 text-white"}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- Modal sederhana ----------
function openModal(title, bodyHtml, onMount) {
  closeModal();
  const wrap = document.createElement("div");
  wrap.id = "sjsModal";
  wrap.className = "fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4";
  wrap.innerHTML = `<div class="w-full max-w-md rounded-2xl border border-amber-400/40 bg-[#0b0e14] p-5 space-y-4">
      <div class="flex items-center justify-between">
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
const btnGold = "px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-sm font-black cursor-pointer";

// ---------- Login pemilik ----------
function openLogin() {
  if (currentUser && currentUser.uid === OWNER_UID) {
    toast("Anda sudah login sebagai pemilik.");
    return;
  }
  openModal("Login Pemilik", `
    <div><label class="${labelCls}">Email</label><input id="loginEmail" type="email" class="${inputCls}" autocomplete="username"></div>
    <div><label class="${labelCls}">Kata sandi</label><input id="loginPass" type="password" class="${inputCls}" autocomplete="current-password"></div>
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
        toast("Login berhasil.");
      } catch (e) {
        err.textContent = "Login gagal. Periksa email dan kata sandi.";
        err.classList.remove("hidden");
      }
    });
  });
}

function requireOwner(action) {
  if (currentUser && currentUser.uid === OWNER_UID) { action(); return; }
  toast("Login pemilik dulu untuk menggunakan fitur ini.", false);
  openLogin();
}

// ---------- Aksi cepat ----------
function actionAddProduct() {
  requireOwner(() => {
    openModal("Tambah Produk", `
      <div><label class="${labelCls}">Nama barang *</label><input id="npName" class="${inputCls}"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="${labelCls}">Kode</label><input id="npCode" class="${inputCls}" placeholder="SJS-xxx"></div>
        <div><label class="${labelCls}">Brand</label>
          <select id="npBrand" class="${inputCls}">
            <option value="">No Brand</option>
            ${BRANDS.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join("")}
          </select></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="${labelCls}">Harga jual (Rp) *</label><input id="npPrice" type="number" min="0" class="${inputCls}"></div>
        <div><label class="${labelCls}">Stok awal (pcs) *</label><input id="npStock" type="number" min="0" step="1" class="${inputCls}"></div>
      </div>
      <p id="npErr" class="text-xs text-rose-400 hidden"></p>
      <div class="flex justify-end"><button type="button" id="npSave" class="${btnGold}">Simpan</button></div>
    `, wrap => {
      wrap.querySelector("#npSave").addEventListener("click", async () => {
        const name = wrap.querySelector("#npName").value.trim();
        const price = Number(wrap.querySelector("#npPrice").value);
        const stock = Number(wrap.querySelector("#npStock").value);
        const code = wrap.querySelector("#npCode").value.trim();
        const brand = wrap.querySelector("#npBrand").value;
        const err = wrap.querySelector("#npErr");
        if (!name) return showErr(err, "Nama barang wajib diisi.");
        if (!Number.isFinite(price) || price < 0) return showErr(err, "Harga jual harus angka 0 atau lebih.");
        if (!Number.isInteger(stock) || stock < 0) return showErr(err, "Stok harus bilangan bulat 0 atau lebih.");
        const data = { name, price, stock, updatedAt: serverTimestamp() };
        if (code) data.code = code;
        if (brand) data.brand = brand;
        try {
          await addDoc(collection(db, "publicCatalog"), data);
          closeModal();
          toast("Produk ditambahkan.");
        } catch (e) {
          console.error(e);
          showErr(err, "Gagal menyimpan. Pastikan login pemilik masih aktif.");
        }
      });
    });
  });
}

function actionUpdateStock() {
  requireOwner(() => {
    openModal("Update Stok", `
      <div><label class="${labelCls}">Cari produk</label><input id="usSearch" class="${inputCls}" placeholder="Nama atau kode"></div>
      <div id="usList" class="max-h-48 overflow-auto space-y-1 text-xs"></div>
      <div id="usEditor" class="hidden space-y-2">
        <p class="text-sm font-bold text-white" id="usName"></p>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="${labelCls}">Stok sekarang</label><input id="usCurrent" disabled class="${inputCls} opacity-70"></div>
          <div><label class="${labelCls}">Stok baru</label><input id="usNew" type="number" min="0" step="1" class="${inputCls}"></div>
        </div>
        <p id="usErr" class="text-xs text-rose-400 hidden"></p>
        <div class="flex justify-end"><button type="button" id="usSave" class="${btnGold}">Simpan stok</button></div>
      </div>
    `, wrap => {
      let chosen = null;
      const renderList = () => {
        const q = wrap.querySelector("#usSearch").value.trim().toLowerCase();
        const list = PRODUCTS.filter(p => !q || String(p.name || "").toLowerCase().includes(q) || String(p.code || "").toLowerCase().includes(q)).slice(0, 30);
        wrap.querySelector("#usList").innerHTML = list.map(p =>
          `<button type="button" data-pick="${esc(p.id)}" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#141821] text-white hover:bg-zinc-800 cursor-pointer">${esc(p.name)} <span class="text-zinc-400">· stok ${Number(p.stock ?? 0)}</span></button>`
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
        const val = Number(wrap.querySelector("#usNew").value);
        if (!chosen) return showErr(err, "Pilih produk dulu.");
        if (!Number.isInteger(val) || val < 0) return showErr(err, "Stok harus bilangan bulat 0 atau lebih.");
        try {
          await updateDoc(doc(db, "publicCatalog", chosen.id), { stock: val, updatedAt: serverTimestamp() });
          closeModal();
          toast("Stok diperbarui.");
        } catch (e) {
          console.error(e);
          showErr(err, "Gagal menyimpan stok.");
        }
      });
      renderList();
    });
  });
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }

function actionBrand() {
  $("brandTextGrid").scrollIntoView({ behavior: "smooth", block: "center" });
  toast("Pilih brand di daftar di bawah. Untuk menambah brand baru, ubah daftar BRANDS di admin.js.");
}

function actionQr() {
  toast("Cetak label QR tersedia di Dashboard admin utama. Halaman ini hanya menampilkan katalog.", false);
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
      <span class="block text-[11px] opacity-80">${esc(b.cat)} · ${counts[b.id] || 0} produk</span>
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
  $("catalogGrid").innerHTML = filtered.length
    ? filtered.map(p => {
        const stock = Number(p.stock || 0);
        const waText = encodeURIComponent(`Halo Surya Jaya Sport, tanya stok ${p.name || ""}${p.code ? " (" + p.code + ")" : ""}`);
        return `<article class="gold-card p-4 flex flex-col justify-between gap-3 ${stock > 0 ? "" : "opacity-70"}">
          <div>
            <span class="text-[11px] font-bold ${stock > 0 ? "text-amber-300" : "text-rose-400"}">${stock > 0 ? `Stok ${stock} pcs` : "Habis"}</span>
            ${p.code ? `<span class="ml-2 text-[11px] text-zinc-400">${esc(p.code)}</span>` : ""}
            <h3 class="font-extrabold text-sm text-white mt-1">${esc(p.name)}</h3>
          </div>
          <div class="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <strong class="text-sm font-black text-amber-300">${rp(p.price)}</strong>
            <a href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black">${stock > 0 ? "Pesan WA" : "Tanya Stok"}</a>
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
    ? low.map(p => `<div class="flex justify-between gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${esc(p.name)}</span><strong class="text-rose-400 shrink-0">Sisa ${Number(p.stock)}</strong></div>`).join("")
    : `<p class="text-emerald-400">Stok aman</p>`;
}

// ---------- Data real-time ----------
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
});

// ---------- Event ----------
$("brandTextGrid").addEventListener("click", e => {
  const btn = e.target.closest("[data-brand]");
  if (!btn) return;
  selectedBrandId = selectedBrandId === btn.dataset.brand ? "" : btn.dataset.brand;
  renderCatalog();
});
$("btnClearBrand").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("btnBackAllCatalog").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("catalogSearchInput").addEventListener("input", renderCatalog);

// Katalog User: tampilkan bagian katalog di halaman ini
$("btnViewCatalog").addEventListener("click", () => {
  $("catalogSection").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("btnViewAdmin").addEventListener("click", () => {
  $("adminSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll("[data-quick-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.quickAction;
    if (act === "produk") actionAddProduct();
    else if (act === "stok") actionUpdateStock();
    else if (act === "brand") actionBrand();
    else if (act === "qr") actionQr();
  });
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
