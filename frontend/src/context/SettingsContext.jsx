import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setEventConfigOverrides } from "@/lib/eventConfig";

export const THEMES = {
  indigo:   { id: "indigo",   name: "Índigo",    from: "#6366f1", to: "#9333ea", shadow: "rgba(99,102,241,0.28)",  blobs: ["#a5b4fc","#fda4af","#7dd3fc","#d9f99d"] },
  rose:     { id: "rose",     name: "Rosa",      from: "#f43f5e", to: "#ec4899", shadow: "rgba(244,63,94,0.28)",   blobs: ["#fda4af","#fbcfe8","#fecdd3","#fde68a"] },
  emerald:  { id: "emerald",  name: "Esmeralda", from: "#10b981", to: "#06b6d4", shadow: "rgba(16,185,129,0.28)",  blobs: ["#6ee7b7","#67e8f9","#a7f3d0","#bbf7d0"] },
  amber:    { id: "amber",    name: "Ámbar",     from: "#f59e0b", to: "#f97316", shadow: "rgba(245,158,11,0.28)",  blobs: ["#fde68a","#fed7aa","#fcd34d","#fca5a5"] },
  sky:      { id: "sky",      name: "Cielo",     from: "#0ea5e9", to: "#6366f1", shadow: "rgba(14,165,233,0.28)",  blobs: ["#bae6fd","#c7d2fe","#7dd3fc","#ddd6fe"] },
  slate:    { id: "slate",    name: "Pizarra",   from: "#334155", to: "#1e293b", shadow: "rgba(51,65,85,0.22)",    blobs: ["#cbd5e1","#e2e8f0","#94a3b8","#f1f5f9"] },
};

export const PRESETS = [
  {
    id: "aurora",
    name: "Glass Aurora",
    desc: "Glassmorphismo con blobs animados",
    descEn: "Glassmorphism with animated blobs",
  },
  {
    id: "crystal",
    name: "Crystal",
    desc: "Nítido, opaco y profesional",
    descEn: "Sharp, opaque and professional",
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Limpio y sin distracciones",
    descEn: "Clean and distraction-free",
  },
];

export const CURRENCIES = [
  { code: "GTQ", symbol: "Q",  name: "Quetzal Guatemalteco", locale: "es-GT" },
  { code: "MXN", symbol: "$",  name: "Peso Mexicano",        locale: "es-MX" },
  { code: "USD", symbol: "$",  name: "US Dollar",            locale: "en-US" },
  { code: "EUR", symbol: "€",  name: "Euro",                 locale: "es-ES" },
  { code: "COP", symbol: "$",  name: "Peso Colombiano",      locale: "es-CO" },
  { code: "HNL", symbol: "L",  name: "Lempira Hondureño",    locale: "es-HN" },
];

export const DEFAULT_STATUSES = [
  { key: "Pendiente",  label: "Pendiente",  color: "amber"   },
  { key: "Confirmado", label: "Confirmado", color: "blue"    },
  { key: "Completado", label: "Completado", color: "emerald" },
  { key: "Cancelado",  label: "Cancelado",  color: "red"     },
];

export const STATUS_COLOR_CLASSES = {
  amber:   "bg-amber-100/80 text-amber-700 border-amber-200/60",
  blue:    "bg-blue-100/80 text-blue-700 border-blue-200/60",
  emerald: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  red:     "bg-red-100/80 text-red-700 border-red-200/60",
  purple:  "bg-purple-100/80 text-purple-700 border-purple-200/60",
  sky:     "bg-sky-100/80 text-sky-700 border-sky-200/60",
  indigo:  "bg-indigo-100/80 text-indigo-700 border-indigo-200/60",
  pink:    "bg-pink-100/80 text-pink-700 border-pink-200/60",
  slate:   "bg-slate-100/80 text-slate-700 border-slate-200/60",
  orange:  "bg-orange-100/80 text-orange-700 border-orange-200/60",
};

