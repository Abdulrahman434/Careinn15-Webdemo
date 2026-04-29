export const getSessionId = () => {
  let sessionId = localStorage.getItem("careinn_session_id");
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("careinn_session_id", sessionId);
  }
  return sessionId;
};

export const saveGameState = async (gameId: string, state: any) => {
  const sessionId = getSessionId();
  try {
    await fetch('/api/games/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, gameId, state })
    });
  } catch (error) {
    console.error(`Error saving ${gameId} state:`, error);
  }
};

export const loadGameState = async (gameId: string) => {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`/api/games/load?sessionId=${sessionId}&gameId=${gameId}`);
    if (response.ok) {
      const data = await response.json();
      return data.state;
    }
  } catch (error) {
    console.error(`Error loading ${gameId} state:`, error);
  }
  return null;
};

export const clearGameState = async (gameId: string) => {
  const sessionId = getSessionId();
  try {
    await fetch('/api/games/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, gameId })
    });
  } catch (error) {
    console.error(`Error clearing ${gameId} state:`, error);
  }
};
