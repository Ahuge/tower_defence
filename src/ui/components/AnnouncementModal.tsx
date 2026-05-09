/**
 * Auto-pops the newest unseen announcement when the player is sitting on
 * the main menu, and replays any past announcement on demand when the
 * mailbox dispatches `ANNOUNCEMENT_OPEN_EVENT`. Closing the auto-pop
 * marks it seen; closing a replay does not.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { FACTIONS } from '../../data/Factions';
import {
  ANNOUNCEMENT_OPEN_EVENT,
  formatAnnouncementDate,
  getAnnouncement,
  getNewestUnseen,
  type Announcement,
  type AnnouncementSection,
} from '../../data/Announcements';
import { PlayerProfile } from '../../systems/profile/PlayerProfile';
import { UIBridge } from '../UIBridge';
import { ASSET_BASE } from '../utils/factionAssets';
import { isBootComplete } from '../utils/bootStatus';
import { useIsPortraitViewport } from '../hooks/useIsPortraitViewport';
import { FullscreenOverlay } from './FullscreenOverlay';

interface ActiveModal {
  announcement: Announcement;
  /** True when the player explicitly opened a past announcement from
   *  the mailbox — suppresses the auto-mark-seen on close. */
  review: boolean;
}

export function AnnouncementModal() {
  const [active, setActive] = useState<ActiveModal | null>(null);
  // Effect runs once. Use a ref so the screen-change handler can guard
  // against replacing an already-open modal without re-subscribing on
  // every open/close.
  const activeRef = useRef<ActiveModal | null>(null);
  activeRef.current = active;

  useEffect(() => {
    // Auto-pop only AFTER the boot splash has dismissed — otherwise the
    // modal would render behind AppLoadingScreen and pop fully-formed
    // when the splash fades, which feels like a layering bug.
    const tryAutoPop = () => {
      if (activeRef.current) return;
      if (!isBootComplete()) return;
      if (UIBridge.getScreen() !== 'menu') return;
      const next = getNewestUnseen();
      if (!next) return;
      setActive({ announcement: next, review: false });
    };
    tryAutoPop();
    const unsubScreen = UIBridge.onScreenChange(tryAutoPop);
    window.addEventListener('app-splash-dismissed', tryAutoPop, { once: true });

    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { id?: string } | undefined;
      if (!detail?.id) return;
      const a = getAnnouncement(detail.id);
      if (!a) return;
      setActive({ announcement: a, review: true });
    };
    window.addEventListener(ANNOUNCEMENT_OPEN_EVENT, onOpen);
    return () => {
      unsubScreen();
      window.removeEventListener('app-splash-dismissed', tryAutoPop);
      window.removeEventListener(ANNOUNCEMENT_OPEN_EVENT, onOpen);
    };
  }, []);

  const isPortrait = useIsPortraitViewport();

  if (!active) return null;
  const { announcement, review } = active;
  const accentColor = announcement.factionAccent
    ? '#' + FACTIONS[announcement.factionAccent].primaryColor.toString(16).padStart(6, '0')
    : 'var(--gold)';
  const heroArtPath = (isPortrait && announcement.heroArtPortrait) || announcement.heroArt;
  const heroArtSrc = heroArtPath ? `${ASSET_BASE}${heroArtPath}` : null;

  const dismiss = () => {
    if (!review) PlayerProfile.markAnnouncementSeen(announcement.id);
    setActive(null);
  };

  return (
    <FullscreenOverlay onClose={dismiss} backdrop="gradient" zIndex={850}>
      <style>{`
        @keyframes announcementRise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes announcementGlow {
          0%, 100% { box-shadow: 0 0 0 1px ${accentColor}55, 0 24px 64px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 1px ${accentColor}aa, 0 24px 72px ${accentColor}33; }
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 35%, ${accentColor}22 0%, transparent 60%)`,
      }} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          width: 'min(92vw, 720px)',
          maxHeight: '88vh',
          padding: '32px clamp(20px, 4vw, 40px)',
          background: 'var(--bg-surface)',
          border: `1px solid ${accentColor}`,
          borderRadius: '14px',
          overflowY: 'auto',
          animation: 'announcementRise 320ms ease-out, announcementGlow 4s ease-in-out infinite',
        }}
      >
        {heroArtSrc && (
          <img
            src={heroArtSrc}
            alt=""
            aria-hidden="true"
            style={{
              display: 'block',
              width: 'calc(100% + clamp(40px, 8vw, 80px))',
              margin: '-32px calc(clamp(20px, 4vw, 40px) * -1) 0',
              aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
              objectFit: 'cover',
              borderTopLeftRadius: '13px',
              borderTopRightRadius: '13px',
              maskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
            }}
          />
        )}

        <div style={{
          fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>Announcement · {formatAnnouncementDate(announcement.publishedAt)}</div>

        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: 'clamp(28px, 5vw, 40px)',
          color: accentColor,
          lineHeight: 1.1,
        }}>{announcement.title}</div>

        {announcement.body.map((s, i) => <SectionView key={i} section={s} accent={accentColor} />)}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button class="btn btn-gold" onClick={dismiss}>
            {review ? 'Close' : 'Got it'}
          </button>
        </div>
      </div>
    </FullscreenOverlay>
  );
}

function SectionView({ section, accent }: { section: AnnouncementSection; accent: string }) {
  switch (section.kind) {
    case 'lead':
      return (
        <div style={{
          fontSize: 'clamp(14px, 2.4vw, 17px)',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
        }}>{section.text}</div>
      );
    case 'paragraph':
      return (
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>{section.text}</div>
      );
    case 'feature':
      return (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderLeft: `2px solid ${accent}`,
          borderRadius: '0 6px 6px 0',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: 'bold', color: accent, marginBottom: '4px',
          }}>{section.title}</div>
          <div style={{
            fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55,
          }}>{section.body}</div>
        </div>
      );
    case 'list':
      return (
        <ul style={{
          margin: 0, paddingLeft: '20px',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
  }
}
