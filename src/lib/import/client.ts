import { supabase } from "@/integrations/supabase/client";
import { getEntity, lookupAliases, normalizeKey } from "@/lib/import/registry";
import type { ImportContext, CommitResult } from "@/lib/api/import.functions";

type ImportRow = {
  index: number;
  values: Record<string, string | number | null>;
  action: "insert" | "update" | "skip";
  existingId?: string | null;
};

/** Loads matching data with the signed-in browser session supplied by Cloud. */
export async function loadImportContext(entityKey: string): Promise<ImportContext> {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error(`Unknown import entity: ${entityKey}`);
  const db = supabase as any;
  const lookups: ImportContext["lookups"] = {};

  for (const field of entity.fields) {
    if (field.type !== "uuid-lookup" || !field.lookupTable) continue;
    const cols = field.lookupMatchField ?? ["name"];
    let query = db.from(field.lookupTable).select(["id", ...cols].join(","));
    if (field.lookupFilter) query = query.eq(field.lookupFilter.column, field.lookupFilter.value);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const index: Record<string, string> = {};
    for (const row of rows ?? []) {
      for (const alias of lookupAliases(cols.map((column) => row[column]))) {
        if (!(alias in index)) index[alias] = row.id;
      }
    }
    lookups[field.key] = index;
  }

  const existing: ImportContext["existing"] = {};
  if (entity.dedupeFields.length > 0) {
    const { data: rows, error } = await db
      .from(entity.table)
      .select(["id", ...entity.dedupeFields].join(","));
    if (error) throw new Error(error.message);
    for (const field of entity.dedupeFields) {
      const index: Record<string, string> = {};
      for (const row of rows ?? []) {
        const value = row[field];
        if (value === null || value === undefined || value === "") continue;
        index[entity.matchCaseSensitive ? String(value).trim() : normalizeKey(value)] = row.id;
      }
      existing[field] = index;
    }
  }

  return { lookups, existing };
}

/** Writes an import through the signed-in admin session; database policies
 * remain the final authorization check. */
export async function commitImportRows(entityKey: string, rows: ImportRow[]): Promise<CommitResult[]> {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error(`Unknown import entity: ${entityKey}`);
  const db = supabase as any;
  const allowed = new Set(entity.fields.map((field) => field.key));
  const results: CommitResult[] = [];
  const inserts: { index: number; payload: Record<string, unknown> }[] = [];

  for (const row of rows) {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row.values)) {
      if (allowed.has(key) && value !== null && value !== "") payload[key] = value;
    }
    if (row.action === "skip") {
      results.push({ index: row.index, status: "skipped", reason: "Skipped by user" });
    } else if (row.action === "update") {
      if (!row.existingId) {
        results.push({ index: row.index, status: "failed", reason: "No matching record to update" });
      } else {
        const { error } = await db.from(entity.table).update(payload).eq("id", row.existingId);
        results.push(error
          ? { index: row.index, status: "failed", reason: error.message }
          : { index: row.index, status: "updated" });
      }
    } else {
      inserts.push({ index: row.index, payload });
    }
  }

  for (let offset = 0; offset < inserts.length; offset += 100) {
    const batch = inserts.slice(offset, offset + 100);
    const { error } = await db.from(entity.table).insert(batch.map((item) => item.payload));
    if (!error) {
      batch.forEach((item) => results.push({ index: item.index, status: "inserted" }));
      continue;
    }
    for (const item of batch) {
      const { error: rowError } = await db.from(entity.table).insert(item.payload);
      results.push(rowError
        ? { index: item.index, status: "failed", reason: rowError.message }
        : { index: item.index, status: "inserted" });
    }
  }

  return results.sort((a, b) => a.index - b.index);
}