/**
 * SignalingClient — connects to the Cloudflare signaling server for
 * room creation, joining, and WebSocket SDP relay.
 *
 * Replaces manual clipboard SDP exchange with automatic server-relayed signaling.
 */

/** Server URL — override via localStorage for local dev */
const DEFAULT_SERVER_URL = 'https://signal.streamingsplats.com';

export interface RoomInfo {
  code: string;
  hostToken?: string;
  joinToken?: string;
  playerIndex: number;
  playerCount: number;
  mode: string;
  maxPlayers: number;
}

export class SignalingClient {
  private serverUrl: string;
  private ws: WebSocket | null = null;
  private token: string = '';
  private roomCode: string = '';

  // Event callbacks
  onPlayerJoined: ((playerIndex: number, playerCount: number) => void) | null = null;
  onPlayerLeft: ((playerIndex: number) => void) | null = null;
  onOffer: ((sdp: string, fromPlayer: number) => void) | null = null;
  onAnswer: ((sdp: string, fromPlayer: number) => void) | null = null;
  onIce: ((candidate: string, fromPlayer: number) => void) | null = null;
  onAllReady: (() => void) | null = null;
  onFaction: ((playerIndex: number, faction: string) => void) | null = null;
  onRoomInfo: ((info: { playerIndex: number; playerCount: number; mode: string; maxPlayers: number }) => void) | null = null;
  onError: ((message: string) => void) | null = null;
  onDisconnect: (() => void) | null = null;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl ?? localStorage.getItem('td_server_url') ?? DEFAULT_SERVER_URL;
  }

  /** Create a new room (host flow) */
  async createRoom(mode: 'versus' | 'circle', maxPlayers: number = 2): Promise<RoomInfo> {
    const res = await fetch(`${this.serverUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, maxPlayers }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? `Server error ${res.status}`);
    }
    const data = await res.json() as RoomInfo;
    this.roomCode = data.code;
    this.token = data.hostToken ?? '';
    return data;
  }

  /** Join an existing room (joiner flow) */
  async joinRoom(code: string): Promise<RoomInfo> {
    const res = await fetch(`${this.serverUrl}/api/rooms/${code.toUpperCase()}/join`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      if (res.status === 404) throw new Error('Room not found');
      if (res.status === 409) throw new Error('Room is full');
      if (res.status === 410) throw new Error('Room expired');
      throw new Error(err.error ?? `Server error ${res.status}`);
    }
    const data = await res.json() as RoomInfo & { joinToken: string };
    this.roomCode = code.toUpperCase();
    this.token = data.joinToken;
    return { ...data, code: this.roomCode };
  }

  /** Connect WebSocket for signaling */
  connectSignaling(): void {
    if (!this.roomCode || !this.token) throw new Error('Must create/join room first');

    const wsUrl = this.serverUrl.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsUrl}/api/rooms/${this.roomCode}/signal?token=${this.token}`);

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.handleMessage(msg);
      } catch { /* invalid message */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.onDisconnect?.();
    };

    this.ws.onerror = () => {
      this.ws = null;
      this.onError?.('WebSocket connection failed');
    };
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'player_joined':
        this.onPlayerJoined?.(msg.playerIndex, msg.playerCount);
        break;
      case 'player_left':
        this.onPlayerLeft?.(msg.playerIndex);
        break;
      case 'offer':
        this.onOffer?.(msg.sdp, msg.fromPlayer);
        break;
      case 'answer':
        this.onAnswer?.(msg.sdp, msg.fromPlayer);
        break;
      case 'ice':
        this.onIce?.(msg.candidate, msg.fromPlayer);
        break;
      case 'all_ready':
        this.onAllReady?.();
        break;
      case 'faction':
        this.onFaction?.(msg.playerIndex, msg.faction);
        break;
      case 'room_info':
        this.onRoomInfo?.(msg);
        break;
      case 'error':
        this.onError?.(msg.message);
        break;
    }
  }

  // ===================== Outgoing Messages =====================

  sendOffer(sdp: string, targetPlayer: number): void {
    this.send({ type: 'offer', sdp, targetPlayer });
  }

  sendAnswer(sdp: string, targetPlayer: number): void {
    this.send({ type: 'answer', sdp, targetPlayer });
  }

  sendIce(candidate: string, targetPlayer: number): void {
    this.send({ type: 'ice', candidate, targetPlayer });
  }

  sendReady(): void {
    this.send({ type: 'ready' });
  }

  sendFaction(faction: string): void {
    this.send({ type: 'faction', faction });
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ===================== Lifecycle =====================

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get code(): string {
    return this.roomCode;
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
