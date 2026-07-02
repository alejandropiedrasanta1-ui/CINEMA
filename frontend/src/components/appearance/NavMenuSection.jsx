import { motion } from "framer-motion";
import {
  Menu, ArrowUp, ArrowDown, RotateCcw,
  LayoutDashboard, List, CalendarDays, Users, Database, Palette, SlidersHorizontal, RefreshCw,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Section } from "./SectionShell";

const NAV_META = {
  "/dashboard":       { key: "dashboard",    icon: LayoutDashboard },
  "/reservaciones":   { key: "reservations", icon: List },
  "/calendario":      { key: "calendar",     icon: CalendarDays },
  "/socios":          { key: "socios",       icon: Users },
  "/base-de-datos":   { key: "database",     icon: Database },
  "/apariencia":      { key: "appearance",   icon: Palette },
  "/ajustes":         { key: "settings",     icon: SlidersHorizontal },
  "/actualizaciones": { key: "updates",      icon: RefreshCw },
};

export function NavMenuSection() {
  const { language, tr, navConfig, changeNavConfig, resetNavConfig } = useSettings();
  const { toast } = useToast();
  const es = language === "es";

  const defaultLabel = (path) => {
    const meta = NAV_META[path];
    return (meta && tr.nav[meta.key]) || "Actualizaciones";
  };

  const move = (index, dir) => {
    const to = index + dir;
    if (to < 0 || to >= navConfig.length) return;
    const next = [...navConfig];
    [next[index], next[to]] = [next[to], next[index]];
    changeNavConfig(next);
  };

  const rename = (path, custom) => {
    changeNavConfig(navConfig.map(i => i.path === path ? { ...i, custom } : i));
  };

  const isCustomized = navConfig.some((i, idx) => i.custom || i.path !== Object.keys(NAV_META)[idx]);

  return (
    <Section
      icon={Menu}
      isNew
      id="nav-menu-section"
      title={es ? "Menú de Navegación" : "Navigation Menu"}
      desc={es ? "Reordena y renombra las opciones del menú lateral" : "Reorder and rename sidebar menu items"}
      keywords="menu lateral sidebar posicion orden nombre renombrar navegacion mover"
      badge={isCustomized && (
        <button
          onClick={() => { resetNavConfig(); toast({ title: es ? "Menú restaurado ✓" : "Menu reset ✓" }); }}
          data-testid="reset-nav-config-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-all">
          <RotateCcw size={11} /> {es ? "Restaurar" : "Reset"}
        </button>
      )}
    >
      <div data-testid="nav-menu-section">
        <p className="text-[10px] text-slate-400 mb-3">
          {es ? "Usa las flechas para cambiar la posición · Escribe para renombrar (vacío = nombre original)" : "Use arrows to reorder · Type to rename (empty = original name)"}
        </p>
        <div className="space-y-1.5">
          {navConfig.map((item, idx) => {
            const meta = NAV_META[item.path];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div key={item.path}
                className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/70 border border-white/70"
                data-testid={`nav-item-row-${item.path.replace("/", "")}`}>
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-slate-500" />
                </div>
                <input
                  type="text"
                  value={item.custom || ""}
                  onChange={e => rename(item.path, e.target.value)}
                  placeholder={defaultLabel(item.path)}
                  data-testid={`nav-rename-${item.path.replace("/", "")}`}
                  className={`flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 rounded-lg px-2 py-1 transition-all ${item.custom ? "text-[var(--t-from)]" : "text-slate-700 placeholder-slate-500"}`}
                />
                {item.custom && (
                  <button onClick={() => rename(item.path, "")} title={es ? "Restaurar nombre" : "Reset name"}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    <RotateCcw size={11} />
                  </button>
                )}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => move(idx, -1)} disabled={idx === 0}
                    data-testid={`nav-move-up-${item.path.replace("/", "")}`}
                    className="p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:pointer-events-none transition-colors">
                    <ArrowUp size={12} />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => move(idx, 1)} disabled={idx === navConfig.length - 1}
                    data-testid={`nav-move-down-${item.path.replace("/", "")}`}
                    className="p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:pointer-events-none transition-colors">
                    <ArrowDown size={12} />
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
