/**
 * FactionUnlockSplash — full-screen take-over after a Shards unlock.
 *
 * Listens for a `td-faction-unlocked` window event (dispatched by
 * FactionUnlockFlow.attemptFactionUnlock on success) and renders a
 * splash with the FactionEmblem big, the faction's identity copy,
 * and a "Begin Campaign" / "Continue" CTA.
 *
 * Plan 5 v1 polish — uses the procedural emblem rather than bespoke
 * art. The shell + animation pipeline are reusable when bespoke art
 * lands later (drop in an image instead of the SVG emblem).
 */
import { useEffect, useState } from 'preact/hooks';
import type { FactionId } from '../../data/Factions';
import { FACTIONS } from '../../data/Factions';
import { FactionEmblem } from './FactionEmblem';
import { UIBridge } from '../UIBridge';
import { getCampaign } from '../../data/campaigns';

const BASE_URL: string = (import.meta as any).env?.BASE_URL ?? '/';

function splashSrc(faction: FactionId): string {
  if (faction === 'chaos' || faction === 'random') return '';
  return `${BASE_URL}assets/${faction}/${faction}_splash.png`;
}

export function FactionUnlockSplash() {
  const [factionId, setFactionId] = useState<FactionId | null>(null);

  useEffect(() => {
    const onUnlock = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { factionId: FactionId } | undefined;
      if (detail?.factionId) setFactionId(detail.factionId);
    };
    window.addEventListener('td-faction-unlocked', onUnlock);
    return () => window.removeEventListener('td-faction-unlocked', onUnlock);
  }, []);

  if (!factionId) return null;
  const faction = FACTIONS[factionId];
  const color = '#' + faction.primaryColor.toString(16).padStart(6, '0');
  const campaignDef = getCampaign(factionId);

  const dismiss = () => setFactionId(null);
  const beginCampaign = () => {
    if (campaignDef) {
      dismiss();
      UIBridge.show('campaign-lobby', { campaign: campaignDef });
    } else {
      dismiss();
    }
  };

  const splashImg = splashSrc(factionId);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, rgba(20,12,30,0.96) 0%, rgba(8,5,12,0.99) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 800,
      animation: 'unlockFade 280ms ease-out',
      padding: '24px',
      overflow: 'hidden',
    }} onClick={dismiss}>
      {/* Bespoke splash key art behind the emblem + text. Centered,
          scaled to cover, with the existing radial vignette overlaying
          for legibility. PNG missing → background gracefully renders
          just the radial gradient. */}
      {splashImg && (
        <img
          src={splashImg}
          alt=""
          aria-hidden="true"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '720px',
            width: 'min(90vw, 720px)',
            opacity: 0.55,
            pointerEvents: 'none',
            filter: 'blur(0.5px) saturate(1.1)',
            zIndex: 0,
          }}
        />
      )}
      {/* Dark vignette over the splash so text + emblem stay readable. */}
      {splashImg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(8,5,12,0.55) 60%, rgba(8,5,12,0.92) 100%)',
        }} />
      )}
      <style>{`
        @keyframes unlockFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes unlockEmblemRise {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes unlockGlow {
          0%, 100% { filter: drop-shadow(0 0 24px ${color}44); }
          50%      { filter: drop-shadow(0 0 36px ${color}99); }
        }
      `}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '520px', position: 'relative', zIndex: 2 }}>
        <div style={{
          fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>Faction Unlocked</div>
        <div style={{
          animation: 'unlockEmblemRise 420ms ease-out, unlockGlow 3s ease-in-out infinite',
        }}>
          <FactionEmblem faction={factionId} size={180} />
        </div>
        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: 'clamp(28px, 6vw, 38px)',
          color,
          textAlign: 'center',
        }}>{faction.name}</div>
        <div style={{
          fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.55,
          maxWidth: '420px',
        }}>
          {faction.description}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>
          {campaignDef
            ? 'Beat their campaign to play AS them in every other mode.'
            : 'Their campaign is coming in a future release. Until then, the unlock waits.'}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          {campaignDef
            ? <button class="btn btn-gold" onClick={beginCampaign}>Begin Campaign</button>
            : <button class="btn" onClick={dismiss}>Continue</button>}
          <button class="btn" onClick={dismiss}>Close</button>
        </div>
      </div>
    </div>
  );
}
