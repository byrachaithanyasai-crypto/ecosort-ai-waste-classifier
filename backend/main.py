from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
import base64
import hashlib
import hmac
import os
import re
import io
import json
import logging
import time
import uuid

import numpy as np
import tensorflow as tf

from PIL import Image, ImageFilter, ImageStat

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    Request,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .database import (
    get_connection,
    _now,
    get_history,
    get_prediction,
    get_review_queue,
    get_stats,
    init_db,
    save_feedback,
    save_prediction,
    verify_prediction,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(name)s | "
        "%(message)s"
    ),
)

logger = logging.getLogger(
    "ecosort.api"
)


# ============================================================
# AUTHENTICATION / AUTHORIZATION
# ============================================================

AUTH_SECRET = os.getenv(
    "ECOSORT_AUTH_SECRET",
    "dev-only-change-this-secret-before-production",
)
AUTH_TOKEN_TTL_SECONDS = int(os.getenv("ECOSORT_AUTH_TOKEN_TTL", "86400"))

DEFAULT_ADMIN_EMAIL = os.getenv(
    "ECOSORT_ADMIN_EMAIL",
    "admin@ecosort.local",
).strip().lower()
DEFAULT_ADMIN_PASSWORD = os.getenv(
    "ECOSORT_ADMIN_PASSWORD",
    "EcoSortAdmin@123",
)
DEFAULT_ADMIN_NAME = os.getenv(
    "ECOSORT_ADMIN_NAME",
    "EcoSort Administrator",
)

PUBLIC_AUTH_PATHS = {
    "/",
    "/health",
    "/categories",
    "/model-info",
    "/api-info",
    "/status",
    "/endpoints",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/auth/login",
    "/auth/signup",
}


class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=256)


class SignupRequest(AuthCredentials):
    full_name: str = Field(min_length=2, max_length=120)


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    )
    return f"{salt.hex()}:{digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    """Verify both current PBKDF2 format and legacy salt:digest format."""
    if not password or not stored:
        return False

    stored = str(stored)

    # Current database.py format:
    # pbkdf2_sha256$200000$salt_hex$digest_hex
    if stored.startswith("pbkdf2_"):
        try:
            algorithm_tag, iterations_text, salt_hex, digest_hex = stored.split("$", 3)

            algorithm = algorithm_tag.removeprefix("pbkdf2_")
            iterations = int(iterations_text)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(digest_hex)

            actual = hashlib.pbkdf2_hmac(
                algorithm,
                str(password).encode("utf-8"),
                salt,
                iterations,
            )

            return hmac.compare_digest(actual, expected)

        except (ValueError, TypeError, UnicodeError):
            return False

    # Legacy salt:digest format
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (TypeError, ValueError):
        return False

    actual = hashlib.pbkdf2_hmac(
        "sha256",
        str(password).encode("utf-8"),
        salt,
        200_000,
    )

    return hmac.compare_digest(actual, expected)


def _ensure_auth_tables() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """
        )

        row = connection.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            (DEFAULT_ADMIN_EMAIL,),
        ).fetchone()

        if not row:
            connection.execute(
                """
                INSERT INTO users (
                    email, password_hash, full_name, role, is_active, created_at
                ) VALUES (?, ?, ?, 'admin', 1, ?)
                """,
                (
                    DEFAULT_ADMIN_EMAIL,
                    _hash_password(DEFAULT_ADMIN_PASSWORD),
                    DEFAULT_ADMIN_NAME,
                    _now(),
                ),
            )

        connection.commit()


def _public_user(row) -> dict:
    return {
        "id": int(row["id"]),
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
    }


def _get_user_record(email: str):
    with get_connection() as connection:
        return connection.execute(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            (str(email or "").strip().lower(),),
        ).fetchone()


def _token_for_user(row) -> str:
    header = _b64encode(b'{"alg":"HS256","typ":"ECOSORT"}')
    payload = {
        "sub": int(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "exp": int(time.time()) + AUTH_TOKEN_TTL_SECONDS,
    }
    payload_part = _b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header}.{payload_part}".encode("ascii")
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    return f"{header}.{payload_part}.{_b64encode(signature)}"


def _user_from_token(token: str):
    try:
        header, payload_part, signature_part = token.split(".", 2)
        signing_input = f"{header}.{payload_part}".encode("ascii")
        expected = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        actual = _b64decode(signature_part)
        if not hmac.compare_digest(actual, expected):
            return None
        payload = json.loads(_b64decode(payload_part).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
        if not row or not bool(row["is_active"]):
            return None
        return _public_user(row)


def _require_user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "authentication_required",
                "message": "Please sign in to continue.",
            },
        )
    return user


def _require_admin(request: Request) -> dict:
    user = _require_user(request)
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail={
                "error": "admin_required",
                "message": "Administrator access is required for this action.",
            },
        )
    return user


