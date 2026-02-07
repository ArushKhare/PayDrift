import pandas as pd
from demo_data import load_all


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


def analyze_all(datasets: dict[str, pd.DataFrame] = None) -> dict:
    """
    Run drift calculations on all 3 datasets.
    Returns structured data matching DriftResponse model.
    """
    if datasets is None:
        datasets = load_all()

    payroll = datasets["payroll"]
    ai_costs = datasets["ai_costs"]
    saas = datasets["saas_cloud"]

    # --- Drift calculations ---
    payroll_drift = calculate_drift(payroll, "month", "total", ["department", "type"])
    ai_drift = calculate_drift(ai_costs, "month", "cost", ["team", "service"])
    saas_drift = calculate_drift(saas, "month", "monthly_cost", ["service"])

    # --- Monthly trends ---
    payroll_trend = monthly_trend(payroll, "month", "total")
    ai_trend = monthly_trend(ai_costs, "month", "cost")
    saas_trend = monthly_trend(saas, "month", "monthly_cost")

    # --- Build category summaries ---
    def build_category(drift_df, category, label, group_cols):
        items = []
        for _, row in drift_df.iterrows():
            item_name = " - ".join(str(row[c]) for c in group_cols)
            items.append({
                "item": item_name,
                "category": category,
                "avg_before": round(row["avg_before"], 2),
                "avg_after": round(row["avg_after"], 2),
                "drift": round(row["drift"], 2),
                "drift_pct": round(row["drift_pct"], 2) if pd.notna(row["drift_pct"]) else 0.0,
            })

        total_before = drift_df["avg_before"].sum()
        total_after = drift_df["avg_after"].sum()
        total_drift = drift_df["drift"].sum()
        cat_drift_pct = (total_drift / total_before * 100) if total_before != 0 else 0

        return {
            "category": category,
            "label": label,
            "total_drift": round(total_drift, 2),
            "total_before": round(total_before, 2),
            "total_after": round(total_after, 2),
            "drift_pct": round(cat_drift_pct, 2),
            "items": items,
        }

    categories = [
        build_category(payroll_drift, "people", "People", ["department", "type"]),
        build_category(ai_drift, "ai_llm", "AI/LLM", ["team", "service"]),
        build_category(saas_drift, "saas_cloud", "SaaS/Cloud", ["service"]),
    ]

    # --- Build monthly trends ---
    # Merge all 3 trends into one list of {month, people, ai_llm, saas_cloud}
    all_months = sorted(set(
        payroll_trend["month"].tolist() +
        ai_trend["month"].tolist() +
        saas_trend["month"].tolist()
    ))

    p_map = dict(zip(payroll_trend["month"], payroll_trend["total"]))
    a_map = dict(zip(ai_trend["month"], ai_trend["cost"]))
    s_map = dict(zip(saas_trend["month"], saas_trend["monthly_cost"]))

    monthly_trends = []
    for m in all_months:
        month_str = m if isinstance(m, str) else m.strftime("%Y-%m")
        monthly_trends.append({
            "month": month_str,
            "people": round(p_map.get(m, 0), 2),
            "ai_llm": round(a_map.get(m, 0), 2),
            "saas_cloud": round(s_map.get(m, 0), 2),
        })

    # --- Totals ---
    total_monthly_drift = sum(c["total_drift"] for c in categories)
    annualized_drift = total_monthly_drift * 12

    return {
        "total_monthly_drift": round(total_monthly_drift, 2),
        "annualized_drift": round(annualized_drift, 2),
        "categories": categories,
        "monthly_trends": monthly_trends,
    }