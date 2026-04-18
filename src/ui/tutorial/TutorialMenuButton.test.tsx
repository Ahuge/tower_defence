/**
 * Spec for the "?" menu help button.
 *
 * Covers:
 *   - ? button renders with the correct data-tutorial-target anchor
 *     (the skip-hint track targets it, so it has to stay reachable)
 *   - Clicking opens the modal, portaled into document.body (not
 *     stuck inside the .ui-header stacking context)
 *   - Modal lists every track from getHelpMenuTracks()
 *   - Completed tracks show a ✓ bullet
 *   - Clicking tutorial_match routes through launchTutorialMatch so
 *     the GameScene boots before the track begins
 *   - Clicking any other track routes through replay(id)
 *   - Backdrop click + Close button dismiss the modal
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/preact';

// ─── Module mocks ──────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  tracks: [
    { id: 'basics', name: 'Welcome Tour', summary: 'What tower defence is.', steps: [] },
    { id: 'tutorial_match', name: 'Tutorial Match', summary: 'A scripted round.', steps: [] },
    { id: 'multiplayer', name: 'Online Play', summary: 'P2P modes.', steps: [] },
  ],
  completed: new Set<string>(),
  replay: vi.fn(),
  launchTutorialMatch: vi.fn(),
}));

vi.mock('../../systems/Tutorial/TutorialTracks', () => ({
  getHelpMenuTracks: () => mocks.tracks,
}));

vi.mock('../../systems/Tutorial/TutorialManager', () => ({
  TutorialManager: {
    isCompleted: (id: string) => mocks.completed.has(id),
    replay: mocks.replay,
    launchTutorialMatch: mocks.launchTutorialMatch,
  },
}));

import { TutorialMenuButton } from './TutorialMenuButton';

beforeEach(() => {
  mocks.completed.clear();
  mocks.replay.mockReset();
  mocks.launchTutorialMatch.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('TutorialMenuButton — trigger button', () => {
  it('renders a "?" button', () => {
    render(<TutorialMenuButton />);
    expect(screen.getByRole('button', { name: '?' })).toBeInTheDocument();
  });

  it('the button carries the tutorials-help-btn data attr (skip_hint targets it)', () => {
    render(<TutorialMenuButton />);
    const btn = screen.getByRole('button', { name: '?' });
    expect(btn.getAttribute('data-tutorial-target')).toBe('tutorials-help-btn');
  });

  it('is not open by default — no modal in the DOM', () => {
    render(<TutorialMenuButton />);
    expect(screen.queryByText('Tutorials')).toBeNull();
  });
});

describe('TutorialMenuButton — modal open/close', () => {
  it('clicking the ? opens the modal', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
  });

  it('modal portals into document.body (not nested under the button)', () => {
    const { container } = render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    // The modal heading exists in the body but NOT inside `container`
    // (the original render root). That's the portal contract.
    const heading = screen.getByText('Tutorials');
    expect(heading).toBeInTheDocument();
    expect(container.contains(heading)).toBe(false);
  });

  it('clicking Close dismisses the modal', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Tutorials')).toBeNull();
  });

  it('clicking the backdrop dismisses the modal', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));

    // The backdrop is the outermost fixed div — find via the scrim
    // color in inline style.
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>('div[style*="position: fixed"]'))
      .find(el => el.style.background?.includes('rgba(10'));
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.queryByText('Tutorials')).toBeNull();
  });
});

describe('TutorialMenuButton — track list', () => {
  it('lists every track returned by getHelpMenuTracks', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    for (const t of mocks.tracks) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
      expect(screen.getByText(t.summary)).toBeInTheDocument();
    }
  });

  it('completed tracks show the ✓ bullet', () => {
    mocks.completed.add('basics');
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    // Find the basics entry and look for a checkmark inside it.
    const basicsName = screen.getByText('Welcome Tour');
    const basicsRow = basicsName.closest('button')!;
    expect(within(basicsRow).getByText('✓')).toBeInTheDocument();
  });

  it('uncompleted tracks show a • bullet', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    const mpName = screen.getByText('Online Play');
    const row = mpName.closest('button')!;
    expect(within(row).getByText('•')).toBeInTheDocument();
  });
});

describe('TutorialMenuButton — track click routing', () => {
  it('clicking the tutorial_match row calls launchTutorialMatch', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    fireEvent.click(screen.getByText('Tutorial Match').closest('button')!);
    expect(mocks.launchTutorialMatch).toHaveBeenCalledOnce();
    expect(mocks.replay).not.toHaveBeenCalled();
  });

  it('clicking a non-match track calls replay(id)', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    fireEvent.click(screen.getByText('Welcome Tour').closest('button')!);
    expect(mocks.replay).toHaveBeenCalledWith('basics');
    expect(mocks.launchTutorialMatch).not.toHaveBeenCalled();
  });

  it('clicking a track dismisses the modal', () => {
    render(<TutorialMenuButton />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    fireEvent.click(screen.getByText('Online Play').closest('button')!);
    expect(screen.queryByText('Tutorials')).toBeNull();
  });
});
