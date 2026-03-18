import { GameMode, GameModeContext } from '../GameMode';
import { MatchMode } from '../../data/WaveDefinitions';
import { EssenceGenerator, EssenceSendOption, ESSENCE_SENDS } from '../../data/EssenceGenerators';
import { EssencePanel } from '../../ui/EssencePanel';

const ESSENCE_SEND_MAP: Record<string, EssenceSendOption> = {};
for (const s of ESSENCE_SENDS) ESSENCE_SEND_MAP[s.id] = s;

/**
 * Battle (Dual Economy) mode: Gold + Essence.
 * - Gold buys towers and generators
 * - Generators produce Essence in real-time
 * - Essence buys sends which give Gold income per wave
 * - Compound loop: Gold → Generators → Essence → Sends → Gold income
 */
export class BattleMode implements GameMode {
  readonly id: MatchMode = 'battle';
  private ctx!: GameModeContext;
  essencePanel!: EssencePanel;

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

    // Register essence resource
    ctx.economy.resources.addResource({
      id: 'essence',
      name: 'Essence',
      startingAmount: 0,
      tickRate: 0, // starts at 0, generators increase this
      color: '#44ddff',
    });

    // Create essence panel (replaces send + frontier panels)
    this.essencePanel = new EssencePanel(ctx.scene, ctx.economy.resources,
      (gen: EssenceGenerator) => this.buyGenerator(gen),
      (send: EssenceSendOption) => this.buyEssenceSend(send),
    );

    ctx.eventLog.gameMessage('BATTLE MODE: Buy generators → earn essence → spend on sends!');
  }

  update(delta: number): void {
    // Tick essence in real-time
    this.ctx.economy.resources.tick(delta);
    this.essencePanel.update();
  }

  onWaveCleared(_waveNum: number): void {
    // Wave income (base + send bonuses — no frontier in battle mode)
    const income = this.ctx.incomeMgr.collectWaveIncome();
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);
  }

  canStartWave(): boolean {
    return true;
  }

  handleSend(sendId: string): boolean {
    // Handle incoming sends from versus opponent
    const send = ESSENCE_SEND_MAP[sendId];
    if (send) {
      this.ctx.sendMgr.queueSend({
        id: send.id, name: send.name, creepType: send.creepType,
        count: send.count, cost: 0, incomeReward: send.incomeReward,
        description: send.description,
      });
      this.ctx.eventLog.gameMessage(`Incoming send: ${send.name}!`);
      return true;
    }
    return false;
  }

  private buyGenerator(gen: EssenceGenerator): void {
    if (!this.ctx.economy.spend(gen.cost)) return;

    const state = this.ctx.economy.resources.getState('essence');
    if (state) state.tickRate += gen.essencePerSec;

    // Track owned
    const existing = this.essencePanel.generators.find(g => g.def.id === gen.id);
    if (existing) existing.count++;
    else this.essencePanel.generators.push({ def: gen, count: 1 });
    this.essencePanel.updateOwned();

    this.ctx.eventLog.gameMessage(`Built ${gen.name} (+${gen.essencePerSec}/s essence)`);
    this.ctx.statsTracker.recordGoldSpent(gen.cost);
  }

  private buyEssenceSend(send: EssenceSendOption): void {
    if (!this.ctx.economy.resources.canAfford('essence', send.essenceCost)) return;

    this.ctx.economy.resources.spend('essence', send.essenceCost);

    if (this.ctx.versus && this.ctx.versus.isConnected()) {
      this.ctx.versus.send({ type: 'send_purchased', sendOptionId: send.id });
      this.ctx.versus.sendsSent++;
      this.ctx.eventLog.gameMessage(`Sent ${send.name} to opponent! (${send.essenceCost}e)`);
    } else {
      this.ctx.sendMgr.queueSend({
        id: send.id, name: send.name, creepType: send.creepType,
        count: send.count, cost: 0, incomeReward: send.incomeReward,
        description: send.description,
      });
    }

    this.ctx.incomeMgr.addSendBonus(send.incomeReward);
    this.ctx.eventLog.gameMessage(`${send.name} (${send.essenceCost}e) → +${send.incomeReward}g/w`);
    this.ctx.statsTracker.recordSendIncome(send.incomeReward);
  }
}
