// Pins CHAOS_SEED once, in the main process, before Playwright's test-listing
// phase and any worker process each independently require() chaos.spec.js.
// That file computes its random-session test titles from CHAOS_SEED at
// module-load time; left to its own default (String(Date.now())), the
// lister's require and a worker's later require land on different
// timestamps, producing different titles - Playwright then can't match the
// worker's test back to the one it discovered ("Test not found in the
// worker process"). Setting the env var here, before either require
// happens, makes every process see the same value.
//
// Also fails fast with a clear message if the real backend isn't running -
// every spec depends on it (build order step 15), and a plain Playwright
// timeout deep in some selector wait is a much worse way to discover that.
module.exports = async () => {
  if (!process.env.CHAOS_SEED) process.env.CHAOS_SEED = String(Date.now());

  const api = require('./fixtures/api');
  const up = await api.checkBackendUp();
  if (!up) {
    throw new Error(
      `Backend not reachable at ${api.BASE_URL}/api/health - start it first (docker compose up -d from the project root).`,
    );
  }

  // One real login here, in the single main process, shared to every
  // worker via env - see the comment in fixtures/api.js for why each worker
  // logging in independently trips the login route's rate limiter.
  if (!process.env.TEST_ADMIN_COOKIE) {
    process.env.TEST_ADMIN_COOKIE = await api.adminLogin();
  }
};
