// HTML email templates matching the site's own visual language (see the
// design canvas at `Confirmation Emails.dc.html`). Table-based layout with
// inline styles throughout - email clients don't reliably support flexbox,
// external stylesheets, or CSS classes, so this deliberately doesn't reuse
// the site's own oklch()/flex-based markup even though the colors and
// spacing are meant to read as "the same brand."
//
// Dynamic values (guest name, site, free-text reasons, etc.) are always
// escaped before going into these templates - unlike the plain-text
// versions, HTML from an unescaped guest-supplied string would actually
// render/execute here.
const { LOGO_WHITE_URL, TRAILER_WHITE_URL } = require('./emailAssets');

const PURPLE = '#5a3ce6';
const PINK = '#c463c9';
const INK = '#1a1a24';
const BODY_TEXT = '#43434f';
const MUTED = '#8a8a97';
const HAIRLINE = '#f0f0f4';
const BORDER = '#e6e6ec';
const GREEN = '#2f7d4f';
const AMBER_BG = '#fdf6e8';
const AMBER_BORDER = '#f0dfae';
const AMBER_TEXT = '#8a6d1f';
const REPLY_EMAIL = process.env.MAIL_REPLY_TO || 'info@sweetdreamsrvrentals.com';

// Same three families and the same Google Fonts URL as the site itself
// (Sweet Dreams RV.dc.html's own <link>). Gmail strips <link>/@font-face
// from received mail outright (a deliberate, well-known Gmail limitation,
// not something fixable from the sending side), so it always falls back to
// the Arial/Helvetica/Georgia stacks below regardless - but Apple Mail,
// iOS Mail, and Outlook.com's web client do honor it, so it's worth
// including for those.
const FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=Archivo+Black&display=swap" rel="stylesheet">';
const F_BODY = "'Nunito Sans',Arial,Helvetica,sans-serif";
const F_HEADING = "'Quicksand',Arial,Helvetica,sans-serif";
const F_DISPLAY = "'Archivo Black',Arial,Helvetica,sans-serif";

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// One label/value line inside a card. `strong` bolds+darkens the value
// (totals, headline numbers); `color` overrides the value color (e.g. green
// for "paid" amounts); `noBorder` drops the row's bottom hairline (last row
// in a card).
function kvRow(label, value, opts) {
  opts = opts || {};
  const border = opts.noBorder ? '' : `border-bottom:1px solid ${HAIRLINE};`;
  const weight = opts.strong ? '700' : '600';
  const color = opts.color || (opts.strong ? INK : INK);
  return `<tr>
    <td style="padding:11px 0;${border}font-size:14px;color:${MUTED};font-family:${F_BODY};">${label}</td>
    <td style="padding:11px 0;${border}font-size:14px;color:${color};font-weight:${weight};font-family:${F_BODY};text-align:right;">${value}</td>
  </tr>`;
}

