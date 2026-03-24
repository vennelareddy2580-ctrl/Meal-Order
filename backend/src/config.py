from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./meal_ordering.db"
    JWT_SECRET: str = "meal-order-secret-key-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    ACCOUNT_LOCK_MINUTES: int = 15
    DEBUG: bool = True
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
