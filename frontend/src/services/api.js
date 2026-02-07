const API_URL = 'http://localhost:8000';

async function get(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

export const api = {
  getDrift: () => get('/api/drift'),
};