def _data_scope_user_id(request: Request):
    """Return the authenticated user's id for normal users, or None for admins."""
    user = _require_user(request)
    if user.get("role") == "admin":
        return None
    return int(user["id"])


def _validate_email(email: str) -> str:
    value = str(email or "").strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_email",
                "message": "Please provide a valid email address.",
            },
        )
    return value


def _validate_password(password: str) -> str:
    value = str(password or "")
    if len(value) < 8:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "weak_password",
                "message": "Password must be at least 8 characters long.",
            },
        )
    return value


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

API_VERSION = "2.0.0"

MODEL_PATH = (
    BASE_DIR
    / "waste_model.keras"
)

METADATA_PATH = (
    BASE_DIR
    / "model_metadata.json"
)

UPLOAD_DIR = (
    BASE_DIR
    / "backend"
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/jpg",
}

MODEL_INPUT_SIZE = (
    224,
    224,
)

HIGH_CONFIDENCE_THRESHOLD = 90.0

REVIEW_RECOMMENDED_THRESHOLD = 75.0


# ============================================================
# DEFAULT MODEL CONFIGURATION
# ============================================================

DEFAULT_MODEL_CLASSES = [
    "Metal",
    "Paper",
    "Plastic",
    "battery",
    "glass",
    "organic",
]

MODEL_CLASSES = list(
    DEFAULT_MODEL_CLASSES
)

MODEL_VERSION = "MobileNetV2-v2"


# ============================================================
# CATEGORY MAPPING
# ============================================================

CATEGORY_MAP = {
    "Metal": "Recyclable",
    "Paper": "Recyclable",
    "Plastic": "Recyclable",
    "glass": "Recyclable",
    "battery": "Hazardous",
    "organic": "Organic",
}


PUBLIC_CATEGORIES = {
    "Recyclable",
    "Organic",
    "Hazardous",
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
            "Do not burn metal waste.",
            "Do not mix with organic waste.",
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
            "Do not mix heavily soiled paper with clean paper.",
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
            "Handle glass carefully and use "
            "the appropriate local glass recycling stream."
        ),

        "do": [
            "Handle broken glass carefully.",
            "Use designated glass recycling where available.",
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
            "Use an authorized battery collection point.",
            "Store damaged batteries safely.",
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
# GLOBAL MODEL
# ============================================================

model: Optional[
    tf.keras.Model
] = None


# ============================================================
# LOAD MODEL METADATA
# ============================================================

def load_model_metadata():

    global MODEL_CLASSES
    global MODEL_VERSION

    if not METADATA_PATH.exists():

        logger.warning(
            "model_metadata.json not found. "
            "Using fallback model configuration."
        )

        return


    try:

        with open(
            METADATA_PATH,
            "r",
            encoding="utf-8",
        ) as file:

            metadata = json.load(
                file
            )


        classes = metadata.get(
            "classes"
        )


        if (
            isinstance(classes, list)
            and len(classes) >= 2
            and all(
                isinstance(
                    item,
                    str,
                )
                and item.strip()
                for item in classes
            )
        ):

            MODEL_CLASSES = [
                item.strip()
                for item in classes
            ]


        metadata_version = metadata.get(
            "model_version"
        )


        if metadata_version:

            MODEL_VERSION = str(
                metadata_version
            )


        logger.info(
            "Model metadata loaded."
        )

        logger.info(
            "Classes: %s",
            MODEL_CLASSES,
        )

        logger.info(
            "Model version: %s",
            MODEL_VERSION,
        )


    except Exception:

        logger.exception(
            "Failed to load model metadata."
        )


# ============================================================
# LOAD MODEL SAFELY
# ============================================================

def load_model_safely():

    global model

    if not MODEL_PATH.exists():

        logger.error(
            "Model file not found: %s",
            MODEL_PATH,
        )

        model = None

        return


    try:

        model = tf.keras.models.load_model(
            MODEL_PATH
        )


        logger.info(
            "EcoSort AI model loaded successfully."
        )

        logger.info(
            "Model input shape: %s",
            model.input_shape,
        )

        logger.info(
            "Model output shape: %s",
            model.output_shape,
        )


        expected_outputs = len(
            MODEL_CLASSES
        )


        output_shape = (
            model.output_shape
        )


        if (
            isinstance(
                output_shape,
                tuple,
            )
            and len(output_shape) >= 2
            and output_shape[-1]
            != expected_outputs
        ):

            logger.error(
                "Model output count (%s) "
                "does not match metadata class count (%s).",
                output_shape[-1],
                expected_outputs,
            )


    except Exception:

        logger.exception(
            "Unable to load AI model."
        )

        model = None


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(
    app: FastAPI,
):

    logger.info(
        "Starting EcoSort AI API..."
    )


    try:

        init_db()

        logger.info(
            "Database initialized."
        )

    except Exception:

        logger.exception(
            "Database initialization failed."
        )


    load_model_metadata()

    load_model_safely()


    logger.info(
        "EcoSort AI startup complete."
    )


    yield


    logger.info(
        "EcoSort AI API stopped."
    )


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=(
        "EcoSort AI Smart Waste Classifier API"
    ),

    version=API_VERSION,

    description=(
        "AI-powered waste classification API "
        "with image quality analysis, confidence "
        "monitoring, history, feedback and "
        "manual verification."
    ),

    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ECOSORT_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in PUBLIC_AUTH_PATHS:
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    user = None
    if authorization.lower().startswith("bearer "):
        user = _user_from_token(authorization[7:].strip())

    if not user:
        return JSONResponse(
            status_code=401,
            content={
                "error": "authentication_required",
                "message": "Please sign in to continue.",
            },
        )

    request.state.user = user
    return await call_next(request)


# ============================================================
# FILE TYPE VALIDATION
# ============================================================

def validate_upload_type(
    file: UploadFile,
):

    if not file.content_type:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_file_type",
                "message": (
                    "Image content type is missing."
                ),
            },
        )


    if (
        file.content_type
        not in ALLOWED_CONTENT_TYPES
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_file_type",
                "message": (
                    "Only JPG, JPEG and PNG images are supported."
                ),
                "allowed_formats": [
                    "JPG",
                    "JPEG",
                    "PNG",
                ],
            },
        )


