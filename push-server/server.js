import express from "express";
import { Pool } from "pg";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "production";
const IS_LOCAL_DEV = NODE_ENV !== "production";
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.trim() : "";
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PRIVATE_KEY.trim() : "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const COMMUNITY_ADMIN_CODE = process.env.COMMUNITY_ADMIN_CODE || (IS_LOCAL_DEV ? "amen123" : "");
const COMMUNITY_DEVELOPER_CODE = process.env.COMMUNITY_DEVELOPER_CODE || (IS_LOCAL_DEV ? "dev2024" : "");
const APP_URL = process.env.APP_URL || "https://jesus1942.github.io/readBible/";
const DAILY_VERSION = process.env.DAILY_VERSION || "RVR1960";
const CRON_WINDOW_MINUTES = Number(process.env.CRON_WINDOW_MINUTES || 15);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_EMAIL || "denovaje@proton.me";
// Hash scrypt (salt:hash) usado solo para sembrar la cuenta la primera vez;
// despues manda lo que haya en la tabla superadmin_account.
const SUPERADMIN_SEED_PASSWORD_HASH = process.env.SUPERADMIN_PASSWORD_HASH ||
  "be3c3205c3f79810afbb0b2941dbcf9d:c428a1e6f9ad4d13cb793591603c06d7bd03f4da88f43c7c3a9db1dcd421c957df8f56d3bca1a99cef40684fae13f5cdbff53811b14124de8f56179b12e5c8cf";
const SUPERADMIN_SESSION_DAYS = 7;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  if (IS_LOCAL_DEV) {
    const generated = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = generated.publicKey;
    VAPID_PRIVATE_KEY = generated.privateKey;
    console.warn("Using ephemeral VAPID keys for local development");
  } else {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required");
  }
}

webpush.setVapidDetails("mailto:admin@readbible.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowlist = CORS_ORIGINS.length
    ? CORS_ORIGINS
    : [
      "https://jesus1942.github.io",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "https://localhost",
      "capacitor://localhost"
    ];
  if (origin && allowlist.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Cron-Secret, X-Community-Secret, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});
app.use(express.json({ limit: "1mb" }));

let dailyVerses = [];

async function loadDailyVerses() {
  const localPath = path.join(__dirname, "daily_verses.json");
  const repoPath = path.join(__dirname, "..", "daily_verses.json");
  const candidates = [localPath, repoPath];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        dailyVerses = JSON.parse(fs.readFileSync(candidate, "utf-8"));
        return;
      }
    } catch {
      // ignore and try next
    }
  }
  const remoteUrl = `${APP_URL.replace(/\/$/, "")}/daily_verses.json`;
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch daily_verses.json");
  }
  dailyVerses = await response.json();
}

