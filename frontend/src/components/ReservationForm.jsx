import { useState, useEffect } from "react";
import { createReservation, updateReservation } from "@/lib/api";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";

const EVENT_TYPES = ["Boda","Quinceañera","Fiesta Social","Evento Corporativo","Conferencia","Otro"];
const STATUSES = ["Pendiente","Confirmado","Completado","Cancelado"];

const inputClass = "w-full text-sm px-4 py-2.5 rounded-2xl bg-white/50 border border-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 focus:bg-white/70 text-slate-800 placeholder-slate-400 font-medium transition-all duration-200";
const selectClass = "w-full text-sm px-4 py-2.5 rounded-2xl bg-white/50 border border-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 text-slate-800 font-medium transition-all duration-200";

export default function ReservationForm({ reservation, onClose, onSaved }) {
  const { toast } = useToast();
  const { tr } = useSettings();
  const f = tr.form;
  const isEdit = !!reservation;

  const [form, setForm] = useState({
    client_name:"", client_phone:"", client_email:"",
    event_type:"Boda", event_date:"", event_time:"",
    venue:"", guests_count:"", total_amount:"",
    advance_paid:"0", status:"Pendiente", notes:"",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reservation) setForm({
      client_name: reservation.client_name||"", client_phone: reservation.client_phone||"",
      client_email: reservation.client_email||"", event_type: reservation.event_type||"Boda",
      event_date: reservation.event_date||"", event_time: reservation.event_time||"",
      venue: reservation.venue||"", guests_count: reservation.guests_count||"",
      total_amount: reservation.total_amount||"", advance_paid: reservation.advance_paid||"0",
      status: reservation.status||"Pendiente", notes: reservation.notes||"",
    });
  }, [reservation]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast({ title: f.validations?.nameRequired||"Nombre requerido", variant:"destructive" }); return; }
    if (!form.event_date) { toast({ title: f.validations?.dateRequired||"Fecha requerida", variant:"destructive" }); return; }
    if (!form.total_amount || isNaN(Number(form.total_amount))) { toast({ title: f.validations?.amountInvalid||"Monto inválido", variant:"destructive" }); return; }
    setSaving(true);
    const payload = { ...form, guests_count: form.guests_count ? parseInt(form.guests_count) : null, total_amount: parseFloat(form.total_amount), advance_paid: parseFloat(form.advance_paid)||0 };
    try {
      if (isEdit) { await updateReservation(reservation.id, payload); toast({ title: f.toasts?.updated||"Actualizado" }); }
      else { await createReservation(payload); toast({ title: f.toasts?.created||"Creado" }); }
      onSaved();
    } catch (err) {
      toast({ title: f.validations?.saveError||"Error al guardar", description: err.response?.data?.detail||"Error", variant:"destructive" });
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
        style={{ backdropFilter:"blur(12px)", backgroundColor:"rgba(15,23,42,0.35)" }}>
        <motion.div initial={{ opacity:0, y:30, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:0.96 }}
          transition={{ duration:0.35, ease:[0.22,1,0.36,1] }} className="glass-modal rounded-3xl w-full max-w-xl" data-testid="reservation-form">
          <div className="flex items-center justify-between px-7 py-5 border-b border-white/40">
            <h2 className="text-lg font-black text-slate-900" style={{ fontFamily:'Cabinet Grotesk, sans-serif' }}>
              {isEdit ? f.editTitle : f.newTitle}
            </h2>
            <motion.button whileHover={{ scale:1.1, rotate:90 }} whileTap={{ scale:0.9 }} onClick={onClose}
              className="p-2 rounded-full glass hover:bg-white/60 text-slate-500 transition-colors" data-testid="close-form-btn"><X size={15} /></motion.button>
          </div>

          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            <Field label={f.clientName}>
              <input value={form.client_name} onChange={set("client_name")} placeholder={f.placeholders?.name||"Ej: María García"} required data-testid="input-client-name" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.phone}><input value={form.client_phone} onChange={set("client_phone")} placeholder={f.placeholders?.phone||"+52 55 0000 0000"} data-testid="input-phone" className={inputClass} /></Field>
              <Field label={f.email}><input value={form.client_email} onChange={set("client_email")} placeholder={f.placeholders?.email||"correo@email.com"} type="email" data-testid="input-email" className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.eventType}>
                <select value={form.event_type} onChange={set("event_type")} required data-testid="input-event-type" className={selectClass}>
                  {EVENT_TYPES.map(t => <option key={t} className="bg-white">{t}</option>)}
                </select>
              </Field>
              <Field label={f.status}>
                <select value={form.status} onChange={set("status")} data-testid="input-status" className={selectClass}>
                  {STATUSES.map(s => <option key={s} value={s} className="bg-white">{tr.statuses[s]||s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.eventDate}><input type="date" value={form.event_date} onChange={set("event_date")} required data-testid="input-event-date" className={inputClass} /></Field>
              <Field label={f.time}><input type="time" value={form.event_time} onChange={set("event_time")} data-testid="input-event-time" className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.venue}><input value={form.venue} onChange={set("venue")} placeholder={f.placeholders?.venue||"Salón..."} data-testid="input-venue" className={inputClass} /></Field>
              <Field label={f.guests}><input type="number" value={form.guests_count} onChange={set("guests_count")} placeholder={f.placeholders?.guests||"150"} min="0" data-testid="input-guests" className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.totalAmount}><input type="number" value={form.total_amount} onChange={set("total_amount")} placeholder="50000" min="0" step="0.01" required data-testid="input-total" className={inputClass} /></Field>
              <Field label={f.advancePaid}><input type="number" value={form.advance_paid} onChange={set("advance_paid")} placeholder="10000" min="0" step="0.01" data-testid="input-advance" className={inputClass} /></Field>
            </div>
            <Field label={f.notes}><textarea value={form.notes} onChange={set("notes")} placeholder={f.placeholders?.notes||"Detalles especiales..."} rows={3} data-testid="input-notes" className={`${inputClass} resize-none`} /></Field>

            <div className="flex justify-end gap-3 pt-2">
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} type="button" onClick={onClose} data-testid="cancel-form-btn"
                className="px-5 py-2.5 rounded-full glass border-white/60 text-sm font-bold text-slate-700 hover:bg-white/60 transition-colors">
                {tr.common.cancel}
              </motion.button>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} type="submit" disabled={saving} data-testid="submit-form-btn"
                className="px-6 py-2.5 rounded-full btn-primary text-white text-sm font-bold disabled:opacity-60">
                {saving ? tr.common.saving : isEdit ? tr.common.save : tr.common.create}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
