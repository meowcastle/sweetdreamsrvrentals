/* ────────────────────────────────────────────────────────────────
   Sweet Dreams RV — shared pricing config.
   Single source of truth for the owner admin (writes) and the
   public booking site (reads). Persisted in localStorage under
   `sd_pricing`. Any save broadcasts so an open front-end updates live.
   ──────────────────────────────────────────────────────────────── */
(function () {
  var KEY = 'sd_pricing';

  var DEFAULTS = {
    // Base nightly rate per trailer (the weekday, off-season rate).
    // Base = off-season nightly rate. Summer adds $20 → live summer rates:
    // Charlie 159, Ella/Virginia 169, Mary Lou 164, Jerry/Patricia/Nola/Billy Bob 179.
    trailers: {
      charlie: 139, ella: 149, virginia: 149, marylou: 144,
      jerry: 159, patricia: 159, nola: 159, billybob: 159,
    },
    // Flat $ added to each night that falls inside the summer window.
    summer: { amount: 20, startMonth: 6, startDay: 1, endMonth: 9, endDay: 15 },
    // Delivery: free inside the radius, one flat fee beyond it.
    delivery: { freeRadius: 100, beyondFee: 120 },
    fees: { prep: 95, deposit: 1000, pet: 45 },
    stay: { min: 3, max: 14 },
    // qty:true lets guests pick more than one, up to maxQty. qty:false = single unit.
    addons: [
      { id: 'kayak',  name: 'Kayak',                  price: 45,  active: true, qty: true,  maxQty: 4 },
      { id: 'sup',    name: 'Paddleboard',            price: 45,  active: true, qty: true,  maxQty: 4 },
      { id: 'pedal',  name: 'Pedal boat',             price: 65,  active: true, qty: false, maxQty: 1 },
      { id: 'cabana', name: 'Floating island cabana', price: 120, active: true, qty: false, maxQty: 1 },
      { id: 'bikes',  name: 'Bikes (pair)',           price: 60,  active: true, qty: true,  maxQty: 3 },
      { id: 'grill',  name: 'Propane grill',          price: 25,  active: true, qty: false, maxQty: 1 },
      { id: 'wood',   name: 'Firewood bundle',        price: 20,  active: true, qty: true,  maxQty: 8 },
      { id: 'chairs', name: 'Camp chairs (set)',      price: 15,  active: true, qty: true,  maxQty: 4 },
    ],
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Merge a stored config over the defaults so new fields always exist.
  function merge(stored) {
    var d = clone(DEFAULTS);
    if (!stored || typeof stored !== 'object') return d;
    if (stored.trailers) Object.assign(d.trailers, stored.trailers);
    if (stored.summer)   Object.assign(d.summer, stored.summer);
    if (stored.delivery) Object.assign(d.delivery, stored.delivery);
    if (stored.fees)     Object.assign(d.fees, stored.fees);
    if (stored.stay)     Object.assign(d.stay, stored.stay);
    if (Array.isArray(stored.addons)) d.addons = stored.addons.map(function (a) {
      return { id: a.id, name: a.name, price: Number(a.price) || 0, active: a.active !== false,
               qty: a.qty === true, maxQty: Math.max(1, Number(a.maxQty) || 1) };
    });
    return d;
  }

  // Backed by GET/PUT /api/pricing now, not localStorage. load() stays
  // synchronous (it's called inline during render, same as before) by
  // reading an in-memory cache; the cache is populated by an async fetch
  // and callers find out it changed via the same 'sd-pricing-changed' event
  // this module already dispatched for the old same-document localStorage
  // case, so existing listeners in the RV/Pricing/Admin files don't need to
  // change to pick up the real data once it arrives.
  var cache = null;
  var refreshing = null;

  function refresh() {
    if (refreshing) return refreshing;
    refreshing = fetch('/api/pricing', { credentials: 'include' })
      .then(function (res) { return res.json(); })
      .then(function (cfg) {
        cache = merge(cfg);
        window.dispatchEvent(new CustomEvent('sd-pricing-changed', { detail: cache }));
        return cache;
      })
      .catch(function () { /* keep whatever's already cached (or defaults) */ })
      .finally(function () { refreshing = null; });
    return refreshing;
  }

  function load() {
    if (cache === null) {
      cache = clone(DEFAULTS);
      refresh();
    }
    return cache;
  }

  function save(cfg) {
    cache = cfg;
    window.dispatchEvent(new CustomEvent('sd-pricing-changed', { detail: cfg }));
    return fetch('/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(cfg),
    }).catch(function () {});
  }

  // Keep pricing fresh across tabs/sessions now that a 'storage' event
  // between browsers can't do it — this module owns its own polling so
  // every consumer (RV, Pricing, Admin) gets it for free.
  refresh();
  setInterval(refresh, 30000);

  // ── Pure pricing math ───────────────────────────────────────────
  function isSummer(d, cfg) {
    var s = cfg.summer;
    if (!s || !s.amount) return false;
    var y = d.getFullYear();
    var start = new Date(y, s.startMonth - 1, s.startDay);
    var end = new Date(y, s.endMonth - 1, s.endDay);
    if (end < start) end = new Date(y + 1, s.endMonth - 1, s.endDay); // window wraps year
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return t >= start && t <= end;
  }

  // Rate for a single night given the trailer's base rate.
  function nightlyRate(base, d, cfg) {
    var r = base;
    if (isSummer(d, cfg)) r += (cfg.summer.amount || 0);
    return r;
  }

  // Total rental across a stay. If no start date is known yet, fall back
  // to the flat base rate (summer rate can't be applied without dates).
  function stayRental(base, start, nights, cfg) {
    if (!start || isNaN(start)) return base * nights;
    var sum = 0;
    for (var k = 0; k < nights; k++) {
      sum += nightlyRate(base, new Date(start.getTime() + k * 86400000), cfg);
    }
    return sum;
  }

  function fmt(n) { return '$' + Number(n).toLocaleString('en-US'); }

  window.SDPricing = {
    KEY: KEY, DEFAULTS: DEFAULTS, clone: clone, merge: merge,
    load: load, save: save, refresh: refresh,
    isSummer: isSummer,
    nightlyRate: nightlyRate, stayRental: stayRental, fmt: fmt,
  };
})();
