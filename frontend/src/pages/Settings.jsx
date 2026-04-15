import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, Globe, DollarSign, Palette, FileText,
  Bell, BellRing, Database, CheckCircle, XCircle, RefreshCw,
  Wifi, WifiOff, MessageCircle, Mail, Loader2, Monitor,
  Package, AlertCircle, Sparkles, Zap, Layers
} from "lucide-react";
import { useSettings, THEMES, CURRENCIES, PRESETS } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { api, getAppSettings, updateAppSettings, getDbStats, testDbConnection, switchDatabase, resetDatabase, sendTestReminder, getReservations } from "@/lib/api";
import { generateAllReservationsPDF } from "@/lib/generatePDF";

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
          preset, animations, radius, changePreset, changeAnimations, changeRadius } = useSettings();
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

  // ── System Notifications ──────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(() =>
    (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
  );

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: language === "es" ? "Tu navegador no soporta notificaciones" : "Browser does not support notifications", variant: "destructive" });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        localStorage.setItem("cp_notif_enabled", "true");
        new Notification("Cinema Productions", {
          body: language === "es" ? "¡Notificaciones de sistema activadas correctamente!" : "System notifications enabled!",
          icon: "/logo.png",
        });
        toast({ title: language === "es" ? "Notificaciones de sistema activadas ✓" : "System notifications enabled ✓" });
      } else {
        toast({ title: language === "es" ? "Permiso denegado" : "Permission denied", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al solicitar permiso", variant: "destructive" });
    }
  };

  const handleTestSystemNotif = () => {
    if (Notification.permission !== "granted") return;
    new Notification("Cinema Productions — Prueba", {
      body: language === "es" ? "Las notificaciones de sistema están funcionando correctamente." : "System notifications are working.",
      icon: "/logo.png",
      tag: "cp-test-notif",
    });
    toast({ title: language === "es" ? "Notificación enviada ✓" : "Test notification sent ✓" });
  };

  // ── PDF Export ────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) {
        toast({ title: language === "es" ? "No hay reservas para exportar" : "No reservations to export", variant: "destructive" });
        return;
      }
      await generateAllReservationsPDF(reservations, formatCurrency);
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

            {/* ── Windows / System Notifications ──────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: notifPermission === "granted"
                  ? "1px solid rgba(16,185,129,0.3)"
                  : notifPermission === "denied"
                  ? "1px solid rgba(239,68,68,0.25)"
                  : "1px solid rgba(226,232,240,0.8)",
                background: notifPermission === "granted"
                  ? "rgba(16,185,129,0.04)"
                  : "rgba(255,255,255,0.5)",
              }}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: notifPermission === "granted"
                      ? "rgba(16,185,129,0.12)"
                      : notifPermission === "denied" ? "rgba(239,68,68,0.08)" : "#f1f5f9",
                  }}
                >
                  <BellRing
                    size={16}
                    style={{
                      color: notifPermission === "granted" ? "#10b981"
                        : notifPermission === "denied" ? "#ef4444" : "#94a3b8",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {language === "es" ? "Notificaciones del Sistema" : "System Notifications"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === "es" ? "Alertas emergentes en Windows / macOS" : "Pop-up alerts on Windows / macOS"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                    notifPermission === "granted" ? "bg-emerald-100 text-emerald-700"
                    : notifPermission === "denied" ? "bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-400"
                  }`}
                  data-testid="system-notif-status"
                >
                  {notifPermission === "granted" ? "ACTIVO"
                    : notifPermission === "denied" ? "BLOQUEADO"
                    : notifPermission === "unsupported" ? "NO SOPORTADO"
                    : "INACTIVO"}
                </span>
              </div>

              {/* Body */}
              <div className="px-4 pb-4">
                {notifPermission === "unsupported" ? (
                  <p className="text-xs text-slate-400 text-center py-1">
                    {language === "es" ? "Tu navegador no soporta notificaciones nativas." : "Your browser does not support native notifications."}
                  </p>
                ) : notifPermission === "denied" ? (
                  <div className="flex items-start gap-2 bg-red-50/80 border border-red-200/60 rounded-xl px-3 py-2.5">
                    <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-medium">
                      {language === "es"
                        ? "Permiso denegado. Ve a Configuración del navegador → Privacidad → Notificaciones y permite este sitio."
                        : "Permission denied. Go to Browser Settings → Privacy → Notifications and allow this site."}
                    </p>
                  </div>
                ) : notifPermission === "granted" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/50 rounded-xl px-3 py-2.5">
                      <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-emerald-700 font-semibold">
                        {language === "es" ? "Notificaciones de sistema activas — recordatorios en tiempo real" : "System notifications active — real-time reminders"}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleTestSystemNotif}
                      data-testid="system-notif-test-btn"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl glass text-slate-700 text-xs font-bold hover:bg-white/50 transition-all border border-white/60"
                    >
                      <Bell size={13} />
                      {language === "es" ? "Enviar notificación de prueba" : "Send test notification"}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 mb-3">
                      {language === "es"
                        ? "Recibe alertas emergentes directamente en Windows o macOS cuando hay eventos próximos, sin necesidad de tener la app abierta."
                        : "Receive pop-up alerts directly on Windows or macOS for upcoming events."}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRequestPermission}
                      data-testid="system-notif-enable-btn"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-primary text-white text-sm font-bold"
                    >
                      <BellRing size={15} />
                      {language === "es" ? "Activar notificaciones de Windows" : "Enable Windows notifications"}
                    </motion.button>
                    <p className="text-[10px] text-slate-400 text-center mt-1">
                      {language === "es"
                        ? "El navegador pedirá permiso. Haz clic en \"Permitir\" para activar."
                        : "The browser will ask for permission. Click \"Allow\" to enable."}
                    </p>
                  </div>
                )}
              </div>
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
          <div className="space-y-3">

            {/* CSV + JSON row */}
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

            {/* PDF Export — full-width visual report */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.2)", background: "rgba(254,242,242,0.5)" }}>
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.1)" }}>
                  <FileText size={15} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {language === "es" ? "Reporte Visual PDF" : "PDF Visual Report"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === "es"
                      ? "Todas las reservas agrupadas por estado con detalles y montos"
                      : "All reservations grouped by status with details and amounts"}
                  </p>
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
                  style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
                >
                  {pdfLoading
                    ? <><Loader2 size={15} className="animate-spin" /> {language === "es" ? "Generando PDF..." : "Generating PDF..."}</>
                    : <><FileText size={15} /> {language === "es" ? "Exportar reporte PDF — todas las reservas" : "Export PDF report — all reservations"}</>
                  }
                </motion.button>
              </div>
            </div>

          </div>
        </Section>

      </motion.div>
    </div>
  );
}
