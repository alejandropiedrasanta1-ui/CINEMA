import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReservations, deleteReservation } from "@/lib/api";
import { Plus, Trash2, Eye, Search, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import { useToast } from "@/hooks/use-toast";
import { generateReservationPDF } from "@/lib/generatePDF";
import { getEventConfig } from "@/lib/eventConfig";

const STATUS_COLORS = {
  Pendiente: "bg-amber-100/80 text-amber-700 border-amber-200/60",
  Confirmado: "bg-blue-100/80 text-blue-700 border-blue-200/60",
  Completado: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  Cancelado:  "bg-red-100/80 text-red-700 border-red-200/60",
};

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr, formatCurrency, logoUrl, pdfLogoUrl, usePdfLogo, useCustomPdfLogo } = useSettings();
  const l = tr.list;

  const getEffectivePdfLogo = () => {
    if (!usePdfLogo) return null;
    if (useCustomPdfLogo && pdfLogoUrl) return pdfLogoUrl;
    return logoUrl || undefined;
  };

  const handleDownloadPDF = async (r, e) => {
    e.stopPropagation();
    try {
      await generateReservationPDF(r, formatCurrency, getEffectivePdfLogo());
      toast({ title: "PDF generado exitosamente" });
    } catch {
      toast({ title: "Error al generar PDF", variant: "destructive" });
    }
  };

  const EVENT_TYPES = ["Boda","Quinceañera","Fiesta Social","Evento Corporativo","Conferencia","Otro"];
  const STATUSES_KEYS = ["Pendiente","Confirmado","Completado","Cancelado"];

  const load = async () => {
    setLoading(true);
    try {
      const data = await getReservations();
      setReservations([...data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar?")) return;
    try { await deleteReservation(id); toast({ title: "Eliminado" }); load(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const formatDate = (d) => { if (!d) return "-"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; };

  const filtered = reservations.filter(r => {
    const ms = r.client_name?.toLowerCase().includes(search.toLowerCase()) || r.event_type?.toLowerCase().includes(search.toLowerCase()) || (r.venue||"").toLowerCase().includes(search.toLowerCase());
    const mt = filterType === "all" || r.event_type === filterType;
    const ms2 = filterStatus === "all" || r.status === filterStatus;
    return ms && mt && ms2;
  });

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily:'Cabinet Grotesk, sans-serif' }}>{tr.nav.reservations}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{reservations.length} {l.colClient === "Client" ? "reservations total" : "reservas en total"}</p>
        </div>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => setShowForm(true)} data-testid="new-reservation-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
          <Plus size={16} /> {tr.common.newReservation}
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={l.search}
            className="w-full pl-10 pr-4 py-2.5 text-sm glass rounded-2xl border-white/50 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 placeholder-slate-400 text-slate-700"
            data-testid="search-input" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} data-testid="filter-type"
          className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-medium">
          <option value="all" className="bg-white">{l.all}</option>
          {EVENT_TYPES.map(t => <option key={t} value={t} className="bg-white">{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} data-testid="filter-status"
          className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-medium">
          <option value="all" className="bg-white">{l.all}</option>
          {STATUSES_KEYS.map(s => <option key={s} value={s} className="bg-white">{tr.statuses[s]}</option>)}
        </select>
      </motion.div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.15 }} className="glass rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-12 space-y-3 px-6">
            {[...Array(4)].map((_,i) => <div key={i} className="h-14 glass rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4"><Search size={24} className="text-slate-300" /></div>
            <p className="text-slate-500 font-medium">{l.noResults}</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="reservations-table">
            <thead>
              <tr className="border-b border-white/30">
                {[l.colClient, l.colType, l.colDate, l.colTotal, l.colAdvance, l.colStatus, ""].map((h,i) => (
                  <th key={i} className={`text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest ${i===1?"hidden sm:table-cell":""} ${i===3||i===4?"hidden md:table-cell":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <AnimatePresence>
              <tbody className="divide-y divide-white/20">
                {filtered.map((r, idx) => (
                  <motion.tr key={r.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:idx*0.04 }}
                    whileHover={{ backgroundColor:"rgba(255,255,255,0.35)" }} className="cursor-pointer transition-colors"
                    onClick={() => navigate(`/reservaciones/${r.id}`)} data-testid={`reservation-row-${r.id}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor:"color-mix(in srgb, var(--t-from) 12%, white)" }}>
                          <span className="text-xs font-black" style={{ color:"var(--t-from)" }}>{r.client_name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.client_name}</p>
                          {r.client_phone && <p className="text-xs text-slate-400">{r.client_phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 hidden sm:table-cell">
                      {(() => {
                        const cfg = getEventConfig(r.event_type);
                        const EvIcon = cfg.icon;
                        return (
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex w-6 h-6 rounded-lg items-center justify-center flex-shrink-0" style={{ background: cfg.fg + "18" }}>
                              <EvIcon size={12} style={{ color: cfg.fg }} strokeWidth={1.8} />
                            </span>
                            <span className="font-medium">{r.event_type}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{formatDate(r.event_date)}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 hidden md:table-cell">{formatCurrency(r.total_amount)}</td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div>
                        <span className="font-bold text-emerald-600">{formatCurrency(r.advance_paid)}</span>
                        {r.total_amount > 0 && (
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,((r.advance_paid||0)/r.total_amount)*100)}%` }} transition={{ duration:0.6, delay:0.3 }} className="h-full rounded-full theme-progress" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full border font-bold ${STATUS_COLORS[r.status]||STATUS_COLORS.Pendiente}`}>{tr.statuses[r.status]||r.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={() => navigate(`/reservaciones/${r.id}`)}
                          className="p-2 rounded-2xl hover:bg-indigo-100/80 text-slate-400 hover:text-indigo-600 transition-colors" data-testid={`view-btn-${r.id}`}><Eye size={14} /></motion.button>
                        <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={e => handleDownloadPDF(r, e)}
                          className="p-2 rounded-2xl hover:bg-emerald-100/80 text-slate-400 hover:text-emerald-600 transition-colors" data-testid={`pdf-btn-${r.id}`} title="Descargar PDF"><FileDown size={14} /></motion.button>
                        <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} onClick={e => handleDelete(r.id, e)}
                          className="p-2 rounded-2xl hover:bg-red-100/80 text-slate-400 hover:text-red-500 transition-colors" data-testid={`delete-btn-${r.id}`}><Trash2 size={14} /></motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </AnimatePresence>
          </table>
        )}
      </motion.div>

      {showForm && <ReservationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
