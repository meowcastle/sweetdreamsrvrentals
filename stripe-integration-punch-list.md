# Stripe Integration Punch List: Sweet Dreams RV

Hand this to Claude Code as the spec. It maps the demo stubs already in the codebase to real
Stripe calls, and accounts for hosting on your Synology NAS.

## 1. Hosting on Synology: what changes

- Install Container Manager (Package Center, DSM 7.2+). This is Synology's Docker package,
  and it's the right way to run a Node backend plus a database side by side.
- Use a `docker-compose.yml` with two or three services: the Node app, a Postgres (or
  MariaDB) container, and optionally a proxy. Synology maps Docker volumes under
  `/volume1/docker/`, not the usual Linux paths, so point volumes there.
- Don't run a second nginx on ports 80/443. DSM already owns those. Use the built-in
  reverse proxy at Control Panel > Login Portal > Advanced > Reverse Proxy, and issue
  the cert under Control Panel > Security > Certificate (free Let's Encrypt, auto-renews).
- Stripe webhooks need a public HTTPS endpoint that's up 24/7. A residential connection
  and a NAS that occasionally reboots is a real risk once actual charges depend on it.
  Two ways to de-risk this:
  - Recommended: put the app behind a Cloudflare Tunnel. No port forwarding on your
    router, Cloudflare handles TLS and stays reachable even if your NAS briefly drops,
    and you get a stable public hostname without exposing your home IP.
  - Alternative: DDNS through Synology plus router port forwarding for 443, with DSM's
    reverse proxy terminating TLS. Works, but more surface area and no buffer if the
    NAS goes offline mid-charge cycle.
- Back up the Postgres volume with Hyper Backup. This is now financial data, not a demo
  seed array, so it needs a real backup plan, not just RAID.

## 2. Backend and data model

Replace the three `localStorage` keys with real tables. The existing JS object shapes in
`sd-bookings.js` and `sd-pricing.js` translate almost directly:

| localStorage key | Becomes |
|---|---|
| `sd_web_bookings` | `bookings` table |
| `sd_pricing` | `pricing_config` table (or a single-row JSON config table) |
| `sd_admin_overrides` | `booking_status_overrides` table |
| `sd_email_queue` | `email_queue` table |

Keep the pure date and pricing math in `sd-pricing.js` (`isSummer`, `nightlyRate`,
`stayRental`) as is. It's framework-agnostic and doesn't need to change, just the
`load()`/`save()` functions need to call the API instead of `localStorage`.

The `SEED` array in `sd-bookings.js` should stay around as a fixture for local dev and
the Playwright suite, but production reads should come from the database, not the seed.

## 3. Stripe account setup (one-time, manual)

- Create the Stripe account, grab test-mode keys.
- Enable Apple Pay, Google Pay, and Klarna in the Dashboard (the checkout copy already
  promises these, so this just has to be flipped on, no code change needed).
- Register a webhook endpoint in the Dashboard pointing at
  `https://yourdomain.com/api/webhooks/stripe`, and save the signing secret.

## 4. Mapping the existing stubs to real Stripe calls

**`CHECKOUT_ENDPOINT`** (`Sweet Dreams RV.dc.html`, line 964)
Build `POST /api/create-checkout-session`. Creates a Stripe Checkout Session for
`dueToday` (first night or full amount), with `setup_future_usage: 'off_session'` so the
card can be charged again later for the balance. Return `{ url }` and redirect. Do not
treat the browser's return to `?booking=success` as proof of payment: write the actual
booking row only when the `checkout.session.completed` webhook fires.

**Deposit refund, partial supported** (admin's refund modal, currently writes to local state only)
The front end already has the full partial-refund UI: an amount input capped at the
deposit (`doRefund`, Admin file, line 1096), a reason dropdown plus free-text note
(`refundReasons`, line 1089), and an optional emailed receipt. `refunds[id]` is already
stored as `{ amount, reason, emailed, email }`, not a boolean, so the data shape doesn't
need to change, it just needs to be backed by a real call instead of `setState`.

Since the deposit is collected as part of the up-front charge (not a separate manual-capture
hold, based on how `paidToday`/`deposit` already work in the data), the real implementation
is the Refunds API, not an authorize/capture pattern. Build
`POST /api/bookings/:id/refund-deposit` accepting `{ amount, reason }`, call
`stripe.refunds.create({ payment_intent, amount, reason: 'requested_by_customer' })`
(map the UI's descriptive reason into Stripe's own metadata field, since Stripe's `reason`
enum doesn't take free text), and persist the same `{ amount, reason, emailed, email }`
shape server-side so `refundedAmt()` reflects the database, not local component state.
If a booking can be refunded more than once (partial now, more later), store refunds as
a list and sum them rather than overwriting a single record.

**Balance auto-charge, 14 days before arrival**
This is the piece that actually benefits from being on an always-on NAS instead of
serverless: a daily cron job (`node-cron` inside the app container) that queries bookings
where `paymentPlan === 'firstnight'`, `balanceChargeDate` is today, and the balance
hasn't been charged. For each, call `stripe.paymentIntents.create` with the saved
`payment_method` and `customer`, `off_session: true`, `confirm: true`.
- On success: mark charged in the DB, which flips the admin's deposit-status labels.
- On decline: set `balanceChargeFailed = true` (this field already exists in the seed
  data, so the admin UI already knows how to show it) and fire a notification.
The admin's existing `retryCharge` function (Admin file, line 1666) should call
`POST /api/bookings/:id/retry-charge`, which re-attempts the same off-session PaymentIntent.

**`MAILER_ENDPOINT`**
Build `POST /api/send-guest-email`. The front end already builds the full email schedule
client-side (`buildGuestEmails`) and writes it to a queue; the endpoint just needs to
accept `{ messages: [...] }` and either send immediately or store `sendAt` for the same
cron sweep that handles balance charges.

**`NOTIFY_ENDPOINT`**
Build `POST /api/notify`. Low lift: forward to email or Slack for `info@sweetdreamsrvrentals.com`.

**Webhooks to handle**
`checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`,
`charge.refunded`, `charge.dispute.created`. Verify the signature on every request using
the webhook secret from step 3.

**Admin login** (not a Stripe item, but blocks everything above from being safe to expose)
The login gate is currently cosmetic: `signIn()` sets `localStorage.setItem('sd_admin_session', '1')`
regardless of what's typed, and the password field isn't wired to any value or check
(Admin file, around line 1564 previously, `signIn` handler). Once real money and refund
actions are behind this screen, it needs actual server-side auth, a real password check
plus a session token, not a client-side flag. Build this alongside the backend, before
anything in section 4 goes live, not after.

## 5. Build order

1. Scaffold the actual Node/Express backend: `package.json`, a server entry point,
   `stripe` and `pg` deps, empty route stubs. Nothing in this repo is containerizable
   yet, it's currently 100% static `.dc.html` files plus `sd-bookings.js`/`sd-pricing.js`
   writing to `localStorage`, served in dev by a plain `python3 -m http.server`. This
   step has to exist before step 2 has anything to put in a container.
2. Docker Compose on the Synology: Node app + Postgres, via Container Manager
3. Domain, Cloudflare Tunnel (or DDNS + reverse proxy), Let's Encrypt cert
4. Real admin auth: server-side password check plus session token, replacing the
   client-side `sd_admin_session` flag
5. Migrate the three localStorage shapes to Postgres tables
6. Back up the Postgres volume with Hyper Backup, configured before any real booking
   or payment data lands in it, not after
7. Stripe test-mode account: grab keys, enable Apple Pay/Google Pay/Klarna in the
   Dashboard, register the webhook endpoint
8. `POST /api/create-checkout-session`, wire up `CHECKOUT_ENDPOINT`
9. Rate-limit the public endpoints (`create-checkout-session`, the webhook route)
   now that they're reachable from the open internet via the tunnel from step 3
10. Webhook handler: `checkout.session.completed` writes the booking, `payment_intent.*`
    updates payment status
11. Refund endpoint with amount and reason, wire up the admin's existing refund modal
12. Daily cron: balance auto-charge sweep, plus the retry-charge endpoint
13. Email queue sweep, wire up `MAILER_ENDPOINT`
14. Wire up `NOTIFY_ENDPOINT`
15. Point the existing Playwright chaos suite at the real backend instead of localStorage,
    confirm the same invariants (no double-booked trailers, no out-of-range stays) still hold
16. Switch Stripe to live keys and go live

## 6. Notes for Claude Code

- The secret key must live in the backend's environment only. It already never touches
  the `.dc.html` files, which is correct, keep it that way.
- Test with Stripe's test cards, including ones that force a 3D Secure challenge and ones
  that decline off-session charges, before step 12.
- Rate-limit the public endpoints (`create-checkout-session`, the webhook route) since
  they'll be reachable from the open internet once the tunnel is live.
