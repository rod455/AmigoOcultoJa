#!/usr/bin/env node
// Templates dos e-mails do Supabase Auth no visual do Tirei!.
//
//   node scripts/email-templates.mjs            → escreve supabase/templates/*.html
//   node scripts/email-templates.mjs --push     → também publica no projeto via Management API
//
// Para --push: SUPABASE_ACCESS_TOKEN (token pessoal em supabase.com/dashboard/account/tokens)
// e, opcionalmente, SUPABASE_PROJECT_REF (padrão: qqzlqnvreftablfyonux).
// Flags extras no --push: --site-url=https://tirei.vercel.app  --autoconfirm (desliga "Confirm email")
//
// Variáveis do Supabase usadas: {{ .ConfirmationURL }}, {{ .Email }}, {{ .NewEmail }}, {{ .SiteURL }}, {{ .Data.full_name }}

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.EMAIL_ASSET_BASE ?? 'https://tirei.vercel.app';
const COLORS = { text: '#111418', secondary: '#5F6670', line: '#EAECEF', accent: '#C63D24', bg: '#F4F5F6', box: '#FBF7F2' };

/** Layout único: cabeçalho escuro com a marca, corpo, caixa de destaque, botão e rodapé. */
function layout({ preheader, title, greeting, intro, boxTitle, boxItems, cta, ctaUrl, after, footer }) {
  const items = boxItems.map((t) => `<li style="margin:0 0 8px 0;padding:0 0 0 2px;color:${COLORS.text};font-size:16px;line-height:24px">${t}</li>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.bg}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:20px;overflow:hidden;font-family:Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

  <!-- cabeçalho -->
  <tr><td align="center" style="background:${COLORS.text};padding:32px 32px 28px 32px">
    <img src="${BASE}/email/logo-dark.png" width="88" height="80" alt="Tirei!" style="display:block;border:0;margin:0 auto 14px auto">
    <div style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.3px;line-height:26px;margin-bottom:18px">Tirei!</div>
    <div style="color:#FFFFFF;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:32px">${title}</div>
  </td></tr>

  <!-- corpo -->
  <tr><td style="padding:32px 32px 8px 32px">
    <p style="margin:0 0 16px 0;color:${COLORS.text};font-size:18px;font-weight:700;line-height:26px">${greeting}</p>
    <p style="margin:0 0 20px 0;color:${COLORS.text};font-size:16px;line-height:25px">${intro}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="background:${COLORS.box};border-left:4px solid ${COLORS.accent};border-radius:0 14px 14px 0;padding:18px 20px">
        <div style="color:${COLORS.secondary};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:10px">${boxTitle}</div>
        <ul style="margin:0;padding:0 0 0 18px">${items}</ul>
      </td></tr>
    </table>
  </td></tr>

  <!-- botão -->
  <tr><td align="center" style="padding:24px 32px 8px 32px">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" style="background:${COLORS.accent};border-radius:29px">
        <a href="${ctaUrl}" style="display:inline-block;padding:18px 32px;color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;border-radius:29px">${cta}</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- link alternativo + rodapé -->
  <tr><td style="padding:16px 32px 32px 32px">
    <p style="margin:0 0 20px 0;color:${COLORS.secondary};font-size:13px;line-height:20px">${after}</p>
    <p style="margin:0 0 6px 0;color:${COLORS.secondary};font-size:12px;line-height:18px">Se o botão não abrir, copie e cole este endereço no navegador:</p>
    <p style="margin:0 0 24px 0;font-size:12px;line-height:18px;word-break:break-all"><a href="${ctaUrl}" style="color:${COLORS.accent};text-decoration:underline">${ctaUrl}</a></p>
    <hr style="border:0;border-top:1px solid ${COLORS.line};margin:0 0 16px 0">
    <p style="margin:0;color:${COLORS.secondary};font-size:12px;line-height:18px">${footer}</p>
  </td></tr>

</table>
<p style="margin:16px 0 0 0;color:${COLORS.secondary};font-size:12px;line-height:18px;font-family:Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">Tirei! · amigo oculto sem papelzinho · <a href="${BASE}" style="color:${COLORS.secondary}">${BASE.replace(/^https?:\/\//, '')}</a></p>
</td></tr>
</table>
</body>
</html>
`;
}

const NAME = '{{ if .Data.full_name }}{{ .Data.full_name }}{{ else }}tudo bem{{ end }}';

export const TEMPLATES = {
  confirmation: {
    subject: 'Confirme seu e-mail e sorteie o amigo oculto',
    html: layout({
      preheader: 'Um toque e o sorteio sai.',
      title: 'Falta um toque para sortear',
      greeting: `Oi, ${NAME}!`,
      intro: 'Sua conta no Tirei! está quase pronta. Confirme o e-mail e você volta direto para o sorteio, exatamente de onde parou.',
      boxTitle: 'O que acontece depois',
      boxItems: ['O grupo é sorteado na hora, sem que ninguém veja o resultado dos outros.', 'Você recebe o link pronto para mandar no WhatsApp.', 'No painel, acompanha quem já viu e quem já montou a lista.'],
      cta: 'Confirmar e sortear',
      ctaUrl: '{{ .ConfirmationURL }}',
      after: 'Se você não criou uma conta no Tirei!, pode ignorar este e-mail. Nada será criado.',
      footer: 'Usamos seu nome e e-mail só para guardar seus grupos. Quem participa do amigo oculto não precisa de conta.',
    }),
  },
  recovery: {
    subject: 'Redefinir sua senha do Tirei!',
    html: layout({
      preheader: 'Escolha uma senha nova em um toque.',
      title: 'Vamos trocar sua senha',
      greeting: `Oi, ${NAME}!`,
      intro: 'Recebemos um pedido para redefinir a senha da sua conta ({{ .Email }}). Toque no botão para escolher uma senha nova.',
      boxTitle: 'Bom saber',
      boxItems: ['O link vale por pouco tempo e funciona uma vez só.', 'Seus grupos e sorteios continuam exatamente como estão.'],
      cta: 'Escolher nova senha',
      ctaUrl: '{{ .ConfirmationURL }}',
      after: 'Se você não pediu para trocar a senha, ignore este e-mail. Sua senha atual continua valendo.',
      footer: 'Dúvidas? Responda este e-mail.',
    }),
  },
  magic_link: {
    subject: 'Seu link para entrar no Tirei!',
    html: layout({
      preheader: 'Entre sem senha, em um toque.',
      title: 'Seu link de acesso',
      greeting: `Oi, ${NAME}!`,
      intro: 'Toque no botão para entrar na sua conta do Tirei! sem digitar senha.',
      boxTitle: 'Bom saber',
      boxItems: ['O link vale por pouco tempo e funciona uma vez só.', 'Se você não pediu este link, ignore o e-mail.'],
      cta: 'Entrar no Tirei!',
      ctaUrl: '{{ .ConfirmationURL }}',
      after: 'Por segurança, não encaminhe este e-mail: quem tiver o link consegue entrar na sua conta.',
      footer: 'Usamos seu nome e e-mail só para guardar seus grupos.',
    }),
  },
  email_change: {
    subject: 'Confirme a troca de e-mail no Tirei!',
    html: layout({
      preheader: 'Confirme o novo e-mail da sua conta.',
      title: 'Confirme seu novo e-mail',
      greeting: `Oi, ${NAME}!`,
      intro: 'Você pediu para trocar o e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}. Confirme para concluir.',
      boxTitle: 'O que muda',
      boxItems: ['Você passa a entrar com o novo e-mail.', 'Seus grupos e sorteios continuam os mesmos.'],
      cta: 'Confirmar novo e-mail',
      ctaUrl: '{{ .ConfirmationURL }}',
      after: 'Se você não pediu essa troca, ignore este e-mail e sua conta continua com o e-mail atual.',
      footer: 'Dúvidas? Responda este e-mail.',
    }),
  },
  invite: {
    subject: 'Você foi convidado para o Tirei!',
    html: layout({
      preheader: 'Crie sua senha e entre.',
      title: 'Você foi convidado',
      greeting: 'Oi!',
      intro: 'Alguém criou uma conta para você no Tirei!, o amigo oculto sem papelzinho. Toque no botão para escolher uma senha e entrar.',
      boxTitle: 'O que dá para fazer',
      boxItems: ['Criar grupos e sortear em 1 minuto.', 'Mandar o link no WhatsApp e acompanhar quem já viu.'],
      cta: 'Aceitar convite',
      ctaUrl: '{{ .ConfirmationURL }}',
      after: 'Se você não esperava este convite, pode ignorar o e-mail.',
      footer: 'Usamos seu nome e e-mail só para guardar seus grupos.',
    }),
  },
};

const outDir = join(process.cwd(), 'supabase', 'templates');
mkdirSync(outDir, { recursive: true });
for (const [key, t] of Object.entries(TEMPLATES)) {
  writeFileSync(join(outDir, `${key}.html`), t.html);
  writeFileSync(join(outDir, `${key}.subject.txt`), t.subject + '\n');
}
console.log(`templates escritos em supabase/templates/ (${Object.keys(TEMPLATES).join(', ')})`);

if (process.argv.includes('--push')) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF ?? 'qqzlqnvreftablfyonux';
  if (!token) {
    console.error('Defina SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens).');
    process.exit(1);
  }
  const body = {
    mailer_subjects_confirmation: TEMPLATES.confirmation.subject,
    mailer_templates_confirmation_content: TEMPLATES.confirmation.html,
    mailer_subjects_recovery: TEMPLATES.recovery.subject,
    mailer_templates_recovery_content: TEMPLATES.recovery.html,
    mailer_subjects_magic_link: TEMPLATES.magic_link.subject,
    mailer_templates_magic_link_content: TEMPLATES.magic_link.html,
    mailer_subjects_email_change: TEMPLATES.email_change.subject,
    mailer_templates_email_change_content: TEMPLATES.email_change.html,
    mailer_subjects_invite: TEMPLATES.invite.subject,
    mailer_templates_invite_content: TEMPLATES.invite.html,
  };
  const siteUrl = process.argv.find((a) => a.startsWith('--site-url='))?.slice('--site-url='.length);
  if (siteUrl) {
    body.site_url = siteUrl;
    body.uri_allow_list = [`${siteUrl}/**`, 'tirei://auth'].join(',');
  }
  if (process.argv.includes('--autoconfirm')) body.mailer_autoconfirm = true;

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Falhou (${res.status}):`, await res.text());
    process.exit(1);
  }
  console.log('Templates publicados no Supabase.' + (siteUrl ? ` Site URL: ${siteUrl}` : '') + (body.mailer_autoconfirm ? ' Confirm email: desligado.' : ''));
}
