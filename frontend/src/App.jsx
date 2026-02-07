import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  Users, Bot, Cloud, TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Loader2, Zap, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
  Sparkles, Send, X, MessageSquare,
} from "lucide-react";

const API = "http://localhost:8000";
const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MO = ["January","February","March","April","May","June","July","August","September","October","November","December"];

async function get(p) { const r = await fetch(`${API}${p}`); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function post(p, b) { const r = await fetch(`${API}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }

const CAT = {
  people: { label: "People", desc: "Salaries, overtime & contractors", icon: Users, color: "#a78bfa", key: "people" },
  ai_llm: { label: "AI / LLM", desc: "API calls & model usage", icon: Bot, color: "#f472b6", key: "ai_llm" },
  saas_cloud: { label: "SaaS & Cloud", desc: "Subscriptions & infrastructure", icon: Cloud, color: "#38bdf8", key: "saas_cloud" },
};

const SUGGESTIONS = [
  "Which department should we focus first?",
  "What if we cut AI spend by 30%?",
  "Show me only easy wins",
  "Explain the AWS cost spike",
];

// Extracts a short summary (first 2 sentences) from the AI analysis
function extractSummary(text) {
  if (!text) return "";
  // Find the Analysis section
  const lines = text.split("\n").filter(l => l.trim());
  let inAnalysis = false;
  let sentences = [];
  for (const line of lines) {
    if (line.match(/analysis/i) && (line.startsWith("#") || line.startsWith("*"))) { inAnalysis = true; continue; }
    if (inAnalysis && line.startsWith("#")) break;
    if (inAnalysis && line.trim() && !line.startsWith("*") && !line.startsWith("-")) {
      sentences.push(line.replace(/\*\*/g, "").trim());
    }
  }
  if (sentences.length === 0) {
    // Fallback: just grab first 2 non-header lines
    for (const line of lines) {
      if (!line.startsWith("#") && !line.startsWith("---") && line.trim().length > 20) {
        sentences.push(line.replace(/\*\*/g, "").trim());
        if (sentences.length >= 2) break;
      }
    }
  }
  return sentences.slice(0, 2).join(" ");
}

const S = {
  page: { minHeight: "100vh", background: "#09090b", color: "#e4e4e7", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: { position: "sticky", top: 0, zIndex: 50, background: "rgba(9,9,11,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #a78bfa, #ec4899)" },
  content: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px" },
  sec: { marginBottom: 32 },
  hero: { textAlign: "center", position: "relative", overflow: "hidden", borderRadius: 24, border: "1px solid rgba(239,68,68,0.12)", padding: "56px 32px", background: "linear-gradient(180deg, rgba(239,68,68,0.05) 0%, transparent 60%)" },
  glow: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", opacity: 0.03, filter: "blur(80px)", background: "#ef4444" },
  pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 50, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.12)", marginBottom: 24 },
  pillTxt: { fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.15em" },
  big: { fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 800, color: "#fff", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.04em", lineHeight: 1 },
  bigSuf: { fontSize: 24, color: "rgba(252,165,165,0.5)", fontWeight: 500, marginLeft: 8 },
  ann: { marginTop: 16, fontSize: 16, color: "#71717a" },
  annNum: { color: "#fca5a5", fontWeight: 700, fontFamily: "'DM Mono', monospace" },
  pills: { display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" },
  mp: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 50, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  card: (s, c) => ({ position: "relative", textAlign: "center", borderRadius: 20, padding: 28, cursor: "pointer", border: s ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.04)", background: s ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)", transform: s ? "scale(1.03)" : "scale(1)", boxShadow: s ? "0 20px 60px rgba(0,0,0,0.3)" : "none", transition: "all 0.3s ease", borderTop: s ? `2px solid ${c}50` : "1px solid rgba(255,255,255,0.04)" }),
  cIcon: (c, s) => ({ width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: c + "15", boxShadow: s ? `0 0 30px ${c}20` : "none" }),
  chBox: { borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" },
  chHdr: { padding: "24px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  tabs: { display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.04)" },
  tab: (s, c) => ({ padding: "6px 16px", fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "none", background: s ? c + "25" : "transparent", color: s ? c : "#71717a", transition: "all 0.2s" }),
  drBox: { display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderRadius: 20, border: "1px solid rgba(239,68,68,0.1)", background: "rgba(239,68,68,0.025)", flexWrap: "wrap" },
  drIco: { width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tBox: { borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" },
  tHdr: { padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  badge: { fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#71717a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid rgba(255,255,255,0.04)" },
  th: { padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", borderTop: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.03)" },
  mono: { fontFamily: "'DM Mono', monospace", fontSize: 12 },
  ft: { borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 32, padding: "32px 0" },
  ftIn: { maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  ftTxt: { fontSize: 11, color: "#3f3f46" },
  aiBtn: { display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 14, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 24px rgba(236,72,153,0.3)" },
  // Summary banner
  sumBanner: { textAlign: "center", padding: "16px 24px", borderRadius: 16, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  sumText: { fontSize: 14, color: "#d4d4d8", lineHeight: 1.5, maxWidth: 700 },
  // Chatbot popup
  fab: { position: "fixed", bottom: 24, right: 24, zIndex: 100, width: 60, height: 60, borderRadius: 20, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(167,139,250,0.4)", transition: "all 0.3s" },
  fabDot: { position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#34d399", border: "2px solid #09090b" },
  popup: { position: "fixed", bottom: 96, right: 24, zIndex: 100, width: 420, maxHeight: "70vh", borderRadius: 24, background: "#111113", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" },
  popHdr: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(167,139,250,0.04)" },
  popTitle: { fontSize: 15, fontWeight: 700, color: "#e4e4e7", display: "flex", alignItems: "center", gap: 8 },
  popClose: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "rgba(255,255,255,0.05)", color: "#71717a", transition: "all 0.2s" },
  popBody: { flex: 1, overflowY: "auto", padding: 20 },
  popInput: { padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 },
  input: { flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", outline: "none", fontSize: 13, fontFamily: "inherit" },
  sendBtn: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msg: (u) => ({ padding: "10px 14px", borderRadius: u ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: u ? "rgba(255,255,255,0.05)" : "rgba(167,139,250,0.08)", border: u ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(167,139,250,0.1)", marginBottom: 10, maxWidth: "90%", marginLeft: u ? "auto" : 0, color: u ? "#d4d4d8" : "#e9d5ff", fontSize: 13, lineHeight: 1.6 }),
  msgRole: (u) => ({ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: u ? "#52525b" : "#a78bfa", marginBottom: 4 }),
  sug: { padding: "7px 12px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa", fontSize: 11, cursor: "pointer", transition: "all 0.2s" },
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("people");
  const [analysis, setAnalysis] = useState(null);
  const [summary, setSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthInsight, setMonthInsight] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const chatEnd = useRef(null);

  const load = () => { setLoading(true); setError(null); get("/api/drift").then(r => { setData(r); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); };
  useEffect(load, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const r = await post("/api/analyze", {});
      setAnalysis(r.analysis);
      setSummary(extractSummary(r.analysis));
      // Auto-open chatbot with the full analysis as first message
      setChatOpen(false);
      setMsgs([{ role: "assistant", content: r.analysis }]);
    } catch (e) { setSummary("Error: Could not reach AI."); }
    finally { setAiLoading(false); }
  };

  const runMonthAnalysis = async () => {
    if (!selectedMonth || !trends) return;
    setMonthLoading(true);
    try {
      const idx = trends.findIndex(t => t.month === selectedMonth);
      if (idx < 1) { setMonthInsight("Not enough prior data to compare."); setMonthLoading(false); return; }
      const curr = trends[idx];
      const prev = trends[idx - 1];
      const prompt = `Compare these two months of company spending and give a brief insight (3-4 bullet points max). What changed and why might it matter?

Previous month (${prev.month}): People=${Math.round(prev.people).toLocaleString()}, AI/LLM=${Math.round(prev.ai_llm).toLocaleString()}, SaaS/Cloud=${Math.round(prev.saas_cloud).toLocaleString()}, Total=${Math.round(prev.people + prev.ai_llm + prev.saas_cloud).toLocaleString()}

Current month (${curr.month}): People=${Math.round(curr.people).toLocaleString()}, AI/LLM=${Math.round(curr.ai_llm).toLocaleString()}, SaaS/Cloud=${Math.round(curr.saas_cloud).toLocaleString()}, Total=${Math.round(curr.people + curr.ai_llm + curr.saas_cloud).toLocaleString()}

Be specific with dollar amounts and percentages. Keep it concise.`;

      const r = await post("/api/chat", { message: prompt, history: [] });
      setMonthInsight(r.response);
    } catch (e) { setMonthInsight("Error: Could not reach AI."); }
    finally { setMonthLoading(false); }
  };

  const sendMsg = async (text) => {
    const m = text || input;
    if (!m.trim() || chatLoading) return;
    setInput("");
    const history = msgs.map(x => ({ role: x.role === "assistant" ? "model" : "user", content: x.content }));
    setMsgs(p => [...p, { role: "user", content: m }]);
    setChatLoading(true);
    try {
      const r = await post("/api/chat", { message: m, history });
      setMsgs(p => [...p, { role: "assistant", content: r.response }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: "Error connecting to AI." }]);
    } finally { setChatLoading(false); }
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ ...S.logo, width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px" }}><BarChart3 size={28} color="#fff" /></div>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>PayDrift</p>
        <p style={{ color: "#71717a", fontSize: 14, marginTop: 4 }}>Analyzing spend drift…</p>
        <Loader2 size={20} color="#a78bfa" style={{ margin: "20px auto 0", animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <AlertTriangle size={40} color="#f87171" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Connection Failed</p>
        <button onClick={load} style={{ marginTop: 16, padding: "8px 20px", background: "#27272a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}><RefreshCw size={14} /> Retry</button>
      </div>
    </div>
  );

  const { total_monthly_drift: tmd, annualized_drift: ad, categories, monthly_trends: trends } = data;
  const active = categories.find(c => c.category === tab) || categories[0];
  const m = CAT[active.category];
  const top = active.items[0];

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse}button{cursor:pointer;border:none;background:none;font-family:inherit}.md h2,.md h3{color:#c084fc;margin:16px 0 6px;font-size:14px;font-weight:700}.md strong{color:#fff}.md ul{padding-left:16px;margin:6px 0}.md li{margin:4px 0;color:#d4d4d8;font-size:13px}.md p{margin:6px 0;font-size:13px;line-height:1.6}`}</style>

      <header style={S.header}><div style={S.headerInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logo}><TrendingUp size={16} color="#fff" /></div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>PayDrift</span>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(167,139,250,0.15)", color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase" }}>Jan–Jun 2025</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 2s ease infinite" }} /><span style={{ fontSize: 11, color: "#71717a" }}>Live</span></div>
        </div>
      </div></header>

      <div style={S.content}>
        {/* HERO */}
        <div style={{ ...S.hero, ...S.sec }}><div style={S.glow} /><div style={{ position: "relative" }}>
          <div style={S.pill}><Zap size={14} color="#f87171" /><span style={S.pillTxt}>Unplanned Spend Detected</span></div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}><span style={S.big}>{fmt(tmd)}</span><span style={S.bigSuf}>/mo</span></div>
          <p style={S.ann}>That's <span style={S.annNum}>{fmt(ad)}</span> <span style={{ color: "#a1a1aa" }}>/year</span> in unbudgeted drift</p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button onClick={runAI} disabled={aiLoading} style={{ ...S.aiBtn, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={18} />}
              {aiLoading ? "Analyzing…" : analysis ? "✓ Re-Analyze" : "Analyze with AI"}
            </button>
            {trends && trends.length > 1 && (
              <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setMonthInsight(null); }} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7", fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}>
                <option value="" style={{ background: "#18181b" }}>Compare month…</option>
                {trends.slice(1).map(t => <option key={t.month} value={t.month} style={{ background: "#18181b" }}>{FULL_MO[parseInt(t.month.split("-")[1]) - 1]} {t.month.split("-")[0]}</option>)}
              </select>
            )}
            {selectedMonth && (
              <button onClick={runMonthAnalysis} disabled={monthLoading} style={{ ...S.aiBtn, padding: "12px 20px", fontSize: 13, background: "linear-gradient(135deg, #38bdf8, #a78bfa)", boxShadow: "0 4px 24px rgba(56,189,248,0.3)", opacity: monthLoading ? 0.7 : 1 }}>
                {monthLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <BarChart3 size={16} />}
                {monthLoading ? "Comparing…" : "Compare"}
              </button>
            )}
          </div>
          <div style={S.pills}>{categories.map(c => { const cm = CAT[c.category]; const up = c.total_drift > 0; const I = cm.icon; return (
            <div key={c.category} style={S.mp}><I size={14} color={cm.color} /><span style={{ fontSize: 11, color: "#a1a1aa" }}>{cm.label}</span><span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono'", color: up ? "#f87171" : "#34d399" }}>{up ? "↑" : "↓"}{fmt(c.total_drift)}</span></div>
          ); })}</div>
        </div></div>

        {/* AI SUMMARY BANNER */}
        {(summary || aiLoading) && (
          <div style={{ ...S.sec, borderRadius: 20, background: "rgba(167,139,250,0.03)", border: "1px solid rgba(167,139,250,0.1)", padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", opacity: 0.03, filter: "blur(60px)", background: "#a78bfa" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Sparkles size={18} color="#a78bfa" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>AI Analysis Summary</span>
                {summary && <button onClick={() => { setAnalysis(null); setSummary(""); }} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>}
              </div>
              {aiLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", fontSize: 14 }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Reading financial signals…
                </div>
              ) : (
                <p style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{summary}</p>
              )}
            </div>
          </div>
        )}

        {/* MONTH COMPARISON INSIGHT */}
        {(monthInsight || monthLoading) && (
          <div style={{ ...S.sec, borderRadius: 20, background: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.1)", padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", opacity: 0.03, filter: "blur(60px)", background: "#38bdf8" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <BarChart3 size={18} color="#38bdf8" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>Month-over-Month: {FULL_MO[parseInt(selectedMonth.split("-")[1]) - 1]} {selectedMonth.split("-")[0]}</span>
                <button onClick={() => { setMonthInsight(null); setSelectedMonth(""); }} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>
              </div>
              {monthLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", fontSize: 14 }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Comparing with previous month…
                </div>
              ) : (
                <div className="md" style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.7 }}>
                  <ReactMarkdown>{monthInsight}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARDS */}
        <div style={{ ...S.grid, ...S.sec }}>{categories.map(c => {
          const cm = CAT[c.category]; const up = c.total_drift > 0; const sel = tab === c.category; const I = cm.icon; const A = up ? ArrowUpRight : ArrowDownRight;
          return (<div key={c.category} onClick={() => setTab(c.category)} style={S.card(sel, cm.color)}>
            <div style={S.cIcon(cm.color, sel)}><I size={22} color={cm.color} /></div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#d4d4d8", marginBottom: 2 }}>{cm.label}</p>
            <p style={{ fontSize: 11, color: "#52525b", marginBottom: 16 }}>{cm.desc}</p>
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}><span style={{ color: up ? "#f87171" : "#34d399" }}>{up ? "+" : ""}{fmt(c.total_drift)}</span></p>
            <div style={{ fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: up ? "rgba(248,113,113,0.5)" : "rgba(52,211,153,0.5)" }}><A size={14} /><span style={{ fontWeight: 600 }}>{fmtPct(c.drift_pct)} drift</span></div>
          </div>);
        })}</div>

        {/* CHART */}
        <div style={{ ...S.chBox, ...S.sec }}>
          <div style={S.chHdr}><div><p style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>Monthly Spend Trend</p><p style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{m.label} · 6-month window</p></div>
            <div style={S.tabs}>{categories.map(c => { const cm = CAT[c.category]; return <button key={c.category} onClick={() => setTab(c.category)} style={S.tab(tab === c.category, cm.color)}>{cm.label}</button>; })}</div>
          </div>
          <div style={{ padding: "8px 12px 20px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trends} margin={{ top: 15, right: 15, left: 5, bottom: 0 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={m.color} stopOpacity={0.25} /><stop offset="100%" stopColor={m.color} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => MO[parseInt(v.split("-")[1]) - 1] || v} />
                <YAxis tick={{ fill: "#52525b", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} width={60} tickFormatter={v => "$" + (v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? Math.round(v/1000)+"k" : v)} />
                <Tooltip contentStyle={{ background: "#141416", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12, fontFamily: "'DM Mono'", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", padding: "12px 16px" }} labelStyle={{ color: "#71717a", marginBottom: 6, fontSize: 11 }} formatter={v => ["$" + Math.round(v).toLocaleString(), m.label]} labelFormatter={v => { const p = v.split("-"); return FULL_MO[parseInt(p[1])-1] + " " + p[0]; }} cursor={{ stroke: m.color, strokeWidth: 1, strokeOpacity: 0.2 }} />
                <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2.5} fill="url(#g)" dot={false} activeDot={{ r: 6, fill: m.color, stroke: "#09090b", strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP DRIFTER */}
        {top && top.drift > 0 && (
          <div style={{ ...S.drBox, ...S.sec }}>
            <div style={S.drIco}><DollarSign size={20} color="#f87171" /></div>
            <div><p style={{ fontSize: 14, color: "#d4d4d8" }}><span style={{ fontWeight: 800, color: "#f87171" }}>{top.item}</span> is your biggest drifter in {m.label.toLowerCase()}</p>
              <p style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>Increased by <span style={{ color: "#f87171", fontWeight: 700, fontFamily: "'DM Mono'" }}>{fmt(top.drift)}/mo</span> ({fmtPct(top.drift_pct)}) vs. prior avg</p></div>
          </div>
        )}

        {/* TABLE */}
        <div style={S.tBox}>
          <div style={S.tHdr}><div><p style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>Drift Breakdown</p><p style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{m.label} · Sorted by impact</p></div><span style={S.badge}>{active.items.length} items</span></div>
          <table style={{ width: "100%" }}><thead><tr>
            <th style={{ ...S.th, textAlign: "left" }}>Item</th><th style={{ ...S.th, textAlign: "right" }}>Before</th><th style={{ ...S.th, textAlign: "right" }}>After</th><th style={{ ...S.th, textAlign: "right" }}>Drift</th><th style={{ ...S.th, textAlign: "right" }}>Change</th><th style={{ ...S.th, textAlign: "center", width: 140 }}>Impact</th>
          </tr></thead><tbody>
            {active.items.map((r, i) => {
              const up = r.drift > 0; const ap = Math.abs(r.drift_pct || 0);
              const bg = ap > 50 ? "rgba(239,68,68,0.05)" : ap > 20 ? "rgba(239,68,68,0.025)" : "transparent";
              const mx = Math.max(...active.items.map(x => Math.abs(x.drift))); const bw = mx > 0 ? (Math.abs(r.drift) / mx) * 100 : 0;
              return (<tr key={i} style={{ background: bg }}>
                <td style={{ ...S.td, textAlign: "left" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: up ? "#ef4444" : "#10b981", flexShrink: 0 }} /><span style={{ color: "#e4e4e7", fontWeight: 600, fontSize: 13 }}>{r.item}</span></div></td>
                <td style={{ ...S.td, ...S.mono, textAlign: "right", color: "#71717a" }}>{fmt(r.avg_before)}</td>
                <td style={{ ...S.td, ...S.mono, textAlign: "right", color: "#d4d4d8" }}>{fmt(r.avg_after)}</td>
                <td style={{ ...S.td, ...S.mono, textAlign: "right", fontWeight: 800, color: up ? "#f87171" : "#34d399" }}>{up ? "+" : "-"}{fmt(r.drift)}</td>
                <td style={{ ...S.td, ...S.mono, textAlign: "right", fontSize: 11, color: up ? "rgba(248,113,113,0.6)" : "rgba(52,211,153,0.6)" }}>{fmtPct(r.drift_pct)}</td>
                <td style={S.td}><div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${bw}%`, transition: "width 0.7s ease", background: up ? `linear-gradient(90deg, ${m.color}50, #ef444480)` : `linear-gradient(90deg, ${m.color}50, #10b98180)` }} /></div></td>
              </tr>);
            })}
          </tbody></table>
        </div>
      </div>

      <footer style={S.ft}><div style={S.ftIn}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ ...S.logo, width: 20, height: 20, borderRadius: 4 }}><TrendingUp size={10} color="#fff" /></div><span style={S.ftTxt}>PayDrift · Spend Drift Intelligence</span></div>
        <span style={S.ftTxt}>Data period Jan–Jun 2025</span>
      </div></footer>

      {/* ══════ FLOATING CHATBOT ══════ */}

      {/* FAB Button */}
      <button onClick={() => setChatOpen(!chatOpen)} style={S.fab}>
        {chatOpen ? <X size={24} color="#fff" /> : <MessageSquare size={24} color="#fff" />}
        {analysis && !chatOpen && <div style={S.fabDot} />}
      </button>

      {/* Chat Popup */}
      {chatOpen && (
        <div style={{ ...S.popup, animation: "slideUp 0.3s ease" }}>
          <div style={S.popHdr}>
            <div style={S.popTitle}><Sparkles size={16} color="#a78bfa" /> PayDrift AI</div>
            <button onClick={() => setChatOpen(false)} style={S.popClose}><X size={16} /></button>
          </div>
          <div style={S.popBody}>
            {msgs.length === 0 && !analysis && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#52525b" }}>
                <Bot size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: 13 }}>Click "Analyze with AI" first to load insights</p>
              </div>
            )}
            {msgs.map((x, i) => (
              <div key={i} style={S.msg(x.role === "user")}>
                <div style={S.msgRole(x.role === "user")}>{x.role === "user" ? "You" : "PayDrift AI"}</div>
                {x.role === "assistant" ? <div className="md"><ReactMarkdown>{x.content}</ReactMarkdown></div> : <span>{x.content}</span>}
              </div>
            ))}
            {chatLoading && <div style={{ ...S.msg(false), display: "flex", alignItems: "center", gap: 8 }}><Loader2 size={14} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} /><span style={{ color: "#71717a", fontSize: 13 }}>Thinking…</span></div>}
            <div ref={chatEnd} />
            {msgs.length > 0 && !chatLoading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {SUGGESTIONS.map((s, i) => <div key={i} onClick={() => sendMsg(s)} style={S.sug}>{s}</div>)}
              </div>
            )}
          </div>
          <div style={S.popInput}>
            <input style={S.input} placeholder="Ask about your drift data…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
            <button onClick={() => sendMsg()} disabled={chatLoading} style={S.sendBtn}><Send size={16} color="#fff" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;