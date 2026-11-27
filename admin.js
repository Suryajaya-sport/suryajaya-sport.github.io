
    // ==================== KONFIGURASI ====================
    const EMBEDDED_FIREBASE_CONFIG = {
      apiKey: "AIzaSyBFtI_lwLU7cDcioDE1GpgC0AjKPZ1mHag",
      authDomain: "suryajayasport-3fd5e.firebaseapp.com",
      projectId: "suryajayasport-3fd5e",
      storageBucket: "suryajayasport-3fd5e.firebasestorage.app",
      messagingSenderId: "501860315687",
      appId: "1:501860315687:web:3692f12c2b59a1e16d9402"
    };
    const APP_ID = "suryajayasport-3fd5e-app";
    const OWNER_UID = "ijWilxxrxRabwOX7KcndkuqrBOw1";
    const LOW_STOCK_LIMIT = 5;
    const CLOUDINARY_CLOUD = "mhfuwzby";
    const CLOUDINARY_PRESET = "sjs_product_images";
    const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
    const COMPRESS_MAX_SIDE = 1200;
    const QRIS_DEFAULT_PAYLOAD = "00020101021126610016ID.CO.SHOPEE.WWW01189360091800225534680208225534680303UMI51440014ID.CO.QRIS.WWW0215ID10254610182080303UMI5204594553033605802ID5910Surya Jaya6005BERAU61057731162070703A0163046EE4";
    const QRIS_MERCHANT_TITLE = "SURYA JAYA SPORT";
    const QRIS_MERCHANT_NMID = "NMID: ID1025461018208 • A01";
    const CATALOG_WA = "https://wa.me/6282320033333";

    // ==================== IMPOR FIREBASE ====================
    const [appM, authM, fsM] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
    ]);
    const { doc, setDoc, addDoc, deleteDoc, onSnapshot, collection, getDocsFromServer, query, where, runTransaction } = fsM;

    const app = appM.getApps().length ? appM.getApps()[0] : appM.initializeApp(EMBEDDED_FIREBASE_CONFIG);
    const auth = authM.getAuth(app);
    const db = fsM.getFirestore(app);

    // ==================== STATE ====================
    let isAdmin = false;
    let shopName = "Surya Jaya Sport";
    let inventory = [];
    let publicCatalog = [];
    let catalogLoadState = "loading";
    let transactions = [];
    let cancelledTransactions = [];
    let purchases = [];
    const books = { expenses: [], cashClosings: [] };
    let savedQrisPayload = QRIS_DEFAULT_PAYLOAD;
    let costCodeDigits = "";
    let geminiApiKey = "";
    let selectedDateStr = todayStr();
    let currentViewMode = "day";
    let selectedPaymentMethod = "Cash";
    let saleFormSaving = false;
    let saleSaveInProgress = false;
    let deleteTargetId = null;
    let deleteTargetType = null;
    let deleteInProgress = false;
    let activeQrProduct = null;
    let lastStickerCanvas = null;
    let html5QrScanner = null;
    let isScannerRunning = false;
    let toastTimer = null;
    let adminUnsubscribers = [];
    let saleItemRowNumber = 0;
    let pendingPosterBlob = null;
      if (document.getElementById("invCropTop")) { document.getElementById("invCropTop").value = "0"; document.getElementById("invCropTopVal").textContent = "0%"; }
      if (document.getElementById("invCropBottom")) { document.getElementById("invCropBottom").value = "0"; document.getElementById("invCropBottomVal").textContent = "0%"; }
    const catalogCart = new Map();
    const CART_KEY = "sjs-catalog-cart-v1";
    const salePaymentMethods = new Set(["Cash", "QRIS", "Kartu", "Transfer", "Split", "Bon"]);
    const activeInventory = () => inventory.filter(item => !item.archivedAt);

    // ==================== UTILITAS ====================
    function todayStr() {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());
    }
    function shiftDate(str, days) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
    }
    function parseLocalDate(str) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    function esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function csvCell(v) {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }
    function rp(n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); }
    function assistantKey(v) {
      return String(v || "").normalize("NFKC").toLocaleLowerCase("id").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    }
    function formatItemLabel(item) {
      return `${item.code ? `[${item.code}] ` : ""}${item.name || ""}`;
    }
    function formatDropdownOption(item) {
      const varian = [item.size, item.color].filter(Boolean).join("/");
      return `${formatItemLabel(item)}${varian ? ` (${varian})` : ""} - ${rp(item.price)}`;
    }
    function paths(...segments) {
      return ["artifacts", APP_ID, "public", "data", ...segments];
    }
    function sjsConfirm(message, title = "Konfirmasi Tindakan") {
      return new Promise(resolve => {
        const dlg = document.getElementById("sjsConfirmDialog");
        if (!dlg) return resolve(false);
        document.getElementById("sjsConfirmTitle").textContent = title;
        document.getElementById("sjsConfirmMessage").textContent = message;
        const okBtn = document.getElementById("sjsConfirmOk");
        const cancelBtn = document.getElementById("sjsConfirmCancel");
        const cleanup = result => {
          okBtn.removeEventListener("click", onOk);
          cancelBtn.removeEventListener("click", onCancel);
          dlg.removeEventListener("cancel", onCancel);
          if (dlg.open) dlg.close();
          resolve(result);
        };
        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        dlg.addEventListener("cancel", onCancel);
        dlg.showModal();
      });
    }

    function showToast(msg) {
      const dialogStatus = document.querySelector("dialog[open] [data-dialog-status]");
      if (dialogStatus) { dialogStatus.textContent = msg; return; }
      const toast = document.getElementById("toast");
      document.getElementById("toastMessage").textContent = msg;
      toast.classList.remove("hidden");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
    }
    function updateSyncStatus(online, text) {
      document.getElementById("syncStatusText").textContent = text;
      document.getElementById("syncStatusDot").className =
        "w-2.5 h-2.5 rounded-full shrink-0 " + (online ? "bg-emerald-300" : "bg-amber-300");
    }
    function setShopName(name) {
      shopName = name;
      document.getElementById("shopNameDisplay").textContent = name;
      document.getElementById("footerShopName").textContent = name;
    }
    function paymentMethodLabel(m) { return m === "Cash" ? "Tunai" : m === "Split" ? "Split (Campuran)" : m === "Bon" ? "Bon (Belum Lunas)" : m || "Belum tercatat"; }

    // ==================== KOMPRESI & UNGGAH FOTO ====================
    function isCanvasReadBlocked() {
      try {
        const t = document.createElement("canvas");
        t.width = 2; t.height = 2;
        const g = t.getContext("2d");
        g.fillStyle = "#123456";
        g.fillRect(0, 0, 2, 2);
        const px = g.getImageData(0, 0, 1, 1).data;
        return Math.abs(px[0] - 0x12) > 4 || Math.abs(px[1] - 0x34) > 4 || Math.abs(px[2] - 0x56) > 4;
      } catch {
        return true;
      }
    }

    async function compressImage(file, maxSide = COMPRESS_MAX_SIDE, quality = 0.8) {
      if (isCanvasReadBlocked()) return file;
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
      const webp = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (webp && webp.type === "image/webp") return webp;
      return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    }

    async function uploadProductImage(file, itemId) {
      if (!file.type.startsWith("image/")) throw new Error("File harus berupa foto.");
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran foto maksimal 5 MB.");
      const blob = await compressImage(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const formData = new FormData();
      formData.append("file", blob, `${itemId}.${ext}`);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("folder", "products");
      formData.append("public_id", `${itemId}-${Date.now()}`);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Upload foto ke Cloudinary gagal.");
      }
      return { imageUrl: result.secure_url, imagePath: result.public_id };
    }

    function thumbnailUrl(url, width = 160) {
      if (!url || !url.includes("/image/upload/")) return url;
      return url.replace("/image/upload/", `/image/upload/c_fill,w_${width},q_auto,f_auto/`);
    }
    function safeHttpsUrl(url) {
      const raw = String(url || "").trim();
      if (!raw) return "";
      try {
        const parsed = new URL(raw);
        return parsed.protocol === "https:" ? parsed.href : "";
      } catch {
        return "";
      }
    }
    function productImageUrl(item) {
      return safeHttpsUrl(item?.imageUrl);
    }
    function productImageMarkup(item, extraClass = "", width = 160, eager = false) {
      const url = productImageUrl(item);
      if (url) {
        return `<div class="${extraClass} relative overflow-hidden bg-white"><img src="${esc(thumbnailUrl(url, width))}" alt="${esc(item?.name || "Foto produk")}" loading="${eager ? "eager" : "lazy"}" class="h-full w-full object-contain bg-white"></div>`;
      }
      const cat = typeof detectProductCategoryLabel === "function" ? detectProductCategoryLabel(item || {}) : { label: "Olahraga" };
      const shortName = esc(String(item?.name || "Surya Jaya Sport").slice(0, 34));
      return `<div class="${extraClass} relative overflow-hidden flex flex-col items-center justify-center p-2.5 text-center text-white" style="background:linear-gradient(135deg,#0b2566 0%,#1d5fd6 62%,#38bdf8 100%)">
        <span class="px-2 py-0.5 rounded-full bg-white/90 text-slate-900 text-[9px] font-extrabold tracking-wide uppercase">${esc(cat.label)}</span>
        <span class="mt-1.5 font-extrabold text-xs leading-tight drop-shadow">${shortName}</span>
        ${item?.code ? `<span class="mt-1 font-mono text-[9px] text-amber-300 font-bold">${esc(item.code)}</span>` : ""}
      </div>`;
    }

    // ==================== GENERATOR POSTER KATALOG OTOMATIS (ALA SENAR EXBOLT 65) ====================
    function loadImageCors(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    function cutoutWhiteBg(sourceImg, cropTopPct = 0, cropBottomPct = 0) {
      const sw = sourceImg.naturalWidth || sourceImg.width || 1;
      const sh = sourceImg.naturalHeight || sourceImg.height || 1;
      const sy = Math.round(sh * Math.max(0, Math.min(0.4, cropTopPct)));
      const ey = Math.round(sh * (1 - Math.max(0, Math.min(0.4, cropBottomPct))));
      const ch = Math.max(1, ey - sy);
      const tmp = document.createElement("canvas");
      tmp.width = sw; tmp.height = ch;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(sourceImg, 0, sy, sw, ch, 0, 0, sw, ch);
      if (isCanvasReadBlocked()) return tmp;
      const idata = tctx.getImageData(0, 0, sw, ch);
      const d = idata.data;
      const visited = new Uint8Array(sw * ch);
      const q = new Int32Array(sw * ch);
      let head = 0, tail = 0;

      const isNearWhite = idx => {
        const r = d[idx], g = d[idx + 1], b = d[idx + 2], a = d[idx + 3];
        if (a < 20) return true;
        const minC = Math.min(r, g, b), maxC = Math.max(r, g, b);
        return minC >= 224 && (maxC - minC) <= 24;
      };
      const push = (x, y) => {
        const p = y * sw + x;
        if (visited[p] || !isNearWhite(p * 4)) return;
        visited[p] = 1;
        q[tail++] = p;
      };
      for (let x = 0; x < sw; x++) { push(x, 0); push(x, ch - 1); }
      for (let y = 0; y < ch; y++) { push(0, y); push(sw - 1, y); }
      while (head < tail) {
        const p = q[head++];
        d[p * 4 + 3] = 0;
        const x = p % sw, y = (p - x) / sw;
        if (x > 0) push(x - 1, y);
        if (x + 1 < sw) push(x + 1, y);
        if (y > 0) push(x, y - 1);
        if (y + 1 < ch) push(x, y + 1);
      }
      let minX = sw, minY = ch, maxX = 0, maxY = 0;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < sw; x++) {
          const p = y * sw + x;
          const a = d[p * 4 + 3];
          if (a > 0) {
            const nearBg = (x > 0 && visited[p - 1]) || (x + 1 < sw && visited[p + 1]) || (y > 0 && visited[p - sw]) || (y + 1 < ch && visited[p + sw]);
            if (nearBg) {
              const lum = (d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2]) / 3;
              if (lum > 200) d[p * 4 + 3] = Math.round(a * Math.max(0, (245 - lum) / 45));
            }
            if (d[p * 4 + 3] > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }
      tctx.putImageData(idata, 0, 0);
      if (maxX <= minX || maxY <= minY) return tmp;
      const out = document.createElement("canvas");
      out.width = maxX - minX + 1;
      out.height = maxY - minY + 1;
      out.getContext("2d").drawImage(tmp, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    }

    function categoryFeatureBadges(itemMeta) {
      const cat = typeof detectProductCategoryLabel === "function" ? detectProductCategoryLabel(itemMeta || {}).key : "sport";
      if (cat === "badminton") return [["★", "Kualitas", "Pilihan"], ["✓", "Nyaman", "Dipakai"], ["◆", "Siap Main", "di Lapangan"]];
      if (cat === "ball") return [["★", "Bahan", "Awet"], ["✓", "Kontrol", "Mantap"], ["◆", "Siap", "Tanding"]];
      if (cat === "chess") return [["★", "Papan", "Praktis"], ["✓", "Bidak", "Rapi"], ["◆", "Standar", "Bermain"]];
      if (cat === "music") return [["★", "Suara", "Jernih"], ["✓", "Mudah", "Dipasang"], ["◆", "Awet", "Dipakai"]];
      return [["★", "Produk", "Pilihan"], ["✓", "Kualitas", "Terjaga"], ["◆", "Stok Siap", "di Berau"]];
    }

    async function drawProductPosterToCanvas(c, itemMeta, sourceFileOrUrl = null, opts = {}) {
      c.width = 800; c.height = 800;
      const ctx = c.getContext("2d");
      const withTouch = opts.withTouch !== false;

      // 1. Vibrant stadium-sky studio background
      const bg = ctx.createLinearGradient(0, 0, 0, 800);
      bg.addColorStop(0, "#0b3ba8");
      bg.addColorStop(0.28, "#2563eb");
      bg.addColorStop(0.58, "#dbeafe");
      bg.addColorStop(0.76, "#f8fafc");
      bg.addColorStop(1, "#cbd5e1");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 800, 800);

      // Stadium bokeh lights along upper arena
      if (withTouch) {
        const lights = [[80, 215, 42], [175, 228, 34], [320, 225, 28], [670, 220, 38], [745, 232, 30], [580, 200, 22]];
        for (const [lx, ly, lr] of lights) {
          const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr);
          lg.addColorStop(0, "rgba(255,255,255,0.92)");
          lg.addColorStop(0.45, "rgba(186,230,253,0.45)");
          lg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Glossy floor shadow ellipse under product
      const floorY = withTouch ? 612 : 665;
      const floor = ctx.createRadialGradient(400, floorY, 25, 400, floorY, 320);
      floor.addColorStop(0, "rgba(15, 23, 42, 0.22)");
      floor.addColorStop(0.65, "rgba(30, 58, 138, 0.08)");
      floor.addColorStop(1, "rgba(30, 58, 138, 0)");
      ctx.fillStyle = floor;
      ctx.beginPath();
      ctx.ellipse(400, floorY, 320, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Top-left signature wave: royal blue + yellow accent + white wave
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(435, 0);
      ctx.bezierCurveTo(360, 115, 200, 195, 0, 235);
      ctx.closePath();
      const blueWave = ctx.createLinearGradient(0, 0, 435, 220);
      blueWave.addColorStop(0, "#1d4ed8");
      blueWave.addColorStop(1, "#2563eb");
      ctx.fillStyle = blueWave;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(355, 0); ctx.lineTo(410, 0);
      ctx.bezierCurveTo(345, 95, 235, 165, 105, 198);
      ctx.lineTo(80, 185);
      ctx.bezierCurveTo(210, 150, 310, 85, 355, 0);
      ctx.closePath();
      ctx.fillStyle = "#facc15";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(372, 0);
      ctx.bezierCurveTo(315, 98, 185, 175, 0, 198);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // Brand mark (uses real sjs-mark.png from same origin, with vector fallback)
      let drewMark = false;
      try {
        const markImg = await loadImageCors("sjs-mark.png");
        ctx.drawImage(markImg, 18, 22, 74, 88);
        drewMark = true;
      } catch {}
      if (!drewMark) {
        ctx.save();
        ctx.fillStyle = "#1d4ed8";
        ctx.beginPath(); ctx.arc(64, 44, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(28, 116); ctx.quadraticCurveTo(78, 86, 62, 58); ctx.stroke();
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.moveTo(24, 64); ctx.quadraticCurveTo(48, 60, 56, 72); ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.font = "italic 900 33px Arial, sans-serif";
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText("SURYA JAYA", 98, 66);
      ctx.font = "italic 900 33px Arial, sans-serif";
      ctx.fillStyle = "#dc2626";
      ctx.fillText("SPORT", 142, 102);
      ctx.font = "italic 700 15.5px Arial, sans-serif";
      ctx.fillStyle = "#1e40af";
      ctx.fillText("Sport for a Better Life", 84, 130);
      ctx.restore();

      // 3. Top-right slanted crimson banner (Grip Biasa style) + yellow underline
      const rawName = String(itemMeta?.name || "Produk").trim();
      ctx.save();
      ctx.translate(580, 96);
      ctx.rotate(-0.045);
      drawRoundedRect(ctx, -190, -36, 380, 74, 24);
      const rGrad = ctx.createLinearGradient(-190, -36, 190, 38);
      rGrad.addColorStop(0, "#b91c1c");
      rGrad.addColorStop(0.5, "#dc2626");
      rGrad.addColorStop(1, "#991b1b");
      ctx.fillStyle = rGrad;
      ctx.shadowColor = "rgba(15,23,42,0.34)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-145, 50);
      ctx.quadraticCurveTo(0, 38, 150, 48);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      const bannerText = rawName.slice(0, 24);
      const bFont = bannerText.length > 18 ? 28 : (bannerText.length > 13 ? 35 : 44);
      ctx.font = `italic 900 ${bFont}px Arial, sans-serif`;
      ctx.fillText(bannerText, 0, Math.round(bFont * 0.34));
      ctx.restore();

      // 4. Center product photo (cutout floating or framed)
      let photoImg = null;
      if (sourceFileOrUrl instanceof Blob) {
        photoImg = await createImageBitmap(sourceFileOrUrl);
      } else if (typeof sourceFileOrUrl === "string" && safeHttpsUrl(sourceFileOrUrl)) {
        try { photoImg = await loadImageCors(sourceFileOrUrl); } catch {}
      }

      if (photoImg) {
        const removeWhite = opts.removeWhiteBg !== false;
        const cropTop = Number(opts.cropTopPct || 0);
        const cropBottom = Number(opts.cropBottomPct || 0);
        const centerY = withTouch ? 452 : 462;
        const maxH = withTouch ? 365 : 445;

        if (removeWhite) {
          const cut = cutoutWhiteBg(photoImg, cropTop, cropBottom);
          const maxW = 680;
          const sc = Math.min(maxW / cut.width, maxH / cut.height);
          const dw = Math.round(cut.width * sc), dh = Math.round(cut.height * sc);
          const dx = Math.round(400 - dw / 2), dy = Math.round(centerY - dh / 2);
          ctx.save();
          ctx.shadowColor = "rgba(15, 23, 42, 0.30)";
          ctx.shadowBlur = 22;
          ctx.shadowOffsetY = 14;
          ctx.drawImage(cut, dx, dy, dw, dh);
          ctx.restore();

          // 5. Zoom-in detail callout circle + pointer line (Grip Biasa style)
          if (withTouch && cut.width >= 60 && cut.height >= 60) {
            const zoomCx = 582, zoomCy = 258, zoomR = 72;
            const srcPtX = dx + Math.round(dw * 0.32), srcPtY = dy + Math.round(dh * 0.28);
            ctx.save();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(srcPtX, srcPtY); ctx.lineTo(srcPtX + 48, zoomCy); ctx.lineTo(zoomCx - zoomR, zoomCy); ctx.stroke();
            ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(srcPtX, srcPtY); ctx.lineTo(srcPtX + 48, zoomCy); ctx.lineTo(zoomCx - zoomR, zoomCy); ctx.stroke();
            ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.arc(srcPtX, srcPtY, 7, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.stroke();

            ctx.save();
            ctx.beginPath(); ctx.arc(zoomCx, zoomCy, zoomR, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = "#ffffff"; ctx.fillRect(zoomCx - zoomR, zoomCy - zoomR, zoomR * 2, zoomR * 2);
            const cropSide = Math.min(cut.width, cut.height) * 0.44;
            ctx.drawImage(cut, Math.max(0, cut.width * 0.12), Math.max(0, cut.height * 0.08), cropSide, cropSide, zoomCx - zoomR, zoomCy - zoomR, zoomR * 2, zoomR * 2);
            ctx.restore();

            ctx.beginPath(); ctx.arc(zoomCx, zoomCy, zoomR, 0, Math.PI * 2);
            ctx.lineWidth = 6; ctx.strokeStyle = "#facc15"; ctx.stroke();
            ctx.beginPath(); ctx.arc(zoomCx, zoomCy, zoomR + 4, 0, Math.PI * 2);
            ctx.lineWidth = 2.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
            ctx.restore();
          }
        } else {
          const iw = photoImg.width || photoImg.naturalWidth || 1;
          const ih = photoImg.height || photoImg.naturalHeight || 1;
          const maxW = 500;
          const sc = Math.min(maxW / iw, maxH / ih);
          const dw = Math.round(iw * sc), dh = Math.round(ih * sc);
          const dx = Math.round(400 - dw / 2), dy = Math.round(centerY - dh / 2);
          ctx.save();
          drawRoundedRect(ctx, dx - 12, dy - 12, dw + 24, dh + 24, 26);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(15, 23, 42, 0.2)";
          ctx.shadowBlur = 26;
          ctx.shadowOffsetY = 12;
          ctx.fill();
          ctx.restore();
          ctx.save();
          drawRoundedRect(ctx, dx, dy, dw, dh, 18);
          ctx.clip();
          ctx.drawImage(photoImg, dx, dy, dw, dh);
          ctx.restore();
        }
        photoImg.close?.();
      } else {
        ctx.save();
        drawRoundedRect(ctx, 185, 245, 430, 380, 28);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#1e3a8a";
        ctx.font = "900 34px Arial, sans-serif";
        ctx.textAlign = "center";
        wrapText(ctx, rawName, 400, 400, 360, 44, 3);
        ctx.fillStyle = "#047857";
        ctx.font = "900 30px Arial, sans-serif";
        if (Number(itemMeta?.price) > 0) ctx.fillText(rp(itemMeta.price), 400, 550);
        ctx.textAlign = "left";
      }

      // 6. Three bottom feature badges (Grip Biasa style)
      if (withTouch) {
        const badges = categoryFeatureBadges(itemMeta);
        const pillW = 228, pillH = 62, gap = 22, startX = 36, pillY = 666;
        badges.forEach(([ico, l1, l2], idx) => {
          const px = startX + idx * (pillW + gap);
          drawRoundedRect(ctx, px + 18, pillY + 4, pillW - 18, pillH - 8, 27);
          const pGrad = ctx.createLinearGradient(px, pillY, px, pillY + pillH);
          pGrad.addColorStop(0, "#1e3a8a");
          pGrad.addColorStop(1, "#0f172a");
          ctx.fillStyle = pGrad;
          ctx.shadowColor = "rgba(15,23,42,0.28)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
          ctx.fill();
          ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px + 32, pillY + pillH / 2, 27, 0, Math.PI * 2);
          ctx.fillStyle = "#facc15";
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.fillStyle = "#0f172a";
          ctx.font = "900 22px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(ico, px + 32, pillY + pillH / 2 + 8);

          ctx.textAlign = "left";
          ctx.fillStyle = "#ffffff";
          ctx.font = "italic 800 18px Arial, sans-serif";
          ctx.fillText(l1, px + 68, pillY + 28);
          ctx.fillText(l2, px + 68, pillY + 49);
        });
      }

      // 7. Bottom blue & red curved swoosh ribbons
      ctx.beginPath();
      ctx.moveTo(0, 752);
      ctx.quadraticCurveTo(250, 796, 580, 784);
      ctx.lineTo(800, 768);
      ctx.lineTo(800, 800);
      ctx.lineTo(0, 800);
      ctx.closePath();
      ctx.fillStyle = "#1d4ed8";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(220, 800);
      ctx.quadraticCurveTo(540, 786, 800, 744);
      ctx.lineTo(800, 774);
      ctx.quadraticCurveTo(560, 802, 300, 800);
      ctx.closePath();
      ctx.fillStyle = "#dc2626";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(220, 797);
      ctx.quadraticCurveTo(540, 783, 800, 741);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      return c;
    }

    async function renderProductPosterBlob(itemMeta, sourceFileOrUrl = null, opts = {}) {
      if (isCanvasReadBlocked()) {
        throw new Error("Firefox memblokir ekspor kanvas (gambar jadi putih). Izinkan 'Extract canvas data' di bilah alamat Firefox atau gunakan Chrome/Edge.");
      }
      const c = document.createElement("canvas");
      await drawProductPosterToCanvas(c, itemMeta, sourceFileOrUrl, opts);
      const webp = await new Promise(resolve => c.toBlob(resolve, "image/webp", 0.86));
      if (webp && webp.type === "image/webp") return webp;
      return await new Promise(resolve => c.toBlob(resolve, "image/jpeg", 0.86));
    }


    // ==================== GENERATOR POSTER AI (GEMINI IMAGE API) ====================
    async function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function sourceToInlinePart(sourceFileOrUrl) {
      let blob = null;
      if (sourceFileOrUrl instanceof Blob) {
        blob = sourceFileOrUrl;
      } else if (typeof sourceFileOrUrl === "string" && safeHttpsUrl(sourceFileOrUrl)) {
        const res = await fetch(sourceFileOrUrl);
        if (res.ok) blob = await res.blob();
      }
      if (!blob) return null;
      const b64 = await blobToBase64(blob);
      return b64 ? { inlineData: { mimeType: blob.type || "image/jpeg", data: b64 } } : null;
    }

    async function generateAiPosterBlob(itemMeta, sourceFileOrUrl = null) {
      const apiKey = String(geminiApiKey || "").trim();
      if (!apiKey) {
        throw new Error("Gemini API Key belum diatur. Buka 'Seragamkan poster' lalu simpan API Key Anda.");
      }
      const name = String(itemMeta?.name || "Produk Olahraga").trim();
      const code = String(itemMeta?.code || "SJS").trim();
      const cat = typeof detectProductCategoryLabel === "function" ? detectProductCategoryLabel(itemMeta || {}).label : "Olahraga";
      const desc = String(itemMeta?.description || "").trim();

      const parts = [];
      const prodPart = await sourceToInlinePart(sourceFileOrUrl).catch(() => null);
      if (prodPart) parts.push(prodPart);
      try {
        const markRes = await fetch("sjs-mark.png");
        if (markRes.ok) {
          const markPart = await sourceToInlinePart(await markRes.blob());
          if (markPart) parts.push(markPart);
        }
      } catch {}

      const prompt = [
        `Create a polished 1:1 square commercial retail product catalog poster in Indonesian for sports shop "SURYA JAYA SPORT" (tagline: "Sport for a Better Life").`,
        `Product Name: "${name}" (SKU: ${code}, Category: ${cat}${desc ? ", Info: " + desc : ""}).`,
        prodPart
          ? `Use the exact product from the first reference image: cleanly isolate the product with NO white box, NO supplier/marketplace watermarks or logos, and NO extra supplier text. Re-light it with crisp 3D studio lighting and realistic soft glossy floor reflection.`
          : `Create a crisp, realistic 3D studio product illustration of "${name}" centered on a glossy reflective floor.`,
        `Exact visual layout to match our catalog style:`,
        `1) Top-left corner: curved white wave with a vibrant yellow and royal-blue swoosh border containing the Surya Jaya Sport logo mark (from the second reference image if provided), bold italic blue "SURYA JAYA", bold italic red "SPORT", and small blue italic "Sport for a Better Life".`,
        `2) Top-right corner: dynamic slightly slanted bold crimson-red capsule banner with crisp white border and subtle yellow underline showing the product title "${name}" in bold white italic lettering (or stacked bold navy outlined text + red capsule for long names).`,
        `3) Background: vibrant sky-blue athletic stadium/arena studio background with soft glowing bokeh stadium lights at upper mid-height and a bright clean light-blue reflective floor below.`,
        `4) Right-side upper detail callout: a circular yellow-and-white-bordered zoom-in detail loupe with a thin white-and-blue pointer line pointing to the product's key texture/detail.`,
        `5) Bottom row (above the bottom stripe): three clean horizontal dark-navy capsule pills with white borders, each with a yellow circular custom icon on the left and short 2-line white italic Indonesian benefit text specific to "${name}" (no prices, no phone numbers).`,
        `6) Very bottom edge: sleek curved royal-blue and crimson-red swoosh accent ribbons.`,
        `Output ONLY a crisp, clean, spelling-accurate 1:1 square poster image.`
      ].join(" ");
      parts.push({ text: prompt });

      const body = JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
      });

      const models = ["gemini-nano-banana-2.1", "gemini-2.5-flash-image"];
      let lastErr = "Gagal menghubungi Gemini API.";
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg = data?.error?.message || `HTTP ${res.status}`;
            lastErr = `[${model}] ${msg}`;
            if (res.status === 401 || res.status === 403) break;
            continue;
          }
          const cands = data.candidates || [];
          for (const cand of cands) {
            for (const part of cand?.content?.parts || []) {
              const imgData = part.inlineData || part.inline_data;
              if (imgData?.data) {
                const mime = imgData.mimeType || imgData.mime_type || "image/png";
                const bin = atob(imgData.data);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new Blob([bytes], { type: mime });
              }
            }
          }
          lastErr = `[${model}] Gemini tidak mengembalikan gambar.`;
        } catch (e) {
          lastErr = `[${model}] ${e.message || String(e)}`;
        }
      }
      throw new Error(lastErr);
    }

    async function uploadBlobToCloudinary(blob, itemId) {
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const formData = new FormData();
      formData.append("file", blob, `${itemId}.${ext}`);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("folder", "products");
      formData.append("public_id", `${itemId}-${Date.now()}`);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Upload foto ke Cloudinary gagal.");
      }
      return { imageUrl: result.secure_url, imagePath: result.public_id };
    }

    // ==================== SIMPAN BARANG ====================
    async function saveInventoryItem() {
      if (!isAdmin) return showToast("Masuk sebagai pemilik terlebih dahulu.");
      const editId = document.getElementById("editInvId").value.trim();
      const name = document.getElementById("invName").value.trim();
      let code = document.getElementById("invCode").value.trim();
      const stockRaw = document.getElementById("invStock").value.trim();
      const stock = stockRaw === "" ? NaN : Number(stockRaw);
      const cost = parseIdrNum(document.getElementById("invCost").value);
      const price = parseIdrNum(document.getElementById("invPrice").value);
      const description = document.getElementById("invDescription").value.trim();
      const imageFile = document.getElementById("invImageFile").files?.[0] || null;

      const errName = !name;
      const errStock = stockRaw === "" || !Number.isSafeInteger(stock) || stock < 0;
      const errPrice = !(price > 0);
      setInvFieldError("invName", "invErrName", errName);
      setInvFieldError("invStock", "invErrStock", errStock);
      setInvFieldError("invPrice", "invErrPrice", errPrice);
      if (errName || errStock || errPrice) {
        const firstId = errName ? "invName" : errStock ? "invStock" : "invPrice";
        const el = document.getElementById(firstId);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
        return showToast("Lengkapi kolom wajib yang bertanda merah.");
      }
      if (!code) code = nextAutoCode();
      if (inventory.some(i => i.id !== editId && String(i.code || "").trim().toLowerCase() === code.toLowerCase())) return showToast("Kode barang sudah dipakai barang lain.");
      if (description.length > 400) return showToast("Deskripsi maksimal 400 karakter.");

      const sizeVal = document.getElementById("invSize").value.trim();
      const colorVal = document.getElementById("invColor").value.trim();
      const autoDesc = description;

      const itemId = editId || doc(collection(db, ...paths("inventory"))).id;
      const oldItem = inventory.find(i => i.id === itemId);
      const itemData = {
        code, name,
        size: sizeVal,
        color: colorVal,
        stock, cost, price, description: autoDesc,
        imageUrl: oldItem?.imageUrl || "",
        imagePath: oldItem?.imagePath || "",
        updatedAt: new Date().toISOString()
      };

      try {
        if (imageFile) {
          showToast("Mengunggah foto produk...");
          const uploaded = await uploadProductImage(imageFile, itemId);
          itemData.imageUrl = uploaded.imageUrl;
          itemData.imagePath = uploaded.imagePath;
        }
        const invRef = doc(db, ...paths("inventory", itemId));
        const publicRef = doc(db, "publicCatalog", itemId);
        await runTransaction(db, async tx => {
          const current = await tx.get(invRef);
          const published = await tx.get(publicRef);
          if (editId && !current.exists()) throw new Error("Barang sudah dihapus. Muat ulang daftar stok.");
          const patch = { ...itemData };
          if (current.exists()) {
            const saved = current.data();
            const previousStock = Number(saved.stock || 0);
            const delta = editId ? stock - previousStock : 0;
            patch.stock = editId ? stock : previousStock;
            if (!imageFile && !itemData.imageUrl) { patch.imageUrl = saved.imageUrl || ""; patch.imagePath = saved.imagePath || ""; }
            if (delta) {
              patch.stockEdits = [...(Array.isArray(saved.stockEdits) ? saved.stockEdits.slice(-29) : []),
                { date: todayStr(), createdAt: patch.updatedAt, delta }];
            }
          }
          tx.set(invRef, patch, { merge: true });
          if (published.exists()) tx.set(publicRef, publicProductData(patch));
        });
        // Simpan varian tambahan (jika ada, khusus mode Tambah barang baru)
        let savedVariants = 0;
        if (!editId) {
          const vRows = [...document.querySelectorAll("#invVariantsList .inv-variant-row")];
          const usedCodes = new Set(inventory.map(i => String(i.code || "").trim().toLowerCase()));
          usedCodes.add(code.toLowerCase());
          const allocCode = (idx) => {
            const suffix = idx < 26 ? String.fromCharCode(65 + idx) : String(idx + 1);
            let cand = `${code}-${suffix}`;
            let seq = 2;
            while (usedCodes.has(cand.toLowerCase())) { cand = `${code}-${suffix}${seq++}`; }
            usedCodes.add(cand.toLowerCase());
            return cand;
          };
          const validVarRows = vRows.filter(vr => (vr.querySelector(".var-size")?.value.trim() || vr.querySelector(".var-color")?.value.trim()));
          if (validVarRows.length > 0) {
            await setDoc(doc(db, ...paths("inventory", itemId)), { variantGroup: itemId }, { merge: true });
          }
          for (let vi = 0; vi < validVarRows.length; vi++) {
            const vr = validVarRows[vi];
            const vSize = vr.querySelector(".var-size")?.value.trim() || "";
            const vColor = vr.querySelector(".var-color")?.value.trim() || "";
            const vStock = Math.max(0, Math.trunc(Number(vr.querySelector(".var-stock")?.value) || 0));
            const vPrice = parseIdrNum(vr.querySelector(".var-price")?.value) || price;
            const vId = doc(collection(db, ...paths("inventory"))).id;
            let vImgUrl = itemData.imageUrl || "";
            let vImgPath = itemData.imagePath || "";
            const vFile = vr.querySelector(".var-photo-input")?.files?.[0] || null;
            if (vFile) {
              showToast(`Mengunggah foto varian ${vi + 1}/${validVarRows.length}...`);
              const upVar = await uploadProductImage(vFile, vId);
              vImgUrl = upVar.imageUrl;
              vImgPath = upVar.imagePath;
            }
            const vData = {
              code: allocCode(vi),
              name,
              size: vSize,
              color: vColor,
              stock: vStock,
              cost,
              price: vPrice,
              description: autoDesc,
              imageUrl: vImgUrl,
              imagePath: vImgPath,
              variantGroup: itemId,
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, ...paths("inventory", vId)), vData, { merge: true });
            savedVariants++;
          }
        }
        resetInvForm();
        document.getElementById("invEntryCard").close();
        showToast(savedVariants > 0 ? `Barang & ${savedVariants} varian berhasil disimpan.` : "Barang berhasil disimpan.");
      } catch (err) {
        console.error(err);
        showToast("Gagal menyimpan: " + (err.message || "kesalahan tidak diketahui"));
      }
    }

    function buildAutoProductDescription(item) {
      const name = String(item?.name || "").trim();
      const spec = [item?.size, item?.color].map(v => String(v || "").trim()).filter(Boolean).join(", ");
      const catInfo = detectProductCategoryLabel({ name, description: "" });
      if (isSenarBadminton({ name, description: "" })) {
        return `${name}${spec ? ` (${spec})` : ""} senar badminton tersedia di Surya Jaya Sport Jl. Ahmad Yani 37, Tanjung Redeb, Berau.`.slice(0, 400);
      }
      return `${name}${spec ? ` (${spec})` : ""} kategori ${catInfo.label} tersedia di Surya Jaya Sport Jl. Ahmad Yani 37, Tanjung Redeb, Berau.`.slice(0, 400);
    }

    function publicProductData(item) {
      return {
        name: String(item.name || "").slice(0, 160),
        code: String(item.code || "").slice(0, 80),
        size: String(item.size || "").slice(0, 40),
        color: String(item.color || "").slice(0, 60),
        price: Math.max(0, Number(item.price) || 0),
        stock: Math.max(0, Math.trunc(Number(item.stock) || 0)),
        imageUrl: productImageUrl(item).slice(0, 2048),
        description: String(item.description || "").slice(0, 400),
        variantGroup: String(item.variantGroup || "").slice(0, 120)
      };
    }

    function nextAutoCode() {
      const nums = inventory.map(i => /^SJS-(\d+)$/i.exec(String(i.code || "").trim())?.[1]).filter(Boolean).map(Number);
      return "SJS-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    }
    function setInvFieldError(inputId, errId, isErr) {
      const inp = document.getElementById(inputId);
      const err = document.getElementById(errId);
      if (inp) {
        inp.classList.toggle("border-red-500", isErr);
        inp.classList.toggle("bg-red-50", isErr);
      }
      if (err) err.classList.toggle("hidden", !isErr);
    }
    function downloadBrandedLabelPng(itemObj) {
      renderQrLabel(itemObj);
      if (!lastStickerCanvas) return;
      const a = document.createElement("a");
      a.href = lastStickerCanvas.toDataURL("image/png");
      a.download = `label-${itemObj.code || "SJS"}.png`;
      a.click();
    }
    function updateInvVariantCodes() {
      const base = document.getElementById("invCode")?.value.trim() || nextAutoCode();
      const rows = [...document.querySelectorAll("#invVariantsList .inv-variant-row")];
      rows.forEach((row, idx) => {
        const suffix = idx < 26 ? String.fromCharCode(65 + idx) : String(idx + 1);
        const vCode = `${base}-${suffix}`;
        row.dataset.varCode = vCode;
        const badge = row.querySelector(".var-code-badge");
        if (badge) badge.textContent = vCode;
      });
    }
    function updateInvQrPreview() {
      const box = document.getElementById("invCodeQrPreview");
      const code = document.getElementById("invCode")?.value.trim() || nextAutoCode();
      const hintEl = document.getElementById("invAutoCodeHint");
      const txtEl = document.getElementById("invQrCodeText");
      if (hintEl) hintEl.textContent = nextAutoCode();
      if (txtEl) txtEl.textContent = code;
      const exEl = document.getElementById("invVariantExampleCode");
      if (exEl) exEl.textContent = `${code}-A`;
      updateInvVariantCodes();
      if (!box) return;
      try {
        box.innerHTML = SjsQR.toSvg(code, 60, 1);
        box.title = "Pratinjau QR: " + code;
      } catch {
        box.innerHTML = "";
      }
    }
    function downloadInvQrPng() {
      const code = document.getElementById("invCode")?.value.trim() || nextAutoCode();
      const name = document.getElementById("invName")?.value.trim() || "Barang Baru";
      const price = parseIdrNum(document.getElementById("invPrice")?.value);
      const cost = parseIdrNum(document.getElementById("invCost")?.value);
      const size = document.getElementById("invSize")?.value.trim() || "";
      const color = document.getElementById("invColor")?.value.trim() || "";
      downloadBrandedLabelPng({ code, name, price, cost, size, color });
    }
    function updateInvProfitPreview() {
      const el = document.getElementById("invProfitPreview");
      if (!el) return;
      const cost = parseIdrNum(document.getElementById("invCost")?.value);
      const price = parseIdrNum(document.getElementById("invPrice")?.value);
      if (!(price > 0) || cost <= 0) {
        el.className = "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600";
        el.textContent = price > 0 ? "Laba per unit: — (isi harga modal untuk menghitung laba & margin)" : "Laba per unit: — (isi harga modal & harga jual)";
        return;
      }
      const profit = price - cost;
      const pct = Math.round((profit / price) * 100);
      if (profit < 0) {
        el.className = "rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700";
        el.textContent = `⚠ Harga jual lebih rendah dari modal (rugi ${rp(Math.abs(profit))}/unit)`;
      } else {
        el.className = "rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800";
        el.textContent = `✓ Laba per unit: ${rp(profit)} (${pct}%)`;
      }
    }
    function updateInvVariantSummary() {
      const badge = document.getElementById("invVariantTotalBadge");
      if (!badge) return;
      const mainStock = Math.max(0, Math.trunc(Number(document.getElementById("invStock")?.value) || 0));
      const rows = [...document.querySelectorAll("#invVariantsList .inv-variant-row")];
      if (!rows.length) {
        badge.textContent = `Utama saja (${mainStock} pcs)`;
        return;
      }
      const varStock = rows.reduce((s, r) => s + Math.max(0, Math.trunc(Number(r.querySelector(".var-stock")?.value) || 0)), 0);
      badge.textContent = `1 utama + ${rows.length} varian · Total ${mainStock + varStock} pcs`;
    }
    function refreshInvOptionDatalists() {
      const mergeList = (id, defaults, field) => {
        const dl = document.getElementById(id);
        if (!dl) return;
        const set = new Set(defaults);
        for (const it of inventory) {
          const v = String(it[field] || "").trim();
          if (v) set.add(v);
        }
        dl.innerHTML = [...set].map(v => `<option value="${esc(v)}"></option>`).join("");
      };
      mergeList("invSizeOptions", ["24 lbs","27 lbs","30 lbs","Size 4","Size 5","38","39","40","41","42","43","44","45","S","M","L","XL","XXL","Isi 6","Isi 12","Standar"], "size");
      mergeList("invColorOptions", ["Hitam","Putih","Biru","Navy","Merah","Kuning","Hijau","Abu-abu","Oranye","Ungu","Emas"], "color");
    }
    function addInvVariantRow() {
      const list = document.getElementById("invVariantsList");
      if (!list) return;
      const row = document.createElement("div");
      row.className = "inv-variant-row rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 space-y-2";
      row.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <i class="fa-solid fa-qrcode text-slate-500" aria-hidden="true"></i>
            <span>QR:</span>
            <strong class="var-code-badge px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 font-extrabold tabular-nums"></strong>
          </span>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn-var-qr px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-700"><i class="fa-solid fa-download mr-1" aria-hidden="true"></i>Unduh QR</button>
            <button type="button" class="btn-rm-var px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[11px] font-bold text-red-600" title="Hapus varian">− Hapus</button>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-12 gap-2">
          <input type="text" list="invSizeOptions" maxlength="40" placeholder="Ukuran" class="var-size sm:col-span-3 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold">
          <input type="text" list="invColorOptions" maxlength="60" placeholder="Warna" class="var-color sm:col-span-3 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold">
          <input type="number" min="0" step="1" inputmode="numeric" value="0" placeholder="Stok" class="var-stock sm:col-span-2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-center tabular-nums">
          <input type="text" inputmode="numeric" autocomplete="off" placeholder="Harga" class="var-price sm:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold tabular-nums">
        </div>
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
          <div class="flex items-center gap-2 min-w-0">
            <img class="var-photo-thumb hidden w-9 h-9 object-contain rounded-lg border border-slate-200 bg-white shrink-0" alt="Foto varian">
            <span class="var-photo-label text-[11px] text-slate-500 truncate">Foto varian (opsional, ikut foto utama jika kosong)</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <label class="cursor-pointer px-2.5 py-1 rounded-lg bg-white hover:bg-slate-900 hover:text-white border border-slate-300 text-[11px] font-bold text-slate-700 transition inline-flex items-center gap-1">
              <i class="fa-solid fa-camera text-[10px]" aria-hidden="true"></i><span class="var-photo-btn-txt">Foto Varian</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" class="var-photo-input sr-only">
            </label>
            <button type="button" class="btn-var-photo-clear hidden px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold" title="Hapus foto varian">×</button>
          </div>
        </div>
      `;
      const varPhotoInp = row.querySelector(".var-photo-input");
      const varPhotoThumb = row.querySelector(".var-photo-thumb");
      const varPhotoLbl = row.querySelector(".var-photo-label");
      const varPhotoBtnTxt = row.querySelector(".var-photo-btn-txt");
      const varPhotoClear = row.querySelector(".btn-var-photo-clear");
      varPhotoInp?.addEventListener("change", e => {
        const f = e.target.files?.[0];
        if (f) {
          if (varPhotoThumb) { varPhotoThumb.src = URL.createObjectURL(f); varPhotoThumb.classList.remove("hidden"); }
          if (varPhotoLbl) varPhotoLbl.textContent = f.name;
          if (varPhotoBtnTxt) varPhotoBtnTxt.textContent = "Ganti";
          varPhotoClear?.classList.remove("hidden");
        } else {
          if (varPhotoThumb) { varPhotoThumb.src = ""; varPhotoThumb.classList.add("hidden"); }
          if (varPhotoLbl) varPhotoLbl.textContent = "Foto varian (opsional, ikut foto utama jika kosong)";
          if (varPhotoBtnTxt) varPhotoBtnTxt.textContent = "Foto Varian";
          varPhotoClear?.classList.add("hidden");
        }
      });
      varPhotoClear?.addEventListener("click", () => {
        if (varPhotoInp) varPhotoInp.value = "";
        if (varPhotoThumb) { varPhotoThumb.src = ""; varPhotoThumb.classList.add("hidden"); }
        if (varPhotoLbl) varPhotoLbl.textContent = "Foto varian (opsional, ikut foto utama jika kosong)";
        if (varPhotoBtnTxt) varPhotoBtnTxt.textContent = "Foto Varian";
        varPhotoClear.classList.add("hidden");
      });
      row.querySelector(".var-price")?.addEventListener("input", e => { e.target.value = fmtIdrInput(e.target.value); });
      row.querySelector(".var-stock")?.addEventListener("input", updateInvVariantSummary);
      row.querySelector(".btn-var-qr")?.addEventListener("click", () => {
        const vCode = row.dataset.varCode || "SJS-VAR";
        const baseName = document.getElementById("invName")?.value.trim() || "Barang";
        const vSize = row.querySelector(".var-size")?.value.trim() || "";
        const vColor = row.querySelector(".var-color")?.value.trim() || "";
        const vPrice = parseIdrNum(row.querySelector(".var-price")?.value) || parseIdrNum(document.getElementById("invPrice")?.value);
        const vCost = parseIdrNum(document.getElementById("invCost")?.value);
        downloadBrandedLabelPng({ code: vCode, name: baseName, price: vPrice, cost: vCost, size: vSize, color: vColor });
      });
      row.querySelector(".btn-rm-var")?.addEventListener("click", () => { row.remove(); updateInvVariantCodes(); updateInvVariantSummary(); });
      list.appendChild(row);
      updateInvVariantCodes();
      updateInvVariantSummary();
    }
    function setInvImagePreview(srcUrl, labelText) {
      const wrap = document.getElementById("invImagePreviewWrap");
      const img = document.getElementById("invImagePreview");
      const lbl = document.getElementById("invImagePreviewLabel");
      const btnTxt = document.getElementById("invPickPhotoText");
      if (srcUrl && img) {
        img.src = srcUrl;
        img.classList.remove("hidden");
        if (wrap) wrap.classList.remove("hidden");
        if (lbl) lbl.textContent = labelText || "Pratinjau foto siap disimpan";
        if (btnTxt) btnTxt.textContent = "Ganti Foto";
      } else {
        if (img) { img.src = ""; img.classList.add("hidden"); }
        if (wrap) wrap.classList.add("hidden");
        if (lbl) lbl.textContent = "";
        if (btnTxt) btnTxt.textContent = "Tambah Foto";
      }
    }
    function resetInvForm() {
      ["editInvId", "invName", "invCode", "invSize", "invColor", "invStock", "invCost", "invPrice", "invDescription"]
        .forEach(id => document.getElementById(id).value = "");
      document.getElementById("invImageFile").value = "";
      pendingPosterBlob = null;
      setInvImagePreview("", "");
      document.getElementById("btnCancelInvEdit").classList.add("hidden");
      document.getElementById("btnSaveInvText").textContent = "Simpan barang & buat QR";
      document.getElementById("inventoryEntryTitle").textContent = "Tambah barang";
      const vSec = document.getElementById("invVariantsSection");
      if (vSec) vSec.hidden = false;
      const vList = document.getElementById("invVariantsList");
      if (vList) vList.innerHTML = "";
      refreshInvOptionDatalists();
      setInvFieldError("invName", "invErrName", false);
      setInvFieldError("invStock", "invErrStock", false);
      setInvFieldError("invPrice", "invErrPrice", false);
      updateInvQrPreview();
      updateInvProfitPreview();
      updateInvVariantSummary();
    }
    function editInventoryItem(id) {
      if (!isAdmin) return;
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      resetInvForm();
      document.getElementById("editInvId").value = item.id;
      document.getElementById("invCode").value = item.code || "";
      document.getElementById("invName").value = item.name || "";
      document.getElementById("invSize").value = item.size || "";
      document.getElementById("invColor").value = item.color || "";
      document.getElementById("invStock").value = item.stock || 0;
      document.getElementById("invCost").value = fmtIdrInput(item.cost || 0);
      document.getElementById("invPrice").value = fmtIdrInput(item.price || 0);
      document.getElementById("invDescription").value = item.description || "";
      if (item.imageUrl) setInvImagePreview(item.imageUrl, "Foto produk tersimpan");
      document.getElementById("btnCancelInvEdit").classList.remove("hidden");
      document.getElementById("btnSaveInvText").textContent = "Simpan perubahan";
      document.getElementById("inventoryEntryTitle").textContent = "Ubah barang";
      const vSec = document.getElementById("invVariantsSection");
      if (vSec) vSec.hidden = true;
      updateInvQrPreview();
      updateInvProfitPreview();
      updateInvVariantSummary();
      openDialog("invEntryCard");
    };

    // ==================== PENJUALAN ====================
    function saleInventoryQuantities(items) {
      const q = new Map();
      for (const item of items || []) {
        if (!item.inventoryId) continue;
        const qty = Number(item.qty);
        if (!Number.isSafeInteger(qty) || qty < 1) throw new Error("Jumlah barang tidak valid.");
        q.set(item.inventoryId, (q.get(item.inventoryId) || 0) + qty);
      }
      return q;
    }

    async function saveSaleAndUpdateStock(txData, replacementFor = "") {
      if (!isAdmin) throw new Error("Masuk sebagai pemilik untuk mencatat penjualan.");
      if (!salePaymentMethods.has(txData.paymentMethod)) throw new Error("Pilih cara bayar.");
      if (isMonthLocked(String(txData.date || todayStr()).slice(0, 7))) throw new Error(`Bulan ${String(txData.date || todayStr()).slice(0, 7)} sudah dikunci tutup buku.`);
      if (saleSaveInProgress) throw new Error("Penjualan sedang disimpan, tunggu sebentar.");
      saleSaveInProgress = true;
      try {
        const createdBy = ownerActor();
        const quantities = saleInventoryQuantities(txData.items);
        const transactionRef = doc(collection(db, ...paths("transactions")));
        const originalRef = replacementFor ? doc(db, ...paths("transactions", replacementFor)) : null;
        const sale = await runTransaction(db, async tx => {
          if (originalRef) {
            const original = await tx.get(originalRef);
            if (!original.exists() || !original.data().cancelledAt) throw new Error("Nota asal harus dibatalkan dulu.");
            if (original.data().replacementSaleId) throw new Error("Nota ini sudah punya pengganti.");
          }
          const stockById = new Map();
          for (const [id, qty] of quantities) {
            const snap = await tx.get(doc(db, ...paths("inventory", id)));
            if (!snap.exists()) throw new Error("Barang sudah tidak ada di stok. Pilih ulang.");
            const cur = snap.data();
            if (cur.archivedAt) throw new Error((cur.name || "Barang") + " diarsipkan. Pilih barang aktif.");
            const stock = Number(cur.stock || 0);
            if (stock < qty) throw new Error(`Stok ${cur.name || "barang"} tersisa ${Math.max(0, stock)} pcs.`);
            const pubRef = doc(db, "publicCatalog", id);
            const pub = await tx.get(pubRef);
            stockById.set(id, { stock, cost: Number(cur.cost || 0), pubRef, published: pub.exists() });
          }
          const items = txData.items.map(item => {
            const cost = item.inventoryId ? stockById.get(item.inventoryId).cost : Number(item.cost || 0);
            return { ...item, cost, subtotal: item.price * item.qty };
          });
          const grossOmset = items.reduce((s, i) => s + i.subtotal, 0);
          const discount = Math.min(grossOmset, Math.max(0, Math.round(Number(txData.discount || 0))));
          const totalOmset = grossOmset - discount;
          const totalModal = items.reduce((s, i) => s + i.cost * i.qty, 0);
          const record = { ...txData, createdBy, items, ...(discount > 0 ? { discount } : {}), totalOmset, totalModal, totalProfit: totalOmset - totalModal,
            ...(replacementFor ? { replacesSaleId: replacementFor } : {}) };
          tx.set(transactionRef, record);
          if (originalRef) tx.update(originalRef, { replacementSaleId: transactionRef.id });
          for (const [id, qty] of quantities) {
            const s = stockById.get(id);
            const stock = s.stock - qty;
            tx.update(doc(db, ...paths("inventory", id)), { stock, updatedAt: new Date().toISOString() });
            if (s.published) tx.update(s.pubRef, { stock });
          }
          return record;
        });
        return { ...sale, id: transactionRef.id };
      } finally {
        saleSaveInProgress = false;
      }
    }

    function ownerActor() {
      const user = auth.currentUser;
      if (!isAdmin || !user) throw new Error("Masuk kembali sebagai pemilik.");
      return { uid: user.uid, name: String(user.displayName || user.email || "Pemilik").slice(0, 160) };
    }

    async function cancelSaleAndRestoreStock(id, reason) {
      if (!isAdmin) throw new Error("Masuk sebagai pemilik.");
      const cancellationReason = reason.trim();
      if (!cancellationReason || cancellationReason.length > 160) throw new Error("Isi alasan pembatalan (maks 160 karakter).");
      const cancelledBy = ownerActor();
      const saleRef = doc(db, ...paths("transactions", id));
      const cancelledAt = new Date().toISOString();
      return runTransaction(db, async tx => {
        const sale = await tx.get(saleRef);
        if (!sale.exists()) throw new Error("Transaksi tidak ditemukan.");
        const data = sale.data();
        if (isMonthLocked(String(data.date || "").slice(0, 7))) throw new Error(`Bulan ${String(data.date || "").slice(0, 7)} sudah dikunci tutup buku.`);
        if (data.cancelledAt) return { alreadyCancelled: true };
        const restores = [];
        for (const [invId, qty] of saleInventoryQuantities(data.items)) {
          const ref = doc(db, ...paths("inventory", invId));
          const cur = await tx.get(ref);
          if (!cur.exists()) throw new Error("Pembatalan gagal: barang sudah dihapus dari stok.");
          const pubRef = doc(db, "publicCatalog", invId);
          const pub = await tx.get(pubRef);
          restores.push({ ref, pubRef, published: pub.exists(), stock: Number(cur.data().stock || 0) + qty });
        }
        for (const r of restores) {
          tx.update(r.ref, { stock: r.stock, updatedAt: cancelledAt });
          if (r.published) tx.update(r.pubRef, { stock: r.stock });
        }
        tx.update(saleRef, { cancelledAt, cancellationReason, cancelledBy });
        return { alreadyCancelled: false };
      });
    }

    function renderSaleRows() {
      const container = document.getElementById("saleItemsContainer");
      // Keep empty cart clean until user picks an item or clicks + Barang Bebas
      calculateSaleTotals();
    }

    function parseIdrNum(val) {
      const digits = String(val ?? "").replace(/[^\d]/g, "");
      return digits ? Number(digits) : 0;
    }
    function parseNullableIdr(val) {
      const digits = String(val ?? "").replace(/[^\d]/g, "");
      return digits === "" ? null : Number(digits);
    }
    function fmtIdrInput(val) {
      if (val == null || val === "") return "";
      const n = parseIdrNum(val);
      return n > 0 ? n.toLocaleString("id-ID") : "";
    }
    function titleCase(s) {
      return String(s || "").trim().replace(/\s+/g, " ")
        .toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
    }
    function validateFreeItem(item) {
      const errors = [];
      const warnings = [];
      if (!item.name || !item.name.trim()) errors.push("Isi nama barang dulu.");
      if (!(item.price > 0)) errors.push("Isi harga jual dulu.");
      if (!(item.qty >= 1)) errors.push("Jumlah minimal 1.");
      if (item.cost != null && item.price > 0 && item.cost > item.price) {
        warnings.push("Modal lebih besar dari harga jual. Cek lagi, mungkin salah ketik.");
      }
      return { ok: errors.length === 0, errors, warnings };
    }

    function posCategoryEmoji(itemOrName) {
      const obj = typeof itemOrName === "string" ? { name: itemOrName } : (itemOrName || {});
      const catKey = detectProductCategoryLabel(obj).key;
      return catKey === "badminton" ? "🏸" : catKey === "ball" ? "⚽" : catKey === "chess" ? "♟️" : catKey === "music" ? "🎸" : "🏅";
    }

    function addSaleItemRow(prefill = null) {
      const container = document.getElementById("saleItemsContainer");
      const row = document.createElement("div");
      row.className = "pos-cart-item-card space-y-2.5";
      row.dataset.invId = prefill?.id || "";
      const key = "sale-item-" + ++saleItemRowNumber;
      const prefillLabel = prefill ? (prefill.id ? formatItemLabel(prefill) : String(prefill.name || "")) : "";
      const isPrefilled = Boolean(prefill && (prefill.id || prefill.name));
      const catIcon = prefill?.id ? posCategoryEmoji(prefill) : "📦";
      row.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="item-row-num hidden">1</span>
              <span class="item-cat-icon text-base leading-none shrink-0" aria-hidden="true">${catIcon}</span>
              <p class="item-summary-title font-bold text-sm text-slate-900 truncate">${esc(cleanDisplayItemName(prefillLabel || "Barang baru"))}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" class="btn-toggle-row-edit w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 inline-flex items-center justify-center transition" title="Ubah harga, satuan, atau catatan"><i class="fa-solid fa-pen text-[11px]" aria-hidden="true"></i></button>
              <button type="button" class="btn-remove-row w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 inline-flex items-center justify-center transition" title="Hapus barang"><i class="fa-regular fa-trash-can text-xs" aria-hidden="true"></i></button>
            </div>
          </div>
          <div class="flex items-center justify-between gap-2 pt-0.5">
            <div class="min-w-0 leading-snug">
              <p class="item-summary-sub text-xs font-medium text-slate-500 tabular-nums">1x @ ${rp(prefill?.price || 0)}</p>
              <span class="item-mode-badge block text-[11px] font-semibold mt-0.5 ${prefill?.id ? "text-emerald-700" : "text-amber-700"}">${prefill?.id ? `Stok ${Number(prefill.stock || 0)}` : "Di luar stok"}</span>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <div class="item-top-qty-wrap inline-flex items-center gap-2" ${isPrefilled ? "" : "hidden"}>
                <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:inline">Qty</span>
                <div class="inline-flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs">
                  <button type="button" class="btn-inline-minus w-9 h-9 bg-white hover:bg-slate-100 font-bold text-sm text-slate-800 transition" aria-label="Kurangi jumlah">−</button>
                  <span class="item-inline-qty px-2.5 text-xs font-bold text-slate-900 tabular-nums border-x border-slate-200 leading-9">1</span>
                  <button type="button" class="btn-inline-plus w-9 h-9 bg-white hover:bg-slate-100 font-bold text-sm text-slate-800 transition" aria-label="Tambah jumlah">+</button>
                </div>
              </div>
              <input type="hidden" value="1" class="item-qty">
              <span class="item-subtotal font-extrabold text-base text-slate-950 tabular-nums min-w-[86px] text-right">${rp(prefill?.price || 0)}</span>
            </div>
          </div>
        </div>
        <div class="item-edit-drawer rounded-xl bg-slate-50 border border-slate-200 p-2.5 space-y-2" ${isPrefilled ? "hidden" : ""}>
          <div class="flex items-center gap-2">
            <div class="sale-entry-thumbnail shrink-0 ${prefill?.id ? "w-8 h-8" : "hidden"}">${prefill?.id ? productImageMarkup(prefill, "h-8 w-8 rounded-lg border border-slate-200", 120, true) : ""}</div>
            <input type="text" id="${key}" list="inventoryDatalist" autocomplete="off" class="item-name-input min-w-0 flex-1 h-9 px-2.5 border border-slate-300 rounded-lg bg-white font-semibold !text-sm text-slate-900" placeholder="Pilih stok atau ketik nama barang..." value="${esc(prefillLabel)}">
          </div>
          <div class="grid grid-cols-2 gap-2 items-start">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-0.5">Harga Jual</label>
              <input type="text" inputmode="numeric" autocomplete="off" class="item-price-input w-full h-9 px-2.5 border border-slate-300 rounded-lg bg-white font-bold tabular-nums !text-sm text-slate-900" placeholder="0" value="${esc(fmtIdrInput(prefill?.price))}">
            </div>
            <div class="item-cost-wrap sjs-owner-only-stat" ${prefill?.id ? "hidden" : ""}>
              <label class="block text-[11px] font-medium text-slate-400 mb-0.5">Modal <span class="opt">(opsional)</span></label>
              <input type="text" inputmode="numeric" autocomplete="off" class="item-cost-input w-full h-9 px-2.5 border border-slate-200 rounded-lg bg-slate-100/70 focus:bg-white font-medium tabular-nums !text-sm text-slate-600 placeholder:text-slate-400" placeholder="Kosongkan jika tidak tahu" value="${esc(fmtIdrInput(prefill?.cost))}">
            </div>
          </div>
          <div class="flex flex-wrap sm:flex-nowrap items-end gap-2">
            <div class="shrink-0">
              <label class="block text-[11px] font-bold text-slate-600 mb-0.5">Jumlah</label>
              <div class="flex items-center gap-1.5">
                <div class="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                  <button type="button" class="btn-drawer-minus w-8 h-9 bg-white hover:bg-slate-100 font-bold text-sm text-slate-800 transition" aria-label="Kurangi jumlah">−</button>
                  <span class="item-drawer-qty px-3 text-xs font-bold text-slate-900 tabular-nums border-x border-slate-200 leading-9">1</span>
                  <button type="button" class="btn-drawer-plus w-8 h-9 bg-white hover:bg-slate-100 font-bold text-sm text-slate-800 transition" aria-label="Tambah jumlah">+</button>
                </div>
                <select class="item-unit-select h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800" aria-label="Satuan">
                  <option value="Pcs">Pcs</option>
                  <option value="Set">Set</option>
                  <option value="Pak">Pak</option>
                  <option value="Lusin">Lusin</option>
                </select>
              </div>
            </div>
            <div class="flex-1 min-w-[150px]">
              <label class="block text-[11px] font-bold text-slate-600 mb-0.5">Catatan <span class="opt">(opsional)</span></label>
              <input type="text" class="item-note-input w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800" placeholder="Layanan / varian..." maxlength="80">
            </div>
          </div>
          <div class="f-chips-wrap">
            <button type="button" class="pos-svc-chip" data-svc-note="Pasang 24 lbs">🏸 24 lbs</button>
            <button type="button" class="pos-svc-chip" data-svc-note="Pasang 27 lbs">🏸 27 lbs</button>
            <button type="button" class="pos-svc-chip" data-svc-note="Pasang 30 lbs">🏸 30 lbs</button>
            <button type="button" class="pos-svc-chip" data-svc-note="Kaliber 4.5mm">🎯 Kaliber</button>
            <button type="button" class="pos-svc-chip" data-svc-note="Ukuran Bola 5">⚽ Uk. Bola</button>
            <button type="button" class="pos-svc-chip" data-svc-note="Tulisan Piala">🏆 Tulisan Piala</button>
          </div>
          <div class="f-foot !mt-1 !pt-1.5">
            <div class="flex-1 space-y-1 min-w-0">
              <p class="item-inline-err f-warn hidden"></p>
              <p class="item-cost-warn f-warn hidden">⚠ Modal lebih besar dari harga jual. Cek lagi, mungkin salah ketik.</p>
              <p class="item-free-stock-note f-info" ${prefill?.id ? "hidden" : ""}>Barang manual tidak mengurangi stok gudang.</p>
            </div>
            <button type="button" class="btn-close-row-edit btn-done !min-h-[42px] !px-5 shrink-0">✓ Tambah ke Keranjang</button>
          </div>
        </div>`;
      container.appendChild(row);

      const nameInput = row.querySelector(".item-name-input");
      const costInput = row.querySelector(".item-cost-input");
      const priceInput = row.querySelector(".item-price-input");
      const qtyInput = row.querySelector(".item-qty");
      const preview = row.querySelector(".sale-entry-thumbnail");
      const drawer = row.querySelector(".item-edit-drawer");

      const handleSelect = () => {
        const val = nameInput.value.trim().toLowerCase();
        const match = activeInventory().find(inv => formatDropdownOption(inv).toLowerCase() === val
          || formatItemLabel(inv).toLowerCase() === val
          || (inv.code && inv.code.toLowerCase() === val));
        if (match) {
          if (row.dataset.invId !== match.id) {
            row.dataset.invId = match.id;
            nameInput.value = formatItemLabel(match);
            priceInput.value = fmtIdrInput(match.price);
            costInput.value = fmtIdrInput(match.cost || 0);
          const costWrap = row.querySelector(".item-cost-wrap");
          if (costWrap) costWrap.hidden = true;
          const freeNote = row.querySelector(".item-free-stock-note");
          if (freeNote) freeNote.hidden = true;
            preview.className = "sale-entry-thumbnail shrink-0 w-9 h-9";
            preview.innerHTML = productImageMarkup(match, "h-9 w-9 rounded-lg border border-slate-200", 120, true);
          }
        } else {
          if (row.dataset.invId) {
            row.dataset.invId = "";
            preview.innerHTML = "";
            preview.className = "sale-entry-thumbnail shrink-0 hidden";
          }
          costInput.value = costInput.value || "";
          const costWrap = row.querySelector(".item-cost-wrap");
          if (costWrap) costWrap.hidden = false;
          const freeNote = row.querySelector(".item-free-stock-note");
          if (freeNote) freeNote.hidden = false;
        }
        calculateSaleTotals();
      };
      const formatNumField = (inp) => {
        inp.value = fmtIdrInput(inp.value);
        calculateSaleTotals();
      };
      nameInput.addEventListener("input", handleSelect);
      nameInput.addEventListener("change", handleSelect);
      nameInput.addEventListener("blur", () => {
        if (!row.dataset.invId && nameInput.value.trim()) {
          nameInput.value = titleCase(nameInput.value);
          calculateSaleTotals();
        }
      });
      costInput.addEventListener("input", () => formatNumField(costInput));
      priceInput.addEventListener("input", () => formatNumField(priceInput));
      row.querySelector(".item-note-input")?.addEventListener("input", calculateSaleTotals);
      row.querySelector(".item-unit-select")?.addEventListener("change", calculateSaleTotals);
      const topQtyWrap = row.querySelector(".item-top-qty-wrap");
      const syncDrawerVis = (open) => {
        if (drawer) drawer.hidden = !open;
        if (topQtyWrap) topQtyWrap.hidden = open;
      };
      row.querySelector(".btn-toggle-row-edit")?.addEventListener("click", () => {
        syncDrawerVis(Boolean(drawer?.hidden));
      });
      row.querySelector(".btn-close-row-edit")?.addEventListener("click", () => {
        syncDrawerVis(false);
      });
      const stepQty = (delta) => {
        qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) + delta);
        calculateSaleTotals();
      };
      row.querySelector(".btn-inline-minus")?.addEventListener("click", () => stepQty(-1));
      row.querySelector(".btn-inline-plus")?.addEventListener("click", () => stepQty(1));
      row.querySelector(".btn-drawer-minus")?.addEventListener("click", () => stepQty(-1));
      row.querySelector(".btn-drawer-plus")?.addEventListener("click", () => stepQty(1));
      row.querySelectorAll("[data-svc-note]").forEach(btn => {
        btn.addEventListener("click", () => {
          const noteInp = row.querySelector(".item-note-input");
          if (!noteInp) return;
          const tag = btn.dataset.svcNote;
          const cur = noteInp.value.trim();
          noteInp.value = cur ? (cur.includes(tag) ? cur : `${cur} · ${tag}`) : tag;
          calculateSaleTotals();
        });
      });
      row.querySelector(".btn-remove-row").addEventListener("click", () => {
        row.remove();
        calculateSaleTotals();
      });
      calculateSaleTotals();
      return row;
    }

    function calculateSaleTotals() {
      let total = 0, profit = 0, itemLines = 0, totalQty = 0;
      for (const row of document.querySelectorAll("#saleItemsContainer > div")) {
        const nm = (row.querySelector(".item-name-input")?.value || "").trim();
        const price = parseIdrNum(row.querySelector(".item-price-input")?.value);
        const qtyInput = row.querySelector(".item-qty");
        const qty = Math.max(0, parseInt(qtyInput?.value, 10) || 0);
        const inv = activeInventory().find(i => i.id === row.dataset.invId);
        const freeCost = inv ? Number(inv.cost || 0) : parseNullableIdr(row.querySelector(".item-cost-input")?.value);
        const cost = freeCost ?? 0;
        const rowValid = inv ? (nm && qty > 0) : validateFreeItem({ name: nm, price, cost: freeCost, qty }).ok;
        if (rowValid) {
          itemLines++;
          totalQty += qty;
          total += price * qty;
          if (inv || freeCost != null) profit += (price - cost) * qty;
        }
        row.querySelector(".item-subtotal").textContent = rp(price * qty);
        const numBadge = row.querySelector(".item-row-num");
        if (numBadge) numBadge.textContent = String(itemLines || 1);
        const inlineQtyEl = row.querySelector(".item-inline-qty");
        if (inlineQtyEl) inlineQtyEl.textContent = String(qty);
        const drawerQtyEl = row.querySelector(".item-drawer-qty");
        if (drawerQtyEl) drawerQtyEl.textContent = String(qty);
        const titleEl = row.querySelector(".item-summary-title");
        const subEl = row.querySelector(".item-summary-sub");
        const unitStr = row.querySelector(".item-unit-select")?.value || "Pcs";
        const noteStr = (row.querySelector(".item-note-input")?.value || "").trim();
        const iconEl = row.querySelector(".item-cat-icon");
        if (iconEl) iconEl.textContent = inv ? posCategoryEmoji(inv) : "📦";
        if (titleEl) titleEl.textContent = cleanDisplayItemName(nm || "Barang baru") + (noteStr ? ` (${noteStr})` : "");
        if (subEl) {
          subEl.textContent = `${qty}${unitStr !== "Pcs" ? " " + unitStr : "x"} @ ${rp(price)}`;
        }
        const nInpLive = row.querySelector(".item-name-input");
        if (nInpLive && nm) nInpLive.classList.remove("invalid");
        const pInpLive = row.querySelector(".item-price-input");
        if (pInpLive) {
          const invalidPrice = Boolean(nm) && price <= 0;
          pInpLive.classList.toggle("invalid", invalidPrice);
          pInpLive.classList.toggle("border-rose-500", invalidPrice);
          pInpLive.classList.toggle("bg-rose-50", invalidPrice);
        }
        const cInpLive = row.querySelector(".item-cost-input");
        const cWarn = row.querySelector(".item-cost-warn");
        const lossCost = !inv && freeCost != null && price > 0 && freeCost > price;
        if (cInpLive) {
          cInpLive.classList.toggle("border-red-500", lossCost);
          cInpLive.classList.toggle("bg-red-50", lossCost);
        }
        if (cWarn) cWarn.classList.toggle("hidden", !lossCost);
        const inlineErrEl = row.querySelector(".item-inline-err");
        if (inlineErrEl) {
          if (!inv) {
            const vRes = validateFreeItem({ name: nm, price, cost: freeCost, qty });
            inlineErrEl.textContent = vRes.ok ? "" : ("⚠ " + vRes.errors[0]);
            inlineErrEl.classList.toggle("hidden", vRes.ok);
          } else {
            inlineErrEl.classList.add("hidden");
          }
        }
        const badge = row.querySelector(".item-mode-badge");
        if (badge) {
          if (inv) {
            const st = Number(inv.stock || 0);
            if (qty > st) {
              badge.textContent = `⚠ Melebihi stok (tersisa ${st})`;
              badge.className = "item-mode-badge font-extrabold text-rose-700";
            } else if (st < LOW_STOCK_LIMIT) {
              badge.textContent = `Stok ${st} ⚠`;
              badge.className = "item-mode-badge block text-[11px] font-bold mt-0.5 text-amber-700";
            } else {
              badge.textContent = `Stok ${st}`;
              badge.className = "item-mode-badge block text-[11px] font-semibold mt-0.5 text-emerald-700";
            }
          } else {
            badge.textContent = "Di luar stok";
            badge.className = "item-mode-badge font-bold text-amber-700";
          }
        }
      }
      const discType = document.getElementById("inputSaleDiscountType")?.value || "rp";
      const rawDisc = Math.max(0, Number(document.getElementById("inputSaleDiscount")?.value) || 0);
      const calcDisc = discType === "pct" ? Math.round(total * Math.min(100, rawDisc) / 100) : Math.round(rawDisc);
      const discount = Math.min(total, calcDisc);
      const netTotal = Math.max(0, total - discount);
      const netProfit = profit - discount;
      currentSaleTotalAmount = netTotal;
      document.getElementById("previewTotalOmset").textContent = rp(netTotal);
      const rightTotEl = document.getElementById("previewTotalOmsetRight");
      if (rightTotEl) rightTotEl.textContent = rp(netTotal);
      const rightSubEl = document.getElementById("posTotalSubtotalHint");
      if (rightSubEl) rightSubEl.textContent = discount > 0 ? `Subtotal ${rp(total)} − Diskon ${rp(discount)}` : "";
      document.getElementById("previewTotalProfit").textContent = rp(netProfit);
      const subLine = document.getElementById("previewSubtotalLine");
      if (subLine) subLine.textContent = discount > 0 ? `Subtotal ${rp(total)} − Diskon ${rp(discount)}` : `Subtotal ${rp(total)}`;
      const metaEl = document.getElementById("posCartCountMeta");
      if (metaEl) metaEl.textContent = `${itemLines} Item · ${totalQty} Pcs`;
      const splitCash = Math.max(0, Math.round(Number(document.getElementById("inputSplitCash")?.value) || 0));
      const splitRemEl = document.getElementById("posSplitRemainVal");
      if (splitRemEl) splitRemEl.textContent = rp(Math.max(0, netTotal - splitCash));
      const emptyHint = document.getElementById("posCartEmptyHint");
      const itemsCont = document.getElementById("saleItemsContainer");
      if (emptyHint) emptyHint.hidden = itemLines > 0 || Boolean(itemsCont && itemsCont.children.length > 0);
      renderSalePayment();
    }

    let currentSaleTotalAmount = 0;
    let cashReceivedAmount = 0;
    let cashFeedbackTimer = null;
    function flashCashFeedback(label) {
      const recEl = document.getElementById("posCashReceivedText");
      const pill = document.getElementById("posCashFeedbackPill");
      if (recEl) {
        recEl.classList.remove("sjs-cash-pop");
        void recEl.offsetWidth;
        recEl.classList.add("sjs-cash-pop");
      }
      if (pill && label) {
        pill.textContent = label;
        pill.classList.remove("hidden");
        clearTimeout(cashFeedbackTimer);
        cashFeedbackTimer = setTimeout(() => pill.classList.add("hidden"), 1100);
      }
    }
    function updateCashCalcUI() {
      const panel = document.getElementById("posCashCalcPanel");
      if (!panel) return;
      panel.hidden = false;
      const recEl = document.getElementById("posCashReceivedText");
      const chgEl = document.getElementById("posCashChangeText");
      const lblEl = document.getElementById("posCashChangeLabel");
      const boxEl = document.getElementById("posCashChangeBox");
      if (recEl) recEl.textContent = rp(cashReceivedAmount);
      const recInp = document.getElementById("posCashReceivedInput");
      if (recInp && document.activeElement !== recInp) recInp.value = cashReceivedAmount > 0 ? ("Rp " + Number(cashReceivedAmount).toLocaleString("id-ID")) : "";
      const diff = cashReceivedAmount - currentSaleTotalAmount;
      if (selectedPaymentMethod !== "Cash" || currentSaleTotalAmount <= 0 || cashReceivedAmount <= 0) {
        if (lblEl) lblEl.textContent = "KEMBALIAN";
        if (chgEl) chgEl.textContent = rp(0);
        if (boxEl) { boxEl.classList.add("is-idle"); boxEl.classList.remove("is-change", "is-short"); }
      } else if (diff < 0) {
        if (lblEl) lblEl.textContent = "⚠ KURANG";
        if (chgEl) chgEl.textContent = rp(Math.abs(diff));
        if (boxEl) { boxEl.classList.add("is-short"); boxEl.classList.remove("is-change", "is-idle"); }
      } else {
        if (lblEl) lblEl.textContent = "✓ KEMBALIAN";
        if (chgEl) chgEl.textContent = rp(diff);
        if (boxEl) { boxEl.classList.add("is-change"); boxEl.classList.remove("is-short", "is-idle"); }
      }
    }

    function renderPosQuickFavorites() {
      const bar = document.getElementById("posQuickFavBar");
      const wrap = document.getElementById("posQuickFavWrap");
      if (!bar || !wrap) return;
      const active = activeInventory().filter(i => Number(i.stock || 0) > 0);
      if (!active.length) { wrap.hidden = true; return; }
      wrap.hidden = false;
      const freq = new Map();
      for (const tx of transactions) {
        for (const it of (tx.items || [])) {
          if (it.inventoryId) freq.set(it.inventoryId, (freq.get(it.inventoryId) || 0) + Number(it.qty || 1));
        }
      }
      const ranked = active.slice().sort((a, b) => (freq.get(b.id) || 0) - (freq.get(a.id) || 0) || Number(b.stock || 0) - Number(a.stock || 0)).slice(0, 7);
      bar.innerHTML = ranked.slice(0, 6).map(it => {
        const shortName = cleanDisplayItemName(it.name || "");
        const catKey = detectProductCategoryLabel(it).key;
        const icon = catKey === "badminton" ? "🏸" : catKey === "ball" ? "⚽" : catKey === "chess" ? "♟️" : catKey === "music" ? "🎸" : "🏅";
        const priceStr = "Rp" + Number(it.price || 0).toLocaleString("id-ID");
        return `<button type="button" data-quick-fav-id="${esc(it.id)}" title="${esc(it.name)} · ${rp(it.price)} (stok ${Number(it.stock || 0)})" class="pos-fav-pro-card">
          <span class="pos-fav-pro-name">${icon} ${esc(shortName)}</span>
          <span class="pos-fav-pro-price">${esc(priceStr)}</span>
        </button>`;
      }).join("");
      renderPosQuickAccess();
    }

    let activeQuickAccessCat = "all";
    function renderPosQuickAccess() {
      const listEl = document.getElementById("posQuickAccessList");
      const cntEl = document.getElementById("posQuickAccessCount");
      if (!listEl) return;
      const freq = new Map();
      for (const tx of transactions) {
        for (const it of (tx.items || [])) {
          if (it.inventoryId) freq.set(it.inventoryId, (freq.get(it.inventoryId) || 0) + Number(it.qty || 1));
        }
      }
      const items = activeInventory()
        .filter(it => activeQuickAccessCat === "all" || matchesCatalogCategory(it, activeQuickAccessCat))
        .sort((a, b) => (Number(b.stock || 0) > 0) - (Number(a.stock || 0) > 0) || (freq.get(b.id) || 0) - (freq.get(a.id) || 0) || String(a.name || "").localeCompare(String(b.name || ""), "id"));
      if (cntEl) cntEl.textContent = `${items.length} item`;
      if (!items.length) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 py-6 text-center">Belum ada barang di kategori ini.</p>`;
        return;
      }
      listEl.innerHTML = items.map(it => {
        const st = Number(it.stock || 0);
        const catKey = detectProductCategoryLabel(it).key;
        const icon = catKey === "badminton" ? "🏸" : catKey === "ball" ? "⚽" : catKey === "chess" ? "♟️" : catKey === "music" ? "🎸" : "🏅";
        const stDot = st <= 0 ? "🔴 Habis" : st < 5 ? `🔴 Stok ${st}` : st <= 10 ? `🟡 Stok ${st}` : `🟢 Stok ${st}`;
        const stCls = st <= 0 ? "text-rose-700" : st < 5 ? "text-rose-700" : st <= 10 ? "text-amber-700" : "text-emerald-700";
        return `<button type="button" data-qa-pick="${esc(it.id)}" class="pos-qa-tile ${st <= 0 ? "opacity-55" : ""}" title="${esc(it.name)} · ${rp(it.price)}">
          <div class="flex items-start justify-between gap-1.5 w-full">
            <span class="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">${icon} ${esc(it.name)}</span>
            <span class="text-xs font-extrabold text-blue-900 tabular-nums shrink-0">${esc(shortRpTick(it.price).replace("Rp ", ""))}</span>
          </div>
          <div class="flex items-center justify-between gap-1.5 w-full text-[10px] font-bold">
            <span class="${stCls}">${stDot}</span>
            <span class="font-mono text-slate-400">${esc(it.code || "")}</span>
          </div>
        </button>`;
      }).join("");
    }

    function updatePosLiveStats() {
      const omEl = document.getElementById("posStatOmsetToday");
      if (!omEl) return;
      const today = todayStr();
      const todaySales = transactions.filter(t => t.date === today);
      const omset = todaySales.reduce((s, t) => s + Number(t.totalOmset || 0), 0);
      const pcs = todaySales.reduce((s, t) => s + (Array.isArray(t.items) ? t.items.reduce((a, it) => a + Number(it.qty || 0), 0) : 0), 0);
      const avgNota = todaySales.length > 0 ? Math.round(omset / todaySales.length) : 0;
      const lowItems = activeInventory().filter(i => Number(i.stock || 0) < LOW_STOCK_LIMIT)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
      const omShort = omset >= 1000 ? shortRpTick(omset).replace("Rp ", "Rp").replace(" rb", "rb").replace(" jt", "jt") : rp(omset).replace("Rp ", "Rp");
      omEl.textContent = omShort;
      omEl.title = "Omzet hari ini: " + rp(omset);
      const txEl = document.getElementById("posStatTxToday");
      const pcsEl = document.getElementById("posStatPcsToday");
      const avgEl = document.getElementById("posStatAvgToday");
      const avgSub = document.getElementById("posStatAvgSub");
      const lwEl = document.getElementById("posStatLowStock");
      const lwNames = document.getElementById("posStatLowStockNames");
      if (txEl) txEl.textContent = todaySales.length + " Nota";
      if (pcsEl) pcsEl.textContent = pcs + " pcs terjual";
      if (avgEl) avgEl.textContent = rp(avgNota);
      if (avgSub) avgSub.textContent = `${todaySales.length} transaksi · ${pcs} barang`;
      if (lwEl) lwEl.textContent = String(lowItems.length);
      if (lwNames) {
        const preview = lowItems.slice(0, 3).map(i => String(i.name || "").split(" ").slice(0, 2).join(" ")).join(", ");
        lwNames.textContent = lowItems.length ? `${preview}${lowItems.length > 3 ? "…" : ""}` : "Semua stok aman";
        lwNames.title = lowItems.map(i => `${i.name} (${Number(i.stock || 0)} pcs)`).join(" · ");
      }
      renderPosQuickFavorites();
      renderPosRecentCustomers();
      renderPosRecentTransactions();
    }

    function renderPosRecentCustomers() {
      const bar = document.getElementById("posRecentCustomersBar");
      if (!bar) return;
      const seen = new Set();
      const recent = [];
      for (const tx of transactions.slice().sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))) {
        const c = String(tx.customer || "").trim();
        if (c && !/^(pelanggan\s+umum|umum)$/i.test(c) && !seen.has(c.toLowerCase())) {
          seen.add(c.toLowerCase());
          recent.push(c);
          if (recent.length >= 6) break;
        }
      }
      if (!recent.length) { bar.hidden = true; bar.innerHTML = ""; return; }
      bar.hidden = false;
      bar.innerHTML = `<span class="font-extrabold text-slate-500">Pelanggan terakhir:</span>` + recent.map(c =>
        `<button type="button" data-pick-customer="${esc(c)}" class="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-100 border border-slate-200 text-slate-700 hover:text-blue-900 font-bold">${esc(c)}</button>`
      ).join("");
    }

    function renderPosRecentTransactions() {
      const wrap = document.getElementById("posRecentTxList");
      if (!wrap) return;
      const today = todayStr();
      const recent = transactions
        .filter(t => t.date === today)
        .slice()
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 5);
      if (!recent.length) {
        wrap.innerHTML = `<p class="py-2 text-slate-400 font-semibold">Belum ada transaksi hari ini.</p>`;
        return;
      }
      wrap.innerHTML = recent.map(tx => {
        const items = tx.items || [];
        const firstName = items.length ? cleanDisplayItemName(items[0].name) + (items.length > 1 ? ` +${items.length - 1} lainnya` : "") : "Transaksi";
        const tm = formatWitaTime(tx.createdAt);
        const id = esc(tx.id);
        return `<div class="py-2 flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <span class="font-extrabold text-slate-800">✅ ${esc(firstName)}</span>
            <span class="ml-1.5 font-extrabold text-blue-900 tabular-nums">${esc(shortRpTick(tx.totalOmset))}</span>
            <span class="ml-1 text-[10px] font-semibold text-slate-400">${esc(receiptNumber(tx))}${tm ? " · " + esc(tm) : ""} · ${esc(paymentMethodLabel(tx.paymentMethod || "Cash"))}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" data-pos-reprint="${id}" class="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-extrabold text-[11px]"><i class="fa-solid fa-print mr-1" aria-hidden="true"></i>Nota</button>
            <button type="button" data-pos-wa-rcpt="${id}" class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px]"><i class="fa-brands fa-whatsapp mr-1" aria-hidden="true"></i>WA</button>
            <button type="button" data-pos-void="${id}" title="Hapus / Batalkan transaksi ini (stok otomatis kembali)" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[11px] inline-flex items-center gap-1"><i class="fa-regular fa-trash-can" aria-hidden="true"></i>Hapus</button>
          </div>
        </div>`;
      }).join("");
    }

    function selectSalePayment(method) {
      selectedPaymentMethod = salePaymentMethods.has(method) ? method : "";
      renderSalePayment();
    }
    function hasSaleItems() {
      for (const row of document.querySelectorAll("#saleItemsContainer > div")) {
        const nm = (row.querySelector(".item-name-input")?.value || "").trim();
        const qt = Number(row.querySelector(".item-qty")?.value || 0);
        if (nm && qt > 0) return true;
      }
      return false;
    }
    function getPosSaveState() {
      const rows = [...document.querySelectorAll("#saleItemsContainer > div")];
      if (!rows.length) {
        return { enabled: false, message: "Tambahkan minimal 1 barang untuk menyimpan penjualan." };
      }
      for (const row of rows) {
        const inv = activeInventory().find(i => i.id === row.dataset.invId);
        const nm = (row.querySelector(".item-name-input")?.value || "").trim();
        const price = parseIdrNum(row.querySelector(".item-price-input")?.value);
        const qty = parseInt(row.querySelector(".item-qty")?.value, 10) || 0;
        if (!inv) {
          const v = validateFreeItem({ name: nm, price, cost: parseNullableIdr(row.querySelector(".item-cost-input")?.value), qty });
          if (!v.ok) return { enabled: false, message: `${nm || "Barang baru"}: ${v.errors[0]}` };
        } else if (qty < 1 || price <= 0) {
          return { enabled: false, message: `${nm || "Barang"}: Isi harga jual & jumlah dulu.` };
        }
      }
      if (!salePaymentMethods.has(selectedPaymentMethod)) {
        return { enabled: false, message: "Pilih cara bayar untuk menyimpan penjualan." };
      }
      if (selectedPaymentMethod === "Cash" && cashReceivedAmount > 0 && cashReceivedAmount < currentSaleTotalAmount) {
        return { enabled: false, message: `Uang kurang ${rp(currentSaleTotalAmount - cashReceivedAmount)}.` };
      }
      return { enabled: true, message: "" };
    }
    function renderSalePayment() {
      const okPay = salePaymentMethods.has(selectedPaymentMethod);
      for (const b of document.querySelectorAll(".pay-option-btn")) {
        b.setAttribute("aria-pressed", String(b.dataset.pay === selectedPaymentMethod));
      }
      const saveState = getPosSaveState();
      const hintEl = document.getElementById("salePaymentHint");
      if (hintEl) {
        hintEl.textContent = saveState.message;
        hintEl.hidden = saveState.enabled;
      }
      const topBadge = document.getElementById("salePaymentTopBadge");
      if (topBadge) topBadge.hidden = okPay;
      const payBox = document.getElementById("posPaySectionBox");
      if (payBox) payBox.classList.toggle("border-amber-300", !okPay);
      const hasAnyRow = document.querySelectorAll("#saleItemsContainer > div").length > 0;
      const canSave = saveState.enabled && !saleFormSaving;
      const hardDisabled = saleFormSaving || !hasAnyRow;
      const btnSave = document.getElementById("btnSaveTx");
      const btnSavePrint = document.getElementById("btnSaveAndPrintTx");
      if (btnSave) {
        btnSave.disabled = hardDisabled;
        btnSave.setAttribute("aria-disabled", String(!canSave));
        btnSave.classList.toggle("is-disabled", !canSave);
      }
      if (btnSavePrint) {
        btnSavePrint.disabled = hardDisabled;
        btnSavePrint.setAttribute("aria-disabled", String(!canSave));
        btnSavePrint.classList.toggle("is-disabled", !canSave);
      }
      const splitPanel = document.getElementById("posSplitBonPanel");
      if (splitPanel) {
        const isSplitOrBon = selectedPaymentMethod === "Split" || selectedPaymentMethod === "Bon";
        splitPanel.classList.toggle("hidden", !isSplitOrBon);
        const pLbl = document.getElementById("posSplitPrimaryLbl");
        const rLbl = document.getElementById("posSplitRemainLbl");
        if (selectedPaymentMethod === "Bon") {
          if (pLbl) pLbl.textContent = "DP / Dibayar (Rp)";
          if (rLbl) rLbl.textContent = "Sisa Tagihan (Bon)";
        } else {
          if (pLbl) pLbl.textContent = "Bayar Tunai (Rp)";
          if (rLbl) rLbl.textContent = "Sisa QRIS / Transfer";
        }
      }
      const cashWrap = document.getElementById("posCashOnlyWrap");
      if (cashWrap) cashWrap.hidden = (selectedPaymentMethod !== "Cash");
      updateCashCalcUI();
    }

    const POS_HELD_KEY = "sjs-pos-held-carts-v1";
    let heldSales = [];
    try { heldSales = JSON.parse(localStorage.getItem(POS_HELD_KEY) || "[]"); if (!Array.isArray(heldSales)) heldSales = []; } catch { heldSales = []; }
    function saveHeldSalesStorage() {
      try { localStorage.setItem(POS_HELD_KEY, JSON.stringify(heldSales)); } catch {}
    }
    function renderHeldSalesBar() {
      const lbl = document.getElementById("btnHoldSaleLabel");
      if (lbl) lbl.textContent = heldSales.length ? `Tangguhkan (${heldSales.length})` : "Tangguhkan (F3)";
      const bar = document.getElementById("posHeldTabsBar");
      if (!bar) return;
      if (!heldSales.length) { bar.hidden = true; bar.innerHTML = ""; return; }
      bar.hidden = false;
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      bar.innerHTML = `<span class="text-[11px] font-extrabold text-amber-900 mr-1"><i class="fa-solid fa-pause mr-1" aria-hidden="true"></i>Tertunda (${heldSales.length}):</span>` + heldSales.map((h, idx) => {
        const draftLbl = `Draft ${letters[idx] || (idx + 1)}`;
        const custTag = h.customer ? ` (${esc(h.customer)})` : "";
        return `<span class="inline-flex items-center rounded-full bg-white border border-amber-300 overflow-hidden shadow-xs">
          <button type="button" data-resume-hold="${idx}" class="px-2.5 py-1 text-[11px] font-extrabold text-amber-950 hover:bg-amber-100">${draftLbl}${custTag} · ${h.items.length} item (${esc(shortRpTick(h.total))})</button>
          <button type="button" data-drop-hold="${idx}" title="Hapus ${draftLbl}" class="px-1.5 py-1 text-[11px] font-extrabold text-rose-600 hover:bg-rose-50 border-l border-amber-200">&times;</button>
        </span>`;
      }).join("");
    }
    function holdCurrentSale() {
      const rows = [...document.querySelectorAll("#saleItemsContainer > div")];
      const items = rows.map(r => ({
        invId: r.dataset.invId || "",
        name: (r.querySelector(".item-name-input")?.value || "").trim(),
        price: parseIdrNum(r.querySelector(".item-price-input")?.value),
        cost: parseIdrNum(r.querySelector(".item-cost-input")?.value),
        qty: Math.max(1, Number(r.querySelector(".item-qty")?.value || 1))
      })).filter(it => it.name);
      if (!items.length) return showToast("Keranjang masih kosong, tidak ada yang bisa di-Hold.");
      heldSales.push({
        heldAt: new Date().toISOString(),
        customer: document.getElementById("inputCustomer")?.value || "",
        note: document.getElementById("inputSaleNote")?.value || "",
        discount: document.getElementById("inputSaleDiscount")?.value || "0",
        discountType: document.getElementById("inputSaleDiscountType")?.value || "rp",
        paymentMethod: selectedPaymentMethod || "",
        total: currentSaleTotalAmount,
        items
      });
      saveHeldSalesStorage();
      resetSaleDraft();
      renderHeldSalesBar();
      showToast(`Transaksi disimpan ke Hold #${heldSales.length}.`);
    }
    function resumeHeldSale(idx) {
      const h = heldSales[idx];
      if (!h) return;
      heldSales.splice(idx, 1);
      saveHeldSalesStorage();
      document.getElementById("saleItemsContainer").replaceChildren();
      for (const it of h.items) {
        const inv = it.invId ? activeInventory().find(i => i.id === it.invId) : null;
        const row = addSaleItemRow(inv || { name: it.name, price: it.price, cost: it.cost });
        row.querySelector(".item-price-input").value = fmtIdrInput(it.price);
        if (!inv) row.querySelector(".item-cost-input").value = fmtIdrInput(it.cost);
        row.querySelector(".item-qty").value = it.qty;
      }
      if (document.getElementById("inputCustomer")) document.getElementById("inputCustomer").value = h.customer || "";
      if (document.getElementById("inputSaleNote")) document.getElementById("inputSaleNote").value = h.note || "";
      if (document.getElementById("inputSaleDiscountType")) document.getElementById("inputSaleDiscountType").value = h.discountType || "rp";
      if (document.getElementById("inputSaleDiscount")) document.getElementById("inputSaleDiscount").value = h.discount || "0";
      selectSalePayment(h.paymentMethod || "Cash");
      calculateSaleTotals();
      renderHeldSalesBar();
      showToast("Transaksi Hold dilanjutkan.");
    }

    function resetSaleDraft() {
      document.getElementById("replacementSaleNotice").hidden = true;
      document.getElementById("inputCustomer").value = "";
      if (document.getElementById("inputSaleNote")) document.getElementById("inputSaleNote").value = "";
      if (document.getElementById("inputSaleDiscount")) document.getElementById("inputSaleDiscount").value = "0";
      if (document.getElementById("inputSaleDiscountType")) document.getElementById("inputSaleDiscountType").value = "rp";
      document.getElementById("inputDate").value = todayStr();
      document.getElementById("saleItemsContainer").replaceChildren();
      cashReceivedAmount = 0;
      const pad = document.getElementById("posCashNumpad");
      if (pad) pad.hidden = true;
      const padBtn = document.getElementById("btnToggleCashNumpad");
      if (padBtn) padBtn.setAttribute("aria-expanded", "false");
      selectSalePayment("Cash");
      updateSaleDateSummary();
      calculateSaleTotals();
    }
    function updateSaleDateSummary() {
      const date = document.getElementById("inputDate").value || todayStr();
      document.getElementById("saleDateSummary").textContent = "· " + (date === todayStr() ? "Hari ini" : date);
    }

    async function saveSale(printAfterSave) {
      if (!isAdmin) return showToast("Masuk ke akun pemilik terlebih dahulu.");
      if (!salePaymentMethods.has(selectedPaymentMethod)) return showToast("Pilih cara bayar sebelum menyimpan.");
      if (selectedPaymentMethod === "Cash" && cashReceivedAmount > 0 && cashReceivedAmount < currentSaleTotalAmount) {
        return showToast(`⚠ Uang diterima kurang ${rp(currentSaleTotalAmount - cashReceivedAmount)} dari total bayar.`);
      }
      const itemsToSave = [];
      for (const row of document.querySelectorAll("#saleItemsContainer > div")) {
        const invId = row.dataset.invId;
        const inv = activeInventory().find(i => i.id === invId);
        const typedName = row.querySelector(".item-name-input").value.trim();
        const qty = Number(row.querySelector(".item-qty").value);
        const price = parseIdrNum(row.querySelector(".item-price-input")?.value);
        const rawManualCost = parseNullableIdr(row.querySelector(".item-cost-input")?.value);
        const manualCost = rawManualCost == null ? null : Math.max(0, Math.round(rawManualCost));
        const nameInp = row.querySelector(".item-name-input");
        const priceInp = row.querySelector(".item-price-input");
        const drawerEl = row.querySelector(".item-edit-drawer");
        if (!inv && !typedName) {
          if (drawerEl) drawerEl.hidden = false;
          if (nameInp) { nameInp.classList.add("invalid"); nameInp.scrollIntoView({ behavior: "smooth", block: "center" }); nameInp.focus(); }
          showToast("Isi nama barang terlebih dahulu.");
          return;
        }
        if (nameInp) nameInp.classList.remove("invalid");
        if (!Number.isSafeInteger(qty) || qty < 1) return showToast("Jumlah minimal 1 pcs.");
        if (!Number.isSafeInteger(price) || price <= 0) {
          if (drawerEl) drawerEl.hidden = false;
          if (priceInp) { priceInp.classList.add("invalid", "border-rose-500", "bg-rose-50"); priceInp.scrollIntoView({ behavior: "smooth", block: "center" }); priceInp.focus(); }
          return showToast(`Harga jual "${typedName || "barang"}" harus lebih dari Rp 0.`);
        }
        if (priceInp) priceInp.classList.remove("invalid", "border-rose-500", "bg-rose-50");
        const itemUnit = String(row.querySelector(".item-unit-select")?.value || "Pcs");
        const itemNote = String(row.querySelector(".item-note-input")?.value || "").trim().slice(0, 80);
        const displayItemName = inv ? formatItemLabel(inv) : typedName.slice(0, 160);
        const metaTags = [];
        if (itemUnit && itemUnit !== "Pcs") metaTags.push(itemUnit);
        if (itemNote) metaTags.push(itemNote);
        const finalItemName = metaTags.length ? `${displayItemName} (${metaTags.join(" · ")})` : displayItemName;
        if (inv) {
          itemsToSave.push({ inventoryId: invId, name: finalItemName, qty, price, cost: Number(inv.cost || 0), imageUrl: inv.imageUrl || "" });
        } else {
          itemsToSave.push({ inventoryId: "", isCustom: true, name: finalItemName, qty, price, cost: manualCost == null ? price : manualCost, costUnknown: manualCost == null, imageUrl: "" });
        }
      }
      if (!itemsToSave.length) return showToast("Tambahkan minimal 1 barang.");

      const txDate = document.getElementById("inputDate").value || todayStr();
      const grossTotal = itemsToSave.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
      const saleDiscType = document.getElementById("inputSaleDiscountType")?.value || "rp";
      const rawSaleDisc = Math.max(0, Number(document.getElementById("inputSaleDiscount")?.value) || 0);
      const saleDiscount = Math.min(grossTotal, saleDiscType === "pct" ? Math.round(grossTotal * Math.min(100, rawSaleDisc) / 100) : Math.round(rawSaleDisc));
      const rawSaleNote = String(document.getElementById("inputSaleNote")?.value || "").trim();
      const cashierName = String(document.getElementById("inputCashierName")?.value || "").trim();
      const splitPaid = Math.max(0, Math.round(Number(document.getElementById("inputSplitCash")?.value) || 0));
      const netEst = Math.max(0, grossTotal - saleDiscount);
      const noteParts = [];
      if (rawSaleNote) noteParts.push(rawSaleNote);
      if (selectedPaymentMethod === "Split") noteParts.push(`Split: Tunai ${rp(splitPaid)} + Non-tunai ${rp(Math.max(0, netEst - splitPaid))}`);
      if (selectedPaymentMethod === "Bon") noteParts.push(`BON: DP ${rp(splitPaid)} · Sisa ${rp(Math.max(0, netEst - splitPaid))}`);
      if (cashierName) noteParts.push(`Kasir: ${cashierName}`);
      const saleNote = noteParts.join(" | ").slice(0, 200);
      const cashRecVal = selectedPaymentMethod === "Cash" && cashReceivedAmount > 0 ? cashReceivedAmount : 0;
      const cashChgVal = cashRecVal > 0 ? Math.max(0, cashRecVal - netEst) : 0;
      const txData = {
        date: txDate,
        customer: document.getElementById("inputCustomer").value.trim() || "Pelanggan Umum",
        ...(cashierName ? { cashier: cashierName } : {}),
        ...(saleNote ? { note: saleNote } : {}),
        ...(saleDiscount > 0 ? { discount: saleDiscount } : {}),
        ...(cashRecVal > 0 ? { cashReceived: cashRecVal, cashChange: cashChgVal } : {}),
        paymentMethod: selectedPaymentMethod,
        items: itemsToSave,
        createdAt: new Date().toISOString()
      };
      saleFormSaving = true;
      renderSalePayment();
      try {
        const saved = await saveSaleAndUpdateStock(txData, "");
        selectedDateStr = txDate;
        document.getElementById("bookDatePicker").value = txDate;
        resetSaleDraft();
        showToast("Penjualan tersimpan. No. nota " + receiptNumber(saved));
        if (printAfterSave) showReceiptPreview(saved);
      } catch (err) {
        showToast(err.message || "Gagal menyimpan transaksi.");
      } finally {
        saleFormSaving = false;
        renderSalePayment();
      }
    }

    // ==================== NOTA & LAPORAN ====================
    function receiptNumber(tx) { return "TRX-" + String(tx.id).slice(-6).toUpperCase(); }
    function cleanDisplayItemName(name) { return String(name || "Barang").replace(/^\s*\[?[A-Z]{2,5}-\d+\]?\s*[-·:]?\s*/i, "").trim() || String(name || "Barang").trim(); }
    let topProductsSortMode = localStorage.getItem("sjs-top-prod-sort") || "qty";
    let hourlyChartMetric = localStorage.getItem("sjs-hourly-metric") || "omset";
    function formatWitaTime(iso) {
      if (!iso) return "";
      const dt = new Date(iso);
      if (isNaN(dt)) return "";
      return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hour12: false }).format(dt) + " WITA";
    }
    function fmtReceiptDate(dateStr, isoStr) {
      const baseDate = String(dateStr || "").trim();
      const tm = formatWitaTime(isoStr);
      if (!baseDate) return tm || "";
      return tm ? `${baseDate} ${tm}` : baseDate;
    }
    function buildReceiptHtml(tx) {
      const txItems = tx.items || [];
      const totalPcs = txItems.reduce((sum, it) => sum + Number(it.qty || 0), 0);
      const dtStr = fmtReceiptDate(tx.date, tx.createdAt);
      const cashierStr = tx.cashier || "Admin";
      const payLabel = paymentMethodLabel(tx.paymentMethod || "Cash");
      const totalOmset = Number(tx.totalOmset || 0);
      const cashRec = Number(tx.cashReceived || 0);
      const cashChg = Number(tx.cashChange ?? Math.max(0, cashRec - totalOmset));
      const items = txItems.map(it => {
        const qty = Number(it.qty || 0), price = Number(it.price || 0);
        return `<div class="rc-item"><div class="rc-name">${esc(it.name)}</div><div class="rc-line"><span>${qty} x ${Number(price).toLocaleString("id-ID")}</span><span>${Number(it.subtotal ?? price * qty).toLocaleString("id-ID")}</span></div></div>`;
      }).join("");
      let qrSvg = "";
      try { qrSvg = SjsQR.toSvg("https://suryajaya-sport.github.io/", 132, 2); } catch {}
      const paySummaryHtml = cashRec > 0
        ? `<div class="rc-line"><span>TUNAI</span><span>Rp${cashRec.toLocaleString("id-ID")}</span></div><div class="rc-line"><span>KEMBALIAN</span><span>Rp${cashChg.toLocaleString("id-ID")}</span></div>`
        : `<div class="rc-line"><span>${esc(payLabel.toUpperCase())}</span><span>Rp${totalOmset.toLocaleString("id-ID")}</span></div>`;
      return `<div class="rcpt">
        <div class="rc-center">
          <div class="rc-shop">${esc(shopName)}</div>
          <div class="rc-sub">Toko Olahraga &amp; Alat Musik</div>
          <div class="rc-sub">Jl. Ahmad Yani 37, Berau</div>
          <div class="rc-sub">WA 0823-200-33333</div>
        </div>
        <hr class="rc-hr">
        <div class="rc-meta">
          <div class="rc-line"><span>No Nota    : ${esc(receiptNumber(tx))}</span><span></span></div>
          <div class="rc-line"><span>Tanggal    : ${esc(dtStr)}</span><span></span></div>
          <div class="rc-line"><span>Kasir      : ${esc(cashierStr)}</span><span></span></div>
          <div class="rc-line"><span>Pembeli    : ${esc(tx.customer || "Pelanggan Umum")}</span><span></span></div>
          <div class="rc-line"><span>Pembayaran : ${esc(payLabel)}</span><span></span></div>
          ${tx.note ? `<div class="rc-line"><span>Catatan    : ${esc(tx.note)}</span><span></span></div>` : ""}
        </div>
        ${tx.cancelledAt ? '<div class="rc-center rc-void">*** NOTA DIBATALKAN ***</div>' : ""}
        <hr class="rc-hr">
        ${items}
        <hr class="rc-hr">
        <div class="rc-meta">
          <div class="rc-line"><span>Item</span><span>${totalPcs} pcs</span></div>
          ${Number(tx.discount || 0) > 0 ? `<div class="rc-line"><span>Diskon</span><span>-Rp${Number(tx.discount).toLocaleString("id-ID")}</span></div>` : ""}
          <div class="rc-line rc-total" style="margin-top:4px"><span>TOTAL BAYAR</span><span>Rp${totalOmset.toLocaleString("id-ID")}</span></div>
          ${paySummaryHtml}
        </div>
        <hr class="rc-hr">
        <div class="rc-sub" style="text-align:left;max-width:210px;margin:6px auto 0;line-height:1.45">
          <div style="font-weight:700;color:#000">Scan QR:</div>
          <div>- Cek keaslian nota</div>
          <div>- Hubungi WA toko</div>
          <div>- Lihat katalog terbaru</div>
        </div>
        ${qrSvg ? `<div class="rc-center" style="margin:8px auto 4px;display:flex;justify-content:center">${qrSvg}</div>` : ""}
        <hr class="rc-hr">
        <div class="rc-footnote">
          <div class="rc-footnote-title">CATATAN &amp; KETENTUAN</div>
          <ul>
            <li>Periksa kembali barang dan jumlah pembelian sebelum meninggalkan toko.</li>
            <li>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan, kecuali terdapat kesalahan toko atau cacat produksi.</li>
            <li>Simpan nota ini sebagai bukti pembelian dan klaim garansi (jika berlaku).</li>
          </ul>
        </div>
        <hr class="rc-hr">
        <div class="rc-center rc-thanks" style="margin-top:6px">Terima kasih telah berbelanja</div>
        <div class="rc-center rc-sub" style="margin-top:4px">WA: 0823-200-33333</div>
        <div class="rc-center rc-sub">suryajaya-sport.github.io</div>
      </div>`;
    }
    let lastPreviewedReceiptTx = null;
    function formatWhatsAppReceiptText(tx) {
      const lines = (tx.items || []).map(it => `• ${cleanDisplayItemName(it.name)} (${it.qty}x) = ${rp(it.subtotal ?? it.price * it.qty)}`).join("\n");
      const discLine = Number(tx.discount || 0) > 0 ? `\nDiskon: −${rp(tx.discount)}` : "";
      const noteLine = tx.note ? `\nCatatan: ${tx.note}` : "";
      return `*STRUK ${shopName.toUpperCase()}*\nNota: ${receiptNumber(tx)}\nTanggal: ${tx.date}\n${lines}${discLine}\n----------------\n*Total: ${rp(tx.totalOmset)}* (${paymentMethodLabel(tx.paymentMethod || "Cash")})${noteLine}\nTerima kasih telah berbelanja di ${shopName}!`;
    }
    function dataUrlToBlob(dataUrl) {
      const parts = String(dataUrl || "").split(",");
      const bstr = atob(parts[1] || "");
      const arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i);
      return new Blob([arr], { type: "image/png" });
    }
    function renderReceiptPngDataUrl(tx) {
      const W = 680, pad = 40, innerW = W - pad * 2;
      const tmp = document.createElement("canvas");
      const tctx = tmp.getContext("2d");
      const wrapLines = (text, font, maxW) => {
        tctx.font = font;
        const words = String(text || "").split(/\s+/);
        const out = [];
        let cur = "";
        for (const w of words) {
          const test = cur ? cur + " " + w : w;
          if (tctx.measureText(test).width > maxW && cur) { out.push(cur); cur = w; }
          else cur = test;
        }
        if (cur) out.push(cur);
        return out.length ? out : [""];
      };

      const txItems = tx.items || [];
      const totalPcs = txItems.reduce((s, it) => s + Number(it.qty || 0), 0);
      const dtStr = fmtReceiptDate(tx.date, tx.createdAt);
      const cashierStr = tx.cashier || "Admin";
      const payLabel = paymentMethodLabel(tx.paymentMethod || "Cash");
      const totalOmset = Number(tx.totalOmset || 0);
      const cashRec = Number(tx.cashReceived || 0);
      const cashChg = Number(tx.cashChange ?? Math.max(0, cashRec - totalOmset));

      const fontMono = '22px ui-monospace, "Courier New", monospace';
      const fontBold = 'bold 22px ui-monospace, "Courier New", monospace';
      const fontTotal = 'bold 26px ui-monospace, "Courier New", monospace';
      const fontSub = '20px ui-monospace, "Courier New", monospace';

      const itemBlocks = txItems.map(it => {
        const qty = Number(it.qty || 0), price = Number(it.price || 0);
        const lines = wrapLines(it.name || "-", fontBold, innerW);
        return { lines, left: `${qty} x ${Number(price).toLocaleString("id-ID")}`, right: Number(it.subtotal ?? price * qty).toLocaleString("id-ID") };
      });

      const fontKet = '18px ui-monospace, "Courier New", monospace';
      const ketBullets = [
        "- Periksa kembali barang dan jumlah pembelian sebelum meninggalkan toko.",
        "- Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan, kecuali terdapat kesalahan toko atau cacat produksi.",
        "- Simpan nota ini sebagai bukti pembelian dan klaim garansi (jika berlaku)."
      ];
      const ketWrapped = ketBullets.map(b => wrapLines(b, fontKet, innerW));
      const ketHeight = 34 + ketWrapped.reduce((s, lines) => s + lines.length * 22 + 8, 0) + 20;

      let H = 200; // header
      H += 170; // meta 5 lines + divider
      if (tx.note) H += 28;
      if (tx.cancelledAt) H += 34;
      H += 30;
      for (const b of itemBlocks) H += b.lines.length * 28 + 32;
      H += 106; // Item + TOTAL BAYAR + 1 payment line + divider
      if (Number(tx.discount || 0) > 0) H += 30;
      if (cashRec > 0) H += 28; // extra line for KEMBALIAN
      H += 396 + ketHeight; // QR section + CATATAN & KETENTUAN + compact footer + bottom pad

      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, W - 16, H - 16);

      let y = 54;
      const centerText = (txt, font, color = "#000000") => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "center";
        ctx.fillText(txt, W / 2, y);
      };
      const leftText = (txt, font, color = "#0f172a") => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
        ctx.fillText(txt, pad, y);
      };
      const rowText = (l, r, fontL, fontR, colorL = "#0f172a", colorR = "#000000") => {
        ctx.font = fontL; ctx.fillStyle = colorL; ctx.textAlign = "left";
        ctx.fillText(l, pad, y);
        ctx.font = fontR; ctx.fillStyle = colorR; ctx.textAlign = "right";
        ctx.fillText(r, W - pad, y);
      };
      const dashRule = () => {
        ctx.save();
        ctx.strokeStyle = "#475569"; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
        ctx.restore();
      };

      centerText(shopName.toUpperCase(), 'bold 30px ui-monospace, "Courier New", monospace', "#000000"); y += 30;
      centerText("Toko Olahraga & Alat Musik", fontSub, "#334155"); y += 26;
      centerText("Jl. Ahmad Yani 37, Berau", fontSub, "#334155"); y += 26;
      centerText("WA 0823-200-33333", fontSub, "#334155"); y += 24;
      dashRule(); y += 32;

      leftText(`No Nota    : ${receiptNumber(tx)}`, fontBold); y += 28;
      leftText(`Tanggal    : ${dtStr}`, fontMono); y += 28;
      leftText(`Kasir      : ${cashierStr}`, fontMono); y += 28;
      leftText(`Pembeli    : ${tx.customer || "Pelanggan Umum"}`, fontMono); y += 28;
      leftText(`Pembayaran : ${payLabel}`, fontBold); y += 28;
      if (tx.note) { leftText(`Catatan    : ${String(tx.note).slice(0, 32)}`, fontMono); y += 28; }
      if (tx.cancelledAt) {
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(pad, y - 20, innerW, 34);
        centerText("*** NOTA DIBATALKAN ***", fontBold, "#000"); y += 34;
      }
      dashRule(); y += 30;

      for (const b of itemBlocks) {
        for (const ln of b.lines) { leftText(ln, fontBold, "#000000"); y += 28; }
        rowText(b.left, b.right, fontMono, fontBold, "#334155", "#000000");
        y += 32;
      }
      dashRule(); y += 30;

      rowText("Item", `${totalPcs} pcs`, fontMono, fontBold); y += 30;
      if (Number(tx.discount || 0) > 0) {
        rowText("Diskon", `-Rp${Number(tx.discount).toLocaleString("id-ID")}`, fontMono, fontBold, "#334155", "#be123c"); y += 30;
      }
      rowText("TOTAL BAYAR", `Rp${totalOmset.toLocaleString("id-ID")}`, fontTotal, fontTotal, "#000000", "#000000"); y += 34;
      if (cashRec > 0) {
        rowText("TUNAI", `Rp${cashRec.toLocaleString("id-ID")}`, fontMono, fontBold); y += 28;
        rowText("KEMBALIAN", `Rp${cashChg.toLocaleString("id-ID")}`, fontMono, fontBold, "#047857", "#047857"); y += 28;
      } else {
        rowText(payLabel.toUpperCase(), `Rp${totalOmset.toLocaleString("id-ID")}`, fontMono, fontBold); y += 28;
      }
      y += 4;
      dashRule(); y += 30;

      const qrInfoX = Math.round((W - 310) / 2);
      const qrInfo = (txt, font, color = "#334155") => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
        ctx.fillText(txt, qrInfoX, y);
      };
      qrInfo("Scan QR:", 'bold 20px ui-monospace, "Courier New", monospace', "#000000"); y += 24;
      qrInfo("- Cek keaslian nota", fontSub); y += 22;
      qrInfo("- Hubungi WA toko", fontSub); y += 22;
      qrInfo("- Lihat katalog terbaru", fontSub); y += 14;

      try {
        const qSize = 136;
        SjsQR.drawTo(ctx, "https://suryajaya-sport.github.io/", Math.round((W - qSize) / 2), y, qSize);
        y += qSize + 22;
      } catch { y += 22; }

      dashRule(); y += 28;
      leftText("CATATAN & KETENTUAN", 'bold 19px ui-monospace, "Courier New", monospace', "#000000"); y += 26;
      for (const lines of ketWrapped) {
        for (const ln of lines) { leftText(ln, fontKet, "#334155"); y += 22; }
        y += 8;
      }
      y += 4;
      dashRule(); y += 30;
      centerText("Terima kasih telah berbelanja", fontBold); y += 26;
      centerText("WA: 0823-200-33333", fontSub, "#334155"); y += 24;
      centerText("suryajaya-sport.github.io", fontSub, "#334155");

      return canvas.toDataURL("image/png");
    }
    function downloadReceiptPng(tx) {
      const dataUrl = renderReceiptPngDataUrl(tx);
      if (!dataUrl) return showToast("Gagal membuat gambar nota.");
      const blob = dataUrlToBlob(dataUrl);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nota-${receiptNumber(tx)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      showToast(`Gambar nota ${receiptNumber(tx)} diunduh.`);
    }
    function sendReceiptImageWhatsApp(tx) {
      let dataUrl = "";
      try { dataUrl = renderReceiptPngDataUrl(tx); } catch (err) { console.error(err); }
      if (!dataUrl) return showToast("Gagal membuat gambar nota.");
      const blob = dataUrlToBlob(dataUrl);
      const fileName = `nota-${receiptNumber(tx)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: `Nota ${shopName} ${receiptNumber(tx)}` }).catch(() => {});
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showReceiptPreview(tx, `✅ File ${fileName} sudah diunduh. Klik kanan gambar di bawah → Salin Gambar (Copy Image), lalu tempel (Ctrl+V) di chat WhatsApp.`);
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => {
          const b = document.getElementById("receiptWaHelpBanner");
          if (b) b.textContent = `✅ Gambar nota disalin ke Clipboard & diunduh (${fileName}). Buka WhatsApp lalu tekan Ctrl+V untuk mengirim!`;
        }).catch(() => {});
      }
      window.open("https://web.whatsapp.com/", "_blank", "noopener");
    }
    function showReceiptPreview(tx, waBannerMsg = "") {
      lastPreviewedReceiptTx = tx;
      const body = document.getElementById("receiptPreviewBody");
      const banner = document.getElementById("receiptWaHelpBanner");
      if (banner) {
        if (waBannerMsg) { banner.textContent = waBannerMsg; banner.classList.remove("hidden"); }
        else { banner.textContent = ""; banner.classList.add("hidden"); }
      }
      let pngUrl = "";
      try { pngUrl = renderReceiptPngDataUrl(tx); } catch (err) { console.error("PNG receipt err:", err); }
      if (pngUrl) {
        body.innerHTML = `<div class="space-y-2 text-center">
          <img src="${pngUrl}" alt="Nota ${esc(receiptNumber(tx))}" class="mx-auto max-w-full rounded-xl border border-slate-300 shadow-sm bg-white">
          <p class="text-[11px] font-bold text-slate-500">Tip PC: Klik kanan gambar nota &rarr; <strong>Salin Gambar</strong>, lalu tempel (<strong>Ctrl+V</strong>) di WhatsApp.</p>
        </div>`;
      } else {
        body.innerHTML = buildReceiptHtml(tx);
      }
      document.getElementById("receiptPreviewModal").classList.remove("hidden");
    }
    function buildReportHtml() {
      const rows = reportSales().slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
      let omset = 0, modal = 0, profit = 0, qty = 0;
      const pay = { Cash: [0, 0], QRIS: [0, 0], Kartu: [0, 0], Transfer: [0, 0] };
      for (const tx of rows) {
        omset += Number(tx.totalOmset || 0);
        modal += Number(tx.totalModal || 0);
        profit += Number(tx.totalProfit || 0);
        for (const it of tx.items || []) qty += Number(it.qty || 0);
        const m = tx.paymentMethod || "Cash";
        if (pay[m]) { pay[m][0]++; pay[m][1] += Number(tx.totalOmset || 0); }
      }
      const margin = omset > 0 ? (profit / omset * 100).toFixed(1).replace(".", ",") + "%" : "0%";
      const title = currentViewMode === "day"
        ? parseLocalDate(selectedDateStr).toLocaleDateString("id-ID", { dateStyle: "full" })
        : "Seluruh Riwayat Penjualan";
      const printedTime = formatWitaTime(new Date().toISOString());
      const lines = rows.map((tx, idx) => `<tr>
        <td class="r">${idx + 1}</td>
        <td class="mono">${esc(receiptNumber(tx))}</td>
        <td>${esc(tx.date)}<br><span style="font-size:9.5px;color:#475569">${esc(formatWitaTime(tx.createdAt))}</span></td>
        <td>${esc(tx.customer || "Pelanggan Umum")}</td>
        <td>${(tx.items || []).map(it => `${esc(it.name)} <span style="color:#475569">(${Number(it.qty || 0)} × ${rp(it.price)})</span>`).join("<br>")}</td>
        <td>${esc(paymentMethodLabel(tx.paymentMethod || "Cash"))}</td>
        <td class="r">${rp(tx.totalOmset)}</td>
        <td class="r">${rp(tx.totalModal)}</td>
        <td class="r"><strong>${rp(tx.totalProfit)}</strong></td>
      </tr>`).join("") || `<tr><td colspan="9" style="text-align:center;padding:14px">Tidak ada penjualan pada periode ini.</td></tr>`;
      const payRows = Object.entries(pay).map(([k, v]) => {
        const pct = omset > 0 ? (v[1] / omset * 100).toFixed(1).replace(".", ",") + "%" : "0%";
        return `<tr><td>${esc(paymentMethodLabel(k))}</td><td class="r">${v[0]}x</td><td class="r">${pct}</td><td class="r"><strong>${rp(v[1])}</strong></td></tr>`;
      }).join("");
      return `
        <div class="rpt-head">
          <div>
            <h1>${esc(shopName)}</h1>
            <p class="rpt-sub">Laporan Penjualan Resmi · Jl. Ahmad Yani 37, Tanjung Redeb, Berau · WA 0823-200-33333</p>
          </div>
          <div class="rpt-meta">
            <div><strong>Periode:</strong> ${esc(title)}</div>
            <div><strong>Dicetak:</strong> ${esc(todayStr())}${printedTime ? " · " + esc(printedTime) : ""}</div>
          </div>
        </div>
        <div class="rpt-kpis">
          <div class="rpt-kpi"><span>Total Omzet</span><strong>${rp(omset)}</strong></div>
          <div class="rpt-kpi"><span>Harga Pokok (HPP)</span><strong>${rp(modal)}</strong></div>
          <div class="rpt-kpi"><span>Laba Kotor (${margin})</span><strong>${rp(profit)}</strong></div>
          <div class="rpt-kpi"><span>Volume Penjualan</span><strong>${rows.length} Trx · ${qty} Pcs</strong></div>
        </div>
        <table>
          <thead><tr><th class="r">No</th><th>No. Nota</th><th>Tanggal</th><th>Pembeli</th><th>Rincian Barang</th><th>Bayar</th><th class="r">Total</th><th class="r">Modal</th><th class="r">Untung</th></tr></thead>
          <tbody>${lines}</tbody>
          <tfoot><tr><th colspan="6">TOTAL KESELURUHAN</th><th class="r">${rp(omset)}</th><th class="r">${rp(modal)}</th><th class="r">${rp(profit)}</th></tr></tfoot>
        </table>
        <table style="width:360px">
          <thead><tr><th>Metode Pembayaran</th><th class="r">Jumlah</th><th class="r">Porsi</th><th class="r">Total Omzet</th></tr></thead>
          <tbody>${payRows}</tbody>
        </table>
        <div class="rpt-foot">
          <span>Dokumen internal ${esc(shopName)}</span>
          <span>suryajaya-sport.github.io</span>
        </div>`;
    }
    async function printMode(mode, html) {
      if (mode === "receipt") document.getElementById("receiptPrintSheet").innerHTML = html;
      if (mode === "report") {
        const sheet = document.getElementById("reportPrintSheet");
        sheet.style.zoom = "1";
        sheet.innerHTML = html || buildReportHtml();
        document.body.dataset.print = mode;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const maxPrintPx = 1015;
        const h = sheet.scrollHeight || 0;
        // Jika hanya sedikit lebih tinggi dari 1 halaman A4, perkecil halus agar pas 1 halaman.
        // Jika laporan panjang (mis. Semua Hari), biarkan mengalir ke beberapa halaman tanpa terpotong.
        if (h > maxPrintPx && h <= maxPrintPx * 1.35) {
          sheet.style.zoom = Math.max(0.74, maxPrintPx / h).toFixed(3);
        } else {
          sheet.style.zoom = "1";
        }
      }
      if (mode === "sticker") {
        if (!lastStickerCanvas) return;
        const img = new Image();
        img.alt = "";
        img.src = lastStickerCanvas.toDataURL("image/png");
        try { await img.decode(); } catch {}
        document.getElementById("stickerPrintSheet").replaceChildren(img);
      }
      document.body.dataset.print = mode;
      const done = () => { delete document.body.dataset.print; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      setTimeout(() => window.print(), 100);
    }
    function printReceiptNow() { return printMode("receipt", document.getElementById("receiptPreviewBody").innerHTML); }
    function openReceiptModal(id) {
      const tx = transactions.find(t => t.id === id);
      if (tx) showReceiptPreview(tx);
    };

    // ==================== RENDER: KATALOG PUBLIK ====================
    const MUSIC_RE = /\b(gitar|guitar|ukulele|bass|capo|plektrum|musik|akustik|acoustic|klasik|classic|elektrik|electric|biola|violin|drum|stik\s*drum|cajon|jimbe|harmonika|tama|sonor|zildjian|yamaha\s*f|pyramid|d'?addario|orphee|ernie\s*ball|elixir|fender|nilon|nylon|kawat)\b/i;
    const BALL_ITEM_RE = /\b(futsal|bola|sepak|basket|voli|volley|football|soccer|molten|spalding|mikasa|nassau)\b/i;
    const BADMINTON_STRING_MODEL_RE = /\b(bg\s*\d{1,2}m?(?!\d)|nbg\s*\d{2,3}(?!\d)|exbolt|nanogy|aerobite|aerosonic|ultimax|tectonic\s*65|vbs\s*\d{2,3}(?!\d)|no\.?\s*[157]\s*boost?)\b/i;
    const BADMINTON_BRAND_RE = /\b(badminton|bulutangkis|raket|shuttlecock|kok|yonex|lining|li-ning|victor|felet|hi-?qua|maxbolt|hundred|kizuna|toalson|apacs|power\s*max|tectonic|flypower|mizuno|astec|hart|ebox|eagle|prochamps|pro\s*ace|ashaway|gosen|rs\b|reinforce|kawasaki|fleet|babolat|bg\s*\d{1,2}m?(?!\d)|nbg\s*\d{2,3}(?!\d)|exbolt|nanogy|aerobite|aerosonic|ultimax|vbs\s*\d{2,3}(?!\d))\b/i;
    const NOT_STRING_ITEM_RE = /\b(raket|racket|sepatu|baju|jersey|celana|tas|grip|kok|shuttlecock|kaos|net|piala|taping|bola|basket|futsal|voli|volley|sepak|molten|spalding|mikasa|catur|chess|pingpong|tenis|senapan|peluru|mimis|sepatu\s*roda|skate|deker|sarung\s*tangan|pompa|matras|dumbbell|barbel|skipping)\b/i;

    function isSenarBadminton(item) {
      const name = String(item?.name || "").trim();
      const txt = [item?.name, item?.category, item?.description].filter(Boolean).join(" ");
      if (MUSIC_RE.test(txt)) return false;
      if (BALL_ITEM_RE.test(txt)) return false;
      if (/\bsenar\s+(raket|badminton|bulutangkis)\b/i.test(name)) return true;
      if (NOT_STRING_ITEM_RE.test(name)) return false;
      const hasSenarWord = /\bsenar\b/i.test(name);
      const isModelOnly = BADMINTON_STRING_MODEL_RE.test(name);
      if (isModelOnly) return true;
      if (hasSenarWord) {
        return BADMINTON_BRAND_RE.test(txt) || /^senar\b/i.test(name);
      }
      return false;
    }

    function matchesCatalogCategory(item, category) {
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
    const SENAR_SERVICE_NOTE = "Harga tercantum sudah termasuk jasa pasang senar.";
    const isSenarItem = isSenarBadminton;
    function getProductDisplayDescription(item) {
      const base = String(item?.description || "").trim();
      if (!isSenarItem(item)) return base;
      if (/jasa\s+pasang\s+senar/i.test(base)) return base;
      return base ? `${base} · ${SENAR_SERVICE_NOTE}` : SENAR_SERVICE_NOTE;
    }


    const CATALOG_BRANDS = [
      { id: "yonex", name: "Yonex", sub: "Badminton", searchTerm: "Yonex", re: /\byonex\b/i, badge: "YNX", cls: "bg-sky-50 text-sky-900 border-sky-200" },
      { id: "lining", name: "Li-Ning", sub: "Badminton & Sport", searchTerm: "Li-Ning", re: /\b(li-?ning|lining)\b/i, badge: "LN", cls: "bg-rose-50 text-rose-900 border-rose-200" },
      { id: "victor", name: "Victor", sub: "Badminton", searchTerm: "Victor", re: /\bvictor\b/i, badge: "VTR", cls: "bg-blue-50 text-blue-900 border-blue-200" },
      { id: "hiqua", name: "Hiqua", sub: "Badminton", searchTerm: "Hiqua", re: /\b(hi-?qua|hiqua)\b/i, badge: "HQ", cls: "bg-amber-50 text-amber-900 border-amber-200" },
      { id: "rs", name: "RS", sub: "Reinforce Speed", searchTerm: "RS", re: /\b(rs|reinforce(\s*speed)?)\b/i, badge: "RS", cls: "bg-red-50 text-red-900 border-red-200" },
      { id: "flypower", name: "Flypower", sub: "Badminton", searchTerm: "Flypower", re: /\bflypower\b/i, badge: "FP", cls: "bg-orange-50 text-orange-900 border-orange-200" },
      { id: "astec", name: "Astec", sub: "Badminton", searchTerm: "Astec", re: /\bastec\b/i, badge: "AST", cls: "bg-cyan-50 text-cyan-900 border-cyan-200" },
      { id: "butterfly", name: "Butterfly", sub: "Tenis Meja", searchTerm: "Butterfly", re: /\bbutterfly\b/i, badge: "BFY", cls: "bg-pink-50 text-pink-900 border-pink-200" },
      { id: "dhs", name: "DHS", sub: "Double Happiness", searchTerm: "DHS", re: /\b(dhs|double\s*happiness)\b/i, badge: "DHS", cls: "bg-rose-50 text-rose-900 border-rose-200" },
      { id: "nitaku", name: "Nitaku", sub: "Nittaku Pingpong", searchTerm: "Nitaku", re: /\b(nitaku|nittaku)\b/i, badge: "NTK", cls: "bg-sky-50 text-sky-900 border-sky-200" },
      { id: "donics", name: "Donics", sub: "Donic Pingpong", searchTerm: "Donic", re: /\b(donics?|donic)\b/i, badge: "DNC", cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
      { id: "doublefish", name: "Double Fish", sub: "Tenis Meja", searchTerm: "Double Fish", re: /\bdouble\s*fish\b/i, badge: "DF", cls: "bg-indigo-50 text-indigo-900 border-indigo-200" },
      { id: "specs", name: "Specs", sub: "Futsal & Bola", searchTerm: "Specs", re: /\bspecs\b/i, badge: "SPC", cls: "bg-yellow-50 text-yellow-900 border-yellow-200" },
      { id: "ortuseight", name: "Ortuseight", sub: "Futsal & Running", searchTerm: "Ortuseight", re: /\b(ortuseight|ortus)\b/i, badge: "ORT", cls: "bg-orange-50 text-orange-900 border-orange-200" },
      { id: "adidas", name: "Adidas", sub: "Sport & Futsal", searchTerm: "Adidas", re: /\badidas\b/i, badge: "ADI", cls: "bg-slate-100 text-slate-900 border-slate-300" },
      { id: "nike", name: "Nike", sub: "Sport & Futsal", searchTerm: "Nike", re: /\bnike\b/i, badge: "NKE", cls: "bg-slate-100 text-slate-900 border-slate-300" },
      { id: "molten", name: "Molten", sub: "Bola Basket & Voli", searchTerm: "Molten", re: /\bmolten\b/i, badge: "MLT", cls: "bg-red-50 text-red-900 border-red-200" },
      { id: "mikasa", name: "Mikasa", sub: "Bola Voli & Sepak", searchTerm: "Mikasa", re: /\bmikasa\b/i, badge: "MKS", cls: "bg-blue-50 text-blue-900 border-blue-200" },
      { id: "mizuno", name: "Mizuno", sub: "Badminton & Voli", searchTerm: "Mizuno", re: /\bmizuno\b/i, badge: "MIZ", cls: "bg-sky-50 text-sky-900 border-sky-200" },
      { id: "asics", name: "Asics", sub: "Sepatu & Voli", searchTerm: "Asics", re: /\basics\b/i, badge: "ASC", cls: "bg-indigo-50 text-indigo-900 border-indigo-200" }
    ];
    let activeBrandId = "";
    function itemBrandHaystack(item) {
      return [item.name, item.code, item.size, item.color, item.description].filter(Boolean).join(" ");
    }
    function matchesBrandFilter(item, brandObj) {
      return !brandObj || brandObj.re.test(itemBrandHaystack(item));
    }
    function renderBrandShowcase() {
      const grid = document.getElementById("brandLogoGrid");
      const resetBtn = document.getElementById("btnResetBrandFilter");
      if (!grid) return;
      if (resetBtn) resetBtn.classList.toggle("hidden", !activeBrandId);
      const inStockItems = publicCatalog.filter(it => Number(it.stock || 0) > 0);
      grid.innerHTML = CATALOG_BRANDS.map(b => {
        const count = inStockItems.filter(it => matchesBrandFilter(it, b)).length;
        const active = activeBrandId === b.id;
        return `<button type="button" data-brand-id="${esc(b.id)}" aria-pressed="${active}" class="flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${active ? "border-blue-700 bg-blue-50 ring-2 ring-blue-300" : "border-slate-200 bg-slate-50/70 hover:border-blue-400 hover:bg-white"}">
          <span class="inline-flex items-center justify-center rounded-xl border px-2.5 py-1 text-xs font-black tracking-wider ${b.cls}">${esc(b.badge)}</span>
          <span class="text-sm font-extrabold text-slate-900 leading-tight">${esc(b.name)}</span>
          <span class="text-[11px] font-semibold text-slate-500 leading-tight">${esc(b.sub)} · ${count}</span>
        </button>`;
      }).join("");
    }

    function renderProductCatalog() {
      renderBrandShowcase();
      const grid = document.getElementById("productCatalogGrid");
      const search = document.getElementById("catalogSearch");
      const q = search.value.trim().toLocaleLowerCase("id");
      document.getElementById("btnClearCatalogSearch").classList.toggle("hidden", !search.value);
      const category = document.querySelector("#catalogCategory input:checked")?.value || "all";
      if (catalogLoadState !== "ready") {
        grid.innerHTML = `<p class="catalog-empty" role="status">${catalogLoadState === "error" ? "Katalog gagal dimuat. Muat ulang halaman." : "Katalog sedang dimuat…"}</p>`;
        return;
      }
      for (const btn of document.querySelectorAll("#quickCatGrid .quick-cat-btn")) {
        btn.classList.toggle("is-active", btn.dataset.quickCat === category);
      }
      const sortMode = document.getElementById("catalogSort")?.value || "default";
      const items = publicCatalog.filter(item => Number(item.stock) > 0);
      const brandObj = CATALOG_BRANDS.find(b => b.id === activeBrandId) || null;
      const filtered = items.filter(item => {
        const hay = itemBrandHaystack(item).toLocaleLowerCase("id");
        const matchBrandOrSearch = brandObj
          ? (matchesBrandFilter(item, brandObj) || (q && hay.includes(q)))
          : (!q || hay.includes(q));
        return matchBrandOrSearch && matchesCatalogCategory(item, category);
      });
      if (sortMode === "price-asc") filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      else if (sortMode === "price-desc") filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      else if (sortMode === "name-asc") filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"));
      document.getElementById("catalogResultCount").textContent = `${filtered.length} produk`;
      if (!filtered.length) {
        grid.innerHTML = `<p class="catalog-empty" role="status">Produk tidak ditemukan. Coba kata kunci lain atau pilih kategori "Semua".</p>`;
        return;
      }
      grid.innerHTML = filtered.map((item, index) => {
        const stockNum = Number(item.stock || 0);
        const limited = stockNum < LOW_STOCK_LIMIT;
        const msg = `Halo Surya Jaya Sport, saya ingin bertanya tentang ${item.name}${item.code ? ` (${item.code})` : ""} dengan harga ${rp(item.price)}. Apakah stoknya tersedia?`;
        return `
        <article class="catalog-card">
          <div class="catalog-card-photo-wrap" data-view-product="${esc(item.id)}" role="button" tabindex="0" aria-label="Lihat detail ${esc(item.name)}">
            <span class="catalog-card-badge ${limited ? "is-limited" : ""}">${limited ? "Stok terbatas" : "Tersedia"}</span>
            ${productImageMarkup(item, "catalog-card-photo", 560, index < 2)}
          </div>
          <div class="catalog-card-body">
            <p class="catalog-card-meta">${esc([item.code, item.size, item.color].filter(Boolean).join(" · "))}</p>
            <h3 class="font-extrabold cursor-pointer hover:text-blue-700" data-view-product="${esc(item.id)}">${esc(item.name)}</h3>
            ${item.description ? `<p class="catalog-card-description line-clamp-2">${esc(item.description)}</p>` : ""}
            ${isSenarItem(item) ? `<p class="senar-service-note"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>${SENAR_SERVICE_NOTE}</span></p>` : ""}
            <div class="catalog-card-facts">
              <p class="catalog-card-price text-slate-900">${rp(item.price)}</p>
              <span class="catalog-stock">Stok ${stockNum} pcs</span>
            </div>
            <div class="catalog-card-actions">
              <button type="button" data-add-cart="${esc(item.id)}" class="shop-button shop-button-primary"><i class="fa-solid fa-plus" aria-hidden="true"></i> Keranjang</button>
              <a href="${CATALOG_WA}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="shop-button shop-button-secondary"><i class="fa-brands fa-whatsapp text-emerald-600" aria-hidden="true"></i> Tanya stok</a>
            </div>
          </div>
        </article>`;
      }).join("");
    }

    // ==================== KERANJANG KATALOG ====================
    function saveCart() {
      try { sessionStorage.setItem(CART_KEY, JSON.stringify([...catalogCart])); } catch {}
    }
    function restoreCart() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]");
        for (const [id, line] of saved) {
          if (typeof id === "string" && Number.isSafeInteger(line?.qty)) {
            catalogCart.set(id, { qty: Math.min(99, Math.max(1, line.qty)), note: String(line.note || "").slice(0, 100) });
          }
        }
      } catch {}
    }
    function cartProducts() {
      const byId = new Map(publicCatalog.map(p => [p.id, p]));
      return [...catalogCart].map(([id, line]) => ({ id, line, item: byId.get(id) }));
    }
    function updateCartSummary() {
      const lines = cartProducts();
      document.getElementById("catalogCartCount").textContent = lines.length;
      const total = lines.reduce((s, { item, line }) => s + (Number(item?.price) || 0) * line.qty, 0);
      document.getElementById("catalogCartTotal").textContent = lines.length ? `Perkiraan total: ${rp(total)}` : "";
      const link = document.getElementById("catalogCartWhatsApp");
      const canSend = lines.length > 0 && lines.every(({ item, line }) => item && Number(item.stock) > 0 && line.qty > 0);
      link.classList.toggle("hidden", !canSend);
      if (!canSend) { link.removeAttribute("href"); return; }
      const text = ["Halo Surya Jaya Sport, saya mau cek stok:",
        ...lines.map(({ item, line }, i) => `${i + 1}. ${item.name}${item.code ? ` (${item.code})` : ""} × ${line.qty}${line.note ? ` — ${line.note}` : ""}`),
        `Perkiraan total: ${rp(total)}. Apakah stoknya tersedia?`].join("\n");
      link.href = CATALOG_WA + "?" + new URLSearchParams({ text });
    }
    function renderCart() {
      const lines = cartProducts();
      document.getElementById("catalogCartLines").innerHTML = lines.length
        ? lines.map(({ id, line, item }) => `
          <div class="rounded-2xl border border-slate-200 p-3.5" data-cart-line="${esc(id)}">
            <div class="flex items-start justify-between gap-2">
              <div><p class="font-bold">${esc(item?.name || "Barang tidak tersedia")}</p>
              <p class="text-sm text-slate-600">${esc(item?.code || "")} ${item ? "· " + rp(item.price) : ""}</p></div>
              <button type="button" data-remove-cart="${esc(id)}" class="px-2.5 py-1.5 rounded-lg text-sm font-bold text-rose-700 hover:bg-rose-50">Hapus</button>
            </div>
            <div class="mt-2.5 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
              <label class="text-xs font-bold text-slate-600">Jumlah<input data-cart-qty type="number" min="1" max="99" value="${line.qty}" class="mt-1 w-full rounded-xl border border-slate-300 p-2 font-bold"></label>
              <label class="text-xs font-bold text-slate-600">Varian / catatan<input data-cart-note maxlength="100" value="${esc(line.note)}" class="mt-1 w-full rounded-xl border border-slate-300 p-2"></label>
            </div>
          </div>`).join("")
        : `<p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Keranjang masih kosong.</p>`;
      updateCartSummary();
    }

    // ==================== RENDER: STOK ====================
    let activePosCat = "all";
    let posShowPhotos = localStorage.getItem("sjs-pos-show-photos") === "1";
    function syncPosPhotoToggleBtn() {
      const btn = document.getElementById("btnTogglePosPhotos");
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(posShowPhotos));
      btn.innerHTML = posShowPhotos
        ? '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i><span>Sembunyikan Foto</span>'
        : '<i class="fa-regular fa-image" aria-hidden="true"></i><span>Tampilkan Foto</span>';
    }

    function renderPosCatalog() {
      const grid = document.getElementById("posCatalogGrid");
      if (!grid) return;
      syncPosPhotoToggleBtn();
      grid.classList.toggle("is-compact", !posShowPhotos);
      const q = (document.getElementById("posCatalogSearch")?.value || "").trim().toLocaleLowerCase("id");
      const list = activeInventory().filter(item => {
        const hay = [item.name, item.code, item.size, item.color].filter(Boolean).join(" ").toLocaleLowerCase("id");
        return (!q || hay.includes(q)) && matchesCatalogCategory(item, activePosCat);
      }).sort((a, b) => (Number(b.stock || 0) > 0) - (Number(a.stock || 0) > 0) || String(a.name || "").localeCompare(String(b.name || ""), "id"));
      if (!list.length) {
        grid.innerHTML = `<p class="col-span-full text-center text-sm text-slate-500 py-8">Tidak ada barang yang cocok.</p>`;
        return;
      }
      grid.innerHTML = list.map(item => {
        const st = Number(item.stock || 0);
        const cls = st <= 0 ? "out" : st < 5 ? "crit" : st <= 10 ? "mid" : "ok";
        const dot = st < 5 ? "🔴" : st <= 10 ? "🟡" : "🟢";
        const label = st <= 0 ? "🔴 Habis" : `${dot} ${st} pcs`;
        if (!posShowPhotos) {
          return `<button type="button" class="pos-card is-compact ${st <= 0 ? "opacity-60" : ""}" data-pos-add="${esc(item.id)}">
            <div class="flex items-center justify-between gap-1.5 w-full">
              <span class="pos-card-code">${esc(item.code || "-")}</span>
              <span class="pos-stock-pill ${cls}">${label}</span>
            </div>
            <span class="pos-card-name">${esc(item.name)}</span>
            <div class="flex items-center justify-between gap-1.5 w-full mt-auto pt-1">
              <span class="pos-card-price !pt-0">${rp(item.price)}</span>
              ${isSenarItem(item) ? `<span class="text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">+Pasang</span>` : ""}
            </div>
          </button>`;
        }
        return `<button type="button" class="pos-card ${st <= 0 ? "opacity-60" : ""}" data-pos-add="${esc(item.id)}">
          <div class="pos-card-thumb">
            <span class="pos-stock-pill ${cls}">${label}</span>
            ${productImageMarkup(item, "h-full w-full p-1.5 bg-white", 260)}
          </div>
          <div class="pos-card-body">
            <span class="pos-card-code">${esc(item.code || "-")}</span>
            <span class="pos-card-name">${esc(item.name)}</span>
            <span class="pos-card-price">${rp(item.price)}</span>
            ${isSenarItem(item) ? `<span class="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 self-start">Termasuk jasa pasang</span>` : ""}
          </div>
        </button>`;
      }).join("");
    }

    function detectProductCategoryLabel(item) {
      if (matchesCatalogCategory(item, "badminton")) return { key: "badminton", label: "Badminton", cls: "bg-sky-50 text-sky-800 border-sky-200" };
      if (matchesCatalogCategory(item, "ball")) return { key: "ball", label: "Futsal & Bola", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      if (matchesCatalogCategory(item, "chess")) return { key: "chess", label: "Catur", cls: "bg-amber-50 text-amber-900 border-amber-200" };
      if (matchesCatalogCategory(item, "music")) return { key: "music", label: "Musik", cls: "bg-purple-50 text-purple-800 border-purple-200" };
      return { key: "sport", label: "Olahraga", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    }

    function populateStockSelect(selectId, searchQuery = "", preferId = "") {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      const prev = preferId || sel.value;
      const q = String(searchQuery || "").trim().toLocaleLowerCase("id");
      const list = activeInventory().filter(i => {
        const hay = [i.code, i.name, i.size, i.color].filter(Boolean).join(" ").toLocaleLowerCase("id");
        return !q || hay.includes(q);
      }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"));
      sel.innerHTML = list.length
        ? list.map(i => `<option value="${esc(i.id)}">${esc(i.code || "-")} — ${esc(i.name)} (sisa ${Number(i.stock || 0)} pcs)</option>`).join("")
        : `<option value="">Barang tidak ditemukan</option>`;
      if (prev && list.some(i => i.id === prev)) sel.value = prev;
    }

    function syncRestockPricing(source = "item") {
      const item = activeInventory().find(i => i.id === document.getElementById("restockItem")?.value);
      const qtyEl = document.getElementById("restockQty");
      const unitEl = document.getElementById("restockUnitCost");
      const totalEl = document.getElementById("restockTotal");
      if (!qtyEl || !unitEl || !totalEl) return;
      if (source === "item" && item) {
        unitEl.value = Number(item.cost || 0);
      }
      const qty = Math.max(0, Number(qtyEl.value) || 0);
      const unit = Math.max(0, Number(unitEl.value) || 0);
      if (source === "total") {
        const tot = Math.max(0, Number(totalEl.value) || 0);
        if (qty > 0) unitEl.value = Math.round(tot / qty);
      } else {
        totalEl.value = qty > 0 ? Math.round(qty * unit) : "";
      }
    }

    function syncStockOutBadge() {
      const badge = document.getElementById("stockOutCurrentBadge");
      const item = activeInventory().find(i => i.id === document.getElementById("stockOutItem")?.value);
      if (!badge) return;
      const st = item ? Number(item.stock || 0) : 0;
      badge.textContent = item ? `Sisa stok saat ini: ${st} pcs` : "Sisa: -";
      badge.className = "text-xs font-extrabold px-2.5 py-0.5 rounded-full " + (st <= 0 ? "bg-rose-100 text-rose-800" : st < LOW_STOCK_LIMIT ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800");
    }

    function openRestockFor(id = "") {
      if (!isAdmin) return;
      const searchEl = document.getElementById("restockSearch");
      if (searchEl) searchEl.value = "";
      populateStockSelect("restockItem", "", id);
      document.getElementById("restockQty").value = "1";
      document.getElementById("restockSupplier").value = "";
      document.getElementById("restockInvoice").value = "";
      syncRestockPricing("item");
      openDialog("restockCard");
    }

    function openStockOutFor(id = "") {
      if (!isAdmin) return;
      const searchEl = document.getElementById("stockOutSearch");
      if (searchEl) searchEl.value = "";
      populateStockSelect("stockOutItem", "", id);
      document.getElementById("stockOutQty").value = "1";
      document.getElementById("stockOutNote").value = "";
      syncStockOutBadge();
      openDialog("stockOutCard");
    }

    async function saveStockOut() {
      if (!isAdmin) return showToast("Masuk ke akun pemilik terlebih dahulu.");
      const id = document.getElementById("stockOutItem").value;
      const qty = Number(document.getElementById("stockOutQty").value);
      const reason = document.getElementById("stockOutReason").value || "Koreksi Opname";
      const note = document.getElementById("stockOutNote").value.trim();
      const item = activeInventory().find(i => i.id === id);
      if (!item) return showToast("Pilih barang terlebih dahulu.");
      if (!Number.isSafeInteger(qty) || qty < 1) return showToast("Jumlah keluar minimal 1 pcs.");

      const invRef = doc(db, ...paths("inventory", id));
      const pubRef = doc(db, "publicCatalog", id);
      const nowIso = new Date().toISOString();
      try {
        await runTransaction(db, async tx => {
          const cur = await tx.get(invRef);
          const pub = await tx.get(pubRef);
          if (!cur.exists()) throw new Error("Barang tidak ditemukan.");
          const saved = cur.data();
          const curStock = Number(saved.stock || 0);
          if (curStock < qty) throw new Error(`Stok "${saved.name}" hanya tersisa ${curStock} pcs.`);
          const newStock = curStock - qty;
          const edits = Array.isArray(saved.stockEdits) ? saved.stockEdits.slice(-49) : [];
          edits.push({ date: todayStr(), createdAt: nowIso, delta: -qty, type: "out", reason, note, stockAfter: newStock });
          tx.update(invRef, { stock: newStock, stockEdits: edits, updatedAt: nowIso });
          if (pub.exists()) tx.update(pubRef, { stock: newStock });
        });
        document.getElementById("stockOutCard").close();
        recordQrActivity("out"); showToast(`Stok "${item.name}" dikurangi -${qty} pcs (${reason}).`);
      } catch (err) {
        showToast("Gagal mencatat barang keluar: " + (err.message || "kesalahan"));
      }
    }

    function openStockCard(id) {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      const cat = detectProductCategoryLabel(item);
      document.getElementById("stockCardTitle").textContent = `Kartu Stok — ${formatItemLabel(item)}`;
      document.getElementById("stockCardSummary").innerHTML = `
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><span class="text-[11px] font-bold text-slate-500 uppercase">Sisa Stok</span><strong class="block text-xl font-extrabold text-slate-900 mt-0.5">${Number(item.stock || 0)} Pcs</strong></div>
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><span class="text-[11px] font-bold text-slate-500 uppercase">Kategori</span><strong class="block text-sm font-extrabold text-slate-900 mt-1">${esc(cat.label)}</strong></div>
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><span class="text-[11px] font-bold text-slate-500 uppercase">Harga Beli</span><strong class="block text-base font-extrabold text-slate-900 mt-1 tabular-nums">${rp(item.cost || 0)}</strong></div>
        <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><span class="text-[11px] font-bold text-emerald-800 uppercase">Harga Jual</span><strong class="block text-base font-extrabold text-emerald-900 mt-1 tabular-nums">${rp(item.price || 0)}</strong></div>`;

      const events = [];
      for (const p of purchases) {
        if (p.inventoryId !== item.id) continue;
        events.push({
          date: p.date || "",
          sortKey: p.createdAt || p.date || "",
          kind: "Masuk",
          badgeCls: "bg-emerald-100 text-emerald-900",
          delta: +Number(p.qty || 0),
          desc: [p.supplier ? "Supplier: " + p.supplier : "Pembelian stok", p.invoice ? "Nota: " + p.invoice : "", p.unitCost ? "@" + rp(p.unitCost) : ""].filter(Boolean).join(" · ")
        });
      }
      for (const tx of transactions) {
        for (const it of tx.items || []) {
          if (it.inventoryId !== item.id) continue;
          events.push({
            date: tx.date || "",
            sortKey: tx.createdAt || tx.date || "",
            kind: "Terjual",
            badgeCls: "bg-blue-100 text-blue-900",
            delta: -Number(it.qty || 0),
            desc: `${receiptNumber(tx)} · ${tx.customer || "Pelanggan Umum"} (${paymentMethodLabel(tx.paymentMethod || "Cash")})`
          });
        }
      }
      for (const ed of Array.isArray(item.stockEdits) ? item.stockEdits : []) {
        const d = Number(ed.delta || 0);
        if (!d) continue;
        const isOut = ed.type === "out" || d < 0;
        events.push({
          date: ed.date || "",
          sortKey: ed.createdAt || ed.date || "",
          kind: ed.type === "out" ? "Keluar" : "Koreksi",
          badgeCls: isOut ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900",
          delta: d,
          desc: [ed.reason || "Penyesuaian stok manual", ed.note || ""].filter(Boolean).join(" — ")
        });
      }

      // Sort newest first & compute running ending balance backwards from current stock
      events.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)));
      let running = Number(item.stock || 0);
      const tbody = document.getElementById("stockCardBody");
      tbody.innerHTML = events.length
        ? events.map(ev => {
            const after = running;
            running -= ev.delta;
            const deltaText = (ev.delta > 0 ? "+" : "") + ev.delta + " pcs";
            const deltaCls = ev.delta > 0 ? "text-emerald-700" : "text-rose-700";
            return `<tr>
              <td class="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-700">${esc(ev.date || "-")}</td>
              <td class="py-2.5 px-3"><span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold ${ev.badgeCls}">${esc(ev.kind)}</span></td>
              <td class="py-2.5 px-3 text-slate-700">${esc(ev.desc)}</td>
              <td class="py-2.5 px-3 text-right font-extrabold tabular-nums ${deltaCls}">${deltaText}</td>
              <td class="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">${after} pcs</td>
            </tr>`;
          }).join("")
        : `<tr><td colspan="5" class="py-8 text-center text-slate-500">Belum ada riwayat mutasi untuk produk ini.</td></tr>`;
      openDialog("stockCardDialog");
    }

    let inventorySort = { key: "", dir: "asc" };
    const selectedQrQty = new Map();
    function updateBatchQrCount() {
      let totalLabels = 0;
      for (const q of selectedQrQty.values()) totalLabels += Math.max(1, Number(q) || 1);
      const span = document.getElementById("batchQrCount");
      const btn = document.getElementById("btnBatchPrintQr");
      const pbtn = document.getElementById("btnPreviewBatchQr");
      if (span) span.textContent = selectedQrQty.size ? `${selectedQrQty.size} item · ${totalLabels} label` : "0";
      if (btn) btn.disabled = selectedQrQty.size === 0;
      if (pbtn) pbtn.disabled = selectedQrQty.size === 0;
    }

    function updateInventorySortUI() {
      document.querySelectorAll("#inventoryTableHeadRow [data-inv-sort]").forEach(btn => {
        const active = btn.dataset.invSort === inventorySort.key;
        btn.classList.toggle("is-active", active);
        const icon = btn.querySelector("[data-sort-icon]");
        if (icon) {
          icon.className = active
            ? (inventorySort.dir === "asc" ? "fa-solid fa-sort-up text-[11px]" : "fa-solid fa-sort-down text-[11px]")
            : "fa-solid fa-sort text-[11px] opacity-40";
        }
      });
      const sel = document.getElementById("inventorySortSelect");
      if (sel) sel.value = inventorySort.key ? `${inventorySort.key}-${inventorySort.dir}` : "default";
    }

    function compareInventoryItems(a, b, key, dir) {
      let cmp = 0;
      if (key === "name") {
        cmp = String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base", numeric: true });
      } else if (key === "category") {
        cmp = detectProductCategoryLabel(a).label.localeCompare(detectProductCategoryLabel(b).label, "id", { sensitivity: "base" });
      } else if (key === "cost") {
        cmp = Number(a.cost || 0) - Number(b.cost || 0);
      } else if (key === "price") {
        cmp = Number(a.price || 0) - Number(b.price || 0);
      } else if (key === "stock") {
        cmp = Number(a.stock || 0) - Number(b.stock || 0);
      } else if (key === "profit") {
        cmp = (Number(a.price || 0) - Number(a.cost || 0)) - (Number(b.price || 0) - Number(b.cost || 0));
      }
      if (dir === "desc") cmp = -cmp;
      if (cmp !== 0) return cmp;
      return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base", numeric: true });
    }

    function renderInventory() {
      try { updatePosLiveStats(); } catch (e) { console.error("updatePosLiveStats", e); }
      try { renderInventoryCharts(); } catch (e) { console.error("renderInventoryCharts", e); }
      try { renderBackupVolumeChart(); } catch (e) { console.error("renderBackupVolumeChart", e); }
      try { updateInventorySortUI(); } catch (e) { console.error("updateInventorySortUI", e); }
      const q = document.getElementById("invSearchInput").value.trim().toLocaleLowerCase("id");
      const missingOnly = document.getElementById("invMissingPhotoOnly").checked;
      const catFilter = document.getElementById("inventoryCategoryFilter")?.value || "all";
      const follow = document.getElementById("inventoryFollowUp").value;
      const published = new Set(publicCatalog.map(p => p.id));
      const listed = follow === "archived" ? inventory.filter(i => i.archivedAt) : activeInventory();
      const filtered = listed.filter(item => {
        const stock = Number(item.stock || 0);
        const hay = [item.name, item.code, item.size, item.color].filter(Boolean).join(" ").toLocaleLowerCase("id");
        return (!q || hay.includes(q))
          && (!missingOnly || !productImageUrl(item))
          && (catFilter === "all" || matchesCatalogCategory(item, catFilter))
          && (follow !== "low" || stock < LOW_STOCK_LIMIT)
          && (follow !== "out" || stock <= 0)
          && (follow !== "unpublished" || !published.has(item.id))
          && (follow !== "no-price" || !(Number(item.price) > 0));
      });
      if (inventorySort.key) {
        filtered.sort((a, b) => compareInventoryItems(a, b, inventorySort.key, inventorySort.dir));
      }

      document.getElementById("inventoryCatalogStatus").textContent =
        `${published.size} barang terbit · ${activeInventory().filter(i => !published.has(i.id)).length} belum terbit`;
      document.getElementById("invMissingPhotoCount").textContent = `(${inventory.filter(i => !i.archivedAt && !productImageUrl(i)).length})`;
      document.getElementById("inventoryResultCount").textContent = `${filtered.length} dari ${listed.length} barang`;

      let units = 0, asset = 0, low = 0;
      for (const item of activeInventory()) {
        const stock = Math.max(0, Number(item.stock || 0));
        units += stock;
        asset += stock * Number(item.cost || 0);
        if (stock < LOW_STOCK_LIMIT) low++;
      }
      document.getElementById("navStockBadge").textContent = activeInventory().length;
      document.getElementById("invTotalTypes").textContent = activeInventory().length + " Aktif";
      document.getElementById("invTotalUnits").textContent = units + " Pcs";
      document.getElementById("invTotalAsset").textContent = rp(asset);
      document.getElementById("invLowStockCount").textContent = low + " Barang";
      document.getElementById("invEmptyState").classList.toggle("hidden", filtered.length > 0);

      populateStockSelect("restockItem", document.getElementById("restockSearch")?.value || "");
      populateStockSelect("stockOutItem", document.getElementById("stockOutSearch")?.value || "");
      syncStockOutBadge();

      document.getElementById("inventoryDatalist").innerHTML = activeInventory().map(i => `<option value="${esc(formatDropdownOption(i))}"></option>`).join("");
      renderPosCatalog();

      const tbody = document.getElementById("inventoryTableBody");
      const cards = document.getElementById("inventoryMobileList");
      tbody.innerHTML = "";
      cards.innerHTML = "";
      for (const item of filtered) {
        const stock = Number(item.stock || 0);
        const cost = Number(item.cost || 0), price = Number(item.price || 0);
        const badge = stock <= 0 ? "is-empty" : stock < LOW_STOCK_LIMIT ? "is-low" : "";
        const status = item.archivedAt ? "Diarsipkan" : published.has(item.id) ? "Terbit" : "Belum terbit";
        const cat = detectProductCategoryLabel(item);
        const id = esc(item.id);
        const quickMove = isAdmin && !item.archivedAt ? `
          <button type="button" data-quick-in="${id}" title="Barang masuk (+)" class="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs">+ Masuk</button>
          <button type="button" data-quick-out="${id}" title="Barang keluar (-)" class="px-2 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-extrabold text-xs">− Keluar</button>` : "";
        const editBtns = isAdmin ? `
          <button type="button" data-share-wa="${id}" title="Salin teks promo WA" class="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 inline-flex items-center justify-center"><i class="fa-brands fa-whatsapp text-xs"></i></button>
          <button type="button" data-edit-item="${id}" title="Ubah produk" class="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 inline-flex items-center justify-center"><i class="fa-solid fa-pen-to-square text-xs"></i></button>
          <button type="button" data-qr-item="${id}" title="Stiker QR" class="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 inline-flex items-center justify-center"><i class="fa-solid fa-qrcode text-xs"></i></button>
          ${item.archivedAt
            ? `<button type="button" data-restore-item="${id}" class="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-950 font-bold text-xs">Pulihkan</button>`
            : `<button type="button" data-archive-item="${id}" title="Arsipkan" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center"><i class="fa-solid fa-box-archive text-xs"></i></button>`}` : "";

        const row = document.createElement("tr");
        row.className = "hover:bg-blue-50/50 transition-colors";
        row.innerHTML = `
          <td class="py-3 px-3">
            <div class="flex items-center gap-2.5">
              <div class="flex flex-col items-center gap-1 shrink-0"><input type="checkbox" data-qr-select="${id}" ${selectedQrQty.has(item.id) ? "checked" : ""} aria-label="Pilih ${esc(item.name)} untuk cetak QR" class="h-4 w-4 rounded border-slate-300 cursor-pointer">${selectedQrQty.has(item.id) ? `<input type="number" min="1" max="50" value="${selectedQrQty.get(item.id)}" data-qr-qty="${id}" title="Jumlah label QR" class="w-11 px-1 py-0.5 text-[11px] font-extrabold text-center border border-blue-300 rounded-md bg-blue-50">` : ""}</div>
              ${productImageMarkup(item, "w-12 h-12 rounded-xl border border-slate-200 shrink-0", 140)}
              <div class="min-w-0">
                <p class="font-extrabold text-slate-900 leading-snug">${esc(item.name)}</p>
                <p class="text-xs text-slate-500 mt-0.5"><span class="font-mono font-bold text-blue-800">${esc(item.code || "-")}</span> · ${status}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 whitespace-nowrap"><span class="inline-block px-2.5 py-0.5 rounded-full border text-xs font-bold ${cat.cls}">${esc(cat.label)}</span></td>
          <td class="py-3 px-3 text-right tabular-nums text-slate-600 whitespace-nowrap">${rp(cost)}</td>
          <td class="py-3 px-3 text-right font-extrabold text-emerald-800 tabular-nums whitespace-nowrap">${rp(price)}</td>
          <td class="py-3 px-3 text-center whitespace-nowrap">
            <button type="button" data-stock-card="${id}" title="Klik untuk lihat Kartu Stok" class="stock-indicator ${badge} cursor-pointer hover:ring-2 hover:ring-blue-400 transition">${stock} Pcs <i class="fa-solid fa-clock-rotate-left ml-1 text-[10px] opacity-75"></i></button>
          </td>
          <td class="py-3 px-3 text-right font-bold text-blue-800 tabular-nums whitespace-nowrap">${rp(price - cost)}</td>
          <td class="py-3 px-3 text-center whitespace-nowrap">
            <div class="inline-flex items-center gap-1">${quickMove}${editBtns}</div>
          </td>`;
        tbody.appendChild(row);

        const card = document.createElement("div");
        card.className = "workspace-record";
        card.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="flex flex-col items-center gap-1 shrink-0"><input type="checkbox" data-qr-select="${id}" ${selectedQrQty.has(item.id) ? "checked" : ""} aria-label="Pilih ${esc(item.name)} untuk cetak QR" class="h-4 w-4 rounded border-slate-300 cursor-pointer">${selectedQrQty.has(item.id) ? `<input type="number" min="1" max="50" value="${selectedQrQty.get(item.id)}" data-qr-qty="${id}" title="Jumlah label QR" class="w-11 px-1 py-0.5 text-[11px] font-extrabold text-center border border-blue-300 rounded-md bg-blue-50">` : ""}</div>
            ${productImageMarkup(item, "w-14 h-14 rounded-2xl border border-slate-200 shrink-0", 140)}
            <div class="min-w-0 flex-1">
              <p class="font-extrabold break-words leading-snug">${esc(item.name)}</p>
              <p class="text-xs text-slate-500 mt-0.5"><span class="font-mono font-bold text-blue-800">${esc(item.code || "-")}</span> · ${esc(cat.label)} · ${status}</p>
            </div>
            <button type="button" data-stock-card="${id}" title="Lihat Kartu Stok" class="stock-indicator ${badge} shrink-0 cursor-pointer">${stock} Pcs</button>
          </div>
          <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-center">
            <div>Modal<br><strong class="tabular-nums">${rp(cost)}</strong></div>
            <div>Jual<br><strong class="tabular-nums text-emerald-800">${rp(price)}</strong></div>
            <div>Untung<br><strong class="tabular-nums text-blue-800">${rp(price - cost)}</strong></div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">${quickMove}${editBtns}</div>`;
        cards.appendChild(card);
      }
    }

    // ==================== RENDER: PENJUALAN ====================
    function reportSales() {
      const q = document.getElementById("searchInput").value.trim().toLocaleLowerCase("id");
      const payment = document.getElementById("filterPayment").value;
      return transactions.filter(tx => {
        if (currentViewMode === "day" && tx.date !== selectedDateStr) return false;
        if (payment !== "all" && (tx.paymentMethod || "Cash") !== payment) return false;
        return !q || (tx.items || []).some(i => String(i.name || "").toLocaleLowerCase("id").includes(q));
      }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    }

    function renderTransactions() {
      updatePosLiveStats();
      const rows = reportSales();
      let omset = 0, modal = 0, profit = 0, qty = 0;
      const pay = { Cash: [0, 0], QRIS: [0, 0], Kartu: [0, 0], Transfer: [0, 0] };
      for (const tx of rows) {
        omset += Number(tx.totalOmset || 0);
        modal += Number(tx.totalModal || 0);
        profit += Number(tx.totalProfit || 0);
        for (const it of tx.items || []) qty += Number(it.qty || 0);
        const m = tx.paymentMethod || "Cash";
        if (pay[m]) { pay[m][0]++; pay[m][1] += Number(tx.totalOmset || 0); }
      }
      document.getElementById("totalOmset").textContent = rp(omset);
      document.getElementById("totalModal").textContent = rp(modal);
      document.getElementById("totalUntung").textContent = rp(profit);
      document.getElementById("totalTerjual").textContent = qty + " Pcs";
      document.getElementById("totalTransaksi").textContent = rows.length + " Transaksi";
      document.getElementById("avgTransaksi").textContent = rp(rows.length ? Math.round(omset / rows.length) : 0);
      document.getElementById("grossMarginPct").textContent = omset > 0 ? (profit / omset * 100).toFixed(1).replace(".", ",") + "%" : "0%";
      document.getElementById("recordCountBadge").textContent = rows.length + " Transaksi";
      for (const [k, id] of [["Cash", "Cash"], ["QRIS", "Qris"], ["Kartu", "Card"], ["Transfer", "Transfer"]]) {
        document.getElementById("pay" + id).textContent = rp(pay[k][1]);
        document.getElementById("count" + id).textContent = pay[k][0] + "x";
      }
      document.getElementById("activeBookTitle").textContent = currentViewMode === "day"
        ? parseLocalDate(selectedDateStr).toLocaleDateString("id-ID", { dateStyle: "full" })
        : "Seluruh Catatan Penjualan";
      document.getElementById("activeBookBadge").textContent = currentViewMode === "day" ? "Buku Harian" : "Semua Hari";
      document.getElementById("emptyState").classList.toggle("hidden", rows.length > 0);

      const tbody = document.getElementById("transactionTableBody");
      const mobile = document.getElementById("transactionMobileList");
      tbody.innerHTML = "";
      mobile.innerHTML = "";
      const payBadgeStyle = {
        Cash: "bg-emerald-100 text-emerald-900 border border-emerald-200",
        QRIS: "bg-sky-100 text-sky-900 border border-sky-200",
        Kartu: "bg-amber-100 text-amber-900 border border-amber-200",
        Transfer: "bg-purple-100 text-purple-900 border border-purple-200"
      };
      for (const tx of rows) {
        const items = tx.items?.length ? tx.items : [{ name: "-", qty: 0, price: 0, subtotal: 0 }];
        const rs = items.length > 1 ? ` rowspan="${items.length}"` : "";
        const rawMethod = tx.paymentMethod || "Cash";
        const pm = esc(paymentMethodLabel(rawMethod));
        const pmClass = payBadgeStyle[rawMethod] || "bg-slate-100 text-slate-800";
        const id = esc(tx.id);
        const timeStr = formatWitaTime(tx.createdAt);
        const custParts = [];
        if (tx.customer && tx.customer !== "Pelanggan Umum") {
          custParts.push(`<span class="inline-block text-[11px] font-semibold text-slate-600"><i class="fa-regular fa-user mr-1"></i>${esc(tx.customer)}</span>`);
        }
        if (Number(tx.discount || 0) > 0) {
          custParts.push(`<span class="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold">Diskon -${rp(tx.discount)}</span>`);
        }
        if (tx.note) {
          custParts.push(`<span class="inline-block text-[11px] font-semibold text-blue-700"><i class="fa-regular fa-note-sticky mr-1"></i>${esc(tx.note)}</span>`);
        }
        const custBadge = custParts.length ? `<div class="mt-1 flex flex-wrap items-center gap-1.5">${custParts.join("")}</div>` : "";
        items.forEach((it, idx) => {
          const tr = document.createElement("tr");
          tr.className = "hover:bg-blue-50/60 border-b border-slate-100 transition-colors";
          tr.innerHTML = `
            ${idx === 0 ? `<td${rs} class="py-3 px-3 align-top whitespace-nowrap">
              <span class="inline-block px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[11px] font-bold">${esc(receiptNumber(tx))}</span>
              <div class="text-xs font-bold text-slate-700 mt-1">${esc(tx.date)}${timeStr ? ` <span class="text-slate-400 font-semibold">· ${esc(timeStr)}</span>` : ""}</div>
              ${custBadge}
            </td>` : ""}
            <td class="py-3 px-3 font-bold text-slate-900">${esc(cleanDisplayItemName(it.name))} <span class="inline-block ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-extrabold">${Number(it.qty || 0)}×</span>${(it.isCustom || !it.inventoryId) ? `<span class="inline-block ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold">Luar Stok</span>` : ""}</td>
            <td class="py-3 px-3 text-right tabular-nums text-slate-600">${rp(it.price)}</td>
            <td class="py-3 px-3 text-right font-extrabold text-slate-900 tabular-nums">${rp(it.subtotal ?? it.price * it.qty)}</td>
            ${idx === 0 ? `<td${rs} class="py-3 px-3 text-center align-middle"><span class="inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${pmClass}">${pm}</span></td>
            <td${rs} class="py-3 px-3 text-right align-middle tabular-nums text-slate-600">${rp(tx.totalModal)}</td>
            <td${rs} class="py-3 px-3 text-right align-middle font-extrabold text-emerald-700 tabular-nums">${rp(tx.totalProfit)}</td>
            <td${rs} class="py-3 px-3 text-center align-middle no-print">
              <div class="inline-flex items-center gap-1.5">
                <button type="button" data-receipt-tx="${id}" title="Lihat & cetak nota" class="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1"><i class="fa-solid fa-print"></i><span>Nota</span></button>
                ${isAdmin ? `<span class="h-5 w-px bg-slate-200 mx-0.5" aria-hidden="true"></span><button type="button" data-cancel-tx="${id}" title="Batalkan transaksi (butuh konfirmasi & alasan)" class="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 inline-flex items-center justify-center"><i class="fa-solid fa-ban"></i></button>` : ""}
              </div>
            </td>` : ""}`;
          tbody.appendChild(tr);
        });
        const card = document.createElement("div");
        card.className = "workspace-record";
        card.innerHTML = `
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <span class="inline-block px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[11px] font-bold">${esc(receiptNumber(tx))}</span>
              <span class="ml-1.5 text-xs font-bold text-slate-500">${esc(tx.date)}${timeStr ? " · " + esc(timeStr) : ""}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold ${pmClass}">${pm}</span>
          </div>
          ${custBadge}
          <div class="space-y-1.5">
            ${items.map(it => `<div class="flex justify-between gap-2 text-sm"><span class="font-bold text-slate-800">${esc(cleanDisplayItemName(it.name))} <span class="text-slate-500 font-semibold">${Number(it.qty || 0)}×</span></span><span class="font-extrabold tabular-nums">${rp(it.subtotal ?? it.price * it.qty)}</span></div>`).join("")}
          </div>
          <div class="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center text-xs">
            <div><span class="text-slate-500">Total</span><strong class="block text-slate-900 font-extrabold mt-0.5 tabular-nums">${rp(tx.totalOmset)}</strong></div>
            <div><span class="text-slate-500">Modal</span><strong class="block text-slate-700 font-bold mt-0.5 tabular-nums">${rp(tx.totalModal)}</strong></div>
            <div><span class="text-slate-500">Untung</span><strong class="block text-emerald-700 font-extrabold mt-0.5 tabular-nums">${rp(tx.totalProfit)}</strong></div>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" data-receipt-tx="${id}" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"><i class="fa-solid fa-print mr-1"></i>Lihat &amp; Cetak Nota</button>
            ${isAdmin ? `<button type="button" data-cancel-tx="${id}" class="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs">Batalkan</button>` : ""}
          </div>`;
        mobile.appendChild(card);
      }
      renderSalesCharts(rows);
    }

    // ==================== MESIN GRAFIS SVG FIGMA (100% TAJAM & ANTI-KOSONG) ====================
    function shortRpTick(v) {
      const n = Number(v) || 0;
      const abs = Math.abs(n);
      if (abs >= 1e9) return (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
      if (abs >= 1e6) return (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
      if (abs >= 1e3) return Math.round(n / 1e3).toLocaleString("id-ID") + " rb";
      return "Rp " + Math.round(n);
    }

    function buildUiKitProgressRows(rows, maxVal) {
      const mx = Math.max(1, Number(maxVal) || 1);
      return `<div class="space-y-2">` + rows.map(r => {
        const pct = Math.max(r.val > 0 ? 6 : 0, Math.min(100, Math.round((r.val / mx) * 100)));
        return `<div class="uikit-row">
          <div class="uikit-row-head">
            <span class="uikit-row-label">${esc(r.label)}</span>
            <span class="uikit-row-val">${esc(r.display || rp(r.val))}</span>
          </div>
          <div class="uikit-bar-track"><div class="uikit-bar-fill" style="width:${pct}%; background:${r.color}"></div></div>
        </div>`;
      }).join("") + `</div>`;
    }

    function buildRealMiniBarChart(items) {
      const mx = Math.max(1, ...items.map(i => Math.max(0, Number(i.val) || 0)));
      let peakIdx = 0;
      items.forEach((it, i) => { if ((it.val || 0) > (items[peakIdx].val || 0)) peakIdx = i; });
      return `<div class="grid gap-2 pt-3" style="grid-template-columns:repeat(${items.length},minmax(0,1fr))">` + items.map((it, i) => {
        const v = Math.max(0, Number(it.val) || 0);
        const pct = v > 0 ? Math.max(12, Math.round((v / mx) * 100)) : 0;
        const isPeak = i === peakIdx && v > 0;
        const fill = it.color || (isPeak ? "#1d4ed8" : "#93c5fd");
        return `<div class="flex flex-col items-center gap-1" title="${esc(it.tip || it.label)}">
          <span class="text-[10px] font-extrabold ${isPeak ? "text-blue-900" : "text-slate-500"} tabular-nums">${esc(it.top || "")}</span>
          <div class="w-full max-w-[34px] h-14 rounded-lg bg-slate-100 flex items-end p-0.5 overflow-hidden">
            <div class="w-full rounded-md transition-all" style="height:${pct}%; background:${fill}"></div>
          </div>
          <span class="text-[10px] font-bold ${isPeak ? "text-slate-900" : "text-slate-500"} truncate max-w-full">${esc(it.label)}</span>
        </div>`;
      }).join("") + `</div>`;
    }

    function buildUiKitSpectrumSvg(color1 = "#1d4ed8", color2 = "#facc15") {
      const heights = [18, 28, 22, 36, 44, 30, 40, 26, 48, 34, 24, 38, 20, 32];
      const bars = heights.map((h, i) => {
        const x = i * 8 + 2;
        const y = 50 - h;
        const fill = i === 8 ? color2 : (i % 3 === 0 ? "#93c5fd" : color1);
        return `<rect x="${x}" y="${y}" width="4.5" height="${h}" rx="2.25" fill="${fill}"/>`;
      }).join("");
      return `<svg viewBox="0 0 116 52" class="w-28 h-12 shrink-0" aria-hidden="true">${bars}</svg>`;
    }

    function buildSvgDonut(segments, centerTop, centerMain) {
      const total = segments.reduce((s, seg) => s + Math.max(0, Number(seg.value) || 0), 0);
      const cx = 92, cy = 84, r = 56;
      const circ = 2 * Math.PI * r;
      let offset = 0;
      const trackRing = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="11"/>`;
      const innerDash = `<circle cx="${cx}" cy="${cy}" r="${r - 13}" fill="none" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="2.5 3.5"/>`;
      const arcs = total > 0
        ? segments.filter(s => s.value > 0).map(seg => {
            const frac = seg.value / total;
            const len = Math.max(1, frac * circ - 4);
            const pct = Math.round(frac * 100);
            const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(seg.label)}: ${esc(seg.display || seg.value)} (${pct}%)</title></circle>`;
            offset += frac * circ;
            return el;
          }).join("")
        : "";

      const svg = `<svg viewBox="0 0 184 168" class="w-40 h-36 mx-auto shrink-0" role="img" aria-label="${esc(centerTop)} ${esc(centerMain)}">
        ${trackRing}${innerDash}
        <g transform="rotate(-90 ${cx} ${cy})">${arcs}</g>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="800" letter-spacing="0.06em">${esc(centerTop)}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#0f2557" font-size="16" font-weight="900">${esc(centerMain)}</text>
      </svg>`;

      const rows = `<div class="w-full space-y-2 pt-1">` + segments.map(seg => {
        const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
        return `<div class="uikit-row !py-1.5 !px-2.5">
          <div class="uikit-row-head">
            <span class="flex items-center gap-1.5 font-bold text-slate-700"><span class="w-2 h-2 rounded-full shrink-0" style="background:${seg.color}"></span>${esc(seg.label)}</span>
            <span class="font-extrabold text-slate-900 tabular-nums">${esc(seg.display || seg.value)} <span class="text-slate-400 font-bold">(${pct}%)</span></span>
          </div>
          <div class="uikit-bar-track !h-1.5"><div class="uikit-bar-fill" style="width:${pct}%; background:${seg.color}"></div></div>
        </div>`;
      }).join("") + `</div>`;

      return `${svg}${rows}`;
    }

    function buildKledoSpeedometerSvg(pct) {
      const p = Math.max(0, Math.min(100, Number(pct) || 0));
      const cx = 110, cy = 104, rIn = 64, rOut = 80;
      const totalTicks = 34;
      const startDeg = 140;
      const sweepDeg = 260;
      const activeTicks = Math.round((p / 100) * totalTicks);
      const ticks = [];
      for (let i = 0; i < totalTicks; i++) {
        const deg = startDeg + (i / (totalTicks - 1)) * sweepDeg;
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + rIn * Math.cos(rad), y1 = cy + rIn * Math.sin(rad);
        const x2 = cx + rOut * Math.cos(rad), y2 = cy + rOut * Math.sin(rad);
        const active = i < activeTicks;
        const color = active ? (i > totalTicks * 0.78 ? "#eab308" : "#1d4ed8") : "#e2e8f0";
        ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="4.2" stroke-linecap="round"/>`);
      }
      return `<svg viewBox="0 0 220 182" class="w-48 h-40 mx-auto">
        ${ticks.join("")}
        <text x="${cx}" y="${cy - 14}" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="700">Rasio Laba</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="#0f2557" font-size="30" font-weight="900">${p}%</text>
        <circle cx="${cx}" cy="${cy + 48}" r="14" fill="#1d4ed8"/>
        <text x="${cx}" y="${cy + 52}" text-anchor="middle" fill="#facc15" font-size="11" font-weight="900">%</text>
      </svg>`;
    }

    function buildSemiGaugeSvg(primaryPct, secondaryPct, primaryLabel, secondaryLabel) {
      const cx = 140, cy = 108, r = 74;
      const p1 = Math.max(0, Math.min(100, Number(primaryPct) || 0));
      const p2 = Math.max(0, Math.min(100, Number(secondaryPct) || 0));
      const startDeg = 165, sweepDeg = 210;
      const polar = deg => {
        const rad = (deg * Math.PI) / 180;
        return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
      };
      const arcD = (a0, a1) => {
        const [x1, y1] = polar(a0);
        const [x2, y2] = polar(a1);
        const large = (a1 - a0) > 180 ? 1 : 0;
        return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      };
      const activeEnd = startDeg + Math.max(2, (p1 / 100) * sweepDeg);
      const [kx, ky] = polar(activeEnd);
      return `<svg viewBox="0 0 280 168" class="w-full max-w-[270px] mx-auto">
        <circle cx="${cx}" cy="${cy}" r="${r - 14}" fill="none" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="3 4"/>
        <path d="${arcD(startDeg, startDeg + sweepDeg)}" fill="none" stroke="#f1f5f9" stroke-width="9" stroke-linecap="round"/>
        <path d="${arcD(startDeg, activeEnd)}" fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round"/>
        <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="7.5" fill="#ffffff" stroke="#1d4ed8" stroke-width="3.5"/>
        <text x="${cx}" y="${cy - 10}" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-weight="700">${esc(primaryLabel)}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="#0f2557" font-size="28" font-weight="900">${p1}%</text>
        <text x="${cx - 64}" y="${cy + 50}" text-anchor="middle" fill="#1d4ed8" font-size="10" font-weight="800">● ${esc(primaryLabel)} ${p1}%</text>
        <text x="${cx + 64}" y="${cy + 50}" text-anchor="middle" fill="#64748b" font-size="10" font-weight="700">● ${esc(secondaryLabel)} ${p2}%</text>
      </svg>`;
    }

    function buildSvgBarPairChart(items, dark = false) {
      const active = (items || []).filter(i => (Number(i.v1 || 0) > 0 || Number(i.v2 || 0) > 0));
      if (!active.length) {
        return `<p class="text-sm text-center py-10 text-slate-500">Belum ada transaksi penjualan pada bulan ini.</p>`;
      }
      const maxVal = Math.max(100000, ...active.map(i => Math.max(Number(i.v1 || 0), Number(i.v2 || 0))));
      const colW = active.length <= 8 ? 78 : active.length <= 15 ? 58 : 48;
      const padL = 56, padR = 20, padT = 34, padB = 34;
      const W = Math.max(540, padL + padR + active.length * colW);
      const H = 236;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const step = plotW / active.length;
      const barW = Math.max(12, Math.min(20, step * 0.30));
      const trackW = barW * 2 + 8;

      let peakIdx = 0;
      active.forEach((it, idx) => {
        if ((it.v1 || 0) > (active[peakIdx].v1 || 0)) peakIdx = idx;
      });

      const grids = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = (padT + plotH * (1 - f)).toFixed(1);
        const lbl = shortRpTick(maxVal * f);
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
                <text x="${padL - 8}" y="${Number(y) + 3.5}" text-anchor="end" fill="#64748b" font-size="10" font-weight="700">${esc(lbl)}</text>`;
      }).join("");

      const bars = active.map((it, idx) => {
        const cx = padL + idx * step + step / 2;
        const isPeak = idx === peakIdx;
        const v1 = Math.max(0, Number(it.v1 || 0));
        const v2 = Math.max(0, Number(it.v2 || 0));
        const h1 = Math.max(v1 > 0 ? 6 : 0, (v1 / maxVal) * plotH);
        const h2 = Math.max(v2 > 0 ? 6 : 0, (v2 / maxVal) * plotH);
        const y1 = padT + plotH - h1;
        const y2 = padT + plotH - h2;
        const tip = `Tanggal ${it.label}: Omzet ${rp(v1)} · Laba ${rp(v2)}`;
        const valBadge = isPeak
          ? `<rect x="${(cx - 32).toFixed(1)}" y="${Math.max(4, y1 - 24).toFixed(1)}" width="64" height="19" rx="6" fill="#0f2557"/><text x="${cx.toFixed(1)}" y="${Math.max(16.5, y1 - 11.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="800">${esc(shortRpTick(v1))}</text>`
          : `<text x="${cx.toFixed(1)}" y="${Math.max(14, y1 - 7).toFixed(1)}" text-anchor="middle" fill="#334155" font-size="9.5" font-weight="800">${esc(shortRpTick(v1))}</text>`;
        return `<g>
          <title>${esc(tip)}</title>
          <rect x="${(cx - trackW / 2).toFixed(1)}" y="${padT}" width="${trackW.toFixed(1)}" height="${plotH}" rx="8" fill="#f1f5f9"/>
          <rect x="${(cx - barW - 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${barW.toFixed(1)}" height="${h1.toFixed(1)}" rx="5" fill="${isPeak ? "#0f2557" : "#1d4ed8"}"/>
          <rect x="${(cx + 2).toFixed(1)}" y="${y2.toFixed(1)}" width="${barW.toFixed(1)}" height="${h2.toFixed(1)}" rx="5" fill="#eab308"/>
          ${valBadge}
          <text x="${cx.toFixed(1)}" y="${H - 11}" text-anchor="middle" fill="${isPeak ? "#0f2557" : "#475569"}" font-size="10.5" font-weight="${isPeak ? "900" : "700"}">Tgl ${esc(it.label)}</text>
        </g>`;
      }).join("");

      return `<div class="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 pb-2">
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#1d4ed8] inline-block"></span>Omzet Harian</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#eab308] inline-block"></span>Laba Penjualan</span>
        <span class="text-slate-400 font-semibold">(${active.length} hari aktif)</span>
      </div>
      <div class="w-full overflow-x-auto"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="max-w-full h-auto" style="min-width:${Math.min(W, 520)}px">${grids}${bars}</svg></div>`;
    }

    function buildSvgAreaTrend(points) {
      if (!points.length) return "";
      const maxVal = Math.max(100000, ...points.map(p => p.value));
      const W = 580, H = 228, padL = 54, padR = 26, padT = 36, padB = 32;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      let peakIdx = 0;
      const coords = points.map((p, i) => {
        const x = padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
        const y = padT + plotH - (Math.max(0, p.value) / maxVal) * plotH;
        if (p.value >= points[peakIdx].value) peakIdx = i;
        return { x, y, ...p };
      });
      let linePath = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const c0 = coords[i], c1 = coords[i + 1];
        const mx = ((c0.x + c1.x) / 2).toFixed(1);
        linePath += ` C${mx},${c0.y.toFixed(1)} ${mx},${c1.y.toFixed(1)} ${c1.x.toFixed(1)},${c1.y.toFixed(1)}`;
      }
      const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

      const grids = [0, 0.5, 1].map(f => {
        const y = (padT + plotH * (1 - f)).toFixed(1);
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>
                <text x="${padL - 8}" y="${Number(y) + 4}" text-anchor="end" fill="#94a3b8" font-size="10" font-weight="700">${esc(shortRpTick(maxVal * f))}</text>`;
      }).join("");

      const peak = coords[peakIdx];
      const peakBar = peak.value > 0
        ? `<rect x="${(peak.x - 8).toFixed(1)}" y="${peak.y.toFixed(1)}" width="16" height="${Math.max(0, padT + plotH - peak.y).toFixed(1)}" rx="8" fill="url(#sjsPeakBarGrad)"/>`
        : "";

      const dots = coords.map((c, idx) => {
        const isPeak = idx === peakIdx && c.value > 0;
        const lblPill = isPeak
          ? `<rect x="${(c.x - 34).toFixed(1)}" y="${Math.max(4, c.y - 29).toFixed(1)}" width="68" height="20" rx="6" fill="#1d4ed8"/><text x="${c.x.toFixed(1)}" y="${Math.max(17, c.y - 16).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="800">${esc(shortRpTick(c.value))}</text>`
          : `<text x="${c.x.toFixed(1)}" y="${(c.y - 11).toFixed(1)}" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="700">${esc(shortRpTick(c.value))}</text>`;
        return `<g>
          <title>${esc(c.label)}: ${esc(rp(c.value))}</title>
          <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isPeak ? "6" : "4"}" fill="#ffffff" stroke="${isPeak ? "#1d4ed8" : "#60a5fa"}" stroke-width="${isPeak ? "3" : "2"}"/>
          ${lblPill}
          <text x="${c.x.toFixed(1)}" y="${H - 10}" text-anchor="middle" fill="${isPeak ? "#0f2557" : "#94a3b8"}" font-size="10.5" font-weight="${isPeak ? "900" : "700"}">${esc(c.label)}</text>
        </g>`;
      }).join("");

      return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-56">
        <defs>
          <linearGradient id="sjsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="sjsPeakBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.03"/>
          </linearGradient>
        </defs>
        ${grids}
        <path d="${areaPath}" fill="url(#sjsAreaGrad)"/>
        ${peakBar}
        <path d="${linePath}" fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>`;
    }

    const charts = {};
    function renderSalesCharts(rows) {
      if (!isAdmin) return;
      const titleEl = document.getElementById("salesTrendChartTitle");
      const badgeEl = document.getElementById("badgeSalesTrend");
      if (titleEl) titleEl.textContent = currentViewMode === "day" ? "Produk Paling Untung Hari Ini" : "Produk Paling Untung (Semua Hari)";

      let totalOmzetRows = 0, totalLabaRows = 0, totalPcs = 0;
      const pay = { Cash: 0, QRIS: 0, Kartu: 0, Transfer: 0 };
      const prodMap = new Map();
      for (const tx of rows) {
        totalOmzetRows += Number(tx.totalOmset || 0);
        totalLabaRows += Number(tx.totalProfit || 0);
        const m = tx.paymentMethod || "Cash";
        if (m in pay) pay[m] += Number(tx.totalOmset || 0);
        for (const it of (tx.items || [])) {
          const q = Number(it.qty || 0);
          totalPcs += q;
          const key = cleanDisplayItemName(it.name);
          const cur = prodMap.get(key) || { omset: 0, cost: 0, profit: 0, qty: 0 };
          const itemOmzet = Number(it.subtotal ?? Number(it.price || 0) * q);
          const itemCost = Number(it.cost || 0) * q;
          cur.omset += itemOmzet;
          cur.cost += itemCost;
          cur.profit += (itemOmzet - itemCost);
          cur.qty += q;
          prodMap.set(key, cur);
        }
      }
      const totalModalRows = Math.max(0, totalOmzetRows - totalLabaRows);
      const sProfPct = totalOmzetRows > 0 ? Math.round((totalLabaRows / totalOmzetRows) * 100) : 0;
      const kMb = document.getElementById("kledoMarginBadge");
      const kCb = document.getElementById("kledoCostPctBadge");
      const kSp = document.getElementById("kledoSpeedometerWrap");
      const kSn = document.getElementById("kledoSpeedometerNote");
      // Hitung perbandingan nyata: vs kemarin (mode harian) atau bulan ini vs bulan lalu (mode semua hari)
      let prevOmzet = 0, prevLaba = 0, vsLabel = "vs kemarin";
      let labaVs = "vs kemarin";
      if (currentViewMode === "day" && selectedDateStr) {
        const prevDt = parseLocalDate(selectedDateStr);
        prevDt.setDate(prevDt.getDate() - 1);
        const prevStr = prevDt.getFullYear() + "-" + String(prevDt.getMonth() + 1).padStart(2, "0") + "-" + String(prevDt.getDate()).padStart(2, "0");
        const isTodayRunning = selectedDateStr === todayStr();
        const getWitaHM = iso => {
          try {
            const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
            return parts;
          } catch { return ""; }
        };
        const nowHM = getWitaHM(new Date().toISOString());
        const prevAll = transactions.filter(t => t.date === prevStr);
        const prevRows = isTodayRunning && nowHM
          ? prevAll.filter(t => { const hm = t.createdAt ? getWitaHM(t.createdAt) : ""; return !hm || hm <= nowHM; })
          : prevAll;
        prevOmzet = prevRows.reduce((s, t) => s + Number(t.totalOmset || 0), 0);
        prevLaba = prevRows.reduce((s, t) => s + Number(t.totalProfit || 0), 0);
        const suffix = isTodayRunning && nowHM ? ` s.d. ${nowHM} (hari berjalan)` : "";
        vsLabel = `vs ${prevStr.slice(5)}${suffix} (${shortRpTick(prevOmzet)})`;
        labaVs = `vs kemarin${suffix} (${shortRpTick(prevLaba)})`;
      } else {
        const curM = todayStr().slice(0, 7);
        const dtM = new Date(Number(curM.slice(0, 4)), Number(curM.slice(5, 7)) - 2, 1);
        const prevM = dtM.getFullYear() + "-" + String(dtM.getMonth() + 1).padStart(2, "0");
        const curRows = transactions.filter(t => String(t.date || "").startsWith(curM + "-"));
        const prevRows = transactions.filter(t => String(t.date || "").startsWith(prevM + "-"));
        const curMOmzet = curRows.reduce((s, t) => s + Number(t.totalOmset || 0), 0);
        const curMLaba = curRows.reduce((s, t) => s + Number(t.totalProfit || 0), 0);
        prevOmzet = prevRows.reduce((s, t) => s + Number(t.totalOmset || 0), 0);
        prevLaba = prevRows.reduce((s, t) => s + Number(t.totalProfit || 0), 0);
        vsLabel = `bln ini vs ${prevM.slice(5)}`;
        totalOmzetRows = currentViewMode === "all" ? totalOmzetRows : curMOmzet;
      }
      const applyTrend = (iconId, pctId, vsId, curVal, prevVal, vsText) => {
        const ic = document.getElementById(iconId);
        const pc = document.getElementById(pctId);
        const vs = document.getElementById(vsId);
        if (vs) vs.textContent = vsText;
        if (prevVal <= 0) {
          if (ic) ic.className = curVal > 0 ? "fa-solid fa-arrow-trend-up text-emerald-600 text-3xl" : "fa-solid fa-minus text-slate-400 text-2xl";
          if (pc) { pc.textContent = curVal > 0 ? "Baru" : "0%"; pc.className = "block text-xs font-extrabold mt-0.5 " + (curVal > 0 ? "text-emerald-600" : "text-slate-500"); }
          return;
        }
        const diffPct = Math.round(((curVal - prevVal) / prevVal) * 100);
        const up = diffPct >= 0;
        if (ic) ic.className = up ? "fa-solid fa-arrow-trend-up text-emerald-600 text-3xl" : "fa-solid fa-arrow-trend-down text-rose-600 text-3xl";
        if (pc) {
          pc.textContent = (up ? "+" : "") + diffPct + "%";
          pc.className = "block text-xs font-extrabold mt-0.5 " + (up ? "text-emerald-600" : "text-rose-600");
        }
      };
      applyTrend("kledoSalesTrendIcon", "kledoSalesTrendPct", "kledoSalesTrendVs", totalOmzetRows, prevOmzet, vsLabel);
      if (currentViewMode !== "day") labaVs = vsLabel;
      applyTrend("kledoLabaTrendIcon", "kledoMarginBadge", "kledoLabaTrendVs", totalLabaRows, prevLaba, labaVs);
      if (kCb) kCb.textContent = (totalOmzetRows > 0 ? Math.max(0, 100 - sProfPct) : 0) + "%";
      const sCostPct = totalOmzetRows > 0 ? Math.max(0, 100 - sProfPct) : 0;
      if (badgeEl) badgeEl.textContent = `Laba ${rp(totalLabaRows)}`;

      // Pelanggan / Nota Terbesar (pengganti Speedometer duplikat)
      const custWrap = document.getElementById("topCustomersSalesWrap");
      const custNote = document.getElementById("topCustomersSalesNote");
      const custBadge = document.getElementById("badgeTopCustomersSales");
      if (custWrap) {
        const namedMap = new Map();
        for (const tx of rows) {
          const c = String(tx.customer || "").trim();
          if (c && c !== "Pelanggan Umum") {
            const cur = namedMap.get(c) || { total: 0, cnt: 0 };
            cur.total += Number(tx.totalOmset || 0);
            cur.cnt += 1;
            namedMap.set(c, cur);
          }
        }
        if (namedMap.size > 0) {
          const topCust = [...namedMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 4);
          if (custBadge) custBadge.textContent = `${topCust.length} Pelanggan`;
          if (custNote) custNote.textContent = "Pembeli tercatat terbesar pada periode ini";
          custWrap.innerHTML = topCust.map(([name, v], i) => `
            <div class="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
              <span class="font-bold text-slate-800 truncate" title="${esc(name)}">${i + 1}. ${esc(name)} <span class="text-[10px] text-slate-400">(${v.cnt}x)</span></span>
              <strong class="font-extrabold text-blue-900 tabular-nums shrink-0">${esc(shortRpTick(v.total))}</strong>
            </div>`).join("");
        } else if (rows.length > 0) {
          const topTx = rows.slice().sort((a, b) => Number(b.totalOmset || 0) - Number(a.totalOmset || 0)).slice(0, 4);
          if (custBadge) custBadge.textContent = `Top ${topTx.length} Nota`;
          if (custNote) custNote.textContent = "Isi nama pelanggan di Kasir untuk lacak pelanggan terbesar";
          custWrap.innerHTML = topTx.map((tx, i) => `
            <div class="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
              <span class="font-bold text-slate-700 truncate"><span class="font-mono text-[11px] text-slate-900">${esc(receiptNumber(tx))}</span> · ${esc(paymentMethodLabel(tx.paymentMethod || "Cash"))}</span>
              <strong class="font-extrabold text-blue-900 tabular-nums shrink-0">${esc(shortRpTick(tx.totalOmset))}</strong>
            </div>`).join("");
        } else {
          if (custBadge) custBadge.textContent = "Kosong";
          custWrap.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Belum ada transaksi</p>`;
        }
      }

      // 1. Produk Paling Untung & Margin Tertinggi (pengganti Gauge Rasio Laba duplikat)
      const gaugeWrap = document.getElementById("svgSalesGaugeWrap");
      if (gaugeWrap) {
        const topProfitProds = [...prodMap.entries()]
          .map(([name, v]) => ({ name, ...v, marginPct: v.omset > 0 ? Math.round((v.profit / v.omset) * 100) : 0 }))
          .sort((a, b) => b.profit - a.profit || b.marginPct - a.marginPct)
          .slice(0, 8);
        if (!topProfitProds.length) {
          gaugeWrap.innerHTML = `<p class="text-sm text-slate-500 py-8 text-center">Belum ada transaksi pada periode ini.</p>`;
        } else {
          const maxP = Math.max(1, topProfitProds[0].profit);
          gaugeWrap.innerHTML = `
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500">
                  <th class="py-2 pr-2">Produk</th>
                  <th class="py-2 px-2 text-right">Qty</th>
                  <th class="py-2 px-2 text-right">Omzet</th>
                  <th class="py-2 px-2 text-right">Untung</th>
                  <th class="py-2 pl-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">${topProfitProds.map((p, idx) => {
                const wPct = Math.max(8, Math.round((Math.max(0, p.profit) / maxP) * 100));
                const mCls = p.marginPct >= 30 ? "bg-emerald-100 text-emerald-800" : p.marginPct >= 15 ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800";
                return `<tr>
                  <td class="py-2 pr-2">
                    <span class="font-bold text-slate-900 block leading-snug">${idx + 1}. ${esc(p.name)}</span>
                    <div class="w-full h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div style="width:${wPct}%;background:${idx === 0 ? "#0f2557" : idx === 1 ? "#1d4ed8" : "#3b82f6"}" class="h-full rounded-full"></div></div>
                  </td>
                  <td class="py-2 px-2 text-right tabular-nums text-slate-600 whitespace-nowrap">${p.qty} pcs</td>
                  <td class="py-2 px-2 text-right tabular-nums text-slate-600 whitespace-nowrap">${esc(shortRpTick(p.omset))}</td>
                  <td class="py-2 px-2 text-right tabular-nums font-extrabold text-emerald-700 whitespace-nowrap">${rp(p.profit)}</td>
                  <td class="py-2 pl-2 text-right whitespace-nowrap"><span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold ${mCls}">${p.marginPct}%</span></td>
                </tr>`;
              }).join("")}</tbody>
            </table>`;
        }
      }

      // 2. Bento Pastel Hero Card in Penjualan
      const heroCard = document.getElementById("bentoSalesHeroCard");
      if (heroCard) {
        const avgBasket = rows.length > 0 ? Math.round(totalOmzetRows / rows.length) : 0;
        const avgPcs = rows.length > 0 ? (totalPcs / rows.length).toFixed(1).replace(".", ",") : "0";
        const pcsPerTx = rows.map(tx => (tx.items || []).reduce((s, it) => s + Number(it.qty || 0), 0)).sort((a, b) => a - b);
        const midIdx = Math.floor(pcsPerTx.length / 2);
        const medPcs = pcsPerTx.length ? (pcsPerTx.length % 2 ? pcsPerTx[midIdx] : (pcsPerTx[midIdx - 1] + pcsPerTx[midIdx]) / 2) : 0;
        const maxTxPcs = pcsPerTx.length ? pcsPerTx[pcsPerTx.length - 1] : 0;
        const pcsLabel = (pcsPerTx.length >= 3 && medPcs > 0 && maxTxPcs >= medPcs * 3)
          ? `${avgPcs} pcs/nota (median ${String(medPcs).replace(".", ",")})`
          : `${avgPcs} pcs/nota`;
        const hours = Array.from({ length: 14 }, (_, i) => ({
          h: i + 8,
          label: String(i + 8).padStart(2, "0"),
          val: 0,
          cnt: 0
        }));
        for (const tx of rows) {
          let h = 12;
          if (tx.createdAt) {
            try {
              h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Makassar", hour: "2-digit", hour12: false }).format(new Date(tx.createdAt))) % 24;
            } catch {}
          }
          const clamped = Math.max(8, Math.min(21, h));
          hours[clamped - 8].val += Number(tx.totalOmset || 0);
          hours[clamped - 8].cnt += 1;
        }
        const byOmset = hourlyChartMetric !== "nota";
        const topRevHours = hours.filter(x => x.val > 0).slice().sort((a, b) => b.val - a.val || b.cnt - a.cnt);
        const maxCnt = Math.max(0, ...hours.map(x => x.cnt));
        const maxVal = Math.max(0, ...hours.map(x => x.val));
        const tiedTopCnt = hours.filter(x => x.cnt === maxCnt && maxCnt > 0);
        const hasDominantCnt = maxCnt >= 2 && tiedTopCnt.length === 1;
        const peakHr = byOmset
          ? (topRevHours.length ? topRevHours[0] : null)
          : (hasDominantCnt ? tiedTopCnt[0] : null);
        const mxMetric = Math.max(1, byOmset ? maxVal : maxCnt);
        const peakNote = maxCnt === 0
          ? "Belum ada transaksi"
          : byOmset
            ? `Omzet tertinggi: ${peakHr.label}.00 WITA (${shortRpTick(peakHr.val)})`
            : hasDominantCnt
              ? `Paling ramai: ${peakHr.label}.00 WITA (${peakHr.cnt} nota)`
              : "Belum ada jam dominan (seri)";
        const chartHtml = `<div class="grid gap-1 pt-2.5" style="grid-template-columns:repeat(14,minmax(0,1fr))">` + hours.map(x => {
          const curM = byOmset ? x.val : x.cnt;
          const pct = curM > 0 ? Math.max(18, Math.round((curM / mxMetric) * 100)) : 0;
          const isPeak = Boolean(peakHr && x.h === peakHr.h);
          const fill = isPeak ? "#0f2557" : (curM > 0 ? (byOmset ? "#eab308" : "#1d4ed8") : "transparent");
          const topLbl = curM > 0 ? (byOmset ? shortRpTick(x.val).replace("Rp ", "").replace(" rb", "k").replace(" jt", "jt") : String(x.cnt)) : "";
          return `<div class="flex flex-col items-center gap-0.5" title="Jam ${x.label}.00–${x.label}.59 WITA: ${rp(x.val)} (${x.cnt} nota)">
            <span class="text-[8.5px] font-extrabold ${isPeak ? "text-blue-900" : "text-slate-400"} tabular-nums truncate max-w-full">${esc(topLbl)}</span>
            <div class="w-full h-14 rounded-md bg-slate-100 flex items-end p-[2px] overflow-hidden">
              <div class="w-full rounded-[4px]" style="height:${pct}%; background:${fill}"></div>
            </div>
            <span class="text-[9px] font-bold ${isPeak ? "text-blue-900" : "text-slate-500"} tabular-nums">${x.label}</span>
          </div>`;
        }).join("") + `</div>`;
        const top3RevHtml = topRevHours.length
          ? `<div class="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span class="font-extrabold text-slate-500">Top Jam Omzet:</span>
              ${topRevHours.slice(0, 3).map((x, idx) => `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold ${idx === 0 ? "bg-blue-900 text-white" : "bg-amber-50 text-amber-900 border border-amber-200"}">${x.label}:00 · ${esc(shortRpTick(x.val))}</span>`).join("")}
            </div>`
          : "";
        heroCard.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-wider text-blue-900">Jam Paling Menghasilkan (08–21 WITA)</span>
              <p class="text-2xl font-black text-slate-950 tracking-tight mt-1 tabular-nums">${rp(avgBasket)} <span class="text-xs font-bold text-slate-500">/ nota</span></p>
              <span class="text-[11px] font-bold text-slate-600">${pcsLabel} · ${peakNote}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-hour-metric="omset" class="px-2 py-1 rounded-full text-[10px] font-extrabold border ${byOmset ? "bg-blue-900 text-white border-blue-900" : "bg-white text-slate-600 border-slate-200"}">Omzet</button>
              <button type="button" data-hour-metric="nota" class="px-2 py-1 rounded-full text-[10px] font-extrabold border ${!byOmset ? "bg-blue-900 text-white border-blue-900" : "bg-white text-slate-600 border-slate-200"}">Nota</button>
            </div>
          </div>
          ${chartHtml}${top3RevHtml}`;
        heroCard.querySelectorAll("[data-hour-metric]").forEach(btn => {
          btn.addEventListener("click", () => {
            hourlyChartMetric = btn.dataset.hourMetric === "nota" ? "nota" : "omset";
            localStorage.setItem("sjs-hourly-metric", hourlyChartMetric);
            renderSalesCharts(rows);
          });
        });
      }

      // 3. Ring Donut Cara Bayar with Floating % Pills
      const payWrap = document.getElementById("svgSalesPayDonutWrap");
      if (payWrap) {
        payWrap.innerHTML = buildSvgDonut([
          { label: "Tunai", value: pay.Cash, color: "#1d4ed8", display: rp(pay.Cash) },
          { label: "QRIS", value: pay.QRIS, color: "#38bdf8", display: rp(pay.QRIS) },
          { label: "Kartu", value: pay.Kartu, color: "#facc15", display: rp(pay.Kartu) },
          { label: "Transfer", value: pay.Transfer, color: "#0f2557", display: rp(pay.Transfer) }
        ], "OMZET", shortRpTick(totalOmzetRows));
      }

      // 4. Update Sales Ratio Card
      const sCostEl = document.getElementById("salesSegCost");
      const sProfEl = document.getElementById("salesSegProfit");
      if (sCostEl) sCostEl.style.width = sCostPct + "%";
      if (sProfEl) sProfEl.style.width = sProfPct + "%";
      const sHead = document.getElementById("salesRatioHeadline");
      if (sHead) sHead.textContent = totalOmzetRows > 0 ? `Dari ${rp(totalOmzetRows)} omzet, ${sProfPct}% adalah laba` : "Belum ada transaksi";
      const sLC = document.getElementById("salesLegendCost");
      const sLP = document.getElementById("salesLegendProfit");
      if (sLC) sLC.textContent = `${rp(totalModalRows)} (${sCostPct}%)`;
      if (sLP) sLP.textContent = `${rp(totalLabaRows)} (${sProfPct}%)`;

      // 5. Top 5 Barang Terlaris (Pilih Urut Qty atau Omzet + Chips & Bars konsisten)
      const byQty = topProductsSortMode !== "omset";
      const top5 = [...prodMap.entries()]
        .sort((a, b) => byQty ? (b[1].qty - a[1].qty || b[1].omset - a[1].omset) : (b[1].omset - a[1].omset || b[1].qty - a[1].qty))
        .slice(0, 5);
      const topBadge = document.getElementById("badgeTopProducts");
      if (topBadge) topBadge.textContent = top5.length ? `${top5.length} Terlaris (${byQty ? "Qty" : "Omzet"})` : "Kosong";
      const topWrap = document.getElementById("svgTopProductsWrap");
      if (topWrap) {
        const sortToggle = `<div class="flex items-center justify-end gap-1.5 pb-2">
          <button type="button" data-top-prod-sort="qty" class="px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${byQty ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}">Urut Qty</button>
          <button type="button" data-top-prod-sort="omset" class="px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${!byQty ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}">Urut Omzet</button>
        </div>`;
        if (!top5.length) {
          topWrap.innerHTML = `<p class="text-sm text-slate-500 py-8 text-center">Belum ada transaksi pada periode ini.</p>`;
        } else {
          const maxTop = byQty ? (top5[0]?.[1]?.qty || 1) : (top5[0]?.[1]?.omset || 1);
          const chips = top5.map(([n, v]) =>
            `<span class="bento-trending-chip"><span class="truncate max-w-[160px]">${esc(n)}</span><span class="bento-trending-badge">${v.qty}x</span></span>`
          ).join("");
          const bars = buildUiKitProgressRows(top5.map(([name, v], idx) => ({
            label: `${idx + 1}. ${name}`,
            val: byQty ? v.qty : v.omset,
            display: byQty ? `${v.qty} pcs · ${rp(v.omset)}` : `${rp(v.omset)} · ${v.qty} pcs`,
            color: idx === 0 ? "#0f2557" : idx === 1 ? "#1d4ed8" : idx === 2 ? "#3b82f6" : "#eab308"
          })), maxTop);
          topWrap.innerHTML = `${sortToggle}<div class="flex flex-wrap gap-2 pb-1">${chips}</div>${bars}`;
          topWrap.querySelectorAll("[data-top-prod-sort]").forEach(btn => {
            btn.addEventListener("click", () => {
              topProductsSortMode = btn.dataset.topProdSort === "omset" ? "omset" : "qty";
              localStorage.setItem("sjs-top-prod-sort", topProductsSortMode);
              renderSalesCharts(rows);
            });
          });
        }
      }
    }

    function buildWaterfallValueSvg(modalVal, labaVal, jualVal) {
      const mx = Math.max(1000, jualVal, modalVal + labaVal);
      const W = 280, H = 132, padT = 22, padB = 24, plotH = H - padT - padB;
      const hModal = Math.max(8, (modalVal / mx) * plotH);
      const hLaba = Math.max(6, (labaVal / mx) * plotH);
      const hJual = Math.max(10, (jualVal / mx) * plotH);
      const yModal = padT + plotH - hModal;
      const yLaba = Math.max(padT, yModal - hLaba);
      const yJual = padT + plotH - hJual;
      return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-32 mt-2">
        <line x1="20" y1="${padT + plotH}" x2="${W - 20}" y2="${padT + plotH}" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="68" y1="${yModal.toFixed(1)}" x2="112" y2="${yModal.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 2" stroke-width="1.2"/>
        <line x1="168" y1="${yLaba.toFixed(1)}" x2="212" y2="${yLaba.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 2" stroke-width="1.2"/>

        <rect x="28" y="${yModal.toFixed(1)}" width="44" height="${hModal.toFixed(1)}" rx="6" fill="#64748b"/>
        <text x="50" y="${Math.max(12, yModal - 6).toFixed(1)}" text-anchor="middle" fill="#334155" font-size="9.5" font-weight="800">${esc(shortRpTick(modalVal))}</text>
        <text x="50" y="${H - 7}" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="800">Modal</text>

        <rect x="118" y="${yLaba.toFixed(1)}" width="44" height="${hLaba.toFixed(1)}" rx="6" fill="#eab308"/>
        <text x="140" y="${Math.max(12, yLaba - 6).toFixed(1)}" text-anchor="middle" fill="#b45309" font-size="9.5" font-weight="900">+${esc(shortRpTick(labaVal))}</text>
        <text x="140" y="${H - 7}" text-anchor="middle" fill="#b45309" font-size="9.5" font-weight="800">Est. Laba</text>

        <rect x="208" y="${yJual.toFixed(1)}" width="44" height="${hJual.toFixed(1)}" rx="6" fill="#1d4ed8"/>
        <text x="230" y="${Math.max(12, yJual - 6).toFixed(1)}" text-anchor="middle" fill="#0f2557" font-size="9.5" font-weight="900">${esc(shortRpTick(jualVal))}</text>
        <text x="230" y="${H - 7}" text-anchor="middle" fill="#0f2557" font-size="9.5" font-weight="800">Potensi Jual</text>
      </svg>`;
    }

    function renderQrActivityChart() {
      const wrap = document.getElementById("svgQrActivityWrap");
      const badge = document.getElementById("badgeQrTodayCount");
      if (!wrap) return;
      let log = {};
      try { log = JSON.parse(localStorage.getItem(QR_ACTIVITY_KEY) || "{}"); } catch {}
      const days = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date();
        dt.setDate(dt.getDate() - (6 - i));
        const ds = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
        const rec = log[ds] || { ok: 0, fail: 0, in: 0, out: 0 };
        const total = (rec.ok || 0) + (rec.fail || 0);
        return { ds, label: ds.slice(8, 10) + "/" + ds.slice(5, 7), value: total, ...rec };
      });
      const todayRec = days[days.length - 1];
      if (badge) badge.textContent = `${todayRec.value} Scan Hari Ini`;
      const maxVal = Math.max(5, ...days.map(d => d.value));
      const W = 340, H = 148, padL = 28, padR = 14, padT = 22, padB = 26;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const coords = days.map((d, i) => ({
        x: padL + (i / (days.length - 1)) * plotW,
        y: padT + plotH - (d.value / maxVal) * plotH,
        ...d
      }));
      let linePath = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const c0 = coords[i], c1 = coords[i + 1];
        const mx = ((c0.x + c1.x) / 2).toFixed(1);
        linePath += ` C${mx},${c0.y.toFixed(1)} ${mx},${c1.y.toFixed(1)} ${c1.x.toFixed(1)},${c1.y.toFixed(1)}`;
      }
      const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;
      const grids = [0, 0.5, 1].map(f => {
        const y = (padT + plotH * (1 - f)).toFixed(1);
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>
                <text x="${padL - 5}" y="${Number(y) + 3.5}" text-anchor="end" fill="#94a3b8" font-size="9" font-weight="700">${Math.round(maxVal * f)}</text>`;
      }).join("");
      const dots = coords.map(c => `<g><title>${esc(c.label)}: ${c.value} scan (${c.ok} berhasil, ${c.fail} gagal)</title>
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#ffffff" stroke="#1d4ed8" stroke-width="2.2"/>
        <text x="${c.x.toFixed(1)}" y="${(c.y - 8).toFixed(1)}" text-anchor="middle" fill="#0f2557" font-size="9" font-weight="800">${c.value}</text>
        <text x="${c.x.toFixed(1)}" y="${H - 7}" text-anchor="middle" fill="#64748b" font-size="9" font-weight="700">${esc(c.label)}</text>
      </g>`).join("");
      const svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-36">
        <defs><linearGradient id="qrLineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.22"/><stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.01"/></linearGradient></defs>
        ${grids}<path d="${areaPath}" fill="url(#qrLineGrad)"/><path d="${linePath}" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>${dots}
      </svg>`;
      wrap.innerHTML = `${svg}
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="uikit-row !py-1.5 !px-2.5"><div class="uikit-row-head"><span class="uikit-row-label">Scan Berhasil</span><span class="uikit-row-val text-emerald-700">${todayRec.ok}x</span></div></div>
          <div class="uikit-row !py-1.5 !px-2.5"><div class="uikit-row-head"><span class="uikit-row-label">Scan Gagal</span><span class="uikit-row-val text-rose-700">${todayRec.fail}x</span></div></div>
          <div class="uikit-row !py-1.5 !px-2.5"><div class="uikit-row-head"><span class="uikit-row-label">Barang Masuk</span><span class="uikit-row-val text-blue-700">${todayRec.in}x</span></div></div>
          <div class="uikit-row !py-1.5 !px-2.5"><div class="uikit-row-head"><span class="uikit-row-label">Barang Keluar</span><span class="uikit-row-val text-amber-700">${todayRec.out}x</span></div></div>
        </div>`;
    }

    function renderInventoryCharts() {
      if (!isAdmin) return;
      const active = activeInventory();
      const catStats = {
        "Badminton": { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 },
        "Futsal & Bola": { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 },
        "Catur": { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 },
        "Musik": { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 },
        "Olahraga Lainnya": { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 }
      };
      let okCount = 0, lowCount = 0, outCount = 0, totalCost = 0;
      const urgentItems = [];
      for (const item of active) {
        const st = Math.max(0, Number(item.stock || 0));
        const valCost = st * Number(item.cost || 0);
        const valSell = st * Number(item.price || 0);
        totalCost += valCost;
        const lbl = detectProductCategoryLabel(item).label;
        const mapKey = lbl === "Olahraga" ? "Olahraga Lainnya" : lbl;
        if (!catStats[mapKey]) catStats[mapKey] = { cost: 0, sell: 0, profit: 0, ok: 0, low: 0, out: 0 };
        catStats[mapKey].cost += valCost;
        catStats[mapKey].sell += valSell;
        catStats[mapKey].profit += Math.max(0, valSell - valCost);
        if (st <= 0) { outCount++; catStats[mapKey].out++; urgentItems.push(item); }
        else if (st < LOW_STOCK_LIMIT) { lowCount++; catStats[mapKey].low++; urgentItems.push(item); }
        else { okCount++; catStats[mapKey].ok++; }
      }
      const catBadge = document.getElementById("badgeStockCatTotal");
      if (catBadge) catBadge.textContent = `Modal ${shortRpTick(totalCost)}`;

      // Baris 2 Kiri: Status Stok per Kategori (Stacked Bar: Aman / Menipis / Habis + Modal)
      const okPct = active.length > 0 ? Math.round((okCount / active.length) * 100) : 0;
      const catWrap = document.getElementById("svgStockCatWrap");
      if (catWrap) {
        const sortedCats = Object.entries(catStats).sort((a, b) => (b[1].out + b[1].low) - (a[1].out + a[1].low) || b[1].cost - a[1].cost);
        catWrap.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
            <span class="text-xs font-bold text-slate-500">Diurutkan dari kategori yang paling butuh perhatian restok</span>
            <div class="flex items-center gap-3 text-[11px] font-bold text-slate-600">
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]"></span>Aman (stok &ge;5)</span>
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span>Menipis (stok 1–4)</span>
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-[#e11d48]"></span>Habis (stok 0)</span>
            </div>
          </div>
          ${sortedCats.map(([k, v]) => {
            const tot = Math.max(1, v.ok + v.low + v.out);
            const wOk = (v.ok / tot) * 100;
            const wLow = (v.low / tot) * 100;
            const wOut = (v.out / tot) * 100;
            return `<div class="uikit-row">
              <div class="uikit-row-head">
                <span class="uikit-row-label">${esc(k)} <span class="text-slate-400 font-semibold">· Modal ${shortRpTick(v.cost)}</span></span>
                <span class="text-xs font-extrabold text-slate-800 tabular-nums shrink-0">${v.ok} aman · <span class="text-amber-700">${v.low} menipis</span> · <span class="text-rose-700">${v.out} habis</span></span>
              </div>
              <div class="w-full h-3.5 rounded-full bg-slate-200 overflow-hidden flex gap-px">
                ${v.ok > 0 ? `<div style="flex:${v.ok} 0 0%;min-width:6px;background:#1d4ed8" title="${v.ok} aman (${Math.round(wOk)}%)"></div>` : ""}
                ${v.low > 0 ? `<div style="flex:${v.low} 0 0%;min-width:6px;background:#eab308" title="${v.low} menipis (${Math.round(wLow)}%)"></div>` : ""}
                ${v.out > 0 ? `<div style="flex:${v.out} 0 0%;min-width:6px;background:#e11d48" title="${v.out} habis (${Math.round(wOut)}%)"></div>` : ""}
              </div>
            </div>`;
          }).join("")}`;
      }

      // Baris 2 Kanan: Donut Kesehatan Stok
      const healthWrap = document.getElementById("svgStockHealthWrap");
      if (healthWrap) {
        healthWrap.innerHTML = buildSvgDonut([
          { label: "Stok Aman (≥5)", value: okCount, color: "#1d4ed8", display: `${okCount} item` },
          { label: "Menipis (1–4)", value: lowCount, color: "#facc15", display: `${lowCount} item` },
          { label: "Habis (stok 0)", value: outCount, color: "#e11d48", display: `${outCount} item` }
        ], "AMAN", `${okPct}%`);
      }

      // Baris 3 Kiri: Top 10 Barang Menipis dengan tombol + Tambah stok & Cetak QR
      const prioBadge = document.getElementById("badgeStockPriority");
      if (prioBadge) prioBadge.textContent = `${urgentItems.length} Barang`;
      const prioWrap = document.getElementById("tableStockPriorityWrap");
      if (prioWrap) {
        const since30 = shiftDate(todayStr(), -29);
        const sold30Map = new Map();
        for (const tx of transactions) {
          if (tx.date >= since30) {
            for (const it of (tx.items || [])) {
              const k = it.productId || it.name;
              if (k) sold30Map.set(k, (sold30Map.get(k) || 0) + Number(it.qty || 0));
              if (it.name) sold30Map.set(it.name, (sold30Map.get(it.name) || 0) + Number(it.qty || 0));
            }
          }
        }
        const top10Urgent = urgentItems
          .slice()
          .sort((a, b) => {
            const stDiff = Number(a.stock || 0) - Number(b.stock || 0);
            if (stDiff !== 0) return stDiff;
            const soldA = sold30Map.get(a.id) || sold30Map.get(a.name) || 0;
            const soldB = sold30Map.get(b.id) || sold30Map.get(b.name) || 0;
            if (soldB !== soldA) return soldB - soldA;
            const profA = Math.max(0, Number(a.price || 0) - Number(a.cost || 0));
            const profB = Math.max(0, Number(b.price || 0) - Number(b.cost || 0));
            if (profB !== profA) return profB - profA;
            return String(a.name || "").localeCompare(String(b.name || ""), "id");
          })
          .slice(0, 10);
        if (!top10Urgent.length) {
          prioWrap.innerHTML = `<p class="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-6 text-center">Semua barang aktif stoknya aman (&ge; ${LOW_STOCK_LIMIT} pcs).</p>`;
        } else {
          prioWrap.innerHTML = `<table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead><tr class="border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500"><th class="py-2 pr-2">No &amp; Nama Barang</th><th class="py-2 px-2 text-center">Sisa</th><th class="py-2 pl-2 text-right">Aksi Cepat</th></tr></thead>
            <tbody class="divide-y divide-slate-100">${top10Urgent.map((it, idx) => {
              const st = Math.max(0, Number(it.stock || 0));
              const eid = esc(it.id);
              const badgeCls = st <= 0 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900";
              return `<tr>
                <td class="py-2 pr-2"><strong class="text-slate-900 block leading-snug">${idx + 1}. ${esc(it.name)}</strong><span class="text-[11px] font-mono text-blue-700">${esc(it.code || "-")}</span></td>
                <td class="py-2 px-2 text-center whitespace-nowrap"><span class="px-2 py-0.5 rounded-full text-xs font-extrabold ${badgeCls}">${st === 0 ? "Habis" : st + " pcs"}</span></td>
                <td class="py-2 pl-2 text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5">
                    ${isAdmin ? `<button type="button" data-quick-in="${eid}" class="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs">+ Tambah stok</button>
                    <button type="button" data-qr-item="${eid}" class="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-xs"><i class="fa-solid fa-qrcode mr-1" aria-hidden="true"></i>Cetak QR</button>` : ""}
                  </div>
                </td>
              </tr>`;
            }).join("")}</tbody>
          </table>`;
        }
      }

      // Baris 3 Kanan: Barang Untung Besar yang Menipis/Habis
      const highMarginLow = urgentItems
        .map(it => ({ item: it, unitProfit: Math.max(0, Number(it.price || 0) - Number(it.cost || 0)) }))
        .filter(x => x.unitProfit > 0)
        .sort((a, b) => b.unitProfit - a.unitProfit)
        .slice(0, 6);
      const hmBadge = document.getElementById("badgeHighMarginLow");
      if (hmBadge) hmBadge.textContent = highMarginLow.length ? `${highMarginLow.length} Prioritas` : "Aman";
      const hmWrap = document.getElementById("listHighMarginLowWrap");
      if (hmWrap) {
        if (!highMarginLow.length) {
          hmWrap.innerHTML = `<p class="text-sm text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-4 text-center">Tidak ada barang margin tinggi yang menipis.</p>`;
        } else {
          const maxP = highMarginLow[0].unitProfit || 1;
          hmWrap.innerHTML = highMarginLow.map(({ item: it, unitProfit }) => {
            const st = Math.max(0, Number(it.stock || 0));
            const pct = Math.max(10, Math.round((unitProfit / maxP) * 100));
            return `<div class="uikit-row !py-2 !px-2.5">
              <div class="uikit-row-head">
                <span class="uikit-row-label">${esc(it.name)}</span>
                <span class="text-xs font-extrabold text-blue-900 shrink-0 tabular-nums">+${rp(unitProfit)}/pcs</span>
              </div>
              <div class="flex items-center justify-between gap-2 text-[11px] font-bold">
                <span class="${st <= 0 ? "text-rose-700" : "text-amber-700"}">${st === 0 ? "Stok Habis" : `Sisa ${st} pcs`}</span>
                ${isAdmin ? `<button type="button" data-quick-in="${esc(it.id)}" class="text-emerald-800 hover:underline font-extrabold">+ Restok</button>` : ""}
              </div>
              <div class="uikit-bar-track !h-1.5"><div class="uikit-bar-fill" style="width:${pct}%; background:${st <= 0 ? "#e11d48" : "#eab308"}"></div></div>
            </div>`;
          }).join("");
        }
      }

      // Baris 4: Tren Pergerakan Stok (14 Hari Terakhir: Masuk Restok vs Keluar Terjual)
      const trend14Wrap = document.getElementById("svgStockTrend14Wrap");
      const trend14Badge = document.getElementById("badgeStockTrend14");
      if (trend14Wrap) {
        const today = todayStr();
        const days14 = Array.from({ length: 14 }, (_, idx) => shiftDate(today, idx - 13));
        const inMap = new Map(), outMap = new Map();
        for (const p of purchases) {
          if (p.date) inMap.set(p.date, (inMap.get(p.date) || 0) + Number(p.qty || 0));
        }
        for (const tx of transactions) {
          if (tx.date) {
            const qtySum = (tx.items || []).reduce((s, it) => s + Number(it.qty || 0), 0);
            outMap.set(tx.date, (outMap.get(tx.date) || 0) + qtySum);
          }
        }
        let totIn = 0, totOut = 0;
        const pts14 = days14.map(d => {
          const vin = inMap.get(d) || 0;
          const vout = outMap.get(d) || 0;
          totIn += vin; totOut += vout;
          return { d, lbl: d.slice(8, 10) + "/" + d.slice(5, 7), vin, vout };
        });
        if (trend14Badge) trend14Badge.textContent = `+${totIn} masuk · −${totOut} keluar`;
        const mx14 = Math.max(1, ...pts14.map(p => Math.max(p.vin, p.vout)));
        const W = 720, H = 185, padL = 34, padR = 12, padT = 20, padB = 34;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const colW = plotW / pts14.length;
        const barW = Math.min(14, (colW - 10) / 2);
        const barsSvg = pts14.map((p, i) => {
          const cx = padL + i * colW + colW / 2;
          const hIn = p.vin > 0 ? Math.max(4, (p.vin / mx14) * plotH) : 0;
          const hOut = p.vout > 0 ? Math.max(4, (p.vout / mx14) * plotH) : 0;
          const yIn = padT + plotH - hIn;
          const yOut = padT + plotH - hOut;
          return `
            ${hIn > 0 ? `<rect x="${(cx - barW - 1.5).toFixed(1)}" y="${yIn.toFixed(1)}" width="${barW.toFixed(1)}" height="${hIn.toFixed(1)}" rx="3" fill="#1d4ed8"><title>${esc(p.d)} Masuk: ${p.vin} pcs</title></rect>` : ""}
            ${hOut > 0 ? `<rect x="${(cx + 1.5).toFixed(1)}" y="${yOut.toFixed(1)}" width="${barW.toFixed(1)}" height="${hOut.toFixed(1)}" rx="3" fill="#eab308"><title>${esc(p.d)} Keluar: ${p.vout} pcs</title></rect>` : ""}
            <text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="700">${esc(p.lbl)}</text>`;
        }).join("");
        trend14Wrap.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs font-bold text-slate-600">
            <span>Total 14 hari: <strong class="text-blue-800">+${totIn} pcs masuk</strong> · <strong class="text-amber-700">${totOut} pcs terjual</strong></span>
            <div class="flex items-center gap-3 text-[11px]">
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-[#1d4ed8]"></span>Masuk (Restok)</span>
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-[#eab308]"></span>Keluar (Terjual)</span>
            </div>
          </div>
          <svg viewBox="0 0 ${W} ${H}" class="w-full min-w-[560px] h-44">
            <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#cbd5e1" stroke-width="1"/>
            <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
            <text x="${padL - 5}" y="${padT + 4}" text-anchor="end" fill="#94a3b8" font-size="9" font-weight="700">${mx14}</text>
            <text x="${padL - 5}" y="${padT + plotH + 3}" text-anchor="end" fill="#94a3b8" font-size="9" font-weight="700">0</text>
            ${barsSvg}
          </svg>`;
      }

      // Baris 5: Slow Moving (30 Hari) & Barang Mati Total / Dead Stock (90 Hari)
      const slowBadge = document.getElementById("badgeSlowMovingCount");
      const slowWrap = document.getElementById("listSlowMovingWrap");
      const deadBadge = document.getElementById("badgeDeadStockCount");
      const deadWrap = document.getElementById("listDeadStockWrap");
      const deadSub = document.getElementById("deadStockSubtitle");
      if (slowWrap || deadWrap) {
        const since30Slow = shiftDate(todayStr(), -29);
        const since90Dead = shiftDate(todayStr(), -89);
        const moved30Ids = new Set(), moved30Names = new Set();
        const moved90Ids = new Set(), moved90Names = new Set();
        let earliestTxDate = "";
        for (const tx of transactions) {
          if (tx.date && (!earliestTxDate || tx.date < earliestTxDate)) earliestTxDate = tx.date;
          if (tx.date >= since90Dead) {
            for (const it of (tx.items || [])) {
              if (it.productId) moved90Ids.add(it.productId);
              if (it.name) moved90Names.add(String(it.name).trim());
              if (tx.date >= since30Slow) {
                if (it.productId) moved30Ids.add(it.productId);
                if (it.name) moved30Names.add(String(it.name).trim());
              }
            }
          }
        }
        const slowItems = active
          .filter(it => Number(it.stock || 0) >= 1 && !moved30Ids.has(it.id) && !moved30Names.has(String(it.name || "").trim()))
          .map(it => ({ item: it, st: Number(it.stock || 0), stuckCost: Number(it.stock || 0) * Number(it.cost || 0) }))
          .sort((a, b) => b.stuckCost - a.stuckCost || b.st - a.st);
        const deadItems = active
          .filter(it => Number(it.stock || 0) >= 1 && !moved90Ids.has(it.id) && !moved90Names.has(String(it.name || "").trim()))
          .map(it => ({ item: it, st: Number(it.stock || 0), stuckCost: Number(it.stock || 0) * Number(it.cost || 0) }))
          .sort((a, b) => b.stuckCost - a.stuckCost || b.st - a.st);
        const deadTotalCost = deadItems.reduce((s, x) => s + x.stuckCost, 0);

        if (slowBadge) slowBadge.textContent = `${slowItems.length} Barang`;
        if (slowWrap) {
          const topSlow = slowItems.slice(0, 8);
          if (!topSlow.length) {
            slowWrap.innerHTML = `<p class="col-span-full text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-4 text-center">Semua barang aktif bergerak dalam 30 hari terakhir.</p>`;
          } else {
            slowWrap.innerHTML = topSlow.map(({ item: it, st, stuckCost }) => `
              <div class="uikit-row !py-2.5 !px-3 border-amber-200 bg-amber-50/40">
                <div class="uikit-row-head">
                  <span class="uikit-row-label" title="${esc(it.name)}">${esc(it.name)}</span>
                  <span class="text-xs font-extrabold text-amber-800 shrink-0 tabular-nums">${st} pcs</span>
                </div>
                <div class="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 mt-0.5">
                  <span>Modal tertanam: <strong class="text-slate-900">${esc(shortRpTick(stuckCost))}</strong></span>
                  ${isAdmin ? `<button type="button" data-share-wa="${esc(it.id)}" class="text-emerald-700 hover:underline font-extrabold">Promo WA</button>` : ""}
                </div>
              </div>`).join("");
          }
        }

        if (deadBadge) deadBadge.textContent = `${deadItems.length} Barang · Modal ${shortRpTick(deadTotalCost)}`;
        if (deadSub) {
          deadSub.textContent = earliestTxDate && earliestTxDate > since90Dead
            ? `Belum pernah terjual sejak data tercatat (${earliestTxDate}) — kandidat clearance / cuci gudang`
            : "Tidak terjual 90 hari terakhir — prioritas clearance / cuci gudang agar modal cair";
        }
        if (deadWrap) {
          const topDead = deadItems.slice(0, 8);
          if (!topDead.length) {
            deadWrap.innerHTML = `<p class="col-span-full text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-4 text-center">Tidak ada barang mati total dalam 90 hari terakhir.</p>`;
          } else {
            deadWrap.innerHTML = topDead.map(({ item: it, st, stuckCost }) => `
              <div class="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 flex flex-col justify-between gap-1.5">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-extrabold text-rose-950 leading-snug line-clamp-2" title="${esc(it.name)}">${esc(it.name)}</span>
                  <span class="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shrink-0 tabular-nums">${st} pcs</span>
                </div>
                <div class="flex items-center justify-between gap-2 text-[11px] font-bold text-rose-800">
                  <span>Modal mati: ${esc(shortRpTick(stuckCost))}</span>
                  ${isAdmin ? `<button type="button" data-share-wa="${esc(it.id)}" class="px-2 py-0.5 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-extrabold">Clearance WA</button>` : ""}
                </div>
              </div>`).join("");
          }
        }
      }
    }

    // ==================== RENDER: PEMBUKUAN & GRAFIK ====================
    const BANK_TRANSFER_RE = /\b(setor|setoran|transfer\s*(ke\s*)?(bank|atm|rekening)|tarik\s*(tunai|bank|atm)|mutasi|pindah\s*buku)\b|\b(bri|bca|bni|mandiri|bsi|atm)\b/i;
    const PRIVE_RE = /\b(prive|ambil\s*(uang\s*)?pemilik|tarik\s*pribadi|keperluan\s*pribadi)\b/i;
    function renderProfitTrendHtml(profitPts) {
      const active = (profitPts || []).filter(p => Number(p.value || 0) !== 0);
      if (active.length < 2) {
        const detail = active.length === 1
          ? `Baru tersedia 1 bulan data (${esc(active[0].label)}: ${rp(active[0].value)}). Grafik tren otomatis tampil setelah minimal 2 bulan tercatat.`
          : "Belum ada transaksi laba yang tercatat dalam 6 bulan terakhir.";
        return `<div class="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center space-y-1.5">
          <p class="text-sm font-extrabold text-slate-700"><i class="fa-solid fa-chart-line text-slate-400 mr-1.5" aria-hidden="true"></i>Data historis belum cukup untuk analisis tren 6 bulan.</p>
          <p class="text-xs font-semibold text-slate-500">${detail}</p>
        </div>`;
      }
      return buildSvgAreaTrend(profitPts);
    }

    function getCashOutKind(e) {
      if (!e) return "expense";
      if (e.kind === "transfer" || e.kind === "prive" || e.kind === "expense") return e.kind;
      const text = `${e.category || ""} ${e.note || ""}`.trim();
      if (PRIVE_RE.test(text)) return "prive";
      if (BANK_TRANSFER_RE.test(text)) return "transfer";
      return "expense";
    }
    function isNonExpenseTransfer(e) {
      const k = getCashOutKind(e);
      return k === "transfer" || k === "prive";
    }

    function monthlyTotals(month) {
      const sales = transactions.filter(t => month && String(t.date || "").startsWith(month + "-"));
      const monthAllExp = books.expenses.filter(e => month && String(e.date || "").startsWith(month + "-"));
      const expenses = monthAllExp.filter(e => !isNonExpenseTransfer(e));
      const transfers = monthAllExp.filter(e => isNonExpenseTransfer(e));
      const revenue = sales.reduce((s, t) => s + Number(t.totalOmset || 0), 0);
      const cost = sales.reduce((s, t) => s + Number(t.totalModal || 0), 0);
      const spending = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const bankDepositTotal = transfers.reduce((s, e) => s + Number(e.amount || 0), 0);
      return { revenue, cost, spending, bankDepositTotal, profit: revenue - cost - spending };
    }

    function buildBookWaterfallSvg(revenue, cost, spending, netProfit) {
      const mx = Math.max(1000, revenue, cost + spending, Math.abs(netProfit));
      const W = 440, H = 164, padT = 26, padB = 28, plotH = H - padT - padB;
      const baseZero = padT + plotH;
      const hRev = Math.max(8, (revenue / mx) * plotH);
      const yRev = baseZero - hRev;
      const hCost = Math.max(cost > 0 ? 6 : 0, (cost / mx) * plotH);
      const yCost = yRev;
      const afterCostY = yRev + hCost;
      const hExp = Math.max(spending > 0 ? 6 : 0, (spending / mx) * plotH);
      const yExp = afterCostY;
      const netAbsH = Math.max(8, (Math.abs(netProfit) / mx) * plotH);
      const isLoss = netProfit < 0;
      const yNet = isLoss ? baseZero - netAbsH : Math.max(padT, baseZero - netAbsH);
      const netColor = isLoss ? "#e11d48" : "#16a34a";

      return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-44">
        <line x1="20" y1="${baseZero}" x2="${W - 20}" y2="${baseZero}" stroke="#cbd5e1" stroke-width="1.2"/>
        <line x1="88" y1="${yRev.toFixed(1)}" x2="128" y2="${yRev.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 2"/>
        <line x1="188" y1="${afterCostY.toFixed(1)}" x2="228" y2="${afterCostY.toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 2"/>
        <line x1="288" y1="${Math.min(baseZero, yExp + hExp).toFixed(1)}" x2="328" y2="${Math.min(baseZero, yExp + hExp).toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 2"/>

        <rect x="34" y="${yRev.toFixed(1)}" width="54" height="${hRev.toFixed(1)}" rx="6" fill="#1d4ed8"/>
        <text x="61" y="${Math.max(14, yRev - 7).toFixed(1)}" text-anchor="middle" fill="#0f2557" font-size="10" font-weight="900">${esc(shortRpTick(revenue))}</text>
        <text x="61" y="${H - 8}" text-anchor="middle" fill="#475569" font-size="10" font-weight="800">Omzet</text>

        <rect x="134" y="${yCost.toFixed(1)}" width="54" height="${Math.max(4, Math.min(baseZero - yCost, hCost)).toFixed(1)}" rx="6" fill="#64748b"/>
        <text x="161" y="${Math.max(14, yCost - 7).toFixed(1)}" text-anchor="middle" fill="#475569" font-size="10" font-weight="800">−${esc(shortRpTick(cost))}</text>
        <text x="161" y="${H - 8}" text-anchor="middle" fill="#475569" font-size="10" font-weight="800">Modal</text>

        <rect x="234" y="${Math.min(baseZero - 4, yExp).toFixed(1)}" width="54" height="${Math.max(4, Math.min(baseZero - Math.min(baseZero - 4, yExp), hExp)).toFixed(1)}" rx="6" fill="#eab308"/>
        <text x="261" y="${Math.max(14, Math.min(baseZero - 10, yExp) - 7).toFixed(1)}" text-anchor="middle" fill="#b45309" font-size="10" font-weight="800">−${esc(shortRpTick(spending))}</text>
        <text x="261" y="${H - 8}" text-anchor="middle" fill="#b45309" font-size="10" font-weight="800">Biaya</text>

        <rect x="334" y="${yNet.toFixed(1)}" width="54" height="${netAbsH.toFixed(1)}" rx="6" fill="${netColor}"/>
        <text x="361" y="${Math.max(14, yNet - 7).toFixed(1)}" text-anchor="middle" fill="${netColor}" font-size="10" font-weight="900">${isLoss ? "−" : "+"}${esc(shortRpTick(Math.abs(netProfit)))}</text>
        <text x="361" y="${H - 8}" text-anchor="middle" fill="${netColor}" font-size="10" font-weight="900">${isLoss ? "Rugi" : "Laba Bersih"}</text>
      </svg>`;
    }

    function renderCharts() {
      if (!isAdmin) return;
      const month = document.getElementById("bookMonth").value || todayStr().slice(0, 7);
      const yearNum = Number(month.slice(0, 4));
      const monthNum = Number(month.slice(5, 7));

      const monthSales = transactions.filter(t => String(t.date || "").startsWith(month + "-"));
      const monthExpAll = books.expenses.filter(e => String(e.date || "").startsWith(month + "-"));
      const monthExp = monthExpAll.filter(e => !isNonExpenseTransfer(e));
      const monthTransfers = monthExpAll.filter(e => isNonExpenseTransfer(e));
      const monthPurch = purchases.filter(p => String(p.date || "").startsWith(month + "-"));
      const { revenue, cost, spending, bankDepositTotal, profit: netProfit } = monthlyTotals(month);
      const gross = revenue - cost;
      const beliBulanIni = monthPurch.reduce((s, p) => s + Number(p.totalCost || 0), 0);

      // Baris 2 Kiri: Waterfall Omzet -> Modal -> Biaya -> Laba Bersih + Ringkasan Keuangan (Margin & BEP)
      const badgeGauge = document.getElementById("badgeBookGauge");
      if (badgeGauge) badgeGauge.textContent = month;
      const gaugeWrap = document.getElementById("svgBookGaugeWrap");
      if (gaugeWrap) {
        const grossMarginFrac = revenue > 0 ? (gross / revenue) : 0;
        const grossMargin = Math.round(grossMarginFrac * 100);
        const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
        const bepOmzet = grossMarginFrac > 0 ? Math.round(spending / grossMarginFrac) : 0;
        const bepReached = revenue > 0 && revenue >= bepOmzet && gross > 0;
        const bepDiff = revenue - bepOmzet;
        const bepStatus = revenue <= 0
          ? "Belum ada penjualan"
          : grossMarginFrac <= 0
            ? "Margin kotor 0% (belum bisa hitung BEP)"
            : (bepReached ? `Tercapai (+${rp(bepDiff)} di atas BEP)` : `Kurang omzet ${rp(Math.abs(bepDiff))} lagi`);
        gaugeWrap.innerHTML = buildBookWaterfallSvg(revenue, cost, spending, netProfit) + `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            <div class="uikit-row"><div class="uikit-row-head"><span class="uikit-row-label">Margin Kotor</span><span class="uikit-row-val text-blue-800">${grossMargin}%</span></div><span class="text-[10px] text-slate-500 font-semibold">Laba Kotor &divide; Omzet</span></div>
            <div class="uikit-row"><div class="uikit-row-head"><span class="uikit-row-label">Margin Bersih</span><span class="uikit-row-val ${netProfit < 0 ? "text-rose-700" : "text-emerald-700"}">${netMargin}%</span></div><span class="text-[10px] text-slate-500 font-semibold">Laba Bersih &divide; Omzet</span></div>
            <div class="uikit-row"><div class="uikit-row-head"><span class="uikit-row-label">Titik Impas (BEP)</span><span class="text-xs font-extrabold ${bepReached ? "text-emerald-700" : "text-rose-700"}">${bepOmzet > 0 ? rp(bepOmzet) : "-"}</span></div><span class="text-[10px] font-bold ${bepReached ? "text-emerald-700" : "text-rose-700"}">${esc(bepStatus)}</span></div>
          </div>
          <p class="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">Rumus BEP: <strong>Pengeluaran Operasional (${rp(spending)}) &divide; Margin Kotor (${grossMargin}%) = ${bepOmzet > 0 ? rp(bepOmzet) : "Rp 0"}</strong></p>`;
      }

      // Baris 3 Kanan: Komposisi Pembayaran (%)
      const pay = { Cash: 0, QRIS: 0, Kartu: 0, Transfer: 0 };
      for (const t of monthSales) {
        const m = t.paymentMethod || "Cash";
        if (m in pay) pay[m] += Number(t.totalOmset || 0);
      }
      const payTotal = Object.values(pay).reduce((a, b) => a + b, 0);
      const badgePay = document.getElementById("badgeBookPay");
      if (badgePay) badgePay.textContent = rp(payTotal);
      const payWrap = document.getElementById("svgBookPayWrap");
      if (payWrap) {
        payWrap.innerHTML = buildSvgDonut([
          { label: "Tunai", value: pay.Cash, color: "#1d4ed8", display: rp(pay.Cash) },
          { label: "Transfer", value: pay.Transfer, color: "#0f2557", display: rp(pay.Transfer) },
          { label: "QRIS", value: pay.QRIS, color: "#38bdf8", display: rp(pay.QRIS) },
          { label: "Kartu", value: pay.Kartu, color: "#facc15", display: rp(pay.Kartu) }
        ], "OMZET", shortRpTick(payTotal));
      }

      // Baris 4 Kanan: Tren Laba Penjualan 6 Bulan
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(yearNum, monthNum - 1 - i, 1);
        months.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
      }
      const profitPts = months.map(m => ({
        label: m.slice(2),
        value: transactions.filter(t => String(t.date || "").startsWith(m + "-")).reduce((s, t) => s + Number(t.totalProfit || 0), 0)
      }));
      const badgeProf = document.getElementById("badgeBookProfit");
      if (badgeProf) badgeProf.textContent = rp(profitPts[profitPts.length - 1]?.value || 0);
      const profWrap = document.getElementById("svgBookProfitWrap");
      if (profWrap) profWrap.innerHTML = renderProfitTrendHtml(profitPts);

      // Baris 2 Kanan: Produk Paling Menguntungkan (Omzet & Laba)
      const prodMap = new Map();
      for (const tx of monthSales) {
        for (const it of (tx.items || [])) {
          const key = String(it.name || "Barang").trim();
          const q = Number(it.qty || 0);
          const itemOmzet = Number(it.subtotal ?? Number(it.price || 0) * q);
          const itemCost = Number(it.cost || 0) * q;
          const cur = prodMap.get(key) || { omset: 0, profit: 0, qty: 0 };
          cur.omset += itemOmzet;
          cur.profit += (itemOmzet - itemCost);
          cur.qty += q;
          prodMap.set(key, cur);
        }
      }
      const topProfitable = [...prodMap.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 6);
      const trendBox = document.getElementById("bentoBookTrendingWrap");
      if (trendBox) {
        if (!topProfitable.length) {
          trendBox.innerHTML = `<p class="text-sm text-slate-500 py-8 text-center">Belum ada penjualan pada bulan ini.</p>`;
        } else {
          trendBox.innerHTML = `<table class="w-full text-left border-collapse text-xs">
            <thead><tr class="border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500"><th class="py-2 pr-1">Produk</th><th class="py-2 px-1 text-right">Omzet</th><th class="py-2 px-1 text-right">Laba</th><th class="py-2 pl-1 text-right">Margin</th></tr></thead>
            <tbody class="divide-y divide-slate-100">${topProfitable.map(([n, v], i) => {
              const mPct = v.omset > 0 ? Math.round((v.

Displaying admin-v5.js.
