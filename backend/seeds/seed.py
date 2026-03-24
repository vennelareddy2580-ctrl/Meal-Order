"""
Run: python -m seeds.seed
Safely re-runnable — skips already existing data.
"""
import asyncio, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from src.database import init_db, AsyncSessionLocal
from src.models.models import Institution, User, Wallet, MenuItem, Holiday, DietaryType, MealTime, UserRole

# ── Menu catalogue ────────────────────────────────────────────────────────────

TECHCORP_MENU = {
    MealTime.BREAKFAST: [
        ("Masala Dosa",       "Crispy dosa with spiced potato & fresh chutneys",      65.0, DietaryType.VEG),
        ("Idli Sambar",       "3 soft idlis with hot sambar & coconut chutney",        50.0, DietaryType.VEG),
        ("Poha",              "Flattened rice with onion, peas & coriander",           40.0, DietaryType.VEGAN),
        ("Upma",              "Rava upma with vegetables & curry leaves",              45.0, DietaryType.VEG),
        ("Aloo Paratha",      "Stuffed wheat flatbread with curd & pickle",            70.0, DietaryType.VEG),
        ("Bread Omelette",    "2-egg omelette with toasted bread",                     60.0, DietaryType.NON_VEG),
        ("Veg Sandwich",      "Grilled sandwich — cheese, tomato, cucumber",           55.0, DietaryType.VEG),
        ("Boiled Eggs (2)",   "Farm-fresh boiled eggs with pepper & salt",             35.0, DietaryType.NON_VEG),
        ("Cornflakes & Milk", "Kellogg's cornflakes with chilled milk",                40.0, DietaryType.VEG),
        ("Masala Chai",       "Freshly brewed ginger-cardamom tea",                    15.0, DietaryType.VEG),
    ],
    MealTime.LUNCH: [
        ("Rajma Chawal",          "Kidney bean curry with steamed basmati",            95.0, DietaryType.VEG),
        ("Chicken Biryani",       "Dum-cooked basmati with spiced chicken & raita",  130.0, DietaryType.NON_VEG),
        ("Paneer Butter Masala",  "Paneer in tomato-cream gravy with 2 naans",        110.0, DietaryType.VEG),
        ("Dal Tadka & Rice",      "Yellow dal tempered with ghee & jeera",             85.0, DietaryType.VEG),
        ("Fish Curry & Rice",     "Kerala-style coconut fish curry with rice",        120.0, DietaryType.NON_VEG),
        ("Chole Bhature",         "Punjabi chickpeas with 2 fluffy bhaturas",          90.0, DietaryType.VEG),
        ("Mutton Curry & Rice",   "Slow-cooked mutton in onion-tomato masala",        145.0, DietaryType.NON_VEG),
        ("Full Veg Thali",        "Roti, rice, dal, sabzi, papad & pickle",           100.0, DietaryType.VEG),
        ("Egg Fried Rice",        "Wok-tossed rice with eggs & vegetables",            80.0, DietaryType.NON_VEG),
        ("Jain Thali",            "No onion-garlic — roti, dal, sabzi, rice",          90.0, DietaryType.JAIN),
        ("Vegan Buddha Bowl",     "Quinoa, roasted veggies, hummus & greens",         105.0, DietaryType.VEGAN),
        ("Palak Paneer & Roti",   "Cottage cheese in spinach gravy with roti",        100.0, DietaryType.VEG),
    ],
    MealTime.SNACK: [
        ("Samosa (2 pcs)",    "Crispy potato-pea samosa with mint chutney",            25.0, DietaryType.VEG),
        ("Vada Pav",          "Mumbai street-style potato vada in bun",                30.0, DietaryType.VEG),
        ("Bread Pakoda",      "Battered bread fritters with chutney",                  30.0, DietaryType.VEG),
        ("Egg Roll",          "Paratha wrap with egg, veggies & sauces",               50.0, DietaryType.NON_VEG),
        ("Cold Coffee",       "Blended iced coffee with milk",                         45.0, DietaryType.VEG),
        ("Fresh Fruit Bowl",  "Mango, banana, apple, grapes — seasonal mix",           50.0, DietaryType.VEGAN),
        ("Bhel Puri",         "Puffed rice chaat with chutneys & onion",               35.0, DietaryType.VEGAN),
        ("Dhokla (4 pcs)",    "Soft steamed Gujarati dhokla with tempering",           40.0, DietaryType.VEG),
        ("Chicken Cutlet",    "Crispy minced chicken patty with dip",                  60.0, DietaryType.NON_VEG),
        ("Masala Chai",       "Hot spiced tea",                                         15.0, DietaryType.VEG),
        ("Peanut Chaat",      "Roasted peanuts with onion, lemon & spice",             25.0, DietaryType.VEGAN),
    ],
    MealTime.DINNER: [
        ("Butter Chicken & Naan",  "Tandoori chicken in silky tomato-butter sauce",   130.0, DietaryType.NON_VEG),
        ("Dal Makhani & Roti",     "Overnight slow-cooked black dal with butter",      95.0, DietaryType.VEG),
        ("Chicken Biryani",        "Evening special — biryani with salan & raita",    135.0, DietaryType.NON_VEG),
        ("Paneer Tikka Masala",    "Tandoor-grilled paneer in spiced masala",         115.0, DietaryType.VEG),
        ("Egg Curry & Rice",       "Home-style egg curry with steamed rice",           85.0, DietaryType.NON_VEG),
        ("Veg Pulao",              "Fragrant vegetable rice with raita",               80.0, DietaryType.VEG),
        ("Mutton Rogan Josh",      "Kashmiri mutton in bold whole-spice gravy",       150.0, DietaryType.NON_VEG),
        ("Palak Dal & Chapati",    "Spinach lentils with 3 soft chapatis",             85.0, DietaryType.VEGAN),
        ("Mixed Veg Curry & Rice", "Seasonal vegetables in onion-tomato base",         80.0, DietaryType.VEG),
        ("Khichdi & Kadhi",        "Comfort khichdi with besan kadhi & papad",         75.0, DietaryType.VEG),
        ("Fish Fry & Rice",        "Pan-fried spiced fish with rice & salad",         125.0, DietaryType.NON_VEG),
        ("Jain Dinner Thali",      "No onion-garlic dinner thali",                     95.0, DietaryType.JAIN),
    ],
}

