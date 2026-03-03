import jsPDF from "jspdf";

export interface ExportPdfOptions {
  mockupDataUrl: string;
  productName: string;
  sku: string;
  widthCm: number;
  heightCm: number;
  mockupAspectRatio?: number;
  printWidthCm: number;
  printHeightCm: number;
  subtypeName: string;
  printedFaces: string[];
  quantityPacks: number;
  piecesPerPack: number;
  pricePerFace: number;
  subtotal: number;
  iva: number;
  total: number;
  tierName?: string;
}

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

export function exportMockupPdf(options: ExportPdfOptions): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();  // 215.9mm
  const margin = 15;
  let y = 0;

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(26, 54, 93); // #1a365d
  doc.rect(0, 0, pageW, 24, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(237, 137, 54); // #ed8936 accent
  doc.text("ParaPaquetes", margin, 11);
  const brandW = doc.getTextWidth("ParaPaquetes");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("Print Studio", margin + brandW + 3, 11);
  doc.setFontSize(10);
  doc.text("Hoja de aprobación", margin, 19);
  y = 30;

  // ── Mockup image ────────────────────────────────────────────
  const maxImgW = pageW - 2 * margin;
  const maxImgH = 110;
  const productAspect = options.mockupAspectRatio ?? (options.widthCm / options.heightCm);
  let imgW = maxImgW;
  let imgH = imgW / productAspect;
  if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * productAspect; }
  const imgX = (pageW - imgW) / 2;
  doc.addImage(options.mockupDataUrl, "PNG", imgX, y, imgW, imgH);
  y += imgH + 10;

  // ── Separator ───────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── Product details ─────────────────────────────────────────
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Detalles del producto", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const details: [string, string][] = [
    ["Producto", options.productName],
    ["SKU", options.sku],
    ["Medidas", `${options.widthCm}×${options.heightCm} cm (físico)`],
    ["Área de impresión", `${options.printWidthCm}×${options.printHeightCm} cm`],
    ["Material", options.subtypeName],
    ["Caras impresas", options.printedFaces.join(", ")],
    [
      "Cantidad",
      `${options.quantityPacks} paquete${options.quantityPacks > 1 ? "s" : ""} (${(options.quantityPacks * options.piecesPerPack).toLocaleString("es-MX")} piezas)`,
    ],
  ];

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + doc.getTextWidth(`${label}:`) + 2, y);
    y += 5;
  });

  y += 4;

  // ── Separator ───────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── Pricing section ─────────────────────────────────────────
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cotización estimada", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const priceRows: [string, string][] = [
    ...(options.tierName ? [["Tarifa aplicada", options.tierName] as [string, string]] : []),
    ["Precio por cara", MXN(options.pricePerFace)],
    ["Subtotal", MXN(options.subtotal)],
    ["IVA (16%)", MXN(options.iva)],
  ];

  priceRows.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin, y);
    doc.setTextColor(40, 40, 40);
    doc.text(value, pageW - margin - doc.getTextWidth(value), y);
    y += 5;
  });

  y += 3;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text("Total", margin, y);
  const totalStr = MXN(options.total);
  doc.setTextColor(237, 137, 54);
  doc.text(totalStr, pageW - margin - doc.getTextWidth(totalStr), y);
  y += 10;

  // ── Separator ───────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── Footer / disclaimer ─────────────────────────────────────
  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${today}`, margin, y);
  y += 4;
  const disclaimer = "Este documento es una vista previa del diseño. Los colores pueden variar en la impresión final.";
  doc.text(disclaimer, margin, y);
  y += 4;
  doc.text("Sujeto a aprobación de arte final antes de producción.", margin, y);
  y += 12;

  // ── Signature lines ─────────────────────────────────────────
  const sigLineW = 60;
  const sigY = y + 8;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.4);

  // Client
  doc.line(margin, sigY, margin + sigLineW, sigY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const clientLabel = "Firma cliente";
  doc.text(clientLabel, margin + sigLineW / 2 - doc.getTextWidth(clientLabel) / 2, sigY + 4);

  // Company
  const sig2X = pageW - margin - sigLineW;
  doc.line(sig2X, sigY, sig2X + sigLineW, sigY);
  const compLabel = "Firma ParaPaquetes";
  doc.text(compLabel, sig2X + sigLineW / 2 - doc.getTextWidth(compLabel) / 2, sigY + 4);

  // ── Save ────────────────────────────────────────────────────
  const filename = `ParaPaquetes_${options.sku}_${today.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}
