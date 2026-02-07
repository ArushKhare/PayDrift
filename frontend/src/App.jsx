import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  Users, Bot, Cloud, TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Loader2, Zap, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
  Sparkles, Send, X, MessageSquare, Upload, CheckCircle, FileSpreadsheet,
  ArrowRight, Shield, Cpu, Eye, LogIn, UserPlus, LogOut, Mail, Lock, User,
} from "lucide-react";

const API = "http://localhost:8000";
const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MO = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function authHeaders(token) { return token ? { Authorization: `Bearer ${token}` } : {}; }
async function get(p, token) { const r = await fetch(`${API}${p}`, { headers: authHeaders(token) }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function post(p, b, token) { const r = await fetch(`${API}${p}`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function upload(file, type, token) {
  const fd = new FormData(); fd.append("file", file); fd.append("dataset_type", type);
  const r = await fetch(`${API}/api/upload?dataset_type=${type}`, { method: "POST", headers: authHeaders(token), body: fd });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json();
}

const CAT = {
  people: { label: "People", desc: "Salaries, overtime & contractors", icon: Users, color: "#a78bfa", key: "people" },
  ai_llm: { label: "AI / LLM", desc: "API calls & model usage", icon: Bot, color: "#f472b6", key: "ai_llm" },
  saas_cloud: { label: "SaaS & Cloud", desc: "Subscriptions & infrastructure", icon: Cloud, color: "#38bdf8", key: "saas_cloud" },
};

const SUGGESTIONS = ["Which department should we focus first?", "What if we cut AI spend by 30%?", "Show me only easy wins", "Explain the biggest cost spike"];

function extractSummary(text) {
  if (!text) return "";
  const lines = text.split("\n").filter(l => l.trim());
  let inA = false, sents = [];
  for (const l of lines) {
    if (l.match(/analysis/i) && (l.startsWith("#") || l.startsWith("*"))) { inA = true; continue; }
    if (inA && l.startsWith("#")) break;
    if (inA && l.trim() && !l.startsWith("*") && !l.startsWith("-")) sents.push(l.replace(/\*\*/g, "").trim());
  }
  if (!sents.length) for (const l of lines) { if (!l.startsWith("#") && l.trim().length > 20) { sents.push(l.replace(/\*\*/g, "").trim()); if (sents.length >= 2) break; } }
  return sents.slice(0, 2).join(" ");
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════
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
  fab: { position: "fixed", bottom: 24, right: 24, zIndex: 100, width: 60, height: 60, borderRadius: 20, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(167,139,250,0.4)", transition: "all 0.3s" },
  fabDot: { position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#34d399", border: "2px solid #09090b" },
  popup: { position: "fixed", bottom: 96, right: 24, zIndex: 100, width: 420, maxHeight: "70vh", borderRadius: 24, background: "#111113", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" },
  popHdr: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(167,139,250,0.04)" },
  popTitle: { fontSize: 15, fontWeight: 700, color: "#e4e4e7", display: "flex", alignItems: "center", gap: 8 },
  popClose: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "rgba(255,255,255,0.05)", color: "#71717a" },
  popBody: { flex: 1, overflowY: "auto", padding: 20 },
  popInput: { padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 },
  input: { flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", outline: "none", fontSize: 13, fontFamily: "inherit" },
  sendBtn: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msg: (u) => ({ padding: "10px 14px", borderRadius: u ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: u ? "rgba(255,255,255,0.05)" : "rgba(167,139,250,0.08)", border: u ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(167,139,250,0.1)", marginBottom: 10, maxWidth: "90%", marginLeft: u ? "auto" : 0, color: u ? "#d4d4d8" : "#e9d5ff", fontSize: 13, lineHeight: 1.6 }),
  msgRole: (u) => ({ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: u ? "#52525b" : "#a78bfa", marginBottom: 4 }),
  sug: { padding: "7px 12px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa", fontSize: 11, cursor: "pointer" },
};

// ════════════════════════════════════════
// DROP ZONE COMPONENT
// ════════════════════════════════════════
function DropZone({ label, icon: Icon, color, file, onFile, desc }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  const onDrop = useCallback((e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }, [onFile]);
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      onClick={() => ref.current?.click()}
      style={{ borderRadius: 20, border: drag ? `2px dashed ${color}` : file ? `1px solid ${color}40` : "1px solid rgba(255,255,255,0.06)", background: file ? `${color}08` : drag ? `${color}08` : "rgba(255,255,255,0.015)", padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.3s" }}>
      <input ref={ref} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: file ? `${color}20` : "rgba(255,255,255,0.04)" }}>
        {file ? <CheckCircle size={24} color={color} /> : <Icon size={24} color={color} />}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: file ? color : "#e4e4e7", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 12, color: "#52525b", marginBottom: 8 }}>{desc}</p>
      {file ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <FileSpreadsheet size={14} color={color} />
          <span style={{ fontSize: 12, color: color, fontWeight: 600 }}>{file.name}</span>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#3f3f46" }}>Drag & drop or click to browse</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// AUTH MODAL
// ════════════════════════════════════════
function AuthModal({ mode, onClose, onAuth }) {
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const body = isLogin ? { email, password } : { email, name, password };
      const r = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Something went wrong"); setLoading(false); return; }
      onAuth(data);
    } catch { setError("Could not connect to server"); setLoading(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, borderRadius: 24, background: "#111113", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 0", textAlign: "center" }}>
          <div style={{ ...S.logo, width: 44, height: 44, borderRadius: 12, margin: "0 auto 16px" }}><TrendingUp size={20} color="#fff" /></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>{isLogin ? "Welcome back" : "Create account"}</h2>
          <p style={{ fontSize: 13, color: "#52525b", margin: 0 }}>{isLogin ? "Log in to your PayDrift account" : "Start finding hidden cost drift"}</p>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", margin: "20px 28px 0", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
          <button onClick={() => { setIsLogin(true); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: isLogin ? "rgba(167,139,250,0.15)" : "transparent", color: isLogin ? "#a78bfa" : "#52525b" }}>Log In</button>
          <button onClick={() => { setIsLogin(false); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: !isLogin ? "rgba(167,139,250,0.15)" : "transparent", color: !isLogin ? "#a78bfa" : "#52525b" }}>Sign Up</button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 28px 28px" }}>
          {!isLogin && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Name</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 14px" }}>
                <User size={16} color="#52525b" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={{ flex: 1, background: "none", border: "none", padding: "12px 0", color: "#fff", outline: "none", fontSize: 14, fontFamily: "inherit" }} />
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Email</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 14px" }}>
              <Mail size={16} color="#52525b" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" required style={{ flex: 1, background: "none", border: "none", padding: "12px 0", color: "#fff", outline: "none", fontSize: 14, fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 14px" }}>
              <Lock size={16} color="#52525b" />
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required style={{ flex: 1, background: "none", border: "none", padding: "12px 0", color: "#fff", outline: "none", fontSize: 14, fontFamily: "inherit" }} />
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 12, textAlign: "center" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...S.aiBtn, width: "100%", justifyContent: "center", fontSize: 15, padding: "14px 0", opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : isLogin ? <><LogIn size={18} /> Log In</> : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// LANDING PAGE
// ════════════════════════════════════════
function Landing({ onStart, user, token, onShowAuth, onLogout }) {
  const [files, setFiles] = useState({ payroll: null, ai_costs: null, saas_cloud: null });
  const [uploading, setUploading] = useState(false);
  const [useDemo, setUseDemo] = useState(false);
  const allUploaded = files.payroll && files.ai_costs && files.saas_cloud;

  const handleStart = async () => {
    if (!token) { onShowAuth("login"); return; }
    if (useDemo) { onStart(); return; }
    if (!allUploaded) return;
    setUploading(true);
    try {
      await upload(files.payroll, "payroll", token);
      await upload(files.ai_costs, "ai_costs", token);
      await upload(files.saas_cloud, "saas_cloud", token);
      onStart();
    } catch (e) { alert("Upload failed: " + e.message); setUploading(false); }
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}button{cursor:pointer;border:none;background:none;font-family:inherit}`}</style>

      {/* Header */}
      <header style={S.header}><div style={S.headerInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logo}><TrendingUp size={16} color="#fff" /></div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>PayDrift</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (!token) { onShowAuth("login"); return; } setUseDemo(true); onStart(); }} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa", fontSize: 12, fontWeight: 600 }}>
            Try with demo data →
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>{user.name}</span>
              <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a", fontSize: 12, fontWeight: 600 }}>
                <LogOut size={14} /> Log out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => onShowAuth("login")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", fontSize: 12, fontWeight: 600 }}>
                <LogIn size={14} /> Log In
              </button>
              <button onClick={() => onShowAuth("signup")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                <UserPlus size={14} /> Sign Up
              </button>
            </div>
          )}
        </div>
      </div></header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px", animation: "fadeIn 0.6s ease" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 50, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.12)", marginBottom: 24 }}>
            <Sparkles size={14} color="#a78bfa" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em" }}>AI-Powered Spend Intelligence</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
            Your company is quietly<br /><span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>bleeding money.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#71717a", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            PayDrift detects invisible cost drift across payroll, AI tools, and SaaS — then tells you exactly how to fix it.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 64 }}>
          {[
            { icon: Eye, label: "Detect Drift", desc: "Compare spending month-over-month automatically", color: "#a78bfa" },
            { icon: Cpu, label: "AI Analysis", desc: "Get CFO-level insights and action items in seconds", color: "#f472b6" },
            { icon: Shield, label: "Save Money", desc: "Ranked recommendations with estimated savings", color: "#38bdf8" },
          ].map((f, i) => (
            <div key={i} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)", padding: "24px 20px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", background: f.color + "12" }}>
                <f.icon size={20} color={f.color} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7", marginBottom: 4 }}>{f.label}</p>
              <p style={{ fontSize: 12, color: "#52525b", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Upload Section */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Upload your data</h2>
          <p style={{ fontSize: 14, color: "#52525b" }}>Drop your CSV files below — we'll find the hidden drift.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <DropZone label="Payroll" icon={Users} color="#a78bfa" file={files.payroll} onFile={f => setFiles(p => ({ ...p, payroll: f }))} desc="Salaries, overtime, contractors" />
          <DropZone label="AI / LLM Costs" icon={Bot} color="#f472b6" file={files.ai_costs} onFile={f => setFiles(p => ({ ...p, ai_costs: f }))} desc="API calls, tokens, model usage" />
          <DropZone label="SaaS & Cloud" icon={Cloud} color="#38bdf8" file={files.saas_cloud} onFile={f => setFiles(p => ({ ...p, saas_cloud: f }))} desc="Subscriptions, seats, infra" />
        </div>

        {/* Launch Button */}
        <div style={{ textAlign: "center" }}>
          <button onClick={handleStart} disabled={(!allUploaded && !useDemo) || uploading}
            style={{ ...S.aiBtn, fontSize: 17, padding: "16px 40px", opacity: (allUploaded || useDemo) && !uploading ? 1 : 0.4 }}>
            {uploading ? <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : <><ArrowRight size={20} /> Analyze My Spend</>}
          </button>
          {!allUploaded && (
            <p style={{ fontSize: 12, color: "#3f3f46", marginTop: 16 }}>
              Upload all 3 files to continue, or{" "}
              <span onClick={() => { setUseDemo(true); onStart(); }} style={{ color: "#a78bfa", cursor: "pointer", textDecoration: "underline" }}>try with demo data</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={S.ft}><div style={S.ftIn}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ ...S.logo, width: 20, height: 20, borderRadius: 4 }}><TrendingUp size={10} color="#fff" /></div><span style={S.ftTxt}>PayDrift · Spend Drift Intelligence</span></div>
        <span style={S.ftTxt}>Powered by AI</span>
      </div></footer>
    </div>
  );
}

// ════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════
function App() {
  const [page, setPage] = useState("landing"); // "landing" or "dashboard"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // ── Auth state ──
  const [token, setToken] = useState(() => localStorage.getItem("pd_token"));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("pd_user")); } catch { return null; } });
  const [authModal, setAuthModal] = useState(null); // "login" | "signup" | null

  const handleAuth = (data) => {
    setToken(data.access_token);
    const u = { name: data.name, email: data.email };
    setUser(u);
    localStorage.setItem("pd_token", data.access_token);
    localStorage.setItem("pd_user", JSON.stringify(u));
    setAuthModal(null);
  };
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("pd_token");
    localStorage.removeItem("pd_user");
    setPage("landing");
    setData(null);
    setAnalysis(null);
    setSummary("");
    setMsgs([]);
  };

  const loadDrift = () => { setLoading(true); setError(null); get("/api/drift", token).then(r => { setData(r); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); };
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const startDashboard = () => { setPage("dashboard"); loadDrift(); };

  const runAI = async () => {
    setAiLoading(true);
    try { const r = await post("/api/analyze", {}, token); setAnalysis(r.analysis); setSummary(extractSummary(r.analysis)); setChatOpen(false); setMsgs([{ role: "assistant", content: r.analysis }]); }
    catch (e) { setSummary("Error: Could not reach AI."); }
    finally { setAiLoading(false); }
  };

  const runMonthAnalysis = async () => {
    if (!selectedMonth || !data?.monthly_trends) return;
    const trends = data.monthly_trends;
    setMonthLoading(true);
    try {
      const idx = trends.findIndex(t => t.month === selectedMonth);
      if (idx < 1) { setMonthInsight("Not enough prior data."); setMonthLoading(false); return; }
      const c = trends[idx], p = trends[idx - 1];
      const prompt = `Compare these two months of company spending (3-4 bullet points max). What changed and why?\n\nPrevious (${p.month}): People=$${Math.round(p.people).toLocaleString()}, AI=$${Math.round(p.ai_llm).toLocaleString()}, SaaS=$${Math.round(p.saas_cloud).toLocaleString()}\nCurrent (${c.month}): People=$${Math.round(c.people).toLocaleString()}, AI=$${Math.round(c.ai_llm).toLocaleString()}, SaaS=$${Math.round(c.saas_cloud).toLocaleString()}\n\nBe specific with dollars and percentages.`;
      const r = await post("/api/chat", { message: prompt, history: [] }, token); setMonthInsight(r.response);
    } catch (e) { setMonthInsight("Error: Could not reach AI."); }
    finally { setMonthLoading(false); }
  };

  const sendMsg = async (text) => {
    const m = text || input; if (!m.trim() || chatLoading) return; setInput("");
    const history = msgs.map(x => ({ role: x.role === "assistant" ? "model" : "user", content: x.content }));
    setMsgs(p => [...p, { role: "user", content: m }]); setChatLoading(true);
    try { const r = await post("/api/chat", { message: m, history }, token); setMsgs(p => [...p, { role: "assistant", content: r.response }]); }
    catch (e) { setMsgs(p => [...p, { role: "assistant", content: "Error connecting to AI." }]); }
    finally { setChatLoading(false); }
  };

  // ── Landing Page ──
  if (page === "landing") return (<>
    <Landing onStart={startDashboard} user={user} token={token} onShowAuth={setAuthModal} onLogout={handleLogout} />
    {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onAuth={handleAuth} />}
  </>);

  // ── Loading ──
  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ ...S.logo, width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px" }}><BarChart3 size={28} color="#fff" /></div>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>PayDrift</p>
        <p style={{ color: "#71717a", fontSize: 14, marginTop: 4 }}>Crunching your numbers…</p>
        <Loader2 size={20} color="#a78bfa" style={{ margin: "20px auto 0", animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <AlertTriangle size={40} color="#f87171" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Analysis Failed</p>
        <p style={{ color: "#71717a", fontSize: 13, marginTop: 8 }}>Backend not reachable.</p>
        <button onClick={loadDrift} style={{ marginTop: 16, padding: "8px 20px", background: "#27272a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}><RefreshCw size={14} /> Retry</button>
        <p style={{ marginTop: 12 }}><span onClick={() => setPage("landing")} style={{ color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>← Back to upload</span></p>
      </div>
    </div>
  );

  if (!data) return null;

  const { total_monthly_drift: tmd, annualized_drift: ad, categories, monthly_trends: trends } = data;
  const active = categories.find(c => c.category === tab) || categories[0];
  const m = CAT[active.category];
  const top = active.items[0];

  // ── Dashboard ──
  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse}button{cursor:pointer;border:none;background:none;font-family:inherit}.md h2,.md h3{color:#c084fc;margin:16px 0 6px;font-size:14px;font-weight:700}.md strong{color:#fff}.md ul{padding-left:16px;margin:6px 0}.md li{margin:4px 0;color:#d4d4d8;font-size:13px}.md p{margin:6px 0;font-size:13px;line-height:1.6}`}</style>

      <header style={S.header}><div style={S.headerInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setPage("landing")} style={{ ...S.logo, cursor: "pointer" }}><TrendingUp size={16} color="#fff" /></div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>PayDrift</span>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(167,139,250,0.15)", color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span onClick={() => setPage("landing")} style={{ fontSize: 11, color: "#52525b", cursor: "pointer", textDecoration: "underline" }}>← Upload new data</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 2s ease infinite" }} /><span style={{ fontSize: 11, color: "#71717a" }}>Live</span></div>
          {user && <>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>{user.name}</span>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a", fontSize: 11, fontWeight: 600 }}>
              <LogOut size={12} /> Log out
            </button>
          </>}
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
              <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setMonthInsight(null); }} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7", fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
                <option value="" style={{ background: "#18181b" }}>Compare month…</option>
                {trends.slice(1).reverse().map(t => <option key={t.month} value={t.month} style={{ background: "#18181b" }}>{FULL_MO[parseInt(t.month.split("-")[1]) - 1]} {t.month.split("-")[0]}</option>)}
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

        {/* AI SUMMARY */}
        {(summary || aiLoading) && (
          <div style={{ ...S.sec, borderRadius: 20, background: "rgba(167,139,250,0.03)", border: "1px solid rgba(167,139,250,0.1)", padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", opacity: 0.03, filter: "blur(60px)", background: "#a78bfa" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Sparkles size={18} color="#a78bfa" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>AI Analysis Summary</span>
                {summary && <button onClick={() => { setAnalysis(null); setSummary(""); }} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>}
              </div>
              {aiLoading ? <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", fontSize: 14 }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Reading financial signals…</div>
              : <p style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{summary}</p>}
            </div>
          </div>
        )}

        {/* MONTH INSIGHT */}
        {(monthInsight || monthLoading) && (
          <div style={{ ...S.sec, borderRadius: 20, background: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.1)", padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", opacity: 0.03, filter: "blur(60px)", background: "#38bdf8" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <BarChart3 size={18} color="#38bdf8" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>Month-over-Month: {selectedMonth && FULL_MO[parseInt(selectedMonth.split("-")[1]) - 1]} {selectedMonth?.split("-")[0]}</span>
                <button onClick={() => { setMonthInsight(null); setSelectedMonth(""); }} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>
              </div>
              {monthLoading ? <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#71717a", fontSize: 14 }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Comparing…</div>
              : <div className="md" style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.7 }}><ReactMarkdown>{monthInsight}</ReactMarkdown></div>}
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
          <div style={S.chHdr}><div><p style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>Monthly Spend Trend</p><p style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{m.label}</p></div>
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
        <span style={S.ftTxt}>Powered by AI</span>
      </div></footer>

      {/* CHATBOT */}
      <button onClick={() => setChatOpen(!chatOpen)} style={S.fab}>
        {chatOpen ? <X size={24} color="#fff" /> : <MessageSquare size={24} color="#fff" />}
        {analysis && !chatOpen && <div style={S.fabDot} />}
      </button>
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
                <p style={{ fontSize: 13 }}>Click "Analyze with AI" first</p>
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