SCHOOL_MENU = {
    MealTime.BREAKFAST: [
        ("Poha",           "Light flattened rice with vegetables",                     30.0, DietaryType.VEGAN),
        ("Idli Sambar",    "2 idlis with sambar & coconut chutney",                    35.0, DietaryType.VEG),
        ("Bread & Butter", "Whole wheat bread with butter & jam",                      25.0, DietaryType.VEG),
        ("Upma",           "Semolina upma with veggies",                               30.0, DietaryType.VEG),
    ],
    MealTime.LUNCH: [
        ("Veg Tiffin Box", "Roti, dal, sabzi, rice & pickle",                          55.0, DietaryType.VEG),
        ("Egg Tiffin Box", "Roti, egg curry, rice & salad",                            65.0, DietaryType.NON_VEG),
        ("Jain Tiffin Box","No onion-garlic — roti, dal, sabzi, rice",                 55.0, DietaryType.JAIN),
        ("Mini Thali",     "Small roti, dal, sabzi",                                   40.0, DietaryType.VEG),
    ],
    MealTime.SNACK: [
        ("Fruit Bowl",     "Seasonal fresh fruits",                                     30.0, DietaryType.VEGAN),
        ("Biscuits & Milk","Cream biscuits with warm milk",                             25.0, DietaryType.VEG),
        ("Samosa",         "1 piece samosa with chutney",                               15.0, DietaryType.VEG),
        ("Banana",         "Fresh banana",                                              10.0, DietaryType.VEGAN),
    ],
    MealTime.DINNER: [
        ("Khichdi",        "Simple rice-lentil khichdi with ghee",                     45.0, DietaryType.VEG),
        ("Roti & Dal",     "2 soft rotis with yellow dal",                              40.0, DietaryType.VEG),
        ("Veg Rice",       "Seasoned vegetable rice",                                   40.0, DietaryType.VEG),
    ],
}

# ── Helpers ───────────────────────────────────────────────────────────────────

