import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download, Globe, DollarSign, Palette, FileText,
  Bell, BellRing, Database, CheckCircle, XCircle, RefreshCw,
  Wifi, WifiOff, MessageCircle, Mail, Loader2, Monitor,
  Package, AlertCircle, Sparkles, Zap, Layers, Clock, Pencil, RotateCcw,
  Upload, ImageIcon, Trash2, Save, ChevronDown,
} from "lucide-react";
import { useSettings, THEMES, CURRENCIES, PRESETS } from "@/context/SettingsContext";
import { getEventConfig, getEventTypeName, AVAILABLE_ICONS, AVAILABLE_COLORS, EVENT_TYPES, ICON_MAP } from "@/lib/eventConfig";
import { useToast } from "@/hooks/use-toast";
import { api, getAppSettings, updateAppSettings, getDbStats, testDbConnection, switchDatabase, resetDatabase, sendTestReminder, getReservations, getBackupHistory, createServerBackup, deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup } from "@/lib/api";
import { generateAllReservationsPDF, PDF_THEMES } from "@/lib/generatePDF";
import { useNotifications } from "@/hooks/useNotifications";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
  const { language, currency, theme, tr, changeLanguage, changeCurrency, changeTheme,
          preset, animations, radius, pdfTheme, changePreset, changeAnimations, changeRadius, changePdfTheme, formatCurrency,
          eventConfigs, updateEventTypeConfig, resetEventTypeConfig,
          logoUrl, pdfLogoUrl, logoSize, usePdfLogo, useCustomPdfLogo, updateLogoSettings } = useSettings();
  const { requestPermission, showNotification, startPolling } = useNotifications();
  const { toast } = useToast();
  const s = tr.settings;

  // Notification settings state
  const [notif, setNotif] = useState({
    reminders_enabled: false,
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

  // ── Logo Branding ────────────────────────────────────────────
  const logoInputRef    = React.useRef();
  const pdfLogoInputRef = React.useRef();

  const compressImage = (file, maxW = 500, maxH = 250, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width  = img.width  * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png", quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      updateLogoSettings({ url: b64 });
    } catch {
      toast({ title: "Error al cargar imagen", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handlePdfLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      updateLogoSettings({ pdfUrl: b64 });
    } catch {
      toast({ title: "Error al cargar imagen", variant: "destructive" });
    }
    e.target.value = "";
  };

  // ── PDF Export ────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Event Type Editor ────────────────────────────────────────
  const [activeEventType, setActiveEventType] = useState(null);
  const [typeNameEdit, setTypeNameEdit] = useState("");

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

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) {
        toast({ title: language === "es" ? "No hay reservas para exportar" : "No reservations to export", variant: "destructive" });
        return;
      }
      const effectiveLogo = usePdfLogo
        ? (useCustomPdfLogo && pdfLogoUrl ? pdfLogoUrl : logoUrl || undefined)
        : null;
      await generateAllReservationsPDF(reservations, formatCurrency, effectiveLogo, pdfTheme);
      toast({ title: language === "es" ? `PDF generado — ${reservations.length} reservas ✓` : `PDF generated — ${reservations.length} reservations ✓` });
    } catch (err) {
      toast({ title: err.message || "Error al generar PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
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

        {/* ── APARIENCIA (Colors + Presets + Animations + Radius) ── */}
        <Section icon={Palette} title={language === "es" ? "Apariencia" : "Appearance"} desc={language === "es" ? "Personaliza colores, diseño y efectos visuales" : "Customize colors, design and visual effects"}>
          <div className="space-y-7">

            {/* 1 ── COLOR ACCENT ───────────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Color de Acento" : "Accent Color"}
              </p>
              <div className="grid grid-cols-6 gap-3">
                {Object.values(THEMES).map(t => (
                  <motion.button key={t.id} whileHover={{ scale: 1.14, y: -2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => changeTheme(t.id)} data-testid={`theme-${t.id}`}
                    className="flex flex-col items-center gap-2" title={t.name}>
                    <div className="w-11 h-11 rounded-full transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                        boxShadow: theme === t.id
                          ? `0 0 0 3px white, 0 0 0 5px ${t.from}, 0 8px 20px ${t.shadow}`
                          : `0 4px 12px ${t.shadow}`,
                        transform: theme === t.id ? "scale(1.15)" : "scale(1)",
                      }} />
                    <span className="text-[10px] font-bold text-slate-500">{t.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* 2 ── DESIGN PRESET ──────────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Diseño de la Aplicación" : "App Design"}
              </p>
              <div className="grid grid-cols-3 gap-3">

                {/* AURORA */}
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changePreset("aurora")}
                  data-testid="preset-aurora"
                  className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
                  style={{
                    border: preset === "aurora" ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)",
                    boxShadow: preset === "aurora" ? `0 0 0 3px var(--t-from)22, 0 8px 24px rgba(0,0,0,0.08)` : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Mini preview */}
                  <div className="relative h-24 w-full overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#eff0ff 0%,#fce7f3 50%,#e0f2fe 100%)" }}>
                    <div className="absolute top-1 left-2" style={{ width:28,height:28,borderRadius:"50%",background:"rgba(167,139,250,0.55)",filter:"blur(9px)" }} />
                    <div className="absolute bottom-2 right-3" style={{ width:22,height:22,borderRadius:"50%",background:"rgba(249,168,212,0.55)",filter:"blur(7px)" }} />
                    <div className="absolute top-3 right-7" style={{ width:16,height:16,borderRadius:"50%",background:"rgba(125,211,252,0.5)",filter:"blur(6px)" }} />
                    {/* Glass card */}
                    <div className="absolute" style={{ inset:"10px 12px 8px 12px",borderRadius:10,background:"rgba(255,255,255,0.4)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.7)" }}>
                      <div style={{ height:4,width:"65%",background:"rgba(99,102,241,0.35)",borderRadius:4,margin:"8px 8px 5px 8px" }} />
                      <div style={{ height:3,width:"45%",background:"rgba(99,102,241,0.18)",borderRadius:4,margin:"0 8px 7px 8px" }} />
                      <div style={{ display:"flex",gap:4,margin:"0 8px" }}>
                        <div style={{ height:13,flex:1,background:"rgba(167,139,250,0.22)",borderRadius:6 }} />
                        <div style={{ height:13,flex:1,background:"rgba(249,168,212,0.22)",borderRadius:6 }} />
                      </div>
                    </div>
                    {preset === "aurora" && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center shadow-sm">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-white/70">
                    <p className="text-[11px] font-black text-slate-800">Glass Aurora</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      {language === "es" ? "Glassmorphismo + blobs" : "Glassmorphism + blobs"}
                    </p>
                  </div>
                </motion.button>

                {/* CRYSTAL */}
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changePreset("crystal")}
                  data-testid="preset-crystal"
                  className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
                  style={{
                    border: preset === "crystal" ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)",
                    boxShadow: preset === "crystal" ? `0 0 0 3px var(--t-from)22, 0 8px 24px rgba(0,0,0,0.08)` : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <div className="relative h-24 w-full overflow-hidden" style={{ background:"#eef2f7" }}>
                    <div className="absolute -top-2 -left-2" style={{ width:50,height:50,borderRadius:"50%",background:"rgba(167,139,250,0.07)",filter:"blur(14px)" }} />
                    {/* Opaque glass card */}
                    <div className="absolute" style={{ inset:"10px 12px 8px 12px",borderRadius:10,background:"rgba(255,255,255,0.9)",backdropFilter:"blur(6px)",border:"1px solid rgba(215,222,232,1)",boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
                      <div style={{ height:4,width:"65%",background:"#e2e8f0",borderRadius:4,margin:"8px 8px 5px 8px" }} />
                      <div style={{ height:3,width:"45%",background:"#f1f5f9",borderRadius:4,margin:"0 8px 7px 8px" }} />
                      <div style={{ display:"flex",gap:4,margin:"0 8px" }}>
                        <div style={{ height:13,flex:1,background:"#f8fafc",borderRadius:6,border:"1px solid #e2e8f0" }} />
                        <div style={{ height:13,flex:1,background:"#f8fafc",borderRadius:6,border:"1px solid #e2e8f0" }} />
                      </div>
                    </div>
                    {preset === "crystal" && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center shadow-sm">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-white/70">
                    <p className="text-[11px] font-black text-slate-800">Crystal</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      {language === "es" ? "Cristal nítido y opaco" : "Sharp opaque glass"}
                    </p>
                  </div>
                </motion.button>

                {/* MINIMAL */}
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changePreset("minimal")}
                  data-testid="preset-minimal"
                  className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
                  style={{
                    border: preset === "minimal" ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)",
                    boxShadow: preset === "minimal" ? `0 0 0 3px var(--t-from)22, 0 8px 24px rgba(0,0,0,0.08)` : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <div className="relative h-24 w-full overflow-hidden" style={{ background:"#f1f5f9" }}>
                    {/* Solid white card */}
                    <div className="absolute" style={{ inset:"10px 12px 8px 12px",borderRadius:6,background:"#ffffff",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                      <div style={{ height:3,width:"100%",background:"linear-gradient(90deg,var(--t-from),var(--t-to))",borderRadius:"6px 6px 0 0" }} />
                      <div style={{ height:3,width:"65%",background:"#cbd5e1",borderRadius:4,margin:"6px 8px 4px 8px" }} />
                      <div style={{ height:3,width:"45%",background:"#e2e8f0",borderRadius:4,margin:"0 8px 7px 8px" }} />
                      <div style={{ display:"flex",gap:4,margin:"0 8px" }}>
                        <div style={{ height:13,flex:1,background:"#f8fafc",borderRadius:3,border:"1px solid #e2e8f0" }} />
                        <div style={{ height:13,flex:1,background:"#f8fafc",borderRadius:3,border:"1px solid #e2e8f0" }} />
                      </div>
                    </div>
                    {preset === "minimal" && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center shadow-sm">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-white/70">
                    <p className="text-[11px] font-black text-slate-800">Minimal</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      {language === "es" ? "Limpio, sin distracciones" : "Clean, no distractions"}
                    </p>
                  </div>
                </motion.button>
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* 3 ── ANIMATIONS TOGGLE ──────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Animaciones" : "Animations"}
              </p>
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="flex items-center justify-between bg-white/50 rounded-2xl px-5 py-3.5 cursor-pointer"
                onClick={() => changeAnimations(!animations)}
                data-testid="animations-toggle-row"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: animations ? "var(--t-from)18" : "#f1f5f9" }}>
                    <Zap size={15} style={{ color: animations ? "var(--t-from)" : "#94a3b8" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {language === "es" ? "Efectos y transiciones" : "Effects & transitions"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === "es"
                        ? animations ? "Activadas — animaciones fluidas en toda la app" : "Desactivadas — modo rápido y minimalista"
                        : animations ? "Enabled — smooth animations throughout" : "Disabled — fast minimal mode"}
                    </p>
                  </div>
                </div>
                <button
                  data-testid="animations-toggle"
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${animations ? "btn-primary" : "bg-slate-200"}`}
                  onClick={(e) => { e.stopPropagation(); changeAnimations(!animations); }}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${animations ? "left-[26px]" : "left-0.5"}`} />
                </button>
              </motion.div>
            </div>

            <div className="border-t border-white/40" />

            {/* 4 ── BORDER RADIUS ──────────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Estilo de Bordes" : "Border Style"}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "rounded", label: language === "es" ? "Suaves" : "Soft", hint: language === "es" ? "Redondeados" : "Rounded", rx: 14 },
                  { id: "medium",  label: language === "es" ? "Medios" : "Medium", hint: language === "es" ? "Intermedios" : "Balanced", rx: 6 },
                  { id: "sharp",   label: language === "es" ? "Rectos" : "Sharp", hint: language === "es" ? "Angulares" : "Angular", rx: 2 },
                ].map(r => (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => changeRadius(r.id)}
                    data-testid={`radius-${r.id}`}
                    className="flex flex-col items-center gap-2.5 py-4 px-3 rounded-2xl transition-all"
                    style={{
                      background: radius === r.id ? "var(--t-from)12" : "rgba(255,255,255,0.5)",
                      border: radius === r.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.7)",
                    }}
                  >
                    <div
                      className="w-10 h-8 border-2 transition-all"
                      style={{
                        borderRadius: r.rx,
                        borderColor: radius === r.id ? "var(--t-from)" : "#cbd5e1",
                        background: radius === r.id ? "var(--t-from)18" : "#f8fafc",
                      }}
                    />
                    <div className="text-center">
                      <p className="text-xs font-black" style={{ color: radius === r.id ? "var(--t-from)" : "#64748b" }}>{r.label}</p>
                      <p className="text-[9px] font-medium text-slate-400 mt-0.5">{r.hint}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* 5 ── EVENT TYPE ICONS & COLORS ──────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Iconos y Colores por Tipo de Evento" : "Event Type Icons & Colors"}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {language === "es"
                  ? "Toca un tipo de evento para cambiar su icono y color. Se aplica en Dashboard, Calendario y Reservaciones."
                  : "Tap an event type to change its icon and color. Applied in Dashboard, Calendar and Reservations."}
              </p>

              {/* Event type cards grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {EVENT_TYPES.map((typeName) => {
                  const cfg = getEventConfig(typeName);
                  const isActive = activeEventType === typeName;
                  return (
                    <motion.button
                      key={typeName}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const next = isActive ? null : typeName;
                        setActiveEventType(next);
                        if (next) setTypeNameEdit(eventConfigs[next]?.name || "");
                      }}
                      data-testid={`event-type-edit-${typeName.replace(/\s+/g, "-").toLowerCase()}`}
                      className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all text-center"
                      style={{
                        background: isActive ? cfg.fg + "18" : cfg.bg || cfg.fg + "10",
                        border: isActive ? `2px solid ${cfg.fg}` : `2px solid ${cfg.border || cfg.fg + "30"}`,
                      }}
                    >
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: cfg.fg }}>
                          <CheckCircle size={9} className="text-white" />
                        </div>
                      )}
                      {eventConfigs[typeName] && !isActive && (
                        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full"
                          style={{ background: cfg.fg }} />
                      )}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{ background: cfg.fg + "1c" }}>
                        <cfg.icon size={20} style={{ color: cfg.fg }} strokeWidth={1.8} />
                      </div>
                      <p className="text-[10px] font-bold leading-tight" style={{ color: cfg.fg }}>
                        {getEventTypeName(typeName)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Pencil size={9} style={{ color: cfg.fg, opacity: 0.6 }} />
                        <span className="text-[9px] font-medium" style={{ color: cfg.fg, opacity: 0.6 }}>
                          {language === "es" ? "editar" : "edit"}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Expanded editor */}
              {activeEventType && (() => {
                const cfg = getEventConfig(activeEventType);
                const customCfg = eventConfigs[activeEventType] || {};
                return (
                  <motion.div
                    key={activeEventType}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-3 rounded-2xl overflow-hidden"
                    style={{ background: cfg.fg + "08", border: `1.5px solid ${cfg.fg}30` }}
                  >
                    {/* Editor header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b"
                      style={{ borderColor: cfg.fg + "20" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: cfg.fg + "1c" }}>
                          <cfg.icon size={15} style={{ color: cfg.fg }} />
                        </div>
                        <p className="text-sm font-black text-slate-800">{typeNameEdit || activeEventType}</p>
                      </div>
                      {eventConfigs[activeEventType] && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => resetEventTypeConfig(activeEventType)}
                          data-testid={`event-type-reset-${activeEventType.replace(/\s+/g, "-").toLowerCase()}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                          style={{ background: "rgba(255,255,255,0.6)" }}
                        >
                          <RotateCcw size={10} />
                          {language === "es" ? "Restaurar" : "Reset"}
                        </motion.button>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Editable name */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          {language === "es" ? "Nombre" : "Name"}
                        </p>
                        <input
                          type="text"
                          value={typeNameEdit}
                          onChange={(e) => {
                            setTypeNameEdit(e.target.value);
                            updateEventTypeConfig(activeEventType, { name: e.target.value || undefined });
                          }}
                          placeholder={activeEventType}
                          data-testid={`event-type-name-input-${activeEventType?.replace(/\s+/g, "-").toLowerCase()}`}
                          className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 placeholder-slate-300"
                          style={{ "--tw-ring-color": cfg.fg + "80" }}
                        />
                      </div>
                      {/* Color palette */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                          {language === "es" ? "Color" : "Color"}
                        </p>
                        <div className="grid grid-cols-10 gap-1.5">
                          {AVAILABLE_COLORS.map(color => {
                            const isSel = (customCfg.fg || cfg.fg) === color;
                            return (
                              <motion.button
                                key={color}
                                whileHover={{ scale: 1.2, y: -1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => updateEventTypeConfig(activeEventType, { fg: color })}
                                data-testid={`color-swatch-${color.replace("#", "")}`}
                                title={color}
                                className="w-full aspect-square rounded-lg transition-all relative"
                                style={{
                                  background: color,
                                  boxShadow: isSel ? `0 0 0 2px white, 0 0 0 4px ${color}` : `0 2px 4px ${color}55`,
                                  transform: isSel ? "scale(1.15)" : undefined,
                                }}
                              >
                                {isSel && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <CheckCircle size={10} className="text-white drop-shadow" />
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Icon picker */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                          {language === "es" ? "Icono" : "Icon"}
                        </p>
                        <div className="grid grid-cols-9 gap-1.5">
                          {AVAILABLE_ICONS.map(({ name, component: IconComp }) => {
                            const isSel = (customCfg.iconName || cfg.iconName) === name;
                            return (
                              <motion.button
                                key={name}
                                whileHover={{ scale: 1.15, y: -1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => updateEventTypeConfig(activeEventType, { iconName: name })}
                                data-testid={`icon-pick-${name.toLowerCase()}`}
                                title={name}
                                className="w-full aspect-square rounded-xl flex items-center justify-center transition-all"
                                style={{
                                  background: isSel ? cfg.fg : "rgba(255,255,255,0.6)",
                                  border: isSel ? `2px solid ${cfg.fg}` : "2px solid rgba(226,232,240,0.7)",
                                  boxShadow: isSel ? `0 4px 12px ${cfg.fg}44` : undefined,
                                }}
                              >
                                <IconComp
                                  size={15}
                                  style={{ color: isSel ? "white" : "#64748b" }}
                                  strokeWidth={1.8}
                                />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            <div className="border-t border-white/40" />

            {/* 6 ── PDF THEME ──────────────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {language === "es" ? "Diseño de PDF" : "PDF Design"}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {language === "es" ? "Elige el estilo visual de todos los PDFs generados." : "Choose the visual style for all generated PDFs."}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {Object.values(PDF_THEMES).map((theme) => {
                  const isActive = pdfTheme === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => changePdfTheme(theme.id)}
                      data-testid={`pdf-theme-${theme.id}`}
                      className="flex flex-col rounded-2xl overflow-hidden transition-all"
                      style={{ border: isActive ? `2px solid var(--t-from)` : "2px solid rgba(226,232,240,0.7)" }}
                    >
                      {/* Mini preview */}
                      <div className="h-20 relative overflow-hidden" style={{ background: theme.preview.headerBg }}>
                        {/* accent bar */}
                        {theme.id === "claro" && (
                          <div className="absolute top-0 left-0 right-0 h-2" style={{ background: theme.preview.accentBar }} />
                        )}
                        {theme.id === "elegante" && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: theme.preview.accentBar }} />
                        )}
                        {theme.id === "oscuro" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.preview.accentBar }} />
                        )}
                        {/* fake logo rect */}
                        <div className="absolute left-2 top-3 w-8 h-5 rounded opacity-30 bg-white" />
                        {/* fake title lines */}
                        <div className="absolute right-2 top-3 space-y-1">
                          <div className="h-1.5 w-14 rounded-full opacity-40 bg-white" />
                          <div className="h-1 w-10 rounded-full opacity-25 bg-white" />
                        </div>
                      </div>
                      {/* Rows */}
                      <div className="flex-1 p-2 space-y-1" style={{ background: "white" }}>
                        <div className="h-2 rounded" style={{ background: theme.preview.sectionBg }} />
                        <div className="h-1 rounded bg-gray-100 w-4/5" />
                        <div className="h-1 rounded bg-gray-100 w-3/5" />
                      </div>
                      {/* Label */}
                      <div className="px-2 pb-2 flex items-center justify-between"
                        style={{ background: isActive ? "rgba(255,255,255,0.8)" : "white" }}>
                        <p className="text-[10px] font-black text-slate-700">{theme.name}</p>
                        {isActive && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: "var(--t-from)" }}>
                            <CheckCircle size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* 7 ── LOGO & BRANDING ────────────────────────────── */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {language === "es" ? "Logo y Branding" : "Logo & Branding"}
              </p>

              {/* Web logo */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  {language === "es" ? "Logo de la app (sidebar)" : "App logo (sidebar)"}
                </p>

                {logoUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
                    <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain max-w-[120px] rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Logo cargado</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Aparece en el sidebar y encabezado móvil</p>
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => logoInputRef.current?.click()}
                        data-testid="logo-change-btn"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                        <Upload size={13} className="text-slate-600" />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => updateLogoSettings({ url: null })}
                        data-testid="logo-remove-btn"
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                        <Trash2 size={13} className="text-red-500" />
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    onClick={() => logoInputRef.current?.click()}
                    data-testid="logo-upload-btn"
                    className="w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 hover:border-slate-300 transition-all">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <ImageIcon size={18} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-600">{language === "es" ? "Subir logo" : "Upload logo"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG — se comprime automáticamente</p>
                    </div>
                  </motion.button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} data-testid="logo-file-input" />

                {/* Size slider (only if logo is set) */}
                {logoUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "es" ? "Tamaño en sidebar" : "Sidebar size"}
                      </p>
                      <span className="text-xs font-bold text-slate-600">{logoSize}px</span>
                    </div>
                    <Slider
                      min={24} max={80} step={4}
                      value={[Math.min(logoSize, 80)]}
                      onValueChange={([val]) => updateLogoSettings({ size: val })}
                      data-testid="logo-size-slider"
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>24px</span><span>80px</span>
                    </div>
                  </div>
                )}

                {/* PDF logo toggles */}
                <div className="border-t border-white/40 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{language === "es" ? "Usar logo en PDFs" : "Use logo in PDFs"}</p>
                      <p className="text-[10px] text-slate-400">{language === "es" ? "Aparece en el encabezado de cada PDF" : "Appears in the header of each PDF"}</p>
                    </div>
                    <Switch
                      checked={usePdfLogo}
                      onCheckedChange={(val) => updateLogoSettings({ usePdf: val })}
                      data-testid="use-pdf-logo-toggle"
                    />
                  </div>

                  {usePdfLogo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pl-1 border-l-2 border-slate-200 ml-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{language === "es" ? "Logo diferente para PDFs" : "Different logo for PDFs"}</p>
                          <p className="text-[10px] text-slate-400">{language === "es" ? "Usa una imagen distinta en los archivos" : "Use a different image for documents"}</p>
                        </div>
                        <Switch
                          checked={useCustomPdfLogo}
                          onCheckedChange={(val) => updateLogoSettings({ useCustomPdf: val })}
                          data-testid="use-custom-pdf-logo-toggle"
                        />
                      </div>

                      {useCustomPdfLogo && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logo para PDFs</p>
                          {pdfLogoUrl ? (
                            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/60">
                              <img src={pdfLogoUrl} alt="PDF Logo" className="h-10 w-auto object-contain max-w-[100px] rounded-lg" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-slate-600">Logo PDF cargado</p>
                              </div>
                              <div className="flex gap-2">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => pdfLogoInputRef.current?.click()}
                                  data-testid="pdf-logo-change-btn"
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                                  <Upload size={12} className="text-slate-600" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => updateLogoSettings({ pdfUrl: null })}
                                  data-testid="pdf-logo-remove-btn"
                                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                                  <Trash2 size={12} className="text-red-500" />
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                              onClick={() => pdfLogoInputRef.current?.click()}
                              data-testid="pdf-logo-upload-btn"
                              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 transition-all text-xs text-slate-500 font-semibold">
                              <Upload size={13} />
                              {language === "es" ? "Subir logo para PDFs" : "Upload PDF logo"}
                            </motion.button>
                          )}
                          <input ref={pdfLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePdfLogoUpload} data-testid="pdf-logo-file-input" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

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

        {/* Desktop App */}
        <Section icon={Monitor} title={s.desktopTitle} desc={s.desktopDesc}
          badge={
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
              {s.desktopBadge}
            </span>
          }>
          <div className="space-y-4">
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
                <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer"
                  className="underline hover:text-amber-900">
                  {s.desktopReqLink}
                </a>
                {" "}(marcar "Add Python to PATH")
              </p>
            </div>

            {/* ── UPDATE + DOWNLOAD BLOCK ─────────────────────── */}
            <div className="rounded-2xl overflow-hidden border border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 to-white/60">
              {/* Step 1 — Update */}
              <div className="px-4 pt-4 pb-3 border-b border-indigo-100/60">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-full btn-primary flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">1</div>
                  <p className="text-xs font-bold text-slate-700">
                    {language === "es" ? "Actualizar app con los últimos cambios" : "Update app with latest changes"}
                  </p>
                </div>

                {/* Build status bar */}
                {buildStatus.status !== "idle" && (
                  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs font-medium ${
                    buildStatus.status === "building" ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                    : buildStatus.status === "ready"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-red-50 text-red-600 border border-red-200/60"
                  }`}>
                    {buildStatus.status === "building"
                      ? <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" />
                      : buildStatus.status === "ready"
                      ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
                      : <XCircle size={13} className="flex-shrink-0 mt-0.5" />
                    }
                    <span>{buildStatus.message}</span>
                  </div>
                )}

                {/* Animated progress dots while building */}
                {buildStatus.status === "building" && (
                  <div className="flex items-center gap-1.5 mb-3">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                        style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                    <span className="text-[10px] text-indigo-500 font-medium ml-1">
                      {language === "es" ? "Compilando… por favor espera" : "Building… please wait"}
                    </span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: buildStatus.status === "building" ? 1 : 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRebuild}
                  disabled={buildStatus.status === "building"}
                  data-testid="desktop-rebuild-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: buildStatus.status === "ready" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,var(--t-from),var(--t-to))" }}
                >
                  {buildStatus.status === "building"
                    ? <><Loader2 size={14} className="animate-spin" /> {language === "es" ? "Actualizando… espera" : "Updating… please wait"}</>
                    : buildStatus.status === "ready"
                    ? <><CheckCircle size={14} /> {language === "es" ? "App actualizada — actualizar de nuevo" : "App updated — rebuild again"}</>
                    : <><RefreshCw size={14} /> {language === "es" ? "Actualizar App" : "Update App"}</>
                  }
                </motion.button>
              </div>

              {/* Step 2 — Download */}
              <div className="px-4 pt-3 pb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${buildStatus.status === "ready" ? "btn-primary" : "bg-slate-300"}`}>2</div>
                  <p className={`text-xs font-bold ${buildStatus.status === "ready" ? "text-slate-700" : "text-slate-400"}`}>
                    {language === "es" ? "Descargar app actualizada (.zip)" : "Download updated app (.zip)"}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: buildStatus.status === "ready" ? 1.02 : 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadPackage}
                  disabled={downloadLoading || buildStatus.status === "building"}
                  data-testid="desktop-download-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    background: buildStatus.status === "ready" ? "linear-gradient(135deg,var(--t-from),var(--t-to))" : "#e2e8f0",
                    color: buildStatus.status === "ready" ? "white" : "#94a3b8",
                    cursor: buildStatus.status === "ready" || buildStatus.status === "idle" ? "pointer" : "not-allowed",
                  }}
                >
                  {downloadLoading
                    ? <><Loader2 size={14} className="animate-spin" /> {s.desktopDownloading}</>
                    : <><Package size={14} /> {s.desktopDownload}</>
                  }
                </motion.button>
                {buildStatus.status !== "ready" && buildStatus.status !== "idle" && (
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    {language === "es" ? "Primero actualiza la app (Paso 1)" : "First update the app (Step 1)"}
                  </p>
                )}
              </div>
            </div>

            {/* Note */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {s.desktopNote}
            </p>
          </div>
        </Section>


      </motion.div>
    </div>
  );
}
