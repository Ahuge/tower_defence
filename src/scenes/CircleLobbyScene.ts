import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { CircleManager } from '../systems/multiplayer/CircleManager';
import { GameMessage } from '../systems/multiplayer/MessageProtocol';
import { MapId, CIRCLE_MAP_ORDER, MAPS } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class CircleLobbyScene extends Phaser.Scene {
  private circle: CircleManager | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private rosterText!: Phaser.GameObjects.Text;
  private isHost: boolean = false;

  private selectedMap: MapId = 'circle_2p';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private myFaction: FactionId | null = null;
  private playerFactions: Map<number, FactionId> = new Map();
  private pendingPlayerIndex: number = -1;
  private dynamicElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('CircleLobbyScene');
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.playerFactions.clear();
    this.myFaction = null;
    this.dynamicElements = [];

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    this.add.text(cx, 30, 'CIRCLE CO-OP', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 60, 'Shared map — build in your zone, defend together', {
      fontSize: '13px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, 95, '', {
      fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: CANVAS_WIDTH - 100 },
    }).setOrigin(0.5);

    this.rosterText = this.add.text(cx, 140, '', {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    // Host button
    const hostBtn = this.add.text(cx - 120, 175, '[ HOST GAME ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => this.startHost());
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));

    // Join button
    const joinBtn = this.add.text(cx + 120, 175, '[ JOIN GAME ]', {
      fontSize: '16px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    joinBtn.on('pointerdown', () => this.startJoin());
    joinBtn.on('pointerover', () => joinBtn.setColor('#88bbff'));
    joinBtn.on('pointerout', () => joinBtn.setColor('#4488ff'));

    // Back button
    const backBtn = this.add.text(50, totalH - 30, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.circle?.close();
      this.scene.start('MenuScene');
    });

    this.add.text(cx, totalH - 50, 'Codes are copied to/pasted from clipboard', {
      fontSize: '13px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createCircle(): CircleManager {
    return new CircleManager(
      (msg, from) => this.handleMessage(msg, from),
      (playerIndex, state) => {
        if (state === 'connected') {
          this.updateRoster();
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
      }
      this.launchGame();
    } else if (msg.type === 'game_start') {
      this.playerFactions.set(fromPlayer, msg.faction as FactionId);
      this.updateRoster();
      this.checkAllPicked();
    } else if (msg.type === 'player_joined') {
      this.circle!.playerCount = msg.totalPlayers;
      this.updateRoster();
    }
  }

  // === HOST FLOW ===

  private async startHost(): Promise<void> {
    this.isHost = true;
    this.circle = this.createCircle();
    this.circle.initHost();
    this.clearDynamic();
    this.statusText.setText('Players: 1. Click ADD PLAYER to connect others.');
    this.updateRoster();
    this.showHostControls();
  }

  private showHostControls(): void {
    const cx = CANVAS_WIDTH / 2;

    const addBtn = this.add.text(cx - 100, 210, '[ ADD PLAYER ]', {
      fontSize: '14px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(addBtn);
    addBtn.on('pointerdown', () => this.hostAddPlayer());

    const startBtn = this.add.text(cx + 100, 210, '[ SETUP GAME ]', {
      fontSize: '14px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(startBtn);

    this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        const count = this.circle?.getConnectedCount() ?? 0;
        if (count >= 2 && !startBtn.input) {
          startBtn.setColor('#ffaa44');
          startBtn.setInteractive({ useHandCursor: true });
          startBtn.on('pointerdown', () => this.showGameSetup());
        }
      },
    });
  }

  private async hostAddPlayer(): Promise<void> {
    if (!this.circle) return;
    if (this.circle.playerCount >= 4) {
      this.statusText.setText('Maximum 4 players!');
      return;
    }

    try {
      this.statusText.setText('Creating offer for next player...');
      const [playerIndex, offer] = await this.circle.createOfferForNextPlayer();
      this.pendingPlayerIndex = playerIndex;
      await navigator.clipboard.writeText(offer);
      this.statusText.setText(
        `Offer for Player ${playerIndex} copied!\nSend to them, then click PASTE ANSWER.`
      );

      this.circle.broadcast({ type: 'player_joined', playerIndex, totalPlayers: this.circle.playerCount });

      const cx = CANVAS_WIDTH / 2;
      const pasteBtn = this.add.text(cx, 245, '[ PASTE ANSWER ]', {
        fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(pasteBtn);
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) {
            this.statusText.setText('Invalid code. Copy the answer code first.');
            return;
          }
          await this.circle!.acceptAnswer(this.pendingPlayerIndex, answer);
          pasteBtn.destroy();
          const count = this.circle!.getConnectedCount();
          this.statusText.setText(`Player ${this.pendingPlayerIndex} connected! (${count} players)`);
          this.updateRoster();
        } catch (e) {
          this.statusText.setText('Error: ' + (e as Error).message);
        }
      });
    } catch (e) {
      this.statusText.setText('Failed: ' + (e as Error).message);
    }
  }

  // === JOIN FLOW ===

  private async startJoin(): Promise<void> {
    this.isHost = false;
    this.circle = this.createCircle();
    this.clearDynamic();
    this.statusText.setText('Paste the host\'s offer code:');

    const cx = CANVAS_WIDTH / 2;
    const pasteBtn = this.add.text(cx, 210, '[ PASTE OFFER ]', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dynamicElements.push(pasteBtn);

    pasteBtn.on('pointerdown', async () => {
      try {
        const offer = await navigator.clipboard.readText();
        if (!offer || offer.length < 50) {
          this.statusText.setText('Invalid code. Copy the offer first.');
          return;
        }
        this.statusText.setText('Creating answer...');
        const answer = await this.circle!.joinAsClient(offer);
        await navigator.clipboard.writeText(answer);
        this.statusText.setText('Answer copied! Send to host. Waiting for game setup...');
        pasteBtn.destroy();
      } catch (e) {
        this.statusText.setText('Failed: ' + (e as Error).message);
      }
    });
  }

  // === GAME SETUP ===

  private showGameSetup(): void {
    this.clearDynamic();
    const cx = CANVAS_WIDTH / 2;
    const playerCount = this.circle!.getConnectedCount();

    // Auto-select appropriate circle map
    if (playerCount === 2) this.selectedMap = 'circle_2p';
    else if (playerCount === 3) this.selectedMap = 'circle_3p';
    else this.selectedMap = 'circle_4p';

    this.statusText.setText(`${playerCount} players — Map: ${MAPS[this.selectedMap].name}`);

    // Map selection (host picks from circle maps matching player count)
    if (this.isHost) {
      const availableMaps = CIRCLE_MAP_ORDER.filter(m => {
        const mapDef = MAPS[m];
        return mapDef.circlePlayers === playerCount;
      });

      if (availableMaps.length > 1) {
        const mapLabel = this.add.text(cx, 210, 'Map:', { fontSize: '13px', color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);
        this.dynamicElements.push(mapLabel);

        const mapBtns: { btn: Phaser.GameObjects.Text; id: MapId }[] = [];
        for (let i = 0; i < availableMaps.length; i++) {
          const mid = availableMaps[i];
          const btn = this.add.text(cx - 80 + i * 160, 228, MAPS[mid].name, {
            fontSize: '13px', color: mid === this.selectedMap ? '#ffffff' : '#666666', fontFamily: 'monospace',
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          this.dynamicElements.push(btn);
          btn.on('pointerdown', () => {
            this.selectedMap = mid;
            mapBtns.forEach(b => b.btn.setColor(b.id === mid ? '#ffffff' : '#666666'));
          });
          mapBtns.push({ btn, id: mid });
        }
      }

      // Difficulty
      const diffLabel = this.add.text(cx, 248, 'Difficulty:', { fontSize: '13px', color: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5);
      this.dynamicElements.push(diffLabel);

      const diffs: DifficultyLevel[] = ['easy', 'normal', 'hard'];
      const diffColors: Record<string, string> = { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444' };
      const diffBtns: { btn: Phaser.GameObjects.Text; id: DifficultyLevel }[] = [];
      for (let i = 0; i < diffs.length; i++) {
        const did = diffs[i];
        const btn = this.add.text(cx - 80 + i * 80, 266, did.charAt(0).toUpperCase() + did.slice(1), {
          fontSize: '13px', color: did === this.selectedDifficulty ? diffColors[did] : '#444444', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.dynamicElements.push(btn);
        btn.on('pointerdown', () => {
          this.selectedDifficulty = did;
          diffBtns.forEach(b => b.btn.setColor(b.id === did ? diffColors[b.id] : '#444444'));
        });
        diffBtns.push({ btn, id: did });
      }
    } else {
      const waitText = this.add.text(cx, 230, 'Host is choosing settings...', {
        fontSize: '14px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(waitText);
    }

    // Faction cards
    const factionY = this.isHost ? 295 : 260;
    const factionLabel = this.add.text(cx, factionY, 'Pick your faction:', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.dynamicElements.push(factionLabel);

    const playable = FACTION_ORDER;
    const cardW = 120;
    const cardH = 50;
    const gap = 6;
    const cols = 6;

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

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, cardH);
      this.dynamicElements.push(card);

      const nameText = this.add.text(x + cardW / 2, y + 15, faction.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(nameText);

      const tCount = fid === 'random' ? '6/wave' : `${faction.towerIds.length} towers`;
      const countText = this.add.text(x + cardW / 2, y + 35, tCount, {
        fontSize: '13px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.dynamicElements.push(countText);

      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      this.dynamicElements.push(zone);
      zone.on('pointerdown', () => {
        this.myFaction = fid;
        this.playerFactions.set(this.circle!.playerIndex, fid);
        this.statusText.setText(`You picked ${faction.name}! Waiting for others...`);

        this.circle!.broadcast({
          type: 'game_start',
          faction: fid,
          matchMode: 'circle_coop',
          map: this.selectedMap,
          difficulty: this.selectedDifficulty,
          seed: this.circle!.sharedSeed,
        });

        this.checkAllPicked();
      });
    }
  }

  private checkAllPicked(): void {
    if (!this.isHost || !this.circle) return;

    const connected = this.circle.getConnectedCount();
    if (this.playerFactions.size < connected) return;

    const players = Array.from(this.playerFactions.entries()).map(([index, faction]) => ({
      index, faction,
    }));

    this.circle.broadcast({
      type: 'circle_game_start',
      players,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
      seed: this.circle.sharedSeed,
    });

    this.launchGame();
  }

  private launchGame(): void {
    if (!this.myFaction || !this.circle) return;

    // Store player factions in circle manager
    for (const [idx, fac] of this.playerFactions) {
      this.circle.playerFactions.set(idx, fac);
    }

    this.registry.set('circle', this.circle);
    this.scene.start('DraftScene', {
      mode: 'circle_coop' as any,
      faction: this.myFaction,
      map: this.selectedMap,
      difficulty: this.selectedDifficulty,
    });
  }

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

  private clearDynamic(): void {
    for (const el of this.dynamicElements) el.destroy();
    this.dynamicElements = [];
  }
}
