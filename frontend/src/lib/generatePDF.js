import jsPDF from "jspdf";

// ─── Theme definitions ─────────────────────────────────────────
export const PDF_THEMES = {
  oscuro: {
    id: "oscuro", name: "Oscuro", desc: "Encabezado oscuro clásico",
    preview: { headerBg: "#0f0f19", accentBar: "#6366f1", sectionBg: "#f0f1ff", sectionText: "#5050b4" },
    // Header
    fullHeaderBg: false,
    headerBg: [15, 15, 25], headerH: 38,
    headerTextColor: [180, 180, 200], headerSubColor: [120, 120, 150], headerIdColor: [100, 100, 130],
    accentBar: [99, 102, 241], accentBarFullW: false, accentBarH: 0,
    // Content
    clientNameColor: [20, 20, 35], eventTypeColor: [100, 100, 120],
    sectionHeaderBg: [240, 241, 255], sectionHeaderText: [80, 80, 180],
    fieldLabelColor: [120, 120, 140], fieldValueColor: [25, 25, 40],
    notesBg: [250, 250, 255], notesLabelColor: [80, 80, 180], notesValueColor: [60, 60, 80],
    // Footer
    footerBg: [248, 248, 255], footerDivColor: [210, 210, 230], footerTextColor: [100, 100, 150], footerSubColor: [150, 150, 180],
    // Accent (progress bars, highlights)
    accentColor: [16, 185, 129],
    // All-reservations
    statsBg: [22, 25, 52], statsTextColor: [255, 255, 255], statsSubColor: [110, 115, 165],
    rowEvenBg: [249, 250, 254],
  },
  claro: {
    id: "claro", name: "Claro", desc: "Fondo blanco, profesional y limpio",
    preview: { headerBg: "#ffffff", accentBar: "#6366f1", sectionBg: "#f4f4f6", sectionText: "#282850" },
    // Header
    fullHeaderBg: false,
    headerBg: [255, 255, 255], headerH: 38,
    headerTextColor: [20, 20, 40], headerSubColor: [80, 80, 120], headerIdColor: [100, 100, 140],
    accentBar: [99, 102, 241], accentBarFullW: true, accentBarH: 5,
    // Content
    clientNameColor: [20, 20, 40], eventTypeColor: [80, 80, 130],
    sectionHeaderBg: [244, 244, 246], sectionHeaderText: [40, 40, 80],
    fieldLabelColor: [110, 110, 140], fieldValueColor: [20, 20, 40],
    notesBg: [245, 246, 248], notesLabelColor: [60, 60, 120], notesValueColor: [40, 40, 70],
    // Footer
    footerBg: [248, 249, 252], footerDivColor: [200, 200, 220], footerTextColor: [80, 80, 120], footerSubColor: [120, 120, 160],
    // Accent
    accentColor: [99, 102, 241],
    // All-reservations
    statsBg: [238, 240, 255], statsTextColor: [20, 20, 60], statsSubColor: [80, 80, 160],
    rowEvenBg: [248, 248, 252],
  },
  elegante: {
    id: "elegante", name: "Elegante", desc: "Encabezado morado con detalles dorados",
    preview: { headerBg: "#4c1d95", accentBar: "#fbbf24", sectionBg: "#fefce8", sectionText: "#5c3200" },
    // Header
    fullHeaderBg: true,
    headerBg: [76, 29, 149], headerH: 50,
    headerTextColor: [255, 255, 255], headerSubColor: [196, 181, 253], headerIdColor: [167, 139, 250],
    accentBar: [251, 191, 36], accentBarFullW: true, accentBarH: 3,
    // Content
    clientNameColor: [20, 10, 40], eventTypeColor: [100, 60, 180],
    sectionHeaderBg: [254, 252, 232], sectionHeaderText: [92, 50, 10],
    fieldLabelColor: [100, 80, 140], fieldValueColor: [20, 10, 40],
    notesBg: [255, 253, 245], notesLabelColor: [130, 80, 10], notesValueColor: [40, 20, 60],
    // Footer
    footerBg: [250, 246, 255], footerDivColor: [196, 181, 253], footerTextColor: [100, 60, 180], footerSubColor: [140, 100, 200],
    // Accent
    accentColor: [251, 191, 36],
    // All-reservations
    statsBg: [55, 20, 120], statsTextColor: [255, 255, 255], statsSubColor: [196, 181, 253],
    rowEvenBg: [255, 253, 245],
  },
};

