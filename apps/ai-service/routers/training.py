import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List
from core.security import verify_internal_key
from services.training_service import start_training, get_training_state, cancel_training

router = APIRouter(prefix="/train", tags=["training"])


class TrainRequest(BaseModel):
    model_id: str
    defect_type_ids: List[str]


@router.post("")
async def trigger_training(
    body: TrainRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_key),
):
    """
    Kích hoạt training pipeline bất đồng bộ.
    Model active KHÔNG bị gián đoạn trong quá trình training.
    """
    background_tasks.add_task(start_training, body.model_id, body.defect_type_ids)
    return {"message": "Training started in background", "model_id": body.model_id}

@router.get("/progress")
async def get_progress():
    return get_training_state()

@router.post("/cancel")
async def abort_training(_: str = Depends(verify_internal_key)):
    success = cancel_training()
    if success:
        return {"message": "Training cancellation requested"}
    return {"message": "No active training found"}
