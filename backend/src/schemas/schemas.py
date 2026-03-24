from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from src.models.models import DietaryType, MealTime, OrderStatus, TransactionType, UserRole

# ── Auth ──────────────────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    phone: str
    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v):
        v = v.strip().replace(" ", "").replace("-", "")
        if len(v) < 10:
            raise ValueError("Phone number is too short")
        return v

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    @field_validator("otp")
    @classmethod
    def clean_otp(cls, v):
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be 6 digits")
        return v

class OTPResponse(BaseModel):
    message: str
    expires_in_seconds: int
    otp: Optional[str] = None

class UserResponse(BaseModel):
    id: str; phone: str; name: Optional[str]
    role: UserRole; institution_id: Optional[str]
    is_active: bool; created_at: datetime
    class Config: from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None

# ── Institution ───────────────────────────────────────────────────────────────

class InstitutionResponse(BaseModel):
    id: str; name: str; code: str
    address: Optional[str]; is_active: bool
    class Config: from_attributes = True

class InstitutionCreate(BaseModel):
    name: str; code: str; address: Optional[str] = None

# ── Menu ──────────────────────────────────────────────────────────────────────

class MenuItemResponse(BaseModel):
    id: str; institution_id: str; name: str
    description: Optional[str]; price: float
    dietary_type: DietaryType; meal_time: MealTime
    available_date: str; is_available: bool; is_sold_out: bool
    class Config: from_attributes = True

class MenuItemCreate(BaseModel):
    institution_id: str; name: str; description: Optional[str] = None
    price: float; dietary_type: DietaryType; meal_time: MealTime
    available_date: str; is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None; description: Optional[str] = None
    price: Optional[float] = None; is_available: Optional[bool] = None
    is_sold_out: Optional[bool] = None

# ── Orders ────────────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int = 1
    @field_validator("quantity")
    @classmethod
    def check_qty(cls, v):
        if v < 1: raise ValueError("Quantity must be at least 1")
        if v > 20: raise ValueError("Max 20 per item")
        return v

class CreateOrderRequest(BaseModel):
    institution_id: str
    order_date: str
    meal_time: MealTime
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    @field_validator("items")
    @classmethod
    def check_items(cls, v):
        if not v: raise ValueError("Order must have at least one item")
        return v

class OrderItemResponse(BaseModel):
    id: str; menu_item_id: str; menu_item_name: str
    quantity: int; unit_price: float; subtotal: float
    class Config: from_attributes = True

class OrderResponse(BaseModel):
    id: str; user_id: str; institution_id: str
    order_date: str; meal_time: MealTime; status: OrderStatus
    total_amount: float; notes: Optional[str]
    items: List[OrderItemResponse]; created_at: datetime
    class Config: from_attributes = True

# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletResponse(BaseModel):
    id: str; user_id: str; balance: float; updated_at: datetime
    class Config: from_attributes = True

class RechargeRequest(BaseModel):
    amount: float
    @field_validator("amount")
    @classmethod
    def check_amount(cls, v):
        if v <= 0: raise ValueError("Amount must be positive")
        if v > 50000: raise ValueError("Max recharge is Rs.50,000")
        return round(v, 2)

class TransactionResponse(BaseModel):
    id: str; wallet_id: str; order_id: Optional[str]
    amount: float; transaction_type: TransactionType
    balance_before: float; balance_after: float
    description: Optional[str]; created_at: datetime
    class Config: from_attributes = True

# ── Holiday ───────────────────────────────────────────────────────────────────

class HolidayResponse(BaseModel):
    id: str; institution_id: str; date: str; name: str
    class Config: from_attributes = True

class HolidayCreate(BaseModel):
    date: str; name: str

# ── Generic ───────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str

TokenResponse.model_rebuild()
