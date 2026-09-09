const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.EMAIL_FROM || 'EF MatchDay <onboarding@resend.dev>';

const brandStyles = `
  body { margin: 0; padding: 0; background: #070A08; font-family: 'Segoe UI', Arial, sans-serif; color: #F3F6EF; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #121B16; border: 1px solid rgba(198,255,26,0.18); border-radius: 16px; padding: 28px 24px; }
  .mark { display: inline-block; width: 40px; height: 40px; line-height: 40px; text-align: center;
    background: linear-gradient(145deg, #E8FF66, #C6FF1A); color: #050706; font-weight: 800;
    border-radius: 10px; font-size: 14px; letter-spacing: 0.04em; }
  h1 { font-size: 26px; margin: 18px 0 8px; letter-spacing: 0.04em; text-transform: uppercase; }
  p { color: #8A978E; font-size: 15px; line-height: 1.55; margin: 0 0 14px; }
  .btn { display: inline-block; margin: 10px 0 6px; padding: 14px 22px; background: #C6FF1A; color: #050706 !important;
    text-decoration: none; font-weight: 700; border-radius: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
  .muted { font-size: 12px; color: #5E6B63; word-break: break-all; }
  .footer { margin-top: 18px; font-size: 12px; color: #5E6B63; }
`;

function layout({ title, intro, ctaLabel, ctaUrl, outro }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${brandStyles}</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="mark">EF</div>
      <h1>${title}</h1>
      <p>${intro}</p>
      <p><a class="btn" href="${ctaUrl}">${ctaLabel}</a></p>
      <p class="muted">Or copy this link:<br>${ctaUrl}</p>
      ${outro ? `<p class="footer">${outro}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
  });

  if (error) {
    const message = error.message || JSON.stringify(error);
    throw new Error(message);
  }

  return data;
}

async function sendVerificationEmail(to, username, verificationLink) {
  return sendEmail({
    to,
    subject: 'Verify your EF MatchDay account',
    html: layout({
      title: 'Confirm your email',
      intro: `Hey ${username || 'player'}, welcome to EF MatchDay. Tap below to verify your email and start competing.`,
      ctaLabel: 'Verify email',
      ctaUrl: verificationLink,
      outro: 'This link expires soon. If you did not sign up, you can ignore this email.',
    }),
  });
}

async function sendPasswordResetEmail(to, username, resetLink) {
  return sendEmail({
    to,
    subject: 'Reset your EF MatchDay password',
    html: layout({
      title: 'Password reset',
      intro: `Hey ${username || 'player'}, we got a request to reset your EF MatchDay password.`,
      ctaLabel: 'Reset password',
      ctaUrl: resetLink,
      outro: 'If you did not ask for this, you can ignore this email. Your password will stay the same.',
    }),
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
