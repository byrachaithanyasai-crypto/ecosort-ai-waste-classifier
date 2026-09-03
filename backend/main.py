from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pathlib import Path
from PIL import Image

import uuid
import time
import numpy as np
import tensorflow as tf

from database import (
    init_db,
    save_prediction,
    get_history,
    get_prediction,
    save_feedback,
    get_stats,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Smart Waste Classifier API",
    version="1.0.0",
    description=(
        "AI-powered waste classification system for "
        "recyclable, organic and hazardous waste."
    ),
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "backend" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = BASE_DIR / "waste_model.keras"

MODEL_VERSION = "MobileNetV2-v1"


# ============================================================
# DATABASE
# ============================================================

init_db()


# ============================================================
# LOAD MODEL
# ============================================================

print("Loading Smart Waste Classifier model...")

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}"
    )

model = tf.keras.models.load_model(MODEL_PATH)

print("AI model loaded successfully.")
print("Model:", MODEL_PATH)


# ============================================================
# MODEL CLASSES
# IMPORTANT:
# Must match training order.
# ============================================================

MODEL_CLASSES = [
    "Metal",
    "Paper",
    "Plastic",
    "battery",
    "glass",
    "organic",
]


# ============================================================
# USER-FACING BROAD CATEGORIES
# ============================================================

CATEGORY_MAP = {
    "Metal": "Recyclable",
    "Paper": "Recyclable",
    "Plastic": "Recyclable",
    "glass": "Recyclable",
    "battery": "Hazardous",
    "organic": "Organic",
}


# ============================================================
# DISPOSAL GUIDANCE
# ============================================================

DISPOSAL_GUIDANCE = {
    "Metal": {
        "what_to_do": (
            "Clean the metal item and place it "
            "in the appropriate recycling stream."
        ),
        "do": [
            "Keep recyclable metal clean.",
            "Separate metal from mixed waste.",
        ],
        "dont": [
            "Do not mix with organic waste.",
            "Do not burn metal waste.",
        ],
    },

    "Paper": {
        "what_to_do": (
            "Keep paper dry and place it "
            "in the paper recycling stream."
        ),
        "do": [
            "Keep paper dry.",
            "Separate paper from food waste.",
        ],
        "dont": [
            "Do not contaminate recyclable paper.",
            "Do not mix heavily soiled paper with clean paper."
        ],
    },

    "Plastic": {
        "what_to_do": (
            "Clean the plastic item and place it "
            "in the appropriate recyclable waste stream."
        ),
        "do": [
            "Empty and clean containers where possible.",
            "Separate plastic from organic waste.",
        ],
        "dont": [
            "Do not burn plastic.",
            "Do not mix recyclable plastic with hazardous waste.",
        ],
    },

    "glass": {
        "what_to_do": (
            "Handle glass carefully and use the "
            "appropriate local glass recycling stream."
        ),
        "do": [
            "Handle broken glass carefully.",
            "Use a designated glass recycling stream where available.",
        ],
        "dont": [
            "Do not handle broken glass with bare hands.",
            "Do not mix broken glass with organic waste.",
        ],
    },

    "battery": {
        "what_to_do": (
            "Do not place batteries in regular household waste. "
            "Use an authorized battery or e-waste collection point."
        ),
        "do": [
            "Store damaged batteries safely.",
            "Use an authorized collection point.",
        ],
        "dont": [
            "Do not burn batteries.",
            "Do not place batteries in regular waste bins.",
        ],
    },

    "organic": {
        "what_to_do": (
            "Place organic waste in the compost "
            "or organic waste collection stream."
        ),
        "do": [
            "Separate food and plant waste.",
            "Use composting where available.",
        ],
        "dont": [
            "Do not mix batteries or chemicals with organic waste.",
            "Do not contaminate compost with plastic.",
        ],
    },
}


# ============================================================
# HEALTH
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Smart Waste Classifier Backend is running",
        "version": "1.0.0",
        "model_loaded": True,
        "model_version": MODEL_VERSION,
        "categories": [
            "Recyclable",
            "Organic",
            "Hazardous",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_version": MODEL_VERSION,
        "api_version": "1.0.0",
    }


# ============================================================
# CATEGORIES
# ============================================================

@app.get("/categories")
def categories():
    return {
        "categories": [
            {
                "name": "Recyclable",
                "items": [
                    "Paper",
                    "Plastic",
                    "Metal",
                    "Glass",
                ],
            },
            {
                "name": "Organic",
                "items": [
                    "Organic waste",
                ],
            },
            {
                "name": "Hazardous",
                "items": [
                    "Battery",
                ],
            },
        ]
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/model-info")
def model_info():
    return {
        "model": "MobileNetV2",
        "model_version": MODEL_VERSION,
        "input_size": "224x224",
        "classes": MODEL_CLASSES,
        "user_categories": [
            "Recyclable",
            "Organic",
            "Hazardous",
        ],
    }


# ============================================================
# UPLOAD
# ============================================================

@app.post("/upload")
async def upload_waste(
    file: UploadFile = File(...)
):

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Missing file type.",
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are supported.",
        )

    contents = await file.read()

    # 5 MB limit
    max_size = 5 * 1024 * 1024

    if len(contents) > max_size:
        raise HTTPException(
            status_code=413,
            detail="Image size must be less than 5 MB.",
        )

    file_id = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / file_id

    file_path.write_bytes(contents)

    try:
        image = Image.open(file_path)
        image.verify()

    except Exception:
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image.",
        )

    return {
        "message": "Image uploaded successfully",
        "filename": file.filename,
        "saved_as": file_id,
        "status": "ready_for_classification",
    }


# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict_waste(
    file: UploadFile = File(...)
):

    start_time = time.perf_counter()

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are supported.",
        )

    # --------------------------------------------------------
    # Read file
    # --------------------------------------------------------

    contents = await file.read()

    max_size = 5 * 1024 * 1024

    if len(contents) > max_size:
        raise HTTPException(
            status_code=413,
            detail="Image size must be less than 5 MB.",
        )

    file_id = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / file_id

    file_path.write_bytes(contents)

    # --------------------------------------------------------
    # Open image
    # --------------------------------------------------------

    try:
        image = Image.open(file_path).convert("RGB")

    except Exception:
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image.",
        )

    # --------------------------------------------------------
    # Resize
    # --------------------------------------------------------

    image = image.resize((224, 224))

    # --------------------------------------------------------
    # NumPy conversion
    # --------------------------------------------------------

    image_array = np.array(
        image,
        dtype=np.float32,
    )

    image_array = np.expand_dims(
        image_array,
        axis=0,
    )

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    predictions = model.predict(
        image_array,
        verbose=0,
    )[0]

    # --------------------------------------------------------
    # Top 3 predictions
    # --------------------------------------------------------

    top_indices = np.argsort(
        predictions
    )[::-1][:3]

    top_predictions = []

    for index in top_indices:

        class_name = MODEL_CLASSES[
            int(index)
        ]

        confidence = float(
            predictions[int(index)]
        )

        user_category = CATEGORY_MAP.get(
            class_name,
            "Recyclable",
        )

        top_predictions.append(
            {
                "detected_item": class_name,
                "category": user_category,
                "confidence": round(
                    confidence * 100,
                    2,
                ),
            }
        )

    # --------------------------------------------------------
    # Main prediction
    # --------------------------------------------------------

    predicted_index = int(
        np.argmax(predictions)
    )

    detected_item = MODEL_CLASSES[
        predicted_index
    ]

    confidence = float(
        predictions[predicted_index]
    )

    confidence_percentage = round(
        confidence * 100,
        2,
    )

    category = CATEGORY_MAP.get(
        detected_item,
        "Recyclable",
    )

    guidance = DISPOSAL_GUIDANCE.get(
        detected_item,
        DISPOSAL_GUIDANCE["Plastic"],
    )

    # --------------------------------------------------------
    # Confidence level
    # --------------------------------------------------------

    if confidence_percentage >= 80:
        confidence_level = "High"

    elif confidence_percentage >= 50:
        confidence_level = "Moderate"

    else:
        confidence_level = "Low"

    # --------------------------------------------------------
    # Low-confidence message
    # --------------------------------------------------------

    warning = None

    if confidence_percentage < 50:
        warning = (
            "The AI confidence is low. "
            "Please upload a clearer image or "
            "capture the waste item again."
        )

    # --------------------------------------------------------
    # Processing time
    # --------------------------------------------------------

    processing_time_ms = round(
        (time.perf_counter() - start_time) * 1000,
        2,
    )

    # --------------------------------------------------------
    # Prediction ID
    # --------------------------------------------------------

    prediction_id = (
        f"ES-{int(time.time())}-"
        f"{uuid.uuid4().hex[:6].upper()}"
    )

    # --------------------------------------------------------
    # Save history
    # --------------------------------------------------------

    save_prediction(
        prediction_id=prediction_id,
        filename=file.filename,
        detected_item=detected_item,
        category=category,
        confidence=confidence_percentage,
        top_predictions=top_predictions,
        processing_time_ms=processing_time_ms,
        model_version=MODEL_VERSION,
    )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    response = {
        "message": "Waste classified successfully",

        "prediction_id": prediction_id,

        "detected_item": detected_item,

        "category": category,

        "confidence": confidence_percentage,

        "confidence_level": confidence_level,

        "top_predictions": top_predictions,

        "guidance": guidance["what_to_do"],

        "disposal": {
            "what_to_do": guidance["what_to_do"],
            "do": guidance["do"],
            "dont": guidance["dont"],
        },

        "processing_time_ms": processing_time_ms,

        "model_version": MODEL_VERSION,

        "filename": file.filename,
    }

    if warning:
        response["warning"] = warning

    return response


# ============================================================
# HISTORY
# ============================================================

@app.get("/history")
def history(limit: int = 20):

    if limit < 1:
        limit = 1

    if limit > 100:
        limit = 100

    return {
        "count": min(limit, len(get_history(limit))),
        "items": get_history(limit),
    }


# ============================================================
# SINGLE HISTORY ITEM
# ============================================================

@app.get("/history/{prediction_id}")
def history_item(prediction_id: str):

    result = get_prediction(prediction_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found.",
        )

    return result


# ============================================================
# STATS
# ============================================================

@app.get("/stats")
def stats():
    return get_stats()


# ============================================================
# FEEDBACK
# ============================================================

@app.post("/feedback")
async def feedback(
    prediction_id: str,
    is_correct: bool,
    corrected_category: str | None = None,
):

    prediction = get_prediction(
        prediction_id
    )

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found.",
        )

    save_feedback(
        prediction_id=prediction_id,
        is_correct=is_correct,
        corrected_category=corrected_category,
    )

    return {
        "message": "Feedback saved successfully",
        "prediction_id": prediction_id,
        "is_correct": is_correct,
        "corrected_category": corrected_category,
    }