import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, Globe, DollarSign, Palette, FileText,
  Bell, Database, CheckCircle, XCircle, RefreshCw,
  Wifi, WifiOff, MessageCircle, Mail, Loader2, Monitor,
  Package, AlertCircle
} from "lucide-react";
import { useSettings, THEMES, CURRENCIES } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { api, getAppSettings, updateAppSettings, getDbStats, testDbConnection, switchDatabase, resetDatabase, sendTestReminder } from "@/lib/api";

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
  const { language, currency, theme, tr, changeLanguage, changeCurrency, changeTheme } = useSettings();
  const { toast } = useToast();
  const s = tr.settings;

  // Notification settings state
  const [notif, setNotif] = useState({
    reminders_enabled: false,
    reminder_days: 3,
    admin_email: "",
    admin_whatsapp: "",
    notification_channel: "email",
    resend_api_key: "",
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Desktop download state
  const [downloadLoading, setDownloadLoading] = useState(false);

  // DB state
  const [dbStats, setDbStats] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [newDbUrl, setNewDbUrl] = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResetting, setDbResetting] = useState(false);

  useEffect(() => {
    getAppSettings().then(data => {
      if (data && Object.keys(data).length > 0) {
        setNotif(prev => ({
          ...prev,
          reminders_enabled: data.reminders_enabled ?? false,
          reminder_days: data.reminder_days ?? 3,
          admin_email: data.admin_email ?? "",
          admin_whatsapp: data.admin_whatsapp ?? "",
          notification_channel: data.notification_channel ?? "email",
          resend_api_key: data.has_resend_key ? "re_" + "•".repeat(20) + "••••" : "",
        }));
      }
    }).catch(() => {});
    loadDbStats();
  }, []);

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats()
      .then(setDbStats)
      .catch(() => setDbStats(null))
      .finally(() => setDbLoading(false));
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
      setTestResult({ ok: true, msg: res.message || s.notifTestSent, events: res.events_found });
      toast({ title: `${s.notifTestSent}: ${res.events_found} evento(s)` });
    } catch (err) {
      const msg = err.response?.data?.detail || "Error";
      setTestResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setTestLoading(false);
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

        {/* Colors */}
        <Section icon={Palette} title={s.colorsTitle} desc={s.colorsDesc}>
          <div className="grid grid-cols-6 gap-3">
            {Object.values(THEMES).map(t => (
              <motion.button key={t.id} whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.92 }}
                onClick={() => changeTheme(t.id)} data-testid={`theme-${t.id}`}
                className="flex flex-col items-center gap-2" title={t.name}>
                <div className="w-11 h-11 rounded-full transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                    boxShadow: theme === t.id ? `0 0 0 3px white, 0 0 0 5px ${t.from}, 0 8px 20px ${t.shadow}` : `0 4px 12px ${t.shadow}`,
                    transform: theme === t.id ? "scale(1.15)" : "scale(1)",
                  }} />
                <span className="text-[10px] font-bold text-slate-500">{t.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title={s.notifTitle} desc={s.notifDesc}
          badge={
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${notif.reminders_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
              {notif.reminders_enabled ? (language === "es" ? "ACTIVO" : "ACTIVE") : (language === "es" ? "INACTIVO" : "INACTIVE")}
            </span>
          }>
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between bg-white/50 rounded-2xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{s.notifEnabled}</span>
              <button onClick={() => setNotif(p => ({ ...p, reminders_enabled: !p.reminders_enabled }))}
                data-testid="notif-toggle"
                className={`w-11 h-6 rounded-full transition-all relative ${notif.reminders_enabled ? "btn-primary" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notif.reminders_enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {/* Days */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifDays}</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={30} value={notif.reminder_days}
                  onChange={e => setNotif(p => ({ ...p, reminder_days: parseInt(e.target.value) }))}
                  data-testid="notif-days-slider"
                  className="flex-1 accent-indigo-500" />
                <span className="text-sm font-black text-slate-800 w-14 text-center bg-white/60 rounded-xl py-1">
                  {notif.reminder_days}d
                </span>
              </div>
            </div>

            {/* Channel */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifChannel}</label>
              <div className="grid grid-cols-3 gap-2">
                {channels.map(ch => (
                  <button key={ch.value} onClick={() => setNotif(p => ({ ...p, notification_channel: ch.value }))}
                    data-testid={`notif-channel-${ch.value}`}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${notif.notification_channel === ch.value ? "btn-primary text-white" : "glass text-slate-600 hover:bg-white/50"}`}>
                    <ch.icon size={13} /> {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email input */}
            {(notif.notification_channel === "email" || notif.notification_channel === "both") && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifEmail}</label>
                <input type="email" value={notif.admin_email}
                  onChange={e => setNotif(p => ({ ...p, admin_email: e.target.value }))}
                  placeholder="admin@cinemaproductions.com"
                  data-testid="notif-email-input"
                  className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            )}

            {/* Resend API key */}
            {(notif.notification_channel === "email" || notif.notification_channel === "both") && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifResendKey}</label>
                <input type="password" value={notif.resend_api_key}
                  onChange={e => setNotif(p => ({ ...p, resend_api_key: e.target.value }))}
                  placeholder={s.notifResendPlaceholder}
                  data-testid="notif-resend-key-input"
                  className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtén tu clave gratis en{" "}
                  <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-indigo-500 underline">resend.com</a>
                </p>
              </div>
            )}

            {/* WhatsApp input */}
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
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === "es" ? "El botón abre WhatsApp con un mensaje listo para enviar" : "Button opens WhatsApp with a ready-to-send message"}
                </p>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {testResult.msg}
              </div>
            )}

            {/* Buttons */}
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
                {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                {s.notifTest}
              </motion.button>
            </div>
          </div>
        </Section>

        {/* Database */}
        <Section icon={Database} title={s.dbTitle} desc={s.dbDesc}
          badge={
            dbStats ? (
              <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${dbStats.is_custom ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {dbStats.is_custom ? <WifiOff size={10} /> : <Wifi size={10} />}
                {dbStats.is_custom ? s.dbCustomLabel : s.dbDefaultLabel}
              </span>
            ) : null
          }>
          <div className="space-y-4">
            {/* Stats grid */}
            {dbLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={22} className="animate-spin text-slate-400" />
              </div>
            ) : dbStats ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label={s.dbCollections} value={dbStats.collections} />
                  <StatCard label={s.dbObjects} value={dbStats.objects?.toLocaleString()} />
                  <StatCard label={s.dbTotal} value={dbStats.total_size} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label={s.dbDataSize} value={dbStats.data_size} />
                  <StatCard label={s.dbStorage} value={dbStats.storage_size} />
                  <StatCard label={s.dbIndexes} value={dbStats.index_size} />
                </div>
                {/* Current connection */}
                <div className="bg-white/50 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.dbCurrentConn}</p>
                  <p className="text-xs font-mono text-slate-600 break-all">{dbStats.current_url}</p>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={loadDbStats} data-testid="db-refresh-btn"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                  <RefreshCw size={12} /> {language === "es" ? "Actualizar estadísticas" : "Refresh stats"}
                </motion.button>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No se pudieron cargar las estadísticas</p>
            )}

            {/* New DB URL input */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.dbNewUrl}</label>
              <input type="text" value={newDbUrl}
                onChange={e => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                placeholder="mongodb://usuario:contraseña@host:27017"
                data-testid="db-url-input"
                className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Test result */}
            {dbTestResult && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${dbTestResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {dbTestResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {dbTestResult.msg}
              </div>
            )}

            {/* DB action buttons */}
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
        </Section>

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

            {/* Download buttons */}
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleDownloadPackage} disabled={downloadLoading}
                data-testid="desktop-download-btn"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl btn-primary text-white text-sm font-bold flex-1 justify-center disabled:opacity-60">
                {downloadLoading
                  ? <><Loader2 size={15} className="animate-spin" /> {s.desktopDownloading}</>
                  : <><Package size={15} /> {s.desktopDownload}</>}
              </motion.button>
            </div>

            {/* Note */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {s.desktopNote}
            </p>
          </div>
        </Section>

        {/* Export */}
        <Section icon={FileText} title={s.exportTitle} desc={s.exportDesc}>
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
        </Section>

      </motion.div>
    </div>
  );
}
