/**
 * CreepFactionSelectScene — thin shell that redirects to DOM UI.
 */
import Phaser from 'phaser';
import { UIBridge } from '../ui/UIBridge';

export class CreepFactionSelectScene extends Phaser.Scene {
  constructor() { super('CreepFactionSelectScene'); }

  create(data: any): void {
    UIBridge.show('creepfactionselect', data);
  }
}
