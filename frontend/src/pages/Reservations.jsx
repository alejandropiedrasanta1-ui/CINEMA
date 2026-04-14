import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReservations, deleteReservation } from "@/lib/api";
import { Plus, Trash2, Eye, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import ReservationForm from "@/components/ReservationForm";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS = {
  Pendiente: "bg-amber-100/80 text-amber-700 border-amber-200/60",
  Confirmado: "bg-blue-100/80 text-blue-700 border-blue-200/60",
  Completado: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  Cancelado: "bg-red-100/80 text-red-700 border-red-200/60",
};

const EVENT_TYPE_ICONS = {
  "Boda": "💍",
  "Quinceañera": "👑",
  "Fiesta Social": "🎉",
  "Evento Corporativo": "🏢",
  "Conferencia": "🎤",
  "Otro": "📅",
};

const EVENT_TYPES = ["Todos", "Boda", "Quinceañera", "Fiesta Social", "Evento Corporativo", "Conferencia", "Otro"];
const STATUSES = ["Todos", "Pendiente", "Confirmado", "Completado", "Cancelado"];

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReservations();
      const sorted = [...data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setReservations(sorted);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las reservas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    try {
      await deleteReservation(id);
      toast({ title: "Reserva eliminada" });
      load();
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

  const filtered = reservations.filter((r) => {
    const matchSearch = r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      (r.venue || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "Todos" || r.event_type === filterType;
    const matchStatus = filterStatus === "Todos" || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

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
            Reservaciones
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{reservations.length} reservas en total</p>
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, tipo o lugar..."
            className="w-full pl-10 pr-4 py-2.5 text-sm glass rounded-2xl border-white/50 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300/60 placeholder-slate-400 text-slate-700"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 font-medium"
          data-testid="filter-type"
        >
          {EVENT_TYPES.map(t => <option key={t} className="bg-white">{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 font-medium"
          data-testid="filter-status"
        >
          {STATUSES.map(s => <option key={s} className="bg-white">{s}</option>)}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass rounded-3xl overflow-hidden"
      >
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 w-full glass rounded-2xl animate-pulse mx-6" style={{ width: "calc(100% - 3rem)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No se encontraron reservas</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="reservations-table">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Tipo</th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Total</th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Anticipo</th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <AnimatePresence>
              <tbody className="divide-y divide-white/20">
                {filtered.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                    className="cursor-pointer transition-colors"
                    onClick={() => navigate(`/reservaciones/${r.id}`)}
                    data-testid={`reservation-row-${r.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-indigo-600">
                            {r.client_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.client_name}</p>
                          {r.client_phone && <p className="text-xs text-slate-400">{r.client_phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5">
                        <span>{EVENT_TYPE_ICONS[r.event_type] || "📅"}</span>
                        <span className="font-medium">{r.event_type}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{formatDate(r.event_date)}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 hidden md:table-cell">{formatCurrency(r.total_amount)}</td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div>
                        <span className="font-bold text-emerald-600">{formatCurrency(r.advance_paid)}</span>
                        {r.total_amount > 0 && (
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, ((r.advance_paid || 0) / r.total_amount) * 100)}%` }}
                              transition={{ duration: 0.6, delay: 0.3 }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full border font-bold ${STATUS_COLORS[r.status] || STATUS_COLORS.Pendiente}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => navigate(`/reservaciones/${r.id}`)}
                          className="p-2 rounded-2xl hover:bg-indigo-100/80 text-slate-400 hover:text-indigo-600 transition-colors"
                          data-testid={`view-btn-${r.id}`}
                        >
                          <Eye size={14} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDelete(r.id, e)}
                          className="p-2 rounded-2xl hover:bg-red-100/80 text-slate-400 hover:text-red-500 transition-colors"
                          data-testid={`delete-btn-${r.id}`}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </AnimatePresence>
          </table>
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
