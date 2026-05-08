import * as Phaser from 'phaser';
/**
 * UIBridge — connects the DOM UI layer (Preact) with the Phaser game.
 * Screens with data use screenData to pass props through the bridge.
 */
import { render } from 'preact';
import { App } from './App';
import './styles/ui.css';

export type ScreenId = 'menu' | 'store' | 'battlepass' | 'inventory' | 'factionselect' | 'heroselect' | 'creepfactionselect' | 'draft' | 'gauntletpreview' | 'gameover' | 'changelog' | 'leaderboard' | 'encyclopedia' | 'settings' | 'lobby' | 'circle-lobby' | 'capture-campaign' | null;

export interface LoadingData {
  faction: string | null;
  map: string | null;
  difficulty: string;
  mode: string;
  waveCount?: number;
}

class UIBridgeClass {
  private root: HTMLElement | null = null;
  private game: Phaser.Game | null = null;
  private currentScreen: ScreenId = null;
  private currentData: Record<string, unknown> = {};
  private listeners: Array<(screen: ScreenId, data: Record<string, unknown>) => void> = [];
  private _loading: LoadingData | null = null;
  private _loadingListeners: Array<(data: LoadingData | null) => void> = [];

  init(game: Phaser.Game): void {
    this.game = game;
    this.root = document.getElementById('ui-root');
    if (!this.root) { console.error('UIBridge: #ui-root not found'); return; }
    render(<App />, this.root);
  }

  show(screen: ScreenId, data: Record<string, unknown> = {}): void {
    this.currentScreen = screen;
    this.currentData = data;
    if (this.root) this.root.classList.add('active');
    this.notifyListeners();
  }

  hide(): void {
    this.currentScreen = null;
    this.currentData = {};
    if (this.root) this.root.classList.remove('active');
    this.notifyListeners();
  }

  getScreen(): ScreenId { return this.currentScreen; }
  getData(): Record<string, unknown> { return this.currentData; }

  startScene(sceneName: string, data?: Record<string, unknown>): void {
    // Show loading screen for game scene transitions
    if (sceneName === 'GameScene' && data) {
      this._loading = {
        faction: (data.faction as string) ?? null,
        map: (data.map as string) ?? null,
        difficulty: (data.difficulty as string) ?? 'normal',
        mode: (data.mode as string) ?? 'standard',
        waveCount: data.waveCount as number | undefined,
      };
      for (const fn of this._loadingListeners) fn(this._loading);
    }
    this.hide();
    if (this.game) {
      for (const s of this.game.scene.getScenes(true)) this.game.scene.stop(s);
      this.game.scene.start(sceneName, data);
    }
  }

  /** Called by GameScene when create() finishes — triggers loading screen fade-out.
   *  Does NOT clear loading state — the LoadingScreen component manages its own
   *  lifecycle (min time, fade-out) and calls clearLoading() when fully dismissed. */
  signalSceneReady(): void {
    window.dispatchEvent(new Event('game-scene-ready'));
  }

  /** Called by LoadingScreen when it has fully faded out and is ready to unmount */
  clearLoading(): void {
    this._loading = null;
    for (const fn of this._loadingListeners) fn(null);
  }

  getLoading(): LoadingData | null { return this._loading; }

  onLoadingChange(fn: (data: LoadingData | null) => void): () => void {
    this._loadingListeners.push(fn);
    return () => { this._loadingListeners = this._loadingListeners.filter(l => l !== fn); };
  }

  private stopPhaserAndShow(screen: ScreenId, data: Record<string, unknown> = {}): void {
    if (this.game) {
      for (const s of this.game.scene.getScenes(true)) this.game.scene.stop(s);
    }
    this.show(screen, data);
  }

  showMenu(): void { this.stopPhaserAndShow('menu'); }
  showStore(): void { this.show('store'); }
  showBattlePass(): void { this.show('battlepass'); }
  showFactionSelect(data: Record<string, unknown>): void { this.show('factionselect', data); }
  showDraft(data: Record<string, unknown>): void { this.show('draft', data); }
  showGameOver(data: Record<string, unknown>): void { this.stopPhaserAndShow('gameover', data); }

  onScreenChange(fn: (screen: ScreenId, data: Record<string, unknown>) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) fn(this.currentScreen, this.currentData);
  }

  getGame(): Phaser.Game | null { return this.game; }
}

export const UIBridge = new UIBridgeClass();
