-- Daily Grace - Complete Database Schema (Phases 1, 2, 3, 4, 5, & 6)

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Phases 1, 3, & 6)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    notification_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    verification_token_hash VARCHAR(255),
    verification_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Migration support for existing instances
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;


CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token_hash);

-- 2. Motivations Table (Phases 2, 4, & 6)
CREATE TABLE IF NOT EXISTS motivations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    verse TEXT NOT NULL,
    reference VARCHAR(150) NOT NULL,
    reflection TEXT NOT NULL,
    prayer TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Migration support for existing instances
ALTER TABLE motivations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_motivations_status ON motivations(status);
CREATE INDEX IF NOT EXISTS idx_motivations_title ON motivations(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_motivations_reference ON motivations(LOWER(reference));
CREATE INDEX IF NOT EXISTS idx_motivations_created ON motivations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_motivations_updated ON motivations(updated_at DESC);


-- 3. Daily Motivations Assignment Table (Phase 2)
CREATE TABLE IF NOT EXISTS daily_motivations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    motivation_id UUID NOT NULL REFERENCES motivations(id) ON DELETE RESTRICT,
    assigned_date DATE NOT NULL,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_assigned_date UNIQUE (user_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_motivations_user_cycle ON daily_motivations(user_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_daily_motivations_user_date ON daily_motivations(user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_daily_motivations_motivation ON daily_motivations(motivation_id);

-- 4. Daily Reminder Logs Table (Phase 5)
CREATE TABLE IF NOT EXISTS daily_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    CONSTRAINT uq_user_reminder_date UNIQUE (user_id, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_date ON daily_reminder_logs(reminder_date);
CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_user ON daily_reminder_logs(user_id);
