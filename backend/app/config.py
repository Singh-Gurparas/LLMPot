import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "LLMPot Integration Hub"
    DEBUG: bool = True
    
    # Storage
    DATABASE_URL: str = "postgresql+asyncpg://llmpot_admin:llmpot_secret@postgres:5432/llmpot_db"
    REDIS_URL: str = "redis://redis:6379"
    
    # Intelligence
    LLM_PROVIDER: str = "groq"  # Defaulting to Groq
    GROQ_API_KEY: Optional[str] = None
    
    # GeoIP
    GEOIP_DB_PATH: str = "/tmp/GeoLite2-City.mmdb"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
