/**
 * Lightweight printable-document generator.
 * Opens a styled document in a new window and triggers the browser print
 * dialog, which lets the user save it as a PDF — no extra dependency needed.
 */

export type DocRow = { label: string; value: string; strong?: boolean };

export function buildDocument(opts: {
  title: string;
  schoolName: string;
  subtitle?: string;
  meta: DocRow[];
  tableHead: string[];
  tableRows: string[][];
  totals: DocRow[];
  footnote?: string;
}) {
  const esc = (s: string) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;color:#17251f;margin:0;padding:32px;background:#fff}
  .doc{max-width:720px;margin:0 auto;border:1px solid #dfe6e2;border-radius:12px;padding:28px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1f6f52;padding-bottom:14px}
  h1{font-size:20px;margin:0;color:#1f6f52}
  .sub{font-size:12px;color:#5c6b64;margin-top:2px}
  .badge{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5c6b64}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:18px 0}
  .meta div{font-size:12px;display:flex;justify-content:space-between;border-bottom:1px dotted #e3e9e6;padding-bottom:3px}
  .meta span:first-child{color:#5c6b64}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th{text-align:left;background:#f1f6f3;color:#5c6b64;text-transform:uppercase;font-size:10px;letter-spacing:.06em;padding:8px}
  td{padding:8px;border-bottom:1px solid #eef2f0}
  td:last-child,th:last-child{text-align:right}
  .totals{margin-top:14px;margin-left:auto;width:60%;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid #eef2f0}
  .totals div.strong{font-weight:700;color:#1f6f52;border-top:2px solid #1f6f52;font-size:15px}
  footer{margin-top:24px;font-size:11px;color:#8b978f;text-align:center}
  @media print{body{padding:0}.doc{border:none}}
</style></head><body>
<div class="doc">
  <header>
    <div>
      <h1>${esc(opts.schoolName)}</h1>
      <div class="sub">${esc(opts.subtitle ?? "")}</div>
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
