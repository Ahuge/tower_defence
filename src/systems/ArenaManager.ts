import * as Phaser from 'phaser';
import { getGridOffsetX } from '../config';
import { Hero } from '../entities/Hero';
import { ArenaCreep } from '../entities/ArenaCreep';
import { HeroTypeDef } from '../data/HeroTypes';
import { WaveDefinition } from '../data/WaveDefinitions';
import { CREEP_TYPES } from '../data/CreepTypes';
import { getEliteForWave, ArenaEliteDef } from '../data/ArenaElites';
import { AccessoryDef, getRandomAccessories } from '../data/HeroAccessories';
import { EconomyManager } from './EconomyManager';
import { EventLog } from '../ui/EventLog';
import { FloatingDamage } from './FloatingDamage';
import { ArenaEffect, FX, drawEffect } from './ArenaEffects';
import { ArenaFloorRenderer } from './ArenaFloorRenderer';
import type { FactionId } from '../data/Factions';

export interface ArenaCreepData {
  hp: number;
  speed: number;
  isBoss: boolean;
  color: number;
  size: number;
  creepTypeId?: string;
}

export class ArenaManager {
  hero: Hero;
  arenaCreeps: ArenaCreep[] = [];
  baseHp: number;
  baseMaxHp: number;
  graphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private economy: EconomyManager;
  private eventLog: EventLog;

  // Arena pixel bounds (relative to canvas, not grid)
  readonly arenaX: number;  // left edge
  readonly arenaY: number;  // top edge (always 0)
  readonly arenaWidth: number;
  readonly arenaHeight: number;

  // Stats
  arenaKills: number = 0;

  /** Optional damage-shield hook — used by HD's mode to drain Celestial
   *  Sanctuary shield pools before reducing base HP. Returns the amount
   *  absorbed (0 if no shield). Wired from GameScene at setup. */
  onBeforeBaseDamage?: (damage: number) => number;

  // Visual effects
  private effects: ArenaEffect[] = [];

  // Floating damage numbers
  floatingDamage: FloatingDamage;

  // Mouse tracking for targeting mode
  mouseX: number = 0;
  mouseY: number = 0;

  // Graveyard for necromancer resurrections
  private graveyard: ArenaCreepData[] = [];

  // Accessory shop rotation
  currentAccessoryOffers: AccessoryDef[] = [];
  nextRotationWave: number = 1; // rotates at wave 1, 6, 11, 16...

  // Respawn text
  private respawnText: Phaser.GameObjects.Text | null = null;

  // Per-faction floor tileset (PRD 01). Optional — falls back to the
  // procedural background painted by drawArena() when null.
  private floorRenderer: ArenaFloorRenderer | null = null;

