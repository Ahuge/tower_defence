import { PeerConnection, ConnectionState } from './PeerConnection';
import { SignalingClient } from './SignalingClient';
import { GameMessage, CircleEnvelope, decodeEnvelope } from './MessageProtocol';

/**
 * Shared-map Circle Co-op manager.
 * Star topology: host has N-1 PeerConnections, joiners each have 1.
 * All players share one map. Each player has a zone (quadrant).
 * Host relays all tower/game events between players.
 */
export class CircleManager {
  isHost: boolean = false;
  playerIndex: number = 0;
  playerCount: number = 0;

  // Host: one PeerConnection per joiner (keyed by playerIndex)
  private hostPeers: Map<number, PeerConnection> = new Map();
  // Joiner: single PeerConnection to host
  private joinerPeer: PeerConnection | null = null;

  // Player info
  playerFactions: Map<number, string> = new Map();

  // Shared game state
  sharedLives: number = 20;
  sharedSeed: number = 0;
  /** Host's equipped terrain themeId. Coop renders the host's
   *  choice on every peer's grid (shared grid → single visual).
   *  null means the host has nothing equipped → use map default.
   *  Populated by joiners on `circle_game_start`; the host sets it
   *  from its own SkinManager state at broadcast time. Null on the
   *  host side too if nothing is equipped. */
  hostTerrainOverride: string | null = null;

  // Wave sync
  playersReady: Set<number> = new Set();
  playersWaveCleared: Set<number> = new Set();
  waveTimer: number = 0;
  waveTimerActive: boolean = false;
  localReady: boolean = false;

  // Incoming tower events from other players
  incomingTowerEvents: { from: number; msg: GameMessage }[] = [];
  incomingChats: { from: number; text: string }[] = [];

  // Connection tracking
  private connectedPlayers: Set<number> = new Set();

  // Callbacks
  onGameMessage: ((msg: GameMessage, fromPlayer: number) => void) | null = null;
  onConnectionChange: ((playerIndex: number, state: ConnectionState) => void) | null = null;
  onPlayerConnected: ((playerIndex: number) => void) | null = null;

  constructor(
    onGameMessage: (msg: GameMessage, fromPlayer: number) => void,
    onConnectionChange: (playerIndex: number, state: ConnectionState) => void,
  ) {
    this.onGameMessage = onGameMessage;
    this.onConnectionChange = onConnectionChange;
  }

  // === Host Methods ===

  initHost(): void {
    this.isHost = true;
    this.playerIndex = 0;
    this.playerCount = 1;
    this.sharedSeed = Math.floor(Math.random() * 999999);
    this.connectedPlayers.add(0);
  }

  async createOfferForNextPlayer(): Promise<[number, string]> {
    const nextIndex = this.playerCount;
    this.playerCount++;

    const peer = new PeerConnection(
      (data) => this.handleHostMessage(data, nextIndex),
      (state) => {
        this.onConnectionChange?.(nextIndex, state);
        if (state === 'connected') {
          this.connectedPlayers.add(nextIndex);
          this.onPlayerConnected?.(nextIndex);
        }
        if (state === 'failed') {
          this.connectedPlayers.delete(nextIndex);
        }
      },
    );

    this.hostPeers.set(nextIndex, peer);
    const offer = await peer.createOffer();
    return [nextIndex, offer];
  }

  async acceptAnswer(playerIndex: number, answer: string): Promise<void> {
    const peer = this.hostPeers.get(playerIndex);
    if (!peer) throw new Error(`No peer for player ${playerIndex}`);
    await peer.acceptAnswer(answer);
  }

  // === Signaling Server Methods ===

