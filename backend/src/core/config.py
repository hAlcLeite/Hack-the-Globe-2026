"""
config.py — Application settings loaded from environment variables.
Uses pydantic-settings for validation and .env file support.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "CanopyOS API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # NASA FIRMS
    NASA_FIRMS_API_KEY: str = "dummy_key"

    # AWS / DynamoDB
    AWS_ACCESS_KEY_ID: str = "dummy"
    AWS_SECRET_ACCESS_KEY: str = "dummy"
    AWS_SESSION_TOKEN: str | None = None
    AWS_REGION: str = "ca-central-1"
    DYNAMODB_TABLE_NAME: str = "canopy-os-events"

    # Data source toggle — set to True once real integrations are wired up
    USE_DUMMY_DATA: bool = True


settings = Settings()
