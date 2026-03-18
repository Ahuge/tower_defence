import { GRID_OFFSET_X } from '../config';
import { Hero } from '../entities/Hero';
import { ArenaCreep } from '../entities/ArenaCreep';
import { HeroTypeDef } from '../data/HeroTypes';
import { EconomyManager } from './EconomyManager';
import { EventLog } from '../ui/EventLog';

export interface ArenaCreepData {
  hp: number;
  speed: number;
  isBoss: boolean;
  color: number;
  size: number;
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

  // Respawn text
  private respawnText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    heroType: HeroTypeDef,
    arenaWidth: number,
    arenaHeight: number,
    economy: EconomyManager,
    eventLog: EventLog,
    baseHp: number = 100,
  ) {
    this.scene = scene;
    this.economy = economy;
    this.eventLog = eventLog;
    this.arenaX = GRID_OFFSET_X;
    this.arenaY = 0;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.baseHp = baseHp;
    this.baseMaxHp = baseHp;

    this.graphics = scene.add.graphics().setDepth(10);

    // Spawn hero at center of arena (pixel coords relative to arena)
    this.hero = new Hero(
      scene,
      arenaWidth / 2 + GRID_OFFSET_X,
      arenaHeight / 2,
      heroType,
      arenaWidth + GRID_OFFSET_X,
      arenaHeight,
    );

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
        const dmg = creep.isBoss ? 15 : creep.baseDamage;
        this.baseHp -= dmg;
        creep.recordAttack(now);
      }
    }

    // Check for arena kills
    for (const creep of this.arenaCreeps) {
      if (!creep.alive && creep.hp <= 0) {
        this.arenaKills++;
        // 10% gold for arena kills (10x creeps = need low per-kill reward)
        const gold = Math.round(this.economy.getKillGold() * 0.1);
        if (gold > 0) {
          this.economy.addGold(gold);
        }
        creep.hp = -999; // sentinel
      }
    }

    // Clean up dead creeps
    this.arenaCreeps = this.arenaCreeps.filter(c => c.alive);

    // Clamp base HP
    if (this.baseHp < 0) this.baseHp = 0;

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

  spawnArenaCreep(data: ArenaCreepData): void {
    // Spawn at left edge of arena, random Y
    const x = this.arenaX + 20;
    const y = 30 + Math.random() * (this.arenaHeight - 60);
    const speed = data.speed * 0.5; // Slower in arena so hero can fight them
    const baseDamage = data.isBoss ? 15 : 3;

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
    );
    this.arenaCreeps.push(creep);
  }

  handleClick(px: number, py: number): void {
    if (!this.hero.alive) return;
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

  handleAbilityKey(index: number): void {
    this.hero.useAbility(index, this.arenaCreeps);
  }

  drawArena(): void {
    this.graphics.clear();

    // Arena background
    this.graphics.fillStyle(0x1a1520, 1);
    this.graphics.fillRect(this.arenaX, this.arenaY, this.arenaWidth, this.arenaHeight);

    // Grid-like subtle pattern
    this.graphics.lineStyle(1, 0x222222, 0.3);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaWidth; x += 40) {
      this.graphics.lineBetween(x, 0, x, this.arenaHeight);
    }
    for (let y = 0; y <= this.arenaHeight; y += 40) {
      this.graphics.lineBetween(this.arenaX, y, this.arenaX + this.arenaWidth, y);
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
  }

  destroy(): void {
    this.graphics.destroy();
    this.hero.destroy();
    for (const c of this.arenaCreeps) c.destroy();
    if (this.respawnText) this.respawnText.destroy();
  }
}
