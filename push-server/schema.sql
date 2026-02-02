CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_seed TEXT NOT NULL,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_date TEXT,
  last_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_timezone_idx ON push_subscriptions (timezone);
