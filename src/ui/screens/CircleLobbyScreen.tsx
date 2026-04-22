/**
 * Circle Co-Op Lobby — Preact DOM replacement for CircleLobbyScene.ts.
 *
 * Phase machine:
 *   'intro'  → HOST / JOIN / Manual buttons
 *   'host'   → room code + waiting roster + Setup Game button (host),
 *              or manual-mode Add Player / Paste Answer workflow
 *   'join'   → room-code input (auto) or Paste Offer (manual)
 *   'setup'  → difficulty (host-only) + faction picker; roster visible
 *
 * CircleManager lifecycle mirrors LobbyScreen's VersusManager pattern:
 * created on Host/Join commit, lives in a ref for stable callback
 * identity, close()'d on unmount unless we handed it off to GameScene
 * via `game.registry.set('circle', ...)` during launchGame.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Header } from '../components/Header';
import { UIBridge } from '../UIBridge';
import { CircleManager } from '../../systems/multiplayer/CircleManager';
import { SignalingClient } from '../../systems/multiplayer/SignalingClient';
import { GameMessage } from '../../systems/multiplayer/MessageProtocol';
import { MapId, MapDefinition, MAPS } from '../../data/Maps';
import { MapStorage, MapJSON } from '../../systems/MapStorage';
import { DifficultyLevel } from '../../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../../data/Factions';
import { Analytics } from '../../systems/AnalyticsClient';
import { TutorialManager } from '../../systems/Tutorial/TutorialManager';

type Phase = 'intro' | 'host' | 'join' | 'setup';

const DIFF_COLOR: Record<DifficultyLevel, string> = {
  easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff',
};

function hex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

function mapForPlayerCount(pc: number): MapId {
  if (pc === 2) return 'circle_2p';
  if (pc === 3) return 'circle_3p';
  return 'circle_4p';
}

export function CircleLobbyScreen() {
  const circleRef = useRef<CircleManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const launchedRef = useRef(false);
  // A monotonic tick we bump to force re-render after roster mutations
  // that live inside the CircleManager rather than React state.
  const [rosterTick, setRosterTick] = useState(0);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isHost, setIsHost] = useState(false);
  const [useManual, setUseManual] = useState(false);
  const [status, setStatus] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [selectedMap, setSelectedMap] = useState<MapId>('circle_2p');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('normal');
  const [myFaction, setMyFaction] = useState<FactionId | null>(null);
  // Map<playerIndex, FactionId>. Stored as a ref + forced re-render via
  // rosterTick — Map mutations don't trigger Preact state updates.
  const playerFactionsRef = useRef<Map<number, FactionId>>(new Map());
  const assignedPlayerIndexRef = useRef(false);
  const pendingPlayerIndexRef = useRef(-1);
  // Controls whether the host's "Setup Game" button is clickable.
  const [canSetup, setCanSetup] = useState(false);
  const customMapJSONRef = useRef<MapJSON | null>(null);
  const customMapDefRef = useRef<MapDefinition | null>(null);

  // Mirror reactive state into refs for async callback access.
  const isHostRef = useRef(false);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  const myFactionRef = useRef<FactionId | null>(null);
  useEffect(() => { myFactionRef.current = myFaction; }, [myFaction]);
  const phaseRef = useRef<Phase>('intro');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const selectedMapRef = useRef<MapId>('circle_2p');
  useEffect(() => { selectedMapRef.current = selectedMap; }, [selectedMap]);
  const selectedDifficultyRef = useRef<DifficultyLevel>('normal');
  useEffect(() => { selectedDifficultyRef.current = selectedDifficulty; }, [selectedDifficulty]);

  useEffect(() => {
    TutorialManager.onLobbyOpened();
    return () => {
      if (!launchedRef.current) {
        signalingRef.current?.disconnect();
        circleRef.current?.close();
      }
    };
  }, []);

  // Once host has ≥2 connected peers, unlock the Setup Game button.
  // Poll rather than subscribe because CircleManager doesn't surface a
  // connection-count event.
  useEffect(() => {
    if (phase !== 'host' || !isHost) return;
    const id = window.setInterval(() => {
      const c = circleRef.current?.getConnectedCount() ?? 0;
      if (c >= 2) setCanSetup(true);
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, isHost]);

  const bumpRoster = () => setRosterTick(t => t + 1);

  const createCircle = (): CircleManager => {
    const c = new CircleManager(
      (msg, from) => handleMessage(msg, from),
      (playerIndex, state) => {
        if (state === 'connected') {
          bumpRoster();
          if (isHostRef.current) {
            // Seed the newly-connected joiner with its player index +
            // broadcast the updated totalPlayers to everyone else.
            setTimeout(() => {
              const circle = circleRef.current;
              if (!circle) return;
              circle.send({ type: 'player_joined', playerIndex, totalPlayers: circle.playerCount }, playerIndex);
              for (let i = 1; i < circle.playerCount; i++) {
                if (i === playerIndex) continue;
                circle.send({ type: 'player_joined', playerIndex: i, totalPlayers: circle.playerCount }, i);
              }
            }, 300);
          }
        }
      },
    );
    circleRef.current = c;
    return c;
  };

  const handleMessage = (msg: GameMessage, fromPlayer: number) => {
    const circle = circleRef.current;
    if (!circle) return;
    if (msg.type === 'circle_game_start') {
      for (const p of msg.players) {
        playerFactionsRef.current.set(p.index, p.faction as FactionId);
      }
      if (!isHostRef.current) {
        setSelectedMap(msg.map as MapId);
        setSelectedDifficulty(msg.difficulty as DifficultyLevel);
        circle.sharedSeed = msg.seed;
        if (msg.customMapJSON) {
          customMapJSONRef.current = msg.customMapJSON as MapJSON;
          customMapDefRef.current = MapStorage.mapJSONToDefinition(msg.customMapJSON as MapJSON);
        }
      }
      launchGame();
    } else if (msg.type === 'game_start') {
      if (msg.faction === '') {
        // Host signalling "we're entering setup". Joiners mirror
        // host's map/difficulty/seed and switch phase.
        if (!isHostRef.current) {
          setSelectedMap(msg.map as MapId);
          setSelectedDifficulty(msg.difficulty as DifficultyLevel);
          circle.sharedSeed = msg.seed;
          if (msg.customMapJSON) {
            customMapJSONRef.current = msg.customMapJSON as MapJSON;
            customMapDefRef.current = MapStorage.mapJSONToDefinition(msg.customMapJSON as MapJSON);
          }
          setPhase('setup');
        }
      } else {
        // A peer has picked their faction. Record it in the roster.
        playerFactionsRef.current.set(fromPlayer, msg.faction as FactionId);
        bumpRoster();
        checkAllPicked();
      }
    } else if (msg.type === 'player_joined') {
      if (!isHostRef.current) {
        if (!assignedPlayerIndexRef.current) {
          assignedPlayerIndexRef.current = true;
          circle.setPlayerInfo(msg.playerIndex, msg.totalPlayers);
          setStatus(`Connected as Player ${msg.playerIndex}! (${msg.totalPlayers} players)\nWaiting for host to start setup...`);
        } else {
          circle.playerCount = msg.totalPlayers;
        }
      }
      bumpRoster();
    }
  };

  // ===================== Host flow =====================
  const startHost = async () => {
    setIsHost(true);
    isHostRef.current = true;
    const circle = createCircle();
    circle.initHost();
    setPhase('host');
    setStatus('Players: 1. Click ADD PLAYER to connect others.');

    if (useManual) return;

    const signaling = new SignalingClient();
    signalingRef.current = signaling;
    try {
      const room = await signaling.createRoom('circle', 4);
      setRoomCode(room.code);
      setStatus(`Room Code: ${room.code}\nShare this code with your teammates!`);
      signaling.connectSignaling();
      signaling.onPlayerJoined = async (joinerIndex: number, playerCount: number) => {
        circle.playerCount = playerCount;
        setStatus(`Players: ${playerCount}/4. Connecting Player ${joinerIndex}...`);
        try { await circle.hostConnectPlayer(signaling, joinerIndex); }
        catch (e) { setStatus('Connection to player failed: ' + (e as Error).message); }
      };
    } catch (e) {
      setStatus('Server error: ' + (e as Error).message + '\nTry Manual Connect.');
    }
  };

  const hostAddPlayerManual = async () => {
    const circle = circleRef.current;
    if (!circle || circle.playerCount >= 4) { setStatus('Maximum 4 players!'); return; }
    try {
      setStatus('Creating offer for next player...');
      const [playerIndex, offer] = await circle.createOfferForNextPlayer();
      pendingPlayerIndexRef.current = playerIndex;
      await navigator.clipboard.writeText(offer);
      setStatus(`Offer for Player ${playerIndex} copied! Send to them, then click PASTE ANSWER.`);
    } catch (e) {
      setStatus('Failed: ' + (e as Error).message);
    }
  };

  const hostPasteAnswer = async () => {
    const circle = circleRef.current;
    if (!circle) return;
    try {
      const answer = await navigator.clipboard.readText();
      if (!answer || answer.length < 50) { setStatus('Invalid code.'); return; }
      await circle.acceptAnswer(pendingPlayerIndexRef.current, answer);
      setStatus(`Player ${pendingPlayerIndexRef.current} connected! (${circle.getConnectedCount()} players)`);
      bumpRoster();
    } catch (e) {
      setStatus('Error: ' + (e as Error).message);
    }
  };

  const hostStartSetup = () => {
    const circle = circleRef.current;
    if (!circle) return;
    const pc = circle.playerCount;
    const mid = mapForPlayerCount(pc);
    setSelectedMap(mid);
    selectedMapRef.current = mid;
    setPhase('setup');
    const setupMsg: GameMessage = {
      type: 'game_start',
      faction: '',
      matchMode: 'circle_coop',
      map: mid,
      difficulty: selectedDifficultyRef.current,
      seed: circle.sharedSeed,
    };
    if (mid === 'custom' && customMapJSONRef.current) setupMsg.customMapJSON = customMapJSONRef.current;
    circle.broadcast(setupMsg);
  };

  // ===================== Join flow =====================
  const startJoin = async () => {
    setIsHost(false);
    isHostRef.current = false;
    createCircle();
    if (useManual) {
      setPhase('join');
      setStatus("Paste the host's offer code and click PASTE OFFER.");
      return;
    }
    setPhase('join');
    signalingRef.current = new SignalingClient();
    setStatus('Enter the room code:');
  };

  const joinWithCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || code.length !== 4) { setStatus('Enter a 4-letter room code'); return; }
    if (!signalingRef.current || !circleRef.current) return;
    setStatus(`Joining room ${code}...`);
    try {
      await signalingRef.current.joinRoom(code);
      signalingRef.current.connectSignaling();
      setStatus('Connected to room! Establishing P2P...');
      await circleRef.current.joinViaSignaling(signalingRef.current);
    } catch (e) { setStatus('Failed: ' + (e as Error).message); }
  };

  const joinPasteOffer = async () => {
    const circle = circleRef.current;
    if (!circle) return;
    try {
      const offer = await navigator.clipboard.readText();
      if (!offer || offer.length < 50) { setStatus('Invalid code.'); return; }
      setStatus('Creating answer...');
      const answer = await circle.joinAsClient(offer);
      await navigator.clipboard.writeText(answer);
      setStatus('Answer copied! Send to host. Waiting...');
    } catch (e) { setStatus('Failed: ' + (e as Error).message); }
  };

  // ===================== Setup & launch =====================
  const pickFaction = (fid: FactionId) => {
    const circle = circleRef.current;
    if (!circle) return;
    setMyFaction(fid);
    myFactionRef.current = fid;
    playerFactionsRef.current.set(circle.playerIndex, fid);
    bumpRoster();
    setStatus(`You picked ${FACTIONS[fid].name}! Waiting for others...`);
    const msg: GameMessage = {
      type: 'game_start',
      faction: fid,
      matchMode: 'circle_coop',
      map: selectedMapRef.current,
      difficulty: selectedDifficultyRef.current,
      seed: circle.sharedSeed,
    };
    if (selectedMapRef.current === 'custom' && customMapJSONRef.current) msg.customMapJSON = customMapJSONRef.current;
    circle.broadcast(msg);
    checkAllPicked();
  };

  const checkAllPicked = () => {
    if (!isHostRef.current) return;
    const circle = circleRef.current;
    if (!circle) return;
    const connected = circle.getConnectedCount();
    if (playerFactionsRef.current.size < connected) return;
    const players = Array.from(playerFactionsRef.current.entries()).map(([index, faction]) => ({ index, faction }));
    const launchMsg: GameMessage = {
      type: 'circle_game_start',
      players,
      map: selectedMapRef.current,
      difficulty: selectedDifficultyRef.current,
      seed: circle.sharedSeed,
    };
    if (selectedMapRef.current === 'custom' && customMapJSONRef.current) launchMsg.customMapJSON = customMapJSONRef.current;
    circle.broadcast(launchMsg);
    launchGame();
  };

  const launchGame = () => {
    const circle = circleRef.current;
    const fid = myFactionRef.current;
    if (!circle || !fid) return;
    launchedRef.current = true;
    Analytics.multiplayerStart('circle', circle.playerCount);
    for (const [idx, fac] of playerFactionsRef.current) {
      circle.playerFactions.set(idx, fac);
    }
    const game = UIBridge.getGame();
    if (game) game.registry.set('circle', circle);
    UIBridge.startScene('DraftScene', {
      mode: 'circle_coop' as unknown as string,
      faction: fid,
      map: selectedMapRef.current,
      difficulty: selectedDifficultyRef.current,
      customMapDef: customMapDefRef.current ?? undefined,
    });
  };

  const back = () => UIBridge.show('menu');

  // ===================== Roster render ===============================
  const roster = (() => {
    void rosterTick;
    const circle = circleRef.current;
    if (!circle) return null;
    const lines: string[] = [];
    for (let i = 0; i < circle.playerCount; i++) {
      const isMe = i === circle.playerIndex;
      const faction = playerFactionsRef.current.get(i);
      const fStr = faction ? ` [${FACTIONS[faction]?.name ?? faction}]` : '';
      lines.push(`Player ${i}: ${isMe ? '(you)' : 'connected'}${fStr}`);
    }
    return lines.join('\n');
  })();

  return (
    <>
      <Header title="CIRCLE CO-OP" back={back} />
      <div class="ui-section" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>Shared map — build in your zone, defend together</div>

        {status && (
          <div style={{ color: 'var(--gold)', fontFamily: 'monospace', marginBottom: 12, minHeight: 18, whiteSpace: 'pre-line' }}>
            {status}
          </div>
        )}

        {roster && (
          <pre style={{ color: '#88aacc', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {roster}
          </pre>
        )}

        {phase === 'intro' && (
          <div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
              <button class="btn btn-green" style={{ padding: '12px 24px', fontSize: 16 }} onClick={startHost}>HOST GAME</button>
              <button class="btn btn-primary" style={{ padding: '12px 24px', fontSize: 16 }} onClick={startJoin}>JOIN GAME</button>
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
                <input type="checkbox" checked={useManual} onChange={e => setUseManual((e.currentTarget as HTMLInputElement).checked)} style={{ marginRight: 6 }} />
                Manual Connect (advanced)
              </label>
            </div>
          </div>
        )}

        {phase === 'host' && (
          <HostPhaseCircle
            useManual={useManual}
            roomCode={roomCode}
            canSetup={canSetup}
            onAddPlayer={hostAddPlayerManual}
            onPasteAnswer={hostPasteAnswer}
            onSetup={hostStartSetup}
          />
        )}

        {phase === 'join' && (
          <JoinPhaseCircle
            useManual={useManual}
            codeInput={codeInput}
            setCodeInput={setCodeInput}
            onConnect={joinWithCode}
            onPasteOffer={joinPasteOffer}
          />
        )}

        {phase === 'setup' && (
          <SetupPhaseCircle
            isHost={isHost}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            myFaction={myFaction}
            onPickFaction={pickFaction}
          />
        )}
      </div>
    </>
  );
}

// ─── Phase sub-components ──────────────────────────────────────────

function HostPhaseCircle({ useManual, roomCode, canSetup, onAddPlayer, onPasteAnswer, onSetup }: {
  useManual: boolean; roomCode: string | null; canSetup: boolean;
  onAddPlayer: () => void; onPasteAnswer: () => void; onSetup: () => void;
}) {
  return (
    <div>
      {!useManual && roomCode && (
        <div style={{ fontFamily: 'monospace', fontSize: 36, color: '#44ff44', letterSpacing: 4, marginBottom: 8 }}>
          {roomCode}
        </div>
      )}
      {useManual && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          <button class="btn btn-green" onClick={onAddPlayer}>ADD PLAYER</button>
          <button class="btn btn-gold" onClick={onPasteAnswer}>PASTE ANSWER</button>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button
          class={`btn ${canSetup ? 'btn-gold' : ''}`}
          disabled={!canSetup}
          style={{ padding: '10px 20px', fontSize: 14, opacity: canSetup ? 1 : 0.5, cursor: canSetup ? 'pointer' : 'not-allowed' }}
          onClick={onSetup}>
          SETUP GAME
        </button>
      </div>
    </div>
  );
}

function JoinPhaseCircle({ useManual, codeInput, setCodeInput, onConnect, onPasteOffer }: {
  useManual: boolean; codeInput: string; setCodeInput: (s: string) => void; onConnect: () => void; onPasteOffer: () => void;
}) {
  if (useManual) {
    return <button class="btn btn-primary" style={{ padding: '12px 24px' }} onClick={onPasteOffer}>PASTE OFFER</button>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <input
        value={codeInput}
        onInput={e => setCodeInput((e.currentTarget as HTMLInputElement).value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') onConnect(); }}
        placeholder="ABCD"
        maxLength={4}
        autoFocus
        style={{
          fontFamily: 'monospace', fontSize: 24, textAlign: 'center',
          letterSpacing: 8, textTransform: 'uppercase',
          background: '#111', color: '#fff', border: '2px solid #4488ff',
          padding: '8px 16px', width: 160, outline: 'none',
        }}
      />
      <button class="btn btn-primary" style={{ padding: '8px 20px' }} onClick={onConnect}>CONNECT</button>
    </div>
  );
}

function SetupPhaseCircle({ isHost, selectedDifficulty, setSelectedDifficulty, myFaction, onPickFaction }: {
  isHost: boolean;
  selectedDifficulty: DifficultyLevel; setSelectedDifficulty: (d: DifficultyLevel) => void;
  myFaction: FactionId | null;
  onPickFaction: (fid: FactionId) => void;
}) {
  const diffs: DifficultyLevel[] = useMemo(() => ['easy', 'normal', 'hard', 'insane'], []);
  return (
    <div>
      {isHost && (
        <>
          <div class="ui-section-title" style={{ marginTop: 8 }}>Difficulty</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {diffs.map(d => (
              <button key={d}
                class={`btn ${selectedDifficulty === d ? 'btn-gold' : ''}`}
                style={{ color: DIFF_COLOR[d] }}
                onClick={() => setSelectedDifficulty(d)}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}

      <div class="ui-section-title" style={{ marginTop: 16 }}>Pick your faction</div>
      <div class="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {FACTION_ORDER.map(fid => {
          const faction = FACTIONS[fid];
          const isMine = fid === myFaction;
          return (
            <div key={fid}
              class={`card ${isMine ? 'card-selected' : ''}`}
              onClick={() => onPickFaction(fid)}
              style={isMine ? { outline: `2px solid ${hex(faction.primaryColor)}` } : undefined}>
              <div class="card-accent" style={{ background: hex(faction.primaryColor) }} />
              <div class="card-name" style={{ marginTop: 6 }}>{faction.name}</div>
              <div class="text-dim text-xs">{fid === 'random' ? '6 / wave' : `${faction.towerIds.length} towers`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
