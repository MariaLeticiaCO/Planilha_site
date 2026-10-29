import 'server-only';
import nodemailer from 'nodemailer';

/** SMTP (Brevo ou SendGrid). Sem SMTP_HOST (desenvolvimento), o e-mail só vai para o log. */
export async function enviarEmail(para: string, assunto: string, html: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(`[email] SMTP não configurado. Para ${para} — ${assunto}\n${html}`);
    return;
  }
  const transporte = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
  await transporte.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'Controle de Vendas'}" <${process.env.SMTP_FROM ?? 'nao-responda@controledevendas.app'}>`,
    to: para,
    subject: assunto,
    html
  });
}

export const escaparHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** URL pública do app para os links dos e-mails. */
export function urlApp(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