async function ensureSchema() {
  await pool.query(`
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
  `);
  await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS city TEXT;`);
  await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS church TEXT;`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_subscriptions_timezone_idx
    ON push_subscriptions (timezone);
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS push_subscriptions_city_idx ON push_subscriptions (city);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS push_subscriptions_church_idx ON push_subscriptions (church);`);
  await pool.query(`
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
      last_seen_at TIMESTAMPTZ
    );
  `);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS community_key TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS community_secret TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS requested_role TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS address TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_users_coords_idx ON community_users (latitude, longitude) WHERE latitude IS NOT NULL;`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_users_role_check'
      ) THEN
        ALTER TABLE community_users
        ADD CONSTRAINT community_users_role_check
        CHECK (role IN ('dirigente', 'colaborador', 'feligres'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_users_requested_role_check'
      ) THEN
        ALTER TABLE community_users
        ADD CONSTRAINT community_users_requested_role_check
        CHECK (requested_role IS NULL OR requested_role IN ('dirigente', 'colaborador', 'feligres'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_users_status_check'
      ) THEN
        ALTER TABLE community_users
        ADD CONSTRAINT community_users_status_check
        CHECK (status IN ('pending', 'active', 'inactive', 'blocked'));
      END IF;
    END
    $$;
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS community_users_community_key_idx ON community_users (community_key);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_users_role_idx ON community_users (role);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_users_status_idx ON community_users (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_users_city_idx ON community_users (city);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_users_church_idx ON community_users (church);`);
  await pool.query(`
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
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_locations_active_idx ON community_locations (is_active);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_locations_city_idx ON community_locations (city);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_locations_church_idx ON community_locations (church);`);
  await pool.query(`
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_events_type_check'
      ) THEN
        ALTER TABLE community_events
        ADD CONSTRAINT community_events_type_check
        CHECK (event_type IN ('reunion', 'culto', 'oracion', 'estudio', 'servicio', 'especial'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_events_visibility_check'
      ) THEN
        ALTER TABLE community_events
        ADD CONSTRAINT community_events_visibility_check
        CHECK (visibility IN ('public', 'community', 'private'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_events_status_check'
      ) THEN
        ALTER TABLE community_events
        ADD CONSTRAINT community_events_status_check
        CHECK (status IN ('draft', 'scheduled', 'live', 'finished', 'cancelled'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_events_time_check'
      ) THEN
        ALTER TABLE community_events
        ADD CONSTRAINT community_events_time_check
        CHECK (ends_at IS NULL OR ends_at >= starts_at);
      END IF;
    END
    $$;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_events_location_idx ON community_events (location_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_events_status_idx ON community_events (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_events_starts_at_idx ON community_events (starts_at);`);
  await pool.query(`
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
      UNIQUE (event_id, user_id)
    );
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_event_attendance_role_check'
      ) THEN
        ALTER TABLE community_event_attendance
        ADD CONSTRAINT community_event_attendance_role_check
        CHECK (role_at_check_in IN ('dirigente', 'colaborador', 'feligres'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_event_attendance_method_check'
      ) THEN
        ALTER TABLE community_event_attendance
        ADD CONSTRAINT community_event_attendance_method_check
        CHECK (check_in_method IN ('manual', 'qr', 'geo', 'admin'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_event_attendance_status_check'
      ) THEN
        ALTER TABLE community_event_attendance
        ADD CONSTRAINT community_event_attendance_status_check
        CHECK (status IN ('checked_in', 'checked_out', 'cancelled'));
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_event_attendance_time_check'
      ) THEN
        ALTER TABLE community_event_attendance
        ADD CONSTRAINT community_event_attendance_time_check
        CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at);
      END IF;
    END
    $$;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_event_attendance_event_idx ON community_event_attendance (event_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_event_attendance_user_idx ON community_event_attendance (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_event_attendance_status_idx ON community_event_attendance (status);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_notification_preferences (
      user_id BIGINT PRIMARY KEY REFERENCES community_users(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      nearby_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      radius_meters INTEGER NOT NULL DEFAULT 1000,
      quiet_hours_start SMALLINT,
      quiet_hours_end SMALLINT,
      channels JSONB NOT NULL DEFAULT '["push"]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_notification_preferences_radius_check'
      ) THEN
        ALTER TABLE community_notification_preferences
        ADD CONSTRAINT community_notification_preferences_radius_check
        CHECK (radius_meters BETWEEN 100 AND 50000);
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_notification_preferences_quiet_hours_start_check'
      ) THEN
        ALTER TABLE community_notification_preferences
        ADD CONSTRAINT community_notification_preferences_quiet_hours_start_check
        CHECK (quiet_hours_start IS NULL OR quiet_hours_start BETWEEN 0 AND 23);
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'community_notification_preferences_quiet_hours_end_check'
      ) THEN
        ALTER TABLE community_notification_preferences
        ADD CONSTRAINT community_notification_preferences_quiet_hours_end_check
        CHECK (quiet_hours_end IS NULL OR quiet_hours_end BETWEEN 0 AND 23);
      END IF;
    END
    $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_study_cells (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      meeting_day TEXT,
      meeting_time TEXT,
      location_id BIGINT REFERENCES community_locations(id) ON DELETE SET NULL,
      created_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
      leader_name TEXT,
      church TEXT,
      city TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_study_cells_church_idx ON community_study_cells (church);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_study_cells_active_idx ON community_study_cells (is_active);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_study_materials (
      id BIGSERIAL PRIMARY KEY,
      cell_id BIGINT REFERENCES community_study_cells(id) ON DELETE CASCADE,
      event_id BIGINT REFERENCES community_events(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT,
      bible_reference TEXT,
      source TEXT NOT NULL DEFAULT 'leader',
      created_by_user_id BIGINT REFERENCES community_users(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_study_materials_cell_idx ON community_study_materials (cell_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS community_study_materials_event_idx ON community_study_materials (event_id);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS superadmin_account (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS superadmin_sessions (
      token_hash TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query(
    `INSERT INTO superadmin_account (id, email, password_hash)
     VALUES (1, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [SUPERADMIN_SEED_EMAIL, SUPERADMIN_SEED_PASSWORD_HASH]
  );
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS google_sub TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS google_email TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS google_linked_at TIMESTAMPTZ;`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS community_users_google_sub_idx
    ON community_users (google_sub) WHERE google_sub IS NOT NULL;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      device_label TEXT
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_highlights (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
      passage_key TEXT NOT NULL,
      highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at_ms BIGINT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, passage_key)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_studies (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
      passage_key TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at_ms BIGINT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, passage_key)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_bookmarks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
      bookmark_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at_ms BIGINT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, bookmark_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_prefs (
      user_id BIGINT PRIMARY KEY REFERENCES community_users(id) ON DELETE CASCADE,
      last_query JSONB,
      daily_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at_ms BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devotionals (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
      devotional_date DATE NOT NULL,
      passage_reference TEXT,
      passage_key TEXT,
      title TEXT,
      observation TEXT,
      application TEXT,
      prayer TEXT,
      is_private BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at_ms BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, devotional_date)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS devotionals_user_date_idx ON devotionals (user_id, devotional_date DESC);`);
}

function normalizeThemes(themes) {
  if (!Array.isArray(themes)) return [];
  return themes.map((t) => String(t || "").trim()).filter(Boolean);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDayOfYear(year, month, day) {
  const start = new Date(Date.UTC(year, 0, 0));
  const current = new Date(Date.UTC(year, month - 1, day));
  const diff = current - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getLocalParts(date, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute)
    };
  } catch {
    const utc = new Date(date.toISOString());
    return {
      year: utc.getUTCFullYear(),
      month: utc.getUTCMonth() + 1,
      day: utc.getUTCDate(),
      hour: utc.getUTCHours(),
      minute: utc.getUTCMinutes()
    };
  }
}

function dailyIndexForUser(seed, themes, dayIndex, total) {
  const key = `${seed}|${themes.join("|")}|${dayIndex}`;
  return simpleHash(key) % total;
}

function parseReference(reference) {
  const match = reference.match(/^([1-3]?\s?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\s+(\d+):(\d+)(?:-(\d+))?/);
  if (!match) return null;
  const book = match[1].replace(/\s+/g, " ").trim();
  const chapter = parseInt(match[2], 10);
  const verseStart = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;
  return { book, chapter, verseStart, verseEnd };
}

function formatBookDisplay(book) {
  return book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
}

function buildReference(book, chapter, verseStart, verseEnd, version) {
  const bookDisplay = formatBookDisplay(book);
  if (verseStart === verseEnd) {
    return `${bookDisplay} ${chapter}:${verseStart} (${version})`;
  }
  return `${bookDisplay} ${chapter}:${verseStart}-${verseEnd} (${version})`;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function extractByClassPattern($passage, verseStart, verseEnd) {
  const parts = [];
  $passage.find("span.text").each((_, el) => {
    const classList = ($(el).attr("class") || "").split(/\s+/);
    let verseNum = null;
    let verseNumEnd = null;
    classList.forEach((cls) => {
      const rangeMatch = cls.match(/-(\d+)-(\d+)$/);
      if (rangeMatch) {
        verseNum = parseInt(rangeMatch[1], 10);
        verseNumEnd = parseInt(rangeMatch[2], 10);
      } else {
        const singleMatch = cls.match(/-(\d+)$/);
        if (singleMatch) {
          verseNum = parseInt(singleMatch[1], 10);
          verseNumEnd = verseNum;
        }
      }
    });
    if (verseNum !== null) {
      const end = verseNumEnd ?? verseNum;
      if (end < verseStart || verseNum > verseEnd) return;
    }
    let text = $(el).text().trim();
    text = text.replace(/^\d+\s*/, "").replace(/\([^)]*\)/g, "");
    if (text) parts.push(text);
  });
  return parts.join(" ").trim();
}

function parseHTML(html, query) {
  const $ = cheerio.load(html);
  const $passage = $("div.passage-text").first();
  if (!$passage.length) return null;
  $passage.find("sup, footnote, crossreference, audio").remove();
  $passage.find("h1, h2, h3, h4, h5").remove();
  $passage.find(".footnotes, .crossrefs, .passage-other-trans, .full-chap-link").remove();
  let verseText = extractByClassPattern($passage, query.verseStart, query.verseEnd);
  if (!verseText) {
    verseText = $passage.text() || "";
  }
  verseText = cleanText(verseText);
  return verseText || null;
}

async function fetchVerseText(reference, version) {
  const parsed = parseReference(reference);
  if (!parsed) return "";
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}:${parsed.verseStart}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "ReadBible-Push/1.0" }
  });
  if (!response.ok) return "";
  const html = await response.text();
  return parseHTML(html, parsed) || "";
}

function getDailyReference(seed, themes, timeZone) {
  const now = new Date();
  const parts = getLocalParts(now, timeZone);
  const dayIndex = getDayOfYear(parts.year, parts.month, parts.day);
  const idx = dailyIndexForUser(seed, themes, dayIndex, dailyVerses.length);
  const entry = dailyVerses[idx];
  const reference = String(entry.reference || "").trim();
  return reference;
}

function normalizeCommunityText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeCommunityRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (["dirigente", "colaborador", "feligres"].includes(role)) return role;
  return "feligres";
}

function normalizeCommunityStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (["pending", "active", "inactive", "blocked"].includes(status)) return status;
  return "active";
}

function normalizeCoordinate(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function serializeCommunityUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityKey: row.community_key,
    fullName: row.full_name,
    displayName: row.display_name,
    city: row.city,
    church: row.church,
    role: row.role,
    requestedRole: row.requested_role,
    requestedAt: row.requested_at,
    status: row.status,
    address: row.address || null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null
  };
}

async function getCommunityUserByKey(client, communityKey) {
  if (!communityKey) return null;
  const { rows } = await client.query(
    `SELECT *
     FROM community_users
     WHERE community_key = $1
     LIMIT 1`,
    [communityKey]
  );
  return rows[0] || null;
}

async function requireCommunityUser(client, communityKey) {
  const user = await getCommunityUserByKey(client, communityKey);
  if (!user) {
    const error = new Error("community user not found");
    error.status = 404;
    throw error;
  }
  if (user.status !== "active") {
    const error = new Error("community user is not active");
    error.status = 403;
    throw error;
  }
  return user;
}

function requireLeaderRole(user) {
  if (!user || !["dirigente", "colaborador"].includes(user.role)) {
    const error = new Error("insufficient role");
    error.status = 403;
    throw error;
  }
}

function requireDirigenteRole(user) {
  if (!user || user.role !== "dirigente") {
    const error = new Error("dirigente role required");
    error.status = 403;
    throw error;
  }
}

function getCommunitySecret(req) {
  const fromHeader = req.headers && req.headers["x-community-secret"];
  const fromBody = req.body && req.body.communitySecret;
  const fromQuery = req.query && req.query.communitySecret;
  return normalizeCommunityText(fromHeader || fromBody || fromQuery);
}

// Verifica identidad real: communityKey + communitySecret deben coincidir.
// Trust-on-first-use: una cuenta sin secreto (creada antes de esta version)
// adopta el primer secreto que se presente y a partir de ahi queda fijo.
async function requireCommunityAuth(client, communityKey, communitySecret) {
  const user = await requireCommunityUser(client, communityKey);
  if (!communitySecret) {
    const error = new Error("missing communitySecret");
    error.status = 401;
    throw error;
  }
  if (!user.community_secret) {
    await client.query(
      `UPDATE community_users SET community_secret = $2, updated_at = NOW() WHERE id = $1`,
      [user.id, communitySecret]
    );
    user.community_secret = communitySecret;
    return user;
  }
  if (user.community_secret !== communitySecret) {
    const error = new Error("invalid credentials");
    error.status = 401;
    throw error;
  }
  return user;
}

// Como serializeCommunityUser pero sin exponer la credential de otros usuarios.
function serializeCommunityMember(row) {
  const data = serializeCommunityUser(row);
  if (data) delete data.communityKey;
  return data;
}

async function listCommunityLocations(client) {
  const { rows } = await client.query(
    `SELECT id, slug, name, description, address, city, church, latitude, longitude, is_active
     FROM community_locations
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    church: row.church,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.is_active
  }));
}

async function listCommunityEvents(client) {
  const { rows } = await client.query(
    `SELECT
       e.id,
       e.location_id,
       e.title,
       e.description,
       e.event_type,
       e.visibility,
       e.starts_at,
       e.ends_at,
       e.timezone,
       e.status,
       e.allow_check_in,
       e.notify_radius_meters,
       l.name AS location_name,
       l.address AS location_address,
       l.city AS location_city,
       l.church AS location_church,
       l.latitude AS location_latitude,
       l.longitude AS location_longitude,
       COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'checked_in'), 0)::int AS total_checked_in,
       COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'checked_in' AND a.role_at_check_in = 'dirigente'), 0)::int AS dirigentes_count,
       COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'checked_in' AND a.role_at_check_in = 'colaborador'), 0)::int AS colaboradores_count,
       COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'checked_in' AND a.role_at_check_in = 'feligres'), 0)::int AS feligreses_count
     FROM community_events e
     JOIN community_locations l ON l.id = e.location_id
     LEFT JOIN community_event_attendance a ON a.event_id = e.id
     WHERE e.status IN ('scheduled', 'live')
     GROUP BY e.id, l.id
     ORDER BY e.starts_at ASC
     LIMIT 25`
  );
  return rows.map((row) => ({
    id: row.id,
    locationId: row.location_id,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    visibility: row.visibility,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    status: row.status,
    allowCheckIn: row.allow_check_in,
    notifyRadiusMeters: row.notify_radius_meters,
    location: {
      name: row.location_name,
      address: row.location_address,
      city: row.location_city,
      church: row.location_church,
      latitude: row.location_latitude,
      longitude: row.location_longitude
    },
    attendance: {
      total: row.total_checked_in,
      dirigentes: row.dirigentes_count,
      colaboradores: row.colaboradores_count,
      feligreses: row.feligreses_count
    }
  }));
}

async function getEventAttendanceForUser(client, eventId, userId) {
  const { rows } = await client.query(
    `SELECT id, event_id, user_id, status, role_at_check_in, checked_in_at, checked_out_at
     FROM community_event_attendance
     WHERE event_id = $1 AND user_id = $2
     LIMIT 1`,
    [eventId, userId]
  );
  return rows[0] || null;
}

async function listPendingRoleRequests(client) {
  const { rows } = await client.query(
    `SELECT id, community_key, full_name, display_name, city, church, role, requested_role, requested_at, status
     FROM community_users
     WHERE requested_role IS NOT NULL
       AND requested_role <> role
       AND status = 'active'
     ORDER BY requested_at ASC NULLS LAST, created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    communityKey: row.community_key,
    fullName: row.full_name,
    displayName: row.display_name,
    city: row.city,
    church: row.church,
    role: row.role,
    requestedRole: row.requested_role,
    requestedAt: row.requested_at,
    status: row.status
  }));
}

async function ensureCommunitySeedData() {
  if (!IS_LOCAL_DEV) return;
  const client = await pool.connect();
  try {
    const { rows: locationRows } = await client.query("SELECT COUNT(*)::int AS count FROM community_locations");
    if (locationRows[0].count > 0) return;
    let leader = await getCommunityUserByKey(client, "demo-dirigente");
    if (!leader) {
      const { rows } = await client.query(
        `INSERT INTO community_users (community_key, full_name, display_name, city, church, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        ["demo-dirigente", "Lider Demo", "Lider Demo", "Puerto Madryn", "HDR", "dirigente", "active"]
      );
      leader = rows[0];
    } else {
      const { rows } = await client.query(
        `UPDATE community_users
         SET full_name = $2,
             display_name = $3,
             city = $4,
             church = $5,
             role = $6,
             status = $7,
             updated_at = NOW()
         WHERE community_key = $1
         RETURNING *`,
        ["demo-dirigente", "Lider Demo", "Lider Demo", "Puerto Madryn", "HDR", "dirigente", "active"]
      );
      leader = rows[0];
    }
    const leaderId = leader.id;
    const { rows: locationInsert } = await client.query(
      `INSERT INTO community_locations
         (slug, name, description, address, city, church, latitude, longitude, created_by_user_id)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        "hdr-puerto-madryn",
        "HDR Puerto Madryn",
        "Punto demo para pruebas locales",
        "Mitre 1200, Puerto Madryn",
        "Puerto Madryn",
        "HDR",
        -42.7692,
        -65.0385,
        leaderId
      ]
    );
    const locationId = locationInsert[0].id;
    const start = new Date(Date.now() + 1000 * 60 * 45);
    const end = new Date(start.getTime() + 1000 * 60 * 90);
    await client.query(
      `INSERT INTO community_events
         (location_id, created_by_user_id, title, description, event_type, visibility, starts_at, ends_at, timezone, status, allow_check_in, notify_radius_meters)
       VALUES
         ($1, $2, $3, $4, 'reunion', 'community', $5, $6, 'America/Argentina/Buenos_Aires', 'scheduled', TRUE, 1200)`,
      [
        locationId,
        leaderId,
        "Reunion de prueba",
        "Evento demo para validar comunidad, mapa y asistencia en local.",
        start.toISOString(),
        end.toISOString()
      ]
    );
  } finally {
    client.release();
  }
}

app.get("/vapid-public-key", (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

app.get("/community/bootstrap", async (req, res) => {
  const communityKey = normalizeCommunityText(req.query.communityKey);
  const client = await pool.connect();
  try {
    const user = await getCommunityUserByKey(client, communityKey);
    const [locations, events] = await Promise.all([
      listCommunityLocations(client),
      listCommunityEvents(client)
    ]);
    let attendance = [];
    let pendingRoleRequests = [];
    if (user) {
      const { rows } = await client.query(
        `SELECT event_id, status, role_at_check_in, checked_in_at
         FROM community_event_attendance
         WHERE user_id = $1`,
        [user.id]
      );
      attendance = rows.map((row) => ({
        eventId: row.event_id,
        status: row.status,
        roleAtCheckIn: row.role_at_check_in,
        checkedInAt: row.checked_in_at
      }));
      if (user.role === "dirigente") {
        pendingRoleRequests = await listPendingRoleRequests(client);
      }
    }
    return res.json({
      ok: true,
      auth: {
        roleApprovalMode: COMMUNITY_ADMIN_CODE ? "admin_code" : "disabled",
        localAdminCodeHint: IS_LOCAL_DEV && COMMUNITY_ADMIN_CODE ? COMMUNITY_ADMIN_CODE : ""
      },
      profile: serializeCommunityUser(user),
      locations,
      events,
      attendance,
      pendingRoleRequests
    });
  } finally {
    client.release();
  }
});

app.post("/community/developer-auth", (req, res) => {
  const code = normalizeCommunityText(req.body && req.body.code);
  if (!COMMUNITY_DEVELOPER_CODE) {
    return res.status(403).json({ error: "developer mode disabled" });
  }
  if (!code || code !== COMMUNITY_DEVELOPER_CODE) {
    return res.status(401).json({ error: "invalid developer code" });
  }
  return res.json({ ok: true });
});

const APP_SETTING_DEFS = [
  {
    key: "GOOGLE_CLIENT_ID_WEB",
    label: "Google OAuth Client ID (web)",
    hint: "Termina en .apps.googleusercontent.com. Se crea en Google Cloud Console > Credenciales.",
    secret: false,
    guide: [
      "Entra a console.cloud.google.com con tu cuenta de Google y crea un proyecto nuevo (nombre sugerido: readBible).",
      "En el menu de la izquierda anda a APIs y servicios > Pantalla de consentimiento OAuth. Tipo de usuario: Externo. Completa nombre de la app (Lectura Viva), tu email de soporte y tu email de contacto. Guarda y toca Publicar aplicacion.",
      "Anda a APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth.",
      "Tipo de aplicacion: Aplicacion web. Nombre: readBible web.",
      "En Origenes de JavaScript autorizados agrega: https://jesus1942.github.io y tambien http://localhost:8000 (para pruebas).",
      "Toca Crear. Copia el ID de cliente (termina en .apps.googleusercontent.com) y pegalo aca. No necesitas el secreto de cliente para este flujo."
    ]
  },
  {
    key: "GOOGLE_CLIENT_ID_ANDROID",
    label: "Google OAuth Client ID (Android)",
    hint: "Client ID nativo para la app Capacitor de Android.",
    secret: false,
    guide: [
      "En el mismo proyecto de Google Cloud: APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth.",
      "Tipo de aplicacion: Android.",
      "Nombre del paquete: com.lecturaviva.app",
      "Huella digital SHA-1: en tu maquina, con el keystore con el que firmas la app, corre: keytool -list -v -keystore TU_KEYSTORE.jks y copia el valor SHA1.",
      "Toca Crear, copia el ID de cliente y pegalo aca. Este paso recien hace falta cuando publiquemos el login en la app Android; podes dejarlo pendiente."
    ]
  },
  {
    key: "GOOGLE_CLIENT_ID_IOS",
    label: "Google OAuth Client ID (iOS)",
    hint: "Client ID nativo para la app Capacitor de iOS.",
    secret: false,
    guide: [
      "En el mismo proyecto de Google Cloud: APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth.",
      "Tipo de aplicacion: iOS.",
      "ID del paquete: com.lecturaviva.app",
      "Toca Crear, copia el ID de cliente y pegalo aca. Igual que Android, recien hace falta al publicar la app iOS; podes dejarlo pendiente."
    ]
  },
  {
    key: "MP_ACCESS_TOKEN",
    label: "MercadoPago Access Token",
    hint: "Credencial privada de produccion (empieza con APP_USR-). Panel de MercadoPago > Tus integraciones.",
    secret: true,
    guide: [
      "Entra a mercadopago.com.ar/developers/panel con la cuenta de MercadoPago que va a recibir los cobros.",
      "Toca Crear aplicacion. Nombre: readBible. Tipo de solucion: Pagos online. Producto: Suscripciones (si te pregunta, marca que NO usas plataforma de ecommerce).",
      "Entra a la aplicacion creada y anda a Credenciales de produccion (te puede pedir completar datos del negocio la primera vez).",
      "Copia el Access Token (empieza con APP_USR-) y pegalo aca. Es la credencial mas sensible: no la compartas ni la mandes por mensaje."
    ]
  },
  {
    key: "MP_PUBLIC_KEY",
    label: "MercadoPago Public Key",
    hint: "Credencial publica de produccion.",
    secret: false,
    guide: [
      "En la misma pantalla de Credenciales de produccion de tu aplicacion de MercadoPago, copia la Public Key y pegala aca."
    ]
  },
  {
    key: "MP_WEBHOOK_SECRET",
    label: "MercadoPago Webhook Secret",
    hint: "Clave secreta para validar la firma de las notificaciones webhook.",
    secret: true,
    guide: [
      "En tu aplicacion del panel de MercadoPago anda a Webhooks > Configurar notificaciones.",
      "Modo: Produccion. URL: https://versiculodiario-production.up.railway.app/billing/webhook",
      "Eventos: marca Suscripciones (subscription_preapproval y subscription_authorized_payment) y Pagos (payments).",
      "Al guardar, MercadoPago te muestra una Clave secreta para validar la firma. Copiala y pegala aca.",
      "Nota: el endpoint /billing/webhook lo activo en la fase de MercadoPago; podes cargar esto igual desde ya."
    ]
  },
  {
    key: "ADMIN_PLAN_PRICE_ARS",
    label: "Precio mensual del panel admin (ARS)",
    hint: "Solo el numero, sin puntos ni simbolo. Ej: 15000",
    secret: false,
    guide: [
      "Este lo decidis vos, no se saca de ningun panel.",
      "Referencia de la investigacion de mercado: la competencia regional cobra entre 10 y 25 USD por mes por iglesia; SARA (lider en la region) arranca en unos 22 USD.",
      "Escribi solo el numero en pesos argentinos, sin puntos ni simbolo. Ejemplo: 15000"
    ]
  },
  {
    key: "AUTH_DEV_MODE",
    label: "Modo dev de login (solo pruebas)",
    hint: "Poner 1 para aceptar logins de prueba sin Google. Nunca se honra en produccion.",
    secret: false,
    guide: [
      "Dejalo vacio. Es solo para entornos de desarrollo local: permite iniciar sesion con un usuario de prueba sin configurar Google.",
      "Aunque se cargue 1, el servidor lo ignora cuando NODE_ENV es production, asi que no puede abrir un agujero en la app real."
    ]
  }
];

const appSettingsCache = { values: new Map(), loadedAt: 0 };

async function getAppSetting(key) {
  if (Date.now() - appSettingsCache.loadedAt > 60000) {
    const { rows } = await pool.query(`SELECT key, value FROM app_settings`);
    appSettingsCache.values = new Map(rows.map((row) => [row.key, row.value]));
    appSettingsCache.loadedAt = Date.now();
  }
  const stored = appSettingsCache.values.get(key);
  if (stored != null && stored !== "") return stored;
  return process.env[key] || "";
}

function invalidateAppSettingsCache() {
  appSettingsCache.loadedAt = 0;
}

function hashSuperadminPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `${salt}:${hash}`;
}

function verifySuperadminPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expectedBuf = Buffer.from(expected, "hex");
  return actual.length === expectedBuf.length && crypto.timingSafeEqual(actual, expectedBuf);
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const superadminLoginAttempts = new Map();

function superadminLoginBlocked(ip) {
  const now = Date.now();
  const attempts = (superadminLoginAttempts.get(ip) || []).filter((ts) => now - ts < 15 * 60 * 1000);
  superadminLoginAttempts.set(ip, attempts);
  return attempts.length >= 5;
}

function registerSuperadminLoginFailure(ip) {
  const attempts = superadminLoginAttempts.get(ip) || [];
  attempts.push(Date.now());
  superadminLoginAttempts.set(ip, attempts);
}

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function requireSuperadmin(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "missing token" });
    const { rows } = await pool.query(
      `SELECT token_hash FROM superadmin_sessions WHERE token_hash = $1 AND expires_at > NOW()`,
      [sha256Hex(token)]
    );
    if (!rows.length) return res.status(401).json({ error: "invalid session" });
    req.superadminTokenHash = rows[0].token_hash;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "auth check failed" });
  }
}

app.post("/superadmin/login", async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (superadminLoginBlocked(ip)) {
    return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  }
  const email = String(req.body && req.body.email || "").trim().toLowerCase();
  const password = String(req.body && req.body.password || "");
  if (!email || !password) return res.status(400).json({ error: "Falta email o contrasena." });
  try {
    const { rows } = await pool.query(`SELECT email, password_hash FROM superadmin_account WHERE id = 1`);
    const account = rows[0];
    const emailOk = account && account.email.toLowerCase() === email;
    const passwordOk = account && verifySuperadminPassword(password, account.password_hash);
    if (!emailOk || !passwordOk) {
      registerSuperadminLoginFailure(ip);
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query(`DELETE FROM superadmin_sessions WHERE expires_at <= NOW()`);
    await pool.query(
      `INSERT INTO superadmin_sessions (token_hash, expires_at)
       VALUES ($1, NOW() + make_interval(days => $2))`,
      [sha256Hex(token), SUPERADMIN_SESSION_DAYS]
    );
    return res.json({ ok: true, token, email: account.email, expiresDays: SUPERADMIN_SESSION_DAYS });
  } catch (error) {
    return res.status(500).json({ error: "No pude iniciar sesion." });
  }
});

app.post("/superadmin/logout", requireSuperadmin, async (req, res) => {
  await pool.query(`DELETE FROM superadmin_sessions WHERE token_hash = $1`, [req.superadminTokenHash]);
  return res.json({ ok: true });
});

app.get("/superadmin/settings", requireSuperadmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT key, value, updated_at FROM app_settings`);
    const stored = new Map(rows.map((row) => [row.key, row]));
    const settings = APP_SETTING_DEFS.map((def) => {
      const dbRow = stored.get(def.key);
      const envValue = process.env[def.key] || "";
      const value = dbRow ? dbRow.value : envValue;
      const configured = Boolean(value);
      let preview = "";
      if (configured) {
        preview = def.secret
          ? `${"*".repeat(8)}${value.slice(-4)}`
          : value;
      }
      return {
        key: def.key,
        label: def.label,
        hint: def.hint,
        secret: def.secret,
        guide: def.guide || [],
        configured,
        source: dbRow ? "db" : (envValue ? "env" : ""),
        preview,
        updatedAt: dbRow ? dbRow.updated_at : null
      };
    });
    return res.json({ ok: true, settings });
  } catch (error) {
    return res.status(500).json({ error: "No pude leer la configuracion." });
  }
});

app.post("/superadmin/settings", requireSuperadmin, async (req, res) => {
  const key = String(req.body && req.body.key || "").trim();
  const value = String(req.body && req.body.value || "").trim();
  if (!APP_SETTING_DEFS.some((def) => def.key === key)) {
    return res.status(400).json({ error: "Clave de configuracion desconocida." });
  }
  try {
    if (!value) {
      await pool.query(`DELETE FROM app_settings WHERE key = $1`, [key]);
    } else {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    }
    invalidateAppSettingsCache();
    return res.json({ ok: true, key, configured: Boolean(value) });
  } catch (error) {
    return res.status(500).json({ error: "No pude guardar la configuracion." });
  }
});

app.post("/superadmin/change-password", requireSuperadmin, async (req, res) => {
  const currentPassword = String(req.body && req.body.currentPassword || "");
  const newPassword = String(req.body && req.body.newPassword || "");
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "La contrasena nueva debe tener al menos 8 caracteres." });
  }
  try {
    const { rows } = await pool.query(`SELECT password_hash FROM superadmin_account WHERE id = 1`);
    if (!rows.length || !verifySuperadminPassword(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: "La contrasena actual no coincide." });
    }
    await pool.query(
      `UPDATE superadmin_account SET password_hash = $1, updated_at = NOW() WHERE id = 1`,
      [hashSuperadminPassword(newPassword)]
    );
    await pool.query(`DELETE FROM superadmin_sessions WHERE token_hash <> $1`, [req.superadminTokenHash]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "No pude cambiar la contrasena." });
  }
});

const USER_SESSION_DAYS = 90;
const USER_SESSION_RENEW_DAYS = 30;

function base64UrlToBuffer(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

const googleJwksCache = { keys: [], expiresAt: 0 };

async function fetchGoogleJwks() {
  if (googleJwksCache.keys.length && Date.now() < googleJwksCache.expiresAt) {
    return googleJwksCache.keys;
  }
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw new Error("no pude obtener las claves de Google");
  const data = await response.json();
  const cacheControl = String(response.headers.get("cache-control") || "");
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  googleJwksCache.keys = Array.isArray(data.keys) ? data.keys : [];
  googleJwksCache.expiresAt = Date.now() + maxAgeMs;
  return googleJwksCache.keys;
}

async function isAuthDevModeEnabled() {
  if (NODE_ENV === "production") return false;
  if (IS_LOCAL_DEV) return true;
  return (await getAppSetting("AUTH_DEV_MODE")) === "1";
}

// Verifica un ID token de Google (RS256) sin dependencias externas.
// En modo dev acepta tokens "dev.<base64url(json)>" sin firma.
async function verifyGoogleIdToken(credential) {
  const raw = String(credential || "").trim();
  if (!raw) {
    const error = new Error("missing credential");
    error.status = 400;
    throw error;
  }
  if (raw.startsWith("dev.")) {
    if (!(await isAuthDevModeEnabled())) {
      const error = new Error("invalid credential");
      error.status = 401;
      throw error;
    }
    const payload = JSON.parse(base64UrlToBuffer(raw.slice(4)).toString("utf-8"));
    if (!payload.sub || !payload.email) {
      const error = new Error("invalid dev credential");
      error.status = 400;
      throw error;
    }
    return { ...payload, email_verified: true };
  }
  const clientId = await getAppSetting("GOOGLE_CLIENT_ID_WEB");
  if (!clientId) {
    const error = new Error("login con Google no configurado");
    error.status = 503;
    throw error;
  }
  const parts = raw.split(".");
  if (parts.length !== 3) {
    const error = new Error("invalid credential");
    error.status = 401;
    throw error;
  }
  const header = JSON.parse(base64UrlToBuffer(parts[0]).toString("utf-8"));
  const payload = JSON.parse(base64UrlToBuffer(parts[1]).toString("utf-8"));
  const keys = await fetchGoogleJwks();
  const jwk = keys.find((key) => key.kid === header.kid && key.alg === "RS256");
  if (!jwk) {
    googleJwksCache.expiresAt = 0;
    const error = new Error("invalid credential");
    error.status = 401;
    throw error;
  }
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signatureOk = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    base64UrlToBuffer(parts[2])
  );
  const nowSeconds = Math.floor(Date.now() / 1000);
  const issOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  const audOk = payload.aud === clientId;
  const expOk = Number(payload.exp) > nowSeconds;
  if (!signatureOk || !issOk || !audOk || !expOk || payload.email_verified !== true) {
    const error = new Error("invalid credential");
    error.status = 401;
    throw error;
  }
  return payload;
}

function serializeSessionUser(row) {
  const base = serializeCommunityUser(row);
  if (!base) return null;
  return {
    ...base,
    email: row.google_email || row.email || null,
    avatarUrl: row.avatar_url || null,
    hasCommunityProfile: Boolean(row.church || row.city)
  };
}

async function createUserSession(userId, deviceLabel) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(`DELETE FROM user_sessions WHERE expires_at <= NOW()`);
  await pool.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at, device_label)
     VALUES ($1, $2, NOW() + make_interval(days => $3), $4)`,
    [sha256Hex(token), userId, USER_SESSION_DAYS, deviceLabel || null]
  );
  return token;
}

async function getUserByBearer(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const { rows } = await pool.query(
    `SELECT u.*, s.expires_at AS session_expires_at
     FROM user_sessions s
     JOIN community_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  const user = rows[0];
  if (!user) return null;
  const renewCutoff = Date.now() + USER_SESSION_RENEW_DAYS * 24 * 60 * 60 * 1000;
  if (new Date(user.session_expires_at).getTime() < renewCutoff) {
    await pool.query(
      `UPDATE user_sessions
       SET expires_at = NOW() + make_interval(days => $2), last_used_at = NOW()
       WHERE token_hash = $1`,
      [tokenHash, USER_SESSION_DAYS]
    );
  } else {
    await pool.query(`UPDATE user_sessions SET last_used_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  }
  req.userTokenHash = tokenHash;
  return user;
}

async function requireUser(req, res, next) {
  try {
    const user = await getUserByBearer(req);
    if (!user) return res.status(401).json({ error: "sesion invalida" });
    if (user.status === "blocked") return res.status(403).json({ error: "cuenta bloqueada" });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "auth check failed" });
  }
}

// Identidad dual durante la transicion: Bearer nuevo o par legado key+secret.
async function resolveIdentity(req, client) {
  const bearerUser = await getUserByBearer(req);
  if (bearerUser) return bearerUser;
  const communityKey = normalizeCommunityText(
    (req.body && req.body.communityKey) || (req.query && req.query.communityKey)
  );
  if (!communityKey) {
    const error = new Error("missing credentials");
    error.status = 401;
    throw error;
  }
  return requireCommunityAuth(client, communityKey, getCommunitySecret(req));
}

app.get("/auth/config", async (req, res) => {
  try {
    const googleClientId = await getAppSetting("GOOGLE_CLIENT_ID_WEB");
    return res.json({ ok: true, googleClientId: googleClientId || "" });
  } catch {
    return res.json({ ok: true, googleClientId: "" });
  }
});

app.post("/auth/google", async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (superadminLoginBlocked(`auth:${ip}`)) {
    return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  }
  const client = await pool.connect();
  try {
    let payload;
    try {
      payload = await verifyGoogleIdToken(req.body && req.body.credential);
    } catch (error) {
      registerSuperadminLoginFailure(`auth:${ip}`);
      throw error;
    }
    const googleSub = String(payload.sub);
    const email = String(payload.email || "").toLowerCase();
    const fullName = normalizeCommunityText(payload.name) || email.split("@")[0];
    const avatarUrl = normalizeCommunityText(payload.picture);
    let user = null;
    const bySub = await client.query(
      `SELECT * FROM community_users WHERE google_sub = $1 LIMIT 1`,
      [googleSub]
    );
    user = bySub.rows[0] || null;
    if (!user && email) {
      const byEmail = await client.query(
        `SELECT * FROM community_users
         WHERE (google_email = $1 OR email = $1) AND google_sub IS NULL
         LIMIT 1`,
        [email]
      );
      user = byEmail.rows[0] || null;
    }
    if (!user) {
      const legacy = req.body && req.body.legacy;
      const legacyKey = normalizeCommunityText(legacy && legacy.communityKey);
      const legacySecret = normalizeCommunityText(legacy && legacy.communitySecret);
      if (legacyKey && legacySecret) {
        try {
          const legacyUser = await requireCommunityAuth(client, legacyKey, legacySecret);
          if (!legacyUser.google_sub) user = legacyUser;
        } catch {
          // par legado invalido: se ignora y se crea cuenta nueva
        }
      }
    }
    if (user) {
      const { rows } = await client.query(
        `UPDATE community_users
         SET google_sub = $2,
             google_email = $3,
             avatar_url = $4,
             google_linked_at = COALESCE(google_linked_at, NOW()),
             full_name = COALESCE(NULLIF(full_name, ''), $5),
             status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [user.id, googleSub, email || null, avatarUrl, fullName]
      );
      user = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO community_users
           (google_sub, google_email, avatar_url, google_linked_at, full_name, role, status, last_seen_at, updated_at)
         VALUES ($1, $2, $3, NOW(), $4, 'feligres', 'active', NOW(), NOW())
         RETURNING *`,
        [googleSub, email || null, avatarUrl, fullName]
      );
      user = rows[0];
    }
    const token = await createUserSession(user.id, normalizeCommunityText(req.body && req.body.deviceLabel));
    return res.json({ ok: true, token, user: serializeSessionUser(user) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "no pude iniciar sesion" });
  } finally {
    client.release();
  }
});

app.get("/auth/me", requireUser, (req, res) => {
  return res.json({ ok: true, user: serializeSessionUser(req.user) });
});

app.post("/auth/logout", requireUser, async (req, res) => {
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [req.userTokenHash]);
  return res.json({ ok: true });
});

const SPACE_MAX_ROWS_PER_TYPE = 2000;
const SPACE_MAX_SYNC_ITEMS = 500;
const SPACE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function isValidSpaceKey(key, prefixes) {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 200) return false;
  if (/[\n\r\t]/.test(trimmed)) return false;
  return prefixes.some((prefix) => trimmed.startsWith(prefix));
}

function normalizeUpdatedAtMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.min(Math.floor(ms), Date.now() + SPACE_CLOCK_SKEW_MS);
}

app.get("/me/space", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [highlights, studies, bookmarks, prefs] = await Promise.all([
      pool.query(
        `SELECT passage_key, highlights, updated_at_ms FROM user_highlights WHERE user_id = $1 LIMIT ${SPACE_MAX_ROWS_PER_TYPE}`,
        [userId]
      ),
      pool.query(
        `SELECT passage_key, data, updated_at_ms FROM user_studies WHERE user_id = $1 LIMIT ${SPACE_MAX_ROWS_PER_TYPE}`,
        [userId]
      ),
      pool.query(
        `SELECT bookmark_id, data, updated_at_ms FROM user_bookmarks WHERE user_id = $1 LIMIT ${SPACE_MAX_ROWS_PER_TYPE}`,
        [userId]
      ),
      pool.query(`SELECT last_query, daily_themes, updated_at_ms FROM user_prefs WHERE user_id = $1`, [userId])
    ]);
    return res.json({
      ok: true,
      serverTimeMs: Date.now(),
      highlights: highlights.rows.map((row) => ({
        key: row.passage_key,
        data: row.highlights,
        updatedAtMs: Number(row.updated_at_ms)
      })),
      studies: studies.rows.map((row) => ({
        key: row.passage_key,
        data: row.data,
        updatedAtMs: Number(row.updated_at_ms)
      })),
      bookmarks: bookmarks.rows.map((row) => ({
        key: row.bookmark_id,
        data: row.data,
        updatedAtMs: Number(row.updated_at_ms)
      })),
      prefs: prefs.rows[0]
        ? {
          lastQuery: prefs.rows[0].last_query,
          dailyThemes: prefs.rows[0].daily_themes,
          updatedAtMs: Number(prefs.rows[0].updated_at_ms)
        }
        : null
    });
  } catch (error) {
    return res.status(500).json({ error: "no pude leer tu espacio" });
  }
});

app.post("/me/space/sync", requireUser, async (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) return res.json({ ok: true, applied: 0, rejected: [] });
  if (items.length > SPACE_MAX_SYNC_ITEMS) {
    return res.status(400).json({ error: `maximo ${SPACE_MAX_SYNC_ITEMS} items por request` });
  }
  const userId = req.user.id;
  const rejected = [];
  let applied = 0;
  const client = await pool.connect();
  try {
    for (const item of items) {
      const type = item && item.type;
      const key = item && typeof item.key === "string" ? item.key.trim() : "";
      const updatedAtMs = normalizeUpdatedAtMs(item && item.updatedAtMs);
      const deleted = Boolean(item && item.deleted);
      try {
        if (type === "highlight" || type === "study") {
          if (!isValidSpaceKey(key, ["verse:", "chapter:"])) throw new Error("clave invalida");
          const table = type === "highlight" ? "user_highlights" : "user_studies";
          const column = type === "highlight" ? "highlights" : "data";
          if (deleted) {
            await client.query(
              `DELETE FROM ${table} WHERE user_id = $1 AND passage_key = $2 AND updated_at_ms <= $3`,
              [userId, key, updatedAtMs]
            );
          } else {
            const payload = JSON.stringify(item.data ?? (type === "highlight" ? [] : {}));
            await client.query(
              `INSERT INTO ${table} (user_id, passage_key, ${column}, updated_at_ms, updated_at)
               VALUES ($1, $2, $3::jsonb, $4, NOW())
               ON CONFLICT (user_id, passage_key) DO UPDATE
               SET ${column} = EXCLUDED.${column}, updated_at_ms = EXCLUDED.updated_at_ms, updated_at = NOW()
               WHERE ${table}.updated_at_ms < EXCLUDED.updated_at_ms`,
              [userId, key, payload, updatedAtMs]
            );
          }
        } else if (type === "bookmark") {
          if (!isValidSpaceKey(key, [""])) throw new Error("clave invalida");
          if (deleted) {
            await client.query(
              `DELETE FROM user_bookmarks WHERE user_id = $1 AND bookmark_id = $2 AND updated_at_ms <= $3`,
              [userId, key, updatedAtMs]
            );
          } else {
            await client.query(
              `INSERT INTO user_bookmarks (user_id, bookmark_id, data, updated_at_ms, updated_at)
               VALUES ($1, $2, $3::jsonb, $4, NOW())
               ON CONFLICT (user_id, bookmark_id) DO UPDATE
               SET data = EXCLUDED.data, updated_at_ms = EXCLUDED.updated_at_ms, updated_at = NOW()
               WHERE user_bookmarks.updated_at_ms < EXCLUDED.updated_at_ms`,
              [userId, key, JSON.stringify(item.data ?? {}), updatedAtMs]
            );
          }
        } else if (type === "prefs") {
          const data = item.data || {};
          await client.query(
            `INSERT INTO user_prefs (user_id, last_query, daily_themes, updated_at_ms, updated_at)
             VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())
             ON CONFLICT (user_id) DO UPDATE
             SET last_query = EXCLUDED.last_query, daily_themes = EXCLUDED.daily_themes,
                 updated_at_ms = EXCLUDED.updated_at_ms, updated_at = NOW()
             WHERE user_prefs.updated_at_ms < EXCLUDED.updated_at_ms`,
            [
              userId,
              data.lastQuery != null ? JSON.stringify(data.lastQuery) : null,
              JSON.stringify(Array.isArray(data.dailyThemes) ? data.dailyThemes : []),
              updatedAtMs
            ]
          );
        } else {
          throw new Error("tipo desconocido");
        }
        applied += 1;
      } catch (itemError) {
        rejected.push({ type, key, reason: itemError.message });
      }
    }
    return res.json({ ok: true, applied, rejected });
  } catch (error) {
    return res.status(500).json({ error: "no pude sincronizar" });
  } finally {
    client.release();
  }
});

const DEVOTIONAL_TEXT_MAX = 8000;

function normalizeDevotionalDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
}

function normalizeDevotionalText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, DEVOTIONAL_TEXT_MAX);
}

function serializeDevotional(row) {
  return {
    date: row.devotional_date instanceof Date
      ? row.devotional_date.toISOString().slice(0, 10)
      : String(row.devotional_date),
    passageReference: row.passage_reference,
    passageKey: row.passage_key,
    title: row.title,
    observation: row.observation,
    application: row.application,
    prayer: row.prayer,
    updatedAtMs: Number(row.updated_at_ms)
  };
}

// Racha: dias consecutivos con devocional, terminando hoy o ayer.
function computeDevotionalStreak(dates, todayIso) {
  const set = new Set(dates);
  const total = set.size;
  let best = 0;
  let current = 0;
  const sorted = [...set].sort();
  let run = 0;
  let prev = null;
  for (const iso of sorted) {
    const time = Date.parse(`${iso}T00:00:00Z`);
    run = prev != null && time - prev === 86400000 ? run + 1 : 1;
    prev = time;
    if (run > best) best = run;
  }
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  let cursor = set.has(todayIso) ? today : today - 86400000;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
    current += 1;
    cursor -= 86400000;
  }
  return { current, best, totalDays: total };
}

app.get("/me/devotionals", requireUser, async (req, res) => {
  const month = String(req.query.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "mes invalido, formato AAAA-MM" });
  }
  try {
    const [monthRows, allDates] = await Promise.all([
      pool.query(
        `SELECT * FROM devotionals
         WHERE user_id = $1 AND to_char(devotional_date, 'YYYY-MM') = $2
         ORDER BY devotional_date ASC`,
        [req.user.id, month]
      ),
      pool.query(
        `SELECT to_char(devotional_date, 'YYYY-MM-DD') AS date
         FROM devotionals WHERE user_id = $1`,
        [req.user.id]
      )
    ]);
    const todayIso = String(req.query.today || "").match(/^\d{4}-\d{2}-\d{2}$/)
      ? req.query.today
      : new Date().toISOString().slice(0, 10);
    return res.json({
      ok: true,
      devotionals: monthRows.rows.map(serializeDevotional),
      streak: computeDevotionalStreak(allDates.rows.map((row) => row.date), todayIso)
    });
  } catch (error) {
    return res.status(500).json({ error: "no pude leer tus devocionales" });
  }
});

app.get("/me/devotionals/:date", requireUser, async (req, res) => {
  const date = normalizeDevotionalDate(req.params.date);
  if (!date) return res.status(400).json({ error: "fecha invalida" });
  const { rows } = await pool.query(
    `SELECT * FROM devotionals WHERE user_id = $1 AND devotional_date = $2 LIMIT 1`,
    [req.user.id, date]
  );
  return res.json({ ok: true, devotional: rows[0] ? serializeDevotional(rows[0]) : null });
});

app.post("/me/devotionals/:date", requireUser, async (req, res) => {
  const date = normalizeDevotionalDate(req.params.date);
  if (!date) return res.status(400).json({ error: "fecha invalida" });
  const body = req.body || {};
  const updatedAtMs = normalizeUpdatedAtMs(body.updatedAtMs) || Date.now();
  try {
    const { rows } = await pool.query(
      `INSERT INTO devotionals
         (user_id, devotional_date, passage_reference, passage_key, title, observation, application, prayer, updated_at_ms, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id, devotional_date) DO UPDATE
       SET passage_reference = EXCLUDED.passage_reference,
           passage_key = EXCLUDED.passage_key,
           title = EXCLUDED.title,
           observation = EXCLUDED.observation,
           application = EXCLUDED.application,
           prayer = EXCLUDED.prayer,
           updated_at_ms = EXCLUDED.updated_at_ms,
           updated_at = NOW()
       WHERE devotionals.updated_at_ms <= EXCLUDED.updated_at_ms
       RETURNING *`,
      [
        req.user.id,
        date,
        normalizeDevotionalText(body.passageReference),
        normalizeDevotionalText(body.passageKey),
        normalizeDevotionalText(body.title),
        normalizeDevotionalText(body.observation),
        normalizeDevotionalText(body.application),
        normalizeDevotionalText(body.prayer),
        updatedAtMs
      ]
    );
    if (!rows.length) {
      const { rows: current } = await pool.query(
        `SELECT * FROM devotionals WHERE user_id = $1 AND devotional_date = $2 LIMIT 1`,
        [req.user.id, date]
      );
      return res.json({ ok: true, devotional: current[0] ? serializeDevotional(current[0]) : null, stale: true });
    }
    return res.json({ ok: true, devotional: serializeDevotional(rows[0]) });
  } catch (error) {
    return res.status(500).json({ error: "no pude guardar el devocional" });
  }
});

app.post("/me/devotionals/:date/delete", requireUser, async (req, res) => {
  const date = normalizeDevotionalDate(req.params.date);
  if (!date) return res.status(400).json({ error: "fecha invalida" });
  await pool.query(`DELETE FROM devotionals WHERE user_id = $1 AND devotional_date = $2`, [req.user.id, date]);
  return res.json({ ok: true });
});

app.get("/community/role-requests", async (req, res) => {
  const communityKey = normalizeCommunityText(req.query.communityKey);
  const adminCode = normalizeCommunityText(req.query.adminCode);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    const canListByRole = user.role === "dirigente";
    const canListByCode = Boolean(COMMUNITY_ADMIN_CODE && adminCode === COMMUNITY_ADMIN_CODE);
    if (!canListByRole && !canListByCode) {
      return res.status(403).json({ error: "approval not allowed" });
    }
    const requests = await listPendingRoleRequests(client);
    return res.json({ ok: true, requests });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to list requests" });
  } finally {
    client.release();
  }
});

app.post("/community/profile", async (req, res) => {
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  const communitySecret = getCommunitySecret(req);
  const fullName = normalizeCommunityText(req.body && req.body.fullName);
  const displayName = normalizeCommunityText(req.body && req.body.displayName);
  const city = normalizeCommunityText(req.body && req.body.city);
  const church = normalizeCommunityText(req.body && req.body.church);
  const status = normalizeCommunityStatus(req.body && req.body.status);
  const address = normalizeCommunityText(req.body && req.body.address) || null;
  const latitude = req.body && req.body.latitude != null ? normalizeCoordinate(req.body.latitude, null) : null;
  const longitude = req.body && req.body.longitude != null ? normalizeCoordinate(req.body.longitude, null) : null;
  // Sesion nueva (Bearer): se actualiza la fila del usuario logueado y de
  // paso se le vincula la clave local del dispositivo para los endpoints
  // legados, si todavia no tiene una.
  const bearerUser = await getUserByBearer(req).catch(() => null);
  if (bearerUser) {
    try {
      if (communityKey && !bearerUser.community_key) {
        await pool.query(
          `UPDATE community_users SET community_key = $2, community_secret = COALESCE(community_secret, $3)
           WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM community_users WHERE community_key = $2)`,
          [bearerUser.id, communityKey, communitySecret]
        );
      }
      const { rows } = await pool.query(
        `UPDATE community_users
         SET full_name = COALESCE($2, full_name),
             display_name = COALESCE($3, display_name),
             city = $4,
             church = $5,
             address = $6,
             latitude = $7,
             longitude = $8,
             status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [bearerUser.id, fullName, displayName, city, church, address, latitude, longitude]
      );
      return res.json({ ok: true, profile: serializeSessionUser(rows[0]) });
    } catch (error) {
      return res.status(500).json({ error: "failed to save profile" });
    }
  }
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!communitySecret) return res.status(401).json({ error: "missing communitySecret" });
  if (!fullName) return res.status(400).json({ error: "missing fullName" });
  const client = await pool.connect();
  try {
    const existing = await getCommunityUserByKey(client, communityKey);
    let rows;
    if (existing) {
      if (existing.community_secret && existing.community_secret !== communitySecret) {
        return res.status(401).json({ error: "invalid credentials" });
      }
      ({ rows } = await client.query(
        `UPDATE community_users
         SET full_name = $2,
             display_name = $3,
             city = $4,
             church = $5,
             status = $6,
             address = $7,
             latitude = $8,
             longitude = $9,
             community_secret = COALESCE(community_secret, $10),
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE community_key = $1
         RETURNING *`,
        [communityKey, fullName, displayName, city, church, status, address, latitude, longitude, communitySecret]
      ));
    } else {
      ({ rows } = await client.query(
        `INSERT INTO community_users
           (community_key, community_secret, full_name, display_name, city, church, role, status, address, latitude, longitude, last_seen_at, updated_at)
         VALUES
           ($1, $10, $2, $3, $4, $5, 'feligres', $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [communityKey, fullName, displayName, city, church, status, address, latitude, longitude, communitySecret]
      ));
    }
    return res.json({ ok: true, profile: serializeCommunityUser(rows[0]) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to save profile" });
  } finally {
    client.release();
  }
});

app.get("/community/members-map", async (req, res) => {
  const communityKey = normalizeCommunityText(req.query.communityKey);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  const client = await pool.connect();
  try {
    const requester = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    requireDirigenteRole(requester);
    const church = requester.church;
    if (!church) return res.json({ ok: true, members: [] });
    const { rows } = await client.query(
      `SELECT id, community_key, full_name, display_name, city, church, role,
              address, latitude, longitude, status
       FROM community_users
       WHERE status = 'active' AND church = $1
       ORDER BY full_name`,
      [church]
    );
    return res.json({ ok: true, members: rows.map(serializeCommunityMember) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed" });
  } finally {
    client.release();
  }
});

app.post("/community/role-request", async (req, res) => {
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  const requestedRole = normalizeCommunityRole(req.body && req.body.requestedRole);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (requestedRole === "feligres") return res.status(400).json({ error: "requestedRole must be elevated" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    const { rows } = await client.query(
      `UPDATE community_users
       SET requested_role = $2,
           requested_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id, requestedRole]
    );
    return res.json({ ok: true, profile: serializeCommunityUser(rows[0]) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to request role" });
  } finally {
    client.release();
  }
});

app.post("/community/approve-role", async (req, res) => {
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  const targetCommunityKey = normalizeCommunityText(req.body && req.body.targetCommunityKey) || communityKey;
  const adminCode = normalizeCommunityText(req.body && req.body.adminCode);
  const approvedRole = normalizeCommunityRole(req.body && req.body.approvedRole);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!["colaborador", "dirigente"].includes(approvedRole)) return res.status(400).json({ error: "invalid approvedRole" });
  const client = await pool.connect();
  try {
    const actor = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    const canApproveByRole = actor.role === "dirigente";
    const canApproveByCode = COMMUNITY_ADMIN_CODE && adminCode === COMMUNITY_ADMIN_CODE;
    if (!canApproveByRole && !canApproveByCode) {
      return res.status(403).json({ error: "approval not allowed" });
    }
    const user = await getCommunityUserByKey(client, targetCommunityKey);
    if (!user) return res.status(404).json({ error: "target user not found" });
    if (canApproveByRole && !canApproveByCode && actor.church && user.church !== actor.church) {
      return res.status(403).json({ error: "no podes aprobar usuarios de otra iglesia" });
    }
    const { rows } = await client.query(
      `UPDATE community_users
       SET role = $2,
           requested_role = NULL,
           requested_at = NULL,
           approved_by_user_id = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id, approvedRole, actor.id]
    );
    return res.json({ ok: true, profile: serializeCommunityMember(rows[0]) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to approve role" });
  } finally {
    client.release();
  }
});

app.post("/community/locations", async (req, res) => {
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  const name = normalizeCommunityText(req.body && req.body.name);
  const address = normalizeCommunityText(req.body && req.body.address);
  const city = normalizeCommunityText(req.body && req.body.city);
  const church = normalizeCommunityText(req.body && req.body.church);
  const description = normalizeCommunityText(req.body && req.body.description);
  const latitude = normalizeCoordinate(req.body && req.body.latitude, -42.7692);
  const longitude = normalizeCoordinate(req.body && req.body.longitude, -65.0385);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!name) return res.status(400).json({ error: "missing name" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    requireLeaderRole(user);
    const slugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${slugBase || "sede"}-${Date.now().toString(36)}`;
    const { rows } = await client.query(
      `INSERT INTO community_locations
         (slug, name, description, address, city, church, latitude, longitude, created_by_user_id, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, slug, name, description, address, city, church, latitude, longitude, is_active`,
      [slug, name, description, address, city, church, latitude, longitude, user.id]
    );
    return res.json({
      ok: true,
      location: {
        id: rows[0].id,
        slug: rows[0].slug,
        name: rows[0].name,
        description: rows[0].description,
        address: rows[0].address,
        city: rows[0].city,
        church: rows[0].church,
        latitude: rows[0].latitude,
        longitude: rows[0].longitude,
        isActive: rows[0].is_active
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to create location" });
  } finally {
    client.release();
  }
});

app.post("/community/events", async (req, res) => {
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  const locationId = Number(req.body && req.body.locationId);
  const title = normalizeCommunityText(req.body && req.body.title);
  const description = normalizeCommunityText(req.body && req.body.description);
  const startsAt = normalizeCommunityText(req.body && req.body.startsAt);
  const endsAt = normalizeCommunityText(req.body && req.body.endsAt);
  const timezone = normalizeCommunityText(req.body && req.body.timezone) || "UTC";
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!Number.isInteger(locationId) || locationId <= 0) return res.status(400).json({ error: "invalid locationId" });
  if (!title) return res.status(400).json({ error: "missing title" });
  if (!startsAt) return res.status(400).json({ error: "missing startsAt" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    requireLeaderRole(user);
    const { rows } = await client.query(
      `INSERT INTO community_events
         (location_id, created_by_user_id, title, description, starts_at, ends_at, timezone, status, allow_check_in, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, 'scheduled', TRUE, NOW())
       RETURNING id`,
      [locationId, user.id, title, description, startsAt, endsAt, timezone]
    );
    return res.json({ ok: true, eventId: rows[0].id });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to create event" });
  } finally {
    client.release();
  }
});

app.post("/community/events/:eventId/check-in", async (req, res) => {
  const eventId = Number(req.params.eventId);
  const communityKey = normalizeCommunityText(req.body && req.body.communityKey);
  if (!Number.isInteger(eventId) || eventId <= 0) return res.status(400).json({ error: "invalid eventId" });
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    const { rows: eventRows } = await client.query(
      `SELECT id, allow_check_in, status
       FROM community_events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );
    const event = eventRows[0];
    if (!event) return res.status(404).json({ error: "event not found" });
    if (!event.allow_check_in || !["scheduled", "live"].includes(event.status)) {
      return res.status(400).json({ error: "check-in not allowed" });
    }
    await client.query(
      `INSERT INTO community_event_attendance
         (event_id, user_id, role_at_check_in, check_in_method, status, checked_in_at, updated_at)
       VALUES
         ($1, $2, $3, 'manual', 'checked_in', NOW(), NOW())
       ON CONFLICT (event_id, user_id) DO UPDATE SET
         role_at_check_in = EXCLUDED.role_at_check_in,
         status = 'checked_in',
         checked_in_at = NOW(),
         checked_out_at = NULL,
         updated_at = NOW()`,
      [eventId, user.id, user.role]
    );
    const attendance = await getEventAttendanceForUser(client, eventId, user.id);
    return res.json({
      ok: true,
      attendance: {
        eventId,
        userId: user.id,
        status: attendance.status,
        roleAtCheckIn: attendance.role_at_check_in,
        checkedInAt: attendance.checked_in_at
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to check in" });
  } finally {
    client.release();
  }
});

app.get("/community/study-cells", async (req, res) => {
  const { communityKey, church } = req.query;
  const client = await pool.connect();
  try {
    let rows;
    if (church) {
      const result = await client.query(
        `SELECT sc.id, sc.name, sc.description, sc.meeting_day AS "meetingDay", sc.meeting_time AS "meetingTime",
                sc.location_id AS "locationId", sc.leader_name AS leader, sc.church, sc.city, sc.is_active AS "isActive"
         FROM community_study_cells sc
         WHERE sc.church = $1 AND sc.is_active = TRUE
         ORDER BY sc.name ASC`,
        [church]
      );
      rows = result.rows;
    } else {
      const result = await client.query(
        `SELECT sc.id, sc.name, sc.description, sc.meeting_day AS "meetingDay", sc.meeting_time AS "meetingTime",
                sc.location_id AS "locationId", sc.leader_name AS leader, sc.church, sc.city, sc.is_active AS "isActive"
         FROM community_study_cells sc
         WHERE sc.is_active = TRUE
         ORDER BY sc.name ASC
         LIMIT 50`
      );
      rows = result.rows;
    }
    return res.json({ cells: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message || "failed to load study cells" });
  } finally {
    client.release();
  }
});

app.post("/community/study-cells", async (req, res) => {
  const { communityKey, name, meetingDay, meetingTime, locationId, church, city } = req.body || {};
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!name || !name.trim()) return res.status(400).json({ error: "missing cell name" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    if (user.role !== "dirigente") return res.status(403).json({ error: "solo los dirigentes pueden crear celulas" });
    const result = await client.query(
      `INSERT INTO community_study_cells (name, meeting_day, meeting_time, location_id, created_by_user_id, church, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, meeting_day AS "meetingDay", meeting_time AS "meetingTime", location_id AS "locationId", church, city`,
      [
        name.trim(),
        meetingDay || null,
        meetingTime || null,
        locationId || null,
        user.id,
        church || null,
        city || null
      ]
    );
    return res.json({ cell: result.rows[0] });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to create study cell" });
  } finally {
    client.release();
  }
});

app.post("/community/study-materials", async (req, res) => {
  const { communityKey, cellId, eventId, title, body, bibleReference, source } = req.body || {};
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!title || !title.trim()) return res.status(400).json({ error: "missing material title" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityAuth(client, communityKey, getCommunitySecret(req));
    if (!["dirigente", "colaborador"].includes(user.role)) {
      return res.status(403).json({ error: "se requiere rol colaborador o dirigente" });
    }
    const result = await client.query(
      `INSERT INTO community_study_materials (cell_id, event_id, title, body, bible_reference, source, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cell_id AS "cellId", event_id AS "eventId", title, body, bible_reference AS "bibleReference", source`,
      [
        cellId || null,
        eventId || null,
        title.trim(),
        body || null,
        bibleReference || null,
        source || "leader",
        user.id
      ]
    );
    return res.json({ material: result.rows[0] });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "failed to create study material" });
  } finally {
    client.release();
  }
});

app.post("/subscribe", async (req, res) => {
  const { subscription, userSeed, themes, timeZone, city, church } = req.body || {};
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "invalid subscription" });
  }
  if (!userSeed) {
    return res.status(400).json({ error: "missing userSeed" });
  }
  const normalizedThemes = normalizeThemes(themes);
  const tz = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
  const normalizedCity = typeof city === "string" && city.trim() ? city.trim() : null;
  const normalizedChurch = typeof church === "string" && church.trim() ? church.trim() : null;
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_seed, themes, timezone, city, church, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_seed = EXCLUDED.user_seed,
         themes = EXCLUDED.themes,
         timezone = EXCLUDED.timezone,
         city = EXCLUDED.city,
         church = EXCLUDED.church,
         updated_at = NOW()`,
      [
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        String(userSeed),
        JSON.stringify(normalizedThemes),
        tz,
        normalizedCity,
        normalizedChurch
      ]
    );
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

app.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "missing endpoint" });
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

app.post("/send-daily", async (req, res) => {
  if (CRON_SECRET && req.headers["x-cron-secret"] !== CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const now = new Date();
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM push_subscriptions");
    const results = [];
    for (const row of rows) {
      const tz = row.timezone || "UTC";
      const parts = getLocalParts(now, tz);
      const localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      if (row.last_sent_date === localDate) {
        continue;
      }
      if (parts.hour !== 9) continue;
      if (parts.minute >= CRON_WINDOW_MINUTES) continue;
      const reference = getDailyReference(row.user_seed, row.themes || [], tz);
      const verseText = await fetchVerseText(reference, DAILY_VERSION);
      if (!verseText) continue;
      const title = "Versículo del día";
      const body = `${verseText} — ${reference} (${DAILY_VERSION})`;
      const payload = JSON.stringify({
        title,
        body,
        url: APP_URL
      });
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          payload
        );
        await client.query(
          "UPDATE push_subscriptions SET last_sent_date = $1, last_sent_at = NOW() WHERE id = $2",
          [localDate, row.id]
        );
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const status = err.statusCode || err.status || 0;
        if (status === 404 || status === 410) {
          await client.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]);
        }
        results.push({ id: row.id, ok: false });
      }
    }
    return res.json({ ok: true, count: results.length });
  } finally {
    client.release();
  }
});

app.post("/send-test", async (req, res) => {
  if (CRON_SECRET && req.headers["x-cron-secret"] !== CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const endpoint = req.body && req.body.endpoint ? String(req.body.endpoint) : "";
  const client = await pool.connect();
  try {
    const { rows } = endpoint
      ? await client.query("SELECT * FROM push_subscriptions WHERE endpoint = $1", [endpoint])
      : await client.query("SELECT * FROM push_subscriptions");
    if (!rows.length) return res.json({ ok: true, count: 0 });
    const results = [];
    const title = "Aviso";
    const body = "Este Domingo Tenemos un encuentro con Dios en HDR";
    for (const row of rows) {
      const payload = JSON.stringify({
        title,
        body,
        url: APP_URL
      });
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          payload
        );
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const status = err.statusCode || err.status || 0;
        if (status === 404 || status === 410) {
          await client.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]);
        }
        results.push({
          id: row.id,
          ok: false,
          status,
          message: err && err.message ? err.message : String(err)
        });
      }
    }
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    return res.json({ ok: true, count: results.length, okCount, failCount, results });
  } finally {
    client.release();
  }
});