# ============================================================
# IMAGE READER
# ============================================================

async def read_image_upload(
    file: UploadFile,
):

    validate_upload_type(
        file
    )


    contents = await file.read()


    if not contents:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "empty_file",
                "message": (
                    "The uploaded image is empty."
                ),
            },
        )


    if len(contents) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": (
                    "Maximum image size is 5 MB."
                ),
                "max_size_mb": 5,
            },
        )


    try:

        verification_image = Image.open(
            io.BytesIO(
                contents
            )
        )

        verification_image.verify()


        image = Image.open(
            io.BytesIO(
                contents
            )
        ).convert("RGB")


    except Exception:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_image",
                "message": (
                    "The uploaded file is not a valid image."
                ),
            },
        )


    return contents, image


# ============================================================
# IMAGE QUALITY ANALYSIS
# ============================================================

def calculate_image_quality(
    image: Image.Image,
):

    width, height = image.size

    score = 100

    issues = []


    # --------------------------------------------------------
    # RESOLUTION
    # --------------------------------------------------------

    if width < 256 or height < 256:

        score -= 25

        issues.append(
            "Image resolution is low."
        )


    # --------------------------------------------------------
    # BRIGHTNESS
    # --------------------------------------------------------

    grayscale = image.convert(
        "L"
    )


    brightness = ImageStat.Stat(
        grayscale
    ).mean[0]


    if brightness < 45:

        score -= 20

        issues.append(
            "Image appears too dark."
        )

    elif brightness > 220:

        score -= 15

        issues.append(
            "Image appears overexposed."
        )


    # --------------------------------------------------------
    # CONTRAST
    # --------------------------------------------------------

    contrast = ImageStat.Stat(
        grayscale
    ).stddev[0]


    if contrast < 20:

        score -= 15

        issues.append(
            "Image has low contrast."
        )


    # --------------------------------------------------------
    # EDGE / DETAIL
    # --------------------------------------------------------

    edges = grayscale.filter(
        ImageFilter.FIND_EDGES
    )


    edge_strength = ImageStat.Stat(
        edges
    ).mean[0]


    if edge_strength < 8:

        score -= 20

        issues.append(
            "Image may be blurry or lack visible detail."
        )


    score = max(
        0,
        min(
            100,
            int(score),
        ),
    )


    if score >= 80:

        quality_status = "good"

    elif score >= 60:

        quality_status = "warning"

    else:

        quality_status = "poor"


    return {
        "quality_score": score,
        "quality_status": quality_status,
        "width": width,
        "height": height,
        "brightness": round(
            brightness,
            2,
        ),
        "contrast": round(
            contrast,
            2,
        ),
        "edge_strength": round(
            edge_strength,
            2,
        ),
        "can_predict": score >= 45,
        "issues": issues,
    }


# ============================================================
# MODEL AVAILABILITY
# ============================================================

def ensure_model_available():

    if model is None:

        raise HTTPException(
            status_code=503,
            detail={
                "error": "model_unavailable",
                "message": (
                    "AI model is currently unavailable."
                ),
                "model_version": MODEL_VERSION,
            },
        )


# ============================================================
# SAFE FILENAME
# ============================================================

def create_safe_filename(
    original_filename: Optional[str],
):

    original = Path(
        original_filename or "image"
    ).name


    extension = Path(
        original
    ).suffix.lower()


    if extension not in {
        ".jpg",
        ".jpeg",
        ".png",
    }:

        extension = ".jpg"


    return (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


# ============================================================
# SAVE IMAGE
# ============================================================

def save_uploaded_image(
    contents: bytes,
    original_filename: Optional[str],
):

    filename = create_safe_filename(
        original_filename
    )


    path = (
        UPLOAD_DIR
        / filename
    )


    try:

        path.write_bytes(
            contents
        )

    except Exception:

        logger.exception(
            "Failed to save uploaded image."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "upload_save_failed",
                "message": (
                    "Unable to save uploaded image."
                ),
            },
        )


    return filename


