import { useState, useEffect } from "react";
import { createSocio, updateSocio, uploadSocioPhoto } from "@/lib/api";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Fotógrafo", "Videógrafo", "Asistente"];

export default function SocioForm({ socio, onClose, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!socio;
  const [saving, setSaving]           = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]     = useState(null);
  const [form, setForm] = useState({
    name:"", role:"Fotógrafo", phone:"", email:"", notes:"", rate_per_event:"",
  });

  useEffect(() => {
    if (socio) {
      setForm({ name:socio.name||"", role:socio.role||"Fotógrafo", phone:socio.phone||"", email:socio.email||"", notes:socio.notes||"", rate_per_event:socio.rate_per_event||"" });
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
    if (!form.name.trim()) { toast({ title:"Nombre requerido", variant:"destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), role: form.role,
        phone: form.phone||null, email: form.email||null, notes: form.notes||null,
        rate_per_event: form.rate_per_event !== "" && form.rate_per_event !== null ? parseFloat(form.rate_per_event) : null,
      };
      let saved;
      if (isEdit) saved = await updateSocio(socio.id, payload);
      else        saved = await createSocio(payload);
      if (photoFile) await uploadSocioPhoto(saved.id, photoFile);
      toast({ title: isEdit ? "Socio actualizado" : "Socio creado" });
      onSaved();
    } catch (err) {
      console.error("Error guardando socio:", err);
      toast({ title:"Error al guardar", description:err.response?.data?.detail||err.message||"Error", variant:"destructive" });
    } finally { setSaving(false); }
  };

  const inp = "w-full text-base px-5 py-4 rounded-2xl bg-white/70 border-2 border-white/80 focus:outline-none focus:border-[var(--t-from)] focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all duration-200";

  return (
    <motion.div
      initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:20 }} transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background:"linear-gradient(135deg, rgba(238,242,255,0.98) 0%, rgba(248,250,255,0.98) 50%, rgba(240,248,255,0.98) 100%)", backdropFilter:"blur(20px)" }}
      data-testid="socio-form"
    >
      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-10 py-5 border-b border-slate-200/60 bg-white/40">
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} type="button" onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full glass border-slate-200/60 text-slate-600 font-bold text-sm hover:bg-white/80 transition-colors">
            <ArrowLeft size={16}/> Cancelar
          </motion.button>
          <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily:'Cabinet Grotesk, sans-serif' }}>
            {isEdit ? "Editar Socio" : "Nuevo Socio"}
          </h1>
        </div>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} type="button" onClick={handleSubmit}
          disabled={saving}
          className="px-8 py-3 rounded-full btn-primary text-white font-bold text-base disabled:opacity-60 shadow-lg"
          data-testid="submit-socio-btn">
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear socio"}
        </motion.button>
      </div>

      {/* ── FORM BODY ── */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center justify-center px-10 py-8">
        <div className="w-full max-w-3xl flex gap-10 items-start">

          {/* ── FOTO (izquierda) ── */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <label className="relative cursor-pointer group">
              <div className="w-40 h-40 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl">
                {photoPreview
                  ? <img src={photoPreview} alt="foto" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full btn-primary flex flex-col items-center justify-center gap-2">
                      <Camera size={40} className="text-white/80"/>
                      <span className="text-white/70 text-xs font-bold">Agregar foto</span>
                    </div>}
              </div>
              <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full btn-primary flex items-center justify-center ring-2 ring-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Upload size={15} className="text-white"/>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} data-testid="socio-photo-input"/>
            </label>
            <p className="text-xs text-slate-400 font-bold text-center">Foto de perfil<br/>(opcional)</p>
          </div>

          {/* ── CAMPOS (derecha) ── */}
          <div className="flex-1 flex flex-col gap-6">

            {/* Nombre */}
            <div>
              <Label>Nombre completo *</Label>
              <input value={form.name} onChange={set("name")} placeholder="Ej: Carlos Pérez" required data-testid="input-socio-name" className={inp}/>
            </div>

            {/* Rol */}
            <div>
              <Label>Rol *</Label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map(r => (
                  <motion.button key={r} type="button" whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                    onClick={() => setForm(p => ({ ...p, role:r }))}
                    className={`py-4 rounded-2xl text-sm font-bold transition-all ${form.role===r ? "btn-primary text-white shadow-md" : "bg-white/70 border-2 border-white/80 text-slate-600 hover:bg-white"}`}
                    data-testid={`role-${r.toLowerCase()}`}>
                    {r==="Fotógrafo"?"📷":r==="Videógrafo"?"🎥":"👤"} {r}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Teléfono + Tarifa + Email */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <Label>Teléfono</Label>
                <input value={form.phone} onChange={set("phone")} placeholder="+502 1234 5678" data-testid="input-socio-phone" className={inp}/>
              </div>
              <div>
                <Label>Tarifa por evento</Label>
                <input type="number" value={form.rate_per_event} onChange={set("rate_per_event")} placeholder="Q 2,000" min="0" data-testid="input-socio-rate" className={inp}/>
              </div>
              <div>
                <Label>Email</Label>
                <input type="email" value={form.email} onChange={set("email")} placeholder="correo@email.com" data-testid="input-socio-email" className={inp}/>
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label>Notas</Label>
              <input value={form.notes} onChange={set("notes")} placeholder="Especialidades, equipo, disponibilidad…" data-testid="input-socio-notes" className={inp}/>
            </div>

          </div>
        </div>
      </form>
    </motion.div>
  );
}

function Label({ children }) {
  return <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{children}</label>;
}
