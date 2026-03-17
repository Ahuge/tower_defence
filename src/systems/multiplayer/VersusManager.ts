import { PeerConnection, ConnectionState } from './PeerConnection';
import { GameMessage, decodeMessage } from './MessageProtocol';

/**
 * Manages the versus game session — connection, message routing,
 * wave timing, and opponent state tracking.
 */
export class VersusManager {
  peer: PeerConnection;
  isHost: boolean = false;
  opponentReady: boolean = false;
  localReady: boolean = false;
  waveTimer: number = 30000; // 30s between waves
  waveTimerActive: boolean = false;

  // Opponent's visible state
  opponentLives: number = 20;
  opponentWave: number = 0;
  opponentTowers: { towerId: string; col: number; row: number; level: number }[] = [];

  // Incoming sends from opponent (to spawn in our game)
  incomingSends: string[] = [];

  // Callbacks
  private onGameMessage: ((msg: GameMessage) => void) | null = null;
  private onConnectionChange: ((state: ConnectionState) => void) | null = null;

  constructor(
    onGameMessage: (msg: GameMessage) => void,
    onConnectionChange: (state: ConnectionState) => void,
  ) {
    this.onGameMessage = onGameMessage;
    this.onConnectionChange = onConnectionChange;

    this.peer = new PeerConnection(
      (data) => this.handleMessage(data),
      (state) => this.onConnectionChange?.(state),
    );
  }

  async host(): Promise<string> {
    this.isHost = true;
    return this.peer.createOffer();
  }

  async acceptAnswer(answer: string): Promise<void> {
    await this.peer.acceptAnswer(answer);
  }

  async join(offer: string): Promise<string> {
    this.isHost = false;
    return this.peer.acceptOffer(offer);
  }

  send(msg: GameMessage): void {
    this.peer.sendJSON(msg);
  }

  private handleMessage(data: string): void {
    const msg = decodeMessage(data);
    if (!msg) return;

    // Track opponent state for the minimap
    switch (msg.type) {
      case 'tower_placed':
        this.opponentTowers.push({ towerId: msg.towerId, col: msg.col, row: msg.row, level: 1 });
        break;
      case 'tower_sold':
        this.opponentTowers = this.opponentTowers.filter(t => !(t.col === msg.col && t.row === msg.row));
        break;
      case 'tower_upgraded': {
        const t = this.opponentTowers.find(t => t.col === msg.col && t.row === msg.row);
        if (t) t.level++;
        break;
      }
      case 'send_purchased':
        // Opponent's sends come to US as extra creeps
        this.incomingSends.push(msg.sendOptionId);
        break;
      case 'lives_update':
        this.opponentLives = msg.lives;
        break;
      case 'wave_ready':
        this.opponentReady = true;
        break;
      case 'game_over':
        // Opponent's game ended
        break;
    }

    // Forward to game scene for handling
    this.onGameMessage?.(msg);
  }

  /** Get and clear pending incoming sends */
  drainIncomingSends(): string[] {
    const sends = [...this.incomingSends];
    this.incomingSends = [];
    return sends;
  }

  /** Update wave timer. Returns true if timer expired. */
  updateWaveTimer(delta: number): boolean {
    if (!this.waveTimerActive) return false;
    this.waveTimer -= delta;
    if (this.waveTimer <= 0 || (this.localReady && this.opponentReady)) {
      this.waveTimerActive = false;
      this.localReady = false;
      this.opponentReady = false;
      return true; // start wave
    }
    return false;
  }

  startWaveCountdown(): void {
    this.waveTimer = 30000;
    this.waveTimerActive = true;
    this.localReady = false;
    this.opponentReady = false;
  }

  voteReady(): void {
    this.localReady = true;
    this.send({ type: 'wave_ready' });
  }

  getWaveTimerSeconds(): number {
    return Math.max(0, Math.ceil(this.waveTimer / 1000));
  }

  isConnected(): boolean {
    return this.peer.state === 'connected';
  }

  close(): void {
    this.peer.close();
  }
}
