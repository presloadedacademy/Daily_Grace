import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/authService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { emailService } from '../src/services/emailService.js';
import { hashToken, isValidUuid, generateUuid } from '../src/utils/cryptoUtils.js';
import { authenticateToken, requireAdmin } from '../src/middleware/authMiddleware.js';
import { config } from '../src/config/env.js';

// In-memory test store to execute standalone test scenarios
const memoryUsers = new Map();

describe('DAILY GRACE — Real Email Verification & Authentication Tests', () => {
  beforeEach(() => {
    memoryUsers.clear();

    // Mock UserRepository for isolated test execution with valid UUIDs
    UserRepository.createUser = async ({
      name,
      email,
      passwordHash,
      verificationTokenHash,
      verificationTokenExpiresAt,
      emailVerified = false,
      role = 'user',
    }) => {
      const user = {
        id: generateUuid(),
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        email_verified: Boolean(emailVerified),
        notification_enabled: true,
        onboarding_completed: false,
        verification_token_hash: verificationTokenHash,
        verification_token_expires_at: verificationTokenExpiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryUsers.set(user.id, user);
      return user;
    };

    UserRepository.findByEmail = async (email) => {
      if (!email) return null;
      for (const u of memoryUsers.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u };
        }
      }
      return null;
    };

    UserRepository.findById = async (id) => {
      if (!id || !isValidUuid(id)) return null;
      const u = memoryUsers.get(id);
      return u ? { ...u } : null;
    };

    UserRepository.findByVerificationTokenHash = async (tokenHash) => {
      for (const u of memoryUsers.values()) {
        if (u.verification_token_hash === tokenHash) {
          return { ...u };
        }
      }
      return null;
    };

    UserRepository.markEmailVerified = async (userId) => {
      if (!userId || !isValidUuid(userId)) return null;
      const u = memoryUsers.get(userId);
      if (u) {
        u.email_verified = true;
        u.verification_token_hash = null;
        u.verification_token_expires_at = null;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    };

    UserRepository.updateVerificationToken = async (userId, tokenHash, expiresAt) => {
      if (!userId || !isValidUuid(userId)) return null;
      const u = memoryUsers.get(userId);
      if (u) {
        u.verification_token_hash = tokenHash;
        u.verification_token_expires_at = expiresAt;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    };

    UserRepository.updateOnboardingStatus = async (userId, completed = true) => {
      if (!userId || !isValidUuid(userId)) return null;
      const u = memoryUsers.get(userId);
      if (u) {
        u.onboarding_completed = Boolean(completed);
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    };
  });

  // Track dispatched emails in tests
  let sentEmails = [];
  let sentWelcomeEmails = [];

  emailService.sendVerificationEmail = async (arg1, arg2, arg3) => {
    let to, name, token;
    if (typeof arg1 === 'object' && arg1 !== null) {
      to = arg1.to || arg1.email;
      name = arg1.name;
      token = arg1.token || arg1.verificationToken;
    } else {
      to = arg1;
      name = arg2;
      token = arg3;
    }
    sentEmails.push({ to, name, token });
    return { success: true };
  };

  emailService.sendWelcomeEmail = async ({ to, name }) => {
    sentWelcomeEmails.push({ to, name });
    return { success: true };
  };


  /**
   * 1. Registration creates user with valid UUID.
   */
  it('1. Registration creates user with a valid UUID and returns authentication details', async () => {
    sentEmails = [];
    const res = await AuthService.register({
      name: 'Grace Hopper',
      email: 'grace@dailygrace.app',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    });

    assert.equal(res.success, true);
    assert.equal(res.user.email, 'grace@dailygrace.app');
    assert.ok(isValidUuid(res.user.id), 'Registration ID must be a valid RFC4122 UUID');
    assert.ok(res.token, 'Registration should return an authentication token for instant session');

    const user = await UserRepository.findByEmail('grace@dailygrace.app');
    assert.ok(user);
    assert.ok(isValidUuid(user.id), 'Stored user ID must be a valid UUID');
  });

  /**
   * 2. Registration generates a secure user with welcome email
   */
  it('2. Registration generates user and dispatches warm welcome email', async () => {
    sentWelcomeEmails = [];
    await AuthService.register({
      name: 'John Bunyan',
      email: 'john@dailygrace.app',
      password: 'PilgrimsProgress2026!',
    });

    const user = await UserRepository.findByEmail('john@dailygrace.app');
    assert.ok(user);
    assert.equal(sentWelcomeEmails.length, 1);
    assert.equal(sentWelcomeEmails[0].to, 'john@dailygrace.app');
    assert.equal(sentWelcomeEmails[0].name, 'John Bunyan');
  });

  /**
   * 3. Verification token expires after 24 hours if generated.
   */
  it('3. Verification token expires after approximately 24 hours', async () => {
    await AuthService.register({
      name: 'C.S. Lewis',
      email: 'lewis@dailygrace.app',
      password: 'MereChristianity123!',
    });

    const user = await UserRepository.findByEmail('lewis@dailygrace.app');
    assert.ok(user.verification_token_expires_at);

    const now = Date.now();
    const expiryTime = new Date(user.verification_token_expires_at).getTime();
    const hoursDiff = (expiryTime - now) / (1000 * 60 * 60);

    assert.ok(hoursDiff >= 23.9 && hoursDiff <= 24.1, 'Token expiry must be set to 24 hours');
  });

  /**
   * 4. Welcome email is sent with correct recipient and name.
   */
  it('4. Welcome email is sent with correct recipient and name', async () => {
    sentWelcomeEmails = [];
    await AuthService.register({
      name: 'Hannah More',
      email: 'hannah@dailygrace.app',
      password: 'FaithWorks2026!',
    });

    assert.equal(sentWelcomeEmails.length, 1);
    assert.equal(sentWelcomeEmails[0].to, 'hannah@dailygrace.app');
    assert.equal(sentWelcomeEmails[0].name, 'Hannah More');
  });


  /**
   * 5. Registered user can log in normally.
   */
  it('5. User can log in normally upon registration', async () => {
    await AuthService.register({
      name: 'Thomas Aquinas',
      email: 'thomas@dailygrace.app',
      password: 'SummaTheologiae1!',
    });

    const loginRes = await AuthService.login({
      email: 'thomas@dailygrace.app',
      password: 'SummaTheologiae1!',
    });

    assert.ok(loginRes.token);
    assert.equal(loginRes.user.email, 'thomas@dailygrace.app');
  });


  /**
   * 6. Valid token verifies the user.
   */
  it('6. Valid token verifies the user and marks email_verified = true', async () => {
    sentEmails = [];
    await AuthService.register({
      name: 'Dietrich Bonhoeffer',
      email: 'bonhoeffer@dailygrace.app',
      password: 'CostOfDiscipleship1!',
    });

    await AuthService.resendVerification('bonhoeffer@dailygrace.app');
    const token = sentEmails[0].token;
    const verifyResult = await AuthService.verifyEmail(token);
    assert.equal(verifyResult.success, true);

    const user = await UserRepository.findByEmail('bonhoeffer@dailygrace.app');
    assert.equal(user.email_verified, true);
    assert.equal(user.verification_token_hash, null);
    assert.equal(user.verification_token_expires_at, null);
  });

  /**
   * 7. Token cannot be reused.
   */
  it('7. Token cannot be reused once verified', async () => {
    sentEmails = [];
    await AuthService.register({
      name: 'Corrie ten Boom',
      email: 'corrie@dailygrace.app',
      password: 'TheHidingPlace1971!',
    });

    await AuthService.resendVerification('corrie@dailygrace.app');
    const token = sentEmails[0].token;
    await AuthService.verifyEmail(token);

    // Second attempt must fail
    await assert.rejects(
      async () => {
        await AuthService.verifyEmail(token);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /invalid|expired|used/i);
        return true;
      }
    );
  });

  /**
   * 8. Expired token is rejected.
   */
  it('8. Expired token is rejected', async () => {
    sentEmails = [];
    const reg = await AuthService.register({
      name: 'Blaise Pascal',
      email: 'pascal@dailygrace.app',
      password: 'Pensees1670!',
    });

    await AuthService.resendVerification('pascal@dailygrace.app');
    const token = sentEmails[0].token;

    // Simulate token expired 2 hours ago
    const user = memoryUsers.get(reg.id);
    user.verification_token_expires_at = new Date(Date.now() - 2 * 3600 * 1000);

    await assert.rejects(
      async () => {
        await AuthService.verifyEmail(token);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'EXPIRED_TOKEN');
        return true;
      }
    );
  });

  /**
   * 9. Resend creates a new token.
   */
  it('9. Resend creates a new token and sends a fresh email', async () => {
    sentEmails = [];
    await AuthService.register({
      name: 'George Muller',
      email: 'muller@dailygrace.app',
      password: 'FaithAndPrayer1!',
    });

    await AuthService.resendVerification('muller@dailygrace.app');
    const firstToken = sentEmails[0].token;

    sentEmails = [];
    const resendResult = await AuthService.resendVerification('muller@dailygrace.app');
    assert.equal(resendResult.success, true);
    assert.equal(sentEmails.length, 1);

    const secondToken = sentEmails[0].token;
    assert.notEqual(secondToken, firstToken);
  });

  /**
   * 10. Old token becomes invalid.
   */
  it('10. Old token becomes invalid when new token is generated on resend', async () => {
    sentEmails = [];
    await AuthService.register({
      name: 'Amy Carmichael',
      email: 'amy@dailygrace.app',
      password: 'ThingsAsTheyAre1!',
    });

    await AuthService.resendVerification('amy@dailygrace.app');
    const oldToken = sentEmails[0].token;

    // Trigger second resend
    sentEmails = [];
    await AuthService.resendVerification('amy@dailygrace.app');
    const newToken = sentEmails[0].token;

    // Old token should now fail
    await assert.rejects(
      async () => {
        await AuthService.verifyEmail(oldToken);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // New token must succeed
    const res = await AuthService.verifyEmail(newToken);
    assert.equal(res.success, true);
  });


  /**
   * 11. Registered user can log in and receive a JWT containing a valid UUID.
   */
  it('11. Registered user can log in and receive JWT token containing a valid UUID', async () => {
    const registered = await AuthService.register({
      name: 'John Newton',
      email: 'newton@dailygrace.app',
      password: 'AmazingGrace1779!',
    });

    const loginRes = await AuthService.login({
      email: 'newton@dailygrace.app',
      password: 'AmazingGrace1779!',
    });

    assert.ok(loginRes.token, 'Should return JWT token');
    assert.ok(isValidUuid(loginRes.user.id), 'Returned user ID must be a valid UUID');
    assert.equal(loginRes.user.id, registered.id);
    assert.equal(loginRes.user.email_verified, false);
    assert.equal(loginRes.user.name, 'John Newton');

    // Verify the decoded JWT payload
    const decoded = jwt.verify(loginRes.token, config.jwtSecret);
    assert.ok(isValidUuid(decoded.userId), 'JWT payload userId must be a valid UUID');
    assert.equal(decoded.userId, registered.id);
    assert.equal(decoded.email, 'newton@dailygrace.app');
  });

  /**
   * 12. GET /api/auth/me / AuthService.getMe retrieval with valid UUID.
   */
  it('12. AuthService.getMe retrieves user profile when given a valid UUID', async () => {
    const reg = await AuthService.register({
      name: 'Fanny Crosby',
      email: 'crosby@dailygrace.app',
      password: 'BlessedAssurance1!',
    });

    const profile = await AuthService.getMe(reg.id);
    assert.ok(profile);
    assert.equal(profile.id, reg.id);
    assert.equal(profile.email, 'crosby@dailygrace.app');
    assert.equal(profile.name, 'Fanny Crosby');
  });


  /**
   * 13. Rejection of invalid / legacy non-UUID user IDs in AuthService.getMe.
   */
  it('13. AuthService.getMe rejects legacy/invalid non-UUID IDs with 401 INVALID_TOKEN', async () => {
    const invalidIds = [
      'usr_1788276661558_lit0bv',
      'usr_admin_1',
      'usr_test_123',
      'invalid-id-format',
      '12345',
      '',
      null,
      undefined,
    ];

    for (const badId of invalidIds) {
      await assert.rejects(
        async () => {
          await AuthService.getMe(badId);
        },
        (err) => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, 'INVALID_TOKEN');
          return true;
        }
      );
    }
  });

  /**
   * 14. authenticateToken middleware rejects legacy non-UUID tokens.
   */
  it('14. authenticateToken middleware rejects tokens containing legacy non-UUID IDs (e.g. usr_*)', async () => {
    // Generate token with legacy usr_* ID
    const legacyToken = jwt.sign(
      { userId: 'usr_1788276661558_lit0bv', email: 'legacy@dailygrace.app', role: 'user' },
      config.jwtSecret
    );

    const req = { headers: { authorization: `Bearer ${legacyToken}` } };
    const res = {};
    let nextError = null;

    authenticateToken(req, res, (err) => {
      nextError = err;
    });

    assert.ok(nextError);
    assert.equal(nextError.statusCode, 401);
    assert.equal(nextError.code, 'INVALID_TOKEN');
    assert.match(nextError.message, /invalid authentication session/i);
  });

  /**
   * 15. authenticateToken middleware accepts tokens containing valid UUIDs.
   */
  it('15. authenticateToken middleware accepts tokens containing valid UUIDs', async () => {
    const validUuid = generateUuid();
    const validToken = jwt.sign(
      { userId: validUuid, email: 'valid@dailygrace.app', role: 'user', name: 'Valid User' },
      config.jwtSecret
    );

    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = {};
    let calledNext = false;
    let nextError = null;

    authenticateToken(req, res, (err) => {
      if (err) nextError = err;
      else calledNext = true;
    });

    assert.equal(nextError, null);
    assert.equal(calledNext, true);
    assert.equal(req.user.userId, validUuid);
  });

  /**
   * 16. Existing validation tests still pass.
   */
  it('16. Existing authentication tests still pass (validation, duplicate email, password check)', async () => {
    // Duplicate email test
    await AuthService.register({
      name: 'Martin Luther',
      email: 'luther@dailygrace.app',
      password: 'SolaFide1517!',
    });

    await assert.rejects(
      async () => {
        await AuthService.register({
          name: 'Martin Duplicate',
          email: 'luther@dailygrace.app',
          password: 'DifferentPass123!',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'EMAIL_EXISTS');
        return true;
      }
    );

    // Wrong password test
    await AuthService.register({
      name: 'Susanna Wesley',
      email: 'susanna@dailygrace.app',
      password: 'MotherOfMethodism1!',
    });

    // Wrong password test
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: 'susanna@dailygrace.app',
          password: 'IncorrectPassword!',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, 'INVALID_PASSWORD');
        return true;
      }
    );

    // Non-existent email test
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: 'nonexistent@dailygrace.app',
          password: 'SomePassword123!',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, 'USER_NOT_FOUND');
        return true;
      }
    );
  });

  /**
   * 17. Newly registered user defaults to notification_enabled = true and onboarding_completed = false
   */
  it('17. Newly registered user defaults to notification_enabled = true and onboarding_completed = false', async () => {
    const res = await AuthService.register({
      name: 'New Pilgrim',
      email: 'pilgrim@dailygrace.app',
      password: 'NewPilgrimPass123!',
    });

    assert.equal(res.user.notification_enabled, true, 'notification_enabled must default to true');
    assert.equal(res.user.onboarding_completed, false, 'onboarding_completed must default to false');

    const me = await AuthService.getMe(res.user.id);
    assert.equal(me.notification_enabled, true);
    assert.equal(me.onboarding_completed, false);
  });

  /**
   * 18. User completes onboarding and persists onboarding_completed = true
   */
  it('18. User completes onboarding and persists onboarding_completed = true', async () => {
    const { UserService } = await import('../src/services/userService.js');
    const res = await AuthService.register({
      name: 'Joyful Pilgrim',
      email: 'joyful@dailygrace.app',
      password: 'JoyfulPass123!',
    });

    const completion = await UserService.completeOnboarding(res.user.id);
    assert.equal(completion.onboarding_completed, true);
    assert.equal(completion.user.onboarding_completed, true);

    const updatedProfile = await UserService.getProfile(res.user.id);
    assert.equal(updatedProfile.onboarding_completed, true);
  });
});



