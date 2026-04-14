from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import csv
import io
import asyncio
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import resend as resend_lib
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

CUSTOM_DB_FILE = ROOT_DIR / '.db_override'
DB_NAME = os.environ['DB_NAME']

# Active MongoDB URL: prefer custom override file
_mongo_url = CUSTOM_DB_FILE.read_text().strip() if CUSTOM_DB_FILE.exists() else os.environ['MONGO_URL']
client = AsyncIOMotorClient(_mongo_url)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


# ─── Lifespan ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(hour=8, minute=0),
        id="daily_reminders",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started")
    yield
    scheduler.shutdown()
    client.close()
    logger.info("Scheduler stopped")


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ─── Helper ──────────────────────────────────────────────
def doc_to_dict(doc: dict) -> dict:
    if doc is None:
        return {}
    d = {k: v for k, v in doc.items() if k != '_id'}
    if '_id' in doc:
        d['id'] = str(doc['_id'])
    return d


# ─── Pydantic Models ─────────────────────────────────────
class ReservationCreate(BaseModel):
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_type: str
    event_date: str
    event_time: Optional[str] = None
    venue: Optional[str] = None
    guests_count: Optional[int] = None
    total_amount: float
    advance_paid: float = 0.0
    status: str = "Pendiente"
    notes: Optional[str] = None


