from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.entries import router as entries_router
from app.api.predictions import router as predictions_router
from app.database.db import Base, engine
from app import models  # noqa: F401  (registers models with Base)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LifeGPT API")

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


@app.get("/health")
def health():
    return {"status": "ok"}