function card(rowsHtml, opts) {
  opts = opts || {};
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:14px;margin-top:${opts.marginTop != null ? opts.marginTop : 20}px;">
    <tr><td style="padding:2px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
    </td></tr>
  </table>`;
}

// The amber "don't forget" box used for the first-night plan's auto-charge
// notice - the one piece of information in these emails a guest really
// cannot afford to miss.
function calloutBox(html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:${AMBER_BG};border:1px solid ${AMBER_BORDER};border-radius:12px;">
    <tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:${AMBER_TEXT};font-family:${F_BODY};">${html}</td></tr>
  </table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;width:100%;">
    <tr><td align="center" style="border-radius:9999px;background:linear-gradient(120deg,${PURPLE},${PINK});background-color:${PURPLE};">
      <a href="${esc(href)}" style="display:block;padding:14px 24px;font-family:${F_BODY};font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

// Full HTML document for a guest-facing email: gradient hero (logo + hero
// label), white content card, dark footer with tagline + contact.
function customerShell({ heroLabel, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sweet Dreams RV Rentals</title>
${FONTS_LINK}
</head>
<body style="margin:0;padding:0;background:#eef0f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background-color:${PURPLE};background-image:linear-gradient(120deg,${PURPLE},${PINK});padding:30px 32px;text-align:center;">
          <img src="${LOGO_WHITE_URL}" width="180" alt="Sweet Dreams RV Rentals" style="width:180px;height:auto;display:inline-block;border:0;">
          <div style="margin-top:14px;font-family:${F_BODY};font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:700;">${esc(heroLabel)}</div>
        </td></tr>
        <tr><td style="padding:30px 32px;font-family:${F_BODY};color:${BODY_TEXT};">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background-color:#16172b;padding:22px 32px;text-align:center;">
          <img src="${TRAILER_WHITE_URL}" width="56" alt="" style="width:56px;height:auto;opacity:0.9;border:0;">
          <div style="margin-top:10px;font-family:${F_HEADING},Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#c9c9d6;">When adventure calls&hellip; we deliver.</div>
          <div style="margin-top:8px;font-family:${F_BODY};font-size:11.5px;color:#7a7a8c;line-height:1.5;">Sweet Dreams RV Rentals &middot; Grants Pass &amp; Merlin, Oregon<br><a href="mailto:${REPLY_EMAIL}" style="color:#c9c9d6;text-decoration:underline;">Reply to this email</a> &middot; (541) 630-4795</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Full HTML document for an internal team alert: dark header bar (icon +
// title + subtitle), a generic key/value card built from whatever fields
// the caller passed to notifyTeam(), and a CTA into the admin dashboard.
function teamShell({ title, subtitle, fieldsHtml, ctaHref, ctaLabel, note }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sweet Dreams RV Rentals - team alert</title>
${FONTS_LINK}
</head>
<body style="margin:0;padding:0;background:#eef0f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background-color:#16172b;padding:20px 26px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:38px;height:38px;border-radius:9999px;background-color:${PURPLE};background-image:linear-gradient(135deg,${PURPLE},${PINK});text-align:center;vertical-align:middle;">
              <img src="${TRAILER_WHITE_URL}" width="22" alt="" style="width:22px;height:auto;vertical-align:middle;border:0;">
            </td>
            <td style="padding-left:12px;font-family:${F_BODY};">
              <div style="font-weight:700;font-size:16px;color:#ffffff;font-family:${F_HEADING};">${esc(title)}</div>
              <div style="font-size:12px;color:#9a9ab0;margin-top:2px;">${esc(subtitle)}</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px 26px;font-family:${F_BODY};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;">
            <tr><td style="padding:2px 15px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fieldsHtml}</table>
            </td></tr>
          </table>
          ${ctaHref ? button(ctaHref, ctaLabel || 'Open in dashboard →') : ''}
          ${note ? `<p style="margin:16px 0 0;font-size:12.5px;line-height:1.55;color:${MUTED};text-align:center;font-family:${F_BODY};">${esc(note)}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function tripCard(trailerName, datesRow, siteRow) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:14px;overflow:hidden;margin-top:22px;">
    <tr><td style="background:#f6f4ff;padding:14px 18px;border-bottom:1px solid ${HAIRLINE};">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:38px;height:38px;border-radius:9999px;background-color:${PURPLE};background-image:linear-gradient(135deg,${PURPLE},${PINK});text-align:center;vertical-align:middle;">
          <img src="${TRAILER_WHITE_URL}" width="22" alt="" style="width:22px;height:auto;vertical-align:middle;border:0;">
        </td>
        <td style="padding-left:12px;font-family:${F_BODY};">
          <div style="font-weight:700;font-size:16px;color:${INK};font-family:${F_DISPLAY};">${esc(trailerName)}</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:2px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${kvRow('Dates', datesRow)}
        ${kvRow('Delivery site', siteRow, { noBorder: true })}
      </table>
    </td></tr>
  </table>`;
}

// ---- one builder per email kind, called from guestEmails.js/notify.js ----

function confirmationFullHtml({ first, trailerName, datesLabel, site, dueToday, deposit, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">You're all set, ${esc(first)}.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Your reservation is confirmed and paid in full. Here's your trip at a glance.</p>
    ${tripCard(trailerName, esc(datesLabel), esc(site))}
    ${card(
      kvRow('Paid today', money(dueToday), { strong: true }) +
      kvRow('Includes refundable deposit', money(deposit), { color: GREEN, noBorder: true }),
      { marginTop: 16 },
    )}
    <p style="margin:22px 0 0;font-size:14px;line-height:1.6;">Your ${money(deposit)} deposit is refunded after the trailer is returned in good shape.</p>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;">Questions or changes? Just <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply to this email</a> or call <strong style="color:${INK};">(541) 630-4795</strong>.</p>
  `;
  return customerShell({ heroLabel: 'Reservation confirmed', bodyHtml: body });
}

