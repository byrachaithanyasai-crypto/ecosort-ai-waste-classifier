import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "eco_sort.db"


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection() -> sqlite3.Connection:
    """
    Create a SQLite connection configured to return Row objects.
    Foreign-key enforcement is enabled for data integrity.
    """
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    # Enable foreign-key enforcement for future-safe relationships.
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


# ============================================================
# HELPERS
# ============================================================

def _now() -> str:
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def _column_exists(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
) -> bool:
    """Check whether a column exists in a SQLite table."""
    rows = connection.execute(
        f"PRAGMA table_info({table_name})"
    ).fetchall()

    return any(row["name"] == column_name for row in rows)


def _add_column_if_missing(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_definition: str,
) -> None:
    """Add a column only when it does not already exist."""
    if not _column_exists(
        connection,
        table_name,
        column_name,
    ):
        connection.execute(
            f"""
            ALTER TABLE {table_name}
            ADD COLUMN {column_name} {column_definition}
            """
        )


def _decode_top_predictions(value: Any) -> list:
    """
    Decode stored top-prediction JSON safely.

    Old or malformed records should never crash the API.
    """
    if not value:
        return []

    if isinstance(value, list):
        return value

    try:
        decoded = json.loads(value)

        if isinstance(decoded, list):
            return decoded

        return []

    except (TypeError, ValueError, json.JSONDecodeError):
        return []


def _safe_limit(
    value: Optional[int],
    default: int = 20,
    maximum: int = 100,
) -> int:
    """
    Keep database query limits within a safe range.
    """
    try:
        limit = int(value if value is not None else default)
    except (TypeError, ValueError):
        limit = default

    return max(1, min(limit, maximum))


def _safe_confidence(value: Any) -> Optional[float]:
    """
    Convert confidence filter values safely.
    """
    if value is None:
        return None

    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return None

    return max(0.0, min(confidence, 100.0))


def _row_to_prediction(row: sqlite3.Row) -> dict:
    """
    Convert a SQLite prediction row into an API-friendly dictionary.
    """
    item = dict(row)

    item["top_predictions"] = _decode_top_predictions(
        item.get("top_predictions")
    )

    return item


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db() -> None:
    """
    Initialize the EcoSort database.

    Existing databases are preserved.
    Missing columns are added automatically.
    """
    with closing(get_connection()) as connection:

        # ----------------------------------------------------
        # Predictions
        # ----------------------------------------------------

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                prediction_id TEXT UNIQUE NOT NULL,

                filename TEXT NOT NULL,

                detected_item TEXT NOT NULL,

                category TEXT NOT NULL,

                confidence REAL NOT NULL,

                top_predictions TEXT,

                processing_time_ms REAL,

                model_version TEXT,

                created_at TEXT NOT NULL,

                quality_score REAL,

                quality_status TEXT,

                review_status TEXT DEFAULT 'not_required',

                final_category TEXT,

                reviewer_note TEXT,

                verified_at TEXT
            )
            """
        )

        # ----------------------------------------------------
        # Feedback
        # ----------------------------------------------------

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                prediction_id TEXT NOT NULL,

                is_correct INTEGER NOT NULL,

                corrected_category TEXT,

                reviewer_note TEXT,

                created_at TEXT NOT NULL
            )
            """
        )

        # ----------------------------------------------------
        # Migration support for existing databases
        # ----------------------------------------------------

        prediction_columns = [
            (
                "quality_score",
                "REAL",
            ),
            (
                "quality_status",
                "TEXT",
            ),
            (
                "review_status",
                "TEXT DEFAULT 'not_required'",
            ),
            (
                "final_category",
                "TEXT",
            ),
            (
                "reviewer_note",
                "TEXT",
            ),
            (
                "verified_at",
                "TEXT",
            ),
        ]

        for column_name, column_definition in prediction_columns:
            _add_column_if_missing(
                connection,
                "predictions",
                column_name,
                column_definition,
            )

        feedback_columns = [
            (
                "reviewer_note",
                "TEXT",
            ),
        ]

        for column_name, column_definition in feedback_columns:
            _add_column_if_missing(
                connection,
                "feedback",
                column_name,
                column_definition,
            )

        # ----------------------------------------------------
        # Backfill old records
        # ----------------------------------------------------

        connection.execute(
            """
            UPDATE predictions
            SET review_status = 'pending'
            WHERE review_status IS NULL
              AND confidence < 75
            """
        )

        connection.execute(
            """
            UPDATE predictions
            SET review_status = 'not_required'
            WHERE review_status IS NULL
              AND confidence >= 75
            """
        )

        # ----------------------------------------------------
        # Defensive cleanup
        # ----------------------------------------------------

        connection.execute(
            """
            UPDATE predictions
            SET review_status = 'not_required'
            WHERE review_status IS NULL
            """
        )

        connection.commit()


