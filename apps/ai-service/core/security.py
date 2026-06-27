from fastapi import HTTPException, Header, Depends
from core.config import get_settings


def verify_internal_key(x_internal_key: str = Header(...)):
    settings = get_settings()
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid internal API key")
    return x_internal_key
