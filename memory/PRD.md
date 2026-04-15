# PRD — Cinema Productions · Gestión de Reservas de Eventos
_Última actualización: Abril 2026_

---

## Problema
Sistema de gestión de reservas para eventos (bodas, quinceañeras, fiestas sociales, eventos corporativos, conferencias). El administrador necesita registrar clientes, fechas, montos, anticipos y comprobantes de pago.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Framer Motion (Liquid Glass UI)
- **Backend**: FastAPI + MongoDB (Motor async) + APScheduler
- **Autenticación**: Sin login (acceso directo de administrador)
- **Moneda por defecto**: GTQ (Quetzal Guatemalteco)

---

## Implementado ✅

### Core (MVP)
- CRUD completo de reservas (crear, leer, actualizar, eliminar)
- Campos: nombre, teléfono, email, tipo de evento, fecha, hora, lugar, invitados, total, anticipo, estado, notas
- Estados: Pendiente / Confirmado / Completado / Cancelado
- Subida de comprobantes de pago (imágenes y PDF, base64 en MongoDB)
- Vista lightbox de comprobantes
- Dashboard con estadísticas (próximos, confirmados, pago pendiente, total)
- Vista de Calendario mensual con eventos por día
- Filtros en lista de reservaciones (búsqueda, tipo, estado)

### Diseño — Liquid Glass
- Glassmorphism (backdrop-blur, transparencias, bordes redondeados)
- Animaciones Framer Motion en todas las páginas y elementos
- 4 blobs animados en el fondo (mesh background)
- Fuentes: Cabinet Grotesk + Satoshi

### Ajustes
- Cambio de idioma ES / EN
- Cambio de moneda: GTQ (default), MXN, USD, EUR, COP, HNL
- Cambio de tema (6 colores: Índigo, Rosa, Esmeralda, Ámbar, Cielo, Pizarra)
- Exportar reservas: CSV y JSON

### Logo y Branding
- Logo Cinema Productions en sidebar
- Quetzal Guatemalteco (Q) como moneda por defecto

### PDF por reserva
- Botón PDF en detalle de reserva y en lista
- Generado con jsPDF: header, datos, barra de progreso, footer

### Socios (Iteración 5 - Febrero 2026) ✅
- CRUD completo de Socios (fotógrafos, videógrafos, asistentes)
- Foto de perfil del socio (upload vía POST /api/socios/{id}/photo)
- Campos: nombre, rol, teléfono, email, tarifa por evento, notas
- Asignación de socios a reservas con monto de pago específico
- Remover socios de una reserva
- Panel financiero en página Socios: Total Eventos, Costo Equipo, Ingreso Real

### Ubicaciones (Iteración 5 - Febrero 2026) ✅
- Sección "Ubicaciones" en cada reserva
- 3 tipos: Maquillaje, Ceremonia, Fiesta
- Campos: dirección/nombre del lugar + link de Waze
- Botón "Abrir en Waze" al visualizar

### Formularios Full-Screen (Iteración 7 - Febrero 2026) ✅
- ReservationForm y SocioForm rediseñados como páginas completas (no modales)
- Toggle Pendiente/Pagado en sección "Fotógrafo / Equipo" de cada reserva
- Sub-totales en TeamSection: "Pagado al equipo" y "Pendiente equipo"
- Panel en página Socios: 4 cards → Total Eventos, Costo Equipo, Pagado Equipo, Ingreso Real

### Fix Notificaciones + PDF Export (Iteración 12 - Feb 2026) ✅
- **useNotifications.js** reescrito: polling cada 60s (no 30 min), chequeo por hora configurada, `notifyImmediate()` que busca el evento más próximo SIN filtro de ventana
- **Settings Recordatorios**: botón "Probar ahora — notificar evento más próximo" real, selector de hora (time input), `handleRequestPermission` llama `startNotifications(true)` al activar
- **PDF Export fix**: `doc.getNumberOfPages()` en lugar de `doc.internal.getNumberOfPages()` para jsPDF v4.2.1
- **Bug fix**: `formatCurrency` no estaba en destructuring de `useSettings()` en Settings.jsx → PDF ahora genera correctamente

- **Notificaciones del Sistema (Windows/macOS)** en Ajustes → Recordatorios:
  - Bloque con estado dinámico: ACTIVO / BLOQUEADO / INACTIVO
  - Botón "Activar notificaciones de Windows" → solicita permiso al navegador
  - Cuando activo: muestra estado verde + botón "Enviar notificación de prueba"
  - Cuando bloqueado: instrucciones para reactivar desde config del navegador
  - Usa `Notification.requestPermission()` nativo del navegador
