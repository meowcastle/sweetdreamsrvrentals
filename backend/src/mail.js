const { Resend } = require('resend');

// Real email delivery (build order step 13, part 2). Defaults let this work
// out of the box with just an API key, before sweetdreamsrvrentals.com is
// verified as a sending domain in Resend (which needs SPF/DKIM records
// added in Wix's DNS panel - a deliberate follow-up, not required to start
// sending): Resend's own shared onboarding domain sends fine meanwhile, and
// replyTo still points guests at the real inbox either way, so "just reply
// to this email" in the templates is true from day one.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.MAIL_FROM || 'Sweet Dreams RV Rentals <onboarding@resend.dev>';
const REPLY_TO = process.env.MAIL_REPLY_TO || 'info@sweetdreamsrvrentals.com';

// Throws on failure so the email queue sweep (cron.js) can tell a real send
// failure apart from "nothing to do" and retry instead of silently marking
// the message sent. `html` is optional - a message with no styled version
// (e.g. a queued row from before emailTemplates.js existed) still sends
// fine as plain text only.
async function sendMail({ to, subject, body, html }) {
  if (!resend) throw new Error('RESEND_API_KEY not configured');
  const payload = { from: FROM, to, reply_to: REPLY_TO, subject, text: body };
  if (html) payload.html = html;
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || 'Resend send failed');
}

module.exports = { sendMail };
