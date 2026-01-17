import os
from pathlib import Path
from functools import lru_cache
from typing import List, Literal, Dict, ClassVar

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError, TypeAdapter, field_validator, AnyHttpUrl


class AppSettings(BaseSettings):
    """Application settings."""
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application settings
    BACKEND_PROJECT_NAME: str = "Claire API"
    BACKEND_API_V1_STR: str = "/api/v1"
    BACKEND_API_VERSION: str = "0.1.0"
    BACKEND_API_ENVIRONMENT: Literal["development", "production"] = "development"
    BACKEND_API_DESCRIPTION: str = "Claire API"

    # OpenAI settings
    OPENAI_API_KEY: str

    # Database settings
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # Minio settings
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_SECRET_KEY: str
    MINIO_ACCESS_KEY: str
    MINIO_BUCKET_NAME: str

    # Logging
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = 'INFO'

@lru_cache
def get_settings() -> AppSettings:
    """Load settings once and cache globally."""
    return AppSettings()

# Global singleton-style instance
settings = get_settings()

if __name__ == "__main__":
    print(settings)