  /** HOST: connect to a joiner via signaling server */
  async hostConnectPlayer(signaling: SignalingClient, joinerIndex: number): Promise<void> {
    const peer = new PeerConnection(
      (data) => this.handleHostMessage(data, joinerIndex),
      (state) => {
        this.onConnectionChange?.(joinerIndex, state);
        if (state === 'connected') {
          this.connectedPlayers.add(joinerIndex);
          this.onPlayerConnected?.(joinerIndex);
        }
        if (state === 'failed') {
          this.connectedPlayers.delete(joinerIndex);
        }
      },
    );
    this.hostPeers.set(joinerIndex, peer);
    await peer.connectAsHost(signaling, joinerIndex);
  }

  /** JOINER: connect to host via signaling server */
  async joinViaSignaling(signaling: SignalingClient): Promise<void> {
    this.isHost = false;
    this.joinerPeer = new PeerConnection(
      (data) => this.handleJoinerMessage(data),
      (state) => {
        this.onConnectionChange?.(0, state);
        if (state === 'connected') {
          this.connectedPlayers.add(0);
        }
      },
    );
    await this.joinerPeer.connectAsJoiner(signaling, 0);
  }

  // === Manual Methods (Fallback) ===

  async joinAsClient(offer: string): Promise<string> {
    this.isHost = false;
    this.joinerPeer = new PeerConnection(
      (data) => this.handleJoinerMessage(data),
      (state) => {
        this.onConnectionChange?.(0, state);
        if (state === 'connected') {
          this.connectedPlayers.add(0);
        }
      },
    );
    return this.joinerPeer.acceptOffer(offer);
  }

  setPlayerInfo(index: number, count: number): void {
    this.playerIndex = index;
    this.playerCount = count;
  }

  // === Message Routing ===

  send(msg: GameMessage, toPlayer?: number): void {
    const envelope: CircleEnvelope = {
      from: this.playerIndex,
      to: toPlayer ?? 'all',
      payload: msg,
    };

    if (this.isHost) {
      if (toPlayer !== undefined && toPlayer !== 0) {
        this.hostPeers.get(toPlayer)?.sendJSON(envelope);
      } else if (toPlayer === undefined) {
        for (const [, peer] of this.hostPeers) {
          peer.sendJSON(envelope);
        }
      }
    } else {
      this.joinerPeer?.sendJSON(envelope);
    }
  }

  broadcast(msg: GameMessage): void {
    this.send(msg);
  }

  /** Host: relay tower/game events from one joiner to all others */
  private handleHostMessage(data: string, fromIndex: number): void {
    const envelope = decodeEnvelope(data);
    if (!envelope) return;
    envelope.from = fromIndex;

    if (envelope.to === 'all') {
      // Relay to all other joiners
      for (const [idx, peer] of this.hostPeers) {
        if (idx !== fromIndex) {
          peer.sendJSON(envelope);
        }
      }
      // Also handle locally (host is player too)
      this.processMessage(envelope.payload, fromIndex);
    } else if (envelope.to === 0) {
      this.processMessage(envelope.payload, fromIndex);
    } else {
      const targetPeer = this.hostPeers.get(envelope.to as number);
      if (targetPeer) {
        targetPeer.sendJSON(envelope);
      }
    }
  }

  private handleJoinerMessage(data: string): void {
    const envelope = decodeEnvelope(data);
    if (!envelope) return;
    this.processMessage(envelope.payload, envelope.from);
  }

  private processMessage(msg: GameMessage, fromPlayer: number): void {
    switch (msg.type) {
      case 'tower_placed':
      case 'tower_sold':
      case 'tower_upgraded':
      case 'tower_sync':
        // Queue for GameScene to process
        this.incomingTowerEvents.push({ from: fromPlayer, msg });
        break;

      case 'wave_ready':
        this.playersReady.add(fromPlayer);
        break;

      case 'wave_cleared':
        this.playersWaveCleared.add(fromPlayer);
        if (this.isHost) {
          this.checkAllWavesCleared();
        }
        break;

      case 'countdown_start':
        if (!this.isHost) {
          this.startWaveCountdown(msg.duration);
        }
        break;

      case 'lives_update':
        this.sharedLives = msg.lives;
        break;

      case 'chat':
        this.incomingChats.push({ from: fromPlayer, text: msg.text });
        break;

      case 'speed_change':
      case 'circle_game_start':
      case 'player_joined':
      case 'circle_victory':
        break;

      case 'ping':
        this.send({ type: 'pong', timestamp: msg.timestamp }, fromPlayer);
        return;

      case 'pong':
        return;
    }

    this.onGameMessage?.(msg, fromPlayer);
  }

