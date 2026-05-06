import nodemailer, { Transporter } from "nodemailer";
import { env } from "../env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    return null; // graceful degradation
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.warn(
      `[mailer] SMTP not configured — would send "${opts.subject}" to ${opts.to}`
    );
    return { skipped: true };
  }
  return tx.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export function otpEmailHtml(otp: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FFF0F3;font-family:'DM Sans',sans-serif;color:#2E1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#FFF8F9;border:1px solid #E8C9CC;border-radius:12px;
                    box-shadow:0 2px 16px rgba(139,74,74,0.08);overflow:hidden;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#C0626A;font-family:'JetBrains Mono',monospace;">allora</p>
          <h1 style="margin:0 0 16px;font-family:'Playfair Display',serif;font-size:28px;color:#2E1A1A;">Your verification code</h1>
          <p style="margin:0 0 24px;color:#7A5050;line-height:1.6;">
            Use the code below to sign in. It expires in 10 minutes.
          </p>
          <div style="text-align:center;background:#FFF0F3;border:1px solid #E8C9CC;border-radius:8px;padding:20px;font-family:'JetBrains Mono',monospace;font-size:32px;letter-spacing:.4em;color:#8B4A4A;">
            ${otp}
          </div>
          <p style="margin:24px 0 0;color:#7A5050;font-size:13px;line-height:1.6;">
            Didn't request this? You can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
