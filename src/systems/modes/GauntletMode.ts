/**
 * GauntletMode — Faction Gauntlet campaign.
 *
 * 10 stages × 10 waves = 100 waves. Each stage uses a different faction's
 * creeps on their themed homeworld map. Frontier and send income persist
 * between stages. Towers are wiped. Lives reset to 10 per stage.
 *
 * Extends BaseFrontierMode for frontier/send panel integration.
 */
import { GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode, WaveDefinition } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { SendPanel } from '../../ui/SendPanel';
import { BaseFrontierMode } from './BaseFrontierMode';
import { FactionId, FACTIONS } from '../../data/Factions';
import { getGauntletMap, getGauntletFactions, shuffleArray } from '../../data/GauntletMaps';
import { generateGauntletWaves, getGlobalWaveNumber } from '../../data/GauntletWaves';
import { DifficultyLevel } from '../../data/Difficulty';

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;

const STARTING_GOLD = 150;
const LIVES_PER_STAGE = 10;

export class GauntletMode extends BaseFrontierMode {
  readonly id: MatchMode = 'gauntlet';

  private sendPanel!: SendPanel;
  private currentWave: number = 0;

  // Gauntlet state
  private playerFaction: FactionId;
  private difficulty: DifficultyLevel;
  private stageOrder: FactionId[] = [];
  private currentStageIndex: number = 0;
  private accumulatedIncome: number = 0; // send income that persists

  /** Callback to trigger stage transition in GameScene */
  onStageTransition: ((nextFaction: FactionId, stageIndex: number, callback: () => void) => void) | null = null;

  constructor(playerFaction: FactionId, difficulty: DifficultyLevel, presetOrder?: FactionId[]) {
    super();
    this.playerFaction = playerFaction;
    this.difficulty = difficulty;
    // Use preset order from preview scene, or generate random
    this.stageOrder = presetOrder ?? shuffleArray(getGauntletFactions(playerFaction));
  }

  createUI(ctx: GameModeContext): void {
    super.createUI(ctx);

    // Send panel (same as StandardMode)
    this.sendPanel = new SendPanel(ctx.scene, (opt: SendCreepOption, scaledCost: number, scaledIncome: number) => {
      if (!this.canStartWave()) return;
      if (this.currentWave < opt.unlockWave) return;
      if (!ctx.economy.spend(scaledCost)) return;

      // In gauntlet, sends always go to self (no versus)
      ctx.sendMgr.queueSend(opt);
      ctx.incomeMgr.addSendBonus(scaledIncome);
      this.accumulatedIncome += scaledIncome;
      ctx.eventLog.sendQueued(opt.name, scaledCost);
      ctx.statsTracker.recordSendSpent(scaledCost);
      ctx.statsTracker.recordSendIncome(scaledIncome);
      ctx.statsTracker.recordGoldSpent(scaledCost);
    }, ctx.sidebarTopY);

    ctx.eventBus.on('waveStarted', (waveNum: number) => {
      this.currentWave = waveNum;
      this.sendPanel.setWave(waveNum);
    });
  }

  /** Get the waves for the current stage */
  getStageWaves(): WaveDefinition[] {
    return generateGauntletWaves(this.currentStageIndex, this.difficulty);
  }

  /** Get the current stage's faction */
  getCurrentFaction(): FactionId {
    return this.stageOrder[this.currentStageIndex];
  }

  /** Get the current stage's map definition */
  getCurrentMap() {
    return getGauntletMap(this.getCurrentFaction());
  }

  /** Get the current stage number (1-based for display) */
  getStageNumber(): number {
    return this.currentStageIndex + 1;
  }

  /** Get total stages */
  getTotalStages(): number {
    return this.stageOrder.length;
  }

  /** Get display wave number (1-100) */
  getGlobalWave(waveInStage: number): number {
    return getGlobalWaveNumber(this.currentStageIndex, waveInStage);
  }

  /** Get starting gold for the current stage */
  getStageStartingGold(): number {
    return STARTING_GOLD + this.accumulatedIncome;
  }

  /** Get lives per stage */
  getLivesPerStage(): number {
    return LIVES_PER_STAGE;
  }

  /** Check if there's a next stage */
  hasNextStage(): boolean {
    return this.currentStageIndex < this.stageOrder.length - 1;
  }

  /** Advance to next stage. Returns the next faction, or null if gauntlet complete. */
  advanceStage(): FactionId | null {
    if (!this.hasNextStage()) return null;
    this.currentStageIndex++;
    this.currentWave = 0;
    return this.getCurrentFaction();
  }

  onWaveCleared(waveNum: number): void {
    super.onWaveCleared(waveNum);
    // Additional gauntlet-specific wave clear logic can go here
  }

  handleSend(sendId: string): boolean {
    const opt = SEND_OPTIONS_MAP[sendId];
    if (opt) {
      this.ctx.sendMgr.queueSend(opt);
      this.ctx.eventLog.gameMessage(`Incoming send: ${opt.name}!`);
      return true;
    }
    return false;
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.sendPanel.getContainer());
    super.reparentSidebarPanels(overlay);
  }

  destroy(): void {
    this.sendPanel.destroy();
    super.destroy();
  }
}
