import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AdminService } from '../src/services/adminService.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { MotivationService } from '../src/services/motivationService.js';
import { requireAdmin, authenticateToken } from '../src/middleware/authMiddleware.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';

describe('DAILY GRACE Phase 6 — Admin Dashboard & Motivation Management Tests', () => {
  beforeEach(() => {
    MotivationRepository._resetDevStore();
  });

  /**
   * AUTHENTICATION & RBAC TESTS
   */
  describe('RBAC & Security Authorization', () => {
    it('Test 1 & 2: Normal user without admin role is rejected with 403 Forbidden', () => {
      const normalUserReq = {
        user: { userId: generateUuid(), email: 'user@dailygrace.app', role: 'user' },
      };
      const res = {};
      let nextError = null;

      requireAdmin(normalUserReq, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
      assert.equal(nextError.code, 'FORBIDDEN');
    });

    it('Test 3 & 4: Admin user is permitted access through requireAdmin', () => {
      const adminReq = {
        user: { userId: generateUuid(), email: 'admindailygrace@gmail.com', role: 'admin' },
      };
      const res = {};
      let calledNext = false;
      let nextError = null;

      requireAdmin(adminReq, res, (err) => {
        if (err) nextError = err;
        else calledNext = true;
      });

      assert.equal(nextError, null);
      assert.equal(calledNext, true);
    });

    it('Test: Non-UUID user session is rejected with 401 Unauthorized in requireAdmin', () => {
      const legacyAdminReq = {
        user: { userId: 'usr_admin_1', email: 'admindailygrace@gmail.com', role: 'admin' },
      };
      const res = {};
      let nextError = null;

      requireAdmin(legacyAdminReq, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 401);
      assert.equal(nextError.code, 'UNAUTHORIZED');
    });


    it('Test 5: Unauthenticated request is rejected with 401 Unauthorized', () => {
      const unauthReq = { headers: {} };
      const res = {};
      let nextError = null;

      authenticateToken(unauthReq, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 401);
      assert.equal(nextError.code, 'UNAUTHORIZED');
    });
  });


  /**
   * CREATION & VALIDATION TESTS
   */
  describe('Motivation Creation & Validation', () => {
    it('Test 6 & 12: Admin can create a motivation which defaults to draft status', async () => {
      const created = await AdminService.createMotivation({
        title: 'He Restores My Soul',
        verse: 'He restores my soul. He leads me in paths of righteousness for his name sake.',
        reference: 'Psalm 23:3',
        reflection: 'Allow God to gently refresh your weary spirit today.',
        prayer: 'Lord, restore my soul and lead my steps today. Amen.',
      });

      assert.ok(created.id);
      assert.equal(created.title, 'He Restores My Soul');
      assert.equal(created.status, 'draft', 'Must default to draft status');

      const fetched = await AdminService.getMotivationById(created.id);
      assert.equal(fetched.id, created.id);
    });

    it('Test 7-11: Rejects creation when any required field is missing', async () => {
      // Missing title
      await assert.rejects(
        () => AdminService.createMotivation({ verse: 'V', reference: 'R', reflection: 'Ref', prayer: 'P' }),
        (err) => err.statusCode === 400 && /title/i.test(err.message)
      );

      // Missing verse
      await assert.rejects(
        () => AdminService.createMotivation({ title: 'T', reference: 'R', reflection: 'Ref', prayer: 'P' }),
        (err) => err.statusCode === 400 && /verse/i.test(err.message)
      );

      // Missing reference
      await assert.rejects(
        () => AdminService.createMotivation({ title: 'T', verse: 'V', reflection: 'Ref', prayer: 'P' }),
        (err) => err.statusCode === 400 && /reference/i.test(err.message)
      );

      // Missing reflection
      await assert.rejects(
        () => AdminService.createMotivation({ title: 'T', verse: 'V', reference: 'R', prayer: 'P' }),
        (err) => err.statusCode === 400 && /reflection/i.test(err.message)
      );

      // Missing prayer
      await assert.rejects(
        () => AdminService.createMotivation({ title: 'T', verse: 'V', reference: 'R', reflection: 'Ref' }),
        (err) => err.statusCode === 400 && /prayer/i.test(err.message)
      );
    });
  });

  /**
   * STATUS & PUBLISHING TESTS
   */
  describe('Status, Publishing & Draft Gating', () => {
    it('Test 13 & 14: Admin can publish and unpublish a motivation', async () => {
      const created = await AdminService.createMotivation({
        title: 'Rejoice in the Lord',
        verse: 'Rejoice in the Lord always; again I will say, rejoice.',
        reference: 'Philippians 4:4',
        reflection: 'Joy is a choice anchored in Christ.',
        prayer: 'Lord, fill my heart with Your joy today. Amen.',
      });
      assert.equal(created.status, 'draft');

      // Publish
      const published = await AdminService.updateMotivation(created.id, { status: 'published' });
      assert.equal(published.status, 'published');

      // Unpublish
      const unpublished = await AdminService.updateMotivation(created.id, { status: 'draft' });
      assert.equal(unpublished.status, 'draft');
    });

    it('Test 15 & 23: Draft motivation is NEVER delivered to normal users in daily engine', async () => {
      // Clear sample motivations to isolate test
      const userId = generateUuid();

      // Create only a DRAFT motivation
      const draftMot = await AdminService.createMotivation({
        title: 'Draft Only Verse',
        verse: 'This verse is in draft mode.',
        reference: 'Romans 1:1',
        reflection: 'Draft reflection.',
        prayer: 'Draft prayer.',
        status: 'draft',
      });

      // Verify draft motivation cannot be assigned
      // When only drafts exist, getTodaysMotivation must report NO_MOTIVATIONS_AVAILABLE
      // (or assign existing published sample motivations, never the draft one)
      const assigned = await MotivationService.getTodaysMotivation(userId, '2026-08-29');
      assert.notEqual(assigned.id, draftMot.id, 'Draft motivation must NEVER be assigned to regular users');
    });
  });

  /**
   * EDITING & DELETION SAFETY TESTS
   */
  describe('Editing & Deletion Safety', () => {
    it('Test 16 & 17: Admin can edit a motivation and changes persist', async () => {
      const created = await AdminService.createMotivation({
        title: 'Original Title',
        verse: 'Original verse text.',
        reference: 'John 1:1',
        reflection: 'Original reflection.',
        prayer: 'Original prayer.',
      });

      const updated = await AdminService.updateMotivation(created.id, {
        title: 'Updated Beautiful Title',
        reflection: 'Updated deeper reflection.',
      });

      assert.equal(updated.title, 'Updated Beautiful Title');
      assert.equal(updated.reflection, 'Updated deeper reflection.');

      const fetched = await AdminService.getMotivationById(created.id);
      assert.equal(fetched.title, 'Updated Beautiful Title');
    });

    it('Test 18: Admin can delete an unused motivation', async () => {
      const created = await AdminService.createMotivation({
        title: 'Temporary Motivation',
        verse: 'Temporary verse.',
        reference: 'Titus 1:1',
        reflection: 'Temporary reflection.',
        prayer: 'Temporary prayer.',
      });

      const delRes = await AdminService.deleteMotivation(created.id);
      assert.equal(delRes.success, true);

      await assert.rejects(
        () => AdminService.getMotivationById(created.id),
        (err) => err.statusCode === 404
      );
    });

    it('Test 20 & 21: Assigned motivation cannot be deleted; error suggests unpublishing', async () => {
      const publishedMot = await AdminService.createMotivation({
        title: 'Assigned Motivation',
        verse: 'Assigned verse text.',
        reference: 'Hebrews 11:1',
        reflection: 'Reflection text.',
        prayer: 'Prayer text.',
        status: 'published',
      });

      // Simulate assignment to a user in daily_motivations
      await MotivationRepository.createDailyAssignment({
        userId: generateUuid(),
        motivationId: publishedMot.id,
        assignedDate: '2026-08-29',
        cycleNumber: 1,
      });

      // Attempting to delete must be blocked with an informative message
      await assert.rejects(

        () => AdminService.deleteMotivation(publishedMot.id),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'MOTIVATION_ASSIGNED_CANNOT_DELETE');
          assert.match(err.message, /unpublish/i);
          return true;
        }
      );
    });
  });

  /**
   * PAGINATION, SEARCH & STATISTICS TESTS
   */
  describe('Large Data, Pagination & Search', () => {
    it('Test 27: Admin list uses server-side pagination with accurate total counts', async () => {
      const listRes = await AdminService.listMotivations({ page: 1, limit: 3 });
      assert.ok(listRes.pagination);
      assert.equal(listRes.pagination.page, 1);
      assert.equal(listRes.pagination.limit, 3);
      assert.ok(listRes.pagination.total >= 5);
      assert.equal(listRes.data.length, 3);
    });

    it('Test 28: Search queries match title, reference, or reflection efficiently', async () => {
      await AdminService.createMotivation({
        title: 'Searchable Unique Prophecy',
        verse: 'A special verse text.',
        reference: 'Habakkuk 2:2',
        reflection: 'Write the vision clearly.',
        prayer: 'Lord, give me vision.',
        status: 'published',
      });

      // Search by title keyword
      const searchTitle = await AdminService.listMotivations({ q: 'Prophecy' });
      assert.ok(searchTitle.data.some((m) => m.title === 'Searchable Unique Prophecy'));

      // Search by scripture reference
      const searchRef = await AdminService.listMotivations({ q: 'Habakkuk' });
      assert.ok(searchRef.data.some((m) => m.reference === 'Habakkuk 2:2'));
    });

    it('Test: Admin statistics reflect accurate counts including totalAdmins', async () => {
      const stats = await AdminService.getStats();
      assert.ok(typeof stats.totalMotivations === 'number');
      assert.ok(typeof stats.publishedMotivations === 'number');
      assert.ok(typeof stats.draftMotivations === 'number');
      assert.ok(typeof stats.totalUsers === 'number');
      assert.ok(typeof stats.totalAdmins === 'number');
    });

    it('Test: Admin dashboard returns stats, featured todays motivation, and recent motivations', async () => {
      const dashboard = await AdminService.getDashboard();
      assert.ok(dashboard.stats);
      assert.ok(Array.isArray(dashboard.recentMotivations));
      assert.ok(dashboard.recentMotivations.length <= 5);
      if (dashboard.todaysMotivation) {
        assert.equal(dashboard.todaysMotivation.status, 'published');
      }
    });

    it('Test: Admin can toggle motivation status with updateMotivationStatus', async () => {
      const created = await AdminService.createMotivation({
        title: 'Status Toggle Test',
        verse: 'Verse for toggle test',
        reference: 'Romans 8:31',
        reflection: 'God is for us.',
        prayer: 'Thank you Lord.',
        status: 'draft',
      });

      const published = await AdminService.updateMotivationStatus(created.id, 'published');
      assert.equal(published.status, 'published');

      const drafted = await AdminService.updateMotivationStatus(created.id, 'draft');
      assert.equal(drafted.status, 'draft');

      await assert.rejects(
        () => AdminService.updateMotivationStatus(created.id, 'invalid_status'),
        (err) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('Test: Admin user management lists users safely without password hashes', async () => {
      const userList = await AdminService.listUsers({ page: 1, limit: 10 });
      assert.ok(userList.data);
      assert.ok(userList.pagination);
      assert.ok(userList.pagination.total >= 0);

      // Verify no sensitive fields leaked
      userList.data.forEach((u) => {
        assert.equal(u.password_hash, undefined);
        assert.equal(u.verification_token_hash, undefined);
        assert.ok(u.id);
        assert.ok(u.email);
      });
    });

    it('Test: Admin change password validates current password and updates hash with bcrypt', async () => {
      const bcrypt = (await import('bcrypt')).default;
      const adminId = generateUuid();
      const initialPwHash = await bcrypt.hash('InitialAdmin2026!', 12);

      // Create test admin user in memory/store
      await UserRepository.createUser({
        name: 'Test Administrator',
        email: 'testadmin@dailygrace.app',
        passwordHash: initialPwHash,
        role: 'admin',
        emailVerified: true,
      });

      // Find the created user ID
      const createdAdmin = await UserRepository.findByEmail('testadmin@dailygrace.app');
      assert.ok(createdAdmin);

      // 1. Wrong current password fails
      await assert.rejects(
        () =>
          AdminService.changeAdminPassword(createdAdmin.id, {
            currentPassword: 'WrongPassword123!',
            newPassword: 'BrandNewPassword2026!',
            confirmPassword: 'BrandNewPassword2026!',
          }),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_CURRENT_PASSWORD');
          return true;
        }
      );

      // 2. Short password fails
      await assert.rejects(
        () =>
          AdminService.changeAdminPassword(createdAdmin.id, {
            currentPassword: 'InitialAdmin2026!',
            newPassword: 'short',
            confirmPassword: 'short',
          }),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );

      // 3. Mismatched confirm password fails
      await assert.rejects(
        () =>
          AdminService.changeAdminPassword(createdAdmin.id, {
            currentPassword: 'InitialAdmin2026!',
            newPassword: 'BrandNewPassword2026!',
            confirmPassword: 'DifferentPassword2026!',
          }),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );

      // 4. Valid password change succeeds
      const changeRes = await AdminService.changeAdminPassword(createdAdmin.id, {
        currentPassword: 'InitialAdmin2026!',
        newPassword: 'BrandNewPassword2026!',
        confirmPassword: 'BrandNewPassword2026!',
      });
      assert.equal(changeRes.success, true);

      // 5. Verify new password works with bcrypt
      const updatedAdmin = await UserRepository.findAuthUserById(createdAdmin.id);
      const isNewMatch = await bcrypt.compare('BrandNewPassword2026!', updatedAdmin.password_hash);
      assert.equal(isNewMatch, true);
    });
  });
});

