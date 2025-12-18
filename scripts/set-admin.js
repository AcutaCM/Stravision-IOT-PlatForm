const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'users.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

const email = process.argv[2];
const role = process.argv[3] || 'super_admin';

if (!email) {
  console.log('Usage: node scripts/set-admin.js <email> [role]');
  process.exit(1);
}

try {
  // Check if role column exists (migration might not have run if app hasn't started)
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasRole = tableInfo.some(col => col.name === 'role');
  
  if (!hasRole) {
    console.log('Adding role column...');
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
    db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'");
  }

  const stmt = db.prepare("UPDATE users SET role = ? WHERE email = ?");
  const info = stmt.run(role, email);

  if (info.changes > 0) {
    console.log(`User ${email} is now ${role}`);
  } else {
    console.log(`User ${email} not found`);
  }
} catch (e) {
  console.error('Error:', e);
}
