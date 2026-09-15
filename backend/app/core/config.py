from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    PROJECT_NAME: str = "NFT Ticketing API"
    SIGNER_PRIVATE_KEY: str
    POLYGON_AMOY_RPC_URL: str
    TICKET_NFT_ADDRESS: str
    GROQ_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    MAX_PRICE_MULTIPLIER: float = 3.0
    SIGNATURE_EXPIRY_SECONDS: int = 900
    CHAIN_ID: int = 31337

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
