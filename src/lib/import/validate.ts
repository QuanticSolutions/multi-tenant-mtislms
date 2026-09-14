import { normalizeKey, type ImportEntity, type ImportField } from "./registry";

export type LookupIndex = Record<string, Record<string, string>>; // fieldKey -> alias -> uuid
export type ExistingIndex = Record<string, Record<string, string>>; // dedupeField -> value -> row id

export type CellError = { field: string; message: string };

export type ValidatedRow = {
  index: number; // 1-based row number in the source file
  raw: Record<string, string>;
  values: Record<string, string | number | boolean | null>;
  errors: CellError[];
  duplicateId: string | null;
  duplicateField: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (DATE_RE.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function validateCell(
  field: ImportField,
  rawValue: string,
  lookups: LookupIndex,
): { value: string | number | boolean | null; error?: string } {
  const value = (rawValue ?? "").trim();
  if (!value) {
    if (field.required) return { value: null, error: `${field.label} is required` };
    return { value: null };
  }
  switch (field.type) {
    case "number": {
      const num = Number(value.replace(/,/g, ""));
      if (Number.isNaN(num)) return { value: null, error: `${field.label} must be a number (got “${value}”)` };
      if (field.min !== undefined && num < field.min)
        return { value: null, error: `${field.label} cannot be less than ${field.min} (got “${value}”)` };
      return { value: num };
    }
    case "boolean": {
      const normalized = normalizeKey(value);
      if (["yes", "y", "true", "1", "teaching"].includes(normalized)) return { value: true };
      if (["no", "n", "false", "0", "nonteaching"].includes(normalized)) return { value: false };
      return { value: null, error: `${field.label} must be yes or no (got “${value}”)` };
    }
    case "date": {
      const iso = toIsoDate(value);
      if (!iso) return { value: null, error: `${field.label} is not a valid date (got “${value}”)` };
      return { value: iso };
    }
    case "enum": {
      const match = (field.enumValues ?? []).find((v) => normalizeKey(v) === normalizeKey(value));
      if (!match)
        return {
          value: null,
          error: `${field.label} must be one of: ${(field.enumValues ?? []).join(", ")} (got “${value}”)`,
        };
      return { value: match };
    }
    case "uuid-lookup": {
      const id = lookups[field.key]?.[normalizeKey(value)];
      if (!id)
        return {
          value: null,
          error: `${field.label} “${value}” was not found in ${field.lookupTable ?? "the database"}`,
        };
      return { value: id };
    }
    default:
      return { value };
  }
}

export function validateRows(
  entity: ImportEntity,
  mapping: Record<string, string | null>,
  rows: Record<string, string>[],
  lookups: LookupIndex,
  existing: ExistingIndex,
): ValidatedRow[] {
  return rows.map((raw, i) => {
    const values: Record<string, string | number | boolean | null> = {};
    const errors: CellError[] = [];

    for (const field of entity.fields) {
      const column = mapping[field.key];
      const cell = column ? (raw[column] ?? "") : "";
      const { value, error } = validateCell(field, cell, lookups);
      if (error) errors.push({ field: field.key, message: error });
      if (value !== null && value !== undefined && value !== "") values[field.key] = value;
    }

    let duplicateId: string | null = null;
    let duplicateField: string | null = null;
    for (const dedupe of entity.dedupeFields) {
      const value = values[dedupe];
      if (value === undefined || value === null || value === "") continue;
      const hit =
        existing[dedupe]?.[entity.matchCaseSensitive ? String(value).trim() : normalizeKey(value)];
      if (hit) {
        duplicateId = hit;
        duplicateField = dedupe;
        break;
      }
    }

    // Fields only needed when the record does not exist yet: an existing staff
    // record can be enriched without repeating the details already stored.
    if (!duplicateId) {
      for (const field of entity.fields) {
        const value = values[field.key];
        if (field.requiredOnInsert && (value === undefined || value === null || value === "")) {
          errors.push({ field: field.key, message: `${field.label} is required for new records` });
        }
      }
    }

    return { index: i + 1, raw, values, errors, duplicateId, duplicateField };
  });
}

/** Case/format-insensitive best guess of file column -> target field. */
export function guessMapping(entity: ImportEntity, headers: string[]): Record<string, string | null> {
  const byNorm = new Map(headers.map((h) => [normalizeKey(h.replace(/\*$/, "")), h]));
  const mapping: Record<string, string | null> = {};
  for (const field of entity.fields) {
    mapping[field.key] =
      byNorm.get(normalizeKey(field.label)) ??
      byNorm.get(normalizeKey(field.key)) ??
      byNorm.get(normalizeKey(field.key.replace(/_id$/, ""))) ??
      null;
  }
  return mapping;
}
