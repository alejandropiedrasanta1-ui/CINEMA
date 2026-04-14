# PRD — Cinema Productions · Gestión de Reservas de Eventos
_Última actualización: Febrero 2026_

---

## Problema
Sistema de gestión de reservas para eventos (bodas, quinceañeras, fiestas sociales, eventos corporativos, conferencias). El administrador necesita registrar clientes, fechas, montos, anticipos y comprobantes de pago.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Framer Motion (Liquid Glass UI)
- **Backend**: FastAPI + MongoDB
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

### Ingreso Real (Iteración 5 - Febrero 2026) ✅
- Fórmula: Ingreso Real = Total del evento − Costo del equipo (socios asignados)
- Visible en sección "Fotógrafo / Equipo" de cada reserva
- Panel global en página de Socios: total_event_amount, total_partner_cost, real_income

---

## Endpoints Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/stats | Estadísticas del dashboard |
| GET | /api/reservations | Listar reservas (sin imágenes) |
| POST | /api/reservations | Crear reserva |
| GET | /api/reservations/{id} | Detalle con imágenes |
| PUT | /api/reservations/{id} | Actualizar reserva (incluye locations, assigned_partners) |
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
| GET | /api/financials | Totales globales: eventos, equipo, ingreso real |

---

## Backlog / Próximas mejoras (P1/P2)

### P1 (Próximo sprint)
- [ ] Notificaciones / recordatorios automáticos por WhatsApp o email
- [ ] Buscar reservas por mes/año en el calendario
- [ ] Imprimir comprobante directamente desde el detalle

### P2
- [ ] Portal para clientes (ver su reserva con link único)
- [ ] Galería de fotos del evento (subir fotos post-evento)
- [ ] Reporte mensual de ingresos en PDF
- [ ] Integración de pagos online (Stripe / Wompi para Guatemala)
