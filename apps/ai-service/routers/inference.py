from fastapi import APIRouter, UploadFile, File, Depends
from core.security import verify_internal_key
from services.inference_service import run_inference

router = APIRouter(prefix="/inference", tags=["inference"])


@router.post("")
async def inference(
    image: UploadFile = File(...),
    _: str = Depends(verify_internal_key),
):
    """
    Nhận ảnh, chạy MobileNetV2, trả về label và confidence.
    """
    image_bytes = await image.read()
    result = run_inference(image_bytes)
    return result
