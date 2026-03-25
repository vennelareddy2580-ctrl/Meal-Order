from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import logging, time
import os

from src.database import init_db
from src.routers import auth, menu, orders, wallet, institutions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Meal Ordering Platform API",
    version="1.0.0",
    docs_url="/docs",
)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Timing Middleware
@app.middleware("http")
async def timing(request: Request, call_next):
    t = time.time()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{(time.time()-t)*1000:.1f}ms"
    return response

# ✅ Global Exception Handler
@app.exception_handler(Exception)
async def catch_all(request: Request, exc: Exception):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ✅ API Routers
app.include_router(auth.router,         prefix="/api")
app.include_router(menu.router,         prefix="/api")
app.include_router(orders.router,       prefix="/api")
app.include_router(wallet.router,       prefix="/api")
app.include_router(institutions.router, prefix="/api")

# ✅ Startup Event
@app.on_event("startup")
async def startup():
    logger.info("Starting up...")
    await init_db()
    logger.info("Database ready.")

# ✅ Health Check
@app.get("/health")
async def health():
    return {"status": "ok"}


# ===============================
# ✅ FRONTEND SERVING (IMPORTANT)
# ===============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)  # go one level up
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
# Serve static assets (JS, CSS)
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

# Serve React app for all non-API routes
@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"detail": "Frontend not built"})