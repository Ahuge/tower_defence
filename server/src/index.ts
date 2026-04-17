/**
 * Factions Signaling Server — Cloudflare Worker entry point.
 *
 * Routes:
 *   POST   /api/rooms                → Create room
 *   POST   /api/rooms/:code/join     → Join room
 *   GET    /api/rooms/:code          → Room info
 *   DELETE /api/rooms/:code          → Close room (host)
 *   WS     /api/rooms/:code/signal   → WebSocket signaling
 *   POST   /api/analytics            → Game telemetry events
 *   GET    /api/analytics/summary    → Aggregated stats (admin)
 *   GET    /dashboard                → Analytics dashboard UI
 */
import { GameRoom } from './room';
import { getDashboardHTML } from './dashboard';
import { generateRoomCode, corsHeaders, json, error } from './utils';

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ANALYTICS: KVNamespace;
  CORS_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.CORS_ORIGIN || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const path = url.pathname;

    try {
      // ===================== Room Routes =====================

      // POST /api/rooms — create a new room
      if (request.method === 'POST' && path === '/api/rooms') {
        return await handleCreateRoom(request, env, origin);
      }

      // POST /api/rooms/:code/join — join an existing room
      const joinMatch = path.match(/^\/api\/rooms\/([A-Z0-9]{4})\/join$/);
      if (request.method === 'POST' && joinMatch) {
        return await forwardToRoom(env, joinMatch[1], request, '/join', origin);
      }

      // GET /api/rooms/:code — room info
      const infoMatch = path.match(/^\/api\/rooms\/([A-Z0-9]{4})$/);
      if (request.method === 'GET' && infoMatch) {
        return await forwardToRoom(env, infoMatch[1], request, '/info', origin);
      }

      // DELETE /api/rooms/:code — close room
      if (request.method === 'DELETE' && infoMatch) {
        return await forwardToRoom(env, infoMatch[1], request, '/', origin);
      }

      // WS /api/rooms/:code/signal — WebSocket signaling
      const signalMatch = path.match(/^\/api\/rooms\/([A-Z0-9]{4})\/signal$/);
      if (signalMatch) {
        return await forwardToRoom(env, signalMatch[1], request, '/signal' + url.search, origin);
      }

      // ===================== Analytics Routes =====================

      // POST /api/analytics — submit game telemetry
      if (request.method === 'POST' && path === '/api/analytics') {
        return await handleAnalytics(request, env, origin);
      }

      // GET /api/analytics/summary — get aggregated stats (cached 2 min)
      if (request.method === 'GET' && path === '/api/analytics/summary') {
        return await cachedResponse(request, () => handleAnalyticsSummary(env, origin), 120);
      }

      // GET /api/analytics/history — last 30 days time series (cached 5 min)
      if (request.method === 'GET' && path === '/api/analytics/history') {
        return await cachedResponse(request, () => handleAnalyticsHistory(env, origin), 300);
      }

      // ===================== Health =====================

      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: Date.now() }, 200, origin);
      }

      // Dashboard UI
      if (path === '/dashboard' || path === '/') {
        const proto = request.headers.get('x-forwarded-proto') ?? 'https';
        const host = request.headers.get('host') ?? url.host;
        const baseUrl = `${proto}://${host}`;
        return new Response(getDashboardHTML(baseUrl), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return error('Not found', 404, origin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Internal error';
      return error(msg, 500, origin);
    }
  },
};

// ===================== Response Caching =====================

/** Cache GET responses using Cloudflare Cache API to reduce KV reads */
async function cachedResponse(request: Request, handler: () => Promise<Response>, ttlSeconds: number): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const response = await handler();
  const cacheable = new Response(response.body, response);
  cacheable.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  // Don't await — cache in background
  cache.put(cacheKey, cacheable.clone());
  return cacheable;
}

// ===================== Room Handlers =====================

