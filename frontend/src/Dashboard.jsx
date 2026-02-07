import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Users, Bot, Cloud, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

const API = "http://localhost:8000";

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
const fmt = (n) =>
  "$" + Math.abs(Math.round(n)).toLocaleString();

const fmtPct = (n) =>
  (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

const sumDrift = (rows) =>
  rows.reduce((s, r) => s + (r.drift || 0), 0);

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("payroll");

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API}/api/drift/payroll`).then((r) => r.json()),
      fetch(`${API}/api/drift/ai-costs`).then((r) => r.json()),
      fetch(`${API}/api/drift/saas`).then((r) => r.json()),
      fetch(`${API}/api/trends/payroll`).then((r) => r.json()),
      fetch(`${API}/api/trends/ai-costs`).then((r) => r.json()),
      fetch(`${API}/api/trends/saas`).then((r) => r.json()),
      fetch(`${API}/api/utilization/saas`).then((r) => r.json()),
    ])
      .then(
        ([
          driftPayroll,
          driftAI,
          driftSaas,
          trendPayroll,
          trendAI,
          trendSaas,
          utilization,
        ]) => {
          setData({
            driftPayroll,
            driftAI,
            driftSaas,
            trendPayroll,
            trendAI,
            trendSaas,
            utilization,
          });
          setLoading(false);
        }
      )
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm tracking-wide uppercase">
            Loading drift analysis…
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-zinc-300">Failed to load data</p>
          <p className="text-zinc-500 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Compute totals ──
  const totalPayrollDrift = sumDrift(data.driftPayroll);
  const totalAIDrift = sumDrift(data.driftAI);
  const totalSaasDrift = sumDrift(data.driftSaas);
  const totalDrift = totalPayrollDrift + totalAIDrift + totalSaasDrift;
  const annualized = totalDrift * 12;

  const categories = [
    {
      key: "payroll",
      label: "People",
      icon: Users,
      drift: totalPayrollDrift,
      color: "#a78bfa",
      driftData: data.driftPayroll,
      trendData: data.trendPayroll,
      trendKey: "total",
      groupCols: ["department", "type"],
    },
    {
      key: "ai",
      label: "AI / LLM",
      icon: Bot,
      drift: totalAIDrift,
      color: "#f472b6",
      driftData: data.driftAI,
      trendData: data.trendAI,
      trendKey: "cost",
      groupCols: ["team", "service"],
    },
    {
      key: "saas",
      label: "SaaS & Cloud",
      icon: Cloud,
      drift: totalSaasDrift,
      color: "#38bdf8",
      driftData: data.driftSaas,
      trendData: data.trendSaas,
      trendKey: "monthly_cost",
      groupCols: ["service"],
    },
  ];

  const active = categories.find((c) => c.key === activeTab) || categories[0];

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* ═══════ HEADER ═══════ */}
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #ec4899)",
            }}
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            DriftWatch
          </span>
        </div>
        <span className="text-xs text-zinc-500 tracking-wide uppercase">
          Jan – Jun 2025
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ═══════ HERO BANNER ═══════ */}
        <div
          className="relative overflow-hidden rounded-2xl border border-red-500/30 p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(153,27,27,0.08) 100%)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, #ef4444, transparent)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-red-400 uppercase tracking-widest">
                Unplanned Spend Detected
              </span>
            </div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span
                className="text-6xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {fmt(totalDrift)}
              </span>
              <span className="text-xl text-red-300/80">/month</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-zinc-400">
              <span className="text-lg">→</span>
              <span
                className="text-lg font-medium text-red-300"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {fmt(annualized)}
              </span>
              <span className="text-sm">/year in drift</span>
            </div>
          </div>
        </div>

        {/* ═══════ METRIC CARDS ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const isUp = cat.drift > 0;
            const Arrow = isUp ? TrendingUp : TrendingDown;
            const pctValues = cat.driftData
              .filter((r) => r.avg_before > 0)
              .map((r) => r.drift_pct);
            const avgPct =
              pctValues.length > 0
                ? pctValues.reduce((a, b) => a + b, 0) / pctValues.length
                : 0;

            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`text-left rounded-xl border p-5 transition-all duration-200 ${
                  activeTab === cat.key
                    ? "border-zinc-600 bg-zinc-800/80 shadow-lg shadow-zinc-900/50"
                    : "border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/40 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cat.color + "18" }}
                  >
                    <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <Arrow
                    className={`w-5 h-5 ${isUp ? "text-red-400" : "text-emerald-400"}`}
                  />
                </div>
                <p className="text-sm text-zinc-400 mb-1">{cat.label}</p>
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  <span className={isUp ? "text-red-400" : "text-emerald-400"}>
                    {isUp ? "+" : ""}
                    {fmt(cat.drift)}
                  </span>
                </p>
                <p
                  className={`text-xs mt-1 ${isUp ? "text-red-400/70" : "text-emerald-400/70"}`}
                >
                  {fmtPct(avgPct)} avg drift
                </p>
              </button>
            );
          })}
        </div>

        {/* ═══════ TREND CHART ═══════ */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Monthly Spend — {active.label}
            </h2>
            <div className="flex gap-1 bg-zinc-800/80 rounded-lg p-0.5">
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveTab(c.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === c.key
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={active.trendData}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={active.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v)}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "'DM Mono', monospace",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: active.color }}
                formatter={(v) => ["$" + Math.round(v).toLocaleString(), "Spend"]}
              />
              <Area
                type="monotone"
                dataKey={active.trendKey}
                stroke={active.color}
                strokeWidth={2.5}
                fill="url(#areaFill)"
                dot={false}
                activeDot={{ r: 5, fill: active.color, stroke: "#18181b", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ═══════ DRIFT BREAKDOWN TABLE ═══════ */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Drift Breakdown — {active.label}
            </h2>
            <span className="text-xs text-zinc-600">
              Sorted by largest drift
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                  {active.groupCols.map((col) => (
                    <th key={col} className="px-6 py-3 font-medium">
                      {col}
                    </th>
                  ))}
                  <th className="px-6 py-3 font-medium text-right">Avg Before</th>
                  <th className="px-6 py-3 font-medium text-right">Avg After</th>
                  <th className="px-6 py-3 font-medium text-right">Drift ($)</th>
                  <th className="px-6 py-3 font-medium text-right">Drift (%)</th>
                </tr>
              </thead>
              <tbody>
                {active.driftData.map((row, i) => {
                  const severity =
                    Math.abs(row.drift_pct || 0) > 20
                      ? "bg-red-950/30"
                      : Math.abs(row.drift_pct || 0) > 10
                      ? "bg-red-950/15"
                      : "";
                  const isUp = row.drift > 0;

                  return (
                    <tr
                      key={i}
                      className={`border-t border-zinc-800/40 transition-colors hover:bg-zinc-800/30 ${severity}`}
                    >
                      {active.groupCols.map((col) => (
                        <td
                          key={col}
                          className="px-6 py-3 text-zinc-300 font-medium"
                        >
                          {row[col]}
                        </td>
                      ))}
                      <td
                        className="px-6 py-3 text-right text-zinc-400"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {fmt(row.avg_before)}
                      </td>
                      <td
                        className="px-6 py-3 text-right text-zinc-300"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {fmt(row.avg_after)}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-semibold ${
                          isUp ? "text-red-400" : "text-emerald-400"
                        }`}
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {isUp ? "+" : ""}
                        {fmt(row.drift)}
                      </td>
                      <td
                        className={`px-6 py-3 text-right ${
                          isUp ? "text-red-400/80" : "text-emerald-400/80"
                        }`}
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {row.drift_pct != null ? fmtPct(row.drift_pct) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════ UTILIZATION TABLE (SaaS only) ═══════ */}
        {activeTab === "saas" && data.utilization && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800/60">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Seat Utilization — Current Month
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Service</th>
                    <th className="px-6 py-3 font-medium text-right">Total Seats</th>
                    <th className="px-6 py-3 font-medium text-right">Active</th>
                    <th className="px-6 py-3 font-medium text-right">Utilization</th>
                    <th className="px-6 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.utilization.map((row, i) => {
                    const pct = (row.utilization * 100).toFixed(0);
                    const barWidth = Math.min(100, Math.max(2, pct));

                    return (
                      <tr
                        key={i}
                        className={`border-t border-zinc-800/40 transition-colors hover:bg-zinc-800/30 ${
                          row.flagged ? "bg-red-950/20" : ""
                        }`}
                      >
                        <td className="px-6 py-3 text-zinc-300 font-medium">
                          {row.service}
                        </td>
                        <td
                          className="px-6 py-3 text-right text-zinc-400"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {row.total_seats}
                        </td>
                        <td
                          className="px-6 py-3 text-right text-zinc-300"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {row.active_seats}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${barWidth}%`,
                                  background: row.flagged
                                    ? "#ef4444"
                                    : "#10b981",
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs ${
                                row.flagged ? "text-red-400" : "text-zinc-400"
                              }`}
                              style={{ fontFamily: "'DM Mono', monospace" }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {row.flagged ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Underutilized
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400/70">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-zinc-800/40 mt-12 px-6 py-6 text-center">
        <p className="text-xs text-zinc-600">
          DriftWatch · Spend Drift Analysis · Data period Jan–Jun 2025
        </p>
      </footer>
    </div>
  );
}
