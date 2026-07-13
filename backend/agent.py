from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

client = AsyncAnthropic()

MODEL = "claude-haiku-4-5"

SYSTEM = """You are PayDrift, an elite financial AI agent. Sharp, direct, data-driven. You speak like a trusted CFO advisor. No fluff. Every sentence must reference specific numbers from the data. Rank recommendations by (savings × ease)."""

ANALYZE = """Given this drift data, provide:

## 🔍 Analysis
2-3 sentences. Be specific with numbers. Identify root causes.

## 🎯 Top Recommendations
5 actions ranked by impact. Each: **Action** (1 sentence), **Saves** ($/mo), **Effort** (Easy/Medium/Hard), **Timeline** (Immediate/2 weeks/1 month)

## ⚡ Quick Win
Single easiest thing to do TODAY.

## 📊 Risk Alert
Most dangerous trend if unchecked 6 months. Project the cost."""


async def format_drift_for_ai(drift_data: dict) -> str:
    lines = ["COMPANY SPEND DRIFT REPORT",
             f"Total: ${drift_data['total_monthly_drift']:,.0f}/mo (${drift_data['annualized_drift']:,.0f}/yr)", ""]
    for cat in drift_data.get("categories", []):
        lines.append(f"{cat['label'].upper()} — {cat['total_drift']:+,.0f}/mo ({cat['drift_pct']:+.1f}%)")
        for item in cat.get("items", [])[:5]:
            lines.append(f"  {item['item']}: {item['drift']:+,.0f}/mo ({item['drift_pct']:+.1f}%)")
        lines.append("")
    return "\n".join(lines)


async def analyze_drift(summary: str) -> str:
    response = await client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM,
        messages=[
            {"role": "user", "content": f"{ANALYZE}\n\nHere is the drift data:\n\n{summary}"}
        ],
    )
    return response.content[0].text


async def chat_with_agent(message: str, history: list, summary: str) -> str:
    messages = []
    for h in history:
        role = "user" if h.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": h["content"]})
    messages.append({"role": "user", "content": message})

    response = await client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=f"{SYSTEM}\n\nCurrent company drift data:\n{summary}\n\nAnswer based on the data. Be specific with numbers.",
        messages=messages,
    )
    return response.content[0].text
