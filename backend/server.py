from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response, RedirectResponse
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
import json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

# ── Google / Gmail ────────────────────────────────────────────
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── Web Push ──────────────────────────────────────────────────
from pywebpush import webpush, WebPushException


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

CUSTOM_DB_FILE = ROOT_DIR / '.db_override'
DB_NAME = os.environ['DB_NAME']

# ── Google / VAPID config ─────────────────────────────────────
GOOGLE_CLIENT_ID     = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI  = 'https://event-reserve-pro-5.preview.emergentagent.com/api/oauth/gmail/callback'
GMAIL_SCOPES         = ['https://www.googleapis.com/auth/gmail.send', 'openid', 'https://www.googleapis.com/auth/userinfo.email']
VAPID_PUBLIC_KEY     = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY    = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_EMAIL          = os.environ.get('VAPID_EMAIL', 'mailto:admin@cinema-productions.com')

# In-memory dedup: avoid sending the same reminder twice in one day
_sent_push_today: set = set()

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
    # Per-minute push + Gmail reminders
    scheduler.add_job(
        check_and_push_reminders,
        IntervalTrigger(minutes=1),
        id="push_reminders",
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


# ─── Gmail Helper ─────────────────────────────────────────────
async def _get_gmail_service():
    """Return authenticated Gmail API service using stored refresh token."""
    token_doc = await db.oauth_tokens.find_one({"provider": "gmail"}, {"_id": 0})
    if not token_doc or not token_doc.get("refresh_token"):
        raise Exception("Gmail not connected. Connect via Settings → Notificaciones.")
    creds = Credentials(
        token=token_doc.get("access_token"),
        refresh_token=token_doc["refresh_token"],
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=GMAIL_SCOPES,
    )
    if not creds.valid:
        await asyncio.to_thread(creds.refresh, GoogleRequest())
        await db.oauth_tokens.update_one(
            {"provider": "gmail"},
            {"$set": {"access_token": creds.token}},
        )
    return build("gmail", "v1", credentials=creds), token_doc.get("email", "me")


async def _send_gmail(to: str, subject: str, html: str):
    service, from_email = await _get_gmail_service()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    await asyncio.to_thread(
        service.users().messages().send(userId="me", body={"raw": raw}).execute
    )
    logger.info(f"Gmail sent to {to}: {subject}")


# ─── Web Push Helper ──────────────────────────────────────────
async def _send_push_to_all(title: str, body: str, url: str = "/dashboard"):
    subscriptions = await db.push_subscriptions.find({}).to_list(1000)
    if not subscriptions:
        return
    expired = []
    for sub in subscriptions:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL},
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                expired.append(sub["endpoint"])
            logger.error(f"Push send error: {e}")
    for ep in expired:
        await db.push_subscriptions.delete_one({"endpoint": ep})
    logger.info(f"Push sent to {len(subscriptions) - len(expired)} subscribers")


