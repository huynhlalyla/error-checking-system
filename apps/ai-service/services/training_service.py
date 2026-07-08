import os
import json
import glob
import asyncio
import logging
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split, Dataset
from torchvision import transforms
import httpx

from core.config import get_settings
from utils.model_utils import build_mobilenet, atomic_swap_model
from services.inference_service import reload_model

logger = logging.getLogger(__name__)

# Trạng thái training (tránh chạy nhiều job cùng lúc)
_training_lock = asyncio.Lock()
_is_training = False
_training_state = {
    "is_training": False,
    "model_id": None,
    "progress": 0,
    "message": "",
    "skipped_classes": [],
}
_cancel_requested = False

# Số ảnh tối thiểu mỗi class để được đưa vào training
MIN_SAMPLES_PER_CLASS = 5


class ApiDataset(Dataset):
    def __init__(self, samples, classes, root_dir, transform=None):
        self.samples = samples
        self.classes = classes
        self.root_dir = root_dir
        self.transform = transform
        self.class_to_idx = {cls: idx for idx, cls in enumerate(classes)}
        
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        item = self.samples[idx]
        
        # Xử lý đường dẫn file
        file_path = item["filePath"]
        if file_path.startswith("uploads/"):
            file_path = file_path[len("uploads/"):]
        elif file_path.startswith("uploads\\"):
            file_path = file_path[len("uploads\\"):]
            
        img_path = os.path.join(self.root_dir, file_path)
        
        if not os.path.exists(img_path):
            img = Image.new('RGB', (224, 224), color='black')
        else:
            try:
                img = Image.open(img_path).convert("RGB")
            except Exception:
                img = Image.new('RGB', (224, 224), color='black')
                
        if self.transform:
            img = self.transform(img)
            
        label_idx = self.class_to_idx.get(item["label"], 0)
        return img, label_idx


async def start_training(model_id: str, sample_ids: list[str]):
    """
    Pipeline huấn luyện MobileNetV2 bất đồng bộ.
    """
    global _is_training, _training_state, _cancel_requested
    settings = get_settings()
    async with _training_lock:
        if _is_training:
            logger.warning("Training already in progress, skipping.")
            return
        _is_training = True
        _training_state = {
            "is_training": True,
            "model_id": model_id,
            "progress": 0,
            "message": "Đang chuẩn bị dữ liệu (Khởi tạo)"
        }
        _cancel_requested = False

    try:
        logger.info(f"Starting training for model_id={model_id}")
        staging_dir = os.path.join(settings.MODELS_DIR, "staging")
        active_dir = os.path.join(settings.MODELS_DIR, "active")
        os.makedirs(staging_dir, exist_ok=True)

        data_dir = settings.UPLOADS_DIR
        
        _training_state["message"] = "Đang tải dữ liệu từ server..."
        
        # Fetch dataset từ backend API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.BACKEND_CALLBACK_URL}/api/ai-model/dataset",
                headers={"x-internal-key": settings.INTERNAL_API_KEY},
                timeout=30.0
            )
            dataset_data = response.json()
            
        classes = dataset_data.get("classes", [])
        samples = dataset_data.get("samples", [])
        
        if not classes or not samples:
            logger.error("No valid dataset found from backend API")
            await _notify_backend_failed(model_id, "Không tìm thấy dữ liệu huấn luyện (API rỗng).")
            return

        # --- Lọc class quá ít ảnh ---
        from collections import Counter
        sample_counts = Counter(s["label"] for s in samples)
        skipped_classes = [cls for cls in classes if sample_counts.get(cls, 0) < MIN_SAMPLES_PER_CLASS]
        valid_classes = [cls for cls in classes if sample_counts.get(cls, 0) >= MIN_SAMPLES_PER_CLASS]

        if skipped_classes:
            for cls in skipped_classes:
                logger.warning(
                    f"Class '{cls}' bị bỏ qua: chỉ có {sample_counts.get(cls, 0)} ảnh "
                    f"(cần tối thiểu {MIN_SAMPLES_PER_CLASS})."
                )
            _training_state["skipped_classes"] = [
                {"label": cls, "count": sample_counts.get(cls, 0)} for cls in skipped_classes
            ]
            _training_state["message"] = (
                f"Bỏ qua {len(skipped_classes)} class ít ảnh: "
                + ", ".join(f"{cls} ({sample_counts[cls]} ảnh)" for cls in skipped_classes)
            )
        else:
            _training_state["skipped_classes"] = []

        # Lọc samples chỉ giữ valid classes
        samples = [s for s in samples if s["label"] in valid_classes]
        classes = valid_classes

        if len(classes) < 2:
            reason = (
                f"Không đủ class hợp lệ để huấn luyện. "
                f"Cần ít nhất 2 class, mỗi class tối thiểu {MIN_SAMPLES_PER_CLASS} ảnh. "
                f"Class bị loại: {', '.join(skipped_classes)}."
            )
            logger.error(reason)
            await _notify_backend_failed(model_id, reason)
            return

        transform_train = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        transform_val = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        _training_state["message"] = "Đang chuẩn bị DataLoader..."
        
        full_dataset = ApiDataset(samples, classes, data_dir, transform=transform_train)
        labels = classes
        num_classes = len(labels)
        logger.info(
            f"Classes sau khi lọc: {labels}, Samples: {len(samples)}"
            + (f" | Đã bỏ qua: {skipped_classes}" if skipped_classes else "")
        )

        # Split 80/20
        val_size = max(1, int(0.2 * len(full_dataset)))
        train_size = len(full_dataset) - val_size
        train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

        # Cập nhật transform cho val set
        val_ds.dataset.transform = transform_val

        train_loader = DataLoader(train_ds, batch_size=16, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=16, shuffle=False, num_workers=0)

        # Build MobileNetV2
        model = build_mobilenet(num_classes=num_classes)

        # Giai đoạn 1: Freeze backbone, chỉ train classifier
        for param in model.features.parameters():
            param.requires_grad = False

        optimizer = optim.Adam(model.classifier.parameters(), lr=1e-3)
        criterion = nn.CrossEntropyLoss()

        logger.info("Phase 1: Training classifier only...")
        _training_state["message"] = "Đang huấn luyện (Giai đoạn 1)"
        val_acc = await _train_epochs(model, train_loader, val_loader, criterion, optimizer, epochs=5, start_prog=10, max_prog=50, phase_name="Phase 1")

        if val_acc == -1.0:
            logger.info("Training cancelled by user in Phase 1.")
            await _notify_backend_failed(model_id, "Huấn luyện đã bị huỷ bởi người dùng.")
            return

        # Giai đoạn 2: Nếu accuracy chưa đủ, fine-tune toàn bộ
        if val_acc < settings.MIN_ACCURACY:
            logger.info(f"Phase 1 val_acc={val_acc:.3f} < {settings.MIN_ACCURACY}, starting Phase 2 fine-tune...")
            _training_state["message"] = "Đang tinh chỉnh model (Giai đoạn 2)"
            for param in model.parameters():
                param.requires_grad = True
            optimizer = optim.Adam(model.parameters(), lr=1e-4)
            val_acc = await _train_epochs(model, train_loader, val_loader, criterion, optimizer, epochs=10, start_prog=50, max_prog=95, phase_name="Phase 2")
            
            if val_acc == -1.0:
                logger.info("Training cancelled by user in Phase 2.")
                await _notify_backend_failed(model_id, "Huấn luyện đã bị huỷ bởi người dùng.")
                return

        logger.info(f"Training complete. val_acc={val_acc:.4f}")

        _training_state["progress"] = 98
        _training_state["message"] = "Đang lưu mô hình..."

        if val_acc < settings.MIN_ACCURACY:
            logger.warning(f"Accuracy {val_acc:.3f} below minimum {settings.MIN_ACCURACY}. Keeping old model.")
            await _notify_backend_failed(model_id, f"Huấn luyện xong nhưng độ chính xác ({val_acc*100:.1f}%) chưa đạt chuẩn tối thiểu.")
            return

        # Lưu model và labels vào staging
        torch.save(model.state_dict(), os.path.join(staging_dir, "model.pth"))
        with open(os.path.join(staging_dir, "labels.json"), "w") as f:
            json.dump(labels, f, ensure_ascii=False)

        # Atomic swap staging → active
        atomic_swap_model(staging_dir, active_dir)
        logger.info("Model swapped to active successfully.")

        # Reload model trong inference service
        reload_model()

        # Gửi callback về backend
        trained_on = len(full_dataset)
        await _notify_backend(model_id, float(val_acc), trained_on)

    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        await _notify_backend_failed(model_id, f"Lỗi nội bộ: {str(e)}")
    finally:
        _is_training = False
        _training_state["is_training"] = False
        _training_state["progress"] = 100
        _training_state["message"] = "Hoàn tất."


