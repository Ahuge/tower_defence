# Multiplayer Signaling Server Plan

## Architecture

**Signaling-only server** on Cloudflare Workers + Durable Objects. Game data stays P2P via WebRTC. Server handles room creation, player discovery, and SDP relay. Disconnects after WebRTC handshake completes.

```
Host Client                 Cloudflare Worker              Joiner Client
    |                            |                              |
    |-- POST /api/rooms -------->|                              |
    |<-- { code: "ABCD" } ------|                              |
    |                            |                              |
    |-- WS /signal/ABCD ------->|                              |
    |   (host connects)          |                              |
    |                            |<-- POST /api/rooms/ABCD/join |
    |                            |--- { playerIndex: 1 } ------>|
    |                            |                              |
    |                            |<-- WS /signal/ABCD ---------|
    |                            |   (joiner connects)          |
    |                            |                              |
    |<-- relay: joiner joined ---|                              |
    |                            |                              |
    |-- { type: offer, sdp } --->|--- relay ------------------>|
    |                            |                              |
    |                            |<-- { type: answer, sdp } ---|
    |<-- relay ------------------|                              |
    |                            |                              |
    [WebRTC P2P established]     [Server can disconnect]        |
```

## Durable Object: GameRoom

One Durable Object per room. Maintains:

```typescript
interface RoomState {
  code: string;              // 4-char room code
  hostToken: string;         // Auth token for host
  mode: 'versus' | 'circle'; // Game mode
  maxPlayers: number;        // 2 for versus, 2-4 for circle
  players: {
    index: number;
    token: string;           // Auth token
    ws: WebSocket | null;    // Active signaling connection
    connected: boolean;      // WebRTC connected?
    faction?: string;
  }[];
  createdAt: number;         // For TTL expiry
  status: 'waiting' | 'signaling' | 'playing' | 'closed';
}
```

**Lifecycle:**
1. Created on POST /api/rooms
2. Players connect WebSockets for signaling
3. SDP offers/answers relayed between players
4. Once all players have WebRTC connections, status → 'playing'
5. Auto-expires after 10 minutes if never reaches 'playing'
6. Auto-expires after 5 minutes of no WebSocket activity

## API Endpoints

### REST (Cloudflare Worker)

```
POST /api/rooms
  Body: { mode: 'versus' | 'circle', maxPlayers?: number }
  Returns: { code: string, hostToken: string, playerIndex: 0 }

POST /api/rooms/:code/join
  Returns: { playerIndex: number, joinToken: string, playerCount: number }
  Errors: 404 (not found), 409 (room full), 410 (expired)

GET /api/rooms/:code
  Returns: { code, mode, maxPlayers, playerCount, status }
  (No auth required — room codes are the secret)
```

### WebSocket (Durable Object)

```
WS /api/rooms/:code/signal?token=<hostToken|joinToken>

Client → Server messages:
  { type: 'offer', sdp: string, targetPlayer: number }
  { type: 'answer', sdp: string, targetPlayer: number }
  { type: 'ice', candidate: string, targetPlayer: number }
  { type: 'ready' }           // Signal WebRTC connected
  { type: 'faction', faction: string }

Server → Client messages:
  { type: 'player_joined', playerIndex: number, playerCount: number }
  { type: 'player_left', playerIndex: number }
  { type: 'offer', sdp: string, fromPlayer: number }
  { type: 'answer', sdp: string, fromPlayer: number }
  { type: 'ice', candidate: string, fromPlayer: number }
  { type: 'all_ready' }       // All players have WebRTC connections
  { type: 'faction', playerIndex: number, faction: string }
  { type: 'error', message: string }
```

## Room Code Generation

- 4 characters: uppercase letters + digits (excluding ambiguous: 0/O, 1/I/L)
- Character set: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (29 chars)
- ~707K combinations — enough for concurrent rooms
- Server checks uniqueness against active rooms

## Connection Flow: Versus (2 players)

```
1. Host: POST /api/rooms { mode: 'versus' }
   → Gets code "ABCD", hostToken, playerIndex 0

2. Host: WS /signal/ABCD?token=hostToken
   → Connected, waiting for joiner

3. Joiner: POST /api/rooms/ABCD/join
   → Gets joinToken, playerIndex 1

4. Joiner: WS /signal/ABCD?token=joinToken
   → Connected

5. Server → Host: { type: 'player_joined', playerIndex: 1 }

6. Host creates RTCPeerConnection, generates offer
   Host → Server: { type: 'offer', sdp: '...', targetPlayer: 1 }
   Server → Joiner: { type: 'offer', sdp: '...', fromPlayer: 0 }

7. Joiner sets remote description, creates answer
   Joiner → Server: { type: 'answer', sdp: '...', targetPlayer: 0 }
   Server → Host: { type: 'answer', sdp: '...', fromPlayer: 1 }

8. ICE candidates exchanged via same relay (trickle ICE)

9. WebRTC data channel opens
   Both → Server: { type: 'ready' }
   Server → Both: { type: 'all_ready' }

10. Players proceed to faction select / game
    Server WebSockets can close (or stay for faction relay)
```

## Connection Flow: Circle Co-op (2-4 players)

Star topology: host has WebRTC connections to each joiner.

