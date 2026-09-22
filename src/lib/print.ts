/**
 * Lightweight printable-document generator.
 * Opens a styled document in a new window and triggers the browser print
 * dialog, which lets the user save it as a PDF — no extra dependency needed.
 *
 * Every document header is branded from the school profile (`school_settings`)
 * — logo, name, address and contact line — never from hardcoded values.
 */

import { DEFAULT_BRANDING, addressLine, contactLine, colorsOf, type Branding } from "@/lib/branding";

export type DocRow = { label: string; value: string; strong?: boolean };

export type DocBrand = {
  schoolName: string;
  logoUrl?: string | null;
  address?: string;
  contact?: string;
  primaryColor?: string;
};

/** Builds the document header values from the school profile row. */
export function docBrand(b: Partial<Branding> | null | undefined): DocBrand {
  return {
    schoolName: b?.school_name?.trim() || DEFAULT_BRANDING.school_name,
    logoUrl: b?.logo_url ?? null,
    address: addressLine(b),
    contact: contactLine(b),
    primaryColor: colorsOf(b).primary,
  };
}

export function buildDocument(opts: {
  title: string;
  /** Prefer passing `brand` (from `docBrand`); `schoolName` remains for compatibility. */
  brand?: DocBrand;
  schoolName?: string;
  subtitle?: string;
  meta: DocRow[];
  tableHead: string[];
  tableRows: string[][];
  totals: DocRow[];
  footnote?: string;
}) {
  const esc = (s: string) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

  const brand: DocBrand =
    opts.brand ?? { schoolName: opts.schoolName || DEFAULT_BRANDING.school_name };
  const accent = brand.primaryColor || DEFAULT_BRANDING.primary_color;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;color:#17251f;margin:0;padding:32px;background:#fff}
  .doc{max-width:720px;margin:0 auto;border:1px solid #dfe6e2;border-radius:12px;padding:28px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${accent};padding-bottom:14px;gap:16px}
  .brand{display:flex;gap:12px;align-items:flex-start}
  .brand img{height:52px;width:52px;object-fit:contain}
  h1{font-size:20px;margin:0;color:${accent}}
  .sub{font-size:12px;color:#5c6b64;margin-top:2px}
  .addr{font-size:11px;color:#5c6b64;margin-top:3px;max-width:340px}
  .badge{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5c6b64;white-space:nowrap}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:18px 0}
  .meta div{font-size:12px;display:flex;justify-content:space-between;border-bottom:1px dotted #e3e9e6;padding-bottom:3px}
  .meta span:first-child{color:#5c6b64}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th{text-align:left;background:#f4f6f9;color:#5c6b64;text-transform:uppercase;font-size:10px;letter-spacing:.06em;padding:8px}
  td{padding:8px;border-bottom:1px solid #eef2f0}
  td:last-child,th:last-child{text-align:right}
  .totals{margin-top:14px;margin-left:auto;width:60%;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid #eef2f0}
  .totals div.strong{font-weight:700;color:${accent};border-top:2px solid ${accent};font-size:15px}
  footer{margin-top:24px;font-size:11px;color:#8b978f;text-align:center}
  @media print{body{padding:0}.doc{border:none}}
</style></head><body>
<div class="doc">
  <header>
    <div class="brand">
      ${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="">` : ""}
      <div>
        <h1>${esc(brand.schoolName)}</h1>
        <div class="sub">${esc(opts.subtitle ?? "")}</div>
        ${brand.address ? `<div class="addr">${esc(brand.address)}</div>` : ""}
        ${brand.contact ? `<div class="addr">${esc(brand.contact)}</div>` : ""}
      </div>
    </div>
    <div class="badge">${esc(opts.title)}</div>
  </header>
  <div class="meta">
    ${opts.meta.map((m) => `<div><span>${esc(m.label)}</span><span>${esc(m.value)}</span></div>`).join("")}
  </div>
  <table>
    <thead><tr>${opts.tableHead.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${opts.tableRows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table>
  <div class="totals">
    ${opts.totals
      .map((t) => `<div class="${t.strong ? "strong" : ""}"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`)
      .join("")}
  </div>
  <footer>${esc(opts.footnote ?? "This is a computer generated document.")}</footer>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
}

export function printDocument(html: string) {
  const w = window.open("", "_blank", "width=880,height=1000");
  if (!w) {
    throw new Error("Pop-up blocked — allow pop-ups to download the document.");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export type DocSection = {
  heading: string;
  intro?: string;
  tableHead: string[];
  tableRows: string[][];
  totals?: DocRow[];
};

/**
 * A multi-section printable document — several headed tables in one page,
 * for reports that cover more ground than a single invoice-style table.
 * Uses the browser print dialog (Save as PDF) like `buildDocument`.
 */
export function buildReportDocument(opts: {
  title: string;
  brand?: DocBrand;
  schoolName?: string;
  subtitle?: string;
  meta: DocRow[];
  sections: DocSection[];
  footnote?: string;
}) {
  const esc = (s: string) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

  const brand: DocBrand =
    opts.brand ?? { schoolName: opts.schoolName || DEFAULT_BRANDING.school_name };
  const accent = brand.primaryColor || DEFAULT_BRANDING.primary_color;

  const sectionsHtml = opts.sections
    .map(
      (s) => `
  <section class="report-section">
    <h2>${esc(s.heading)}</h2>
    ${s.intro ? `<p class="section-intro">${esc(s.intro)}</p>` : ""}
    ${
      s.tableRows.length === 0
        ? `<p class="section-empty">No data in this range.</p>`
        : `<table>
      <thead><tr>${s.tableHead.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${s.tableRows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`
    }
    ${
      s.totals && s.totals.length > 0
        ? `<div class="totals">
      ${s.totals
        .map(
          (t) =>
            `<div class="${t.strong ? "strong" : ""}"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`,
        )
        .join("")}
    </div>`
        : ""
    }
  </section>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;color:#17251f;margin:0;padding:32px;background:#fff}
  .doc{max-width:880px;margin:0 auto;border:1px solid #dfe6e2;border-radius:12px;padding:28px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${accent};padding-bottom:14px;gap:16px}
  .brand{display:flex;gap:12px;align-items:flex-start}
  .brand img{height:52px;width:52px;object-fit:contain}
  h1{font-size:20px;margin:0;color:${accent}}
  h2{font-size:14px;margin:0 0 4px;color:${accent}}
  .sub{font-size:12px;color:#5c6b64;margin-top:2px}
  .addr{font-size:11px;color:#5c6b64;margin-top:3px;max-width:340px}
  .badge{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5c6b64;white-space:nowrap}
  .meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px 20px;margin:18px 0}
  .meta div{font-size:12px;display:flex;justify-content:space-between;border-bottom:1px dotted #e3e9e6;padding-bottom:3px}
  .meta span:first-child{color:#5c6b64}
  .report-section{margin-top:24px;padding-top:18px;border-top:1px solid #eef2f0}
  .report-section:first-of-type{margin-top:20px}
  .section-intro{font-size:11px;color:#5c6b64;margin:0 0 8px}
  .section-empty{font-size:12px;color:#8b978f;margin:6px 0}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
  th{text-align:left;background:#f4f6f9;color:#5c6b64;text-transform:uppercase;font-size:10px;letter-spacing:.06em;padding:8px}
  td{padding:8px;border-bottom:1px solid #eef2f0}
  td:last-child,th:last-child{text-align:right}
  .totals{margin-top:10px;margin-left:auto;width:50%;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #eef2f0}
  .totals div.strong{font-weight:700;color:${accent};border-top:2px solid ${accent};font-size:14px}
  footer{margin-top:24px;font-size:11px;color:#8b978f;text-align:center}
  @media print{body{padding:0}.doc{border:none}.report-section{page-break-inside:avoid}}
</style></head><body>
<div class="doc">
  <header>
    <div class="brand">
      ${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="">` : ""}
      <div>
        <h1>${esc(brand.schoolName)}</h1>
        <div class="sub">${esc(opts.subtitle ?? "")}</div>
        ${brand.address ? `<div class="addr">${esc(brand.address)}</div>` : ""}
        ${brand.contact ? `<div class="addr">${esc(brand.contact)}</div>` : ""}
      </div>
    </div>
    <div class="badge">${esc(opts.title)}</div>
  </header>
  <div class="meta">
    ${opts.meta.map((m) => `<div><span>${esc(m.label)}</span><span>${esc(m.value)}</span></div>`).join("")}
  </div>
  ${sectionsHtml}
  <footer>${esc(opts.footnote ?? "This is a computer generated document.")}</footer>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
}
