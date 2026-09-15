import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.router import api_router
from app.services.indexer import Web3Indexer
import asyncio

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

indexer = Web3Indexer(contract_address=settings.TICKET_NFT_ADDRESS)
indexer_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle background tasks like the Web3 indexer."""
    global indexer_task
    logger.info("Starting Web3 Indexer background task...")
    indexer_task = asyncio.create_task(indexer.start())
    yield
    logger.info("Stopping background tasks...")
    if indexer_task:
        indexer_task.cancel()
        try:
            await indexer_task
        except asyncio.CancelledError:
            logger.info("Indexer task cancelled successfully.")

app = FastAPI(
    title="NFT Ticketing API",
    version="1.0.0",
    description="Backend API for NFT Ticketing Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint for welcome message."""
    return {"message": "Welcome to the NFT Ticketing API"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
