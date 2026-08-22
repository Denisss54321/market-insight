"""Точка входа бэкенда Market Insight."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router, auth_router
from app.collector import Collector, build_source, seed_items
from app.config import settings
from app.db import init_db
from app.state import app_state

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s"
)
logger = logging.getLogger("market_insight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_items()
    collector = Collector(build_source())
    app_state.collector = collector
    task = asyncio.create_task(collector.run())
    logger.info("Коллектор запущен, источник: %s, регион: %s", settings.source, settings.region)
    try:
        yield
    finally:
        collector.stop()
        task.cancel()
        await collector.source.close()


app = FastAPI(title="Market Insight API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600
)

app.include_router(router)
app.include_router(auth_router)


@app.get("/")
def root() -> dict:
    return {"message": "Market Insight API", "status": "ok", "source": settings.source}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "source": settings.source}
