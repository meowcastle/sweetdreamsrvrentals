// Server-side mirror of sd-pricing.js's math, plus the campground mileage
// table from Sweet Dreams RV.dc.html. This exists for exactly one reason:
// create-checkout-session is a public endpoint, and the amount to charge
// can't be trusted from the client - anyone can edit a POST body before it's
// sent. This independently recomputes the authoritative total from the same
// pricing config the customer's browser used, so a tampered price gets
// rejected instead of charged.
const pool = require('./db');

const DEFAULTS = {
  trailers: {
    charlie: 139, ella: 149, virginia: 149, marylou: 144,
    jerry: 159, patricia: 159, nola: 159, billybob: 159,
  },
  summer: { amount: 20, startMonth: 6, startDay: 1, endMonth: 9, endDay: 15 },
  delivery: { freeRadius: 100, beyondFee: 120 },
  fees: { prep: 95, deposit: 1000, pet: 45 },
  stay: { min: 3, max: 14 },
  addons: [
    { id: 'kayak', name: 'Kayak', price: 45, active: true, qty: true, maxQty: 4 },
    { id: 'sup', name: 'Paddleboard', price: 45, active: true, qty: true, maxQty: 4 },
    { id: 'pedal', name: 'Pedal boat', price: 65, active: true, qty: false, maxQty: 1 },
    { id: 'cabana', name: 'Floating island cabana', price: 120, active: true, qty: false, maxQty: 1 },
    { id: 'bikes', name: 'Bikes (pair)', price: 60, active: true, qty: true, maxQty: 3 },
    { id: 'grill', name: 'Propane grill', price: 25, active: true, qty: false, maxQty: 1 },
    { id: 'wood', name: 'Firewood bundle', price: 20, active: true, qty: true, maxQty: 8 },
    { id: 'chairs', name: 'Camp chairs (set)', price: 15, active: true, qty: true, maxQty: 4 },
  ],
};

// Mirrors sd-pricing.js's merge(): fills in anything missing from a stored
// config with the defaults, so a partially-saved config never breaks pricing.
function mergeConfig(stored) {
  const d = JSON.parse(JSON.stringify(DEFAULTS));
  if (!stored || typeof stored !== 'object') return d;
  if (stored.trailers) Object.assign(d.trailers, stored.trailers);
  if (stored.summer) Object.assign(d.summer, stored.summer);
  if (stored.delivery) Object.assign(d.delivery, stored.delivery);
  if (stored.fees) Object.assign(d.fees, stored.fees);
  if (stored.stay) Object.assign(d.stay, stored.stay);
  if (Array.isArray(stored.addons)) {
    d.addons = stored.addons.map((a) => ({
      id: a.id, name: a.name, price: Number(a.price) || 0, active: a.active !== false,
      qty: a.qty === true, maxQty: Math.max(1, Number(a.maxQty) || 1),
    }));
  }
  return d;
}

async function getEffectiveConfig() {
  const { rows } = await pool.query('SELECT config FROM pricing_config WHERE id = 1');
  return mergeConfig(rows[0] ? rows[0].config : null);
}

// Mirrors sd-bookings.js's pstToday(): "today" anchored to the business's
// actual timezone, not the server's or the client's.
function pstToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const get = (t) => +parts.find((p) => p.type === t).value;
  return new Date(get('year'), get('month') - 1, get('day'));
}

function isSummer(d, cfg) {
  const s = cfg.summer;
  if (!s || !s.amount) return false;
  const y = d.getFullYear();
  let start = new Date(y, s.startMonth - 1, s.startDay);
  let end = new Date(y, s.endMonth - 1, s.endDay);
  if (end < start) end = new Date(y + 1, s.endMonth - 1, s.endDay);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return t >= start && t <= end;
}

function nightlyRate(base, d, cfg) {
  let r = base;
  if (isSummer(d, cfg)) r += (cfg.summer.amount || 0);
  return r;
}

function stayRental(base, startDate, nights, cfg) {
  let sum = 0;
  for (let k = 0; k < nights; k++) {
    sum += nightlyRate(base, new Date(startDate.getTime() + k * 86400000), cfg);
  }
  return sum;
}

