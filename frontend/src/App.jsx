import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  Users, Bot, Cloud, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader2,
} from "lucide-react";
import { api } from "./services/api";

const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

const CATEGORY_META = {
  people: { label: "People", icon: Users, color: "#a78bfa", trendKey: "people" },
  ai_llm: { label: "AI / LLM", icon: Bot, color: "#f472b6", trendKey: "ai_llm" },
  saas_cloud: { label: "SaaS & Cloud", icon: Cloud, color: "#38bdf8", trendKey: "saas_cloud" },
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("people");

  const fetchData = () => {
    setLoading(true);
    setError(null);
    api.getDrift()
      .then((result) => { setData(result); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm tracking-wide uppercase">Loading drift analysis…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-zinc-300">Failed to load data</p>
          <p className="text-zinc-500 text-sm">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { total_monthly_drift, annualized_drift, categories, monthly_trends } = data;
  const activeCat = categories.find((c) => c.category === activeTab) || categories[0];
  const meta = CATEGORY_META[activeCat.category];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header className="border-b border-zinc-800/60 px-8 py-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)" }}>
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-3xl tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">DriftWatch</span>
        </div>
        <span className="text-sm text-zinc-500 tracking-wide uppercase font-medium">Jan – Jun 2025</span>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-12 space-y-10">

        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 p-10" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(153,27,27,0.08) 100%)" }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #ef4444, transparent)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-xs font-medium text-red-400 uppercase tracking-widest">Unplanned Spend Detected</span>
            </div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-7xl font-bold tracking-tight text-white" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(total_monthly_drift)}</span>
              <span className="text-2xl text-red-300/80">/month</span>
            </div>
            <div className="mt-4 flex items-center gap-3 text-zinc-400">
              <span className="text-xl">→</span>
              <span className="text-xl font-medium text-red-300" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(annualized_drift)}</span>
              <span className="text-base">/year in drift</span>
            </div>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const m = CATEGORY_META[cat.category];
            const isUp = cat.total_drift > 0;
            const Arrow = isUp ? TrendingUp : TrendingDown;
            return (
              <button key={cat.category} onClick={() => setActiveTab(cat.category)}
                className={`text-left rounded-xl border p-6 transition-all duration-200 ${activeTab === cat.category ? "border-zinc-600 bg-zinc-800/80 shadow-lg shadow-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/40 hover:border-zinc-700"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + "18" }}>
                    <m.icon className="w-5 h-5" style={{ color: m.color }} />
                  </div>
                  <Arrow className={`w-5 h-5 ${isUp ? "text-red-400" : "text-emerald-400"}`} />
                </div>
                <p className="text-sm text-zinc-400 mb-1">{m.label}</p>
                <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
                  <span className={isUp ? "text-red-400" : "text-emerald-400"}>{isUp ? "+" : ""}{fmt(cat.total_drift)}</span>
                </p>
                <p className={`text-xs mt-1 ${isUp ? "text-red-400/70" : "text-emerald-400/70"}`}>{fmtPct(cat.drift_pct)} overall</p>
              </button>
            );
          })}
        </div>

        {/* TREND CHART */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Monthly Spend — {meta.label}</h2>
            <div className="flex gap-1 bg-zinc-800/80 rounded-lg p-0.5">
              {categories.map((c) => {
                const cm = CATEGORY_META[c.category];
                return (
                  <button key={c.category} onClick={() => setActiveTab(c.category)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === c.category ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                    {cm.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthly_trends}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v)} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "13px", fontFamily: "'DM Mono', monospace" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: meta.color }}
                formatter={(v) => ["$" + Math.round(v).toLocaleString(), "Spend"]}
              />
              <Area type="monotone" dataKey={meta.trendKey} stroke={meta.color} strokeWidth={2.5} fill="url(#areaFill)" dot={false}
                activeDot={{ r: 5, fill: meta.color, stroke: "#18181b", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* DRIFT BREAKDOWN CARDS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Drift Breakdown — {meta.label}</h2>
            <span className="text-xs text-zinc-600">Sorted by largest drift</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {activeCat.items.map((row, i) => {
              const isUp = row.drift > 0;
              const severity = Math.abs(row.drift_pct) > 20 ? "border-red-500/40 bg-red-950/20" : Math.abs(row.drift_pct) > 10 ? "border-red-500/20 bg-red-950/10" : "border-zinc-800/60 bg-zinc-900/50";
              return (
                <div key={i} className={`rounded-xl border p-6 transition-all duration-200 hover:bg-zinc-800/40 hover:border-zinc-700 ${severity}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-200 mb-1">{row.item}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${isUp ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {isUp ? "+" : ""}{fmt(row.drift)}
                        </span>
                        <span className={`text-sm font-medium ${isUp ? "text-red-400/80" : "text-emerald-400/80"}`} style={{ fontFamily: "'DM Mono', monospace" }}>
                          {fmtPct(row.drift_pct)}
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUp ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                      {isUp ? <TrendingUp className="w-5 h-5 text-red-400" /> : <TrendingDown className="w-5 h-5 text-emerald-400" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Before</p>
                      <p className="text-base font-semibold text-zinc-400" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(row.avg_before)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg After</p>
                      <p className="text-base font-semibold text-zinc-300" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(row.avg_after)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      <footer className="border-t border-zinc-800/40 mt-16 px-8 py-8 text-center">
        <p className="text-sm text-zinc-600">DriftWatch · Spend Drift Analysis · Data period Jan–Jun 2025</p>
      </footer>
    </div>
  );
}

export default App;