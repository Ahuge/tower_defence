/**
 * LeaderboardScene — thin shell that redirects to DOM UI.
 */
import Phaser from 'phaser';
import { UIBridge } from '../ui/UIBridge';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('LeaderboardScene'); }

  create(data?: any): void {
    UIBridge.show('leaderboard', data ?? {});
  }
}