```
1. Host: POST /api/rooms { mode: 'circle', maxPlayers: 3 }
   → Gets code "XYZW"

2. Host: WS /signal/XYZW?token=hostToken

3. Joiner 1: POST /api/rooms/XYZW/join → playerIndex 1
   Joiner 1: WS /signal/XYZW?token=joinToken1
   Server → Host: { player_joined, playerIndex: 1 }

4. Host creates offer for Joiner 1
   Host → Server: { offer, targetPlayer: 1 }
   Server → Joiner 1: { offer, fromPlayer: 0 }
   Joiner 1 → Server: { answer, targetPlayer: 0 }
   Server → Host: { answer, fromPlayer: 1 }
   [WebRTC 0↔1 established]

5. Joiner 2 joins same flow → WebRTC 0↔2 established

6. Host sends { type: 'ready' } after all connections up
   Server → All: { type: 'all_ready' }

7. Faction selection relayed through server WebSocket
   (or through P2P since connections are up)
```

## Client-Side Changes

### New: SignalingClient class

```typescript
// src/systems/multiplayer/SignalingClient.ts

class SignalingClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;

  constructor(serverUrl: string) { ... }

  // Host flow
  async createRoom(mode: 'versus' | 'circle', maxPlayers: number): Promise<{ code: string }> {
    const res = await fetch(`${serverUrl}/api/rooms`, { method: 'POST', body: { mode, maxPlayers } });
    return res.json();
  }

  // Joiner flow
  async joinRoom(code: string): Promise<{ playerIndex: number }> {
    const res = await fetch(`${serverUrl}/api/rooms/${code}/join`, { method: 'POST' });
    return res.json();
  }

  // Both: open WebSocket for signaling
  connectSignaling(code: string, token: string): void {
    this.ws = new WebSocket(`${serverUrl}/api/rooms/${code}/signal?token=${token}`);
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
  }

  // Send SDP/ICE through server
  sendOffer(sdp: string, targetPlayer: number): void { ... }
  sendAnswer(sdp: string, targetPlayer: number): void { ... }
  sendIce(candidate: string, targetPlayer: number): void { ... }

  // Events
  onPlayerJoined: (playerIndex: number, playerCount: number) => void;
  onOffer: (sdp: string, fromPlayer: number) => void;
  onAnswer: (sdp: string, fromPlayer: number) => void;
  onIce: (candidate: string, fromPlayer: number) => void;
  onAllReady: () => void;
}
```

### Modified: PeerConnection

Add `connectViaSignaling(signalingClient, targetPlayer)` method that:
1. Creates RTCPeerConnection (same STUN config)
2. Generates offer/answer
3. Sends SDP through SignalingClient instead of clipboard
4. Handles trickle ICE via SignalingClient relay

### Modified: LobbyScene

Replace clipboard UI with:

```
┌─────────────────────────────┐
│     MULTIPLAYER LOBBY        │
│                              │
│  [HOST GAME]  [JOIN GAME]    │
│                              │
│  ─── Host ───                │
│  Room Code: ABCD             │
│  Share this code with        │
│  your opponent!              │
│  Waiting for player...       │
│                              │
│  ─── OR ───                  │
│                              │
│  ─── Join ───                │
│  Enter Code: [____]          │
│  [CONNECT]                   │
│                              │
│  [BACK]                      │
└─────────────────────────────┘
```

### Modified: CircleLobbyScene

Same pattern but shows player count:

```
┌─────────────────────────────┐
│   CIRCLE CO-OP LOBBY         │
│                              │
│  Room Code: XYZW             │
│  Players: 2/4                │
│  - Player 1 (Host) ✓        │
│  - Player 2 ✓               │
│  Waiting for players...      │
│                              │
│  [START GAME]  (host only)   │
│  [BACK]                      │
└─────────────────────────────┘
```

## Cloudflare Worker Structure

```
server/
  wrangler.toml           — Worker config
  src/
    index.ts              — Request router (REST + WebSocket upgrade)
    room.ts               — GameRoom Durable Object class
    utils.ts              — Code generation, validation
```

### wrangler.toml

```toml
name = "td-signaling"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "GAME_ROOM", class_name = "GameRoom" }
]

[[migrations]]
tag = "v1"
new_classes = ["GameRoom"]
```

## Security Considerations

- Room codes are short-lived (10 min TTL) — brute force window is small
- Tokens authenticate host vs joiner identity on WebSocket
- No game state passes through server — only SDP signaling data
- Rate limit room creation (10/min per IP)
- WebSocket idle timeout (60s no messages → close)

## Cost Estimate

Cloudflare Workers free tier:
- 100,000 requests/day
- 1,000 Durable Object requests/day (may need paid for heavy usage)
- Paid: $5/month for 10M requests + $0.15/M Durable Object requests

For a hobby game: **free tier should be sufficient** for dozens of concurrent games.

## Implementation Order

1. **Cloudflare Worker + Durable Object** — room CRUD + WebSocket relay
2. **SignalingClient** — client-side WebSocket wrapper
3. **PeerConnection update** — use SignalingClient instead of clipboard
4. **LobbyScene rewrite** — room code UX (host/join)
5. **CircleLobbyScene rewrite** — multi-player room code UX
6. **Keep manual fallback** — "Advanced: Manual Connect" option
7. **Test + deploy**
