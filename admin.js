const BRANDS = [
  { id: "yonex", name: "Yonex", cat: "Badminton", re: /\byonex\b/i },
  { id: "lining", name: "Li-Ning", cat: "Badminton & Sport", re: /\b(li-?ning|lining)\b/i },
  { id: "victor", name: "Victor", cat: "Badminton", re: /\bvictor\b/i },
  { id: "hiqua", name: "Hiqua", cat: "Badminton", re: /\b(hi-?qua|hiqua)\b/i },
  { id: "rs", name: "RS", cat: "Reinforce Speed", re: /\b(rs|reinforce)\b/i },
  { id: "flypower", name: "Flypower", cat: "Badminton", re: /\bflypower\b/i },
  { id: "astec", name: "Astec", cat: "Badminton", re: /\bastec\b/i },
  { id: "butterfly", name: "Butterfly", cat: "Tenis Meja", re: /\bbutterfly\b/i },
  { id: "dhs", name: "DHS", cat: "Double Happiness", re: /\b(dhs|double\s*happiness)\b/i },
  { id: "nitaku", name: "Nitaku", cat: "Pingpong", re: /\b(nitaku|nittaku)\b/i },
  { id: "donics", name: "Donics", cat: "Pingpong", re: /\b(donics?|donic)\b/i },
  { id: "doublefish", name: "Double Fish", cat: "Tenis Meja", re: /\bdouble\s*fish\b/i },
  { id: "specs", name: "Specs", cat: "Futsal & Bola", re: /\bspecs\b/i },
  { id: "ortuseight", name: "Ortuseight", cat: "Futsal & Running", re: /\b(ortuseight|ortus)\b/i },
  { id: "adidas", name: "Adidas", cat: "Sport & Futsal", re: /\badidas\b/i },
  { id: "nike", name: "Nike", cat: "Sport & Futsal", re: /\bnike\b/i },
  { id: "molten", name: "Molten", cat: "Bola Basket & Voli", re: /\bmolten\b/i },
  { id: "mikasa", name: "Mikasa", cat: "Bola Voli & Sepak", re: /\bmikasa\b/i },
  { id: "mizuno", name: "Mizuno", cat: "Badminton & Voli", re: /\bmizuno\b/i },
  { id: "asics", name: "Asics", cat: "Sepatu & Voli", re: /\basics\b/i }
];

const SAMPLE_PRODUCTS = [
  { id: "1", name: "Yonex Exbolt 65 Senar Badminton", price: 145000, stock: 12, soldWeek: 18 },
  { id: "2", name: "Ortuseight Catalyst Legion Futsal", price: 399000, stock: 3, soldWeek: 11 },
  { id: "3", name: "Li-Ning No. 1 Senar Raket", price: 110000, stock: 2, soldWeek: 9 },
  { id: "4", name: "Mikasa MVA200 Bola Voli", price: 650000, stock: 8, soldWeek: 7 }
];

let selectedBrandId = "";

function rp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function renderOps() {
  const activeCount = SAMPLE_PRODUCTS.length;
  const lowItems = SAMPLE_PRODUCTS.filter(p => p.stock < 5);
  document.getElementById("opsActiveProd").textContent = String(activeCount);
  document.getElementById("opsLowStock").textContent = String(lowItems.length);

  const topWeek = SAMPLE_PRODUCTS.slice().sort((a, b) => b.soldWeek - a.soldWeek).slice(0, 4);
  document.getElementById("opsTopWeek").innerHTML = topWeek.map((p, i) =>
    `<div class="flex justify-between gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${i + 1}. ${p.name}</span><strong class="text-amber-300 shrink-0">${p.soldWeek} pcs</strong></div>`
  ).join("");

  document.getElementById("opsLowList").innerHTML = lowItems.length
    ? lowItems.map(p =>
        `<div class="flex justify-between gap-2 py-1 border-b border-zinc-800 last:border-0"><span class="truncate">${p.name}</span><strong class="text-rose-400 shrink-0">Sisa ${p.stock}</strong></div>`
      ).join("")
    : `<p class="text-emerald-400">Stok aman</p>`;
}

function renderBrandsAndCatalog() {
  const q = (document.getElementById("catalogSearchInput")?.value || "").trim().toLowerCase();
  const brandObj = BRANDS.find(b => b.id === selectedBrandId) || null;

  document.getElementById("btnClearBrand")?.classList.toggle("hidden", !brandObj);
  const banner = document.getElementById("brandSpecialBanner");
  if (brandObj) {
    banner.classList.remove("hidden");
    document.getElementById("brandSpecialTitle").textContent = `Produk ${brandObj.name}`;
  } else {
    banner.classList.add("hidden");
  }

  const filtered = SAMPLE_PRODUCTS.filter(p => {
    const matchBrand = !brandObj || brandObj.re.test(p.name);
    const matchQ = !q || p.name.toLowerCase().includes(q);
    return matchBrand && matchQ;
  });

  if (brandObj) {
    document.getElementById("brandSpecialCount").textContent = `${filtered.length} produk ditemukan untuk ${brandObj.name}`;
  }

  document.getElementById("brandTextGrid").innerHTML = BRANDS.map(b => {
    const isSel = b.id === selectedBrandId;
    return `<button type="button" data-brand="${b.id}" class="p-3 rounded-xl border text-center cursor-pointer transition ${isSel ? "border-amber-400 bg-amber-400 text-slate-950 font-black" : "border-amber-400/25 bg-[#121620] text-white hover:border-amber-400 font-bold"}">
      <span class="block text-sm">${b.name}</span>
      <span class="block text-[11px] opacity-80">${b.cat}</span>
    </button>`;
  }).join("");

  document.getElementById("catalogGrid").innerHTML = filtered.length
    ? filtered.map(p => `<article class="gold-card p-4 flex flex-col justify-between gap-3">
        <div>
          <span class="text-[11px] font-bold text-amber-300">Stok ${p.stock} pcs</span>
          <h3 class="font-extrabold text-sm text-white mt-1">${p.name}</h3>
        </div>
        <div class="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <strong class="text-sm font-black text-amber-300">${rp(p.price)}</strong>
          <a href="https://wa.me/6282320033333?text=${encodeURIComponent("Halo Surya Jaya Sport, tanya stok " + p.name)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg gold-btn text-xs">Pesan WA</a>
        </div>
      </article>`).join("")
    : `<p class="col-span-full text-center text-sm text-zinc-400 py-8">Belum ada produk untuk filter ini.</p>`;
}

document.getElementById("brandTextGrid")?.addEventListener("click", e => {
  const btn = e.target.closest("[data-brand]");
  if (!btn) return;
  selectedBrandId = selectedBrandId === btn.dataset.brand ? "" : btn.dataset.brand;
  renderBrandsAndCatalog();
});
document.getElementById("btnClearBrand")?.addEventListener("click", () => { selectedBrandId = ""; renderBrandsAndCatalog(); });
document.getElementById("btnBackAllCatalog")?.addEventListener("click", () => { selectedBrandId = ""; renderBrandsAndCatalog(); });
document.getElementById("catalogSearchInput")?.addEventListener("input", renderBrandsAndCatalog);
document.getElementById("btnViewCatalog")?.addEventListener("click", () => {
  document.getElementById("catalogSection")?.scrollIntoView({ behavior: "smooth" });
});
document.getElementById("btnViewAdmin")?.addEventListener("click", () => {
  document.getElementById("adminSection")?.scrollIntoView({ behavior: "smooth" });
});

renderOps();
renderBrandsAndCatalog();
