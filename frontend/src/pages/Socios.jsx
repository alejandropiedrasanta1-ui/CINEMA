import { useEffect, useState, useRef } from "react";
import { getSocios, deleteSocio, getReservations, getFinancials, updateReservation } from "@/lib/api";
import { Plus, Trash2, Edit2, Camera, Video, Users, TrendingUp, DollarSign, CheckCircle, Clock, GripVertical, CalendarPlus, X, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import SocioForm from "@/components/SocioForm";

const ROLE_ICONS   = { "Fotógrafo": Camera, "Videógrafo": Video, "Asistente": Users };
const ROLE_COLORS  = {
  "Fotógrafo": "bg-indigo-100/80 text-indigo-700 border-indigo-200/60",
  "Videógrafo": "bg-purple-100/80 text-purple-700 border-purple-200/60",
  "Asistente":  "bg-slate-100/80 text-slate-700 border-slate-200/60",
};
const ORDER_KEY = "cp_socios_order";
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item       = { hidden: { opacity: 0, y: 20, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

function AssignEventPanel({ socio, reservations, formatCurrency, onAssigned, onClose }) {
  const [selectedRes, setSelectedRes] = useState("");
  const [payment, setPayment]         = useState("");
  const [saving, setSaving]           = useState(false);
  const { toast } = useToast();
  const available = reservations.filter(r =>
    r.status !== "Cancelado" &&
    !(r.assigned_partners || []).some(p => p.socio_id === socio.id)
  );
  const handleAssign = async () => {
    if (!selectedRes) return;
    setSaving(true);
    try {
      const res = reservations.find(r => r.id === selectedRes);
      const partners = [...(res.assigned_partners || []), { socio_id: socio.id, payment: parseFloat(payment) || 0, payment_status: "Pendiente" }];
      await updateReservation(selectedRes, { assigned_partners: partners });
      toast({ title: `${socio.name} asignado a "${res.event_type}" ✓` });
      onAssigned();
    } catch { toast({ title: "Error al asignar evento", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="mt-3 bg-indigo-50/80 border border-indigo-200/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Asignar a evento</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-100 transition-colors"><X size={12} className="text-indigo-400" /></button>
      </div>
      {available.length === 0 ? (
        <p className="text-xs text-indigo-400 text-center py-2">Ya asignado a todos los eventos activos</p>
      ) : (
        <>
          <select value={selectedRes} onChange={e => setSelectedRes(e.target.value)}
            className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">— Selecciona un evento —</option>
            {available.map(r => (
              <option key={r.id} value={r.id}>{r.event_type} · {r.event_date?.split("-").reverse().join("/")} · {r.client_name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <div className="flex-1">
              <input type="number" value={payment} onChange={e => setPayment(e.target.value)}
                placeholder="Honorario (opcional)" min="0" step="0.01"
                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={handleAssign} disabled={!selectedRes || saving}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-black disabled:opacity-40 hover:bg-indigo-600 transition-colors flex items-center gap-1.5">
              {saving ? <><Clock size={11} className="animate-spin" /> Asignando...</> : <><CheckCircle size={11} /> Asignar</>}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function Socios() {
  const [socios,       setSocios]       = useState([]);
  const [orderedIds,   setOrderedIds]   = useState(() => { try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || []; } catch { return []; } });
  const [reservations, setReservations] = useState([]);
  const [financials,   setFinancials]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [dragOverId,   setDragOverId]   = useState(null);
  const [assigningId,  setAssigningId]  = useState(null);
  const [expandedId,   setExpandedId]   = useState(null);
  const dragIdRef = useRef(null);
  const { formatCurrency } = useSettings();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, f] = await Promise.all([getSocios(), getReservations(), getFinancials()]);
      setSocios(s); setReservations(r); setFinancials(f);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (orderedIds.length > 0) localStorage.setItem(ORDER_KEY, JSON.stringify(orderedIds)); }, [orderedIds]);

  const sortedSocios = [...socios].sort((a, b) => {
    const ai = orderedIds.indexOf(a.id), bi = orderedIds.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  const handleDragStart = (e, id) => { dragIdRef.current = id; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver  = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(id); };
  const handleDrop      = (e, targetId) => {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId) { setDragOverId(null); return; }
    const ids = sortedSocios.map(s => s.id);
    const fi = ids.indexOf(fromId), ti = ids.indexOf(targetId);
    const next = [...ids]; next.splice(fi, 1); next.splice(ti, 0, fromId);
    setOrderedIds(next); setDragOverId(null); dragIdRef.current = null;
  };
  const handleDragEnd = () => { setDragOverId(null); dragIdRef.current = null; };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este socio?")) return;
    try { await deleteSocio(id); toast({ title: "Socio eliminado" }); load(); }
    catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
  };

  const togglePayment = async (reservation, socioId) => {
    const partners = (reservation.assigned_partners || []).map(p =>
      p.socio_id === socioId
        ? { ...p, payment_status: p.payment_status === "Pagado" ? "Pendiente" : "Pagado" }
        : p
    );
    try {
      await updateReservation(reservation.id, { assigned_partners: partners });
      toast({ title: "Estado de pago actualizado ✓" });
      load();
    } catch { toast({ title: "Error al actualizar", variant: "destructive" }); }
  };

  const removeFromEvent = async (reservation, socioId) => {
    if (!window.confirm("¿Quitar a este socio del evento?")) return;
    const partners = (reservation.assigned_partners || []).filter(p => p.socio_id !== socioId);
    try {
      await updateReservation(reservation.id, { assigned_partners: partners });
      toast({ title: "Socio quitado del evento ✓" });
      load();
    } catch { toast({ title: "Error al actualizar", variant: "destructive" }); }
  };

  const getEventsForSocio   = (id) => reservations.filter(r => (r.assigned_partners || []).some(p => p.socio_id === id));
  const getPaymentSummary   = (id) => {
    let paid = 0, pending = 0;
    reservations.forEach(r => {
      const p = (r.assigned_partners || []).find(p => p.socio_id === id);
      if (!p) return;
      if (p.payment_status === "Pagado") paid += (p.payment || 0);
      else pending += (p.payment || 0);
    });
    return { paid, pending };
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Socios</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{socios.length} socios — arrastra para reordenar</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          data-testid="new-socio-btn" className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
          <Plus size={16} /> Nuevo Socio
        </motion.button>
      </motion.div>

      {/* Financial summary */}
      {financials && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Eventos",  value: formatCurrency(financials.total_event_amount),          icon: DollarSign,  grad: "from-emerald-400 to-emerald-600",  testid: "stat-total-events" },
            { label: "Costo Equipo",   value: formatCurrency(financials.total_partner_cost),           icon: Users,       grad: "from-amber-400 to-orange-500",      testid: "stat-team-cost"    },
            { label: "Pagado Equipo",  value: formatCurrency(financials.total_paid_to_partners || 0),  icon: CheckCircle, grad: "from-green-400 to-emerald-500",    testid: "stat-paid"         },
            { label: "Ingreso Real",   value: formatCurrency(financials.real_income),                  icon: TrendingUp,  grad: "from-indigo-400 to-purple-600",     testid: "stat-real-income"  },
          ].map(({ label, value, icon: Icon, grad, testid }) => (
            <div key={label} className="glass rounded-3xl p-5" data-testid={testid}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center`}><Icon size={15} className="text-white" /></div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
              </div>
              <p className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{value}</p>
            </div>
          ))}
        </motion.div>
      )}

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
          {sortedSocios.map(socio => {
            const RoleIcon  = ROLE_ICONS[socio.role] || Users;
            const events    = getEventsForSocio(socio.id);
            const { paid, pending } = getPaymentSummary(socio.id);
            const isDragOver = dragOverId === socio.id;
            const isExpanded = expandedId === socio.id;
            const isAssigning = assigningId === socio.id;
            return (
              <motion.div key={socio.id} variants={item}
                draggable onDragStart={e => handleDragStart(e, socio.id)} onDragOver={e => handleDragOver(e, socio.id)}
                onDrop={e => handleDrop(e, socio.id)} onDragEnd={handleDragEnd}
                data-testid={`socio-card-${socio.id}`}
                className={`glass rounded-3xl p-5 transition-all duration-200 ${isDragOver ? "ring-2 ring-indigo-400 scale-[1.02] opacity-80" : ""}`}
                style={{ cursor: "grab" }}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GripVertical size={14} className="text-slate-300 hover:text-slate-500 transition-colors cursor-grab shrink-0" />
                    <div className="relative">
                      {socio.photo && socio.photo_content_type
                        ? <img src={`data:${socio.photo_content_type};base64,${socio.photo}`} alt={socio.name} className="w-13 h-13 w-[52px] h-[52px] rounded-2xl object-cover ring-2 ring-white/60 shadow-md" />
                        : <div className="w-[52px] h-[52px] rounded-2xl btn-primary flex items-center justify-center ring-2 ring-white/60 shadow-md"><span className="text-xl font-black text-white">{socio.name?.charAt(0).toUpperCase()}</span></div>
                      }
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm"><RoleIcon size={11} className="text-slate-600" /></div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{socio.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${ROLE_COLORS[socio.role] || ROLE_COLORS["Asistente"]}`}>{socio.role}</span>
                      {socio.phone && <p className="text-[10px] text-slate-400 mt-0.5">{socio.phone}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setEditTarget(socio); setShowForm(true); }}
                      className="p-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-400 hover:text-indigo-600 transition-colors" data-testid={`edit-socio-${socio.id}`}><Edit2 size={13} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(socio.id)}
                      className="p-1.5 rounded-xl bg-red-50/80 hover:bg-red-100/80 text-red-300 hover:text-red-500 transition-colors" data-testid={`delete-socio-${socio.id}`}><Trash2 size={13} /></motion.button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/30 rounded-2xl px-2 py-2 text-center">
                    <p className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{events.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Eventos</p>
                  </div>
                  <div className="bg-emerald-50/60 rounded-2xl px-2 py-2 text-center" data-testid={`paid-${socio.id}`}>
                    <p className="text-xs font-black text-emerald-600">{formatCurrency(paid)}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5"><CheckCircle size={8} className="text-emerald-500" /><p className="text-[9px] text-emerald-500 font-bold uppercase">Pagado</p></div>
                  </div>
                  <div className="bg-amber-50/60 rounded-2xl px-2 py-2 text-center" data-testid={`pending-${socio.id}`}>
                    <p className="text-xs font-black text-amber-600">{formatCurrency(pending)}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5"><Clock size={8} className="text-amber-500" /><p className="text-[9px] text-amber-500 font-bold uppercase">Pendiente</p></div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mb-3">
                  <button onClick={() => { setAssigningId(isAssigning ? null : socio.id); setExpandedId(null); }}
                    data-testid={`assign-event-btn-${socio.id}`}
                    className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isAssigning ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white/60 border-white/60 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"}`}>
                    <CalendarPlus size={12} /> Asignar evento
                  </button>
                  {events.length > 0 && (
                    <button onClick={() => { setExpandedId(isExpanded ? null : socio.id); setAssigningId(null); }}
                      data-testid={`expand-events-btn-${socio.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isExpanded ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-white/60 border-white/60 text-slate-600 hover:bg-slate-50"}`}>
                      <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      {events.length}
                    </button>
                  )}
                </div>

                {/* Assign event panel */}
                <AnimatePresence>
                  {isAssigning && (
                    <AssignEventPanel key="assign" socio={socio} reservations={reservations} formatCurrency={formatCurrency}
                      onAssigned={() => { setAssigningId(null); load(); }}
                      onClose={() => setAssigningId(null)} />
                  )}
                </AnimatePresence>

                {/* Events list (expandible) */}
                <AnimatePresence>
                  {isExpanded && events.length > 0 && (
                    <motion.div key="events" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden">
                      {events.map(ev => {
                        const partnerInEv = (ev.assigned_partners || []).find(p => p.socio_id === socio.id);
                        const isPaid = partnerInEv?.payment_status === "Pagado";
                        return (
                          <div key={ev.id} className="bg-white/40 rounded-xl px-3 py-2.5 border border-white/60">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-xs font-black text-slate-800 flex-1">{ev.event_type}</p>
                              <span className="text-[10px] text-slate-400">{ev.event_date?.split("-").reverse().join("/")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 flex-1 truncate">{ev.client_name}</span>
                              {partnerInEv?.payment > 0 && (
                                <span className="text-xs font-black text-slate-700">{formatCurrency(partnerInEv.payment)}</span>
                              )}
                              {/* Toggle Pendiente ↔ Pagado */}
                              <button onClick={() => togglePayment(ev, socio.id)}
                                data-testid={`toggle-payment-${ev.id}-${socio.id}`}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${isPaid ? "bg-emerald-100 text-emerald-700 hover:bg-amber-100 hover:text-amber-700" : "bg-amber-100 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700"}`}>
                                {isPaid ? <><CheckCircle size={9} /> Pagado</> : <><Clock size={9} /> Pendiente</>}
                              </button>
                              {/* Quitar del evento */}
                              <button onClick={() => removeFromEvent(ev, socio.id)}
                                data-testid={`remove-from-event-${ev.id}-${socio.id}`}
                                className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mini preview eventos (cuando no expandido) */}
                {!isExpanded && !isAssigning && events.length > 0 && (
                  <div className="space-y-1">
                    {events.slice(0, 2).map(ev => {
                      const partnerInEv = (ev.assigned_partners || []).find(p => p.socio_id === socio.id);
                      const evPaid = partnerInEv?.payment_status === "Pagado";
                      return (
                        <div key={ev.id} className="flex items-center gap-2 bg-white/20 rounded-xl px-2.5 py-1.5 text-xs">
                          <span className="font-bold text-slate-700 flex-1 truncate">{ev.event_type}</span>
                          <span className="text-slate-400">{ev.event_date?.split("-").reverse().join("/")}</span>
                          <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded-full ${evPaid ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{evPaid ? "Pagado" : "Pendiente"}</span>
                        </div>
                      );
                    })}
                    {events.length > 2 && <p className="text-[10px] text-slate-400 text-center">+{events.length - 2} más — toca ver todos</p>}
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
