import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, CheckCircle, Zap, Pencil, RotateCcw, Upload, ImageIcon, Trash2,
  Sparkles, Layers, SlidersHorizontal, Wind, Maximize2, Monitor, Type, Moon,
  AlignJustify, BarChart2, LayoutGrid, Shield, MousePointer2, FileText, Columns, Tag, Plus,
} from "lucide-react";
import { useSettings, THEMES, PRESETS } from "@/context/SettingsContext";
import { getEventConfig, getEventTypeName, AVAILABLE_ICONS, AVAILABLE_COLORS, EVENT_TYPES } from "@/lib/eventConfig";
import { useToast } from "@/hooks/use-toast";
import { generateAllReservationsPDF, PDF_THEMES } from "@/lib/generatePDF";
import { getReservations } from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function Section({ icon: Icon, title, desc, children, badge, isNew }) {
  return (
    <motion.div variants={fadeIn} className="glass rounded-3xl p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center shrink-0">
            <Icon size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {title}
              {isNew && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 uppercase tracking-wide">NUEVO</span>}
            </h2>
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
    <button onClick={() => onChange(!value)} data-testid={testId}
      className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${value ? "btn-primary" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? "left-[26px]" : "left-0.5"}`} />
    </button>
  );
}

function OptionRow({ label, options, current, onChange, testPrefix, cols = 4, defaultValue }) {
  const isDirty = defaultValue !== undefined && current !== defaultValue;
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-black text-slate-600">{label}</p>
        {isDirty && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => onChange(defaultValue)}
            className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            title="Restablecer valor de fábrica">
            <RotateCcw size={9} /> fábrica
          </motion.button>
        )}
      </div>
      <div className={`grid grid-cols-${cols} gap-2`}>
        {options.map(o => (
          <motion.button key={o.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            data-testid={`${testPrefix}-${o.id}`} onClick={() => onChange(o.id)}
            className={`flex flex-col items-center py-2.5 px-1 rounded-2xl border-2 transition-all gap-1.5 ${current === o.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/40 hover:bg-white/60"}`}>
            {o.preview && <div className="flex items-center justify-center">{o.preview}</div>}
            <span className={`text-[9px] font-bold text-center leading-tight ${current === o.id ? "text-[var(--t-from)]" : "text-slate-500"}`}>{o.label}</span>
            {o.hint && <span className="text-[8px] text-slate-400 text-center leading-tight">{o.hint}</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function StyleSlider({ label, value, min, max, step = 1, onChange, unit = "", testId, isNew, defaultValue }) {
  const [inputVal, setInputVal] = React.useState(String(value));
  React.useEffect(() => { setInputVal(String(value)); }, [value]);
  const isDirty = defaultValue !== undefined && value !== defaultValue;

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setInputVal(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black text-slate-600 flex items-center gap-2">
          {label}
          {isNew && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">NUEVO</span>}
        </p>
        <div className="flex items-center gap-2">
          {isDirty && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => onChange(defaultValue)}
              className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              title="Restablecer valor de fábrica">
              <RotateCcw size={9} /> fábrica
            </motion.button>
          )}
          <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-xl px-2 py-0.5">
            <input
              type="number" min={min} max={max} step={step}
              value={inputVal}
              onChange={handleInputChange}
              data-testid={`${testId}-input`}
              className="w-10 text-xs font-bold text-slate-700 bg-transparent focus:outline-none text-right"
            />
            {unit && <span className="text-[9px] text-slate-400">{unit}</span>}
          </div>
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} data-testid={testId} className="w-full" />
      <div className="flex justify-between text-[9px] text-slate-400 mt-1"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    </div>
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
    glassBlur, changeGlassBlur,
    layoutDensity, changeLayoutDensity,
    pageTransition, changePageTransition,
    iconSize, changeIconSize,
    sidebarStyle, changeSidebarStyle,
    bgImage, changeBgImage,
    advancedStyle, changeAdvancedStyle,
    eventConfigs, updateEventTypeConfig, resetEventTypeConfig,
    logoUrl, pdfLogoUrl, logoSize, usePdfLogo, useCustomPdfLogo, updateLogoSettings,
    customLabels, changeCustomLabel, resetCustomLabels,
    customStatuses, activeStatuses,
    changeStatusLabel, changeStatusColor, addCustomStatus, removeCustomStatus, resetCustomStatuses,
    islandMargins, changeIslandMargins,
  } = useSettings();

  const { toast } = useToast();
  const [accentColorInput, setAccentColorInput] = useState(customAccent || "");
  const [bgImageInput, setBgImageInput] = useState(bgImage || "");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeEventType, setActiveEventType] = useState(null);
  const [typeNameEdit, setTypeNameEdit] = useState("");
  const [panelSize, setPanelSize] = useState("medium"); // small | medium | full
  const logoInputRef = React.useRef();
  const pdfLogoInputRef = React.useRef();

  const as = advancedStyle || {};
  const cs = (key, value) => { changeAdvancedStyle(key, value); toast({ title: `✓ Actualizado` }); };

  const es = language === "es";

  const compressImage = (file, maxW = 500, maxH = 250, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * ratio; canvas.height = img.height * ratio;
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
    const file = e.target.files?.[0]; if (!file) return;
    try { const b64 = await compressImage(file); updateLogoSettings({ url: b64 }); }
    catch { toast({ title: "Error al cargar imagen", variant: "destructive" }); }
    e.target.value = "";
  };
  const handlePdfLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const b64 = await compressImage(file); updateLogoSettings({ pdfUrl: b64 }); }
    catch { toast({ title: "Error al cargar imagen", variant: "destructive" }); }
    e.target.value = "";
  };
  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) { toast({ title: "No hay reservas", variant: "destructive" }); return; }
      const effectiveLogo = usePdfLogo ? (useCustomPdfLogo && pdfLogoUrl ? pdfLogoUrl : logoUrl || undefined) : null;
      await generateAllReservationsPDF(reservations, () => {}, effectiveLogo, pdfTheme);
      toast({ title: `PDF generado — ${reservations.length} reservas ✓` });
    } catch (err) { toast({ title: err.message || "Error al generar PDF", variant: "destructive" }); }
    finally { setPdfLoading(false); }
  };

  const PANEL_SIZES = {
    small:  "max-w-lg",
    medium: "max-w-2xl",
    full:   "max-w-5xl",
  };

  return (
    <div className={`px-6 py-8 ${PANEL_SIZES[panelSize]} mx-auto transition-all duration-300`}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {es ? "Apariencia" : "Appearance"}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">
              {es ? "50+ opciones para personalizar cada detalle visual" : "50+ options to customize every visual detail"}
            </p>
          </div>
          {/* Panel size control */}
          <div className="flex items-center gap-2 bg-white/50 border border-white/70 rounded-2xl p-1 shadow-sm shrink-0">
            <span className="text-[9px] font-black text-slate-400 px-2 uppercase tracking-widest">{es ? "Tamaño" : "Size"}</span>
            {[
              { id: "small",  label: es ? "Pequeño" : "Small",  icon: "▪" },
              { id: "medium", label: es ? "Medio" : "Medium",   icon: "▫" },
              { id: "full",   label: es ? "Completo" : "Full",  icon: "□" },
            ].map(s => (
              <motion.button key={s.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                data-testid={`panel-size-${s.id}`}
                onClick={() => setPanelSize(s.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${panelSize === s.id ? "btn-primary text-white shadow-sm" : "text-slate-500 hover:bg-white/70"}`}>
                <span className="text-[10px]">{s.icon}</span> {s.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

        {/* ═══════════════════════════════════════════════════════════════
            1. PALETA DE COLORES
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Palette} title={es ? "Paleta de Colores" : "Color Palette"} desc={es ? "Acento, presets, saturación y gradientes" : "Accent, presets, saturation and gradients"}>
          <div className="space-y-6">

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{es ? "Color de Acento" : "Accent Color"}</p>
              <div className="grid grid-cols-6 gap-3">
                {Object.values(THEMES).map(t => (
                  <motion.button key={t.id} whileHover={{ scale: 1.14, y: -2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => changeTheme(t.id)} data-testid={`theme-${t.id}`} title={t.name}
                    className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-full transition-all duration-300"
                      style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, boxShadow: theme === t.id ? `0 0 0 3px white, 0 0 0 5px ${t.from}, 0 8px 20px ${t.shadow}` : `0 4px 12px ${t.shadow}`, transform: theme === t.id ? "scale(1.15)" : "scale(1)" }} />
                    <span className="text-[10px] font-bold text-slate-500">{t.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/40" />

            <div>
              <p className="text-xs font-black text-slate-600 mb-2">{es ? "Color hex personalizado" : "Custom Hex Color"}</p>
              <div className="flex items-center gap-3">
                <input type="color" value={accentColorInput || "#6366f1"} onChange={e => setAccentColorInput(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-200/60 bg-transparent" />
                <input type="text" value={accentColorInput} onChange={e => setAccentColorInput(e.target.value)} placeholder="#6366f1" maxLength={7} className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { changeCustomAccent(accentColorInput); toast({ title: "Color aplicado ✓" }); }} data-testid="custom-accent-apply" className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold">{es ? "Aplicar" : "Apply"}</motion.button>
                {customAccent && <button onClick={() => { changeCustomAccent(""); setAccentColorInput(""); toast({ title: "Color restablecido" }); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Reset</button>}
              </div>
            </div>

            <div className="border-t border-white/40" />

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{es ? "Diseño de la Aplicación" : "App Design"}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "aurora", label: "Glass Aurora", hint: es ? "Glassmorphismo" : "Glassmorphism", bg: "linear-gradient(135deg,#eff0ff,#fce7f3,#e0f2fe)" },
                  { id: "crystal", label: "Crystal", hint: es ? "Nítido" : "Sharp", bg: "#eef2f7" },
                  { id: "minimal", label: "Minimal", hint: es ? "Sin fondo" : "No bg", bg: "#f1f5f9" },
                ].map(p => (
                  <motion.button key={p.id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => changePreset(p.id)} data-testid={`preset-${p.id}`}
                    className="relative flex flex-col rounded-2xl overflow-hidden text-left transition-all"
                    style={{ border: preset === p.id ? "2px solid var(--t-from)" : "2px solid rgba(226,232,240,0.8)" }}>
                    <div className="relative h-16 w-full overflow-hidden" style={{ background: p.bg }}>
                      <div className="absolute inset-x-2 top-2 bottom-1.5 rounded-lg" style={{ background: p.id === "aurora" ? "rgba(255,255,255,0.45)" : p.id === "crystal" ? "rgba(255,255,255,0.9)" : "#fff", backdropFilter: p.id === "aurora" ? "blur(10px)" : "none", border: p.id === "aurora" ? "1px solid rgba(255,255,255,0.7)" : "1px solid #e2e8f0" }}>
                        <div style={{ height: 3, width: "65%", background: p.id === "aurora" ? "rgba(99,102,241,0.35)" : "#e2e8f0", borderRadius: 4, margin: "5px 5px 3px" }} />
                        <div style={{ height: 2, width: "45%", background: "#f1f5f9", borderRadius: 4, margin: "0 5px" }} />
                      </div>
                      {preset === p.id && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full btn-primary flex items-center justify-center"><CheckCircle size={10} className="text-white" /></div>}
                    </div>
                    <div className="p-2.5 bg-white/70">
                      <p className="text-[11px] font-black text-slate-800">{p.label}</p>
                      <p className="text-[9px] text-slate-400">{p.hint}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <OptionRow label={es ? "Saturación de color" : "Color Saturation"} testPrefix="sat"
              current={saturation} onChange={changeSaturation} cols={3}
              options={[
                { id: "muted",  label: es ? "Apagado" : "Muted",  preview: <div className="flex gap-0.5 opacity-40">{["bg-red-400","bg-yellow-400","bg-green-400"].map(c=><div key={c} className={`w-2 h-3 rounded-sm ${c}`}/>)}</div> },
                { id: "normal", label: es ? "Normal" : "Normal",  preview: <div className="flex gap-0.5 opacity-75">{["bg-red-400","bg-yellow-400","bg-green-400"].map(c=><div key={c} className={`w-2 h-3 rounded-sm ${c}`}/>)}</div> },
                { id: "vivid",  label: es ? "Vívido" : "Vivid",   preview: <div className="flex gap-0.5">{["bg-red-500","bg-yellow-400","bg-green-500"].map(c=><div key={c} className={`w-2 h-3 rounded-sm ${c}`}/>)}</div> },
              ]} />

            <OptionRow label={`${es ? "Estilo del botón primario" : "Primary Button Style"}  ★`} testPrefix="btn-variant"
              current={as.btnVariant || "primary"} onChange={v => cs("btnVariant", v)} cols={4}
              options={[
                { id: "primary",  label: es ? "Relleno" : "Filled",   preview: <div className="w-12 h-4 rounded-full btn-primary" /> },
                { id: "outline",  label: "Outline",  preview: <div className="w-12 h-4 rounded-full border-2 border-[var(--t-from)]" /> },
                { id: "ghost",    label: "Ghost",    preview: <div className="w-12 h-4 rounded-full bg-slate-100" /> },
                { id: "gradient", label: es ? "Degradado" : "Gradient",  preview: <div className="w-12 h-4 rounded-full" style={{ background: "linear-gradient(90deg,var(--t-from),var(--t-to))" }} /> },
              ]} />

            <OptionRow label={es ? "Color de selección de texto" : "Text Selection Color"} testPrefix="sel-color"
              current={as.selectionColor || "accent"} onChange={v => cs("selectionColor", v)} cols={4}
              options={[
                { id: "accent",   label: es ? "Acento" : "Accent",   preview: <div className="w-8 h-3 rounded" style={{ background: "var(--t-from)" }} /> },
                { id: "yellow",   label: es ? "Amarillo" : "Yellow",  preview: <div className="w-8 h-3 rounded bg-yellow-300" /> },
                { id: "emerald",  label: es ? "Verde" : "Green",     preview: <div className="w-8 h-3 rounded bg-emerald-300" /> },
                { id: "none",     label: es ? "Ninguno" : "None",    preview: <div className="w-8 h-3 rounded bg-slate-200" /> },
              ]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            2. TIPOGRAFÍA E ICONOS
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Type} title={es ? "Tipografía e Iconos" : "Typography & Icons"} desc={es ? "Fuente, tamaño, espacio entre letras y más" : "Font, size, letter spacing and more"}>
          <div className="space-y-5">

            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Familia de fuente" : "Font Family"}</p>
              <div className="flex flex-wrap gap-2">
                {[{ id:"satoshi",label:"Satoshi"},{id:"cabinet",label:"Cabinet"},{id:"outfit",label:"Outfit"},{id:"space",label:"Space Grotesk"},{id:"poppins",label:"Poppins"},{id:"sora",label:"Sora"},{id:"dmsans",label:"DM Sans"},{id:"mono",label:"Monospace"}].map(f => (
                  <motion.button key={f.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} data-testid={`font-${f.id}`}
                    onClick={() => { changeFontFamily(f.id); toast({ title: `Fuente: ${f.label}` }); }}
                    className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${fontFamily === f.id ? "border-[var(--t-from)] bg-white/80 text-[var(--t-from)]" : "border-slate-200/70 bg-white/40 text-slate-600 hover:bg-white/60"}`}>
                    {f.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <OptionRow label={es ? "Tamaño de texto" : "Text Size"} testPrefix="fontscale" current={fontScale} onChange={v => { changeFontScale(v); toast({ title: `Texto: ${v}` }); }} cols={3} defaultValue="md"
              options={[{id:"compact",label:es?"Compacto":"Compact",hint:"88%"},{id:"normal",label:es?"Normal":"Normal",hint:"100%"},{id:"large",label:es?"Grande":"Large",hint:"110%"}]} />

            <OptionRow label={es ? "Tamaño de iconos (sidebar)" : "Icon Size (sidebar)"} testPrefix="icon-size"
              current={iconSize} onChange={v => { changeIconSize(v); toast({ title: `Iconos: ${v}` }); }} cols={3}
              options={[
                { id:"small",  label:es?"Pequeño":"Small",  preview: <Type size={12} className="text-slate-400" /> },
                { id:"medium", label:es?"Normal":"Normal",  preview: <Type size={18} className="text-slate-400" /> },
                { id:"large",  label:es?"Grande":"Large",   preview: <Type size={22} className="text-slate-400" /> },
              ]} />

            <OptionRow label={es ? "Espacio entre letras" : "Letter Spacing"} testPrefix="letter-spacing"
              current={as.letterSpacing || "normal"} onChange={v => cs("letterSpacing", v)} cols={4}
              options={[
                { id:"tight",  label:es?"Apretado":"Tight",  preview: <span className="text-[9px] font-bold" style={{letterSpacing:"-0.04em"}}>Aa</span> },
                { id:"normal", label:es?"Normal":"Normal",   preview: <span className="text-[9px] font-bold">Aa</span> },
                { id:"wide",   label:es?"Amplio":"Wide",     preview: <span className="text-[9px] font-bold" style={{letterSpacing:"0.08em"}}>Aa</span> },
                { id:"wider",  label:es?"Más":"Wider",      preview: <span className="text-[9px] font-bold" style={{letterSpacing:"0.15em"}}>Aa</span> },
              ]} />

            <OptionRow label={es ? "Altura de línea" : "Line Height"} testPrefix="line-height"
              current={as.lineHeight || "normal"} onChange={v => cs("lineHeight", v)} cols={4}
              options={[
                { id:"tight",   label:es?"Compacto":"Tight",   preview: <div className="flex flex-col gap-0 w-8">{[1,2,3].map(i=><div key={i} className="h-1 bg-slate-400 rounded"/>)}</div> },
                { id:"normal",  label:es?"Normal":"Normal",    preview: <div className="flex flex-col gap-0.5 w-8">{[1,2,3].map(i=><div key={i} className="h-1 bg-slate-400 rounded"/>)}</div> },
                { id:"relaxed", label:es?"Suelto":"Relaxed",   preview: <div className="flex flex-col gap-1 w-8">{[1,2,3].map(i=><div key={i} className="h-1 bg-slate-400 rounded"/>)}</div> },
                { id:"loose",   label:es?"Amplio":"Loose",     preview: <div className="flex flex-col gap-1.5 w-8">{[1,2,3].map(i=><div key={i} className="h-1 bg-slate-400 rounded"/>)}</div> },
              ]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            3. ANIMACIONES Y MOVIMIENTO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Zap} title={es ? "Animaciones y Movimiento" : "Animations & Motion"} desc={es ? "Efectos, velocidad, transiciones y cursor" : "Effects, speed, transitions and cursor"}>
          <div className="space-y-5">

            <motion.div whileHover={{ scale: 1.005 }} className="flex items-center justify-between bg-white/50 rounded-2xl px-5 py-3.5 cursor-pointer" onClick={() => changeAnimations(!animations)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: animations ? "var(--t-from)18" : "#f1f5f9" }}>
                  <Zap size={15} style={{ color: animations ? "var(--t-from)" : "#94a3b8" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{es ? "Efectos y transiciones" : "Effects & transitions"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{animations ? (es ? "Activadas" : "Enabled") : (es ? "Desactivadas" : "Disabled")}</p>
                </div>
              </div>
              <Toggle value={animations} onChange={changeAnimations} testId="animations-toggle" />
            </motion.div>

            <OptionRow label={es ? "Velocidad de animaciones" : "Animation Speed"} testPrefix="anim" current={animSpeed} onChange={changeAnimSpeed} cols={4} defaultValue="normal"
              options={[{id:"slow",label:es?"Lenta":"Slow",preview:<span>🐢</span>},{id:"normal",label:es?"Normal":"Normal",preview:<span>✦</span>},{id:"fast",label:es?"Rápida":"Fast",preview:<span>⚡</span>},{id:"instant",label:es?"Instante":"Instant",preview:<span>⚡⚡</span>}]} />

            <OptionRow label={es ? "Transición de páginas" : "Page Transition"} testPrefix="page-transition" current={pageTransition} onChange={v => { changePageTransition(v); toast({ title: `Transición: ${v}` }); }} cols={4}
              options={[
                { id:"fade",  label:"Fade",  preview: <div className="w-8 h-5 rounded bg-gradient-to-br from-[var(--t-from)] to-[var(--t-to)] opacity-50" /> },
                { id:"slide", label:"Slide", preview: <div className="w-8 h-5 rounded bg-gradient-to-br from-[var(--t-from)] to-[var(--t-to)]" style={{transform:"translateX(5px)"}} /> },
                { id:"zoom",  label:"Zoom",  preview: <div className="w-8 h-5 rounded bg-gradient-to-br from-[var(--t-from)] to-[var(--t-to)]" style={{transform:"scale(0.82)"}} /> },
                { id:"none",  label:es?"Ninguna":"None", preview: <div className="w-8 h-5 rounded bg-slate-200" /> },
              ]} />

            <OptionRow label={es ? "Efecto al pasar el cursor" : "Hover Effect"} testPrefix="hover" current={hoverEffect} onChange={changeHoverEffect} cols={4}
              options={[{id:"normal",label:"Normal"},{id:"glow",label:"Glow"},{id:"lift",label:es?"Elevar":"Lift"},{id:"scale",label:"Scale"}]} />

            <OptionRow label={es ? "Animación al hacer clic" : "Click Animation"} testPrefix="btn-click"
              current={as.btnClickAnim || "scale"} onChange={v => cs("btnClickAnim", v)} cols={4}
              options={[{id:"none",label:"None"},{id:"scale",label:"Scale"},{id:"ripple",label:"Ripple"},{id:"bounce",label:"Bounce"}]} />

            <OptionRow label={es ? "Animación de carga" : "Loading Animation"} testPrefix="loading-anim"
              current={as.loadingAnim || "spin"} onChange={v => cs("loadingAnim", v)} cols={4}
              options={[
                { id:"spin",  label:"Spin",    preview: <div className="w-4 h-4 rounded-full border-2 border-[var(--t-from)] border-t-transparent animate-spin" /> },
                { id:"dots",  label:"Dots",    preview: <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full btn-primary" />)}</div> },
                { id:"pulse", label:"Pulse",   preview: <div className="w-4 h-4 rounded-full btn-primary animate-pulse" /> },
                { id:"wave",  label:"Wave",    preview: <div className="flex gap-0.5 items-end">{[2,4,3,5,2].map((h,i)=><div key={i} className="w-1 rounded-full btn-primary" style={{height:h*2}} />)}</div> },
              ]} />

            <OptionRow label={es ? "Posición de notificaciones toast" : "Toast Position"} testPrefix="toast-pos"
              current={as.toastPosition || "bottom-right"} onChange={v => cs("toastPosition", v)} cols={4}
              options={[{id:"top-right",label:es?"Arriba-Der":"Top Right"},{id:"top-left",label:es?"Arriba-Izq":"Top Left"},{id:"bottom-right",label:es?"Abajo-Der":"Bottom Right"},{id:"bottom-center",label:es?"Abajo-C":"Bottom"}]} />

            <OptionRow label={es ? "Cursor del mouse" : "Mouse Cursor"} testPrefix="cursor"
              current={as.cursorStyle || "default"} onChange={v => cs("cursorStyle", v)} cols={4}
              options={[{id:"default",label:es?"Normal":"Default"},{id:"large",label:es?"Grande":"Large"},{id:"crosshair",label:"Cross"},{id:"dot",label:"Dot"}]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            4. FORMAS Y BORDES
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Layers} title={es ? "Formas y Bordes" : "Shapes & Borders"} desc={es ? "Bordes, tarjetas, botones, separadores" : "Borders, cards, buttons, dividers"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Estilo de bordes" : "Border Style"} testPrefix="radius" current={radius} onChange={changeRadius} cols={3}
              options={[
                { id:"rounded", label:es?"Suaves":"Soft",   preview: <div className="w-10 h-6 rounded-xl border-2 border-slate-300 bg-white/60" /> },
                { id:"medium",  label:es?"Medios":"Medium", preview: <div className="w-10 h-6 rounded-md border-2 border-slate-300 bg-white/60" /> },
                { id:"sharp",   label:es?"Rectos":"Sharp",  preview: <div className="w-10 h-6 rounded-sm border-2 border-slate-300 bg-white/60" /> },
              ]} />

            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Estilo de tarjetas" : "Card Style"}</p>
              <div className="grid grid-cols-5 gap-2">
                {[{id:"glass",label:es?"Vidrio":"Glass"},{id:"solid",label:es?"Sólido":"Solid"},{id:"minimal",label:es?"Mínimal":"Minimal"},{id:"neon",label:"Neon"},{id:"frosted",label:es?"Escarcha":"Frosted"}].map(c => (
                  <motion.button key={c.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} data-testid={`card-${c.id}`}
                    onClick={() => { changeCardStyle(c.id); toast({ title: `Tarjetas: ${c.label}` }); }}
                    className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all gap-1.5 ${cardStyle === c.id ? "border-[var(--t-from)] bg-white/80" : "border-slate-200/70 bg-white/30 hover:bg-white/60"}`}>
                    <div className={`w-8 h-5 rounded-lg border ${c.id==="glass"?"bg-white/60 backdrop-blur-sm border-white/60":c.id==="solid"?"bg-white border-slate-200":c.id==="minimal"?"bg-transparent border-dashed border-slate-300":c.id==="neon"?"bg-slate-800 border-indigo-500":"bg-white/20 backdrop-blur border-white/80"}`} />
                    <span className={`text-[9px] font-black ${cardStyle === c.id ? "text-[var(--t-from)]" : "text-slate-600"}`}>{c.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <OptionRow label={es ? "Estilo de botones" : "Button Style"} testPrefix="btn-corner" current={btnCorner} onChange={changeBtnCorner} cols={3} defaultValue="rounded"
              options={[
                { id:"rounded", label:es?"Redondeado":"Rounded", preview: <div className="w-12 h-4 rounded-xl btn-primary" /> },
                { id:"pill",    label:"Pill",                    preview: <div className="w-12 h-4 rounded-full btn-primary" /> },
                { id:"sharp",   label:es?"Angular":"Sharp",      preview: <div className="w-12 h-4 rounded-sm btn-primary" /> },
              ]} />

            <OptionRow label={es ? "Estilo de separadores" : "Divider Style"} testPrefix="divider"
              current={as.dividerStyle || "solid"} onChange={v => cs("dividerStyle", v)} cols={5}
              options={[
                { id:"solid",    label:es?"Sólido":"Solid",    preview: <div className="w-10 h-px bg-slate-400" /> },
                { id:"dashed",   label:"Dashed",               preview: <div className="w-10 h-px border-t border-dashed border-slate-400" /> },
                { id:"dotted",   label:"Dotted",               preview: <div className="w-10 h-px border-t border-dotted border-slate-400" /> },
                { id:"gradient", label:es?"Degradado":"Grad",  preview: <div className="w-10 h-px" style={{background:"linear-gradient(90deg,transparent,var(--t-from),transparent)"}} /> },
                { id:"none",     label:es?"Ninguno":"None",    preview: <div className="w-10 h-px" /> },
              ]} />

            <OptionRow label={es ? "Forma de etiquetas/badges" : "Badge Shape"} testPrefix="badge-shape"
              current={as.badgeShape || "pill"} onChange={v => cs("badgeShape", v)} cols={3}
              options={[
                { id:"pill",   label:"Pill",   preview: <div className="px-2 py-0.5 rounded-full text-[8px] bg-[var(--t-from)] text-white font-bold">Tag</div> },
                { id:"chip",   label:"Chip",   preview: <div className="px-2 py-0.5 rounded-md text-[8px] bg-[var(--t-from)] text-white font-bold">Tag</div> },
                { id:"square", label:es?"Cuadrado":"Square", preview: <div className="px-2 py-0.5 rounded-sm text-[8px] bg-[var(--t-from)] text-white font-bold">Tag</div> },
              ]} />

            <OptionRow label={es ? "Espacio entre tarjetas" : "Card Gap"} testPrefix="card-gap"
              current={as.cardGap || "normal"} onChange={v => cs("cardGap", v)} cols={4}
              options={[{id:"tight",label:es?"Apretado":"Tight"},{id:"normal",label:es?"Normal":"Normal"},{id:"loose",label:es?"Suelto":"Loose"},{id:"xl",label:"XL"}]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            5. FONDO Y COLORES
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={SlidersHorizontal} title={es ? "Fondo y Colores" : "Background & Colors"} desc={es ? "Modo oscuro, fondo, blur de vidrio" : "Dark mode, background, glass blur"}>
          <div className="space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">{es ? "Modo Oscuro" : "Dark Mode"}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{es ? "Fondo oscuro en toda la app" : "Dark background everywhere"}</p>
              </div>
              <Toggle value={darkMode} onChange={v => { changeDarkMode(v); toast({ title: v ? "Modo oscuro ✓" : "Modo claro" }); }} testId="dark-mode-toggle" />
            </div>

            <OptionRow label={es ? "Intensidad de fondo (blobs)" : "Background Intensity"} testPrefix="bg" current={bgIntensity} onChange={changeBgIntensity} cols={4} defaultValue="normal"
              options={[{id:"off",label:es?"Apagado":"Off"},{id:"subtle",label:es?"Suave":"Subtle"},{id:"normal",label:es?"Normal":"Normal"},{id:"vivid",label:es?"Vivido":"Vivid"}]} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-600">{es ? "Gradiente personalizado" : "Custom Gradient"}</p>
                <Toggle value={customBgEnabled} onChange={() => changeCustomBg(!customBgEnabled)} testId="custom-bg-toggle" />
              </div>
              <AnimatePresence>
                {customBgEnabled && (
                  <motion.div key="bg-colors" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center gap-3 mt-2">
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={bgColor1} onChange={e => changeCustomBg(true, e.target.value, bgColor2)} className="w-9 h-9 rounded-xl cursor-pointer border-2 border-slate-200/60" />
                      <span className="text-[8px] text-slate-400">{es ? "Inicio" : "Start"}</span>
                    </div>
                    <div className="flex-1 h-8 rounded-xl border border-slate-200/60" style={{ background: `linear-gradient(135deg, ${bgColor1}, ${bgColor2})` }} />
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={bgColor2} onChange={e => changeCustomBg(true, bgColor1, e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer border-2 border-slate-200/60" />
                      <span className="text-[8px] text-slate-400">{es ? "Final" : "End"}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <p className="text-xs font-black text-slate-600 mb-2">{es ? "Imagen de fondo (URL)" : "Background Image (URL)"}</p>
              <div className="flex gap-2">
                <input type="url" value={bgImageInput} onChange={e => setBgImageInput(e.target.value)} placeholder="https://..." data-testid="bg-image-input" className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { changeBgImage(bgImageInput); toast({ title: bgImageInput ? "Imagen aplicada ✓" : "Imagen eliminada" }); }} data-testid="bg-image-apply" className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold">{es ? "Aplicar" : "Apply"}</motion.button>
                {bgImage && <button onClick={() => { changeBgImage(""); setBgImageInput(""); }} data-testid="bg-image-remove" className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">{es ? "Quitar" : "Remove"}</button>}
              </div>
            </div>

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            6. INTERFAZ Y ESPACIO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={AlignJustify} title={es ? "Interfaz y Espacio" : "Interface & Space"} desc={es ? "Sidebar, densidad, tamaños, efectos visuales" : "Sidebar, density, sizes, visual effects"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Densidad del contenido" : "Content Density"} testPrefix="density" current={layoutDensity} onChange={v => { changeLayoutDensity(v); toast({ title: `Densidad: ${v}` }); }} cols={3} defaultValue="standard"
              options={[{id:"comfortable",label:es?"Cómodo":"Comfortable"},{id:"standard",label:es?"Estándar":"Standard"},{id:"compact",label:es?"Compacto":"Compact"}]} />

            <OptionRow label={es ? "Estilo de barra lateral" : "Sidebar Style"} testPrefix="sidebar-style" current={sidebarStyle} onChange={v => { changeSidebarStyle(v); toast({ title: `Sidebar: ${v}` }); }} cols={3} defaultValue="normal"
              options={[
                { id:"normal",
                  label: es ? "Normal" : "Normal",
                  hint: es ? "Por defecto" : "Default",
                  preview: (
                    <div className="w-14 h-9 bg-slate-100 rounded-lg overflow-hidden flex">
                      <div className="w-3.5 h-full bg-white/80 border-r border-slate-200" />
                      <div className="flex-1 bg-slate-50/60" />
                    </div>
                  ),
                },
                { id:"floating",
                  label: "Floating",
                  hint: es ? "Con margen" : "With margin",
                  preview: (
                    <div className="w-14 h-9 bg-slate-100 rounded-lg overflow-hidden flex items-center">
                      <div className="w-3 h-7 ml-0.5 bg-white/90 rounded-lg shadow-md border border-white/60" />
                      <div className="flex-1 bg-slate-50/60 rounded-r-lg ml-0.5" />
                    </div>
                  ),
                },
                { id:"borderless",
                  label: es ? "Sin borde" : "Borderless",
                  hint: es ? "Transparente" : "Transparent",
                  preview: (
                    <div className="w-14 h-9 bg-slate-100 rounded-lg overflow-hidden flex">
                      <div className="w-3.5 h-full bg-white/20" />
                      <div className="flex-1 bg-slate-50/60" />
                    </div>
                  ),
                },
                { id:"island",
                  label: "Isla",
                  hint: es ? "Flotante, sin tocar bordes" : "Floating island",
                  preview: (
                    <div className="w-14 h-9 bg-slate-100 rounded-lg overflow-hidden flex items-center p-0.5">
                      <div className="w-3 h-full bg-white rounded-2xl shadow-lg border border-white/80 mx-0.5" />
                      <div className="flex-1 bg-slate-50/60 rounded-lg" />
                    </div>
                  ),
                },
                { id:"minimal",
                  label: "Minimal",
                  hint: es ? "Ultra sutil" : "Ultra subtle",
                  preview: (
                    <div className="w-14 h-9 bg-slate-100 rounded-lg overflow-hidden flex">
                      <div className="w-3.5 h-full bg-white/10 border-r border-white/30" />
                      <div className="flex-1 bg-slate-50/60" />
                    </div>
                  ),
                },
              ]} />

            {/* Island margin sliders — only when island is active */}
            {sidebarStyle === "island" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pl-3 border-l-2 border-[var(--t-from)]/30 space-y-4 mt-1"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {es ? "Separaciones de la isla" : "Island spacing"}
                </p>
                <StyleSlider
                  label={es ? "Separación superior" : "Top gap"}
                  value={islandMargins.top} min={0} max={60} step={2}
                  onChange={v => changeIslandMargins("top", v)} unit="px"
                  testId="island-top" defaultValue={14}
                />
                <StyleSlider
                  label={es ? "Separación inferior" : "Bottom gap"}
                  value={islandMargins.bottom} min={0} max={60} step={2}
                  onChange={v => changeIslandMargins("bottom", v)} unit="px"
                  testId="island-bottom" defaultValue={14}
                />
                <StyleSlider
                  label={es ? "Separación lateral (izquierda)" : "Side gap (left)"}
                  value={islandMargins.side} min={0} max={60} step={2}
                  onChange={v => changeIslandMargins("side", v)} unit="px"
                  testId="island-side" defaultValue={14}
                />
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <div><p className="text-sm font-black text-slate-800">{es ? "Barra lateral compacta" : "Compact Sidebar"}</p><p className="text-[11px] text-slate-400 mt-0.5">{es ? "Solo iconos" : "Icons only"}</p></div>
              <Toggle value={sidebarCompact} onChange={v => { changeSidebarCompact(v); toast({ title: v ? "Sidebar compacta ✓" : "Sidebar expandida" }); }} testId="sidebar-compact-toggle" />
            </div>

            <OptionRow label={es ? "Altura del encabezado" : "Header Height"} testPrefix="header-h"
              current={as.headerHeight || "normal"} onChange={v => cs("headerHeight", v)} cols={3}
              options={[
                { id:"compact", label:es?"Compacto":"Compact", preview: <div className="w-10 h-3 rounded bg-slate-300" /> },
                { id:"normal",  label:es?"Normal":"Normal",   preview: <div className="w-10 h-4 rounded bg-slate-300" /> },
                { id:"tall",    label:es?"Alto":"Tall",       preview: <div className="w-10 h-6 rounded bg-slate-300" /> },
              ]} />

            <OptionRow label={es ? "Estilo activo en sidebar" : "Active Nav Style"} testPrefix="nav-active"
              current={as.navActiveStyle || "background"} onChange={v => cs("navActiveStyle", v)} cols={4}
              options={[
                { id:"background",  label:es?"Fondo":"Background",  preview: <div className="w-10 h-4 rounded-xl btn-primary" /> },
                { id:"border-left", label:es?"Borde":"Border",      preview: <div className="w-10 h-4 rounded bg-slate-100 border-l-2 border-[var(--t-from)]" /> },
                { id:"dot",         label:"Dot",                    preview: <div className="flex items-center gap-1 w-10"><div className="w-2 h-2 rounded-full btn-primary" /><div className="flex-1 h-4 rounded bg-slate-100" /></div> },
                { id:"underline",   label:es?"Subrayado":"Underline",preview: <div className="w-10 h-4 rounded bg-slate-100 border-b-2 border-[var(--t-from)]" /> },
              ]} />

            <OptionRow label={es ? "Ancho del contenido" : "Content Width"} testPrefix="width" current={pageWidth} onChange={changePageWidth} cols={4}
              options={[{id:"narrow",label:es?"Estrecho":"Narrow"},{id:"medium",label:es?"Normal":"Normal"},{id:"wide",label:es?"Ancho":"Wide"},{id:"full",label:es?"Completo":"Full"}]} />

            <OptionRow label={es ? "Barra de desplazamiento" : "Scrollbar"} testPrefix="scrollbar" current={scrollbar} onChange={changeScrollbar} cols={3}
              options={[{id:"default",label:es?"Normal":"Default"},{id:"thin",label:es?"Fina":"Thin"},{id:"none",label:es?"Oculta":"Hidden"}]} />

            {/* ── NUEVAS OPCIONES ─────────────────────── */}

            <StyleSlider label={es ? "Opacidad del vidrio (tarjetas)" : "Glass Card Opacity"} value={as.glassOpacity ?? 45} min={10} max={90} step={5} onChange={v => changeAdvancedStyle("glassOpacity", v)} unit="%" testId="glass-opacity-slider" defaultValue={45} />

            <StyleSlider label={es ? "Desenfoque del vidrio" : "Glass Blur"} value={glassBlur} min={0} max={40} step={2} onChange={changeGlassBlur} unit="px" testId="glass-blur-slider" defaultValue={14} />

            <StyleSlider label={es ? "Profundidad de sombra" : "Shadow Depth"} value={shadowDepth} min={0} max={5} step={1} onChange={changeShadowDepth} unit="" testId="shadow-depth-slider" defaultValue={2} />

            <OptionRow label={es ? "Estilo de divisores" : "Divider Style"} testPrefix="divider-style"
              current={as.dividerStyle || "subtle"} onChange={v => cs("dividerStyle", v)} cols={4}
              options={[
                { id:"none",    label:es?"Sin línea":"None",   preview: <div className="w-10 h-4 flex items-center"><div className="w-full h-px" /></div> },
                { id:"subtle",  label:es?"Sutil":"Subtle",     preview: <div className="w-10 h-4 flex items-center"><div className="w-full h-px bg-slate-200" /></div> },
                { id:"solid",   label:es?"Sólido":"Solid",     preview: <div className="w-10 h-4 flex items-center"><div className="w-full h-0.5 bg-slate-400" /></div> },
                { id:"dashed",  label:es?"Punteado":"Dashed",  preview: <div className="w-10 h-4 flex items-center"><div className="w-full border-t border-dashed border-slate-400" /></div> },
              ]} />

            <OptionRow label={es ? "Estilo de filas en tabla" : "Table Row Style"} testPrefix="table-row"
              current={as.tableRowStyle || "hover"} onChange={v => cs("tableRowStyle", v)} cols={4}
              options={[
                { id:"hover",    label:es?"Hover":"Hover",        preview: <div className="w-10 h-5 rounded-lg bg-slate-50 border border-transparent hover:bg-indigo-50" /> },
                { id:"striped",  label:es?"Rayado":"Striped",     preview: <div className="w-10 space-y-0.5"><div className="h-1.5 rounded bg-slate-200" /><div className="h-1.5 rounded bg-slate-50" /><div className="h-1.5 rounded bg-slate-200" /></div> },
                { id:"bordered", label:es?"Bordes":"Bordered",    preview: <div className="w-10 space-y-0.5"><div className="h-1.5 rounded border border-slate-200 bg-white" /><div className="h-1.5 rounded border border-slate-200 bg-white" /></div> },
                { id:"minimal",  label:es?"Mínimo":"Minimal",     preview: <div className="w-10 space-y-0.5"><div className="h-1.5 border-b border-slate-100 bg-transparent" /><div className="h-1.5 border-b border-slate-100 bg-transparent" /></div> },
              ]} />

            <OptionRow label={es ? "Efecto hover en tarjetas" : "Card Hover Effect"} testPrefix="card-hover"
              current={as.cardHover || "lift"} onChange={v => cs("cardHover", v)} cols={4}
              options={[
                { id:"none",     label:es?"Ninguno":"None",      preview: <div className="w-10 h-5 rounded-xl glass" /> },
                { id:"lift",     label:es?"Elevar":"Lift",       preview: <div className="w-10 h-5 rounded-xl glass shadow-md" /> },
                { id:"glow",     label:"Glow",                   preview: <div className="w-10 h-5 rounded-xl glass" style={{boxShadow:"0 0 10px var(--t-from)44"}} /> },
                { id:"border",   label:es?"Borde":"Border",      preview: <div className="w-10 h-5 rounded-xl glass border-2 border-[var(--t-from)]/40" /> },
              ]} />

            <OptionRow label={es ? "Estilo de badges/etiquetas" : "Badge Style"} testPrefix="badge-style"
              current={as.badgeStyle || "pill"} onChange={v => cs("badgeStyle", v)} cols={4}
              options={[
                { id:"pill",     label:es?"Píldora":"Pill",      preview: <div className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-indigo-100 text-indigo-700">Tag</div> },
                { id:"rounded",  label:es?"Redondeado":"Rounded",preview: <div className="px-2 py-0.5 rounded-lg text-[8px] font-bold bg-indigo-100 text-indigo-700">Tag</div> },
                { id:"sharp",    label:es?"Cuadrado":"Sharp",    preview: <div className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">Tag</div> },
                { id:"outline",  label:es?"Contorno":"Outline",  preview: <div className="px-2 py-0.5 rounded-full text-[8px] font-bold border-2 border-indigo-400 text-indigo-700">Tag</div> },
              ]} />

            <OptionRow label={es ? "Posición del logo en sidebar" : "Logo Position in Sidebar"} testPrefix="logo-pos"
              current={as.logoPosition || "top"} onChange={v => cs("logoPosition", v)} cols={3}
              options={[
                { id:"top",    label:es?"Arriba":"Top",          preview: <div className="w-10 h-7 rounded bg-slate-100 flex flex-col items-center pt-0.5 gap-0.5"><div className="w-4 h-1.5 rounded bg-slate-400" /><div className="w-full flex-1 bg-slate-50 rounded-b" /></div> },
                { id:"center", label:es?"Centro":"Center",       preview: <div className="w-10 h-7 rounded bg-slate-100 flex flex-col items-center justify-center gap-0.5"><div className="w-4 h-1.5 rounded bg-slate-400" /></div> },
                { id:"hidden", label:es?"Ocultar":"Hidden",      preview: <div className="w-10 h-7 rounded bg-slate-100 flex flex-col items-center justify-start pt-1 gap-0.5">{[1,2,3].map(i=><div key={i} className="w-7 h-0.5 bg-slate-300 rounded" />)}</div> },
              ]} />

            <OptionRow label={es ? "Animación de carga de página" : "Page Load Animation"} testPrefix="page-load-anim"
              current={as.pageLoadAnim || "fade"} onChange={v => cs("pageLoadAnim", v)} cols={4}
              options={[
                { id:"none",    label:es?"Ninguna":"None"  },
                { id:"fade",    label:"Fade"               },
                { id:"slide",   label:"Slide"              },
                { id:"zoom",    label:"Zoom"               },
              ]} />

            <OptionRow label={es ? "Indicador de carga (spinner)" : "Loading Spinner Style"} testPrefix="spinner-style"
              current={as.spinnerStyle || "ring"} onChange={v => cs("spinnerStyle", v)} cols={4}
              options={[
                { id:"ring",    label:"Ring",     preview: <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" /> },
                { id:"dots",    label:"Dots",     preview: <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay:`${i*0.1}s`}} />)}</div> },
                { id:"bar",     label:"Bar",      preview: <div className="w-10 h-1 bg-slate-200 rounded overflow-hidden"><div className="h-full w-1/2 btn-primary rounded animate-pulse" /></div> },
                { id:"pulse",   label:"Pulse",    preview: <div className="w-4 h-4 rounded-full btn-primary animate-ping opacity-75" /> },
              ]} />

            <div>
              <p className="text-xs font-black text-slate-600 mb-2.5">{es ? "Formato de fecha" : "Date Format"}</p>
              <div className="flex gap-2 flex-wrap">
                {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(fmt => (
                  <motion.button key={fmt} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} data-testid={`date-fmt-${fmt.replace(/\//g,"")}`}
                    onClick={() => { changeDateFormat(fmt); toast({ title: `Formato: ${fmt}` }); }}
                    className={`px-4 py-2 rounded-2xl border-2 text-xs font-bold transition-all ${dateFormat === fmt ? "border-[var(--t-from)] text-[var(--t-from)] bg-white/80" : "border-slate-200/70 text-slate-500 bg-white/40 hover:bg-white/60"}`}>
                    {fmt}
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            7. TIPOGRAFÍA AVANZADA  ★ NUEVO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={FileText} isNew title={es ? "Tipografía Avanzada" : "Advanced Typography"} desc={es ? "Peso, mayúsculas, sombra de texto, alineación" : "Weight, case, text shadow, alignment"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Peso de titulares" : "Heading Weight"} testPrefix="heading-weight"
              current={as.headingWeight || "800"} onChange={v => cs("headingWeight", v)} cols={4}
              options={[
                { id:"600", label:"Semibold", preview: <span className="text-xs font-semibold text-slate-700">Aa</span> },
                { id:"700", label:"Bold",     preview: <span className="text-xs font-bold text-slate-700">Aa</span> },
                { id:"800", label:"ExtraBold",preview: <span className="text-xs font-extrabold text-slate-700">Aa</span> },
                { id:"900", label:"Black",    preview: <span className="text-xs font-black text-slate-700">Aa</span> },
              ]} />

            <OptionRow label={es ? "Mayúsculas de titulares" : "Heading Case"} testPrefix="heading-case"
              current={as.headingCase || "normal"} onChange={v => cs("headingCase", v)} cols={3}
              options={[
                { id:"normal",    label:es?"Normal":"Normal",       preview: <span className="text-xs font-bold text-slate-700">Título</span> },
                { id:"uppercase", label:es?"MAYÚSCULAS":"UPPER",    preview: <span className="text-[9px] font-bold text-slate-700 uppercase">Título</span> },
                { id:"capitalize",label:es?"Capitalizar":"Capitalize",preview:<span className="text-xs font-bold text-slate-700 capitalize">título ejemplo</span>},
              ]} />

            <OptionRow label={es ? "Sombra del texto" : "Text Shadow"} testPrefix="text-shadow"
              current={as.textShadow || "none"} onChange={v => cs("textShadow", v)} cols={3}
              options={[
                { id:"none",   label:es?"Ninguna":"None",   preview: <span className="text-xs font-bold text-slate-700">Aa</span> },
                { id:"subtle", label:es?"Sutil":"Subtle",   preview: <span className="text-xs font-bold text-slate-700" style={{textShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>Aa</span> },
                { id:"glow",   label:"Glow",                preview: <span className="text-xs font-bold" style={{color:"var(--t-from)",textShadow:"0 0 10px var(--t-from)"}}>Aa</span> },
              ]} />

            <OptionRow label={es ? "Alineación del texto" : "Text Alignment"} testPrefix="body-align"
              current={as.bodyAlign || "left"} onChange={v => cs("bodyAlign", v)} cols={3}
              options={[
                { id:"left",    label:es?"Izquierda":"Left",  preview: <div className="space-y-0.5 w-10">{[10,8,10,7].map((w,i)=><div key={i} className="h-0.5 bg-slate-400 rounded" style={{width:`${w*4}px`}} />)}</div> },
                { id:"center",  label:es?"Centrado":"Center", preview: <div className="space-y-0.5 w-10 flex flex-col items-center">{[10,8,10,7].map((w,i)=><div key={i} className="h-0.5 bg-slate-400 rounded" style={{width:`${w*3.5}px`}} />)}</div> },
                { id:"justify", label:es?"Justificado":"Justify",preview:<div className="space-y-0.5 w-10">{[10,10,10,6].map((w,i)=><div key={i} className="h-0.5 bg-slate-400 rounded" style={{width:i<3?"100%":`${w*4}px`}} />)}</div> },
              ]} />

            <OptionRow label={es ? "Decoración de enlaces" : "Link Decoration"} testPrefix="link-decor"
              current={as.linkDecoration || "hover"} onChange={v => cs("linkDecoration", v)} cols={4}
              options={[
                { id:"underline",preview:<span className="text-xs font-bold text-[var(--t-from)] underline">link</span>,label:es?"Subrayado":"Underline"},
                { id:"hover",    preview:<span className="text-xs font-bold text-[var(--t-from)]">link</span>,label:es?"Al pasar":"On hover"},
                { id:"none",     preview:<span className="text-xs font-bold text-[var(--t-from)]">link</span>,label:es?"Ninguno":"None"},
                { id:"colored",  preview:<span className="text-xs font-bold text-[var(--t-from)] bg-[var(--t-from)]/10 px-1 rounded">link</span>,label:es?"Con fondo":"Bg"},
              ]} />

            <OptionRow label={es ? "Fuente monoespaciada" : "Monospace Font"} testPrefix="mono-font"
              current={as.monoFont || "default"} onChange={v => cs("monoFont", v)} cols={4}
              options={[{id:"default",label:"Default"},{id:"jetbrains",label:"JetBrains"},{id:"fira",label:"Fira Code"},{id:"cascadia",label:"Cascadia"}]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            9. FORMULARIOS E INPUTS  ★ NUEVO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Columns} isNew title={es ? "Formularios e Inputs" : "Forms & Inputs"} desc={es ? "Estilo, tamaño y animación de campos de entrada" : "Input style, size and animations"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Estilo de campos de entrada" : "Input Style"} testPrefix="input-style"
              current={as.inputStyle || "box"} onChange={v => cs("inputStyle", v)} cols={4}
              options={[
                { id:"box",      label:es?"Caja":"Box",      preview: <div className="w-12 h-5 rounded-lg border-2 border-slate-300 bg-white" /> },
                { id:"line",     label:es?"Línea":"Line",    preview: <div className="w-12 h-5 border-b-2 border-slate-300" /> },
                { id:"glass",    label:es?"Vidrio":"Glass",  preview: <div className="w-12 h-5 rounded-lg border border-white/60 bg-white/50 backdrop-blur-sm" /> },
                { id:"flat",     label:es?"Plano":"Flat",    preview: <div className="w-12 h-5 rounded-lg bg-slate-100" /> },
              ]} />

            <OptionRow label={es ? "Tamaño de inputs" : "Input Size"} testPrefix="input-size"
              current={as.inputSize || "normal"} onChange={v => cs("inputSize", v)} cols={3}
              options={[
                { id:"compact", label:es?"Compacto":"Compact", preview: <div className="w-12 h-4 rounded border border-slate-300 bg-white" /> },
                { id:"normal",  label:es?"Normal":"Normal",   preview: <div className="w-12 h-6 rounded border border-slate-300 bg-white" /> },
                { id:"large",   label:es?"Grande":"Large",    preview: <div className="w-12 h-8 rounded border border-slate-300 bg-white" /> },
              ]} />

            <OptionRow label={es ? "Estilo del anillo de foco" : "Focus Ring Style"} testPrefix="focus-ring"
              current={as.focusRing || "glow"} onChange={v => cs("focusRing", v)} cols={4}
              options={[
                { id:"glow",      label:"Glow",      preview: <div className="w-12 h-5 rounded-lg border border-slate-300 bg-white" style={{boxShadow:"0 0 0 3px var(--t-from)44"}} /> },
                { id:"solid",     label:"Solid",     preview: <div className="w-12 h-5 rounded-lg bg-white" style={{boxShadow:"0 0 0 2px var(--t-from)"}} /> },
                { id:"underline", label:es?"Subrayado":"Underline",preview:<div className="w-12 h-5 rounded-t-lg border-b-2 border-[var(--t-from)] bg-white" /> },
                { id:"none",      label:es?"Ninguno":"None",preview:<div className="w-12 h-5 rounded-lg border border-slate-200 bg-white" /> },
              ]} />

            <OptionRow label={es ? "Estilo de checkboxes y radios" : "Checkbox & Radio Style"} testPrefix="checkbox-style"
              current={as.checkboxStyle || "default"} onChange={v => cs("checkboxStyle", v)} cols={4}
              options={[
                { id:"default",preview:<div className="w-4 h-4 rounded border-2 border-slate-400" />,label:"Default"},
                { id:"circle", preview:<div className="w-4 h-4 rounded-full border-2 border-[var(--t-from)] flex items-center justify-center"><div className="w-2 h-2 rounded-full btn-primary" /></div>,label:es?"Círculo":"Circle"},
                { id:"square", preview:<div className="w-4 h-4 rounded-sm btn-primary flex items-center justify-center"><CheckCircle size={9} className="text-white" /></div>,label:es?"Relleno":"Filled"},
                { id:"minimal",preview:<div className="w-4 h-4 rounded border border-slate-300" />,label:"Minimal"},
              ]} />

            <OptionRow label={es ? "Layout de formularios" : "Form Layout"} testPrefix="form-layout"
              current={as.formLayout || "stacked"} onChange={v => cs("formLayout", v)} cols={3}
              options={[
                { id:"stacked",  label:es?"Apilado":"Stacked",   preview: <div className="space-y-1 w-10"><div className="h-1 w-full bg-slate-300 rounded" /><div className="h-3 w-full rounded border border-slate-300" /></div> },
                { id:"floating", label:es?"Flotante":"Floating",  preview: <div className="relative w-10 h-6 rounded border border-slate-300"><div className="absolute -top-1.5 left-1 text-[6px] font-bold text-[var(--t-from)] bg-white px-0.5">Label</div></div> },
                { id:"inline",   label:es?"En línea":"Inline",   preview: <div className="flex items-center gap-1 w-10"><div className="h-1 w-3 bg-slate-300 rounded" /><div className="flex-1 h-3 rounded border border-slate-300" /></div> },
              ]} />

            <OptionRow label={es ? "Estilo de selectores (dropdowns)" : "Select/Dropdown Style"} testPrefix="select-style"
              current={as.selectStyle || "custom"} onChange={v => cs("selectStyle", v)} cols={3}
              options={[{id:"native",label:"Native"},{id:"custom",label:"Custom"},{id:"glass",label:"Glass"}]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            10. DATOS Y TABLAS  ★ NUEVO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={BarChart2} isNew title={es ? "Datos y Tablas" : "Data & Tables"} desc={es ? "Estilo de tablas, gráficos, estado y formato" : "Table, chart, status and format styles"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Estilo de tablas" : "Table Style"} testPrefix="table-style"
              current={as.tableStyle || "minimal"} onChange={v => cs("tableStyle", v)} cols={5}
              options={[
                { id:"minimal",  label:es?"Mínimal":"Minimal", preview: <div className="w-8 h-5 border-b border-slate-300 bg-white" /> },
                { id:"striped",  label:es?"Rayado":"Striped",  preview: <div className="w-8 h-5 overflow-hidden rounded">{[1,2].map(i=><div key={i} className="h-2.5" style={{background:i%2===0?"#f8fafc":"white"}}/>)}</div> },
                { id:"bordered", label:es?"Borde":"Bordered",  preview: <div className="w-8 h-5 border border-slate-300 grid grid-cols-2 gap-px">{[1,2,3,4].map(i=><div key={i} className="bg-white border border-slate-200"/>)}</div> },
                { id:"glass",    label:es?"Vidrio":"Glass",    preview: <div className="w-8 h-5 rounded bg-white/50 backdrop-blur border border-white/60" /> },
                { id:"card",     label:es?"Tarjeta":"Card",    preview: <div className="w-8 h-5 rounded-md bg-white shadow-sm" /> },
              ]} />

            <OptionRow label={es ? "Hover en filas de tabla" : "Row Hover Style"} testPrefix="row-hover"
              current={as.rowHover || "highlight"} onChange={v => cs("rowHover", v)} cols={4}
              options={[{id:"highlight",label:es?"Resaltar":"Highlight"},{id:"scale",label:"Scale"},{id:"glow",label:"Glow"},{id:"none",label:es?"Ninguno":"None"}]} />

            <OptionRow label={es ? "Estilo de etiquetas de estado" : "Status Badge Style"} testPrefix="status-badge"
              current={as.statusBadge || "soft"} onChange={v => cs("statusBadge", v)} cols={4}
              options={[
                { id:"filled",  label:es?"Relleno":"Filled",  preview: <div className="px-2 py-0.5 rounded-full text-[8px] btn-primary text-white font-bold">OK</div> },
                { id:"outlined",label:es?"Borde":"Outlined",  preview: <div className="px-2 py-0.5 rounded-full text-[8px] border-2 border-[var(--t-from)] text-[var(--t-from)] font-bold">OK</div> },
                { id:"soft",    label:es?"Suave":"Soft",      preview: <div className="px-2 py-0.5 rounded-full text-[8px] font-bold" style={{background:"var(--t-from)20",color:"var(--t-from)"}}>OK</div> },
                { id:"dot",     label:"Dot",                  preview: <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full btn-primary" /><span className="text-[8px] font-bold text-slate-600">OK</span></div> },
              ]} />

            <OptionRow label={es ? "Paleta de colores en gráficos" : "Chart Color Palette"} testPrefix="chart-palette"
              current={as.chartPalette || "default"} onChange={v => cs("chartPalette", v)} cols={3}
              options={[
                { id:"default",  label:es?"Predeterminado":"Default", preview: <div className="flex gap-0.5">{["bg-indigo-400","bg-rose-400","bg-emerald-400","bg-amber-400"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
                { id:"warm",     label:es?"Cálida":"Warm",            preview: <div className="flex gap-0.5">{["bg-red-400","bg-orange-400","bg-amber-400","bg-yellow-400"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
                { id:"cool",     label:es?"Fría":"Cool",              preview: <div className="flex gap-0.5">{["bg-blue-400","bg-cyan-400","bg-teal-400","bg-indigo-400"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
                { id:"mono",     label:es?"Mono":"Mono",              preview: <div className="flex gap-0.5">{["bg-slate-300","bg-slate-400","bg-slate-500","bg-slate-700"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
                { id:"vivid",    label:es?"Vívida":"Vivid",           preview: <div className="flex gap-0.5">{["bg-fuchsia-500","bg-cyan-400","bg-lime-400","bg-orange-400"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
                { id:"earthy",   label:es?"Terrosa":"Earthy",         preview: <div className="flex gap-0.5">{["bg-stone-400","bg-amber-600","bg-lime-600","bg-teal-600"].map(c=><div key={c} className={`w-2 h-4 rounded-sm ${c}`}/>)}</div> },
              ]} />

            <OptionRow label={es ? "Estilo de barras de progreso" : "Progress Bar Style"} testPrefix="progress-style"
              current={as.progressStyle || "rounded"} onChange={v => cs("progressStyle", v)} cols={4}
              options={[
                { id:"flat",     label:es?"Plano":"Flat",      preview: <div className="w-12 h-2 bg-slate-200 rounded-none overflow-hidden"><div className="h-full w-2/3 btn-primary rounded-none" /></div> },
                { id:"rounded",  label:es?"Redondo":"Rounded", preview: <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full w-2/3 btn-primary rounded-full" /></div> },
                { id:"striped",  label:es?"Rayado":"Striped",  preview: <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full w-2/3 btn-primary rounded-full" style={{backgroundImage:"repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(255,255,255,0.3) 4px,rgba(255,255,255,0.3) 8px)"}} /></div> },
                { id:"gradient", label:es?"Degradado":"Grad",  preview: <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full w-2/3 rounded-full" style={{background:"linear-gradient(90deg,var(--t-from),var(--t-to))"}} /></div> },
              ]} />

            <OptionRow label={es ? "Estilo de tarjetas métricas" : "Metric Card Style"} testPrefix="metric-card"
              current={as.metricCard || "gradient"} onChange={v => cs("metricCard", v)} cols={4}
              options={[
                { id:"gradient", label:es?"Degradado":"Gradient",preview:<div className="w-10 h-7 rounded-xl" style={{background:"linear-gradient(135deg,var(--t-from),var(--t-to))"}} /> },
                { id:"solid",    label:es?"Sólido":"Solid",      preview:<div className="w-10 h-7 rounded-xl bg-white border border-slate-200" /> },
                { id:"outlined", label:es?"Borde":"Outlined",    preview:<div className="w-10 h-7 rounded-xl border-2 border-[var(--t-from)] bg-transparent" /> },
                { id:"minimal",  label:es?"Mínimal":"Minimal",   preview:<div className="w-10 h-7 rounded-xl bg-slate-50" /> },
              ]} />

            <OptionRow label={es ? "Formato de números" : "Number Format"} testPrefix="number-format"
              current={as.numberFormat || "comma"} onChange={v => cs("numberFormat", v)} cols={3}
              options={[
                { id:"comma", label:es?"Coma (1,234)":"Comma", preview:<span className="text-[9px] font-mono font-bold text-slate-700">1,234.56</span> },
                { id:"dot",   label:es?"Punto (1.234)":"Dot",  preview:<span className="text-[9px] font-mono font-bold text-slate-700">1.234,56</span> },
                { id:"space", label:es?"Espacio":"Space",       preview:<span className="text-[9px] font-mono font-bold text-slate-700">1 234.56</span> },
              ]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            11. DASHBOARD Y WIDGETS  ★ NUEVO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={LayoutGrid} isNew title={es ? "Dashboard y Widgets" : "Dashboard & Widgets"} desc={es ? "Gráficos, tarjetas de métricas y disposición" : "Charts, metric cards and layout"}>
          <div className="space-y-5">

            <OptionRow label={es ? "Tipo de gráfico preferido" : "Default Chart Type"} testPrefix="chart-type"
              current={as.chartType || "bar"} onChange={v => cs("chartType", v)} cols={4}
              options={[
                { id:"bar",   label:es?"Barras":"Bar",     preview: <div className="flex items-end gap-0.5 h-5">{[2,4,3,5,3].map((h,i)=><div key={i} className="w-1.5 rounded-t btn-primary" style={{height:`${h*4}px`}}/>)}</div> },
                { id:"line",  label:es?"Líneas":"Line",    preview: <svg width="20" height="16" viewBox="0 0 20 16"><polyline points="0,14 5,8 10,10 15,4 20,6" fill="none" stroke="var(--t-from)" strokeWidth="2"/></svg> },
                { id:"area",  label:es?"Área":"Area",      preview: <svg width="20" height="16" viewBox="0 0 20 16"><polygon points="0,16 0,12 5,7 10,9 15,3 20,5 20,16" fill="var(--t-from)" fillOpacity="0.4" stroke="var(--t-from)" strokeWidth="1.5"/></svg> },
                { id:"donut", label:es?"Dona":"Donut",     preview: <div className="w-5 h-5 rounded-full border-4 border-[var(--t-from)]" style={{borderRightColor:"var(--t-to)"}} /> },
              ]} />

            <OptionRow label={es ? "Tamaño de estadísticas" : "Stats Size"} testPrefix="stats-size"
              current={as.statsSize || "normal"} onChange={v => cs("statsSize", v)} cols={3}
              options={[
                { id:"normal", label:es?"Normal":"Normal", preview: <span className="text-sm font-black text-slate-700">1,234</span> },
                { id:"large",  label:es?"Grande":"Large",  preview: <span className="text-base font-black text-slate-700">1,234</span> },
                { id:"xl",     label:"XL",                 preview: <span className="text-xl font-black text-slate-700">1,234</span> },
              ]} />

            <OptionRow label={es ? "Disposición de tarjetas" : "Card Grid Layout"} testPrefix="card-layout"
              current={as.cardLayout || "grid"} onChange={v => cs("cardLayout", v)} cols={3}
              options={[
                { id:"grid",    label:es?"Cuadrícula":"Grid",  preview: <div className="grid grid-cols-2 gap-0.5 w-10">{[1,2,3,4].map(i=><div key={i} className="h-3 bg-slate-300 rounded" />)}</div> },
                { id:"list",    label:es?"Lista":"List",       preview: <div className="flex flex-col gap-0.5 w-10">{[1,2,3].map(i=><div key={i} className="h-2 bg-slate-300 rounded w-full" />)}</div> },
                { id:"compact", label:es?"Compacto":"Compact", preview: <div className="flex flex-col gap-0.5 w-10">{[1,2,3,4].map(i=><div key={i} className="h-1.5 bg-slate-300 rounded w-full" />)}</div> },
              ]} />

            <OptionRow label={es ? "Estado vacío (sin datos)" : "Empty State Style"} testPrefix="empty-state"
              current={as.emptyState || "icon"} onChange={v => cs("emptyState", v)} cols={4}
              options={[{id:"icon",label:es?"Solo icono":"Icon Only"},{id:"illustration",label:es?"Ilustración":"Illustration"},{id:"text",label:es?"Solo texto":"Text Only"},{id:"animated",label:es?"Animado":"Animated"}]} />

            <OptionRow label={es ? "Bordes de widgets" : "Widget Corner Style"} testPrefix="widget-corner"
              current={as.widgetCorner || "round"} onChange={v => cs("widgetCorner", v)} cols={3}
              options={[
                { id:"round",  label:es?"Redondo":"Round", preview: <div className="w-10 h-6 rounded-2xl bg-slate-200" /> },
                { id:"sharp",  label:es?"Angular":"Sharp", preview: <div className="w-10 h-6 rounded-sm bg-slate-200" /> },
                { id:"pill",   label:"Pill",               preview: <div className="w-10 h-6 rounded-full bg-slate-200" /> },
              ]} />

          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            13. TIPOS DE EVENTO
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Pencil} title={es ? "Tipos de Evento" : "Event Types"} desc={es ? "Personaliza icono y color por tipo" : "Customize icon and color per type"}>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">{es ? "Toca un tipo para editar su icono y color." : "Tap a type to edit its icon and color."}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {EVENT_TYPES.map((typeName) => {
                const cfg = getEventConfig(typeName);
                const isActive = activeEventType === typeName;
                return (
                  <motion.button key={typeName} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { const next = isActive ? null : typeName; setActiveEventType(next); if (next) setTypeNameEdit(eventConfigs[next]?.name || ""); }}
                    data-testid={`event-type-edit-${typeName.replace(/\s+/g,"-").toLowerCase()}`}
                    className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all text-center"
                    style={{ background: isActive ? cfg.fg+"18" : cfg.bg||cfg.fg+"10", border: isActive ? `2px solid ${cfg.fg}` : `2px solid ${cfg.border||cfg.fg+"30"}` }}>
                    {isActive && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{background:cfg.fg}}><CheckCircle size={9} className="text-white" /></div>}
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{background:cfg.fg+"1c"}}><cfg.icon size={20} style={{color:cfg.fg}} strokeWidth={1.8} /></div>
                    <p className="text-[10px] font-bold leading-tight" style={{color:cfg.fg}}>{getEventTypeName(typeName)}</p>
                    <div className="flex items-center gap-1"><Pencil size={9} style={{color:cfg.fg,opacity:0.6}} /><span className="text-[9px] font-medium" style={{color:cfg.fg,opacity:0.6}}>{es?"editar":"edit"}</span></div>
                  </motion.button>
                );
              })}
            </div>
            {activeEventType && (() => {
              const cfg = getEventConfig(activeEventType);
              const customCfg = eventConfigs[activeEventType] || {};
              return (
                <motion.div key={activeEventType} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.22}}
                  className="mt-3 rounded-2xl overflow-hidden" style={{background:cfg.fg+"08",border:`1.5px solid ${cfg.fg}30`}}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor:cfg.fg+"20"}}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:cfg.fg+"1c"}}><cfg.icon size={15} style={{color:cfg.fg}} /></div>
                      <p className="text-sm font-black text-slate-800">{typeNameEdit||activeEventType}</p>
                    </div>
                    {eventConfigs[activeEventType] && (
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>resetEventTypeConfig(activeEventType)}
                        data-testid={`event-type-reset-${activeEventType.replace(/\s+/g,"-").toLowerCase()}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors" style={{background:"rgba(255,255,255,0.6)"}}>
                        <RotateCcw size={10} />{es?"Restaurar":"Reset"}
                      </motion.button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{es?"Nombre":"Name"}</p>
                      <input type="text" value={typeNameEdit} onChange={e=>{setTypeNameEdit(e.target.value);updateEventTypeConfig(activeEventType,{name:e.target.value||undefined});}}
                        placeholder={activeEventType} data-testid={`event-type-name-input-${activeEventType?.replace(/\s+/g,"-").toLowerCase()}`}
                        className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 placeholder-slate-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">{es?"Color":"Color"}</p>
                      <div className="grid grid-cols-10 gap-1.5">
                        {AVAILABLE_COLORS.map(color => {
                          const isSel = (customCfg.fg||cfg.fg)===color;
                          return (
                            <motion.button key={color} whileHover={{scale:1.2,y:-1}} whileTap={{scale:0.9}} onClick={()=>updateEventTypeConfig(activeEventType,{fg:color})}
                              data-testid={`color-swatch-${color.replace("#","")}`} title={color}
                              className="w-full aspect-square rounded-lg transition-all relative"
                              style={{background:color,boxShadow:isSel?`0 0 0 2px white, 0 0 0 4px ${color}`:`0 2px 4px ${color}55`,transform:isSel?"scale(1.15)":undefined}}>
                              {isSel&&<div className="absolute inset-0 flex items-center justify-center"><CheckCircle size={10} className="text-white drop-shadow" /></div>}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">{es?"Icono":"Icon"}</p>
                      <div className="grid grid-cols-9 gap-1.5">
                        {AVAILABLE_ICONS.map(({name,component:IconComp}) => {
                          const isSel = (customCfg.iconName||cfg.iconName)===name;
                          return (
                            <motion.button key={name} whileHover={{scale:1.15,y:-1}} whileTap={{scale:0.9}} onClick={()=>updateEventTypeConfig(activeEventType,{iconName:name})}
                              data-testid={`icon-pick-${name.toLowerCase()}`} title={name}
                              className="w-full aspect-square rounded-xl flex items-center justify-center transition-all"
                              style={{background:isSel?cfg.fg:"rgba(255,255,255,0.6)",border:isSel?`2px solid ${cfg.fg}`:"2px solid rgba(226,232,240,0.7)",boxShadow:isSel?`0 4px 12px ${cfg.fg}44`:undefined}}>
                              <IconComp size={15} style={{color:isSel?"white":"#64748b"}} strokeWidth={1.8} />
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

        {/* ═══════════════════════════════════════════════════════════════
            14. DISEÑO DE PDF
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={Sparkles} title={es ? "Diseño de PDF" : "PDF Design"} desc={es ? "Tema visual de todos los PDFs" : "Visual theme for all generated PDFs"}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              {Object.values(PDF_THEMES).map((t) => {
                const isActive = pdfTheme === t.id;
                return (
                  <motion.button key={t.id} whileHover={{y:-2,scale:1.02}} whileTap={{scale:0.97}} onClick={()=>changePdfTheme(t.id)} data-testid={`pdf-theme-${t.id}`}
                    className="flex flex-col rounded-2xl overflow-hidden transition-all"
                    style={{border:isActive?"2px solid var(--t-from)":"2px solid rgba(226,232,240,0.7)"}}>
                    <div className="h-20 relative overflow-hidden" style={{background:t.preview.headerBg}}>
                      {t.id==="claro"&&<div className="absolute top-0 left-0 right-0 h-2" style={{background:t.preview.accentBar}}/>}
                      {t.id==="elegante"&&<div className="absolute bottom-0 left-0 right-0 h-1.5" style={{background:t.preview.accentBar}}/>}
                      {t.id==="oscuro"&&<div className="absolute top-0 left-0 right-0 h-1.5" style={{background:t.preview.accentBar}}/>}
                      <div className="absolute left-2 top-3 w-8 h-5 rounded opacity-30 bg-white"/>
                      <div className="absolute right-2 top-3 space-y-1"><div className="h-1.5 w-14 rounded-full opacity-40 bg-white"/><div className="h-1 w-10 rounded-full opacity-25 bg-white"/></div>
                    </div>
                    <div className="flex-1 p-2 space-y-1" style={{background:"white"}}><div className="h-2 rounded" style={{background:t.preview.sectionBg}}/><div className="h-1 rounded bg-gray-100 w-4/5"/></div>
                    <div className="px-2 pb-2 flex items-center justify-between" style={{background:isActive?"rgba(255,255,255,0.8)":"white"}}>
                      <p className="text-[10px] font-black text-slate-700">{t.name}</p>
                      {isActive&&<div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:"var(--t-from)"}}><CheckCircle size={9} className="text-white"/></div>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={handleExportPDF} disabled={pdfLoading} data-testid="export-pdf-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl btn-primary text-white text-sm font-bold disabled:opacity-60">
              <Sparkles size={14} />
              {pdfLoading?(es?"Generando...":"Generating..."):(es?"Exportar todas las reservas a PDF":"Export all reservations to PDF")}
            </motion.button>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            15. LOGO Y MARCA
        ═══════════════════════════════════════════════════════════════ */}
        <Section icon={ImageIcon} title={es ? "Logo y Marca" : "Logo & Branding"} desc={es ? "Logo para la app y documentos PDF" : "App logo and PDF documents"}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">{es?"Logo de la app (sidebar)":"App logo (sidebar)"}</p>
              {logoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-white/60">
                  <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain max-w-[120px] rounded-xl" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-700">{es?"Logo cargado":"Logo loaded"}</p><p className="text-[10px] text-slate-400 mt-0.5">{es?"Aparece en sidebar":"Shown in sidebar"}</p></div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>logoInputRef.current?.click()} data-testid="logo-change-btn" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"><Upload size={13} className="text-slate-600"/></motion.button>
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>updateLogoSettings({url:null})} data-testid="logo-remove-btn" className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={13} className="text-red-500"/></motion.button>
                  </div>
                </div>
              ) : (
                <motion.button whileHover={{y:-1}} whileTap={{scale:0.98}} onClick={()=>logoInputRef.current?.click()} data-testid="logo-upload-btn"
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 hover:border-slate-300 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center"><ImageIcon size={18} className="text-slate-400"/></div>
                  <div className="text-center"><p className="text-xs font-bold text-slate-600">{es?"Subir logo":"Upload logo"}</p><p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG</p></div>
                </motion.button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} data-testid="logo-file-input" />
            </div>
            {logoUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{es?"Tamaño":"Size"}</p><span className="text-xs font-bold text-slate-600">{logoSize}px</span></div>
                <Slider min={24} max={80} step={4} value={[Math.min(logoSize,80)]} onValueChange={([val])=>updateLogoSettings({size:val})} data-testid="logo-size-slider" className="w-full" />
                <div className="flex justify-between text-[9px] text-slate-400"><span>24px</span><span>80px</span></div>
              </div>
            )}
            <div className="border-t border-white/40 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-bold text-slate-700">{es?"Usar logo en PDFs":"Use logo in PDFs"}</p><p className="text-[10px] text-slate-400">{es?"En el encabezado de cada PDF":"In PDF headers"}</p></div>
                <Switch checked={usePdfLogo} onCheckedChange={val=>updateLogoSettings({usePdf:val})} data-testid="use-pdf-logo-toggle" />
              </div>
              {usePdfLogo && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="space-y-3 pl-1 border-l-2 border-slate-200 ml-1">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs font-bold text-slate-700">{es?"Logo diferente para PDFs":"Different PDF logo"}</p><p className="text-[10px] text-slate-400">{es?"Imagen distinta en documentos":"Different image for docs"}</p></div>
                    <Switch checked={useCustomPdfLogo} onCheckedChange={val=>updateLogoSettings({useCustomPdf:val})} data-testid="use-custom-pdf-logo-toggle" />
                  </div>
                  {useCustomPdfLogo && (
                    <div className="space-y-2">
                      {pdfLogoUrl ? (
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/60">
                          <img src={pdfLogoUrl} alt="PDF Logo" className="h-10 w-auto object-contain max-w-[100px] rounded-lg" />
                          <div className="flex-1 min-w-0"><p className="text-[10px] font-semibold text-slate-600">{es?"Logo PDF cargado":"PDF Logo loaded"}</p></div>
                          <div className="flex gap-2">
                            <motion.button whileHover={{scale:1.05}} onClick={()=>pdfLogoInputRef.current?.click()} data-testid="pdf-logo-change-btn" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"><Upload size={12} className="text-slate-600"/></motion.button>
                            <motion.button whileHover={{scale:1.05}} onClick={()=>updateLogoSettings({pdfUrl:null})} data-testid="pdf-logo-remove-btn" className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={12} className="text-red-500"/></motion.button>
                          </div>
                        </div>
                      ) : (
                        <motion.button whileHover={{y:-1}} whileTap={{scale:0.98}} onClick={()=>pdfLogoInputRef.current?.click()} data-testid="pdf-logo-upload-btn"
                          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/60 transition-all text-xs text-slate-500 font-semibold">
                          <Upload size={13}/>{es?"Subir logo para PDFs":"Upload PDF logo"}
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

        {/* ═══════════════════════════════════════════════════════════════
            TÍTULOS DEL SITIO
        ═══════════════════════════════════════════════════════════════ */}
        <SiteTitlesSection
          es={es}
          customLabels={customLabels}
          changeCustomLabel={changeCustomLabel}
          resetCustomLabels={resetCustomLabels}
          toast={toast}
          activeStatuses={activeStatuses}
          customStatuses={customStatuses}
          changeStatusLabel={changeStatusLabel}
          changeStatusColor={changeStatusColor}
          addCustomStatus={addCustomStatus}
          removeCustomStatus={removeCustomStatus}
          resetCustomStatuses={resetCustomStatuses}
        />

      </motion.div>
    </div>
  );
}

// ── Editor de estados/etiquetas ───────────────────────────────────────────────
const COLOR_OPTIONS = [
  { id: "amber",   dot: "bg-amber-400" },
  { id: "blue",    dot: "bg-blue-400" },
  { id: "emerald", dot: "bg-emerald-400" },
  { id: "red",     dot: "bg-red-400" },
  { id: "purple",  dot: "bg-purple-400" },
  { id: "sky",     dot: "bg-sky-400" },
  { id: "indigo",  dot: "bg-indigo-400" },
  { id: "pink",    dot: "bg-pink-400" },
  { id: "orange",  dot: "bg-orange-400" },
  { id: "slate",   dot: "bg-slate-400" },
];

function StatusesEditor({ es, activeStatuses, customStatuses, changeStatusLabel, changeStatusColor, addCustomStatus, removeCustomStatus, resetCustomStatuses, toast }) {
  const [newLabel, setNewLabel] = React.useState("");
  const [newColor, setNewColor] = React.useState("blue");
  const isCustomized = !!customStatuses;

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    addCustomStatus(trimmed, trimmed, newColor);
    setNewLabel("");
    setNewColor("blue");
    toast({ title: es ? `Estado "${trimmed}" agregado ✓` : `Status "${trimmed}" added ✓` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-400 font-semibold">
          {es ? "Administra los estados de reserva disponibles" : "Manage available reservation statuses"}
        </p>
        {isCustomized && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { resetCustomStatuses(); toast({ title: es ? "Estados restaurados ✓" : "Statuses reset ✓" }); }}
            data-testid="reset-statuses-btn"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-xs font-bold text-slate-500 transition-all">
            <RotateCcw size={10} /> {es ? "Restaurar" : "Reset"}
          </motion.button>
        )}
      </div>

      {/* Status list */}
      <div className="space-y-2 mb-4">
        {activeStatuses.map(s => (
          <motion.div key={s.key} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 bg-white/60 border border-white/80 rounded-2xl px-3 py-2.5">
            {/* Color picker */}
            <div className="flex items-center gap-1 shrink-0">
              {COLOR_OPTIONS.map(c => (
                <button key={c.id} onClick={() => changeStatusColor(s.key, c.id)}
                  data-testid={`status-color-${s.key}-${c.id}`}
                  className={`w-4 h-4 rounded-full ${c.dot} transition-all ${s.color === c.id ? "ring-2 ring-offset-1 ring-slate-600 scale-125" : "opacity-50 hover:opacity-100"}`}
                />
              ))}
            </div>
            {/* Label input */}
            <input
              type="text"
              value={s.label}
              onChange={e => changeStatusLabel(s.key, e.target.value)}
              data-testid={`status-label-${s.key}`}
              className="flex-1 bg-transparent border-b border-slate-200/80 focus:border-[var(--t-from)] focus:outline-none text-sm font-bold text-slate-800 py-0.5 min-w-0 transition-colors"
            />
            {/* Internal key badge */}
            <span className="text-[9px] text-slate-300 font-mono shrink-0 hidden sm:block">{s.key}</span>
            {/* Delete */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (activeStatuses.length <= 1) { toast({ title: es ? "Debe haber al menos 1 estado" : "At least 1 status required", variant: "destructive" }); return; }
                removeCustomStatus(s.key);
                toast({ title: es ? `Estado eliminado` : "Status deleted" });
              }}
              data-testid={`status-delete-${s.key}`}
              disabled={activeStatuses.length <= 1}
              className="p-1.5 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all disabled:opacity-30 shrink-0">
              <Trash2 size={12} />
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Add new status */}
      <div className="border-t border-white/50 pt-3">
        <p className="text-[10px] font-bold text-slate-400 mb-2">{es ? "Agregar nuevo estado" : "Add new status"}</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder={es ? "Nombre del estado…" : "Status name…"}
              data-testid="new-status-label-input"
              className="w-full bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-xl px-2 py-2">
            {COLOR_OPTIONS.map(c => (
              <button key={c.id} onClick={() => setNewColor(c.id)}
                data-testid={`new-status-color-${c.id}`}
                className={`w-4 h-4 rounded-full ${c.dot} transition-all ${newColor === c.id ? "ring-2 ring-offset-1 ring-slate-600 scale-125" : "opacity-40 hover:opacity-90"}`}
              />
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={handleAdd} disabled={!newLabel.trim()}
            data-testid="add-status-btn"
            className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-40 whitespace-nowrap transition-all flex items-center gap-1.5">
            <Plus size={12} /> {es ? "Agregar" : "Add"}
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200/60">
        <CheckCircle size={11} />
        {es ? "Los estados se aplican al formulario de reservas y a todos los filtros" : "Statuses apply to the reservation form and all filters"}
      </motion.div>
    </motion.div>
  );
}
function SiteTitlesSection({ es, customLabels, changeCustomLabel, resetCustomLabels, toast,
  activeStatuses, customStatuses, changeStatusLabel, changeStatusColor, addCustomStatus, removeCustomStatus, resetCustomStatuses }) {
  const LABEL_GROUPS = [
    {
      id: "nav",
      title: es ? "Barra Lateral" : "Sidebar",
      desc: es ? "Nombres de las secciones en el menú" : "Section names in the sidebar menu",
      fields: [
        { key: "nav.dashboard",    label: "Dashboard",       placeholder: "Dashboard" },
        { key: "nav.reservations", label: es ? "Reservaciones" : "Reservations", placeholder: es ? "Reservaciones" : "Reservations" },
        { key: "nav.calendar",     label: es ? "Calendario" : "Calendar",       placeholder: es ? "Calendario" : "Calendar" },
        { key: "nav.socios",       label: es ? "Socios" : "Partners",           placeholder: es ? "Socios" : "Partners" },
        { key: "nav.database",     label: es ? "Base de Datos" : "Database",    placeholder: es ? "Base de Datos" : "Database" },
        { key: "nav.appearance",   label: es ? "Apariencia" : "Appearance",     placeholder: es ? "Apariencia" : "Appearance" },
        { key: "nav.settings",     label: es ? "Ajustes" : "Settings",          placeholder: es ? "Ajustes" : "Settings" },
        { key: "nav.tagline",      label: es ? "Eslogan sidebar" : "Sidebar tagline", placeholder: es ? "Gestión de Reservas" : "Reservation Manager" },
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      desc: es ? "Tarjetas y títulos de estadísticas" : "Stat cards and section titles",
      fields: [
        { key: "dashboard.upcoming",      label: es ? "Tarjeta: Próximos Eventos" : "Card: Upcoming Events",       placeholder: es ? "Próximos Eventos" : "Upcoming Events" },
        { key: "dashboard.confirmed",     label: es ? "Tarjeta: Confirmados" : "Card: Confirmed",                 placeholder: es ? "Confirmados" : "Confirmed" },
        { key: "dashboard.pending",       label: es ? "Tarjeta: Pago Pendiente" : "Card: Pending Payment",        placeholder: es ? "Pago Pendiente" : "Pending Payment" },
        { key: "dashboard.total",         label: es ? "Tarjeta: Total Reservas" : "Card: Total Reservations",     placeholder: es ? "Total Reservas" : "Total Reservations" },
        { key: "dashboard.realIncome",    label: es ? "Tarjeta: Ingreso Real" : "Card: Real Income",             placeholder: es ? "Ingreso Real" : "Real Income" },
        { key: "dashboard.upcomingTitle", label: es ? "Sección: Próximas Reservas" : "Section: Upcoming Reservations", placeholder: es ? "Próximas Reservas" : "Upcoming Reservations" },
      ],
    },
    {
      id: "pages",
      title: es ? "Encabezados" : "Headers",
      desc: es ? "Subtítulos y descripciones de cada sección" : "Subtitles and descriptions of each section",
      fields: [
        { key: "settings.title",    label: es ? "Título: Ajustes" : "Title: Settings",            placeholder: es ? "Ajustes" : "Settings" },
        { key: "settings.subtitle", label: es ? "Subtítulo: Ajustes" : "Subtitle: Settings",      placeholder: es ? "Personaliza tu experiencia" : "Customize your experience" },
        { key: "calendar.subtitle", label: es ? "Subtítulo: Calendario" : "Subtitle: Calendar",   placeholder: es ? "Vista mensual de eventos" : "Monthly event view" },
      ],
    },
    { id: "statuses", title: es ? "Estados" : "Statuses", desc: "" },
  ];

  const [expandedGroup, setExpandedGroup] = React.useState("nav");
  const hasChanges = Object.keys(customLabels).length > 0;

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }} className="glass rounded-3xl p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl btn-primary flex items-center justify-center shrink-0">
            <Tag size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {es ? "Títulos del Sitio" : "Site Titles"}
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 uppercase tracking-wide">NUEVO</span>
            </h2>
            <p className="text-xs text-slate-400">{es ? "Personaliza cada título, nombre y etiqueta de la app" : "Customize every title, name and label in the app"}</p>
          </div>
        </div>
        {hasChanges && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { resetCustomLabels(); toast({ title: es ? "Títulos restaurados ✓" : "Titles reset ✓" }); }}
            data-testid="reset-labels-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-all">
            <RotateCcw size={11} /> {es ? "Restaurar todo" : "Reset all"}
          </motion.button>
        )}
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 mb-4 bg-white/40 rounded-2xl p-1">
        {LABEL_GROUPS.map(g => (
          <button key={g.id} onClick={() => setExpandedGroup(g.id)}
            data-testid={`labels-tab-${g.id}`}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${expandedGroup === g.id ? "btn-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
            {g.title}
          </button>
        ))}
      </div>

      {/* Fields for nav / dashboard / pages */}
      <AnimatePresence mode="wait">
        {LABEL_GROUPS.filter(g => g.id === expandedGroup && g.id !== "statuses" && g.fields).map(group => (
          <motion.div key={group.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <p className="text-[10px] text-slate-400 font-semibold mb-3">{group.desc}</p>
            <div className="space-y-2.5">
              {group.fields.map(field => {
                const current = customLabels[field.key] ?? "";
                const isModified = !!customLabels[field.key];
                return (
                  <div key={field.key} className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">{field.label}</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={current}
                          onChange={e => changeCustomLabel(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          data-testid={`label-input-${field.key.replace(".", "-")}`}
                          className={`flex-1 bg-white/70 border rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/40 transition-all ${isModified ? "border-[var(--t-from)]/40 bg-white/90" : "border-white/80"}`}
                        />
                        {isModified && (
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => changeCustomLabel(field.key, "")}
                            data-testid={`label-reset-${field.key.replace(".", "-")}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all shrink-0">
                            <RotateCcw size={12} />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasChanges && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200/60">
                <CheckCircle size={11} />
                {es ? "Los cambios se aplican en tiempo real en toda la app" : "Changes apply in real-time across the whole app"}
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Estados tab */}
        {expandedGroup === "statuses" && (
          <StatusesEditor
            key="statuses"
            es={es}
            activeStatuses={activeStatuses}
            customStatuses={customStatuses}
            changeStatusLabel={changeStatusLabel}
            changeStatusColor={changeStatusColor}
            addCustomStatus={addCustomStatus}
            removeCustomStatus={removeCustomStatus}
            resetCustomStatuses={resetCustomStatuses}
            toast={toast}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}