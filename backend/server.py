from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated
from datetime import datetime, timezone
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Helper ──────────────────────────────────────────────
def PyObjectId(v):
    if isinstance(v, ObjectId):
        return str(v)
    return v


def doc_to_dict(doc: dict) -> dict:
    """Convert MongoDB doc: _id → id as str, flatten."""
    if doc is None:
        return {}
    d = {k: v for k, v in doc.items() if k != '_id'}
    if '_id' in doc:
        d['id'] = str(doc['_id'])
    return d


# ─── Pydantic Models ─────────────────────────────────────
class ReceiptImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    content_type: str
    data: str  # base64
    uploaded_at: str


class ReservationCreate(BaseModel):
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_type: str
    event_date: str  # ISO date string YYYY-MM-DD
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
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
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
        {"_id": oid},
        {"$push": {"receipt_images": receipt}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Return without base64 data
    receipt_summary = {k: v for k, v in receipt.items() if k != "data"}
    return receipt_summary


@api_router.delete("/reservations/{reservation_id}/receipts/{receipt_id}")
async def delete_receipt(reservation_id: str, receipt_id: str):
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await db.reservations.update_one(
        {"_id": oid},
        {"$pull": {"receipt_images": {"id": receipt_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {"message": "Comprobante eliminado"}


@api_router.get("/calendar")
async def get_calendar_events():
    cursor = db.reservations.find(
        {"status": {"$nin": ["Cancelado"]}},
        {"client_name": 1, "event_date": 1, "event_type": 1, "status": 1, "_id": 1}
    )
    docs = await cursor.to_list(1000)
    return [doc_to_dict(d) for d in docs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