// ─── Helpers ───────────────────────────────────────────────────
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const STATUS_COLORS = {
  Pendiente: [245, 158, 11], Confirmado: [59, 130, 246], Completado: [16, 185, 129], Cancelado: [239, 68, 68],
};
const STATUS_LABELS = {
  Pendiente: "PENDIENTE", Confirmado: "CONFIRMADO", Completado: "COMPLETADO", Cancelado: "CANCELADO",
};

// ─── INDIVIDUAL RESERVATION PDF ───────────────────────────────
export async function generateReservationPDF(reservation, formatCurrency, logoBase64 = undefined, pdfThemeId = "oscuro") {
  const t = PDF_THEMES[pdfThemeId] || PDF_THEMES.oscuro;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ml = 20, mr = W - 20, contentW = mr - ml;

  // ─── HEADER ─────────────────────────────────────────────────
  if (t.fullHeaderBg) {
    // Full-width colored header (Elegante)
    doc.setFillColor(...t.headerBg);
    doc.rect(0, 0, W, t.headerH, "F");
    // Gold accent bar at bottom of header
    if (t.accentBarH > 0) {
      doc.setFillColor(...t.accentBar);
      doc.rect(0, t.headerH - t.accentBarH, W, t.accentBarH, "F");
    }
  } else if (t.accentBarH > 0 && t.accentBarFullW) {
    // Top accent bar (Claro)
    doc.setFillColor(...t.accentBar);
    doc.rect(0, 0, W, t.accentBarH, "F");
    // Light white header area (no fill needed)
  } else {
    // Rounded dark rect (Oscuro)
    doc.setFillColor(...t.headerBg);
    doc.roundedRect(ml, 12, contentW, t.headerH, 4, 4, "F");
  }

  // Logo
  const headerLogoY = t.fullHeaderBg ? 10 : (t.accentBarH > 0 ? t.accentBarH + 5 : 16);
  const headerLogoH = t.fullHeaderBg ? 28 : 26;
  try {
    let imgData = logoBase64;
    if (imgData === undefined) imgData = await loadImageAsBase64(window.location.origin + "/logo.png");
    if (imgData) doc.addImage(imgData, "PNG", ml + 4, headerLogoY, 52, headerLogoH);
  } catch {}

  // Header text (right side)
  const textX  = mr - 5;
  const textY1 = t.fullHeaderBg ? 18 : (t.accentBarH > 0 ? t.accentBarH + 12 : 24);
  doc.setTextColor(...t.headerTextColor);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.text("COMPROBANTE DE RESERVA", textX, textY1, { align: "right" });

  const today = new Date().toLocaleDateString("es-GT", { day:"2-digit", month:"2-digit", year:"numeric" });
  doc.setTextColor(...t.headerSubColor);
  doc.setFontSize(6.5);
  doc.text(`Generado: ${today}`, textX, textY1 + 6, { align: "right" });
  doc.setTextColor(...t.headerIdColor);
  doc.setFontSize(6);
  doc.text(`ID: ${reservation.id || ""}`, textX, textY1 + 12, { align: "right" });

  // ─── CLIENT NAME + TYPE ──────────────────────────────────────
  const contentStartY = t.fullHeaderBg ? t.headerH + 10 : (t.accentBarH > 0 ? t.accentBarH + 44 : 60);
  let y = contentStartY;
  doc.setTextColor(...t.clientNameColor);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(reservation.client_name || "Sin nombre", ml, y);

  y += 7;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.setTextColor(...t.eventTypeColor);
  doc.text(reservation.event_type || "", ml, y);

  // Status badge
  const sc = STATUS_COLORS[reservation.status] || [120, 120, 120];
  const st = STATUS_LABELS[reservation.status] || reservation.status;
  const bW = 32;
  doc.setFillColor(...sc);
  doc.roundedRect(mr - bW - 2, contentStartY - 4, bW, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(st, mr - bW / 2 - 2, contentStartY + 1.5, { align: "center" });

  // Divider
  y = contentStartY + 14;
  doc.setDrawColor(230, 230, 240); doc.setLineWidth(0.3);
  doc.line(ml, y, mr, y);

  // ─── TWO-COLUMN LAYOUT ───────────────────────────────────────
  y += 8;
  const col1x = ml, col2x = ml + contentW / 2 + 4, colW = contentW / 2 - 6;

  function sectionHeader(x, label, yPos) {
    doc.setFillColor(...t.sectionHeaderBg);
    doc.roundedRect(x, yPos, colW, 7, 1.5, 1.5, "F");
    doc.setTextColor(...t.sectionHeaderText);
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text(label, x + 3, yPos + 4.8);
    return yPos + 11;
  }

  function fieldRow(x, label, value, yPos, bold = false) {
    doc.setTextColor(...t.fieldLabelColor);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(label, x, yPos);
    doc.setTextColor(...t.fieldValueColor);
    doc.setFontSize(8.5); doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(String(value || "—"), x, yPos + 5);
    return yPos + 11;
  }

  const fmtDate = (d) => { if (!d) return "—"; const [yr, m, day] = d.split("-"); return `${day}/${m}/${yr}`; };

  // Left column
  let y1 = sectionHeader(col1x, "INFORMACIÓN DEL EVENTO", y);
  y1 = fieldRow(col1x, "Fecha del evento", fmtDate(reservation.event_date), y1, true);
  if (reservation.event_time)    y1 = fieldRow(col1x, "Hora", reservation.event_time, y1);
  if (reservation.venue)         y1 = fieldRow(col1x, "Lugar", reservation.venue, y1);
  if (reservation.guests_count)  y1 = fieldRow(col1x, "Invitados", `${reservation.guests_count} personas`, y1);
  if (reservation.client_phone)  y1 = fieldRow(col1x, "Teléfono", reservation.client_phone, y1);
  if (reservation.client_email)  y1 = fieldRow(col1x, "Email", reservation.client_email, y1);

  // Right column
  let y2 = sectionHeader(col2x, "RESUMEN DE PAGO", y);
  const total = reservation.total_amount || 0, advance = reservation.advance_paid || 0;
  const balance = total - advance, pct = total > 0 ? Math.round((advance / total) * 100) : 0;
  y2 = fieldRow(col2x, "Total del evento", formatCurrency(total), y2, true);
  y2 = fieldRow(col2x, "Anticipo pagado", formatCurrency(advance), y2, true);

  doc.setTextColor(...t.fieldLabelColor);
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("Saldo pendiente", col2x, y2);
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  if (balance > 0) doc.setTextColor(245, 130, 10); else doc.setTextColor(16, 180, 90);
  doc.text(formatCurrency(balance), col2x, y2 + 5.5);
  y2 += 11;

  // Progress bar
  doc.setFillColor(225, 227, 240);
  doc.roundedRect(col2x, y2, colW, 3.5, 1.5, 1.5, "F");
  if (pct > 0) {
    doc.setFillColor(...t.accentColor);
    doc.roundedRect(col2x, y2, (colW * pct) / 100, 3.5, 1.5, 1.5, "F");
  }
  y2 += 7;
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...t.fieldLabelColor);
  doc.text(`${pct}% pagado`, col2x, y2);

  // ─── NOTES ────────────────────────────────────────────────────
  const maxY = Math.max(y1, y2) + 8;
  if (reservation.notes) {
    doc.setDrawColor(230, 230, 240); doc.setLineWidth(0.3);
    doc.line(ml, maxY, mr, maxY);
    const nY = maxY + 8;
    doc.setFillColor(...t.notesBg);
    doc.roundedRect(ml, nY - 4, contentW, 16, 2, 2, "F");
    doc.setTextColor(...t.notesLabelColor);
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("NOTAS", ml + 3, nY);
    doc.setTextColor(...t.notesValueColor);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(reservation.notes, contentW - 8), ml + 3, nY + 5);
  }

  // ─── FOOTER ───────────────────────────────────────────────────
  const fY = H - 18;
  doc.setDrawColor(...t.footerDivColor); doc.setLineWidth(0.2);
  doc.line(ml, fY, mr, fY);
  doc.setFillColor(...t.footerBg);
  doc.rect(ml, fY, contentW, 12, "F");
  doc.setTextColor(...t.footerTextColor);
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("Cinema Productions — Sistema de Gestión de Reservas", ml + 3, fY + 5);
  doc.setTextColor(...t.footerSubColor);
  doc.text(`Impreso el ${today}`, mr - 3, fY + 5, { align: "right" });
  doc.setFontSize(6.5);
  doc.text("Este documento es un comprobante de reserva. No válido como factura.", ml + 3, fY + 10);

  doc.save(`reserva_${(reservation.client_name || "cliente").replace(/\s+/g, "_").toLowerCase()}_${reservation.event_date || "fecha"}.pdf`);
}

