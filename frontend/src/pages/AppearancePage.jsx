import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, CheckCircle, Zap, Pencil, RotateCcw, Upload, ImageIcon, Trash2,
  Sparkles, Layers, SlidersHorizontal, Wind, Maximize2, Monitor, Type, Moon,
  AlignJustify, Link as LinkIcon,
} from "lucide-react";
import { useSettings, THEMES, PRESETS } from "@/context/SettingsContext";
import { getEventConfig, getEventTypeName, AVAILABLE_ICONS, AVAILABLE_COLORS, EVENT_TYPES } from "@/lib/eventConfig";
import { useToast } from "@/hooks/use-toast";
import { generateAllReservationsPDF, PDF_THEMES } from "@/lib/generatePDF";
import { getReservations } from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

function Section({ icon: Icon, title, desc, children, badge, accent }) {
  return (
    <motion.div variants={item} className="glass rounded-3xl p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center">
            <Icon size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{title}</h2>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </motion.div>
  );
}

function Toggle({ value, onChange, testId }) {
  return (
    <button
      onClick={() => onChange(!value)}
      data-testid={testId}
      className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${value ? "btn-primary" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? "left-[26px]" : "left-0.5"}`} />
    </button>
  );
}

export default function AppearancePage() {
  const {
    language,
    theme, changeTheme,
    preset, animations, radius, pdfTheme,
    changePreset, changeAnimations, changeRadius, changePdfTheme,
    darkMode, changeDarkMode,
    fontScale, changeFontScale,
    bgIntensity, changeBgIntensity,
    sidebarCompact, changeSidebarCompact,
    dateFormat, changeDateFormat,
    fontFamily, changeFontFamily,
    cardStyle, changeCardStyle,
    animSpeed, changeAnimSpeed,
    shadowDepth, changeShadowDepth,
    pageWidth, changePageWidth,
    btnCorner, changeBtnCorner,
    scrollbar, changeScrollbar,
    customBgEnabled, bgColor1, bgColor2, changeCustomBg,
    customAccent, changeCustomAccent,
    saturation, changeSaturation,
    hoverEffect, changeHoverEffect,
    // New features
    glassBlur, changeGlassBlur,
    layoutDensity, changeLayoutDensity,
    pageTransition, changePageTransition,
    iconSize, changeIconSize,
    sidebarStyle, changeSidebarStyle,
    bgImage, changeBgImage,
    // Event & logo
    eventConfigs, updateEventTypeConfig, resetEventTypeConfig,
    logoUrl, pdfLogoUrl, logoSize, usePdfLogo, useCustomPdfLogo, updateLogoSettings,
  } = useSettings();

  const { toast } = useToast();

  const [accentColorInput, setAccentColorInput] = useState(customAccent || "");
  const [bgImageInput, setBgImageInput] = useState(bgImage || "");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeEventType, setActiveEventType] = useState(null);
  const [typeNameEdit, setTypeNameEdit] = useState("");

  const logoInputRef = React.useRef();
  const pdfLogoInputRef = React.useRef();

  const compressImage = (file, maxW = 500, maxH = 250, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * ratio;
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
      await generateAllReservationsPDF(reservations, () => {}, effectiveLogo, pdfTheme);
      toast({ title: `PDF generado — ${reservations.length} reservas ✓` });
    } catch (err) {
      toast({ title: err.message || "Error al generar PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const es = language === "es";

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          {es ? "Apariencia" : "Appearance"}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">
          {es ? "Personaliza cada detalle visual de tu aplicación" : "Customize every visual detail of your app"}
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* ── 1. PALETA DE COLORES ─────────────────── */}
        <Section icon={Palette} title={es ? "Paleta de Colores" : "Color Palette"} desc={es ? "Color de acento y preset visual" : "Accent color and visual preset"}>
          <div className="space-y-6">

            {/* Theme colors */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {es ? "Color de Acento" : "Accent Color"}
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

            {/* Custom accent */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">
                {es ? "Color personalizado (hex)" : "Custom Hex Color"}
              </p>
              <div className="flex items-center gap-3">
                <input type="color" value={accentColorInput || "#6366f1"}
                  onChange={e => setAccentColorInput(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-200/60 bg-transparent" />
                <input type="text" value={accentColorInput}
                  onChange={e => setAccentColorInput(e.target.value)}
                  placeholder="#6366f1" maxLength={7}
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { changeCustomAccent(accentColorInput); toast({ title: es ? "Color aplicado ✓" : "Color applied ✓" }); }}
                  data-testid="custom-accent-apply"
                  className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold">
                  {es ? "Aplicar" : "Apply"}
                </motion.button>
                {customAccent && (
                  <button onClick={() => { changeCustomAccent(""); setAccentColorInput(""); toast({ title: "Color restablecido" }); }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    {es ? "Reset" : "Reset"}
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* Design presets */}
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {es ? "Diseño de la Aplicación" : "App Design"}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "aurora", label: "Glass Aurora", hint: es ? "Glassmorphismo + blobs" : "Glassmorphism + blobs",
                    bg: "linear-gradient(135deg,#eff0ff,#fce7f3,#e0f2fe)",
                    blobs: [{ top:1, left:2, w:28, h:28, c:"rgba(167,139,250,0.55)", blur:9 }, { bottom:2, right:3, w:22, h:22, c:"rgba(249,168,212,0.55)", blur:7 }] },
                  { id: "crystal", label: "Crystal", hint: es ? "Nítido y opaco" : "Sharp opaque", bg: "#eef2f7", blobs: [] },
                  { id: "minimal", label: "Minimal", hint: es ? "Sin distracciones" : "No distractions", bg: "#f1f5f9", blobs: [] },
                ].map(p => (
                  <motion.button key={p.id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => changePreset(p.id)} data-testid={`preset-${p.id}`}
                    className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
                    style={{ border: preset === p.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)" }}>
                    <div className="relative h-20 w-full overflow-hidden" style={{ background: p.bg }}>
                      {p.blobs.map((b, i) => (
                        <div key={i} className="absolute" style={{ width: b.w, height: b.h, borderRadius: "50%", background: b.c, filter: `blur(${b.blur}px)`, top: b.top, left: b.left, bottom: b.bottom, right: b.right }} />
                      ))}
                      <div className="absolute" style={{ inset: "8px 10px 6px 10px", borderRadius: 8, background: p.id === "aurora" ? "rgba(255,255,255,0.4)" : p.id === "crystal" ? "rgba(255,255,255,0.9)" : "#fff", backdropFilter: p.id === "aurora" ? "blur(10px)" : "none", border: p.id === "aurora" ? "1px solid rgba(255,255,255,0.7)" : "1px solid #e2e8f0" }}>
                        <div style={{ height: 3, width: "65%", background: p.id === "aurora" ? "rgba(99,102,241,0.35)" : "#e2e8f0", borderRadius: 4, margin: "7px 7px 4px" }} />
                        <div style={{ height: 2, width: "45%", background: p.id === "aurora" ? "rgba(99,102,241,0.18)" : "#f1f5f9", borderRadius: 4, margin: "0 7px" }} />
                      </div>
                      {preset === p.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center shadow-sm">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white/70">
                      <p className="text-[11px] font-black text-slate-800">{p.label}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">{p.hint}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/40" />

            {/* Color saturation */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">{es ? "Saturación de color" : "Color Saturation"}</p>
              <div className="flex gap-2">
                {[
                  { id: "muted", label: es ? "Apagado" : "Muted", bar: "opacity-40" },
                  { id: "normal", label: es ? "Normal" : "Normal", bar: "opacity-70" },
                  { id: "vivid", label: es ? "Vívido" : "Vivid", bar: "opacity-100" },
                ].map(s_ => (
                  <motion.button key={s_.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`sat-${s_.id}`}
                    onClick={() => changeSaturation(s_.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all gap-2 ${saturation === s_.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <div className={`flex gap-0.5 ${s_.bar}`}>
                      {["bg-red-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-purple-400"].map(c => <div key={c} className={`w-2 h-3 rounded-sm ${c}`} />)}
                    </div>
                    <span className={`text-[9px] font-bold ${saturation === s_.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{s_.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── 2. TIPOGRAFÍA ──────────────────────────── */}
        <Section icon={Type} title={es ? "Tipografía e Iconos" : "Typography & Icons"} desc={es ? "Fuente, tamaño de texto e iconos del menú" : "Font, text size and menu icons"}>
          <div className="space-y-5">

            {/* Font family */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Familia de fuente" : "Font Family"}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "satoshi", label: "Satoshi" },
                  { id: "cabinet", label: "Cabinet" },
                  { id: "outfit", label: "Outfit" },
                  { id: "space", label: "Space Grotesk" },
                  { id: "poppins", label: "Poppins" },
                  { id: "sora", label: "Sora" },
                  { id: "dmsans", label: "DM Sans" },
                  { id: "mono", label: "Monospace" },
                ].map(f => (
                  <motion.button key={f.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`font-${f.id}`}
                    onClick={() => { changeFontFamily(f.id); toast({ title: `Fuente: ${f.label}` }); }}
                    className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${fontFamily === f.id ? "border-[var(--t-from)] bg-white/80 text-[var(--t-from)]" : "border-slate-200/70 bg-white/40 text-slate-600 hover:bg-white/60"}`}>
                    {f.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Font scale */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Tamaño de texto" : "Text Size"}</p>
              <div className="flex gap-2">
                {[
                  { id: "compact", label: es ? "Compacto" : "Compact", desc: "88%" },
                  { id: "normal", label: es ? "Normal" : "Normal", desc: "100%" },
                  { id: "large", label: es ? "Grande" : "Large", desc: "110%" },
                ].map(f => (
                  <motion.button key={f.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`fontscale-${f.id}`}
                    onClick={() => { changeFontScale(f.id); toast({ title: `Texto: ${f.label}` }); }}
                    className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-2xl border-2 transition-all ${fontScale === f.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <span className="text-xs font-black" style={{ color: fontScale === f.id ? "var(--t-from)" : "#64748b" }}>{f.label}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{f.desc}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Icon size - NEW */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">
                {es ? "Tamaño de iconos (sidebar)" : "Icon Size (sidebar)"}
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
              </p>
              <div className="flex gap-2">
                {[
                  { id: "small", label: es ? "Pequeño" : "Small", size: 14 },
                  { id: "medium", label: es ? "Normal" : "Normal", size: 18 },
                  { id: "large", label: es ? "Grande" : "Large", size: 22 },
                ].map(i_ => (
                  <motion.button key={i_.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`icon-size-${i_.id}`}
                    onClick={() => { changeIconSize(i_.id); toast({ title: `${es ? "Iconos" : "Icons"}: ${i_.label}` }); }}
                    className={`flex-1 flex flex-col items-center py-3 rounded-2xl border-2 transition-all gap-2 ${iconSize === i_.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <Type size={i_.size} style={{ color: iconSize === i_.id ? "var(--t-from)" : "#94a3b8" }} />
                    <span className={`text-[9px] font-bold ${iconSize === i_.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{i_.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── 3. ANIMACIONES Y MOVIMIENTO ──────────── */}
        <Section icon={Zap} title={es ? "Animaciones y Movimiento" : "Animations & Motion"} desc={es ? "Efectos, transiciones y velocidad" : "Effects, transitions and speed"}>
          <div className="space-y-5">

            {/* Animations toggle */}
            <motion.div whileHover={{ scale: 1.005 }}
              className="flex items-center justify-between bg-white/50 rounded-2xl px-5 py-3.5 cursor-pointer"
              onClick={() => changeAnimations(!animations)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: animations ? "var(--t-from)18" : "#f1f5f9" }}>
                  <Zap size={15} style={{ color: animations ? "var(--t-from)" : "#94a3b8" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{es ? "Efectos y transiciones" : "Effects & transitions"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {animations ? (es ? "Activadas" : "Enabled") : (es ? "Desactivadas — modo rápido" : "Disabled — fast mode")}
                  </p>
                </div>
              </div>
              <Toggle value={animations} onChange={changeAnimations} testId="animations-toggle" />
            </motion.div>

            {/* Animation speed */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Velocidad de animaciones" : "Animation Speed"}</p>
              <div className="flex gap-2">
                {[
                  { id: "slow", label: es ? "Lenta" : "Slow", icon: "🐢" },
                  { id: "normal", label: es ? "Normal" : "Normal", icon: "✦" },
                  { id: "fast", label: es ? "Rápida" : "Fast", icon: "⚡" },
                  { id: "instant", label: es ? "Instante" : "Instant", icon: "⚡⚡" },
                ].map(a => (
                  <motion.button key={a.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`anim-${a.id}`}
                    onClick={() => changeAnimSpeed(a.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all gap-1 ${animSpeed === a.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <span className="text-sm">{a.icon}</span>
                    <span className={`text-[9px] font-bold ${animSpeed === a.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Page transition - NEW */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">
                {es ? "Transición entre páginas" : "Page Transition"}
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "fade", label: "Fade", preview: "opacity: 0.3" },
                  { id: "slide", label: "Slide", preview: "transform: translateX(8px)" },
                  { id: "zoom", label: "Zoom", preview: "transform: scale(0.92)" },
                  { id: "none", label: es ? "Ninguna" : "None", preview: "" },
                ].map(t => (
                  <motion.button key={t.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`page-transition-${t.id}`}
                    onClick={() => { changePageTransition(t.id); toast({ title: `${es ? "Transición" : "Transition"}: ${t.label}` }); }}
                    className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all gap-2 ${pageTransition === t.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <div className="w-8 h-6 rounded-md bg-slate-200/80 relative overflow-hidden flex items-center justify-center">
                      <div className="w-5 h-4 rounded bg-gradient-to-br from-[var(--t-from)] to-[var(--t-to)]"
                        style={
                          t.id === "fade" ? { opacity: 0.5 }
                            : t.id === "slide" ? { transform: "translateX(6px)" }
                            : t.id === "zoom" ? { transform: "scale(0.82)" }
                            : {}
                        } />
                    </div>
                    <span className={`text-[9px] font-bold ${pageTransition === t.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{t.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Hover effect */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">{es ? "Efecto al pasar el cursor" : "Hover Effect"}</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "normal", label: es ? "Normal" : "Normal" },
                  { id: "glow", label: "Glow" },
                  { id: "lift", label: es ? "Elevar" : "Lift" },
                  { id: "scale", label: "Scale" },
                ].map(h => (
                  <button key={h.id} data-testid={`hover-${h.id}`}
                    onClick={() => changeHoverEffect(h.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${hoverEffect === h.id ? "border-[var(--t-from)] text-[var(--t-from)] bg-white/80" : "border-slate-200/70 text-slate-500 bg-white/40"}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── 4. FORMAS Y BORDES ───────────────────── */}
        <Section icon={Layers} title={es ? "Formas y Bordes" : "Shapes & Borders"} desc={es ? "Estilos de bordes, tarjetas y botones" : "Border, card and button styles"}>
          <div className="space-y-5">

            {/* Border radius */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-3">{es ? "Estilo de bordes" : "Border Style"}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "rounded", label: es ? "Suaves" : "Soft", hint: es ? "Redondeados" : "Rounded", rx: 14 },
                  { id: "medium", label: es ? "Medios" : "Medium", hint: es ? "Intermedios" : "Balanced", rx: 6 },
                  { id: "sharp", label: es ? "Rectos" : "Sharp", hint: es ? "Angulares" : "Angular", rx: 2 },
                ].map(r => (
                  <motion.button key={r.id} whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => changeRadius(r.id)} data-testid={`radius-${r.id}`}
                    className="flex flex-col items-center gap-2.5 py-4 px-3 rounded-2xl transition-all"
                    style={{ background: radius === r.id ? "var(--t-from)12" : "rgba(255,255,255,0.5)", border: radius === r.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.7)" }}>
                    <div className="w-10 h-8 border-2 transition-all"
                      style={{ borderRadius: r.rx, borderColor: radius === r.id ? "var(--t-from)" : "#cbd5e1", background: radius === r.id ? "var(--t-from)18" : "#f8fafc" }} />
                    <div className="text-center">
                      <p className="text-xs font-black" style={{ color: radius === r.id ? "var(--t-from)" : "#64748b" }}>{r.label}</p>
                      <p className="text-[9px] font-medium text-slate-400 mt-0.5">{r.hint}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Card style */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Estilo de tarjetas" : "Card Style"}</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "glass", label: es ? "Vidrio" : "Glass", desc: "Glassmorphism" },
                  { id: "solid", label: es ? "Sólido" : "Solid", desc: es ? "Blanco" : "White" },
                  { id: "minimal", label: es ? "Mínimal" : "Minimal", desc: es ? "Sin fondo" : "No bg" },
                  { id: "neon", label: "Neon", desc: "Dark+glow" },
                  { id: "frosted", label: es ? "Escarcha" : "Frosted", desc: "Ultra blur" },
                ].map(c => (
                  <motion.button key={c.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    data-testid={`card-${c.id}`}
                    onClick={() => { changeCardStyle(c.id); toast({ title: `${es ? "Tarjetas" : "Cards"}: ${c.label}` }); }}
                    className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all gap-1.5 ${cardStyle === c.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/30 hover:bg-white/60"}`}>
                    <div className={`w-8 h-5 rounded-lg border ${c.id === "glass" ? "bg-white/60 backdrop-blur-sm border-white/60" : c.id === "solid" ? "bg-white border-slate-200" : c.id === "minimal" ? "bg-transparent border-dashed border-slate-300" : c.id === "neon" ? "bg-slate-800 border-indigo-500" : "bg-white/20 backdrop-blur border-white/80"}`} />
                    <span className={`text-[9px] font-black ${cardStyle === c.id ? "text-[var(--t-from)]" : "text-slate-600"}`}>{c.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Button corner */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Estilo de botones" : "Button Style"}</p>
              <div className="flex gap-3">
                {[
                  { id: "rounded", label: es ? "Redondeado" : "Rounded" },
                  { id: "pill", label: "Pill" },
                  { id: "sharp", label: es ? "Angular" : "Sharp" },
                ].map(b => (
                  <motion.button key={b.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`btn-corner-${b.id}`}
                    onClick={() => changeBtnCorner(b.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all gap-2 ${btnCorner === b.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <div className="w-12 h-5 btn-primary flex items-center justify-center"
                      style={{ borderRadius: b.id === "pill" ? "9999px" : b.id === "sharp" ? "4px" : "10px" }}>
                      <span className="text-[8px] text-white font-black">BTN</span>
                    </div>
                    <span className={`text-[9px] font-bold ${btnCorner === b.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{b.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Shadow depth */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Profundidad de sombras" : "Shadow Depth"}</p>
              <div className="flex gap-2">
                {[
                  { id: "flat", label: es ? "Plano" : "Flat" },
                  { id: "normal", label: es ? "Normal" : "Normal" },
                  { id: "deep", label: es ? "Profundo" : "Deep" },
                  { id: "glow", label: "Glow" },
                ].map(s_ => (
                  <motion.button key={s_.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`shadow-${s_.id}`}
                    onClick={() => changeShadowDepth(s_.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all gap-2 ${shadowDepth === s_.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <div className={`w-8 h-5 bg-white rounded-lg ${s_.id === "flat" ? "" : s_.id === "normal" ? "shadow-md" : s_.id === "deep" ? "shadow-xl" : "shadow-lg"}`}
                      style={s_.id === "glow" ? { boxShadow: "0 0 16px color-mix(in srgb, var(--t-from) 40%, transparent)" } : {}} />
                    <span className={`text-[9px] font-bold ${shadowDepth === s_.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{s_.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── 5. FONDO Y COLORES ───────────────────── */}
        <Section icon={SlidersHorizontal} title={es ? "Fondo y Colores" : "Background & Colors"} desc={es ? "Modo oscuro, fondo, vidrio y efectos" : "Dark mode, background, glass and effects"}>
          <div className="space-y-5">

            {/* Dark mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">{es ? "Modo Oscuro" : "Dark Mode"}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{es ? "Fondo oscuro en toda la app" : "Dark background everywhere"}</p>
              </div>
              <Toggle value={darkMode} onChange={(v) => { changeDarkMode(v); toast({ title: v ? "Modo oscuro activado ✓" : "Modo claro activado" }); }} testId="dark-mode-toggle" />
            </div>

            {/* Background intensity */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Intensidad de fondo (blobs)" : "Background Intensity"}</p>
              <div className="flex gap-2">
                {[
                  { id: "off", label: es ? "Apagado" : "Off", emoji: "○" },
                  { id: "subtle", label: es ? "Suave" : "Subtle", emoji: "◑" },
                  { id: "normal", label: es ? "Normal" : "Normal", emoji: "●" },
                  { id: "vivid", label: es ? "Vivido" : "Vivid", emoji: "⬤" },
                ].map(b => (
                  <motion.button key={b.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`bg-${b.id}`}
                    onClick={() => changeBgIntensity(b.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all ${bgIntensity === b.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <span className="text-sm">{b.emoji}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1">{b.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Glass blur intensity - NEW */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-600">
                  {es ? "Intensidad del vidrio (blur)" : "Glass Blur Intensity"}
                  <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
                </p>
                <span className="text-xs font-bold text-slate-600">{glassBlur}px</span>
              </div>
              <Slider
                min={0} max={60} step={4}
                value={[glassBlur]}
                onValueChange={([val]) => changeGlassBlur(val)}
                data-testid="glass-blur-slider"
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>{es ? "Sin blur (0px)" : "No blur (0px)"}</span>
                <span>{es ? "Máximo (60px)" : "Maximum (60px)"}</span>
              </div>
            </div>

            {/* Custom gradient background */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-600">{es ? "Gradiente personalizado" : "Custom Gradient"}</p>
                <Toggle value={customBgEnabled} onChange={() => changeCustomBg(!customBgEnabled)} testId="custom-bg-toggle" />
              </div>
              <AnimatePresence>
                {customBgEnabled && (
                  <motion.div key="bg-colors" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="flex items-center gap-3 mt-2">
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={bgColor1}
                        onChange={e => changeCustomBg(true, e.target.value, bgColor2)}
                        className="w-9 h-9 rounded-xl cursor-pointer border-2 border-slate-200/60" />
                      <span className="text-[8px] text-slate-400">{es ? "Inicio" : "Start"}</span>
                    </div>
                    <div className="flex-1 h-8 rounded-xl border border-slate-200/60" style={{ background: `linear-gradient(135deg, ${bgColor1}, ${bgColor2})` }} />
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={bgColor2}
                        onChange={e => changeCustomBg(true, bgColor1, e.target.value)}
                        className="w-9 h-9 rounded-xl cursor-pointer border-2 border-slate-200/60" />
                      <span className="text-[8px] text-slate-400">{es ? "Final" : "End"}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Background image - NEW */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">
                {es ? "Imagen de fondo (URL)" : "Background Image (URL)"}
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
              </p>
              <div className="flex gap-2">
                <input type="url" value={bgImageInput}
                  onChange={e => setBgImageInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  data-testid="bg-image-input"
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { changeBgImage(bgImageInput); toast({ title: bgImageInput ? (es ? "Imagen aplicada ✓" : "Image applied ✓") : (es ? "Imagen eliminada" : "Image removed") }); }}
                  data-testid="bg-image-apply"
                  className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold">
                  {es ? "Aplicar" : "Apply"}
                </motion.button>
                {bgImage && (
                  <button onClick={() => { changeBgImage(""); setBgImageInput(""); toast({ title: es ? "Imagen eliminada" : "Image removed" }); }}
                    data-testid="bg-image-remove"
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    {es ? "Quitar" : "Remove"}
                  </button>
                )}
              </div>
              {bgImage && (
                <div className="mt-2 h-16 rounded-xl overflow-hidden border border-slate-200/60 relative">
                  <img src={bgImage} alt="Background preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{es ? "Vista previa" : "Preview"}</span>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">{es ? "Pega la URL de cualquier imagen (Unsplash, etc). Se mostrará detrás del contenido." : "Paste any image URL (Unsplash, etc). Shown behind app content."}</p>
            </div>

          </div>
        </Section>

        {/* ── 6. INTERFAZ Y ESPACIO ────────────────── */}
        <Section icon={AlignJustify} title={es ? "Interfaz y Espacio" : "Interface & Space"} desc={es ? "Ancho, barra lateral, densidad y formato" : "Width, sidebar, density and format"}>
          <div className="space-y-5">

            {/* Layout density - NEW */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">
                {es ? "Densidad del contenido" : "Content Density"}
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "comfortable", label: es ? "Cómodo" : "Comfortable", desc: es ? "Más espacio" : "More space", preview: [6, 4, 6] },
                  { id: "standard", label: es ? "Estándar" : "Standard", desc: es ? "Equilibrado" : "Balanced", preview: [4, 3, 4] },
                  { id: "compact", label: es ? "Compacto" : "Compact", desc: es ? "Más contenido" : "More content", preview: [2, 2, 2] },
                ].map(d => (
                  <motion.button key={d.id} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    data-testid={`density-${d.id}`}
                    onClick={() => { changeLayoutDensity(d.id); toast({ title: `${es ? "Densidad" : "Density"}: ${d.label}` }); }}
                    className="flex flex-col items-center py-3 rounded-2xl transition-all gap-2"
                    style={{ border: layoutDensity === d.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)", background: layoutDensity === d.id ? "var(--t-from)08" : "rgba(255,255,255,0.5)" }}>
                    <div className="flex flex-col gap-1 w-10">
                      {d.preview.map((h, i) => (
                        <div key={i} className="rounded-sm w-full" style={{ height: h, background: layoutDensity === d.id ? "var(--t-from)44" : "#e2e8f0" }} />
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black" style={{ color: layoutDensity === d.id ? "var(--t-from)" : "#64748b" }}>{d.label}</p>
                      <p className="text-[8px] text-slate-400">{d.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Sidebar style - NEW */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">
                {es ? "Estilo de barra lateral" : "Sidebar Style"}
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "normal", label: es ? "Normal" : "Normal", desc: es ? "Pegada al borde" : "Edge-aligned" },
                  { id: "floating", label: es ? "Flotante" : "Floating", desc: es ? "Con bordes" : "Rounded card" },
                  { id: "borderless", label: es ? "Sin borde" : "Borderless", desc: es ? "Solo fondo" : "No border" },
                ].map(s_ => (
                  <motion.button key={s_.id} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    data-testid={`sidebar-style-${s_.id}`}
                    onClick={() => { changeSidebarStyle(s_.id); toast({ title: `${es ? "Sidebar" : "Sidebar"}: ${s_.label}` }); }}
                    className="flex flex-col items-center py-3 rounded-2xl transition-all gap-2"
                    style={{ border: sidebarStyle === s_.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)", background: sidebarStyle === s_.id ? "var(--t-from)08" : "rgba(255,255,255,0.5)" }}>
                    <div className="w-10 h-8 relative flex">
                      <div className="h-full rounded-sm flex-shrink-0"
                        style={{
                          width: 12,
                          background: sidebarStyle === s_.id ? "var(--t-from)33" : "#e2e8f0",
                          border: sidebarStyle === s_.id ? `1px solid var(--t-from)44` : "1px solid #e2e8f0",
                          borderRadius: s_.id === "floating" ? 4 : s_.id === "borderless" ? 0 : 0,
                          marginLeft: s_.id === "floating" ? 2 : 0,
                          boxShadow: s_.id === "floating" ? "0 4px 8px rgba(0,0,0,0.12)" : "none",
                          borderWidth: s_.id === "borderless" ? 0 : 1,
                        }} />
                      <div className="flex-1 h-full ml-1 rounded-sm" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black" style={{ color: sidebarStyle === s_.id ? "var(--t-from)" : "#64748b" }}>{s_.label}</p>
                      <p className="text-[8px] text-slate-400">{s_.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Sidebar compact toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">{es ? "Barra lateral compacta" : "Compact Sidebar"}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{es ? "Solo iconos, sin etiquetas" : "Icons only, no labels"}</p>
              </div>
              <Toggle value={sidebarCompact} onChange={(v) => { changeSidebarCompact(v); toast({ title: v ? (es ? "Sidebar compacta ✓" : "Compact sidebar ✓") : (es ? "Sidebar expandida" : "Sidebar expanded") }); }} testId="sidebar-compact-toggle" />
            </div>

            {/* Page width */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Ancho del contenido" : "Content Width"}</p>
              <div className="flex gap-2">
                {[
                  { id: "narrow", label: es ? "Estrecho" : "Narrow", bar: "w-1/3" },
                  { id: "medium", label: es ? "Normal" : "Normal", bar: "w-1/2" },
                  { id: "wide", label: es ? "Ancho" : "Wide", bar: "w-3/4" },
                  { id: "full", label: es ? "Completo" : "Full", bar: "w-full" },
                ].map(w => (
                  <motion.button key={w.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`width-${w.id}`}
                    onClick={() => changePageWidth(w.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-2xl border-2 transition-all gap-2 ${pageWidth === w.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
                    <div className="w-full h-3 bg-slate-100 rounded-sm overflow-hidden flex items-center justify-center px-1">
                      <div className={`h-1.5 bg-slate-400 rounded-sm ${w.bar}`} />
                    </div>
                    <span className={`text-[9px] font-bold ${pageWidth === w.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{w.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Scrollbar */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2">{es ? "Barra de desplazamiento" : "Scrollbar"}</p>
              <div className="flex gap-2">
                {[
                  { id: "default", label: es ? "Normal" : "Default" },
                  { id: "thin", label: es ? "Fina" : "Thin" },
                  { id: "none", label: es ? "Oculta" : "Hidden" },
                ].map(s_ => (
                  <button key={s_.id} data-testid={`scrollbar-${s_.id}`}
                    onClick={() => changeScrollbar(s_.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border-2 transition-all ${scrollbar === s_.id ? "border-[var(--t-from)] text-[var(--t-from)] bg-white/80" : "border-slate-200/70 text-slate-500 bg-white/40"}`}>
                    {s_.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date format */}
            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Formato de fecha" : "Date Format"}</p>
              <div className="flex gap-2 flex-wrap">
                {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(fmt => (
                  <motion.button key={fmt} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    data-testid={`date-fmt-${fmt.replace(/\//g, "")}`}
                    onClick={() => { changeDateFormat(fmt); toast({ title: `Formato: ${fmt}` }); }}
                    className={`px-4 py-2 rounded-2xl border-2 text-xs font-bold transition-all ${dateFormat === fmt ? "border-[var(--t-from)] text-[var(--t-from)] bg-white/80" : "border-slate-200/70 text-slate-500 bg-white/40 hover:bg-white/60"}`}>
                    {fmt}
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── 7. TIPOS DE EVENTO ───────────────────── */}
        <Section icon={Pencil} title={es ? "Tipos de Evento" : "Event Types"} desc={es ? "Personaliza el icono y color de cada tipo" : "Customize icon and color for each type"}>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {es ? "Toca un tipo para cambiar su icono y color. Se aplica en toda la app." : "Tap a type to change its icon and color. Applied throughout the app."}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {EVENT_TYPES.map((typeName) => {
                const cfg = getEventConfig(typeName);
                const isActive = activeEventType === typeName;
                return (
                  <motion.button key={typeName}
                    whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { const next = isActive ? null : typeName; setActiveEventType(next); if (next) setTypeNameEdit(eventConfigs[next]?.name || ""); }}
                    data-testid={`event-type-edit-${typeName.replace(/\s+/g, "-").toLowerCase()}`}
                    className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all text-center"
                    style={{ background: isActive ? cfg.fg + "18" : cfg.bg || cfg.fg + "10", border: isActive ? `2px solid ${cfg.fg}` : `2px solid ${cfg.border || cfg.fg + "30"}` }}>
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: cfg.fg }}>
                        <CheckCircle size={9} className="text-white" />
                      </div>
                    )}
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: cfg.fg + "1c" }}>
                      <cfg.icon size={20} style={{ color: cfg.fg }} strokeWidth={1.8} />
                    </div>
                    <p className="text-[10px] font-bold leading-tight" style={{ color: cfg.fg }}>{getEventTypeName(typeName)}</p>
                    <div className="flex items-center gap-1">
                      <Pencil size={9} style={{ color: cfg.fg, opacity: 0.6 }} />
                      <span className="text-[9px] font-medium" style={{ color: cfg.fg, opacity: 0.6 }}>{es ? "editar" : "edit"}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {activeEventType && (() => {
              const cfg = getEventConfig(activeEventType);
              const customCfg = eventConfigs[activeEventType] || {};
              return (
                <motion.div key={activeEventType} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                  className="mt-3 rounded-2xl overflow-hidden"
                  style={{ background: cfg.fg + "08", border: `1.5px solid ${cfg.fg}30` }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: cfg.fg + "20" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.fg + "1c" }}>
                        <cfg.icon size={15} style={{ color: cfg.fg }} />
                      </div>
                      <p className="text-sm font-black text-slate-800">{typeNameEdit || activeEventType}</p>
                    </div>
                    {eventConfigs[activeEventType] && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => resetEventTypeConfig(activeEventType)}
                        data-testid={`event-type-reset-${activeEventType.replace(/\s+/g, "-").toLowerCase()}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        style={{ background: "rgba(255,255,255,0.6)" }}>
                        <RotateCcw size={10} />{es ? "Restaurar" : "Reset"}
                      </motion.button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{es ? "Nombre" : "Name"}</p>
                      <input type="text" value={typeNameEdit}
                        onChange={(e) => { setTypeNameEdit(e.target.value); updateEventTypeConfig(activeEventType, { name: e.target.value || undefined }); }}
                        placeholder={activeEventType}
                        data-testid={`event-type-name-input-${activeEventType?.replace(/\s+/g, "-").toLowerCase()}`}
                        className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 placeholder-slate-300"
                        style={{ "--tw-ring-color": cfg.fg + "80" }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">{es ? "Color" : "Color"}</p>
                      <div className="grid grid-cols-10 gap-1.5">
                        {AVAILABLE_COLORS.map(color => {
                          const isSel = (customCfg.fg || cfg.fg) === color;
                          return (
                            <motion.button key={color} whileHover={{ scale: 1.2, y: -1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => updateEventTypeConfig(activeEventType, { fg: color })}
                              data-testid={`color-swatch-${color.replace("#", "")}`}
                              title={color}
                              className="w-full aspect-square rounded-lg transition-all relative"
                              style={{ background: color, boxShadow: isSel ? `0 0 0 2px white, 0 0 0 4px ${color}` : `0 2px 4px ${color}55`, transform: isSel ? "scale(1.15)" : undefined }}>
                              {isSel && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle size={10} className="text-white drop-shadow" /></div>}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">{es ? "Icono" : "Icon"}</p>
                      <div className="grid grid-cols-9 gap-1.5">
                        {AVAILABLE_ICONS.map(({ name, component: IconComp }) => {
                          const isSel = (customCfg.iconName || cfg.iconName) === name;
                          return (
                            <motion.button key={name} whileHover={{ scale: 1.15, y: -1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => updateEventTypeConfig(activeEventType, { iconName: name })}
                              data-testid={`icon-pick-${name.toLowerCase()}`}
                              title={name}
                              className="w-full aspect-square rounded-xl flex items-center justify-center transition-all"
                              style={{ background: isSel ? cfg.fg : "rgba(255,255,255,0.6)", border: isSel ? `2px solid ${cfg.fg}` : "2px solid rgba(226,232,240,0.7)", boxShadow: isSel ? `0 4px 12px ${cfg.fg}44` : undefined }}>
                              <IconComp size={15} style={{ color: isSel ? "white" : "#64748b" }} strokeWidth={1.8} />
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
        </Section>

        {/* ── 8. DISEÑO DE PDF ─────────────────────── */}
        <Section icon={Sparkles} title={es ? "Diseño de PDF" : "PDF Design"} desc={es ? "Estilo visual de todos los PDFs generados" : "Visual style for all generated PDFs"}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              {Object.values(PDF_THEMES).map((t) => {
                const isActive = pdfTheme === t.id;
                return (
                  <motion.button key={t.id} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => changePdfTheme(t.id)} data-testid={`pdf-theme-${t.id}`}
                    className="flex flex-col rounded-2xl overflow-hidden transition-all"
                    style={{ border: isActive ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.7)" }}>
                    <div className="h-20 relative overflow-hidden" style={{ background: t.preview.headerBg }}>
                      {t.id === "claro" && <div className="absolute top-0 left-0 right-0 h-2" style={{ background: t.preview.accentBar }} />}
                      {t.id === "elegante" && <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: t.preview.accentBar }} />}
                      {t.id === "oscuro" && <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: t.preview.accentBar }} />}
                      <div className="absolute left-2 top-3 w-8 h-5 rounded opacity-30 bg-white" />
                      <div className="absolute right-2 top-3 space-y-1">
                        <div className="h-1.5 w-14 rounded-full opacity-40 bg-white" />
                        <div className="h-1 w-10 rounded-full opacity-25 bg-white" />
                      </div>
                    </div>
                    <div className="flex-1 p-2 space-y-1" style={{ background: "white" }}>
                      <div className="h-2 rounded" style={{ background: t.preview.sectionBg }} />
                      <div className="h-1 rounded bg-gray-100 w-4/5" />
                    </div>
                    <div className="px-2 pb-2 flex items-center justify-between" style={{ background: isActive ? "rgba(255,255,255,0.8)" : "white" }}>
                      <p className="text-[10px] font-black text-slate-700">{t.name}</p>
                      {isActive && <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--t-from)" }}><CheckCircle size={9} className="text-white" /></div>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleExportPDF} disabled={pdfLoading}
              data-testid="export-pdf-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl btn-primary text-white text-sm font-bold disabled:opacity-60">
              <Sparkles size={14} />
              {pdfLoading ? (es ? "Generando..." : "Generating...") : (es ? "Exportar todas las reservas a PDF" : "Export all reservations to PDF")}
            </motion.button>
          </div>
        </Section>

        {/* ── 9. LOGO Y MARCA ──────────────────────── */}
        <Section icon={ImageIcon} title={es ? "Logo y Marca" : "Logo & Branding"} desc={es ? "Logo para la app y PDFs" : "App and PDF logo"}>
          <div className="space-y-4">

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">{es ? "Logo de la app (sidebar)" : "App logo (sidebar)"}</p>
              {logoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
                  <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain max-w-[120px] rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{es ? "Logo cargado" : "Logo loaded"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{es ? "Aparece en sidebar y móvil" : "Shown in sidebar and mobile"}</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => logoInputRef.current?.click()} data-testid="logo-change-btn"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                      <Upload size={13} className="text-slate-600" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => updateLogoSettings({ url: null })} data-testid="logo-remove-btn"
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                      <Trash2 size={13} className="text-red-500" />
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                  onClick={() => logoInputRef.current?.click()} data-testid="logo-upload-btn"
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 hover:border-slate-300 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ImageIcon size={18} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-600">{es ? "Subir logo" : "Upload logo"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG — {es ? "se comprime automáticamente" : "auto-compressed"}</p>
                  </div>
                </motion.button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} data-testid="logo-file-input" />
            </div>

            {logoUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{es ? "Tamaño en sidebar" : "Sidebar size"}</p>
                  <span className="text-xs font-bold text-slate-600">{logoSize}px</span>
                </div>
                <Slider min={24} max={80} step={4}
                  value={[Math.min(logoSize, 80)]}
                  onValueChange={([val]) => updateLogoSettings({ size: val })}
                  data-testid="logo-size-slider" className="w-full" />
                <div className="flex justify-between text-[9px] text-slate-400"><span>24px</span><span>80px</span></div>
              </div>
            )}

            <div className="border-t border-white/40 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700">{es ? "Usar logo en PDFs" : "Use logo in PDFs"}</p>
                  <p className="text-[10px] text-slate-400">{es ? "Aparece en el encabezado de cada PDF" : "Shown in PDF headers"}</p>
                </div>
                <Switch checked={usePdfLogo} onCheckedChange={(val) => updateLogoSettings({ usePdf: val })} data-testid="use-pdf-logo-toggle" />
              </div>

              {usePdfLogo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pl-1 border-l-2 border-slate-200 ml-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{es ? "Logo diferente para PDFs" : "Different PDF logo"}</p>
                      <p className="text-[10px] text-slate-400">{es ? "Usa una imagen distinta en documentos" : "Different image for documents"}</p>
                    </div>
                    <Switch checked={useCustomPdfLogo} onCheckedChange={(val) => updateLogoSettings({ useCustomPdf: val })} data-testid="use-custom-pdf-logo-toggle" />
                  </div>
                  {useCustomPdfLogo && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{es ? "Logo para PDFs" : "PDF Logo"}</p>
                      {pdfLogoUrl ? (
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/60">
                          <img src={pdfLogoUrl} alt="PDF Logo" className="h-10 w-auto object-contain max-w-[100px] rounded-lg" />
                          <div className="flex-1 min-w-0"><p className="text-[10px] font-semibold text-slate-600">{es ? "Logo PDF cargado" : "PDF Logo loaded"}</p></div>
                          <div className="flex gap-2">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => pdfLogoInputRef.current?.click()} data-testid="pdf-logo-change-btn"
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                              <Upload size={12} className="text-slate-600" />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => updateLogoSettings({ pdfUrl: null })} data-testid="pdf-logo-remove-btn"
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                              <Trash2 size={12} className="text-red-500" />
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                          onClick={() => pdfLogoInputRef.current?.click()} data-testid="pdf-logo-upload-btn"
                          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 transition-all text-xs text-slate-500 font-semibold">
                          <Upload size={13} />{es ? "Subir logo para PDFs" : "Upload PDF logo"}
                        </motion.button>
                      )}
                      <input ref={pdfLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePdfLogoUpload} data-testid="pdf-logo-file-input" />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

          </div>
        </Section>

      </motion.div>
    </div>
  );
}
