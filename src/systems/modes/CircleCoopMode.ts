import { MatchMode } from '../../data/WaveDefinitions';
import { BaseFrontierMode } from './BaseFrontierMode';

/**
 * Circle Co-op game mode: shared map, individual gold, no sends.
 * Standard frontier buildings for economy.
 */
export class CircleCoopMode extends BaseFrontierMode {
  readonly id: MatchMode = 'circle_coop';
}
