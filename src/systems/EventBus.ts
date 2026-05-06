type EventCallback = (...args: any[]) => void;

export interface GameEvents {
  towerPlaced: (col: number, row: number, towerId: string) => void;
  towerSold: (col: number, row: number) => void;
  creepKilled: (creepId: number, gold: number) => void;
  creepReached: (creepId: number) => void;
  /** Fired once per creep constructed by SpawnManager — used by the
   *  DiscoveryTracker to unlock Encyclopedia entries + tick the
   *  DISCOVER_CREEPS incremental achievement. Fires for every spawn,
   *  subscribers de-dup via persisted state. */
  creepSpawned: (creepTypeId: string) => void;
  waveStarted: (waveNum: number) => void;
  waveCleared: (waveNum: number) => void;
  goldChanged: (amount: number, newTotal: number) => void;
  livesChanged: (newLives: number) => void;
  gameOver: () => void;
  gameWon: () => void;
  pathUpdated: (path: { col: number; row: number }[] | null) => void;
  sendPurchased: (sendId: string) => void;
  frontierPurchased: (buildingId: string) => void;
  /** Post-purchase frontier action — overcharge / dig / harvest.
   *  Targets a single owned building (`idx`) or all of a defId
   *  (`defId`). Used by LiveCapture to record the human's action
   *  pattern for AI training. */
  frontierActionPerformed: (event: { action: 'overcharge' | 'dig' | 'harvest'; idx?: number; defId?: string }) => void;
  dockTowerSelected: (index: number, towerId: string | null) => void;
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
