"""
Cinema Productions - App Local Auto-contenida
==============================================
Ejecutar: python app.py  (o doble clic en start.bat)

Modos de base de datos:
  MONGO_URL=embedded          → Almacenamiento local en cinema_data.json (predeterminado)
  MONGO_URL=mongodb://...     → MongoDB externo (local o Atlas)
"""
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import csv
import io
import os
import json
import logging
import base64
import uuid
import webbrowser
import threading
import time
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DB_NAME = os.environ.get('DB_NAME', 'cinema_productions')
MONGO_URL = os.environ.get('MONGO_URL', 'embedded')
DATA_FILE = ROOT_DIR / 'cinema_data.json'
CUSTOM_DB_FILE = ROOT_DIR / '.db_override'

_using_embedded = MONGO_URL.strip().lower() in ('embedded', '', 'local')

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

if _using_embedded:
    from mongomock_motor import AsyncMongoMockClient
    _mongo_client = AsyncMongoMockClient()
    logger.warning("Usando base de datos embebida (cinema_data.json)")
else:
    from motor.motor_asyncio import AsyncIOMotorClient
    _active_url = CUSTOM_DB_FILE.read_text().strip() if CUSTOM_DB_FILE.exists() else MONGO_URL
    _mongo_client = AsyncIOMotorClient(_active_url)

db = _mongo_client[DB_NAME]
client = _mongo_client  # alias for DB switcher


# ─── Embedded DB persistence ─────────────────────────────

