# PRD — Cinema Productions · Gestión de Reservas de Eventos
_Última actualización: Abril 2026_

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

### Core (MVP) — Abril 2026
- CRUD completo de reservas (crear, leer, actualizar, eliminar)
- Campos: nombre, teléfono, email, tipo de evento, fecha, hora, lugar, invitados, total, anticipo, estado, notas
- Estados: Pendiente / Confirmado / Completado / Cancelado
- Subida de comprobantes de pago (imágenes y PDF, base64 en MongoDB)
- Vista lightbox de comprobantes
- Dashboard con estadísticas (próximos, confirmados, pago pendiente, total)
- Vista de Calendario mensual con eventos por día
- Filtros en lista de reservaciones (búsqueda, tipo, estado)

### Diseño — Liquid Glass (Abril 2026)
- Glassmorphism (backdrop-blur, transparencias, bordes redondeados)
- Animaciones Framer Motion en todas las páginas y elementos
- 4 blobs animados en el fondo (mesh background)
- Sin esquinas cuadradas (rounded-2xl, rounded-3xl, rounded-full)
- Fuentes: Cabinet Grotesk + Satoshi

### Ajustes — Abril 2026
- Cambio de idioma ES / EN (todas las etiquetas UI traducidas)
- Cambio de moneda: GTQ (default), MXN, USD, EUR, COP, HNL
- Cambio de tema con un clic (6 colores: Índigo, Rosa, Esmeralda, Ámbar, Cielo, Pizarra)
- Temas aplican instantáneamente vía CSS variables (--t-from, --t-to, --blob-*)
- Persistencia en localStorage
- Exportar todas las reservas: CSV y JSON

### Logo y Branding — Abril 2026
- Logo Cinema Productions en sidebar y header mobile
- Quetzal Guatemalteco (Q) como moneda por defecto

### Descarga de PDF por reserva — Abril 2026
- Botón FileDown en cada fila de la lista de reservaciones
- Botón PDF en el detalle de reserva
- PDF generado con jsPDF incluye:
  - Header oscuro con logo Cinema Productions
  - Nombre del cliente y tipo de evento
  - Badge de estado con color
  - Dos columnas: información del evento + resumen de pago
  - Barra de progreso de pago
  - Sección de notas
  - Footer con fecha de generación
  - Nombre de archivo: `reserva_{cliente}_{fecha}.pdf`

---

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
