import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pythonjsonlogger import jsonlogger

from app.api.attacks import router as attacks_router
from app.api.nodes_analytics import nodes_router, analytics_router
from app.api.sessions import router as sessions_router
from app.ingestion.event_processor import ingest_redis_events

# Structured JSON Logging
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s')
logHandler.setFormatter(formatter)
logging.basicConfig(level=logging.INFO, handlers=[logHandler], force=True)

logger = logging.getLogger("llmpot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup background tasks, like the Redis consumer
    logger.info("Starting up LLMPot Backend...")
    redis_task = asyncio.create_task(ingest_redis_events())
    yield
    # Shutdown
    logger.info("Shutting down HoneyGrid Backend...")
    redis_task.cancel()
    try:
        await redis_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="HoneyGrid API",
    description="AI-Powered Distributed Honeypot Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for the frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, specify the exact domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attacks_router)
app.include_router(nodes_router)
app.include_router(analytics_router)
app.include_router(sessions_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
