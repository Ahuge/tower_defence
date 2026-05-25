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
import type { ComponentChildren } from 'preact';
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
import { FACTIONS, type FactionId } from '../../data/Factions';
import { factionKeyartSrc } from '../utils/factionAssets';

type Mission = MissionEntry<unknown, unknown>;
type Campaign = CampaignExtension<unknown, unknown>;

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
      padding: 'var(--space-4)',
    }}
      onClick={() => setPendingMission(null)}
    >
      <div style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${factionColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5) var(--space-6)',
        maxWidth: 'min(520px, 100%)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.7)',
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          MISSION {pendingMission.idx + 1}
        </div>
        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: 'var(--text-xl)',
          color: factionColor,
          margin: 'var(--space-1) 0 var(--space-4)',
        }}>{pendingMission.name}</div>
        <div style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-5)',
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
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>Objectives</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div>★ Win the mission</div>
            {pendingMission.objectives.star2 && <div>★★ {pendingMission.objectives.star2.label}</div>}
            {pendingMission.objectives.star3 && <div>★★★ {pendingMission.objectives.star3.label}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
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
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.55,
            // Campaign intros concatenate paragraphs with literal `\n`
            // (`"para1\n" + "\n" + "para2"`). Without pre-wrap every
            // break collapses into a single space and the briefing
            // reads as one wall. Pre-wrap preserves author intent
            // across all four shipping campaigns. The pre-mission
            // story modal a few lines below already does this; the
            // wrapper just missed the same treatment.
            whiteSpace: 'pre-wrap' as const,
            textAlign: 'left' as const,
          }}>
            {campaign.intro}
          </div>
          <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            Progress: <span style={{ color: factionColor }}>{completedCount}/{missionCount}</span>
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{totalStars}/{missionCount * 3} stars</span>
          </div>
          {isCampaignDone && (
            <div style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(255,170,68,0.12)', borderLeft: `3px solid ${factionColor}`,
              fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.55, textAlign: 'left',
              // Outros use the same multi-paragraph `"\n" + "\n" + …`
              // shape as intros — see the matching note on the intro
              // div above.
              whiteSpace: 'pre-wrap' as const,
            }}>
              <div style={{ fontFamily: "'Silkscreen', monospace", color: factionColor, marginBottom: 'var(--space-1)' }}>Campaign Complete</div>
              {campaign.outro}
            </div>
          )}
        </div>

        {(() => {
          // Per-extension UI surface: render every panel the campaign
          // exposes via `ui.panels`. Read state through the missionState
          // aspect so panels that opt into state-as-props (future
          // campaigns) get the live value; existing panels ignore it
          // and read via module-level getters. Falls back to
          // `initialState` for campaigns without a missionState aspect.
          const panels = campaign.ui?.panels;
          if (!panels || panels.length === 0) return null;
          const state = campaign.missionState?.read() ?? campaign.initialState;
          return (
            <div style={{ maxWidth: '520px', margin: '0 auto var(--space-4)' }}>
              {panels.map((p) => (
                <div key={p.id}>{p.render(state) as ComponentChildren}</div>
              ))}
            </div>
          );
        })()}

        {(() => {
          // Hoist the campaign progress map once for the whole list —
          // calling getMissionStars + isMissionUnlocked per tile would
          // re-load the profile from localStorage 2× per mission.
          const progress = PlayerProfile.getCampaignProgress(campaign.factionId);
          const starsAt = (idx: number) => progress[idx] ?? 0;
          return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: '520px', margin: '0 auto' }}>
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
                  display: 'flex', alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  textAlign: 'left',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.55 : 1,
                  borderColor: stars >= 1 ? factionColor : undefined,
                }}>
                <div style={{
                  fontFamily: "'Silkscreen', monospace",
                  fontSize: 'var(--text-pixel-glyph)',
                  color: stars >= 1 ? factionColor : 'var(--text-dim)',
                  minWidth: '36px',
                  textAlign: 'center',
                }}>
                  {String(mission.idx + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* flexWrap lets the badge slip below the name when
                      both don't fit one row. Without it the badge gets
                      clipped off the right edge on narrow phones. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' as const }}>
                    <span style={{ fontFamily: "'Silkscreen', monospace", fontSize: 'var(--text-sm)' }}>{mission.name}</span>
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', padding: '1px var(--space-2)', border: '1px solid var(--text-dim)', borderRadius: 'var(--radius-sm)' }}>
                      {archetype.label}
                    </span>
                    {stub && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--gold)' }}>Coming Soon</span>}
                    {!unlocked && !stub && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)' }}>🔒 Locked</span>}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-tight)' }}>
                    {archetype.blurb}
                  </div>
                </div>
                <StarRating stars={stars} style={{ fontSize: 'var(--text-sm)', minWidth: '54px', textAlign: 'right' }} />
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
