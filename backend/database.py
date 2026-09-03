import sqlite3
from pathlib import Path
from datetime import datetime, timezone
import json


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "eco_sort.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()

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
            created_at TEXT NOT NULL
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            corrected_category TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


def save_prediction(
    prediction_id,
    filename,
    detected_item,
    category,
    confidence,
    top_predictions,
    processing_time_ms,
    model_version,
):
    connection = get_connection()

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
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            prediction_id,
            filename,
            detected_item,
            category,
            confidence,
            json.dumps(top_predictions),
            processing_time_ms,
            model_version,
            datetime.now(timezone.utc).isoformat(),
        ),
    )

    connection.commit()
    connection.close()


def get_history(limit=20):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM predictions
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    connection.close()

    results = []

    for row in rows:
        item = dict(row)

        try:
            item["top_predictions"] = json.loads(
                item["top_predictions"]
            )
        except Exception:
            item["top_predictions"] = []

        results.append(item)

    return results


def get_prediction(prediction_id):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM predictions
        WHERE prediction_id = ?
        """,
        (prediction_id,),
    ).fetchone()

    connection.close()

    if not row:
        return None

    item = dict(row)

    try:
        item["top_predictions"] = json.loads(
            item["top_predictions"]
        )
    except Exception:
        item["top_predictions"] = []

    return item


def save_feedback(
    prediction_id,
    is_correct,
    corrected_category=None,
):
    connection = get_connection()

    connection.execute(
        """
        INSERT INTO feedback (
            prediction_id,
            is_correct,
            corrected_category,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            prediction_id,
            int(is_correct),
            corrected_category,
            datetime.now(timezone.utc).isoformat(),
        ),
    )

    connection.commit()
    connection.close()


def get_stats():
    connection = get_connection()

    total = connection.execute(
        "SELECT COUNT(*) AS count FROM predictions"
    ).fetchone()["count"]

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

    most_common = connection.execute(
        """
        SELECT category, COUNT(*) AS count
        FROM predictions
        GROUP BY category
        ORDER BY count DESC
        LIMIT 1
        """
    ).fetchone()

    connection.close()

    return {
        "total_predictions": total,
        "recyclable": recyclable,
        "organic": organic,
        "hazardous": hazardous,
        "most_detected_category": (
            most_common["category"]
            if most_common
            else None
        ),
    }