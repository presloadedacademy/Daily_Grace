import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { MotivationService } from '../src/services/motivationService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { EmailService } from '../src/services/emailService.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';
import { config } from '../src/config/env.js';

describe('DAILY GRACE — Dual Streak Tracking & Daily Rotation Suite', () => {
  beforeEach(() => {
    MotivationRepository._resetDevStore();
    UserRepository._resetDevStore();
  });

  it('Streak Logic 1: Consecutive day increments current_streak by 1', async () => {
    const user = {
      id: generateUuid(),
      current_streak: 3,
      longest_streak: 5,
      last_completed_date: '2026-09-07',
    };

    const result = MotivationService.calculateStreak(user, '2026-09-08');
    assert.equal(result.currentStreak, 4, 'Consecutive day must increment streak by 1');
    assert.equal(result.longestStreak, 5, 'Longest streak remains 5');
    assert.equal(result.lastCompletedDate, '2026-09-08');
    assert.equal(result.isAlreadyCompletedToday, false);
  });

  it('Streak Logic 2: Same day completion retains current streak count', async () => {
    const user = {
      id: generateUuid(),
      current_streak: 4,
      longest_streak: 5,
      last_completed_date: '2026-09-08',
    };

    const result = MotivationService.calculateStreak(user, '2026-09-08');
    assert.equal(result.currentStreak, 4, 'Same day must retain current streak');
    assert.equal(result.isAlreadyCompletedToday, true);
  });

  it('Streak Logic 3: Missed day (gap > 1 day) resets streak to 1', async () => {
    const user = {
      id: generateUuid(),
      current_streak: 10,
      longest_streak: 10,
      last_completed_date: '2026-09-01',
    };

    const result = MotivationService.calculateStreak(user, '2026-09-08');
    assert.equal(result.currentStreak, 1, 'Missed days must reset streak to 1');
    assert.equal(result.longestStreak, 10, 'Longest streak is preserved at 10');
    assert.equal(result.lastCompletedDate, '2026-09-08');
  });

  it('Streak Logic 4: First ever completion starts streak at 1', async () => {
    const user = {
      id: generateUuid(),
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    };

    const result = MotivationService.calculateStreak(user, '2026-09-08');
    assert.equal(result.currentStreak, 1, 'First completion starts streak at 1');
    assert.equal(result.longestStreak, 1, 'Longest streak updated to 1');
    assert.equal(result.lastCompletedDate, '2026-09-08');
  });

  it('markDevotionCompleted marks daily assignment as completed and returns updated streak', async () => {
    const user = await UserRepository.createUser({
      name: 'Streak Tester',
      email: 'streaktester@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });

    const completion = await MotivationService.markDevotionCompleted(user.id, '2026-09-08');
    assert.equal(completion.success, true);
    assert.equal(completion.is_completed, true);
    assert.equal(completion.current_streak, 1);

    // Fetch user from repo and verify persisted streak
    const updatedUser = await UserRepository.findById(user.id);
    assert.equal(updatedUser.current_streak, 1);

    // Consecutive day completion
    const day2Completion = await MotivationService.markDevotionCompleted(user.id, '2026-09-09');
    assert.equal(day2Completion.current_streak, 2);

    const userDay2 = await UserRepository.findById(user.id);
    assert.equal(userDay2.current_streak, 2);
  });

  it('Signed 1-click email token generates and validates correctly', async () => {
    const userId = generateUuid();
    const token = jwt.sign(
      { userId, date: '2026-09-08', action: 'complete_devotion' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.userId, userId);
    assert.equal(decoded.action, 'complete_devotion');
    assert.equal(decoded.date, '2026-09-08');
  });

  it('Daily motivations advance sequentially across days', async () => {
    const userId = generateUuid();
    const motDay1 = await MotivationService.getTodaysMotivation(userId, '2026-09-01');
    const motDay2 = await MotivationService.getTodaysMotivation(userId, '2026-09-02');

    assert.notEqual(motDay1.id, motDay2.id, 'Day 1 and Day 2 must have distinct motivations');
  });

  it('Production Email URL: Resolves production domain and never defaults to localhost in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalApiBase = process.env.API_BASE_URL;
    const originalRenderUrl = process.env.RENDER_EXTERNAL_URL;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.API_BASE_URL;
      delete process.env.RENDER_EXTERNAL_URL;

      const prodBaseUrl = EmailService.getBaseUrl();
      assert.equal(prodBaseUrl, 'https://daily-grace.onrender.com');
      assert.equal(prodBaseUrl.includes('localhost'), false, 'Production base URL must never be localhost');

      process.env.API_BASE_URL = 'https://custom-api.dailygrace.com';
      assert.equal(EmailService.getBaseUrl(), 'https://custom-api.dailygrace.com');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalApiBase) process.env.API_BASE_URL = originalApiBase;
      else delete process.env.API_BASE_URL;
      if (originalRenderUrl) process.env.RENDER_EXTERNAL_URL = originalRenderUrl;
      else delete process.env.RENDER_EXTERNAL_URL;
    }
  });

  it('Sequential rotation advances to next day number (Day 7 -> Day 8)', async () => {
    const userId = generateUuid();
    
    // Assign Day 1 on 2026-09-01
    const day1 = await MotivationService.getTodaysMotivation(userId, '2026-09-01');
    assert.ok(day1);

    // Assign Day 2 on 2026-09-02
    const day2 = await MotivationService.getTodaysMotivation(userId, '2026-09-02');
    assert.ok(day2);
    assert.notEqual(day1.id, day2.id);

    // Requesting same date 2026-09-02 returns same assignment
    const day2Again = await MotivationService.getTodaysMotivation(userId, '2026-09-02');
    assert.equal(day2Again.id, day2.id);
  });

  it('Completion Persistence: getTodaysMotivation returns is_completed = true after markDevotionCompleted', async () => {
    const user = await UserRepository.createUser({
      name: 'Persistence Tester',
      email: 'persistence@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });

    // 1. Initial fetch before completion -> is_completed is false
    const initial = await MotivationService.getTodaysMotivation(user.id, '2026-09-08');
    assert.equal(initial.is_completed, false, 'Initial state must be uncompleted');

    // 2. Mark devotion completed
    const completionResult = await MotivationService.markDevotionCompleted(user.id, '2026-09-08');
    assert.equal(completionResult.success, true);
    assert.equal(completionResult.is_completed, true);

    // 3. Immediately re-fetch today's motivation (simulates page refresh or navigation)
    const refetched = await MotivationService.getTodaysMotivation(user.id, '2026-09-08');
    assert.equal(refetched.id, initial.id, 'Must return same devotional assignment');
    assert.equal(refetched.is_completed, true, 'is_completed must remain true on refetch');
    assert.equal(refetched.completed, true, 'completed alias must also be true');
    assert.ok(refetched.completed_at, 'completed_at timestamp must be set');
  });
});

