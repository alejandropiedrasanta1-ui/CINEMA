import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Download, Globe, DollarSign,
  Bell, BellRing, Database, CheckCircle, XCircle, RefreshCw,
  Wifi, WifiOff, MessageCircle, Mail, Loader2, Monitor,
  Package, AlertCircle, Zap, Clock, ChevronDown, ShieldCheck,
} from "lucide-react";
import { useSettings, CURRENCIES } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { api, getAppSettings, updateAppSettings, getDbStats, testDbConnection, switchDatabase, resetDatabase, sendTestReminder, getReservations, getBackupHistory, createServerBackup, deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup } from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Section({ icon: Icon, title, desc, children, badge }) {
  return (
    <motion.div variants={item} className="glass rounded-3xl p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center">
            <Icon size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{title}</h2>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </motion.div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white/60 rounded-2xl p-3 text-center">
      <div className="text-base font-black text-slate-800" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{value}</div>
      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{label}</div>
    </div>
  );
}

// WhatsApp link generator
function buildWhatsappLink(phone, events) {
  const clean = (phone || "").replace(/\D/g, "");
  if (!clean) return null;
  const text = events && events.length > 0
    ? `Hola! Recordatorio de Cinema Productions:\n${events.map(e => `• ${e.client_name} — ${e.event_type} el ${e.event_date}`).join("\n")}`
    : "Hola! Recordatorio de Cinema Productions: Tienes eventos próximos.";
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export default function Settings() {
  const { language, currency, tr, changeLanguage, changeCurrency } = useSettings();
  const { requestPermission, showNotification, startPolling } = useNotifications();
  const { toast } = useToast();
  const s = tr.settings;

  // Notification + Business settings state
  const [notif, setNotif] = useState({    reminders_enabled: false,
    reminder_periods: [3],
    reminder_time: "09:00",
    reminder_hours_before: 0,
    admin_email: "",
    admin_whatsapp: "",
    notification_channel: "email",
    resend_api_key: "",
    telegram_enabled: false,
    telegram_bot_token: "",
    telegram_chat_id: "",
    ntfy_enabled: false,
    ntfy_topic: "",
    // Business config
    company_name: "",
    company_address: "",
    company_phone: "",
    company_website: "",
    company_tax_id: "",
    timezone: "America/Guatemala",
    default_advance_pct: 30,
    business_hours_start: "08:00",
    business_hours_end: "22:00",
    backup_retention: 10,
    auto_cleanup_months: "",
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [telegramTestLoading, setTelegramTestLoading] = useState(false);
  const [ntfyTestLoading, setNtfyTestLoading] = useState(false);

  // Desktop download state
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [buildStatus, setBuildStatus] = useState({ status: "idle", message: "" });
  const [buildPolling, setBuildPolling] = useState(false);

  // Deployment / hosting state
  const [deployUrl,        setDeployUrl]        = useState("");
  const [healthLoading,    setHealthLoading]     = useState(false);
  const [healthResult,     setHealthResult]      = useState(null);
  const [expandedPlatform, setExpandedPlatform]  = useState(null);

  // DB state
  const [dbStats, setDbStats] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [newDbUrl, setNewDbUrl] = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResetting, setDbResetting] = useState(false);

  // Backup state
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const restoreInputRef = React.useRef(null);

  useEffect(() => {
    getAppSettings().then(data => {
      if (data && Object.keys(data).length > 0) {
        setNotif(prev => ({
          ...prev,
          reminders_enabled: data.reminders_enabled ?? false,
          reminder_periods: data.reminder_periods ?? [data.reminder_days ?? 3],
          reminder_time: data.reminder_time ?? "09:00",
          reminder_hours_before: data.reminder_hours_before ?? 0,
          admin_email: data.admin_email ?? "",
          admin_whatsapp: data.admin_whatsapp ?? "",
          notification_channel: data.notification_channel ?? "email",
          resend_api_key: data.has_resend_key ? "re_" + "•".repeat(20) + "••••" : "",
          telegram_enabled: data.telegram_enabled ?? false,
          telegram_bot_token: data.has_telegram_token ? "•".repeat(8) + "•".repeat(20) + "••••" : "",
          telegram_chat_id: data.telegram_chat_id ?? "",
          ntfy_enabled: data.ntfy_enabled ?? false,
          ntfy_topic: data.ntfy_topic ?? "",
          // Business config
          company_name: data.company_name ?? "",
          company_address: data.company_address ?? "",
          company_phone: data.company_phone ?? "",
          company_website: data.company_website ?? "",
          company_tax_id: data.company_tax_id ?? "",
          timezone: data.timezone ?? "America/Guatemala",
          default_advance_pct: data.default_advance_pct ?? 30,
          business_hours_start: data.business_hours_start ?? "08:00",
          business_hours_end: data.business_hours_end ?? "22:00",
          backup_retention: data.backup_retention ?? 10,
          auto_cleanup_months: data.auto_cleanup_months ?? "",
        }));
      }
    }).catch(() => {});
    loadDbStats();
  }, []);

  // Build status polling
  useEffect(() => {
    if (!buildPolling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/build-status`);
        const data = await res.json();
        setBuildStatus(data);
        if (data.status === "ready" || data.status === "error") {
          setBuildPolling(false);
          clearInterval(interval);
          if (data.status === "ready") toast({ title: "App actualizada ✓ — Ya puedes descargarla" });
          else toast({ title: data.message || "Error al compilar", variant: "destructive" });
        }
      } catch { /* ignore network errors during polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [buildPolling]);

  const handleRebuild = async () => {
    setBuildStatus({ status: "building", message: "Iniciando compilación…" });
    setBuildPolling(false);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/rebuild`, { method: "POST" });
      const data = await res.json();
      setBuildStatus(data);
      if (data.status === "building") {
        setBuildPolling(true);
        toast({ title: "Compilando app… espera 1-3 minutos" });
      }
    } catch {
      setBuildStatus({ status: "error", message: "Error al iniciar compilación" });
      toast({ title: "Error al iniciar compilación", variant: "destructive" });
    }
  };

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats()
      .then(setDbStats)
      .catch(() => setDbStats(null))
      .finally(() => setDbLoading(false));
  };

  // ── Backup handlers ─────────────────────────────────────────
  const loadBackupHistory = () => {
    getBackupHistory()
      .then(setBackupHistory)
      .catch(() => setBackupHistory([]));
  };

  const handleDownloadBackup = () => {
    const url = downloadBackupUrl();
    const a = document.createElement("a");
    a.href = url;
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
      toast({ title: res.message || "Respaldo guardado en servidor" });
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
      loadBackupHistory();
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
      toast({ title: "Error al eliminar respaldo", variant: "destructive" });
    }
  };

  const handleDownloadPackage = async () => {
    setDownloadLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar el paquete");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinema-productions-local.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Paquete descargado ✓ — Extrae el .zip y ejecuta start.bat" });
    } catch (err) {
      toast({ title: err.message || "Error al descargar", variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/reservations?format=${format}`);
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

  const handleSaveNotif = async () => {
    setNotifLoading(true);
    try {
      const payload = { ...notif };
      // If key looks like masked dots, don't send it (keep existing)
      if (payload.resend_api_key && payload.resend_api_key.includes("•")) {
        delete payload.resend_api_key;
      }
      // Convert empty string to null for optional integer fields
      if (payload.auto_cleanup_months === "" || payload.auto_cleanup_months === undefined) {
        payload.auto_cleanup_months = null;
      }
      await updateAppSettings(payload);
      // Persist reminder settings to localStorage so the hook can read them
      localStorage.setItem("cp_reminder_time", notif.reminder_time || "09:00");
      localStorage.setItem("cp_reminder_days", String(notif.reminder_days || 3));
      // Restart notification polling if reminders are enabled
      if (Notification.permission === "granted" && notif.reminders_enabled) {
        startPolling();
      }
      toast({ title: s.notifSaved + " ✓" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestReminder = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await sendTestReminder();
      const msg = res.message || s.notifTestSent;
      setTestResult({ ok: true, msg, events: res.events_found });
      toast({ title: msg });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Error al enviar";
      setTestResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTelegramTest = async () => {
    setTelegramTestLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/telegram/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) toast({ title: data.message || "Mensaje enviado a Telegram ✓" });
      else toast({ title: data.error || "Error al enviar a Telegram", variant: "destructive" });
    } catch (e) {
      toast({ title: e.message || "Error al enviar a Telegram", variant: "destructive" });
    } finally {
      setTelegramTestLoading(false);
    }
  };

  const handleNtfyTest = async () => {
    setNtfyTestLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ntfy/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) toast({ title: data.message || "Notificación enviada vía ntfy ✓" });
      else toast({ title: data.error || "Error al enviar ntfy", variant: "destructive" });
    } catch (e) {
      toast({ title: e.message || "Error al enviar ntfy", variant: "destructive" });
    } finally {
      setNtfyTestLoading(false);
    }
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
      toast({ title: msg, variant: "destructive" });
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
      const msg = err.response?.data?.detail || "Error al conectar";
      toast({ title: msg, variant: "destructive" });
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
      const msg = err.response?.data?.detail || "Error al restaurar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDbResetting(false);
    }
  };

  // ── System Notifications ──────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(() =>
    (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
  );
  const [immediateLoading, setImmediateLoading] = useState(false);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: language === "es" ? "Tu navegador no soporta notificaciones" : "Browser does not support notifications", variant: "destructive" });
      return;
    }
    try {
      const result = await requestPermission();
      setNotifPermission(result);
      if (result === "granted") {
        localStorage.setItem("cp_notif_enabled", "true");
        localStorage.setItem("cp_reminder_time", notif.reminder_time || "09:00");
        localStorage.setItem("cp_reminder_days", String(notif.reminder_days || 3));
        toast({ title: language === "es" ? "Notificaciones de escritorio activadas ✓" : "Desktop notifications enabled ✓" });
      } else {
        toast({ title: language === "es" ? "Permiso denegado" : "Permission denied", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al solicitar permiso", variant: "destructive" });
    }
  };

  const handleTestSystemNotif = () => {
    if (Notification.permission !== "granted") return;
    showNotification(
      "Cinema Productions — Prueba ✓",
      language === "es" ? "Las notificaciones de escritorio están funcionando." : "Desktop notifications are working.",
    );
    toast({ title: language === "es" ? "Notificación de prueba enviada ✓" : "Test notification sent ✓" });
  };

  const handleNotifyImmediate = async () => {
    if (Notification.permission !== "granted") {
      toast({ title: language === "es" ? "Primero activa las notificaciones del escritorio" : "Enable desktop notifications first", variant: "destructive" });
      return;
    }
    setImmediateLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/push/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "es" ? `Push enviado a ${data.sent_to} dispositivo(s) ✓` : `Push sent to ${data.sent_to} device(s) ✓` });
      } else {
        toast({ title: "Error al enviar push", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al conectar con el servidor", variant: "destructive" });
    } finally {
      setImmediateLoading(false);
    }
  };

  // ── Clear All Data ───────────────────────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/data/clear-all`, { method: "DELETE" });
      const data = await res.json();
      setShowClearConfirm(false);
      toast({ title: `✓ Datos eliminados — ${data.deleted_reservations} reservas, ${data.deleted_socios} socios` });
    } catch {
      toast({ title: "Error al borrar los datos", variant: "destructive" });
    } finally {
      setClearLoading(false);
    }
  };

  const channels = [
    { value: "email", label: "Email", icon: Mail },
    { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { value: "both", label: language === "es" ? "Ambos" : "Both", icon: Bell },
  ];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{s.title}</h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">{s.subtitle}</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* Language */}
        <Section icon={Globe} title={s.langTitle} desc={s.langDesc}>
          <div className="flex gap-3">
            {[{ code: "es", flag: "🇬🇹", label: "Español" }, { code: "en", flag: "🇺🇸", label: "English" }].map(l => (
              <motion.button key={l.code} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => changeLanguage(l.code)} data-testid={`lang-${l.code}`}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all flex-1 justify-center ${language === l.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"}`}>
                <span className="text-base">{l.flag}</span> {l.label}
                {language === l.code && <span className="text-[10px] opacity-70 ml-1">✓</span>}
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Currency */}
        <Section icon={DollarSign} title={s.currencyTitle} desc={s.currencyDesc}>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map(c => (
              <motion.button key={c.code} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => changeCurrency(c.code)} data-testid={`currency-${c.code}`}
                className={`flex flex-col items-center py-3 px-2 rounded-2xl text-xs font-bold transition-all ${currency === c.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"}`}>
                <span className="text-base font-black">{c.symbol} {c.code}</span>
                <span className={`text-[10px] mt-0.5 ${currency === c.code ? "text-white/70" : "text-slate-400"}`}>{c.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title={s.notifTitle} desc={s.notifDesc}
          badge={
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${notif.reminders_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
              {notif.reminders_enabled ? "ACTIVO" : "INACTIVO"}
            </span>
          }>
          <div className="space-y-5">

            {/* ── Toggle ── */}
            <div className="flex items-center justify-between bg-white/50 rounded-2xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{s.notifEnabled}</span>
              <button onClick={() => setNotif(p => ({ ...p, reminders_enabled: !p.reminders_enabled }))}
                data-testid="notif-toggle"
                className={`w-11 h-6 rounded-full transition-all relative ${notif.reminders_enabled ? "btn-primary" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notif.reminders_enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {/* ── Cuándo recordar ── */}
            <div className="space-y-3 bg-white/30 rounded-2xl p-4">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                {language === "es" ? "¿Cuándo recordar?" : "When to remind?"}
              </p>

              {/* Múltiples períodos */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                  {language === "es" ? "Días de anticipación (puedes elegir varios)" : "Days before event (multiple allowed)"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { d: 7, label: "7 días" }, { d: 3, label: "3 días" },
                    { d: 2, label: "2 días" }, { d: 1, label: "1 día" },
                    { d: 0, label: "Mismo día" },
                  ].map(({ d, label }) => {
                    const active = (notif.reminder_periods || [3]).includes(d);
                    return (
                      <button
                        key={d}
                        data-testid={`period-btn-${d}`}
                        onClick={() => {
                          const cur = notif.reminder_periods || [3];
                          const next = active ? cur.filter(x => x !== d) : [...cur, d];
                          setNotif(p => ({ ...p, reminder_periods: next.length ? next : [d] }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${active ? "btn-primary text-white shadow-sm" : "bg-white/70 text-slate-500 border border-slate-200 hover:border-indigo-300"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horas antes (para eventos con horario definido) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                    <Clock size={11} />
                    {language === "es" ? "Horas antes del evento" : "Hours before event"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={12} step={1} value={notif.reminder_hours_before || 0}
                      onChange={e => setNotif(p => ({ ...p, reminder_hours_before: parseInt(e.target.value) }))}
                      data-testid="notif-hours-slider"
                      className="flex-1 accent-indigo-500" />
                    <span className="text-sm font-black text-slate-800 w-14 text-center bg-white/60 rounded-xl py-1">
                      {notif.reminder_hours_before > 0 ? `${notif.reminder_hours_before}h` : "Off"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {notif.reminder_hours_before > 0
                      ? `Aviso ${notif.reminder_hours_before}h antes del evento (requiere hora en la reserva)`
                      : "Desactivado — actívalo para avisar horas antes"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                    <Clock size={11} />
                    {language === "es" ? "Hora de aviso diario" : "Daily reminder time"}
                  </label>
                  <input type="time" value={notif.reminder_time || "09:00"}
                    onChange={e => setNotif(p => ({ ...p, reminder_time: e.target.value }))}
                    data-testid="notif-time-input"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <p className="text-[10px] text-slate-400 mt-1">Notificación diaria a esta hora</p>
                </div>
              </div>
            </div>

            {/* ── Canales de notificación ── */}
            <div className="space-y-3">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                {language === "es" ? "Canales de notificación" : "Notification channels"}
              </p>

              {/* Email Resend */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-blue-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Email — Resend</p>
                    <p className="text-[10px] text-slate-400">Gratis hasta 3,000 emails/mes</p>
                  </div>
                  {notif.resend_api_key && notif.resend_api_key.includes("•") && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ACTIVO</span>
                  )}
                </div>
                <input type="email" value={notif.admin_email}
                  onChange={e => setNotif(p => ({ ...p, admin_email: e.target.value }))}
                  placeholder="tu@email.com"
                  data-testid="notif-email-input"
                  className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <div>
                  <input type="password" value={notif.resend_api_key}
                    onChange={e => setNotif(p => ({ ...p, resend_api_key: e.target.value }))}
                    placeholder="re_xxxxx (clave API de resend.com)"
                    data-testid="notif-resend-key-input"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gratis en <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-indigo-500 underline">resend.com</a>
                  </p>
                </div>
              </div>

              {/* Telegram */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-sky-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                    <MessageCircle size={14} className="text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Telegram Bot</p>
                    <p className="text-[10px] text-slate-400">100% gratis, ilimitado — mensajes instantáneos</p>
                  </div>
                  <button
                    data-testid="telegram-toggle"
                    onClick={() => setNotif(p => ({ ...p, telegram_enabled: !p.telegram_enabled }))}
                    className={`w-9 h-5 rounded-full transition-all relative ${notif.telegram_enabled ? "bg-sky-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.telegram_enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {notif.telegram_enabled && (
                  <div className="space-y-2">
                    {/* Setup guide */}
                    <div className="bg-sky-50/80 rounded-xl p-3 text-[10px] text-sky-700 space-y-1">
                      <p className="font-black uppercase tracking-wide">Cómo configurarlo (3 pasos):</p>
                      <p>1. En Telegram busca <b>@BotFather</b> → escribe <b>/newbot</b> → obtén el <b>token</b></p>
                      <p>2. Abre tu bot nuevo → escribe cualquier mensaje para activarlo</p>
                      <p>3. Abre este link para obtener tu Chat ID:
                        <br /><code className="bg-white/60 px-1 rounded">https://api.telegram.org/bot{"<TOKEN>"}/getUpdates</code>
                        <br />Busca el número en "id" dentro de "chat"
                      </p>
                    </div>
                    <input type="password" value={notif.telegram_bot_token}
                      onChange={e => setNotif(p => ({ ...p, telegram_bot_token: e.target.value }))}
                      placeholder="1234567890:AAFxxxxxxxxxxxxxxxx (token del bot)"
                      data-testid="telegram-token-input"
                      className="w-full bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    <div className="flex gap-2">
                      <input type="text" value={notif.telegram_chat_id}
                        onChange={e => setNotif(p => ({ ...p, telegram_chat_id: e.target.value }))}
                        placeholder="Chat ID (ej: 123456789)"
                        data-testid="telegram-chatid-input"
                        className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleTelegramTest} disabled={telegramTestLoading}
                        data-testid="telegram-test-btn"
                        className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap">
                        {telegramTestLoading ? <Loader2 size={12} className="animate-spin" /> : "Probar"}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* ntfy.sh */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-orange-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Bell size={14} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">ntfy.sh — Push al celular/PC</p>
                    <p className="text-[10px] text-slate-400">Gratis, sin cuenta — app para iOS, Android, Windows</p>
                  </div>
                  <button
                    data-testid="ntfy-toggle"
                    onClick={() => setNotif(p => ({ ...p, ntfy_enabled: !p.ntfy_enabled }))}
                    className={`w-9 h-5 rounded-full transition-all relative ${notif.ntfy_enabled ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.ntfy_enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {notif.ntfy_enabled && (
                  <div className="space-y-2">
                    <div className="bg-orange-50/80 rounded-xl p-3 text-[10px] text-orange-700 space-y-1">
                      <p className="font-black uppercase tracking-wide">Cómo configurarlo (2 pasos):</p>
                      <p>1. Instala la app <b>ntfy</b> en tu celular (iOS / Android) o PC — es gratis</p>
                      <p>2. Escribe un nombre único para tu tema (ej: <b>cinema-alex-2024</b>) y suscríbete desde la app</p>
                      <p>Luego ingresa ese mismo nombre aquí. <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="underline font-bold">ntfy.sh</a></p>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={notif.ntfy_topic}
                        onChange={e => setNotif(p => ({ ...p, ntfy_topic: e.target.value }))}
                        placeholder="cinema-alex-2024 (tu tema único)"
                        data-testid="ntfy-topic-input"
                        className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleNtfyTest} disabled={ntfyTestLoading}
                        data-testid="ntfy-test-btn"
                        className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap">
                        {ntfyTestLoading ? <Loader2 size={12} className="animate-spin" /> : "Probar"}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* Browser Push */}
              <div className="rounded-2xl overflow-hidden border border-slate-200/60 bg-white/40">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${notifPermission === "granted" ? "bg-emerald-100" : notifPermission === "denied" ? "bg-red-50" : "bg-slate-100"}`}>
                    <Monitor size={14} className={notifPermission === "granted" ? "text-emerald-600" : notifPermission === "denied" ? "text-red-500" : "text-slate-400"} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Notificaciones del navegador</p>
                    <p className="text-[10px] text-slate-400">Pop-up en Windows / macOS — gratis</p>
                  </div>
                  <span data-testid="system-notif-status"
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full ${notifPermission === "granted" ? "bg-emerald-100 text-emerald-700" : notifPermission === "denied" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>
                    {notifPermission === "granted" ? "ACTIVO" : notifPermission === "denied" ? "BLOQUEADO" : "INACTIVO"}
                  </span>
                </div>
                <div className="px-4 pb-3">
                  {notifPermission === "denied" ? (
                    <p className="text-[10px] text-red-500 font-medium">
                      Permiso denegado. Ve a Configuración del navegador → Privacidad → Notificaciones y permite este sitio.
                    </p>
                  ) : notifPermission === "granted" ? (
                    <div className="flex gap-2">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleNotifyImmediate} disabled={immediateLoading}
                        data-testid="system-notif-immediate-btn"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-60">
                        {immediateLoading ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
                        Notificar evento próximo
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleTestSystemNotif}
                        data-testid="system-notif-test-btn"
                        className="px-3 py-2 rounded-xl glass text-slate-700 text-xs font-bold hover:bg-white/50 border border-white/60">
                        Probar
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleRequestPermission}
                      data-testid="system-notif-enable-btn"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-white text-xs font-bold">
                      <BellRing size={13} /> Activar notificaciones del navegador
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* ── WhatsApp manual ── */}
            {(notif.notification_channel === "whatsapp" || notif.notification_channel === "both") && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifWhatsapp}</label>
                <div className="flex gap-2">
                  <input type="tel" value={notif.admin_whatsapp}
                    onChange={e => setNotif(p => ({ ...p, admin_whatsapp: e.target.value }))}
                    placeholder="+502 1234 5678"
                    data-testid="notif-whatsapp-input"
                    className="flex-1 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  {notif.admin_whatsapp && (
                    <a href={buildWhatsappLink(notif.admin_whatsapp, [])} target="_blank" rel="noreferrer"
                      data-testid="whatsapp-open-btn"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                      <MessageCircle size={14} /> {s.notifWhatsappOpen}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {testResult.msg}
              </div>
            )}

            {/* ── Buttons ── */}
            <div className="flex gap-3 pt-1">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleSaveNotif} disabled={notifLoading}
                data-testid="notif-save-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl btn-primary text-white text-sm font-bold flex-1 justify-center disabled:opacity-60">
                {notifLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {s.notifSave}
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleTestReminder} disabled={testLoading}
                data-testid="notif-test-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl glass border-white/60 text-slate-700 text-sm font-bold hover:bg-white/50 transition-all disabled:opacity-60">
                {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Enviar a todos los canales
              </motion.button>
            </div>

          </div>
        </Section>

        {/* Database — moved to dedicated page */}
        <Link to="/base-de-datos"
          className="flex items-center gap-4 glass rounded-3xl p-5 hover:bg-white/40 transition-all group no-underline">
          <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center text-white shrink-0">
            <Database size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {language === "es" ? "Base de Datos y Exportar" : "Database & Export"}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {language === "es" ? "Respaldos, exportar CSV/JSON/PDF, conexión MongoDB" : "Backups, export CSV/JSON/PDF, MongoDB connection"}
            </p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* ── CONFIGURACIÓN DEL NEGOCIO ── */}
        <Section icon={ShieldCheck} title={language === "es" ? "Configuración del Negocio" : "Business Configuration"}
          desc={language === "es" ? "Datos de empresa, horarios, anticipo por defecto" : "Company data, hours, default advance"}>
          <div className="space-y-4">

            {/* Company details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "company_name",    label: language === "es" ? "Nombre de empresa" : "Company name",     type: "text",  placeholder: "Cinema Productions" },
                { key: "company_phone",   label: language === "es" ? "Teléfono empresa"  : "Business phone",   type: "tel",   placeholder: "+502 1234-5678" },
                { key: "company_address", label: language === "es" ? "Dirección"          : "Address",          type: "text",  placeholder: "Ciudad de Guatemala, GT" },
                { key: "company_website", label: language === "es" ? "Sitio web"          : "Website",          type: "url",   placeholder: "https://cinema.gt" },
                { key: "company_tax_id",  label: language === "es" ? "NIT / RFC / ID Fiscal" : "Tax ID",        type: "text",  placeholder: "12345678-9" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} className={key === "company_address" ? "col-span-2" : ""}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">{label}</label>
                  <input type={type} value={notif[key] || ""}
                    onChange={e => setNotif(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder} data-testid={`biz-${key}`}
                    className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30" />
                </div>
              ))}
            </div>

            <div className="border-t border-white/40 pt-3 grid grid-cols-2 gap-3">
              {/* Timezone */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">
                  {language === "es" ? "Zona horaria" : "Timezone"}
                </label>
                <select value={notif.timezone || "America/Guatemala"}
                  onChange={e => setNotif(prev => ({ ...prev, timezone: e.target.value }))}
                  data-testid="biz-timezone"
                  className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30">
                  {[
                    { v: "America/Guatemala",  l: "Guatemala (UTC-6)" },
                    { v: "America/Mexico_City",l: "México Centro (UTC-6)" },
                    { v: "America/Bogota",     l: "Colombia (UTC-5)" },
                    { v: "America/Lima",       l: "Perú (UTC-5)" },
                    { v: "America/Santiago",   l: "Chile (UTC-4/-3)" },
                    { v: "America/Buenos_Aires",l: "Argentina (UTC-3)" },
                    { v: "America/New_York",   l: "New York (UTC-5/-4)" },
                    { v: "Europe/Madrid",      l: "España (UTC+1/+2)" },
                  ].map(tz => <option key={tz.v} value={tz.v}>{tz.l}</option>)}
                </select>
              </div>

              {/* Default advance % */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">
                  {language === "es" ? "Anticipo por defecto (%)" : "Default Advance (%)"}
                </label>
                <div className="relative">
                  <input type="number" min="0" max="100"
                    value={notif.default_advance_pct ?? 30}
                    onChange={e => setNotif(prev => ({ ...prev, default_advance_pct: parseInt(e.target.value) || 0 }))}
                    data-testid="biz-advance-pct"
                    className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 pr-10" />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Business hours */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                {language === "es" ? "Horario de atención" : "Business Hours"}
              </p>
              <div className="flex items-center gap-3">
                <input type="time" value={notif.business_hours_start || "08:00"}
                  onChange={e => setNotif(prev => ({ ...prev, business_hours_start: e.target.value }))}
                  data-testid="biz-hours-start"
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30" />
                <span className="text-slate-400 font-bold text-sm">→</span>
                <input type="time" value={notif.business_hours_end || "22:00"}
                  onChange={e => setNotif(prev => ({ ...prev, business_hours_end: e.target.value }))}
                  data-testid="biz-hours-end"
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30" />
              </div>
            </div>

            {/* Backup & cleanup settings */}
            <div className="border-t border-white/40 pt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">
                  {language === "es" ? "Respaldos a conservar" : "Backups to keep"}
                </label>
                <select value={notif.backup_retention ?? 10}
                  onChange={e => setNotif(prev => ({ ...prev, backup_retention: parseInt(e.target.value) }))}
                  data-testid="biz-backup-retention"
                  className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30">
                  {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n} {language === "es" ? "respaldos" : "backups"}</option>)}
                  <option value={9999}>{language === "es" ? "Ilimitado" : "Unlimited"}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">
                  {language === "es" ? "Auto-limpiar canceladas (meses)" : "Auto-clean cancelled (months)"}
                </label>
                <select value={notif.auto_cleanup_months || ""}
                  onChange={e => setNotif(prev => ({ ...prev, auto_cleanup_months: e.target.value ? parseInt(e.target.value) : null }))}
                  data-testid="biz-auto-cleanup"
                  className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30">
                  <option value="">{language === "es" ? "Desactivado" : "Disabled"}</option>
                  {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} {language === "es" ? "mes(es)" : "month(s)"}</option>)}
                </select>
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleSaveNotif} disabled={notifLoading} data-testid="biz-save-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl btn-primary text-white text-sm font-bold disabled:opacity-60">
              {notifLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {language === "es" ? "Guardar configuración del negocio" : "Save business configuration"}
            </motion.button>
          </div>
        </Section>

        {/* Desktop App */}
        <Section icon={Monitor} title={s.desktopTitle} desc={s.desktopDesc}
          badge={
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
              {s.desktopBadge}
            </span>
          }>
          <div className="space-y-5">
            {/* Feature list */}
            <div className="grid grid-cols-2 gap-2">
              {[s.desktopFeature1, s.desktopFeature2, s.desktopFeature3, s.desktopFeature4].map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/50 rounded-xl p-3">
                  <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-slate-600 font-medium">{f}</span>
                </div>
              ))}
            </div>

            {/* Python requirement */}
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/60 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">
                {s.desktopReq} —{" "}
                <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer" className="underline hover:text-amber-900">
                  {s.desktopReqLink}
                </a>
                {" "}(marcar "Add Python to PATH")
              </p>
            </div>

            {/* ── UPDATE + DOWNLOAD ── */}
            <div className="rounded-2xl overflow-hidden border border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 to-white/60">
              <div className="px-4 pt-4 pb-3 border-b border-indigo-100/60">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-full btn-primary flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">1</div>
                  <p className="text-xs font-bold text-slate-700">{language === "es" ? "Actualizar app con últimos cambios" : "Update app"}</p>
                </div>
                {buildStatus.status !== "idle" && (
                  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-medium ${buildStatus.status === "building" ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60" : buildStatus.status === "ready" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                    {buildStatus.status === "building" ? <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" /> : buildStatus.status === "ready" ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                    <span>{buildStatus.message}</span>
                  </div>
                )}
                <motion.button whileHover={{ scale: buildStatus.status === "building" ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRebuild} disabled={buildStatus.status === "building"} data-testid="desktop-rebuild-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: buildStatus.status === "ready" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,var(--t-from),var(--t-to))" }}>
                  {buildStatus.status === "building" ? <><Loader2 size={14} className="animate-spin" /> {language === "es" ? "Actualizando…" : "Updating…"}</> : buildStatus.status === "ready" ? <><CheckCircle size={14} /> {language === "es" ? "App actualizada ✓" : "Updated ✓"}</> : <><RefreshCw size={14} /> {language === "es" ? "Actualizar App" : "Update App"}</>}
                </motion.button>
              </div>
              <div className="px-4 pt-3 pb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${buildStatus.status === "ready" ? "btn-primary" : "bg-slate-300"}`}>2</div>
                  <p className={`text-xs font-bold ${buildStatus.status === "ready" ? "text-slate-700" : "text-slate-400"}`}>{language === "es" ? "Descargar app (.zip)" : "Download app (.zip)"}</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadPackage} disabled={downloadLoading || buildStatus.status === "building"} data-testid="desktop-download-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: buildStatus.status === "ready" ? "linear-gradient(135deg,var(--t-from),var(--t-to))" : "#e2e8f0", color: buildStatus.status === "ready" ? "white" : "#94a3b8" }}>
                  {downloadLoading ? <><Loader2 size={14} className="animate-spin" /> {s.desktopDownloading}</> : <><Package size={14} /> {s.desktopDownload}</>}
                </motion.button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">{s.desktopNote}</p>
          </div>
        </Section>

        {/* ── PUBLICAR EN LÍNEA ── */}
        <Section icon={Globe} title={language === "es" ? "Publicar en Línea" : "Publish Online"}
          desc={language === "es" ? "Despliega tu app en hosting externo para acceder desde cualquier lugar" : "Deploy to external hosting for anywhere access"}>
          <div className="space-y-4">

            {/* Platform cards */}
            {[
              {
                id: "hostinger",
                name: "Hostinger VPS",
                icon: "🟠",
                badge: "Recomendado",
                badgeColor: "bg-orange-100 text-orange-700",
                desc: language === "es" ? "VPS Linux con Docker — máximo control" : "Linux VPS with Docker — full control",
                steps: [
                  "Contrata plan VPS KVM1 o superior en hostinger.com",
                  "Conecta por SSH: ssh root@tu-ip-servidor",
                  "Instala Docker: curl -fsSL https://get.docker.com | sh",
                  "Sube tu proyecto: scp -r ./cinema-app root@tu-ip:/opt/cinema",
                  "Copia .env y edita las variables de entorno",
                  "Ejecuta: docker-compose up -d",
                  "Configura dominio en hPanel → DNS → A record → tu-ip",
                  "¡Listo! Accede en https://tudominio.com",
                ],
              },
              {
                id: "railway",
                name: "Railway.app",
                icon: "🟣",
                badge: "Más fácil",
                badgeColor: "bg-purple-100 text-purple-700",
                desc: language === "es" ? "Deploy con GitHub en 1 clic — gratis hasta $5/mes" : "GitHub 1-click deploy — free up to $5/mo",
                steps: [
                  "Crea cuenta en railway.app",
                  "Nuevo proyecto → Deploy from GitHub",
                  "Conecta tu repositorio de GitHub",
                  "Railway detecta Python/Node automáticamente",
                  "Ve a Variables → copia el contenido de .env.template",
                  "Clic en Deploy → Railway despliega automáticamente",
                  "Ajustes → Domain → Generate Domain (gratis *.up.railway.app)",
                  "¡En 5 minutos tu app está en línea!",
                ],
                link: "https://railway.app",
              },
              {
                id: "render",
                name: "Render.com",
                icon: "🔵",
                badge: "Gratis",
                badgeColor: "bg-blue-100 text-blue-700",
                desc: language === "es" ? "Tier gratis para proyectos personales" : "Free tier for personal projects",
                steps: [
                  "Crea cuenta en render.com",
                  "New → Web Service → conecta GitHub",
                  "Para el backend: Build Command: pip install -r backend/requirements.txt",
                  "Start Command: uvicorn backend.server:app --host 0.0.0.0 --port $PORT",
                  "Para el frontend: Static Site → Build: cd frontend && npm run build",
                  "Agrega variables de entorno (Environment tab)",
                  "Render asigna URL *.onrender.com automáticamente",
                  "Nota: en tier gratis el servicio 'duerme' después de 15 min inactividad",
                ],
                link: "https://render.com",
              },
              {
                id: "digitalocean",
                name: "DigitalOcean",
                icon: "🔹",
                badge: "$4/mes",
                badgeColor: "bg-sky-100 text-sky-700",
                desc: language === "es" ? "Droplet + App Platform — muy confiable" : "Droplet + App Platform — very reliable",
                steps: [
                  "Crea una cuenta en digitalocean.com ($200 crédito gratis para nuevos)",
                  "App Platform → Create App → GitHub source",
                  "Detecta automáticamente Python y Node.js",
                  "Configura variables de entorno en Settings",
                  "Asigna dominio personalizado o usa *.ondigitalocean.app",
                  "Escala fácilmente con Managed MongoDB Database si necesitas",
                ],
                link: "https://digitalocean.com",
              },
            ].map((platform) => (
              <div key={platform.id} className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white/40">
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/60 transition-colors"
                  data-testid={`platform-${platform.id}`}
                  onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}>
                  <span className="text-xl">{platform.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-800">{platform.name}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${platform.badgeColor}`}>{platform.badge}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{platform.desc}</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedPlatform === platform.id ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {expandedPlatform === platform.id && (
                    <motion.div key="steps" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200/60 px-4 py-3 bg-slate-50/40 overflow-hidden">
                      <ol className="space-y-2">
                        {platform.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {platform.link && (
                        <a href={platform.link} target="_blank" rel="noreferrer"
                          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                          <Globe size={11} /> Abrir {platform.name} →
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Download deployment files */}
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/50 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivos de despliegue</p>
              <div className="grid grid-cols-2 gap-2.5">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  data-testid="download-env-btn"
                  onClick={async () => {
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/env-template`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = ".env.template";
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: ".env.template descargado ✓" });
                    } catch { toast({ title: "Error al descargar", variant: "destructive" }); }
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/70 border border-slate-200/70 hover:bg-white text-xs font-bold text-slate-700 transition-all">
                  <Download size={14} className="text-emerald-500" />
                  <span>.env Template</span>
                  <span className="text-[9px] text-slate-400">Variables de entorno</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  data-testid="download-docker-btn"
                  onClick={async () => {
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/docker-compose`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "docker-compose.yml";
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: "docker-compose.yml descargado ✓" });
                    } catch { toast({ title: "Error al descargar", variant: "destructive" }); }
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/70 border border-slate-200/70 hover:bg-white text-xs font-bold text-slate-700 transition-all">
                  <Package size={14} className="text-blue-500" />
                  <span>docker-compose</span>
                  <span className="text-[9px] text-slate-400">Config de containers</span>
                </motion.button>
              </div>
            </div>

            {/* Health check */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verificar despliegue</p>
              <div className="flex gap-2">
                <input type="url" value={deployUrl} onChange={e => { setDeployUrl(e.target.value); setHealthResult(null); }}
                  placeholder="https://tudominio.com"
                  data-testid="deploy-url-input"
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  data-testid="health-check-btn"
                  disabled={!deployUrl || healthLoading}
                  onClick={async () => {
                    setHealthLoading(true); setHealthResult(null);
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/health-check?url=${encodeURIComponent(deployUrl)}`, { method: "POST" });
                      const data = await res.json();
                      setHealthResult(data);
                    } catch { setHealthResult({ ok: false, error: "Error de conexión" }); }
                    finally { setHealthLoading(false); }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-indigo-600 transition-colors whitespace-nowrap flex items-center gap-1.5">
                  {healthLoading ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                  Verificar
                </motion.button>
              </div>
              {healthResult && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold ${healthResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                  {healthResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {healthResult.message || healthResult.error}
                </motion.div>
              )}
            </div>

            {/* MongoDB Atlas guide */}
            <div className="bg-green-50/60 rounded-2xl p-4 border border-green-200/50 space-y-2.5">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-green-600" />
                <p className="text-xs font-black text-green-800">MongoDB Atlas (Base de datos en la nube — Gratis)</p>
              </div>
              <ol className="space-y-1.5">
                {[
                  "Ve a mongodb.com/cloud/atlas → crear cuenta gratis",
                  "Create Cluster → M0 Free (512 MB gratis para siempre)",
                  "Database Access → Add User (usuario + contraseña segura)",
                  "Network Access → Add IP → 0.0.0.0/0 (acceso desde cualquier lugar)",
                  "Connect → Drivers → copia la URI: mongodb+srv://user:pass@cluster...",
                  "Pega la URI en tu .env como MONGO_URL=mongodb+srv://...",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-green-700">
                    <span className="font-black shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>


      </motion.div>
    </div>
  );
}
