import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileSpreadsheet, FileDown, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Save, Database,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { IMPORT_ENTITIES, getEntity, type ImportEntity } from "@/lib/import/registry";
import { downloadCsv, downloadTemplate, parseImportFile, type ParsedFile } from "@/lib/import/io";
import { guessMapping, validateRows, type ValidatedRow } from "@/lib/import/validate";
import type { CommitResult } from "@/lib/api/import.functions";
import { commitImportRows, loadImportContext } from "@/lib/import/client";

type Step = "entity" | "upload" | "mapping" | "preview" | "done";
type DuplicateAction = "skip" | "update" | "create";

const NOT_PRESENT = "__none__";

export function ImportWizard({
  open,
  onOpenChange,
  entityKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityKey?: string;
}) {
  const [step, setStep] = useState<Step>(entityKey ? "upload" : "entity");
  const [selected, setSelected] = useState<string | null>(entityKey ?? null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [rowActions, setRowActions] = useState<Record<number, DuplicateAction>>({});
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [results, setResults] = useState<CommitResult[] | null>(null);
  const [profileName, setProfileName] = useState("");

  const entity = selected ? getEntity(selected) : undefined;
  const qc = useQueryClient();

  function reset() {
    setStep(entityKey ? "upload" : "entity");
    setSelected(entityKey ?? null);
    setFile(null);
    setFileName("");
    setMapping({});
    setRowActions({});
    setSkipInvalid(false);
    setResults(null);
    setProfileName("");
  }

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityKey]);

  const contextQuery = useQuery({
    queryKey: ["import-context", selected],
    enabled: open && !!selected,
    queryFn: () => loadImportContext(selected!),
  });

  const profilesQuery = useQuery({
    queryKey: ["import-profiles", selected],
    enabled: open && !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_profiles")
        .select("id, name, mapping")
        .eq("entity_key", selected!)
        .order("created_at");
      if (error) throw error;
      return data as { id: string; name: string; mapping: Record<string, string | null> }[];
    },
  });

  const validated: ValidatedRow[] = useMemo(() => {
    if (!entity || !file) return [];
    const ctx = contextQuery.data ?? { lookups: {}, existing: {} };
    return validateRows(entity, mapping, file.rows, ctx.lookups, ctx.existing);
  }, [entity, file, mapping, contextQuery.data]);


  const invalid = validated.filter((r) => r.errors.length > 0);
  const duplicates = validated.filter((r) => r.errors.length === 0 && r.duplicateId);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profileName.trim()) throw new Error("Give the profile a name");
      const { error } = await supabase
        .from("import_profiles")
        .upsert(
          { entity_key: selected!, name: profileName.trim(), mapping },
          { onConflict: "entity_key,name" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Import profile saved");
      setProfileName("");
      qc.invalidateQueries({ queryKey: ["import-profiles", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commit = useMutation({
    mutationFn: async () => {
      const payload = validated
        .filter((row) => row.errors.length === 0)
        .map((row) => {
          if (row.duplicateId) {
            const action = rowActions[row.index] ?? "skip";
            return {
              index: row.index,
              values: row.values,
              action: action === "update" ? ("update" as const) : action === "create" ? ("insert" as const) : ("skip" as const),
              existingId: row.duplicateId,
            };
          }
          return { index: row.index, values: row.values, action: "insert" as const, existingId: null };
        });
      return commitImportRows(selected!, payload);
    },
    onSuccess: (res) => {
      setResults(res);
      setStep("done");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(f: File) {
    try {
      const parsed = await parseImportFile(f);
      if (parsed.headers.length === 0) throw new Error("No header row found in the file");
      setFile(parsed);
      setFileName(f.name);
      setMapping(guessMapping(entity!, parsed.headers));
      setStep("mapping");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-5 text-primary" /> Import data
            {entity && <Badge variant="outline" className="bg-primary-pale text-primary">{entity.label}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file, map the columns, review and commit.
          </DialogDescription>
        </DialogHeader>

        <Steps step={step} />

        {step === "entity" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {IMPORT_ENTITIES.map((e) => (
              <button
                key={e.key}
                onClick={() => { setSelected(e.key); setStep("upload"); }}
                className="rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary-pale/40"
              >
                <p className="font-medium text-foreground">{e.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {e.fields.length} fields
                </p>
              </button>
            ))}
          </div>
        )}

        {step === "upload" && entity && (
          <UploadStep entity={entity} onFile={handleFile} onBack={entityKey ? undefined : () => setStep("entity")} />
        )}

        {step === "mapping" && entity && file && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                <FileSpreadsheet className="mr-1 inline size-4" /> {fileName} — {file.rows.length} rows
              </span>
              {(profilesQuery.data ?? []).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Saved profile</span>
                  <Select
                    onValueChange={(id) => {
                      const p = (profilesQuery.data ?? []).find((x) => x.id === id);
                      if (p) { setMapping(p.mapping); toast.success(`Applied “${p.name}”`); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Apply mapping…" /></SelectTrigger>
                    <SelectContent>
                      {(profilesQuery.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Target field</th>
                    <th className="px-3 py-2">File column</th>
                    <th className="px-3 py-2">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {entity.fields.map((f) => {
                    const col = mapping[f.key];
                    const sample = col ? (file.rows[0]?.[col] ?? "") : "";
                    return (
                      <tr key={f.key} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className="text-foreground">{f.label}</span>
                          {f.required && <span className="ml-1 text-destructive">*</span>}
                          <div className="text-xs text-muted-foreground">
                            {f.type === "uuid-lookup" ? (f.help ?? `Matched against ${f.lookupTable}`) : f.type}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={col ?? NOT_PRESENT}
                            onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === NOT_PRESENT ? null : v })}
                          >
                            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NOT_PRESENT}>Not present in file</SelectItem>
                              {file.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{sample || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Save mapping as…"
                  className="h-9 w-52"
                />
                <Button variant="outline" size="sm" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                  <Save className="mr-1 size-4" /> Save profile
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("upload")}><ArrowLeft className="mr-1 size-4" /> Back</Button>
                <Button onClick={() => setStep("preview")} disabled={contextQuery.isLoading}>
                  Validate <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && entity && (
          <>
            {contextQuery.isError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">Could not load existing records for matching</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(contextQuery.error as Error)?.message ?? "Unknown error"} — rows below are still validated, but
                  linked fields (like Class) and duplicate detection may be unavailable.
                </p>
              </div>
            )}
            <PreviewStep
              rows={validated}
              invalidCount={invalid.length}
              duplicates={duplicates}
              rowActions={rowActions}
              setRowActions={setRowActions}
              skipInvalid={skipInvalid}
              setSkipInvalid={setSkipInvalid}
              onBack={() => setStep("mapping")}
              onCommit={() => commit.mutate()}
              committing={commit.isPending}
            />
          </>
        )}


        {step === "done" && results && entity && (
          <DoneStep
            results={results}
            rows={validated}
            invalid={invalid}
            entity={entity}
            onClose={() => onOpenChange(false)}
            onAgain={reset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ["entity", "upload", "mapping", "preview", "done"];
  const labels: Record<Step, string> = {
    entity: "Entity", upload: "Upload", mapping: "Map columns", preview: "Validate", done: "Summary",
  };
  const current = order.indexOf(step);
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {order.map((s, i) => (
        <span
          key={s}
          className={`rounded-full px-2.5 py-1 ${
            i === current ? "bg-primary text-primary-foreground" : i < current ? "bg-primary-pale text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {i + 1}. {labels[s]}
        </span>
      ))}
    </div>
  );
}

function UploadStep({
  entity, onFile, onBack,
}: { entity: ImportEntity; onFile: (f: File) => void; onBack?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Need a starting point?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Download a template with the exact columns for {entity.label} (required fields marked with *).
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(entity, "csv")}>
            <FileDown className="mr-1 size-4" /> CSV template
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(entity, "xlsx")}>
            <FileDown className="mr-1 size-4" /> Excel template
          </Button>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-pale/30">
        <Upload className="size-6 text-primary" />
        <span className="text-sm font-medium text-foreground">Choose a .csv or .xlsx file</span>
        <span className="text-xs text-muted-foreground">Both formats are handled automatically</span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </label>

      {onBack && <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 size-4" /> Back</Button>}
    </div>
  );
}

function PreviewStep({
  rows, invalidCount, duplicates, rowActions, setRowActions, skipInvalid, setSkipInvalid, onBack, onCommit, committing,
}: {
  rows: ValidatedRow[];
  invalidCount: number;
  duplicates: ValidatedRow[];
  rowActions: Record<number, DuplicateAction>;
  setRowActions: (v: Record<number, DuplicateAction>) => void;
  skipInvalid: boolean;
  setSkipInvalid: (v: boolean) => void;
  onBack: () => void;
  onCommit: () => void;
  committing: boolean;
}) {
  const ok = rows.length - invalidCount;
  const canCommit = invalidCount === 0 || skipInvalid;

  function bulkDuplicates(action: DuplicateAction) {
    const next = { ...rowActions };
    for (const d of duplicates) next[d.index] = action;
    setRowActions(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rows" value={rows.length} />
        <Stat label="Valid" value={ok} tone="ok" />
        <Stat label="With errors" value={invalidCount} tone={invalidCount ? "error" : undefined} />
      </div>

      {invalidCount > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm">
          <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} className="mt-1" />
          <span>
            <span className="font-medium">{invalidCount} rows have errors.</span> Fix the source file and re-upload, or
            tick this box to import only the valid rows and skip the failing ones.
          </span>
        </label>
      )}

      {duplicates.length > 0 && (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{duplicates.length} rows match existing records</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing is overwritten unless you choose “Update”. Apply to all:
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkDuplicates("skip")}>Skip all</Button>
            <Button size="sm" variant="outline" onClick={() => bulkDuplicates("update")}>Update all</Button>
            <Button size="sm" variant="outline" onClick={() => bulkDuplicates("create")}>Create new for all</Button>
          </div>
        </div>
      )}

      <div className="max-h-[320px] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.index} className="border-t border-border align-top">
                <td className="px-3 py-2 text-muted-foreground">{r.index}</td>
                <td className="px-3 py-2">
                  {r.errors.length > 0 ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      <AlertTriangle className="mr-1 size-3" /> Error
                    </Badge>
                  ) : r.duplicateId ? (
                    <Badge variant="outline" className="bg-warning-soft text-warning">Duplicate</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary-pale text-primary">
                      <CheckCircle2 className="mr-1 size-3" /> OK
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.errors.length > 0 ? (
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-destructive">
                      {r.errors.map((e, i) => <li key={i}>{e.message}</li>)}
                    </ul>
                  ) : r.duplicateId ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Matches existing {r.duplicateField}</span>
                      <Select
                        value={rowActions[r.index] ?? "skip"}
                        onValueChange={(v) => setRowActions({ ...rowActions, [r.index]: v as DuplicateAction })}
                      >
                        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip</SelectItem>
                          <SelectItem value="update">Update existing</SelectItem>
                          <SelectItem value="create">Create new</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ready to import</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 size-4" /> Back</Button>
        <Button onClick={onCommit} disabled={!canCommit || committing}>
          {committing ? "Importing…" : `Import ${ok} rows`}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  results, rows, invalid, entity, onClose, onAgain,
}: {
  results: CommitResult[];
  rows: ValidatedRow[];
  invalid: ValidatedRow[];
  entity: ImportEntity;
  onClose: () => void;
  onAgain: () => void;
}) {
  const inserted = results.filter((r) => r.status === "inserted").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed");

  function downloadFailed() {
    const byIndex = new Map(rows.map((r) => [r.index, r]));
    const failedRows = [
      ...failed.map((f) => ({ ...(byIndex.get(f.index)?.raw ?? {}), _row: f.index, _error: f.reason ?? "Failed" })),
      ...invalid.map((r) => ({ ...r.raw, _row: r.index, _error: r.errors.map((e) => e.message).join("; ") })),
    ];
    if (failedRows.length === 0) return;
    downloadCsv(failedRows, `${entity.key}-failed-rows.csv`);
  }

  const problemCount = failed.length + invalid.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Imported" value={inserted} tone="ok" />
        <Stat label="Updated" value={updated} />
        <Stat label="Skipped" value={skipped} />
        <Stat label="Failed" value={problemCount} tone={problemCount ? "error" : undefined} />
      </div>

      {failed.length > 0 && (
        <div className="max-h-52 overflow-auto rounded-md border border-border p-3 text-xs">
          {failed.map((f) => (
            <p key={f.index} className="text-destructive">Row {f.index}: {f.reason}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
        {problemCount > 0 ? (
          <Button variant="outline" onClick={downloadFailed}>
            <FileDown className="mr-1 size-4" /> Download failed rows (CSV)
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAgain}>Import more</Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "error" }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "error" ? "text-destructive" : tone === "ok" ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/** Small trigger button used on entity pages. */
export function ImportButton({ entityKey, label = "Import" }: { entityKey: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-1 size-4" /> {label}
      </Button>
      <ImportWizard open={open} onOpenChange={setOpen} entityKey={entityKey} />
    </>
  );
}
