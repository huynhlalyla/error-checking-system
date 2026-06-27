import torch
import torch.nn.functional as F
import math
from threading import Lock
from utils.image_utils import preprocess_image
from utils.model_utils import load_model
from core.config import get_settings

_model = None
_labels: list[str] = []
_lock = Lock()


def reload_model():
    """Reload model active vào bộ nhớ (được gọi sau khi swap model)."""
    global _model, _labels
    settings = get_settings()
    with _lock:
        _model, _labels = load_model(settings.MODELS_DIR)


def run_inference(image_bytes: bytes, threshold: float = None) -> dict:
    """
    Chạy inference MobileNetV2 trên ảnh.
    Trả về: { label, confidence, is_unknown, entropy }

    Dùng kết hợp 2 tiêu chí:
    1. max_confidence < threshold → không đủ tự tin về nhãn
    2. normalized_entropy > entropy_threshold → model phân vân giữa các class
       (xảy ra khi ảnh không thuộc training distribution)
    """
    global _model, _labels
    settings = get_settings()
    if threshold is None:
        threshold = settings.CONFIDENCE_THRESHOLD

    if _model is None or not _labels:
        return {"label": None, "confidence": 0.0, "is_unknown": True, "message": "No model loaded"}

    tensor = preprocess_image(image_bytes)
    with _lock:
        with torch.no_grad():
            logits = _model(tensor)
            # Temperature scaling (giả định T=1.0 nếu không có calibrate riêng)
            temp = 1.0
            probs = F.softmax(logits / temp, dim=1)

    confidence, pred_idx = probs.max(dim=1)
    confidence = float(confidence.item())
    label = _labels[pred_idx.item()]

    # --- Entropy-based uncertainty detection ---
    # Với model ít class (vd: 2 class GIAY/NHUA), softmax luôn ép
    # tổng xác suất = 1 nên max_confidence luôn cao dù ảnh lạ.
    # Normalized Shannon Entropy phát hiện khi model "phân vân":
    # - entropy ≈ 0 → model rất tự tin → TIN
    # - entropy ≈ 1 → phân phối gần đều → KHÔNG XÁC ĐỊNH
    n_classes = len(_labels)
    if n_classes > 1:
        entropy = -sum(
            float(p) * math.log(float(p) + 1e-9)
            for p in probs[0].tolist()
        ) / math.log(n_classes)
    else:
        entropy = 0.0

    # entropy_threshold: với 2 class thì 0.80 tương đương ~60/40 split
    # (không đủ tự tin để kết luận)
    entropy_threshold = settings.ENTROPY_THRESHOLD

    is_unknown = confidence < threshold or entropy > entropy_threshold

    return {
        "label": label if not is_unknown else None,
        "confidence": confidence,
        "is_unknown": is_unknown,
        "entropy": round(entropy, 4),
    }