# ============================================================
# MODEL OUTPUT VALIDATION
# ============================================================

def validate_model_output(
    predictions,
):

    values = np.asarray(
        predictions,
        dtype=np.float32,
    ).reshape(-1)


    expected_count = len(
        MODEL_CLASSES
    )


    if len(values) != expected_count:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "model_output_mismatch",
                "message": (
                    "Model output does not match "
                    "configured class metadata."
                ),
                "expected_outputs": expected_count,
                "received_outputs": len(values),
                "classes": MODEL_CLASSES,
            },
        )


    if not np.all(
        np.isfinite(values)
    ):

        raise HTTPException(
            status_code=500,
            detail={
                "error": "invalid_model_output",
                "message": (
                    "AI model returned invalid values."
                ),
            },
        )


    if (
        np.any(values < 0)
        or np.any(values > 1)
    ):

        raise HTTPException(
            status_code=500,
            detail={
                "error": "invalid_probability_output",
                "message": (
                    "AI model returned values "
                    "outside the expected probability range."
                ),
            },
        )


    total = float(
        np.sum(values)
    )


    if not np.isclose(
        total,
        1.0,
        atol=0.05,
    ):

        raise HTTPException(
            status_code=500,
            detail={
                "error": "invalid_probability_distribution",
                "message": (
                    "AI model output is not a valid "
                    "probability distribution."
                ),
            },
        )


    values = (
        values / total
    )


    return values


# ============================================================
# TOP 3 PREDICTIONS
# ============================================================

def build_top_predictions(
    probabilities,
):

    top_indices = np.argsort(
        probabilities
    )[::-1][:3]


    results = []


    for index in top_indices:

        index = int(
            index
        )


        class_name = MODEL_CLASSES[
            index
        ]


        if (
            class_name
            not in CATEGORY_MAP
        ):

            raise HTTPException(
                status_code=500,
                detail={
                    "error": "unsupported_model_class",
                    "message": (
                        "Model class has no category mapping."
                    ),
                    "class_name": class_name,
                },
            )


        confidence = round(
            float(
                probabilities[index]
            ) * 100,
            2,
        )


        results.append(
            {
                "detected_item": class_name,
                "category": CATEGORY_MAP[
                    class_name
                ],
                "confidence": confidence,
            }
        )


    return results


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@app.post("/auth/signup")
async def auth_signup(payload: SignupRequest):
    email = _validate_email(payload.email)
    password = _validate_password(payload.password)
    full_name = str(payload.full_name or "").strip()

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            (email,),
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "email_exists",
                    "message": "An account with this email already exists.",
                },
            )

        cursor = connection.execute(
            """
            INSERT INTO users (
                email, password_hash, full_name, role, is_active, created_at
            ) VALUES (?, ?, ?, 'user', 1, ?)
            """,
            (email, _hash_password(password), full_name, _now()),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return {
        "message": "Account created successfully.",
        "user": _public_user(row),
        "token": _token_for_user(row),
    }


@app.post("/auth/login")
async def auth_login(payload: AuthCredentials):
    email = _validate_email(payload.email)
    row = _get_user_record(email)
    if not row or not bool(row["is_active"]) or not _verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_credentials",
                "message": "Email or password is incorrect.",
            },
        )

    with get_connection() as connection:
        connection.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (_now(), row["id"]),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (row["id"],),
        ).fetchone()

    return {
        "message": "Login successful.",
        "user": _public_user(row),
        "token": _token_for_user(row),
    }


@app.get("/auth/me")
async def auth_me(request: Request):
    return {"user": _require_user(request)}


@app.get("/admin/users")
async def admin_users(request: Request, limit: int = 100):
    _require_admin(request)
    limit = max(1, min(int(limit or 100), 1000))
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM users ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return {"count": len(rows), "items": [_public_user(row) for row in rows]}


