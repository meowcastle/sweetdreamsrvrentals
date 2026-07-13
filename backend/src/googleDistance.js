// Real driving distance from the Merlin, OR base to an arbitrary guest-
// entered address, used for delivery pricing on an unlisted ("Other")
// location. Known campgrounds skip this entirely and use the curated
// CAMPGROUND_MILES figure in pricing.js instead - this only runs when a
// guest's address doesn't match one of those, so the common case (a known
// campground) costs nothing and calls no external service.
const ORIGIN = 'Merlin, OR';
const METERS_PER_MILE = 1609.344;

// Returns miles (driving distance) or null if the address can't be resolved
// (Google's own NOT_FOUND/ZERO_RESULTS - a bad or nonexistent address, not
// an error on our end). Throws on a real failure (missing key, network
// error, bad response shape) so callers can tell "address is junk" apart
// from "the lookup itself broke."
async function drivingMilesFromMerlin(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json?' + new URLSearchParams({
    origins: ORIGIN, destinations: address, units: 'imperial', key,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Distance Matrix HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`Distance Matrix API status: ${data.status}`);

  const el = data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0];
  if (!el || el.status !== 'OK') return null;
  return el.distance.value / METERS_PER_MILE;
}

module.exports = { drivingMilesFromMerlin };
