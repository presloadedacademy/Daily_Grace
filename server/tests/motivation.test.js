import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MotivationService, calculateGlobalDayNumber } from '../src/services/motivationService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';

describe('DAILY GRACE — Global Calendar Motivation Engine Tests', () => {
  beforeEach(() => {
    MotivationRepository._resetDevStore();
  });

  /**
   * TEST 1 — Global Calendar Assignment on Base Date (Sept 8 = Day 1)
   */
  it('Test 1: September 8 returns Day 1 ("Peace Begins With God") for any user', async () => {
    const userId = generateUuid();
    const motivation = await MotivationService.getTodaysMotivation(userId, '2026-09-08');

    assert.ok(motivation.id, 'Motivation must have an ID');
    assert.equal(motivation.title, 'Peace Begins With God');
    assert.equal(motivation.day_number, 1);
    assert.ok(motivation.verse);
    assert.ok(motivation.reference);
    assert.ok(motivation.reflection);
    assert.ok(motivation.prayer);

    // Confirm assignment exists in database for this date
    const savedAssignment = await MotivationRepository.findAssignmentByUserAndDate(userId, '2026-09-08');
    assert.ok(savedAssignment, 'Assignment must be saved');
    assert.equal(savedAssignment.id, motivation.id);
  });

  /**
   * TEST 2 — Global Calendar Assignment Next Day (Sept 9 = Day 2)
   */
  it('Test 2: September 9 MUST return Day 2 ("A Quiet Soul") for EVERY user (new, admin, existing)', async () => {
    const newUser = generateUuid();
    const existingUser = generateUuid();
    const adminUser = generateUuid();

    // Existing user had Day 1 on Sept 8
    await MotivationService.getTodaysMotivation(existingUser, '2026-09-08');

    // On Sept 9, all 3 users request today's motivation
    const motNew = await MotivationService.getTodaysMotivation(newUser, '2026-09-09');
    const motExisting = await MotivationService.getTodaysMotivation(existingUser, '2026-09-09');
    const motAdmin = await MotivationService.getTodaysMotivation(adminUser, '2026-09-09');

    assert.equal(motNew.title, 'A Quiet Soul');
    assert.equal(motNew.day_number, 2);

    assert.equal(motExisting.title, 'A Quiet Soul');
    assert.equal(motExisting.day_number, 2);

    assert.equal(motAdmin.title, 'A Quiet Soul');
    assert.equal(motAdmin.day_number, 2);

    assert.equal(motNew.id, motExisting.id);
    assert.equal(motExisting.id, motAdmin.id);
  });

  /**
   * TEST 3 — Refresh Behavior on Same Date
   */
  it('Test 3: Page refresh on the same date returns identical motivation without duplicate assignments', async () => {
    const userId = generateUuid();
    const firstCall = await MotivationService.getTodaysMotivation(userId, '2026-09-09');
    const refreshCall = await MotivationService.getTodaysMotivation(userId, '2026-09-09');
    const secondRefresh = await MotivationService.getTodaysMotivation(userId, '2026-09-09');

    assert.equal(firstCall.id, refreshCall.id);
    assert.equal(firstCall.title, refreshCall.title);
    assert.equal(firstCall.id, secondRefresh.id);
  });

  /**
   * TEST 4 — Yesterday's Devotion is Void for Today's View
   */
  it('Test 4: Devotions from yesterday are void for today view; screen renders current calendar day', async () => {
    const userId = generateUuid();

    // User views Sept 8 devotional
    const motYesterday = await MotivationService.getTodaysMotivation(userId, '2026-09-08');
    assert.equal(motYesterday.title, 'Peace Begins With God');

    // Next day (Sept 9), user views today's devotional
    const motToday = await MotivationService.getTodaysMotivation(userId, '2026-09-09');
    assert.equal(motToday.title, 'A Quiet Soul');
    assert.notEqual(motYesterday.id, motToday.id);
  });

  /**
   * TEST 5 — Sequential Calendar Day Progression
   */
  it('Test 5: Sequential dates advance through devotionals in global calendar order', async () => {
    const userId = generateUuid();
    const dates = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'];
    const seenIds = new Set();

    for (let i = 0; i < dates.length; i++) {
      const mot = await MotivationService.getTodaysMotivation(userId, dates[i]);
      assert.equal(mot.day_number, i + 1);
      assert.ok(!seenIds.has(mot.id));
      seenIds.add(mot.id);
    }

    assert.equal(seenIds.size, 5);
  });

  /**
   * TEST 6 — Modulo Calculation Across Total Catalog
   */
  it('Test 6: calculateGlobalDayNumber cleanly wraps around total published count using modulo', () => {
    const total = 184;

    // Day 1: 2026-09-08
    assert.equal(calculateGlobalDayNumber('2026-09-08', total), 1);

    // Day 2: 2026-09-09
    assert.equal(calculateGlobalDayNumber('2026-09-09', total), 2);

    // Day 184: 2026-09-08 + 183 days
    const day184 = new Date(Date.UTC(2026, 8, 8) + 183 * 24 * 3600 * 1000).toISOString().split('T')[0];
    assert.equal(calculateGlobalDayNumber(day184, total), 184);

    // Day 185 (Wraps to 1): 2026-09-08 + 184 days
    const day185 = new Date(Date.UTC(2026, 8, 8) + 184 * 24 * 3600 * 1000).toISOString().split('T')[0];
    assert.equal(calculateGlobalDayNumber(day185, total), 1);
  });

  /**
   * TEST 7 — Concurrent Requests Safety
   */
  it('Test 7: Handles concurrent simultaneous requests safely with atomic single assignment', async () => {
    const userId = generateUuid();
    const date = '2026-09-09';

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
      assert.equal(r.title, 'A Quiet Soul');
    }
  });
});