@app.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: int, payload: AdminUserUpdate, request: Request):
    admin = _require_admin(request)
    role = None if payload.role is None else str(payload.role).strip().lower()
    if role is not None and role not in {"user", "admin"}:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_role", "message": "Role must be user or admin."},
        )
    if user_id == int(admin["id"]) and role == "user":
        raise HTTPException(
            status_code=400,
            detail={"error": "cannot_demote_self", "message": "You cannot remove your own admin access."},
        )
    if user_id == int(admin["id"]) and payload.is_active is False:
        raise HTTPException(
            status_code=400,
            detail={"error": "cannot_disable_self", "message": "You cannot disable your own account."},
        )

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail={"error": "user_not_found", "message": "User not found."},
            )

        updates = []
        params = []
        if role is not None:
            updates.append("role = ?")
            params.append(role)
        if payload.is_active is not None:
            updates.append("is_active = ?")
            params.append(1 if payload.is_active else 0)

        if updates:
            params.append(user_id)
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(params),
            )
            connection.commit()

        updated = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    return {"message": "User updated successfully.", "user": _public_user(updated)}


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def home():

    return {
        "message": (
            "EcoSort AI Backend is running"
        ),

        "status": "online",

        "api_version": API_VERSION,

        "model_loaded": (
            model is not None
        ),

        "model_version": MODEL_VERSION,

        "classes": MODEL_CLASSES,

        "categories": sorted(
            PUBLIC_CATEGORIES
        ),
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    database_status = "connected"


    try:

        stats_data = get_stats()

        _ = stats_data.get(
            "total_predictions",
            0,
        )

    except Exception:

        database_status = "error"

        logger.exception(
            "Database health check failed."
        )


    model_status = (
        "loaded"
        if model is not None
        else "unavailable"
    )


    healthy = (
        model is not None
        and database_status == "connected"
    )


    return {
        "status": (
            "healthy"
            if healthy
            else "degraded"
        ),

        "model_loaded": (
            model is not None
        ),

        "model_status": model_status,

        "database": database_status,

        "model_version": MODEL_VERSION,

        "api_version": API_VERSION,
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

                "description": (
                    "Materials that can commonly "
                    "enter recycling streams."
                ),

                "items": [
                    class_name
                    for class_name
                    in MODEL_CLASSES
                    if CATEGORY_MAP.get(
                        class_name
                    ) == "Recyclable"
                ],
            },


            {
                "name": "Organic",

                "description": (
                    "Biodegradable food and plant waste."
                ),

                "items": [
                    class_name
                    for class_name
                    in MODEL_CLASSES
                    if CATEGORY_MAP.get(
                        class_name
                    ) == "Organic"
                ],
            },


            {
                "name": "Hazardous",

                "description": (
                    "Waste requiring special handling."
                ),

                "items": [
                    class_name
                    for class_name
                    in MODEL_CLASSES
                    if CATEGORY_MAP.get(
                        class_name
                    ) == "Hazardous"
                ],
            },
        ]
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/model-info")
def model_info():

    input_shape = None
    output_shape = None


    if model is not None:

        try:

            input_shape = str(
                model.input_shape
            )

            output_shape = str(
                model.output_shape
            )

        except Exception:

            pass


    return {
        "model": "MobileNetV2",

        "model_version": MODEL_VERSION,

        "input_size": "224x224",

        "input_shape": input_shape,

        "output_shape": output_shape,

        "classes": MODEL_CLASSES,

        "class_count": len(
            MODEL_CLASSES
        ),

        "user_categories": sorted(
            PUBLIC_CATEGORIES
        ),

        "loaded": (
            model is not None
        ),

        "preprocessing": (
            "Embedded in trained model: "
            "pixel / 127.5 - 1"
        ),

        "output_activation": "softmax",
    }


# ============================================================
# API INFO
# ============================================================

@app.get("/api-info")
def api_info():

    return {
        "name": (
            "EcoSort AI Smart Waste Classifier API"
        ),

        "api_version": API_VERSION,

        "model_version": MODEL_VERSION,

        "model_loaded": (
            model is not None
        ),

        "max_file_size_mb": 5,

        "supported_formats": [
            "JPG",
            "JPEG",
            "PNG",
        ],

        "confidence_thresholds": {
            "high": HIGH_CONFIDENCE_THRESHOLD,

            "review_recommended": (
                REVIEW_RECOMMENDED_THRESHOLD
            ),

            "manual_verification": (
                REVIEW_RECOMMENDED_THRESHOLD
            ),
        },
    }


# ============================================================
# UPLOAD
# ============================================================

@app.post("/upload")
async def upload_waste(
    file: UploadFile = File(...),
):

    contents, image = (
        await read_image_upload(
            file
        )
    )


    saved_as = save_uploaded_image(
        contents,
        file.filename,
    )


    quality = calculate_image_quality(
        image
    )


    return {
        "message": (
            "Image uploaded successfully."
        ),

        "filename": (
            file.filename
        ),

        "saved_as": saved_as,

        "width": image.width,

        "height": image.height,

        "image_quality": {
            "score": quality[
                "quality_score"
            ],

            "status": quality[
                "quality_status"
            ],

            "issues": quality[
                "issues"
            ],
        },

        "status": (
            "ready_for_classification"
        ),
    }


# ============================================================
# ANALYZE IMAGE
# ============================================================

@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
):

    _, image = (
        await read_image_upload(
            file
        )
    )


    quality = calculate_image_quality(
        image
    )


    return {
        "message": (
            "Image quality analyzed successfully."
        ),

        **quality,
    }


# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict_waste(
    file: UploadFile = File(...),
    request: Request = None,
):

    current_user = _require_user(request)

    start_time = (
        time.perf_counter()
    )


    ensure_model_available()


    contents, original_image = (
        await read_image_upload(
            file
        )
    )


    # --------------------------------------------------------
    # IMAGE QUALITY
    # --------------------------------------------------------

    quality = calculate_image_quality(
        original_image
    )


    if not quality[
        "can_predict"
    ]:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "poor_image_quality",

                "message": (
                    "Image quality is too poor "
                    "for reliable classification."
                ),

                "quality_score": quality[
                    "quality_score"
                ],

                "quality_status": quality[
                    "quality_status"
                ],

                "issues": quality[
                    "issues"
                ],
            },
        )


    # --------------------------------------------------------
    # SAVE ORIGINAL IMAGE
    # --------------------------------------------------------

    saved_as = save_uploaded_image(
        contents,
        file.filename,
    )


    # --------------------------------------------------------
    # MODEL INPUT
    # --------------------------------------------------------
    #
    # IMPORTANT:
    #
    # The trained model already contains:
    #
    #     pixel / 127.5 - 1
    #
    # Therefore main.py sends RAW RGB pixels.
    #
    # No duplicate preprocessing.
    #

    image = original_image.resize(
        MODEL_INPUT_SIZE,
        Image.Resampling.LANCZOS,
    )


    image_array = np.asarray(
        image,
        dtype=np.float32,
    )


    image_array = np.expand_dims(
        image_array,
        axis=0,
    )


    # --------------------------------------------------------
    # MODEL PREDICTION
    # --------------------------------------------------------

    try:

        raw_predictions = (
            model.predict(
                image_array,
                verbose=0,
            )[0]
        )

    except Exception:

        logger.exception(
            "Model prediction failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "prediction_failed",

                "message": (
                    "Unable to analyze the image right now."
                ),
            },
        )


    # --------------------------------------------------------
    # VALIDATE OUTPUT
    # --------------------------------------------------------

    probabilities = (
        validate_model_output(
            raw_predictions
        )
    )


    # --------------------------------------------------------
    # TOP 3
    # --------------------------------------------------------

    top_predictions = (
        build_top_predictions(
            probabilities
        )
    )


    # --------------------------------------------------------
    # PRIMARY PREDICTION
    # --------------------------------------------------------

    predicted_index = int(
        np.argmax(
            probabilities
        )
    )


    detected_item = (
        MODEL_CLASSES[
            predicted_index
        ]
    )


    if (
        detected_item
        not in CATEGORY_MAP
    ):

        raise HTTPException(
            status_code=500,
            detail={
                "error": "unsupported_model_class",

                "message": (
                    "The detected model class "
                    "is not configured."
                ),

                "class_name": detected_item,
            },
        )


    category = CATEGORY_MAP[
        detected_item
    ]


    guidance = (
        DISPOSAL_GUIDANCE.get(
            detected_item
        )
    )


    if guidance is None:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "guidance_unavailable",

                "message": (
                    "Disposal guidance is unavailable."
                ),

                "detected_item": detected_item,
            },
        )


    confidence = round(
        float(
            probabilities[
                predicted_index
            ]
        ) * 100,
        2,
    )


    # --------------------------------------------------------
    # CONFIDENCE DECISION
    # --------------------------------------------------------

    if (
        confidence
        >= HIGH_CONFIDENCE_THRESHOLD
    ):

        confidence_level = "High"

        review_status = (
            "not_required"
        )

        verification_required = False

        confidence_message = (
            "Prediction has high AI confidence."
        )

        warning = None


    elif (
        confidence
        >= REVIEW_RECOMMENDED_THRESHOLD
    ):

        confidence_level = (
            "Review Recommended"
        )

        review_status = (
            "review_recommended"
        )

        verification_required = False

        confidence_message = (
            "AI confidence is acceptable, "
            "but manual review is recommended."
        )

        warning = (
            "Manual review is recommended "
            "because confidence is below 90%."
        )


    else:

        confidence_level = "Low"

        review_status = "pending"

        verification_required = True

        confidence_message = (
            "AI confidence is below 75%. "
            "Manual verification is required "
            "before treating this as final."
        )

        warning = (
            "Manual verification is required "
            "because AI confidence is below 75%."
        )


    # --------------------------------------------------------
    # PROCESSING TIME
    # --------------------------------------------------------

    processing_time_ms = round(
        (
            time.perf_counter()
            - start_time
        ) * 1000,
        2,
    )


    # --------------------------------------------------------
    # PREDICTION ID
    # --------------------------------------------------------

    prediction_id = (
        f"ES-"
        f"{int(time.time())}-"
        f"{uuid.uuid4().hex[:6].upper()}"
    )


    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    try:

        save_prediction(
            prediction_id=prediction_id,

            filename=(
                file.filename
                or "image"
            ),

            detected_item=detected_item,

            category=category,

            confidence=confidence,

            top_predictions=(
                top_predictions
            ),

            processing_time_ms=(
                processing_time_ms
            ),

            model_version=(
                MODEL_VERSION
            ),

            quality_score=(
                quality[
                    "quality_score"
                ]
            ),

            quality_status=(
                quality[
                    "quality_status"
                ]
            ),

            review_status=(
                review_status
            ),
            user_id=int(current_user["id"]),
        )


    except Exception:

        logger.exception(
            "Failed to save prediction."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "database_save_failed",

                "message": (
                    "Prediction was generated, "
                    "but could not be saved."
                ),
            },
        )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    response = {

        "message": (
            "Waste classified successfully."
        ),

        "prediction_id": prediction_id,

        "detected_item": detected_item,

        "category": category,

        "confidence": confidence,

        "confidence_level": confidence_level,

        "verification_required": (
            verification_required
        ),

        "review_status": review_status,

        "confidence_message": (
            confidence_message
        ),

        "top_predictions": (
            top_predictions
        ),

        "guidance": (
            guidance[
                "what_to_do"
            ]
        ),

        "disposal": {

            "what_to_do": (
                guidance[
                    "what_to_do"
                ]
            ),

            "do": guidance["do"],

            "dont": guidance["dont"],
        },

        "image_quality": {

            "score": quality[
                "quality_score"
            ],

            "status": quality[
                "quality_status"
            ],

            "issues": quality[
                "issues"
            ],

            "width": quality[
                "width"
            ],

            "height": quality[
                "height"
            ],
        },

        "processing_time_ms": (
            processing_time_ms
        ),

        "model_version": (
            MODEL_VERSION
        ),

        "filename": (
            file.filename
        ),

        "saved_as": saved_as,
    }


    if warning:

        response[
            "warning"
        ] = warning


    return response


