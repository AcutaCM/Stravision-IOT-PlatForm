import { createUser, getUserByEmail } from "../lib/db/user-service";

const args = process.argv.slice(2);
const email = args[0] || process.env.ADMIN_EMAIL || "admin@system.local";
const password = args[1] || process.env.ADMIN_PASSWORD || "SuperSecretPassword123!";
const username = args[2] || process.env.ADMIN_USERNAME || "SystemAdmin";

async function main() {
  console.log(`Creating super admin with email: ${email}`);

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log(`User ${email} already exists.`);
      return;
    }

    const user = await createUser({
      email,
      password,
      username,
      role: 'super_admin',
      permissions: {
        allowedControls: ['*']
      }
    });

    console.log("Super admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Failed to create super admin:", error);
    process.exit(1);
  }
}

main().catch(console.error);
