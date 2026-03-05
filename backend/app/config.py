import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "UnHarmd Integration Hub"
    DEBUG: bool = True
    
    # Storage
    DATABASE_URL: str = "postgresql+asyncpg://unharmd_admin:unharmd_secret@postgres:5432/unharmd_db"
    REDIS_URL: str = "redis://redis:6379"
    
    # Intelligence
    LLM_PROVIDER: str = "groq"  # Defaulting to Groq
    GROQ_API_KEY: Optional[str] = None
    
    # GeoIP
    GEOIP_DB_PATH: str = "/tmp/GeoLite2-City.mmdb"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
