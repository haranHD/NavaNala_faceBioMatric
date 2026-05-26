"""OpenCV YuNet + SFace face detection/recognition (no dlib/face_recognition package)."""

import os
import urllib.request
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BACKEND_DIR, "cv_models")

DETECTOR_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
RECOGNIZER_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

MODEL_URLS = {
    DETECTOR_PATH: (
        "https://github.com/opencv/opencv_zoo/raw/main/models/"
        "face_detection_yunet/face_detection_yunet_2023mar.onnx"
    ),
    RECOGNIZER_PATH: (
        "https://github.com/opencv/opencv_zoo/raw/main/models/"
        "face_recognition_sface/face_recognition_sface_2021dec.onnx"
    ),
}

# OpenCV FR_COSINE returns similarity in [0, 1]; higher = same person (zoo default ~0.363)
MATCH_SIMILARITY_THRESHOLD = 0.40
# Best match must beat second-best by this margin to avoid wrong employee
MATCH_MARGIN = 0.08

_detector = None
_recognizer = None


def _ensure_models() -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)
    for path, url in MODEL_URLS.items():
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            continue
        print(f"Downloading {os.path.basename(path)} ...")
        urllib.request.urlretrieve(url, path)


def _init_models():
    global _detector, _recognizer
    if _recognizer is not None:
        return _detector, _recognizer

    _ensure_models()
    _detector = cv2.FaceDetectorYN.create(DETECTOR_PATH, "", (320, 320))
    _detector.setScoreThreshold(0.45)
    _detector.setNMSThreshold(0.3)
    _detector.setTopK(5000)

    _recognizer = cv2.FaceRecognizerSF.create(RECOGNIZER_PATH, "")
    return _detector, _recognizer


def normalize_encoding(encoding: np.ndarray) -> np.ndarray:
    """L2-normalize so cosine match works (required after averaging samples)."""
    feat = np.array(encoding, dtype=np.float32).reshape(1, -1)
    norm = np.linalg.norm(feat)
    if norm < 1e-6:
        return feat.flatten().astype(np.float64)
    feat = feat / norm
    return feat.flatten().astype(np.float64)


def resize_for_detection(img: np.ndarray, max_dim: int = 960) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)))


def _largest_face(faces: np.ndarray) -> np.ndarray:
    return max(faces, key=lambda f: float(f[2]) * float(f[3]))


def extract_face_encoding_from_bgr(img: np.ndarray) -> Optional[np.ndarray]:
    if img is None:
        return None

    img = resize_for_detection(img)
    detector, recognizer = _init_models()
    h, w = img.shape[:2]
    detector.setInputSize((w, h))

    _, faces = detector.detect(img)
    if faces is None or len(faces) == 0:
        return None

    face = _largest_face(faces)
    aligned = recognizer.alignCrop(img, face)
    feature = recognizer.feature(aligned)
    return normalize_encoding(feature.flatten())


def cosine_similarity(
    recognizer: cv2.FaceRecognizerSF,
    query_encoding: np.ndarray,
    known_encoding: np.ndarray,
) -> float:
    query_feat = normalize_encoding(query_encoding).reshape(1, -1).astype(np.float32)
    known_feat = normalize_encoding(known_encoding).reshape(1, -1).astype(np.float32)
    return float(
        recognizer.match(
            query_feat,
            known_feat,
            cv2.FaceRecognizerSF_FR_COSINE,
        )
    )


def find_best_match(
    known_encodings: List,
    known_ids: List[int],
    query_encoding: np.ndarray,
) -> Tuple[Optional[int], float, Optional[int]]:
    """
    Return (best_employee_id, best_similarity, second_best_employee_id).
    Picks the employee with highest similarity; requires margin over runner-up.
    """
    if not known_encodings:
        return None, 0.0, None

    _, recognizer = _init_models()

    # Best similarity per employee (supports multiple templates later)
    per_employee: Dict[int, float] = {}
    for enc, emp_id in zip(known_encodings, known_ids):
        score = cosine_similarity(recognizer, query_encoding, enc)
        per_employee[emp_id] = max(per_employee.get(emp_id, 0.0), score)

    ranked = sorted(per_employee.items(), key=lambda x: x[1], reverse=True)
    best_id, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0.0
    second_id = ranked[1][0] if len(ranked) > 1 else None

    if best_score < MATCH_SIMILARITY_THRESHOLD:
        return None, best_score, second_id

    if len(ranked) > 1 and (best_score - second_score) < MATCH_MARGIN:
        return None, best_score, second_id

    return best_id, best_score, second_id
