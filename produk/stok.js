const stockCard = document.querySelector("[data-product-code]");
const endpoint = "https://firestore.googleapis.com/v1/projects/suryajayasport-3fd5e/databases/(default)/documents:runQuery";

async function refreshProductStock(card) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "publicCatalog" }],
          select: { fields: [{ fieldPath: "price" }, { fieldPath: "stock" }, { fieldPath: "description" }] },
          where: { fieldFilter: {
            field: { fieldPath: "code" },
            op: "EQUAL",
            value: { stringValue: card.dataset.productCode }
          } },
          limit: 2
        }
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return;
    const rows = (await response.json()).filter(row => row.document);
    const status = card.querySelector("[data-stock]");
    if (!rows.length) {
      status.textContent = "Barang sedang tidak ditampilkan di katalog. Hubungi toko untuk informasi.";
      return;
    }
    if (rows.length !== 1) return;
    const fields = rows[0].document.fields;
    const description = document.querySelector("[data-product-description]");
    const customDescription = fields?.description?.stringValue;
    if (description && typeof customDescription === "string") {
      description.textContent = customDescription;
      description.hidden = !customDescription.trim();
    }
    const price = Number(fields?.price?.integerValue ?? fields?.price?.doubleValue);
    const stock = Number(fields?.stock?.integerValue);
    if (Number.isFinite(price) && price > 0) {
      const priceNode = card.querySelector("[data-price]");
      priceNode.textContent = new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", maximumFractionDigits: 0
      }).format(price);
      priceNode.hidden = false;
    }
    if (Number.isSafeInteger(stock) && stock >= 0) {
      status.textContent = stock > 0
        ? "Stok tercatat tersedia. Tanyakan varian dan jumlah ke toko."
        : "Stok tercatat habis. Tanyakan kapan barang tersedia kembali.";
    }
  } catch {
    // Stok dan harga tetap bisa dikonfirmasi lewat WhatsApp jika Firebase tidak terjangkau.
  }
}

if (stockCard) refreshProductStock(stockCard);
