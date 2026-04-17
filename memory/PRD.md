# PRD — Cinema Productions: Gestión de Reservas de Eventos

## Problema Original
Crear un programa para gestionar reserva de eventos. Un cliente da un anticipo para una fecha. Búsqueda por mes/año en el calendario. Configuración de base de datos dinámica. Recordatorios (Email/WhatsApp). Paquete instalable/portable local. Notificaciones de sistema (Windows) y gráficos de barras en calendario/dashboard.

## Usuario Objetivo
Empresas de producción de eventos (ej. Cinema Productions) que gestionan reservas, pagos anticipados y comunicación con clientes.

---

## Arquitectura
- **Frontend**: React + TailwindCSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI (Python)
- **Base de Datos**: MongoDB (Motor async)
- **Contexto Global**: SettingsContext.jsx (tema, idioma, apariencia, etc.)

### Estructura de archivos clave:
```
/app/
├── backend/
│   ├── server.py             # FastAPI principal (web)
│   └── standalone_app.py     # FastAPI embebido en el ZIP (app local de escritorio)
├── frontend/src/
│   ├── components/
│   │   └── Layout.jsx     # Sidebar (Dashboard, Reservaciones, Calendario, Socios, Base de Datos, Apariencia, Ajustes)
│   ├── context/
│   │   └── SettingsContext.jsx   # Estado global de apariencia + 6 nuevos estados
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Reservations.jsx
│   │   ├── CalendarView.jsx
│   │   ├── Socios.jsx
│   │   ├── DatabasePage.jsx
│   │   ├── AppearancePage.jsx   ← NUEVO (9 secciones de apariencia)
│   │   └── Settings.jsx         ← Solo: idioma, moneda, notif, negocio, escritorio, publicar
│   ├── App.js             # Router con /apariencia route + pageTransition dinámico
│   └── index.css          # Variables CSS dinámicas + nuevos data attributes
```

---

## Funcionalidades Implementadas ✅

### Core
- Gestión de reservas (CRUD) con anticipo, balance, fecha de evento
- Calendario mensual con filtros y visualización
- Dashboard con estadísticas y gráficos
- Gestión de Socios (equipo)

### Apariencia (AppearancePage.jsx — 9 secciones)
- **Paleta de Colores**: 6 temas de acento + color hex personalizado + presets de diseño (Glass Aurora, Crystal, Minimal) + saturación
- **Tipografía e Iconos**: 8 familias de fuente + 3 tamaños de texto + tamaño de iconos (NUEVO)
- **Animaciones y Movimiento**: Toggle de animaciones + velocidad (lento/normal/rápido/instante) + transición de páginas (fade/slide/zoom/ninguna) (NUEVO) + efecto hover
- **Formas y Bordes**: 3 estilos de borde + 5 estilos de tarjeta + 3 estilos de botón + 4 sombras
- **Fondo y Colores**: Modo oscuro + intensidad de fondo + intensidad del vidrio/blur (NUEVO) + gradiente personalizado + imagen de fondo URL (NUEVO)
- **Interfaz y Espacio**: Densidad del contenido (NUEVO) + estilo de barra lateral (NUEVO) + barra lateral compacta + ancho del contenido + scrollbar + formato de fecha
- **Tipos de Evento**: Personalizar icono y color de cada tipo
- **Diseño de PDF**: 3 temas + exportar PDF
- **Logo y Marca**: Logo sidebar + logo PDF separado

### Notificaciones Multi-canal (Settings.jsx)
- Email vía Resend
- Telegram Bot
- ntfy.sh
- Web Push (browser notifications)
- WhatsApp link automático

### Base de Datos (DatabasePage.jsx)
- JSON Backup/Restore
- Auto-backup a PC local
- CSV/Excel Import/Export
- Limpieza de base de datos
- Cambio dinámico de MongoDB URL

