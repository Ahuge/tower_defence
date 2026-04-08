/**
 * GameRoom Durable Object — manages a single multiplayer room.
 *
 * Persists room config and player tokens to storage so state survives
 * between requests (Durable Objects may be evicted from memory).
 * WebSocket connections are transient (managed via Hibernation API).
 */
import { generateToken } from './utils';

interface PlayerRecord {
  index: number;
  token: string;
  ready: boolean;
  faction: string | null;
}

interface RoomConfig {
  code: string;
  mode: 'versus' | 'circle';
  maxPlayers: number;
  hostToken: string;
  createdAt: number;
  status: 'waiting' | 'signaling' | 'playing' | 'closed';
  players: PlayerRecord[];
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

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
  }

  // ===================== Storage Helpers =====================

  private async getConfig(): Promise<RoomConfig | null> {
    return await this.state.storage.get<RoomConfig>('config') ?? null;
  }

  private async saveConfig(config: RoomConfig): Promise<void> {
    await this.state.storage.put('config', config);
  }

  // ===================== Request Router =====================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(url);
    }

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
    const existing = await this.getConfig();
    if (existing) {
      return jsonResponse({ error: 'Room already exists' }, 409);
    }

    const body = await request.json() as { mode?: string; maxPlayers?: number; code?: string };
    const mode = (body.mode === 'circle' ? 'circle' : 'versus') as 'versus' | 'circle';
    const maxPlayers = mode === 'versus' ? 2 : Math.min(body.maxPlayers ?? 4, 4);
    const hostToken = generateToken();

    const config: RoomConfig = {
      code: body.code ?? '????',
      mode,
      maxPlayers,
      hostToken,
      createdAt: Date.now(),
      status: 'waiting',
      players: [{
        index: 0,
        token: hostToken,
        ready: false,
        faction: null,
      }],
    };

    await this.saveConfig(config);

    // Auto-expire if no one joins in 10 minutes
    await this.state.storage.setAlarm(Date.now() + 10 * 60 * 1000);

    return jsonResponse({
      code: config.code,
      hostToken,
      playerIndex: 0,
      mode,
      maxPlayers,
    });
  }

  private async handleJoin(): Promise<Response> {
    const config = await this.getConfig();
    if (!config) {
      return jsonResponse({ error: 'Room not found' }, 404);
    }
    if (config.status === 'closed') {
      return jsonResponse({ error: 'Room closed' }, 410);
    }
    if (config.players.length >= config.maxPlayers) {
      return jsonResponse({ error: 'Room full' }, 409);
    }

    const playerIndex = config.players.length;
    const token = generateToken();

    config.players.push({
      index: playerIndex,
      token,
      ready: false,
      faction: null,
    });
    config.status = 'signaling';
    await this.saveConfig(config);

    // Notify connected players
    this.broadcast({
      type: 'player_joined',
      playerIndex,
      playerCount: config.players.length,
    });

    return jsonResponse({
      playerIndex,
      joinToken: token,
      playerCount: config.players.length,
      mode: config.mode,
      maxPlayers: config.maxPlayers,
    });
  }

  private async handleInfo(): Promise<Response> {
    const config = await this.getConfig();
    if (!config) {
      return jsonResponse({ error: 'Room not found' }, 404);
    }
    return jsonResponse({
      code: config.code,
      mode: config.mode,
      maxPlayers: config.maxPlayers,
      playerCount: config.players.length,
      status: config.status,
    });
  }

  private async handleClose(request: Request): Promise<Response> {
    const config = await this.getConfig();
    const token = new URL(request.url).searchParams.get('token');
    if (!config || token !== config.hostToken) {
      return jsonResponse({ error: 'Unauthorized' }, 403);
    }
    await this.closeRoom();
    return jsonResponse({ closed: true });
  }

  // ===================== WebSocket Handler =====================

  private async handleWebSocket(url: URL): Promise<Response> {
    const token = url.searchParams.get('token');
    const config = await this.getConfig();
    if (!config || !token) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Find player by token
    const player = config.players.find(p => p.token === token);
    if (!player) {
      return new Response('Invalid token', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    server.serializeAttachment(player.index);

    // Send room info
    server.send(JSON.stringify({
      type: 'room_info',
      playerIndex: player.index,
      playerCount: config.players.length,
      mode: config.mode,
      maxPlayers: config.maxPlayers,
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
        await this.handleReady(playerIndex);
        break;
      case 'faction':
        await this.handleFaction(playerIndex, msg.faction ?? 'random');
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerIndex = ws.deserializeAttachment() as number;
    this.broadcast({ type: 'player_left', playerIndex }, playerIndex);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ===================== Signaling Logic =====================

  private relaySdp(fromPlayer: number, msg: ClientMessage): void {
    const target = msg.targetPlayer;
    if (target === undefined) return;

    const sockets = this.state.getWebSockets();
    for (const sock of sockets) {
      const idx = sock.deserializeAttachment() as number;
      if (idx === target) {
        let relayMsg: ServerMessage;
        if (msg.type === 'offer') {
          relayMsg = { type: 'offer', sdp: msg.sdp!, fromPlayer };
        } else if (msg.type === 'answer') {
          relayMsg = { type: 'answer', sdp: msg.sdp!, fromPlayer };
        } else {
          relayMsg = { type: 'ice', candidate: msg.candidate!, fromPlayer };
        }
        sock.send(JSON.stringify(relayMsg));
        return;
      }
    }
  }

  private async handleReady(playerIndex: number): Promise<void> {
    const config = await this.getConfig();
    if (!config) return;

    const player = config.players.find(p => p.index === playerIndex);
    if (player) player.ready = true;
    await this.saveConfig(config);

    const allReady = config.players.length >= 2 && config.players.every(p => p.ready);
    if (allReady) {
      config.status = 'playing';
      await this.saveConfig(config);
      this.broadcast({ type: 'all_ready' });
    }
  }

  private async handleFaction(playerIndex: number, faction: string): Promise<void> {
    const config = await this.getConfig();
    if (!config) return;

    const player = config.players.find(p => p.index === playerIndex);
    if (player) player.faction = faction;
    await this.saveConfig(config);

    this.broadcast({ type: 'faction', playerIndex, faction }, playerIndex);
  }

  // ===================== Helpers =====================

  private broadcast(msg: ServerMessage, excludePlayer?: number): void {
    const data = JSON.stringify(msg);
    const sockets = this.state.getWebSockets();
    for (const sock of sockets) {
      const idx = sock.deserializeAttachment() as number;
      if (idx === excludePlayer) continue;
      try { sock.send(data); } catch { /* disconnected */ }
    }
  }

  private async closeRoom(): Promise<void> {
    const config = await this.getConfig();
    if (config) {
      config.status = 'closed';
      await this.saveConfig(config);
    }
    const sockets = this.state.getWebSockets();
    for (const sock of sockets) {
      try { sock.close(1000, 'Room closed'); } catch { /* ignore */ }
    }
  }

  async alarm(): Promise<void> {
    const config = await this.getConfig();
    if (config && config.status !== 'playing') {
      await this.closeRoom();
    }
  }
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
