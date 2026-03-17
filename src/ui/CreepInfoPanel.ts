import { TILE_SIZE, CANVAS_WIDTH, GRID_OFFSET_X } from '../config';
import { Creep } from '../entities/Creep';

export class CreepInfoPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private effectsText: Phaser.GameObjects.Text;
  private visible: boolean = false;
  private trackedCreep: Creep | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(25).setVisible(false);

    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    this.nameText = scene.add.text(8, 4, '', { fontSize: '12px', color: '#ff8888', fontFamily: 'monospace' });
    this.statsText = scene.add.text(8, 20, '', { fontSize: '10px', color: '#ffffff', fontFamily: 'monospace' });
    this.effectsText = scene.add.text(8, 48, '', { fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace' });
    this.container.add([this.nameText, this.statsText, this.effectsText]);
  }

  show(creep: Creep): void {
    this.trackedCreep = creep;
    this.visible = true;
    this.container.setVisible(true);
    this.refresh();
  }

  /** Call each frame to update HP display */
  updateTracked(): void {
    if (!this.visible || !this.trackedCreep) return;
    if (!this.trackedCreep.alive) {
      this.hide();
      return;
    }
    this.refresh();
  }

  private refresh(): void {
    const c = this.trackedCreep;
    if (!c) return;

    const bossTag = c.isBoss ? ' [BOSS]' : '';
    this.nameText.setText(`${c.creepType.name}${bossTag}`);

    const hpPct = Math.round((c.hp / c.maxHp) * 100);
    this.statsText.setText(
      `HP: ${c.hp}/${c.maxHp} (${hpPct}%)\n` +
      `Armor: ${c.armor}${c.armor !== c.baseArmor ? ` (base: ${c.baseArmor})` : ''}\n` +
      `Speed: ${Math.round(c.speed)}/${Math.round(c.baseSpeed)} px/s`
    );

    // Active status effects
    const effects: string[] = [];
    for (const e of c.statusEffects.effects) {
      const dur = (e.duration / 1000).toFixed(1);
      switch (e.type) {
        case 'slow': effects.push(`Slow ${Math.round((1 - e.magnitude) * 100)}% (${dur}s)`); break;
        case 'burn': effects.push(`Burn ${e.magnitude}dps (${dur}s)`); break;
        case 'poison': effects.push(`Poison ${Math.round(e.magnitude * 100)}%/s (${dur}s)`); break;
        case 'root': effects.push(`Rooted (${dur}s)`); break;
        case 'armor_shred': effects.push(`Armor shred -${e.magnitude} (${dur}s)`); break;
        case 'damage_amp': effects.push(`Vulnerable +${Math.round(e.magnitude * 100)}% (${dur}s)`); break;
        default: effects.push(`${e.type} (${dur}s)`); break;
      }
    }

    // Traits
    const traits: string[] = [];
    for (const t of c.traits) {
      if (t.id === 'shield') {
        traits.push(`Shield: ${t._shieldHp ?? 0}/${Math.floor(c.maxHp * (t.hpPercent ?? 0.3))}`);
      } else if (t.id === 'heal_aura') {
        traits.push('Heal aura (3% nearby/s)');
      }
    }

    const allEffects = [...effects, ...traits];
    this.effectsText.setText(allEffects.length > 0 ? allEffects.join('\n') : 'No effects');

    // Panel size
    const panelW = 280;
    const panelH = 52 + allEffects.length * 13 + 8;

    // Position near creep
    let px = c.x + TILE_SIZE;
    let py = c.y - panelH / 2;
    if (px + panelW > CANVAS_WIDTH) px = c.x - TILE_SIZE - panelW;
    if (px < GRID_OFFSET_X) px = GRID_OFFSET_X;
    if (py < 0) py = 0;

    this.container.setPosition(px, py);
    this.bg.clear();
    this.bg.fillStyle(0x111111, 0.95);
    this.bg.fillRect(0, 0, panelW, panelH);
    this.bg.lineStyle(1, 0x884444, 1);
    this.bg.strokeRect(0, 0, panelW, panelH);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.trackedCreep = null;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
