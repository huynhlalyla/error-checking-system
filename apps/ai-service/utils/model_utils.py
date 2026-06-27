import json
import os
import shutil
import torch
import torchvision.models as models
import torch.nn as nn


def load_model(models_dir: str) -> tuple[nn.Module | None, list[str]]:
    """Load model active hiện tại. Trả về (model, labels)."""
    active_dir = os.path.join(models_dir, "active")
    model_path = os.path.join(active_dir, "model.pth")
    labels_path = os.path.join(active_dir, "labels.json")

    if not os.path.exists(model_path) or not os.path.exists(labels_path):
        return None, []

    with open(labels_path, "r") as f:
        labels: list[str] = json.load(f)

    model = build_mobilenet(num_classes=len(labels))
    state = torch.load(model_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model, labels


def build_mobilenet(num_classes: int) -> nn.Module:
    """Tạo MobileNetV2 với classifier layer phù hợp số lớp."""
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def atomic_swap_model(staging_dir: str, active_dir: str) -> None:
    """Thay thế model active bằng model staging một cách an toàn."""
    backup_dir = active_dir + "_backup"

    # Tạo backup model active cũ
    if os.path.exists(active_dir):
        if os.path.exists(backup_dir):
            shutil.rmtree(backup_dir)
        shutil.copytree(active_dir, backup_dir)

    # Copy staging sang active
    if os.path.exists(active_dir):
        shutil.rmtree(active_dir)
    shutil.copytree(staging_dir, active_dir)

    # Xóa backup sau khi swap thành công
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)

    # Xóa staging
    shutil.rmtree(staging_dir)
