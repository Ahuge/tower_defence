import { GameStats } from '../StatsTracker';

export type GameMessage =
  | { type: 'tower_placed'; towerId: string; col: number; row: number }
  | { type: 'tower_sold'; col: number; row: number }
  | { type: 'tower_upgraded'; col: number; row: number; level: number }
  | { type: 'send_purchased'; sendOptionId: string }
  | { type: 'frontier_purchased'; buildingId: string }
  | { type: 'wave_ready' }
  | { type: 'wave_cleared'; wave: number }
  | { type: 'countdown_start'; duration: number }
  | { type: 'tower_pool'; towerIds: string[] }
  | { type: 'frontier_pool'; buildingIds: string[] }
  | { type: 'lives_update'; lives: number }
  | { type: 'speed_change'; speed: number }
  | { type: 'chat'; text: string }
  | { type: 'game_over'; won: boolean; stats: GameStats; wave: number; lives: number; sendsSent: number; sendsReceived: number }
  | { type: 'game_start'; faction: string; matchMode: string; map: string; difficulty: string; seed: number; customMapJSON?: any }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number }
  // Circle co-op messages
  | { type: 'circle_leak'; creepType: string; hp: number; speed: number; isBoss: boolean; color: number; size: number }
  | { type: 'player_eliminated'; playerIndex: number }
  // `botSlots`: indexes occupied by host-simulated CPU players. Joiners
  // use this to suppress any "waiting for player N to connect" state
  // and to render the slot's roster entry as `[CPU]`.
  // `hostTerrainOverride`: equipped store theme to propagate so peers
  // render the same skin as the host.
  | { type: 'circle_game_start'; players: { index: number; faction: string }[]; map: string; difficulty: string; seed: number; customMapJSON?: any; botSlots?: number[]; hostTerrainOverride?: string | null }
  | { type: 'player_joined'; playerIndex: number; totalPlayers: number }
  | { type: 'all_waves_cleared'; wave: number }
  | { type: 'circle_victory'; winnerIndex: number }
  | { type: 'tower_sync'; towers: { towerId: string; col: number; row: number; level: number }[] };

/** Envelope wrapper for CircleManager routing */
export interface CircleEnvelope {
  from: number;
  to: number | 'all';
  payload: GameMessage;
}

export function decodeEnvelope(data: string): CircleEnvelope | null {
  try {
    const obj = JSON.parse(data);
    if (obj && typeof obj.from === 'number' && obj.payload) {
      return obj as CircleEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

export function decodeMessage(data: string): GameMessage | null {
  try {
    return JSON.parse(data) as GameMessage;
  } catch {
    return null;
  }
}
