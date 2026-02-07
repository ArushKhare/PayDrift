from pydantic import BaseModel


# --- Individual drift item (one row in the breakdown table) ---
class DriftItem(BaseModel):
    item: str                # e.g. "Engineering - FTE" or "OpenAI - GPT-4"
    category: str            # "people" | "ai_llm" | "saas_cloud"
    avg_before: float        # avg monthly spend in prior 3 months
    avg_after: float         # avg monthly spend in recent 3 months
    drift: float             # avg_after - avg_before
    drift_pct: float         # percentage change


# --- One category summary (People, AI/LLM, or SaaS/Cloud) ---
class DriftSummary(BaseModel):
    category: str            # "people" | "ai_llm" | "saas_cloud"
    label: str               # "People" | "AI/LLM" | "SaaS/Cloud"
    total_drift: float       # sum of all drift in this category
    total_before: float      # sum of avg_before across items
    total_after: float       # sum of avg_after across items
    drift_pct: float         # overall % change for the category
    items: list[DriftItem]   # item-level breakdown


# --- Monthly trend data point (for line charts) ---
class TrendPoint(BaseModel):
    month: str               # "2025-01"
    people: float
    ai_llm: float
    saas_cloud: float


# --- Full API response ---
class DriftResponse(BaseModel):
    total_monthly_drift: float    # sum across all categories
    annualized_drift: float       # total_monthly_drift * 12
    categories: list[DriftSummary]
    monthly_trends: list[TrendPoint]


# --- Raw data response (Phase 1: before drift calc exists) ---
class RawDataResponse(BaseModel):
    payroll_rows: int
    ai_costs_rows: int
    saas_cloud_rows: int
    payroll_columns: list[str]
    ai_costs_columns: list[str]
    saas_cloud_columns: list[str]
    payroll_sample: list[dict]     # first 5 rows as dicts
    ai_costs_sample: list[dict]
    saas_cloud_sample: list[dict]


# --- Chat request/response ---
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []       # previous messages: [{"role": "user", "content": "..."}, ...]


class ChatResponse(BaseModel):
    response: str


# --- Upload response ---
class UploadResponse(BaseModel):
    filename: str
    rows: int
    columns: list[str]
    sample: list[dict]             # first 5 rows preview