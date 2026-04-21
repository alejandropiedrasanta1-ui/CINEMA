import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getReservations, getSocios } from "@/lib/api";
import { CalendarDays, Clock, CreditCard, TrendingUp, Plus, ArrowRight, BarChart2, DollarSign, Camera, User, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings, STATUS_COLOR_CLASSES } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import { getEventConfig } from "@/lib/eventConfig";

const FALLBACK_COLOR = "bg-slate-100/80 text-slate-700 border-slate-200/60";

const STAT_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function StatCard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <motion.div variants={item} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass rounded-3xl p-6 cursor-default group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: gradient }}>
          <Icon size={16} strokeWidth={1.5} className="text-white" />
        </div>
        <TrendingUp size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </motion.div>
  );
}

function AnimatedCounter({ target, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    const start = Date.now();
    const animate = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(e * target));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return display;
}

function EventTypeCard({ type, count, total, index }) {
  const cfg = getEventConfig(type);
  const Icon = cfg.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.22 } }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.06)",
      }}
      className="relative overflow-hidden rounded-3xl p-5 cursor-default"
      data-testid={`event-type-card-${type.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Decorative background circle */}
      <div
        className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: cfg.fg, opacity: 0.07 }}
      />
      {/* Second smaller circle */}
      <div
        className="absolute -right-2 -top-2 w-14 h-14 rounded-full pointer-events-none"
        style={{ background: cfg.fg, opacity: 0.04 }}
      />

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 + index * 0.07 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: cfg.fg + "1c" }}
      >
        <Icon size={22} style={{ color: cfg.fg }} strokeWidth={1.7} />
      </motion.div>

      {/* Animated count */}
      <p
        className="text-4xl font-black tracking-tight leading-none"
        style={{ color: cfg.fg, fontFamily: "Cabinet Grotesk, sans-serif" }}
      >
        <AnimatedCounter target={count} duration={800 + index * 120} />
      </p>
      <p className="text-sm font-semibold mt-1.5 leading-tight" style={{ color: cfg.fg, opacity: 0.8 }}>
        {type}
      </p>

      {/* Progress bar */}
      <div
        className="mt-3.5 h-1.5 rounded-full overflow-hidden"
        style={{ background: cfg.fg + "20" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.4 + index * 0.07 }}
          style={{ background: cfg.fg }}
          className="h-full rounded-full"
        />
      </div>
      <p className="text-[11px] mt-1.5 font-semibold" style={{ color: cfg.fg, opacity: 0.55 }}>
        {pct}% del total
      </p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { tr, formatCurrency, language, activeStatuses, swapNameEventType, dashboardWidgets } = useSettings();
  const d = tr.dashboard;

  // Build dynamic status color lookup
  const statusColors = Object.fromEntries(
    activeStatuses.map(s => [s.key, STATUS_COLOR_CLASSES[s.color] || FALLBACK_COLOR])
  );

  // Socio lookup map: id → socio
  const socioMap = Object.fromEntries(socios.map(s => [s.id, s]));

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, sc] = await Promise.all([getStats(), getReservations(), getSocios()]);
      setStats(s);
      setSocios(sc);
      setAll(r);
      const now = new Date();
      const cm = now.getMonth();
      const cy = now.getFullYear();
      const monthEvents = [...r]
        .filter(res => {
          if (!res.event_date) return false;
          const d = new Date(res.event_date + "T00:00:00");
          return d.getMonth() === cm && d.getFullYear() === cy;
        })
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setRecent(monthEvents);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const currentMonthName = tr.months[new Date().getMonth()];

  useEffect(() => { load(); }, []);

  const formatDate = (dt) => { if (!dt) return "-"; const [y, m, day] = dt.split("-"); return `${day}/${m}/${y}`; };
  const dateStr = new Date().toLocaleDateString(language === "es" ? "es-MX" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const active = all.filter(r => r.status !== "Cancelado");
  const totalEventAmount = active.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const completedIncome  = all.filter(r => r.status === "Completado").reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const advanceIncome    = active.reduce((sum, r) => sum + (r.advance_paid || 0), 0);
  const pendingBalance   = active.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.advance_paid || 0)), 0);
  const monthlyIncome    = recent.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const typeData = active.reduce((acc, r) => {
    acc[r.event_type || "Otro"] = (acc[r.event_type || "Otro"] || 0) + 1;
    return acc;
  }, {});
  const typeEntries = Object.entries(typeData).sort((a, b) => b[1] - a[1]);

  // Build ordered, enabled widget list
  const WIDGET_DATA = {
    upcoming:      { icon: CalendarDays, label: d.upcoming,                                                value: recent.length,                  sub: currentMonthName,                                                   gradient: STAT_GRADIENTS[0] },
    total_res:     { icon: Clock,        label: d.total,                                                   value: stats?.total_reservations ?? 0, sub: d.totalSub,                                                         gradient: STAT_GRADIENTS[3] },
    total_events:  { icon: CreditCard,   label: language === "es" ? "Total Eventos"  : "Total Events",    value: formatCurrency(totalEventAmount), sub: language === "es" ? "Suma total activos"    : "All active events",  gradient: STAT_GRADIENTS[2] },
    real_income:   { icon: DollarSign,   label: d.realIncome,                                             value: formatCurrency(stats?.real_income), sub: d.realIncomeSub,                                                  gradient: STAT_GRADIENTS[1] },
    completed_inc: { icon: TrendingUp,   label: language === "es" ? "Ingreso Completadas" : "Completed Income", value: formatCurrency(completedIncome),  sub: language === "es" ? "Etiquetas Completado" : "Completed labels", gradient: "linear-gradient(135deg,#22c55e,#16a34a)" },
    advance_inc:   { icon: CreditCard,   label: language === "es" ? "Anticipos Cobrados" : "Advances Collected", value: formatCurrency(advanceIncome),    sub: language === "es" ? "Total anticipo activos" : "Active advances", gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
    monthly_inc:   { icon: BarChart2,    label: language === "es" ? "Ingreso del Mes"   : "Monthly Income",  value: formatCurrency(monthlyIncome),    sub: currentMonthName,                                                 gradient: "linear-gradient(135deg,#f43f5e,#e11d48)" },
    pending_bal:   { icon: Clock,        label: language === "es" ? "Saldo Pendiente"   : "Pending Balance",  value: formatCurrency(pendingBalance),   sub: language === "es" ? "Por cobrar activos"    : "Outstanding balance", gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
  };

  const visibleWidgets = (dashboardWidgets || []).filter(w => w.enabled && WIDGET_DATA[w.id]);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1
            className="text-5xl font-black gradient-text tracking-tight"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 capitalize">{dateStr}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          data-testid="new-reservation-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold"
        >
          <Plus size={16} /> {tr.common.newReservation}
        </motion.button>
      </motion.div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 glass rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          data-testid="stats-grid"
        >
          {visibleWidgets.map(w => {
            const cfg = WIDGET_DATA[w.id];
            return <StatCard key={w.id} icon={cfg.icon} label={cfg.label} value={cfg.value} sub={cfg.sub} gradient={cfg.gradient} />;
          })}
        </motion.div>
      )}

      {/* Recent reservations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-3xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {d.upcomingTitle}
            </h2>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full btn-primary text-white">
              {currentMonthName}
            </span>
            {recent.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {recent.length} {language === "es" ? "evento(s)" : "event(s)"}
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => navigate("/reservaciones")}
            className="text-xs font-bold flex items-center gap-1.5 transition-colors"
            style={{ color: "var(--t-from)" }}
            data-testid="view-all-link"
          >
            {tr.common.viewAll} <ArrowRight size={12} />
          </motion.button>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100/80 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {language === "es" ? `Sin eventos en ${currentMonthName}` : `No events in ${currentMonthName}`}
            </p>
            <p className="text-slate-300 text-xs mt-1">{d.createFirst}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const EvIcon = cfg.icon;
              const partners = (r.assigned_partners || [])
                .map(p => ({ ...p, socio: socioMap[p.socio_id] }))
                .filter(p => p.socio);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 px-6 py-5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/reservaciones/${r.id}`)}
                  data-testid={`recent-row-${r.id}`}
                >
                  {/* ── IZQUIERDA: Tipo de evento ── */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.fg + "18" }}>
                      <EvIcon size={17} style={{ color: cfg.fg }} strokeWidth={1.8} />
                    </div>
                    <p className="text-xl font-black truncate leading-none"
                      style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: cfg.fg }}>
                      {r.event_type || "Evento"}
                    </p>
                  </div>

                  {/* ── CENTRO: Fotógrafo + pago ── */}
                  <div className="min-w-0">
                    {partners.length > 0 ? (
                      <div className="space-y-1">
                        {partners.map((p, pi) => {
                          const isPaid = p.payment_status === "Pagado";
                          return (
                            <div key={pi} className="flex items-center gap-2">
                              <Camera size={11} className="text-slate-400 flex-shrink-0" />
                              <span className="text-sm font-bold text-slate-700 truncate">{p.socio.name}</span>
                              {p.payment > 0 && (
                                <span className={`text-xs font-black flex-shrink-0 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                                  {formatCurrency(p.payment)}
                                </span>
                              )}
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {isPaid ? (language === "es" ? "Pagado" : "Paid") : (language === "es" ? "Pendiente" : "Pending")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-slate-300" />
                        <span className="text-xs text-slate-300 font-medium">
                          {language === "es" ? "Sin fotógrafo" : "No photographer"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── DERECHA: Fecha + etiqueta ── */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{formatDate(r.event_date)}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold whitespace-nowrap ${statusColors[r.status] || FALLBACK_COLOR}`}>
                      {tr.statuses[r.status] || r.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Event Types Breakdown */}
      {!loading && typeEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5 }}
          className="glass rounded-3xl p-7 mt-5"
          data-testid="charts-section"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center">
              <BarChart2 size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                {language === "es" ? "Tipos de Evento" : "Event Types"}
              </h2>
              <p className="text-xs text-slate-400">
                {active.length} {language === "es" ? "reservas activas" : "active reservations"}
              </p>
            </div>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            {typeEntries.map(([type, count], idx) => (
              <EventTypeCard key={type} type={type} count={count} total={active.length} index={idx} />
            ))}
          </motion.div>
        </motion.div>
      )}

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
