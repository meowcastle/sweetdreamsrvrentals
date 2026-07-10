#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

// One-time bootstrap: if nobody's in admin_users yet (fresh table, or a
// deployment upgrading from the old env-var-only login), seed the first row
// from ADMIN_EMAIL/ADMIN_PASSWORD_HASH so the existing login keeps working
// without manually inserting a row. Does nothing once at least one admin
// user already exists.
async function seedAdminFromEnv() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM admin_users');
  if (rows[0].count > 0) return;
  const email = process.env.ADMIN_EMAIL;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!email || !hash) {
    console.log('No admin_users yet and no ADMIN_EMAIL/ADMIN_PASSWORD_HASH set - skipping seed.');
    return;
  }
  await pool.query('INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)', [email.toLowerCase(), hash]);
  console.log(`Seeded initial admin user from ADMIN_EMAIL: ${email}`);
}

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  await seedAdminFromEnv();
  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
