-- ============================================================
-- ABC FITNESS STUDIO - SUPABASE DATABASE MIGRATION
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. USERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- 2. GYMS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gym_name TEXT NOT NULL,
  owner_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. GYM SETTINGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gym_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. MEMBERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('1_month', '3_month')),
  plan_price NUMERIC(10, 2) NOT NULL DEFAULT 750,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending')),
  payment_date TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (gym_id, phone)
);

-- ─────────────────────────────────────────────
-- 5. ATTENDANCE TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  marked_by TEXT DEFAULT 'self' CHECK (marked_by IN ('self', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, check_in_date)
);

-- ─────────────────────────────────────────────
-- 6. ACHIEVEMENTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. SESSIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. MESSAGE LOGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  message_type TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 9. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_id ON attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_date ON attendance(check_in_date);

-- ─────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS)
-- Disable for now - enable after testing
-- ─────────────────────────────────────────────
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE gyms DISABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 11. SEED DATA - ABC FITNESS STUDIO OWNER
-- Password: Test@1234
-- ─────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active)
VALUES (
  'd255feca-fdd4-48e8-a2a2-f8e03f69f8bf',
  'owner@abcfitness.com',
  '$2a$10$1EBt5Vb0hByEXCN/wW.3O.aleVgkTfM96KBQJxQgdyQfsCuNwZNyq',
  'Rajesh',
  'Kumar',
  '9876543210',
  TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO gyms (id, owner_id, gym_name, owner_phone)
VALUES (
  '60916a67-7d4a-4c44-bb6a-d74c54354a81',
  'd255feca-fdd4-48e8-a2a2-f8e03f69f8bf',
  'ABC Fitness Studio',
  '9876543210'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_settings (gym_id)
VALUES ('60916a67-7d4a-4c44-bb6a-d74c54354a81')
ON CONFLICT (gym_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- DONE! All tables created successfully.
-- ─────────────────────────────────────────────
