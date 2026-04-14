import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReservations, deleteReservation } from "@/lib/api";
import { Plus, Trash2, Eye, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReservationForm from "@/components/ReservationForm";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS = {
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmado: "bg-blue-50 text-blue-700 border-blue-200",
  Completado: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
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
  const [editTarget, setEditTarget] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReservations();
      const sorted = [...data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setReservations(sorted);
    } catch (e) {
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
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

  const filtered = reservations.filter((r) => {
    const matchSearch = r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.venue?.toLowerCase().includes(search.toLowerCase() || "");
    const matchType = filterType === "Todos" || r.event_type === filterType;
    const matchStatus = filterStatus === "Todos" || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Reservaciones
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{reservations.length} reservas en total</p>
        </div>
        <Button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          data-testid="new-reservation-btn"
          className="bg-zinc-900 text-white hover:bg-zinc-700 rounded-md text-sm font-medium px-4 py-2 flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva Reserva
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, tipo o lugar..."
            className="pl-9 text-sm border-zinc-300 bg-white"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          data-testid="filter-type"
        >
          {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          data-testid="filter-status"
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            No se encontraron reservas
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="reservations-table">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Anticipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/reservaciones/${r.id}`)}
                  data-testid={`reservation-row-${r.id}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{r.client_name}</p>
                    {r.client_phone && <p className="text-xs text-zinc-400">{r.client_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">{r.event_type}</td>
                  <td className="px-4 py-3 text-zinc-700 font-medium">{formatDate(r.event_date)}</td>
                  <td className="px-4 py-3 text-zinc-700 hidden md:table-cell">{formatCurrency(r.total_amount)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div>
                      <span className="text-zinc-700">{formatCurrency(r.advance_paid)}</span>
                      {r.total_amount > 0 && (
                        <div className="w-20 h-1 bg-zinc-100 rounded-full mt-1">
                          <div
                            className="h-1 bg-zinc-800 rounded-full"
                            style={{ width: `${Math.min(100, ((r.advance_paid || 0) / r.total_amount) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.Pendiente}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/reservaciones/${r.id}`)}
                        className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                        data-testid={`view-btn-${r.id}`}
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                        data-testid={`delete-btn-${r.id}`}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ReservationForm
          reservation={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={() => { setShowForm(false); setEditTarget(null); load(); }}
        />
      )}
    </div>
  );
}
