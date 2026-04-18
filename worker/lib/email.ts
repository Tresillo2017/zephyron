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
  // Standard headers for delivery and threading (RFC 5322)
  msg.setHeader('Message-ID', `<${crypto.randomUUID()}@zephyron.app>`)
  msg.setHeader('Date', new Date().toUTCString())
  msg.addMessage({ contentType: 'text/plain', data: text })
  msg.addMessage({ contentType: 'text/html', data: html })
  return new EmailMessage(FROM, to, msg.asRaw())
}

// ---------------------------------------------------------------------------
// Template — table-based for email client compatibility
// ---------------------------------------------------------------------------

// SVG wordmark inline — avoids blocked external images
const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#6c4de6"/><path d="M7 12h10M7 8.5h6M7 15.5h8" stroke="white" stroke-width="1.75" stroke-linecap="round"/></svg>`

function emailWrapper(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<title>${title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #080610; }
  a { color: #9b7ef8; text-decoration: none; }
  a:hover { color: #b49cfa !important; text-decoration: underline !important; }
  .btn-primary:hover { background-color: #7c5fe8 !important; }

  @media only screen and (max-width: 600px) {
    .wrapper { width: 100% !important; }
    .content { padding: 24px 20px !important; }
    .header { padding: 24px 20px 20px !important; }
    .footer { padding: 16px 20px 20px !important; }
    .btn-primary { width: 100% !important; text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#080610;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;font-size:1px;color:#080610;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080610;">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">

      <!-- Outer wrapper -->
      <table role="presentation" class="wrapper" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Card -->
        <tr>
          <td style="background-color:#110f1e;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);">

            <!-- Header bar -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="header" style="padding:28px 40px 24px;background:linear-gradient(135deg,#1e1538 0%,#0f0d1e 100%);border-bottom:1px solid rgba(108,77,230,0.2);">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:10px;vertical-align:middle;">${LOGO_SVG}</td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:17px;font-weight:700;color:#e8e4f0;letter-spacing:-0.3px;">Zephyron</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="content" style="padding:36px 40px 32px;">
                  ${body}
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="footer" style="padding:18px 40px 24px;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#4a4660;">
                    You received this because you have an account on
                    <a href="https://zephyron.app" style="color:#5c5480;text-decoration:none;">zephyron.app</a>.
                    If you didn't expect this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Bottom margin -->
        <tr><td style="height:16px;"></td></tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

// Reusable fragment builders
function greeting(safeName: string): string {
  return `<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8e4f0;letter-spacing:-0.3px;">Hey ${safeName}</p>`
}

function bodyText(text: string): string {
  return `<p style="margin:12px 0 20px;font-size:15px;line-height:1.65;color:#9b94b8;">${text}</p>`
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
    <tr>
      <td>
        <a href="${href}" class="btn-primary" style="display:inline-block;padding:13px 28px;background-color:#6c4de6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.1px;transition:background-color 0.15s;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

function fallbackLink(safeUrl: string): string {
  return `<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#4a4660;">
    Or copy this link into your browser:<br/>
    <a href="${safeUrl}" style="color:#6b5d9e;word-break:break-all;">${safeUrl}</a>
  </p>`
}

function mutedNote(text: string): string {
  return `<p style="margin:0;font-size:12px;line-height:1.6;color:#4a4660;">${text}</p>`
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(108,77,230,0.2),transparent);"></td></tr>
  </table>`
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
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  const html = emailWrapper(
    'Verify your email — Zephyron',
    `Confirm your address to finish setting up your Zephyron account.`,
    `${greeting(safeName)}
${bodyText('Confirm your email address to finish setting up your Zephyron account.')}
${ctaButton(safeUrl, 'Verify email address')}
${divider()}
${fallbackLink(safeUrl)}
${mutedNote('This link expires in 24 hours.')}`
  )
  const text = `Hey ${name},\n\nVerify your Zephyron email by visiting:\n${url}\n\nThis link expires in 24 hours.\n\n— Zephyron`
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
    `Your account is live. Start exploring DJ sets.`,
    `${greeting(safeName)}
${bodyText('Your account is live. Welcome to Zephyron — the home for DJ sets.')}
${bodyText('Explore the latest sets, discover artists, and build your listening history.')}
${ctaButton('https://zephyron.app', 'Open Zephyron')}`
  )
  const text = `Hey ${name},\n\nYour Zephyron account is live. Start exploring at https://zephyron.app\n\n— Zephyron`
  await env.EMAIL.send(buildMessage(to, 'Welcome to Zephyron', html, text))
}

export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  name: string,
  url: string
): Promise<void> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  const html = emailWrapper(
    'Reset your password — Zephyron',
    `Reset your Zephyron password with the link inside.`,
    `${greeting(safeName)}
${bodyText('We received a request to reset your Zephyron password.')}
${ctaButton(safeUrl, 'Reset password')}
${divider()}
${fallbackLink(safeUrl)}
${mutedNote('This link expires in 1 hour. If you didn\'t request a reset, you can ignore this — your password won\'t change.')}`
  )
  const text = `Hey ${name},\n\nReset your Zephyron password:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore it.\n\n— Zephyron`
  await env.EMAIL.send(buildMessage(to, 'Reset your password — Zephyron', html, text))
}

export async function sendEmailChangeEmail(
  env: Env,
  to: string,
  name: string,
  url: string
): Promise<void> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  const html = emailWrapper(
    'Confirm your new email — Zephyron',
    `Confirm this address to complete your email change on Zephyron.`,
    `${greeting(safeName)}
${bodyText('Confirm this address to complete the email change on your Zephyron account.')}
${ctaButton(safeUrl, 'Confirm new email')}
${divider()}
${fallbackLink(safeUrl)}
${mutedNote('Didn\'t request this? Your current email stays active — <a href="mailto:support@zephyron.app" style="color:#6b5d9e;">contact support</a> if you\'re concerned.')}`
  )
  const text = `Hey ${name},\n\nConfirm your new Zephyron email:\n${url}\n\n— Zephyron`
  await env.EMAIL.send(buildMessage(to, 'Confirm your new email — Zephyron', html, text))
}
