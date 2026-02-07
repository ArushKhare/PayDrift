import asyncio
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

load_dotenv()

client = AsyncDedalus()
runner = DedalusRunner(client)

MODEL = "anthropic/claude-sonnet-4-20250514"

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
    response = await runner.run(
        input=f"{SYSTEM}\n\n{ANALYZE}\n\nHere is the drift data:\n\n{summary}",
        model=MODEL,
    )
    return response.final_output


async def chat_with_agent(message: str, history: list, summary: str) -> str:
    # Build context from history
    context_parts = [f"{SYSTEM}\n\nCurrent company drift data:\n{summary}\n\nConversation so far:"]
    for h in history:
        role = "User" if h.get("role") in ("user",) else "Assistant"
        context_parts.append(f"{role}: {h['content']}")
    context_parts.append(f"User: {message}")
    context_parts.append("Answer based on the data. Be specific with numbers.")

    response = await runner.run(
        input="\n\n".join(context_parts),
        model=MODEL,
    )
    return response.final_output