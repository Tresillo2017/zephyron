import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'

const FROM = 'noreply@zephyron.app'
const FROM_NAME = 'Zephyron'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildMessage(to: string, subject: string, html: string, text: string): EmailMessage {
  const msg = createMimeMessage()
  msg.setSender({ name: FROM_NAME, addr: FROM })
  msg.setRecipient(to)
  msg.setSubject(subject)
  msg.addMessage({ contentType: 'text/plain', data: text })
  msg.addMessage({ contentType: 'text/html', data: html })
  return new EmailMessage(FROM, to, msg.asRaw())
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { margin: 0; padding: 0; background: #0e0c15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e4f0; }
  .wrap { max-width: 520px; margin: 40px auto; background: #1a1625; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
  .header { background: linear-gradient(135deg, #6c4de6 0%, #4a3bb5 100%); padding: 32px 40px 24px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
  .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
  .body { padding: 32px 40px; }
  .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #c8c0dc; }
  .btn { display: inline-block; padding: 12px 28px; background: #6c4de6; color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 650; margin: 8px 0 20px; }
  .code { background: #0e0c15; border-radius: 10px; padding: 16px 24px; font-family: 'Geist Mono', monospace; font-size: 26px; letter-spacing: 6px; text-align: center; color: #a78bfa; margin: 16px 0; }
  .footer { padding: 20px 40px 28px; border-top: 1px solid rgba(255,255,255,0.06); }
  .footer p { margin: 0; font-size: 12px; color: #6b6580; line-height: 1.5; }
  .footer a { color: #7c6fa0; text-decoration: none; }
  .muted { color: #6b6580 !important; font-size: 13px !important; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>⟨ Zephyron ⟩</h1>
    <p>The DJ set streaming platform</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>You're receiving this from <a href="https://zephyron.app">zephyron.app</a>. If you didn't request this, you can safely ignore it.</p>
  </div>
</div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(
  env: Env,
  to: string,
  name: string,
  url: string
): Promise<void> {
  const html = emailWrapper(
    'Verify your email — Zephyron',
    `<p>Hey ${name},</p>
<p>Confirm your email address to finish setting up your Zephyron account.</p>
<a class="btn" href="${url}">Verify email</a>
<p class="muted">Or paste this link into your browser:<br /><a style="color:#7c6fa0;word-break:break-all" href="${url}">${url}</a></p>
<p class="muted">This link expires in 24 hours.</p>`
  )
  const text = `Hey ${name},\n\nVerify your Zephyron email by visiting:\n${url}\n\nThis link expires in 24 hours.`
  await env.EMAIL.send(buildMessage(to, 'Verify your email — Zephyron', html, text))
}

export async function sendWelcomeEmail(
  env: Env,
  to: string,
  name: string
): Promise<void> {
  const safeName = escapeHtml(name)
  const html = emailWrapper(
    'Welcome to Zephyron',
    `<p>Hey ${safeName},</p>
<p>Your account is live. Welcome to Zephyron — the home for DJ sets.</p>
<p>Start exploring the latest sets, discover artists, and build your listening history.</p>
<a class="btn" href="https://zephyron.app">Open Zephyron</a>`
  )
  const text = `Hey ${name},\n\nYour Zephyron account is live. Start exploring at https://zephyron.app`
  await env.EMAIL.send(buildMessage(to, 'Welcome to Zephyron', html, text))
}

export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  name: string,
  url: string
): Promise<void> {
  const html = emailWrapper(
    'Reset your password — Zephyron',
    `<p>Hey ${name},</p>
<p>We received a request to reset your Zephyron password.</p>
<a class="btn" href="${url}">Reset password</a>
<p class="muted">Or paste this link into your browser:<br /><a style="color:#7c6fa0;word-break:break-all" href="${url}">${url}</a></p>
<p class="muted">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change.</p>`
  )
  const text = `Hey ${name},\n\nReset your Zephyron password:\n${url}\n\nThis link expires in 1 hour.`
  await env.EMAIL.send(buildMessage(to, 'Reset your password — Zephyron', html, text))
}

export async function sendEmailChangeEmail(
  env: Env,
  to: string,
  name: string,
  url: string
): Promise<void> {
  const html = emailWrapper(
    'Confirm your new email — Zephyron',
    `<p>Hey ${name},</p>
<p>Confirm this address to complete the email change on your Zephyron account.</p>
<a class="btn" href="${url}">Confirm new email</a>
<p class="muted">Or paste this link:<br /><a style="color:#7c6fa0;word-break:break-all" href="${url}">${url}</a></p>
<p class="muted">Didn't request this? Your current email stays active — contact support if you're concerned.</p>`
  )
  const text = `Hey ${name},\n\nConfirm your new Zephyron email:\n${url}`
  await env.EMAIL.send(buildMessage(to, 'Confirm your new email — Zephyron', html, text))
}