async def _train_epochs(model, train_loader, val_loader, criterion, optimizer, epochs: int, start_prog: int, max_prog: int, phase_name: str) -> float:
    """Chạy training loop, cập nhật progress."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _sync_train,
        model, train_loader, val_loader, criterion, optimizer, epochs, start_prog, max_prog, phase_name
    )


def _sync_train(model, train_loader, val_loader, criterion, optimizer, epochs: int, start_prog: int, max_prog: int, phase_name: str) -> float:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    val_acc = 0.0
    global _training_state, _cancel_requested

    for epoch in range(epochs):
        if _cancel_requested:
            return -1.0
            
        _training_state["message"] = f"{phase_name} - Đang huấn luyện Epoch {epoch+1}/{epochs}..."
        
        model.train()
        for inputs, labels in train_loader:
            if _cancel_requested:
                return -1.0
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        # Validation
        if _cancel_requested:
            return -1.0
            
        _training_state["message"] = f"{phase_name} - Đang xác thực Epoch {epoch+1}/{epochs}..."
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = outputs.max(1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)

        val_acc = correct / total if total > 0 else 0.0
        logger.info(f"Epoch {epoch + 1}/{epochs} — val_acc: {val_acc:.4f}")
        
        progress = start_prog + int((epoch + 1) / epochs * (max_prog - start_prog))
        _training_state["progress"] = progress

    return val_acc


async def _notify_backend(model_id: str, accuracy: float, trained_on: int):
    settings = get_settings()
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.BACKEND_CALLBACK_URL}/api/ai-model/training-complete",
                json={"modelId": model_id, "accuracy": accuracy, "trainedOn": trained_on},
                headers={"x-internal-key": settings.INTERNAL_API_KEY},
                timeout=10.0,
            )
        logger.info(f"Notified backend: model {model_id} activated with accuracy {accuracy:.4f}")
    except Exception as e:
        logger.error(f"Failed to notify backend: {e}")


async def _notify_backend_failed(model_id: str, reason: str):
    settings = get_settings()
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.BACKEND_CALLBACK_URL}/api/ai-model/training-failed",
                json={"modelId": model_id, "reason": reason},
                headers={"x-internal-key": settings.INTERNAL_API_KEY},
                timeout=10.0,
            )
        logger.info(f"Notified backend: model {model_id} failed. Reason: {reason}")
    except Exception as e:
        logger.error(f"Failed to notify backend of failure: {e}")

def get_training_state():
    return _training_state

def cancel_training():
    global _cancel_requested, _is_training
    if _is_training:
        _cancel_requested = True
        return True
    return False
