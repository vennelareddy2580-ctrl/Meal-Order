from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from src.database import get_db
from src.models.models import MenuItem, Institution, User
from src.schemas.schemas import MenuItemCreate, MenuItemUpdate, MenuItemResponse, MessageResponse
from src.services.auth_utils import get_current_user, get_admin_user

router = APIRouter(prefix="/menu", tags=["Menu"])


@router.get("/", response_model=List[MenuItemResponse])
async def get_menu(
    institution_id: str = Query(...),
    date: str = Query(...),
    meal_time: Optional[str] = Query(None),
    dietary_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(MenuItem).where(
        MenuItem.institution_id == institution_id,
        MenuItem.available_date == date,
        MenuItem.is_available == True,
    )
    if meal_time:     q = q.where(MenuItem.meal_time == meal_time)
    if dietary_type:  q = q.where(MenuItem.dietary_type == dietary_type)
    q = q.order_by(MenuItem.meal_time, MenuItem.name)
    res = await db.execute(q)
    return [MenuItemResponse.model_validate(i) for i in res.scalars().all()]


@router.post("/", response_model=MenuItemResponse, status_code=201)
async def create_menu_item(
    req: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    res = await db.execute(select(Institution).where(Institution.id == req.institution_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Institution not found")
    item = MenuItem(**req.model_dump())
    db.add(item); await db.commit(); await db.refresh(item)
    return MenuItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: str, req: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    await db.commit(); await db.refresh(item)
    return MenuItemResponse.model_validate(item)


@router.delete("/{item_id}", response_model=MessageResponse)
async def delete_menu_item(
    item_id: str, db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    res = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = res.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item); await db.commit()
    return MessageResponse(message="Deleted")
