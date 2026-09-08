import { MotivationService } from '../src/services/motivationService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { DailyAssignmentRepository } from '../src/repositories/dailyAssignmentRepository.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { getLagosDateString } from '../src/services/motivationService.js';

async function main() {
  console.log('--- DAILY GRACE: Verification of Devotion Completion Persistence ---');

  const today = getLagosDateString();
  console.log(`Current Lagos Date: ${today}`);

  // 1. Create or find test user
  const email = `verify_${Date.now()}@dailygrace.local`;
  const user = await UserRepository.createUser({
    name: 'Verification User',
    email,
    passwordHash: 'verify_hash',
    emailVerified: true,
  });
  console.log(`Created test user: ${user.id} (${user.email})`);

  // 2. Fetch today's motivation initially
  const initial = await MotivationService.getTodaysMotivation(user.id, today);
  console.log(`Initial assignment fetched: "${initial.title}" (Day ${initial.day_number || 'N/A'})`);
  console.log(`Initial is_completed: ${initial.is_completed} (expected: false)`);
  if (initial.is_completed !== false) {
    throw new Error(`FAIL: Initial devotion was already marked completed!`);
  }

  // 3. Mark today's devotion complete
  const markResult = await MotivationService.markDevotionCompleted(user.id, today);
  console.log(`markDevotionCompleted result:`, markResult);
  if (!markResult.success || !markResult.is_completed) {
    throw new Error(`FAIL: markDevotionCompleted did not return success!`);
  }

  // 4. Immediately call getTodaysMotivation (simulating refresh / page navigation)
  const refetched = await MotivationService.getTodaysMotivation(user.id, today);
  console.log(`Refetched assignment:`, {
    id: refetched.id,
    title: refetched.title,
    is_completed: refetched.is_completed,
    completed: refetched.completed,
    completed_at: refetched.completed_at,
    current_streak: refetched.current_streak,
  });

  if (refetched.is_completed !== true || refetched.completed !== true) {
    throw new Error(`FAIL: getTodaysMotivation did not return is_completed === true after completion!`);
  }

  console.log('✓ PASS: Devotion completion state correctly persisted and returned on subsequent getTodaysMotivation!');
  process.exit(0);
}

main().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
