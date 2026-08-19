import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEntity, lookupAliases, normalizeKey } from "@/lib/import/registry";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export type ImportContext = {
  lookups: Record<string, Record<string, string>>;
  existing: Record<string, Record<string, string>>;
};

/** Loads lookup options and existing duplicate keys for an entity. */
export const getImportContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ entityKey: z.string() }).parse(data))
  .handler(async ({ context, data }): Promise<ImportContext> => {
    await assertAdmin(context as Ctx);
    const entity = getEntity(data.entityKey);
    if (!entity) throw new Error(`Unknown import entity: ${data.entityKey}`);

    const { getAdminClient } = await import("@/lib/api/admin.server");
    const admin = getAdminClient() as any;

    const lookups: Record<string, Record<string, string>> = {};
    for (const field of entity.fields) {
      if (field.type !== "uuid-lookup" || !field.lookupTable) continue;
      const cols = field.lookupMatchField ?? ["name"];
      const { data: rows, error } = await admin.from(field.lookupTable).select(["id", ...cols].join(","));
      if (error) throw new Error(error.message);
      const index: Record<string, string> = {};
      for (const row of rows ?? []) {
        for (const alias of lookupAliases(cols.map((c) => row[c]))) {
          if (!(alias in index)) index[alias] = row.id;
        }
      }
      lookups[field.key] = index;
    }

    const existing: Record<string, Record<string, string>> = {};
    if (entity.dedupeFields.length) {
      const { data: rows, error } = await admin
        .from(entity.table)
        .select(["id", ...entity.dedupeFields].join(","));
      if (error) throw new Error(error.message);
      for (const dedupe of entity.dedupeFields) {
        const index: Record<string, string> = {};
        for (const row of rows ?? []) {
          const value = row[dedupe];
          if (value === null || value === undefined || value === "") continue;
          index[normalizeKey(value)] = row.id;
        }
        existing[dedupe] = index;
      }
    }

    return { lookups, existing };
  });

export type CommitResult = {
  index: number;
  status: "inserted" | "updated" | "skipped" | "failed";
  reason?: string;
};

/** Commits validated rows server-side with the service role so bulk admin
 *  imports are not blocked by RLS. Rows are written in batches. */
export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        entityKey: z.string(),
        rows: z
          .array(
            z.object({
              index: z.number(),
              values: z.record(z.union([z.string(), z.number(), z.null()])),
              action: z.enum(["insert", "update", "skip"]),
              existingId: z.string().uuid().nullish(),
            }),
          )
          .max(5000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<CommitResult[]> => {
    await assertAdmin(context as Ctx);
    const entity = getEntity(data.entityKey);
    if (!entity) throw new Error(`Unknown import entity: ${data.entityKey}`);
    const allowed = new Set(entity.fields.map((f) => f.key));

    const { getAdminClient } = await import("@/lib/api/admin.server");
    const admin = getAdminClient() as any;

    const results: CommitResult[] = [];
    const inserts: { index: number; payload: Record<string, unknown> }[] = [];

    for (const row of data.rows) {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row.values)) {
        if (allowed.has(key) && value !== null && value !== "") payload[key] = value;
      }
      if (row.action === "skip") {
        results.push({ index: row.index, status: "skipped", reason: "Skipped by user" });
        continue;
      }
      if (row.action === "update") {
        if (!row.existingId) {
          results.push({ index: row.index, status: "failed", reason: "No matching record to update" });
          continue;
        }
        const { error } = await admin.from(entity.table).update(payload).eq("id", row.existingId);
        results.push(
          error
            ? { index: row.index, status: "failed", reason: error.message }
            : { index: row.index, status: "updated" },
        );
        continue;
      }
      inserts.push({ index: row.index, payload });
    }

    const BATCH = 100;
    for (let i = 0; i < inserts.length; i += BATCH) {
      const batch = inserts.slice(i, i + BATCH);
      const { error } = await admin.from(entity.table).insert(batch.map((b) => b.payload));
      if (!error) {
        for (const b of batch) results.push({ index: b.index, status: "inserted" });
        continue;
      }
      // Batch failed: retry row-by-row so one bad row doesn't lose the rest.
      for (const b of batch) {
        const { error: rowError } = await admin.from(entity.table).insert(b.payload);
        results.push(
          rowError
            ? { index: b.index, status: "failed", reason: rowError.message }
            : { index: b.index, status: "inserted" },
        );
      }
    }

    return results.sort((a, b) => a.index - b.index);
  });
