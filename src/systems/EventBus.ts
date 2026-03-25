type EventCallback = (...args: any[]) => void;

export interface GameEvents {
  towerPlaced: (col: number, row: number, towerId: string) => void;
  towerSold: (col: number, row: number) => void;
  creepKilled: (creepId: number, gold: number) => void;
  creepReached: (creepId: number) => void;
  waveStarted: (waveNum: number) => void;
  waveCleared: (waveNum: number) => void;
  goldChanged: (amount: number, newTotal: number) => void;
  livesChanged: (newLives: number) => void;
  gameOver: () => void;
  gameWon: () => void;
  pathUpdated: (path: { col: number; row: number }[] | null) => void;
  // Base Defence events
  buildingPlaced: (buildingId: string, col: number, row: number) => void;
  buildingCompleted: (buildingId: string, col: number, row: number) => void;
  buildingDestroyed: (buildingId: string, col: number, row: number, owner: string) => void;
}

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on<K extends keyof GameEvents>(event: K, callback: GameEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as EventCallback);
  }

  off<K extends keyof GameEvents>(event: K, callback: GameEvents[K]): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback as EventCallback);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  emit<K extends keyof GameEvents>(event: K, ...args: Parameters<GameEvents[K]>): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    for (const cb of cbs) {
      cb(...args);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
