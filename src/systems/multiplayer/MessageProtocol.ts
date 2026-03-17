import { GameStats } from '../StatsTracker';

export type GameMessage =
  | { type: 'tower_placed'; towerId: string; col: number; row: number }
  | { type: 'tower_sold'; col: number; row: number }
  | { type: 'tower_upgraded'; col: number; row: number }
  | { type: 'send_purchased'; sendOptionId: string }
  | { type: 'frontier_purchased'; buildingId: string }
  | { type: 'wave_ready' }
  | { type: 'wave_cleared' }
  | { type: 'countdown_start'; duration: number }
  | { type: 'lives_update'; lives: number }
  | { type: 'game_over'; won: boolean; stats: GameStats; wave: number; lives: number; sendsSent: number; sendsReceived: number }
  | { type: 'game_start'; faction: string; matchMode: string; map: string; difficulty: string; seed: number }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number };

export function encodeMessage(msg: GameMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(data: string): GameMessage | null {
  try {
    return JSON.parse(data) as GameMessage;
  } catch {
    return null;
  }
}
