const { randomUUID } = require('crypto');

const PRODUCTS = {
  winformatkit_plus: { title: 'WinFormatKit Plus', priceCents: 1599 },
  winformatkit_pro: { title: 'WinFormatKit Pro', priceCents: 3099 }
};

function getHandle() {
  return String(process.env.INFINITEPAY_HANDLE || '')
    .trim()
    .replace(/^\$/, '');
}

function getSiteUrl(req) {
  const configured = String(process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  if (!host) return 'https://qualprocessador.vercel.app';

  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  const handle = getHandle();

  // Diagnóstico seguro: permite confirmar pela URL se a variável chegou à Function,
  // sem revelar a InfiniteTag nem qualquer outro valor.
  if (req.method === 'GET') {
    return res.status(200).json({
      provider: 'InfinitePay',
      configured: Boolean(handle),
      environment: process.env.VERCEL_ENV || 'unknown'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!handle) {
    return res.status(503).json({
      error: 'INFINITEPAY_HANDLE não está disponível neste deployment.',
      code: 'INFINITEPAY_HANDLE_MISSING'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const siteUrl = getSiteUrl(req);

    let title;
    let priceCents;

    if (body.product === 'support') {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 2 || amount > 10000) {
        return res.status(400).json({ error: 'Valor inválido', code: 'INVALID_AMOUNT' });
      }
      priceCents = Math.round(amount * 100);
      const target = String(body.target || 'geral').slice(0, 40);
      title = `Apoio ao QualProcessador (${target})`;
    } else if (PRODUCTS[body.product]) {
      ({ title, priceCents } = PRODUCTS[body.product]);
    } else {
      return res.status(400).json({ error: 'Produto inválido', code: 'INVALID_PRODUCT' });
    }

    const orderNsu = `qp-${body.product || 'support'}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const payload = {
      handle,
      redirect_url: `${siteUrl}/apoiar.html`,
      order_nsu: orderNsu,
      items: [{
        quantity: 1,
        price: priceCents,
        description: title
      }]
    };

    const name = String(body.name || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().slice(0, 160);
    if (name || email) {
      payload.customer = {};
      if (name) payload.customer.name = name;
      if (email) payload.customer.email = email;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let ipResponse;
    try {
      ipResponse = await fetch('https://api.checkout.infinitepay.io/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await ipResponse.json().catch(() => ({}));

    if (!ipResponse.ok || !data.url) {
      const providerMessage = String(
        data.message || data.error || data.detail || 'A InfinitePay recusou a criação do checkout.'
      ).slice(0, 300);

      return res.status(502).json({
        error: providerMessage,
        code: 'INFINITEPAY_CHECKOUT_REJECTED',
        providerStatus: ipResponse.status
      });
    }

    return res.status(200).json({ checkoutUrl: data.url, orderNsu });
  } catch (error) {
    const isTimeout = error && error.name === 'AbortError';
    return res.status(500).json({
      error: isTimeout
        ? 'A InfinitePay demorou demais para responder. Tente novamente.'
        : 'Erro interno ao criar checkout InfinitePay.',
      code: isTimeout ? 'INFINITEPAY_TIMEOUT' : 'CHECKOUT_INTERNAL_ERROR'
    });
  }
};
