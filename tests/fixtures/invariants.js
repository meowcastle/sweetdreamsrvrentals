// Pure re-implementation of the booking rules the UI must never violate.
// The chaos + logic specs read the localStorage store and assert it always
// satisfies these. Keep this in sync with Sweet Dreams RV.dc.html:
//   - occupancy interval is HALF-OPEN: [arrival, arrival + nights)
//   - same-day turnaround is allowed (one checks out as another checks in)
//   - stays are 3..14 nights
//   - a trailer may never have two overlapping bookings

const MIN_NIGHTS = 3;
const MAX_NIGHTS = 14;
const DAY = 86400000;

const TRAILER_IDS = [
  'charlie', 'ella', 'virginia', 'marylou', 'jerry', 'patricia', 'nola', 'billybob',
];

function parseArrival(b) {
  const ms = Date.parse(b.arrival + 'T00:00:00');
  return Number.isNaN(ms) ? null : ms;
}

// Half-open overlap for two bookings of the SAME trailer.
function overlaps(a, b) {
  if (a.trailer !== b.trailer) return false;
  const as = parseArrival(a);
  const bs = parseArrival(b);
  if (as == null || bs == null) return false;
  const ae = as + (Number(a.nights) || 0) * DAY;
  const be = bs + (Number(b.nights) || 0) * DAY;
  return as < be && bs < ae; // touching endpoints do NOT overlap (turnaround allowed)
}

function findOverlaps(bookings) {
  const hits = [];
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      if (overlaps(bookings[i], bookings[j])) hits.push([bookings[i], bookings[j]]);
    }
  }
  return hits;
}

// Returns a list of human-readable violations; empty array === valid store.
function validateStore(bookings) {
  const problems = [];
  bookings.forEach((b, i) => {
    if (!b || typeof b !== 'object') {
      problems.push(`booking[${i}] is not an object`);
      return;
    }
    if (parseArrival(b) == null) {
      problems.push(`booking[${i}] (${b.id}) has invalid arrival "${b.arrival}"`);
    }
    const n = Number(b.nights);
    if (!Number.isFinite(n) || n < MIN_NIGHTS || n > MAX_NIGHTS) {
      problems.push(`booking[${i}] (${b.id}) nights=${b.nights} outside ${MIN_NIGHTS}..${MAX_NIGHTS}`);
    }
    if (b.trailer && !TRAILER_IDS.includes(b.trailer)) {
      problems.push(`booking[${i}] (${b.id}) unknown trailer "${b.trailer}"`);
    }
  });
  for (const [a, b] of findOverlaps(bookings)) {
    problems.push(
      `overlap on trailer "${a.trailer}": ${a.id} (${a.arrival} x${a.nights}) ⨯ ${b.id} (${b.arrival} x${b.nights})`
    );
  }
  return problems;
}

// Given an existing store, is this proposed booking placeable?
function isPlaceable(existing, proposal) {
  const n = Number(proposal.nights);
  if (!Number.isFinite(n) || n < MIN_NIGHTS || n > MAX_NIGHTS) return false;
  if (parseArrival(proposal) == null) return false;
  return !existing.some((b) => overlaps(b, proposal));
}

function iso(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

module.exports = {
  MIN_NIGHTS,
  MAX_NIGHTS,
  DAY,
  TRAILER_IDS,
  overlaps,
  findOverlaps,
  validateStore,
  isPlaceable,
  iso,
};
