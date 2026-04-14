/**
 * Navigation helpers — used by Phaser scenes to navigate back to DOM UI.
 */
import { UIBridge } from './UIBridge';

export function goToMenu(): void { UIBridge.showMenu(); }
export function goToStore(): void { UIBridge.showStore(); }
export function goToBattlePass(): void { UIBridge.showBattlePass(); }
