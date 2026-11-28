// admin.js - Katalog User dengan Sidebar Brand Vertikal (AVO & Finotti terpisah + No Brand)
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

// AVO dan Finotti dipisah sebagai 2 merek berbeda
const BRANDS = [
  { id: "yonex", name: "Yonex", match: /\byonex\b/i },
  { id: "lining", name: "Li-Ning", match: /\b(li-?ning|lining)\b/i },
  { id: "victor", name: "Victor", match: /\bvictor\b/i },
  { id: "hiqua", name: "Hiqua", match: /\b(hi-?qua|hiqua)\b/i },
  { id: "flypower", name: "Flypower", match: /\bflypower\b/i },
  { id: "astec", name: "Astec", match: /\bastec\b/i },
  { id: "rs", name: "RS", match: /\b(rs|reinforce)\b/i },
  { id: "hundred", name: "Hundred", match: /\bhundred\b/i },
  { id: "powermax", name: "Powermax", match: /\bpower\s*max\b/i },
  { id: "avo", name: "AVO", match: /\bavo\b/i },
  { id: "finotti", name: "Finotti", match: /\bfinotti\b/i },
  { id: "specs", name: "Specs", match: /\bspecs\b/i },
  { id: "ortuseight", name: "Ortuseight", match: /\b(ortuseight|ortus)\b/i },
  { id: "adidas", name: "Adidas", match: /\badidas\b/i },
  { id: "nike", name: "Nike", match: /\bnike\b/i },
  { id: "molten", name: "Molten", match: /\bmolten\b/i },
  { id: "mikasa", name: "Mikasa", match: /\bmikasa\b/i },
  { id: "mizuno", name: "Mizuno", match: /\bmizuno\b/i },
  { id: "asics", name: "Asics", match: /\basics\b/i },
  { id: "butterfly", name: "Butterfly", match: /\bbutterfly\b/i },
  { id: "dhs", name: "DHS", match: /\b(dhs|double\s*happiness)\b/i },
  { id: "nitaku", name: "Nitaku", match: /\b(nitaku|nittaku)\b/i },
  { id: "donics", name: "Donics", match: /\b(donics?|donic)\b/i },
  { id: "doublefish", name: "Double Fish", match: /\bdouble\s*fish\b/i },
  { id: "yasaka", name: "Yasaka", match: /\byasaka\b/i },
  { id: "tama", name: "TAMA", match: /\btama\b/i },
  { id: "elixir", name: "Elixir", match: /\belixir\b/i }
];
const NO_BRAND = { id: "no-brand", name: "No Brand", match: null };
const ALL_BRANDS = [...BRANDS, NO_BRAND];

let RAW_PRODUCTS = [];
let selectedBrandId = "";
const cart = new Map();

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const rp = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

function detectBrandId(item) {
  if (item.brand) {
    const exact = ALL_BRANDS.find(b => b.name.toLowerCase() === String(item.brand).trim().toLowerCase());
    if (exact) return exact.id;
  }
  const text = [item.name, item.code, item.description].filter(Boolean).join(" ");
  const found = BRANDS.find(b => b.match.test(text));
  return found ? found.id : "no-brand";
}

// Gabungkan item varian yang memiliki nama produk & harga yang sama (misal SJS-033 & SJS-033-B)
function getGroupedProducts() {
  const hideZero = $("chkHideOutOfStock")?.checked !== false;
  const map = new Map();
  for (const p of RAW_PRODUCTS) {
    const st = Number(p.stock || 0);
    if (hideZero && st <= 0) continue;
    const key = String(p.name || "").trim().toLowerCase() + "::" + Number(p.price || 0);
    if (!map.has(key)) {
      map.set(key, {
        ...p,
        totalStock: st,
        variants: [{ id: p.id, code: p.code || "", size: p.size || "", color: p.color || "", stock: st }]
      });
    } else {
      const cur = map.get(key);
      cur.totalStock += st;
      cur.variants.push({ id: p.id, code: p.code || "", size: p.size || "", color: p.color || "", stock: st });
      if (!cur.imageUrl && p.imageUrl) cur.imageUrl = p.imageUrl;
    }
  }
  return [...map.values()];
}

