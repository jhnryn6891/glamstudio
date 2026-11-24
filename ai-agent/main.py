import os
import time
import random
import hashlib
import secrets
import logging
from datetime import datetime
from typing import Optional, List, Dict
from collections import Counter
from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SQLField, Session, create_engine, select
import httpx

# 1. STRUCTURED AUDIT LOGGING
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}'
)
logger = logging.getLogger("glamstudio-api")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./glamstudio.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY")
if not ADMIN_SECRET_KEY:
    raise RuntimeError("Missing required ADMIN_SECRET_KEY environment variable.")
WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "")

OTP_STORE: Dict[str, dict] = {}

# OFFICIAL MARKETING PACKAGES & RATE CARD ASSET
SERVICE_PACKAGES = [
    {
        "id": "bridal_luxe",
        "name": "Bridal Luxe Signature",
        "event_type": "Bridal & Entourage",
        "price_php": 8500,
        "downpayment_php": 4250,
        "duration": "90 mins Bride + 40 mins/head",
        "inclusions": [
            "Luxury Skin Prep & Airbrush / HD Bridal Makeup",
            "2nd Look / Reception Retouch Option",
            "Custom Individual Lashes + Bridal Touch-Up Kit",
            "Entourage Add-On: PHP 2,000 / head"
        ]
    },
    {
        "id": "debut_royalty",
        "name": "Debutante Royalty Package",
        "event_type": "Debut / Sweet 16",
        "price_php": 6500,
        "downpayment_php": 3250,
        "duration": "75 mins + Entourage Add-Ons",
        "inclusions": [
            "Pre-Debut Shoot & Grand Cotillion Glam",
            "Sweat-Resistant Glass-Skin Finish",
            "Free Consultation & Peg Matching"
        ]
    },
    {
        "id": "red_carpet_glam",
        "name": "Red Carpet / Gala Glam",
        "event_type": "Red Carpet / Gala",
        "price_php": 3500,
        "downpayment_php": 1750,
        "duration": "60 mins / head",
        "inclusions": [
            "Sculpted Evening Glam & Precision Lashes",
            "Flashback-Free HD Setting Spray",
            "On-Location Hotel or Home Service"
        ]
    },
    {
        "id": "editorial_shoot",
        "name": "Editorial & Brand Campaign",
        "event_type": "Editorial / Photoshoot",
        "price_php": 5000,
        "downpayment_php": 2500,
        "duration": "Half-Day (Up to 3 Looks)",
        "inclusions": [
            "On-Set Creative Direction & Look Changes",
            "Studio & Outdoor Lighting Tested Finish",
            "Continuous Set Touch-Ups"
        ]
    }
]

