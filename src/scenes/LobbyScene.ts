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

  // DOM input for room code (Phaser doesn't have native text input)
  private codeInput: HTMLInputElement | null = null;

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.y(24), 'VERSUS LOBBY', {
      fontSize: UIScale.font(22), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, UIScale.y(58), '', {
      fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: getCanvasWidth() - 100 },
    }).setOrigin(0.5);

    // Host button
    const hostBtn = this.add.text(cx - UIScale.space(80), UIScale.y(90), '[ HOST GAME ]', {
      fontSize: UIScale.font(14), color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => this.startHost());
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));

    // Join button
    const joinBtn = this.add.text(cx + UIScale.space(80), UIScale.y(90), '[ JOIN GAME ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerdown', () => this.startJoin());
    joinBtn.on('pointerover', () => joinBtn.setColor('#88bbff'));
    joinBtn.on('pointerout', () => joinBtn.setColor('#4488ff'));

    // Manual fallback link
    const manualBtn = this.add.text(cx, UIScale.y(115), '[ Manual Connect (Advanced) ]', {
      fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    manualBtn.on('pointerdown', () => { this.useManual = true; this.statusText.setText('Manual mode: use clipboard codes'); });
    manualBtn.on('pointerover', () => manualBtn.setColor('#888888'));
    manualBtn.on('pointerout', () => manualBtn.setColor('#555555'));

    // Back button
    const backBtn = this.add.text(UIScale.space(30), totalH - UIScale.space(20), '[ Back ]', {
      fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.cleanup();
      this.scene.start('MenuScene');
    });

    // Clean up DOM elements when scene shuts down
    this.events.once('shutdown', () => this.cleanup());
  }

  private createVersus(): VersusManager {
    return new VersusManager(
      (msg) => this.handleMessage(msg),
      (state) => {
        if (state === 'connected') {
          this.statusText.setText('CONNECTED! Setting up game...');
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
      if (this.myFaction) {
        this.launchGame();
      }
    }
  }

  // ===================== Signaling Server Mode =====================

  private async startHost(): Promise<void> {
    this.isHost = true;

    if (this.useManual) {
      return this.startHostManual();
    }

    this.statusText.setText('Creating room...');
    this.versus = this.createVersus();
    this.signaling = new SignalingClient();

    try {
      const room = await this.signaling.createRoom('versus');
      this.statusText.setText(`Room Code: ${room.code}\n\nShare this code with your opponent!`);

      // Show the room code prominently
      const cx = getCanvasWidth() / 2;
      this.add.text(cx, UIScale.y(165), room.code, {
        fontSize: UIScale.font(36), color: '#44ff44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(cx, UIScale.y(195), 'Waiting for opponent to join...', {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Connect signaling WebSocket
      this.signaling.connectSignaling();

      // When joiner connects to the room, start WebRTC
      this.signaling.onPlayerJoined = async () => {
        this.statusText.setText('Opponent joined! Connecting...');
        try {
          await this.versus!.hostViaSignaling(this.signaling!);
        } catch (e) {
          this.statusText.setText('Connection failed: ' + (e as Error).message);
        }
      };
    } catch (e) {
      this.statusText.setText('Server error: ' + (e as Error).message + '\nTry Manual Connect.');
    }
  }

  private async startJoin(): Promise<void> {
    this.isHost = false;

    if (this.useManual) {
      return this.startJoinManual();
    }

    this.versus = this.createVersus();
    this.signaling = new SignalingClient();

    // Show room code input
    const cx = getCanvasWidth() / 2;
    this.statusText.setText('Enter the room code:');

    // Create an HTML input element overlaid on the canvas
    this.createCodeInput(cx);

    // Connect button
    const connectBtn = this.add.text(cx, UIScale.y(185), '[ CONNECT ]', {
      fontSize: UIScale.font(14), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    connectBtn.on('pointerdown', () => this.joinWithCode());
    connectBtn.on('pointerover', () => connectBtn.setColor('#88bbff'));
    connectBtn.on('pointerout', () => connectBtn.setColor('#4488ff'));
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

      // Wait for host's offer via signaling server
      this.statusText.setText('Connected to room! Waiting for host...');
      await this.versus!.joinViaSignaling(this.signaling!);
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  /** Create an HTML input element for the room code */
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

    // Submit on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.joinWithCode();
    });
  }

  // ===================== Manual Mode (Fallback) =====================

  private async startHostManual(): Promise<void> {
    this.statusText.setText('Creating offer...');
    this.versus = this.createVersus();

    try {
      const offer = await this.versus.host();
      await navigator.clipboard.writeText(offer);
      this.statusText.setText(
        'Offer copied to clipboard! Send to opponent.\n' +
        'When they send back their answer, click below.'
      );

      const cx = getCanvasWidth() / 2;
      const pasteBtn = this.add.text(cx, UIScale.y(155), '[ PASTE ANSWER ]', {
        fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) {
            this.statusText.setText('Invalid code. Copy the answer first.');
            return;
          }
          this.statusText.setText('Connecting...');
          await this.versus!.acceptAnswer(answer);
        } catch (e) {
          this.statusText.setText('Clipboard error: ' + (e as Error).message);
        }
      });
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  private async startJoinManual(): Promise<void> {
    this.statusText.setText('Paste the host\'s offer code:');
    this.versus = this.createVersus();

    const cx = getCanvasWidth() / 2;
    const pasteBtn = this.add.text(cx, UIScale.y(155), '[ PASTE OFFER ]', {
      fontSize: UIScale.font(12), color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pasteBtn.on('pointerdown', async () => {
      try {
        const offer = await navigator.clipboard.readText();
        if (!offer || offer.length < 50) {
          this.statusText.setText('Invalid code. Copy the offer first.');
          return;
        }
        this.statusText.setText('Creating answer...');
        const answer = await this.versus!.join(offer);
        await navigator.clipboard.writeText(answer);
        this.statusText.setText('Answer copied! Send to host. Waiting...');
      } catch (e) {
        this.statusText.setText('Failed: ' + (e as Error).message);
      }
    });
  }

  // ===================== Game Setup (Post-Connection) =====================

  private showGameSetup(): void {
    // Remove DOM input if present
    this.removeCodeInput();

    const cx = getCanvasWidth() / 2;
    const isPhone = UIScale.isPhone;

    // Host picks map + difficulty
    if (this.isHost) {
      this.add.text(cx, UIScale.y(145), 'Map:', {
        fontSize: UIScale.font(11), color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const mapBtns: { btn: Phaser.GameObjects.Text; id: MapId }[] = [];
      const mapSpacing = UIScale.space(55);
      const mapCols = Math.min(MAP_ORDER.length, Math.floor((getCanvasWidth() - 20) / mapSpacing));
      for (let i = 0; i < MAP_ORDER.length; i++) {
        const mid = MAP_ORDER[i];
        const isRandom = mid === 'random';
        const activeColor = isRandom ? '#ff44ff' : '#ffffff';
        const inactiveColor = isRandom ? '#884488' : '#666666';
        const col = i % mapCols;
        const row = Math.floor(i / mapCols);
        const rowStartX = cx - (Math.min(mapCols, MAP_ORDER.length - row * mapCols) * mapSpacing) / 2;
        const btn = this.add.text(rowStartX + col * mapSpacing + mapSpacing / 2, UIScale.y(160) + row * UIScale.space(16), MAPS[mid].name, {
          fontSize: UIScale.font(11), color: mid === this.selectedMap ? activeColor : inactiveColor, fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedMap = mid;
          mapBtns.forEach(b => {
            const isR = b.id === 'random';
            b.btn.setColor(b.id === mid ? (isR ? '#ff44ff' : '#ffffff') : (isR ? '#884488' : '#666666'));
          });
        });
        mapBtns.push({ btn, id: mid });
      }

      const mapRows = Math.ceil(MAP_ORDER.length / mapCols);
      const diffLabelY = UIScale.y(175) + (mapRows - 1) * UIScale.space(16);
      this.add.text(cx, diffLabelY, 'Difficulty:', {
        fontSize: UIScale.font(11), color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard', 'insane'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      const diffSpacing = UIScale.space(55);
      const diffStartX = cx - (diffs.length * diffSpacing) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const btn = this.add.text(diffStartX + i * diffSpacing + diffSpacing / 2, diffLabelY + UIScale.space(16), did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: UIScale.font(11), color: did === this.selectedDifficulty ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
      }
    } else {
      this.add.text(cx, UIScale.y(160), 'Host is choosing map & difficulty...', {
        fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Faction cards
    const factionY = UIScale.y(this.isHost ? 210 : 185);
    this.add.text(cx, factionY, 'Pick your faction:', {
      fontSize: UIScale.font(12), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

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

      this.add.text(x + cardW / 2, y + cardH / 2, faction.name, {
        fontSize: UIScale.font(10), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
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

        if (this.opponentFaction) {
          this.launchGame();
        }
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

  private removeCodeInput(): void {
    if (this.codeInput) {
      this.codeInput.remove();
      this.codeInput = null;
    }
  }

  private cleanup(): void {
    this.removeCodeInput();
    this.signaling?.disconnect();
    this.versus?.close();
  }
}
