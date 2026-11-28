// admin.js - Halaman Admin POS & Katalog (Surya Jaya Sport)
// Data katalog diambil langsung dari Firestore (koleksi publicCatalog).
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFtI_lwLU7cDcioDE1GpgC0AjKPZ1mHag",
  authDomain: "suryajayasport-3fd5e.firebaseapp.com",
  projectId: "suryajayasport-3fd5e",
  storageBucket: "suryajayasport-3fd5e.firebasestorage.app",
  messagingSenderId: "501860315687",
  appId: "1:501860315687:web:3692f12c2b59a1e16d9402"
};
const WA_NUMBER = "6282320033333";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Daftar brand. "match" dipakai bila field brand belum diisi di Firestore.
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
const OTHER_BRAND = { id: "none", name: "Tanpa Brand", cat: "Produk lainnya", match: null };
const ALL_BRANDS = [...BRANDS, OTHER_BRAND];

let PRODUCTS = [];
let selectedBrandId = "";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

function productBrand(p) {
  if (p.brand) {
    const byName = ALL_BRANDS.find(b => b.name.toLowerCase() === String(p.brand).toLowerCase());
    if (byName) return byName.id;
  }
  const name = p.name || "";
  const found = BRANDS.find(b => b.match.test(name));
  return found ? found.id : "none";
}

function countPerBrand() {
  const counts = {};
  for (const p of PRODUCTS) {
    const id = productBrand(p);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function renderBrandGrid() {
  const counts = countPerBrand();
  $("brandTextGrid").innerHTML = ALL_BRANDS.map(b => {
    const isSel = b.id === selectedBrandId;
    const n = counts[b.id] || 0;
    return `<button type="button" data-brand="${b.id}" class="p-3 rounded-xl border text-center cursor-pointer transition ${isSel ? "border-amber-400 bg-amber-400 text-slate-950 font-black" : "border-amber-400/25 bg-[#121620] text-white hover:border-amber-400 font-bold"}">
      <span class="block text-sm">${esc(b.name)}</span>
      <span class="block text-[11px] opacity-80">${esc(b.cat)} · ${n} produk</span>
    </button>`;
  }).join("");
}

function renderCatalog() {
  const q = ($("catalogSearchInput")?.value || "").trim().toLowerCase();
  const brand = ALL_BRANDS.find(b => b.id === selectedBrandId) || null;

  $("btnClearBrand")?.classList.toggle("hidden", !brand);
  const banner = $("brandSpecialBanner");
  const filtered = PRODUCTS.filter(p =>
    (!brand || productBrand(p) === brand.id) &&
    (!q || String(p.name || "").toLowerCase().includes(q))
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
        const stockLabel = stock > 0 ? `Stok ${stock} pcs` : "Habis";
        const waText = encodeURIComponent(`Halo Surya Jaya Sport, tanya stok ${p.name || ""}${p.code ? " (" + p.code + ")" : ""}`);
        const btnLabel = stock > 0 ? "Pesan WA" : "Tanya Stok";
        return `<article class="gold-card p-4 flex flex-col justify-between gap-3 ${stock > 0 ? "" : "opacity-70"}">
          <div>
            <span class="text-[11px] font-bold ${stock > 0 ? "text-amber-300" : "text-rose-400"}">${esc(stockLabel)}</span>
            ${p.code ? `<span class="ml-2 text-[11px] text-zinc-400">${esc(p.code)}</span>` : ""}
            <h3 class="font-extrabold text-sm text-white mt-1">${esc(p.name)}</h3>
          </div>
          <div class="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <strong class="text-sm font-black text-amber-300">${rp(p.price)}</strong>
            <a href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg gold-btn text-xs">${btnLabel}</a>
          </div>
        </article>`;
      }).join("")
    : `<p class="col-span-full text-center text-sm text-zinc-400 py-8">Belum ada produk untuk filter ini.</p>`;
}

function renderOps() {
  const items = PRODUCTS;
  const low = items.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) < 5);
  $("opsActiveProd").textContent = String(items.filter(p => Number(p.stock || 0) > 0).length);
  $("opsLowStock").textContent = String(low.length);
  $("opsLowList").innerHTML = low.length
    ? low.map(p => `<div class="flex justify-between gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${esc(p.name)}</span><strong class="text-rose-400 shrink-0">Sisa ${Number(p.stock)}</strong></div>`).join("")
    : `<p class="text-emerald-400">Stok aman</p>`;
  // Produk terlaris memerlukan data penjualan dari koleksi transactions (belum tersedia di halaman ini).
  $("opsTopWeek").innerHTML = `<p class="text-zinc-400">Data penjualan mingguan belum tersedia di halaman ini.</p>`;
}

// Data katalog real-time dari Firestore
onSnapshot(collection(db, "publicCatalog"), snap => {
  PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderOps();
  renderCatalog();
}, err => {
  console.error("Gagal memuat katalog:", err);
  $("catalogGrid").innerHTML = `<p class="col-span-full text-center text-sm text-rose-400 py-8">Katalog gagal dimuat. Muat ulang halaman.</p>`;
});

// Event handler
$("brandTextGrid").addEventListener("click", e => {
  const btn = e.target.closest("[data-brand]");
  if (!btn) return;
  selectedBrandId = selectedBrandId === btn.dataset.brand ? "" : btn.dataset.brand;
  renderCatalog();
});
$("btnClearBrand").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("btnBackAllCatalog").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("catalogSearchInput").addEventListener("input", renderCatalog);

$("btnViewCatalog").addEventListener("click", () => { window.location.href = "./"; });
$("btnViewAdmin").addEventListener("click", () => {
  $("adminSection").scrollIntoView({ behavior: "smooth" });
});

// Aksi cepat & login pemilik: dikirim sebagai event agar modul admin utama yang menanganinya.
document.querySelectorAll("[data-quick-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("sjs:quick-action", { detail: btn.dataset.quickAction }));
  });
});
$("btnFooterOwnerLogin").addEventListener("click", () => {
  document.dispatchEvent(new CustomEvent("sjs:owner-login"));
});
