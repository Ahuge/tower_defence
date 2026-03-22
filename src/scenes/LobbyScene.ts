import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { GameMessage } from '../systems/multiplayer/MessageProtocol';
import { MapId, MAP_ORDER, MAPS } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { UIScale } from '../systems/UIScale';

export class LobbyScene extends Phaser.Scene {
  private versus: VersusManager | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private codeDisplay!: Phaser.GameObjects.Text;
  private isHost: boolean = false;

  private selectedMap: MapId = 'plains';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private myFaction: FactionId | null = null;
  private opponentFaction: FactionId | null = null;
  private opponentMsg: GameMessage | null = null;

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, 30, 'VERSUS LOBBY', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 60, 'Peer-to-peer — no server needed', {
      fontSize: '13px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, 95, '', {
      fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: getCanvasWidth() - 100 },
    }).setOrigin(0.5);

    this.codeDisplay = this.add.text(cx, 200, '', {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: getCanvasWidth() - 100 },
    }).setOrigin(0.5, 0);

    const hostBtn = this.add.text(cx - 120, 130, '[ HOST GAME ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => this.startHost());
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));

    const joinBtn = this.add.text(cx + 120, 130, '[ JOIN GAME ]', {
      fontSize: '16px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerdown', () => this.startJoin());
    joinBtn.on('pointerover', () => joinBtn.setColor('#88bbff'));
    joinBtn.on('pointerout', () => joinBtn.setColor('#4488ff'));

    const backBtn = this.add.text(50, totalH - 30, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.versus?.close();
      this.scene.start('MenuScene');
    });

    this.add.text(cx, totalH - 50, 'Codes are copied to/pasted from clipboard', {
      fontSize: '13px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);
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
      // Joiner gets map/difficulty from host
      if (!this.isHost) {
        this.selectedMap = msg.map as MapId;
        this.selectedDifficulty = msg.difficulty as DifficultyLevel;
      }
      if (this.myFaction) {
        this.launchGame();
      }
    }
  }

  private async startHost(): Promise<void> {
    this.isHost = true;
    this.statusText.setText('Creating offer...');
    this.versus = this.createVersus();

    try {
      const offer = await this.versus.host();
      await navigator.clipboard.writeText(offer);
      this.statusText.setText(
        'Step 1: Offer copied to clipboard! Send to opponent.\n' +
        'Step 2: When they send back their answer, click below.'
      );
      this.codeDisplay.setText(`Offer (${offer.length} chars) on clipboard`);

      const pasteBtn = this.add.text(getCanvasWidth() / 2, 170, '[ PASTE ANSWER ]', {
        fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) {
            this.statusText.setText('Invalid code. Copy the answer code first.');
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

  private async startJoin(): Promise<void> {
    this.isHost = false;
    this.statusText.setText('Paste the host\'s offer code:');
    this.versus = this.createVersus();

    const pasteBtn = this.add.text(getCanvasWidth() / 2, 170, '[ PASTE OFFER ]', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace',
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
        this.codeDisplay.setText(`Answer (${answer.length} chars) on clipboard`);
      } catch (e) {
        this.statusText.setText('Failed: ' + (e as Error).message);
      }
    });
  }

  private showGameSetup(): void {
    this.codeDisplay.setText('');
    const cx = getCanvasWidth() / 2;
    const isPhone = UIScale.isPhone;

    // Host picks map + difficulty
    if (this.isHost) {
      this.add.text(cx, 195, 'Map:', { fontSize: UIScale.fontCapped(13, 11), color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);

      const mapBtns: { btn: Phaser.GameObjects.Text; id: MapId }[] = [];
      const mapSpacing = isPhone ? 55 : 80; // TODO: centralize in UIScale
      const mapCols = isPhone ? Math.min(MAP_ORDER.length, Math.floor((getCanvasWidth() - 20) / mapSpacing)) : MAP_ORDER.length; // TODO: centralize in UIScale
      for (let i = 0; i < MAP_ORDER.length; i++) {
        const mid = MAP_ORDER[i];
        const isRandom = mid === 'random';
        const activeColor = isRandom ? '#ff44ff' : '#ffffff';
        const inactiveColor = isRandom ? '#884488' : '#666666';
        const col = i % mapCols;
        const row = Math.floor(i / mapCols);
        const rowStartX = cx - (Math.min(mapCols, MAP_ORDER.length - row * mapCols) * mapSpacing) / 2;
        const btn = this.add.text(rowStartX + col * mapSpacing + mapSpacing / 2, 212 + row * 18, MAPS[mid].name, {
          fontSize: UIScale.fontCapped(13, 10), color: mid === this.selectedMap ? activeColor : inactiveColor, fontFamily: 'monospace',
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
      const diffLabelY = 230 + (mapRows - 1) * 18;
      this.add.text(cx, diffLabelY, 'Difficulty:', { fontSize: UIScale.fontCapped(13, 11), color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard', 'insane'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      const diffSpacing = isPhone ? 60 : 80; // TODO: centralize in UIScale
      const diffStartX = cx - (diffs.length * diffSpacing) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const isSelected = did === this.selectedDifficulty;
        const btn = this.add.text(diffStartX + i * diffSpacing + diffSpacing / 2, diffLabelY + 18, did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: UIScale.fontCapped(13, 11), color: isSelected ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
      }
    } else {
      this.add.text(cx, 215, 'Host is choosing map & difficulty...', {
        fontSize: UIScale.fontCapped(14, 12), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Faction cards
    const factionY = this.isHost ? 275 : 245;
    this.add.text(cx, factionY, 'Pick your faction:', {
      fontSize: UIScale.fontCapped(14, 12), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const playable = FACTION_ORDER;
    const cardW = isPhone ? 80 : 120; // TODO: centralize in UIScale
    const cardH = isPhone ? 40 : 50; // TODO: centralize in UIScale
    const gap = isPhone ? 4 : 6; // TODO: centralize in UIScale
    const cols = isPhone ? 3 : 6; // TODO: centralize in UIScale

    for (let i = 0; i < playable.length; i++) {
      const fid = playable[i];
      const faction = FACTIONS[fid];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = row < Math.floor(playable.length / cols) ? cols : playable.length % cols || cols;
      const rowW = rowCount * cardW + (rowCount - 1) * gap;
      const rowStartX = cx - rowW / 2;
      const x = rowStartX + col * (cardW + gap);
      const y = factionY + 20 + row * (cardH + gap);
      const h = cardH;

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, h);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, h);

      this.add.text(x + cardW / 2, y + (isPhone ? 12 : 15), faction.name, { // TODO: centralize in UIScale
        fontSize: UIScale.fontCapped(13, 10), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const tCount = fid === 'random' ? '6/wave' : `${faction.towerIds.length} towers`;
      this.add.text(x + cardW / 2, y + (isPhone ? 28 : 35), tCount, { // TODO: centralize in UIScale
        fontSize: UIScale.fontCapped(13, 9), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + cardW / 2, y + h / 2, cardW, h).setInteractive({ useHandCursor: true });
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

    this.registry.set('versus', this.versus);
    this.scene.start('DraftScene', {
      mode: 'standard',
      faction: this.myFaction,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
    });
  }
}
