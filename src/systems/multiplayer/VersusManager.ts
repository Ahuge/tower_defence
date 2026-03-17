import { PeerConnection, ConnectionState } from './PeerConnection';
import { GameMessage, decodeMessage } from './MessageProtocol';
import { GameStats } from '../StatsTracker';

export class VersusManager {
  peer: PeerConnection;
  isHost: boolean = false;

  // Wave timing
  opponentReady: boolean = false;
  localReady: boolean = false;
  waveTimer: number = 0;
  waveTimerActive: boolean = false;

  // Wave sync
  localWaveCleared: boolean = false;
  opponentWaveCleared: boolean = false;

  // Opponent state
  opponentLives: number = 20;
  opponentWave: number = 0;
  opponentTowers: { towerId: string; col: number; row: number; level: number }[] = [];
  opponentGameOver: boolean = false;
  opponentEndStats: { stats: GameStats; wave: number; lives: number; sendsSent: number; sendsReceived: number } | null = null;
  opponentDisconnected: boolean = false;

  // Incoming sends + chat
  incomingSends: string[] = [];
  incomingChats: string[] = [];

  // Stats
  sendsSent: number = 0;
  sendsReceived: number = 0;

  // Ping
  lastPingSent: number = 0;
  latencyMs: number = 0;
  private pingInterval: number = 0;

  // Shared seed for mirrored waves
  sharedSeed: number = 0;

  // Callbacks
  onGameMessage: ((msg: GameMessage) => void) | null = null;
  private onConnectionChange: ((state: ConnectionState) => void) | null = null;

  constructor(
    onGameMessage: (msg: GameMessage) => void,
    onConnectionChange: (state: ConnectionState) => void,
  ) {
    this.onGameMessage = onGameMessage;
    this.onConnectionChange = onConnectionChange;

    this.peer = new PeerConnection(
      (data) => this.handleMessage(data),
      (state) => {
        this.onConnectionChange?.(state);
        if (state === 'failed') {
          this.opponentDisconnected = true;
        }
      },
    );
  }

  async host(): Promise<string> {
    this.isHost = true;
    this.sharedSeed = Math.floor(Math.random() * 999999);
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

    switch (msg.type) {
      case 'tower_placed':
        this.opponentTowers.push({ towerId: msg.towerId, col: msg.col, row: msg.row, level: 1 });
        break;
      case 'tower_sold':
        this.opponentTowers = this.opponentTowers.filter(t => !(t.col === msg.col && t.row === msg.row));
        break;
      case 'tower_upgraded': {
        const t = this.opponentTowers.find(t => t.col === msg.col && t.row === msg.row);
        if (t) t.level = msg.level;
        break;
      }
      case 'send_purchased':
        this.incomingSends.push(msg.sendOptionId);
        this.sendsReceived++;
        break;
      case 'lives_update':
        this.opponentLives = msg.lives;
        break;
      case 'wave_ready':
        this.opponentReady = true;
        break;
      case 'wave_cleared':
        this.opponentWaveCleared = true;
        this.opponentWave = msg.wave;
        if (this.isHost && this.localWaveCleared && this.opponentWaveCleared) {
          this.beginCountdown(30000);
        }
        break;
      case 'countdown_start':
        if (!this.isHost) {
          this.startWaveCountdown(msg.duration);
        }
        break;
      case 'tower_pool':
        break; // forwarded to GameScene via callback
      case 'speed_change':
        break; // forwarded to GameScene
      case 'chat':
        this.incomingChats.push(msg.text);
        break;
      case 'game_over':
        this.opponentGameOver = true;
        this.opponentEndStats = {
          stats: msg.stats,
          wave: msg.wave,
          lives: msg.lives,
          sendsSent: msg.sendsSent,
          sendsReceived: msg.sendsReceived,
        };
        break;
      case 'game_start':
        this.sharedSeed = msg.seed;
        break;
      case 'pong':
        this.latencyMs = Date.now() - msg.timestamp;
        break;
      case 'ping':
        this.send({ type: 'pong', timestamp: msg.timestamp });
        break;
    }

    this.onGameMessage?.(msg);
  }

  notifyWaveCleared(wave: number): void {
    this.localWaveCleared = true;
    this.send({ type: 'wave_cleared', wave });

    if (this.isHost && this.opponentWaveCleared) {
      this.beginCountdown(30000);
    }
  }

  private beginCountdown(duration: number): void {
    this.localWaveCleared = false;
    this.opponentWaveCleared = false;
    this.startWaveCountdown(duration);
    this.send({ type: 'countdown_start', duration });
  }

  drainIncomingSends(): string[] {
    const sends = [...this.incomingSends];
    this.incomingSends = [];
    return sends;
  }

  drainIncomingChats(): string[] {
    const chats = [...this.incomingChats];
    this.incomingChats = [];
    return chats;
  }

  updateWaveTimer(delta: number): boolean {
    if (!this.waveTimerActive) return false;
    this.waveTimer -= delta;
    if (this.waveTimer <= 0 || (this.localReady && this.opponentReady)) {
      this.waveTimerActive = false;
      this.localReady = false;
      this.opponentReady = false;
      return true;
    }
    return false;
  }

  startWaveCountdown(durationMs: number = 30000): void {
    this.waveTimer = durationMs;
    this.waveTimerActive = true;
    this.localReady = false;
    this.opponentReady = false;
  }

  voteReady(): void {
    this.localReady = true;
    this.send({ type: 'wave_ready' });
  }

  sendChat(text: string): void {
    this.send({ type: 'chat', text });
  }

  notifyGameOver(won: boolean, stats: GameStats, wave: number, lives: number): void {
    this.send({
      type: 'game_over', won, stats, wave, lives,
      sendsSent: this.sendsSent, sendsReceived: this.sendsReceived,
    });
  }

  /** Call periodically to send pings */
  updatePing(delta: number): void {
    this.pingInterval += delta;
    if (this.pingInterval >= 3000) {
      this.pingInterval = 0;
      this.lastPingSent = Date.now();
      this.send({ type: 'ping', timestamp: this.lastPingSent });
    }
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
