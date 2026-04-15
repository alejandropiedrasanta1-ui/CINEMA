import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Database, Download, Upload, Save, Trash2, RefreshCw,
  Wifi, WifiOff, CheckCircle, XCircle, Loader2, FileText,
  AlertCircle, ChevronDown,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  api, getDbStats, testDbConnection, switchDatabase, resetDatabase,
  getReservations, getBackupHistory, createServerBackup,
  deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup,
} from "@/lib/api";
import { generateAllReservationsPDF } from "@/lib/generatePDF";

const BASE = process.env.REACT_APP_BACKEND_URL;

function StatCard({ label, value }) {
  return (
    <div className="bg-white/60 rounded-2xl p-3 text-center">
      <div className="text-base font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{value}</div>
      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`glass rounded-3xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, desc, badge }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 mt-0.5">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{title}</h2>
          {badge}
        </div>
        {desc && <p className="text-xs text-slate-400 font-medium mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

export default function DatabasePage() {
  const { language, tr, logoUrl, pdfTheme, formatCurrency, usePdfLogo, useCustomPdfLogo, pdfLogoUrl } = useSettings();
  const { toast } = useToast();
  const s = tr;

  // ── DB state ──────────────────────────────────────────────────
  const [dbStats, setDbStats] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [newDbUrl, setNewDbUrl] = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResetting, setDbResetting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // ── Backup state ──────────────────────────────────────────────
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const restoreInputRef = useRef(null);

  // ── Export state ──────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadDbStats();
    loadBackupHistory();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats()
      .then(setDbStats)
      .catch(() => setDbStats(null))
      .finally(() => setDbLoading(false));
  };

  const loadBackupHistory = () => {
    getBackupHistory().then(setBackupHistory).catch(() => setBackupHistory([]));
  };

  const handleDbTest = async () => {
    if (!newDbUrl.trim()) return;
    setDbTesting(true);
    setDbTestResult(null);
    try {
      await testDbConnection(newDbUrl.trim());
      setDbTestResult({ ok: true, msg: s.dbTestOk });
      toast({ title: s.dbTestOk + " ✓" });
    } catch (err) {
      const msg = err.response?.data?.detail || "Error de conexión";
      setDbTestResult({ ok: false, msg });
    } finally {
      setDbTesting(false);
    }
  };

  const handleDbConnect = async () => {
    if (!newDbUrl.trim()) return;
    setDbConnecting(true);
    try {
      await switchDatabase(newDbUrl.trim());
      toast({ title: s.dbConnectOk + " ✓" });
      setNewDbUrl("");
      setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch (err) {
      toast({ title: err.response?.data?.detail || "Error al conectar", variant: "destructive" });
    } finally {
      setDbConnecting(false);
    }
  };

  const handleDbReset = async () => {
    setDbResetting(true);
    try {
      await resetDatabase();
      toast({ title: s.dbResetOk + " ✓" });
      setNewDbUrl("");
      setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch (err) {
      toast({ title: err.response?.data?.detail || "Error", variant: "destructive" });
    } finally {
      setDbResetting(false);
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${BASE}/api/data/clear-all`, { method: "DELETE" });
      const data = await res.json();
      setShowClearConfirm(false);
      toast({ title: `✓ Datos eliminados — ${data.deleted_reservations} reservas, ${data.deleted_socios} socios` });
      loadDbStats();
      setTimeout(loadBackupHistory, 800);
    } catch {
      toast({ title: "Error al borrar los datos", variant: "destructive" });
    } finally {
      setClearLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    const a = document.createElement("a");
    a.href = downloadBackupUrl();
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Descargando respaldo completo..." });
  };

  const handleCreateServerBackup = async () => {
    setBackupCreating(true);
    try {
      const res = await createServerBackup();
      toast({ title: res.message || "Respaldo guardado en servidor ✓" });
      loadBackupHistory();
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Error al crear respaldo", variant: "destructive" });
    } finally {
      setBackupCreating(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const res = await restoreBackup(file);
      setRestoreResult({ ok: true, msg: res.message });
      toast({ title: res.message });
      loadDbStats();
      setTimeout(loadBackupHistory, 600);
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
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${BASE}/api/export/reservations?format=${format}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "reservaciones.json" : "reservaciones.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Descarga iniciada ✓" });
    } catch {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) {
        toast({ title: "No hay reservas para exportar", variant: "destructive" });
        return;
      }
      const effectiveLogo = usePdfLogo
        ? (useCustomPdfLogo && pdfLogoUrl ? pdfLogoUrl : logoUrl || undefined)
        : null;
      await generateAllReservationsPDF(reservations, formatCurrency, effectiveLogo, pdfTheme);
      toast({ title: `PDF generado — ${reservations.length} reservas ✓` });
    } catch (err) {
      toast({ title: err.message || "Error al generar PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22,1,0.36,1] } } };

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          Base de Datos
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">
          Respaldos, exportación y conexión a MongoDB
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* ── ESTADÍSTICAS ── */}
        <motion.div variants={item}>
          <Card>
            <SectionTitle icon={Database} title={s.dbTitle} desc={s.dbDesc}
              badge={dbStats ? (
                <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${dbStats.is_custom ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {dbStats.is_custom ? <WifiOff size={10} /> : <Wifi size={10} />}
                  {dbStats.is_custom ? s.dbCustomLabel : s.dbDefaultLabel}
                </span>
              ) : null}
            />
            {dbLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
            ) : dbStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label={s.dbCollections} value={dbStats.collections} />
                  <StatCard label={s.dbObjects} value={dbStats.objects?.toLocaleString()} />
                  <StatCard label={s.dbTotal} value={dbStats.total_size} />
                </div>
                <div className="bg-white/50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.dbCurrentConn}</p>
                    <p className="text-xs font-mono text-slate-600 break-all truncate">{dbStats.current_url}</p>
                  </div>
                  <button onClick={loadDbStats} data-testid="db-refresh-btn" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">No se pudieron cargar las estadísticas</p>
                <button onClick={loadDbStats} className="text-xs text-indigo-500 font-bold hover:underline">Reintentar</button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── RESPALDOS ── */}
        <motion.div variants={item}>
          <Card>
            <SectionTitle icon={Save} title="Respaldos de Base de Datos" desc="Descarga, guarda y restaura todos tus datos" />
            <div className="space-y-3">

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadBackup}
                  data-testid="backup-download-btn"
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl btn-primary text-white text-xs font-bold">
                  <Download size={13} />
                  Descargar a mi PC
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCreateServerBackup} disabled={backupCreating}
                  data-testid="backup-server-btn"
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl glass border-white/60 text-slate-700 text-xs font-bold hover:bg-white/60 disabled:opacity-60">
                  {backupCreating ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Guardar en servidor
                </motion.button>
              </div>

              {/* Restore */}
              <div className="bg-amber-50/60 rounded-2xl p-3 border border-amber-200/40">
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={13} className="text-amber-600" />
                  <p className="text-xs font-black text-amber-800">Restaurar desde archivo</p>
                  <span className="text-[10px] text-amber-500 ml-auto">Auto-respaldo antes de restaurar</span>
                </div>
                <div className="flex gap-2">
                  <input ref={restoreInputRef} type="file" accept=".json"
                    onChange={handleRestoreFile} className="hidden" id="restore-file-input-db"
                    data-testid="restore-file-input" />
                  <label htmlFor="restore-file-input-db"
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${restoreLoading ? "bg-amber-100 text-amber-400" : "bg-amber-100 hover:bg-amber-200 text-amber-700"}`}>
                    {restoreLoading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {restoreLoading ? "Restaurando..." : "Seleccionar archivo .json"}
                  </label>
                </div>
                {restoreResult && (
                  <div className={`flex items-center gap-2 text-xs font-semibold mt-2 px-2 py-1 rounded-lg ${restoreResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {restoreResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {restoreResult.msg}
                  </div>
                )}
              </div>

              {/* Backup history */}
              {backupHistory.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Historial — {backupHistory.length} respaldo(s) en servidor
                  </p>
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {backupHistory.map(b => (
                      <div key={b.filename} className="flex items-center gap-2 bg-white/50 rounded-xl px-3 py-2">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${b.label === "auto" ? "bg-slate-100" : "bg-indigo-100"}`}>
                          <Database size={10} className={b.label === "auto" ? "text-slate-400" : "text-indigo-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{b.filename}</p>
                          <p className="text-[9px] text-slate-400">{b.size} · {new Date(b.created_at).toLocaleString("es-GT")}</p>
                        </div>
                        <a href={downloadBackupFileUrl(b.filename)} download
                          data-testid={`backup-dl-${b.filename}`}
                          className="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                          <Download size={10} className="text-indigo-600" />
                        </a>
                        <button onClick={() => handleDeleteBackup(b.filename)}
                          data-testid={`backup-del-${b.filename}`}
                          className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={10} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-2">No hay respaldos en servidor aún</p>
              )}

              {/* MongoDB Atlas guide */}
              <details className="bg-blue-50/60 rounded-2xl border border-blue-100/60">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-xs font-black text-blue-800 list-none select-none">
                  <Database size={13} className="text-blue-500" />
                  Conectar base de datos en la nube (gratis) — MongoDB Atlas
                  <ChevronDown size={12} className="text-blue-400 ml-auto" />
                </summary>
                <div className="px-4 pb-4 text-[10px] text-blue-700 space-y-1.5">
                  <p className="font-black text-xs">4 pasos para tener tu BD en la nube gratis (512 MB):</p>
                  <p>1. Ve a <a href="https://www.mongodb.com/cloud/atlas/register" target="_blank" rel="noreferrer" className="underline font-bold">mongodb.com/cloud/atlas</a> → crea cuenta gratis</p>
                  <p>2. Crea un cluster → <b>Free Tier (M0 Sandbox)</b> → elige la región más cercana</p>
                  <p>3. Database Access → crea usuario/contraseña → Network Access → agrega <b>0.0.0.0/0</b></p>
                  <p>4. Connect → "Connect your application" → copia la URI → pégala abajo en "Cambiar conexión"</p>
                  <code className="block bg-white/60 px-2 py-1.5 rounded text-[9px] font-mono break-all mt-1">
                    mongodb+srv://usuario:contraseña@cluster.mongodb.net/cinema
                  </code>
                  <p className="text-blue-500 mt-1">Con esto tendrás tus datos en la nube, accesibles desde cualquier PC.</p>
                </div>
              </details>

            </div>
          </Card>
        </motion.div>

        {/* ── EXPORTAR DATOS ── */}
        <motion.div variants={item}>
          <Card>
            <SectionTitle icon={FileText} title={s.exportTitle} desc={s.exportDesc} />
            <div className="space-y-3">

              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleExport("csv")} data-testid="export-csv-btn"
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl btn-primary text-white text-sm font-bold flex-1 justify-center">
                  <Download size={15} /> {s.downloadCSV}
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleExport("json")} data-testid="export-json-btn"
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl glass border-white/60 text-slate-700 text-sm font-bold flex-1 justify-center hover:bg-white/50 transition-all">
                  <Download size={15} /> {s.downloadJSON}
                </motion.button>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.2)", background: "rgba(254,242,242,0.5)" }}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.1)" }}>
                    <FileText size={15} style={{ color: "#dc2626" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">Reporte Visual PDF</p>
                    <p className="text-xs text-slate-400">Todas las reservas agrupadas por estado con detalles y montos</p>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(220,38,38,0.28)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExportPDF}
                    disabled={pdfLoading}
                    data-testid="export-pdf-btn"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                    style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}>
                    {pdfLoading
                      ? <><Loader2 size={15} className="animate-spin" /> Generando PDF...</>
                      : <><FileText size={15} /> Exportar reporte PDF — todas las reservas</>}
                  </motion.button>
                </div>
              </div>

            </div>
          </Card>
        </motion.div>

        {/* ── CAMBIAR CONEXIÓN ── */}
        <motion.div variants={item}>
          <Card>
            <SectionTitle icon={Wifi} title="Cambiar conexión MongoDB" desc="Conecta a otra base de datos local o en la nube" />
            <div className="space-y-3">
              <input type="text" value={newDbUrl}
                onChange={e => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                placeholder="mongodb://usuario:contraseña@host:27017"
                data-testid="db-url-input"
                className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              {dbTestResult && (
                <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${dbTestResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {dbTestResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {dbTestResult.msg}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDbTest} disabled={!newDbUrl.trim() || dbTesting}
                  data-testid="db-test-btn"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl glass border-white/60 text-slate-700 text-xs font-bold hover:bg-white/50 transition-all disabled:opacity-40">
                  {dbTesting ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                  {s.dbTest}
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDbConnect} disabled={!newDbUrl.trim() || dbConnecting}
                  data-testid="db-connect-btn"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl btn-primary text-white text-xs font-bold disabled:opacity-40">
                  {dbConnecting ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
                  {s.dbConnect}
                </motion.button>
                {dbStats?.is_custom && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDbReset} disabled={dbResetting}
                    data-testid="db-reset-btn"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-40">
                    {dbResetting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {s.dbReset}
                  </motion.button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── BORRAR DATOS ── */}
        <motion.div variants={item}>
          <Card>
            <SectionTitle icon={Trash2} title="Eliminar todos los datos" desc="Borra reservas y socios. Se crea respaldo automático primero." />
            {!showClearConfirm ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowClearConfirm(true)}
                data-testid="clear-all-data-btn"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-600 transition-all"
                style={{ background: "#fef2f2", border: "1.5px dashed #fca5a5" }}>
                <Trash2 size={14} />
                Borrar todos los datos
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid #fca5a5", background: "#fff5f5" }}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-red-700">¿Borrar todos los datos?</p>
                    <p className="text-xs text-red-500 mt-1">Se eliminarán TODAS las reservas y socios. Se creará un respaldo automático primero.</p>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleClearAll} disabled={clearLoading}
                    data-testid="clear-all-confirm-btn"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
                    {clearLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Sí, borrar todo
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowClearConfirm(false)}
                    data-testid="clear-all-cancel-btn"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all">
                    Cancelar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
