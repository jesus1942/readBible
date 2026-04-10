CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_seed TEXT NOT NULL,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  city TEXT,
  church TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_date TEXT,
  last_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_timezone_idx ON push_subscriptions (timezone);
CREATE INDEX IF NOT EXISTS push_subscriptions_city_idx ON push_subscriptions (city);
CREATE INDEX IF NOT EXISTS push_subscriptions_church_idx ON push_subscriptions (church);

CREATE TABLE IF NOT EXISTS community_users (
  id BIGSERIAL PRIMARY KEY,
  community_key TEXT UNIQUE,
  phone_e164 TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  display_name TEXT,
  city TEXT,
  church TEXT,
  role TEXT NOT NULL DEFAULT 'feligres',
  requested_role TEXT,
  requested_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
  approved_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  CONSTRAINT community_users_role_check CHECK (role IN ('dirigente', 'colaborador', 'feligres')),
  CONSTRAINT community_users_requested_role_check CHECK (requested_role IS NULL OR requested_role IN ('dirigente', 'colaborador', 'feligres')),
  CONSTRAINT community_users_status_check CHECK (status IN ('pending', 'active', 'inactive', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS community_users_community_key_idx ON community_users (community_key);
CREATE INDEX IF NOT EXISTS community_users_role_idx ON community_users (role);
CREATE INDEX IF NOT EXISTS community_users_status_idx ON community_users (status);
CREATE INDEX IF NOT EXISTS community_users_city_idx ON community_users (city);
CREATE INDEX IF NOT EXISTS community_users_church_idx ON community_users (church);

CREATE TABLE IF NOT EXISTS community_locations (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  church TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_locations_active_idx ON community_locations (is_active);
CREATE INDEX IF NOT EXISTS community_locations_city_idx ON community_locations (city);
CREATE INDEX IF NOT EXISTS community_locations_church_idx ON community_locations (church);

CREATE TABLE IF NOT EXISTS community_events (
  id BIGSERIAL PRIMARY KEY,
  location_id BIGINT NOT NULL REFERENCES community_locations(id) ON DELETE CASCADE,
  created_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'reunion',
  visibility TEXT NOT NULL DEFAULT 'community',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'scheduled',
  allow_check_in BOOLEAN NOT NULL DEFAULT TRUE,
  notify_radius_meters INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_events_type_check CHECK (event_type IN ('reunion', 'culto', 'oracion', 'estudio', 'servicio', 'especial')),
  CONSTRAINT community_events_visibility_check CHECK (visibility IN ('public', 'community', 'private')),
  CONSTRAINT community_events_status_check CHECK (status IN ('draft', 'scheduled', 'live', 'finished', 'cancelled')),
  CONSTRAINT community_events_time_check CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS community_events_location_idx ON community_events (location_id);
CREATE INDEX IF NOT EXISTS community_events_status_idx ON community_events (status);
CREATE INDEX IF NOT EXISTS community_events_starts_at_idx ON community_events (starts_at);

CREATE TABLE IF NOT EXISTS community_event_attendance (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  role_at_check_in TEXT NOT NULL,
  check_in_method TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'checked_in',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_event_attendance_unique_user UNIQUE (event_id, user_id),
  CONSTRAINT community_event_attendance_role_check CHECK (role_at_check_in IN ('dirigente', 'colaborador', 'feligres')),
  CONSTRAINT community_event_attendance_method_check CHECK (check_in_method IN ('manual', 'qr', 'geo', 'admin')),
  CONSTRAINT community_event_attendance_status_check CHECK (status IN ('checked_in', 'checked_out', 'cancelled')),
  CONSTRAINT community_event_attendance_time_check CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at)
);

CREATE INDEX IF NOT EXISTS community_event_attendance_event_idx ON community_event_attendance (event_id);
CREATE INDEX IF NOT EXISTS community_event_attendance_user_idx ON community_event_attendance (user_id);
CREATE INDEX IF NOT EXISTS community_event_attendance_status_idx ON community_event_attendance (status);

CREATE TABLE IF NOT EXISTS community_notification_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES community_users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  nearby_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  radius_meters INTEGER NOT NULL DEFAULT 1000,
  quiet_hours_start SMALLINT,
  quiet_hours_end SMALLINT,
  channels JSONB NOT NULL DEFAULT '["push"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_notification_preferences_radius_check CHECK (radius_meters BETWEEN 100 AND 50000),
  CONSTRAINT community_notification_preferences_quiet_hours_start_check CHECK (quiet_hours_start IS NULL OR quiet_hours_start BETWEEN 0 AND 23),
  CONSTRAINT community_notification_preferences_quiet_hours_end_check CHECK (quiet_hours_end IS NULL OR quiet_hours_end BETWEEN 0 AND 23)
);
