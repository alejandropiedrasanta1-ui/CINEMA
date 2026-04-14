import { useState } from "react";
import { updateReservation } from "@/lib/api";
import { MapPin, Navigation, Edit2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LOCATION_TYPES = [
  { key: "maquillaje", label: "Maquillaje", icon: "💄", color: "from-pink-400 to-rose-500" },
  { key: "ceremonia",  label: "Ceremonia",  icon: "⛪", color: "from-indigo-400 to-purple-500" },
  { key: "fiesta",     label: "Fiesta",     icon: "🎉", color: "from-amber-400 to-orange-500" },
];

function getLocation(locations, type) {
  return (locations || []).find(l => l.type === type) || { type, address: "", waze_url: "" };
}

export default function LocationsSection({ reservation, onUpdated }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locs, setLocs] = useState(() =>
    LOCATION_TYPES.map(t => getLocation(reservation.locations, t.key))
  );

  const setField = (type, field, value) =>
    setLocs(prev => prev.map(l => l.type === type ? { ...l, [field]: value } : l));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReservation(reservation.id, { locations: locs });
      toast({ title: "Ubicaciones guardadas" });
      setEditing(false);
      onUpdated?.();
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocs(LOCATION_TYPES.map(t => getLocation(reservation.locations, t.key)));
    setEditing(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
            <MapPin size={14} className="text-white" />
          </div>
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Ubicaciones</h2>
        </div>
        {!editing ? (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full glass border-white/60 text-slate-600 hover:bg-white/60 transition-colors">
            <Edit2 size={11} /> Editar
          </motion.button>
        ) : (
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCancel}
              className="p-1.5 rounded-full glass text-slate-500 hover:text-red-400 transition-colors"><X size={14} /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full btn-primary text-white disabled:opacity-60">
              <Check size={12} /> {saving ? "Guardando..." : "Guardar"}
            </motion.button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {LOCATION_TYPES.map(({ key, label, icon, color }) => {
          const loc = locs.find(l => l.type === key) || { type: key, address: "", waze_url: "" };
          const isEmpty = !loc.address && !loc.waze_url;
          return (
            <div key={key} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-sm`}>{icon}</div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{label}</span>
              </div>

              {editing ? (
                <div className="space-y-2">
                  <input
                    value={loc.address || ""}
                    onChange={e => setField(key, "address", e.target.value)}
                    placeholder="Dirección / Lugar"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/60 border border-white/60 focus:outline-none focus:ring-1 focus:ring-[var(--t-from)]/40 text-slate-700 placeholder-slate-400"
                  />
                  <input
                    value={loc.waze_url || ""}
                    onChange={e => setField(key, "waze_url", e.target.value)}
                    placeholder="Link de Waze (URL)"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/60 border border-white/60 focus:outline-none focus:ring-1 focus:ring-[var(--t-from)]/40 text-slate-700 placeholder-slate-400"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {isEmpty ? (
                    <p className="text-xs text-slate-300 italic">Sin ubicación</p>
                  ) : (
                    <>
                      {loc.address && <p className="text-xs font-medium text-slate-700">{loc.address}</p>}
                      {loc.waze_url && (
                        <a href={loc.waze_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 bg-cyan-100/80 text-cyan-700 hover:bg-cyan-200 transition-colors">
                          <Navigation size={10} /> Abrir en Waze
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
