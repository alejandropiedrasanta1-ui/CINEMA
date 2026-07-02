import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, X, Sparkles } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const TOUR_STEPS = [
  { route: "/dashboard", target: null, title: "¡Bienvenido a Cinema Productions! 🎬", desc: "Te guiaremos paso a paso por todas las funciones de la app. Puedes salir en cualquier momento con «Saltar»." },
  { route: "/dashboard", target: '[data-testid="stats-grid"]', title: "Estadísticas en vivo", desc: "Aquí ves tus métricas clave: próximos eventos, ingresos reales y saldos pendientes. Puedes activar más tarjetas desde Apariencia." },
  { route: "/dashboard", target: '[data-testid="charts-section"]', title: "Gráficos de ingresos", desc: "Visualiza tus ingresos por mes con gráficos de barras interactivos." },
  { route: "/reservaciones", target: '[data-testid="new-reservation-btn"]', title: "Crea reservas", desc: "Con este botón registras un evento nuevo: cliente, fecha, anticipo, paquete y más." },
  { route: "/reservaciones", target: '[data-testid="search-input"]', title: "Búsqueda instantánea", desc: "Busca por cliente, tipo de evento o lugar en tiempo real." },
  { route: "/reservaciones", target: '[data-testid="toggle-extra-filters"]', title: "Filtros avanzados", desc: "Filtra por estado, paquete o rango de fechas para encontrar cualquier reserva." },
  { route: "/calendario", target: '[data-testid="calendar-grid"]', title: "Calendario mensual", desc: "Todos tus eventos organizados por mes. Las pastillas muestran el tipo de evento." },
  { route: "/calendario", target: '[data-testid="calendar-month-select"]', title: "Navega por mes y año", desc: "Salta rápidamente a cualquier mes o año para revisar disponibilidad." },
  { route: "/socios", target: null, title: "Tu equipo de trabajo", desc: "Registra a tus socios, asígnales eventos y controla los pagos Pendiente ↔ Pagado." },
  { route: "/base-de-datos", target: '[data-testid="db-url-input"]', title: "Base de datos dinámica", desc: "Conecta tu propio MongoDB por URL, IP o NAS. Todos tus dispositivos comparten los mismos datos." },
  { route: "/base-de-datos", target: '[data-testid="backup-server-btn"]', title: "Respaldos automáticos", desc: "Crea copias de seguridad, restáuralas y exporta a CSV/Excel cuando quieras." },
  { route: "/apariencia", target: '[data-testid="appearance-search-input"]', title: "Buscador de funciones", desc: "¿No encuentras una opción? Escribe aquí (ej: «fuente», «color») y aparecerá la sección exacta." },
  { route: "/apariencia", target: '[data-testid="section-saved-themes-section"]', title: "Temas guardados", desc: "Guarda tu apariencia con nombre, restáurala cuando quieras y se sincroniza sola con la nube." },
  { route: "/apariencia", target: '[data-testid="section-ui-mode-section"]', title: "Modo DaVinci Resolve", desc: "Transforma toda la app a un diseño profesional oscuro tipo collage, estilo software de edición." },
  { route: "/apariencia", target: '[data-testid="section-nav-menu-section"]', title: "Personaliza el menú", desc: "Reordena y renombra las opciones del menú lateral a tu gusto." },
  { route: "/ajustes", target: '[data-testid="settings-search-input"]', title: "Ajustes generales", desc: "Idioma, moneda, zona horaria y recordatorios multi-canal (Email, Telegram, WhatsApp)." },
  { route: "/ajustes", target: null, title: "App de Escritorio", desc: "Descarga la versión local para Windows: funciona sin internet y se actualiza sola desde la nube." },
  { route: "/actualizaciones", target: '[data-testid="check-updates-btn"]', title: "Actualizaciones en línea", desc: "Busca nuevas versiones en la base de datos con un clic. ¡Listo! Ya conoces toda la app. 🎉" },
];

export default function WelcomeTour() {
  const { showTour, endTour } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const current = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;

  const locateTarget = useCallback(() => {
    if (!current?.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      else setRect(null);
    }, 380);
  }, [current]);

  useEffect(() => {
    if (!showTour) return;
    setRect(null);
    if (location.pathname !== current.route) navigate(current.route);
    const t = setTimeout(locateTarget, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, showTour]);

  useEffect(() => { if (showTour) setStep(0); }, [showTour]);

  if (!showTour || !current) return null;

  const next = () => { if (step < total - 1) setStep(step + 1); else endTour(); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  return (
    <AnimatePresence>
      <motion.div key="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]" data-testid="welcome-tour-overlay">

        {/* Backdrop / spotlight */}
        {rect ? (
          <motion.div
            initial={false}
            animate={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="fixed rounded-2xl pointer-events-none"
            style={{
              boxShadow: "0 0 0 9999px rgba(15,23,42,0.68)",
              border: "2.5px solid var(--t-from)",
            }}
          />
        ) : (
          <div className="fixed inset-0 bg-slate-900/70" />
        )}

        {/* Card */}
        <motion.div
          key={`card-${step}`}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(440px,92vw)] rounded-3xl p-6 bg-white shadow-2xl"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}
          data-testid="tour-card"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full text-white btn-primary">
              <Sparkles size={10} /> Paso {step + 1} de {total}
            </span>
            <button onClick={endTour} data-testid="tour-skip-btn"
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Saltar <X size={13} />
            </button>
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            {current.title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{current.desc}</p>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-slate-100 mb-4 overflow-hidden">
            <motion.div className="h-full rounded-full btn-primary"
              animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={prev} disabled={step === 0} data-testid="tour-prev-btn"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ArrowLeft size={13} /> Anterior
            </button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={next} data-testid="tour-next-btn"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl btn-primary text-white text-xs font-black">
              {step === total - 1 ? "¡Terminar! 🎉" : "Siguiente"} {step < total - 1 && <ArrowRight size={13} />}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
