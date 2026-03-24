from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, ForeignKey, Enum, Text, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import enum, uuid

def gen_uuid(): return str(uuid.uuid4())

class Base(DeclarativeBase): pass

class DietaryType(str, enum.Enum):
    VEG     = "veg"
    NON_VEG = "non_veg"
    VEGAN   = "vegan"
    JAIN    = "jain"

class MealTime(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH     = "lunch"
    SNACK     = "snack"
    DINNER    = "dinner"

class OrderStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    DELIVERED = "delivered"

class TransactionType(str, enum.Enum):
    RECHARGE = "recharge"
    DEBIT    = "debit"
    REFUND   = "refund"

class UserRole(str, enum.Enum):
    USER  = "user"
    ADMIN = "admin"

class Institution(Base):
    __tablename__ = "institutions"
    id         = Column(String, primary_key=True, default=gen_uuid)
    name       = Column(String(200), nullable=False)
    code       = Column(String(50), unique=True, nullable=False)
    address    = Column(Text)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    users      = relationship("User", back_populates="institution")
    menu_items = relationship("MenuItem", back_populates="institution")
    holidays   = relationship("Holiday", back_populates="institution")

class User(Base):
    __tablename__ = "users"
    id             = Column(String, primary_key=True, default=gen_uuid)
    phone          = Column(String(20), unique=True, nullable=False, index=True)
    name           = Column(String(100))
    role           = Column(Enum(UserRole), default=UserRole.USER)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=True)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())
    institution    = relationship("Institution", back_populates="users")
    otp_records    = relationship("OTPRecord", back_populates="user")
    wallet         = relationship("Wallet", back_populates="user", uselist=False)
    orders         = relationship("Order", back_populates="user")

class OTPRecord(Base):
    __tablename__ = "otp_records"
    id           = Column(String, primary_key=True, default=gen_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    otp_code     = Column(String(6), nullable=False)
    attempts     = Column(Integer, default=0)
    is_used      = Column(Boolean, default=False)
    is_locked    = Column(Boolean, default=False)
    locked_until = Column(DateTime, nullable=True)
    expires_at   = Column(DateTime, nullable=False)
    created_at   = Column(DateTime, server_default=func.now())
    user         = relationship("User", back_populates="otp_records")
    __table_args__ = (Index("ix_otp_user_created", "user_id", "created_at"),)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id             = Column(String, primary_key=True, default=gen_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    name           = Column(String(200), nullable=False)
    description    = Column(Text)
    price          = Column(Float, nullable=False)
    dietary_type   = Column(Enum(DietaryType), nullable=False)
    meal_time      = Column(Enum(MealTime), nullable=False)
    available_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    is_available   = Column(Boolean, default=True)
    is_sold_out    = Column(Boolean, default=False)
    created_at     = Column(DateTime, server_default=func.now())
    institution    = relationship("Institution", back_populates="menu_items")
    order_items    = relationship("OrderItem", back_populates="menu_item")
    __table_args__ = (Index("ix_menu_inst_date", "institution_id", "available_date"),)

class Holiday(Base):
    __tablename__ = "holidays"
    id             = Column(String, primary_key=True, default=gen_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    date           = Column(String(10), nullable=False)
    name           = Column(String(200), nullable=False)
    created_at     = Column(DateTime, server_default=func.now())
    institution    = relationship("Institution", back_populates="holidays")

class Order(Base):
    __tablename__ = "orders"
    id             = Column(String, primary_key=True, default=gen_uuid)
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    order_date     = Column(String(10), nullable=False)
    meal_time      = Column(Enum(MealTime), nullable=False)
    status         = Column(Enum(OrderStatus), default=OrderStatus.CONFIRMED)
    total_amount   = Column(Float, nullable=False)
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user           = relationship("User", back_populates="orders")
    items          = relationship("OrderItem", back_populates="order")
    __table_args__  = (Index("ix_order_user_date_meal", "user_id", "order_date", "meal_time", unique=True),)

class OrderItem(Base):
    __tablename__ = "order_items"
    id           = Column(String, primary_key=True, default=gen_uuid)
    order_id     = Column(String, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(String, ForeignKey("menu_items.id"), nullable=False)
    quantity     = Column(Integer, default=1)
    unit_price   = Column(Float, nullable=False)
    subtotal     = Column(Float, nullable=False)
    order        = relationship("Order", back_populates="items")
    menu_item    = relationship("MenuItem", back_populates="order_items")

class Wallet(Base):
    __tablename__ = "wallets"
    id         = Column(String, primary_key=True, default=gen_uuid)
    user_id    = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    balance    = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user         = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id               = Column(String, primary_key=True, default=gen_uuid)
    wallet_id        = Column(String, ForeignKey("wallets.id"), nullable=False)
    order_id         = Column(String, ForeignKey("orders.id"), nullable=True)
    amount           = Column(Float, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    balance_before   = Column(Float, nullable=False)
    balance_after    = Column(Float, nullable=False)
    description      = Column(String(500))
    created_at       = Column(DateTime, server_default=func.now())
    wallet           = relationship("Wallet", back_populates="transactions")
    __table_args__   = (Index("ix_tx_wallet_created", "wallet_id", "created_at"),)