// From Sweet Dreams RV.dc.html's campgroundMiles - used only to validate the
// delivery fee (0 vs. beyondFee), same as the frontend's own auto-detection.
const CAMPGROUND_MILES = {
  'Valley of the Rogue State Park': 18, 'Joseph H. Stewart Rec Area': 48,
  'Emigrant Lake': 45, 'Southern Oregon RV Park': 28, 'Willow Lake': 58,
  'Rogue Elk': 42, 'Howard Prairie': 60, 'Indian Mary': 16,
  "Ashland's Creekside Campground & RV Park": 42, 'Holiday RV Park': 30,
  'Rock Point RV': 22, 'Fish Lake Resort': 70, 'Lake of the Woods Resort': 78,
  'Laughing Alpaca Campground & RV Park': 35, 'Blue Heron RV Park': 52,
  'Crater Lake Resort': 105, 'Redwoods RV Park': 92, 'Mill Creek': 118,
  'Union Creek': 96, 'Farewell Bend': 112, 'Natural Bridge': 106,
};

// The client combines the picked campground with an optional site number/
// address into one string before sending it - siteValue() in the RV file
// joins them as "<campground> · <detail>" whenever a detail is present.
// CAMPGROUND_MILES is keyed on the bare campground name, so without this,
// any booking that both (a) picks a campground beyond the free-delivery
// radius and (b) fills in a site number - which is the normal, expected
// case, not an edge case - fails this lookup, computes delivery as $0
// server-side, mismatches the client's real (non-zero) delivery charge, and
// gets rejected as a price mismatch.
function campgroundNameFrom(deliverySite) {
  const s = String(deliverySite || '');
  const i = s.indexOf(' · ');
  return i === -1 ? s : s.slice(0, i);
}

// Parses "Kayak" or "Kayak ×2" (see selectedAddonNames in the RV file) back
// into { name, qty } and looks up its current price.
function addonsTotalFor(addonLabels, cfg) {
  const byName = {};
  (cfg.addons || []).forEach((a) => { byName[a.name] = a; });
  let total = 0;
  (addonLabels || []).forEach((label) => {
    const m = String(label).match(/^(.*?)(?:\s*×(\d+))?$/);
    const name = (m ? m[1] : String(label)).trim();
    const qty = m && m[2] ? Number(m[2]) : 1;
    const a = byName[name];
    if (a) total += a.price * qty;
  });
  return total;
}

// The authoritative version of everything Sweet Dreams RV.dc.html computes
// client-side for the reserve modal: rental, fees, delivery, addons, the
// 14-day-out payment-plan rule, and the resulting dueToday/balanceLater
// split. Throws on an unknown trailer.
function computeExpected(cfg, { trailerId, arrival, nights, deliverySite, addons, requestedPlan }) {
  const base = cfg.trailers[trailerId];
  if (base == null) throw new Error('unknown_trailer');

  const arrivalDate = new Date(arrival + 'T00:00:00');
  const rental = stayRental(base, arrivalDate, nights, cfg);
  const prep = cfg.fees.prep || 0;
  const deposit = cfg.fees.deposit || 0;

  const miles = CAMPGROUND_MILES[campgroundNameFrom(deliverySite)];
  const radius = cfg.delivery.freeRadius || 100;
  const delivery = (typeof miles === 'number' && miles > radius) ? (cfg.delivery.beyondFee || 0) : 0;

  const addonsTotal = addonsTotalFor(addons, cfg);

  const tripTotal = rental + prep + delivery + addonsTotal;
  const grandTotal = tripTotal + deposit;

  const firstNight = stayRental(base, arrivalDate, 1, cfg);
  const today = pstToday();
  const daysUntilArrival = Math.round((arrivalDate.getTime() - today.getTime()) / 86400000);
  const farOut = daysUntilArrival >= 14;
  // Mirrors the frontend exactly: near-term bookings can't choose
  // first-night-only, regardless of what the client requests.
  const plan = farOut ? (requestedPlan === 'firstnight' ? 'firstnight' : 'full') : 'full';
  const dueToday = plan === 'firstnight' ? firstNight : grandTotal;
  const balanceLater = grandTotal - dueToday;
  const balanceChargeDate = new Date(arrivalDate.getTime() - 14 * 86400000);

  return {
    rental, prep, deposit, delivery, addonsTotal, tripTotal, grandTotal,
    plan, dueToday, balanceLater, balanceChargeDate,
  };
}

module.exports = { getEffectiveConfig, mergeConfig, DEFAULTS, computeExpected, pstToday };
