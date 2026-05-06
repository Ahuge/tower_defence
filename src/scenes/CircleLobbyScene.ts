import * as Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT, TOWER_BAR_HEIGHT } from '../config';
import { CircleManager } from '../systems/multiplayer/CircleManager';
import { SignalingClient } from '../systems/multiplayer/SignalingClient';
import { GameMessage } from '../systems/multiplayer/MessageProtocol';
import { MapId, MapDefinition, CIRCLE_MAP_ORDER, MAPS } from '../data/Maps';
import { MapStorage, MapJSON } from '../systems/MapStorage';
import { SkinManager } from '../systems/monetization/SkinManager';
import { DifficultyLevel } from '../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { UIScale } from '../systems/UIScale';
import { Analytics } from '../systems/AnalyticsClient';
import { goToMenu } from '../ui/navigation';
import { TutorialManager } from '../systems/Tutorial/TutorialManager';

export class CircleLobbyScene extends Phaser.Scene {
  private circle: CircleManager | null = null;
  private signaling: SignalingClient | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private rosterText!: Phaser.GameObjects.Text;
  private isHost: boolean = false;
  private useManual: boolean = false;

  private selectedMap: MapId = 'circle_2p';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private customMapDef: MapDefinition | null = null;
  private customMapJSON: MapJSON | null = null;
  private myFaction: FactionId | null = null;
  private playerFactions: Map<number, FactionId> = new Map();
  private pendingPlayerIndex: number = -1;
  private dynamicElements: Phaser.GameObjects.GameObject[] = [];
  private pollTimer: Phaser.Time.TimerEvent | null = null;
  private assignedPlayerIndex: boolean = false;
  private codeInput: HTMLInputElement | null = null;
  private initialButtons: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('CircleLobbyScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TOWER_BAR_HEIGHT;

    this.playerFactions.clear();
    this.myFaction = null;
    this.dynamicElements = [];
    this.pollTimer = null;
    this.assignedPlayerIndex = false;
    TutorialManager.onLobbyOpened();

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.y(24), 'CIRCLE CO-OP', {
      fontSize: UIScale.font(22), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, UIScale.y(48), 'Shared map — build in your zone, defend together', {
      fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, UIScale.y(72), '', {
      fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: getCanvasWidth() - 100 },
    }).setOrigin(0.5);

    this.rosterText = this.add.text(cx, UIScale.y(100), '', {
      fontSize: UIScale.font(11), color: '#88aacc', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    // Host button
    const hostBtn = this.add.text(cx - UIScale.space(80), UIScale.y(130), '[ HOST GAME ]', {
      fontSize: UIScale.font(14), color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => { this.clearInitialButtons(); this.startHost(); });
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));

    // Join button
    const joinBtn = this.add.text(cx + UIScale.space(80), UIScale.y(130), '[ JOIN GAME ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerdown', () => { this.clearInitialButtons(); this.startJoin(); });
    joinBtn.on('pointerover', () => joinBtn.setColor('#88bbff'));
    joinBtn.on('pointerout', () => joinBtn.setColor('#4488ff'));

    // Manual fallback
    const manualBtn = this.add.text(cx, UIScale.y(155), '[ Manual Connect (Advanced) ]', {
      fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    manualBtn.on('pointerdown', () => { this.useManual = true; this.statusText.setText('Manual mode: use clipboard codes'); });

    this.initialButtons = [hostBtn, joinBtn, manualBtn];

    // Back button
    const backBtn = this.add.text(UIScale.space(30), totalH - UIScale.space(20), '[ Back ]', {
      fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.cleanup();
      goToMenu();
    });

    this.events.once('shutdown', () => {
      this.removeCodeInput();
      this.stopPollTimer();
      this.signaling?.disconnect();
      // Don't close circle here — it's passed to GameScene via registry
    });
  }

  private createCircle(): CircleManager {
    return new CircleManager(
      (msg, from) => this.handleMessage(msg, from),
      (playerIndex, state) => {
        if (state === 'connected') {
          this.updateRoster();
          if (this.isHost) {
            this.time.delayedCall(300, () => {
              if (!this.circle) return;
              this.circle.send({
                type: 'player_joined',
                playerIndex,
                totalPlayers: this.circle.playerCount,
              }, playerIndex);
              for (let i = 1; i < this.circle.playerCount; i++) {
                if (i === playerIndex) continue;
                this.circle.send({
                  type: 'player_joined',
                  playerIndex: i,
                  totalPlayers: this.circle.playerCount,
                }, i);
              }
            });
          }
        }
      },
    );
  }

  private handleMessage(msg: GameMessage, fromPlayer: number): void {
    if (msg.type === 'circle_game_start') {
      for (const p of msg.players) {
        this.playerFactions.set(p.index, p.faction as FactionId);
      }
      if (!this.isHost) {
        this.selectedMap = msg.map as MapId;
        this.selectedDifficulty = msg.difficulty as DifficultyLevel;
        this.circle!.sharedSeed = msg.seed;
        this.circle!.hostTerrainOverride = msg.hostTerrainOverride ?? null;
        if (msg.customMapJSON) {
          this.customMapJSON = msg.customMapJSON as MapJSON;
          this.customMapDef = MapStorage.mapJSONToDefinition(this.customMapJSON);
        }
        // Sync playerCount + botSlots so the roster renders bots
        // that the host added (these don't fire player_joined).
        this.circle!.playerCount = msg.players.length;
        if (msg.botSlots) for (const idx of msg.botSlots) this.circle!.botSlots.add(idx);
      }
      this.launchGame();
    } else if (msg.type === 'game_start') {
      if (msg.faction === '') {
        if (!this.isHost) {
          this.selectedMap = msg.map as MapId;
          this.selectedDifficulty = msg.difficulty as DifficultyLevel;
          this.circle!.sharedSeed = msg.seed;
          if (msg.customMapJSON) {
            this.customMapJSON = msg.customMapJSON as MapJSON;
            this.customMapDef = MapStorage.mapJSONToDefinition(this.customMapJSON);
          }
          this.showGameSetup();
        }
      } else {
        this.playerFactions.set(fromPlayer, msg.faction as FactionId);
        this.updateRoster();
        this.checkAllPicked();
      }
    } else if (msg.type === 'player_joined') {
      if (!this.isHost && this.circle) {
        if (!this.assignedPlayerIndex) {
          this.assignedPlayerIndex = true;
          this.circle.setPlayerInfo(msg.playerIndex, msg.totalPlayers);
          this.statusText.setText(`Connected as Player ${msg.playerIndex}! (${msg.totalPlayers} players)\nWaiting for host to start setup...`);
        } else {
          this.circle.playerCount = msg.totalPlayers;
        }
      }
      this.updateRoster();
    }
  }

  // ===================== Signaling Host Flow =====================

  private async startHost(): Promise<void> {
    this.isHost = true;
    this.circle = this.createCircle();
    this.circle.initHost();
    this.clearDynamic();

    if (this.useManual) {
      this.statusText.setText('Players: 1. Click ADD PLAYER to connect others.');
      this.updateRoster();
      this.showHostControlsManual();
      return;
    }

    this.signaling = new SignalingClient();
    try {
      const room = await this.signaling.createRoom('circle', 4);
      this.statusText.setText(`Room Code: ${room.code}\nShare this code with your teammates!`);

      const cx = getCanvasWidth() / 2;
      this.add.text(cx, UIScale.y(170), room.code, {
        fontSize: UIScale.font(36), color: '#44ff44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const waitingText = this.add.text(cx, UIScale.y(200), 'Waiting for players to join...', {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(waitingText);

      this.signaling.connectSignaling();

      // When a joiner connects to the room, establish WebRTC
      this.signaling.onPlayerJoined = async (joinerIndex: number, playerCount: number) => {
        this.circle!.playerCount = playerCount;
        waitingText.setText(`Players: ${playerCount}/4. Connecting Player ${joinerIndex}...`);
        try {
          await this.circle!.hostConnectPlayer(this.signaling!, joinerIndex);
        } catch (e) {
          this.statusText.setText('Connection to player failed: ' + (e as Error).message);
        }
      };

      // Show setup button
      this.showHostSetupButton();
    } catch (e) {
      this.statusText.setText('Server error: ' + (e as Error).message + '\nTry Manual Connect.');
    }
  }

  private showHostSetupButton(): void {
    const cx = getCanvasWidth() / 2;
    const startBtn = this.add.text(cx, UIScale.y(225), '[ SETUP GAME ]', {
      fontSize: UIScale.font(14), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(startBtn);
    let active = false;

    this.pollTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (active) return;
        const count = this.circle?.getConnectedCount() ?? 0;
        if (count >= 2) {
          active = true;
          startBtn.setColor('#ffaa44');
          startBtn.setInteractive({ useHandCursor: true });
          startBtn.on('pointerdown', () => {
            this.stopPollTimer();
            this.showGameSetup();
            const setupMsg: GameMessage = {
              type: 'game_start',
              faction: '',
              matchMode: 'circle_coop',
              map: this.selectedMap,
              difficulty: this.selectedDifficulty,
              seed: this.circle!.sharedSeed,
            };
            if (this.selectedMap === 'custom' && this.customMapJSON) {
              setupMsg.customMapJSON = this.customMapJSON;
            }
            this.circle!.broadcast(setupMsg);
          });
          startBtn.on('pointerover', () => startBtn.setColor('#ffffff'));
          startBtn.on('pointerout', () => startBtn.setColor('#ffaa44'));
        }
      },
    });
  }

  // ===================== Signaling Join Flow =====================

  private async startJoin(): Promise<void> {
    this.isHost = false;
    this.circle = this.createCircle();
    this.clearDynamic();

    if (this.useManual) {
      return this.startJoinManual();
    }

    this.signaling = new SignalingClient();
    this.statusText.setText('Enter the room code:');

    const cx = getCanvasWidth() / 2;
    this.createCodeInput(cx);

    const connectBtn = this.add.text(cx, UIScale.y(185), '[ CONNECT ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(connectBtn);
    connectBtn.on('pointerdown', () => this.joinWithCode());
  }

  private async joinWithCode(): Promise<void> {
    const code = this.codeInput?.value?.trim().toUpperCase();
    if (!code || code.length !== 4) {
      this.statusText.setText('Enter a 4-letter room code');
      return;
    }

    this.statusText.setText(`Joining room ${code}...`);
    try {
      await this.signaling!.joinRoom(code);
      this.signaling!.connectSignaling();
      this.statusText.setText('Connected to room! Establishing P2P...');
      await this.circle!.joinViaSignaling(this.signaling!);
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  private createCodeInput(cx: number): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 4;
    input.placeholder = 'ABCD';
    input.style.cssText = `
      position: absolute;
      left: ${rect.left + (cx - 60) * scaleX}px;
      top: ${rect.top + UIScale.y(145) * scaleY}px;
      width: ${120 * scaleX}px;
      height: ${30 * scaleY}px;
      font-family: monospace;
      font-size: ${16 * scaleY}px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 8px;
      background: #111;
      color: #fff;
      border: 2px solid #4488ff;
      outline: none;
      z-index: 1000;
    `;
    document.body.appendChild(input);
    input.focus();
    this.codeInput = input;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.joinWithCode();
    });
  }

  // ===================== Manual Fallback =====================

  private showHostControlsManual(): void {
    const cx = getCanvasWidth() / 2;

    const addBtn = this.add.text(cx - UIScale.space(70), UIScale.y(155), '[ ADD PLAYER ]', {
      fontSize: UIScale.font(12), color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(addBtn);
    addBtn.on('pointerdown', () => this.hostAddPlayerManual());

    this.showHostSetupButton();
  }

  private async hostAddPlayerManual(): Promise<void> {
    if (!this.circle || this.circle.playerCount >= 4) {
      this.statusText.setText('Maximum 4 players!');
      return;
    }
    try {
      this.statusText.setText('Creating offer for next player...');
      const [playerIndex, offer] = await this.circle.createOfferForNextPlayer();
      this.pendingPlayerIndex = playerIndex;
      await navigator.clipboard.writeText(offer);
      this.statusText.setText(`Offer for Player ${playerIndex} copied! Send to them, then click PASTE ANSWER.`);

      const cx = getCanvasWidth() / 2;
      const pasteBtn = this.add.text(cx, UIScale.y(185), '[ PASTE ANSWER ]', {
        fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(pasteBtn);
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) {
            this.statusText.setText('Invalid code.');
            return;
          }
          await this.circle!.acceptAnswer(this.pendingPlayerIndex, answer);
          pasteBtn.destroy();
          this.dynamicElements = this.dynamicElements.filter(e => e !== pasteBtn);
          this.statusText.setText(`Player ${this.pendingPlayerIndex} connected! (${this.circle!.getConnectedCount()} players)`);
          this.updateRoster();
        } catch (e) {
          this.statusText.setText('Error: ' + (e as Error).message);
        }
      });
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  private async startJoinManual(): Promise<void> {
    this.statusText.setText('Paste the host\'s offer code:');
    const cx = getCanvasWidth() / 2;
    const pasteBtn = this.add.text(cx, UIScale.y(170), '[ PASTE OFFER ]', {
      fontSize: UIScale.font(12), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(pasteBtn);
    pasteBtn.on('pointerdown', async () => {
      try {
        const offer = await navigator.clipboard.readText();
        if (!offer || offer.length < 50) {
          this.statusText.setText('Invalid code.');
          return;
        }
        this.statusText.setText('Creating answer...');
        const answer = await this.circle!.joinAsClient(offer);
        await navigator.clipboard.writeText(answer);
        this.statusText.setText('Answer copied! Send to host. Waiting...');
        pasteBtn.destroy();
        this.dynamicElements = this.dynamicElements.filter(e => e !== pasteBtn);
      } catch (e) {
        this.statusText.setText('Failed: ' + (e as Error).message);
      }
    });
  }

  // ===================== Game Setup =====================

  private showGameSetup(): void {
    this.stopPollTimer();
    this.clearDynamic();
    this.removeCodeInput();

    const cx = getCanvasWidth() / 2;
    const isPhone = UIScale.isPhone;
    const playerCount = this.circle!.playerCount;

    if (playerCount === 2) this.selectedMap = 'circle_2p';
    else if (playerCount === 3) this.selectedMap = 'circle_3p';
    else this.selectedMap = 'circle_4p';

    this.statusText.setText(`${playerCount} players — Pick your faction!`);

    // Difficulty selection (host only)
    if (this.isHost) {
      const diffLabel = this.add.text(cx, UIScale.y(145), 'Difficulty:', {
        fontSize: UIScale.font(11), color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(diffLabel);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard', 'insane'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      const diffSpacing = UIScale.space(55);
      const diffStartX = cx - (diffs.length * diffSpacing) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const btn = this.add.text(diffStartX + i * diffSpacing + diffSpacing / 2, UIScale.y(162), did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: UIScale.font(11), color: did === this.selectedDifficulty ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.dynamicElements.push(btn);
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
      }
    }

    // Faction cards
    const factionY = UIScale.y(this.isHost ? 185 : 155);
    const factionLabel = this.add.text(cx, factionY, 'Pick your faction:', {
      fontSize: UIScale.font(12), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(factionLabel);

    const playable = FACTION_ORDER;
    const cardW = UIScale.space(55);
    const cardH = UIScale.space(24);
    const gap = UIScale.space(3);
    const cols = isPhone ? 3 : 6;

    for (let i = 0; i < playable.length; i++) {
      const fid = playable[i];
      const faction = FACTIONS[fid];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = row < Math.floor(playable.length / cols) ? cols : playable.length % cols || cols;
      const rowW = rowCount * cardW + (rowCount - 1) * gap;
      const rowStartX = cx - rowW / 2;
      const x = rowStartX + col * (cardW + gap);
      const y = factionY + UIScale.space(14) + row * (cardH + gap);

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, cardH);
      this.dynamicElements.push(card);

      const nameText = this.add.text(x + cardW / 2, y + cardH / 2, faction.name, {
        fontSize: UIScale.font(10), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(nameText);

      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(zone);
      zone.on('pointerdown', () => {
        this.myFaction = fid;
        this.playerFactions.set(this.circle!.playerIndex, fid);
        this.statusText.setText(`You picked ${faction.name}! Waiting for others...`);
        const pickMsg: GameMessage = {
          type: 'game_start',
          faction: fid,
          matchMode: 'circle_coop',
          map: this.selectedMap,
          difficulty: this.selectedDifficulty,
          seed: this.circle!.sharedSeed,
        };
        if (this.selectedMap === 'custom' && this.customMapJSON) {
          pickMsg.customMapJSON = this.customMapJSON;
        }
        this.circle!.broadcast(pickMsg);
        this.checkAllPicked();
      });
    }
  }

  private checkAllPicked(): void {
    if (!this.isHost || !this.circle) return;
    const connected = this.circle.getConnectedCount();
    if (this.playerFactions.size < connected) return;

    const players = Array.from(this.playerFactions.entries()).map(([index, faction]) => ({ index, faction }));
    // Resolve the host's equipped terrain theme so guests can render
    // the same tileset on the shared grid. Custom maps stay locked to
    // their authored theme regardless — `hostTerrainOverride` is null.
    const hostFaction = this.selectedMap === 'custom'
      ? null
      : SkinManager.getTerrainOverrideFaction();
    const hostTerrainOverride = hostFaction ? SkinManager.factionToThemeId(hostFaction) : null;
    const launchMsg: GameMessage = {
      type: 'circle_game_start',
      players,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
      seed: this.circle.sharedSeed,
      hostTerrainOverride,
    };
    if (this.selectedMap === 'custom' && this.customMapJSON) {
      launchMsg.customMapJSON = this.customMapJSON;
    }
    this.circle.hostTerrainOverride = hostTerrainOverride;
    this.circle.broadcast(launchMsg);
    this.launchGame();
  }

  private launchGame(): void {
    if (!this.myFaction || !this.circle) return;
    this.stopPollTimer();
    this.removeCodeInput();

    Analytics.multiplayerStart('circle', this.circle.playerCount);

    for (const [idx, fac] of this.playerFactions) {
      this.circle.playerFactions.set(idx, fac);
    }

    this.registry.set('circle', this.circle);
    this.scene.start('DraftScene', {
      mode: 'circle_coop' as any,
      faction: this.myFaction,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
      customMapDef: this.customMapDef ?? undefined,
    });
  }

  // ===================== Helpers =====================

  private updateRoster(): void {
    if (!this.circle) return;
    const lines: string[] = [];
    for (let i = 0; i < this.circle.playerCount; i++) {
      const isMe = i === this.circle.playerIndex;
      const faction = this.playerFactions.get(i);
      const fStr = faction ? ` [${FACTIONS[faction]?.name ?? faction}]` : '';
      const status = isMe ? '(you)' : 'connected';
      lines.push(`Player ${i}: ${status}${fStr}`);
    }
    this.rosterText.setText(lines.join('\n'));
  }

  private stopPollTimer(): void {
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }
  }

  private clearDynamic(): void {
    this.stopPollTimer();
    for (const el of this.dynamicElements) el.destroy();
    this.dynamicElements = [];
  }

  private clearInitialButtons(): void {
    for (const btn of this.initialButtons) btn.destroy();
    this.initialButtons = [];
  }

  private removeCodeInput(): void {
    if (this.codeInput) {
      this.codeInput.remove();
      this.codeInput = null;
    }
  }

  private cleanup(): void {
    this.removeCodeInput();
    this.stopPollTimer();
    this.signaling?.disconnect();
    this.circle?.close();
  }
}
