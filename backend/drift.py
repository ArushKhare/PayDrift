import pandas as pd

# Core Drift Function
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
    latest = latest[latest[total_col] != ""]
    latest[total_col] = latest[total_col].astype(float)
    latest[active_col] = latest[active_col].astype(float)
    latest["utilization"] = latest[active_col] / latest[total_col]
    latest["flagged"] = latest["utilization"] < threshold
    return latest[[service_col, total_col, active_col, "utilization", "flagged"]]


# ============================================================
# Load Data
payroll = pd.read_csv("payroll.csv")
ai_costs = pd.read_csv("ai_costs.csv")
saas = pd.read_csv("saas_cloud.csv")

# Apply Drift
payroll_drift = calculate_drift(payroll, "month", "total", ["department", "type"])
ai_drift = calculate_drift(ai_costs, "month", "cost", ["team", "service"])
saas_drift = calculate_drift(saas, "month", "monthly_cost", ["service"])

# Monthly Trends
payroll_trend = monthly_trend(payroll, "month", "total")
ai_trend = monthly_trend(ai_costs, "month", "cost")
saas_trend = monthly_trend(saas, "month", "monthly_cost")

# SAAS Utilization
saas_util = utilization_flag(saas, "month", "total_seats", "active_seats", "service")