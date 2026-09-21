/**
 * Branded spreadsheet exports — every XLSX starts with the school's name,
 * address and contact line read from the school profile, then the sheet title,
 * then the data rows.
 */
import * as XLSX from "xlsx";

import type { DocBrand } from "@/lib/print";

export function brandedSheet(
  brand: DocBrand,
  title: string,
  json: Record<string, unknown>[],
): XLSX.WorkSheet {
  const header: (string | null)[][] = [
    [brand.schoolName],
    [brand.address || null],
    [brand.contact || null],
    [title],
    [],
  ].filter((r) => r.length === 0 || r[0] !== null) as (string | null)[][];

  const ws = XLSX.utils.aoa_to_sheet(header);
  XLSX.utils.sheet_add_json(ws, json, { origin: -1 });
  return ws;
}

export function saveBrandedWorkbook(
  brand: DocBrand,
  sheetName: string,
  title: string,
  json: Record<string, unknown>[],
  filename: string,
) {
  const ws = brandedSheet(brand, title, json);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 28));
  XLSX.writeFile(wb, filename);
}
