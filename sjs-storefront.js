// ==================== SJS SHARED STOREFRONT RENDERER (FRONTPAGE & ADMIN MODE PELANGGAN) ====================
export const LOW_STOCK_LIMIT = 5;
export const CATALOG_WA = "https://wa.me/6282320033333";
export const SENAR_SERVICE_NOTE = "Harga tercantum sudah termasuk jasa pasang senar.";

export function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

export function formatRp(n) {
  return "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
}

export function safeHttpsUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export function thumbnailUrl(url, width = 360) {
  if (!url || !url.includes("/image/upload/")) return url;
  return url.replace("/image/upload/", `/image/upload/c_limit,w_${width},q_auto:eco,f_auto/`);
}

export const MUSIC_RE = /\b(gitar|guitar|ukulele|bass|capo|plektrum|musik|akustik|acoustic|klasik|classic|elektrik|electric|biola|violin|drum|stik\s*drum|cajon|jimbe|harmonika|tama|sonor|zildjian|yamaha\s*f|pyramid|d'?addario|orphee|ernie\s*ball|elixir|fender|nilon|nylon|kawat)\b/i;
export const BALL_ITEM_RE = /\b(futsal|bola|sepak|basket|voli|volley|football|soccer|molten|spalding|mikasa|nassau)\b/i;
export const BADMINTON_STRING_MODEL_RE = /\b(bg\s*\d{1,2}m?(?!\d)|nbg\s*\d{2,3}(?!\d)|exbolt|nanogy|aerobite|aerosonic|ultimax|tectonic\s*65|magnite\s*\d{2,3}|vbs\s*\d{2,3}(?!\d)|jp\s*\d{2,3}|no\.?\s*[157]\s*boost?)\b/i;
export const BADMINTON_BRAND_RE = /\b(badminton|bulutangkis|yonex|lining|li-ning|victor|felet|hi-?qua|maxbolt|hundred|kizuna|toalson|apacs|power\s*max|tectonic|flypower|mizuno|astec|hart|ebox|eagle|prochamps|pro\s*ace|ashaway|gosen|rs\b|reinforce|kawasaki|fleet|babolat)\b/i;
export const NOT_STRING_ITEM_RE = /\b(raket|racket|sepatu|baju|jersey|celana|tas|grip|kok|shuttlecock|kaos|net|piala|taping|bola|basket|futsal|voli|volley|sepak|molten|spalding|mikasa|catur|chess|pingpong|tenis|senapan|peluru|mimis|sepatu\s*roda|skate|deker|sarung\s*tangan|pompa|matras|dumbbell|barbel|skipping|pemasang)\b/i;

export function isSenarBadminton(item) {
  const name = String(item?.name || "").trim();
  const desc = String(item?.description || "").trim();
  const txt = [name, item?.category, desc].filter(Boolean).join(" ");
  if (MUSIC_RE.test(txt)) return false;
  if (BALL_ITEM_RE.test(txt)) return false;
  if (NOT_STRING_ITEM_RE.test(name)) return false;
  if (/\bsenar\s+(raket|badminton|bulutangkis)\b/i.test(name)) return true;
  const hasSenarWord = /\bsenar\b/i.test(name);
  const hasStringModel = BADMINTON_STRING_MODEL_RE.test(name);
  const hasBadmintonBrand = BADMINTON_BRAND_RE.test(txt);
  if (hasSenarWord && (hasStringModel || hasBadmintonBrand)) return true;
  if (hasStringModel && !hasSenarWord && !NOT_STRING_ITEM_RE.test(name)) return true;
  return false;
}

export function matchesCatalogCategory(item, category) {
  if (category === "all") return true;
  const name = String(item?.name || "");
  const isPingpong = /\b(pingpong|tenis\s*meja)\b/i.test(name);
  const ball = !MUSIC_RE.test(name) && BALL_ITEM_RE.test(name);
  const badminton = !isPingpong && !ball && !MUSIC_RE.test(name) && (isSenarBadminton(item) || /\b(badminton|bulutangkis|raket|shuttlecock|kok|yonex|lining|li-ning|victor|felet|hi-?qua|maxbolt|hundred|kizuna|toalson|apacs|power\s*max|tectonic|flypower|mizuno|astec|hart|ebox|prochamps|ashaway|gosen|bg\s*\d{1,2}m?(?!\d)|nbg\s*\d{2,3}(?!\d)|exbolt|nanogy)\b/i.test(name));
  const music = MUSIC_RE.test(name) || (!badminton && !ball && /\bsenar\b/i.test(name));
  const chess = /\b(catur|chess)\b/i.test(name);
  if (category === "music") return music;
  if (category === "badminton") return badminton;
  if (category === "ball") return ball;
  if (category === "chess") return chess;
  if (category === "sport") return !music && !badminton && !ball && !chess;
  return false;
}

export function productImageMarkup(item, extraClass = "", width = 360, eager = false) {
  const url = safeHttpsUrl(item?.imageUrl);
  if (url) {
    return `<div class="${extraClass} relative overflow-hidden bg-white"><img src="${escHtml(thumbnailUrl(url, width))}" width="${width}" height="${Math.round(width * 0.75)}" alt="${escHtml(item?.name ? `${item.name} - Surya Jaya Sport Berau` : "Foto produk Surya Jaya Sport Berau")}" loading="${eager ? "eager" : "lazy"}" decoding="async" class="h-full w-full object-contain bg-white"></div>`;
  }
  const shortName = escHtml(String(item?.name || "Surya Jaya Sport").slice(0, 34));
  return `<div class="${extraClass} relative overflow-hidden flex flex-col items-center justify-center p-3 text-center text-white" style="background:linear-gradient(135deg,#0b2566 0%,#1d5fd6 62%,#38bdf8 100%)">
    <span class="px-2 py-0.5 rounded-full bg-white/90 text-slate-900 text-[10px] font-extrabold uppercase">Surya Jaya Sport</span>
    <span class="mt-1.5 font-extrabold text-sm leading-tight drop-shadow">${shortName}</span>
    ${item?.code ? `<span class="mt-1 font-mono text-[10px] text-blue-200 font-bold">${escHtml(item.code)}</span>` : ""}
  </div>`;
}

export function variantGroupKey(item) {
  if (item.variantGroup) return "g:" + String(item.variantGroup).trim();
  return "n:" + String(item.name || "").trim().toLowerCase();
}

export function variantShortLabel(item) {
  return [item.size, item.color].map(v => String(v || "").trim()).filter(Boolean).join(" · ") || item.code || "Standar";
}

export function getProductVariants(catalogList, item) {
  const key = variantGroupKey(item);
  const list = catalogList.filter(p => variantGroupKey(p) === key);
  return list.length > 1 ? list : [item];
}

export function groupCatalogProducts(list) {
  const groups = new Map();
  for (const item of list) {
    const key = variantGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()].map(variants => {
    const primary = variants.find(v => v.id === v.variantGroup && Number(v.stock || 0) > 0)
      || variants.find(v => Number(v.stock || 0) > 0)
      || variants[0];
    const totalStock = variants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
    const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : Number(primary.price || 0);
    const maxPrice = prices.length ? Math.max(...prices) : minPrice;
    return { primary, variants, totalStock, minPrice, maxPrice };
  });
}

export function buildCatalogCardHtml({ primary: item, variants, totalStock, minPrice, maxPrice }, index, isFeatured = false) {
  const hasVariants = variants.length > 1;
  const outOfStock = totalStock <= 0;
  const limited = !outOfStock && totalStock < LOW_STOCK_LIMIT;
  const priceLabel = minPrice !== maxPrice ? `Mulai ${formatRp(minPrice)}` : formatRp(minPrice);
  const msg = outOfStock
    ? `Halo Surya Jaya Sport, apakah stok ${item.name}${item.code ? ` (${item.code})` : ""} akan tersedia lagi?`
    : `Halo Surya Jaya Sport, saya ingin bertanya tentang ${item.name}${item.code ? ` (${item.code})` : ""} (${priceLabel}). Apakah stoknya tersedia?`;
  const showSenarNote = isSenarBadminton(item);
  const primaryActionBtn = hasVariants
    ? `<button type="button" data-view-product="${escHtml(item.id)}" ${outOfStock ? "disabled" : ""} class="shop-button shop-button-primary"><i class="fa-solid ${outOfStock ? "fa-ban" : "fa-layer-group"}" aria-hidden="true"></i> ${outOfStock ? "Habis" : "Pilih Varian"}</button>`
    : `<button type="button" data-add-cart="${escHtml(item.id)}" ${outOfStock ? "disabled" : ""} class="shop-button shop-button-primary"><i class="fa-solid ${outOfStock ? "fa-ban" : "fa-plus"}" aria-hidden="true"></i> ${outOfStock ? "Habis" : "Keranjang"}</button>`;
  const badgeLabel = outOfStock ? "⛔ Stok Habis" : isFeatured ? "🔥 Best Seller" : limited ? "⚠️ Stok Terbatas" : hasVariants ? `🟢 ${variants.length} Varian` : "🟢 Stok Tersedia";
  const badgeStyle = outOfStock ? "is-out" : isFeatured ? "is-featured" : limited ? "is-limited" : "";
  return `
  <article class="catalog-card ${outOfStock ? "opacity-85" : ""}">
    <div class="catalog-card-photo-wrap" data-view-product="${escHtml(item.id)}" role="button" tabindex="0" aria-label="Lihat detail ${escHtml(item.name)}">
      ${productImageMarkup(item, "catalog-card-photo", 360, index < 2)}
    </div>
    <div class="catalog-card-body">
      <div class="flex items-center justify-between gap-1.5">
        <span class="catalog-card-badge ${badgeStyle}">${badgeLabel}</span>
        <span class="catalog-stock ${outOfStock ? "!bg-rose-50 !text-rose-700" : ""}">${outOfStock ? "Habis" : `Stok ${totalStock}`}</span>
      </div>
      <h3 class="catalog-card-title hover:text-blue-300" data-view-product="${escHtml(item.id)}">${escHtml(item.name)}</h3>
      ${showSenarNote ? `<p class="senar-service-note"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>${SENAR_SERVICE_NOTE}</span></p>` : ""}
      <div class="catalog-card-facts">
        <p class="catalog-card-price">${priceLabel}</p>
      </div>
      <div class="catalog-card-actions">
        ${primaryActionBtn}
        <a href="${CATALOG_WA}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="shop-button shop-button-secondary"><i class="fa-brands fa-whatsapp text-emerald-600" aria-hidden="true"></i> Tanya WA</a>
      </div>
    </div>
  </article>`;
}

export function renderCustomerViewTemplate(container, { isAdminPreview = false } = {}) {
  if (!container) return;
  const adminBannerHtml = isAdminPreview ? `
    <div id="customerPreviewBanner" class="customer-preview-banner no-print" role="region" aria-label="Bar Pelanggan">
      <div class="flex flex-wrap items-center gap-3">
        <a href="#top" class="inline-flex items-center gap-2.5 text-white no-underline">
          <img src="sjs-mark-192.png" alt="Logo Surya Jaya Sport" width="38" height="38" class="w-9 h-9 rounded-xl bg-white p-1 object-contain">
          <div>
            <strong class="block text-sm font-extrabold uppercase tracking-wide text-white leading-tight">Surya Jaya Sport</strong>
            <span class="block text-[11px] font-semibold text-slate-300">Jl. Ahmad Yani 37, Berau · 08.00–21.00 WITA</span>
          </div>
        </a>
        <nav class="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded-full px-2 py-1 text-xs font-bold text-slate-200" aria-label="Menu pelanggan">
          <a href="#produk-unggulan" class="px-2.5 py-1 rounded-full hover:bg-slate-800 hover:text-amber-300">Unggulan</a>
          <a href="#kategori-unggulan" class="px-2.5 py-1 rounded-full hover:bg-slate-800 hover:text-amber-300">Kategori</a>
          <a href="#publicProductCatalog" class="px-2.5 py-1 rounded-full hover:bg-slate-800 hover:text-amber-300">Katalog</a>
          <a href="#cara-pesan" class="px-2.5 py-1 rounded-full hover:bg-slate-800 hover:text-amber-300">Cara Pesan</a>
          <a href="#lokasi-toko" class="px-2.5 py-1 rounded-full hover:bg-slate-800 hover:text-amber-300">Lokasi</a>
        </nav>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" id="openCatalogCart" class="shop-button shop-button-secondary !min-h-9 !py-1.5 !px-3 !text-xs">
          <i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>
          <span>Keranjang</span>
          <span id="catalogCartCount" class="rounded-full bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[11px] font-extrabold">0</span>
        </button>
        <a href="https://wa.me/6282320033333" target="_blank" rel="noopener noreferrer" class="shop-button shop-button-wa !min-h-9 !py-1.5 !px-3 !text-xs">
          <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> 0823-200-33333
        </a>
        <button type="button" id="btnBannerBackToAdmin" class="shop-button shop-button-accent !min-h-9 !py-1.5 !px-3.5 !text-xs">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Kembali ke Admin
        </button>
      </div>
    </div>` : "";

  container.innerHTML = `
    ${adminBannerHtml}
    <section class="shop-hero" aria-labelledby="catalogPageTitle">
      <div class="shop-hero-content">
        <p class="shop-eyebrow"><i class="fa-solid fa-store" aria-hidden="true"></i> Jl. Ahmad Yani 37, Tanjung Redeb, Berau · Sejak 1984</p>
        <h2 id="catalogPageTitle" tabindex="-1">Perlengkapan Olahraga<br><span class="shop-hero-accent">&amp; Alat Musik Berau</span></h2>
        <p class="text-[15px] text-slate-200 leading-relaxed">Raket badminton, shuttlecock, senar (gratis jasa pasang), bola futsal, catur, hingga aksesori gitar dengan harga jujur dan stok nyata langsung di toko kami.</p>
        <div class="shop-hero-actions pt-1">
          <a class="shop-button shop-button-accent" href="#publicProductCatalog">Jelajahi Katalog <i class="fa-solid fa-arrow-down" aria-hidden="true"></i></a>
          <a class="shop-button shop-button-wa" href="https://wa.me/6282320033333" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp text-base" aria-hidden="true"></i> Chat WhatsApp</a>
          <a class="shop-button shop-button-outline" href="#cara-pesan">Cara Pesan</a>
        </div>
        <div class="hero-trust-stats" aria-label="Statistik Kepercayaan Toko">
          <div class="hero-trust-stat"><span>✅</span><span>500+ Produk</span></div>
          <div class="hero-trust-stat"><span>✅</span><span>1000+ Pelanggan</span></div>
          <div class="hero-trust-stat"><span>✅</span><span>Buka Setiap Hari</span></div>
          <div class="hero-trust-stat"><span>✅</span><span>Toko Fisik Berau</span></div>
        </div>
      </div>
      <div class="hero-visual-stage">
        <figure class="hero-visual-card">
          <img src="hero-surya-jaya-sport.webp" alt="Koleksi Raket Badminton, Shuttlecock, dan Bola Futsal di Surya Jaya Sport Berau" width="600" height="450" fetchpriority="high">
          <figcaption class="hero-visual-caption">
            <div>
              <strong class="block text-xs font-extrabold text-white">Raket · Shuttlecock · Bola Futsal</strong>
              <span class="block text-[11px] font-semibold text-slate-300">Cek stok langsung &amp; ambil di toko</span>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold shrink-0">08.00–21.00</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="flex flex-col gap-3" aria-label="Kenapa Belanja di Surya Jaya Sport">
      <div class="catalog-heading">
        <h2>Kenapa Belanja di Surya Jaya Sport</h2>
        <span class="text-xs font-bold text-slate-500">Katalog real-time toko lokal Berau · Konfirmasi cepat lewat WhatsApp</span>
      </div>
      <div class="fun-highlights-strip">
        <div class="fun-highlight-pill">
          <span class="fun-highlight-icon is-navy"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></span>
          <div>
            <strong class="block text-sm font-extrabold text-slate-900">Stok Real-Time</strong>
            <span class="text-xs font-semibold text-slate-600">Tersinkron langsung dari stok toko</span>
          </div>
        </div>
        <div class="fun-highlight-pill">
          <span class="fun-highlight-icon is-blue"><i class="fa-solid fa-feather-pointed" aria-hidden="true"></i></span>
          <div>
            <strong class="block text-sm font-extrabold text-slate-900">Gratis Pasang Senar</strong>
            <span class="text-xs font-semibold text-slate-600">Untuk semua senar badminton</span>
          </div>
        </div>
        <div class="fun-highlight-pill">
          <span class="fun-highlight-icon is-yellow"><i class="fa-solid fa-clock" aria-hidden="true"></i></span>
          <div>
            <strong class="block text-sm font-extrabold text-slate-900">Buka Setiap Hari</strong>
            <span class="text-xs font-semibold text-slate-600">Senin–Minggu 08.00–21.00 WITA</span>
          </div>
        </div>
        <div class="fun-highlight-pill">
          <span class="fun-highlight-icon is-green"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></span>
          <div>
            <strong class="block text-sm font-extrabold text-slate-900">Bisa DP via WhatsApp</strong>
            <span class="text-xs font-semibold text-slate-600">Barang disiapkan, ambil di toko</span>
          </div>
        </div>
      </div>
    </section>

    <section id="produk-unggulan" class="flex flex-col gap-3" aria-labelledby="featuredProductsTitle">
      <div class="catalog-heading">
        <div>
          <h2 id="featuredProductsTitle" class="!text-[#facc15]">&#11088; Produk Unggulan &amp; Promo Pilihan</h2>
          <span class="text-xs font-bold text-slate-500">5 produk unggulan pilihan Surya Jaya Sport Berau</span>
        </div>
        <a href="#publicProductCatalog" class="shop-button shop-button-secondary !min-h-10 !py-2 !px-4 !text-xs">Lihat Semua Produk <i class="fa-solid fa-arrow-down" aria-hidden="true"></i></a>
      </div>
      <div id="featuredProductsGrid" class="catalog-grid"></div>
      <div class="flex justify-center pt-1">
        <a href="#publicProductCatalog" class="shop-button shop-button-primary px-6"><i class="fa-solid fa-grid-2" aria-hidden="true"></i> Lihat Semua Produk</a>
      </div>
    </section>

    <section id="kategori-unggulan" class="flex flex-col gap-2.5" aria-label="Menu kategori cepat">
      <div class="catalog-heading">
        <h2>Kategori Pilihan</h2>
        <span class="text-xs font-bold text-slate-500">Klik kategori untuk menyaring produk</span>
      </div>
      <div id="quickCatGrid" class="quick-cat-grid">
        <button type="button" class="quick-cat-btn is-active" data-quick-cat="all">
          <span class="quick-cat-emoji" aria-hidden="true">🏅</span>
          <strong>Semua</strong>
        </button>
        <button type="button" class="quick-cat-btn" data-quick-cat="badminton">
          <span class="quick-cat-emoji" aria-hidden="true">🏸</span>
          <strong>Badminton</strong>
        </button>
        <button type="button" class="quick-cat-btn" data-quick-cat="ball">
          <span class="quick-cat-emoji" aria-hidden="true">⚽</span>
          <strong>Futsal</strong>
        </button>
        <button type="button" class="quick-cat-btn" data-quick-cat="chess">
          <span class="quick-cat-emoji" aria-hidden="true">♟</span>
          <strong>Catur</strong>
        </button>
        <button type="button" class="quick-cat-btn" data-quick-cat="music">
          <span class="quick-cat-emoji" aria-hidden="true">🎸</span>
          <strong>Musik</strong>
        </button>
        <button type="button" class="quick-cat-btn" data-quick-cat="sport">
          <span class="quick-cat-emoji" aria-hidden="true">🏓</span>
          <strong>Lainnya</strong>
        </button>
      </div>
    </section>

    <section id="publicProductCatalog" class="flex flex-col gap-4" aria-labelledby="productCatalogTitle">
      <div class="catalog-heading">
        <h2 id="productCatalogTitle">Katalog Produk</h2>
        <span class="text-xs font-bold text-slate-500">Harga dan stok dikonfirmasi oleh toko · Ketuk foto untuk melihat detail</span>
      </div>
      <div class="catalog-toolbar">
        <form id="catalogSearchForm" role="search" autocomplete="off" class="catalog-search-form">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <label for="catalogSearch" class="sr-only">Cari barang di katalog</label>
          <input type="search" id="catalogSearch" placeholder="Cari Yonex, Li-Ning, raket, senar, gitar..." autocomplete="off">
          <button type="button" id="btnClearCatalogSearch" class="hidden" aria-label="Hapus pencarian"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </form>
        <div class="catalog-filter-row">
          <div id="catalogCategory" class="sr-only" role="radiogroup" aria-label="Kategori produk">
            <label><input type="radio" name="catalogCategory" value="all" checked><span>Semua</span></label>
            <label><input type="radio" name="catalogCategory" value="badminton"><span>Badminton</span></label>
            <label><input type="radio" name="catalogCategory" value="ball"><span>Futsal &amp; Bola</span></label>
            <label><input type="radio" name="catalogCategory" value="chess"><span>Catur</span></label>
            <label><input type="radio" name="catalogCategory" value="music"><span>Musik</span></label>
            <label><input type="radio" name="catalogCategory" value="sport"><span>Olahraga Lainnya</span></label>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <label class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input type="checkbox" id="toggleShowOutOfStock" class="h-3.5 w-3.5 accent-blue-500">
              <span>Tampilkan produk habis</span>
            </label>
            <select id="catalogSort" aria-label="Urutkan produk" class="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
              <option value="default">Urutan default</option>
              <option value="price-asc">Harga: termurah</option>
              <option value="price-desc">Harga: termahal</option>
              <option value="name-asc">Nama: A–Z</option>
            </select>
            <p id="catalogResultCount" aria-live="polite"></p>
          </div>
        </div>
      </div>
      <div id="productCatalogGrid" class="catalog-grid"><p class="catalog-empty" role="status">Katalog sedang dimuat…</p></div>
    </section>

    <section id="cara-pesan" class="flex flex-col gap-4" aria-labelledby="howToOrderTitle">
      <div class="catalog-heading">
        <h2 id="howToOrderTitle">Cara Pesan &amp; Pembayaran</h2>
        <span class="text-xs font-bold text-slate-500">Pengambilan barang di toko · Belum melayani pengiriman atau pembayaran otomatis di website</span>
      </div>
      <div class="howto-grid">
        <article class="howto-card">
          <div class="howto-icon-row"><span class="howto-step">1</span><span class="howto-icon-badge"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span></div>
          <h3>Cek produk &amp; masukkan keranjang</h3>
          <p>Pilih barang yang Anda butuhkan lalu klik <strong>+ Keranjang</strong>, atau klik <strong>Tanya stok</strong> untuk menanyakan langsung 1 produk. Harga dan stok akan dikonfirmasi kembali oleh toko.</p>
        </article>
        <article class="howto-card">
          <div class="howto-icon-row"><span class="howto-step">2</span><span class="howto-icon-badge"><i class="fa-solid fa-basket-shopping" aria-hidden="true"></i></span></div>
          <h3>Pesan lewat WhatsApp (bisa DP / transfer)</h3>
          <p>Kirim daftar belanja ke WhatsApp <strong>0823-200-33333</strong>. Anda boleh memesan dengan <strong>DP atau transfer</strong> terlebih dahulu—baik untuk pembelian jumlah besar maupun kecil—agar barang kami siapkan.</p>
        </article>
        <article class="howto-card">
          <div class="howto-icon-row"><span class="howto-step">3</span><span class="howto-icon-badge"><i class="fa-solid fa-store" aria-hidden="true"></i></span></div>
          <h3>Ambil &amp; bayar di toko</h3>
          <p>Saat ini kami <strong>tidak melayani pengiriman</strong> maupun checkout online. Pengambilan dilakukan langsung di toko kami, dengan pilihan bayar <strong>Tunai, QRIS, Kartu, atau Transfer Bank</strong>.</p>
        </article>
      </div>
    </section>

    <section id="lokasi-toko" class="shop-location" aria-labelledby="shopLocationTitle">
      <div class="flex flex-col justify-between gap-4">
        <div class="space-y-2.5">
          <h2 id="shopLocationTitle">Kunjungi Toko Kami</h2>
          <address>
            <strong class="text-slate-900 text-base">Surya Jaya Sport</strong><br>
            Jl. Ahmad Yani 37, Tanjung Redeb, Berau, Kalimantan Timur<br>
            <span class="inline-flex items-center gap-1.5 mt-1 font-bold text-blue-900"><i class="fa-solid fa-clock text-blue-300" aria-hidden="true"></i> Buka setiap hari (Senin – Minggu): 08.00 – 21.00 WITA</span><br>
            Telp / WhatsApp: <a href="tel:+6282320033333" class="font-bold text-blue-700 underline">0823-200-33333</a>
          </address>
          <div class="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-xs font-semibold text-blue-950 space-y-1">
            <p><i class="fa-solid fa-wallet text-blue-700 mr-1" aria-hidden="true"></i> <strong>Pembayaran di toko:</strong></p>
            <div class="pay-methods-grid" role="list" aria-label="Metode pembayaran yang diterima">
              <div class="pay-method-tile" role="listitem">
                <svg viewBox="0 0 36 26" fill="none" aria-hidden="true">
                  <rect width="36" height="26" rx="5" fill="#064E3B"/>
                  <rect x="3" y="5" width="30" height="16" rx="2.5" stroke="#34D399" stroke-width="1.5"/>
                  <circle cx="18" cy="13" r="3.5" fill="#34D399"/>
                  <circle cx="7.5" cy="13" r="1.2" fill="#A7F3D0"/>
                  <circle cx="28.5" cy="13" r="1.2" fill="#A7F3D0"/>
                </svg>
                <div><strong>Tunai</strong><span>Cash Rupiah</span></div>
              </div>
              <div class="pay-method-tile" role="listitem">
                <svg viewBox="0 0 36 26" fill="none" aria-hidden="true">
                  <rect width="36" height="26" rx="5" fill="#1E1B4B"/>
                  <path d="M18 4L29 9.5H7L18 4Z" fill="#818CF8"/>
                  <rect x="9" y="11" width="2.5" height="7" rx="1" fill="#C7D2FE"/>
                  <rect x="14.5" y="11" width="2.5" height="7" rx="1" fill="#C7D2FE"/>
                  <rect x="20" y="11" width="2.5" height="7" rx="1" fill="#C7D2FE"/>
                  <rect x="25.5" y="11" width="2.5" height="7" rx="1" fill="#C7D2FE"/>
                  <rect x="6.5" y="19.5" width="23" height="2.2" rx="1" fill="#818CF8"/>
                </svg>
                <div><strong>Transfer</strong><span>Antar Bank</span></div>
              </div>
              <div class="pay-method-tile" role="listitem">
                <svg viewBox="0 0 36 26" fill="none" aria-hidden="true">
                  <rect width="36" height="26" rx="5" fill="#172554"/>
                  <rect x="2" y="2" width="32" height="22" rx="4" stroke="#60A5FA" stroke-width="1.2"/>
                  <rect x="6" y="7" width="7" height="5" rx="1.2" fill="#FACC15"/>
                  <rect x="6" y="15.5" width="12" height="2" rx="1" fill="#93C5FD"/>
                  <rect x="21" y="15.5" width="8" height="2" rx="1" fill="#60A5FA"/>
                </svg>
                <div><strong>Debit Card</strong><span>EDC Semua Bank</span></div>
              </div>
              <div class="pay-method-tile" role="listitem">
                <svg viewBox="0 0 36 26" fill="none" aria-hidden="true">
                  <rect width="36" height="26" rx="5" fill="#1E293B"/>
                  <rect x="2" y="2" width="32" height="22" rx="4" stroke="#FACC15" stroke-width="1.2"/>
                  <rect x="2.5" y="6.5" width="31" height="4" fill="#0F172A"/>
                  <circle cx="24" cy="17.5" r="3" fill="#EF4444" fill-opacity="0.9"/>
                  <circle cx="27.5" cy="17.5" r="3" fill="#F59E0B" fill-opacity="0.9"/>
                  <rect x="6" y="16" width="10" height="2.5" rx="1" fill="#CBD5E1"/>
                </svg>
                <div><strong>Credit Card</strong><span>Visa / Mastercard</span></div>
              </div>
              <div class="pay-method-tile" role="listitem">
                <svg viewBox="0 0 36 26" fill="none" aria-hidden="true">
                  <rect width="36" height="26" rx="5" fill="#FFFFFF"/>
                  <rect x="6" y="4" width="8" height="8" rx="1.5" stroke="#0F172A" stroke-width="1.8"/>
                  <rect x="8.5" y="6.5" width="3" height="3" fill="#DC2626"/>
                  <rect x="22" y="4" width="8" height="8" rx="1.5" stroke="#0F172A" stroke-width="1.8"/>
                  <rect x="24.5" y="6.5" width="3" height="3" fill="#0F172A"/>
                  <rect x="6" y="14" width="8" height="8" rx="1.5" stroke="#0F172A" stroke-width="1.8"/>
                  <rect x="8.5" y="16.5" width="3" height="3" fill="#0F172A"/>
                  <path d="M17 5H19V11H17V5ZM17 14H22V16H19V22H17V14ZM24 14H30V17H27V22H24V14Z" fill="#0F172A"/>
                </svg>
                <div><strong>QRIS</strong><span>Scan Instan</span></div>
              </div>
            </div>
            <p><i class="fa-brands fa-whatsapp text-emerald-600 mr-1" aria-hidden="true"></i> <strong>Pemesanan WA:</strong> Bisa DP / transfer untuk pembelian besar maupun kecil, lalu ambil langsung di toko.</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <a class="shop-button shop-button-wa" href="https://wa.me/6282320033333" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Chat WhatsApp</a>
          <a class="shop-button shop-button-accent" href="https://www.google.com/maps/search/?api=1&amp;query=Surya+Jaya+Sport+Jl.+Ahmad+Yani+37+Tanjung+Redeb+Berau" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Buka di Google Maps</a>
        </div>
      </div>
      <div class="shop-map-frame">
        <iframe
          title="Peta lokasi Surya Jaya Sport Jl. Ahmad Yani 37, Tanjung Redeb, Berau"
          src="https://maps.google.com/maps?q=Surya+Jaya+Sport+Jl.+Ahmad+Yani+37+Tanjung+Redeb+Berau&amp;t=&amp;z=16&amp;ie=UTF8&amp;iwloc=&amp;output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen>
        </iframe>
      </div>
    </section>

    <section id="testimoni-pelanggan" class="flex flex-col gap-4" aria-labelledby="testimonialsTitle">
      <div class="catalog-heading">
        <h2 id="testimonialsTitle" class="!text-[#facc15]">&#11088; Testimoni Pelanggan</h2>
        <span class="text-xs font-bold text-slate-500">Dipercaya pemain badminton, futsal, &amp; musisi di Berau</span>
      </div>
      <div id="testimonialsRandomGrid" class="testimonials-grid"></div>
    </section>
  `;
}

export function renderCustomerCatalogState({ publicCatalog, catalogLoadState, onRetry, onRendered }) {
  const grid = document.getElementById("productCatalogGrid");
  const search = document.getElementById("catalogSearch");
  if (!grid || !search) return;
  const q = search.value.trim().toLocaleLowerCase("id");
  document.getElementById("btnClearCatalogSearch")?.classList.toggle("hidden", !search.value);
  const category = document.querySelector("#catalogCategory input:checked")?.value || "all";

  if (catalogLoadState !== "ready") {
    grid.innerHTML = catalogLoadState === "error"
      ? `<div class="catalog-empty space-y-3" role="status"><p>Katalog gagal dimuat atau koneksi sedang lambat.</p><button type="button" id="btnRetryCatalog" class="shop-button shop-button-primary">Muat ulang katalog</button></div>`
      : `<div class="catalog-empty space-y-3" role="status"><p>Katalog sedang dimuat…</p><button type="button" id="btnRetryCatalog" class="shop-button shop-button-secondary">Muat ulang sekarang</button></div>`;
    if (onRetry) document.getElementById("btnRetryCatalog")?.addEventListener("click", onRetry);
    return;
  }

  for (const btn of document.querySelectorAll("#quickCatGrid .quick-cat-btn")) {
    btn.classList.toggle("is-active", btn.dataset.quickCat === category);
  }

  const featuredSecEl = document.getElementById("produk-unggulan");
  const featuredGridEl = document.getElementById("featuredProductsGrid");
  const featuredPrimaryIds = new Set();
  if (featuredSecEl && featuredGridEl) {
    const allAvailable = groupCatalogProducts(publicCatalog).filter(g => g.totalStock > 0);
    const withPhoto = allAvailable.filter(g => Boolean(safeHttpsUrl(g.primary.imageUrl)));
    const sortedAvailable = (withPhoto.length ? withPhoto : allAvailable)
      .slice()
      .sort((a, b) => (Boolean(b.primary.featured) - Boolean(a.primary.featured)) || b.totalStock - a.totalStock);
    const featuredList = sortedAvailable.slice(0, 5);
    if (featuredList.length && !q && category === "all") {
      featuredSecEl.hidden = false;
      featuredGridEl.innerHTML = featuredList.map((g, i) => buildCatalogCardHtml(g, i, true)).join("");
      for (const g of featuredList) featuredPrimaryIds.add(g.primary.id);
    } else {
      featuredSecEl.hidden = true;
    }
  }

  const sortMode = document.getElementById("catalogSort")?.value || "default";
  const showOutOfStock = Boolean(document.getElementById("toggleShowOutOfStock")?.checked);
  const filteredRaw = publicCatalog.filter(item => {
    const hay = [item.name, item.code, item.size, item.color, item.description].filter(Boolean).join(" ").toLocaleLowerCase("id");
    return (!q || hay.includes(q)) && matchesCatalogCategory(item, category);
  });
  let grouped = groupCatalogProducts(filteredRaw);
  if (featuredPrimaryIds.size > 0 && grouped.length > featuredPrimaryIds.size) {
    grouped = grouped.filter(g => !featuredPrimaryIds.has(g.primary.id));
  }
  if (!showOutOfStock) {
    grouped = grouped.filter(g => g.totalStock > 0);
  }
  grouped.sort((a, b) => (b.totalStock > 0) - (a.totalStock > 0));
  if (sortMode === "price-asc") grouped.sort((a, b) => a.minPrice - b.minPrice);
  else if (sortMode === "price-desc") grouped.sort((a, b) => b.maxPrice - a.maxPrice);
  else if (sortMode === "name-asc") grouped.sort((a, b) => String(a.primary.name || "").localeCompare(String(b.primary.name || ""), "id"));

  renderRandomTestimonials(3);
  const countEl = document.getElementById("catalogResultCount");
  if (countEl) countEl.textContent = `${grouped.length} produk`;
  if (onRendered) onRendered(grouped);
  if (!grouped.length) {
    grid.innerHTML = `<p class="catalog-empty" role="status">Produk tidak ditemukan. Coba kata kunci lain, pilih kategori "Semua", atau centang "Tampilkan produk habis".</p>`;
    return;
  }
  grid.innerHTML = grouped.map((g, index) => buildCatalogCardHtml(g, index, false)).join("");
}

export function openCustomerProductModal({ publicCatalog, id, onAddCart }) {
  const item = publicCatalog.find(p => p.id === id);
  if (!item) return;
  const variants = getProductVariants(publicCatalog, item);
  const specLabel = [item.size, item.color].filter(Boolean).join(" / ");
  const msg = `Halo Surya Jaya Sport, saya ingin bertanya tentang ${item.name}${specLabel ? ` (${specLabel})` : ""}${item.code ? ` [${item.code}]` : ""} dengan harga ${formatRp(item.price)}. Apakah stoknya tersedia?`;
  document.getElementById("catalogDetailTitle").textContent = item.name;
  if (typeof window.gtag === "function") {
    window.gtag("event", "view_item", { currency: "IDR", value: Number(item.price || 0), items: [{ item_id: item.code || item.id, item_name: item.name, price: Number(item.price || 0) }] });
  }
  const showSenarNote = isSenarBadminton(item);
  const variantPickerHtml = variants.length > 1 ? `
    <div class="space-y-2 pt-1">
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Pilih Varian (${variants.length})</span>
        <span class="text-xs font-bold text-blue-800">${escHtml(variantShortLabel(item))}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${variants.map(v => {
          const active = v.id === item.id;
          const vOut = Number(v.stock || 0) <= 0;
          return `<button type="button" data-pick-variant="${escHtml(v.id)}" class="flex items-center gap-2 p-1.5 rounded-xl border-2 text-left transition ${active ? "border-blue-400 bg-slate-800" : "border-slate-700 bg-slate-900 hover:border-blue-400"} ${vOut ? "opacity-55" : ""}">
            <div class="w-11 h-11 rounded-lg border border-slate-700 bg-white overflow-hidden shrink-0">${productImageMarkup(v, "w-full h-full object-contain", 140, true)}</div>
            <div class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold text-slate-900 truncate">${escHtml(variantShortLabel(v))}</span>
              <span class="block text-[11px] font-bold ${vOut ? "text-rose-600" : "text-slate-600"}">${vOut ? "Habis" : formatRp(v.price)}</span>
            </div>
          </button>`;
        }).join("")}
      </div>
    </div>` : "";
  document.getElementById("catalogDetailBody").innerHTML = `
    <div class="rounded-2xl border border-slate-100 bg-white overflow-hidden">${productImageMarkup(item, "aspect-[4/3] w-full", 720, true)}</div>
    <p class="text-xs font-mono font-bold text-blue-700">${escHtml([item.code, item.size, item.color].filter(Boolean).join(" · "))}</p>
    ${variantPickerHtml}
    ${item.description ? `<p class="text-sm text-slate-600 leading-relaxed">${escHtml(item.description)}</p>` : ""}
    ${showSenarNote ? `<p class="senar-service-note !text-xs !py-2 !px-3"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>${SENAR_SERVICE_NOTE}</span></p>` : ""}
    <div class="flex items-center justify-between pt-2 border-t border-slate-100">
      <p class="text-2xl font-extrabold text-slate-900">${formatRp(item.price)}</p>
      <span class="catalog-stock">Stok ${Number(item.stock || 0)} pcs</span>
    </div>
    <div class="grid grid-cols-2 gap-2 pt-2">
      <button type="button" data-detail-add="${escHtml(item.id)}" ${Number(item.stock || 0) <= 0 ? "disabled" : ""} class="shop-button shop-button-primary"><i class="fa-solid ${Number(item.stock || 0) <= 0 ? "fa-ban" : "fa-plus"}" aria-hidden="true"></i> ${Number(item.stock || 0) <= 0 ? "Stok Habis" : "Keranjang"}</button>
      <a href="${CATALOG_WA}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="shop-button shop-button-secondary"><i class="fa-brands fa-whatsapp text-emerald-600" aria-hidden="true"></i> Tanya WA</a>
      <button type="button" data-copy-link="${escHtml(item.id)}" class="shop-button shop-button-secondary col-span-2"><i class="fa-solid fa-link text-blue-700" aria-hidden="true"></i> Salin Link Produk</button>
    </div>`;
  const dlg = document.getElementById("catalogProductModal");
  dlg.querySelectorAll("[data-pick-variant]").forEach(btn => {
    btn.addEventListener("click", () => openCustomerProductModal({ publicCatalog, id: btn.dataset.pickVariant, onAddCart }));
  });
  dlg.querySelector("[data-detail-add]")?.addEventListener("click", () => {
    onAddCart(item.id);
    dlg.close();
  });
  const copyBtn = dlg.querySelector("[data-copy-link]");
  copyBtn?.addEventListener("click", async () => {
    const shareUrl = `https://suryajaya-sport.github.io/produk/?id=${encodeURIComponent(item.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const inp = document.createElement("input");
      inp.value = shareUrl;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand("copy");
      inp.remove();
    }
    copyBtn.innerHTML = `<i class="fa-solid fa-check text-emerald-600" aria-hidden="true"></i> Link Tersalin!`;
    setTimeout(() => {
      copyBtn.innerHTML = `<i class="fa-solid fa-link text-blue-700" aria-hidden="true"></i> Salin Link Produk`;
    }, 2000);
  });
  if (!dlg.open) dlg.showModal();
}


const TESTIMONIAL_POOL = [
  { initial: "A", name: "Andi", role: "Pelanggan Tanjung Redeb", quote: "Barang lengkap dan harga bersahabat." },
  { initial: "R", name: "Rizky", role: "Pemain Badminton Berau", quote: "Pasang senar cepat dan rapi." },
  { initial: "B", name: "Budi", role: "Pelanggan Tetap Berau", quote: "Langganan beli shuttlecock di sini." },
  { initial: "F", name: "Fajar", role: "Atlet Futsal Berau", quote: "Bola futsal dan sepatu olahraga pilihannya banyak." },
  { initial: "D", name: "Dimas", role: "Pemain Hobi Musik Berau", quote: "Senar gitar dan perlengkapan musik selalu tersedia." },
  { initial: "H", name: "Hendra", role: "Pengurus Klub Berau", quote: "Bisa tanya stok dulu via WhatsApp sebelum ke toko." }
];

export function renderRandomTestimonials(count = 3) {
  const wrap = document.getElementById("testimonialsRandomGrid");
  if (!wrap) return;
  const shuffled = TESTIMONIAL_POOL.slice().sort(() => Math.random() - 0.5).slice(0, count);
  wrap.innerHTML = shuffled.map(t => `
    <article class="testimonial-card" style="border-top:2px solid #facc15">
      <div class="space-y-2">
        <div class="testimonial-stars" aria-label="5 dari 5 bintang">⭐⭐⭐⭐⭐</div>
        <p class="text-sm font-semibold text-slate-200 leading-relaxed">"${escHtml(t.quote)}"</p>
      </div>
      <div class="flex items-center gap-2.5 pt-2 border-t border-slate-700/70">
        <span class="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/50 text-xs font-extrabold text-amber-300 inline-flex items-center justify-center">${escHtml(t.initial)}</span>
        <div>
          <strong class="block text-xs font-extrabold text-white">${escHtml(t.name)}</strong>
          <span class="block text-[11px] text-slate-400">${escHtml(t.role)}</span>
        </div>
      </div>
    </article>
  `).join("");
}
