-- CareBook clinic scheduler — Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`)

create extension if not exists "uuid-ossp";

create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null unique,
  email text,
  date_of_birth date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete set null,
  channel text not null default 'web' check (channel in ('web', 'sms', 'whatsapp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_name text not null default 'Dr. Shivesh Kumar',
  consultation_type text not null check (consultation_type in ('opd', 'follow_up', 'urgent')),
  slot_date date not null,
  slot_start time not null,
  slot_end time not null,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_slot_date on appointments(slot_date);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_messages_conversation on messages(conversation_id);

-- Row Level Security: locked down by default, service role bypasses RLS
alter table patients enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;

-- No public policies are created here on purpose — all reads/writes go
-- through the API routes using the Supabase service role key.
