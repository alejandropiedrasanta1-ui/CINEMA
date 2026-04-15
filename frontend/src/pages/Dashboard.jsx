import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getReservations } from "@/lib/api";
import { CalendarDays, Clock, CreditCard, CheckCircle, Plus, ArrowRight, TrendingUp, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";

const STATUS_COLORS = {
  Pendiente:  "bg-amber-100/80 text-amber-700 border-amber-200/60",
  Confirmado: "bg-blue-100/80 text-blue-700 border-blue-200/60",
  Completado: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  Cancelado:  "bg-red-100/80 text-red-700 border-red-200/60",
};

const STATUS_HEX = {
  Pendiente: "#f59e0b", Confirmado: "#3b82f6", Completado: "#10b981", Cancelado: "#ef4444",
};

const EVENT_HEX = {
  "Boda": "#ec4899", "Quinceañera": "#a855f7", "Fiesta Social": "#f97316",
  "Evento Corporativo": "#3b82f6", "Conferencia": "#14b8a6", "Otro": "#64748b",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const STAT_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
];

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

function HBarChart({ data, palette, title }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length) return <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>;
  return (
    <div>
      <p className="text-sm font-black text-slate-700 mb-4" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{title}</p>
      <div className="space-y-3">
        {entries.map(([label, count], i) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-600 truncate max-w-[60%]">{label}</span>
              <span className="text-xs font-black text-slate-500">
                {count} <span className="text-slate-300 font-medium">({Math.round(count / total * 100)}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-slate-100/80 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                style={{ background: palette[label] || palette["Otro"] || "#6366f1" }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { tr, formatCurrency, language } = useSettings();
  const d = tr.dashboard;

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getStats(), getReservations()]);
      setStats(s);
      setAll(r);
      setRecent([...r].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).slice(0, 6));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d) => { if (!d) return "-"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
  const dateStr = new Date().toLocaleDateString(language === "es" ? "es-MX" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Compute chart data
  const active = all.filter(r => r.status !== "Cancelado");
  const typeData = active.reduce((acc, r) => { acc[r.event_type || "Otro"] = (acc[r.event_type || "Otro"] || 0) + 1; return acc; }, {});
  const statusData = all.reduce((acc, r) => { acc[r.status || "Pendiente"] = (acc[r.status || "Pendiente"] || 0) + 1; return acc; }, {});

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 capitalize">{dateStr}</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)} data-testid="new-reservation-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
          <Plus size={16} /> {tr.common.newReservation}
        </motion.button>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 glass rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="stats-grid">
          <StatCard icon={CalendarDays} label={d.upcoming} value={stats?.upcoming_events ?? 0} sub={d.upcomingSub} gradient={STAT_GRADIENTS[0]} />
          <StatCard icon={CheckCircle} label={d.confirmed} value={stats?.confirmed ?? 0} sub={d.confirmedSub} gradient={STAT_GRADIENTS[1]} />
          <StatCard icon={CreditCard} label={d.pending} value={formatCurrency(stats?.pending_payment)} sub={d.pendingSub} gradient={STAT_GRADIENTS[2]} />
          <StatCard icon={Clock} label={d.total} value={stats?.total_reservations ?? 0} sub={d.totalSub} gradient={STAT_GRADIENTS[3]} />
        </motion.div>
      )}

      {/* Recent reservations */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="glass rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40">
          <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{d.upcomingTitle}</h2>
          <motion.button whileHover={{ x: 3 }} onClick={() => navigate("/reservaciones")} className="text-xs font-bold flex items-center gap-1.5 transition-colors" style={{ color: "var(--t-from)" }} data-testid="view-all-link">
            {tr.common.viewAll} <ArrowRight size={12} />
          </motion.button>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100/80 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">{d.noUpcoming}</p>
            <p className="text-slate-300 text-xs mt-1">{d.createFirst}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {recent.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + idx * 0.05 }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.4)" }}
                className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors"
                onClick={() => navigate(`/reservaciones/${r.id}`)} data-testid={`recent-row-${r.id}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: EVENT_HEX[r.event_type] ? EVENT_HEX[r.event_type] + "22" : "rgba(99,102,241,0.1)" }}>
                    <span className="text-xs font-black" style={{ color: EVENT_HEX[r.event_type] || "var(--t-from)" }}>
                      {r.client_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{r.client_name}</p>
                    <p className="text-xs text-slate-400">{r.event_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-bold text-slate-700">{formatDate(r.event_date)}</span>
                  <span className={`text-xs px-3 py-1 rounded-full border font-bold ${STATUS_COLORS[r.status] || STATUS_COLORS.Pendiente}`}>
                    {tr.statuses[r.status] || r.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Charts Section ─────────────────────────────── */}
      {!loading && all.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="glass rounded-3xl p-7 mt-5" data-testid="charts-section">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-2xl btn-primary flex items-center justify-center">
              <BarChart2 size={14} className="text-white" />
            </div>
            <h2 className="text-base font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              {language === "es" ? "Distribución de Reservas" : "Reservations Breakdown"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <HBarChart
              data={typeData}
              palette={EVENT_HEX}
              title={language === "es" ? "Por tipo de evento" : "By event type"}
            />
            <HBarChart
              data={statusData}
              palette={STATUS_HEX}
              title={language === "es" ? "Por estado" : "By status"}
            />
          </div>
        </motion.div>
      )}

      {showForm && <ReservationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
