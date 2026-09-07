/**
 * DAILY GRACE — Admin Password Reset Script
 *
 * Usage:
 *   node scripts/resetAdminPassword.js <newPassword>
 *
 * This script resets the bcrypt password hash for admindailygrace@gmail.com.
 * It also marks the admin account as email_verified = true so that
 * the existing login flow can complete successfully.
 *
 * NEVER expose or log the password.
 */

import bcrypt from 'bcrypt';
import { UserRepository } from '../src/repositories/userRepository.js';
import { closePool, checkDbConnection } from '../src/config/db.js';

const ADMIN_EMAIL = 'admindailygrace@gmail.com';
const SALT_ROUNDS = 12;

async function resetAdminPassword() {
  const newPassword = process.argv[2];

  if (!newPassword || newPassword.trim().length < 8) {
    console.error('\n[ERROR] Please provide a password of at least 8 characters.');
    console.error('  Usage: node scripts/resetAdminPassword.js <newPassword>\n');
    process.exit(1);
  }

  console.log('\n========== DAILY GRACE — ADMIN PASSWORD RESET ==========');
  console.log(`Target account: ${ADMIN_EMAIL}`);

  await checkDbConnection();

  try {
    // 1. Verify the target account exists
    const admin = await UserRepository.findByEmail(ADMIN_EMAIL);

    if (!admin) {
      console.error(`[ERROR] No PostgreSQL user found for: ${ADMIN_EMAIL}`);
      console.error('        Run scripts/createAdmin.js first.\n');
      process.exit(1);
    }

    console.log(`Found: ID=${admin.id}  role=${admin.role}  email_verified=${admin.email_verified}`);

    // 2. Hash the new password using the same algorithm as registration
    const passwordHash = await bcrypt.hash(newPassword.trim(), SALT_ROUNDS);

    // 3. Verify the hash round-trips correctly before writing to DB
    const verified = await bcrypt.compare(newPassword.trim(), passwordHash);
    if (!verified) {
      console.error('[ERROR] bcrypt round-trip verification failed. Aborting.');
      process.exit(1);
    }

    // 4. Update the password hash in PostgreSQL
    await UserRepository.updatePasswordHash(admin.id, passwordHash);

    // 5. Mark email as verified (admin owns the email address)
    //    The standard verification email flow is bypassed here intentionally
    //    because the administrator is setting up their own trusted account.
    if (!admin.email_verified) {
      await UserRepository.markEmailVerified(admin.id);
      console.log('email_verified set to true (admin account owner).');
    }

    // 6. Confirm the role is still admin
    if (admin.role !== 'admin') {
      await UserRepository.setRole(admin.id, 'admin');
      console.log('role corrected to: admin');
    }

    console.log('\n[SUCCESS] Admin password reset and account verified.');
    console.log(`  Email         : ${ADMIN_EMAIL}`);
    console.log(`  ID            : ${admin.id}`);
    console.log(`  role          : admin`);
    console.log(`  email_verified: true`);
    console.log(`  password_hash : [SET — not disclosed]`);
    console.log('=========================================================\n');
  } catch (err) {
    console.error('[Admin Password Reset Error]', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

resetAdminPassword();
