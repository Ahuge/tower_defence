import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { TowerSelectBar } from '../ui/TowerSelectBar';

/**
 * Multiplayer lobby — host or join via manual SDP exchange.
 * No server required. Players copy-paste connection codes.
 */
export class LobbyScene extends Phaser.Scene {
  private versus: VersusManager | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private codeDisplay!: Phaser.GameObjects.Text;
  private phase: 'menu' | 'host_offer' | 'host_answer' | 'join_offer' | 'join_answer' | 'connected' = 'menu';

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    this.add.text(cx, 30, 'MULTIPLAYER LOBBY', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 65, 'Peer-to-peer — no server needed', {
      fontSize: '11px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, 100, '', {
      fontSize: '12px', color: '#ffaa44', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    this.codeDisplay = this.add.text(cx, 200, '', {
      fontSize: '9px', color: '#88aacc', fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: CANVAS_WIDTH - 100 },
    }).setOrigin(0.5, 0);

    // Host button
    const hostBtn = this.add.text(cx - 120, 130, '[ HOST GAME ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hostBtn.on('pointerdown', () => this.startHost());
    hostBtn.on('pointerover', () => hostBtn.setColor('#88ff88'));
    hostBtn.on('pointerout', () => hostBtn.setColor('#44ff44'));

    // Join button
    const joinBtn = this.add.text(cx + 120, 130, '[ JOIN GAME ]', {
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
      this.versus?.close();
      this.scene.start('MenuScene');
    });

    // Paste input — we use the browser prompt since Phaser has no text input
    this.add.text(cx, totalH - 60, 'Codes are copied to/pasted from clipboard', {
      fontSize: '9px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private async startHost(): Promise<void> {
    this.phase = 'host_offer';
    this.statusText.setText('Creating offer...');

    this.versus = new VersusManager(
      (msg) => { /* handled in game scene */ },
      (state) => {
        if (state === 'connected') {
          this.statusText.setText('CONNECTED! Starting game...');
          this.phase = 'connected';
          setTimeout(() => this.startVersusGame(), 1000);
        }
      },
    );

    try {
      const offer = await this.versus.host();
      await navigator.clipboard.writeText(offer);
      this.statusText.setText('Step 1: Offer copied to clipboard! Send it to your opponent.\nStep 2: Click below when they give you their answer code.');
      this.codeDisplay.setText(`Your offer (${offer.length} chars) — already on clipboard`);

      // Paste answer button
      const pasteBtn = this.add.text(CANVAS_WIDTH / 2, 170, '[ PASTE ANSWER CODE ]', {
        fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      pasteBtn.on('pointerdown', async () => {
        try {
          const answer = await navigator.clipboard.readText();
          if (!answer || answer.length < 50) {
            this.statusText.setText('Invalid code on clipboard. Copy the answer code first.');
            return;
          }
          this.statusText.setText('Connecting...');
          await this.versus!.acceptAnswer(answer);
        } catch (e) {
          this.statusText.setText('Failed to read clipboard. Paste manually in console.');
        }
      });
    } catch (e) {
      this.statusText.setText('Failed to create offer: ' + (e as Error).message);
    }
  }

  private async startJoin(): Promise<void> {
    this.phase = 'join_offer';
    this.statusText.setText('Paste the host\'s offer code (click below).');

    // Paste offer button
    const pasteBtn = this.add.text(CANVAS_WIDTH / 2, 170, '[ PASTE OFFER CODE ]', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pasteBtn.on('pointerdown', async () => {
      try {
        const offer = await navigator.clipboard.readText();
        if (!offer || offer.length < 50) {
          this.statusText.setText('Invalid code on clipboard. Copy the offer code first.');
          return;
        }

        this.versus = new VersusManager(
          (msg) => { /* handled in game scene */ },
          (state) => {
            if (state === 'connected') {
              this.statusText.setText('CONNECTED! Starting game...');
              this.phase = 'connected';
              setTimeout(() => this.startVersusGame(), 1000);
            }
          },
        );

        this.statusText.setText('Creating answer...');
        const answer = await this.versus.join(offer);
        await navigator.clipboard.writeText(answer);
        this.statusText.setText('Answer copied to clipboard! Send it back to the host.\nWaiting for connection...');
        this.codeDisplay.setText(`Your answer (${answer.length} chars) — already on clipboard`);
      } catch (e) {
        this.statusText.setText('Failed: ' + (e as Error).message);
      }
    });
  }

  private startVersusGame(): void {
    // Pass the VersusManager to the game scene via the registry
    this.registry.set('versus', this.versus);
    this.scene.start('MenuScene'); // TODO: go to versus game scene with settings
  }
}
