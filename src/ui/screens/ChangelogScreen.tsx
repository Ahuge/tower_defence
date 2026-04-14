import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';

// Import the changelog entries from the Phaser scene's data
// For now, render a simple "back to menu" wrapper — the actual changelog content
// is loaded dynamically from the scene. We'll inline it here.

export function ChangelogScreen() {
  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title">CHANGELOG</div>
        <ShardBadge />
      </div>

      <div class="ui-section" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div class="text-dim text-sm text-center mb-2">
          See the full changelog on GitHub or in CHANGELOG.md
        </div>
        <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.8' }}>
          <p>The changelog is maintained in the repository. Use the Phaser version for the full rendered view, or check the CHANGELOG.md file directly.</p>
        </div>
        <div class="text-center mt-4">
          <button class="btn" onClick={() => UIBridge.startScene('ChangelogScene')}>
            Open Full Changelog (Phaser)
          </button>
        </div>
      </div>
    </>
  );
}