function confirmationFirstNightHtml({ first, trailerName, datesLabel, site, dueToday, balanceLater, deposit, balanceChargeDateLabel, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">You're all set, ${esc(first)}.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Your reservation is confirmed with your first night down. Here's your trip at a glance.</p>
    ${tripCard(trailerName, esc(datesLabel), esc(site))}
    ${card(kvRow('Paid today (first night)', money(dueToday), { strong: true, noBorder: true }), { marginTop: 16 })}
    ${calloutBox(`<strong>Automatic balance charge.</strong> The remaining ${money(balanceLater)} (trip balance plus your ${money(deposit)} refundable deposit) is charged automatically to the card on file on <strong>${esc(balanceChargeDateLabel)}</strong>, two weeks before delivery. No action needed - we'll send a reminder a few days beforehand.`)}
    <p style="margin:22px 0 0;font-size:14px;line-height:1.6;">Your ${money(deposit)} deposit is refunded after the trailer is returned in good shape.</p>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;">Questions or changes? Just <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply to this email</a> or call <strong style="color:${INK};">(541) 630-4795</strong>.</p>
  `;
  return customerShell({ heroLabel: 'Reservation confirmed', bodyHtml: body });
}

// Phone/in-person bookings (admin's "Paid over the phone" action). No saved
// card exists for these like the online flow has, so there's nothing to
// describe as auto-charging - just what was actually collected, stated
// plainly via payStatusLabel ("Paid in full", "Deposit taken", "Invoice
// sent").
function phoneBookingConfirmationHtml({ first, trailerName, datesLabel, site, tripTotal, depositAmount, grandTotal, payStatusLabel, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">You're booked, ${esc(first)}.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Your reservation is confirmed. Here's your trip at a glance.</p>
    ${tripCard(trailerName, esc(datesLabel), esc(site))}
    ${card(
      kvRow('Trip total', money(tripTotal)) +
      kvRow('Refundable security deposit', money(depositAmount)) +
      kvRow('Total', money(grandTotal), { strong: true }) +
      kvRow('Payment', esc(payStatusLabel), { noBorder: true }),
      { marginTop: 16 },
    )}
    <p style="margin:22px 0 0;font-size:14px;line-height:1.6;">Your ${money(depositAmount)} deposit is refunded after the trailer is returned in good shape.</p>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;">Questions or changes? Just <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply to this email</a> or call <strong style="color:${INK};">(541) 630-4795</strong>.</p>
  `;
  return customerShell({ heroLabel: 'Reservation confirmed', bodyHtml: body });
}

function balanceReminderHtml({ first, trailerName, datesLabel, balanceLater, balanceChargeDateLabel, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">Your balance charges soon.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Hi ${esc(first)}, a quick heads up on your upcoming ${esc(trailerName)} trip (${esc(datesLabel)}).</p>
    ${card(
      kvRow('Amount', money(balanceLater), { strong: true }) +
      kvRow('Charges on', esc(balanceChargeDateLabel), { strong: true, noBorder: true }),
      { marginTop: 18 },
    )}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;">This charges automatically to the card you used to reserve - nothing to do on your end. If anything needs to change, <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply</a> or call <strong style="color:${INK};">(541) 630-4795</strong> before that date.</p>
  `;
  return customerShell({ heroLabel: 'Balance reminder', bodyHtml: body });
}

function balanceChargedHtml({ first, trailerName, datesLabel, site, balanceLater, deposit, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">Payment received. You're all set.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Hi ${esc(first)}, we've charged the remaining balance for your ${esc(trailerName)} trip. You're fully paid.</p>
    ${tripCard(trailerName, esc(datesLabel), esc(site))}
    ${card(kvRow('Balance charged', money(balanceLater), { strong: true, color: GREEN, noBorder: true }), { marginTop: 16 })}
    <p style="margin:22px 0 0;font-size:14px;line-height:1.6;">The ${money(deposit)} security deposit included in that charge is refunded after the trailer is returned. We can't wait to get you set up.</p>
  `;
  return customerShell({ heroLabel: 'Balance charged', bodyHtml: body });
}

function deliveryReminderHtml({ first, trailerName, arrivalLabel, departureLabel, site, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">Your trip is almost here!</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Hi ${esc(first)}, we'll deliver and set up your ${esc(trailerName)} on <strong style="color:${INK};">${esc(arrivalLabel)}</strong> at ${esc(site)}.</p>
    ${card(
      kvRow('Check-in', 'After 3:00 PM on arrival day') +
      kvRow('Check-out', `11 AM–12 PM on ${esc(departureLabel)}`, { noBorder: true }),
      { marginTop: 18 },
    )}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;">We'll walk you through everything on site. If your plans or site details changed, <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply</a> or call <strong style="color:${INK};">(541) 630-4795</strong>.</p>
  `;
  return customerShell({ heroLabel: 'Delivery is coming up', bodyHtml: body });
}

function depositRefundHtml({ first, trailerName, deposit, money }) {
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">Thanks for camping with us!</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Hi ${esc(first)}, now that your ${esc(trailerName)} is back and checked over, we've released your refundable security deposit.</p>
    ${card(kvRow('Deposit refunded', money(deposit), { strong: true, color: GREEN, noBorder: true }), { marginTop: 18 })}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;">It should appear on your statement within a few business days. We'd love to host you again.</p>
  `;
  return customerShell({ heroLabel: 'Deposit refunded', bodyHtml: body });
}

// Admin-built quote (Sweet Dreams Admin.dc.html's "Email quote" action).
// `rows` is a pre-built [{label, value}] breakdown - the route computes
// those from the individual line items rather than trusting a client total,
// same reasoning as everywhere else money changes hands in this app.
// tripTotal/depositAmount/grandTotal are broken out separately (rather than
// folded into `rows`) so the deposit always gets its own clearly-labeled
// line and refund sentence, never silently absorbed into one lump total.
function quoteHtml({ first, trailerName, datesLabel, site, rows, tripTotal, depositAmount, grandTotal, reserveHref, money }) {
  const rowsHtml = rows.map((r) => kvRow(r.label, r.value)).join('')
    + kvRow('Trip total', money(tripTotal))
    + kvRow('Refundable security deposit', money(depositAmount))
    + kvRow('Total', money(grandTotal), { strong: true, noBorder: true });
  const body = `
    <h2 style="margin:0;font-family:${F_HEADING};font-weight:700;font-size:22px;color:${INK};">Here's your quote, ${esc(first)}.</h2>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Here's the breakdown for your ${esc(trailerName)} trip. Your dates aren't held until you reserve.</p>
    ${tripCard(trailerName, esc(datesLabel), esc(site))}
    ${card(rowsHtml, { marginTop: 16 })}
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">Your ${money(depositAmount)} security deposit is fully refunded after the trailer is returned in good shape.</p>
    ${button(reserveHref, 'Reserve online')}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">This reflects pricing at the time the quote was built - your final total is confirmed live when you reserve. Questions? Just <a href="mailto:${REPLY_EMAIL}" style="color:${PURPLE};">reply to this email</a> or call <strong style="color:${INK};">(541) 630-4795</strong>.</p>
  `;
  return customerShell({ heroLabel: 'Your quote', bodyHtml: body });
}

// Internal alerts (new booking / instant quote / cancellation request) all
// share one layout - `fields` is whatever key/value pairs notifyTeam() was
// called with, rendered generically so this doesn't need a bespoke template
// per alert type.
function teamAlertHtml({ title, subtitle, fields, ctaHref, ctaLabel, note }) {
  const entries = Object.entries(fields || {});
  const fieldsHtml = entries.map(([key, value], i) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return kvRow(esc(label), esc(value), { noBorder: i === entries.length - 1 });
  }).join('');
  return teamShell({ title, subtitle, fieldsHtml, ctaHref, ctaLabel, note });
}

module.exports = {
  esc,
  confirmationFullHtml,
  confirmationFirstNightHtml,
  balanceReminderHtml,
  balanceChargedHtml,
  deliveryReminderHtml,
  depositRefundHtml,
  quoteHtml,
  phoneBookingConfirmationHtml,
  teamAlertHtml,
};