// ─── ALL RESERVATIONS REPORT PDF ──────────────────────────────
const ALL_STATUS_ORDER  = ["Confirmado", "Pendiente", "Completado", "Cancelado"];
const ALL_STATUS_COLORS = {
  Confirmado: [59, 130, 246], Pendiente: [245, 158, 11], Completado: [16, 185, 129], Cancelado: [239, 68, 68],
};
const ALL_STATUS_LIGHT = {
  Confirmado: [235, 244, 255], Pendiente: [255, 251, 235], Completado: [236, 253, 245], Cancelado: [254, 242, 242],
};

export async function generateAllReservationsPDF(reservations, formatCurrency, logoBase64 = undefined, pdfThemeId = "oscuro") {
  const t = PDF_THEMES[pdfThemeId] || PDF_THEMES.oscuro;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const ml = 14, mr = W - 14, contentW = mr - ml;
  const today = new Date().toLocaleDateString("es-GT", { day:"2-digit", month:"2-digit", year:"numeric" });
  const fmtDate = (d) => { if (!d) return "—"; const [yr, m, day] = d.split("-"); return `${day}/${m}/${yr}`; };

  // ── HEADER ────────────────────────────────────────────────────
  if (t.fullHeaderBg) {
    // Elegante: full-width purple
    doc.setFillColor(...t.headerBg);
    doc.rect(0, 0, W, 50, "F");
    doc.setFillColor(...t.accentBar);
    doc.rect(0, 47, W, t.accentBarH, "F");
  } else if (t.accentBarH > 0) {
    // Claro: top accent bar, white header
    doc.setFillColor(...t.accentBar);
    doc.rect(0, 0, W, t.accentBarH, "F");
  } else {
    // Oscuro: dark full-width rect
    doc.setFillColor(...t.headerBg);
    doc.rect(0, 0, W, 50, "F");
    doc.setFillColor(...t.accentBar);
    doc.rect(0, 0, W, 2.5, "F");
  }

  // Logo in header
  const hLogoY = t.fullHeaderBg ? 10 : (t.accentBarH > 0 ? t.accentBarH + 8 : 8);
  try {
    let imgData = logoBase64;
    if (imgData === undefined) imgData = await loadImageAsBase64(window.location.origin + "/logo.png");
    if (imgData) doc.addImage(imgData, "PNG", ml, hLogoY, 46, 26);
  } catch {}

  // Header title
  const hTextY = t.fullHeaderBg ? 18 : (t.accentBarH > 0 ? t.accentBarH + 16 : 18);
  doc.setTextColor(...t.headerTextColor);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE RESERVAS", mr, hTextY, { align: "right" });
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...t.headerSubColor);
  doc.text(`Generado: ${today}`, mr, hTextY + 7, { align: "right" });
  doc.text(`Total: ${reservations.length} reservas`, mr, hTextY + 13, { align: "right" });

  // ── STATS BAR ─────────────────────────────────────────────────
  const statsY = t.fullHeaderBg ? 50 : (t.accentBarH > 0 ? t.accentBarH + 38 : 50);
  doc.setFillColor(...t.statsBg);
  doc.rect(0, statsY, W, 20, "F");

  const active   = reservations.filter(r => r.status !== "Cancelado");
  const totalInc = active.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalAdv = active.reduce((s, r) => s + (r.advance_paid  || 0), 0);
  const sData = [
    { label: "ACTIVAS",     value: String(active.length) },
    { label: "CONFIRMADAS", value: String(reservations.filter(r => r.status === "Confirmado").length) },
    { label: "PENDIENTES",  value: String(reservations.filter(r => r.status === "Pendiente").length) },
    { label: "SALDO TOTAL", value: formatCurrency(totalInc - totalAdv) },
  ];
  sData.forEach((s, i) => {
    const cx = i * (W / 4) + W / 8;
    doc.setTextColor(...t.statsTextColor);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(s.value, cx, statsY + 12, { align: "center" });
    doc.setFontSize(5.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.statsSubColor);
    doc.text(s.label, cx, statsY + 17, { align: "center" });
  });

  let y = statsY + 26;

  // ── TABLE ─────────────────────────────────────────────────────
  const COL_X = [ml, ml+52, ml+92, ml+119, ml+148];
  const COL_W = [50, 38, 25, 27, 28];
  const COL_H = ["CLIENTE", "TIPO", "FECHA", "TOTAL", "ANTICIPO"];
  const ROW_H = 7.5;

  function drawGroupHeader(yPos, status) {
    const col = ALL_STATUS_COLORS[status] || [100, 100, 100];
    const count = reservations.filter(r => r.status === status).length;
    doc.setFillColor(...col);
    doc.roundedRect(ml, yPos, contentW, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text(`${status.toUpperCase()}  ·  ${count} reserva${count !== 1 ? "s" : ""}`, ml + 5, yPos + 6.2);
    return yPos + 11;
  }

  function drawColHeader(yPos, status) {
    doc.setFillColor(...(ALL_STATUS_LIGHT[status] || [242, 244, 255]));
    doc.rect(ml, yPos, contentW, 6.5, "F");
    doc.setTextColor(...(ALL_STATUS_COLORS[status] || [80, 80, 180]));
    doc.setFontSize(6); doc.setFont("helvetica", "bold");
    COL_H.forEach((h, i) => doc.text(h, COL_X[i] + 1.5, yPos + 4.5));
    return yPos + 7;
  }

  function drawRow(r, yPos, isEven) {
    if (isEven) { doc.setFillColor(...t.rowEvenBg); doc.rect(ml, yPos, contentW, ROW_H, "F"); }
    doc.setTextColor(20, 20, 45); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(r.client_name || "—", COL_W[0] - 2)[0], COL_X[0] + 1.5, yPos + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 80, 110);
    doc.text(doc.splitTextToSize(r.event_type || "—", COL_W[1] - 2)[0], COL_X[1] + 1.5, yPos + 5);
    doc.setTextColor(60, 60, 90);
    doc.text(fmtDate(r.event_date), COL_X[2] + 1.5, yPos + 5);
    doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 45);
    doc.text(formatCurrency(r.total_amount || 0), COL_X[3] + 1.5, yPos + 5);
    doc.setTextColor(16, 160, 90);
    doc.text(formatCurrency(r.advance_paid || 0), COL_X[4] + 1.5, yPos + 5);
    doc.setDrawColor(230, 232, 245); doc.setLineWidth(0.2);
    doc.line(ml, yPos + ROW_H, mr, yPos + ROW_H);
    return yPos + ROW_H;
  }

  // ── GROUPS ────────────────────────────────────────────────────
  for (const status of ALL_STATUS_ORDER) {
    const group = reservations.filter(r => r.status === status);
    if (!group.length) continue;
    if (y + 22 > H - 22) { doc.addPage(); y = 20; }
    y = drawGroupHeader(y, status);
    y = drawColHeader(y, status);
    group.forEach((r, idx) => {
      if (y + ROW_H > H - 22) { doc.addPage(); y = 20; y = drawColHeader(y, status); }
      y = drawRow(r, y, idx % 2 === 0);
    });
    y += 8;
  }

  // ── PAGE FOOTERS ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...t.footerDivColor); doc.setLineWidth(0.25);
    doc.line(ml, H - 14, mr, H - 14);
    doc.setFillColor(...t.footerBg);
    doc.rect(ml, H - 13.5, contentW, 10, "F");
    doc.setTextColor(...t.footerTextColor);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text("Cinema Productions — Reporte de Reservas", ml + 3, H - 6.5);
    doc.text(`Pág. ${i} / ${pageCount}`, mr - 3, H - 6.5, { align: "right" });
  }

  doc.save(`reporte_reservas_${new Date().toISOString().slice(0, 10)}.pdf`);
}