  // === Wave Sync ===

  private checkAllWavesCleared(): void {
    // Check if all connected players have cleared
    for (let i = 0; i < this.playerCount; i++) {
      if (!this.playersWaveCleared.has(i)) return;
    }
    // All cleared
    this.playersWaveCleared.clear();
    this.playersReady.clear();
    this.beginCountdown(30000);
    this.broadcast({ type: 'all_waves_cleared', wave: 0 });
  }

  private beginCountdown(duration: number): void {
    this.startWaveCountdown(duration);
    this.broadcast({ type: 'countdown_start', duration });
  }

  notifyWaveCleared(wave: number): void {
    this.playersWaveCleared.add(this.playerIndex);
    this.broadcast({ type: 'wave_cleared', wave });
    if (this.isHost) {
      this.checkAllWavesCleared();
    }
  }

  startWaveCountdown(durationMs: number = 30000): void {
    this.waveTimer = durationMs;
    this.waveTimerActive = true;
    this.localReady = false;
    this.playersReady.clear();
  }

  updateWaveTimer(delta: number): boolean {
    if (!this.waveTimerActive) return false;
    this.waveTimer -= delta;

    const allReady = this.localReady &&
      Array.from({ length: this.playerCount }, (_, i) => i)
        .filter(i => i !== this.playerIndex)
        .every(i => this.playersReady.has(i));

    if (this.waveTimer <= 0 || allReady) {
      this.waveTimerActive = false;
      this.localReady = false;
      this.playersReady.clear();
      return true;
    }
    return false;
  }

  getWaveTimerSeconds(): number {
    return Math.max(0, Math.ceil(this.waveTimer / 1000));
  }

  voteReady(): void {
    this.localReady = true;
    this.broadcast({ type: 'wave_ready' });
  }

  sendChat(text: string): void {
    this.broadcast({ type: 'chat', text });
  }

  // === Drain Queues ===

  drainTowerEvents(): { from: number; msg: GameMessage }[] {
    const events = [...this.incomingTowerEvents];
    this.incomingTowerEvents = [];
    return events;
  }

  drainChats(): { from: number; text: string }[] {
    const chats = [...this.incomingChats];
    this.incomingChats = [];
    return chats;
  }

  // === Shared Lives (host authoritative) ===

  /**
   * Host-authoritative life deduction. Called from the leak handler
   * whenever a creep reaches its exit; decrements the shared pool
   * and broadcasts the new total to every joiner.
   *
   * **Defensive**: no-op on joiner clients. Joiners' `sharedLives`
   * is mutated ONLY by incoming `lives_update` messages (see the
   * dispatch in `handleMessage` above). This belt-and-suspenders
   * guard means a future code path that accidentally calls
   * `deductLives` from a joiner context can't silently corrupt
   * the joiner's local copy — the host's broadcast remains the
   * single source of truth.
   */
  deductLives(amount: number): number {
    if (!this.isHost) return this.sharedLives;
    this.sharedLives = Math.max(0, this.sharedLives - amount);
    this.broadcast({ type: 'lives_update', lives: this.sharedLives });
    return this.sharedLives;
  }

  // === Connection State ===

  isConnected(): boolean {
    if (this.isHost) return this.connectedPlayers.size > 1;
    return this.joinerPeer?.state === 'connected';
  }

  getConnectedCount(): number {
    return this.connectedPlayers.size;
  }

  close(): void {
    for (const [, peer] of this.hostPeers) {
      peer.close();
    }
    this.hostPeers.clear();
    this.joinerPeer?.close();
    this.joinerPeer = null;
  }
}
