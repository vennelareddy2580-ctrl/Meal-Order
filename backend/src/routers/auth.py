import random, string, logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from src.database import get_db
from src.models.models import User, OTPRecord, Wallet
from src.schemas.schemas import (
    SendOTPRequest, VerifyOTPRequest, OTPResponse,
    TokenResponse, UserResponse, UpdateProfileRequest
)
from src.services.auth_utils import create_access_token, get_current_user
from src.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


def _gen_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def _utc(dt):
    """Ensure datetime is UTC-aware."""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(req: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Get or create user
        res = await db.execute(select(User).where(User.phone == req.phone))
        user = res.scalar_one_or_none()

        if not user:
            user = User(phone=req.phone)
            db.add(user)
            await db.flush()                          # get user.id
            db.add(Wallet(user_id=user.id, balance=0.0))
            await db.flush()
        else:
            # Ensure wallet exists
            wr = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
            if not wr.scalar_one_or_none():
                db.add(Wallet(user_id=user.id, balance=0.0))
                await db.flush()

        # 2. Check for active lock
        lr = await db.execute(
            select(OTPRecord)
            .where(OTPRecord.user_id == user.id, OTPRecord.is_locked == True)
            .order_by(desc(OTPRecord.created_at))
            .limit(1)
        )
        locked = lr.scalar_one_or_none()
        if locked and locked.locked_until:
            now = datetime.now(timezone.utc)
            until = _utc(locked.locked_until)
            if now < until:
                secs = int((until - now).total_seconds())
                raise HTTPException(status_code=429,
                    detail=f"Account locked. Try again in {secs} seconds.")

        # 3. Generate OTP
        code = _gen_otp()
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        db.add(OTPRecord(user_id=user.id, otp_code=code, expires_at=expires))
        await db.commit()

        # Mock SMS — print to terminal
        print(f"\n{'='*45}\n  MOCK OTP  |  {req.phone}  |  {code}\n{'='*45}\n")
        logger.info(f"OTP for {req.phone}: {code}")

        resp = OTPResponse(
            message="OTP sent successfully",
            expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        )
        if settings.DEBUG:
            resp.otp = code       # show in response in dev mode
        return resp

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"send-otp failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(req: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(select(User).where(User.phone == req.phone))
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="No account found. Send OTP first.")

        now = datetime.now(timezone.utc)

        # Get latest active OTP
        or_ = await db.execute(
            select(OTPRecord)
            .where(
                OTPRecord.user_id == user.id,
                OTPRecord.is_used == False,
                OTPRecord.is_locked == False,
            )
            .order_by(desc(OTPRecord.created_at))
            .limit(1)
        )
        rec = or_.scalar_one_or_none()
        if not rec:
            raise HTTPException(status_code=400, detail="No active OTP. Request a new one.")

        if now > _utc(rec.expires_at):
            raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

        if rec.otp_code != req.otp:
            rec.attempts += 1
            if rec.attempts >= settings.OTP_MAX_ATTEMPTS:
                rec.is_locked = True
                rec.locked_until = now + timedelta(minutes=settings.ACCOUNT_LOCK_MINUTES)
                await db.commit()
                raise HTTPException(status_code=429,
                    detail=f"Too many wrong attempts. Locked for {settings.ACCOUNT_LOCK_MINUTES} min.")
            left = settings.OTP_MAX_ATTEMPTS - rec.attempts
            await db.commit()
            raise HTTPException(status_code=400, detail=f"Wrong OTP. {left} attempt(s) left.")

        rec.is_used = True
        await db.commit()

        return TokenResponse(
            access_token=create_access_token(user.id, user.phone),
            user=UserResponse.model_validate(user),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"verify-otp failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.name is not None:
        user.name = req.name
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)
