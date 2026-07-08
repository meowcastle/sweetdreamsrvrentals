const { Pool, types } = require('pg');

// DATE columns (OID 1082): return the raw 'YYYY-MM-DD' string instead of
// letting node-postgres parse it into a JS Date. The app treats dates as
// plain ISO strings everywhere (isoLocal(), arrival, etc.); parsing into a
// Date here would reinterpret it in the server's local timezone and can
// silently shift the date by a day.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
