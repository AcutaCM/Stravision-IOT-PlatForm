
import { getDB, initDB } from '../lib/db/database';

async function listUsers() {
  try {
    await initDB();
    const db = getDB();
    const users = db.prepare('SELECT * FROM users').all();
    console.log('Users found:', users.length);
    users.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
    });
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

listUsers();