def _serialize_doc(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-serializable dict."""
    d = {}
    for k, v in doc.items():
        if k == '_id':
            d['__id'] = str(v)
        elif isinstance(v, ObjectId):
            d[k] = str(v)
        elif isinstance(v, list):
            d[k] = [_serialize_doc(i) if isinstance(i, dict) else i for i in v]
        else:
            d[k] = v
    return d


def _deserialize_doc(doc: dict) -> dict:
    """Restore JSON doc to MongoDB-compatible dict with ObjectId _id."""
    d = {}
    for k, v in doc.items():
        if k == '__id':
            try:
                d['_id'] = ObjectId(v)
            except Exception:
                d['_id'] = v
        elif isinstance(v, list):
            d[k] = [_deserialize_doc(i) if isinstance(i, dict) else i for i in v]
        else:
            d[k] = v
    return d


async def _load_embedded_data():
    if not DATA_FILE.exists():
        logger.info("No saved data found — starting fresh.")
        return
    try:
        data = json.loads(DATA_FILE.read_text(encoding='utf-8'))
        for col_name, docs in data.items():
            if not docs:
                continue
            col = db[col_name]
            restored = [_deserialize_doc(d) for d in docs]
            if restored:
                await col.insert_many(restored)
        logger.info(f"Loaded {sum(len(v) for v in data.values())} docs from {DATA_FILE.name}")
    except Exception as e:
        logger.error(f"Failed to load saved data: {e}")


async def _save_embedded_data():
    try:
        data = {}
        for col_name in ['reservations', 'socios', 'app_settings']:
            docs = await db[col_name].find({}).to_list(100000)
            data[col_name] = [_serialize_doc(d) for d in docs]
        DATA_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2, default=str),
            encoding='utf-8'
        )
        logger.info(f"Data saved → {DATA_FILE.name}")
    except Exception as e:
        logger.error(f"Failed to save data: {e}")


async def _auto_save_loop():
    """Auto-save every 60 seconds."""
    while True:
        await asyncio.sleep(60)
        await _save_embedded_data()


# ─── Lifespan ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    _task = None
    if _using_embedded:
        await _load_embedded_data()
        _task = asyncio.create_task(_auto_save_loop())
    yield
    if _using_embedded:
        if _task:
            _task.cancel()
        await _save_embedded_data()
    _mongo_client.close()


app = FastAPI(title="Cinema Productions", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ─── Helpers ──────────────────────────────────────────────

def doc_to_dict(doc: dict) -> dict:
    if doc is None:
        return {}
    d = {k: v for k, v in doc.items() if k != '_id'}
    if '_id' in doc:
        d['id'] = str(doc['_id'])
    return d


# ─── Models ───────────────────────────────────────────────

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


# ─── Routes ───────────────────────────────────────────────

@api_router.get("/")
async def root():
    mode = "embedded" if _using_embedded else "mongodb"
    return {"message": "Cinema Productions API", "db_mode": mode}


@api_router.get("/stats")
async def get_stats():
    total = await db.reservations.count_documents({})
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_res = await db.reservations.find(
        {}, {"event_date": 1, "status": 1, "total_amount": 1, "advance_paid": 1, "_id": 0}
    ).to_list(10000)
    upcoming = sum(1 for d in all_res
                   if d.get("event_date", "") >= today_str
                   and d.get("status") not in ("Cancelado", "Completado"))
    total_pending = sum(
        max(0, (d.get("total_amount") or 0) - (d.get("advance_paid") or 0))
        for d in all_res if d.get("status") not in ("Cancelado",)
    )
    confirmed = sum(1 for d in all_res if d.get("status") == "Confirmado")
    return {
        "total_reservations": total,
        "upcoming_events": upcoming,
        "pending_payment": round(total_pending, 2),
        "confirmed": confirmed
    }


@api_router.get("/reservations")
async def list_reservations():
    docs = await db.reservations.find({}, {"receipt_images.data": 0}).to_list(1000)
    return [doc_to_dict(d) for d in docs]


@api_router.post("/reservations", status_code=201)
async def create_reservation(reservation: ReservationCreate):
    doc = reservation.model_dump()
    doc["receipt_images"] = []
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reservations.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = await db.reservations.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    doc = await db.reservations.find_one({"_id": oid})
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    result = await db.reservations.update_one({"_id": oid}, {"$push": {"receipt_images": receipt}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
    return {"message": "Comprobante eliminado"}


@api_router.get("/export/reservations")
async def export_reservations(format: str = "csv"):
    docs = await db.reservations.find({}, {"receipt_images": 0}).to_list(10000)
    data = [doc_to_dict(d) for d in docs]
    if format == "json":
        return JSONResponse(content=data,
                            headers={"Content-Disposition": "attachment; filename=reservaciones.json"})
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
    docs = await db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"client_name": 1, "event_date": 1, "event_type": 1, "status": 1, "_id": 1}
    ).to_list(1000)
    return [doc_to_dict(d) for d in docs]


# ─── Socios ───────────────────────────────────────────────

@api_router.get("/socios")
async def list_socios():
    docs = await db.socios.find({}, {"photo": 0, "photo_content_type": 0}).to_list(1000)
    return [doc_to_dict(d) for d in docs]


@api_router.post("/socios", status_code=201)
async def create_socio(socio: SocioCreate):
    doc = socio.model_dump()
    doc.update({"photo": None, "photo_content_type": None,
                "created_at": datetime.now(timezone.utc).isoformat()})
    result = await db.socios.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = await db.socios.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    doc = await db.socios.find_one({"_id": oid})
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
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
    docs = await db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"total_amount": 1, "advance_paid": 1, "assigned_partners": 1}
    ).to_list(10000)
    total_event = sum((d.get("total_amount") or 0) for d in docs)
    total_advance = sum((d.get("advance_paid") or 0) for d in docs)
    total_cost = total_paid = total_pending = 0
    for d in docs:
        for p in (d.get("assigned_partners") or []):
            amt = p.get("payment") or 0
            total_cost += amt
            if p.get("payment_status") == "Pagado":
                total_paid += amt
            else:
                total_pending += amt
    return {
        "total_event_amount": round(total_event, 2),
        "total_advance": round(total_advance, 2),
        "total_partner_cost": round(total_cost, 2),
        "total_paid_to_partners": round(total_paid, 2),
        "total_pending_to_partners": round(total_pending, 2),
        "real_income": round(total_event - total_cost, 2),
    }


@api_router.get("/settings")
async def get_app_settings():
    doc = await db.app_settings.find_one({}, {"_id": 0})
    if not doc:
        return {}
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
    key = update_doc.get("resend_api_key") or ""
    if "****" in key or key.startswith("re_" + "*"):
        update_doc.pop("resend_api_key", None)
    existing = await db.app_settings.find_one({}, {"_id": 0})
    if existing:
        await db.app_settings.update_one({}, {"$set": update_doc})
    else:
        await db.app_settings.insert_one(update_doc)
    if _using_embedded:
        asyncio.create_task(_save_embedded_data())
    saved = await db.app_settings.find_one({}, {"_id": 0})
    if saved and saved.get("resend_api_key"):
        key = saved["resend_api_key"]
        saved["resend_api_key"] = "re_" + "*" * 20 + key[-4:] if len(key) > 4 else "****"
        saved["has_resend_key"] = True
    elif saved:
        saved["has_resend_key"] = False
    return saved or {}


@api_router.get("/settings/database")
async def get_db_stats():
    if _using_embedded:
        counts = {}
        total_docs = 0
        for col in ['reservations', 'socios', 'app_settings']:
            n = await db[col].count_documents({})
            counts[col] = n
            total_docs += n
        data_file_size = DATA_FILE.stat().st_size if DATA_FILE.exists() else 0

        def fmt(b):
            if b < 1024:
                return f"{b} B"
            elif b < 1024 ** 2:
                return f"{b / 1024:.1f} KB"
            return f"{b / (1024 ** 2):.2f} MB"

        return {
            "db_name": DB_NAME + " (embebida)",
            "collections": len(counts),
            "objects": total_docs,
            "data_size": fmt(data_file_size),
            "storage_size": fmt(data_file_size),
            "index_size": "0 B",
            "total_size": fmt(data_file_size),
            "current_url": "embedded (cinema_data.json)",
            "is_custom": False,
        }
    try:
        raw = await db.command("dbstats")
        storage_bytes = raw.get("storageSize", 0)
        data_bytes = raw.get("dataSize", 0)
        index_bytes = raw.get("indexSize", 0)

        def fmt(b):
            if b < 1024:
                return f"{b} B"
            elif b < 1024 ** 2:
                return f"{b / 1024:.1f} KB"
            return f"{b / (1024 ** 2):.2f} MB"

        is_custom = CUSTOM_DB_FILE.exists()
        current_url = CUSTOM_DB_FILE.read_text().strip() if is_custom else MONGO_URL
        display_url = current_url
        if "@" in current_url:
            proto_end = current_url.find("://") + 3
            at_pos = current_url.rfind("@")
            display_url = current_url[:proto_end] + "***:***@" + current_url[at_pos + 1:]
        return {
            "db_name": DB_NAME,
            "collections": raw.get("collections", 0),
            "objects": raw.get("objects", 0),
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
    if req.url.lower() == "embedded":
        return {"success": True, "message": "Modo embebido seleccionado"}
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        test_client = AsyncIOMotorClient(req.url, serverSelectionTimeoutMS=5000)
        await test_client[DB_NAME].command("ping")
        test_client.close()
        return {"success": True, "message": "Conexión exitosa"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo conectar: {e}")


@api_router.post("/settings/database/connect")
async def switch_database(req: DBConnectRequest):
    CUSTOM_DB_FILE.write_text(req.url)
    return {"success": True, "message": "URL guardada. Reinicia la app para aplicar el cambio."}


@api_router.post("/settings/database/reset")
async def reset_database():
    if CUSTOM_DB_FILE.exists():
        CUSTOM_DB_FILE.unlink()
    return {"success": True, "message": "Restaurado. Reinicia la app para aplicar."}


@api_router.post("/reminders/send")
async def trigger_reminders_manual():
    return {"success": True, "events_found": 0, "sent": 0,
            "message": "Recordatorios por email disponibles en la versión web"}


# ─── App config ───────────────────────────────────────────

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Serve React build (SPA) ─────────────────────────────

BUILD_DIR = ROOT_DIR / "build"
if BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(BUILD_DIR / "static")), name="static")

    @app.get("/favicon.ico")
    async def favicon():
        f = BUILD_DIR / "favicon.ico"
        return FileResponse(str(f)) if f.exists() else Response(status_code=204)

    @app.get("/manifest.json")
    async def manifest_json():
        f = BUILD_DIR / "manifest.json"
        return FileResponse(str(f)) if f.exists() else Response("{}", media_type="application/json")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(BUILD_DIR / "index.html"))

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        f = BUILD_DIR / path
        if f.exists() and f.is_file():
            return FileResponse(str(f))
        return FileResponse(str(BUILD_DIR / "index.html"))


# ─── Entry point ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    db_label = "Embebida (cinema_data.json)" if _using_embedded else MONGO_URL[:40]

    def _open_browser():
        time.sleep(3)
        webbrowser.open("http://localhost:8001")

    threading.Thread(target=_open_browser, daemon=True).start()

    print("\n" + "=" * 54)
    print("  CINEMA PRODUCTIONS — Gestor de Reservas")
    print("=" * 54)
    print(f"  URL:  http://localhost:8001")
    print(f"  BD:   {db_label}")
    print(f"  Datos: {DATA_FILE.name if _using_embedded else 'MongoDB'}")
    print("  Para cerrar: Ctrl+C  o  cierra esta ventana")
    print("=" * 54 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="warning")