# ============================================================
# HISTORY
# ============================================================

@app.get("/history")
def history(
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    min_confidence: Optional[float] = None,
    max_confidence: Optional[float] = None,
    sort: str = "newest",
    request: Request = None,
):

    limit = max(
        1,
        min(
            100,
            limit,
        ),
    )


    if min_confidence is not None:

        min_confidence = max(
            0.0,
            min(
                100.0,
                min_confidence,
            ),
        )


    if max_confidence is not None:

        max_confidence = max(
            0.0,
            min(
                100.0,
                max_confidence,
            ),
        )


    if (
        min_confidence is not None
        and max_confidence is not None
        and min_confidence
        > max_confidence
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_confidence_range",

                "message": (
                    "Minimum confidence cannot "
                    "exceed maximum confidence."
                ),
            },
        )


    allowed_sorts = {
        "newest",
        "oldest",
        "confidence_high",
        "confidence_low",
    }


    if sort not in allowed_sorts:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_sort",

                "message": (
                    "Invalid history sort option."
                ),

                "allowed": sorted(
                    allowed_sorts
                ),
            },
        )


    if (
        category
        and category not in PUBLIC_CATEGORIES
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_category",

                "message": (
                    "Invalid waste category."
                ),

                "allowed": sorted(
                    PUBLIC_CATEGORIES
                ),
            },
        )


    allowed_statuses = {
        "pending",
        "review_recommended",
        "not_required",
        "verified",
    }


    if (
        status
        and status not in allowed_statuses
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_status",

                "message": (
                    "Invalid review status."
                ),

                "allowed": sorted(
                    allowed_statuses
                ),
            },
        )


    scoped_user_id = _data_scope_user_id(request)

    items = get_history(
        limit=limit,

        search=(
            search.strip()
            if search
            else None
        ),

        category=category,

        status=status,

        min_confidence=min_confidence,

        max_confidence=max_confidence,

        sort=sort,
        user_id=scoped_user_id,
    )


    return {
        "count": len(items),
        "limit": limit,
        "items": items,
    }


# ============================================================
# SINGLE HISTORY ITEM
# ============================================================

@app.get(
    "/history/{prediction_id}"
)
def history_item(
    prediction_id: str,
    request: Request = None,
):

    prediction_id = (
        prediction_id.strip()
    )


    if not prediction_id:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_prediction_id",

                "message": (
                    "Prediction ID is required."
                ),
            },
        )


    scoped_user_id = _data_scope_user_id(request)

    result = get_prediction(
        prediction_id,
        user_id=scoped_user_id,
    )


    if not result:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "prediction_not_found",

                "message": (
                    "Prediction not found."
                ),

                "prediction_id": prediction_id,
            },
        )


    return result


# ============================================================
# STATISTICS
# ============================================================

@app.get("/stats")
def stats(request: Request):

    try:

        scoped_user_id = _data_scope_user_id(request)
        return get_stats(user_id=scoped_user_id)

    except Exception:

        logger.exception(
            "Failed to load statistics."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "stats_unavailable",

                "message": (
                    "Unable to load statistics."
                ),
            },
        )


