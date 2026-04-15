import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Database, Download, Upload, Save, Trash2, RefreshCw,
  Wifi, WifiOff, CheckCircle, XCircle, Loader2, FileText,
  AlertCircle, ChevronRight, Clock, HardDrive, BarChart3,
  ShieldCheck, Link2, ArrowRight,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDbStats, testDbConnection, switchDatabase, resetDatabase,
  getReservations, getBackupHistory, createServerBackup,
  deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup,
} from "@/lib/api";
import { generateAllReservationsPDF } from "@/lib/generatePDF";

const BASE = process.env.REACT_APP_BACKEND_URL;

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-GT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function DatabasePage() {
  const { language, tr, logoUrl, pdfTheme, formatCurrency, usePdfLogo, useCustomPdfLogo, pdfLogoUrl } = useSettings();
  const { toast } = useToast();
  const s = tr;

  const [dbStats, setDbStats]           = useState(null);
  const [dbLoading, setDbLoading]       = useState(true);
  const [newDbUrl, setNewDbUrl]         = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting]       = useState(false);
  const [dbResetting, setDbResetting]   = useState(false);
  const [showClear, setShowClear]       = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const [backupHistory, setBackupHistory]   = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult]   = useState(null);
  const restoreInputRef = useRef(null);

  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => { loadDbStats(); loadBackupHistory(); };

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats().then(setDbStats).catch(() => setDbStats(null)).finally(() => setDbLoading(false));
  };

  const loadBackupHistory = () =>
    getBackupHistory().then(setBackupHistory).catch(() => setBackupHistory([]));

  const handleDbTest = async () => {
    if (!newDbUrl.trim()) return;
    setDbTesting(true); setDbTestResult(null);
    try {
      await testDbConnection(newDbUrl.trim());
      setDbTestResult({ ok: true, msg: s.dbTestOk || "Conexión exitosa" });
    } catch (err) {
      setDbTestResult({ ok: false, msg: err.response?.data?.detail || "Error de conexión" });
    } finally { setDbTesting(false); }
  };

  const handleDbConnect = async () => {
    if (!newDbUrl.trim()) return;
    setDbConnecting(true);
    try {
      await switchDatabase(newDbUrl.trim());
      toast({ title: "Base de datos conectada ✓" });
      setNewDbUrl(""); setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch (err) {
      toast({ title: err.response?.data?.detail || "Error al conectar", variant: "destructive" });
    } finally { setDbConnecting(false); }
  };

  const handleDbReset = async () => {
    setDbResetting(true);
    try {
      await resetDatabase();
      toast({ title: "Restaurado a base de datos local ✓" });
      setNewDbUrl(""); setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setDbResetting(false); }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${BASE}/api/data/clear-all`, { method: "DELETE" });
      const d = await res.json();
      setShowClear(false);
      toast({ title: `Datos eliminados — ${d.deleted_reservations} reservas, ${d.deleted_socios} socios` });
      loadAll();
    } catch { toast({ title: "Error al borrar", variant: "destructive" }); }
    finally { setClearLoading(false); }
  };

  const handleDownloadBackup = () => {
    const a = document.createElement("a");
    a.href = downloadBackupUrl(); a.download = "";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast({ title: "Descargando respaldo completo..." });
  };

  const handleCreateServerBackup = async () => {
    setBackupCreating(true);
    try {
      const r = await createServerBackup();
      toast({ title: r.message || "Respaldo guardado ✓" });
      loadBackupHistory();
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Error", variant: "destructive" });
    } finally { setBackupCreating(false); }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true); setRestoreResult(null);
    try {
      const r = await restoreBackup(file);
      setRestoreResult({ ok: true, msg: r.message });
      toast({ title: r.message });
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al restaurar";
      setRestoreResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setRestoreLoading(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  const handleDeleteBackup = async (filename) => {
    try {
      await deleteBackupFile(filename);
      setBackupHistory(prev => prev.filter(b => b.filename !== filename));
      toast({ title: "Respaldo eliminado" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleExport = async (format) => {
    try {
      const res = await fetch(`${BASE}/api/export/reservations?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = format === "json" ? "reservaciones.json" : "reservaciones.csv";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast({ title: `Exportado como ${format.toUpperCase()} ✓` });
    } catch { toast({ title: "Error al exportar", variant: "destructive" }); }
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) { toast({ title: "No hay reservas para exportar", variant: "destructive" }); return; }
      const logo = usePdfLogo ? (useCustomPdfLogo && pdfLogoUrl ? pdfLogoUrl : logoUrl || undefined) : null;
      await generateAllReservationsPDF(reservations, formatCurrency, logo, pdfTheme);
      toast({ title: `PDF generado — ${reservations.length} reservas ✓` });
    } catch (e) { toast({ title: e.message || "Error al generar PDF", variant: "destructive" }); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          Base de Datos
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">Respaldos, exportación y conexión MongoDB</p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

        {/* ── ESTADÍSTICAS ── */}
        <motion.div variants={fadeUp}>
          <div className="glass rounded-3xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <BarChart3 size={16} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{s.dbTitle || "Estado de la Base de Datos"}</p>
                  <p className="text-[11px] text-slate-400">{s.dbDesc || "Estadísticas y conexión actual"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dbStats && (
                  <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full ${dbStats.is_custom ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {dbStats.is_custom ? <WifiOff size={10} /> : <Wifi size={10} />}
                    {dbStats.is_custom ? (s.dbCustomLabel || "BD Personalizada") : (s.dbDefaultLabel || "BD Local")}
                  </span>
                )}
                <button onClick={loadDbStats} className="w-8 h-8 rounded-xl hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                  <RefreshCw size={13} className={dbLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-5">
              {dbLoading ? (
                <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Cargando estadísticas...</span>
                </div>
              ) : dbStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: s.dbCollections || "Colecciones", value: dbStats.collections, color: "bg-indigo-50 text-indigo-700", accent: "bg-indigo-500" },
                      { label: s.dbObjects || "Documentos", value: dbStats.objects?.toLocaleString(), color: "bg-emerald-50 text-emerald-700", accent: "bg-emerald-500" },
                      { label: s.dbTotal || "Tamaño total", value: dbStats.total_size, color: "bg-violet-50 text-violet-700", accent: "bg-violet-500" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl p-4 ${item.color}`}>
                        <div className="text-xl font-black" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{item.value}</div>
                        <div className="text-[11px] font-semibold mt-1 opacity-70">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/80 rounded-2xl px-4 py-3">
                    <Link2 size={13} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{s.dbCurrentConn || "Conexión activa"}</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{dbStats.current_url}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-slate-400">No se pudieron cargar las estadísticas</p>
                  <button onClick={loadDbStats} className="text-xs text-indigo-500 font-bold hover:underline">Reintentar</button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── RESPALDOS ── */}
        <motion.div variants={fadeUp}>
          <div className="glass rounded-3xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/40">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ShieldCheck size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Respaldos</p>
                <p className="text-[11px] text-slate-400">Descarga, guarda y restaura todos tus datos</p>
              </div>
            </div>
            <div className="p-5 space-y-4">

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadBackup} data-testid="backup-download-btn"
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl btn-primary text-white group">
                  <Download size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Descargar a mi PC</span>
                  <span className="text-[10px] opacity-70">Archivo .json completo</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateServerBackup} disabled={backupCreating} data-testid="backup-server-btn"
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 group disabled:opacity-60 hover:bg-emerald-100 transition-all">
                  {backupCreating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                  <span className="text-xs font-bold">Guardar en servidor</span>
                  <span className="text-[10px] opacity-70">Historial de 15 respaldos</span>
                </motion.button>
              </div>

              {/* Restore */}
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100/60">
                  <Upload size={14} className="text-amber-600" />
                  <p className="text-xs font-black text-amber-800">Restaurar desde archivo</p>
                  <span className="text-[10px] text-amber-500 ml-auto flex items-center gap-1">
                    <ShieldCheck size={10} /> Auto-respaldo antes de restaurar
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <input ref={restoreInputRef} type="file" accept=".json"
                    onChange={handleRestoreFile} className="hidden" id="restore-file-input-db" data-testid="restore-file-input" />
                  <label htmlFor="restore-file-input-db"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all border-2 border-dashed ${restoreLoading ? "border-amber-200 bg-amber-50 text-amber-300" : "border-amber-300 bg-white hover:bg-amber-50 text-amber-700"}`}>
                    {restoreLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {restoreLoading ? "Restaurando datos..." : "Seleccionar archivo .json para restaurar"}
                  </label>
                  {restoreResult && (
                    <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${restoreResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {restoreResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {restoreResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Backup history */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Historial — {backupHistory.length} respaldo(s)
                  </p>
                  <button onClick={loadBackupHistory} className="text-[10px] text-indigo-500 font-bold hover:underline">Actualizar</button>
                </div>
                {backupHistory.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-slate-300 gap-2">
                    <HardDrive size={16} />
                    <span className="text-xs">No hay respaldos guardados en servidor</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {backupHistory.map((b, i) => {
                      const isAuto = b.label === "auto";
                      return (
                        <motion.div key={b.filename} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 bg-white/60 border border-slate-100 rounded-xl px-3 py-2.5 hover:bg-white/80 transition-all">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAuto ? "bg-slate-100" : "bg-indigo-100"}`}>
                            {isAuto ? <Clock size={11} className="text-slate-400" /> : <ShieldCheck size={11} className="text-indigo-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{b.filename}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isAuto ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600"}`}>
                                {isAuto ? "AUTO" : "MANUAL"}
                              </span>
                              <span className="text-[9px] text-slate-400">{b.size} · {fmtDate(b.created_at)}</span>
                            </div>
                          </div>
                          <a href={downloadBackupFileUrl(b.filename)} download data-testid={`backup-dl-${b.filename}`}
                            className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors" title="Descargar">
                            <Download size={11} className="text-indigo-600" />
                          </a>
                          <button onClick={() => handleDeleteBackup(b.filename)} data-testid={`backup-del-${b.filename}`}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Eliminar">
                            <Trash2 size={11} className="text-red-400" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MongoDB Atlas guide */}
              <details className="rounded-2xl overflow-hidden border border-blue-200/60 bg-blue-50/30 group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none select-none">
                  <Database size={13} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-black text-blue-800 flex-1">Base de datos en la nube — MongoDB Atlas (gratis)</span>
                  <ChevronRight size={12} className="text-blue-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-[10px] text-blue-700 space-y-2 border-t border-blue-100/60">
                  <p className="font-black text-xs mt-3">4 pasos — 512 MB gratuitos:</p>
                  {[
                    <>Ve a <a href="https://www.mongodb.com/cloud/atlas/register" target="_blank" rel="noreferrer" className="underline font-bold">mongodb.com/cloud/atlas</a> → crea cuenta gratis</>,
                    <>Crea un cluster → <b>Free Tier (M0 Sandbox)</b> → región más cercana</>,
                    <>Database Access → crea usuario/contraseña → Network Access → agrega <b>0.0.0.0/0</b></>,
                    <>Connect → "Connect your application" → copia la URI → pégala abajo en "Cambiar conexión"</>,
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                  <code className="block bg-white/70 px-3 py-2 rounded-xl text-[9px] font-mono break-all border border-blue-100">
                    mongodb+srv://usuario:contraseña@cluster.mongodb.net/cinema
                  </code>
                </div>
              </details>

            </div>
          </div>
        </motion.div>

        {/* ── EXPORTAR DATOS ── */}
        <motion.div variants={fadeUp}>
          <div className="glass rounded-3xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/40">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <FileText size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{s.exportTitle || "Exportar Datos"}</p>
                <p className="text-[11px] text-slate-400">{s.exportDesc || "Descarga tus reservas en diferentes formatos"}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { fmt: "csv", label: s.downloadCSV || "Descargar CSV", color: "bg-emerald-50 border-emerald-200/60 text-emerald-700 hover:bg-emerald-100", icon: Download },
                  { fmt: "json", label: s.downloadJSON || "Descargar JSON", color: "bg-indigo-50 border-indigo-200/60 text-indigo-700 hover:bg-indigo-100", icon: Download },
                ].map(({ fmt, label, color, icon: Icon }) => (
                  <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleExport(fmt)} data-testid={`export-${fmt}-btn`}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all ${color}`}>
                    <Icon size={14} /> {label}
                  </motion.button>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.01, boxShadow: "0 8px 24px rgba(124,58,237,0.25)" }} whileTap={{ scale: 0.98 }}
                onClick={handleExportPDF} disabled={pdfLoading} data-testid="export-pdf-btn"
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                {pdfLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Generando PDF...</>
                  : <><FileText size={15} /> Exportar reporte PDF completo</>}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── CAMBIAR CONEXIÓN ── */}
        <motion.div variants={fadeUp}>
          <div className="glass rounded-3xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/40">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                <Wifi size={16} className="text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Cambiar conexión MongoDB</p>
                <p className="text-[11px] text-slate-400">Conecta a otra base de datos local o en la nube</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <input type="text" value={newDbUrl}
                onChange={e => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                placeholder="mongodb://usuario:contraseña@host:27017"
                data-testid="db-url-input"
                className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent" />
              {dbTestResult && (
                <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl ${dbTestResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                  {dbTestResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {dbTestResult.msg}
                </div>
              )}
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDbTest} disabled={!newDbUrl.trim() || dbTesting} data-testid="db-test-btn"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40">
                  {dbTesting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                  {s.dbTest || "Probar"}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDbConnect} disabled={!newDbUrl.trim() || dbConnecting} data-testid="db-connect-btn"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-40">
                  {dbConnecting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                  {s.dbConnect || "Conectar"}
                </motion.button>
                {dbStats?.is_custom && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDbReset} disabled={dbResetting} data-testid="db-reset-btn"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all border border-red-200/60 disabled:opacity-40">
                    {dbResetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {s.dbReset || "Restaurar local"}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ZONA DE PELIGRO ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-3xl border-2 border-dashed border-red-200/80 bg-red-50/20 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100/60">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-black text-red-700" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Zona de peligro</p>
                <p className="text-[11px] text-red-400">Acciones irreversibles — se crea respaldo automático primero</p>
              </div>
            </div>
            <div className="p-5">
              {!showClear ? (
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowClear(true)} data-testid="clear-all-data-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-all">
                  <Trash2 size={14} /> Borrar todos los datos
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200/60 rounded-2xl p-4">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-red-700">¿Confirmar borrado total?</p>
                      <p className="text-xs text-red-500 mt-1">Se eliminarán TODAS las reservas y socios. Un respaldo automático se creará antes de borrar.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleClearAll} disabled={clearLoading} data-testid="clear-all-confirm-btn"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
                      {clearLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Sí, borrar todo
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setShowClear(false)} data-testid="clear-all-cancel-btn"
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-all">
                      Cancelar
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