# 2. RELATIONAL DATA MODELS
class ClientAccount(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    full_name: str
    auth_method: str
    contact_handle: str = SQLField(index=True, unique=True)
    pin_hash: str
    is_verified: bool = SQLField(default=True)
    agreed_terms_at: str
    login_count: int = SQLField(default=1)
    created_at: str = SQLField(default_factory=lambda: datetime.utcnow().isoformat())

class Booking(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    client_name: str
    client_contact: str
    event_type: str
    event_date: str
    start_time: str
    end_time: str
    head_count: int
    location_address: str
    travel_buffer_minutes: int
    calculated_duration_minutes: int
    # Downpayment & Verification Fields
    payment_method: str          # "GCash" | "Maya" | "BDO / BPI Transfer"
    payment_reference: str       # Transaction Ref #
    downpayment_amount: int      # PHP Amount
    payment_status: str = SQLField(default="pending_verification")  # "pending_verification" | "verified"
    status: str = SQLField(default="awaiting_payment_verification") # "awaiting_payment_verification" | "confirmed" | "pending_manual_review"
    created_at: str = SQLField(default_factory=lambda: datetime.utcnow().isoformat())

class Inquiry(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    contact_channel: str
    message: str
    ai_reply: str
    sent_packages: bool = SQLField(default=False)
    latency_ms: int
    created_at: str = SQLField(default_factory=lambda: datetime.utcnow().isoformat())

class Review(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    comment: str
    rating: int
    approved: bool = SQLField(default=False)
    created_at: str = SQLField(default_factory=lambda: datetime.utcnow().isoformat())

class TelemetryEvent(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    event_type: str
    target_name: str
    duration_seconds: int = SQLField(default=0)
    user_handle: Optional[str] = SQLField(default="anonymous")
    created_at: str = SQLField(default_factory=lambda: datetime.utcnow().isoformat())

# 3. PYDANTIC SCHEMAS
class OTPRequest(BaseModel):
    auth_method: str = Field(..., pattern="^(tiktok|instagram|facebook|phone|email)$")
    contact_handle: str = Field(..., min_length=3, max_length=120)

class ClientSignUp(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    auth_method: str = Field(..., pattern="^(tiktok|instagram|facebook|phone|email)$")
    contact_handle: str = Field(..., min_length=3, max_length=120)
    pin: str = Field(..., min_length=4, max_length=32)
    otp_code: str = Field(..., min_length=6, max_length=6)
    agreed_to_terms: bool

class ClientLogin(BaseModel):
    contact_handle: str = Field(..., min_length=3, max_length=120)
    pin: str = Field(..., min_length=4, max_length=32)

class BookingCreate(BaseModel):
    client_name: str = Field(..., min_length=2, max_length=100)
    client_contact: str = Field(..., min_length=3, max_length=120)
    event_type: str = Field(..., min_length=2, max_length=80)
    event_date: str
    start_time: str
    head_count: int = Field(..., ge=1, le=20)
    location_address: str = Field(..., min_length=3, max_length=250)
    payment_method: str = Field(..., min_length=2, max_length=50)
    payment_reference: str = Field(..., min_length=1, max_length=80)
    downpayment_amount: int = Field(..., ge=500)

class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    contact_channel: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=2, max_length=1000)

class ReviewCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    comment: str = Field(..., min_length=5, max_length=500)
    rating: int = Field(..., ge=1, le=5)

class TelemetryCreate(BaseModel):
    event_type: str
    target_name: str
    duration_seconds: int = 0
    user_handle: Optional[str] = "anonymous"

# 4. SECURITY HELPERS
def hash_pin(pin: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return f"{salt}${digest}"

def verify_pin(pin: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split("$", 1)
        return secrets.compare_digest(hash_pin(pin, salt), stored_hash)
    except ValueError:
        return False

def normalize_handle(handle: str) -> str:
    return handle.strip().lower()

# 5. APP INITIALIZATION
app = FastAPI(
    title="GlamStudio Enterprise API v3.1",
    description="Downpayment-gated scheduling, automated prep policies, and marketing asset concierge",
    version="3.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://glamstudio-admin.vercel.app",
        "https://glamstudio-booking.vercel.app",
        "https://glamstudio-7g3i.vercel.app",
        "https://glamstudio-sl8c.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if not session.exec(select(Review)).first():
            session.add(Review(name="Jessica Alba", comment="Absolute perfection! The glam lasted all night through the reception.", rating=5, approved=True))
            session.add(Review(name="Chloe Grace", comment="So professional and punctual. Loved the travel-to-you convenience!", rating=5, approved=True))
            session.commit()
    logger.info("GlamStudio Enterprise API v3.1 (Payment-Gated + Marketing Concierge) initialized.")

def get_session():
    with Session(engine) as session:
        yield session

def verify_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid Admin Security Key")
    return True

async def emit_webhook_event(event_type: str, payload: dict):
    if not WEBHOOK_URL:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(WEBHOOK_URL, json={"event": event_type, "timestamp": datetime.utcnow().isoformat(), "data": payload})
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")

def calculate_travel_buffer(location: str) -> int:
    loc_lower = location.lower()
    outside_metro = ["cavite", "laguna", "batangas", "rizal", "tagaytay", "pampanga", "bulacan"]
    return 120 if any(k in loc_lower for k in outside_metro) else 60

def time_to_minutes(time_str: str) -> int:
    h, m = map(int, time_str.split(":"))
    return h * 60 + m

def minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

# ================= OTP & AUTH ENDPOINTS =================

@app.post("/api/auth/request-otp")
def request_otp(payload: OTPRequest, session: Session = Depends(get_session)):
    clean_handle = normalize_handle(payload.contact_handle)
    existing = session.exec(select(ClientAccount).where(ClientAccount.contact_handle == clean_handle)).first()
    if existing:
        raise HTTPException(status_code=409, detail="This contact is already registered. Please switch to Log In.")

    code = f"{random.randint(100000, 999999)}"
    OTP_STORE[clean_handle] = {"code": code, "expires": time.time() + 300}
    return {
        "status": "otp_sent",
        "message": f"6-digit verification code sent to your {payload.auth_method}."
    }

@app.post("/api/auth/signup")
def signup_client(payload: ClientSignUp, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    if not payload.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions and Privacy Policy.")

    clean_handle = normalize_handle(payload.contact_handle)
    record = OTP_STORE.get(clean_handle)
    if not record or record["code"] != payload.otp_code or time.time() > record["expires"]:
        raise HTTPException(status_code=400, detail="Invalid or expired 6-digit verification code.")

    del OTP_STORE[clean_handle]

    account = ClientAccount(
        full_name=payload.full_name.strip(),
        auth_method=payload.auth_method,
        contact_handle=clean_handle,
        pin_hash=hash_pin(payload.pin),
        is_verified=True,
        agreed_terms_at=datetime.utcnow().isoformat()
    )
    session.add(account)
    session.commit()
    session.refresh(account)

    background_tasks.add_task(emit_webhook_event, "client.registered", {
        "id": account.id, "full_name": account.full_name, "auth_method": account.auth_method
    })

    return {
        "id": account.id,
        "full_name": account.full_name,
        "auth_method": account.auth_method,
        "contact_handle": account.contact_handle,
        "is_verified": account.is_verified
    }

@app.post("/api/auth/login")
def login_client(payload: ClientLogin, session: Session = Depends(get_session)):
    clean_handle = normalize_handle(payload.contact_handle)
    account = session.exec(select(ClientAccount).where(ClientAccount.contact_handle == clean_handle)).first()
    if not account or not verify_pin(payload.pin, account.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid contact handle or PIN/password.")

    account.login_count += 1
    session.add(account)
    session.commit()

    return {
        "id": account.id,
        "full_name": account.full_name,
        "auth_method": account.auth_method,
        "contact_handle": account.contact_handle,
        "is_verified": account.is_verified
    }

@app.get("/api/client/bookings")
def get_client_bookings(contact_handle: str, session: Session = Depends(get_session)):
    clean_handle = normalize_handle(contact_handle)
    all_bookings = session.exec(select(Booking)).all()
    return [b for b in all_bookings if clean_handle in normalize_handle(b.client_contact)]

@app.get("/api/packages")
def get_service_packages():
    return SERVICE_PACKAGES

@app.get("/api/calendar/availability")
def get_calendar_availability(session: Session = Depends(get_session)):
    bookings = session.exec(select(Booking).where(Booking.status != "rejected")).all()
    date_counts = Counter(b.event_date for b in bookings)
    return {
        date: {"count": count, "status": "hot" if count >= 2 else "booked"}
        for date, count in date_counts.items()
    }

# ================= PAYMENT-GATED BOOKING & AUTOMATED REMINDERS =================

@app.post("/api/book")
def create_booking(booking: BookingCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # 1. HARD VALIDATION ON PAYMENT REFERENCE (Block dummy or duplicate refs immediately)
    ref_clean = booking.payment_reference.strip().upper()
    dummy_values = {"TEST", "TESTING", "123", "1234", "12345", "123456", "000000", "NONE", "N/A", "NA", "ASDF", "QWERTY"}
    
    if len(ref_clean) < 6 or ref_clean in dummy_values or not any(ch.isdigit() for ch in ref_clean):
        logger.warning(f"Rejected invalid payment reference: '{booking.payment_reference}'")
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction reference number. Please enter the actual 6+ character receipt reference from your GCash, Maya, or Bank transfer."
        )

    # Check if this exact reference number was already submitted on another booking
    duplicate_ref = session.exec(
        select(Booking).where(Booking.payment_reference == ref_clean, Booking.status != "rejected")
    ).first()
    if duplicate_ref:
        logger.warning(f"Rejected duplicate payment reference: '{ref_clean}'")
        raise HTTPException(
            status_code=400,
            detail=f"Reference number '{ref_clean}' has already been submitted on another reservation. Please check your receipt."
        )

    # 2. Calculate travel buffer & duration
    travel_buffer = calculate_travel_buffer(booking.location_address)
    total_block_duration = (booking.head_count * 40) + travel_buffer

    try:
        start_mins = time_to_minutes(booking.start_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM in 24-hour format.")

    end_mins = start_mins + total_block_duration
    new_start_str = booking.start_time
    new_end_str = minutes_to_time(end_mins)

    # 3. Check for date & time collisions with active bookings
    existing_bookings = session.exec(
        select(Booking).where(
            Booking.event_date == booking.event_date,
            Booking.status.in_(["confirmed", "awaiting_payment_verification"])
        )
    ).all()

    has_conflict = any(
        (start_mins < time_to_minutes(ex.end_time)) and (end_mins > time_to_minutes(ex.start_time))
        for ex in existing_bookings
    )

    booking_status = "pending_manual_review" if has_conflict else "awaiting_payment_verification"

    # 4. Save valid submission to Database
    db_booking = Booking(
        client_name=booking.client_name,
        client_contact=booking.client_contact,
        event_type=booking.event_type,
        event_date=booking.event_date,
        start_time=new_start_str,
        end_time=new_end_str,
        head_count=booking.head_count,
        location_address=booking.location_address,
        travel_buffer_minutes=travel_buffer,
        calculated_duration_minutes=total_block_duration,
        payment_method=booking.payment_method,
        payment_reference=ref_clean,
        downpayment_amount=booking.downpayment_amount,
        payment_status="pending_verification",
        status=booking_status
    )
    session.add(db_booking)
    session.commit()
    session.refresh(db_booking)

    automated_reminders = [
        "1. Skin & Hair Prep: Please arrive with a clean, moisturized face (no heavy oils or leftover eye makeup) and dry hair.",
        "2. Setup Space: Kindly prepare a well-lit area near a power outlet and a comfortable chair for our lighting rig.",
        "3. Punctuality & Grace Period: A 15-minute grace period applies. Delays beyond 30 minutes may shorten entourage retouch windows.",
        "4. Downpayment Policy: Your 50% reservation fee locks your date once verified and is non-refundable, but transferable once if rescheduled at least 7 days prior.",
        "5. Remaining Balance: Settled on the event day right after the final glam reveal."
    ]

    background_tasks.add_task(emit_webhook_event, "booking.payment_submitted", db_booking.model_dump())

    return {
        "status": booking_status,
        "booking_id": db_booking.id,
        "client": db_booking.client_name,
        "event_type": db_booking.event_type,
        "event_date": db_booking.event_date,
        "start_time": new_start_str,
        "end_time": new_end_str,
        "location": db_booking.location_address,
        "payment_method": db_booking.payment_method,
        "payment_reference": db_booking.payment_reference,
        "downpayment_amount": db_booking.downpayment_amount,
        "message": (
            "Downpayment receipt logged! Because this date has high demand, our lead artist is reviewing route logistics and verifying your transfer."
            if has_conflict else
            f"Downpayment receipt ({db_booking.payment_method} Ref: {db_booking.payment_reference}) received! Your date is provisionally held while we verify your transfer."
        ),
        "automated_reminders_and_policies": automated_reminders
    }

# ================= GLAM CONCIERGE WITH AUTOMATED MARKETING PACKAGES =================

@app.post("/api/inquire")
async def create_inquiry(inquiry: InquiryCreate, session: Session = Depends(get_session)):
    start = time.time()
    msg_lower = inquiry.message.lower()

    package_keywords = ["price", "rate", "package", "how much", "cost", "bridal", "debut", "promo", "service", "menu", "entourage"]
    should_send_packages = any(k in msg_lower for k in package_keywords)

    if should_send_packages:
        reply = (
            f"Hi {inquiry.name}! Here is our official 2026 GlamStudio Service & Rate Card below. "
            f"All packages require a 50% downpayment via GCash, Maya, or Bank Transfer to lock your date, and include a 60-min Metro Manila buffer (120 mins outside Metro Manila). "
            f"We will also follow up via {inquiry.contact_channel}!"
        )
    else:
        reply = (
            f"Hi {inquiry.name}! Thank you for reaching out to GlamStudio Concierge. "
            f"We have noted your question and included our signature packages below in case you'd like to compare options. "
            f"Our lead artist will message you directly on {inquiry.contact_channel}!"
        )

    latency = int((time.time() - start) * 1000)
    db_inq = Inquiry(
        name=inquiry.name,
        contact_channel=inquiry.contact_channel,
        message=inquiry.message,
        ai_reply=reply,
        sent_packages=True,
        latency_ms=latency
    )
    session.add(db_inq)
    session.commit()

    return {
        "id": db_inq.id,
        "ai_reply": reply,
        "packages": SERVICE_PACKAGES,
        "latency_ms": latency
    }

@app.get("/api/reviews", response_model=List[Review])
def get_approved_reviews(session: Session = Depends(get_session)):
    return session.exec(select(Review).where(Review.approved == True)).all()

@app.post("/api/reviews")
def submit_review(review: ReviewCreate, session: Session = Depends(get_session)):
    db_rev = Review(**review.model_dump(), approved=False)
    session.add(db_rev)
    session.commit()
    return {"status": "pending_approval", "id": db_rev.id}

# ================= TELEMETRY & EXECUTIVE ANALYTICS =================

@app.post("/api/telemetry")
def record_telemetry(event: TelemetryCreate, session: Session = Depends(get_session)):
    db_event = TelemetryEvent(**event.model_dump())
    session.add(db_event)
    session.commit()
    return {"status": "recorded"}

@app.get("/api/admin/analytics", dependencies=[Depends(verify_admin)])
def get_executive_analytics(session: Session = Depends(get_session)):
    clients = session.exec(select(ClientAccount)).all()
    bookings = session.exec(select(Booking)).all()
    inquiries = session.exec(select(Inquiry)).all()
    reviews = session.exec(select(Review)).all()
    telemetry = session.exec(select(TelemetryEvent)).all()

    channel_counts = Counter(c.auth_method for c in clients)
    event_type_counts = Counter(b.event_type for b in bookings)
    click_events = [t.target_name for t in telemetry if t.event_type == "button_click"]
    button_heat = Counter(click_events).most_common(8)

    retention_totals: Dict[str, List[int]] = {}
    for t in telemetry:
        if t.event_type == "section_retention" and t.duration_seconds > 0:
            retention_totals.setdefault(t.target_name, []).append(t.duration_seconds)
    visual_retention = [
        {"section": sec, "avg_seconds": round(sum(vals) / len(vals), 1), "views": len(vals)}
        for sec, vals in retention_totals.items()
    ]

    confirmed = [b for b in bookings if b.status == "confirmed"]
    flagged = [b for b in bookings if b.status in ["pending_manual_review", "awaiting_payment_verification"]]
    total_heads_booked = sum(b.head_count for b in confirmed)
    verified_downpayments_php = sum(b.downpayment_amount for b in bookings if b.payment_status == "verified")
    pending_downpayments_php = sum(b.downpayment_amount for b in bookings if b.payment_status == "pending_verification")

    insights = []
    if len(flagged) > 0:
        insights.append(f"Action Needed: {len(flagged)} booking(s) have downpayment receipts awaiting your verification.")
    if pending_downpayments_php > 0:
        insights.append(f"Revenue Pipeline: PHP {pending_downpayments_php:,} in pending downpayments ready to verify.")
    if len(clients) > 0 and len(bookings) / len(clients) < 0.5:
        insights.append("Marketing Tip: Broadcast your 2026 Bridal & Debut Rate Card to registered TikTok/IG leads.")
    if not insights:
        insights.append("System Healthy: All downpayments verified and telemetry pipelines are active.")

    return {
        "kpis": {
            "total_signups": len(clients),
            "total_logins": sum(c.login_count for c in clients),
            "confirmed_bookings": len(confirmed),
            "flagged_bookings": len(flagged),
            "total_heads_booked": total_heads_booked,
            "verified_revenue_php": verified_downpayments_php,
            "pending_revenue_php": pending_downpayments_php,
            "total_clicks": len(click_events)
        },
        "marketing_channels": dict(channel_counts),
        "event_types": dict(event_type_counts),
        "button_heat_index": [{"button": b, "clicks": c} for b, c in button_heat],
        "visual_retention_index": visual_retention,
        "strategic_insights": insights,
        "pending_bookings": flagged,
        "confirmed_list": confirmed,
        "pending_reviews": [r for r in reviews if not r.approved],
        "inquiries_list": inquiries
    }

@app.patch("/api/admin/reviews/{review_id}/approve", dependencies=[Depends(verify_admin)])
def approve_review(review_id: int, session: Session = Depends(get_session)):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Not found")
    review.approved = True
    session.add(review)
    session.commit()
    return {"status": "approved"}

@app.patch("/api/admin/bookings/{booking_id}/confirm", dependencies=[Depends(verify_admin)])
def confirm_flagged_booking(booking_id: int, session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.payment_status = "verified"
    booking.status = "confirmed"
    session.add(booking)
    session.commit()
    return {"status": "verified_and_confirmed", "id": booking_id}

@app.patch("/api/admin/bookings/{booking_id}/reject", dependencies=[Depends(verify_admin)])
def reject_flagged_booking(booking_id: int, session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.payment_status = "rejected"
    booking.status = "rejected"
    session.add(booking)
    session.commit()
    return {"status": "rejected", "id": booking_id}
