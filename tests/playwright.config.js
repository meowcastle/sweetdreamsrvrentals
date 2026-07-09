// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

// The booking UI is a single Design Component file at the project root. We serve
// the whole project statically so the DC runtime (support.js, image-slot.js) and
// its sibling assets resolve exactly as they do in the live preview.
const PORT = Number(process.env.PORT || 4321);

// Static file server. Python's http.server has no extra install step; swap for
// `npx --yes serve -l ${PORT} .` if you prefer Node. Served from the PROJECT ROOT
// (one level up from this tests/ folder).
const SERVE_CMD =
  process.env.SERVE_CMD ||
  `python3 -m http.server ${PORT} --bind 127.0.0.1`;

// Escape hatch: set PW_CHANNEL=chrome (or msedge) to drive a browser you already
// have installed instead of Playwright's downloaded Chromium. Handy when the
// `playwright install` download is blocked by a proxy/VPN.
const CHANNEL = process.env.PW_CHANNEL;
const channelUse = CHANNEL ? { channel: CHANNEL } : {};

module.exports = defineConfig({
  testDir: './specs',
  globalSetup: require.resolve('./global-setup'),
  // Chaos runs can take a while; give them room. Override per-project below.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Booking state is the real backend's Postgres now (build order step 15),
  // shared across every test/project - parallel runs would clearStore() out
  // from under each other. Keep serial.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Deterministic viewport; the mobile project overrides it.
    viewport: { width: 1280, height: 900 },
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], ...channelUse },
    },
    {
      // Mobile is mission-critical for this product — run the whole suite on a phone too.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], ...channelUse },
    },
  ],

  webServer: {
    command: SERVE_CMD,
    cwd: path.join(__dirname, '..'),
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
