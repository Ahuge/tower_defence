/** Simplified creep for the hero arena. Moves left→right, attacks hero if in range. */
export class ArenaCreep {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;   // pixels per second
  baseDamage: number; // damage to base on reaching right edge
  alive: boolean = true;
  atBase: boolean = false; // reached base, now attacking it
  isBoss: boolean;
  color: number;
  size: number;
  graphics: Phaser.GameObjects.Graphics;
  scene: Phaser.Scene;

  // Status effects
  stunned: number = 0;   // seconds remaining
  slowed: number = 0;    // seconds remaining
  slowFactor: number = 0; // 0-1, reduces speed by this fraction

  // Combat — creeps fight back
  readonly aggroRange: number;    // pixels — detect hero and move toward them
  readonly attackRange: number;   // pixels — stop and attack
  readonly attackDamage: number;  // per hit
  readonly attackInterval: number; // ms between attacks
  private lastAttackTime: number = 0;

  private arenaWidth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    baseDamage: number,
    isBoss: boolean,
    color: number,
    size: number,
    arenaWidth: number,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.baseDamage = baseDamage;
    this.isBoss = isBoss;
    this.color = color;
    this.size = size;
    this.arenaWidth = arenaWidth;

    // Combat stats scale with creep strength
    this.aggroRange = isBoss ? 360 : 240;  // detection range to chase hero
    this.attackRange = isBoss ? 50 : 35;   // melee range to stop and hit
    this.attackDamage = isBoss ? Math.round(hp * 0.08) : Math.max(3, Math.round(hp * 0.04));
    this.attackInterval = isBoss ? 1200 : 1500; // ms

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(14);
  }

  /** Update creep. Pass hero position for aggro. Returns true if reached base. */
  update(delta: number, heroX?: number, heroY?: number, heroAlive?: boolean): boolean {
    if (!this.alive) return false;

    const dt = delta / 1000;

    // Tick status effects
    if (this.stunned > 0) {
      this.stunned -= dt;
      this.draw();
      return false; // stunned, no movement
    }
    if (this.slowed > 0) {
      this.slowed -= dt;
    }

    let moveSpeed = this.speed;
    if (this.slowed > 0) moveSpeed *= (1 - this.slowFactor);

    // Already at base — stay parked and attack it (don't chase hero)
    if (this.atBase) {
      this.draw();
      return false;
    }

    // Check hero proximity — chase if in aggro range, stop if in attack range
    if (heroX !== undefined && heroY !== undefined && heroAlive) {
      const dx = heroX - this.x;
      const dy = heroY - this.y;
      const distToHero = Math.sqrt(dx * dx + dy * dy);

      if (distToHero <= this.attackRange) {
        // In melee range — stop and attack (damage handled by ArenaManager)
        this.draw();
        return false;
      }

      if (distToHero <= this.aggroRange) {
        // In aggro range — move toward hero instead of toward base
        const step = moveSpeed * dt;
        this.x += (dx / distToHero) * step;
        this.y += (dy / distToHero) * step;
        this.draw();
        return false;
      }
    }

    // Default: move left → right toward base
    this.x += moveSpeed * dt;

    // Reached base area → park and start attacking it
    if (this.x >= this.arenaWidth - 40) {
      this.x = this.arenaWidth - 45 + Math.random() * 10;
      this.atBase = true;
      this.draw();
      return false;
    }

    this.draw();
    return false;
  }

  /** Check if this creep can attack the hero right now */
  canAttackHero(heroX: number, heroY: number, now: number): boolean {
    if (!this.alive || this.stunned > 0) return false;
    const dx = heroX - this.x;
    const dy = heroY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.attackRange) return false;
    return now - this.lastAttackTime >= this.attackInterval;
  }

  /** Check if this creep can attack the base right now */
  canAttackBase(now: number): boolean {
    if (!this.alive || !this.atBase || this.stunned > 0) return false;
    return now - this.lastAttackTime >= this.attackInterval;
  }

  /** Record that an attack was made */
  recordAttack(now: number): void {
    this.lastAttackTime = now;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.graphics.destroy();
    }
  }

  draw(): void {
    this.graphics.clear();
    if (!this.alive) return;

    const baseSize = this.isBoss ? 12 : 7;
    const drawSize = baseSize * this.size;

    // Body
    this.graphics.fillStyle(this.color, 1);
    this.graphics.fillCircle(this.x, this.y, drawSize);

    // Stun indicator
    if (this.stunned > 0) {
      this.graphics.lineStyle(2, 0xffff44, 0.8);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 3);
    }

    // Slow indicator
    if (this.slowed > 0) {
      this.graphics.lineStyle(1, 0x44aaff, 0.6);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 2);
    }

    // HP bar
    const barW = drawSize * 2.5;
    const barH = 3;
    const barX = this.x - barW / 2;
    const barY = this.y - drawSize - 5;
    const hpRatio = this.hp / this.maxHp;

    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, barW, barH);
    this.graphics.fillStyle(hpRatio > 0.5 ? 0x44ff44 : 0xff4444, 1);
    this.graphics.fillRect(barX, barY, barW * hpRatio, barH);
  }

  destroy(): void {
    if (this.graphics) this.graphics.destroy();
  }
}
