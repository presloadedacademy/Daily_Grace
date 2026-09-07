import bcrypt from 'bcrypt';
import { UserRepository } from '../src/repositories/userRepository.js';
import { closePool, checkDbConnection } from '../src/config/db.js';

async function setupAdmin() {
  const email = (process.argv[2] || 'admindailygrace@gmail.com').trim().toLowerCase();
  const name = process.argv[3] || 'Daily Grace Administrator';
  const password = process.argv[4];

  console.log('\n================== DAILY GRACE ADMIN SETUP ==================');
  console.log(`Target Email: ${email}`);

  await checkDbConnection();

  try {
    const existing = await UserRepository.findByEmail(email);

    if (existing) {
      console.log(`User ${email} found in database. Ensuring role is 'admin'...`);
      await UserRepository.setRole(existing.id, 'admin');

      if (password) {
        const passwordHash = await bcrypt.hash(password, 12);
        await UserRepository.updatePasswordHash(existing.id, passwordHash);
        console.log(`Password hash updated for ${email}.`);
      }

      console.log(`User ${email} (ID: ${existing.id}) has been updated with role: 'admin'.`);
    } else {

      console.log(`Creating initial PostgreSQL administrator record for ${email}...`);
      // If password provided via CLI argument, hash it; otherwise use secure random hash
      const passwordToHash = password || (await import('crypto')).randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(passwordToHash, 12);

      const newAdmin = await UserRepository.createUser({
        name,
        email,
        passwordHash,
        role: 'admin',
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
        emailVerified: false,
      });

      console.log(`Administrator account created successfully!`);
      console.log(`  ID: ${newAdmin.id}`);
      console.log(`  Email: ${email}`);
      console.log(`  Role: ${newAdmin.role}`);
    }

    console.log('=============================================================\n');
  } catch (err) {
    console.error('[Admin Setup Error]', err.message);
  } finally {
    await closePool();
  }
}

setupAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

