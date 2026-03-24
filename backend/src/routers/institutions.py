from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from src.database import get_db
from src.models.models import Institution, Holiday, User
from src.schemas.schemas import (
    InstitutionCreate, InstitutionResponse,
    HolidayCreate, HolidayResponse, MessageResponse
)
from src.services.auth_utils import get_current_user, get_admin_user

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("/", response_model=List[InstitutionResponse])
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    res = await db.execute(select(Institution).where(Institution.is_active == True))
    return [InstitutionResponse.model_validate(i) for i in res.scalars().all()]


@router.post("/", response_model=InstitutionResponse, status_code=201)
async def create_institution(
    req: InstitutionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    ex = await db.execute(select(Institution).where(Institution.code == req.code))
    if ex.scalar_one_or_none():
        raise HTTPException(409, "Institution code already exists")
    inst = Institution(**req.model_dump())
    db.add(inst); await db.commit(); await db.refresh(inst)
    return InstitutionResponse.model_validate(inst)


@router.get("/{inst_id}/holidays", response_model=List[HolidayResponse])
async def get_holidays(
    inst_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    res = await db.execute(
        select(Holiday).where(Holiday.institution_id == inst_id).order_by(Holiday.date)
    )
    return [HolidayResponse.model_validate(h) for h in res.scalars().all()]


@router.post("/{inst_id}/holidays", response_model=HolidayResponse, status_code=201)
async def add_holiday(
    inst_id: str, req: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    h = Holiday(institution_id=inst_id, date=req.date, name=req.name)
    db.add(h); await db.commit(); await db.refresh(h)
    return HolidayResponse.model_validate(h)


@router.delete("/{inst_id}/holidays/{hol_id}", response_model=MessageResponse)
async def delete_holiday(
    inst_id: str, hol_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    res = await db.execute(
        select(Holiday).where(Holiday.id == hol_id, Holiday.institution_id == inst_id)
    )
    h = res.scalar_one_or_none()
    if not h: raise HTTPException(404, "Holiday not found")
    await db.delete(h); await db.commit()
    return MessageResponse(message="Holiday deleted")
