module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM || 'QualProcessador <contato@qualprocessador.com>';
  if (!apiKey || !to) return res.status(503).json({ error: 'E-mail ainda não configurado' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const nome = String(body.nome || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().slice(0, 160);
    const assunto = String(body.assunto || 'Contato pelo site').trim().slice(0, 140);
    const mensagem = String(body.mensagem || '').trim().slice(0, 1500);
    if (!nome || !email || !mensagem) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    const clean = (v) => v.replace(/[<>]/g, '');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `[QualProcessador] ${assunto}`, html: `<p><strong>Nome:</strong> ${clean(nome)}</p><p><strong>E-mail:</strong> ${clean(email)}</p><p>${clean(mensagem)}</p>` })
    });
    if (!response.ok) throw new Error('Falha no provedor de e-mail');
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Não foi possível enviar' });
  }
};
