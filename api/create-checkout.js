const { randomUUID } = require('crypto');

const PRODUCTS = {
  winformatkit_plus: { title: 'WinFormatKit Plus', priceCents: 1599 },
  winformatkit_pro: { title: 'WinFormatKit Pro', priceCents: 3099 }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handle = String(process.env.INFINITEPAY_HANDLE || '').replace(/^\$/, '').trim();
  if (!handle) {
    return res.status(503).json({ error: 'InfinitePay ainda não configurada' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const siteUrl = (process.env.SITE_URL || 'https://qualprocessador.vercel.app').replace(/\/$/, '');

    let title;
    let priceCents;

    if (body.product === 'support') {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 2 || amount > 10000) {
        return res.status(400).json({ error: 'Valor inválido' });
      }
      priceCents = Math.round(amount * 100);
      const target = String(body.target || 'geral').slice(0, 40);
      title = `Apoio ao QualProcessador (${target})`;
    } else if (PRODUCTS[body.product]) {
      ({ title, priceCents } = PRODUCTS[body.product]);
    } else {
      return res.status(400).json({ error: 'Produto inválido' });
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

    const ipResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await ipResponse.json().catch(() => ({}));
    if (!ipResponse.ok || !data.url) {
      return res.status(502).json({
        error: 'Falha ao criar checkout InfinitePay',
        details: data.message || data.error || null
      });
    }

    return res.status(200).json({ checkoutUrl: data.url, orderNsu });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao criar checkout' });
  }
};
