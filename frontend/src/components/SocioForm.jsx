import { useState, useEffect } from "react";
import { createSocio, updateSocio, uploadSocioPhoto } from "@/lib/api";
import { X, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Fotógrafo", "Videógrafo", "Asistente"];

export default function SocioForm({ socio, onClose, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!socio;
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    name: "", role: "Fotógrafo", phone: "", email: "", notes: "", rate_per_event: "",
  });

  useEffect(() => {
    if (socio) {
      setForm({ name: socio.name || "", role: socio.role || "Fotógrafo", phone: socio.phone || "", email: socio.email || "", notes: socio.notes || "", rate_per_event: socio.rate_per_event || "" });
      if (socio.photo && socio.photo_content_type)
        setPhotoPreview(`data:${socio.photo_content_type};base64,${socio.photo}`);
    }
  }, [socio]);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        rate_per_event: form.rate_per_event !== "" && form.rate_per_event !== null ? parseFloat(form.rate_per_event) : null,
      };
      let saved;
      if (isEdit) saved = await updateSocio(socio.id, payload);
      else saved = await createSocio(payload);
      if (photoFile) await uploadSocioPhoto(saved.id, photoFile);
      toast({ title: isEdit ? "Socio actualizado" : "Socio creado" });
      onSaved();
    } catch (err) {
      console.error("Error guardando socio:", err);
      const msg = err.response?.data?.detail || err.message || "Error inesperado";
      toast({ title: "Error al guardar", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const inputClass = "w-full text-sm px-4 py-2.5 rounded-2xl bg-white/50 border border-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 text-slate-800 placeholder-slate-400 font-medium transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8 px-4" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(15,23,42,0.35)" }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="glass-modal rounded-3xl w-full max-w-md" data-testid="socio-form">

        <div className="flex items-center justify-between px-7 py-5 border-b border-white/40">
          <h2 className="text-base font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {isEdit ? "Editar Socio" : "Nuevo Socio"}
          </h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="p-2 rounded-full glass hover:bg-white/60 text-slate-500"><X size={15} /></motion.button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {/* Photo upload */}
          <div className="flex justify-center mb-2">
            <label className="relative cursor-pointer group">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/60 shadow-lg">
                {photoPreview ? (
                  <img src={photoPreview} alt="foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full btn-primary flex items-center justify-center">
                    <Camera size={28} className="text-white/80" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full btn-primary flex items-center justify-center ring-2 ring-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={12} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} data-testid="socio-photo-input" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
            <input value={form.name} onChange={set("name")} placeholder="Ej: Carlos Pérez" required data-testid="input-socio-name" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Rol *</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <motion.button key={r} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${form.role === r ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"}`}
                  data-testid={`role-${r.toLowerCase()}`}>
                  {r === "Fotógrafo" ? "📷" : r === "Videógrafo" ? "🎥" : "👤"} {r}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
              <input value={form.phone} onChange={set("phone")} placeholder="+502 1234 5678" data-testid="input-socio-phone" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Tarifa por evento</label>
              <input type="number" value={form.rate_per_event} onChange={set("rate_per_event")} placeholder="Q 2,000" min="0" data-testid="input-socio-rate" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="correo@email.com" data-testid="input-socio-email" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Notas</label>
            <textarea value={form.notes} onChange={set("notes")} placeholder="Especialidades, equipo..." rows={2} data-testid="input-socio-notes" className={`${inputClass} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-full glass border-white/60 text-sm font-bold text-slate-700 hover:bg-white/60">
              Cancelar
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving}
              data-testid="submit-socio-btn" className="px-6 py-2.5 rounded-full btn-primary text-white text-sm font-bold disabled:opacity-60">
              {saving ? "Guardando..." : isEdit ? "Guardar" : "Crear socio"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
