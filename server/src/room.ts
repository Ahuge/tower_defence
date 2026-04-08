/**
 * GameRoom Durable Object — manages a single multiplayer room.
 *
 * Handles player join/leave, WebSocket signaling for SDP exchange,
 * faction selection relay, and room lifecycle (auto-expiry).
 */
import { generateToken } from './utils';

interface PlayerState {
  index: number;
  token: string;
  ws: WebSocket | null;
  ready: boolean;        // WebRTC connection established
  faction: string | null;
}

interface RoomConfig {
  code: string;
  mode: 'versus' | 'circle';
  maxPlayers: number;
  hostToken: string;
  createdAt: number;
  status: 'waiting' | 'signaling' | 'playing' | 'closed';
}

/** Messages from client → server */
interface ClientMessage {
  type: 'offer' | 'answer' | 'ice' | 'ready' | 'faction';
  sdp?: string;
  candidate?: string;
  targetPlayer?: number;
  faction?: string;
}

/** Messages from server → client */
type ServerMessage =
  | { type: 'player_joined'; playerIndex: number; playerCount: number }
  | { type: 'player_left'; playerIndex: number }
  | { type: 'offer'; sdp: string; fromPlayer: number }
  | { type: 'answer'; sdp: string; fromPlayer: number }
  | { type: 'ice'; candidate: string; fromPlayer: number }
  | { type: 'all_ready' }
  | { type: 'faction'; playerIndex: number; faction: string }
  | { type: 'room_info'; playerIndex: number; playerCount: number; mode: string; maxPlayers: number }
  | { type: 'error'; message: string };