- **Reporte PDF Visual** en Ajustes → Exportar Datos:
  - Botón rojo "Exportar reporte PDF — todas las reservas"
  - `generateAllReservationsPDF()` en `/lib/generatePDF.js`
  - Encabezado oscuro con branding + barra de estadísticas (activas, confirmadas, saldo)
  - Reservas agrupadas por estado (Confirmado/Pendiente/Completado/Cancelado) con colores
  - Columnas: Cliente, Tipo de Evento, Fecha, Total, Anticipo
  - Filas alternas, divisores, footer con paginación

- **3 Presets de Diseño**: Glass Aurora (glassmorphismo + blobs), Crystal (cristal opaco), Minimal (blanco sólido sin blobs)
- Cada preset tiene mini-preview visual interactiva en la tarjeta de selección
- CSS overrides via `data-preset` attribute en `<html>` para cambiar `.glass`, `.glass-*`, `body bg`, y `.mesh-bg`
- **Toggle de Animaciones**: usa `MotionConfig reducedMotion` de framer-motion para desactivar todas las animaciones JS
- **Estilo de Bordes**: 3 opciones (Suaves/Medios/Rectos) via `data-radius` overrides en CSS para `rounded-*`
- Sección "Apariencia" en Ajustes reemplaza la anterior sección de solo colores
- Layout sidebar footer muestra nombre del preset activo (v1.0 · Crystal, etc.)
- Todo persiste en localStorage: claves `preset`, `animations`, `radius`

- Creado `/frontend/src/lib/eventConfig.js` — configuración centralizada: icono Lucide + colores por tipo de evento
- Dashboard: "Tipos de Evento" con tarjetas visuales (icono, contador animado, barra de progreso, %)
- Eliminado el gráfico de estado del Dashboard (solo distribución por tipo)
- Calendario: leyenda con iconos Lucide + chips con iconos en análisis mensual + pills en celdas con icono
- Reservaciones: columna Tipo usa iconos Lucide (no emojis)
- Sidebar Layout: hover con animación de desplazamiento
- CSS nuevas clases: shimmer-sweep, fade-up, pulse-glow animations
- Iconos: Heart=Boda, Crown=Quinceañera, PartyPopper=Fiesta Social, Briefcase=Evento Corporativo, Monitor=Conferencia, CalendarDays=Otro

- Sección "Recordatorios" en Ajustes:
  - Toggle activar/desactivar recordatorios automáticos
  - Slider de días de anticipación (1-30 días, default: 3)
  - Selector de canal: Email / WhatsApp / Ambos
  - Input email del administrador
  - Input número WhatsApp (con botón "Abrir WhatsApp" → wa.me link)
  - Campo Clave API de Resend (enmascarado en almacenamiento)
  - Botón "Guardar configuración"
  - Botón "Enviar recordatorio de prueba"
- APScheduler cron diario a las 8:00am que revisa eventos próximos y envía emails (Resend)
- Endpoint manual: POST /api/reminders/send

### Base de Datos Dinámica (Iteración 8 - Abril 2026) ✅
- Sección "Base de Datos" en Ajustes:
  - Estadísticas en tiempo real: Colecciones, Documentos, Datos, Almacenamiento, Índices, Total
  - Conexión activa (URL actual enmascarada si tiene credenciales)
  - Badge "Original" / "Personalizada"
  - Input para nueva URL de MongoDB
  - Botón "Probar conexión" (timeout 5s)
  - Botón "Conectar" (cambia DB en caliente, persiste en .db_override)
  - Botón "Restaurar original" (aparece solo cuando hay URL custom)
- Cambio de DB en caliente sin reiniciar servidor
- Persistencia en /app/backend/.db_override (cargado al inicio)

### Búsqueda por Mes/Año en Calendario (Iteración 8 - Abril 2026) ✅
- Botón lupa en esquina superior del calendario
- Barra animada con dropdowns de Mes y Año
- Rango de años: ±10 años del año actual
- Botón "Hoy" para volver al mes actual
- Clic en título del mes también abre/cierra la barra

---

### Dashboard actualizado (Abril 2026) ✅
- Eliminada card "Confirmados"
- Agregada card "Ingreso Real" (total eventos - costo equipo)
- Orden: Próximos Eventos → Total Reservas → Pago Pendiente → Ingreso Real
- Backend `/api/stats` ahora retorna `real_income` calculado en tiempo real

### Personalización de Tipos de Evento (Abril 2026) ✅
- Nueva sección en Ajustes → Apariencia: "Iconos y Colores por Tipo de Evento"
- 6 tarjetas editables (Boda, Quinceañera, Fiesta Social, Evento Corporativo, Conferencia, Otro)
- Paleta de 30 colores + 36 iconos Lucide disponibles
- Los cambios se persisten en localStorage y se aplican en Dashboard, Calendario y Reservaciones
- Botón "Restaurar" por tipo para regresar a defaults

