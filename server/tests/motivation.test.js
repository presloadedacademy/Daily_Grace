import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MotivationService, calculateGlobalDayNumber, BASE_CALENDAR_DATE } from '../src/services/motivationService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { DailyAssignmentRepository } from '../src/repositories/dailyAssignmentRepository.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';

function addDays(baseDateStr, days) {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const targetUtc = Date.UTC(y, m - 1, d) + days * 24 * 3600 * 1000;
  return new Date(targetUtc).toISOString().split('T')[0];
}

describe('DAILY GRACE — Global Calendar Motivation Engine Tests', () => {

  beforeEach(() => {
    MotivationRepository._resetDevStore();
  });

  /**
   * TEST 1 — Global Calendar Assignment on Base Date (Base Date = Day 1)
   */
  it('Test 1: Base calendar date returns Day 1 ("Peace Begins With God") for any user', async () => {
    const userId = generateUuid();
    const motivation = await MotivationService.getTodaysMotivation(userId, BASE_CALENDAR_DATE);

    assert.ok(motivation.id, 'Motivation must have an ID');
    assert.equal(motivation.title, 'Peace Begins With God');
    assert.equal(motivation.day_number, 1);
    assert.ok(motivation.verse);
    assert.ok(motivation.reference);
    assert.ok(motivation.reflection);
    assert.ok(motivation.prayer);

    // Confirm assignment exists in database for this date
    const savedAssignment = await MotivationRepository.findAssignmentByUserAndDate(userId, BASE_CALENDAR_DATE);
    assert.ok(savedAssignment, 'Assignment must be saved');
    assert.equal(savedAssignment.id, motivation.id);
  });

  /**
   * TEST 2 — Global Calendar Assignment Next Day (Next Day = Day 2)
   */
  it('Test 2: Next calendar date MUST return Day 2 ("A Quiet Soul") for EVERY user (new, admin, existing)', async () => {
    const newUser = generateUuid();
    const existingUser = generateUuid();
    const adminUser = generateUuid();
    const day2Date = addDays(BASE_CALENDAR_DATE, 1);

    // Existing user had Day 1 on Base Date
    await MotivationService.getTodaysMotivation(existingUser, BASE_CALENDAR_DATE);

    // On Day 2, all 3 users request today's motivation
    const motNew = await MotivationService.getTodaysMotivation(newUser, day2Date);
    const motExisting = await MotivationService.getTodaysMotivation(existingUser, day2Date);
    const motAdmin = await MotivationService.getTodaysMotivation(adminUser, day2Date);

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
    const date = addDays(BASE_CALENDAR_DATE, 1);
    const firstCall = await MotivationService.getTodaysMotivation(userId, date);
    const refreshCall = await MotivationService.getTodaysMotivation(userId, date);
    const secondRefresh = await MotivationService.getTodaysMotivation(userId, date);

    assert.equal(firstCall.id, refreshCall.id);
    assert.equal(firstCall.title, refreshCall.title);
    assert.equal(firstCall.id, secondRefresh.id);
  });

  /**
   * TEST 4 — Yesterday's Devotion is Void for Today's View
   */
  it('Test 4: Devotions from yesterday are void for today view; screen renders current calendar day', async () => {
    const userId = generateUuid();
    const day1Date = BASE_CALENDAR_DATE;
    const day2Date = addDays(BASE_CALENDAR_DATE, 1);

    // User views Day 1 devotional
    const motYesterday = await MotivationService.getTodaysMotivation(userId, day1Date);
    assert.equal(motYesterday.title, 'Peace Begins With God');

    // Next day, user views today's devotional
    const motToday = await MotivationService.getTodaysMotivation(userId, day2Date);
    assert.equal(motToday.title, 'A Quiet Soul');
    assert.notEqual(motYesterday.id, motToday.id);
  });

  /**
   * TEST 5 — Sequential Calendar Day Progression
   */
  it('Test 5: Sequential dates advance through devotionals in global calendar order', async () => {
    const userId = generateUuid();
    const dates = [0, 1, 2, 3, 4].map((d) => addDays(BASE_CALENDAR_DATE, d));
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

    // Day 1: BASE_CALENDAR_DATE
    assert.equal(calculateGlobalDayNumber(BASE_CALENDAR_DATE, total), 1);

    // Day 2: BASE_CALENDAR_DATE + 1 day
    assert.equal(calculateGlobalDayNumber(addDays(BASE_CALENDAR_DATE, 1), total), 2);

    // Day 184: BASE_CALENDAR_DATE + 183 days
    const day184 = addDays(BASE_CALENDAR_DATE, 183);
    assert.equal(calculateGlobalDayNumber(day184, total), 184);

    // Day 185 (Wraps to 1): BASE_CALENDAR_DATE + 184 days
    const day185 = addDays(BASE_CALENDAR_DATE, 184);
    assert.equal(calculateGlobalDayNumber(day185, total), 1);
  });

  /**
   * TEST 7 — Concurrent Requests Safety
   */
  it('Test 7: Handles concurrent simultaneous requests safely with atomic single assignment', async () => {
    const userId = generateUuid();
    const date = addDays(BASE_CALENDAR_DATE, 1);

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

  /**
   * TEST 8 — Auto-Correction / Auto-Alignment of Stale Assignments
   */
  it('Test 8: Existing assignment created under old logic auto-corrects to global calendar day', async () => {
    const userId = generateUuid();
    const date = addDays(BASE_CALENDAR_DATE, 1);

    // Simulate stale assignment in DB with Day 1 ("Peace Begins With God") on Day 2 date
    const day1Mot = await MotivationRepository.findByDayNumber(1);
    await DailyAssignmentRepository.createDailyAssignment({
      userId,
      motivationId: day1Mot.id,
      assignedDate: date,
      cycleNumber: 1,
    });

    const preCheck = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, date);
    assert.equal(preCheck.day_number, 1);
    assert.equal(preCheck.title, 'Peace Begins With God');

    // Calling getTodaysMotivation must auto-correct and return Day 2 ("A Quiet Soul")
    const result = await MotivationService.getTodaysMotivation(userId, date);
    assert.equal(result.day_number, 2);
    assert.equal(result.title, 'A Quiet Soul');

    // Confirm the database row is also updated
    const postCheck = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, date);
    assert.equal(postCheck.day_number, 2);
    assert.equal(postCheck.title, 'A Quiet Soul');
  });
});



