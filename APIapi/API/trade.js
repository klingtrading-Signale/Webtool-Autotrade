export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const sig = req.body || {};
    const base = String(sig.market || 'BTC').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const instId = `${base}-USDT-SWAP`;
    const side = String(sig.side || 'long').toLowerCase() === 'long' ? 'buy' : 'sell';
    const ordType = String(sig.orderType || 'limit').toLowerCase() === 'limit' ? 'limit' : 'market';
    const sz = String(sig.contracts || sig.size || 1);
    const px = ordType === 'limit' ? String(sig.entry || sig.price || '') : '';

    const payload = { instId, tdMode: 'cross', side, ordType, sz };
    if (px) payload.px = px;

    const path = '/api/v5/trade/order';
    const ts = new Date().toISOString();
    const body = JSON.stringify(payload);
    const prehash = ts + 'POST' + path + body;
    const sign = await hmacBase64(prehash, process.env.OKX_SECRET);

    const r = await fetch('https://www.okx.com' + path, {
      method: 'POST',
      headers: {
        'OK-ACCESS-KEY': process.env.OKX_KEY,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': ts,
        'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE,
        'Content-Type': 'application/json',
        'x-simulated-trading': '1'
      },
      body
    });
    const data = await r.json();
    res.status(200).json({ request: payload, status: r.status, okx: data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

async function hmacBase64(message, secret) {
  const crypto = await import('node:crypto');
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}