### Diseños PDF + Borrar Datos + Nombres de Tipos (Abril 2026) ✅
- **Base de Datos**: botón "Borrar todos los datos" con confirmación inline (elimina reservas + socios, conserva ajustes)
- **3 diseños PDF** (Oscuro/Claro/Elegante) seleccionables en Apariencia → persisten en localStorage → se aplican a PDF individual y reporte general
- **Nombres editables** de tipos de evento: input en el editor inline, actualización en tiempo real, persiste en localStorage
- `getEventTypeName(type)` usado en ReservationForm dropdown, lista de Reservaciones y filtro
- `generatePDF.js` refactorizado con sistema de temas (PDF_THEMES) para ambas funciones


- Sección "LOGO Y BRANDING" en Ajustes → Apariencia
- Upload logo web (PNG/JPG, compresión automática via canvas) → aparece en sidebar y header móvil
- Slider de tamaño 24-80px para el logo en sidebar
- Toggle "Usar logo en PDFs" — aplica en comprobantes y reporte general
- Toggle "Logo diferente para PDFs" + upload separado para documentos
- Lógica: usePdfLogo=false → skip logo en PDF; =true sin custom → usa web logo; =true con custom → usa PDF logo
- Persistencia en localStorage, reactivo vía SettingsContext
- `generatePDF.js` actualizado: acepta `logoBase64` (undefined=default /logo.png, null=sin logo, string=usar)


- Nuevo flujo 2 pasos en Ajustes → App de Escritorio
- Paso 1: "Actualizar App" → llama `/api/download/package/rebuild` → build yarn en background
- Polling cada 3s con barra de progreso animada
- Paso 2: "Descargar" se activa solo cuando el build está listo
- Evita descargar versiones desactualizadas


- `.env` con comentarios completos explicando las 3 opciones (embedded, local, Atlas)
- `config.py` — ventana visual tkinter para cambiar MONGO_URL sin tocar código
- `config.bat` — doble clic abre config.py (o Bloc de Notas como fallback)
- `start.bat` — pregunta C+ENTER para configurar antes de arrancar + verificación HTTP del servidor
- La BD nunca está hardcodeada: todo viene del `.env` leído automáticamente al inicio

## Endpoints Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/stats | Estadísticas del dashboard |
| GET | /api/reservations | Listar reservas (sin imágenes) |
| POST | /api/reservations | Crear reserva |
| GET | /api/reservations/{id} | Detalle con imágenes |
| PUT | /api/reservations/{id} | Actualizar reserva |
| DELETE | /api/reservations/{id} | Eliminar reserva |
| POST | /api/reservations/{id}/receipts | Subir comprobante (max 10MB) |
| DELETE | /api/reservations/{id}/receipts/{rid} | Eliminar comprobante |
| GET | /api/calendar | Eventos para el calendario |
| GET | /api/export/reservations?format=csv|json | Exportar todo |
| GET | /api/socios | Listar socios (sin foto) |
| POST | /api/socios | Crear socio |
| GET | /api/socios/{id} | Detalle socio (con foto) |
| PUT | /api/socios/{id} | Actualizar socio |
| DELETE | /api/socios/{id} | Eliminar socio |
| POST | /api/socios/{id}/photo | Subir foto de perfil (max 5MB) |
| DELETE | /api/socios/{id}/photo | Eliminar foto de perfil |
| GET | /api/financials | Totales globales |
| GET | /api/settings | Obtener configuración de notificaciones |
| PUT | /api/settings | Guardar configuración (API key enmascarada) |
| GET | /api/settings/database | Estadísticas de almacenamiento MongoDB |
| POST | /api/settings/database/test | Probar nueva conexión |
| POST | /api/settings/database/connect | Cambiar conexión activa |
| POST | /api/settings/database/reset | Restaurar URL original |
| POST | /api/reminders/send | Trigger manual de recordatorios |

---

### Gmail OAuth2 + Web Push Notifications (Abril 2026) ✅
- REEMPLAZADO por Resend.com (usuario prefirió esta opción)
- Web Push API con VAPID keys: `/api/push/vapid-key`, `/api/push/subscribe`, `/api/push/test`
- Service Worker (`/sw.js`) para notificaciones nativas en Windows/macOS
- APScheduler que revisa cada minuto si es la hora configurada y envía email + Push automáticamente
- Fix bug: `startNotifications` → `startPolling` en Settings.jsx
- Fix: `getEventTypeName` importado correctamente en Settings.jsx