# ─── Per-minute push + Gmail reminder check ───────────────────
async def check_and_push_reminders():
    global _sent_push_today
    try:
        settings_doc = await db.app_settings.find_one({}, {"_id": 0})
        if not settings_doc or not settings_doc.get("reminders_enabled"):
            return

        reminder_time = settings_doc.get("reminder_time", "09:00")  # HH:MM
        days          = int(settings_doc.get("reminder_days", 3))
        now           = datetime.now(timezone.utc)
        current_hhmm  = now.strftime("%H:%M")
        today_str     = now.strftime("%Y-%m-%d")

        if current_hhmm != reminder_time:
            return

        target_date = (now.date() + timedelta(days=days)).isoformat()
        dedup_key   = f"{today_str}_{reminder_time}_{target_date}"
        if dedup_key in _sent_push_today:
            return
        _sent_push_today.add(dedup_key)
        # Clear old keys daily
        if len(_sent_push_today) > 500:
            _sent_push_today.clear()

        cursor = db.reservations.find(
            {"event_date": target_date, "status": {"$nin": ["Cancelado", "Completado"]}},
            {"client_name": 1, "event_date": 1, "event_type": 1, "venue": 1, "_id": 0}
        )
        upcoming = await cursor.to_list(100)
        if not upcoming:
            return

        title = f"Recordatorio: {len(upcoming)} evento(s) en {days} día(s)"
        body  = ", ".join(r.get("client_name", "?") for r in upcoming[:3])
        if len(upcoming) > 3:
            body += f" y {len(upcoming)-3} más"

        # Web Push
        await _send_push_to_all(title, body, "/dashboard")

        # Gmail (if connected)
        try:
            token_doc = await db.oauth_tokens.find_one({"provider": "gmail"}, {"_id": 0})
            if token_doc and token_doc.get("refresh_token"):
                html = _build_reminder_html(upcoming, days)
                await _send_gmail(
                    to=token_doc["email"],
                    subject=title,
                    html=html,
                )
        except Exception as gmail_err:
            logger.warning(f"Gmail reminder skipped: {gmail_err}")

        logger.info(f"Push+Gmail reminders sent for {target_date}")
    except Exception as e:
        logger.error(f"Error in push reminder job: {e}")


# ─── Routes ──────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Event Reservation API"}


@api_router.delete("/data/clear-all")
async def clear_all_data():
    """Elimina todas las reservas y socios (no afecta app_settings)."""
    res_result  = await db.reservations.delete_many({})
    soc_result  = await db.socios.delete_many({})
    return {
        "ok": True,
        "deleted_reservations": res_result.deleted_count,
        "deleted_socios": soc_result.deleted_count,
    }


