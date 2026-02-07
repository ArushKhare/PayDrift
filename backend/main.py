from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO

from models import (
    RawDataResponse, DriftResponse, UploadResponse,
    ChatRequest, ChatResponse,
    UserRegister, UserLogin, TokenResponse,
)
from demo_data import load_all, df_preview
from drift import analyze_all
from agent import format_drift_for_ai, analyze_drift, chat_with_agent
from auth import (
    users_db, hash_password, verify_password,
    create_access_token, get_current_user,
)

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


# --- POST /api/register ---
@app.post("/api/register", response_model=TokenResponse)
def register(body: UserRegister):
    if body.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[body.email] = {
        "email": body.email,
        "name": body.name,
        "hashed_password": hash_password(body.password),
    }
    token = create_access_token({"sub": body.email})
    return TokenResponse(access_token=token, name=body.name, email=body.email)


# --- POST /api/login ---
@app.post("/api/login", response_model=TokenResponse)
def login(body: UserLogin):
    user = users_db.get(body.email)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": body.email})
    return TokenResponse(access_token=token, name=user["name"], email=user["email"])


# --- GET /api/me ---
@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return {"email": user["email"], "name": user["name"]}


# --- GET /api/drift ---
# Returns drift calculations for all 3 datasets
@app.get("/api/drift")
def get_drift(user: dict = Depends(get_current_user)):
    if not datasets:
        raise HTTPException(status_code=500, detail="Demo data not loaded")
    return analyze_all(datasets)


# --- POST /api/upload ---
# Accepts a CSV file, parses it, stores in memory
@app.post("/api/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    dataset_type: str = "payroll",  # "payroll" | "ai_costs" | "saas_cloud"
    user: dict = Depends(get_current_user),
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
def reset_data(user: dict = Depends(get_current_user)):
    global datasets
    datasets = load_all()
    return {"status": "reset to demo data"}



# --- POST /api/analyze ---
# AI analyzes all drift data and returns insights + recommendations
@app.post("/api/analyze")
async def analyze(user: dict = Depends(get_current_user)):
    if not datasets:
        raise HTTPException(status_code=500, detail="No data loaded")

    drift_data = analyze_all(datasets)
    summary = await format_drift_for_ai(drift_data)
    analysis = await analyze_drift(summary)
    return {"analysis": analysis}


# --- POST /api/chat ---
# AI answers follow-up questions with drift data context
@app.post("/api/chat")
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    if not datasets:
        raise HTTPException(status_code=500, detail="No data loaded")

    drift_data = analyze_all(datasets)
    summary = await format_drift_for_ai(drift_data)
    response = await chat_with_agent(req.message, req.history, summary)
    return {"response": response}