// Função da Vercel: recebe os dados do pop-up da página da Bruna Dallo e envia para o seu e-mail pelo Gmail.
// Precisa de 2 variáveis de ambiente na Vercel (Settings > Environment Variables):
//   GMAIL_USER         = o Gmail que vai ENVIAR (ex.: tiagolewis1995@gmail.com)
//   GMAIL_APP_PASSWORD = senha de app de 16 letras gerada no Google (não é a senha normal do Gmail)
// Opcional: EMAIL_DESTINO = e-mail que vai RECEBER os contatos (se não colocar, recebe no próprio GMAIL_USER)
const nodemailer = require('nodemailer');

const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dig = (v) => String(v || '').replace(/\D/g, '');

module.exports = async (req, res) => {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_DESTINO } = process.env;

  // Diagnóstico: abra /api/lead no navegador para ver se está tudo configurado
  if (req.method === 'GET') {
    const senha = String(GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
    const out = {
      funcao: 'online ✅',
      GMAIL_USER: GMAIL_USER ? `configurado ✅ (${GMAIL_USER})` : 'FALTANDO ❌ (cadastre em Settings > Environment Variables e faça Redeploy)',
      GMAIL_APP_PASSWORD: senha ? `configurada ✅ (${senha.length} caracteres${senha.length === 16 ? '' : ' ⚠️ deveria ter 16'})` : 'FALTANDO ❌ (cadastre em Settings > Environment Variables e faça Redeploy)',
      recebe_em: EMAIL_DESTINO || GMAIL_USER || '(nenhum)'
    };
    if (GMAIL_USER && senha) {
      try {
        await nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: senha } }).verify();
        out.login_gmail = 'funcionando ✅ (o envio de e-mail deve chegar)';
      } catch (e) {
        out.login_gmail = 'FALHOU ❌ ' + (e && e.message);
        out.dica = 'Confira se GMAIL_USER é o mesmo Gmail onde você criou a senha de app, se a verificação em duas etapas está ativa e se a senha foi copiada certa. Depois de corrigir, faça Redeploy.';
      }
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(out, null, 2));
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'Use POST' });
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(500).json({ ok: false, erro: 'Faltam as variáveis GMAIL_USER e GMAIL_APP_PASSWORD na Vercel' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  const nome = String(b.nome || '').trim().slice(0, 120);
  const whatsapp = String(b.whatsapp || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().slice(0, 200);
  const idioma = String(b.idioma || 'Português').slice(0, 20);
  const pagina = String(b.pagina || '').slice(0, 300);
  if (nome.length < 2) return res.status(400).json({ ok: false, erro: 'Nome inválido' });
  if (dig(whatsapp).length < 8) return res.status(400).json({ ok: false, erro: 'WhatsApp inválido' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, erro: 'E-mail inválido' });

  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const zap = 'https://wa.me/' + dig(whatsapp);
  const linha = (k, v) => `<tr><td style="padding:10px 14px;background:#f7efe0;font-weight:700;border:1px solid #e6d3b0;width:38%">${k}</td><td style="padding:10px 14px;border:1px solid #e6d3b0">${v}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1d1509;max-width:560px">
      <h2 style="margin:0 0 6px">Novo contato no site Bruna Dallo ✨</h2>
      <p style="margin:0 0 16px;color:#8a7350">Curso Completo de Maquiagem · enviado em ${esc(quando)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:15px">
        ${linha('Nome', esc(nome))}
        ${linha('WhatsApp', `${esc(whatsapp)} · <a href="${zap}">abrir conversa</a>`)}
        ${linha('E-mail', email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '(não informado)')}
        ${linha('Idioma da página', esc(idioma))}
        ${linha('Página', esc(pagina))}
      </table>
    </div>`;

  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: String(GMAIL_APP_PASSWORD).replace(/\s/g, '') } });
    await t.sendMail({
      from: `"Site Bruna Dallo" <${GMAIL_USER}>`,
      to: EMAIL_DESTINO || GMAIL_USER,
      replyTo: email || undefined,
      subject: `Novo contato · Bruna Dallo: ${nome}`,
      text: `Nome: ${nome}\nWhatsApp: ${whatsapp} (${zap})\nE-mail: ${email || '(não informado)'}\nIdioma: ${idioma}\nPágina: ${pagina}\nEnviado em: ${quando}`,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e && e.message);
    return res.status(500).json({ ok: false, erro: 'Falha no envio pelo Gmail: ' + (e && e.message) });
  }
};