# ============================================================
# SAVE PREDICTION
# ============================================================

def save_prediction(
    prediction_id,
    filename,
    detected_item,
    category,
    confidence,
    top_predictions,
    processing_time_ms,
    model_version,
    quality_score=None,
    quality_status=None,
    review_status=None,
):
    """
    Save one AI prediction to the database.

    Review status is automatically determined when it is not
    explicitly supplied.
    """

    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        raise ValueError("confidence must be a number")

    confidence_value = max(
        0.0,
        min(confidence_value, 100.0),
    )

    # --------------------------------------------------------
    # Automatic review status
    # --------------------------------------------------------

    if review_status is None:
        review_status = (
            "pending"
            if confidence_value < 75
            else "not_required"
        )

    # --------------------------------------------------------
    # Normalize top predictions
    # --------------------------------------------------------

    if top_predictions is None:
        top_predictions = []

    with closing(get_connection()) as connection:

        connection.execute(
            """
            INSERT INTO predictions (
                prediction_id,
                filename,
                detected_item,
                category,
                confidence,
                top_predictions,
                processing_time_ms,
                model_version,
                created_at,
                quality_score,
                quality_status,
                review_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                prediction_id,
                filename,
                detected_item,
                category,
                confidence_value,
                json.dumps(
                    top_predictions,
                    ensure_ascii=False,
                ),
                processing_time_ms,
                model_version,
                _now(),
                quality_score,
                quality_status,
                review_status,
            ),
        )

        connection.commit()


# ============================================================
# HISTORY
# ============================================================

def get_history(
    limit=20,
    search=None,
    category=None,
    status=None,
    min_confidence=None,
    max_confidence=None,
    sort="newest",
):
    """
    Retrieve prediction history with filtering and sorting.
    """

    limit = _safe_limit(limit)

    min_confidence = _safe_confidence(
        min_confidence
    )

    max_confidence = _safe_confidence(
        max_confidence
    )

    # --------------------------------------------------------
    # Normalize confidence range
    # --------------------------------------------------------

    if (
        min_confidence is not None
        and max_confidence is not None
        and min_confidence > max_confidence
    ):
        min_confidence, max_confidence = (
            max_confidence,
            min_confidence,
        )

    connection = get_connection()

    try:
        query = """
            SELECT *
            FROM predictions
            WHERE 1=1
        """

        params = []

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:
            search_value = f"%{str(search).strip()}%"

            query += """
                AND (
                    detected_item LIKE ?
                    OR category LIKE ?
                    OR filename LIKE ?
                    OR prediction_id LIKE ?
                    OR final_category LIKE ?
                )
            """

            params.extend(
                [
                    search_value,
                    search_value,
                    search_value,
                    search_value,
                    search_value,
                ]
            )

        # ----------------------------------------------------
        # Category
        # ----------------------------------------------------

        if category:
            query += """
                AND category = ?
            """

            params.append(category)

        # ----------------------------------------------------
        # Review status
        # ----------------------------------------------------

        if status:
            query += """
                AND review_status = ?
            """

            params.append(status)

        # ----------------------------------------------------
        # Confidence range
        # ----------------------------------------------------

        if min_confidence is not None:
            query += """
                AND confidence >= ?
            """

            params.append(min_confidence)

        if max_confidence is not None:
            query += """
                AND confidence <= ?
            """

            params.append(max_confidence)

        # ----------------------------------------------------
        # Sorting
        # ----------------------------------------------------

        if sort == "oldest":
            query += """
                ORDER BY id ASC
            """

        elif sort == "confidence_high":
            query += """
                ORDER BY confidence DESC, id DESC
            """

        elif sort == "confidence_low":
            query += """
                ORDER BY confidence ASC, id DESC
            """

        else:
            query += """
                ORDER BY id DESC
            """

        # ----------------------------------------------------
        # Limit
        # ----------------------------------------------------

        query += """
            LIMIT ?
        """

        params.append(limit)

        rows = connection.execute(
            query,
            tuple(params),
        ).fetchall()

        return [
            _row_to_prediction(row)
            for row in rows
        ]

    finally:
        connection.close()


# ============================================================
# SINGLE PREDICTION
# ============================================================

def get_prediction(prediction_id):
    """
    Retrieve one prediction by its public prediction ID.
    """

    if not prediction_id:
        return None

    with closing(get_connection()) as connection:

        row = connection.execute(
            """
            SELECT *
            FROM predictions
            WHERE prediction_id = ?
            """,
            (prediction_id,),
        ).fetchone()

        if not row:
            return None

        return _row_to_prediction(row)


# ============================================================
# VERIFY PREDICTION
# ============================================================

def verify_prediction(
    prediction_id,
    final_category,
    reviewer_note=None,
):
    """
    Mark a prediction as manually verified.

    Category validation itself should be performed by the API
    layer using the application's official category list.
    """

    if not prediction_id:
        return None

    if not final_category:
        raise ValueError(
            "final_category is required"
        )

    final_category = str(
        final_category
    ).strip()

    if not final_category:
        raise ValueError(
            "final_category cannot be empty"
        )

    reviewer_note = (
        str(reviewer_note).strip()
        if reviewer_note is not None
        else None
    )

    with closing(get_connection()) as connection:

        existing = connection.execute(
            """
            SELECT prediction_id
            FROM predictions
            WHERE prediction_id = ?
            """,
            (prediction_id,),
        ).fetchone()

        if not existing:
            return None

        verified_at = _now()

        connection.execute(
            """
            UPDATE predictions
            SET
                final_category = ?,
                reviewer_note = ?,
                review_status = 'verified',
                verified_at = ?
            WHERE prediction_id = ?
            """,
            (
                final_category,
                reviewer_note,
                verified_at,
                prediction_id,
            ),
        )

        connection.commit()

        return {
            "prediction_id": prediction_id,
            "final_category": final_category,
            "reviewer_note": reviewer_note,
            "review_status": "verified",
            "verified_at": verified_at,
        }


# ============================================================
# REVIEW QUEUE
# ============================================================

def get_review_queue(limit=100):
    """
    Retrieve predictions currently waiting for manual review.

    Lowest-confidence predictions appear first.
    """

    limit = _safe_limit(
        limit,
        default=100,
        maximum=100,
    )

    with closing(get_connection()) as connection:

        rows = connection.execute(
            """
            SELECT *
            FROM predictions
            WHERE review_status = 'pending'
            ORDER BY confidence ASC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        return [
            _row_to_prediction(row)
            for row in rows
        ]


# ============================================================
# SAVE FEEDBACK
# ============================================================

def save_feedback(
    prediction_id,
    is_correct,
    corrected_category=None,
    reviewer_note=None,
):
    """
    Save user feedback for an existing prediction.

    Important product rule:

    corrected_category = user correction

    final_category = verified final result

    Therefore a user correction does NOT automatically become
    the verified final category.
    """

    if not prediction_id:
        raise ValueError(
            "prediction_id is required"
        )

    # --------------------------------------------------------
    # Normalize boolean
    # --------------------------------------------------------

    if isinstance(is_correct, str):
        normalized = is_correct.strip().lower()

        if normalized in (
            "true",
            "1",
            "yes",
            "correct",
        ):
            is_correct_value = 1

        elif normalized in (
            "false",
            "0",
            "no",
            "incorrect",
        ):
            is_correct_value = 0

        else:
            raise ValueError(
                "is_correct must be a boolean value"
            )

    else:
        is_correct_value = 1 if bool(
            is_correct
        ) else 0

    # --------------------------------------------------------
    # Normalize optional fields
    # --------------------------------------------------------

    if corrected_category is not None:
        corrected_category = str(
            corrected_category
        ).strip()

        if not corrected_category:
            corrected_category = None

    if reviewer_note is not None:
        reviewer_note = str(
            reviewer_note
        ).strip()

        if not reviewer_note:
            reviewer_note = None

    with closing(get_connection()) as connection:

        # ----------------------------------------------------
        # Make sure prediction exists
        # ----------------------------------------------------

        prediction = connection.execute(
            """
            SELECT prediction_id, review_status
            FROM predictions
            WHERE prediction_id = ?
            """,
            (prediction_id,),
        ).fetchone()

        if not prediction:
            raise ValueError(
                "Prediction not found"
            )

        # ----------------------------------------------------
        # Save feedback
        # ----------------------------------------------------

        connection.execute(
            """
            INSERT INTO feedback (
                prediction_id,
                is_correct,
                corrected_category,
                reviewer_note,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                prediction_id,
                is_correct_value,
                corrected_category,
                reviewer_note,
                _now(),
            ),
        )

        # ----------------------------------------------------
        # Incorrect feedback
        # ----------------------------------------------------

        if is_correct_value == 0:

            # User says AI was incorrect.
            #
            # This means the prediction needs review.
            #
            # corrected_category is stored ONLY in feedback.
            # It is intentionally NOT copied into
            # predictions.final_category.
            connection.execute(
                """
                UPDATE predictions
                SET
                    review_status = 'pending',
                    reviewer_note = ?
                WHERE prediction_id = ?
                  AND review_status != 'verified'
                """,
                (
                    reviewer_note,
                    prediction_id,
                ),
            )

        # ----------------------------------------------------
        # Correct feedback
        # ----------------------------------------------------

        else:

            connection.execute(
                """
                UPDATE predictions
                SET review_status = 'not_required'
                WHERE prediction_id = ?
                  AND review_status != 'verified'
                """,
                (prediction_id,),
            )

        connection.commit()


# ============================================================
# FEEDBACK STATS
# ============================================================

def get_feedback_stats():
    """
    Return aggregate user-feedback statistics.
    """

    with closing(get_connection()) as connection:

        total_feedback = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM feedback
            """
        ).fetchone()["count"]

        correct_feedback = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM feedback
            WHERE is_correct = 1
            """
        ).fetchone()["count"]

        incorrect_feedback = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM feedback
            WHERE is_correct = 0
            """
        ).fetchone()["count"]

    feedback_rate = None

    if total_feedback > 0:
        feedback_rate = round(
            (
                correct_feedback
                / total_feedback
            ) * 100,
            2,
        )

    return {
        "total_feedback": total_feedback,
        "correct_feedback": correct_feedback,
        "incorrect_feedback": incorrect_feedback,
        "correct_feedback_rate": feedback_rate,
    }


