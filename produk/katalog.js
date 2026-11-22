const descriptions = new Map([
  ["SJS-001", "Raket badminton anak pilihan hemat untuk mulai belajar."],
  ["SJS-002", "Raket badminton anak untuk latihan dan main santai."],
  ["SJS-003", "Senapan angin merek Sharp."],
  ["SJS-004", "Raket badminton Victor seri Thruster K Boom Pro B."],
  ["SJS-005", "Lilitan tebal untuk menambah ketebalan gagang raket."],
  ["SJS-006", "Grip Yonex untuk mengganti lilitan gagang raket."],
  ["SJS-008", "Pilihan raket tiga merek dengan tarikan 25–26 lbs."],
  ["SJS-009", "Kaos kaki olahraga Yonex untuk latihan sehari-hari."],
  ["SJS-010", "Pilihan sepatu harga ekonomis. Tanyakan ukuran yang tersedia."],
  ["SJS-011", "Sepatu bola Vinoti untuk bermain dan berlatih sepak bola."],
  ["SJS-012", "Grip standar untuk mengganti lilitan gagang raket."],
  ["SJS-013", "Peluru untuk senapan angin."],
  ["SJS-014", "Senar Yonex BG66 untuk mengganti senar raket badminton."],
  ["SJS-015", "Pilihan grip Yonex lainnya untuk lilitan gagang raket."],
  ["SJS-016", "Senar pengganti merek Pyramid. Tanyakan tipe gitar yang sesuai."],
  ["SJS-017", "Kok Isai kemasan biru untuk latihan badminton."],
  ["SJS-018", "Pelindung lutut AVO untuk aktivitas olahraga."],
  ["SJS-019", "Bola untuk anak belajar menendang dan mengoper."],
  ["SJS-020", "Kok Memory kemasan biru untuk latihan badminton."],
  ["SJS-021", "Kok Indocock kemasan hitam untuk bermain badminton."],
  ["SJS-022", "Sabuk untuk seragam karate. Pilih warna sesuai tingkatan."],
  ["SJS-023", "Raket badminton seri Yonex Arcsaber. Tanyakan pilihan modelnya."],
  ["SJS-024", "Bola tenis hijau Nassau untuk latihan pukulan dan reli."],
  ["SJS-025", "Sepatu roda untuk latihan meluncur. Pastikan ukuran kaki."],
  ["SJS-026", "Kok Memory kemasan merah untuk latihan badminton."],
  ["SJS-028", "Grip berbahan handuk untuk pegangan raket yang menyerap keringat."],
  ["SJS-029", "Kok Nam kemasan hijau untuk bermain badminton."],
  ["SJS-030", "Bola voli Mikasa V210 dengan desain tiga warna."],
  ["SJS-031", "Senar pengganti merek Melody. Tanyakan tipe gitar yang sesuai."],
  ["SJS-032", "Capo kecil untuk mengubah nada dasar tanpa menyetem ulang."],
  ["SJS-033", "Kaos kaki futsal anak dengan grip di bagian telapak."],
  ["SJS-034", "Senar 80/20 Bronze D’Addario untuk gitar akustik."],
  ["SJS-035", "Senar gitar akustik Elixir NANOWEB Extra Light .010–.047."],
  ["SJS-036", "Set catur paling besar dengan papan lipat dan biji kayu."],
  ["SJS-037", "Set catur papan lipat dengan ukuran di antara L dan Jumbo."],
  ["SJS-038", "Set catur kayu ukuran paling ringkas dari tiga pilihan."],
  ["SJS-039", "Pilihan raket tiga merek dengan tarikan 27–28 lbs."],
  ["SJS-040", "Kaos olahraga Yonex. Tanyakan ukuran dan warna yang tersedia."],
  ["SJS-041", "Bola voli Mikasa dengan desain biru, kuning, dan putih."],
  ["SJS-042", "Bola voli Mikasa MVA300 dengan desain biru dan kuning."],
  ["SJS-043", "Senar badminton Li-Ning pilihan AP64 atau AP66."],
  ["SJS-044", "Senar badminton Yonex EXBOLT 65 berdiameter 0,65 mm."],
  ["SJS-045", "Alas untuk yoga, peregangan, dan latihan di lantai."]
]);

export function productDescription(item) {
  if (typeof item?.description === "string") return item.description.trim();
  return descriptions.get(String(item?.code || "").trim().toUpperCase()) || "";
}

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
