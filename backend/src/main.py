from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging, time

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def timing(request: Request, call_next):
    t = time.time()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{(time.time()-t)*1000:.1f}ms"
    return response

@app.exception_handler(Exception)
async def catch_all(request: Request, exc: Exception):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.include_router(auth.router,         prefix="/api")
app.include_router(menu.router,         prefix="/api")
app.include_router(orders.router,       prefix="/api")
app.include_router(wallet.router,       prefix="/api")
app.include_router(institutions.router, prefix="/api")

@app.on_event("startup")
async def startup():
    logger.info("Starting up...")
    await init_db()
    logger.info("Database ready.")

@app.get("/health")
async def health(): return {"status": "ok"}
