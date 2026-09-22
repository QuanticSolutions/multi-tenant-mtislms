declare module "html2pdf.js" {
  // Minimal surface used by src/lib/pdf.ts — the library is loaded only in the
  // browser, through a dynamic import.
  type Html2PdfChain = {
    set(options: Record<string, unknown>): Html2PdfChain;
    from(element: HTMLElement | string): Html2PdfChain;
    save(filename?: string): Promise<void>;
    outputPdf(type?: string): Promise<unknown>;
  };
  const html2pdf: () => Html2PdfChain;
  export default html2pdf;
}
