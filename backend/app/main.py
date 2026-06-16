import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pythonjsonlogger import jsonlogger

from app.api.attacks import router as attacks_router
from app.api.nodes_analytics import nodes_router, analytics_router
from app.api.sessions import router as sessions_router
from app.api.profiles import router as profiles_router
from app.api.campaigns import router as campaigns_router
from app.api.threat_reports_api import router as threat_reports_router
from app.api.mitre_api import router as mitre_router
from app.api.iocs import router as iocs_router
from app.api.predictions import router as predictions_router
from app.api.mitigations import router as mitigations_router
from app.api.deception import router as deception_router
from app.api.session_analysis import router as session_analysis_router

from app.ingestion.event_processor import ingest_redis_events
from app.services.background_worker import run_background_worker

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s')
logHandler.setFormatter(formatter)
logging.basicConfig(level=logging.INFO, handlers=[logHandler], force=True)

logger = logging.getLogger("llmpot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up LLMPot Backend v2...")
    redis_task = asyncio.create_task(ingest_redis_events())
    worker_task = asyncio.create_task(run_background_worker())
    yield
    logger.info("Shutting down LLMPot Backend v2...")
    redis_task.cancel()
    worker_task.cancel()
    for t in [redis_task, worker_task]:
        try:
            await t
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="LLMPot API v2",
    description="Autonomous AI Cyber Threat Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# V1 routes (preserved)
app.include_router(attacks_router)
app.include_router(nodes_router)
app.include_router(analytics_router)
app.include_router(sessions_router)

# V2 threat intelligence routes
app.include_router(profiles_router)
app.include_router(campaigns_router)
app.include_router(threat_reports_router)
app.include_router(mitre_router)
app.include_router(iocs_router)
app.include_router(predictions_router)
app.include_router(mitigations_router)
app.include_router(deception_router)
app.include_router(session_analysis_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