const T = {
  es: {
    nav: { dashboard: "Dashboard", reservations: "Reservaciones", calendar: "Calendario", settings: "Ajustes", tagline: "Gestión de Reservas", socios: "Socios", database: "Base de Datos", appearance: "Apariencia" },
    common: { newReservation: "Nueva Reserva", cancel: "Cancelar", save: "Guardar cambios", create: "Crear reserva", saving: "Guardando...", edit: "Editar", viewAll: "Ver todas" },
    statuses: { Pendiente: "Pendiente", Confirmado: "Confirmado", Completado: "Completado", Cancelado: "Cancelado" },
    months: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    days: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
    dashboard: {
      upcoming: "Próximos Eventos", confirmed: "Confirmados", pending: "Pago Pendiente", total: "Total Reservas",
      upcomingSub: "Reservas activas", confirmedSub: "Con anticipo", pendingSub: "Saldo total", totalSub: "Historial",
      realIncome: "Ingreso Real", realIncomeSub: "Total menos costo equipo",
      upcomingTitle: "Próximas Reservas", viewAll: "Ver todas",
      noUpcoming: "No hay reservas próximas", createFirst: "Crea tu primera reserva",
    },
    list: {
      search: "Buscar por cliente, tipo o lugar...", all: "Todos",
      colClient: "Cliente", colType: "Tipo", colDate: "Fecha", colTotal: "Total", colAdvance: "Anticipo", colStatus: "Estado",
      noResults: "No se encontraron reservas",
    },
    calendar: { subtitle: "Vista mensual de eventos" },
    form: {
      newTitle: "Nueva Reserva", editTitle: "Editar Reserva",
      clientName: "Nombre del cliente *", phone: "Teléfono", email: "Email",
      eventType: "Tipo de evento *", status: "Estado", eventDate: "Fecha del evento *",
      time: "Hora", venue: "Lugar del evento", guests: "N° de invitados",
      totalAmount: "Monto total *", advancePaid: "Anticipo pagado", notes: "Notas adicionales",
      placeholders: { name: "Ej: María García", phone: "+52 55 0000 0000", email: "correo@email.com", venue: "Salón, hotel...", guests: "150", notes: "Detalles especiales..." },
    },
    detail: {
      eventInfo: "Información del Evento", eventDate: "Fecha del evento", time: "Hora",
      venue: "Lugar", guests: "Invitados", persons: "personas", phone: "Teléfono", email: "Email", notes: "Notas",
      receipts: "Comprobantes de Pago", uploading: "Subiendo...", uploadHint: "Arrastra o haz clic para subir", uploadSub: "JPG, PNG, PDF — máx 10MB",
      paymentSummary: "Resumen de Pago", totalLabel: "Total", advancePaid: "Anticipo pagado",
      pendingBalance: "Saldo pendiente", paid: "pagado", filesUploaded: "archivo(s) subido(s)", receiptsCount: "Comprobantes",
    },
    settings: {
      title: "Ajustes", subtitle: "Personaliza tu experiencia",
      langTitle: "Idioma", langDesc: "Selecciona el idioma de la interfaz",
      currencyTitle: "Moneda", currencyDesc: "Moneda para mostrar importes",
      colorsTitle: "Colores del Tema", colorsDesc: "Personaliza con un solo clic",
      exportTitle: "Exportar Datos", exportDesc: "Descarga todas tus reservas en el formato que prefieras",
      downloadCSV: "Descargar CSV", downloadJSON: "Descargar JSON", active: "Activo",
      notifTitle: "Recordatorios", notifDesc: "Recibe alertas antes de cada evento",
      notifEnabled: "Activar recordatorios automáticos",
      notifDays: "Días de anticipación",
      notifChannel: "Canal de notificación",
      notifEmail: "Email del administrador",
      notifWhatsapp: "WhatsApp (número con código de país)",
      notifResendKey: "Clave API de Resend (para emails)",
      notifResendPlaceholder: "re_...",
      notifSave: "Guardar configuración",
      notifTest: "Enviar recordatorio de prueba",
      notifSaved: "Configuración guardada",
      notifTestSent: "Recordatorio enviado",
      notifTestNone: "No hay eventos en esa fecha",
      notifWhatsappOpen: "Abrir WhatsApp",
      desktopTitle: "App de Escritorio", desktopDesc: "Descarga e instala la app en tu PC (funciona sin internet)",
      desktopBadge: "100% Local",
      desktopFeature1: "Sin conexión a internet requerida",
      desktopFeature2: "Datos guardados en tu MongoDB",
      desktopFeature3: "Doble clic en start.bat para abrir (Windows)",
      desktopFeature4: "Al cambiar la BD: re-descarga el paquete",
      desktopReq: "Requiere Python 3.8+",
      desktopReqLink: "Descargar Python",
      desktopDownload: "Descargar para Windows (.zip)",
      desktopDownloadMac: "Mac / Linux (.zip)",
      desktopDownloading: "Generando paquete...",
      desktopNote: "El paquete incluye toda la app lista para ejecutar. Al cambiar la BD en Ajustes, vuelve a descargar para actualizar el .env automáticamente.",
      dbTitle: "Base de Datos", dbDesc: "Almacenamiento y conexión a MongoDB",
      dbCollections: "Colecciones", dbObjects: "Documentos", dbDataSize: "Datos",
      dbStorage: "Almacenamiento", dbIndexes: "Índices", dbTotal: "Total usado",
      dbCurrentConn: "Conexión activa", dbCustomLabel: "Personalizada", dbDefaultLabel: "Original",
      dbNewUrl: "Nueva URL de MongoDB (mongodb://...)",
      dbTest: "Probar conexión", dbConnect: "Conectar", dbReset: "Restaurar original",
      dbTestOk: "Conexión exitosa", dbConnectOk: "Base de datos cambiada",
      dbResetOk: "Restaurado a la base de datos original",
    },
  },
  en: {
    nav: { dashboard: "Dashboard", reservations: "Reservations", calendar: "Calendar", settings: "Settings", tagline: "Reservation Manager", socios: "Partners", database: "Database", appearance: "Appearance" },
    common: { newReservation: "New Reservation", cancel: "Cancel", save: "Save changes", create: "Create reservation", saving: "Saving...", edit: "Edit", viewAll: "View all" },
    statuses: { Pendiente: "Pending", Confirmado: "Confirmed", Completado: "Completed", Cancelado: "Cancelled" },
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    dashboard: {
      upcoming: "Upcoming Events", confirmed: "Confirmed", pending: "Pending Payment", total: "Total Reservations",
      upcomingSub: "Active reservations", confirmedSub: "With deposit", pendingSub: "Remaining balance", totalSub: "History",
      realIncome: "Real Income", realIncomeSub: "Total minus team cost",
      upcomingTitle: "Upcoming Reservations", viewAll: "View all",
      noUpcoming: "No upcoming reservations", createFirst: "Create your first reservation",
    },
    list: {
      search: "Search by client, type or venue...", all: "All",
      colClient: "Client", colType: "Type", colDate: "Date", colTotal: "Total", colAdvance: "Deposit", colStatus: "Status",
      noResults: "No reservations found",
    },
    calendar: { subtitle: "Monthly event view" },
    form: {
      newTitle: "New Reservation", editTitle: "Edit Reservation",
      clientName: "Client name *", phone: "Phone", email: "Email",
      eventType: "Event type *", status: "Status", eventDate: "Event date *",
      time: "Time", venue: "Event venue", guests: "No. of guests",
      totalAmount: "Total amount *", advancePaid: "Deposit paid", notes: "Additional notes",
      placeholders: { name: "e.g. Mary Smith", phone: "+1 555 000 0000", email: "client@email.com", venue: "Hall, hotel...", guests: "150", notes: "Special details..." },
    },
    detail: {
      eventInfo: "Event Information", eventDate: "Event date", time: "Time",
      venue: "Venue", guests: "Guests", persons: "people", phone: "Phone", email: "Email", notes: "Notes",
      receipts: "Payment Receipts", uploading: "Uploading...", uploadHint: "Drag or click to upload", uploadSub: "JPG, PNG, PDF — max 10MB",
      paymentSummary: "Payment Summary", totalLabel: "Total", advancePaid: "Deposit paid",
      pendingBalance: "Pending balance", paid: "paid", filesUploaded: "file(s) uploaded", receiptsCount: "Receipts",
    },
    settings: {
      title: "Settings", subtitle: "Customize your experience",
      langTitle: "Language", langDesc: "Select interface language",
      currencyTitle: "Currency", currencyDesc: "Currency for displaying amounts",
      colorsTitle: "Theme Colors", colorsDesc: "Customize with one click",
      exportTitle: "Export Data", exportDesc: "Download all your reservations in your preferred format",
      downloadCSV: "Download CSV", downloadJSON: "Download JSON", active: "Active",
      notifTitle: "Reminders", notifDesc: "Get alerts before each event",
      notifEnabled: "Enable automatic reminders",
      notifDays: "Days in advance",
      notifChannel: "Notification channel",
      notifEmail: "Admin email",
      notifWhatsapp: "WhatsApp (with country code)",
      notifResendKey: "Resend API Key (for emails)",
      notifResendPlaceholder: "re_...",
      notifSave: "Save configuration",
      notifTest: "Send test reminder",
      notifSaved: "Configuration saved",
      notifTestSent: "Reminder sent",
      notifTestNone: "No events on that date",
      notifWhatsappOpen: "Open WhatsApp",
      desktopTitle: "Desktop App", desktopDesc: "Download and install the app on your PC (works offline)",
      desktopBadge: "100% Local",
      desktopFeature1: "No internet connection required",
      desktopFeature2: "Data saved in your MongoDB",
      desktopFeature3: "Double-click start.bat to open (Windows)",
      desktopFeature4: "When changing DB: re-download the package",
      desktopReq: "Requires Python 3.8+",
      desktopReqLink: "Download Python",
      desktopDownload: "Download for Windows (.zip)",
      desktopDownloadMac: "Mac / Linux (.zip)",
      desktopDownloading: "Generating package...",
      desktopNote: "Package includes the full app ready to run. When changing DB in Settings, re-download to auto-update the .env.",
      dbTitle: "Database", dbDesc: "Storage and MongoDB connection",
      dbCollections: "Collections", dbObjects: "Documents", dbDataSize: "Data",
      dbStorage: "Storage", dbIndexes: "Indexes", dbTotal: "Total used",
      dbCurrentConn: "Active connection", dbCustomLabel: "Custom", dbDefaultLabel: "Default",
      dbNewUrl: "New MongoDB URL (mongodb://...)",
      dbTest: "Test connection", dbConnect: "Connect", dbReset: "Restore original",
      dbTestOk: "Connection successful", dbConnectOk: "Database switched",
      dbResetOk: "Restored to original database",
    },
  },
};

