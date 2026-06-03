#!/usr/bin/env python3
"""MCP server for Health Auto Export — queries the HAE REST API."""

import os
import json
import httpx
from mcp.server.fastmcp import FastMCP

HAE_API_URL = os.environ.get("HAE_API_URL", "http://127.0.0.1:3001")
HAE_READ_TOKEN = os.environ["HAE_READ_TOKEN"]
HAE_WRITE_TOKEN = os.environ.get("HAE_WRITE_TOKEN", "")

mcp = FastMCP("health-auto-export")

HEADERS_READ = {"api-key": HAE_READ_TOKEN}
HEADERS_WRITE = {"api-key": HAE_WRITE_TOKEN}


async def _get(path: str, params: dict | None = None) -> dict | list:
    async with httpx.AsyncClient(base_url=HAE_API_URL, timeout=30) as client:
        r = await client.get(path, headers=HEADERS_READ, params=params)
        r.raise_for_status()
        return r.json()


async def _post(path: str, data: dict) -> dict:
    async with httpx.AsyncClient(base_url=HAE_API_URL, timeout=60) as client:
        r = await client.post(path, headers=HEADERS_WRITE, json=data)
        r.raise_for_status()
        return r.json()


METRIC_NAMES = [
    "active_energy", "basal_energy_burned", "apple_exercise_time",
    "step_count", "walking_running_distance", "flights_climbed",
    "cycling_distance", "swimming_distance", "vo2max",
    "heart_rate", "resting_heart_rate", "heart_rate_variability",
    "walking_heart_rate", "blood_pressure",
    "weight_body_mass", "body_fat_percentage", "body_mass_index", "lean_body_mass",
    "sleep_analysis", "apple_sleeping_wrist_temperature", "breathing_disturbances",
    "respiratory_rate", "blood_oxygen_saturation",
    "body_temperature", "basal_body_temperature",
    "blood_glucose", "insulin_delivery",
    "dietary_energy", "dietary_water", "dietary_sugar", "protein",
    "carbohydrates", "total_fat", "saturated_fat", "fiber",
    "vitamin_a", "vitamin_b6", "vitamin_b12", "vitamin_c", "vitamin_d",
    "vitamin_e", "vitamin_k", "calcium", "iron", "magnesium", "zinc",
    "potassium", "sodium", "folate", "biotin", "caffeine",
    "cholesterol", "selenium", "copper", "manganese", "chromium",
    "iodine", "molybdenum", "chloride", "niacin", "riboflavin",
    "thiamin", "pantothenic_acid",
    "mindful_minutes", "time_in_daylight", "handwashing",
    "environmental_audio", "headphone_audio", "uv_exposure",
]


@mcp.tool()
async def list_available_metrics() -> str:
    """List all known health metric names that can be queried."""
    return json.dumps(METRIC_NAMES, indent=2)


@mcp.tool()
async def get_metric(
    metric_name: str,
    from_date: str = "",
    to_date: str = "",
) -> str:
    """Query a health metric by name. Dates are ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).

    Examples:
        get_metric("heart_rate", "2025-01-01", "2025-01-31")
        get_metric("sleep_analysis", "2025-06-01", "2025-06-03")
        get_metric("weight_body_mass")
    """
    params = {}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    data = await _get(f"/api/metrics/{metric_name}", params)
    return json.dumps(data, indent=2, default=str)


@mcp.tool()
async def get_workouts(
    start_date: str = "",
    end_date: str = "",
) -> str:
    """List workouts, optionally filtered by date range (ISO format)."""
    params = {}
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    data = await _get("/api/workouts", params)
    return json.dumps(data, indent=2, default=str)


@mcp.tool()
async def get_workout_detail(workout_id: str) -> str:
    """Get detailed workout data including heart rate and GPS route."""
    data = await _get(f"/api/workouts/{workout_id}")
    return json.dumps(data, indent=2, default=str)


@mcp.tool()
async def ingest_health_data(payload_json: str) -> str:
    """Ingest health data (same format as Health Auto Export app sends).

    The payload should match the HAE JSON format:
    {
        "data": {
            "metrics": [...],
            "workouts": [...]
        }
    }
    """
    if not HAE_WRITE_TOKEN:
        return json.dumps({"error": "WRITE_TOKEN not configured"})
    data = json.loads(payload_json)
    result = await _post("/api/data", data)
    return json.dumps(result, indent=2)


@mcp.tool()
async def health_summary(from_date: str = "", to_date: str = "") -> str:
    """Get a summary of key health metrics for a date range.

    Fetches: steps, active energy, heart rate, sleep, weight, HRV.
    """
    key_metrics = [
        "step_count", "active_energy", "heart_rate",
        "resting_heart_rate", "heart_rate_variability",
        "sleep_analysis", "weight_body_mass",
    ]
    summary = {}
    for name in key_metrics:
        try:
            params = {}
            if from_date:
                params["from"] = from_date
            if to_date:
                params["to"] = to_date
            data = await _get(f"/api/metrics/{name}", params)
            if isinstance(data, list):
                summary[name] = {"count": len(data), "latest": data[-1] if data else None}
            else:
                summary[name] = data
        except Exception as e:
            summary[name] = {"error": str(e)}
    return json.dumps(summary, indent=2, default=str)


if __name__ == "__main__":
    mcp.run(transport="stdio")
