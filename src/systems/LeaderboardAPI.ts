const API_URL = 'https://signal.streamingsplats.com';

export interface LeaderboardEntry {
  id: string;
  name: string;
  wave: number;
  faction: string;
  difficulty: string;
  mode: string;
  timestamp: number;
}

export class LeaderboardAPI {
  static async getScores(mode?: string, limit?: number): Promise<LeaderboardEntry[]> {
    try {
      const params = new URLSearchParams();
      if (mode) params.set('mode', mode);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const url = `${API_URL}/scores${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch (_) {
      return [];
    }
  }

  static async submitScore(
    name: string,
    wave: number,
    faction: string,
    difficulty: string,
    mode: string,
  ): Promise<{ success: boolean; rank?: number; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, wave, faction, difficulty, mode }),
      });
      if (!res.ok) {
        return { success: false, error: `Server error (${res.status})` };
      }
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Network error — could not reach leaderboard server' };
    }
  }
}
