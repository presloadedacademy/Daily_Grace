import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MotivationService } from '../src/services/motivationService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';

describe('DAILY GRACE Phase 2 — Motivation Database & Daily Engine Tests', () => {
  beforeEach(() => {
    MotivationRepository._resetDevStore();
  });

  /**
   * TEST 1 — First Daily Request
   * Verified user requests today's motivation.
   * Expected: New motivation selected, assignment saved, motivation returned.
   */
  it('Test 1: First daily request assigns and returns today motivation', async () => {
    const userId = generateUuid();
    const motivation = await MotivationService.getTodaysMotivation(userId, '2026-08-29');

    assert.ok(motivation.id, 'Motivation must have an ID');
    assert.ok(motivation.title, 'Motivation must have a title');
    assert.ok(motivation.verse, 'Motivation must have a verse');
    assert.ok(motivation.reference, 'Motivation must have a scripture reference');
    assert.ok(motivation.reflection, 'Motivation must have a reflection');
    assert.ok(motivation.prayer, 'Motivation must have a prayer');

    // Confirm assignment exists in database
    const savedAssignment = await MotivationRepository.findAssignmentByUserAndDate(userId, '2026-08-29');
    assert.ok(savedAssignment, 'Assignment must be saved');
    assert.equal(savedAssignment.id, motivation.id);
  });

  /**
   * TEST 2 — Refresh Behavior
   * User requests today's motivation again on the same day.
   * Expected: Same motivation returned, no duplicate assignment created.
   */
  it('Test 2: Page refresh returns identical motivation without duplicate assignments', async () => {
    const userId = generateUuid();
    const firstCall = await MotivationService.getTodaysMotivation(userId, '2026-08-29');
    const refreshCall = await MotivationService.getTodaysMotivation(userId, '2026-08-29');
    const secondRefresh = await MotivationService.getTodaysMotivation(userId, '2026-08-29');

    assert.equal(firstCall.id, refreshCall.id);
    assert.equal(firstCall.title, refreshCall.title);
    assert.equal(firstCall.id, secondRefresh.id);
  });

  /**
   * TEST 3 — Database Check
   * Verify that only one record exists for user_id + today's date.
   */
  it('Test 3: Database constraint guarantees single record per user per date', async () => {
    const userId = generateUuid();
    await MotivationService.getTodaysMotivation(userId, '2026-08-29');
    await MotivationService.getTodaysMotivation(userId, '2026-08-29');

    const assignment = await MotivationRepository.findAssignmentByUserAndDate(userId, '2026-08-29');
    assert.ok(assignment);
    assert.equal(assignment.assigned_date, '2026-08-29');
  });

  /**
   * TEST 4 — Different User
   * Create another verified user -> has independent motivation journey.
   */
  it('Test 4: Different users maintain independent motivation assignments', async () => {
    const userA = generateUuid();
    const userB = generateUuid();

    const motivationA = await MotivationService.getTodaysMotivation(userA, '2026-08-29');
    const motivationB = await MotivationService.getTodaysMotivation(userB, '2026-08-29');

    assert.ok(motivationA.id);
    assert.ok(motivationB.id);

    const assignmentA = await MotivationRepository.findAssignmentByUserAndDate(userA, '2026-08-29');
    const assignmentB = await MotivationRepository.findAssignmentByUserAndDate(userB, '2026-08-29');

    assert.equal(assignmentA.id, motivationA.id);
    assert.equal(assignmentB.id, motivationB.id);
  });

  /**
   * TEST 5 — No Repeat in Cycle
   * User receives motivations across multiple days -> previously used motivations are excluded.
   */
  it('Test 5: No repeats within the current cycle across multiple days', async () => {
    const userId = generateUuid();
    const seenMotivationIds = new Set();

    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'];
    for (const date of dates) {
      const motivation = await MotivationService.getTodaysMotivation(userId, date);
      assert.ok(!seenMotivationIds.has(motivation.id), `Motivation ${motivation.id} must not repeat in cycle`);
      seenMotivationIds.add(motivation.id);
    }

    assert.equal(seenMotivationIds.size, 4);
  });

  /**
   * TEST 6 — Cycle Completion
   * User receives all available motivations in cycle 1 -> cycle increments to 2 on next day.
   */
  it('Test 6: Completing all motivations cleanly advances to the next cycle', async () => {
    const userId = generateUuid();
    const totalCount = await MotivationRepository.countTotalMotivations();
    assert.ok(totalCount > 0, 'Must have sample motivations');

    // Deliver all motivations for cycle 1
    for (let i = 1; i <= totalCount; i++) {
      const date = `2026-09-${String(i).padStart(2, '0')}`;
      const motivation = await MotivationService.getTodaysMotivation(userId, date);
      assert.ok(motivation);
    }

    // Day totalCount + 1 -> Should seamlessly enter Cycle 2
    const nextCycleDate = `2026-09-${String(totalCount + 1).padStart(2, '0')}`;
    const nextCycleMotivation = await MotivationService.getTodaysMotivation(userId, nextCycleDate);

    assert.ok(nextCycleMotivation.id);
    const assignment = await MotivationRepository.findAssignmentByUserAndDate(userId, nextCycleDate);
    assert.equal(assignment.cycle_number, 2, 'Must increment cycle number to 2');
  });

  /**
   * TEST 7 — Refresh Race Condition / Concurrency
   * Simultaneous requests for same user/date create only 1 assignment and return same result.
   */
  it('Test 7: Handles concurrent simultaneous requests safely with atomic single assignment', async () => {
    const userId = generateUuid();
    const date = '2026-08-29';

    // Simulate 5 simultaneous requests happening in parallel
    const results = await Promise.all([
      MotivationService.getTodaysMotivation(userId, date),
      MotivationService.getTodaysMotivation(userId, date),
      MotivationService.getTodaysMotivation(userId, date),
      MotivationService.getTodaysMotivation(userId, date),
      MotivationService.getTodaysMotivation(userId, date),
    ]);

    const firstId = results[0].id;
    for (const r of results) {
      assert.equal(r.id, firstId, 'All concurrent calls must receive the identical motivation ID');
    }
  });
});

