/**
 * Versus 1v1 Lobby — Preact DOM replacement for LobbyScene.ts.
 *
 * State machine (mirrors the original scene):
 *   'intro'  → HOST / JOIN / Manual buttons
 *   'host'   → show room code, wait for joiner (auto or manual)
 *   'join'   → room-code input (auto) or paste-offer (manual)
 *   'setup'  → map + difficulty (host-only) + faction picker
 *
 * The VersusManager is created when the user commits to Host or Join,
 * and lives in a ref so callbacks (onMessage, onConnectionChange) always
 * see the current instance. On unmount we tear it down *unless* the user
 * successfully launched a game — in that case the manager has been
 * stashed in `game.registry` and GameScene picks it up.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Header } from '../components/Header';
import { UIBridge } from '../UIBridge';
import { VersusManager } from '../../systems/multiplayer/VersusManager';
import { SignalingClient } from '../../systems/multiplayer/SignalingClient';
import { GameMessage } from '../../systems/multiplayer/MessageProtocol';
import { MapId, MapDefinition, MAP_ORDER, MAPS } from '../../data/Maps';
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

export function LobbyScreen() {
  const versusRef = useRef<VersusManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  // Set to true on successful launchGame — disables the unmount-cleanup
  // so the manager survives into GameScene.
  const launchedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isHost, setIsHost] = useState(false);
  const [useManual, setUseManual] = useState(false);
  const [status, setStatus] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [selectedMap, setSelectedMap] = useState<MapId>('plains');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('normal');
  const [myFaction, setMyFaction] = useState<FactionId | null>(null);
  // Opponent info used to decide when both sides have picked factions.
  const opponentRef = useRef<{ faction: FactionId | null; msg: GameMessage | null }>({ faction: null, msg: null });
  const customMapJSONRef = useRef<MapJSON | null>(null);
  const customMapDefRef = useRef<MapDefinition | null>(null);

  useEffect(() => {
    TutorialManager.onLobbyOpened();
    return () => {
      // Page-level cleanup. Skip tearing down the manager if we launched
      // into a game — GameScene needs it alive in the registry.
      if (!launchedRef.current) {
        signalingRef.current?.disconnect();
        versusRef.current?.close();
      }
    };
  }, []);

  const createVersus = (): VersusManager => {
    const v = new VersusManager(
      (msg) => handleMessage(msg),
      (state) => {
        if (state === 'connected') {
          setStatus('');
          setPhase('setup');
        }
      },
    );
    versusRef.current = v;
    return v;
  };

  const handleMessage = (msg: GameMessage) => {
    if (msg.type !== 'game_start') return;
    const opponentFaction = msg.faction as FactionId;
    opponentRef.current = { faction: opponentFaction, msg };
    if (!isHostRef.current) {
      // Joiner inherits host's map + difficulty.
      setSelectedMap(msg.map as MapId);
      setSelectedDifficulty(msg.difficulty as DifficultyLevel);
      if (msg.customMapJSON) {
        customMapJSONRef.current = msg.customMapJSON as MapJSON;
        customMapDefRef.current = MapStorage.mapJSONToDefinition(msg.customMapJSON as MapJSON);
      }
    }
    if (myFactionRef.current) launchGame();
  };

  // Mirror state into refs for the message callback. React hooks have
  // stale-closure problems with async callbacks; refs sidestep that.
  const isHostRef = useRef(false);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  const myFactionRef = useRef<FactionId | null>(null);
  useEffect(() => { myFactionRef.current = myFaction; }, [myFaction]);

  // ===================== Host flow =====================
  const startHost = async () => {
    setIsHost(true);
    const versus = createVersus();
    if (useManual) {
      setPhase('host');
      try {
        setStatus('Creating offer...');
        const offer = await versus.host();
        await navigator.clipboard.writeText(offer);
        setStatus('Offer copied to clipboard! Send to opponent, then click PASTE ANSWER.');
      } catch (e) {
        setStatus('Failed: ' + (e as Error).message);
      }
      return;
    }

    setPhase('host');
    const signaling = new SignalingClient();
    signalingRef.current = signaling;
    setStatus('Creating room...');
    try {
      const room = await signaling.createRoom('versus');
      setRoomCode(room.code);
      setStatus('Waiting for opponent to join...');
      signaling.connectSignaling();
      signaling.onPlayerJoined = async () => {
        setStatus('Opponent joined! Connecting...');
        try { await versus.hostViaSignaling(signaling); }
        catch (e) { setStatus('Connection failed: ' + (e as Error).message); }
      };
    } catch (e) {
      setStatus('Server error: ' + (e as Error).message);
    }
  };

  const pasteAnswer = async () => {
    if (!versusRef.current) return;
    try {
      const answer = await navigator.clipboard.readText();
      if (!answer || answer.length < 50) { setStatus('Invalid code.'); return; }
      setStatus('Connecting...');
      await versusRef.current.acceptAnswer(answer);
    } catch (e) { setStatus('Error: ' + (e as Error).message); }
  };

  // ===================== Join flow =====================
  const startJoin = async () => {
    setIsHost(false);
    const versus = createVersus();
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
    if (!signalingRef.current || !versusRef.current) return;
    setStatus(`Joining room ${code}...`);
    try {
      await signalingRef.current.joinRoom(code);
      signalingRef.current.connectSignaling();
      setStatus('Connected! Establishing P2P...');
      await versusRef.current.joinViaSignaling(signalingRef.current);
    } catch (e) { setStatus('Failed: ' + (e as Error).message); }
  };

  const pasteOffer = async () => {
    if (!versusRef.current) return;
    try {
      const offer = await navigator.clipboard.readText();
      if (!offer || offer.length < 50) { setStatus('Invalid code.'); return; }
      setStatus('Creating answer...');
      const answer = await versusRef.current.join(offer);
      await navigator.clipboard.writeText(answer);
      setStatus('Answer copied! Send to host. Waiting...');
    } catch (e) { setStatus('Failed: ' + (e as Error).message); }
  };

  // ===================== Setup & launch =====================
  const pickFaction = (fid: FactionId) => {
    if (!versusRef.current) return;
    setMyFaction(fid);
    myFactionRef.current = fid;
    setStatus(`You picked ${FACTIONS[fid].name}! Waiting for opponent...`);
    const startMsg: GameMessage = {
      type: 'game_start',
      faction: fid,
      matchMode: 'standard',
      map: selectedMap,
      difficulty: selectedDifficulty,
      seed: versusRef.current.sharedSeed,
    };
    if (selectedMap === 'custom' && customMapJSONRef.current) {
      startMsg.customMapJSON = customMapJSONRef.current;
    }
    versusRef.current.send(startMsg);
    if (opponentRef.current.faction) launchGame();
  };

  const launchGame = () => {
    const fid = myFactionRef.current;
    const versus = versusRef.current;
    if (!fid || !versus) return;
    launchedRef.current = true;
    Analytics.multiplayerStart('versus', 2);
    const game = UIBridge.getGame();
    if (game) game.registry.set('versus', versus);
    UIBridge.startScene('DraftScene', {
      mode: 'standard',
      faction: fid,
      map: selectedMap,
      difficulty: selectedDifficulty,
      customMapDef: customMapDefRef.current ?? undefined,
    });
  };

  const back = () => {
    // Any in-flight managers/signaling get torn down by the unmount
    // cleanup. launchedRef stays false here, so close() will fire.
    UIBridge.show('menu');
  };

  // ===================== Render =====================
  return (
    <>
      <Header title="VERSUS LOBBY" back={back} />
      <div class="ui-section" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        {status && (
          <div style={{ color: 'var(--gold)', fontFamily: 'monospace', marginBottom: 16, minHeight: 18, whiteSpace: 'pre-line' }}>
            {status}
          </div>
        )}

        {phase === 'intro' && (
          <IntroPhase onHost={startHost} onJoin={startJoin} useManual={useManual} setUseManual={setUseManual} />
        )}

        {phase === 'host' && (
          <HostPhase useManual={useManual} roomCode={roomCode} onPasteAnswer={pasteAnswer} />
        )}

        {phase === 'join' && (
          <JoinPhase
            useManual={useManual}
            codeInput={codeInput}
            setCodeInput={setCodeInput}
            onConnect={joinWithCode}
            onPasteOffer={pasteOffer}
          />
        )}

        {phase === 'setup' && (
          <SetupPhase
            isHost={isHost}
            selectedMap={selectedMap}
            setSelectedMap={setSelectedMap}
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

function IntroPhase({ onHost, onJoin, useManual, setUseManual }: {
  onHost: () => void; onJoin: () => void; useManual: boolean; setUseManual: (b: boolean) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24 }}>
        <button class="btn btn-green" style={{ padding: '12px 24px', fontSize: 16 }} onClick={onHost}>HOST GAME</button>
        <button class="btn btn-primary" style={{ padding: '12px 24px', fontSize: 16 }} onClick={onJoin}>JOIN GAME</button>
      </div>
      <div style={{ marginTop: 24 }}>
        <label style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
          <input type="checkbox" checked={useManual} onChange={e => setUseManual((e.currentTarget as HTMLInputElement).checked)} style={{ marginRight: 6 }} />
          Manual Connect (advanced — clipboard-based offer/answer)
        </label>
      </div>
    </div>
  );
}

function HostPhase({ useManual, roomCode, onPasteAnswer }: {
  useManual: boolean; roomCode: string | null; onPasteAnswer: () => void;
}) {
  if (useManual) {
    return (
      <div>
        <button class="btn btn-gold" style={{ padding: '12px 24px', fontSize: 14 }} onClick={onPasteAnswer}>PASTE ANSWER</button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Share this room code:</div>
      <div style={{ fontFamily: 'monospace', fontSize: 48, color: '#44ff44', letterSpacing: 4 }}>
        {roomCode ?? '....'}
      </div>
    </div>
  );
}

function JoinPhase({ useManual, codeInput, setCodeInput, onConnect, onPasteOffer }: {
  useManual: boolean; codeInput: string; setCodeInput: (s: string) => void; onConnect: () => void; onPasteOffer: () => void;
}) {
  if (useManual) {
    return (
      <div>
        <button class="btn btn-primary" style={{ padding: '12px 24px', fontSize: 14 }} onClick={onPasteOffer}>PASTE OFFER</button>
      </div>
    );
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

function SetupPhase({ isHost, selectedMap, setSelectedMap, selectedDifficulty, setSelectedDifficulty, myFaction, onPickFaction }: {
  isHost: boolean;
  selectedMap: MapId; setSelectedMap: (m: MapId) => void;
  selectedDifficulty: DifficultyLevel; setSelectedDifficulty: (d: DifficultyLevel) => void;
  myFaction: FactionId | null;
  onPickFaction: (fid: FactionId) => void;
}) {
  const diffs: DifficultyLevel[] = useMemo(() => ['easy', 'normal', 'hard', 'insane'], []);
  return (
    <div>
      <div style={{ fontSize: 20, color: '#fff', fontFamily: 'monospace', marginBottom: 8 }}>GAME SETUP</div>
      <div style={{ color: '#44ff44', fontSize: 12, marginBottom: 16 }}>Connected! Choose settings and faction.</div>

      {isHost ? (
        <>
          <div class="ui-section-title" style={{ marginTop: 8 }}>Map</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {MAP_ORDER.filter(m => m !== 'custom').map(mid => (
              <button key={mid}
                class={`btn ${selectedMap === mid ? 'btn-gold' : ''}`}
                onClick={() => setSelectedMap(mid)}>
                {MAPS[mid]?.name ?? mid}
              </button>
            ))}
          </div>

          <div class="ui-section-title" style={{ marginTop: 16 }}>Difficulty</div>
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
      ) : (
        <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Host is choosing map & difficulty...</div>
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
