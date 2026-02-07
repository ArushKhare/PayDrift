const API_URL = 'http://localhost:8000';

export const api = {
  // 1. Get the main demo dataset
  getDrift: async () => {
    try {
      const response = await fetch(`${API_URL}/api/drift`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error("Error fetching drift data:", error);
      throw error;
    }
  },

  // 2. Placeholder for Phase 2 AI Analysis
  analyzeWithAI: async (data) => {
    console.log("Analyzing data with AI...", data);
    return { analysis: "AI analysis pending implementation (Phase 2)" };
  },

  // 3. Placeholder for Phase 2 Chat
  chatWithAgent: async (message) => {
    console.log("Sending message to agent:", message);
    return { reply: "I am a placeholder agent. Connect me to an LLM in Phase 2." };
  }
};