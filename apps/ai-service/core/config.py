from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    INTERNAL_API_KEY: str = "internal_secret_key_change_this"
    BACKEND_CALLBACK_URL: str = "http://localhost:3000"
    MIN_ACCURACY: float = 0.80
    CONFIDENCE_THRESHOLD: float = 0.70
    # Ngưỡng entropy (0.0→1.0): khi model phân vân giữa các class
    # > ENTROPY_THRESHOLD → is_unknown=True (ảnh lạ hoặc model không chắc)
    # 0.85 = model phải tự tin hơn 70% về 1 class mới được tin
    ENTROPY_THRESHOLD: float = 0.85
    UPLOADS_DIR: str = "../../uploads"
    MODELS_DIR: str = "./models"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
