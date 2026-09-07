import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router
from app.api.entries import router as entries_router
from app.api.predictions import router as predictions_router
from app.api.push import router as push_router
from app.database.db import Base, engine
from app.services.push import reminder_tick
from app import models  # noqa: F401  (registers models with Base)

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)


async def _reminder_loop():
    while True:
        try:
            reminder_tick()
        except Exception:  # never let the loop die
            logging.getLogger("lifegpt.push").exception("reminder tick failed")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_reminder_loop())
    yield
    task.cancel()


app = FastAPI(title="LifeGPT API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    # Also allow the frontend served over the home network (phone access).
    allow_origin_regex=r"^http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries_router)
app.include_router(analytics_router)
app.include_router(predictions_router)
app.include_router(ai_router)
app.include_router(push_router)


@app.get("/health")
def health():
    return {"status": "ok"}
