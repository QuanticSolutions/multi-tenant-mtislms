/**
 * Branded PDF documents.
 *
 * Every export in the app (admission detail, student profile, fee challan,
 * payslips) is described as data, rendered through the shared responsive HTML
 * template below, branded from the school profile (`school_settings`), then
 * converted to a real PDF file and downloaded — no print dialog.
 *
 * One call can hold several documents (e.g. a payslip per staff member); each
 * becomes its own A4 page with the same header and footer.
 */

import { DEFAULT_BRANDING } from "@/lib/branding";
import type { DocBrand, DocRow } from "@/lib/print";

export type PdfRow = DocRow;

export type PdfTable = {
  heading?: string;
  head: string[];
  rows: string[][];
  totals?: PdfRow[];
  /** Shown instead of the table when there are no rows. */
  empty?: string;
};

export type PdfDoc = {
  /** Badge in the header, e.g. "Fee Challan". */
  title: string;
  subtitle?: string;
  /** Two-column key/value block under the header. */
  meta?: PdfRow[];
  tables?: PdfTable[];
  /** Free paragraph printed after the tables. */
  notes?: string;
  footnote?: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

function headerHtml(brand: DocBrand, doc: PdfDoc) {
  return `<header class="pdf-head">
  <div class="pdf-brand">
    ${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="" class="pdf-logo">` : ""}
    <div>
      <div class="pdf-school">${esc(brand.schoolName)}</div>
      ${doc.subtitle ? `<div class="pdf-sub">${esc(doc.subtitle)}</div>` : ""}
      ${brand.address ? `<div class="pdf-line">${esc(brand.address)}</div>` : ""}
      ${brand.contact ? `<div class="pdf-line">${esc(brand.contact)}</div>` : ""}
    </div>
  </div>
  <div class="pdf-badge">${esc(doc.title)}</div>
</header>`;
}

function tableHtml(t: PdfTable) {
  const body =
    t.rows.length === 0
      ? `<p class="pdf-empty">${esc(t.empty ?? "No records.")}</p>`
      : `<table class="pdf-table">
    <thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${t.rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table>`;
  const totals =
    t.totals && t.totals.length > 0
      ? `<div class="pdf-totals">${t.totals
          .map(
            (x) =>
              `<div class="${x.strong ? "strong" : ""}"><span>${esc(x.label)}</span><span>${esc(x.value)}</span></div>`,
          )
          .join("")}</div>`
      : "";
  return `<section class="pdf-block">
  ${t.heading ? `<h2>${esc(t.heading)}</h2>` : ""}
  ${body}
  ${totals}
</section>`;
}

function docHtml(brand: DocBrand, doc: PdfDoc, isLast: boolean) {
  const meta =
    doc.meta && doc.meta.length > 0
      ? `<div class="pdf-meta">${doc.meta
          .map((m) => `<div><span>${esc(m.label)}</span><span>${esc(m.value)}</span></div>`)
          .join("")}</div>`
      : "";
  return `<article class="pdf-page${isLast ? "" : " pdf-break"}">
  ${headerHtml(brand, doc)}
  ${meta}
  ${(doc.tables ?? []).map(tableHtml).join("")}
  ${doc.notes ? `<p class="pdf-notes">${esc(doc.notes)}</p>` : ""}
  <footer class="pdf-foot">
    <div>${esc(brand.schoolName)}${brand.contact ? ` · ${esc(brand.contact)}` : ""}</div>
    <div>${esc(doc.footnote ?? "This is a computer generated document.")}</div>
  </footer>
</article>`;
}

/** Full standalone HTML for the documents — also usable for preview or print. */
export function buildPdfHtml(brand: DocBrand, docs: PdfDoc[]) {
  const accent = brand.primaryColor || DEFAULT_BRANDING.primary_color;
  return `<div class="pdf-root">
<style>
  .pdf-root{--accent:${accent};font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;color:#17251f;background:#fff}
  .pdf-root *{box-sizing:border-box}
  .pdf-page{width:190mm;min-height:270mm;padding:4mm 0;display:flex;flex-direction:column;background:#fff}
  .pdf-break{page-break-after:always;break-after:page}
  .pdf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid var(--accent);padding-bottom:10px}
  .pdf-brand{display:flex;gap:10px;align-items:flex-start}
  .pdf-logo{height:56px;width:56px;object-fit:contain}
  .pdf-school{font-size:19px;font-weight:700;color:var(--accent);line-height:1.2}
  .pdf-sub{font-size:12px;color:#5c6b64;margin-top:2px}
  .pdf-line{font-size:10.5px;color:#5c6b64;margin-top:2px;max-width:115mm}
  .pdf-badge{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#5c6b64;white-space:nowrap;border:1px solid #dfe6e2;border-radius:4px;padding:4px 8px}
  .pdf-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;margin:14px 0 4px}
  .pdf-meta div{font-size:11.5px;display:flex;justify-content:space-between;gap:10px;border-bottom:1px dotted #e3e9e6;padding-bottom:3px}
  .pdf-meta span:first-child{color:#5c6b64}
  .pdf-meta span:last-child{font-weight:600;text-align:right}
  .pdf-block{margin-top:14px}
  .pdf-block h2{font-size:12.5px;margin:0 0 6px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em}
  .pdf-table{width:100%;border-collapse:collapse;font-size:11.5px}
  .pdf-table th{text-align:left;background:#f4f6f9;color:#5c6b64;text-transform:uppercase;font-size:9.5px;letter-spacing:.06em;padding:6px 8px}
  .pdf-table td{padding:6px 8px;border-bottom:1px solid #eef2f0;vertical-align:top}
  .pdf-table td:last-child,.pdf-table th:last-child{text-align:right}
  .pdf-empty{font-size:11.5px;color:#8b978f;margin:4px 0}
  .pdf-totals{margin-top:10px;margin-left:auto;width:60%;font-size:12px}
  .pdf-totals div{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #eef2f0}
  .pdf-totals div.strong{font-weight:700;color:var(--accent);border-top:2px solid var(--accent);font-size:13.5px}
  .pdf-notes{font-size:11px;color:#5c6b64;margin-top:14px;white-space:pre-wrap}
  .pdf-foot{margin-top:auto;padding-top:12px;border-top:1px solid #e3e9e6;font-size:9.5px;color:#8b978f;text-align:center;line-height:1.5}
</style>
${docs.map((d, i) => docHtml(brand, d, i === docs.length - 1)).join("")}
</div>`;
}

/** Waits until every image inside the staged markup has loaded (or failed). */
async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 4000);
        }),
    ),
  );
}

function safeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

/**
 * Renders the documents off-screen, converts them to a single PDF and starts
 * the download. Browser-only.
 */
export async function downloadPdf(opts: {
  brand: DocBrand;
  docs: PdfDoc[];
  filename: string;
}) {
  if (typeof document === "undefined") return;
  if (opts.docs.length === 0) throw new Error("Nothing to export.");

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "190mm";
  host.style.background = "#fff";
  host.innerHTML = buildPdfHtml(opts.brand, opts.docs);
  document.body.appendChild(host);

  try {
    await waitForImages(host);
    const { default: html2pdf } = await import("html2pdf.js");
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: safeFilename(opts.filename),
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], before: ".pdf-break + .pdf-page" },
      })
      .from(host.firstElementChild as HTMLElement)
      .save();
  } finally {
    host.remove();
  }
}
