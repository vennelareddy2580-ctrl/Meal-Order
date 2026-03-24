import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from src.database import get_db
from src.models.models import (
    Order, OrderItem, MenuItem, Holiday,
    Wallet, WalletTransaction, OrderStatus, TransactionType, User
)
from src.schemas.schemas import (
    CreateOrderRequest, OrderResponse, OrderItemResponse, MessageResponse
)
from src.services.auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])


def _build_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id, user_id=order.user_id,
        institution_id=order.institution_id,
        order_date=order.order_date, meal_time=order.meal_time,
        status=order.status, total_amount=order.total_amount,
        notes=order.notes, created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=oi.id, menu_item_id=oi.menu_item_id,
                menu_item_name=oi.menu_item.name if oi.menu_item else "Unknown",
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                subtotal=oi.subtotal,
            )
            for oi in order.items
        ],
    )


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(
    req: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        now = datetime.now(timezone.utc)

        # Validate date format
        try:
            order_dt = datetime.strptime(req.order_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

        # Cannot order for past dates
        if order_dt < now.date():
            raise HTTPException(400, "Cannot place orders for past dates.")

        # Holiday check
        hr = await db.execute(
            select(Holiday).where(
                Holiday.institution_id == req.institution_id,
                Holiday.date == req.order_date,
            )
        )
        if hr.scalar_one_or_none():
            raise HTTPException(400, "Cannot order on a holiday.")

        # Duplicate order check (same user + date + meal slot)
        dr = await db.execute(
            select(Order).where(
                Order.user_id == user.id,
                Order.order_date == req.order_date,
                Order.meal_time == req.meal_time,
                Order.status != OrderStatus.CANCELLED,
            )
        )
        if dr.scalar_one_or_none():
            raise HTTPException(
                409,
                f"You already have an active {req.meal_time} order for {req.order_date}.",
            )

        # Validate every menu item — search by ID + institution + date ONLY
        # (NOT by meal_time — that's what caused the "item not found" error)
        total = 0.0
        validated = []
        for item_req in req.items:
            mr = await db.execute(
                select(MenuItem).where(
                    MenuItem.id == item_req.menu_item_id,
                    MenuItem.institution_id == req.institution_id,
                    MenuItem.available_date == req.order_date,
                )
            )
            mi = mr.scalar_one_or_none()
            if not mi:
                raise HTTPException(
                    404,
                    f"Menu item not available on {req.order_date}. "
                    "Please refresh the menu and try again.",
                )
            if not mi.is_available:
                raise HTTPException(400, f"'{mi.name}' is currently not available.")
            if mi.is_sold_out:
                raise HTTPException(400, f"'{mi.name}' is sold out.")

            sub = round(mi.price * item_req.quantity, 2)
            total += sub
            validated.append((mi, item_req.quantity, sub))

        total = round(total, 2)

        # Wallet balance check
        wr = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wr.scalar_one_or_none()
        if not wallet:
            raise HTTPException(400, "Wallet not found. Please contact support.")
        if wallet.balance < total:
            raise HTTPException(
                402,
                f"Insufficient balance. Need Rs.{total:.2f}, "
                f"available Rs.{wallet.balance:.2f}. Please recharge.",
            )

        # Create order
        order = Order(
            user_id=user.id,
            institution_id=req.institution_id,
            order_date=req.order_date,
            meal_time=req.meal_time,
            total_amount=total,
            notes=req.notes,
            status=OrderStatus.CONFIRMED,
        )
        db.add(order)
        await db.flush()

        for mi, qty, sub in validated:
            db.add(OrderItem(
                order_id=order.id,
                menu_item_id=mi.id,
                quantity=qty,
                unit_price=mi.price,
                subtotal=sub,
            ))

        # Debit wallet
        bal_before = wallet.balance
        wallet.balance = round(wallet.balance - total, 2)
        db.add(WalletTransaction(
            wallet_id=wallet.id, order_id=order.id,
            amount=total, transaction_type=TransactionType.DEBIT,
            balance_before=bal_before, balance_after=wallet.balance,
            description=f"Order — {req.meal_time} on {req.order_date}",
        ))
        await db.commit()

        # Reload with relationships for response
        res = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .where(Order.id == order.id)
        )
        return _build_response(res.scalar_one())

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"create_order error: {e}", exc_info=True)
        raise HTTPException(500, f"Order failed: {str(e)}")


@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
    )
    if status:
        q = q.where(Order.status == status)
    res = await db.execute(q)
    return [_build_response(o) for o in res.scalars().all()]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
        .where(Order.id == order_id, Order.user_id == user.id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    return _build_response(order)


@router.delete("/{order_id}", response_model=MessageResponse)
async def cancel_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
        .where(Order.id == order_id, Order.user_id == user.id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(400, "Order is already cancelled")
    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(400, "Delivered orders cannot be cancelled")

    # Cancellation deadline: midnight before the order date
    now = datetime.now(timezone.utc)
    odate = datetime.strptime(order.order_date, "%Y-%m-%d").date()
    prev  = odate - timedelta(days=1)
    deadline = datetime(prev.year, prev.month, prev.day, 23, 59, 59, tzinfo=timezone.utc)
    if now > deadline:
        raise HTTPException(400, "Cancellation window has closed for this order.")

    order.status = OrderStatus.CANCELLED

    wr = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    wallet = wr.scalar_one()
    bal_before = wallet.balance
    wallet.balance = round(wallet.balance + order.total_amount, 2)
    db.add(WalletTransaction(
        wallet_id=wallet.id, order_id=order.id,
        amount=order.total_amount, transaction_type=TransactionType.REFUND,
        balance_before=bal_before, balance_after=wallet.balance,
        description=f"Refund — cancelled order {order.id[:8].upper()}",
    ))
    await db.commit()
    return MessageResponse(message=f"Order cancelled. Rs.{order.total_amount:.2f} refunded to wallet.")
