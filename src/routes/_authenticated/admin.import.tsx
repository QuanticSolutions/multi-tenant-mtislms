import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileDown, Database } from "lucide-react";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { ImportWizard } from "@/components/admin/import-wizard";
import { IMPORT_ENTITIES } from "@/lib/import/registry";
import { downloadTemplate } from "@/lib/import/io";

export const Route = createFileRoute("/_authenticated/admin/import")({
  head: () => ({
    meta: [
      { title: "Import Data" },
      { name: "description", content: "Bulk import students, teachers, parents, fees and more from CSV or Excel files." },
      { property: "og:title", content: "Import Data" },
      { property: "og:description", content: "Bulk import school records from CSV or Excel with column mapping and validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const [open, setOpen] = useState(false);
  const [entityKey, setEntityKey] = useState<string | undefined>(undefined);

  function launch(key?: string) {
    setEntityKey(key);
    setOpen(true);
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Tools</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Import Data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bring existing records in from CSV or Excel — map columns once, validate, then commit.
          </p>
        </div>
        <Button onClick={() => launch(undefined)}>
          <Upload className="mr-1 size-4" /> Start import
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {IMPORT_ENTITIES.map((e) => (
          <div key={e.key} className="mtis-card flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <p className="font-medium text-foreground">{e.label}</p>
            </div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{e.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => launch(e.key)}>
                <Upload className="mr-1 size-4" /> Import
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate(e, "csv")}>
                <FileDown className="mr-1 size-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate(e, "xlsx")}>
                <FileDown className="mr-1 size-4" /> Excel
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ImportWizard open={open} onOpenChange={setOpen} entityKey={entityKey} />
    </AppShell>
  );
}
