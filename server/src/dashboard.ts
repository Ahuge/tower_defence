/**
 * Analytics dashboard — served as HTML by the Worker.
 * Fetches from /api/analytics/summary + /api/analytics/history.
 * Canvas-based line charts with configurable time ranges.
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
    body { background: #0a0a0f; color: #ccc; font-family: monospace; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 4px; }
    h2 { color: #ffaa44; font-size: 14px; margin-bottom: 12px; }
    .subtitle { color: #666; margin-bottom: 20px; font-size: 13px; display: flex; align-items: center; gap: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card { background: #111118; border: 1px solid #252530; border-radius: 6px; padding: 14px; }
    .stat { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1a1a22; font-size: 13px; }
    .stat:last-child { border-bottom: none; }
    .stat .label { color: #777; }
    .stat .value { color: #fff; }
    .stat .value.g { color: #44ff44; }
    .stat .value.y { color: #ffaa44; }
    .bar-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
    .bar-label { width: 90px; color: #777; font-size: 11px; text-align: right; }
    .bar-track { flex: 1; height: 14px; background: #1a1a22; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .bar-value { width: 32px; font-size: 11px; color: #999; }
    .btn { background: #1a1a22; border: 1px solid #333; color: #ccc; padding: 5px 12px;
           border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 11px; }
    .btn:hover { background: #252530; }
    .btn.active { background: #333; color: #fff; border-color: #ffaa44; }
    .chart-wrap { background: #111118; border: 1px solid #252530; border-radius: 6px; padding: 14px; margin-bottom: 16px; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .range-btns { display: flex; gap: 4px; }
    canvas { width: 100%; height: 200px; display: block; }
    .legend { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #888; }
    .legend-dot { width: 10px; height: 10px; border-radius: 2px; }
    .loading { color: #555; padding: 20px; text-align: center; }
    .error { color: #ff4444; padding: 12px; }
    .timestamp { color: #555; font-size: 11px; }
    .section-title { color: #888; font-size: 12px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <h1>Tower Defence Analytics</h1>
  <div class="subtitle">
    <button class="btn" onclick="loadAll()">Refresh</button>
    <span id="last-update" class="timestamp"></span>
  </div>

  <div id="charts"><p class="loading">Loading charts...</p></div>
  <div id="summary"><p class="loading">Loading summary...</p></div>

  <script>
    const API = '${baseUrl}';
    let historyData = null;
    let currentRange = 7;

    const COLORS = {
      game_start: '#44ff44',
      game_end: '#ff6644',
      multiplayer_start: '#ffaa44',
      faction_pick: '#44aaff',
    };
    const LABELS = {
      game_start: 'Games Started',
      game_end: 'Games Ended',
      multiplayer_start: 'Multiplayer',
      faction_pick: 'Faction Picks',
    };
    const FACTION_COLORS = {
      arcane: '#8866ff', mechanical: '#bbaa44', nature: '#44aa44', void: '#dd44ff',
      military: '#556b2f', aliens: '#66ee33', cypherpunk: '#22ddaa', infernal: '#ff4422',
      celestial: '#ffeeaa', psionic: '#aa44ee', harmonic: '#44aaff', random: '#ff44ff',
    };

    async function loadAll() {
      await Promise.all([loadSummary(), loadHistory()]);
      document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
    }

    async function loadSummary() {
      const el = document.getElementById('summary');
      try {
        const res = await fetch(API + '/api/analytics/summary');
        const data = await res.json();
        renderSummary(data);
      } catch (e) { el.innerHTML = '<p class="error">Failed: ' + e.message + '</p>'; }
    }

    async function loadHistory() {
      const el = document.getElementById('charts');
      try {
        const res = await fetch(API + '/api/analytics/history');
        historyData = await res.json();
        renderCharts();
      } catch (e) { el.innerHTML = '<p class="error">Failed: ' + e.message + '</p>'; }
    }

    function setRange(days) {
      currentRange = days;
      document.querySelectorAll('.range-btns .btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.days) === days);
      });
      renderCharts();
    }

    const MODE_COLORS = {
      mode_standard: '#44ff44', mode_hero_defense: '#ff44aa', mode_battle: '#ffaa44',
      mode_marathon: '#4488ff', mode_sprint: '#88ff88', mode_circle_coop: '#aa44ff',
    };
    const MODE_LABELS = {
      mode_standard: 'Standard', mode_hero_defense: 'Hero Defense', mode_battle: 'Battle',
      mode_marathon: 'Marathon', mode_sprint: 'Sprint', mode_circle_coop: 'Circle Co-op',
    };

    function renderCharts() {
      if (!historyData) return;
      const el = document.getElementById('charts');
      const ranges = [7, 14, 30];

      let rangeHtml = '<div class="range-btns">';
      for (const r of ranges) {
        rangeHtml += '<button class="btn' + (r === currentRange ? ' active' : '') + '" data-days="' + r + '" onclick="setRange(' + r + ')">' + r + 'd</button>';
      }
      rangeHtml += '</div>';

      let html = '<div class="chart-wrap">';
      html += '<div class="chart-header"><h2>Activity Over Time</h2>' + rangeHtml + '</div>';
      html += '<canvas id="chart" height="200"></canvas>';
      html += '<div class="legend">';
      for (const [key, label] of Object.entries(LABELS)) {
        html += '<div class="legend-item"><div class="legend-dot" style="background:' + COLORS[key] + '"></div>' + label + '</div>';
      }
      html += '</div></div>';

      // Game modes chart
      html += '<div class="chart-wrap">';
      html += '<div class="chart-header"><h2>Game Modes Over Time</h2></div>';
      html += '<canvas id="chart-modes" height="200"></canvas>';
      html += '<div class="legend">';
      for (const [key, label] of Object.entries(MODE_LABELS)) {
        html += '<div class="legend-item"><div class="legend-dot" style="background:' + MODE_COLORS[key] + '"></div>' + label + '</div>';
      }
      html += '</div></div>';

      el.innerHTML = html;
      requestAnimationFrame(() => {
        drawLineChart('chart', Object.keys(LABELS), COLORS);
        drawLineChart('chart-modes', Object.keys(MODE_LABELS), MODE_COLORS);
      });
    }

    function drawLineChart(canvasId, seriesKeys, colorMap) {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !historyData) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const W = rect.width, H = rect.height;

      const pad = { top: 10, right: 10, bottom: 28, left: 40 };
      const cW = W - pad.left - pad.right;
      const cH = H - pad.top - pad.bottom;

      const allSeries = historyData.series;

      // Find max value across selected series in range
      let maxVal = 1;
      for (const key of seriesKeys) {
        if (!allSeries[key]) continue;
        const points = allSeries[key].slice(-currentRange);
        for (const p of points) maxVal = Math.max(maxVal, p.count);
      }
      maxVal = Math.ceil(maxVal / 5) * 5 || 5;

      // Background
      ctx.fillStyle = '#111118';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + cH - (i / 4) * cH;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#555';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(maxVal * i / 4)), pad.left - 4, y + 3);
      }

      // X-axis labels — use first available series for dates
      const firstKey = seriesKeys.find(k => allSeries[k]?.length > 0);
      if (!firstKey) return;
      const samplePoints = allSeries[firstKey].slice(-currentRange);
      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const labelEvery = currentRange <= 14 ? 1 : currentRange <= 30 ? 3 : 7;
      for (let i = 0; i < samplePoints.length; i++) {
        if (i % labelEvery !== 0 && i !== samplePoints.length - 1) continue;
        const x = pad.left + (i / (samplePoints.length - 1 || 1)) * cW;
        ctx.fillText(samplePoints[i].date.slice(5), x, H - 6);
      }

      // Draw lines
      for (const key of seriesKeys) {
        if (!allSeries[key]) continue;
        const points = allSeries[key].slice(-currentRange);
        if (points.length < 2) continue;
        ctx.strokeStyle = colorMap[key] || '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const x = pad.left + (i / (points.length - 1)) * cW;
          const y = pad.top + cH - (points[i].count / maxVal) * cH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = colorMap[key] || '#888';
        for (let i = 0; i < points.length; i++) {
          const x = pad.left + (i / (points.length - 1)) * cW;
          const y = pad.top + cH - (points[i].count / maxVal) * cH;
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function renderSummary(data) {
      const el = document.getElementById('summary');
      const s = data.summary || {};
      const factions = data.factions || {};
      const modes = data.modes || {};
      const difficulties = data.difficulties || {};
      const maps = data.maps || {};
      const results = data.results || {};
      const totals = data.totals || {};
      const geo = data.geo || {};

      let html = '<div class="grid">';

      // All-time totals card
      html += '<div class="card"><h2>All Time</h2>';
      html += stat('Total Games', totals.game_start ?? 0, 'g');
      html += stat('Games Completed', totals.game_end ?? 0);
      html += stat('Multiplayer Sessions', totals.multiplayer_start ?? 0, 'y');
      html += stat('Countries', Object.keys(geo).length, 'y');
      html += '</div>';

      // Today card
      html += '<div class="card"><h2>Today</h2>';
      html += stat('Games Started', s.game_start?.today ?? 0, 'g');
      html += stat('Games Ended', s.game_end?.today ?? 0);
      html += stat('Multiplayer', s.multiplayer_start?.today ?? 0, 'y');
      html += stat('Faction Picks', s.faction_pick?.today ?? 0);
      const wins = results.victory ?? 0, losses = results.defeat ?? 0;
      const total = wins + losses;
      html += stat('Win Rate', total > 0 ? Math.round(wins / total * 100) + '%' : '—', 'g');
      html += '</div>';

      // Yesterday card
      html += '<div class="card"><h2>Yesterday</h2>';
      html += stat('Games Started', s.game_start?.yesterday ?? 0);
      html += stat('Games Ended', s.game_end?.yesterday ?? 0);
      html += stat('Multiplayer', s.multiplayer_start?.yesterday ?? 0);
      html += stat('Faction Picks', s.faction_pick?.yesterday ?? 0);
      html += '</div>';

      html += '</div>';

      // Breakdowns
      html += '<p class="section-title">Todays Breakdowns</p>';
      html += '<div class="grid">';
      html += barCard('Factions', factions, FACTION_COLORS);
      html += barCard('Game Modes', modes, { standard: '#44ff44', hero_defense: '#ff44aa', battle: '#ffaa44', marathon: '#4488ff', sprint: '#88ff88', circle_coop: '#aa44ff' });
      html += barCard('Difficulty', difficulties, { easy: '#44ff44', normal: '#ffaa44', hard: '#ff4444', insane: '#ff00ff' });
      html += barCard('Maps', maps, {});
      html += '</div>';

      // Geo section
      const geoEntries = Object.entries(geo).sort((a, b) => b[1] - a[1]);
      if (geoEntries.length > 0) {
        html += '<p class="section-title">Player Locations (All Time)</p>';
        html += '<div class="grid">';

        // Country bar chart
        html += barCard('Countries', geo, {});

        // World map visualization
        html += '<div class="card"><h2>World Map</h2>';
        html += '<canvas id="geomap" height="260" style="width:100%;height:260px;"></canvas>';
        html += '</div>';
        html += '</div>';
      }

      el.innerHTML = html;

      // Draw geo map after DOM update
      if (geoEntries.length > 0) {
        requestAnimationFrame(() => drawGeoMap(geo));
      }
    }

    function stat(label, value, cls) {
      return '<div class="stat"><span class="label">' + label + '</span><span class="value' + (cls ? ' ' + cls : '') + '">' + value + '</span></div>';
    }

    function barCard(title, data, colors) {
      const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return '';
      const max = entries[0][1] || 1;
      let html = '<div class="card"><h2>' + title + '</h2>';
      for (const [key, count] of entries) {
        const pct = Math.round((count / max) * 100);
        const color = colors[key] || '#666';
        html += '<div class="bar-row">';
        html += '<span class="bar-label">' + key + '</span>';
        html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
        html += '<span class="bar-value">' + count + '</span>';
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    // Country centroids (ISO 2-letter → [lat, lon]) — major countries
    const COUNTRY_POS = {
      US:[39,-98],CA:[56,-106],MX:[23,-102],BR:[-14,-51],AR:[-38,-63],CL:[-35,-71],CO:[4,-72],PE:[-9,-75],
      GB:[54,-2],FR:[46,2],DE:[51,10],ES:[40,-4],IT:[42,12],NL:[52,5],BE:[50,4],SE:[62,15],NO:[62,10],
      FI:[64,26],DK:[56,10],PL:[52,20],CZ:[49,15],AT:[47,14],CH:[47,8],PT:[39,-8],IE:[53,-8],
      RU:[61,105],UA:[49,32],RO:[46,25],HU:[47,20],GR:[39,22],BG:[43,25],HR:[45,16],RS:[44,21],
      TR:[39,35],IL:[31,35],SA:[24,45],AE:[24,54],IN:[20,77],CN:[35,105],JP:[36,138],KR:[36,128],
      TW:[23,121],TH:[15,101],VN:[14,108],PH:[12,122],ID:[-5,120],MY:[4,109],SG:[1,104],
      AU:[-25,134],NZ:[-41,174],ZA:[-30,22],NG:[10,8],KE:[-1,38],EG:[27,30],MA:[32,-5],
      PK:[30,69],BD:[24,90],LK:[7,81],NP:[28,84],MM:[19,96],KH:[13,105],
    };

    function drawGeoMap(geo) {
      const canvas = document.getElementById('geomap');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const W = rect.width, H = rect.height;

      // Background
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, W, H);

      // Simple world outline (continental blobs)
      ctx.fillStyle = '#181822';
      // Rough continent shapes as rectangles
      const continents = [
        [0.1,0.1,0.15,0.25],  // North America
        [0.15,0.35,0.1,0.25], // South America
        [0.42,0.08,0.15,0.35],// Europe+Africa
        [0.58,0.05,0.25,0.35],// Asia
        [0.75,0.55,0.12,0.15],// Australia
      ];
      for (const [rx,ry,rw,rh] of continents) {
        ctx.fillRect(rx*W, ry*H, rw*W, rh*H);
      }

      // Convert lat/lon to screen coords (simple equirectangular)
      function toScreen(lat, lon) {
        const x = ((lon + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        return [x, y];
      }

      // Find max for scaling
      const entries = Object.entries(geo);
      const maxCount = Math.max(...entries.map(e => e[1]), 1);

      // Draw dots
      for (const [code, count] of entries) {
        const pos = COUNTRY_POS[code];
        if (!pos) continue;
        const [x, y] = toScreen(pos[0], pos[1]);
        const radius = 3 + (count / maxCount) * 12;
        const alpha = 0.4 + (count / maxCount) * 0.6;

        // Glow
        ctx.fillStyle = 'rgba(68, 255, 68, ' + (alpha * 0.3) + ')';
        ctx.beginPath(); ctx.arc(x, y, radius + 4, 0, Math.PI * 2); ctx.fill();

        // Dot
        ctx.fillStyle = 'rgba(68, 255, 68, ' + alpha + ')';
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

        // Label
        if (count > 0) {
          ctx.fillStyle = '#aaa';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(code, x, y - radius - 3);
        }
      }
    }

    loadAll();
    setInterval(loadAll, 60000);
    window.addEventListener('resize', () => { if (historyData) renderCharts(); });
  </script>
</body>
</html>`;
}