@api_router.get("/stats")
async def get_stats():
    total = await db.reservations.count_documents({})
    upcoming = await db.reservations.count_documents({
        "event_date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        "status": {"$nin": ["Cancelado", "Completado"]}
    })
    active_cursor = db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"total_amount": 1, "advance_paid": 1, "assigned_partners": 1, "_id": 0}
    )
    active_docs = await active_cursor.to_list(1000)
    total_pending = sum(
        max(0, (d.get("total_amount", 0) or 0) - (d.get("advance_paid", 0) or 0))
        for d in active_docs
    )
    total_event_amount = sum((d.get("total_amount", 0) or 0) for d in active_docs)
    total_partner_cost = sum(
        p.get("payment", 0) or 0
        for d in active_docs
        for p in (d.get("assigned_partners") or [])
    )
    return {
        "total_reservations": total,
        "upcoming_events": upcoming,
        "pending_payment": round(total_pending, 2),
        "real_income": round(total_event_amount - total_partner_cost, 2),
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

@api_router.get("/notifications/pending")
async def get_pending_notifications():
    settings_doc = await db.app_settings.find_one({}, {"_id": 0})
    days = int(settings_doc.get("reminder_days", 3)) if settings_doc else 3
    today = datetime.now(timezone.utc).date()
    end = (today + timedelta(days=days)).isoformat()
    today_str = today.isoformat()
    cursor = db.reservations.find(
        {"event_date": {"$gte": today_str, "$lte": end}, "status": {"$nin": ["Cancelado", "Completado"]}},
        {"client_name": 1, "event_date": 1, "event_type": 1, "venue": 1, "_id": 1}
    )
    docs = await cursor.to_list(100)
    return [doc_to_dict(d) for d in docs]



@api_router.post("/reminders/send")
async def trigger_reminders_manual():
    """Manual trigger — send reminder email/push for upcoming events."""
    try:
        settings_doc = await db.app_settings.find_one({}, {"_id": 0})
        if not settings_doc:
            raise HTTPException(status_code=400, detail="Primero configura los ajustes de notificaciones")

        days  = int(settings_doc.get("reminder_days", 3))
        today = datetime.now(timezone.utc).date()
        # Look for events in the next `days` window (not just one exact date)
        end_date    = (today + timedelta(days=days)).isoformat()
        today_str   = today.isoformat()

        cursor = db.reservations.find(
            {
                "event_date": {"$gte": today_str, "$lte": end_date},
                "status": {"$nin": ["Cancelado", "Completado"]},
            },
            {"client_name": 1, "event_date": 1, "event_type": 1, "venue": 1, "_id": 0}
        )
        upcoming = await cursor.to_list(100)

        channel    = settings_doc.get("notification_channel", "email")
        email_sent = False
        push_sent  = 0
        errors     = []

        # ── Resend email ──────────────────────────────────────
        if channel in ("email", "both"):
            api_key     = settings_doc.get("resend_api_key")
            admin_email = settings_doc.get("admin_email")
            if api_key and admin_email:
                try:
                    resend_lib.api_key = api_key
                    html = _build_reminder_html(upcoming, days)
                    params = {
                        "from": "Cinema Productions <onboarding@resend.dev>",
                        "to": [admin_email],
                        "subject": f"Recordatorio: {len(upcoming)} evento(s) en los próximos {days} día(s)",
                        "html": html,
                    }
                    await asyncio.to_thread(resend_lib.Emails.send, params)
                    email_sent = True
                except Exception as e:
                    errors.append(f"Resend: {e}")
            else:
                errors.append("Email: configura admin_email y clave Resend en Ajustes")

        # ── Gmail OAuth email ─────────────────────────────────
        if not email_sent and channel in ("email", "both"):
            try:
                token_doc = await db.oauth_tokens.find_one({"provider": "gmail"}, {"_id": 0})
                if token_doc and token_doc.get("refresh_token"):
                    html = _build_reminder_html(upcoming, days)
                    await _send_gmail(
                        to=token_doc["email"],
                        subject=f"Recordatorio: {len(upcoming)} evento(s) en los próximos {days} día(s)",
                        html=html,
                    )
                    email_sent = True
            except Exception as e:
                errors.append(f"Gmail: {e}")

        # ── Web Push ──────────────────────────────────────────
        if channel in ("both", "whatsapp") or not email_sent:
            try:
                title = f"Recordatorio: {len(upcoming)} evento(s) próximos"
                body  = ", ".join(r.get("client_name", "?") for r in upcoming[:3])
                await _send_push_to_all(title, body, "/dashboard")
                count = await db.push_subscriptions.count_documents({})
                push_sent = count
            except Exception as e:
                errors.append(f"Push: {e}")

        # Build response message
        parts = []
        if email_sent:
            parts.append("correo enviado")
        if push_sent:
            parts.append(f"push a {push_sent} dispositivo(s)")
        if not parts:
            if errors:
                raise HTTPException(
                    status_code=400,
                    detail="No se pudo enviar. " + " | ".join(errors)
                )
            parts.append("no hay método de envío configurado")

        return {
            "success": True,
            "events_found": len(upcoming),
            "end_date": end_date,
            "email_sent": email_sent,
            "push_sent": push_sent,
            "message": f"{len(upcoming)} evento(s) encontrados — {', '.join(parts)}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


# ─── Desktop Package Download ─────────────────────────────

_ENV_TEMPLATE = """# =======================================================
#  CINEMA PRODUCTIONS - Configuracion de Base de Datos
# =======================================================
#
# Opciones para MONGO_URL:
#
#   embedded
#       Base de datos LOCAL sin internet.
#       Los datos se guardan en cinema_data.json (mismo directorio).
#       Recomendado para uso personal en un solo PC.
#
#   mongodb://localhost:27017
#       MongoDB instalado en tu computadora.
#
#   mongodb+srv://usuario:contrasena@cluster.mongodb.net
#       MongoDB Atlas (nube gratuita en mongodb.com/atlas)
#       Accesible desde cualquier dispositivo.
#
# Para cambiar: edita este archivo con el Bloc de Notas, guarda y reinicia la app.
# O ejecuta config.bat para una ventana visual de configuracion.
#
MONGO_URL=embedded
DB_NAME=cinema_productions
"""

_CONFIG_PY = r'''"""Cinema Productions — Configurador Visual de Base de Datos
Ejecutar: python config.py  (o doble clic en config.bat)
"""
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / ".env"


def _read_env():
    config = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                config[k.strip()] = v.strip()
    return config


def _write_env(mongo_url: str, db_name: str):
    content = (
        "# Cinema Productions - Configuracion de Base de Datos\n"
        "#\n"
        "# Opciones:\n"
        "#   embedded                              Base de datos local (cinema_data.json)\n"
        "#   mongodb://localhost:27017             MongoDB en tu PC\n"
        "#   mongodb+srv://user:pass@cluster       MongoDB Atlas (nube gratuita)\n"
        "#\n"
        "# Edita este archivo con el Bloc de Notas y guarda.\n"
        f"MONGO_URL={mongo_url}\n"
        f"DB_NAME={db_name}\n"
    )
    ENV_FILE.write_text(content, encoding="utf-8")


def main():
    cfg = _read_env()
    current_url = cfg.get("MONGO_URL", "embedded")
    db_name = cfg.get("DB_NAME", "cinema_productions")

    root = tk.Tk()
    root.title("Cinema Productions — Configurar Base de Datos")
    root.resizable(False, False)
    root.configure(bg="#0f0e17")

    W, H = 560, 420
    root.update_idletasks()
    x = (root.winfo_screenwidth() - W) // 2
    y = (root.winfo_screenheight() - H) // 2
    root.geometry(f"{W}x{H}+{x}+{y}")

    # ── Header ──────────────────────────────────────────
    hdr = tk.Frame(root, bg="#4f46e5", height=72)
    hdr.pack(fill="x")
    hdr.pack_propagate(False)
    tk.Label(hdr, text="CINEMA PRODUCTIONS", font=("Segoe UI", 15, "bold"),
             bg="#4f46e5", fg="white").pack(pady=(14, 0))
    tk.Label(hdr, text="Configuracion de Base de Datos", font=("Segoe UI", 9),
             bg="#4f46e5", fg="#c7d2fe").pack()

    # ── Body ─────────────────────────────────────────────
    body = tk.Frame(root, bg="#0f0e17", padx=28, pady=18)
    body.pack(fill="both", expand=True)

    tk.Label(body, text="URL de conexion MongoDB:", font=("Segoe UI", 10, "bold"),
             bg="#0f0e17", fg="white", anchor="w").pack(fill="x")
    tk.Label(body,
             text='embedded  |  mongodb://localhost:27017  |  mongodb+srv://user:pass@cluster',
             font=("Courier New", 8), bg="#0f0e17", fg="#6b7280", anchor="w").pack(fill="x", pady=(3, 8))

    url_var = tk.StringVar(value=current_url)
    entry = tk.Entry(body, textvariable=url_var, font=("Courier New", 10),
                     bg="#1e1b4b", fg="#c7d2fe", insertbackground="white",
                     relief="flat", bd=8)
    entry.pack(fill="x")
    entry.focus_set()

    # ── Quick buttons ────────────────────────────────────
    qf = tk.Frame(body, bg="#0f0e17")
    qf.pack(fill="x", pady=(10, 0))
    tk.Label(qf, text="Opciones rapidas:", font=("Segoe UI", 9),
             bg="#0f0e17", fg="#9ca3af").pack(side="left", padx=(0, 8))

    for label, val in [
        ("Embebida (local)", "embedded"),
        ("MongoDB local", "mongodb://localhost:27017"),
    ]:
        tk.Button(qf, text=label, command=lambda v=val: url_var.set(v),
                  bg="#1e1b4b", fg="#a5b4fc", font=("Segoe UI", 9),
                  relief="flat", padx=10, pady=4, cursor="hand2").pack(side="left", padx=4)

    # ── Info box ─────────────────────────────────────────
    ib = tk.Frame(body, bg="#1c1917")
    ib.pack(fill="x", pady=(16, 0))
    tk.Label(ib,
             text="Consejo: tambien puedes abrir el archivo  .env  directamente con el Bloc de Notas y editar MONGO_URL.",
             font=("Segoe UI", 8), bg="#1c1917", fg="#78716c",
             wraplength=480, justify="left", padx=10, pady=8).pack(fill="x")

    # ── Buttons ──────────────────────────────────────────
    bf = tk.Frame(root, bg="#111827", pady=14)
    bf.pack(fill="x")

    def open_notepad():
        import subprocess
        subprocess.Popen(["notepad.exe", str(ENV_FILE)])

    def save():
        url = url_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Por favor ingresa una URL de MongoDB.", parent=root)
            return
        _write_env(url, db_name)
        messagebox.showinfo(
            "Guardado",
            f"Configuracion guardada exitosamente.\n\nMONGO_URL = {url}\n\nReinicia la app para aplicar el cambio.",
            parent=root,
        )
        root.destroy()

    tk.Button(bf, text="  Abrir .env en Bloc de Notas  ", command=open_notepad,
              bg="#374151", fg="#d1d5db", font=("Segoe UI", 9),
              relief="flat", padx=12, pady=7, cursor="hand2").pack(side="left", padx=(24, 8))

    tk.Button(bf, text="  Guardar Configuracion  ", command=save,
              bg="#4f46e5", fg="white", font=("Segoe UI", 10, "bold"),
              relief="flat", padx=16, pady=7, cursor="hand2").pack(side="right", padx=(8, 24))

    root.mainloop()


if __name__ == "__main__":
    main()
'''

_CONFIG_BAT = r"""@echo off
title Cinema Productions - Configuracion
echo.
echo  Abriendo configuracion de Cinema Productions...
echo.
python --version >nul 2>&1
if not errorlevel 1 ( python config.py & goto FIN )
py --version >nul 2>&1
if not errorlevel 1 ( py config.py & goto FIN )
echo  Python no encontrado. Abriendo .env en el Bloc de Notas...
notepad .env
:FIN
"""

_START_BAT = r"""@echo off
title Cinema Productions - Gestor de Reservas
color 0A
cls
echo.
echo  ====================================================
echo    CINEMA PRODUCTIONS  ^|  Gestor de Reservas
echo  ====================================================
echo.
echo  Archivos del paquete:
echo    app.py           Servidor principal
echo    .env             Configuracion de base de datos
echo    config.bat       Cambiar base de datos (abrir ventana)
echo    cinema_data.json Datos guardados localmente
echo  ====================================================
echo.

REM ── CONFIGURACION OPCIONAL (presiona C para configurar) ──
echo  Presiona  C + ENTER  para configurar la base de datos.
echo  Presiona  ENTER       para iniciar directamente.
echo.
set /p CHOICE="  > "
if /i "%CHOICE%"=="C" (
    echo.
    echo  Abriendo configuracion...
    python config.py >nul 2>&1 || py config.py >nul 2>&1 || notepad .env
    echo.
    echo  Configuracion aplicada. Continuando inicio...
    echo.
)

REM ── PASO 1: Verificar Python ─────────────────────────
echo  [1/4] Verificando Python...
python --version >nul 2>&1
if not errorlevel 1 ( set PYTHON=python & goto PYTHON_OK )
py --version >nul 2>&1
if not errorlevel 1 ( set PYTHON=py & goto PYTHON_OK )
echo.
echo  ERROR: Python no esta instalado.
echo  Descargalo desde: https://www.python.org/downloads/
echo  IMPORTANTE: Marca "Add Python to PATH" al instalar.
echo.
pause & exit /b 1

:PYTHON_OK
echo  OK: Python encontrado.

REM ── PASO 2: Instalar dependencias ───────────────────
echo.
echo  [2/4] Instalando/verificando dependencias...
%PYTHON% -m pip install -r requirements.txt -q --no-warn-script-location
echo  OK: Dependencias listas.

REM ── PASO 3: Iniciar servidor ─────────────────────────
echo.
echo  [3/4] Iniciando servidor...
start "Cinema Productions [servidor - no cierres esta ventana]" /min %PYTHON% app.py

echo  Verificando que el servidor este listo (max 25 seg)...
set /a TRIES=0
:WAIT_LOOP
    timeout /t 1 /nobreak >nul
    %PYTHON% -c "import urllib.request,sys; urllib.request.urlopen('http://localhost:8001/api/'); sys.exit(0)" >nul 2>&1
    if not errorlevel 1 goto SERVER_READY
    set /a TRIES+=1
    if %TRIES% GEQ 25 goto SERVER_FAILED
    goto WAIT_LOOP

:SERVER_FAILED
echo.
echo  ====================================================
echo   ERROR: El servidor no respondio en 25 segundos.
echo.
echo   Posibles causas:
echo   - Puerto 8001 ocupado (cierra otras copias)
echo   - Error en .env (ejecuta config.bat para revisar)
echo   - Revisa la ventana del servidor para mas detalles
echo  ====================================================
pause & exit /b 1

:SERVER_READY
echo  OK: Servidor verificado y funcionando.

REM ── PASO 4: Abrir navegador ──────────────────────────
echo.
echo  [4/4] Abriendo Cinema Productions en el navegador...
start http://localhost:8001
echo.
echo  ====================================================
echo    URL:    http://localhost:8001
echo    Datos:  cinema_data.json (guardado automaticamente)
echo    Config: ejecuta config.bat para cambiar la BD
echo  ====================================================
echo.
echo  Para CERRAR: cierra la ventana "Cinema Productions [servidor]"
echo.
pause
"""

_START_SH = """#!/bin/bash
clear
echo ""
echo "  =================================================="
echo "   CINEMA PRODUCTIONS | Gestor de Reservas"
echo "  =================================================="
echo ""

echo "  [1/4] Verificando Python..."
if command -v python3 &>/dev/null; then PYTHON=python3
elif command -v python &>/dev/null; then PYTHON=python
else echo "  ERROR: Python3 no instalado. Ver https://www.python.org/downloads/"; exit 1; fi
echo "  OK: Python encontrado."

echo ""
echo "  [2/4] Instalando dependencias..."
$PYTHON -m pip install -r requirements.txt -q
echo "  OK: Dependencias listas."

echo ""
echo "  [3/4] Iniciando servidor..."
$PYTHON app.py &
SERVER_PID=$!

echo "  Verificando servidor (max 25 seg)..."
TRIES=0
while true; do
    sleep 1
    $PYTHON -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/api/')" 2>/dev/null && break
    TRIES=$((TRIES + 1))
    [ $TRIES -ge 25 ] && echo "  ERROR: El servidor no respondio." && kill $SERVER_PID 2>/dev/null && exit 1
done
echo "  OK: Servidor verificado."

echo ""
echo "  [4/4] Abriendo Cinema Productions..."
command -v xdg-open &>/dev/null && xdg-open http://localhost:8001
command -v open &>/dev/null && open http://localhost:8001

echo ""
echo "  =================================================="
echo "   URL: http://localhost:8001"
echo "   Para cambiar BD: edita el archivo .env"
echo "   Para cerrar: Ctrl+C"
echo "  =================================================="
wait $SERVER_PID
"""

_REQUIREMENTS = """fastapi>=0.100.0
uvicorn[standard]>=0.20.0
motor>=3.0.0
pymongo>=4.0.0
python-dotenv>=1.0.0
pydantic>=2.0.0
resend>=2.0.0
mongomock-motor>=0.0.36
"""

_README = """CINEMA PRODUCTIONS - Gestor de Reservas
=========================================

INICIO RAPIDO (Windows):
  1. Doble clic en  start.bat
  2. Presiona ENTER para iniciar, o  C + ENTER  para configurar primero
  3. La app se abre automaticamente en el navegador

REQUISITO: Python 3.8+
  https://www.python.org/downloads/
  IMPORTANTE: marcar "Add Python to PATH"

BASE DE DATOS:
  El archivo  .env  controla donde se guardan tus datos.

  OPCIONES:
    MONGO_URL=embedded
      → Base de datos local, SIN internet, datos en cinema_data.json
        Recomendado para uso personal en un solo PC.

    MONGO_URL=mongodb://localhost:27017
      → MongoDB instalado en tu computadora.

    MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
      → MongoDB Atlas (nube GRATUITA en mongodb.com/atlas)
        Accesible desde cualquier dispositivo.

CAMBIAR BASE DE DATOS (3 formas):
  A) Doble clic en  config.bat  → Ventana visual de configuracion
  B) Abrir  .env  con el Bloc de Notas → Edita MONGO_URL → Guarda
  C) En el start.bat → Presiona C + ENTER antes de iniciar

DATOS AUTOMATICOS:
  En modo embebido, los datos se guardan en  cinema_data.json
  Auto-guardado cada 60 segundos y al cerrar la app.

Cinema Productions - Sistema de Gestion de Reservas
"""


# ─── Gmail OAuth2 Endpoints ───────────────────────────────────
@api_router.get("/oauth/gmail/start")
async def gmail_oauth_start():
    """Return Google OAuth2 authorization URL."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google credentials not configured")
    flow = Flow.from_client_config(
        {"web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }},
        scopes=GMAIL_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    return {"url": auth_url}


@api_router.get("/oauth/gmail/callback")
async def gmail_oauth_callback(code: str = None, error: str = None):
    """Exchange auth code for tokens and store refresh_token."""
    if error or not code:
        return RedirectResponse(url=f"https://event-reserve-pro-5.preview.emergentagent.com/ajustes?gmail_error={error or 'cancelled'}")
    try:
        flow = Flow.from_client_config(
            {"web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }},
            scopes=GMAIL_SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI,
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        # Get user email
        service = build("oauth2", "v2", credentials=creds)
        user_info = await asyncio.to_thread(service.userinfo().get().execute)
        user_email = user_info.get("email", "")
        # Store tokens
        await db.oauth_tokens.update_one(
            {"provider": "gmail"},
            {"$set": {
                "provider": "gmail",
                "email": user_email,
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        logger.info(f"Gmail connected: {user_email}")
        return RedirectResponse(url="https://event-reserve-pro-5.preview.emergentagent.com/ajustes?gmail_ok=1")
    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        return RedirectResponse(url=f"https://event-reserve-pro-5.preview.emergentagent.com/ajustes?gmail_error={str(e)[:60]}")


@api_router.get("/oauth/gmail/status")
async def gmail_status():
    doc = await db.oauth_tokens.find_one({"provider": "gmail"}, {"_id": 0})
    if doc and doc.get("refresh_token"):
        return {"connected": True, "email": doc.get("email", ""), "connected_at": doc.get("connected_at")}
    return {"connected": False, "email": "", "connected_at": None}


@api_router.delete("/oauth/gmail/disconnect")
async def gmail_disconnect():
    await db.oauth_tokens.delete_one({"provider": "gmail"})
    return {"ok": True}


@api_router.post("/oauth/gmail/test")
async def gmail_test():
    """Send a test email to verify Gmail connection."""
    doc = await db.oauth_tokens.find_one({"provider": "gmail"}, {"_id": 0})
    if not doc or not doc.get("refresh_token"):
        raise HTTPException(status_code=400, detail="Gmail no conectado")
    try:
        html = """
        <div style='font-family:sans-serif;padding:20px'>
          <h2 style='color:#6366f1'>Cinema Productions — Prueba de correo ✓</h2>
          <p>Este es un correo de prueba enviado automáticamente desde tu app de reservas.</p>
          <p>Si lo recibes, los recordatorios automáticos funcionarán correctamente.</p>
        </div>"""
        await _send_gmail(to=doc["email"], subject="✓ Prueba — Cinema Productions", html=html)
        return {"ok": True, "message": f"Correo enviado a {doc['email']}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Web Push Endpoints ───────────────────────────────────────
@api_router.get("/push/vapid-key")
async def get_vapid_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


class PushSubscriptionModel(BaseModel):
    endpoint: str
    expirationTime: Optional[float] = None
    keys: dict


@api_router.post("/push/subscribe")
async def push_subscribe(sub: PushSubscriptionModel):
    await db.push_subscriptions.update_one(
        {"endpoint": sub.endpoint},
        {"$set": {
            "endpoint": sub.endpoint,
            "keys": sub.keys,
            "subscribed_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@api_router.delete("/push/unsubscribe")
async def push_unsubscribe(endpoint: str):
    await db.push_subscriptions.delete_one({"endpoint": endpoint})
    return {"ok": True}


@api_router.post("/push/test")
async def push_test():
    """Send a test push notification to all subscribers."""
    try:
        await _send_push_to_all(
            title="Cinema Productions — Prueba ✓",
            body="Las notificaciones de escritorio están funcionando.",
            url="/dashboard",
        )
        count = await db.push_subscriptions.count_documents({})
        return {"ok": True, "sent_to": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



_build_state = {"status": "idle", "message": "Listo para actualizar", "started_at": None, "finished_at": None}


async def _run_frontend_build():
    global _build_state
    try:
        frontend_dir = str(ROOT_DIR.parent / "frontend")
        process = await asyncio.create_subprocess_exec(
            "yarn", "build",
            cwd=frontend_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**dict(__import__("os").environ), "CI": "false", "GENERATE_SOURCEMAP": "false"},
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
        if process.returncode == 0:
            _build_state = {
                "status": "ready",
                "message": "App actualizada correctamente. Ya puedes descargarla.",
                "started_at": _build_state["started_at"],
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
            logger.info("Frontend build completed successfully")
        else:
            err = stderr.decode("utf-8", errors="replace")[:300]
            _build_state = {
                "status": "error",
                "message": f"Error en la compilación: {err}",
                "started_at": _build_state["started_at"],
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
            logger.error(f"Frontend build failed: {err}")
    except asyncio.TimeoutError:
        _build_state = {**_build_state, "status": "error", "message": "Tiempo de espera agotado (5 min). Inténtalo de nuevo."}
    except Exception as e:
        _build_state = {**_build_state, "status": "error", "message": f"Error inesperado: {str(e)}"}


@api_router.post("/download/package/rebuild")
async def rebuild_package():
    global _build_state
    if _build_state["status"] == "building":
        return {"status": "building", "message": "Ya hay una compilación en progreso. Por favor espera."}
    _build_state = {
        "status": "building",
        "message": "Compilando la app con los últimos cambios… esto tarda 1–3 minutos.",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
    }
    asyncio.create_task(_run_frontend_build())
    return _build_state


@api_router.get("/download/package/build-status")
async def get_build_status():
    return _build_state


@api_router.get("/download/package")
async def download_package():
    import zipfile

    build_dir = ROOT_DIR.parent / "frontend" / "build"
    if not build_dir.exists():
        raise HTTPException(
            status_code=503,
            detail="El paquete aun no esta listo. Espera 2 minutos e intentalo de nuevo."
        )

    standalone_py = (ROOT_DIR / 'standalone_app.py').read_text()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('cinema-productions/app.py', standalone_py)
        zf.writestr('cinema-productions/.env', _ENV_TEMPLATE)
        zf.writestr('cinema-productions/config.py', _CONFIG_PY)
        zf.writestr('cinema-productions/config.bat', _CONFIG_BAT)
        zf.writestr('cinema-productions/requirements.txt', _REQUIREMENTS)
        zf.writestr('cinema-productions/start.bat', _START_BAT)
        zf.writestr('cinema-productions/start.sh', _START_SH)
        zf.writestr('cinema-productions/README.txt', _README)

        for file_path in sorted(build_dir.rglob('*')):
            if file_path.is_file():
                arc_name = 'cinema-productions/build/' + str(file_path.relative_to(build_dir))
                zf.write(str(file_path), arc_name)

    buf.seek(0)
    return Response(
        content=buf.read(),
        media_type='application/zip',
        headers={'Content-Disposition': 'attachment; filename=cinema-productions-local.zip'}
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