function renderBrandSidebar(groupedItems) {
  const counts = {};
  for (const item of groupedItems) {
    const bid = detectBrandId(item);
    counts[bid] = (counts[bid] || 0) + 1;
  }

  $("btnResetBrandSide")?.classList.toggle("hidden", !selectedBrandId);

  const allBtn = `<button type="button" data-brand="" class="brand-side-btn ${selectedBrandId === "" ? "is-active" : ""}">
    <span>Semua Merek</span>
    <span class="brand-count-pill">${groupedItems.length}</span>
  </button>`;

  const brandBtns = ALL_BRANDS
    .filter(b => (counts[b.id] || 0) > 0 || b.id === "no-brand" || b.id === selectedBrandId)
    .map(b => {
      const active = selectedBrandId === b.id;
      const cnt = counts[b.id] || 0;
      return `<button type="button" data-brand="${esc(b.id)}" class="brand-side-btn ${active ? "is-active" : ""}">
        <span class="truncate">${esc(b.name)}</span>
        <span class="brand-count-pill">${cnt}</span>
      </button>`;
    }).join("");

  $("brandVerticalList").innerHTML = allBtn + brandBtns;
}

function renderCatalog() {
  const grouped = getGroupedProducts();
  renderBrandSidebar(grouped);

  const q = ($("userCatalogSearch")?.value || "").trim().toLowerCase();
  const activeBrand = ALL_BRANDS.find(b => b.id === selectedBrandId) || null;

  const banner = $("brandSpecialBanner");
  const filtered = grouped.filter(item => {
    const matchB = !activeBrand || detectBrandId(item) === activeBrand.id;
    const hay = [item.name, item.code, item.size, item.color, item.description].filter(Boolean).join(" ").toLowerCase();
    const matchQ = !q || hay.includes(q);
    return matchB && matchQ;
  });

  if (activeBrand) {
    banner.hidden = false;
    $("brandSpecialTitle").textContent = activeBrand.name;
    $("brandSpecialCount").textContent = `${filtered.length} produk tersedia untuk merek ${activeBrand.name}`;
  } else {
    banner.hidden = true;
  }

  $("catalogResultLabel").textContent = `${filtered.length} produk`;

  $("userCatalogGrid").innerHTML = filtered.length
    ? filtered.map(item => {
        const st = Number(item.totalStock ?? item.stock ?? 0);
        const varCount = item.variants?.length || 1;
        const codes = item.variants?.map(v => v.code).filter(Boolean).join(" / ") || item.code || "";
        const waMsg = encodeURIComponent(`Halo Surya Jaya Sport, saya mau tanya stok ${item.name} (${rp(item.price)})`);
        return `<article class="sjs-card overflow-hidden flex flex-col justify-between">
          <div>
            <div class="aspect-square w-full bg-[#10141d] flex items-center justify-center overflow-hidden border-b border-zinc-800 relative">
              ${varCount > 1 ? `<span class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full sjs-btn-gold text-[10px]">${varCount} Varian</span>` : ""}
              ${item.imageUrl
                ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.name)}" loading="lazy" class="w-full h-full object-contain">`
                : `<span class="text-xs font-extrabold text-amber-300 px-4 text-center">${esc(item.name)}</span>`}
            </div>
            <div class="p-3.5 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-[10px] text-amber-300 truncate">${esc(codes)}</span>
                <span class="text-[11px] font-bold ${st > 0 ? "text-emerald-400" : "text-rose-400"} shrink-0">${st > 0 ? `Stok ${st} pcs` : "Habis"}</span>
              </div>
              <h3 class="font-extrabold text-sm text-white leading-snug">${esc(item.name)}</h3>
            </div>
          </div>
          <div class="px-3.5 pb-3.5 pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
            <strong class="text-sm font-black text-amber-300 tabular-nums">${rp(item.price)}</strong>
            <div class="flex items-center gap-1.5">
              <button type="button" data-add-cart="${esc(item.id)}" class="px-2.5 py-1.5 rounded-xl sjs-btn-gold text-xs cursor-pointer">+ Keranjang</button>
              <a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 rounded-xl sjs-btn-dark text-xs">WA</a>
            </div>
          </div>
        </article>`;
      }).join("")
    : `<p class="col-span-full text-center text-sm text-zinc-400 py-10">Tidak ada produk yang cocok dengan filter ini.</p>`;
}

function renderCartModal() {
  const entries = [...cart.values()];
  $("userCartBadge").textContent = String(entries.reduce((s, e) => s + e.qty, 0));
  const total = entries.reduce((s, e) => s + e.price * e.qty, 0);
  $("userCartTotal").textContent = `Total: ${rp(total)}`;
  const waBtn = $("btnSendCartWa");
  if (!entries.length) {
    $("userCartList").innerHTML = `<p class="text-zinc-400 py-4 text-center">Keranjang masih kosong.</p>`;
    waBtn.classList.add("hidden");
    return;
  }
  $("userCartList").innerHTML = entries.map(e => `
    <div class="flex items-center justify-between gap-2 py-2 border-b border-zinc-800">
      <div class="min-w-0">
        <p class="font-bold text-white truncate">${esc(e.name)}</p>
        <span class="text-amber-300">${e.qty} × ${rp(e.price)}</span>
      </div>
      <button type="button" data-del-cart="${esc(e.id)}" class="px-2 py-1 rounded bg-rose-950 text-rose-300 font-bold cursor-pointer">Hapus</button>
    </div>`).join("");
  const lines = entries.map((e, i) => `${i + 1}. ${e.name} × ${e.qty} = ${rp(e.price * e.qty)}`);
  const text = `Halo Surya Jaya Sport, saya mau pesan:\n${lines.join("\n")}\nPerkiraan total: ${rp(total)}`;
  waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  waBtn.classList.remove("hidden");
}

onSnapshot(collection(db, "publicCatalog"), snap => {
  RAW_PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCatalog();
}, err => {
  console.error("Gagal memuat katalog:", err);
  $("userCatalogGrid").innerHTML = `<p class="col-span-full text-center text-sm text-rose-400 py-8">Katalog gagal dimuat. Muat ulang halaman.</p>`;
});

$("brandVerticalList").addEventListener("click", e => {
  const btn = e.target.closest("[data-brand]");
  if (!btn) return;
  const bid = btn.dataset.brand;
  selectedBrandId = (bid === "" || selectedBrandId === bid) ? "" : bid;
  renderCatalog();
});
$("btnResetBrandSide").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("btnShowAllProducts").addEventListener("click", () => { selectedBrandId = ""; renderCatalog(); });
$("userCatalogSearch").addEventListener("input", renderCatalog);
$("chkHideOutOfStock").addEventListener("change", renderCatalog);

$("userCatalogGrid").addEventListener("click", e => {
  const addBtn = e.target.closest("[data-add-cart]");
  if (!addBtn) return;
  const item = RAW_PRODUCTS.find(p => p.id === addBtn.dataset.addCart);
  if (!item) return;
  const cur = cart.get(item.id) || { id: item.id, name: item.name, price: Number(item.price || 0), qty: 0 };
  cur.qty += 1;
  cart.set(item.id, cur);
  renderCartModal();
});

$("btnOpenUserCart").addEventListener("click", () => { renderCartModal(); $("userCartDialog").showModal(); });
$("btnCloseUserCart").addEventListener("click", () => $("userCartDialog").close());
$("userCartList").addEventListener("click", e => {
  const del = e.target.closest("[data-del-cart]");
  if (!del) return;
  cart.delete(del.dataset.delCart);
  renderCartModal();
});
