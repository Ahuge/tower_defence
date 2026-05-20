/**
 * CampaignLobbyScreen — sub-scene lobby for one faction's campaign.
 *
 * Plan 10 v1: ships the structure and the unlock cascade. Visual
 * polish (parallax homeworld backgrounds, animated story-beat key
 * art, audio loops) is owned by per-campaign content plans
 * (Plan 14 for Arcane, the Mechanical campaign next, etc.).
 *
 * Reads campaign progress from PlayerProfile, renders 10 mission
 * cards in a linear column with star ratings + locked silhouettes,
 * and routes mission picks through MissionRunner.
 *
 * Story-beat modal: when a mission is selected, a pre-mission card
 * shows the mission's `story` copy and the active star objectives
 * before launching the run.
 */
import { useState, useEffect } from 'preact/hooks';
import { Header } from '../components/Header';
import { ShardBadge } from '../components/ShardBadge';
import { StarRating } from '../components/StarRating';
import { UIBridge } from '../UIBridge';
import { Analytics } from '../../systems/AnalyticsClient';
import { PlayerProfile } from '../../systems/profile/PlayerProfile';
import { MissionRunner } from '../../systems/missions/MissionRunner';
import { getArchetypeLabel } from '../../data/campaigns/ArchetypeLabels';
import type { CampaignExtension, MissionEntry } from '../../systems/campaign/types';

type Mission = MissionEntry<unknown, unknown>;
type Campaign = CampaignExtension<unknown, unknown>;
import { FACTIONS, type FactionId } from '../../data/Factions';
import { CampaignStatePanelRegistry } from '../../systems/campaign/CampaignStatePanelRegistry';
import { factionKeyartSrc } from '../utils/factionAssets';

interface Props {
  data: Record<string, unknown>;
}

