from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO

from models import RawDataResponse, UploadResponse
from demo_data import load_all, df_preview

app = FastAPI(title="PayDrift API")

# --- CORS (allow frontend to connect) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory store for uploaded data ---
# Starts with demo data, gets replaced if user uploads CSVs
datasets: dict[str, pd.DataFrame] = {}


@app.on_event("startup")
def startup():
    """Load demo data into memory when the server starts."""
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
    payroll = datasets.get("payroll")
    ai_costs = datasets.get("ai_costs")
    saas_cloud = datasets.get("saas_cloud")

    if payroll is None or ai_costs is None or saas_cloud is None:
        raise HTTPException(status_code=500, detail="Demo data not loaded")

    return RawDataResponse(
        payroll_rows=len(payroll),
        ai_costs_rows=len(ai_costs),
        saas_cloud_rows=len(saas_cloud),
        payroll_columns=list(payroll.columns),
        ai_costs_columns=list(ai_costs.columns),
        saas_cloud_columns=list(saas_cloud.columns),
        payroll_sample=df_preview(payroll),
        ai_costs_sample=df_preview(ai_costs),
        saas_cloud_sample=df_preview(saas_cloud),
    )


# --- POST /api/upload ---
# Accepts a CSV file, parses it, stores in memory
@app.post("/api/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    dataset_type: str = "payroll",  # "payroll" | "ai_costs" | "saas_cloud"
):
    # Validate dataset type
    valid_types = ["payroll", "ai_costs", "saas_cloud"]
    if dataset_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"dataset_type must be one of: {valid_types}"
        )

    # Validate file type
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="File must be .csv, .xlsx, or .xls"
        )

    # Read file contents
    contents = await file.read()

    # Parse based on file type
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(contents))
        else:
            df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Clean column names
    df.columns = df.columns.str.strip()

    # Try to parse month column if it exists
    if "month" in df.columns:
        df["month"] = pd.to_datetime(df["month"])

    # Store in memory (replaces demo data for this type)
    datasets[dataset_type] = df
    print(f"Uploaded {file.filename} as {dataset_type}: {len(df)} rows")

    return UploadResponse(
        filename=file.filename,
        rows=len(df),
        columns=list(df.columns),
        sample=df_preview(df),
    )


# --- POST /api/reset ---
# Reset to demo data (useful after uploading custom data)
@app.post("/api/reset")
def reset_data():
    global datasets
    datasets = load_all()
    return {"status": "reset to demo data"}