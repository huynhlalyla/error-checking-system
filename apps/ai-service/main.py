from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers import inference, training
from services.inference_service import reload_model
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model active vào bộ nhớ
    reload_model()
    yield
    # Shutdown: cleanup nếu cần


app = FastAPI(
    title="AOI Error Checking — AI Service",
    description="MobileNetV2-based defect detection and training API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(inference.router)
app.include_router(training.router)


@app.get("/health")
def health():
    return {"status": "ok"}
