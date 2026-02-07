from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO
import numpy as np

from models import RawDataResponse, DriftResponse, UploadResponse
from demo_data import load_all, df_preview
from drift import analyze_all

app = FastAPI(title="PayDrift API")

# --- CORS (allow frontend to connect) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory store for uploaded data ---
datasets: dict[str, pd.DataFrame] = {}


@app.on_event("startup")
def startup():
    global datasets
    datasets = load_all()
    print(f"Loaded demo data:")
    print(f"  payroll:    {len(datasets['payroll'])} rows")
    print(f"  ai_costs:   {len(datasets['ai_costs'])} rows")
    print(f"  saas_cloud: {len(datasets['saas_cloud'])} rows")


# --- Health check ---
@app.get("/health")
def health():
    return {"status": "ok", "datasets_loaded": list(datasets.keys())}


# --- GET /api/drift ---
# Phase 1: Returns raw data summary + samples
# Phase 2: Will return actual drift calculations
@app.get("/api/drift", response_model=RawDataResponse)
def get_drift():
    if not datasets:
        raise HTTPException(status_code=500, detail="Demo data not loaded")
    return analyze_all(datasets)


# ════════════════════════════════════════════════════════════
# HEALTH / UPLOAD / RESET
# ════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "datasets_loaded": list(datasets.keys())}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    dataset_type: str = "payroll",
):
    valid_types = ["payroll", "ai_costs", "saas_cloud"]
    if dataset_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"dataset_type must be one of: {valid_types}")

    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .csv, .xlsx, or .xls")

    contents = await file.read()

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(contents))
        else:
            df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    df.columns = df.columns.str.strip()

    if "month" in df.columns:
        df["month"] = pd.to_datetime(df["month"])

    datasets[dataset_type] = df
    print(f"Uploaded {file.filename} as {dataset_type}: {len(df)} rows")

    return UploadResponse(
        filename=file.filename,
        rows=len(df),
        columns=list(df.columns),
        sample=df_preview(df),
    )


@app.post("/api/reset")
def reset_data():
    global datasets
    datasets = load_all()
    return {"status": "reset to demo data"}