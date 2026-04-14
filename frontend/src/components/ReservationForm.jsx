import { useState, useEffect } from "react";
import { createReservation, updateReservation } from "@/lib/api";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = ["Boda", "Quinceañera", "Fiesta Social", "Evento Corporativo", "Conferencia", "Otro"];
const STATUSES = ["Pendiente", "Confirmado", "Completado", "Cancelado"];

export default function ReservationForm({ reservation, onClose, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!reservation;

  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    event_type: "Boda",
    event_date: "",
    event_time: "",
    venue: "",
    guests_count: "",
    total_amount: "",
    advance_paid: "0",
    status: "Pendiente",
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reservation) {
      setForm({
        client_name: reservation.client_name || "",
        client_phone: reservation.client_phone || "",
        client_email: reservation.client_email || "",
        event_type: reservation.event_type || "Boda",
        event_date: reservation.event_date || "",
        event_time: reservation.event_time || "",
        venue: reservation.venue || "",
        guests_count: reservation.guests_count || "",
        total_amount: reservation.total_amount || "",
        advance_paid: reservation.advance_paid || "0",
        status: reservation.status || "Pendiente",
        notes: reservation.notes || "",
      });
    }
  }, [reservation]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      toast({ title: "El nombre del cliente es requerido", variant: "destructive" });
      return;
    }
    if (!form.event_date) {
      toast({ title: "La fecha del evento es requerida", variant: "destructive" });
      return;
    }
    if (!form.total_amount || isNaN(Number(form.total_amount))) {
      toast({ title: "El monto total debe ser un número válido", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      guests_count: form.guests_count ? parseInt(form.guests_count) : null,
      total_amount: parseFloat(form.total_amount),
      advance_paid: parseFloat(form.advance_paid) || 0,
    };

    try {
      if (isEdit) {
        await updateReservation(reservation.id, payload);
        toast({ title: "Reserva actualizada exitosamente" });
      } else {
        await createReservation(payload);
        toast({ title: "Reserva creada exitosamente" });
      }
      onSaved();
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err.response?.data?.detail || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-md border border-zinc-200 w-full max-w-xl shadow-sm" data-testid="reservation-form">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {isEdit ? "Editar Reserva" : "Nueva Reserva"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 transition-colors"
            data-testid="close-form-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client Name */}
          <Field label="Nombre del cliente *">
            <Input
              value={form.client_name}
              onChange={set("client_name")}
              placeholder="Ej: María García"
              required
              data-testid="input-client-name"
              className="border-zinc-300"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <Input
                value={form.client_phone}
                onChange={set("client_phone")}
                placeholder="+52 55 0000 0000"
                data-testid="input-phone"
                className="border-zinc-300"
              />
            </Field>
            <Field label="Email">
              <Input
                value={form.client_email}
                onChange={set("client_email")}
                placeholder="cliente@email.com"
                type="email"
                data-testid="input-email"
                className="border-zinc-300"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de evento *">
              <select
                value={form.event_type}
                onChange={set("event_type")}
                required
                data-testid="input-event-type"
                className="w-full text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={set("status")}
                data-testid="input-status"
                className="w-full text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del evento *">
              <Input
                type="date"
                value={form.event_date}
                onChange={set("event_date")}
                required
                data-testid="input-event-date"
                className="border-zinc-300"
              />
            </Field>
            <Field label="Hora (opcional)">
              <Input
                type="time"
                value={form.event_time}
                onChange={set("event_time")}
                data-testid="input-event-time"
                className="border-zinc-300"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lugar del evento">
              <Input
                value={form.venue}
                onChange={set("venue")}
                placeholder="Salón, hotel..."
                data-testid="input-venue"
                className="border-zinc-300"
              />
            </Field>
            <Field label="N° de invitados">
              <Input
                type="number"
                value={form.guests_count}
                onChange={set("guests_count")}
                placeholder="150"
                min="0"
                data-testid="input-guests"
                className="border-zinc-300"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total (MXN) *">
              <Input
                type="number"
                value={form.total_amount}
                onChange={set("total_amount")}
                placeholder="50000"
                min="0"
                step="0.01"
                required
                data-testid="input-total"
                className="border-zinc-300"
              />
            </Field>
            <Field label="Anticipo pagado (MXN)">
              <Input
                type="number"
                value={form.advance_paid}
                onChange={set("advance_paid")}
                placeholder="10000"
                min="0"
                step="0.01"
                data-testid="input-advance"
                className="border-zinc-300"
              />
            </Field>
          </div>

          <Field label="Notas adicionales">
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Detalles especiales, requerimientos..."
              rows={3}
              data-testid="input-notes"
              className="w-full text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
            />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="cancel-form-btn"
              className="text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="submit-form-btn"
              className="bg-zinc-900 text-white hover:bg-zinc-700 text-sm"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear reserva"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
