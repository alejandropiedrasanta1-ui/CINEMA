import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReservation, updateReservation, uploadReceipt, deleteReceipt } from "@/lib/api";
import { ArrowLeft, Upload, Trash2, Edit2, X, ImageIcon, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReservationForm from "@/components/ReservationForm";

const STATUS_COLORS = {
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmado: "bg-blue-50 text-blue-700 border-blue-200",
  Completado: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
};

const STATUSES = ["Pendiente", "Confirmado", "Completado", "Cancelado"];

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReservation(id);
      setReservation(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la reserva", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const formatDate = (d) => {
    if (!d) return "-";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

  const handleFileUpload = async (files) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        toast({ title: "Tipo de archivo no soportado", description: "Solo imágenes y PDF", variant: "destructive" });
        continue;
      }
      setUploading(true);
      try {
        await uploadReceipt(id, file);
        toast({ title: "Comprobante subido exitosamente" });
        load();
      } catch (e) {
        toast({ title: "Error al subir", description: e.response?.data?.detail || "Error desconocido", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(Array.from(e.dataTransfer.files));
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("¿Eliminar este comprobante?")) return;
    try {
      await deleteReceipt(id, receiptId);
      toast({ title: "Comprobante eliminado" });
      load();
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateReservation(id, { status: newStatus });
      toast({ title: `Estado actualizado: ${newStatus}` });
      load();
    } catch {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-8" />
        <div className="h-64 bg-zinc-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto text-center text-zinc-400">
        Reserva no encontrada
      </div>
    );
  }

  const remaining = (reservation.total_amount || 0) - (reservation.advance_paid || 0);
  const paidPct = reservation.total_amount > 0
    ? Math.min(100, ((reservation.advance_paid || 0) / reservation.total_amount) * 100)
    : 0;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {reservation.client_name}
          </h1>
          <p className="text-sm text-zinc-400">{reservation.event_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={reservation.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-xs px-2.5 py-1.5 rounded border font-medium cursor-pointer focus:outline-none ${STATUS_COLORS[reservation.status]}`}
            data-testid="status-select"
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEdit(true)}
            data-testid="edit-btn"
            className="flex items-center gap-1.5 text-xs"
          >
            <Edit2 size={12} />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Client Info */}
          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              Información del Evento
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <InfoItem label="Fecha del evento" value={formatDate(reservation.event_date)} />
              {reservation.event_time && <InfoItem label="Hora" value={reservation.event_time} />}
              {reservation.venue && <InfoItem label="Lugar" value={reservation.venue} />}
              {reservation.guests_count && <InfoItem label="Invitados" value={reservation.guests_count} />}
              {reservation.client_phone && <InfoItem label="Teléfono" value={reservation.client_phone} />}
              {reservation.client_email && <InfoItem label="Email" value={reservation.client_email} />}
            </dl>
            {reservation.notes && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs font-medium text-zinc-500 mb-1">Notas</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Receipts */}
          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              Comprobantes de Pago
            </h2>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-zinc-500 bg-zinc-50" : "border-zinc-300 hover:border-zinc-400"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              data-testid="upload-zone"
            >
              <Upload size={20} className="mx-auto text-zinc-400 mb-2" />
              <p className="text-sm text-zinc-500">
                {uploading ? "Subiendo..." : "Arrastra o haz clic para subir comprobante"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">JPG, PNG, PDF — máx 10MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                data-testid="file-input"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
              />
            </div>

            {/* Thumbnail Grid */}
            {reservation.receipt_images && reservation.receipt_images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4" data-testid="receipts-grid">
                {reservation.receipt_images.map((img) => (
                  <div key={img.id} className="relative group rounded-md overflow-hidden border border-zinc-200 bg-zinc-50 aspect-video flex items-center justify-center">
                    {img.content_type?.startsWith("image/") ? (
                      <img
                        src={`data:${img.content_type};base64,${img.data}`}
                        alt={img.filename}
                        className="object-cover w-full h-full cursor-pointer"
                        onClick={() => setLightbox(img)}
                        data-testid={`receipt-img-${img.id}`}
                      />
                    ) : (
                      <div
                        className="flex flex-col items-center gap-1 cursor-pointer py-4"
                        onClick={() => setLightbox(img)}
                      >
                        <ImageIcon size={24} className="text-zinc-400" />
                        <p className="text-xs text-zinc-500 truncate max-w-full px-2">{img.filename}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteReceipt(img.id)}
                      className="absolute top-1 right-1 p-1 rounded bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-zinc-500 hover:text-red-500 transition-all"
                      data-testid={`delete-receipt-${img.id}`}
                    >
                      <Trash2 size={12} />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 bg-white/80 text-xs text-zinc-500 px-2 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-all">
                      {img.filename}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Summary */}
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              Resumen de Pago
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Total</span>
                <span className="text-sm font-semibold text-zinc-900">{formatCurrency(reservation.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Anticipo pagado</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(reservation.advance_paid)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-zinc-700">Saldo pendiente</span>
                  <span className={`text-sm font-bold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {formatCurrency(remaining)}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full">
                  <div
                    className="h-2 bg-zinc-800 rounded-full transition-all"
                    style={{ width: `${paidPct}%` }}
                    data-testid="payment-progress"
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{Math.round(paidPct)}% pagado</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wide" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              Comprobantes
            </h2>
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-600">
                {(reservation.receipt_images || []).length} archivo(s) subido(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          data-testid="lightbox"
        >
          <button className="absolute top-4 right-4 text-white hover:text-zinc-300" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          {lightbox.content_type?.startsWith("image/") ? (
            <img
              src={`data:${lightbox.content_type};base64,${lightbox.data}`}
              alt={lightbox.filename}
              className="max-w-full max-h-[90vh] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="bg-white rounded p-8 text-center">
              <ImageIcon size={48} className="mx-auto text-zinc-400 mb-2" />
              <p className="text-zinc-600">{lightbox.filename}</p>
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <ReservationForm
          reservation={reservation}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
