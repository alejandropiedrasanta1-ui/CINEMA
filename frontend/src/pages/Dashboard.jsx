import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getReservations } from "@/lib/api";
import { CalendarDays, Clock, CreditCard, CheckCircle, Plus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReservationForm from "@/components/ReservationForm";

const STATUS_COLORS = {
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmado: "bg-blue-50 text-blue-700 border-blue-200",
  Completado: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-md ${color}`}>
          <Icon size={14} strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
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
      setRecent(sorted.slice(0, 5));
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
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          data-testid="new-reservation-btn"
          className="bg-zinc-900 text-white hover:bg-zinc-700 rounded-md text-sm font-medium px-4 py-2 flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva Reserva
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-100 rounded-md animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="stats-grid">
          <StatCard
            icon={CalendarDays}
            label="Próximos Eventos"
            value={stats?.upcoming_events ?? 0}
            sub="Reservas activas"
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Confirmados"
            value={stats?.confirmed ?? 0}
            sub="Con anticipo"
            color="bg-green-50 text-green-600"
          />
          <StatCard
            icon={CreditCard}
            label="Pago Pendiente"
            value={formatCurrency(stats?.pending_payment)}
            sub="Balance restante"
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={Clock}
            label="Total Reservas"
            value={stats?.total_reservations ?? 0}
            sub="Historial completo"
            color="bg-zinc-100 text-zinc-600"
          />
        </div>
      )}

      {/* Recent Reservations */}
      <div className="bg-white border border-zinc-200 rounded-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Próximas Reservas
          </h2>
          <button
            onClick={() => navigate("/reservaciones")}
            className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
            data-testid="view-all-link"
          >
            Ver todas <ArrowRight size={12} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            No hay reservas próximas
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/reservaciones/${r.id}`)}
                data-testid={`recent-row-${r.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{r.client_name}</p>
                  <p className="text-xs text-zinc-400">{r.event_type}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm text-zinc-600 font-medium">{formatDate(r.event_date)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.Pendiente}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
