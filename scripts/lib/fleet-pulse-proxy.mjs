const DEFAULT_PULSE_URL = 'https://defxn.com/api/fleet-pulse';
const MAX_PULSE_BYTES = 256 * 1024;

export async function proxyFleetPulse(res, { source = process.env.DEFXN_FLEET_PULSE_URL || DEFAULT_PULSE_URL } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const upstream = await fetch(source, { cache: 'no-store', signal: controller.signal });
    if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`);
    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.length > MAX_PULSE_BYTES) throw new Error('upstream payload too large');
    JSON.parse(body.toString('utf8'));
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    res.end(JSON.stringify({ ok: false, error: 'FLEET_PULSE_UNREACHABLE', detail: error.message }));
  } finally {
    clearTimeout(timer);
  }
}
