import express from "express";
import { Pool } from "pg";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
const APP_URL = process.env.APP_URL || "https://jesus1942.github.io/readBible/";
const DAILY_VERSION = process.env.DAILY_VERSION || "RVR1960";
const CRON_WINDOW_MINUTES = Number(process.env.CRON_WINDOW_MINUTES || 15);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
      "http://127.0.0.1:8000"
    ];
  if (origin && allowlist.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Cron-Secret");
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
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS requested_role TEXT;`);
  await pool.query(`ALTER TABLE community_users ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;`);
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
    status: row.status
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

app.get("/community/role-requests", async (req, res) => {
  const communityKey = normalizeCommunityText(req.query.communityKey);
  const adminCode = normalizeCommunityText(req.query.adminCode);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  const client = await pool.connect();
  try {
    const user = await requireCommunityUser(client, communityKey);
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
  const fullName = normalizeCommunityText(req.body && req.body.fullName);
  const displayName = normalizeCommunityText(req.body && req.body.displayName);
  const city = normalizeCommunityText(req.body && req.body.city);
  const church = normalizeCommunityText(req.body && req.body.church);
  const status = normalizeCommunityStatus(req.body && req.body.status);
  if (!communityKey) return res.status(400).json({ error: "missing communityKey" });
  if (!fullName) return res.status(400).json({ error: "missing fullName" });
  const client = await pool.connect();
  try {
    const existing = await getCommunityUserByKey(client, communityKey);
    let rows;
    if (existing) {
      ({ rows } = await client.query(
        `UPDATE community_users
         SET full_name = $2,
             display_name = $3,
             city = $4,
             church = $5,
             status = $6,
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE community_key = $1
         RETURNING *`,
        [communityKey, fullName, displayName, city, church, status]
      ));
    } else {
      ({ rows } = await client.query(
        `INSERT INTO community_users
           (community_key, full_name, display_name, city, church, role, status, last_seen_at, updated_at)
         VALUES
           ($1, $2, $3, $4, $5, 'feligres', $6, NOW(), NOW())
         RETURNING *`,
        [communityKey, fullName, displayName, city, church, status]
      ));
    }
    return res.json({ ok: true, profile: serializeCommunityUser(rows[0]) });
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
    const user = await requireCommunityUser(client, communityKey);
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
    const actor = await requireCommunityUser(client, communityKey);
    const canApproveByRole = actor.role === "dirigente";
    const canApproveByCode = COMMUNITY_ADMIN_CODE && adminCode === COMMUNITY_ADMIN_CODE;
    if (!canApproveByRole && !canApproveByCode) {
      return res.status(403).json({ error: "approval not allowed" });
    }
    const user = await getCommunityUserByKey(client, targetCommunityKey);
    if (!user) return res.status(404).json({ error: "target user not found" });
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
    return res.json({ ok: true, profile: serializeCommunityUser(rows[0]) });
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
    const user = await requireCommunityUser(client, communityKey);
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
    const user = await requireCommunityUser(client, communityKey);
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
    const user = await requireCommunityUser(client, communityKey);
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
