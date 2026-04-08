import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { SignalingClient } from '../systems/multiplayer/SignalingClient';
import { GameMessage } from '../systems/multiplayer/MessageProtocol';
import { MapId, MAP_ORDER, MAPS } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { UIScale } from '../systems/UIScale';
import { Analytics } from '../systems/AnalyticsClient';
import { ResponsiveManager } from '../systems/ResponsiveManager';

export class LobbyScene extends Phaser.Scene {
  private versus: VersusManager | null = null;
  private signaling: SignalingClient | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private isHost: boolean = false;
  private useManual: boolean = false;

  private selectedMap: MapId = 'plains';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private myFaction: FactionId | null = null;
  private opponentFaction: FactionId | null = null;
  private opponentMsg: GameMessage | null = null;

  private codeInput: HTMLInputElement | null = null;
  /** All dynamic scene objects — destroyed on phase transitions */
  private dynamicElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    this.dynamicElements = [];
    this.myFaction = null;
    this.opponentFaction = null;
    this.opponentMsg = null;

    const totalH = ResponsiveManager.canvasHeight();
    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.statusText = this.add.text(getCanvasWidth() / 2, UIScale.y(58), '', {
      fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: getCanvasWidth() - 100 },
    }).setOrigin(0.5);

    this.showConnectionPhase();
    this.events.once('shutdown', () => this.cleanup());
  }

  // ===================== Phase 1: Connect =====================

  private showConnectionPhase(): void {
    this.clearDynamic();
    const cx = getCanvasWidth() / 2;

    const title = this.add.text(cx, UIScale.y(24), 'VERSUS LOBBY', {
      fontSize: UIScale.font(22), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(title);

    const hostBtn = this.add.text(cx - UIScale.space(80), UIScale.y(90), '[ HOST GAME ]', {
      fontSize: UIScale.font(14), color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => this.startHost());
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));
    this.dynamicElements.push(hostBtn);

    const joinBtn = this.add.text(cx + UIScale.space(80), UIScale.y(90), '[ JOIN GAME ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerdown', () => this.startJoin());
    joinBtn.on('pointerover', () => joinBtn.setColor('#88bbff'));
    joinBtn.on('pointerout', () => joinBtn.setColor('#4488ff'));
    this.dynamicElements.push(joinBtn);

    const manualBtn = this.add.text(cx, UIScale.y(115), '[ Manual Connect (Advanced) ]', {
      fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    manualBtn.on('pointerdown', () => { this.useManual = true; this.statusText.setText('Manual mode enabled'); });
    this.dynamicElements.push(manualBtn);

    const backBtn = this.add.text(UIScale.space(30), ResponsiveManager.canvasHeight() - UIScale.space(20), '[ Back ]', {
      fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => { this.cleanup(); this.scene.start('MenuScene'); });
    this.dynamicElements.push(backBtn);
  }

  private createVersus(): VersusManager {
    return new VersusManager(
      (msg) => this.handleMessage(msg),
      (state) => {
        if (state === 'connected') {
          this.statusText.setText('');
          this.showGameSetup();
        }
      },
    );
  }

  private handleMessage(msg: GameMessage): void {
    if (msg.type === 'game_start') {
      this.opponentFaction = msg.faction as FactionId;
      this.opponentMsg = msg;
      if (!this.isHost) {
        this.selectedMap = msg.map as MapId;
        this.selectedDifficulty = msg.difficulty as DifficultyLevel;
      }
      if (this.myFaction) this.launchGame();
    }
  }

  // ===================== Host Flow =====================

  private async startHost(): Promise<void> {
    this.isHost = true;
    this.clearDynamic();
    this.versus = this.createVersus();

    if (this.useManual) return this.startHostManual();

    const cx = getCanvasWidth() / 2;
    this.signaling = new SignalingClient();
    this.statusText.setText('Creating room...');

    try {
      const room = await this.signaling.createRoom('versus');

      const codeText = this.add.text(cx, UIScale.y(100), room.code, {
        fontSize: UIScale.font(48), color: '#44ff44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(codeText);

      const label = this.add.text(cx, UIScale.y(60), 'Share this room code:', {
        fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(label);

      const waiting = this.add.text(cx, UIScale.y(135), 'Waiting for opponent to join...', {
        fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(waiting);

      this.signaling.connectSignaling();
      this.signaling.onPlayerJoined = async () => {
        waiting.setText('Opponent joined! Connecting...');
        try { await this.versus!.hostViaSignaling(this.signaling!); }
        catch (e) { this.statusText.setText('Connection failed: ' + (e as Error).message); }
      };
    } catch (e) {
      this.statusText.setText('Server error: ' + (e as Error).message);
    }
  }

  private async startJoin(): Promise<void> {
    this.isHost = false;
    this.clearDynamic();
    this.versus = this.createVersus();

    if (this.useManual) return this.startJoinManual();

    const cx = getCanvasWidth() / 2;
    this.signaling = new SignalingClient();
    this.statusText.setText('Enter the room code:');
    this.createCodeInput(cx);

    const connectBtn = this.add.text(cx, UIScale.y(130), '[ CONNECT ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    connectBtn.on('pointerdown', () => this.joinWithCode());
    this.dynamicElements.push(connectBtn);
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
      this.statusText.setText('Connected! Establishing P2P...');
      await this.versus!.joinViaSignaling(this.signaling!);
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  // ===================== Manual Fallback =====================

  private async startHostManual(): Promise<void> {
    const cx = getCanvasWidth() / 2;
    this.statusText.setText('Creating offer...');
    try {
      const offer = await this.versus!.host();
      await navigator.clipboard.writeText(offer);
      this.statusText.setText('Offer copied to clipboard! Send to opponent.');
      const pasteBtn = this.add.text(cx, UIScale.y(100), '[ PASTE ANSWER ]', {
        fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(pasteBtn);
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) { this.statusText.setText('Invalid code.'); return; }
          this.statusText.setText('Connecting...');
          await this.versus!.acceptAnswer(answer);
        } catch (e) { this.statusText.setText('Error: ' + (e as Error).message); }
      });
    } catch (e) { this.statusText.setText('Failed: ' + (e as Error).message); }
  }

  private async startJoinManual(): Promise<void> {
    const cx = getCanvasWidth() / 2;
    this.statusText.setText('Paste the host\'s offer code:');
    const pasteBtn = this.add.text(cx, UIScale.y(100), '[ PASTE OFFER ]', {
      fontSize: UIScale.font(12), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(pasteBtn);
    pasteBtn.on('pointerdown', async () => {
      try {
        const offer = await navigator.clipboard.readText();
        if (!offer || offer.length < 50) { this.statusText.setText('Invalid code.'); return; }
        this.statusText.setText('Creating answer...');
        const answer = await this.versus!.join(offer);
        await navigator.clipboard.writeText(answer);
        this.statusText.setText('Answer copied! Send to host. Waiting...');
      } catch (e) { this.statusText.setText('Failed: ' + (e as Error).message); }
    });
  }

  // ===================== Phase 2: Game Setup =====================

  private showGameSetup(): void {
    this.clearDynamic();
    this.removeCodeInput();

    const cx = getCanvasWidth() / 2;
    const s = UIScale.current;
    const isPhone = UIScale.isPhone;

    const title = this.add.text(cx, UIScale.y(20), 'GAME SETUP', {
      fontSize: UIScale.font(20), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(title);

    const connStatus = this.add.text(cx, UIScale.y(42), 'Connected! Choose settings and faction.', {
      fontSize: UIScale.font(10), color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(connStatus);

    let y = UIScale.y(65);

    // ---- Map selection (host only) ----
    if (this.isHost) {
      const mapLabel = this.add.text(cx, y, 'MAP', {
        fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(mapLabel);
      y += UIScale.space(16);

      const mapBtns: { btn: Phaser.GameObjects.Text; id: MapId }[] = [];
      const mapCols = isPhone ? 5 : MAP_ORDER.length;
      const mapSpacing = isPhone ? UIScale.space(40) : UIScale.space(55);
      for (let i = 0; i < MAP_ORDER.length; i++) {
        const mid = MAP_ORDER[i];
        const isRandom = mid === 'random';
        const col = i % mapCols;
        const row = Math.floor(i / mapCols);
        const rowCount = Math.min(mapCols, MAP_ORDER.length - row * mapCols);
        const rowStartX = cx - (rowCount * mapSpacing) / 2;
        const btn = this.add.text(rowStartX + col * mapSpacing + mapSpacing / 2, y + row * UIScale.space(14), MAPS[mid].name, {
          fontSize: UIScale.font(10), color: mid === this.selectedMap ? (isRandom ? '#ff44ff' : '#ffffff') : '#555555', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedMap = mid;
          mapBtns.forEach(b => {
            const r = b.id === 'random';
            b.btn.setColor(b.id === mid ? (r ? '#ff44ff' : '#ffffff') : '#555555');
          });
        });
        mapBtns.push({ btn, id: mid });
        this.dynamicElements.push(btn);
      }
      const mapRows = Math.ceil(MAP_ORDER.length / mapCols);
      y += mapRows * UIScale.space(14) + UIScale.space(10);

      // ---- Difficulty ----
      const diffLabel = this.add.text(cx, y, 'DIFFICULTY', {
        fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(diffLabel);
      y += UIScale.space(16);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard', 'insane'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      const diffSpacing = UIScale.space(50);
      const diffStartX = cx - (diffs.length * diffSpacing) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const btn = this.add.text(diffStartX + i * diffSpacing + diffSpacing / 2, y, did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: UIScale.font(11), color: did === this.selectedDifficulty ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
        this.dynamicElements.push(btn);
      }
      y += UIScale.space(20);
    } else {
      const waitLabel = this.add.text(cx, y, 'Host is choosing map & difficulty...', {
        fontSize: UIScale.font(11), color: '#666666', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(waitLabel);
      y += UIScale.space(20);
    }

    // ---- Faction selection ----
    const factionLabel = this.add.text(cx, y, 'PICK YOUR FACTION', {
      fontSize: UIScale.font(12), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(factionLabel);
    y += UIScale.space(16);

    const playable = FACTION_ORDER;
    const fCols = isPhone ? s.factionCols : 6;
    const cardW = isPhone ? Math.floor((getCanvasWidth() - 16) / fCols - 4) : s.factionCardW;
    const cardH = isPhone ? UIScale.space(40) : UIScale.space(50);
    const gap = isPhone ? 4 : 6;
    const rows = Math.ceil(playable.length / fCols);

    for (let i = 0; i < playable.length; i++) {
      const fid = playable[i];
      const faction = FACTIONS[fid];
      const col = i % fCols;
      const row = Math.floor(i / fCols);
      const rowCount = row < rows - 1 ? fCols : playable.length - (rows - 1) * fCols;
      const rowW = rowCount * cardW + (rowCount - 1) * gap;
      const rowStartX = cx - rowW / 2;
      const x = rowStartX + col * (cardW + gap);
      const cardY = y + row * (cardH + gap);

      const card = this.add.graphics();
      card.fillStyle(0x1a1a22, 1);
      card.fillRect(x, cardY, cardW, cardH);
      card.fillStyle(faction.primaryColor, 1);
      card.fillRect(x, cardY, cardW, 4);
      card.lineStyle(1, 0x333344, 0.6);
      card.strokeRect(x, cardY, cardW, cardH);
      this.dynamicElements.push(card);

      const nameText = this.add.text(x + cardW / 2, cardY + cardH * 0.4, faction.name, {
        fontSize: UIScale.font(11), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(nameText);

      const tCount = fid === 'random' ? '6/wave' : `${faction.towerIds.length} towers`;
      const countText = this.add.text(x + cardW / 2, cardY + cardH * 0.7, tCount, {
        fontSize: UIScale.font(9), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(countText);

      const zone = this.add.zone(x + cardW / 2, cardY + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(zone);
      zone.on('pointerdown', () => {
        this.myFaction = fid;
        this.statusText.setText(`You picked ${faction.name}! Waiting for opponent...`);
        this.versus!.send({
          type: 'game_start',
          faction: fid,
          matchMode: 'standard',
          map: this.selectedMap,
          difficulty: this.selectedDifficulty,
          seed: this.versus!.sharedSeed,
        });
        if (this.opponentFaction) this.launchGame();
      });
    }
  }

  private launchGame(): void {
    if (!this.myFaction || !this.versus) return;
    Analytics.multiplayerStart('versus', 2);
    this.removeCodeInput();
    this.registry.set('versus', this.versus);
    this.scene.start('DraftScene', {
      mode: 'standard',
      faction: this.myFaction,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
    });
  }

  // ===================== Helpers =====================

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
      top: ${rect.top + UIScale.y(95) * scaleY}px;
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
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.joinWithCode(); });
  }

  private clearDynamic(): void {
    for (const el of this.dynamicElements) el.destroy();
    this.dynamicElements = [];
  }

  private removeCodeInput(): void {
    if (this.codeInput) { this.codeInput.remove(); this.codeInput = null; }
  }

  private cleanup(): void {
    this.removeCodeInput();
    this.signaling?.disconnect();
    this.versus?.close();
  }
}
