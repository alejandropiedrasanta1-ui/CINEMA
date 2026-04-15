import { createContext, useContext, useState, useEffect, useCallback } from "react";

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

const T = {
  es: {
    nav: { dashboard: "Dashboard", reservations: "Reservaciones", calendar: "Calendario", settings: "Ajustes", tagline: "Gestión de Reservas", socios: "Socios" },
    common: { newReservation: "Nueva Reserva", cancel: "Cancelar", save: "Guardar cambios", create: "Crear reserva", saving: "Guardando...", edit: "Editar", viewAll: "Ver todas" },
    statuses: { Pendiente: "Pendiente", Confirmado: "Confirmado", Completado: "Completado", Cancelado: "Cancelado" },
    months: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    days: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
    dashboard: {
      upcoming: "Próximos Eventos", confirmed: "Confirmados", pending: "Pago Pendiente", total: "Total Reservas",
      upcomingSub: "Reservas activas", confirmedSub: "Con anticipo", pendingSub: "Saldo total", totalSub: "Historial",
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
    nav: { dashboard: "Dashboard", reservations: "Reservations", calendar: "Calendar", settings: "Settings", tagline: "Reservation Manager", socios: "Partners" },
    common: { newReservation: "New Reservation", cancel: "Cancel", save: "Save changes", create: "Create reservation", saving: "Saving...", edit: "Edit", viewAll: "View all" },
    statuses: { Pendiente: "Pending", Confirmado: "Confirmed", Completado: "Completed", Cancelado: "Cancelled" },
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    dashboard: {
      upcoming: "Upcoming Events", confirmed: "Confirmed", pending: "Pending Payment", total: "Total Reservations",
      upcomingSub: "Active reservations", confirmedSub: "With deposit", pendingSub: "Remaining balance", totalSub: "History",
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

  useEffect(() => {
    applyThemeVars(theme);
    document.documentElement.dataset.preset = preset;
    document.documentElement.dataset.animations = String(animations);
    document.documentElement.dataset.radius = radius;
  }, []);

  const changeLanguage = (lang) => { setLanguage(lang); localStorage.setItem("lang", lang); };
  const changeCurrency = (cur) => { setCurrency(cur); localStorage.setItem("currency", cur); };
  const changeTheme = (t) => { setTheme(t); localStorage.setItem("theme", t); applyThemeVars(t); };

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

  const tr = T[language] || T.es;

  const formatCurrency = useCallback((n) => {
    const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    return new Intl.NumberFormat(cur.locale, { style: "currency", currency: cur.code, maximumFractionDigits: 0 }).format(n || 0);
  }, [currency]);

  return (
    <SettingsContext.Provider value={{
      language, currency, theme, tr, formatCurrency,
      changeLanguage, changeCurrency, changeTheme,
      preset, animations, radius,
      changePreset, changeAnimations, changeRadius,
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
