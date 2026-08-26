const { randomUUID } = require('crypto');

const PRODUCTS = {
  winformatkit_plus: { title: 'WinFormatKit Plus', price: 15.99 },
  winformatkit_pro: { title: 'WinFormatKit Pro', price: 30.99 }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'Pagamento ainda não configurado' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const siteUrl = (process.env.SITE_URL || 'https://qualprocessador.vercel.app').replace(/\/$/, '');
    let title, price, metadata = {};

    if (body.product === 'support') {
      price = Number(body.amount);
      if (!Number.isFinite(price) || price < 2 || price > 10000) return res.status(400).json({ error: 'Valor inválido' });
      title = 'Apoio ao QualProcessador';
      metadata = { kind: 'support', target: String(body.target || 'geral').slice(0, 40), name: String(body.name || '').slice(0, 100), message: String(body.message || '').slice(0, 500) };
    } else if (PRODUCTS[body.product]) {
      ({ title, price } = PRODUCTS[body.product]);
      metadata = { kind: 'license', product: body.product };
    } else {
      return res.status(400).json({ error: 'Produto inválido' });
    }

    const externalReference = `qp-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const preference = {
      items: [{ id: body.product || 'support', title, quantity: 1, currency_id: 'BRL', unit_price: Number(price.toFixed(2)) }],
      external_reference: externalReference,
      metadata,
      payer: body.email ? { email: String(body.email).slice(0, 160) } : undefined,
      back_urls: {
        success: `${siteUrl}/apoiar.html?payment=approved`,
        pending: `${siteUrl}/apoiar.html?payment=pending`,
        failure: `${siteUrl}/apoiar.html?payment=failure`
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/mercadopago-webhook`
    };

    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': externalReference },
      body: JSON.stringify(preference)
    });
    const data = await mp.json();
    if (!mp.ok || !data.init_point) return res.status(502).json({ error: 'Falha ao criar checkout', details: data.message || data.error });
    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao criar checkout' });
  }
};
