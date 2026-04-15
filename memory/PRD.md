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

### Actualizar App Desktop (Abril 2026) ✅
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

## Backlog / Próximas mejoras

### P1 (Próximo sprint)
- [ ] WhatsApp automático vía Twilio (actualmente es link manual wa.me)
- [ ] Imprimir comprobante directamente desde el detalle

### P2
- [ ] Portal para clientes (ver su reserva con link único)
- [ ] Galería de fotos del evento (subir fotos post-evento)
- [ ] Reporte mensual de ingresos en PDF
- [ ] Integración de pagos online (Stripe / Wompi para Guatemala)
