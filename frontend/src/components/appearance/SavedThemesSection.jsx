import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Save, Trash2, Play, RotateCcw, Cloud, CloudOff, Loader2, CheckCircle2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { getSavedThemes, createSavedTheme, deleteSavedTheme } from "@/lib/api";
import { Section } from "./SectionShell";

export function SavedThemesSection() {
  const { language, getAppearanceSnapshot, applyAppearanceSnapshot, resetAppearanceToDefault, appearanceSync } = useSettings();
  const { toast } = useToast();
  const es = language === "es";

  const [themes, setThemes] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(null);

  const load = async () => {
    try { setThemes(await getSavedThemes()); } catch {}
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: es ? "Escribe un nombre para el tema" : "Enter a theme name", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await createSavedTheme(name.trim(), getAppearanceSnapshot());
      toast({ title: es ? `Tema "${name.trim()}" guardado ✓` : `Theme "${name.trim()}" saved ✓` });
      setName("");
      load();
    } catch { toast({ title: es ? "Error al guardar el tema" : "Error saving theme", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleApply = async (t) => {
    if (!window.confirm(es ? `¿Aplicar el tema "${t.name}"? La página se recargará.` : `Apply theme "${t.name}"? The page will reload.`)) return;
    setApplying(t.id);
    await applyAppearanceSnapshot(t.snapshot);
  };

  const handleDelete = async (t) => {
    if (!window.confirm(es ? `¿Eliminar el tema "${t.name}"?` : `Delete theme "${t.name}"?`)) return;
    try { await deleteSavedTheme(t.id); toast({ title: es ? "Tema eliminado" : "Theme deleted" }); load(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleReset = async () => {
    if (!window.confirm(es ? "¿Restaurar TODA la apariencia a los valores por defecto? La página se recargará." : "Reset ALL appearance to defaults? The page will reload.")) return;
    await resetAppearanceToDefault();
  };

  const syncBadge = () => {
    if (appearanceSync.status === "saving") return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
        <Loader2 size={10} className="animate-spin" /> {es ? "Sincronizando…" : "Syncing…"}
      </span>
    );
    if (appearanceSync.status === "error") return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
        <CloudOff size={10} /> {es ? "Sin conexión" : "Offline"}
      </span>
    );
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700" data-testid="appearance-sync-badge">
        <Cloud size={10} /> {es ? "Sincronizado con la nube" : "Cloud synced"}
      </span>
    );
  };

  return (
    <Section
      icon={Bookmark}
      isNew
      id="saved-themes-section"
      title={es ? "Temas Guardados" : "Saved Themes"}
      desc={es ? "Guarda tu apariencia, restaura por defecto y sincroniza con la nube" : "Save your look, reset to default and cloud sync"}
      keywords="tema guardado preset estilo default por defecto nube sincronizar guardar apariencia restaurar"
      badge={syncBadge()}
    >
      <div className="space-y-5" data-testid="saved-themes-section">
        <p className="text-[10px] text-slate-400 -mt-1">
          {es
            ? "Tu apariencia se sube automáticamente a la base de datos al cambiarla. Todas tus apps (web y escritorio) cargan tu estilo al iniciar."
            : "Your appearance auto-uploads to the database on change. All your apps (web & desktop) load your style on startup."}
        </p>

        {/* Save current */}
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            placeholder={es ? "Nombre del tema (ej: Mi estilo oscuro)" : "Theme name (e.g. My dark style)"}
            data-testid="theme-name-input"
            className="flex-1 px-4 py-2.5 text-sm glass rounded-2xl border-white/50 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 text-slate-700 font-semibold placeholder-slate-400"
          />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleSave} disabled={saving}
            data-testid="save-theme-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl btn-primary text-white text-xs font-bold disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {es ? "Guardar tema actual" : "Save current theme"}
          </motion.button>
        </div>

        {/* Theme list */}
        {themes.length === 0 ? (
          <div className="py-6 text-center rounded-2xl bg-white/40 border border-dashed border-slate-200">
            <Bookmark size={22} className="mx-auto text-slate-200 mb-2" />
            <p className="text-xs text-slate-400 font-medium">{es ? "Aún no tienes temas guardados" : "No saved themes yet"}</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="saved-themes-list">
            {themes.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 border border-white/70"
                data-testid={`theme-row-${t.id}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${(t.snapshot?.custom_accent) || "var(--t-from)"}, var(--t-to))` }}>
                  <CheckCircle2 size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(t.created_at).toLocaleString(es ? "es-GT" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => handleApply(t)} disabled={applying === t.id}
                  data-testid={`apply-theme-btn-${t.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black transition-colors disabled:opacity-50">
                  {applying === t.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  {es ? "Aplicar" : "Apply"}
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(t)}
                  data-testid={`delete-theme-btn-${t.id}`}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </motion.button>
              </div>
            ))}
          </div>
        )}

        {/* Reset to default */}
        <div className="border-t border-white/40 pt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-600">{es ? "Restaurar por defecto" : "Restore defaults"}</p>
            <p className="text-[10px] text-slate-400">{es ? "Borra toda la personalización y vuelve al diseño original" : "Clears all customization back to the original design"}</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            data-testid="reset-appearance-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-bold transition-colors shrink-0">
            <RotateCcw size={12} /> {es ? "Restaurar todo" : "Reset all"}
          </motion.button>
        </div>
      </div>
    </Section>
  );
}
