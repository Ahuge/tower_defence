/**
 * Cloudflare Worker — Tower Defence Leaderboard
 *
 * KV namespace binding: SCORES
 * Keys:
 *   "leaderboard"  — JSON array of Score objects, sorted by wave desc, max 500
 *   "rate:{ip}"    — last-submit timestamp string, TTL 60s
 */

interface Env {
  SCORES: KVNamespace;
}

interface Score {
  id: string;
  name: string;
  wave: number;
  faction: string;
  difficulty: string;
  mode: string;
  timestamp: string;
}

interface SubmitBody {
  name?: unknown;
  wave?: unknown;
  faction?: unknown;
  difficulty?: unknown;
  mode?: unknown;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const MAX_STORED = 500;
const DEFAULT_LIMIT = 100;
const RATE_LIMIT_SECONDS = 60;
const VALID_MODES = ['endless'];
const NAME_REGEX = /^[a-zA-Z0-9 ]{1,20}$/;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function generateUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

async function getLeaderboard(kv: KVNamespace): Promise<Score[]> {
  const raw = await kv.get('leaderboard');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Score[];
  } catch {
    return [];
  }
}

async function handleGetScores(url: URL, env: Env): Promise<Response> {
  const mode = url.searchParams.get('mode');
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_STORED) : DEFAULT_LIMIT;

  let scores = await getLeaderboard(env.SCORES);

  if (mode) {
    scores = scores.filter((s) => s.mode === mode);
  }

  scores = scores.slice(0, limit);

  return json({ scores });
}

async function handlePostScore(request: Request, env: Env): Promise<Response> {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = `rate:${ip}`;
  const lastSubmit = await env.SCORES.get(rateKey);

  if (lastSubmit) {
    const elapsed = Date.now() - parseInt(lastSubmit, 10);
    if (elapsed < RATE_LIMIT_SECONDS * 1000) {
      const wait = Math.ceil((RATE_LIMIT_SECONDS * 1000 - elapsed) / 1000);
      return errorResponse(`Rate limited. Try again in ${wait} seconds.`, 429);
    }
  }

  // Parse and validate body
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  const { name, wave, faction, difficulty, mode } = body;

  if (typeof name !== 'string' || !NAME_REGEX.test(name)) {
    return errorResponse('Name must be 1-20 alphanumeric characters (spaces allowed).');
  }
  if (typeof wave !== 'number' || !Number.isInteger(wave) || wave < 1 || wave > 9999) {
    return errorResponse('Wave must be an integer between 1 and 9999.');
  }
  if (typeof faction !== 'string' || faction.length === 0 || faction.length > 50) {
    return errorResponse('Faction is required.');
  }
  if (typeof difficulty !== 'string' || difficulty.length === 0 || difficulty.length > 50) {
    return errorResponse('Difficulty is required.');
  }
  if (typeof mode !== 'string' || !VALID_MODES.includes(mode)) {
    return errorResponse(`Mode must be one of: ${VALID_MODES.join(', ')}.`);
  }

  // Build score entry
  const score: Score = {
    id: generateUUID(),
    name: name.trim(),
    wave,
    faction,
    difficulty,
    mode,
    timestamp: new Date().toISOString(),
  };

  // Read current leaderboard, insert, sort, trim
  const scores = await getLeaderboard(env.SCORES);
  scores.push(score);
  scores.sort((a, b) => b.wave - a.wave);
  const trimmed = scores.slice(0, MAX_STORED);

  // Determine rank (1-indexed)
  const rank = trimmed.findIndex((s) => s.id === score.id) + 1;

  // Write leaderboard and rate-limit key
  await Promise.all([
    env.SCORES.put('leaderboard', JSON.stringify(trimmed)),
    env.SCORES.put(rateKey, Date.now().toString(), { expirationTtl: RATE_LIMIT_SECONDS }),
  ]);

  if (rank === 0) {
    // Score was trimmed (didn't make top 500)
    return json({ success: true, rank: null });
  }

  return json({ success: true, rank });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS' && pathname === '/api/scores') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (pathname === '/api/scores') {
      if (method === 'GET') {
        return handleGetScores(url, env);
      }
      if (method === 'POST') {
        return handlePostScore(request, env);
      }
      return errorResponse('Method not allowed.', 405);
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
