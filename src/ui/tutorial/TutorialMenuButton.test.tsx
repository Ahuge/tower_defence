/**
 * Spec for the "?" menu help button.
 *
 * Plan 4 reshaped this from a track-list-only modal into a 6-card
 * carousel by default with a switch-to-track-list view. Tests cover:
 *   - ? button renders with the correct data-tutorial-target anchor
 *     (the skip-hint track targets it, so it has to stay reachable)
 *   - Default view is the "How To Play" carousel
 *   - "All Tutorials →" switches to the track list
 *   - Track list lists every track + checkmarks for completed
 *   - Clicking a track routes to the right launch helper
 *   - Skip-all-faction-briefs checkbox toggles persistence
 *   - Backdrop + Close dismiss
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/preact';

const mocks = vi.hoisted(() => ({
  tracks: [
    { id: 'basics', name: 'Welcome Tour', summary: 'Walk through how the genre works.', steps: [] },
    { id: 'tutorial_match', name: 'Tutorial Match', summary: 'A scripted round.', steps: [] },
    { id: 'multiplayer', name: 'Online Play', summary: 'P2P modes.', steps: [] },
  ],
  completed: new Set<string>(),
  replay: vi.fn(),
  launchTutorialMatch: vi.fn(),
  launchFTG: vi.fn(),
  launchEconomyTutorial: vi.fn(),
  launchVsCpuTutorial: vi.fn(),
  briefsSkipped: false,
  setBriefsSkipped: vi.fn(),
}));

vi.mock('../../systems/Tutorial/TutorialTracks', () => ({
  getHelpMenuTracks: () => mocks.tracks,
}));

vi.mock('../../systems/Tutorial/TutorialManager', () => ({
  TutorialManager: {
    isCompleted: (id: string) => mocks.completed.has(id),
    replay: mocks.replay,
    launchTutorialMatch: mocks.launchTutorialMatch,
    launchFTG: mocks.launchFTG,
    launchEconomyTutorial: mocks.launchEconomyTutorial,
    launchVsCpuTutorial: mocks.launchVsCpuTutorial,
  },
}));

vi.mock('../../systems/Tutorial/TutorialPersistence', () => ({
  TutorialPersistence: {
    isFactionBriefsSkipped: () => mocks.briefsSkipped,
    setFactionBriefsSkipped: (v: boolean) => { mocks.briefsSkipped = v; mocks.setBriefsSkipped(v); },
  },
}));

import { TutorialMenuButton } from './TutorialMenuButton';

beforeEach(() => {
  mocks.completed.clear();
  mocks.replay.mockReset();
  mocks.launchTutorialMatch.mockReset();
  mocks.launchFTG.mockReset();
  mocks.launchEconomyTutorial.mockReset();
  mocks.launchVsCpuTutorial.mockReset();
  mocks.briefsSkipped = false;
  mocks.setBriefsSkipped.mockReset();
});

afterEach(() => {
  cleanup();
});

const openModal = () => fireEvent.click(screen.getByRole('button', { name: '?' }));
const switchToTracks = () => fireEvent.click(screen.getByRole('button', { name: 'All Tutorials →' }));

describe('TutorialMenuButton — trigger button', () => {
  it('renders a "?" button with tutorials-help-btn data attr', () => {
    render(<TutorialMenuButton />);
    const btn = screen.getByRole('button', { name: '?' });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('data-tutorial-target')).toBe('tutorials-help-btn');
  });

  it('is not open by default', () => {
    render(<TutorialMenuButton />);
    expect(screen.queryByText('How To Play')).toBeNull();
  });
});

describe('TutorialMenuButton — carousel default view', () => {
  it('opens to the "How To Play" carousel', () => {
    render(<TutorialMenuButton />);
    openModal();
    expect(screen.getByText('How To Play')).toBeInTheDocument();
    // First card is "Mazing".
    expect(screen.getByText('Mazing')).toBeInTheDocument();
  });

  it('Next/Back buttons cycle the cards', () => {
    render(<TutorialMenuButton />);
    openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.getByText('Income')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByText('Mazing')).toBeInTheDocument();
  });

  it('portals into document.body', () => {
    const { container } = render(<TutorialMenuButton />);
    openModal();
    const heading = screen.getByText('How To Play');
    expect(container.contains(heading)).toBe(false);
  });
});

describe('TutorialMenuButton — track list view', () => {
  it('switches via "All Tutorials →" and lists every track', () => {
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    for (const t of mocks.tracks) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByText(t.summary)).toBeInTheDocument();
    }
  });

  it('completed tracks show ✓', () => {
    mocks.completed.add('basics');
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    const basicsRow = screen.getByText('Welcome Tour').closest('button')!;
    expect(within(basicsRow).getByText('✓')).toBeInTheDocument();
  });

  it('uncompleted tracks show •', () => {
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    const row = screen.getByText('Online Play').closest('button')!;
    expect(within(row).getByText('•')).toBeInTheDocument();
  });

  it('clicking tutorial_match calls launchTutorialMatch', () => {
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    fireEvent.click(screen.getByText('Tutorial Match').closest('button')!);
    expect(mocks.launchTutorialMatch).toHaveBeenCalledOnce();
    expect(mocks.replay).not.toHaveBeenCalled();
  });

  it('clicking a non-launch track calls replay(id)', () => {
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    fireEvent.click(screen.getByText('Online Play').closest('button')!);
    expect(mocks.replay).toHaveBeenCalledWith('multiplayer');
  });
});

describe('TutorialMenuButton — skip-all-faction-briefs toggle', () => {
  it('reflects current state from TutorialPersistence', () => {
    mocks.briefsSkipped = true;
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    const checkbox = screen.getByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('toggling persists via setFactionBriefsSkipped', () => {
    render(<TutorialMenuButton />);
    openModal();
    switchToTracks();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mocks.setBriefsSkipped).toHaveBeenCalledWith(true);
  });
});

describe('TutorialMenuButton — dismiss', () => {
  it('Close button dismisses', () => {
    render(<TutorialMenuButton />);
    openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('How To Play')).toBeNull();
  });

  it('backdrop click dismisses', () => {
    render(<TutorialMenuButton />);
    openModal();
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>('div[style*="position: fixed"]'))
      .find(el => el.style.background?.includes('rgba(10'));
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.queryByText('How To Play')).toBeNull();
  });
});
