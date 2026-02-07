from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO
import numpy as np

from models import RawDataResponse, UploadResponse
from demo_data import load_all, df_preview

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


# ════════════════════════════════════════════════════════════
# ANALYSIS FUNCTIONS
# ════════════════════════════════════════════════════════════

def calculate_drift(df, date_col, amount_col, group_cols, n_periods=3):
    dates_sorted = sorted(df[date_col].unique())
    cutoff = dates_sorted[-n_periods]
    before = df[df[date_col] < cutoff].groupby(group_cols)[amount_col].mean()
    after = df[df[date_col] >= cutoff].groupby(group_cols)[amount_col].mean()
    result = pd.DataFrame({"avg_before": before, "avg_after": after}).fillna(0)
    result["drift"] = result["avg_after"] - result["avg_before"]
    result["drift_pct"] = (result["drift"] / result["avg_before"].replace(0, float("nan"))) * 100
    return result.sort_values("drift", key=abs, ascending=False).reset_index()


def monthly_trend(df, date_col, amount_col):
    return df.groupby(date_col)[amount_col].sum().reset_index()


def utilization_flag(df, date_col, total_col, active_col, service_col, threshold=0.3):
    latest = df[df[date_col] == df[date_col].max()].copy()
    latest = latest[latest[total_col].notna() & (latest[total_col] != "")]
    latest[total_col] = latest[total_col].astype(float)
    latest[active_col] = latest[active_col].astype(float)
    latest["utilization"] = latest[active_col] / latest[total_col]
    latest["flagged"] = latest["utilization"] < threshold
    return latest[[service_col, total_col, active_col, "utilization", "flagged"]]


# ════════════════════════════════════════════════════════════
# DRIFT ENDPOINTS (must be before /api/drift)
# ════════════════════════════════════════════════════════════

@app.get("/api/drift/payroll")
def drift_payroll():
    df = datasets["payroll"]
    result = calculate_drift(df, "month", "total", ["department", "type"])
    return result.replace({np.nan: None}).to_dict(orient="records")


@app.get("/api/drift/ai-costs")
def drift_ai():
    df = datasets["ai_costs"]
    result = calculate_drift(df, "month", "cost", ["team", "service"])
    return result.replace({np.nan: None}).to_dict(orient="records")


@app.get("/api/drift/saas")
def drift_saas():
    df = datasets["saas_cloud"]
    result = calculate_drift(df, "month", "monthly_cost", ["service"])
    return result.replace({np.nan: None}).to_dict(orient="records")


# ════════════════════════════════════════════════════════════
# TREND ENDPOINTS
# ════════════════════════════════════════════════════════════

@app.get("/api/trends/payroll")
def trends_payroll():
    df = datasets["payroll"]
    result = monthly_trend(df, "month", "total")
    return result.to_dict(orient="records")


@app.get("/api/trends/ai-costs")
def trends_ai():
    df = datasets["ai_costs"]
    result = monthly_trend(df, "month", "cost")
    return result.to_dict(orient="records")


@app.get("/api/trends/saas")
def trends_saas():
    df = datasets["saas_cloud"]
    result = monthly_trend(df, "month", "monthly_cost")
    return result.to_dict(orient="records")


# ════════════════════════════════════════════════════════════
# UTILIZATION ENDPOINT
# ════════════════════════════════════════════════════════════

@app.get("/api/utilization/saas")
def utilization_saas():
    df = datasets["saas_cloud"]
    result = utilization_flag(df, "month", "total_seats", "active_seats", "service")
    return result.to_dict(orient="records")


# ════════════════════════════════════════════════════════════
# RAW DATA SUMMARY (generic /api/drift AFTER specific routes)
# ════════════════════════════════════════════════════════════

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