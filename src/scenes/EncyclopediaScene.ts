/**
 * EncyclopediaScene — thin shell that redirects to DOM UI.
 */
import * as Phaser from 'phaser';
import { UIBridge } from '../ui/UIBridge';

export class EncyclopediaScene extends Phaser.Scene {
  constructor() { super('EncyclopediaScene'); }

  create(): void {
    UIBridge.show('encyclopedia');
  }
}
