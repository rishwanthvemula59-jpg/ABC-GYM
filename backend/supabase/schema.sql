-- Supabase Schema for Gym Management System

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Drop existing tables safely (uncomment if you want to reset schema)
-- drop table if exists achievements cascade;
-- drop table if exists sessions cascade;
-- drop table if exists attendance cascade;
-- drop table if exists members cascade;
-- drop table if exists gym_settings cascade;
-- drop table if exists gyms cascade;
-- drop table if exists users cascade;

-- Create update trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

-- 1. Create users table
create table users (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid,
    email text unique not null,
    password_hash text not null,
    role text default 'owner',
    full_name text,
    first_name text,
    last_name text,
    phone text,
    is_active boolean default true,
    last_login timestamptz,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

-- 2. Create gyms table
create table gyms (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references users(id) on delete cascade,
    name text,
    gym_name text,
    owner_name text,
    owner_phone text,
    email text,
    phone text,
    location text,
    logo_url text,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

-- Establish foreign key relationship back to gyms
alter table users add constraint fk_users_gym foreign key (gym_id) references gyms(id) on delete set null;

-- 3. Create gym_settings table
create table gym_settings (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid unique references gyms(id) on delete cascade,
    currency text default 'INR',
    timezone text default 'Asia/Kolkata',
    whatsapp_enabled boolean default false,
    sms_enabled boolean default false,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

-- 4. Create members table
create table members (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid not null references gyms(id) on delete cascade,
    full_name text not null,
    email text,
    phone text not null,
    joins_at date,
    start_date date,
    expiry_date date not null,
    is_active boolean default true,
    status text default 'active',
    plan_type text,
    plan text,
    plan_price numeric default 0,
    payment_status text default 'pending',
    payment_date timestamptz,
    notes text,
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now()),
    unique(gym_id, phone)
);

-- 5. Create attendance table
create table attendance (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid not null references gyms(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    check_in_date date not null,
    created_at timestamptz default timezone('utc', now()),
    marked_by text default 'admin',
    unique(member_id, check_in_date)
);

-- 6. Create sessions table
create table sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    gym_id uuid references gyms(id) on delete cascade,
    token text not null,
    expires_at timestamptz not null,
    created_at timestamptz default timezone('utc', now()),
    last_activity timestamptz default timezone('utc', now())
);

-- 7. Create achievements table
create table achievements (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references members(id) on delete cascade,
    achievement_type text not null,
    created_at timestamptz default timezone('utc', now())
);

-- 8. Create message_logs table
create table message_logs (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid not null references gyms(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    message_type text not null,
    status text default 'sent',
    phone_number text not null,
    created_at timestamptz default timezone('utc', now())
);

-- Create triggers for updated_at column auto-updates
create trigger update_users_updated_at before update on users for each row execute procedure update_updated_at_column();
create trigger update_gyms_updated_at before update on gyms for each row execute procedure update_updated_at_column();
create trigger update_gym_settings_updated_at before update on gym_settings for each row execute procedure update_updated_at_column();
create trigger update_members_updated_at before update on members for each row execute procedure update_updated_at_column();

-- Optimize query paths with indexes
create index idx_members_gym_id on members(gym_id);
create index idx_members_gym_phone on members(gym_id, phone);
create index idx_members_gym_expiry on members(gym_id, expiry_date);
create index idx_attendance_gym_date on attendance(gym_id, check_in_date);
create index idx_attendance_member_date on attendance(member_id, check_in_date);
create index idx_sessions_token on sessions(token);
create index idx_sessions_user_id on sessions(user_id);
create index idx_message_logs_gym on message_logs(gym_id);
