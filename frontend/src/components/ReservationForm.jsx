import { useState, useEffect } from "react";
import { createReservation, updateReservation } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { getEventTypeName } from "@/lib/eventConfig";
import { FORM_DESIGN_CONFIGS } from "@/lib/formDesigns";

const EVENT_TYPES = ["Boda","Quinceañera","Fiesta Social","Evento Corporativo","Conferencia","Otro"];

export default function ReservationForm({ reservation, onClose, onSaved }) {
  const { toast } = useToast();
  const { tr, activeStatuses, formFieldsVisibility, reservationFormDesign } = useSettings();
  const f = tr.form;
  const ff = formFieldsVisibility || {};
  const dc = FORM_DESIGN_CONFIGS[reservationFormDesign] || FORM_DESIGN_CONFIGS.aurora;
  const inp = dc.inp;
  const sel = `${dc.inp} cursor-pointer`;
  const Label = ({ children }) => (
    <label className={dc.labelClass} style={dc.labelStyle}>{children}</label>
  );
  const isEdit = !!reservation;  const [form, setForm] = useState({
    client_name:"", client_phone:"", client_email:"",
    event_type:"Boda", event_date:"", event_time:"",
    venue:"", guests_count:"", total_amount:"",
    advance_paid:"0", status:"Pendiente", notes:"",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reservation) setForm({
      client_name: reservation.client_name||"",
      client_phone: reservation.client_phone||"",
      client_email: reservation.client_email||"",
      event_type: reservation.event_type||"Boda",
      event_date: reservation.event_date||"",
      event_time: reservation.event_time||"",
      venue: reservation.venue||"",
      guests_count: reservation.guests_count||"",
      total_amount: reservation.total_amount||"",
      advance_paid: reservation.advance_paid||"0",
      status: reservation.status||"Pendiente",
      notes: reservation.notes||"",
    });
  }, [reservation]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast({ title: "Nombre requerido", variant:"destructive" }); return; }
    if (!form.event_date)         { toast({ title: "Fecha requerida",  variant:"destructive" }); return; }
    if (!form.total_amount || isNaN(Number(form.total_amount))) {
      toast({ title: "Monto inválido", variant:"destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      guests_count: form.guests_count ? parseInt(form.guests_count) : null,
      total_amount: parseFloat(form.total_amount),
      advance_paid: parseFloat(form.advance_paid) || 0,
    };
    try {
      if (isEdit) { await updateReservation(reservation.id, payload); toast({ title: "Reserva actualizada" }); }
      else        { await createReservation(payload);                  toast({ title: "Reserva creada" }); }
      onSaved();
    } catch (err) {
      toast({ title: "Error al guardar", description: err.response?.data?.detail || "Error", variant:"destructive" });
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3, ease: [0.22,1,0.36,1] }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: dc.containerBg, backdropFilter: "blur(20px)" }}
      data-testid="reservation-form"
    >
      {/* ── TOP BAR ── */}
      <div className={`flex-shrink-0 flex items-center justify-between px-10 py-5 border-b ${dc.barClass}`}>
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} type="button" onClick={onClose}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-colors ${dc.cancelClass}`}
            data-testid="cancel-form-btn">
            <ArrowLeft size={16}/> Cancelar
          </motion.button>
          <h1 className={`text-2xl font-black ${dc.titleClass}`} style={{ fontFamily:'Cabinet Grotesk, sans-serif' }}>
            {isEdit ? "Editar Reserva" : "Nueva Reserva"}
          </h1>
        </div>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} type="button" onClick={handleSubmit}
          disabled={saving}
          className="px-8 py-3 rounded-full btn-primary text-white font-bold text-base disabled:opacity-60 shadow-lg"
          data-testid="submit-form-btn">
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear reserva"}
        </motion.button>
      </div>

      {/* ── FORM BODY ── */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center px-10 py-8 gap-5">

        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1">
            <Label>{f.clientName}</Label>
            <input value={form.client_name} onChange={set("client_name")} placeholder="Ej: María García" required data-testid="input-client-name" className={inp} style={dc.inpStyle}/>
          </div>
          {ff.phone !== false && (
            <div>
              <Label>{f.phone}</Label>
              <input value={form.client_phone} onChange={set("client_phone")} placeholder="+502 1234 5678" data-testid="input-phone" className={inp} style={dc.inpStyle}/>
            </div>
          )}
          {ff.email !== false && (
            <div>
              <Label>{f.email}</Label>
              <input type="email" value={form.client_email} onChange={set("client_email")} placeholder="correo@email.com" data-testid="input-email" className={inp} style={dc.inpStyle}/>
            </div>
          )}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-4 gap-5">
          <div>
            <Label>{f.eventType}</Label>
            <select value={form.event_type} onChange={set("event_type")} required data-testid="input-event-type" className={sel} style={dc.inpStyle}>
              {EVENT_TYPES.map(t => <option key={t} value={t} className="bg-white text-slate-800">{getEventTypeName(t)}</option>)}
            </select>
          </div>
          <div>
            <Label>{f.status}</Label>
            <select value={form.status} onChange={set("status")} data-testid="input-status" className={sel} style={dc.inpStyle}>
              {activeStatuses.map(s => <option key={s.key} value={s.key} className="bg-white text-slate-800">{s.label}</option>)}
            </select>
          </div>
          <div>
            <Label>{f.eventDate}</Label>
            <input type="date" value={form.event_date} onChange={set("event_date")} required data-testid="input-event-date" className={inp} style={dc.inpStyle}/>
          </div>
          {ff.time !== false && (
            <div>
              <Label>{f.time}</Label>
              <input type="time" value={form.event_time} onChange={set("event_time")} data-testid="input-event-time" className={inp} style={dc.inpStyle}/>
            </div>
          )}
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-4 gap-5">
          {ff.venue !== false && (
            <div className="col-span-2">
              <Label>{f.venue}</Label>
              <input value={form.venue} onChange={set("venue")} placeholder="Salón / Hotel / Iglesia…" data-testid="input-venue" className={inp} style={dc.inpStyle}/>
            </div>
          )}
          {ff.guests !== false && (
            <div>
              <Label>{f.guests}</Label>
              <input type="number" value={form.guests_count} onChange={set("guests_count")} placeholder="150" min="0" data-testid="input-guests" className={inp} style={dc.inpStyle}/>
            </div>
          )}
          <div>
            <Label>{f.totalAmount}</Label>
            <input type="number" value={form.total_amount} onChange={set("total_amount")} placeholder="50,000" min="0" step="0.01" required data-testid="input-total" className={inp} style={dc.inpStyle}/>
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-4 gap-5">
          {ff.advance !== false && (
            <div>
              <Label>{f.advancePaid}</Label>
              <input type="number" value={form.advance_paid} onChange={set("advance_paid")} placeholder="10,000" min="0" step="0.01" data-testid="input-advance" className={inp} style={dc.inpStyle}/>
            </div>
          )}
          {ff.notes !== false && (
            <div className="col-span-3">
              <Label>{f.notes}</Label>
              <input value={form.notes} onChange={set("notes")} placeholder="Detalles especiales, temas, requerimientos…" data-testid="input-notes" className={inp} style={dc.inpStyle}/>
            </div>
          )}
        </div>

      </form>
    </motion.div>
  );
}