# ============================================================
# MAIN STATS
# ============================================================

def get_stats():
    """
    Return dashboard-level prediction statistics.

    These statistics describe AI prediction categories.
    Manual verification is tracked separately.
    """

    with closing(get_connection()) as connection:

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Categories
        # ----------------------------------------------------

        recyclable = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE category = 'Recyclable'
            """
        ).fetchone()["count"]

        organic = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE category = 'Organic'
            """
        ).fetchone()["count"]

        hazardous = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE category = 'Hazardous'
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Confidence
        # ----------------------------------------------------

        high_confidence = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE confidence >= 90
            """
        ).fetchone()["count"]

        review_recommended = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE confidence >= 75
              AND confidence < 90
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Review
        # ----------------------------------------------------

        needs_review = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE review_status = 'pending'
            """
        ).fetchone()["count"]

        verified = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE review_status = 'verified'
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Today's predictions
        # ----------------------------------------------------

        today = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM predictions
            WHERE DATE(created_at) = DATE('now')
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Most detected category
        # ----------------------------------------------------

        most_common = connection.execute(
            """
            SELECT category, COUNT(*) AS count
            FROM predictions
            GROUP BY category
            ORDER BY count DESC
            LIMIT 1
            """
        ).fetchone()

    # --------------------------------------------------------
    # Feedback
    # --------------------------------------------------------

    feedback = get_feedback_stats()

    return {
        # Existing API fields
        "total_predictions": total,
        "recyclable": recyclable,
        "organic": organic,
        "hazardous": hazardous,
        "most_detected_category": (
            most_common["category"]
            if most_common
            else None
        ),

        # Dashboard fields
        "today_predictions": today,
        "high_confidence": high_confidence,
        "review_recommended": review_recommended,
        "needs_review": needs_review,
        "verified": verified,

        # Feedback fields
        "total_feedback": feedback[
            "total_feedback"
        ],
        "correct_feedback": feedback[
            "correct_feedback"
        ],
        "incorrect_feedback": feedback[
            "incorrect_feedback"
        ],
        "correct_feedback_rate": feedback[
            "correct_feedback_rate"
        ],
    }


# ============================================================
# DELETE ALL HISTORY
# ============================================================

def clear_predictions():
    """
    Permanently clear prediction history and feedback.

    This function is intentionally kept for development/admin
    use. The API/UI should require explicit confirmation before
    calling it.
    """

    with closing(get_connection()) as connection:

        connection.execute(
            """
            DELETE FROM feedback
            """
        )

        connection.execute(
            """
            DELETE FROM predictions
            """
        )

        connection.commit()