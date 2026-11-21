const chessBoards = new Map([
  ["SJS-036", { model: "Jumbo", dimensions: "50 × 50 cm", previousPhoto: "odj7uaqys2swcfecztxz.png", photo: "catur-jumbo-50cm.jpg" }],
  ["SJS-037", { model: "XL", dimensions: "40 × 40 cm", previousPhoto: "yegelw1pajbscnw8ksa9.png", photo: "catur-besar-40cm.jpg" }],
  ["SJS-038", { model: "L", dimensions: "36 × 36 cm", previousPhoto: "wjeq2pxu6ushce2aivoa.png", photo: "catur-kecil-36cm.jpg" }]
]);

export function chessBoardSpecs(item) {
  return chessBoards.get(String(item?.code || "").trim().toUpperCase());
}

export function productImageUrl(item) {
  const url = typeof item?.imageUrl === "string" ? item.imageUrl.trim() : "";
  return /^https:\/\//i.test(url) ? url : "";
}

export function catalogImageUrl(item) {
  const image = productImageUrl(item);
  const chess = chessBoardSpecs(item);
  // Replace the artwork that had the old sizes. Future uploads still take precedence.
  return chess && image.endsWith(`/${chess.previousPhoto}`) ? `/assets/${chess.photo}` : image;
}

export function thumbnailUrl(original, width) {
  const cloudinaryUpload = "https://res.cloudinary.com/mhfuwzby/image/upload/";
  const useThumbnail = original.startsWith(cloudinaryUpload)
    && /^v\d+\//.test(original.slice(cloudinaryUpload.length));
  return useThumbnail
    ? cloudinaryUpload + `c_limit,w_${width},h_${width},q_auto,f_auto/` + original.slice(cloudinaryUpload.length)
    : original;
}
