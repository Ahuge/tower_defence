/** Window event names dispatched by the SabotageHudDOM and consumed
 *  by GameScene. Lives in its own file so producer (DOM) and consumer
 *  (scene) reference the same constants without typo drift. Same
 *  pattern as `data/AnnouncementEvents.ts`. */

export const SABOTAGE_TRAIN_EVENT = 'td-sabotage-train';
export const SABOTAGE_UPGRADE_EVENT = 'td-sabotage-upgrade';

export interface SabotageUpgradeEventDetail {
  kind: 'plate' | 'edge' | 'tread';
}
