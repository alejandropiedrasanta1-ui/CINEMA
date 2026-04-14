import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getReservations } from "@/lib/api";
import { CalendarDays, Clock, CreditCard, CheckCircle, Plus, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import ReservationForm from "@/components/ReservationForm";

const STATUS_COLORS = {
  Pendiente: "bg-amber-100/80 text-amber-700 border-amber-200/60",
  Confirmado: "bg-blue-100/80 text-blue-700 border-blue-200/60",
  Completado: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  Cancelado: "bg-red-100/80 text-red-700 border-red-200/60",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({ icon: Icon, label, value, sub, gradient, delay = 0 }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass rounded-3xl p-6 cursor-default group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl ${gradient} flex items-center justify-center shadow-sm`}>
          <Icon size={16} strokeWidth={1.5} className="text-white" />
        </div>
        <TrendingUp size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
        {value}
      </p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getStats(), getReservations()]);
      setStats(s);
      const sorted = [...r].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setRecent(sorted.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d) => {
    if (!d) return "-";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

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
          <h1 className="text-5xl font-black text-slate-900 tracking-tight gradient-text" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          data-testid="new-reservation-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-indigo-300/70 transition-shadow"
        >
          <Plus size={16} />
          Nueva Reserva
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
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
          <StatCard icon={CalendarDays} label="Próximos Eventos" value={stats?.upcoming_events ?? 0} sub="Reservas activas" gradient="bg-gradient-to-br from-indigo-400 to-indigo-600" />
          <StatCard icon={CheckCircle} label="Confirmados" value={stats?.confirmed ?? 0} sub="Con anticipo" gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" />
          <StatCard icon={CreditCard} label="Pago Pendiente" value={formatCurrency(stats?.pending_payment)} sub="Saldo total" gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
          <StatCard icon={Clock} label="Total Reservas" value={stats?.total_reservations ?? 0} sub="Historial" gradient="bg-gradient-to-br from-purple-400 to-pink-500" />
        </motion.div>
      )}

      {/* Recent Reservations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-3xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40">
          <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Próximas Reservas
          </h2>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => navigate("/reservaciones")}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
            data-testid="view-all-link"
          >
            Ver todas <ArrowRight size={12} />
          </motion.button>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100/80 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No hay reservas próximas</p>
            <p className="text-slate-300 text-xs mt-1">Crea tu primera reserva</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {recent.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.4)" }}
                className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors"
                onClick={() => navigate(`/reservaciones/${r.id}`)}
                data-testid={`recent-row-${r.id}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-indigo-600">
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
                    {r.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
