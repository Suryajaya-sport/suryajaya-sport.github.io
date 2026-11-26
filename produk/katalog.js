const posters = new Map([
  ["SJS-017", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795672883/products/xTSULFT9eCVZn5suPAYz-1795672883153.webp", "sjs-017-v1795672883.webp"]],
  ["SJS-021", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795672851/products/TtL3JseAQq3Db9SADZPE-1795672849303.webp", "sjs-021-v1795672851.webp"]],
  ["SJS-028", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795672600/products/fwdC91xEbu01ZQjGWAnn-1795672598266.webp", "sjs-028-v1795672600.webp"]],
  ["SJS-029", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795683542/products/YYvx1Wp6PGoHyZDm7KSS-1795683542642.webp", "sjs-029-v1795683542.webp"]],
  ["SJS-034", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795673836/products/oumzGv5oDdXUGiZ2juEc-1795673836419.webp", "sjs-034-v1795673836.webp"]],
  ["SJS-040", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795673794/products/Fi82RWwN3GFos4p4vrO9-1795673793359.webp", "sjs-040-v1795673794.webp"]],
  ["SJS-046", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795673812/products/Rlzw9xjWePPKrFXQdP6D-1795673812621.webp", "sjs-046-v1795673812.webp"]],
  ["SJS-047", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795683459/products/n28sKUAVQkeEuzqVVO95-1795683459041.webp", "sjs-047-v1795683459.webp"]],
  ["SJS-048", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795523407/products/eeeqEXdCEjQcB2cVMNmo-1795523406484.webp", "sjs-048-v1795523407.webp"]],
  ["SJS-049", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795523435/products/iBzzdmTT43X8bc87g773-1795523435811.webp", "sjs-049-v1795523435.webp"]],
  ["SJS-050", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795527807/products/2hoFGJY6TiyKvdQFARhC-1795527806193.webp", "sjs-050-v1795527807.webp"]],
  ["SJS-051", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795523850/products/LV3cniK4mJbFSh7GQDRI-1795523850619.webp", "sjs-051-v1795523850.webp"]],
  ["SJS-052", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795524195/products/XnRzWeuKF8eebw1M8zsd-1795524193463.webp", "sjs-052-v1795524195.webp"]],
  ["SJS-053", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795523522/products/0mdg4OlmooWSQqvPSk7B-1795523522966.webp", "sjs-053-v1795523522.webp"]],
  ["SJS-054", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795525211/products/OMC4gCmYhTQ7Hj2GIKSH-1795525212166.webp", "sjs-054-v1795525211.webp"]],
  ["SJS-055", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795571686/products/L4VE6dLsys29wMWcWZJH-1795571686832.webp", "sjs-055-v1795571686.webp"]],
  ["SJS-056", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795571698/products/TqicqzVcGdzjdlfv7Ekz-1795571698258.webp", "sjs-056-v1795571698.webp"]],
  ["SJS-057", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795571626/products/ZGyZ2tPsIt62JV02D7Mu-1795571625602.webp", "sjs-057-v1795571626.webp"]],
  ["SJS-058", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795580145/products/EK7fzUSE84bs9J061Yc1-1795580144699.webp", "sjs-058-v1795580145.webp"]],
  ["SJS-059", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795683473/products/ehwsc24ifgaOf53CP5Hm-1795683473684.webp", "sjs-059-v1795683473.webp"]],
  ["SJS-060", ["https://res.cloudinary.com/mhfuwzby/image/upload/v1795683443/products/xEAsNLeLUYezAzf24btX-1795683443564.webp", "sjs-060-v1795683443.webp"]]
]);

export function catalogImageUrl(item) {
  const source = String(item?.imageUrl || "").trim();
  const poster = posters.get(item?.code);
  if (poster && source === poster[0]) {
    return new URL("../assets/posters/" + poster[1], import.meta.url).href;
  }
  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