app.post("/send-segment", async (req, res) => {
  if (CRON_SECRET && req.headers["x-cron-secret"] !== CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const city = req.body && typeof req.body.city === "string" ? req.body.city.trim() : "";
  const church = req.body && typeof req.body.church === "string" ? req.body.church.trim() : "";
  const title = req.body && typeof req.body.title === "string" && req.body.title.trim()
    ? req.body.title.trim()
    : "Aviso";
  const body = req.body && typeof req.body.body === "string" && req.body.body.trim()
    ? req.body.body.trim()
    : "Mensaje";
  const client = await pool.connect();
  try {
    const clauses = [];
    const params = [];
    if (city) {
      params.push(city.toLowerCase());
      clauses.push(`LOWER(city) = $${params.length}`);
    }
    if (church) {
      params.push(church.toLowerCase());
      clauses.push(`LOWER(church) = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const query = `SELECT * FROM push_subscriptions ${where}`;
    const { rows } = await client.query(query, params);
    if (!rows.length) return res.json({ ok: true, count: 0, okCount: 0, failCount: 0, results: [] });
    const results = [];
    for (const row of rows) {
      const payload = JSON.stringify({
        title,
        body,
        url: APP_URL
      });
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          payload
        );
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const status = err.statusCode || err.status || 0;
        if (status === 404 || status === 410) {
          await client.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]);
        }
        results.push({
          id: row.id,
          ok: false,
          status,
          message: err && err.message ? err.message : String(err)
        });
      }
    }
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    return res.json({ ok: true, count: results.length, okCount, failCount, results });
  } finally {
    client.release();
  }
});

app.get("/proxy", async (req, res) => {
  const target = req.query && req.query.url ? String(req.query.url) : "";
  if (!target) return res.status(400).send("Missing url parameter");
  try {
    const response = await fetch(target, {
      headers: { "User-Agent": "ReadBible-Proxy/1.0" }
    });
    const contentType = response.headers.get("content-type") || "text/html";
    const body = await response.text();
    res.setHeader("Content-Type", contentType);
    return res.status(response.status).send(body);
  } catch (err) {
    return res.status(502).send(`Proxy error: ${err && err.message ? err.message : String(err)}`);
  }
});

app.get("/subscriptions/count", async (req, res) => {
  if (CRON_SECRET && req.headers["x-cron-secret"] !== CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM push_subscriptions");
    return res.json({ ok: true, count: rows[0].count });
  } finally {
    client.release();
  }
});

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

loadDailyVerses()
  .then(() => ensureSchema())
  .then(() => ensureCommunitySeedData())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Push server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init schema", err);
    process.exit(1);
  });
