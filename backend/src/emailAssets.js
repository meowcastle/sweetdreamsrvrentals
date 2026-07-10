// Logo/trailer-icon images for email templates. Gmail (and some other
// webmail clients) strips `data:` URI images from received mail - a known,
// deliberate anti-spam/anti-tracking measure, not something fixable from
// the sending side - so an embedded base64 image (the first thing tried
// here) silently disappears specifically in Gmail while rendering fine
// elsewhere. Real, fetchable HTTPS URLs are the only approach that works
// everywhere.
//
// Before sweetdreamsrvrentals.com is live (still on Wix - see
// live_site_protection), there's no production URL to host these from, so
// this points at the repo's own raw GitHub content instead: stable, public,
// no new account needed, and it already works today. Swap these for the
// real domain's own copies once the site is live - same filenames, so it's
// a one-line change, not a redesign.
const LOGO_WHITE_URL = 'https://raw.githubusercontent.com/meowcastle/sweetdreamsrvrentals/main/logo-white.png';
const TRAILER_WHITE_URL = 'https://raw.githubusercontent.com/meowcastle/sweetdreamsrvrentals/main/trailer-white.png';

module.exports = { LOGO_WHITE_URL, TRAILER_WHITE_URL };
