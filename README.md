# Meal Ordering Platform

A full-stack meal ordering system for corporate cafeterias and school canteens.

**Stack:** FastAPI (Python) · React (Vite) · SQLite · JWT Auth

---

## How to Run in VS Code

### Prerequisites
Make sure these are installed on your machine:
- **Python 3.10+** → https://python.org/downloads (check "Add to PATH")
- **Node.js 18+**  → https://nodejs.org (LTS version)
- **VS Code**       → https://code.visualstudio.com

---

### Step 1 — Open the project

Open VS Code → **File → Open Folder** → select the `meal-order` folder.

---

### Step 2 — Open the terminal

Press **Ctrl + `** (backtick) to open the integrated terminal.

---

### Step 3 — Set up the backend (run once)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m seeds.seed
```

You should see:
```
✅  Seed complete!  ...menu items added.
    +919876543210  →  Rahul  (Rs.500 wallet)
```

---

### Step 4 — Set up the frontend (run once)

Click the **+** button in the terminal panel to open a second terminal, then:

```bash
cd frontend
npm install
```

---

### Step 5 — Start the backend

In the **first terminal** (backend):

```bash
cd backend
venv\Scripts\activate
uvicorn src.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

---

### Step 6 — Start the frontend

In the **second terminal** (frontend):

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

---

### Step 7 — Open the app

Go to: **http://localhost:3000**

---

## Login

Enter any of these phone numbers, click **Send OTP**, then enter the 6-digit code shown in the yellow box on screen:

| Phone | Name | Wallet |
|-------|------|--------|
| `+919876543210` | Rahul Sharma | Rs.500 |
| `+918765432109` | Priya Nair   | Rs.300 |
| `+919999999999` | Admin User   | Rs.5000 |

Or enter **any new phone number** — a new account will be created automatically.

---

## Key URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Web app |
| http://localhost:8000/docs | Interactive API docs (Swagger UI) |
| http://localhost:8000/health | Health check |

---

## Features

- **OTP login** — no passwords, 6-digit OTP with 5-min expiry and 3-attempt lockout
- **Menu** — browse by institution, date, meal time; filter by dietary type
- **Cart** — add multiple items with multiple quantities; slide-out cart panel
- **Orders** — place, view, and cancel orders; full wallet refund on cancellation
- **Wallet** — recharge balance, complete transaction history with balance tracking

---

## Project Structure

```
meal-order/
├── backend/
│   ├── src/
│   │   ├── main.py          ← FastAPI app entry point
│   │   ├── database.py      ← SQLAlchemy async engine
│   │   ├── config.py        ← Environment settings
│   │   ├── models/          ← Database models
│   │   ├── schemas/         ← Pydantic request/response models
│   │   ├── routers/         ← API route handlers
│   │   └── services/        ← JWT auth utilities
│   ├── seeds/seed.py        ← Sample data seeder
│   ├── .env                 ← Environment variables
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           ← Login, Menu, Orders, Wallet
│   │   ├── components/      ← Layout / sidebar
│   │   ├── context/         ← Global auth + wallet state
│   │   └── services/api.js  ← Axios API calls
│   ├── index.html
│   └── package.json
└── .vscode/
    ├── tasks.json           ← Run tasks with Ctrl+Shift+P
    └── settings.json
```