async function handleCreateRoom(request: Request, env: Env, origin: string): Promise<Response> {
  const body = await request.json() as { mode?: string; maxPlayers?: number };

  // Generate unique room code (retry on collision)
  let code: string;
  let attempts = 0;
  do {
    code = generateRoomCode();
    attempts++;
    if (attempts > 10) return error('Could not generate unique room code', 500, origin);
  } while (false); // Durable Objects use code as ID — collisions are effectively impossible for 4 chars

  // Forward to Durable Object
  const roomId = env.GAME_ROOM.idFromName(code);
  const room = env.GAME_ROOM.get(roomId);

  const internalReq = new Request('https://internal/create', {
    method: 'POST',
    body: JSON.stringify({ ...body, code }),
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await room.fetch(internalReq);
  const data = await res.json();

  return json(data, res.status, origin);
}

async function forwardToRoom(
  env: Env, code: string, request: Request, path: string, origin: string,
): Promise<Response> {
  const roomId = env.GAME_ROOM.idFromName(code);
  const room = env.GAME_ROOM.get(roomId);

  const internalUrl = `https://internal${path}`;
  const internalReq = new Request(internalUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const res = await room.fetch(internalReq);

  // For WebSocket upgrades, return directly
  if (res.webSocket) {
    return new Response(null, { status: 101, webSocket: res.webSocket });
  }

  // For JSON responses, add CORS headers
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// ===================== Analytics =====================

/**
 * Analytics event schema — flexible key-value telemetry.
 * Events are bucketed by day and type for aggregation.
 *
 * Example events:
 *   { type: 'game_start', mode: 'standard', faction: 'arcane', difficulty: 'normal', map: 'plains' }
 *   { type: 'game_end', mode: 'hero_defense', result: 'victory', wave: 30, duration: 1200 }
 *   { type: 'multiplayer_start', mode: 'versus', players: 2 }
 *   { type: 'faction_pick', faction: 'mechanical' }
 */
interface AnalyticsEvent {
  type: string;
  [key: string]: string | number | boolean;
}

async function handleAnalytics(request: Request, env: Env, origin: string): Promise<Response> {
  const body = await request.json() as AnalyticsEvent | AnalyticsEvent[];
  const events = Array.isArray(body) ? body : [body];

  if (events.length === 0 || events.length > 50) {
    return error('Expected 1-50 events', 400, origin);
  }

  const day = new Date().toISOString().split('T')[0];

  // Capture geo data from Cloudflare's cf object
  const cf = (request as any).cf as { country?: string; city?: string; continent?: string; latitude?: string; longitude?: string } | undefined;
  if (cf?.country) {
    const geoKey = `geo:${day}:${cf.country}`;
    const geoCount = parseInt(await env.ANALYTICS.get(geoKey) ?? '0');
    await env.ANALYTICS.put(geoKey, String(geoCount + 1), { expirationTtl: 365 * 86400 });
    // All-time country total
    const geoTotalKey = `geo_total:${cf.country}`;
    const geoTotal = parseInt(await env.ANALYTICS.get(geoTotalKey) ?? '0');
    await env.ANALYTICS.put(geoTotalKey, String(geoTotal + 1));
  }

  for (const event of events) {
    if (!event.type) continue;

    // Store individual event with timestamp
    const eventKey = `event:${day}:${event.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.ANALYTICS.put(eventKey, JSON.stringify({
      ...event,
      timestamp: Date.now(),
    }), { expirationTtl: 90 * 86400 }); // 90 day retention

    // Increment daily counter for this event type
    const counterKey = `count:${day}:${event.type}`;
    const current = parseInt(await env.ANALYTICS.get(counterKey) ?? '0');
    await env.ANALYTICS.put(counterKey, String(current + 1), { expirationTtl: 365 * 86400 });

    // Increment all-time counter
    const totalKey = `total:${event.type}`;
    const totalCurrent = parseInt(await env.ANALYTICS.get(totalKey) ?? '0');
    await env.ANALYTICS.put(totalKey, String(totalCurrent + 1));

    // Increment per-value counters for important dimensions
    for (const dim of ['faction', 'mode', 'difficulty', 'map', 'result']) {
      if (event[dim] !== undefined) {
        const dimKey = `dim:${day}:${event.type}:${dim}:${event[dim]}`;
        const dimCount = parseInt(await env.ANALYTICS.get(dimKey) ?? '0');
        await env.ANALYTICS.put(dimKey, String(dimCount + 1), { expirationTtl: 365 * 86400 });
      }
    }
  }

  return json({ accepted: events.length }, 200, origin);
}

async function handleAnalyticsSummary(env: Env, origin: string): Promise<Response> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Gather daily counts for common event types
  const eventTypes = ['game_start', 'game_end', 'multiplayer_start', 'faction_pick'];
  const summary: Record<string, Record<string, number>> = {};

  for (const type of eventTypes) {
    summary[type] = {
      today: parseInt(await env.ANALYTICS.get(`count:${today}:${type}`) ?? '0'),
      yesterday: parseInt(await env.ANALYTICS.get(`count:${yesterday}:${type}`) ?? '0'),
    };
  }

  // Dimension breakdowns for today
  const dimensions: Record<string, Record<string, number>> = {};
  const dimQueries = [
    { prefix: `dim:${today}:faction_pick:faction:`, key: 'factions' },
    { prefix: `dim:${today}:game_start:mode:`, key: 'modes' },
    { prefix: `dim:${today}:game_start:difficulty:`, key: 'difficulties' },
    { prefix: `dim:${today}:game_start:map:`, key: 'maps' },
    { prefix: `dim:${today}:game_end:result:`, key: 'results' },
  ];

  for (const q of dimQueries) {
    const list = await env.ANALYTICS.list({ prefix: q.prefix });
    const dim: Record<string, number> = {};
    for (const k of list.keys) {
      const val = k.name.split(':').pop()!;
      dim[val] = parseInt(await env.ANALYTICS.get(k.name) ?? '0');
    }
    dimensions[q.key] = dim;
  }

  // All-time totals
  const totals: Record<string, number> = {};
  for (const type of eventTypes) {
    totals[type] = parseInt(await env.ANALYTICS.get(`total:${type}`) ?? '0');
  }

  // Geo data — all-time country counts
  const geoList = await env.ANALYTICS.list({ prefix: 'geo_total:' });
  const geo: Record<string, number> = {};
  for (const k of geoList.keys) {
    const country = k.name.replace('geo_total:', '');
    geo[country] = parseInt(await env.ANALYTICS.get(k.name) ?? '0');
  }

  return json({ date: today, summary, totals, geo, ...dimensions }, 200, origin);
}

async function handleAnalyticsHistory(env: Env, origin: string): Promise<Response> {
  const url = new URL('https://dummy');
  const days = 30; // Fixed 30 days — keeps KV reads manageable

  const eventTypes = ['game_start', 'game_end', 'multiplayer_start', 'faction_pick'];
  const modes = ['standard', 'hero_defense', 'battle', 'marathon', 'sprint', 'circle_coop'];
  const allKeys: string[] = [];
  const dates: string[] = [];

  // Build all KV keys we need
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    dates.push(date);
    for (const type of eventTypes) allKeys.push(`count:${date}:${type}`);
    for (const mode of modes) allKeys.push(`dim:${date}:game_start:mode:${mode}`);
  }

  // Batch fetch all keys (KV supports getWithMetadata but not batch get,
  // so we parallelize with Promise.all in chunks)
  const CHUNK = 50;
  const values = new Map<string, number>();
  for (let i = 0; i < allKeys.length; i += CHUNK) {
    const chunk = allKeys.slice(i, i + CHUNK);
    const results = await Promise.all(chunk.map(k => env.ANALYTICS.get(k)));
    for (let j = 0; j < chunk.length; j++) {
      values.set(chunk[j], parseInt(results[j] ?? '0'));
    }
  }

  // Build series from cached values
  const series: Record<string, { date: string; count: number }[]> = {};
  for (const type of eventTypes) series[type] = [];
  for (const mode of modes) series[`mode_${mode}`] = [];

  for (const date of dates) {
    for (const type of eventTypes) {
      series[type].push({ date, count: values.get(`count:${date}:${type}`) ?? 0 });
    }
    for (const mode of modes) {
      series[`mode_${mode}`].push({ date, count: values.get(`dim:${date}:game_start:mode:${mode}`) ?? 0 });
    }
  }

  return json({ days, series }, 200, origin);
}
