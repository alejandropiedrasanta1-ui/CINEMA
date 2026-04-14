import { useEffect, useState } from "react";
import { getSocios, deleteSocio, getReservations, getFinancials } from "@/lib/api";
import { Plus, Trash2, Edit2, Camera, Video, Users, TrendingUp, DollarSign, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import SocioForm from "@/components/SocioForm";

const ROLE_ICONS = { "Fotógrafo": Camera, "Videógrafo": Video, "Asistente": Users };
const ROLE_COLORS = {
  "Fotógrafo": "bg-indigo-100/80 text-indigo-700 border-indigo-200/60",
  "Videógrafo": "bg-purple-100/80 text-purple-700 border-purple-200/60",
  "Asistente":  "bg-slate-100/80 text-slate-700 border-slate-200/60",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 20, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

export default function Socios() {
  const [socios, setSocios] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const { formatCurrency } = useSettings();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, f] = await Promise.all([getSocios(), getReservations(), getFinancials()]);
      setSocios(s);
      setReservations(r);
      setFinancials(f);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este socio?")) return;
    try { await deleteSocio(id); toast({ title: "Socio eliminado" }); load(); }
    catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
  };

  const getEventsForSocio = (socioId) =>
    reservations.filter(r => (r.assigned_partners || []).some(p => p.socio_id === socioId));

  const getPaymentSummary = (socioId) => {
    let paid = 0, pending = 0;
    reservations.forEach(r => {
      const partner = (r.assigned_partners || []).find(p => p.socio_id === socioId);
      if (!partner) return;
      if (partner.payment_status === "Pagado") paid += (partner.payment || 0);
      else pending += (partner.payment || 0);
    });
    return { paid, pending, total: paid + pending };
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>Socios</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{socios.length} socios registrados</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setEditTarget(null); setShowForm(true); }}
          data-testid="new-socio-btn" className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
          <Plus size={16} /> Nuevo Socio
        </motion.button>
      </motion.div>

      {/* Financial summary */}
      {financials && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Eventos", value: formatCurrency(financials.total_event_amount), icon: DollarSign, grad: "from-emerald-400 to-emerald-600", testid: "stat-total-events" },
            { label: "Costo Equipo", value: formatCurrency(financials.total_partner_cost), icon: Users, grad: "from-amber-400 to-orange-500", testid: "stat-team-cost" },
            { label: "Pagado Equipo", value: formatCurrency(financials.total_paid_to_partners || 0), icon: CheckCircle, grad: "from-green-400 to-emerald-500", testid: "stat-paid" },
            { label: "Ingreso Real", value: formatCurrency(financials.real_income), icon: TrendingUp, grad: "from-indigo-400 to-purple-600", testid: "stat-real-income" },
          ].map(({ label, value, icon: Icon, grad, testid }) => (
            <div key={label} className="glass rounded-3xl p-5" data-testid={testid}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center`}><Icon size={15} className="text-white" /></div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
              </div>
              <p className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Socios grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 glass rounded-3xl animate-pulse" />)}
        </div>
      ) : socios.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl py-20 text-center">
          <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4"><Users size={24} className="text-slate-300" /></div>
          <p className="text-slate-500 font-medium">No hay socios registrados</p>
          <p className="text-slate-300 text-xs mt-1">Agrega fotógrafos y videógrafos</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {socios.map(socio => {
            const RoleIcon = ROLE_ICONS[socio.role] || Users;
            const events = getEventsForSocio(socio.id);
            const { paid, pending, total } = getPaymentSummary(socio.id);
            return (
              <motion.div key={socio.id} variants={item} className="glass rounded-3xl p-6" data-testid={`socio-card-${socio.id}`}>
                {/* Photo + name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {socio.photo && socio.photo_content_type ? (
                        <img src={`data:${socio.photo_content_type};base64,${socio.photo}`} alt={socio.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/60 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl btn-primary flex items-center justify-center ring-2 ring-white/60 shadow-md">
                          <span className="text-xl font-black text-white">{socio.name?.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <RoleIcon size={11} className="text-slate-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{socio.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${ROLE_COLORS[socio.role] || ROLE_COLORS["Asistente"]}`}>
                        {socio.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setEditTarget(socio); setShowForm(true); }}
                      className="p-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-400 hover:text-indigo-600 transition-colors" data-testid={`edit-socio-${socio.id}`}><Edit2 size={13} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(socio.id)}
                      className="p-1.5 rounded-xl bg-red-50/80 hover:bg-red-100/80 text-red-300 hover:text-red-500 transition-colors" data-testid={`delete-socio-${socio.id}`}><Trash2 size={13} /></motion.button>
                  </div>
                </div>

                {socio.phone && <p className="text-xs text-slate-400 mb-3">{socio.phone}</p>}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/40">
                  <div className="bg-white/30 rounded-2xl px-2 py-2 text-center">
                    <p className="text-lg font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{events.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Eventos</p>
                  </div>
                  <div className="bg-emerald-50/60 rounded-2xl px-2 py-2 text-center" data-testid={`paid-${socio.id}`}>
                    <p className="text-xs font-black text-emerald-600">{formatCurrency(paid)}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <CheckCircle size={8} className="text-emerald-500" />
                      <p className="text-[9px] text-emerald-500 font-bold uppercase">Pagado</p>
                    </div>
                  </div>
                  <div className="bg-amber-50/60 rounded-2xl px-2 py-2 text-center" data-testid={`pending-${socio.id}`}>
                    <p className="text-xs font-black text-amber-600">{formatCurrency(pending)}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Clock size={8} className="text-amber-500" />
                      <p className="text-[9px] text-amber-500 font-bold uppercase">Pendiente</p>
                    </div>
                  </div>
                </div>

                {/* Recent events */}
                {events.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {events.slice(0, 2).map(ev => {
                      const partnerInEv = (ev.assigned_partners || []).find(p => p.socio_id === socio.id);
                      const evPaid = partnerInEv?.payment_status === "Pagado";
                      return (
                        <div key={ev.id} className="flex items-center justify-between text-xs bg-white/20 rounded-xl px-2.5 py-1.5">
                          <span className="font-medium text-slate-700 truncate">{ev.client_name}</span>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${evPaid ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                              {evPaid ? "Pagado" : "Pendiente"}
                            </span>
                            <span className="text-slate-400">{ev.event_date?.split("-").reverse().join("/")}</span>
                          </div>
                        </div>
                      );
                    })}
                    {events.length > 2 && <p className="text-[10px] text-slate-400 text-center">+{events.length - 2} más</p>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {showForm && <SocioForm socio={editTarget} onClose={() => { setShowForm(false); setEditTarget(null); }} onSaved={() => { setShowForm(false); setEditTarget(null); load(); }} />}
    </div>
  );
}
