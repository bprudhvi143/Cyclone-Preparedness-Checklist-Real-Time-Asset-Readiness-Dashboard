from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENV_MODE: str = "dev"

    # Database & Cache Connection Strings
    DATABASE_URL: str
    REDIS_URL: str

    # Security Configuration
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File System
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    @property
    def is_dev(self) -> bool:
        return self.ENV_MODE.lower() == "dev"

settings = Settings()
