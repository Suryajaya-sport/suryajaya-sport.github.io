export function normalizeCostCodeDigits(value) {
  const digits = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{10}$/.test(digits) && new Set(digits).size === 10 ? digits : "";
}

export function productCostCode(cost, digits) {
  if (!digits || (typeof cost !== "number" && (typeof cost !== "string" || !cost.trim()))) return "";
  const amount = Number(cost);
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) return "";
  return String(Math.trunc(amount)).slice(0, 3).split("").map(digit => digits[Number(digit)]).join("");
}
