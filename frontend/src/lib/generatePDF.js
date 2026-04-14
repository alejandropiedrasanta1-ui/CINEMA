import jsPDF from "jspdf";

// Load image to base64
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const STATUS_COLORS_PDF = {
  Pendiente:  [245, 158, 11],
  Confirmado: [59, 130, 246],
  Completado: [16, 185, 129],
  Cancelado:  [239, 68, 68],
};

const STATUS_LABELS_PDF = {
  Pendiente: "PENDIENTE", Confirmado: "CONFIRMADO", Completado: "COMPLETADO", Cancelado: "CANCELADO",
};

export async function generateReservationPDF(reservation, formatCurrency) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ml = 20; // margin left
  const mr = W - 20; // margin right
  const contentW = mr - ml;

  // ─── Header background (dark) ─────────────────────────────────
  doc.setFillColor(15, 15, 25);
  doc.roundedRect(ml, 12, contentW, 38, 4, 4, "F");

  // Logo in header
  try {
    const logoBase64 = await loadImageAsBase64(window.location.origin + "/logo.png");
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", ml + 6, 16, 52, 30);
    }
  } catch {}

  // Header right text
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("COMPROBANTE DE RESERVA", mr - 5, 24, { align: "right" });

  const today = new Date().toLocaleDateString("es-GT", { day:"2-digit", month:"2-digit", year:"numeric" });
  doc.setTextColor(120, 120, 150);
  doc.setFontSize(6.5);
  doc.text(`Generado: ${today}`, mr - 5, 30, { align: "right" });

  // Reservation ID
  doc.setTextColor(100, 100, 130);
  doc.setFontSize(6);
  doc.text(`ID: ${reservation.id || ""}`, mr - 5, 36, { align: "right" });

  // ─── Client name + event type ─────────────────────────────────
  let y = 60;
  doc.setTextColor(20, 20, 35);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(reservation.client_name || "Sin nombre", ml, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text(reservation.event_type || "", ml, y);

  // Status badge
  const statusColor = STATUS_COLORS_PDF[reservation.status] || [120, 120, 120];
  const statusText = STATUS_LABELS_PDF[reservation.status] || reservation.status;
  const badgeW = 30;
  doc.setFillColor(...statusColor);
  doc.roundedRect(mr - badgeW - 2, 57, badgeW, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, mr - badgeW/2 - 2, 62.5, { align: "center" });

  // Divider
  y = 72;
  doc.setDrawColor(230, 230, 240);
  doc.setLineWidth(0.3);
  doc.line(ml, y, mr, y);

  // ─── Two-column layout ────────────────────────────────────────
  y += 8;
  const col1x = ml;
  const col2x = ml + contentW / 2 + 4;
  const colW = contentW / 2 - 6;

  // Section headers
  function sectionHeader(x, label, yPos) {
    doc.setFillColor(240, 241, 255);
    doc.roundedRect(x, yPos, colW, 7, 1.5, 1.5, "F");
    doc.setTextColor(80, 80, 180);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(label, x + 3, yPos + 4.8);
    return yPos + 11;
  }

  function fieldRow(x, label, value, yPos, bold = false) {
    doc.setTextColor(120, 120, 140);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, x, yPos);
    doc.setTextColor(25, 25, 40);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(String(value || "—"), x, yPos + 5);
    return yPos + 11;
  }

  // Left column: Event info
  let y1 = sectionHeader(col1x, "INFORMACIÓN DEL EVENTO", y);

  const formatDate = (d) => {
    if (!d) return "—";
    const [yr, m, day] = d.split("-");
    return `${day}/${m}/${yr}`;
  };

  y1 = fieldRow(col1x, "Fecha del evento", formatDate(reservation.event_date), y1, true);
  if (reservation.event_time) y1 = fieldRow(col1x, "Hora", reservation.event_time, y1);
  if (reservation.venue) y1 = fieldRow(col1x, "Lugar", reservation.venue, y1);
  if (reservation.guests_count) y1 = fieldRow(col1x, "Invitados", `${reservation.guests_count} personas`, y1);
  if (reservation.client_phone) y1 = fieldRow(col1x, "Teléfono", reservation.client_phone, y1);
  if (reservation.client_email) y1 = fieldRow(col1x, "Email", reservation.client_email, y1);

  // Right column: Payment
  let y2 = sectionHeader(col2x, "RESUMEN DE PAGO", y);
  const total = reservation.total_amount || 0;
  const advance = reservation.advance_paid || 0;
  const balance = total - advance;
  const pct = total > 0 ? Math.round((advance / total) * 100) : 0;

  y2 = fieldRow(col2x, "Total del evento", formatCurrency(total), y2, true);
  y2 = fieldRow(col2x, "Anticipo pagado", formatCurrency(advance), y2, true);

  // Balance row with color
  doc.setTextColor(120, 120, 140);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Saldo pendiente", col2x, y2);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (balance > 0) doc.setTextColor(245, 130, 10);
  else doc.setTextColor(16, 180, 90);
  doc.text(formatCurrency(balance), col2x, y2 + 5.5);
  y2 += 11;

  // Progress bar
  const barW = colW;
  const barH = 3.5;
  doc.setFillColor(230, 232, 245);
  doc.roundedRect(col2x, y2, barW, barH, 1.5, 1.5, "F");
  if (pct > 0) {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(col2x, y2, (barW * pct) / 100, barH, 1.5, 1.5, "F");
  }
  y2 += barH + 3;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 140);
  doc.text(`${pct}% pagado`, col2x, y2);

  // ─── Notes section ────────────────────────────────────────────
  const maxY = Math.max(y1, y2) + 8;
  if (reservation.notes) {
    doc.setDrawColor(230, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(ml, maxY, mr, maxY);
    const notesY = maxY + 8;
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(ml, notesY - 4, contentW, 5 + 10, 2, 2, "F");
    doc.setTextColor(80, 80, 180);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS", ml + 3, notesY);
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(reservation.notes, contentW - 8);
    doc.text(notesLines, ml + 3, notesY + 5);
  }

  // ─── Footer ───────────────────────────────────────────────────
  const footerY = H - 18;
  doc.setDrawColor(210, 210, 230);
  doc.setLineWidth(0.2);
  doc.line(ml, footerY, mr, footerY);
  doc.setFillColor(248, 248, 255);
  doc.rect(ml, footerY, contentW, 12, "F");
  doc.setTextColor(100, 100, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Cinema Productions — Sistema de Gestión de Reservas", ml + 3, footerY + 5);
  doc.setTextColor(140, 140, 170);
  doc.text(`Impreso el ${today}`, mr - 3, footerY + 5, { align: "right" });
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 180);
  doc.text("Este documento es un comprobante de reserva. No válido como factura.", ml + 3, footerY + 10);

  // Save
  const filename = `reserva_${(reservation.client_name || "cliente").replace(/\s+/g, "_").toLowerCase()}_${reservation.event_date || "fecha"}.pdf`;
  doc.save(filename);
}
