/**
 * Simple analytics dashboard — served as HTML by the Worker.
 * Fetches from /api/analytics/summary and displays charts.
 */

export function getDashboardHTML(baseUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Tower Defence Analytics</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #ccc; font-family: monospace; padding: 20px; }
    h1 { color: #fff; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #111118; border: 1px solid #333; border-radius: 6px; padding: 16px; }
    .card h2 { color: #ffaa44; font-size: 14px; margin-bottom: 12px; }
    .stat { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1a1a22; }
    .stat:last-child { border-bottom: none; }
    .stat .label { color: #888; }
    .stat .value { color: #fff; font-weight: bold; }
    .stat .value.green { color: #44ff44; }
    .stat .value.red { color: #ff4444; }
    .stat .value.yellow { color: #ffaa44; }
    .bar-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
    .bar-label { width: 100px; color: #888; font-size: 12px; text-align: right; }
    .bar-track { flex: 1; height: 16px; background: #1a1a22; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .bar-value { width: 40px; font-size: 12px; color: #aaa; }
    .refresh { background: #222; border: 1px solid #444; color: #ccc; padding: 6px 14px;
               border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 12px; }
    .refresh:hover { background: #333; }
    .error { color: #ff4444; padding: 12px; }
    .loading { color: #666; padding: 12px; }
    .timestamp { color: #555; font-size: 11px; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: #888; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #333; }
    td { padding: 6px 8px; border-bottom: 1px solid #1a1a22; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Tower Defence Analytics</h1>
  <p class="subtitle">
    <button class="refresh" onclick="load()">Refresh</button>
    <span id="last-update" class="timestamp"></span>
  </p>

  <div id="content"><p class="loading">Loading...</p></div>

  <script>
    const API = '${baseUrl}';

    async function load() {
      const el = document.getElementById('content');
      try {
        const res = await fetch(API + '/api/analytics/summary');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        render(data);
        document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
      } catch (e) {
        el.innerHTML = '<p class="error">Failed to load: ' + e.message + '</p>';
      }
    }

    function render(data) {
      const el = document.getElementById('content');
      const s = data.summary || {};
      const factions = data.factions || {};

      // Sort factions by count
      const factionEntries = Object.entries(factions).sort((a, b) => b[1] - a[1]);
      const maxFaction = factionEntries.length > 0 ? factionEntries[0][1] : 1;

      const factionColors = {
        arcane: '#8866ff', mechanical: '#bbaa44', nature: '#44aa44', void: '#dd44ff',
        military: '#556b2f', aliens: '#66ee33', cypherpunk: '#22ddaa', infernal: '#ff4422',
        celestial: '#ffeeaa', psionic: '#aa44ee', harmonic: '#44aaff', random: '#ff44ff',
      };

      let html = '<div class="grid">';

      // Overview card
      html += '<div class="card"><h2>Today</h2>';
      html += stat('Games Started', s.game_start?.today ?? 0, 'green');
      html += stat('Games Ended', s.game_end?.today ?? 0);
      html += stat('Multiplayer', s.multiplayer_start?.today ?? 0, 'yellow');
      html += stat('Faction Picks', s.faction_pick?.today ?? 0);
      html += '</div>';

      // Yesterday card
      html += '<div class="card"><h2>Yesterday</h2>';
      html += stat('Games Started', s.game_start?.yesterday ?? 0);
      html += stat('Games Ended', s.game_end?.yesterday ?? 0);
      html += stat('Multiplayer', s.multiplayer_start?.yesterday ?? 0);
      html += stat('Faction Picks', s.faction_pick?.yesterday ?? 0);
      html += '</div>';

      html += '</div>';

      // Faction popularity
      if (factionEntries.length > 0) {
        html += '<div class="card"><h2>Faction Popularity (Today)</h2>';
        for (const [faction, count] of factionEntries) {
          const pct = Math.round((count / maxFaction) * 100);
          const color = factionColors[faction] || '#888';
          html += '<div class="bar-row">';
          html += '<span class="bar-label">' + faction + '</span>';
          html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
          html += '<span class="bar-value">' + count + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      el.innerHTML = html;
    }

    function stat(label, value, colorClass) {
      const cls = colorClass ? ' ' + colorClass : '';
      return '<div class="stat"><span class="label">' + label + '</span><span class="value' + cls + '">' + value + '</span></div>';
    }

    load();
    // Auto-refresh every 30s
    setInterval(load, 30000);
  </script>
</body>
</html>`;
}
