from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from src.database import get_db
from src.models.models import Wallet, WalletTransaction, TransactionType, User
from src.schemas.schemas import WalletResponse, RechargeRequest, TransactionResponse
from src.services.auth_utils import get_current_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("/", response_model=WalletResponse)
async def get_wallet(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    w = res.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wallet not found")
    return WalletResponse.model_validate(w)


@router.post("/recharge", response_model=WalletResponse)
async def recharge(
    req: RechargeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    w = res.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wallet not found")

    bal_before = w.balance
    w.balance   = round(w.balance + req.amount, 2)
    db.add(WalletTransaction(
        wallet_id=w.id,
        amount=req.amount,
        transaction_type=TransactionType.RECHARGE,
        balance_before=bal_before,
        balance_after=w.balance,
        description=f"Recharge Rs.{req.amount:.2f}",
    ))
    await db.commit()
    await db.refresh(w)
    return WalletResponse.model_validate(w)


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit:  int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    transaction_type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    wr = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    w  = wr.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Wallet not found")

    q = (
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == w.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit).offset(offset)
    )
    if transaction_type:
        q = q.where(WalletTransaction.transaction_type == transaction_type)

    res = await db.execute(q)
    return [TransactionResponse.model_validate(t) for t in res.scalars().all()]
