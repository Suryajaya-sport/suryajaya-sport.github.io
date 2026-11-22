import { catalogImageUrl, chessBoardSpecs, productDescription, thumbnailUrl } from "./katalog.js?v=deskripsi";

const endpoint = "https://firestore.googleapis.com/v1/projects/suryajayasport-3fd5e/databases/(default)/documents/publicCatalog/";
const status = document.getElementById("detail-status");

async function readProduct(id) {
  const response = await fetch(endpoint + encodeURIComponent(id), {
    cache: "no-store",
    signal: AbortSignal.timeout(8000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Katalog tidak dapat diakses.");

  const { fields = {} } = await response.json();
  return {
    name: fields.name?.stringValue || "Produk",
    code: fields.code?.stringValue || "",
    size: fields.size?.stringValue || "",
    color: fields.color?.stringValue || "",
    imageUrl: fields.imageUrl?.stringValue || "",
    price: Number(fields.price?.integerValue ?? fields.price?.doubleValue ?? 0),
    stock: Number(fields.stock?.integerValue ?? fields.stock?.doubleValue ?? 0)
  };
}

function showProduct(item) {
  const get = id => document.getElementById(id);
  document.title = `${item.name} | Surya Jaya Sport`;
  get("breadcrumb-product").textContent = item.name;
  get("product-name").textContent = item.name;
  const description = productDescription(item);
  get("product-description").textContent = description;
  get("product-description").hidden = !description;
  get("product-code").textContent = item.code;
  get("product-code").hidden = !item.code;
  get("product-price").textContent = new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(item.price);
  get("product-stock").textContent = `Stok ${item.stock} pcs`;

  const board = chessBoardSpecs(item);
  const rows = board
    ? [["Model", board.model], ["Ukuran papan", board.dimensions], ["Papan", "Lipat"], ["Biji catur", "Kayu"]]
    : [["Ukuran", item.size], ["Warna", item.color]].filter(([, value]) => value && value.toLowerCase() !== "semua");
  const specs = get("product-specs");
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    specs.append(row);
  }
  specs.hidden = !rows.length;

  const image = catalogImageUrl(item);
  if (image) {
    const photo = get("product-photo");
    const placeholder = get("photo-placeholder");
    const thumbnail = thumbnailUrl(image, 800);
    photo.addEventListener("error", () => {
      if (photo.getAttribute("src") === thumbnail && thumbnail !== image) {
        photo.src = image;
        return;
      }
      photo.hidden = true;
      placeholder.hidden = false;
    });
    photo.alt = `Foto katalog ${item.name}`;
    photo.src = thumbnail;
    photo.hidden = false;
    placeholder.hidden = true;
  }

  const label = item.code ? `${item.name} (${item.code})` : item.name;
  const text = `Halo Surya Jaya Sport, saya ingin bertanya tentang ${label}. Apakah stoknya tersedia?`;
  get("product-contact").href = `https://wa.me/6282320033333?${new URLSearchParams({ text })}`;
  status.hidden = true;
  document.querySelector(".product").hidden = false;
}

async function loadDetail() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id || id.length > 1500 || id.includes("/") || id === "." || id === "..") {
    status.textContent = "Pilih produk dari katalog untuk melihat detailnya.";
    return;
  }
  try {
    const item = await readProduct(id);
    if (Number(item?.stock) > 0) showProduct(item);
    else status.textContent = "Produk ini sedang tidak tersedia di katalog.";
  } catch {
    status.textContent = "Detail produk gagal dimuat. Coba muat ulang halaman.";
  }
}

loadDetail();
