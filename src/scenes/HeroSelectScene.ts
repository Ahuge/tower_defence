/**
 * HeroSelectScene — thin shell that redirects to DOM UI.
 */
import Phaser from 'phaser';
import { UIBridge } from '../ui/UIBridge';

export class HeroSelectScene extends Phaser.Scene {
  constructor() { super('HeroSelectScene'); }

  preload(): void { /* Sprites loaded by GameScene */ }

  create(data: any): void {
    UIBridge.show('heroselect', data);
  }
}
