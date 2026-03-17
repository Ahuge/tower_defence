import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { GameMessage } from '../systems/multiplayer/MessageProtocol';
import { MapId, MAP_ORDER, MAPS } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TowerSelectBar } from '../ui/TowerSelectBar';

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
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    this.add.text(cx, 30, 'VERSUS LOBBY', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 60, 'Peer-to-peer — no server needed', {
      fontSize: '11px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, 95, '', {
      fontSize: '12px', color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: CANVAS_WIDTH - 100 },
    }).setOrigin(0.5);

    this.codeDisplay = this.add.text(cx, 200, '', {
      fontSize: '9px', color: '#88aacc', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: CANVAS_WIDTH - 100 },
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
      fontSize: '9px', color: '#555555', fontFamily: 'monospace',
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

      const pasteBtn = this.add.text(CANVAS_WIDTH / 2, 170, '[ PASTE ANSWER ]', {
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

    const pasteBtn = this.add.text(CANVAS_WIDTH / 2, 170, '[ PASTE OFFER ]', {
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
    const cx = CANVAS_WIDTH / 2;

    // Host picks map + difficulty
    if (this.isHost) {
      this.add.text(cx, 195, 'Map:', { fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);

      const mapBtns: { btn: Phaser.GameObjects.Text; id: MapId }[] = [];
      const mapStartX = cx - (MAP_ORDER.length * 80) / 2;
      for (let i = 0; i < MAP_ORDER.length; i++) {
        const mid = MAP_ORDER[i];
        const btn = this.add.text(mapStartX + i * 80 + 40, 212, MAPS[mid].name, {
          fontSize: '11px', color: mid === this.selectedMap ? '#ffffff' : '#666666', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedMap = mid;
          mapBtns.forEach(b => b.btn.setColor(b.id === mid ? '#ffffff' : '#666666'));
        });
        mapBtns.push({ btn, id: mid });
      }

      this.add.text(cx, 230, 'Difficulty:', { fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      const diffStartX = cx - (diffs.length * 80) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const isSelected = did === this.selectedDifficulty;
        const btn = this.add.text(diffStartX + i * 80 + 40, 248, did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: '11px', color: isSelected ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
      }
    } else {
      this.add.text(cx, 215, 'Host is choosing map & difficulty...', {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Faction cards
    const factionY = this.isHost ? 275 : 245;
    this.add.text(cx, factionY, 'Pick your faction:', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const playable = FACTION_ORDER;
    const cardW = 130;
    const gap = 6;
    const totalW = playable.length * cardW + (playable.length - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < playable.length; i++) {
      const fid = playable[i];
      const faction = FACTIONS[fid];
      const x = startX + i * (cardW + gap);
      const y = factionY + 20;
      const h = 60;

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, h);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, h);

      this.add.text(x + cardW / 2, y + 15, faction.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const tCount = fid === 'random' ? '6/wave' : `${faction.towerIds.length} towers`;
      this.add.text(x + cardW / 2, y + 35, tCount, {
        fontSize: '9px', color: '#888888', fontFamily: 'monospace',
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
