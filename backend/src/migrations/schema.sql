CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id),
  gym_name VARCHAR(255) NOT NULL,
  owner_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  plan VARCHAR(50),
  plan_price NUMERIC(10, 2),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'paid',
  current_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gym_id, phone)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  member_id UUID NOT NULL REFERENCES members(id),
  check_in_date DATE NOT NULL,
  marked_by VARCHAR(50) DEFAULT 'self',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, check_in_date)
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  achievement_type VARCHAR(100),
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, achievement_type)
);

CREATE TABLE gym_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL UNIQUE REFERENCES gyms(id),
  auto_renewal_reminder BOOLEAN DEFAULT true,
  enable_whatsapp_reminders BOOLEAN DEFAULT true
);

CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  gym_id UUID REFERENCES gyms(id),
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  member_id UUID NOT NULL REFERENCES members(id),
  message_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_gyms_owner ON gyms(owner_id);
CREATE INDEX idx_members_gym ON members(gym_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);