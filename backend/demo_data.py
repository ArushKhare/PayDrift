import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def load_payroll() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "payroll.csv")
    df.columns = df.columns.str.strip()
    df["month"] = pd.to_datetime(df["month"])
    return df


def load_ai_costs() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "ai_costs.csv")
    df.columns = df.columns.str.strip()
    df["month"] = pd.to_datetime(df["month"])
    return df


def load_saas() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "saas_cloud.csv")
    df.columns = df.columns.str.strip()
    df["month"] = pd.to_datetime(df["month"])
    return df


def load_all() -> dict[str, pd.DataFrame]:
    """Load all 3 datasets. Returns dict with keys: payroll, ai_costs, saas_cloud"""
    return {
        "payroll": load_payroll(),
        "ai_costs": load_ai_costs(),
        "saas_cloud": load_saas(),
    }


def df_preview(df: pd.DataFrame, n: int = 5) -> list[dict]:
    """Return first n rows as list of dicts (for API response)."""
    # Convert timestamps to strings so JSON serialization works
    preview = df.head(n).copy()
    for col in preview.select_dtypes(include=["datetime64"]).columns:
        preview[col] = preview[col].dt.strftime("%Y-%m")
    return preview.to_dict(orient="records")