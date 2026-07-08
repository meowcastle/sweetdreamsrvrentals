#!/usr/bin/env node
// Generates the value for ADMIN_PASSWORD_HASH in backend/.env.
// Usage: npm run hash-password -- 'your-real-password'
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- 'your-real-password'");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
