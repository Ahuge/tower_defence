/**
 * All messages sent between peers during a versus game.
 * Each player simulates the opponent's game locally using these events.
 */

export type GameMessage =
  | { type: 'tower_placed'; towerId: string; col: number; row: number }
  | { type: 'tower_sold'; col: number; row: number }
  | { type: 'tower_upgraded'; col: number; row: number }
  | { type: 'send_purchased'; sendOptionId: string }
  | { type: 'frontier_purchased'; buildingId: string }
  | { type: 'wave_ready' }
  | { type: 'lives_update'; lives: number }
  | { type: 'game_over'; won: boolean }
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