class ReservationUpdate(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    venue: Optional[str] = None
    guests_count: Optional[int] = None
    total_amount: Optional[float] = None
    advance_paid: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    locations: Optional[list] = None
    assigned_partners: Optional[list] = None


class SocioCreate(BaseModel):
    name: str
    role: str = "Fotógrafo"
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    rate_per_event: Optional[float] = None


class SocioUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    rate_per_event: Optional[float] = None


class NotificationSettingsModel(BaseModel):
    reminders_enabled: bool = False
    reminder_days: int = 3
    admin_email: Optional[str] = None
    admin_whatsapp: Optional[str] = None
    notification_channel: str = "email"
    resend_api_key: Optional[str] = None


class DBConnectRequest(BaseModel):
    url: str


# ─── Reminder Logic ──────────────────────────────────────
def _build_reminder_html(events: list, days: int) -> str:
    rows = ""
    for ev in events:
        rows += f"""
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">{ev.get('client_name','')}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">{ev.get('event_type','')}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">{ev.get('event_date','')}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">{ev.get('venue') or '—'}</td>
        </tr>"""
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;">
      <div style="background:#6366f1;border-radius:16px 16px 0 0;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Cinema Productions</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Recordatorio de eventos próximos</p>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px 32px;">
        <p style="color:#374151;font-size:16px;">
          Tienes <strong>{len(events)} evento(s)</strong> programado(s) en <strong>{days} día(s)</strong>:
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px 16px;text-align:left;color:#6366f1;font-size:13px;">Cliente</th>
              <th style="padding:10px 16px;text-align:left;color:#6366f1;font-size:13px;">Tipo</th>
              <th style="padding:10px 16px;text-align:left;color:#6366f1;font-size:13px;">Fecha</th>
              <th style="padding:10px 16px;text-align:left;color:#6366f1;font-size:13px;">Lugar</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
          Cinema Productions — Sistema de Gestión de Reservas
        </p>
      </div>
    </div>"""


async def check_and_send_reminders():
    """Daily cron job: send reminders for upcoming events."""
    try:
        settings_doc = await db.app_settings.find_one({}, {"_id": 0})
        if not settings_doc or not settings_doc.get("reminders_enabled"):
            return

        days = int(settings_doc.get("reminder_days", 3))
        target_date = (datetime.now(timezone.utc).date() + timedelta(days=days)).isoformat()

        cursor = db.reservations.find(
            {"event_date": target_date, "status": {"$nin": ["Cancelado", "Completado"]}},
            {"client_name": 1, "event_date": 1, "event_type": 1, "venue": 1, "_id": 0}
        )
        upcoming = await cursor.to_list(100)

        if not upcoming:
            logger.info(f"No events on {target_date}, skipping reminders.")
            return

        channel = settings_doc.get("notification_channel", "email")
        logger.info(f"Sending reminders for {len(upcoming)} events on {target_date} via {channel}")

        if channel in ("email", "both"):
            api_key = settings_doc.get("resend_api_key")
            admin_email = settings_doc.get("admin_email")
            if api_key and admin_email:
                resend_lib.api_key = api_key
                html = _build_reminder_html(upcoming, days)
                params = {
                    "from": "Cinema Productions <onboarding@resend.dev>",
                    "to": [admin_email],
                    "subject": f"Recordatorio: {len(upcoming)} evento(s) en {days} día(s)",
                    "html": html,
                }
                await asyncio.to_thread(resend_lib.Emails.send, params)
                logger.info(f"Reminder email sent to {admin_email}")
            else:
                logger.warning("Email reminders enabled but api_key or admin_email missing.")

    except Exception as e:
        logger.error(f"Error in reminder job: {e}")


# ─── Routes ──────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Event Reservation API"}


@api_router.get("/stats")
async def get_stats():
    total = await db.reservations.count_documents({})
    upcoming = await db.reservations.count_documents({
        "event_date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        "status": {"$nin": ["Cancelado", "Completado"]}
    })
    pending_payment_cursor = db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"total_amount": 1, "advance_paid": 1, "_id": 0}
    )
    pending_docs = await pending_payment_cursor.to_list(1000)
    total_pending = sum(
        max(0, (d.get("total_amount", 0) or 0) - (d.get("advance_paid", 0) or 0))
        for d in pending_docs
    )
    confirmed = await db.reservations.count_documents({"status": "Confirmado"})
    return {
        "total_reservations": total,
        "upcoming_events": upcoming,
        "pending_payment": round(total_pending, 2),
        "confirmed": confirmed
    }


@api_router.get("/reservations")
async def list_reservations():
    cursor = db.reservations.find({}, {"receipt_images.data": 0})
    docs = await cursor.to_list(1000)
    return [doc_to_dict(d) for d in docs]


@api_router.post("/reservations", status_code=201)
async def create_reservation(reservation: ReservationCreate):
    doc = reservation.model_dump()
    doc["receipt_images"] = []
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reservations.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/reservations/{reservation_id}")
async def get_reservation(reservation_id: str):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    doc = await db.reservations.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return doc_to_dict(doc)


@api_router.put("/reservations/{reservation_id}")
async def update_reservation(reservation_id: str, reservation: ReservationUpdate):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    update_data = {k: v for k, v in reservation.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    result = await db.reservations.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    doc = await db.reservations.find_one({"_id": oid})
    return doc_to_dict(doc)


@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    result = await db.reservations.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {"message": "Reserva eliminada"}


@api_router.post("/reservations/{reservation_id}/receipts")
async def upload_receipt(reservation_id: str, file: UploadFile = File(...)):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx 10MB)")
    b64 = base64.b64encode(content).decode("utf-8")
    receipt = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "content_type": file.content_type,
        "data": b64,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.reservations.update_one(
        {"_id": oid}, {"$push": {"receipt_images": receipt}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {k: v for k, v in receipt.items() if k != "data"}


@api_router.delete("/reservations/{reservation_id}/receipts/{receipt_id}")
async def delete_receipt(reservation_id: str, receipt_id: str):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    result = await db.reservations.update_one(
        {"_id": oid}, {"$pull": {"receipt_images": {"id": receipt_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {"message": "Comprobante eliminado"}


@api_router.get("/export/reservations")
async def export_reservations(format: str = "csv"):
    cursor = db.reservations.find({}, {"receipt_images": 0})
    docs = await cursor.to_list(10000)
    data = [doc_to_dict(d) for d in docs]

    if format == "json":
        return JSONResponse(
            content=data,
            headers={"Content-Disposition": "attachment; filename=reservaciones.json"}
        )

    if not data:
        return Response("", media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=reservaciones.csv"})

    output = io.StringIO()
    fields = ["id", "client_name", "client_phone", "client_email", "event_type", "event_date",
              "event_time", "venue", "guests_count", "total_amount", "advance_paid", "status", "notes", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(data)
    return Response(output.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=reservaciones.csv"})


@api_router.get("/calendar")
async def get_calendar_events():
    cursor = db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"client_name": 1, "event_date": 1, "event_type": 1, "status": 1, "_id": 1}
    )
    docs = await cursor.to_list(1000)
    return [doc_to_dict(d) for d in docs]


# ─── Socios ──────────────────────────────────────────────

@api_router.get("/socios")
async def list_socios():
    cursor = db.socios.find({}, {"photo": 0, "photo_content_type": 0})
    docs = await cursor.to_list(1000)
    return [doc_to_dict(d) for d in docs]


@api_router.post("/socios", status_code=201)
async def create_socio(socio: SocioCreate):
    doc = socio.model_dump()
    doc["photo"] = None
    doc["photo_content_type"] = None
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.socios.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/socios/{socio_id}")
async def get_socio(socio_id: str):
    try:
        oid = ObjectId(socio_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    doc = await db.socios.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return doc_to_dict(doc)


@api_router.put("/socios/{socio_id}")
async def update_socio(socio_id: str, socio: SocioUpdate):
    try:
        oid = ObjectId(socio_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    update_data = {k: v for k, v in socio.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    result = await db.socios.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    doc = await db.socios.find_one({"_id": oid})
    return doc_to_dict(doc)


@api_router.delete("/socios/{socio_id}")
async def delete_socio(socio_id: str):
    try:
        oid = ObjectId(socio_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    result = await db.socios.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return {"message": "Socio eliminado"}


@api_router.post("/socios/{socio_id}/photo")
async def upload_socio_photo(socio_id: str, file: UploadFile = File(...)):
    try:
        oid = ObjectId(socio_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx 5MB)")
    b64 = base64.b64encode(content).decode("utf-8")
    result = await db.socios.update_one(
        {"_id": oid}, {"$set": {"photo": b64, "photo_content_type": file.content_type}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return {"message": "Foto actualizada"}


@api_router.delete("/socios/{socio_id}/photo")
async def delete_socio_photo(socio_id: str):
    try:
        oid = ObjectId(socio_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    await db.socios.update_one({"_id": oid}, {"$set": {"photo": None, "photo_content_type": None}})
    return {"message": "Foto eliminada"}


@api_router.get("/financials")
async def get_financials():
    cursor = db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"total_amount": 1, "advance_paid": 1, "assigned_partners": 1}
    )
    docs = await cursor.to_list(10000)
    total_event_amount = sum((d.get("total_amount") or 0) for d in docs)
    total_advance = sum((d.get("advance_paid") or 0) for d in docs)
    total_partner_cost = 0
    total_paid_to_partners = 0
    total_pending_to_partners = 0
    for d in docs:
        for p in (d.get("assigned_partners") or []):
            amt = p.get("payment") or 0
            total_partner_cost += amt
            if p.get("payment_status") == "Pagado":
                total_paid_to_partners += amt
            else:
                total_pending_to_partners += amt
    return {
        "total_event_amount": round(total_event_amount, 2),
        "total_advance": round(total_advance, 2),
        "total_partner_cost": round(total_partner_cost, 2),
        "total_paid_to_partners": round(total_paid_to_partners, 2),
        "total_pending_to_partners": round(total_pending_to_partners, 2),
        "real_income": round(total_event_amount - total_partner_cost, 2),
    }


# ─── App Settings ─────────────────────────────────────────

@api_router.get("/settings")
async def get_app_settings():
    doc = await db.app_settings.find_one({}, {"_id": 0})
    if not doc:
        return {}
    # Mask API key in response
    if doc.get("resend_api_key"):
        key = doc["resend_api_key"]
        doc["resend_api_key"] = "re_" + "*" * 20 + key[-4:] if len(key) > 4 else "****"
        doc["has_resend_key"] = True
    else:
        doc["has_resend_key"] = False
    return doc


@api_router.put("/settings")
async def update_app_settings(settings: NotificationSettingsModel):
    update_doc = settings.model_dump()

    # If API key is masked (unchanged), don't overwrite the real key
    key = update_doc.get("resend_api_key") or ""
    if "****" in key or key.startswith("re_" + "*"):
        update_doc.pop("resend_api_key", None)

    existing = await db.app_settings.find_one({}, {"_id": 0})
    if existing:
        await db.app_settings.update_one({}, {"$set": update_doc})
    else:
        await db.app_settings.insert_one(update_doc)

    saved = await db.app_settings.find_one({}, {"_id": 0})
    if saved and saved.get("resend_api_key"):
        key = saved["resend_api_key"]
        saved["resend_api_key"] = "re_" + "*" * 20 + key[-4:] if len(key) > 4 else "****"
        saved["has_resend_key"] = True
    else:
        if saved:
            saved["has_resend_key"] = False
    return saved or {}


# ─── Database Settings ────────────────────────────────────

@api_router.get("/settings/database")
async def get_db_stats():
    global client, db
    try:
        raw = await db.command("dbstats")
        storage_bytes = raw.get("storageSize", 0)
        data_bytes = raw.get("dataSize", 0)
        index_bytes = raw.get("indexSize", 0)
        objects = raw.get("objects", 0)
        collections = raw.get("collections", 0)

        def fmt(b):
            if b < 1024:
                return f"{b} B"
            elif b < 1024 ** 2:
                return f"{b / 1024:.1f} KB"
            return f"{b / (1024 ** 2):.2f} MB"

        is_custom = CUSTOM_DB_FILE.exists()
        current_url = CUSTOM_DB_FILE.read_text().strip() if is_custom else os.environ['MONGO_URL']
        # Mask credentials in URL for display
        display_url = current_url
        if "@" in current_url:
            proto_end = current_url.find("://") + 3
            at_pos = current_url.rfind("@")
            display_url = current_url[:proto_end] + "***:***@" + current_url[at_pos + 1:]

        return {
            "db_name": DB_NAME,
            "collections": collections,
            "objects": objects,
            "data_size": fmt(data_bytes),
            "storage_size": fmt(storage_bytes),
            "index_size": fmt(index_bytes),
            "total_size": fmt(storage_bytes + index_bytes),
            "current_url": display_url,
            "is_custom": is_custom,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {e}")


@api_router.post("/settings/database/test")
async def test_db_connection(req: DBConnectRequest):
    try:
        test_client = AsyncIOMotorClient(req.url, serverSelectionTimeoutMS=5000)
        test_db = test_client[DB_NAME]
        await test_db.command("ping")
        test_client.close()
        return {"success": True, "message": "Conexión exitosa"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo conectar: {e}")


@api_router.post("/settings/database/connect")
async def switch_database(req: DBConnectRequest):
    global client, db
    try:
        new_client = AsyncIOMotorClient(req.url, serverSelectionTimeoutMS=5000)
        new_db = new_client[DB_NAME]
        await new_db.command("ping")
        old_client = client
        client = new_client
        db = new_db
        CUSTOM_DB_FILE.write_text(req.url)
        old_client.close()
        logger.info(f"Database switched to: {req.url[:30]}...")
        return {"success": True, "message": "Base de datos cambiada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al conectar: {e}")


@api_router.post("/settings/database/reset")
async def reset_database():
    global client, db
    try:
        original_url = os.environ['MONGO_URL']
        new_client = AsyncIOMotorClient(original_url)
        new_db = new_client[DB_NAME]
        await new_db.command("ping")
        old_client = client
        client = new_client
        db = new_db
        if CUSTOM_DB_FILE.exists():
            CUSTOM_DB_FILE.unlink()
        old_client.close()
        return {"success": True, "message": "Conexión restaurada a la base de datos original"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al restaurar: {e}")


# ─── Reminders (manual trigger) ───────────────────────────

@api_router.post("/reminders/send")
async def trigger_reminders_manual():
    """Manual trigger for testing reminders."""
    try:
        settings_doc = await db.app_settings.find_one({}, {"_id": 0})
        if not settings_doc:
            raise HTTPException(status_code=400, detail="Primero configura los ajustes de notificaciones")

        days = int(settings_doc.get("reminder_days", 3))
        target_date = (datetime.now(timezone.utc).date() + timedelta(days=days)).isoformat()

        cursor = db.reservations.find(
            {"event_date": target_date, "status": {"$nin": ["Cancelado", "Completado"]}},
            {"client_name": 1, "event_date": 1, "event_type": 1, "venue": 1, "_id": 0}
        )
        upcoming = await cursor.to_list(100)

        channel = settings_doc.get("notification_channel", "email")
        sent = 0

        if channel in ("email", "both"):
            api_key = settings_doc.get("resend_api_key")
            admin_email = settings_doc.get("admin_email")
            if api_key and admin_email and upcoming:
                resend_lib.api_key = api_key
                html = _build_reminder_html(upcoming, days)
                params = {
                    "from": "Cinema Productions <onboarding@resend.dev>",
                    "to": [admin_email],
                    "subject": f"Recordatorio: {len(upcoming)} evento(s) en {days} día(s)",
                    "html": html,
                }
                await asyncio.to_thread(resend_lib.Emails.send, params)
                sent += 1

        return {
            "success": True,
            "events_found": len(upcoming),
            "target_date": target_date,
            "sent": sent,
            "message": f"Recordatorio enviado para {len(upcoming)} evento(s) en {target_date}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