const SettingsContext = createContext(null);

function applyThemeVars(themeKey) {
  const t = THEMES[themeKey];
  if (!t) return;
  const r = document.documentElement;
  r.style.setProperty("--t-from", t.from);
  r.style.setProperty("--t-to", t.to);
  r.style.setProperty("--t-shadow", t.shadow);
  r.style.setProperty("--blob-1", t.blobs[0]);
  r.style.setProperty("--blob-2", t.blobs[1]);
  r.style.setProperty("--blob-3", t.blobs[2]);
  r.style.setProperty("--blob-4", t.blobs[3]);
}

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("lang") || "es");
  const [currency, setCurrency] = useState(() => localStorage.getItem("currency") || "GTQ");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "indigo");
  const [preset, setPreset] = useState(() => localStorage.getItem("preset") || "aurora");
  const [animations, setAnimations] = useState(() => (localStorage.getItem("animations") ?? "true") !== "false");
  const [radius, setRadius] = useState(() => localStorage.getItem("radius") || "rounded");
  const [pdfTheme, setPdfTheme] = useState(() => localStorage.getItem("pdf_theme") || "oscuro");

  // ── New appearance options ──────────────────────────────────────────────
  const [darkMode,       setDarkMode]       = useState(() => localStorage.getItem("dark_mode") === "true");
  const [fontScale,      setFontScale]      = useState(() => localStorage.getItem("font_scale") || "normal");
  const [bgIntensity,    setBgIntensity]    = useState(() => localStorage.getItem("bg_intensity") || "normal");
  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem("sidebar_compact") === "true");
  const [dateFormat,     setDateFormat]     = useState(() => localStorage.getItem("date_format") || "DD/MM/YYYY");

  // ── Extended appearance options ────────────────────────────────────────
  const [fontFamily,     setFontFamily]     = useState(() => localStorage.getItem("font_family")  || "satoshi");
  const [cardStyle,      setCardStyle]      = useState(() => localStorage.getItem("card_style")   || "glass");
  const [animSpeed,      setAnimSpeed]      = useState(() => localStorage.getItem("anim_speed")   || "normal");
  const [shadowDepth,    setShadowDepth]    = useState(() => localStorage.getItem("shadow_depth") || "normal");
  const [pageWidth,      setPageWidth]      = useState(() => localStorage.getItem("page_width")   || "medium");
  const [btnCorner,      setBtnCorner]      = useState(() => localStorage.getItem("btn_corner")   || "rounded");
  const [scrollbar,      setScrollbar]      = useState(() => localStorage.getItem("scrollbar")    || "default");
  const [customBgEnabled,setCustomBgEnabled]= useState(() => localStorage.getItem("custom_bg")    === "true");
  const [bgColor1,       setBgColor1]       = useState(() => localStorage.getItem("bg_color1")    || "#f8fafc");
  const [bgColor2,       setBgColor2]       = useState(() => localStorage.getItem("bg_color2")    || "#ede9fe");
  const [customAccent,   setCustomAccent]   = useState(() => localStorage.getItem("custom_accent")|| "");
  const [saturation,     setSaturation]     = useState(() => localStorage.getItem("saturation")   || "normal");
  const [hoverEffect,    setHoverEffect]    = useState(() => localStorage.getItem("hover_effect") || "normal");

  // ── New advanced appearance options ───────────────────────────────────
  const [glassBlur,      setGlassBlur]      = useState(() => parseInt(localStorage.getItem("glass_blur") || "20", 10));
  const [layoutDensity,  setLayoutDensity]  = useState(() => localStorage.getItem("layout_density")  || "standard");
  const [pageTransition, setPageTransition] = useState(() => localStorage.getItem("page_transition") || "fade");
  const [iconSize,       setIconSize]       = useState(() => localStorage.getItem("icon_size")        || "medium");
  const [sidebarStyle,   setSidebarStyle]   = useState(() => localStorage.getItem("sidebar_style")   || "normal");
  const [bgImage,        setBgImage]        = useState(() => localStorage.getItem("bg_image")         || "");

  // ── advancedStyle: 50+ new appearance options ────────────────────────
  const [advancedStyle, setAdvancedStyle] = useState(() => {
    try { return JSON.parse(localStorage.getItem("advanced_style") || "{}"); }
    catch { return {}; }
  });

  // ── Custom site labels ─────────────────────────────────────────────
  const [customLabels, setCustomLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("custom_labels") || "{}"); }
    catch { return {}; }
  });

  const changeCustomLabel = (dotKey, value) => {
    setCustomLabels(prev => {
      const next = { ...prev };
      if (value === "") { delete next[dotKey]; } else { next[dotKey] = value; }
      localStorage.setItem("custom_labels", JSON.stringify(next));
      return next;
    });
  };

  const resetCustomLabels = () => {
    setCustomLabels({});
    localStorage.removeItem("custom_labels");
  };

  // ── Custom statuses ───────────────────────────────────────────────────
  const [customStatuses, setCustomStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("custom_statuses") || "null"); }
    catch { return null; }
  });

  const activeStatuses = customStatuses || DEFAULT_STATUSES;

  const changeStatusLabel = (key, label) => {
    setCustomStatuses(prev => {
      const base = prev || DEFAULT_STATUSES;
      const next = base.map(s => s.key === key ? { ...s, label } : s);
      localStorage.setItem("custom_statuses", JSON.stringify(next));
      return next;
    });
  };

  const changeStatusColor = (key, color) => {
    setCustomStatuses(prev => {
      const base = prev || DEFAULT_STATUSES;
      const next = base.map(s => s.key === key ? { ...s, color } : s);
      localStorage.setItem("custom_statuses", JSON.stringify(next));
      return next;
    });
  };

  const addCustomStatus = (key, label, color) => {
    setCustomStatuses(prev => {
      const base = prev || DEFAULT_STATUSES;
      if (base.find(s => s.key === key)) return base;
      const next = [...base, { key, label, color }];
      localStorage.setItem("custom_statuses", JSON.stringify(next));
      return next;
    });
  };

  const removeCustomStatus = (key) => {
    setCustomStatuses(prev => {
      const base = prev || DEFAULT_STATUSES;
      if (base.length <= 1) return base;
      const next = base.filter(s => s.key !== key);
      localStorage.setItem("custom_statuses", JSON.stringify(next));
      return next;
    });
  };

  const resetCustomStatuses = () => {
    setCustomStatuses(null);
    localStorage.removeItem("custom_statuses");
  };

  // ── Form design styles ────────────────────────────────────────────────────
  const VALID_FORM_DESIGNS = ["aurora","flotante","elegante","tarjeta","app","minimal","cristal"];
  const [reservationFormDesign, setReservationFormDesign] = useState(() => {
    const saved = localStorage.getItem("reservation_form_design") || "aurora";
    return VALID_FORM_DESIGNS.includes(saved) ? saved : "aurora";
  });
  const changeReservationFormDesign = (val) => { setReservationFormDesign(val); localStorage.setItem("reservation_form_design", val); };

  const [socioFormDesign, setSocioFormDesign] = useState(() => {
    const saved = localStorage.getItem("socio_form_design") || "aurora";
    return VALID_FORM_DESIGNS.includes(saved) ? saved : "aurora";
  });
  const changeSocioFormDesign = (val) => { setSocioFormDesign(val); localStorage.setItem("socio_form_design", val); };

  // ── Form fields visibility ────────────────────────────────────────────────
  const FORM_FIELDS_DEFAULT = { email: false, guests: false };
  const [formFieldsVisibility, setFormFieldsVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem("form_fields_visibility");
      if (saved === null) return FORM_FIELDS_DEFAULT;
      return { ...FORM_FIELDS_DEFAULT, ...JSON.parse(saved) };
    } catch { return FORM_FIELDS_DEFAULT; }
  });
  const changeFormFieldVisibility = (field, visible) => {
    setFormFieldsVisibility(prev => {
      const next = { ...prev, [field]: visible };
      localStorage.setItem("form_fields_visibility", JSON.stringify(next));
      return next;
    });
  };
  const resetFormFieldsVisibility = () => {
    setFormFieldsVisibility({});
    localStorage.removeItem("form_fields_visibility");
  };

  // ── Socio fields visibility ───────────────────────────────────────────────
  const [socioFieldsVisibility, setSocioFieldsVisibility] = useState(() => {
    try { return JSON.parse(localStorage.getItem("socio_fields_visibility") || "{}"); }
    catch { return {}; }
  });
  const changeSocioFieldVisibility = (field, visible) => {
    setSocioFieldsVisibility(prev => {
      const next = { ...prev, [field]: visible };
      localStorage.setItem("socio_fields_visibility", JSON.stringify(next));
      return next;
    });
  };
  const resetSocioFieldsVisibility = () => {
    setSocioFieldsVisibility({});
    localStorage.removeItem("socio_fields_visibility");
  };

  // ── Island sidebar margins ─────────────────────────────────────────────────
  const [islandMargins, setIslandMargins] = useState(() => {
    try { return JSON.parse(localStorage.getItem("island_margins") || "null") || { top: 14, bottom: 14, side: 14 }; }
    catch { return { top: 14, bottom: 14, side: 14 }; }
  });
  const changeIslandMargins = (key, value) => {
    setIslandMargins(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("island_margins", JSON.stringify(next));
      return next;
    });
  };

  const changePdfTheme = (t) => { setPdfTheme(t); localStorage.setItem("pdf_theme", t); };

  useEffect(() => {
    applyThemeVars(theme);
    document.documentElement.dataset.preset = preset;
    document.documentElement.dataset.animations = String(animations);
    document.documentElement.dataset.radius = radius;
    // Apply new appearance settings
    document.documentElement.dataset.dark     = String(darkMode);
    document.documentElement.dataset.fs       = fontScale === "normal" ? "" : fontScale;
    document.documentElement.dataset.bg       = bgIntensity;
    document.documentElement.dataset.font     = fontFamily === "satoshi" ? "" : fontFamily;
    document.documentElement.dataset.card     = cardStyle === "glass" ? "" : cardStyle;
    document.documentElement.dataset.animSpeed= animSpeed === "normal" ? "" : animSpeed;
    document.documentElement.dataset.shadow   = shadowDepth === "normal" ? "" : shadowDepth;
    document.documentElement.dataset.width    = pageWidth === "medium" ? "" : pageWidth;
    document.documentElement.dataset.btnCorner= btnCorner === "rounded" ? "" : btnCorner;
    document.documentElement.dataset.scrollbar= scrollbar === "default" ? "" : scrollbar;
    document.documentElement.dataset.customBg = String(customBgEnabled);
    document.documentElement.dataset.sat      = saturation === "normal" ? "" : saturation;
    document.documentElement.dataset.hover    = hoverEffect === "normal" ? "" : hoverEffect;
    document.documentElement.style.setProperty("--glass-blur", `${glassBlur}px`);
    document.documentElement.dataset.density      = layoutDensity === "standard" ? "" : layoutDensity;
    document.documentElement.dataset.pageTransition = pageTransition === "fade" ? "" : pageTransition;
    document.documentElement.dataset.iconSize     = iconSize === "medium" ? "" : iconSize;
    document.documentElement.dataset.sidebarStyle = sidebarStyle === "normal" ? "" : sidebarStyle;
    if (bgImage) {
      document.documentElement.style.setProperty("--bg-image", `url('${bgImage}')`);
      document.documentElement.dataset.bgImage = "true";
    }
    // Apply all advanced style options
    Object.entries(advancedStyle).forEach(([k, v]) => applyOneAdvancedStyle(k, v));
    if (customBgEnabled) {
      document.documentElement.style.setProperty("--bg-c1", bgColor1);
      document.documentElement.style.setProperty("--bg-c2", bgColor2);
    }
    if (customAccent) {
      document.documentElement.style.setProperty("--t-from", customAccent);
      document.documentElement.style.setProperty("--t-to",   customAccent + "cc");
    }
    setEventConfigOverrides(eventConfigs);
  }, []);

  const changeLanguage = (lang) => { setLanguage(lang); localStorage.setItem("lang", lang); };
  const changeCurrency = (cur)  => { setCurrency(cur);  localStorage.setItem("currency", cur); };
  const changeTheme    = (t)    => { setTheme(t);        localStorage.setItem("theme", t); applyThemeVars(t); };

  const changePreset = (p) => {
    setPreset(p);
    localStorage.setItem("preset", p);
    document.documentElement.dataset.preset = p;
  };

  const changeAnimations = (val) => {
    setAnimations(val);
    localStorage.setItem("animations", String(val));
    document.documentElement.dataset.animations = String(val);
  };

  const changeRadius = (r) => {
    setRadius(r);
    localStorage.setItem("radius", r);
    document.documentElement.dataset.radius = r;
  };

  const changeDarkMode = (val) => {
    setDarkMode(val);
    localStorage.setItem("dark_mode", String(val));
    document.documentElement.dataset.dark = String(val);
  };

  const changeFontScale = (val) => {
    setFontScale(val);
    localStorage.setItem("font_scale", val);
    document.documentElement.dataset.fs = val === "normal" ? "" : val;
  };

  const changeBgIntensity = (val) => {
    setBgIntensity(val);
    localStorage.setItem("bg_intensity", val);
    document.documentElement.dataset.bg = val;
  };

  const changeSidebarCompact = (val) => {
    setSidebarCompact(val);
    localStorage.setItem("sidebar_compact", String(val));
  };

  const changeDateFormat = (val) => {
    setDateFormat(val);
    localStorage.setItem("date_format", val);
  };

  const changeFontFamily = (val) => {
    setFontFamily(val);
    localStorage.setItem("font_family", val);
    document.documentElement.dataset.font = val === "satoshi" ? "" : val;
  };
  const changeCardStyle = (val) => {
    setCardStyle(val);
    localStorage.setItem("card_style", val);
    document.documentElement.dataset.card = val === "glass" ? "" : val;
  };
  const changeAnimSpeed = (val) => {
    setAnimSpeed(val);
    localStorage.setItem("anim_speed", val);
    document.documentElement.dataset.animSpeed = val === "normal" ? "" : val;
  };
  const changeShadowDepth = (val) => {
    setShadowDepth(val);
    localStorage.setItem("shadow_depth", val);
    document.documentElement.dataset.shadow = val === "normal" ? "" : val;
  };
  const changePageWidth = (val) => {
    setPageWidth(val);
    localStorage.setItem("page_width", val);
    document.documentElement.dataset.width = val === "medium" ? "" : val;
  };
  const changeBtnCorner = (val) => {
    setBtnCorner(val);
    localStorage.setItem("btn_corner", val);
    document.documentElement.dataset.btnCorner = val === "rounded" ? "" : val;
  };
  const changeScrollbar = (val) => {
    setScrollbar(val);
    localStorage.setItem("scrollbar", val);
    document.documentElement.dataset.scrollbar = val === "default" ? "" : val;
  };
  const changeCustomBg = (enabled, c1, c2) => {
    const color1 = c1 ?? bgColor1;
    const color2 = c2 ?? bgColor2;
    setCustomBgEnabled(enabled);
    setBgColor1(color1);
    setBgColor2(color2);
    localStorage.setItem("custom_bg", String(enabled));
    localStorage.setItem("bg_color1", color1);
    localStorage.setItem("bg_color2", color2);
    document.documentElement.dataset.customBg = String(enabled);
    document.documentElement.style.setProperty("--bg-c1", color1);
    document.documentElement.style.setProperty("--bg-c2", color2);
  };
  const changeCustomAccent = (hex) => {
    setCustomAccent(hex);
    localStorage.setItem("custom_accent", hex);
    if (hex) {
      document.documentElement.style.setProperty("--t-from", hex);
      document.documentElement.style.setProperty("--t-to",   hex + "cc");
    } else {
      applyThemeVars(theme);
    }
  };
  const changeSaturation = (val) => {
    setSaturation(val);
    localStorage.setItem("saturation", val);
    document.documentElement.dataset.sat = val === "normal" ? "" : val;
  };
  const changeHoverEffect = (val) => {
    setHoverEffect(val);
    localStorage.setItem("hover_effect", val);
    document.documentElement.dataset.hover = val === "normal" ? "" : val;
  };

  // ── New advanced appearance features ─────────────────────────
  const changeGlassBlur = (val) => {
    setGlassBlur(val);
    localStorage.setItem("glass_blur", String(val));
    document.documentElement.style.setProperty("--glass-blur", `${val}px`);
  };
  const changeLayoutDensity = (val) => {
    setLayoutDensity(val);
    localStorage.setItem("layout_density", val);
    document.documentElement.dataset.density = val === "standard" ? "" : val;
  };
  const changePageTransition = (val) => {
    setPageTransition(val);
    localStorage.setItem("page_transition", val);
    document.documentElement.dataset.pageTransition = val === "fade" ? "" : val;
  };
  const changeIconSize = (val) => {
    setIconSize(val);
    localStorage.setItem("icon_size", val);
    document.documentElement.dataset.iconSize = val === "medium" ? "" : val;
  };
  const changeSidebarStyle = (val) => {
    setSidebarStyle(val);
    localStorage.setItem("sidebar_style", val);
    document.documentElement.dataset.sidebarStyle = val === "normal" ? "" : val;
  };
  const changeBgImage = (url) => {
    setBgImage(url);
    localStorage.setItem("bg_image", url);
    if (url) {
      document.documentElement.style.setProperty("--bg-image", `url('${url}')`);
      document.documentElement.dataset.bgImage = "true";
    } else {
      document.documentElement.style.removeProperty("--bg-image");
      document.documentElement.dataset.bgImage = "";
    }
  };

  // ── advancedStyle single change function ──────────────────────────────
  const applyOneAdvancedStyle = (key, value) => {
    const el = document.documentElement;
    const a = (name, v, def) => { el.dataset[name] = (v === def) ? "" : String(v); };
    const c = (prop, v) => el.style.setProperty(prop, String(v));
    switch (key) {
      case "accentGradient":  a("accentGrad",  value, "gradient");    break;
      case "btnVariant":      a("btnVariant",  value, "primary");     break;
      case "linkStyle":       a("linkStyle",   value, "hover");       break;
      case "selectionColor":  a("selColor",    value, "accent");      break;
      case "letterSpacing":   a("ltrSpacing",  value, "normal");      break;
      case "lineHeight":      a("lineHeight",  value, "normal");      break;
      case "cardHoverAnim":   a("cardHover",   value, "lift");        break;
      case "btnClickAnim":    a("btnClick",    value, "scale");       break;
      case "toastPosition":   a("toastPos",    value, "bottom-right"); break;
      case "loadingAnim":     a("loadingAnim", value, "spin");        break;
      case "dividerStyle":    a("divider",     value, "solid");       break;
      case "badgeShape":      a("badgeShape",  value, "pill");        break;
      case "cardGap":         a("cardGap",     value, "normal");      break;
      case "headerHeight":    a("headerH",     value, "normal");      break;
      case "navActiveStyle":  a("navActive",   value, "background");  break;
      case "sidebarBrand":    a("sidebarBrand",value, "both");        break;
      case "noiseTexture":    c("--noise-opacity", `${value / 100}`); break;
      case "bgPattern":       a("bgPattern",   value, "none");        break;
      case "vignette":        a("vignette",    value, "none");        break;
      case "glassOpacity":    c("--glass-bg-opacity", `${value / 100}`); break;
      case "glassBorder":     c("--glass-border-opacity", `${value / 100}`); break;
      case "blobCount":       a("blobCount",   value, 4);             break;
      case "blobAnim":        a("blobAnim",    value, "normal");      break;
      case "headingWeight":   c("--heading-weight", value);           break;
      case "headingCase":     a("headingCase", value, "normal");      break;
      case "textShadow":      a("textShadow",  value, "none");        break;
      case "bodyAlign":       a("bodyAlign",   value, "left");        break;
      case "monoFont":        a("monoFont",    value, "default");     break;
      case "linkDecoration":  a("linkDecor",   value, "hover");       break;
      case "inputStyle":      a("inputStyle",  value, "box");         break;
      case "inputSize":       a("inputSize",   value, "normal");      break;
      case "focusRing":       a("focusRing",   value, "glow");        break;
      case "checkboxStyle":   a("checkboxStyle",value,"default");     break;
      case "formLayout":      a("formLayout",  value, "stacked");     break;
      case "selectStyle":     a("selectStyle", value, "custom");      break;
      case "tableStyle":      a("tableStyle",  value, "minimal");     break;
      case "statusBadge":     a("statusBadge", value, "soft");        break;
      case "chartPalette":    a("chartPalette",value, "default");     break;
      case "rowHover":        a("rowHover",    value, "highlight");   break;
      case "numberFormat":    a("numberFormat",value, "comma");       break;
      case "progressStyle":   a("progressStyle",value,"rounded");     break;
      case "metricCard":      a("metricCard",  value, "gradient");    break;
      case "chartType":       a("chartType",   value, "bar");         break;
      case "statsSize":       a("statsSize",   value, "normal");      break;
      case "cardLayout":      a("cardLayout",  value, "grid");        break;
      case "emptyState":      a("emptyState",  value, "icon");        break;
      case "widgetCorner":    a("widgetCorner",value, "round");       break;
      case "reducedMotion":   a("reducedMotion",value,"auto");        break;
      case "highContrast":    a("highContrast",value, "off");         break;
      case "colorBlindMode":  a("colorBlind",  value, "none");        break;
      case "cursorStyle":     a("cursor",      value, "default");     break;
      case "focusVisibility": a("focusVis",    value, "auto");        break;
      default: break;
    }
  };

  const changeAdvancedStyle = (key, value) => {
    setAdvancedStyle(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("advanced_style", JSON.stringify(next));
      applyOneAdvancedStyle(key, value);
      return next;
    });
  };

  // ── Event type custom configs ──────────────────────────────
  const [eventConfigs, setEventConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_event_configs") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    setEventConfigOverrides(eventConfigs);
  }, [eventConfigs]);

  const updateEventTypeConfig = (typeName, updates) => {
    setEventConfigs(prev => {
      const next = { ...prev, [typeName]: { ...(prev[typeName] || {}), ...updates } };
      localStorage.setItem("cp_event_configs", JSON.stringify(next));
      setEventConfigOverrides(next);
      return next;
    });
  };

  const resetEventTypeConfig = (typeName) => {
    setEventConfigs(prev => {
      const next = { ...prev };
      delete next[typeName];
      localStorage.setItem("cp_event_configs", JSON.stringify(next));
      setEventConfigOverrides(next);
      return next;
    });
  };

  // ── Logo settings ─────────────────────────────────────────────
  const [logoUrl,          setLogoUrl]          = useState(() => localStorage.getItem("cp_logo_url")    || null);
  const [pdfLogoUrl,       setPdfLogoUrl]       = useState(() => localStorage.getItem("cp_pdf_logo_url") || null);
  const [logoSize,         setLogoSize]         = useState(() => parseInt(localStorage.getItem("cp_logo_size") || "80", 10));
  const [usePdfLogo,       setUsePdfLogo]       = useState(() => (localStorage.getItem("cp_use_pdf_logo") ?? "true") !== "false");
  const [useCustomPdfLogo, setUseCustomPdfLogo] = useState(() => localStorage.getItem("cp_custom_pdf_logo") === "true");

  const updateLogoSettings = (updates) => {
    if ("url"           in updates) { setLogoUrl(updates.url);                   updates.url           ? localStorage.setItem("cp_logo_url",        updates.url)           : localStorage.removeItem("cp_logo_url"); }
    if ("pdfUrl"        in updates) { setPdfLogoUrl(updates.pdfUrl);             updates.pdfUrl        ? localStorage.setItem("cp_pdf_logo_url",    updates.pdfUrl)        : localStorage.removeItem("cp_pdf_logo_url"); }
    if ("size"          in updates) { setLogoSize(updates.size);                 localStorage.setItem("cp_logo_size",       String(updates.size)); }
    if ("usePdf"        in updates) { setUsePdfLogo(updates.usePdf);             localStorage.setItem("cp_use_pdf_logo",    String(updates.usePdf)); }
    if ("useCustomPdf"  in updates) { setUseCustomPdfLogo(updates.useCustomPdf); localStorage.setItem("cp_custom_pdf_logo", String(updates.useCustomPdf)); }
  };

  const baseT = T[language] || T.es;
  const tr = (() => {
    const noLabels = !Object.keys(customLabels).length;
    const noStatuses = !customStatuses;
    if (noLabels && noStatuses) return baseT;
    const merged = JSON.parse(JSON.stringify(baseT));
    if (!noLabels) {
      Object.entries(customLabels).forEach(([dotKey, val]) => {
        if (!val) return;
        const [section, ...rest] = dotKey.split(".");
        const key = rest.join(".");
        if (merged[section] && key) merged[section][key] = val;
      });
    }
    if (!noStatuses) {
      merged.statuses = Object.fromEntries(customStatuses.map(s => [s.key, s.label]));
    }
    return merged;
  })();

  const formatCurrency = useCallback((n) => {
    const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    return new Intl.NumberFormat(cur.locale, { style: "currency", currency: cur.code, maximumFractionDigits: 0 }).format(n || 0);
  }, [currency]);

  return (
    <SettingsContext.Provider value={{
      language, currency, theme, tr, formatCurrency,
      changeLanguage, changeCurrency, changeTheme,
      preset, animations, radius, pdfTheme,
      changePreset, changeAnimations, changeRadius, changePdfTheme,
      // Appearance (basic)
      darkMode, changeDarkMode,
      fontScale, changeFontScale,
      bgIntensity, changeBgIntensity,
      sidebarCompact, changeSidebarCompact,
      dateFormat, changeDateFormat,
      // Appearance (extended)
      fontFamily, changeCardStyle, cardStyle, changeFontFamily,
      animSpeed, changeAnimSpeed,
      shadowDepth, changeShadowDepth,
      pageWidth, changePageWidth,
      btnCorner, changeBtnCorner,
      scrollbar, changeScrollbar,
      customBgEnabled, bgColor1, bgColor2, changeCustomBg,
      customAccent, changeCustomAccent,
      saturation, changeSaturation,
      hoverEffect, changeHoverEffect,
      // New advanced appearance
      glassBlur, changeGlassBlur,
      layoutDensity, changeLayoutDensity,
      pageTransition, changePageTransition,
      iconSize, changeIconSize,
      sidebarStyle, changeSidebarStyle,
      bgImage, changeBgImage,
      advancedStyle, changeAdvancedStyle,
      // Event & logo
      eventConfigs, updateEventTypeConfig, resetEventTypeConfig,
      logoUrl, pdfLogoUrl, logoSize, usePdfLogo, useCustomPdfLogo, updateLogoSettings,
      // Custom labels
      customLabels, changeCustomLabel, resetCustomLabels,
      // Custom statuses
      activeStatuses, customStatuses,
      changeStatusLabel, changeStatusColor, addCustomStatus, removeCustomStatus, resetCustomStatuses,
      // Island margins
      islandMargins, changeIslandMargins,
      // Form fields visibility
      formFieldsVisibility, changeFormFieldVisibility, resetFormFieldsVisibility,
      socioFieldsVisibility, changeSocioFieldVisibility, resetSocioFieldsVisibility,
      // Form design styles
      reservationFormDesign, changeReservationFormDesign,
      socioFormDesign, changeSocioFormDesign,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