export function CampaignLobbyScreen({ data }: Props) {
  const campaign = data.campaign as Campaign | undefined;
  const autoSelectMissionIdx = data.autoSelectMissionIdx as number | undefined;
  const [pendingMission, setPendingMission] = useState<Mission | null>(null);

  useEffect(() => {
    if (campaign) {
      Analytics.track('campaign_lobby_opened', { campaignFactionId: campaign.factionId });
    }
  }, [campaign?.factionId]);

  // GameOverScreen routes here with autoSelectMissionIdx after a "Next
  // Mission" tap so the player sees the story modal for the upcoming
  // chapter before launching. Skip if the mission is locked or stub
  // (defensive — the prior mission's win unlocked the next, so this
  // should always pass for a normal Next Mission flow).
  useEffect(() => {
    if (!campaign || autoSelectMissionIdx === undefined) return;
    const next = campaign.missions[autoSelectMissionIdx];
    if (!next) return;
    if (!PlayerProfile.isMissionUnlocked(campaign.factionId, next.idx)) return;
    if ((next.unlaunchable ?? false)) return;
    setPendingMission(next);
  }, [campaign?.factionId, autoSelectMissionIdx]);

  if (!campaign) {
    return (
      <>
        <Header title="CAMPAIGN" back={() => UIBridge.show('menu')} />
        <div class="ui-section" style={{ textAlign: 'center', padding: '40px' }}>
          No campaign loaded.
        </div>
      </>
    );
  }

  const faction = FACTIONS[campaign.factionId];
  const factionColor = '#' + faction.primaryColor.toString(16).padStart(6, '0');
  const totalStars = PlayerProfile.getCampaignTotalStars(campaign.factionId);
  const missionCount = campaign.missions.length;
  const completedCount = campaign.missions.filter(m =>
    PlayerProfile.getMissionStars(campaign.factionId, m.idx) >= 1,
  ).length;
  const isCampaignDone = completedCount === missionCount;

  const launch = (mission: Mission) => {
    if (!PlayerProfile.isMissionUnlocked(campaign.factionId, mission.idx)) return;
    if ((mission.unlaunchable ?? false)) return;
    setPendingMission(null);
    MissionRunner.start(campaign, mission.idx);
  };

  // Pre-mission story modal — shows campaign-context + objective list
  // before kicking off the actual game scene.
  const storyModal = pendingMission ? (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(8, 6, 14, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 700,
      padding: '16px',
    }}
      onClick={() => setPendingMission(null)}
    >
      <div style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${factionColor}`,
        borderRadius: '12px',
        padding: '24px 28px',
        maxWidth: 'min(520px, 100%)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.7)',
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          MISSION {pendingMission.idx + 1}
        </div>
        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: '22px',
          color: factionColor,
          margin: '4px 0 16px',
        }}>{pendingMission.name}</div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: '20px',
          // Mission stories often span multiple paragraphs separated
          // by literal newlines (backtick template literals in the
          // .texts files; or "\n\n"-joined string concatenations in
          // Snake Eyes). Without pre-wrap, every \n collapses to a
          // single space — running 3-paragraph briefings into one
          // wall. Pre-wrap preserves authored breaks across every
          // campaign.
          whiteSpace: 'pre-wrap' as const,
        }}>
          {pendingMission.story}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Objectives</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div>★ Win the mission</div>
            {pendingMission.objectives.star2 && <div>★★ {pendingMission.objectives.star2.label}</div>}
            {pendingMission.objectives.star3 && <div>★★★ {pendingMission.objectives.star3.label}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button class="btn" onClick={() => setPendingMission(null)}>Back</button>
          <button class="btn btn-gold" onClick={() => launch(pendingMission)}>Begin</button>
        </div>
      </div>
    </div>
  ) : null;

  const keyart = factionKeyartSrc(campaign.factionId);

  return (
    <>
      {/* Faction keyart hero background. Fixed-position so it stays
          parallax-anchored as the player scrolls the mission list.
          Heavy vignette over it keeps the card text readable; the
          overlay color is the faction primary so the page reads as
          themed rather than just "image with text on it". */}
      {keyart && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: -1,
          backgroundImage: `url(${keyart})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: 0.45,
          filter: 'saturate(1.05)',
          pointerEvents: 'none',
        }} />
      )}
      {keyart && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background: `radial-gradient(ellipse at center, rgba(8,5,12,0.55) 0%, rgba(6,4,10,0.85) 70%, rgba(4,3,8,0.95) 100%)`,
          pointerEvents: 'none',
        }} />
      )}
      <Header title={campaign.name.toUpperCase()} back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />
      <div class="ui-section">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.55 }}>
            {campaign.intro}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
            Progress: <span style={{ color: factionColor }}>{completedCount}/{missionCount}</span>
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{totalStars}/{missionCount * 3} stars</span>
          </div>
          {isCampaignDone && (
            <div style={{
              marginTop: '14px', padding: '10px 14px',
              background: 'rgba(255,170,68,0.12)', borderLeft: `3px solid ${factionColor}`,
              fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.55, textAlign: 'left',
            }}>
              <div style={{ fontFamily: "'Silkscreen', monospace", color: factionColor, marginBottom: '4px' }}>Campaign Complete</div>
              {campaign.outro}
            </div>
          )}
        </div>

        {(() => {
          const StatePanel = CampaignStatePanelRegistry.get(campaign.factionId);
          return StatePanel ? (
            <div style={{ maxWidth: '520px', margin: '0 auto 16px' }}>
              <StatePanel factionId={campaign.factionId} />
            </div>
          ) : null;
        })()}

        {(() => {
          // Hoist the campaign progress map once for the whole list —
          // calling getMissionStars + isMissionUnlocked per tile would
          // re-load the profile from localStorage 2× per mission.
          const progress = PlayerProfile.getCampaignProgress(campaign.factionId);
          const starsAt = (idx: number) => progress[idx] ?? 0;
          return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '520px', margin: '0 auto' }}>
          {campaign.missions.map(mission => {
            const stars = starsAt(mission.idx);
            // First mission unlocked by default; later ones need ≥1 star
            // on the prior mission (matches PlayerProfile.isMissionUnlocked).
            const unlocked = mission.idx === 0 || starsAt(mission.idx - 1) >= 1;
            const stub = (mission.unlaunchable ?? false);
            const archetype = getArchetypeLabel(mission.archetypeId);
            const disabled = !unlocked || stub;
            return (
              <button key={mission.id}
                disabled={disabled}
                onClick={() => setPendingMission(mission)}
                class="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.55 : 1,
                  borderColor: stars >= 1 ? factionColor : undefined,
                }}>
                <div style={{
                  fontFamily: "'Silkscreen', monospace",
                  fontSize: '20px',
                  color: stars >= 1 ? factionColor : 'var(--text-dim)',
                  minWidth: '36px',
                  textAlign: 'center',
                }}>
                  {String(mission.idx + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'Silkscreen', monospace", fontSize: '13px' }}>{mission.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '1px 6px', border: '1px solid var(--text-dim)', borderRadius: '3px' }}>
                      {archetype.label}
                    </span>
                    {stub && <span style={{ fontSize: '10px', color: 'var(--gold)' }}>Coming Soon</span>}
                    {!unlocked && !stub && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>🔒 Locked</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {archetype.blurb}
                  </div>
                </div>
                <StarRating stars={stars} style={{ fontSize: '14px', minWidth: '54px', textAlign: 'right' }} />
              </button>
            );
          })}
        </div>
          );
        })()}
      </div>
      {storyModal}
    </>
  );
}
