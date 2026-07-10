-- Replaces the three localStorage keys (plus the previously-ephemeral admin
-- blocks/phone bookings) with real tables. See stripe-integration-punch-list.md
-- Section 2. Idempotent: safe to run against an already-migrated database.

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  trailer TEXT NOT NULL,
  arrival DATE NOT NULL,
  nights INTEGER NOT NULL,
  guest TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  site TEXT,
  addons TEXT[] NOT NULL DEFAULT '{}',
  total INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,       -- 'confirmed' | 'pending' | 'returned' | 'block'
  source TEXT NOT NULL,     -- 'web' | 'phone' | 'admin'
  pay_status TEXT,
  pay_method TEXT,
  plan TEXT,                -- 'full' | 'firstnight' (web bookings only)
  deposit INTEGER,
  paid_today INTEGER,
  grand_total INTEGER,
  due_today INTEGER,
  balance_later INTEGER,
  balance_charge_date DATE,
  balance_charge_failed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_trailer_arrival_idx ON bookings (trailer, arrival);

-- Added for step 10 (webhook handler). Additive ALTERs rather than columns
-- on the original CREATE TABLE, since that statement is skipped entirely
-- once the table already exists - these need to apply to already-migrated
-- databases (local + the Synology) too, not just fresh ones.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Added for step 12 (balance auto-charge). Separate from
-- stripe_payment_intent_id (the original deposit/first-night charge) since
-- the balance is a second, later PaymentIntent against the saved card.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id TEXT;

-- One row per booking. Mirrors the old sd_admin_overrides shape
-- ({status, cancelled, charges, refunds}, each keyed by booking id) as real
-- columns instead of four parallel maps.
CREATE TABLE IF NOT EXISTS booking_status_overrides (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  charge_status TEXT,       -- 'paid' | 'failed' (balance auto-charge override)
  refund_amount INTEGER,
  refund_reason TEXT,
  refund_emailed BOOLEAN,
  refund_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton row: the pricing config is one global admin-edited blob, not
-- naturally relational. Per punch list Section 2, a single-row JSON table.
CREATE TABLE IF NOT EXISTS pricing_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_config_singleton CHECK (id = 1)
);

-- Flattened to one row per message (not one row per booking with a nested
-- messages array) since that's the atomic unit the future cron sweep
-- (build order step 13) will query by send_at.
CREATE TABLE IF NOT EXISTS email_queue (
  id SERIAL PRIMARY KEY,
  booking_id TEXT,
  guest TEXT,
  recipient TEXT NOT NULL,
  trailer TEXT,
  dates_label TEXT,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  send_at DATE,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS email_queue_send_at_idx ON email_queue (send_at) WHERE NOT sent;

-- Real send attempts (build order step 13, part 2 - wiring in an actual mail
-- provider). A failed send must never be silently marked sent - it needs to
-- be retried on the next sweep and stay visible to whoever checks
-- GET /api/email-queue, so track both how many times it's been tried and
-- what went wrong last.
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Styled HTML alongside the plain-text `body` (see emailTemplates.js).
-- Nullable: a message queued with only `body` still sends fine as
-- plain-text-only, so nothing upstream is forced to supply this.
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS html TEXT;

-- Replaces the single ADMIN_EMAIL/ADMIN_PASSWORD_HASH env-var pair with real
-- named logins - every row is an equal-privilege admin (no roles), matching
-- how this dashboard has always worked, just no longer limited to one
-- person. scripts/migrate.js seeds the first row from those env vars the
-- first time this table is empty, so an existing deployment's login keeps
-- working without manual intervention.
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
