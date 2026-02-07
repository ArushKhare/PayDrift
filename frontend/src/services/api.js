const API_URL = "http://localhost:8000";

async function get(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

async function post(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${path} failed: ${response.status}`);
  return response.json();
}

export const api = {
  getDrift: () => get("/api/drift"),
  analyzeWithAI: () => post("/api/analyze", {}),
  chatWithAgent: (message, history) => post("/api/chat", { message, history }),
};
