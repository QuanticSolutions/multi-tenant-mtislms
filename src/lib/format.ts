const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Day–Month–Year, e.g. "05 Feb 2026". Used everywhere in the app. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Day–Month–Year with time, e.g. "05 Feb 2026, 14:30". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${mm}`;
}

/**
 * Human label for enum-ish values: "on_leave" -> "On Leave", "active" -> "Active".
 * Use for every status shown in tables, badges and filters so casing matches.
 */
export function formatStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Consistent class naming, e.g. "Class X — A". */
export function formatClass(
  name: string | null | undefined,
  section?: string | null,
): string {
  if (!name) return "—";
  const label = /^class\b/i.test(name.trim()) ? name.trim() : `Class ${name.trim()}`;
  return section ? `${label} — ${section}` : label;
}