async def upsert_institution(db, name, code, address):
    res = await db.execute(select(Institution).where(Institution.code == code))
    inst = res.scalar_one_or_none()
    if inst:
        print(f"  ↩  Institution exists: {name}")
        return inst
    inst = Institution(name=name, code=code, address=address)
    db.add(inst); await db.flush()
    print(f"  ✚  Created institution: {name}")
    return inst

async def upsert_user(db, phone, name, role, inst_id, balance):
    res = await db.execute(select(User).where(User.phone == phone))
    user = res.scalar_one_or_none()
    if user:
        print(f"  ↩  User exists: {phone}")
        return user
    user = User(phone=phone, name=name, role=role, institution_id=inst_id)
    db.add(user); await db.flush()
    wr = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    if not wr.scalar_one_or_none():
        db.add(Wallet(user_id=user.id, balance=balance))
        await db.flush()
    print(f"  ✚  Created user: {phone} ({name})")
    return user

async def seed_menu(db, inst_id, catalogue, date_str):
    added = 0
    for meal_time, items in catalogue.items():
        for name, desc, price, dietary in items:
            ex = await db.execute(
                select(MenuItem).where(
                    MenuItem.institution_id == inst_id,
                    MenuItem.name == name,
                    MenuItem.available_date == date_str,
                    MenuItem.meal_time == meal_time,
                )
            )
            if not ex.scalar_one_or_none():
                db.add(MenuItem(
                    institution_id=inst_id, name=name, description=desc,
                    price=price, dietary_type=dietary,
                    meal_time=meal_time, available_date=date_str,
                ))
                added += 1
    return added

# ── Main ──────────────────────────────────────────────────────────────────────

async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        print("\n🌱  Running seed...\n")

        inst1 = await upsert_institution(db, "Dcodexp Cafeteria",  "TECHCORP",   "Plot 42, HITEC City, Hyderabad")
        inst2 = await upsert_institution(db, "Greenfield School",   "GREENFIELD", "Road No. 5, Banjara Hills, Hyderabad")
        await db.flush()

        await upsert_user(db, "+919999999999", "Admin User",    UserRole.ADMIN, inst1.id, 5000.0)
        await upsert_user(db, "+919876543210", "Rahul Sharma",  UserRole.USER,  inst1.id,  500.0)
        await upsert_user(db, "+918765432109", "Priya Nair",    UserRole.USER,  inst2.id,  300.0)
        await db.flush()

        today = datetime.now(timezone.utc).date()
        total_new = 0
        print(f"\n  Seeding menu for 14 days ({today} onwards)...")
        for i in range(14):
            ds = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            total_new += await seed_menu(db, inst1.id, TECHCORP_MENU, ds)
            total_new += await seed_menu(db, inst2.id, SCHOOL_MENU,   ds)

        # Holiday 5 days from now
        hdate = (today + timedelta(days=5)).strftime("%Y-%m-%d")
        hres = await db.execute(
            select(Holiday).where(Holiday.institution_id == inst1.id, Holiday.date == hdate)
        )
        if not hres.scalar_one_or_none():
            db.add(Holiday(institution_id=inst1.id, date=hdate, name="Company Annual Day"))
            print(f"\n  ✚  Added holiday on {hdate}")

        await db.commit()

        print(f"""
{'='*50}
✅  Seed complete!  {total_new} new menu items added.
{'='*50}

📱  Test accounts (OTP shown on screen in dev mode):
    +919876543210  →  Rahul  (Rs.500 wallet)
    +918765432109  →  Priya  (Rs.300 wallet)
    +919999999999  →  Admin  (Rs.5000 wallet)

🍽️   Menu per day — TechCorp:
    Breakfast : {len(TECHCORP_MENU[MealTime.BREAKFAST])} items
    Lunch     : {len(TECHCORP_MENU[MealTime.LUNCH])} items
    Snack     : {len(TECHCORP_MENU[MealTime.SNACK])} items
    Dinner    : {len(TECHCORP_MENU[MealTime.DINNER])} items

📅  Dates: today ({today}) + 13 days ahead
🌐  API docs: http://localhost:8000/docs
""")

if __name__ == "__main__":
    asyncio.run(seed())