  constructor(
    scene: Phaser.Scene,
    heroType: HeroTypeDef,
    arenaWidth: number,
    arenaHeight: number,
    economy: EconomyManager,
    eventLog: EventLog,
    baseHp: number = 100,
    creepFaction: FactionId | null = null,
  ) {
    this.scene = scene;
    this.economy = economy;
    this.eventLog = eventLog;
    this.arenaX = getGridOffsetX();
    this.arenaY = 0;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.baseHp = baseHp;
    this.baseMaxHp = baseHp;

    this.graphics = scene.add.graphics().setDepth(10);
    this.floatingDamage = new FloatingDamage(scene);

    // Paint the per-faction floor tileset (PRD 01) once into a render
    // texture sitting at depth -100. Self-skips when the faction's
    // tileset isn't loaded (chaos / random / missing assets), in
    // which case drawArena()'s procedural fill takes over.
    this.floorRenderer = new ArenaFloorRenderer(
      scene, creepFaction ?? null, this.arenaX, this.arenaY, arenaWidth, arenaHeight,
    );

    // Spawn hero at center of arena (pixel coords relative to arena)
    const offsetX = getGridOffsetX();
    this.hero = new Hero(
      scene,
      arenaWidth / 2 + offsetX,
      arenaHeight / 2,
      heroType,
      arenaWidth + offsetX,
      arenaHeight,
    );

    // Initialize accessory rotation
    this.currentAccessoryOffers = getRandomAccessories(3);

    // Track mouse for targeting mode
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseX = pointer.x;
      this.mouseY = pointer.y;
    });

    // Draw initial arena
    this.drawArena();
  }

  update(delta: number): void {
    // Update hero
    this.hero.update(delta, this.arenaCreeps);

    // Update arena creeps — pass hero position for aggro
    const heroX = this.hero.x;
    const heroY = this.hero.y;
    const heroAlive = this.hero.alive;
    for (const creep of this.arenaCreeps) {
      creep.update(delta, heroX, heroY, heroAlive);
    }

    const now = this.scene.time.now;

    // Creep → hero attacks
    if (heroAlive) {
      for (const creep of this.arenaCreeps) {
        if (creep.canAttackHero(heroX, heroY, now)) {
          this.hero.takeDamage(creep.attackDamage);
          creep.recordAttack(now);
        }
      }
    }

    // Creep → base attacks (creeps parked at base)
    for (const creep of this.arenaCreeps) {
      if (creep.canAttackBase(now)) {
        let dmg = creep.isBoss ? 15 : creep.baseDamage;
        if (this.onBeforeBaseDamage) {
          const absorbed = this.onBeforeBaseDamage(dmg);
          if (absorbed > 0) {
            dmg -= absorbed;
            if (absorbed >= 1) {
              this.eventLog.gameMessage(`Sanctuary absorbed ${Math.round(absorbed)}`);
            }
          }
        }
        if (dmg > 0) this.baseHp -= dmg;
        creep.recordAttack(now);
      }
    }

    // Process elite mechanics
    for (const creep of this.arenaCreeps) {
      if (!creep.alive || !creep.pendingEliteAction) continue;
      this.processEliteMechanic(creep);
      creep.pendingEliteAction = null;
    }

    // Check for arena kills
    for (const creep of this.arenaCreeps) {
      if (!creep.alive && creep.hp <= 0) {
        this.arenaKills++;
        // Add to graveyard for necromancer
        this.graveyard.push({
          hp: Math.round(creep.maxHp * 0.5),
          speed: creep.speed,
          isBoss: false,
          color: creep.color,
          size: creep.size,
        });
        if (this.graveyard.length > 10) this.graveyard.shift();
        // Arena kill gold: 0.33x of base kill gold
        let gold = Math.round(this.economy.getKillGold() * 0.33);
        // Soul Harvester bonus (sum across accessories)
        gold += this.hero.accSum('goldPerKill');
        if (gold > 0) {
          this.economy.addGold(gold);
        }
        // Grant XP (low values — leveling is a slow grind)
        const xp = creep.isBoss ? 5 : (creep.eliteType ? 10 : 1);
        this.hero.grantXP(xp);
        creep.hp = -999; // sentinel
      }
    }

    // Clean up dead creeps
    this.arenaCreeps = this.arenaCreeps.filter(c => c.alive);

    // Process pending meteors
    if (this.hero.pendingMeteor) {
      const m = this.hero.pendingMeteor;
      // Random position in arena
      const mx = this.arenaX + 60 + Math.random() * (this.arenaWidth - 120);
      const my = 30 + Math.random() * (this.arenaHeight - 60);
      // Impact VFX
      this.effects.push(FX.meteorImpact(mx, my, m.radius));
      this.effects.push(FX.shockwave(mx, my, m.radius * 1.3, 0xff4400));
      for (const creep of this.arenaCreeps) {
        if (!creep.alive) continue;
        const dx = creep.x - mx;
        const dy = creep.y - my;
        if (Math.sqrt(dx * dx + dy * dy) <= m.radius) {
          creep.takeDamage(m.damage);
          this.hero.totalDamageDealt += m.damage;
          this.hero.pendingDamageNumbers.push({ x: creep.x, y: creep.y - 10, text: String(m.damage), color: '#cc66ff', duration: 1.0 });
          if (!creep.alive) this.hero.kills++;
        }
      }
      this.hero.pendingMeteor = null;
    }

    // Process splash attacks
    for (const splash of this.hero.pendingSplash) {
      this.effects.push(FX.aoeBlast(splash.x, splash.y, splash.radius, 0xff8844));
      for (const creep of this.arenaCreeps) {
        if (!creep.alive) continue;
        const dx = creep.x - splash.x;
        const dy = creep.y - splash.y;
        if (Math.sqrt(dx * dx + dy * dy) <= splash.radius) {
          creep.takeDamage(splash.damage);
          this.hero.totalDamageDealt += splash.damage;
          this.hero.pendingDamageNumbers.push({ x: creep.x, y: creep.y - 10, text: String(splash.damage), color: '#ff8844', duration: 0.6 });
          if (!creep.alive) this.hero.kills++;
        }
      }
    }
    this.hero.pendingSplash.length = 0;

    // Process chain lightning
    if (this.hero.pendingChainLightning) {
      const cl = this.hero.pendingChainLightning;
      for (const creep of this.arenaCreeps) {
        if (!creep.alive) continue;
        const dx = creep.x - cl.x;
        const dy = creep.y - cl.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 80) {
          creep.takeDamage(cl.damage);
          this.hero.totalDamageDealt += cl.damage;
          this.hero.pendingDamageNumbers.push({ x: creep.x, y: creep.y - 10, text: String(cl.damage), color: '#44aaff', duration: 0.6 });
          this.effects.push(FX.lightning(cl.x, cl.y, creep.x, creep.y));
          if (!creep.alive) this.hero.kills++;
        }
      }
      this.hero.pendingChainLightning = null;
    }

    // Process reflect damage — apply to all creeps currently in attack range of hero
    if (this.hero.pendingReflectDamage > 0 && heroAlive) {
      for (const creep of this.arenaCreeps) {
        if (!creep.alive) continue;
        const dx = creep.x - heroX;
        const dy = creep.y - heroY;
        if (Math.sqrt(dx * dx + dy * dy) <= creep.attackRange + 5) {
          creep.takeDamage(this.hero.pendingReflectDamage);
          if (!creep.alive) this.hero.kills++;
        }
      }
      this.hero.pendingReflectDamage = 0;
    }

    // Clamp base HP
    if (this.baseHp < 0) this.baseHp = 0;

    // Drain hero's pending damage numbers and effects
    const dt = delta / 1000;
    for (const entry of this.hero.pendingDamageNumbers) {
      this.floatingDamage.spawn(entry.x, entry.y, entry.text, entry.color, entry.duration);
    }
    this.hero.pendingDamageNumbers.length = 0;
    for (const fx of this.hero.pendingEffects) {
      this.effects.push(fx);
    }
    this.hero.pendingEffects.length = 0;

    // Tick effects
    for (const fx of this.effects) fx.elapsed += dt;
    this.effects = this.effects.filter(fx => fx.elapsed < fx.duration);

    this.floatingDamage.update(dt);

    // Update respawn text
    this.updateRespawnText();

    // Redraw arena visuals
    this.drawArena();
  }

  private updateRespawnText(): void {
    if (!this.hero.alive && this.hero.respawnTimer > 0) {
      const text = `RESPAWN: ${Math.ceil(this.hero.respawnTimer)}s`;
      if (!this.respawnText) {
        this.respawnText = this.scene.add.text(
          this.arenaX + this.arenaWidth / 2,
          this.arenaHeight / 2,
          text,
          { fontSize: '20px', color: '#ff4444', fontFamily: 'monospace' }
        ).setOrigin(0.5).setDepth(20);
      } else {
        this.respawnText.setText(text);
        this.respawnText.setVisible(true);
      }
    } else if (this.respawnText) {
      this.respawnText.setVisible(false);
    }
  }

  spawnArenaCreep(data: ArenaCreepData, waveSpawned: boolean = false): void {
    // Spawn at left edge of arena, random Y
    const x = this.arenaX + 20;
    const y = 30 + Math.random() * (this.arenaHeight - 60);
    const speed = data.speed * 0.5; // Slower in arena so hero can fight them
    const baseDamage = data.isBoss ? 15 : 3;

    const creepFaction = (this.scene as any).creepFaction;
    const creep = new ArenaCreep(
      this.scene,
      x, y,
      data.hp,
      speed,
      baseDamage,
      data.isBoss,
      data.color,
      data.size,
      this.arenaX + this.arenaWidth,
      data.creepTypeId,
      creepFaction,
    );
    creep.isWaveSpawned = waveSpawned;
    this.arenaCreeps.push(creep);
  }

  /** Spawn arena creeps matching the TD wave's composition */
  spawnWaveCreeps(wave: WaveDefinition, waveNum: number): void {
    const baseCount = Math.min(6, 3 + Math.floor(waveNum / 10));
    // Boss waves spawn half as many arena creeps
    const totalCount = wave.isBoss ? Math.max(1, Math.floor(baseCount / 2)) : baseCount;
    // Distribute proportionally among wave's creep type groups
    const totalGroupCount = wave.groups.reduce((s, g) => s + g.count, 0);
    let spawned = 0;

    for (const group of wave.groups) {
      const share = Math.max(1, Math.round((group.count / totalGroupCount) * totalCount));
      const ct = CREEP_TYPES[group.creepType];
      if (!ct) continue;

      for (let i = 0; i < share && spawned < totalCount; i++) {
        const delay = spawned * 800;
        const hp = Math.round(group.hpScale * ct.hpMultiplier * 0.6); // 60% of TD HP
        const speed = group.speedScale * ct.speedMultiplier * 30; // scaled to arena
        const color = ct.color;
        const size = ct.size;
        const isBoss = group.creepType === 'boss';

        const creepTypeId = group.creepType;
        this.scene.time.delayedCall(delay, () => {
          this.spawnArenaCreep({ hp, speed, isBoss, color, size, creepTypeId }, true);
        });
        spawned++;
      }
    }

    // Check for elite spawn
    const eliteDef = getEliteForWave(waveNum);
    if (eliteDef) {
      const baseHp = wave.groups[0]?.hpScale ?? 100;
      this.scene.time.delayedCall(500, () => {
        this.spawnElite(eliteDef, baseHp);
      });
    }
  }

  handleClick(px: number, py: number): void {
    if (!this.hero.alive) return;

    // If in targeting mode, cast ability at click position
    if (this.hero.pendingAbilityIndex !== null) {
      const idx = this.hero.pendingAbilityIndex;
      this.hero.pendingAbilityIndex = null;
      this.hero.useAbility(idx, this.arenaCreeps, px, py);
      return;
    }

    // Check if clicked on an arena creep (to focus target)
    for (const creep of this.arenaCreeps) {
      if (!creep.alive) continue;
      const dx = creep.x - px;
      const dy = creep.y - py;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        this.hero.target = creep;
        return;
      }
    }
    // Otherwise move hero
    this.hero.moveTo(px, py);
  }

  /** Use active accessory (T key) */
  handleAccessoryKey(): void {
    this.hero.useAccessory(this.arenaCreeps);
  }

  /** Buy an accessory by index in current offers */
  buyAccessory(index: number): boolean {
    const acc = this.currentAccessoryOffers[index];
    if (!acc) return false;
    if (this.hero.accessories.length >= Hero.MAX_ACCESSORIES) {
      this.eventLog.gameMessage('Accessory slots full! (3/3)');
      return false;
    }
    // Don't allow duplicate accessories
    if (this.hero.accessories.some(a => a.id === acc.id)) {
      this.eventLog.gameMessage('Already equipped!');
      return false;
    }
    if (!this.economy.spend(acc.cost)) return false;
    this.hero.equipAccessory(acc);
    this.eventLog.gameMessage(`Equipped ${acc.name}! (${this.hero.accessories.length}/3)`);
    return true;
  }

  /** Rotate accessory shop offers */
  rotateAccessories(waveNum: number): void {
    if (waveNum >= this.nextRotationWave) {
      this.currentAccessoryOffers = getRandomAccessories(3, waveNum * 7919);
      this.nextRotationWave = waveNum + 5;
    }
  }

  /** Spawn an elite arena enemy */
  private spawnElite(eliteDef: ArenaEliteDef, baseHp: number): void {
    const hp = Math.round(baseHp * eliteDef.hpMultiplier);
    const speed = eliteDef.mechanic === 'base_charger'
      ? 60 * (eliteDef.chargeSpeedMult ?? 2) : 30;
    const baseDmg = eliteDef.mechanic === 'base_charger'
      ? (eliteDef.chargeBaseDamage ?? 25) : 10;

    const creep = new ArenaCreep(
      this.scene,
      this.arenaX + 20,
      30 + Math.random() * (this.arenaHeight - 60),
      hp, speed, baseDmg, false,
      eliteDef.color, eliteDef.size,
      this.arenaX + this.arenaWidth,
      undefined, (this.scene as any).creepFaction,
    );
    creep.eliteType = eliteDef.mechanic;

    // Set initial mechanic timer
    if (eliteDef.mechanic === 'shield_guardian') {
      creep.eliteTimer = eliteDef.shieldInterval ?? 8;
    } else if (eliteDef.mechanic === 'necromancer') {
      creep.eliteTimer = eliteDef.resurrectInterval ?? 5;
    }
    // Base charger: ignores hero (no aggro override needed — low aggro range)

    this.arenaCreeps.push(creep);
    this.eventLog.gameMessage(`ELITE: ${eliteDef.name} has entered the arena!`);
  }

  /** Process an elite creep's mechanic activation */
  private processEliteMechanic(creep: ArenaCreep): void {
    switch (creep.eliteType) {
      case 'shield_guardian': {
        // Shield all nearby creeps (damage cap 1) for 3s
        for (const c of this.arenaCreeps) {
          if (!c.alive || c === creep) continue;
          const dx = c.x - creep.x;
          const dy = c.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= 150) {
            c.shielded = 3;
          }
        }
        creep.eliteTimer = 8; // reset timer
        break;
      }
      case 'necromancer': {
        // Resurrect a dead creep from graveyard
        if (this.graveyard.length > 0) {
          const data = this.graveyard.pop()!;
          this.spawnArenaCreep(data);
        }
        creep.eliteTimer = 5; // reset timer
        break;
      }
      // base_charger has no active mechanic — just charges toward base
    }
  }

  /** Check if an ability needs ground targeting */
  private needsTargeting(type: string): boolean {
    return type === 'teleport';
  }

  handleAbilityKey(index: number): void {
    if (!this.hero.alive) return;

    // Cancel targeting if pressing same key or ESC
    if (this.hero.pendingAbilityIndex !== null) {
      if (this.hero.pendingAbilityIndex === index || index === -1) {
        this.hero.pendingAbilityIndex = null;
        return;
      }
    }

    if (index === 3) {
      // Ultimate (R) — always instant cast
      this.useUltimate();
      return;
    }

    const ab = this.hero.abilities[index];
    if (!ab || ab.cooldownRemaining > 0) return;

    if (this.needsTargeting(ab.def.type)) {
      this.hero.pendingAbilityIndex = index;
    } else {
      this.hero.useAbility(index, this.arenaCreeps);
    }
  }

  cancelTargeting(): void {
    this.hero.pendingAbilityIndex = null;
  }

  private useUltimate(): void {
    const ult = this.hero.ultimate;
    if (!ult || ult.cooldownRemaining > 0 || !this.hero.alive) return;
    if (this.hero.level < Hero.ULTIMATE_UNLOCK_LEVEL) return; // locked until level 6
    ult.cooldownRemaining = ult.def.cooldown;
    this.hero.abilitiesUsed++;
    this.hero.useAbility(-1, this.arenaCreeps, undefined, undefined, ult.def);
  }

  drawArena(): void {
    this.graphics.clear();

    // Arena background — only paint the flat fallback when the
    // floor renderer didn't take over. The renderer paints a faction
    // tileset into a RenderTexture at depth -100, which already sits
    // behind everything; this draws at depth 10 so the procedural
    // version would sit ON TOP of the tileset and hide it.
    if (!this.floorRenderer) {
      this.graphics.fillStyle(0x1a1520, 1);
      this.graphics.fillRect(this.arenaX, this.arenaY, this.arenaWidth, this.arenaHeight);

      // Grid-like subtle pattern (procedural fallback only)
      this.graphics.lineStyle(1, 0x222222, 0.3);
      for (let x = this.arenaX; x <= this.arenaX + this.arenaWidth; x += 40) {
        this.graphics.lineBetween(x, 0, x, this.arenaHeight);
      }
      for (let y = 0; y <= this.arenaHeight; y += 40) {
        this.graphics.lineBetween(this.arenaX, y, this.arenaX + this.arenaWidth, y);
      }
    }

    // Base structure on right edge
    const baseX = this.arenaX + this.arenaWidth - 30;
    const baseY = this.arenaHeight / 2;
    this.graphics.fillStyle(0x4444aa, 0.8);
    this.graphics.fillRect(baseX - 15, baseY - 40, 30, 80);
    this.graphics.lineStyle(2, 0x6666dd, 1);
    this.graphics.strokeRect(baseX - 15, baseY - 40, 30, 80);

    // Base HP bar
    const barW = 20;
    const barH = 70;
    const barX = baseX - barW / 2;
    const barY = baseY - barH / 2;
    const hpRatio = this.baseHp / this.baseMaxHp;
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillRect(barX, barY, barW, barH);
    const hpColor = hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa44 : 0xff4444;
    this.graphics.fillStyle(hpColor, 1);
    const filledH = barH * hpRatio;
    this.graphics.fillRect(barX, barY + barH - filledH, barW, filledH);

    // Base HP text
    this.graphics.fillStyle(0xffffff, 1);

    // Divider line between arena and grid
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.lineBetween(this.arenaX, this.arenaHeight, this.arenaX + this.arenaWidth, this.arenaHeight);

    // Spawn zone indicator (left edge)
    this.graphics.fillStyle(0xff4444, 0.15);
    this.graphics.fillRect(this.arenaX, 0, 40, this.arenaHeight);

    // Targeting mode preview circles
    if (this.hero.pendingAbilityIndex !== null && this.hero.alive) {
      const idx = this.hero.pendingAbilityIndex;
      const ab = idx >= 0 ? this.hero.abilities[idx] : null;
      if (ab) {
        const def = ab.def;
        // Range ring around hero
        if (def.range) {
          this.graphics.lineStyle(1, 0x44aaff, 0.3);
          this.graphics.strokeCircle(this.hero.x, this.hero.y, def.range);
        }
        // AoE/teleport indicator at cursor
        if (def.type === 'teleport') {
          this.graphics.lineStyle(2, 0x44aaff, 0.6);
          this.graphics.strokeCircle(this.mouseX, this.mouseY, 12);
          // Cross at cursor
          this.graphics.lineBetween(this.mouseX - 6, this.mouseY, this.mouseX + 6, this.mouseY);
          this.graphics.lineBetween(this.mouseX, this.mouseY - 6, this.mouseX, this.mouseY + 6);
        }
        if (def.splashRadius) {
          this.graphics.lineStyle(1, 0xff6644, 0.4);
          this.graphics.strokeCircle(this.mouseX, this.mouseY, def.splashRadius);
        }
      }
    }

    // Death mark indicator
    if (this.hero.deathMark) {
      for (const c of this.arenaCreeps) {
        if (c.alive && this.hero.deathMark.targets.has(c)) {
          this.graphics.lineStyle(1, 0xff4488, 0.6);
          this.graphics.strokeCircle(c.x, c.y, 12);
        }
      }
    }

    // Invulnerability indicator
    if (this.hero.invulnerable > 0 && this.hero.alive) {
      this.graphics.lineStyle(2, 0xffdd44, 0.7);
      this.graphics.strokeCircle(this.hero.x, this.hero.y, 22);
    }

    // Draw active visual effects
    for (const fx of this.effects) {
      drawEffect(this.graphics, fx);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.hero.destroy();
    for (const c of this.arenaCreeps) c.destroy();
    if (this.respawnText) this.respawnText.destroy();
    this.floatingDamage.destroy();
    this.floorRenderer?.destroy();
    this.floorRenderer = null;
  }
}
