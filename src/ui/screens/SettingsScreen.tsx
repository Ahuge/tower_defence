/**
 * Settings screen — universal account + device-level toggles,
 * reachable from the ProfileAvatar click on every screen's topbar.
 *
 * Sections:
 *   - Account         sign-in / sign-out (future), display name, provider badge
 *   - Restore         re-apply owned IAPs (was in StoreScreen; lives here now)
 *   - Tutorial        reset first-launch state for re-running onboarding
 *   - Analytics       opt-out toggle (writes `td_analytics_optout`)
 *   - About           app version, build SHA, contact email
 *
 * Each section is intentionally compact + self-contained. Adding a
 * new setting later is one new block here — no shared registry.
 */
import { useState, useEffect } from 'preact/hooks';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { UIBridge } from '../UIBridge';
import { platformBridge } from '../../systems/platform';
import type { PlayerProfile } from '../../systems/platform';
import { restorePurchases, PlayerInventory } from '../../systems/monetization';
import { Analytics } from '../../systems/AnalyticsClient';
import { TutorialPersistence } from '../../systems/Tutorial/TutorialPersistence';

export function SettingsScreen() {
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);
  const profile = platformBridge().profile.getProfile();

  return (
    <>
      <Header title="SETTINGS" back={() => UIBridge.show('menu')} />
      <div class="ui-section">
        <AccountSection profile={profile} rerender={rerender} />
        <RestoreSection />
        <TutorialSection />
        <AnalyticsSection />
        <AboutSection />
      </div>
    </>
  );
}

// ─── Account ──────────────────────────────────────────────────

function AccountSection({ profile, rerender }: { profile: PlayerProfile | null; rerender: () => void }) {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await platformBridge().profile.signIn();
      window.dispatchEvent(new Event('td-profile-changed'));
      rerender();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="settings-block">
      <div class="ui-section-title">Account</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
        <ProfileAvatar size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
            {profile ? profile.displayName : 'Not signed in'}
          </div>
          <div class="text-dim text-sm">
            {profile ? `Signed in via ${providerLabel(profile.provider)}` : 'Sign in to sync achievements + cross-device progress'}
          </div>
        </div>
        {!profile && (
          <button
            class={`btn btn-gold ${busy ? 'btn-disabled' : ''}`}
            onClick={signIn}
            disabled={busy}
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        )}
      </div>
      {PlayerInventory.isAdFree() && (
        <div class="text-dim text-xs" style={{ padding: '4px 0' }}>
          ⭐ Ads-off unlocked
        </div>
      )}
    </div>
  );
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'android': return 'Google Play Games';
    case 'ios': return 'Game Center';
    case 'electron-steam': return 'Steam';
    case 'electron': return 'Electron (local)';
    case 'web': return 'Web (anonymous)';
    default: return provider;
  }
}

// ─── Restore Purchases ────────────────────────────────────────

function RestoreSection() {
  const isNative = platformBridge().isNative;
  const [state, setState] = useState<'idle' | 'running' | string>('idle');
  if (!isNative) return null;

  const onRestore = async () => {
    if (state === 'running') return;
    setState('running');
    const r = await restorePurchases();
    if (r.error) {
      setState('Restore failed. Check your connection.');
    } else if (r.appliedCount > 0) {
      setState(`Restored ${r.appliedCount} entitlement${r.appliedCount === 1 ? '' : 's'}.`);
    } else if (r.skuCount > 0) {
      setState('Already up to date.');
    } else {
      setState('No purchases found on this account.');
    }
    setTimeout(() => setState('idle'), 4000);
  };

  return (
    <div class="settings-block" style={{ marginTop: '16px' }}>
      <div class="ui-section-title">Purchases</div>
      <div class="text-dim text-sm mb-2">
        Re-apply any non-consumable purchases (ads-off, skin packs, Battle Pass) from your Google Play / Game Center account — useful after reinstalling or switching devices.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          class={`btn ${state === 'running' ? 'btn-disabled' : ''}`}
          onClick={onRestore}
          disabled={state === 'running'}
        >
          {state === 'running' ? 'Restoring...' : 'Restore Purchases'}
        </button>
        {state !== 'idle' && state !== 'running' && (
          <span class="text-dim text-xs">{state}</span>
        )}
      </div>
    </div>
  );
}

// ─── Tutorial reset ───────────────────────────────────────────

function TutorialSection() {
  const [state, setState] = useState<'idle' | 'confirming' | 'reset'>('idle');

  const onReset = () => {
    if (state === 'reset') return;
    if (state !== 'confirming') {
      setState('confirming');
      return;
    }
    TutorialPersistence.reset();
    setState('reset');
    // Reload so the basics-tour re-fires on next menu mount.
    setTimeout(() => location.reload(), 500);
  };

  return (
    <div class="settings-block" style={{ marginTop: '16px' }}>
      <div class="ui-section-title">Tutorial</div>
      <div class="text-dim text-sm mb-2">
        Replay the first-launch tour + reset all "first time" prompts. The app will reload.
      </div>
      <button
        class={`btn ${state === 'confirming' ? 'btn-gold' : ''}`}
        onClick={onReset}
      >
        {state === 'confirming' ? 'Tap again to confirm' : state === 'reset' ? 'Reloading...' : 'Reset Tutorial Progress'}
      </button>
    </div>
  );
}

// ─── Analytics opt-out ────────────────────────────────────────

function AnalyticsSection() {
  // Read + write localStorage directly — Analytics already persists
  // via this key and reads it back on boot. Keeping UI decoupled
  // from the singleton's internal state avoids re-render races.
  const [optedOut, setOptedOut] = useState(() => localStorage.getItem('td_analytics_optout') === '1');
  const toggle = () => {
    const next = !optedOut;
    setOptedOut(next);
    Analytics.setEnabled(!next);
  };

  return (
    <div class="settings-block" style={{ marginTop: '16px' }}>
      <div class="ui-section-title">Analytics</div>
      <div class="text-dim text-sm mb-2">
        We collect anonymous gameplay events (mode, faction, difficulty, wave reached) to understand which features are being used. No personal data is sent. See the <a href="https://ahuge.github.io/tower_defence/privacy-policy.html" target="_blank" rel="noopener">privacy policy</a>.
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input type="checkbox" checked={optedOut} onChange={toggle} />
        <span>Opt out of anonymous telemetry</span>
      </label>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────

function AboutSection() {
  // `__GIT_SHA__` + `__BUILD_TIME__` are Vite-injected at build time
  // (see vite.config.ts `define` block + src/globals.d.ts for the
  // ambient declarations). No redeclare needed here.
  return (
    <div class="settings-block" style={{ marginTop: '16px' }}>
      <div class="ui-section-title">About</div>
      <div class="text-dim text-sm" style={{ lineHeight: 1.7 }}>
        <div><strong>Factions</strong> — Tower Defense</div>
        <div>Build: {__GIT_SHA__}</div>
        <div>Built: {__BUILD_TIME__}</div>
        <div>Developer: Running Man Games</div>
        <div>Contact: <a href="mailto:ahughesalex@gmail.com">ahughesalex@gmail.com</a></div>
      </div>
    </div>
  );
}
