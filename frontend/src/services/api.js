const API_URL = 'http://localhost:8000';

async function get(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

export const api = {
  // Drift analysis
  getDriftPayroll: () => get('/api/drift/payroll'),
  getDriftAI: () => get('/api/drift/ai-costs'),
  getDriftSaas: () => get('/api/drift/saas'),

  // Monthly trends
  getTrendPayroll: () => get('/api/trends/payroll'),
  getTrendAI: () => get('/api/trends/ai-costs'),
  getTrendSaas: () => get('/api/trends/saas'),

  // Utilization
  getUtilization: () => get('/api/utilization/saas'),

  // Phase 2 placeholders
  analyzeWithAI: async (data) => {
    return { analysis: "AI analysis pending implementation (Phase 2)" };
  },
  chatWithAgent: async (message) => {
    return { reply: "Placeholder agent. Connect to LLM in Phase 2." };
  },
};