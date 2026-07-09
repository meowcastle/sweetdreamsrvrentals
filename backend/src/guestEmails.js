// Server-side port of buildGuestEmails() in `Sweet Dreams RV.dc.html`. That
// client-side function only ever ran from completeBooking(), the
// client-trusted direct-POST booking path - which CHECKOUT_ENDPOINT being
// set to a real value (build order step 8) made unreachable from the UI.
// Real web bookings are now created by the checkout.session.completed
// webhook (step 10), which never touches the browser's JS at all, so the
// guest email schedule has to be built here instead for it to ever run.
// Keep this in sync with buildGuestEmails() if the copy or schedule changes.

const TRAILER_NAMES = {
  charlie: 'Charlie', ella: 'Ella', virginia: 'Virginia', marylou: 'Mary Lou',
  jerry: 'Jerry', patricia: 'Patricia', nola: 'Nola', billybob: 'Billy Bob',
};

const MS = 86400000;

function isoLocal(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function dateLong(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function minus(iso, days) { return iso ? isoLocal(new Date(new Date(iso + 'T00:00:00').getTime() - days * MS)) : null; }
function plus(iso, days) { return iso ? isoLocal(new Date(new Date(iso + 'T00:00:00').getTime() + days * MS)) : null; }
function money(n) { return '$' + Number(n).toLocaleString('en-US'); }

// booking: { trailerId, arrival, nights, guest, email, site, plan,
//   dueToday, balanceLater, deposit, balanceChargeDate }
function buildGuestEmails(booking) {
  const trailerName = TRAILER_NAMES[booking.trailerId] || booking.trailerId;
  const arrIso = booking.arrival;
  const depIso = arrIso ? isoLocal(new Date(new Date(arrIso + 'T00:00:00').getTime() + booking.nights * MS)) : null;
  const datesLabel = arrIso ? (fmtDate(arrIso) + ' – ' + fmtDate(depIso)) : 'your dates';
  const name = booking.guest || 'there';
  const first = (name.split(' ')[0]) || 'there';
  const site = booking.site || 'your campsite';
  const firstNightPlan = booking.plan === 'firstnight';
  const todayIso = isoLocal(new Date());
  const msgs = [];

  if (firstNightPlan) {
    msgs.push({
      kind: 'confirmation', to: booking.email, sendAt: todayIso,
      subject: 'You’re reserved! ' + trailerName + ' for ' + datesLabel,
      body:
`Hi ${first},

Your Sweet Dreams RV reservation is confirmed.

  Trailer:   ${trailerName}
  Dates:     ${datesLabel}
  Delivery:  ${site}

You reserved with your first night (${money(booking.dueToday)}), paid today.

IMPORTANT: automatic balance charge
The remaining balance of ${money(booking.balanceLater)} (trip balance plus the ${money(booking.deposit)} refundable security deposit) will be charged automatically to the card on file on ${dateLong(booking.balanceChargeDate)}, two weeks before delivery. No action needed on your end. We'll send a reminder a few days beforehand.

Your ${money(booking.deposit)} deposit is refunded after the trailer is returned in good shape.

Questions? Just reply to this email or call (541) 630-4795.

See you out there,
Sweet Dreams RV Rentals`,
    });
    msgs.push({
      kind: 'balance-reminder', to: booking.email, sendAt: minus(booking.balanceChargeDate, 3),
      subject: 'Reminder: your ' + trailerName + ' balance is charged ' + dateLong(booking.balanceChargeDate),
      body:
`Hi ${first},

A quick heads up: the remaining balance for your ${trailerName} trip (${datesLabel}) will be charged automatically on ${dateLong(booking.balanceChargeDate)}.

  Amount:  ${money(booking.balanceLater)}
  Card:    the card you used to reserve

If anything needs to change, please reply or call (541) 630-4795 before that date.

Sweet Dreams RV Rentals`,
    });
    msgs.push({
      kind: 'balance-charged', to: booking.email, sendAt: booking.balanceChargeDate,
      subject: 'Payment received. You’re all set for ' + datesLabel,
      body:
`Hi ${first},

We've charged the remaining balance of ${money(booking.balanceLater)} to your card. Your ${trailerName} trip is fully paid.

  Dates:     ${datesLabel}
  Delivery:  ${site}

The ${money(booking.deposit)} security deposit included here is refunded after the trailer is returned.

We can't wait to get you set up.

Sweet Dreams RV Rentals`,
    });
  } else {
    msgs.push({
      kind: 'confirmation', to: booking.email, sendAt: todayIso,
      subject: 'You’re booked! ' + trailerName + ' for ' + datesLabel,
      body:
`Hi ${first},

Your Sweet Dreams RV reservation is confirmed and paid in full.

  Trailer:   ${trailerName}
  Dates:     ${datesLabel}
  Delivery:  ${site}
  Paid today: ${money(booking.dueToday)} (includes the ${money(booking.deposit)} refundable security deposit)

Your ${money(booking.deposit)} deposit is refunded after the trailer is returned in good shape.

Questions? Just reply to this email or call (541) 630-4795.

See you out there,
Sweet Dreams RV Rentals`,
    });
  }

  msgs.push({
    kind: 'delivery-reminder', to: booking.email, sendAt: minus(arrIso, 2),
    subject: 'We’re on our way soon. ' + trailerName + ' delivery ' + dateLong(arrIso),
    body:
`Hi ${first},

Your trip is almost here! We'll deliver and set up your ${trailerName} on ${dateLong(arrIso)} at ${site}.

  Check-in:  after 3 PM on arrival day
  Check-out: 11 AM–12 PM on ${dateLong(depIso)}

We'll walk you through everything on site. If your plans or site details changed, reply or call (541) 630-4795.

Sweet Dreams RV Rentals`,
  });

  msgs.push({
    kind: 'deposit-refund', to: booking.email, sendAt: plus(depIso, 1),
    subject: 'Your ' + money(booking.deposit) + ' deposit is on its way back',
    body:
`Hi ${first},

Thanks for camping with us! Now that your ${trailerName} is back and checked over, we've released your ${money(booking.deposit)} refundable security deposit. It should appear on your statement within a few business days.

We'd love to host you again.

Sweet Dreams RV Rentals`,
  });

  return { trailerName, datesLabel, messages: msgs.filter((m) => m.to && m.sendAt) };
}

module.exports = { buildGuestEmails, TRAILER_NAMES };
