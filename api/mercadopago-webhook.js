const { WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');

async function sendEmail({ payment, id }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM || 'QualProcessador <pagamentos@qualprocessador.com>';
  if (!apiKey || !to) return;
  const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.transaction_amount || 0);
  const subject = `Pagamento aprovado · ${payment.description || 'QualProcessador'} · ${amount}`;
  const html = `<h2>Pagamento aprovado</h2><p><strong>Produto:</strong> ${payment.description || '-'}</p><p><strong>Valor:</strong> ${amount}</p><p><strong>ID Mercado Pago:</strong> ${id}</p><p><strong>Referência:</strong> ${payment.external_reference || '-'}</p><p><strong>E-mail do comprador:</strong> ${(payment.payer && payment.payer.email) || '-'}</p><p><strong>Status:</strong> ${payment.status}</p>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `payment-approved/${id}` },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).end();
  try {
    const dataId = String(req.query['data.id'] || (req.body && req.body.data && req.body.data.id) || '');
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
          dataId,
          secret
        });
      } catch (err) {
        if (err instanceof InvalidWebhookSignatureError) return res.status(401).end();
        throw err;
      }
    }
    const type = req.query.type || (req.body && req.body.type);
    if (type !== 'payment' || !dataId) return res.status(200).json({ ok: true });
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const payment = await response.json();
    if (response.ok && payment.status === 'approved') await sendEmail({ payment, id: dataId });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error', error);
    return res.status(200).json({ ok: true });
  }
};
