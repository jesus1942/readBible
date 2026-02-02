import express from "express";
import { Pool } from "pg";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CRON_SECRET = process.env.CRON_SECRET || "";
const APP_URL = process.env.APP_URL || "https://jesus1942.github.io/readBible/";
const DAILY_VERSION = process.env.DAILY_VERSION || "RVR1960";
const CRON_WINDOW_MINUTES = Number(process.env.CRON_WINDOW_MINUTES || 15);

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required");
}

webpush.setVapidDetails("mailto:admin@readbible.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(express.json({ limit: "1mb" }));

const dailyVersesPath = path.join(__dirname, "..", "daily_verses.json");
const dailyVerses = JSON.parse(fs.readFileSync(dailyVersesPath, "utf-8"));

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

app.get("/vapid-public-key", (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

app.post("/subscribe", async (req, res) => {
  const { subscription, userSeed, themes, timeZone } = req.body || {};
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "invalid subscription" });
  }
  if (!userSeed) {
    return res.status(400).json({ error: "missing userSeed" });
  }
  const normalizedThemes = normalizeThemes(themes);
  const tz = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_seed, themes, timezone, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_seed = EXCLUDED.user_seed,
         themes = EXCLUDED.themes,
         timezone = EXCLUDED.timezone,
         updated_at = NOW()`,
      [
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        String(userSeed),
        JSON.stringify(normalizedThemes),
        tz
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

app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Push server running on ${PORT}`);
});
