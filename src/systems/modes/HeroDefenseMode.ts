import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode, WaveDefinition } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { ArenaManager } from '../ArenaManager';
import { ItemShopPanel } from '../../ui/ItemShopPanel';
import { HeroEconomyController } from '../hero/HeroEconomyController';
import { Tower } from '../../entities/Tower';

/** Minimum scene shape this mode needs — used by Sanctuary-shield helpers
 *  that reach into the scene's tower manager. Not a Phaser type because
 *  GameModeContext.scene is typed as Phaser.Scene; we only need the
 *  GameScene-specific `towerMgr`. */
type SceneWithTowers = { towerMgr?: { towers: Tower[] } };

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;

/**
 * Hero Defense mode: leaked creeps enter an arena where the hero fights them.
 * Base HP replaces lives. Item shop replaces frontier panel.
 *
 * Hero economy (level / items / tomes / accessories / abilities) is
 * delegated to `HeroEconomyController` so M10's FinaleController and
 * any future hero-mode (e.g. arcane outpost siege, mech battle pit)
 * can plug into the same DOM panel without duplicating purchase logic.
 */
export class HeroDefenseMode implements GameMode {
  readonly id: MatchMode = 'hero_defense';
  private ctx!: GameModeContext;
  private arenaManager: ArenaManager;
  private itemShop!: ItemShopPanel;
  private econController!: HeroEconomyController;

  constructor(arenaManager: ArenaManager) {
    this.arenaManager = arenaManager;
  }

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

    // Install the Sanctuary shield hook on the arena so base damage is
    // routed through leak_absorb pools before the baseHp drops.
    this.arenaManager.onBeforeBaseDamage = (dmg: number) => consumeSanctuaryShields(ctx.scene as SceneWithTowers, dmg);

    // Hero economy — owns purchase callbacks + accessory rotation.
    this.econController = new HeroEconomyController(
      this.arenaManager.hero,
      ctx.economy,
      ctx.eventLog,
    );
    this.econController.registerCallbacks();

    // Item shop panel (replaces frontier). Reads accessory state from
    // the controller via the shared instance.
    this.itemShop = new ItemShopPanel(
      ctx.scene,
      this.arenaManager.hero,
      ctx.economy,
      ctx.eventLog,
      ctx.sidebarTopY,
      this.econController,
    );

    ctx.eventLog.gameMessage('HERO DEFENSE: Leaked creeps enter the arena!');
    ctx.eventLog.gameMessage('Click arena to move hero. Q/W/E for abilities.');
    ctx.eventLog.gameMessage('Buy items in the sidebar (Weapon/Armor/Boots).');

    this.econController.syncToDOM();
  }

  update(delta: number): void {
    this.arenaManager.update(delta);
    this.itemShop.update();
    // Sync hero shop periodically (items can change on level up)
    this.econController.syncToDOM();
    // Lazy-init Celestial Sanctuary shield pools against HD base HP.
    // Cheap: skip after first init per trait.
    this.initSanctuaryShieldsIfNeeded();
  }

  private initSanctuaryShieldsIfNeeded(): void {
    const scene = this.ctx.scene as SceneWithTowers;
    const towers = scene.towerMgr?.towers ?? [];
    const pool = Math.max(1, Math.floor(this.arenaManager.baseMaxHp * 0.05));
    for (const tower of towers) {
      for (const trait of tower.traits ?? []) {
        if (trait.id !== 'leak_absorb') continue;
        if (trait._shieldHpMax !== undefined) continue;
        const maxCharges = trait.maxCharges ?? 1;
        trait._shieldHpMax = pool * maxCharges;
        trait._shieldHp = trait._shieldHpMax;
      }
    }
  }

  onWaveStart(wave: WaveDefinition, waveNum: number): void {
    this.arenaManager.spawnWaveCreeps(wave, waveNum);
  }

  onWaveCleared(waveNum: number): void {
    // Wave income (halved — 10x creeps already provide plenty of kill gold)
    const breakdown = this.ctx.incomeMgr.getBreakdown();
    const income = Math.round(this.ctx.incomeMgr.collectWaveIncome() * 0.5);
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);
    // Sends in HD also pay at 0.5×; record that against ROI.
    if (breakdown.sends > 0) {
      this.ctx.statsTracker.recordSendsEarned(Math.round(breakdown.sends * 0.5));
    }

    // Heal hero 20%, apply interest, rotate accessories — delegated to
    // HeroEconomyController. Interest rate set by Interest Tomes
    // purchased via the controller; defaults to 2% baseline.
    const interestRate = this.arenaManager.hero.interestRate || 0.02;
    let interestPaid = 0;
    this.econController.onWaveCleared(waveNum, {
      healPercent: 0.2,
      interestRate,
      onInterestPaid: (amt) => { interestPaid = amt; this.ctx.statsTracker.recordGoldEarned(amt); },
    });

    // Combined wave clear message
    const parts = [`+${income}g income`];
    if (interestPaid > 0) parts.push(`+${interestPaid}g interest (${Math.round(interestRate * 100)}%)`);
    parts.push('Hero healed 20%');
    this.ctx.eventLog.gameMessage(`Wave cleared! ${parts.join(', ')}`);
  }

  canStartWave(): boolean {
    return true;
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.itemShop.getContainer());
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

  /** Celestial life_on_kill proc → heal base HP by 5% of max per proc
   *  (capped at max). Base HP is HD's defensive pool, so it maps to the
   *  same "gain 5% of the pool" ratio that +1 life represents in Standard. */
  onLifeGain(count: number, towerLabel?: string): boolean {
    if (count <= 0) return true;
    const healPerProc = Math.max(1, Math.round(this.arenaManager.baseMaxHp * 0.05));
    const totalHeal = healPerProc * count;
    const before = this.arenaManager.baseHp;
    this.arenaManager.baseHp = Math.min(this.arenaManager.baseMaxHp, before + totalHeal);
    const actual = this.arenaManager.baseHp - before;
    if (actual > 0) {
      const who = towerLabel ? ` from ${towerLabel}` : '';
      this.ctx.eventLog.gameMessage(`+${actual} base HP${who}!`);
    }
    return true;
  }

  /** Celestial Sanctuary base shield — drains the per-tower shield pools
   *  before the base takes damage. Called by ArenaManager when a creep
   *  hits the base. Returns how much of `damage` was absorbed. */
  absorbDamage(damage: number): number {
    return consumeSanctuaryShields(this.ctx.scene as SceneWithTowers, damage);
  }

  destroy(): void {
    this.itemShop.destroy();
    this.econController.destroy();
  }
}

/** Helper shared with Standard's leak-absorb consumer: drains the
 *  `leak_absorb` trait shields on every Celestial Sanctuary tower in the
 *  scene, in the order they were placed, up to `damage`. Returns the
 *  amount actually absorbed. */
function consumeSanctuaryShields(scene: SceneWithTowers, damage: number): number {
  const towers = scene.towerMgr?.towers ?? [];
  let remaining = damage;
  for (const tower of towers) {
    if (remaining <= 0) break;
    for (const trait of tower.traits ?? []) {
      if (trait.id !== 'leak_absorb') continue;
      const pool = trait._shieldHp ?? 0;
      if (pool <= 0) continue;
      const absorbed = Math.min(pool, remaining);
      trait._shieldHp = pool - absorbed;
      remaining -= absorbed;
      if (remaining <= 0) break;
    }
  }
  return damage - remaining;
}