# ============================================================
# REVIEW QUEUE
# ============================================================

@app.get("/review-queue")
def review_queue(
    limit: int = 100,
    request: Request = None,
):

    _require_admin(request)

    limit = max(
        1,
        min(
            100,
            limit,
        ),
    )


    try:

        items = get_review_queue(
            limit=limit
        )

    except Exception:

        logger.exception(
            "Failed to load review queue."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "review_queue_unavailable",

                "message": (
                    "Unable to load review queue."
                ),
            },
        )


    return {
        "count": len(items),
        "limit": limit,
        "items": items,
    }


# ============================================================
# FEEDBACK
# ============================================================

@app.post("/feedback")
async def feedback(
    prediction_id: str,
    is_correct: bool,
    corrected_category: Optional[str] = None,
    reviewer_note: Optional[str] = None,
    request: Request = None,
):

    scoped_user_id = _data_scope_user_id(request)

    prediction_id = (
        prediction_id.strip()
    )


    prediction = get_prediction(
        prediction_id,
        user_id=scoped_user_id,
    )


    if not prediction:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "prediction_not_found",

                "message": (
                    "Prediction not found."
                ),
            },
        )


    if is_correct:

        corrected_category = None

    else:

        if corrected_category:

            corrected_category = (
                corrected_category.strip()
            )


            if (
                corrected_category
                not in PUBLIC_CATEGORIES
            ):

                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "invalid_corrected_category",

                        "message": (
                            "Invalid corrected category."
                        ),

                        "allowed": sorted(
                            PUBLIC_CATEGORIES
                        ),
                    },
                )


    if reviewer_note:

        reviewer_note = (
            reviewer_note.strip()
        )

        if not reviewer_note:

            reviewer_note = None


    try:

        save_feedback(
            prediction_id=prediction_id,

            is_correct=is_correct,

            corrected_category=(
                corrected_category
            ),

            reviewer_note=reviewer_note,
        )


    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "feedback_invalid",
                "message": str(exc),
            },
        )


    except Exception:

        logger.exception(
            "Failed to save feedback."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "feedback_save_failed",

                "message": (
                    "Unable to save feedback."
                ),
            },
        )


    return {
        "message": (
            "Feedback saved successfully."
        ),

        "prediction_id": prediction_id,

        "is_correct": is_correct,

        "corrected_category": (
            corrected_category
        ),

        "reviewer_note": reviewer_note,
    }


# ============================================================
# MANUAL VERIFICATION
# ============================================================

@app.post(
    "/verify/{prediction_id}"
)
async def verify(
    prediction_id: str,
    final_category: str,
    reviewer_note: Optional[str] = None,
    request: Request = None,
):

    _require_admin(request)

    prediction_id = (
        prediction_id.strip()
    )


    prediction = get_prediction(
        prediction_id
    )


    if not prediction:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "prediction_not_found",

                "message": (
                    "Prediction not found."
                ),
            },
        )


    final_category = (
        final_category.strip()
    )


    if (
        final_category
        not in PUBLIC_CATEGORIES
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_final_category",

                "message": (
                    "Invalid final category."
                ),

                "allowed": sorted(
                    PUBLIC_CATEGORIES
                ),
            },
        )


    if reviewer_note:

        reviewer_note = (
            reviewer_note.strip()
        )

        if not reviewer_note:

            reviewer_note = None


    try:

        result = verify_prediction(
            prediction_id=prediction_id,

            final_category=final_category,

            reviewer_note=reviewer_note,
        )


    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "verification_invalid",
                "message": str(exc),
            },
        )


    except Exception:

        logger.exception(
            "Verification failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "verification_failed",

                "message": (
                    "Unable to verify prediction."
                ),
            },
        )


    if not result:

        raise HTTPException(
            status_code=404,
            detail={
                "error": "prediction_not_found",

                "message": (
                    "Prediction not found."
                ),
            },
        )


    return {
        "message": (
            "Prediction verified successfully."
        ),

        **result,
    }


# ============================================================
# STATUS
# ============================================================

@app.get("/status")
def status():

    return {
        "service": (
            "EcoSort AI Smart Waste Classifier"
        ),

        "status": "online",

        "api_version": API_VERSION,

        "model_version": MODEL_VERSION,

        "model_loaded": (
            model is not None
        ),

        "database": "sqlite",

        "classification_classes": (
            MODEL_CLASSES
        ),
    }


# ============================================================
# ENDPOINT LIST
# ============================================================

@app.get("/endpoints")
def endpoints():

    return {
        "endpoints": [
            "/",
            "/health",
            "/status",
            "/api-info",
            "/categories",
            "/model-info",
            "/upload",
            "/analyze-image",
            "/predict",
            "/history",
            "/history/{prediction_id}",
            "/stats",
            "/review-queue",
            "/feedback",
            "/verify/{prediction_id}",
        ]
    }