export class GameRoom {
  private state: DurableObjectState;
  private config: RoomConfig | null = null;
  private players: Map<number, PlayerState> = new Map();
  private expiryAlarm: number | null = null;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade for signaling
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(url);
    }

    // REST endpoints
    if (request.method === 'POST' && path.endsWith('/create')) {
      return this.handleCreate(request);
    }
    if (request.method === 'POST' && path.endsWith('/join')) {
      return this.handleJoin();
    }
    if (request.method === 'GET' && path.endsWith('/info')) {
      return this.handleInfo();
    }
    if (request.method === 'DELETE') {
      return this.handleClose(request);
    }

    return new Response('Not found', { status: 404 });
  }

  // ===================== REST Handlers =====================

  private async handleCreate(request: Request): Promise<Response> {
    if (this.config) {
      return jsonResponse({ error: 'Room already exists' }, 409);
    }

    const body = await request.json() as { mode?: string; maxPlayers?: number; code?: string };
    const mode = (body.mode === 'circle' ? 'circle' : 'versus') as 'versus' | 'circle';
    const maxPlayers = mode === 'versus' ? 2 : Math.min(body.maxPlayers ?? 4, 4);
    const hostToken = generateToken();

    this.config = {
      code: body.code ?? '????',
      mode,
      maxPlayers,
      hostToken,
      createdAt: Date.now(),
      status: 'waiting',
    };

    // Host is player 0
    this.players.set(0, {
      index: 0,
      token: hostToken,
      ws: null,
      ready: false,
      faction: null,
    });

    // Auto-expire if no one joins in 10 minutes
    await this.setExpiry(10 * 60 * 1000);

    return jsonResponse({
      code: this.config.code,
      hostToken,
      playerIndex: 0,
      mode,
      maxPlayers,
    });
  }

  private handleJoin(): Response {
    if (!this.config) {
      return jsonResponse({ error: 'Room not found' }, 404);
    }
    if (this.config.status === 'closed') {
      return jsonResponse({ error: 'Room closed' }, 410);
    }
    if (this.players.size >= this.config.maxPlayers) {
      return jsonResponse({ error: 'Room full' }, 409);
    }

    const playerIndex = this.players.size;
    const token = generateToken();

    this.players.set(playerIndex, {
      index: playerIndex,
      token,
      ws: null,
      ready: false,
      faction: null,
    });

    this.config.status = 'signaling';

    // Notify connected players about the new joiner
    this.broadcast({
      type: 'player_joined',
      playerIndex,
      playerCount: this.players.size,
    });

    return jsonResponse({
      playerIndex,
      joinToken: token,
      playerCount: this.players.size,
      mode: this.config.mode,
      maxPlayers: this.config.maxPlayers,
    });
  }

  private handleInfo(): Response {
    if (!this.config) {
      return jsonResponse({ error: 'Room not found' }, 404);
    }
    return jsonResponse({
      code: this.config.code,
      mode: this.config.mode,
      maxPlayers: this.config.maxPlayers,
      playerCount: this.players.size,
      status: this.config.status,
    });
  }

  private handleClose(request: Request): Response {
    const token = new URL(request.url).searchParams.get('token');
    if (!this.config || token !== this.config.hostToken) {
      return jsonResponse({ error: 'Unauthorized' }, 403);
    }
    this.closeRoom();
    return jsonResponse({ closed: true });
  }

  // ===================== WebSocket Handler =====================

  private handleWebSocket(url: URL): Response {
    const token = url.searchParams.get('token');
    if (!this.config || !token) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Find player by token
    let player: PlayerState | null = null;
    for (const p of this.players.values()) {
      if (p.token === token) { player = p; break; }
    }
    if (!player) {
      return new Response('Invalid token', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    // Tag the WebSocket with player index for identification
    server.serializeAttachment(player.index);
    player.ws = server;

    // Send room info to the connecting player
    server.send(JSON.stringify({
      type: 'room_info',
      playerIndex: player.index,
      playerCount: this.players.size,
      mode: this.config.mode,
      maxPlayers: this.config.maxPlayers,
    } satisfies ServerMessage));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, rawMsg: string | ArrayBuffer): Promise<void> {
    const playerIndex = ws.deserializeAttachment() as number;
    if (typeof rawMsg !== 'string') return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawMsg);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'offer':
      case 'answer':
      case 'ice':
        this.relaySdp(playerIndex, msg);
        break;
      case 'ready':
        this.handleReady(playerIndex);
        break;
      case 'faction':
        this.handleFaction(playerIndex, msg.faction ?? 'random');
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerIndex = ws.deserializeAttachment() as number;
    const player = this.players.get(playerIndex);
    if (player) {
      player.ws = null;
      this.broadcast({ type: 'player_left', playerIndex }, playerIndex);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ===================== Signaling Logic =====================

  /** Relay SDP offer/answer/ICE from one player to another */
  private relaySdp(fromPlayer: number, msg: ClientMessage): void {
    const target = msg.targetPlayer;
    if (target === undefined) return;

    const targetPlayer = this.players.get(target);
    if (!targetPlayer?.ws) return;

    let relayMsg: ServerMessage;
    if (msg.type === 'offer') {
      relayMsg = { type: 'offer', sdp: msg.sdp!, fromPlayer };
    } else if (msg.type === 'answer') {
      relayMsg = { type: 'answer', sdp: msg.sdp!, fromPlayer };
    } else {
      relayMsg = { type: 'ice', candidate: msg.candidate!, fromPlayer };
    }

    targetPlayer.ws.send(JSON.stringify(relayMsg));
  }

  /** Mark player as WebRTC-connected, check if all ready */
  private handleReady(playerIndex: number): void {
    const player = this.players.get(playerIndex);
    if (player) player.ready = true;

    // Check if all players are ready
    const allReady = this.players.size >= 2 &&
      Array.from(this.players.values()).every(p => p.ready);

    if (allReady) {
      this.config!.status = 'playing';
      this.broadcast({ type: 'all_ready' });
    }
  }

  /** Relay faction selection to all other players */
  private handleFaction(playerIndex: number, faction: string): void {
    const player = this.players.get(playerIndex);
    if (player) player.faction = faction;

    this.broadcast({ type: 'faction', playerIndex, faction }, playerIndex);
  }

  // ===================== Helpers =====================

  /** Send a message to all connected players (optionally exclude one) */
  private broadcast(msg: ServerMessage, excludePlayer?: number): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (player.index === excludePlayer) continue;
      if (player.ws) {
        try { player.ws.send(data); } catch { /* disconnected */ }
      }
    }
  }

  private closeRoom(): void {
    if (this.config) this.config.status = 'closed';
    for (const player of this.players.values()) {
      if (player.ws) {
        try { player.ws.close(1000, 'Room closed'); } catch { /* ignore */ }
      }
    }
    this.players.clear();
  }

  private async setExpiry(ms: number): Promise<void> {
    this.expiryAlarm = Date.now() + ms;
    await this.state.storage.setAlarm(this.expiryAlarm);
  }

  async alarm(): Promise<void> {
    // Auto-expire room if not playing
    if (this.config && this.config.status !== 'playing') {
      this.closeRoom();
    }
  }
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
