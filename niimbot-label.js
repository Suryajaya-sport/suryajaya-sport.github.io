export const niimbotLabelSizes = {
  "50x30": [50, 30],
  "40x30": [40, 30],
  "50x50": [50, 50]
};

const dpi = 300;
const dotsPerMillimeter = dpi / 25.4;
const dots = millimeters => Math.round(millimeters * dotsPerMillimeter);

function wrapName(ctx, name, width, maxLines) {
  const lines = [];
  let line = "";
  for (const word of name.trim().split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  let last = visible[maxLines - 1];
  while (last.length > 1 && ctx.measureText(last + "…").width > width) {
    last = last.slice(0, -1);
  }
  visible[maxLines - 1] = last.trimEnd() + "…";
  return visible;
}

export function drawNiimbotLabel(canvas, qrTarget, { size, margin, store, product, price }) {
  const [widthMm, heightMm] = niimbotLabelSizes[size];
  const width = canvas.width = dots(widthMm);
  const height = canvas.height = dots(heightMm);
  const fitted = size === "50x30" && margin === 4;
  const inset = millimeters => Math.ceil(millimeters * dotsPerMillimeter);
  const insets = {
    left: inset(fitted ? 4.5 : margin),
    right: inset(fitted ? 1.5 : margin),
    top: inset(fitted ? 2.5 : margin),
    bottom: inset(fitted ? 2.5 : margin)
  };
  const right = width - insets.right;
  const bottom = height - insets.bottom;
  const innerHeight = bottom - insets.top;
  const square = widthMm === heightMm;
  const narrow = widthMm === 40;

  const name = String(product.name || "Barang");
  const code = String(product.code || "");
  const variants = [product.size, product.color].filter(Boolean).join(" · ");
  const captionHeight = code ? dots(2.5) : 0;
  const qrLimit = fitted ? 22 : square ? 23 : narrow ? 16 : 18;
  const qrBox = Math.min(dots(qrLimit), innerHeight - captionHeight);
  const qrX = right - qrBox;
  const qrY = insets.top + Math.floor((innerHeight - qrBox - captionHeight) / 2);
  // Calculate the quiet zone against the smallest QR (21 modules) so it is at least
  // four modules wide even when a product code fits in the smallest symbol.
  const quiet = Math.ceil(qrBox * 4 / 29);
  const qrInk = qrBox - 2 * quiet;
  const textWidth = qrX - insets.left - dots(2);

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  qrTarget.replaceChildren();
  new QRCode(qrTarget, {
    text: code || name, width: qrInk, height: qrInk,
    colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M
  });
  const qr = qrTarget.querySelector("canvas");
  if (!qr) throw new Error("QR tidak tersedia.");

  ctx.save();
  ctx.beginPath();
  ctx.rect(insets.left, insets.top, right - insets.left, innerHeight);
  ctx.clip();
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  const storeFont = dots(narrow ? 1.35 : 1.6);
  const priceFont = dots(square ? 3.6 : narrow ? 2.6 : 3.25);
  const productFont = dots(square ? 2.35 : narrow ? 1.65 : 1.95);
  const variantFont = dots(narrow ? 1.25 : 1.5);
  const lineStep = productFont + dots(.45);
  const priceOffset = storeFont + dots(1.1);
  const nameOffset = priceOffset + priceFont + dots(1.35);
  const detailsHeight = variants ? variantFont + dots(.65) : 0;
  const maxLines = Math.min(4, Math.max(1, Math.floor((innerHeight - nameOffset - detailsHeight) / lineStep)));
  ctx.font = `700 ${productFont}px Inter, Arial, sans-serif`;
  const lines = wrapName(ctx, name, textWidth, maxLines);
  const textHeight = nameOffset + lines.length * lineStep + detailsHeight;
  const top = insets.top + Math.max(0, Math.floor((innerHeight - textHeight) / 2));
  const nameY = top + nameOffset;

  ctx.font = `800 ${storeFont}px Inter, Arial, sans-serif`;
  ctx.fillText(store.toUpperCase(), insets.left, top, textWidth);
  ctx.font = `800 ${priceFont}px Inter, Arial, sans-serif`;
  ctx.fillText(price, insets.left, top + priceOffset, textWidth);
  ctx.font = `700 ${productFont}px Inter, Arial, sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, insets.left, nameY + i * lineStep, textWidth));
  if (variants) {
    ctx.font = `600 ${variantFont}px Inter, Arial, sans-serif`;
    ctx.fillText(variants, insets.left, nameY + lines.length * lineStep + dots(.3), textWidth);
  }
  const divider = qrX - dots(1);
  ctx.fillRect(divider, qrY, 2, qrBox + captionHeight);

  ctx.drawImage(qr, qrX + quiet, qrY + quiet);
  if (code) {
    ctx.textAlign = "center";
    ctx.font = `700 ${dots(1.6)}px monospace`;
    ctx.fillText(code, qrX + qrBox / 2, qrY + qrBox + dots(.15), qrBox);
  }
  ctx.restore();
  return { width, height, insets };
}

function pngDensityChunk() {
  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // pHYs
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  const dotsPerMeter = Math.round(dotsPerMillimeter * 1000);
  view.setUint32(0, 9);
  chunk.set(type, 4);
  view.setUint32(8, dotsPerMeter);
  view.setUint32(12, dotsPerMeter);
  chunk[16] = 1; // pixels per meter
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  view.setUint32(17, crc ^ 0xffffffff);
  return chunk;
}

export async function encodeNiimbotPng(canvas) {
  const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("PNG tidak tersedia.");
  const data = new DataView(await png.arrayBuffer());
  // Replace the browser's density chunk, or insert one before the image data.
  for (let start = 8; start + 12 <= data.byteLength;) {
    const length = data.getUint32(start);
    const type = data.getUint32(start + 4);
    const end = start + length + 12;
    if (type === 0x70485973 || type === 0x49444154) {
      const next = type === 0x70485973 ? end : start;
      return new Blob([png.slice(0, start), pngDensityChunk(), png.slice(next)], { type: "image/png" });
    }
    start = end;
  }
  throw new Error("Format PNG tidak valid.");
}
