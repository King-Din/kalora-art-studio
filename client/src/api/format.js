const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n) => inr.format(n);

// Date-only strings (YYYY-MM-DD) are handled as pure calendar dates in UTC, so no timezone can shift them.
export const addDays = (str, n) => {
  const d = new Date(`${str}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
export const weekday = (str) => new Date(`${str}T00:00:00Z`).getUTCDay();
export const niceDate = (str) =>
  new Date(`${str}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const niceTime = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
