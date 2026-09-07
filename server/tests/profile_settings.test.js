import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UserService } from '../src/services/userService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { MotivationService } from '../src/services/motivationService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { AuthService } from '../src/services/authService.js';

describe('DAILY GRACE Phase 3 — Profile, Settings & Reset Journey Tests', () => {
  let userA, userB;

  beforeEach(async () => {
    UserRepository._resetDevStore();
    MotivationRepository._resetDevStore();


    // Create User A
    userA = await UserRepository.createUser({
      name: 'John Wesley',
      email: 'wesley@dailygrace.app',
      passwordHash: 'hashed_pw_123',
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
    await UserRepository.markEmailVerified(userA.id);

    // Create User B
    userB = await UserRepository.createUser({
      name: 'Susanna Wesley',
      email: 'susanna@dailygrace.app',
      passwordHash: 'hashed_pw_456',
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
    await UserRepository.markEmailVerified(userB.id);
  });

  /**
   * TEST 1 — Profile Retrieval
   */
  it('Test 1: Correct name and verified email appear on profile', async () => {
    const profile = await UserService.getProfile(userA.id);
    assert.equal(profile.name, 'John Wesley');
    assert.equal(profile.email, 'wesley@dailygrace.app');
    assert.equal(profile.email_verified, true);
    assert.equal(profile.notification_enabled, true);
  });

  /**
   * TEST 2 — Name Update & Persistence
   */
  it('Test 2: User can update name and have it persist immediately', async () => {
    const updated = await UserService.updateName(userA.id, 'John B. Wesley');
    assert.equal(updated.name, 'John B. Wesley');

    const fetched = await UserService.getProfile(userA.id);
    assert.equal(fetched.name, 'John B. Wesley');

    // Validation: name cannot be empty or < 2 chars
    await assert.rejects(
      async () => {
        await UserService.updateName(userA.id, '  ');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  /**
   * TEST 3 — Notification Preference Toggling
   */
  it('Test 3: User can toggle notification preference OFF and ON with persistence', async () => {
    // Toggle OFF
    const offResult = await UserService.updatePreferences(userA.id, false);
    assert.equal(offResult.notification_enabled, false);

    let profile = await UserService.getProfile(userA.id);
    assert.equal(profile.notification_enabled, false);

    // Toggle ON
    const onResult = await UserService.updatePreferences(userA.id, true);
    assert.equal(onResult.notification_enabled, true);

    profile = await UserService.getProfile(userA.id);
    assert.equal(profile.notification_enabled, true);
  });

  /**
   * TEST 4 — Security & Identity Isolation
   */
  it('Test 4: Identity is derived from authenticated user without cross-user modification', async () => {
    // User A updates their own profile
    await UserService.updateName(userA.id, 'Brother John');
    await UserService.updatePreferences(userA.id, false);

    // User B must remain completely untouched
    const userBProfile = await UserService.getProfile(userB.id);
    assert.equal(userBProfile.name, 'Susanna Wesley');
    assert.equal(userBProfile.notification_enabled, true);
  });

  /**
   * TEST 5 — Reset Journey Logic & Isolation
   */
  it('Test 5: Reset Journey removes only calling user daily assignments and enables fresh cycle', async () => {
    // Assign motivations to User A and User B
    const motA = await MotivationService.getTodaysMotivation(userA.id, '2026-08-29');
    const motB = await MotivationService.getTodaysMotivation(userB.id, '2026-08-29');

    assert.ok(motA);
    assert.ok(motB);

    // Verify both assignments exist
    assert.ok(await MotivationRepository.findAssignmentByUserAndDate(userA.id, '2026-08-29'));
    assert.ok(await MotivationRepository.findAssignmentByUserAndDate(userB.id, '2026-08-29'));

    // User A resets their journey
    const resetResult = await UserService.resetJourney(userA.id);
    assert.equal(resetResult.success, true);

    // User A assignments must be gone
    const userAAssignmentAfterReset = await MotivationRepository.findAssignmentByUserAndDate(userA.id, '2026-08-29');
    assert.equal(userAAssignmentAfterReset, null, 'User A daily assignments must be erased');

    // User B assignments must remain completely intact
    const userBAssignmentAfterReset = await MotivationRepository.findAssignmentByUserAndDate(userB.id, '2026-08-29');
    assert.ok(userBAssignmentAfterReset, 'User B daily assignments must not be affected by User A reset');

    // User A account still exists and profile remains intact
    const userAProfile = await UserService.getProfile(userA.id);
    assert.ok(userAProfile, 'User account must remain active');

    // User A requesting today motivation gets a fresh assignment
    const freshMot = await MotivationService.getTodaysMotivation(userA.id, '2026-08-29');
    assert.ok(freshMot.id, 'User A receives a fresh daily motivation assignment');
  });
});
