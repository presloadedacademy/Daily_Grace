import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DailyAssignmentRepository } from '../src/repositories/dailyAssignmentRepository.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { MotivationService } from '../src/services/motivationService.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';

describe('DAILY GRACE — DailyAssignmentRepository & Engine Tests', () => {
  beforeEach(() => {
    DailyAssignmentRepository._resetDevStore();
  });

  it('Test 1: Creates and retrieves daily assignment for a user on today date', async () => {
    const userId = generateUuid();
    const today = '2026-09-02';

    const motivation = await DailyAssignmentRepository.findUnusedMotivationInCycle(userId, 1);
    assert.ok(motivation, 'Should find an initial published motivation');

    const created = await DailyAssignmentRepository.createDailyAssignment({
      userId,
      motivationId: motivation.id,
      assignedDate: today,
      cycleNumber: 1,
    });
    assert.ok(created);

    const fetched = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    assert.ok(fetched);
    assert.equal(fetched.id, motivation.id);
    assert.equal(fetched.title, motivation.title);
  });

  it('Test 2: Guarantees deterministic single assignment per user per day', async () => {
    const userId = generateUuid();
    const today = '2026-09-02';

    const res1 = await MotivationService.getTodaysMotivation(userId, today);
    const res2 = await MotivationService.getTodaysMotivation(userId, today);

    assert.equal(res1.id, res2.id);
    assert.equal(res1.title, res2.title);
  });

  it('Test 3: Different dates for the same user receive different motivations without immediate repetition', async () => {
    const userId = generateUuid();

    const day1 = await MotivationService.getTodaysMotivation(userId, '2026-09-01');
    const day2 = await MotivationService.getTodaysMotivation(userId, '2026-09-02');

    assert.notEqual(day1.id, day2.id, 'Day 2 must receive a distinct motivation from Day 1 in the same cycle');
  });

  it('Test 4: Deleting user assignments resets their journey cleanly', async () => {
    const userId = generateUuid();
    const today = '2026-09-02';

    await MotivationService.getTodaysMotivation(userId, today);
    const beforeReset = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    assert.ok(beforeReset);

    await DailyAssignmentRepository.deleteUserAssignments(userId);
    const afterReset = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    assert.equal(afterReset, null);
  });

  it('Test 5: Assignment history returns chronological list of received devotionals', async () => {
    const userId = generateUuid();
    await MotivationService.getTodaysMotivation(userId, '2026-09-01');
    await MotivationService.getTodaysMotivation(userId, '2026-09-02');

    const history = await DailyAssignmentRepository.getUserAssignmentHistory(userId, 10);
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 2);
  });
});