### Nueva página "Base de Datos" en sidebar (Abril 2026) ✅
- Ruta `/base-de-datos` creada como página independiente
- Ítem "Base de Datos" en sidebar debajo de "Socios"
- Contenido movido de Settings: sección Base de Datos + sección Exportar Datos
- Settings muestra card de enlace a la nueva página
- **Descargar a mi PC**: GET /api/backup/download — JSON completo (reservas + socios + settings)
- **Guardar en servidor**: POST /api/backup/create — guarda en /app/backend/backups/, máx 15 archivos
- **Historial en servidor**: GET /api/backup/history — lista con fecha/tamaño, botones descarga/eliminar
- **Restaurar desde archivo**: POST /api/backup/restore — sube .json y restaura todo
- **Auto-respaldo antes de borrar**: DELETE /api/data/clear-all?auto_backup=true — respaldo automático de seguridad
- **Auto-respaldo antes de restaurar**: el endpoint lo crea antes de sobre-escribir datos
- **Guía MongoDB Atlas**: instrucciones de 4 pasos para base de datos gratuita en la nube (512 MB)
- Testeado al 100% (iteration_16.json)
- **Múltiples períodos**: Pills para 7d, 3d, 2d, 1d, Mismo día (se pueden combinar)
- **Horas antes del evento**: Slider 0–12h (requiere campo hora en la reserva)
- **Telegram Bot**: Gratis, ilimitado. UI con guía de 3 pasos, input token + chat_id, botón Probar
- **ntfy.sh**: Gratis, sin cuenta. App para iOS/Android/PC. UI con guía de 2 pasos, botón Probar
- **Browser Push**: Notificaciones nativas Windows/macOS (ya existente, reorganizado)
- **Email Resend**: Ya existente, reorganizado como card
- Scheduler reescrito: `_dispatch_reminders()` envía en cascada a todos los canales habilitados
- Nuevos endpoints: `POST /api/telegram/test`, `POST /api/ntfy/test`
- Masking seguro del token de Telegram en GET/PUT /api/settings
- Configurado Resend con API key `re_T5Jb9ze3...` y email `alejandropiedrasanta1@gmail.com`
- Eliminada sección Gmail OAuth de la UI (Settings.jsx)
- Nuevo badge "Resend configurado — correos activos" en la UI
- Fix: `reminder_time` agregado al modelo `NotificationSettingsModel`
- Fix: `/api/reminders/send` era 404 (función sin decorador de ruta) — ahora registrado correctamente
- Endpoint mejorado: busca eventos en ventana N días, intenta Resend → Push en cascada
- **Email verificado: llegó a alejandropiedrasanta1@gmail.com correctamente ✓**

### Apariencia avanzada + Config del negocio (Abril 2026) ✅
- **Modo Oscuro**: toggle en Ajustes → Apariencia → Avanzado. CSS [data-dark="true"] overrides en glassmorphism, sidebar, inputs, textos. Persiste en localStorage.
- **Tamaño de texto**: chips Compacto (88%) / Normal / Grande (110%) vía CSS zoom data-attribute
- **Intensidad de fondo**: chips Apagado / Suave / Normal / Vivido - controla opacidad blobs
- **Barra lateral compacta**: toggle reduce sidebar de 240px→72px mostrando solo iconos
- **Formato de fecha**: chips DD/MM/YYYY / MM/DD/YYYY / YYYY-MM-DD
- **Configuración del Negocio**: campos empresa, teléfono, dirección, sitio web, NIT, timezone, anticipo%, horario, backup retention, auto-cleanup → guardados en MongoDB app_settings

### P0 (Completado)
- [x] DatabasePage rediseñada y funcional
- [x] Auto-backup al PC (Descargas + Carpeta fija FileSystem API)
- [x] Export Excel (.xlsx), CSV import, Conexiones guardadas, Limpieza BD
- [x] Modo oscuro + opciones avanzadas de apariencia
- [x] Config del negocio (empresa, horario, anticipo%, timezone, backup retention)

### P1 (Próximo sprint)
- [ ] Configurar Telegram Bot (usuario configura manualmente en Ajustes → Recordatorios)
- [ ] Configurar ntfy.sh (usuario configura manualmente en Ajustes → Recordatorios)
- [ ] WhatsApp automático vía Twilio
- [ ] Imprimir comprobante desde detalle de reserva

### P2
- [ ] Portal para clientes (link único por reserva)
- [ ] Galería de fotos del evento
- [ ] Reporte mensual de ingresos en PDF
- [ ] Integración de pagos Stripe / Wompi Guatemala
