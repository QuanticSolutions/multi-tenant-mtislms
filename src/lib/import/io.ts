// Parsing + template/export helpers shared by the import wizard.
// CSV goes through PapaParse, XLSX through SheetJS, both normalized to the
// same { headers, rows } shape so the wizard never branches on file type.
import Papa from "papaparse";
import * as XLSX from "xlsx";

import type { ImportEntity } from "./registry";

export type ParsedFile = { headers: string[]; rows: Record<string, string>[] };

function normalizeRows(matrix: unknown[][]): ParsedFile {
  const headerRow = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const headers = headerRow.filter(Boolean);
  const rows: Record<string, string>[] = [];
  for (const raw of matrix.slice(1)) {
    if (!raw || raw.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const row: Record<string, string> = {};
    headerRow.forEach((h, i) => {
      if (!h) return;
      const cell = raw[i];
      row[h] = cell === null || cell === undefined ? "" : String(cell).trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    return normalizeRows(result.data as unknown[][]);
  }
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  return normalizeRows(matrix as unknown[][]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function templateMatrix(entity: ImportEntity): string[][] {
  const header = entity.fields.map((f) => (f.required ? `${f.label} *` : f.label));
  const example = entity.fields.map((f) => (f.example !== undefined ? String(f.example) : ""));
  return [header, example];
}

export function downloadTemplate(entity: ImportEntity, format: "csv" | "xlsx") {
  const matrix = templateMatrix(entity);
  if (format === "csv") {
    const csv = Papa.unparse(matrix);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${entity.key}-template.csv`);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  ws["!cols"] = entity.fields.map((f) => ({ wch: Math.max(14, f.label.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entity.label.slice(0, 28));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${entity.key}-template.xlsx`,
  );
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}