### Ajustes (Settings.jsx — solo no-apariencia)
- Idioma (ES/EN)
- Moneda (Q/$/€/₡)
- Config de negocio
- App de escritorio (descarga)
- Publicar en línea (guía de despliegue)

---

## Schema DB Principal

### `app_settings` (MongoDB)
Contiene claves de apariencia + configuración de negocio:
- `theme, preset, animations, radius, pdfTheme`
- `darkMode, fontScale, bgIntensity, sidebarCompact, dateFormat`
- `fontFamily, cardStyle, animSpeed, shadowDepth, pageWidth, btnCorner, scrollbar`
- `customBgEnabled, bgColor1, bgColor2, customAccent, saturation, hoverEffect`
- `glassBlur, layoutDensity, pageTransition, iconSize, sidebarStyle, bgImage` (NUEVOS)
- `eventConfigs, logoUrl, pdfLogoUrl, logoSize, usePdfLogo, useCustomPdfLogo`
- Notificaciones, config negocio, etc.

---

## Rutas API clave
- `GET/POST /api/settings`
- `GET/POST /api/reservations`
- `GET/POST /api/socios`
- `GET /api/db/stats`, `POST /api/db/switch`, `POST /api/db/reset`
- `GET /api/db/export-json`, `POST /api/db/restore`
- `GET /api/db/export-csv`, `POST /api/db/import-csv`
- `GET /api/db/export-xlsx`
- `POST /api/reminders/send-test`

---

## Integraciones de Terceros
- **Resend** — Emails de recordatorio (requiere API key del usuario)
- **Telegram Bot API** — Notificaciones Telegram (requiere token + chat ID)
- **ntfy.sh** — Push notifications (requiere topic name)

---

## Roadmap / Backlog

### P1 — Próximos
- WhatsApp automático vía Twilio

### P2 — Futuro
- Portal para clientes con link único
- Integración de pagos online Stripe/Wompi

---

## Changelog (resumido)
- 2025: MVP inicial — Reservas, Calendario, Dashboard, Socios
- 2025: Notificaciones multi-canal (Resend, Telegram, ntfy, Web Push)
- 2025: Base de datos avanzada (backup, restore, import, export)
- 2025: 13+ opciones de apariencia en Settings.jsx
- 2026-04-15: **Migración a AppearancePage.jsx** + 6 nuevas funciones (glassBlur, layoutDensity, pageTransition, iconSize, sidebarStyle, bgImage) + transiciones de página dinámicas
- 2026: **Limpieza de Settings.jsx** — Eliminadas secciones: "Plantillas de Recordatorio", "Configuración del Negocio", "Importar / Exportar Configuración", "Atajos de Teclado". Secciones conservadas: App de Escritorio, Publicar en Línea, Recordatorios, Idioma, Moneda.
- 2026: **Títulos del Sitio** en Apariencia — Editor de títulos en tiempo real: Barra Lateral (8 campos), Dashboard (6 tarjetas), Encabezados de Página (3 campos). CustomLabels mergeados sobre T[language] en SettingsContext.
- 2026: **Campos de Formulario** en Apariencia — Toggles para activar/desactivar campos opcionales en formularios de Nueva Reserva (Email, Teléfono, Hora, Lugar, Invitados, Anticipo, Notas) y Nuevo Socio (Foto, Teléfono, Email, Tarifa, Notas). Persistido en localStorage. Botones "Mostrar todos" para restablecer.
- 2026-04-17: **Búsqueda por teléfono + Toggle swap nombre/tipo en lista** — Reservaciones ahora filtra también por `client_phone`. Nuevo toggle en Apariencia > Campos de Formulario > "Vista de lista" para intercambiar nombre del cliente con tipo de evento en la columna principal. Persiste en localStorage.
- 2026-04-16: **Fix real_income=0 en app local** — `/stats` en `standalone_app.py` no incluía `assigned_partners` en la proyección ni calculaba `total_event_amount`/`total_partner_cost`. Corregido para que coincida con `server.py`: ahora devuelve `real_income` correcto.
