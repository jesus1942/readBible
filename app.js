const versions = [
  "RVR1960", "NVI", "LBLA", "NRSV", "DHH", "TLA",
  "NBD", "BLPH", "JBS", "PDT", "NTV", "RVR2000", "NBLA",
  "ARA", "ARC", "NVI-PT", "NTLH", "NVT", "TB"
];

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const DAILY_VERSION = "RVR1960";
const RECENT_LIMIT = 5;
const BOOKS = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
  "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes",
  "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos",
  "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
  "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas",
  "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías",
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "1 Corintios",
  "2 Corintios", "Gálatas", "Efesios", "Filipenses", "Colosenses",
  "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo",
  "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro", "2 Pedro",
  "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis"
];

const TEXT_SUGGEST_LIMIT = 6;

const unwantedTexts = [
  "Read the Bible", "Leer la Biblia",
  "StudyTools", "Herramientas",
  "Bible GatewayPlus", "Bible Gateway Plus",
  "ExploreMore", "Explore More", "Explorar",
  "Store", "Tienda",
  "Cross references", "Referencias cruzadas",
  "Footnotes", "Notas",
  "Read full chapter", "Leer capítulo completo",
  "Next", "Siguiente", "Previous", "Anterior",
  "Audio Bible", "Biblia en audio",
  "Interlinear", "Interlineal",
  "Commentary", "Comentario",
  "Concordance", "Concordancia",
  "Dictionary", "Diccionario",
  "Español",
  "Do Not Sell My Personal Information",
  "New Revised Standard Version Updated Edition",
  "More on the NVI",
  "About Biblica",
  "Santa Biblias",
  "HarperCollins Christian Publishing",
  "Get weekly Bible news, info, reflections, and deals in your inbox."
];

const queryInput = document.getElementById("query");
const versionSelect = document.getElementById("version");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const verseEl = document.getElementById("verseText");
const refEl = document.getElementById("reference");
const querySuggestions = document.getElementById("querySuggestions");
const studyDot = document.getElementById("studyDot");
const studyActions = document.getElementById("studyActions");
const studyActionNote = document.getElementById("studyActionNote");
const studyActionSermon = document.getElementById("studyActionSermon");
const studyActionDelete = document.getElementById("studyActionDelete");
const studyActionClose = document.getElementById("studyActionClose");
const studyEditor = document.getElementById("studyEditor");
const studyNotesList = document.getElementById("studyNotesList");
const studyNote = document.getElementById("studyNote");
const studySermonDate = document.getElementById("studySermonDate");
const studySave = document.getElementById("studySave");
const studyNewNote = document.getElementById("studyNewNote");
const studyDeleteNote = document.getElementById("studyDeleteNote");
const studyCancel = document.getElementById("studyCancel");
const chapterBtn = document.getElementById("chapterBtn");
const mpButton = document.querySelector(".mp-button");
const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const menuClose = document.getElementById("menuClose");
const helpOpen = document.getElementById("helpOpen");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");
const analytics = typeof window !== "undefined" ? window.umami : null;
const highlightBtn = document.getElementById("highlightBtn");
const themeCheckboxes = Array.from(document.querySelectorAll(".theme-chip input"));
const themesSave = document.getElementById("themesSave");
const installButton = document.getElementById("installButton");

const zenOverlay = document.getElementById("zenOverlay");
const zenText = document.getElementById("zenText");
const zenRef = document.getElementById("zenRef");
const zenClose = document.getElementById("zenClose");
const splash = document.getElementById("splash");
const dailyVerse = document.getElementById("dailyVerse");
const dailyGreeting = document.getElementById("dailyGreeting");
const dailyText = document.getElementById("dailyText");
const dailyRef = document.getElementById("dailyRef");
const dailyClose = document.getElementById("dailyClose");
const namePrompt = document.getElementById("namePrompt");
const nameInput = document.getElementById("nameInput");
const saveNameBtn = document.getElementById("saveNameBtn");
const splashCanvas = document.getElementById("splashCanvas");
let touchStartX = 0;
let touchStartY = 0;
let isZenOpen = false;
let lastShareAt = 0;
let currentStudyParsed = null;
let currentStudyVersion = null;
let studyPressTimer = null;
let studyPressStartX = 0;
let studyPressStartY = 0;
let studyPressActive = false;
let activeStudyNoteId = null;
let currentResultKey = null;
let currentResultText = "";
let activeHighlightRange = null;
let activeHighlightContainer = null;
let lastTapAt = 0;
let lastTapContainer = null;
let highlightTouchStartRange = null;
let highlightTouchStartX = 0;
let highlightTouchStartY = 0;
let highlightTouchMoved = false;
let highlightTouchContainer = null;
let splashAnimationStarted = false;
let textSuggestTimer = null;
let lastTextSuggestQuery = "";
let textSuggestResults = [];
let textSuggestController = null;
let userSeed = null;
let deferredInstallPrompt = null;

function initVersions() {
  versions.forEach((v) => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    versionSelect.appendChild(option);
  });
}

function normalizeReferenceInput(text) {
  return text.replace(/\s+/g, " ").trim().replace(/^(\d)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1$2");
}

function parseReference(text) {
  const normalized = normalizeReferenceInput(text);
  const pattern = /^([0-9]?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/;
  const match = normalized.match(pattern);
  if (!match) return null;
  const book = match[1];
  const chapter = parseInt(match[2], 10);
  const verseStart = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;
  return { book, chapter, verseStart, verseEnd };
}

function buildReference(book, chapter, verseStart, verseEnd, version) {
  const bookDisplay = book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
  if (verseStart === verseEnd) {
    return `${bookDisplay} ${chapter}:${verseStart} (${version})`;
  }
  return `${bookDisplay} ${chapter}:${verseStart}-${verseEnd} (${version})`;
}

function formatBookDisplay(book) {
  return book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
}

function sanitizeReferenceString(reference) {
  if (!reference) return "";
  let cleaned = reference.split(";")[0].trim();
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned;
}

function getUserSeed() {
  if (userSeed) return userSeed;
  try {
    const stored = localStorage.getItem("userSeed");
    if (stored) {
      userSeed = stored;
      return stored;
    }
    const created = `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("userSeed", created);
    userSeed = created;
    return created;
  } catch {
    userSeed = `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return userSeed;
  }
}

function getSelectedThemes() {
  try {
    const raw = localStorage.getItem("dailyThemes");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSelectedThemes(themes) {
  try {
    localStorage.setItem("dailyThemes", JSON.stringify(themes));
  } catch {
    // ignore
  }
}

function readProxyStats() {
  try {
    const raw = localStorage.getItem("proxyStats");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProxyStats(stats) {
  try {
    localStorage.setItem("proxyStats", JSON.stringify(stats));
  } catch {
    // ignore
  }
}

function recordProxyTiming(url, ms, ok) {
  const stats = readProxyStats();
  const entry = stats[url] || { count: 0, avgMs: 0, ok: 0, fail: 0 };
  entry.count += 1;
  if (ok) entry.ok += 1;
  else entry.fail += 1;
  if (Number.isFinite(ms)) {
    entry.avgMs = entry.count === 1 ? ms : (entry.avgMs * 0.7 + ms * 0.3);
  }
  stats[url] = entry;
  writeProxyStats(stats);
}

function isProxyDebugEnabled() {
  try {
    return localStorage.getItem("debugProxy") === "1";
  } catch {
    return false;
  }
}

function orderProxies(urls) {
  const stats = readProxyStats();
  return [...urls].sort((a, b) => {
    const sa = stats[a];
    const sb = stats[b];
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    if (sa.ok !== sb.ok) return sb.ok - sa.ok;
    if (sa.avgMs !== sb.avgMs) return sa.avgMs - sb.avgMs;
    return sa.fail - sb.fail;
  });
}

function readDailyVerseCache() {
  try {
    const raw = localStorage.getItem("dailyVerseCache");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDailyVerseCache(payload) {
  try {
    localStorage.setItem("dailyVerseCache", JSON.stringify(payload));
  } catch {
    // ignore
  }
}


function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function dailyIndexForUser(dayIndex, total) {
  const seed = getUserSeed();
  const themes = getSelectedThemes().join("|");
  const key = `${seed}|${themes}|${dayIndex}`;
  return simpleHash(key) % total;
}

function highlightStorageKey() {
  if (!currentResultKey) return null;
  return `highlight:${currentResultKey}`;
}

function readHighlights(key) {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHighlights(key, highlights) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(highlights));
  } catch {
    // ignore
  }
}

function normalizeHighlights(highlights, maxLen) {
  const cleaned = highlights
    .map((h) => ({
      start: Math.max(0, Math.min(maxLen, Number(h.start))),
      end: Math.max(0, Math.min(maxLen, Number(h.end)))
    }))
    .filter((h) => Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  cleaned.forEach((h) => {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end) {
      last.end = Math.max(last.end, h.end);
    } else {
      merged.push({ start: h.start, end: h.end });
    }
  });
  return merged;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHighlights(container, text, highlights) {
  const normalized = normalizeHighlights(highlights, text.length);
  writeHighlights(highlightStorageKey(), normalized);
  if (!normalized.length) {
    container.textContent = text;
    return;
  }
  let html = "";
  let cursor = 0;
  normalized.forEach((h, idx) => {
    if (h.start > cursor) {
      html += escapeHtml(text.slice(cursor, h.start));
    }
    const chunk = escapeHtml(text.slice(h.start, h.end));
    html += `<span class="highlight" data-index="${idx}" data-start="${h.start}" data-end="${h.end}">${chunk}</span>`;
    cursor = h.end;
  });
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }
  container.innerHTML = html;
}

function updateHighlightedViews() {
  if (!currentResultText) return;
  const highlights = readHighlights(highlightStorageKey());
  renderHighlights(verseEl, currentResultText, highlights);
  if (isZenOpen) {
    renderHighlights(zenText, currentResultText, highlights);
  }
}

function cleanText(text) {
  let cleaned = text;
  unwantedTexts.forEach((u) => {
    cleaned = cleaned.replaceAll(u, "");
  });
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecentQueries() {
  try {
    const raw = localStorage.getItem("recentQueries");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentQuery(query) {
  const cleaned = query.trim();
  if (!cleaned) return;
  const current = getRecentQueries().filter((q) => q !== cleaned);
  current.unshift(cleaned);
  const trimmed = current.slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem("recentQueries", JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

function buildSuggestionGroup(title, items) {
  if (!items.length) return "";
  const list = items
    .map((item) => `<button type="button" class="suggestion-item" data-value="${item}">${item}</button>`)
    .join("");
  return `<div class="suggestion-group"><div class="suggestion-title">${title}</div>${list}</div>`;
}

function updateSuggestions() {
  if (!querySuggestions) return;
  const raw = queryInput.value || "";
  const input = normalizeForMatch(raw);
  if (!input) {
    querySuggestions.hidden = true;
    querySuggestions.innerHTML = "";
    return;
  }

  const bookMatches = BOOKS.filter((book) =>
    normalizeForMatch(book).startsWith(input)
  ).slice(0, RECENT_LIMIT);

  const recentMatches = getRecentQueries()
    .filter((q) => normalizeForMatch(q).includes(input))
    .slice(0, RECENT_LIMIT);

  const textMatches = isTextSearchInput(raw) ? textSuggestResults : [];

  const html = [
    buildSuggestionGroup("Libros", bookMatches.map((b) => `${b} `)),
    buildSuggestionGroup("Recientes", recentMatches),
    buildSuggestionGroup("Texto", textMatches)
  ].filter(Boolean).join("");

  if (!html) {
    querySuggestions.hidden = true;
    querySuggestions.innerHTML = "";
    return;
  }

  querySuggestions.innerHTML = html;
  querySuggestions.hidden = false;
}

function isTextSearchInput(raw) {
  const trimmed = raw.trim();
  if (trimmed.length < 30) return false;
  if (/\d+\s*:\s*\d+/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length < 4) return false;
  return true;
}

function parseQuickSearchRefs(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const refs = [];
  doc.querySelectorAll(".bible-item .bible-item-title a").forEach((a) => {
    const text = a.textContent.trim();
    if (!text) return;
    if (text === "In Context" || text === "Full Chapter") return;
    if (!/\d+:\d+/.test(text)) return;
    refs.push(text);
  });
  return Array.from(new Set(refs)).slice(0, TEXT_SUGGEST_LIMIT);
}

async function fetchTextSuggestions(query) {
  const search = query.trim();
  if (!search) return [];
  const url = `https://www.biblegateway.com/quicksearch/?quicksearch=${encodeURIComponent(search)}&version=${DAILY_VERSION}&searchtype=all`;
  const fetchUrls = buildFetchUrls(url);
  if (textSuggestController) {
    try {
      textSuggestController.abort();
    } catch {
      // ignore
    }
  }
  textSuggestController = new AbortController();
  const html = await fetchFirstHtml(fetchUrls, 7000);
  if (!html) return [];
  return parseQuickSearchRefs(html);
}

function requestTextSuggestions(raw) {
  const query = raw.trim();
  if (!isTextSearchInput(query)) return;
  if (query === lastTextSuggestQuery) return;
  lastTextSuggestQuery = query;
  if (textSuggestTimer) clearTimeout(textSuggestTimer);
  textSuggestTimer = setTimeout(async () => {
    try {
      const results = await fetchTextSuggestions(query);
      textSuggestResults = results;
      updateSuggestions();
    } catch {
      // ignore
    }
  }, 700);
}

function extractByClassPattern(container, verseStart, verseEnd) {
  const parts = [];
  const spans = container.querySelectorAll("span.text");
  spans.forEach((span) => {
    const classes = Array.from(span.classList);
    let verseNum = null;
    let verseNumEnd = null;
    classes.forEach((cls) => {
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
    let text = span.textContent.trim();
    text = text.replace(/^\d+\s*/, "").replace(/\([^)]*\)/g, "");
    if (text) parts.push(text);
  });
  return parts.join(" ").trim();
}

function parseHTML(html, query) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const passage = doc.querySelector("div.passage-text");
  if (!passage) return null;

  passage.querySelectorAll("sup, footnote, crossreference, audio").forEach((el) => el.remove());
  passage.querySelectorAll("h1, h2, h3, h4, h5").forEach((el) => el.remove());
  passage.querySelectorAll(".footnotes, .crossrefs, .passage-other-trans, .full-chap-link").forEach((el) => el.remove());

  let verseText = extractByClassPattern(passage, query.verseStart, query.verseEnd);
  if (!verseText) {
    verseText = passage.textContent || "";
  }
  verseText = cleanText(verseText);
  return verseText || null;
}

function parseChapterHTML(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const passage = doc.querySelector("div.passage-text");
  if (!passage) return null;

  passage.querySelectorAll("sup, footnote, crossreference, audio").forEach((el) => el.remove());
  passage.querySelectorAll("h1, h2, h3, h4, h5").forEach((el) => el.remove());
  passage.querySelectorAll(".footnotes, .crossrefs, .passage-other-trans, .full-chap-link").forEach((el) => el.remove());

  const text = cleanText(passage.textContent || "");
  return text || null;
}

function isNoResults(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.querySelector(".no-results, .no-results__body, .search-no-results")) return true;
  const text = (doc.body && doc.body.textContent ? doc.body.textContent : "").toLowerCase();
  return (
    text.includes("no results found") ||
    text.includes("no se encontraron resultados") ||
    text.includes("sin resultados") ||
    text.includes("no results")
  );
}

async function fetchVerse() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) {
    showStatus("Formato invalido. Usa Libro Capitulo:Verso", true);
    return;
  }
  textSuggestResults = [];
  if (querySuggestions) querySuggestions.hidden = true;

  const version = versionSelect.value;
  currentStudyParsed = parsed;
  currentStudyVersion = version;
  currentResultKey = buildCacheKey(parsed, version);
  trackEvent("search_verse", { version, query: queryInput.value.trim() });
  const verseQuery = parsed.verseEnd > parsed.verseStart
    ? `${parsed.verseStart}-${parsed.verseEnd}`
    : `${parsed.verseStart}`;
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}:${verseQuery}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;

  const cacheKey = currentResultKey;
  const cached = readCache(cacheKey);
  if (cached) {
    showResult(cached.text, cached.reference);
    return;
  }
  const fetchUrls = buildFetchUrls(url);

  showStatus("Buscando...", false);
  try {
    const html = await fetchFirstHtml(fetchUrls, 7000);
    if (!html) {
      showStatus("No se pudo obtener contenido del servidor.", true);
      return;
    }
    if (isNoResults(html)) {
      showStatus("No existe esa referencia.", true);
      return;
    }
    const verseText = parseHTML(html, parsed);
    if (!verseText) {
      showStatus("No se pudo extraer el versiculo.", true);
      return;
    }
    const reference = buildReference(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd, version);
    writeCache(cacheKey, { text: verseText, reference });
    showResult(verseText, reference);
  } catch (err) {
    showStatus("Error de red al conectar con el servidor local.", true);
  }
}

async function fetchChapter() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) {
    showStatus("Formato invalido. Usa Libro Capitulo:Verso", true);
    return;
  }
  textSuggestResults = [];
  if (querySuggestions) querySuggestions.hidden = true;

  const version = versionSelect.value;
  currentStudyParsed = parsed;
  currentStudyVersion = version;
  currentResultKey = buildChapterCacheKey(parsed, version);
  trackEvent("search_chapter", { version, query: queryInput.value.trim() });
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;

  const cacheKey = currentResultKey;
  const cached = readCache(cacheKey);
  if (cached) {
    showResult(cached.text, cached.reference);
    return;
  }
  const fetchUrls = buildFetchUrls(url);

  showStatus("Buscando...", false);
  try {
    const html = await fetchFirstHtml(fetchUrls, 7000);
    if (!html) {
      showStatus("No se pudo obtener contenido del servidor.", true);
      return;
    }
    if (isNoResults(html)) {
      showStatus("No existe ese capitulo.", true);
      return;
    }
    const chapterText = parseChapterHTML(html);
    if (!chapterText) {
      showStatus("No se pudo extraer el capitulo.", true);
      return;
    }
    const bookDisplay = parsed.book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
    const reference = `${bookDisplay} ${parsed.chapter} (${version})`;
    writeCache(cacheKey, { text: chapterText, reference });
    showResult(chapterText, reference);
  } catch {
    showStatus("Error de red al conectar con el servidor local.", true);
  }
}

function openMercadoPagoTransfer() {
  const alias = "denovaje";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const deepLink = `mercadopago://transfer?alias=${encodeURIComponent(alias)}`;
  const storeLink = isIOS
    ? "https://apps.apple.com/app/mercado-pago/id925436649"
    : "https://play.google.com/store/apps/details?id=com.mercadopago.wallet";
  const webLink = "https://link.mercadopago.com.ar/denovaje";

  if (!isIOS && !isAndroid) {
    window.open(webLink, "_blank", "noopener");
    return;
  }

  const fallbackTimer = setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.location.href = storeLink;
    }
  }, 1500);

  const cancelFallback = () => clearTimeout(fallbackTimer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelFallback();
  }, { once: true });

  window.location.href = deepLink;
}

function showStatus(text, isError) {
  resultEl.hidden = true;
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#ff7b7b" : "var(--muted)";
}

function showResult(text, reference) {
  statusEl.textContent = "";
  currentResultText = text;
  updateHighlightedViews();
  refEl.textContent = `— ${reference}`;
  resultEl.hidden = false;
  if (isZenOpen) {
    updateHighlightedViews();
    zenRef.textContent = `— ${reference}`;
  }
  persistLastQuery();
  refreshStudyDot();
}

function goPrev() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) return;
  const prev = Math.max(1, parsed.verseStart - 1);
  const book = parsed.book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
  queryInput.value = `${book} ${parsed.chapter}:${prev}`;
  fetchVerse();
}

function goNext() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) return;
  const next = parsed.verseEnd + 1;
  const book = parsed.book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
  queryInput.value = `${book} ${parsed.chapter}:${next}`;
  fetchVerse();
}

function persistLastQuery() {
  const payload = {
    query: queryInput.value.trim(),
    version: versionSelect.value
  };
  try {
    localStorage.setItem("lastQuery", JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
  saveRecentQuery(payload.query);
}

function restoreLastQuery() {
  try {
    const raw = localStorage.getItem("lastQuery");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.query) queryInput.value = data.query;
    if (data.version) versionSelect.value = data.version;
  } catch {
    // ignore storage errors
  }
}

function openZen() {
  if (resultEl.hidden) return;
  isZenOpen = true;
  updateHighlightedViews();
  zenRef.textContent = refEl.textContent;
  zenOverlay.hidden = false;
  trackEvent("open_zen");
}

function closeZen() {
  zenOverlay.hidden = true;
  isZenOpen = false;
}

function buildStudyKey(parsed, version) {
  return `study:${buildCacheKey(parsed, version)}`;
}

function readStudy(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeStudyData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStudy(key, data) {
  try {
    const normalized = normalizeStudyData(data);
    localStorage.setItem(key, JSON.stringify({ ...normalized, updatedAt: Date.now() }));
  } catch {
    // ignore
  }
}

function deleteStudy(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function hasStudyData(data) {
  if (!data) return false;
  if (Array.isArray(data.notes) && data.notes.some((n) => n && n.text && n.text.trim())) return true;
  if (data.sermonDate && String(data.sermonDate).trim()) return true;
  return false;
}

function normalizeStudyData(data) {
  if (!data || typeof data !== "object") {
    return { notes: [], sermonDate: null };
  }
  const notes = [];
  if (Array.isArray(data.notes)) {
    data.notes.forEach((n) => {
      if (!n || typeof n !== "object") return;
      const id = String(n.id || "").trim() || cryptoSafeId();
      const text = typeof n.text === "string" ? n.text : "";
      notes.push({
        id,
        text,
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now()
      });
    });
  } else if (typeof data.noteText === "string" && data.noteText.trim()) {
    notes.push({
      id: "legacy",
      text: data.noteText,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now()
    });
  }
  return {
    notes,
    sermonDate: data.sermonDate || null,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now()
  };
}

function cryptoSafeId() {
  try {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `n_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function currentStudyKey() {
  if (!currentStudyParsed || !currentStudyVersion) return null;
  return buildStudyKey(currentStudyParsed, currentStudyVersion);
}

function refreshStudyDot() {
  const key = currentStudyKey();
  if (!key || resultEl.hidden) {
    studyDot.hidden = true;
    return;
  }
  const data = readStudy(key);
  studyDot.hidden = !hasStudyData(data);
}

function openStudyActions() {
  if (resultEl.hidden) return;
  if (!studyActions.hidden || !studyEditor.hidden) return;
  const key = currentStudyKey();
  if (!key) return;
  clearTextSelection();
  studyActions.hidden = false;
}

function closeStudyActions() {
  studyActions.hidden = true;
  clearTextSelection();
}

function openStudyEditorSheet(focus) {
  const key = currentStudyKey();
  if (!key) return;
  const data = readStudy(key) || normalizeStudyData(null);
  studySermonDate.value = data.sermonDate || "";
  if (data.notes.length) {
    activeStudyNoteId = data.notes[0].id;
    studyNote.value = data.notes[0].text || "";
  } else {
    activeStudyNoteId = null;
    studyNote.value = "";
  }
  renderNotesList(data);
  closeStudyActions();
  clearTextSelection();
  studyEditor.hidden = false;
  setTimeout(() => {
    if (focus === "date") {
      studySermonDate.focus();
    } else {
      studyNote.focus();
    }
  }, 0);
}

function closeStudyEditorSheet() {
  studyEditor.hidden = true;
  activeStudyNoteId = null;
  clearTextSelection();
}

function saveStudyFromEditor() {
  const key = currentStudyKey();
  if (!key) return;
  const noteText = studyNote.value.trim();
  const sermonDate = studySermonDate.value ? studySermonDate.value : "";
  const current = readStudy(key) || normalizeStudyData(null);
  const notes = Array.isArray(current.notes) ? [...current.notes] : [];

  if (activeStudyNoteId) {
    const idx = notes.findIndex((n) => n.id === activeStudyNoteId);
    if (idx >= 0) {
      if (!noteText) {
        notes.splice(idx, 1);
      } else {
        notes[idx] = { ...notes[idx], text: noteText, updatedAt: Date.now() };
      }
    } else if (noteText) {
      notes.unshift({ id: activeStudyNoteId, text: noteText, createdAt: Date.now(), updatedAt: Date.now() });
    }
  } else if (noteText) {
    const id = cryptoSafeId();
    notes.unshift({ id, text: noteText, createdAt: Date.now(), updatedAt: Date.now() });
    activeStudyNoteId = id;
  }

  const next = normalizeStudyData({ notes, sermonDate: sermonDate || null });
  if (!hasStudyData(next)) {
    deleteStudy(key);
  } else {
    writeStudy(key, next);
  }
  closeStudyEditorSheet();
  refreshStudyDot();
}

function newStudyNote() {
  activeStudyNoteId = null;
  studyNote.value = "";
  const key = currentStudyKey();
  if (!key) return;
  const data = readStudy(key) || normalizeStudyData(null);
  renderNotesList(data);
  setTimeout(() => studyNote.focus(), 0);
}

function deleteActiveStudyNote() {
  const key = currentStudyKey();
  if (!key) return;
  const data = readStudy(key) || normalizeStudyData(null);
  if (!activeStudyNoteId) return;
  const notes = data.notes.filter((n) => n.id !== activeStudyNoteId);
  activeStudyNoteId = notes.length ? notes[0].id : null;
  const next = normalizeStudyData({ notes, sermonDate: data.sermonDate || null });
  if (!hasStudyData(next)) {
    deleteStudy(key);
    closeStudyEditorSheet();
    refreshStudyDot();
    return;
  }
  writeStudy(key, next);
  if (activeStudyNoteId) {
    const first = next.notes.find((n) => n.id === activeStudyNoteId);
    studyNote.value = first ? first.text : "";
  } else {
    studyNote.value = "";
  }
  renderNotesList(next);
  refreshStudyDot();
}

function selectStudyNote(noteId) {
  const key = currentStudyKey();
  if (!key) return;
  const data = readStudy(key) || normalizeStudyData(null);
  const note = data.notes.find((n) => n.id === noteId);
  activeStudyNoteId = note ? note.id : null;
  studyNote.value = note ? note.text : "";
  renderNotesList(data);
  setTimeout(() => studyNote.focus(), 0);
}

function renderNotesList(data) {
  const notes = (data && Array.isArray(data.notes)) ? data.notes : [];
  studyNotesList.innerHTML = "";
  if (!notes.length) return;
  notes.forEach((n, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `note-chip${n.id === activeStudyNoteId ? " active" : ""}`;
    btn.textContent = String(idx + 1);
    btn.addEventListener("click", () => selectStudyNote(n.id));
    studyNotesList.appendChild(btn);
  });
}

function deleteStudyForCurrent() {
  const key = currentStudyKey();
  if (!key) return;
  deleteStudy(key);
  closeStudyActions();
  closeStudyEditorSheet();
  refreshStudyDot();
}

function clearTextSelection() {
  try {
    const active = document.activeElement;
    if (active && typeof active.blur === "function") active.blur();
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && typeof sel.removeAllRanges === "function") sel.removeAllRanges();
  } catch {
    // ignore
  }
}

function cancelStudyPress() {
  if (studyPressTimer) clearTimeout(studyPressTimer);
  studyPressTimer = null;
  studyPressActive = false;
  resultEl.classList.remove("no-select");
}

function startStudyPress(x, y) {
  cancelStudyPress();
  studyPressStartX = x;
  studyPressStartY = y;
  studyPressActive = true;
  studyPressTimer = setTimeout(() => {
    studyPressTimer = null;
    if (!studyPressActive) return;
    resultEl.classList.add("no-select");
    openStudyActions();
  }, 520);
}

function studyPressMoved(x, y, threshold) {
  return Math.abs(x - studyPressStartX) > threshold || Math.abs(y - studyPressStartY) > threshold;
}

function onStudyTouchStart(event) {
  if (event.touches.length !== 1) return;
  if (!studyActions.hidden || !studyEditor.hidden) return;
  const t = event.touches[0];
  startStudyPress(t.clientX, t.clientY);
}

function onStudyTouchMove(event) {
  if (!studyPressActive || event.touches.length !== 1) return;
  const t = event.touches[0];
  if (studyPressMoved(t.clientX, t.clientY, 12)) cancelStudyPress();
}

function onStudyTouchEnd() {
  cancelStudyPress();
}

function onStudyMouseDown(event) {
  if (event.button !== 0) return;
  if (!studyActions.hidden || !studyEditor.hidden) return;
  startStudyPress(event.clientX, event.clientY);
  const onMove = (e) => {
    if (!studyPressActive) return;
    if (studyPressMoved(e.clientX, e.clientY, 6)) cancelStudyPress();
  };
  const onUp = () => {
    cancelStudyPress();
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}


addListener(document.getElementById("searchBtn"), "click", fetchVerse);
addListener(document.getElementById("prevBtn"), "click", goPrev);
addListener(document.getElementById("nextBtn"), "click", goNext);
addListener(document.getElementById("zenBtn"), "click", openZen);
addListener(chapterBtn, "click", fetchChapter);
addListener(zenClose, "click", closeZen);
addListener(mpButton, "click", (event) => {
  event.preventDefault();
  openMercadoPagoTransfer();
});
// tap-to-close removed to avoid swallowing swipe events

zenOverlay.hidden = true;
zenClose.type = "button";
window.closeZen = closeZen;

zenOverlay.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

zenOverlay.addEventListener("touchend", (event) => {
  const dx = event.changedTouches[0].clientX - touchStartX;
  const dy = event.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) {
    if (dy < -80) {
      shareVerseAsPng();
    }
    return;
  }
  if (dx > 0) {
    goPrev();
  } else {
    goNext();
  }
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") goPrev();
  if (event.key === "ArrowDown") goNext();
});

function addListener(el, event, handler, options) {
  if (!el) return;
  el.addEventListener(event, handler, options);
}

function trackEvent(name, data) {
  if (!analytics) return;
  try {
    analytics.track(name, data);
  } catch {
    // ignore tracking errors
  }
}

function hideHighlightButton() {
  if (!highlightBtn) return;
  highlightBtn.hidden = true;
  activeHighlightRange = null;
  activeHighlightContainer = null;
}

function getSelectionOffsets(container, range) {
  const startRange = range.cloneRange();
  startRange.selectNodeContents(container);
  startRange.setEnd(range.startContainer, range.startOffset);
  const start = startRange.toString().length;

  const endRange = range.cloneRange();
  endRange.selectNodeContents(container);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;
  return { start, end };
}

function maybeShowHighlightButton(container) {
  if (!highlightBtn) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideHighlightButton();
    return;
  }
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    hideHighlightButton();
    return;
  }
  const offsets = getSelectionOffsets(container, range);
  if (offsets.end - offsets.start < 2) {
    hideHighlightButton();
    return;
  }
  activeHighlightRange = offsets;
  activeHighlightContainer = container;
  const rect = range.getBoundingClientRect();
  const top = Math.max(12, rect.top + window.scrollY - 46);
  const left = Math.min(window.innerWidth - 120, rect.left + window.scrollX);
  highlightBtn.style.top = `${top}px`;
  highlightBtn.style.left = `${left}px`;
  highlightBtn.hidden = false;
}

function applyHighlight() {
  if (!activeHighlightRange || !currentResultKey) return;
  const highlights = readHighlights(highlightStorageKey());
  highlights.push(activeHighlightRange);
  writeHighlights(highlightStorageKey(), normalizeHighlights(highlights, currentResultText.length));
  updateHighlightedViews();
  const selection = window.getSelection();
  if (selection && selection.removeAllRanges) selection.removeAllRanges();
  hideHighlightButton();
}

function removeHighlightFromClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("highlight")) return;
  const start = Number(target.dataset.start);
  const end = Number(target.dataset.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return;
  const highlights = readHighlights(highlightStorageKey());
  const next = highlights.filter((h) => !(Number(h.start) === start && Number(h.end) === end));
  writeHighlights(highlightStorageKey(), normalizeHighlights(next, currentResultText.length));
  updateHighlightedViews();
}

function getRangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
    return range;
  }
  return null;
}

function getWordOffsets(text, index) {
  const isWordChar = (ch) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(ch);
  let start = Math.max(0, Math.min(text.length, index));
  let end = start;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;
  while (end < text.length && isWordChar(text[end])) end += 1;
  return { start, end };
}

function highlightWordAtPoint(container, clientX, clientY) {
  const range = getRangeFromPoint(clientX, clientY);
  if (!range || !container.contains(range.startContainer)) return;
  const offsets = getSelectionOffsets(container, range);
  const word = getWordOffsets(container.textContent, offsets.end);
  if (word.end - word.start < 2) return;
  activeHighlightRange = word;
  applyHighlight();
}

function handleDoubleTap(container, event) {
  const now = Date.now();
  const isDoubleTap = lastTapContainer === container && now - lastTapAt < 320;
  lastTapAt = now;
  lastTapContainer = container;
  if (!isDoubleTap) return;
  const touch = event.changedTouches ? event.changedTouches[0] : null;
  if (touch) {
    highlightWordAtPoint(container, touch.clientX, touch.clientY);
    return;
  }
  maybeShowHighlightButton(container);
  applyHighlight();
}

function startHighlightTouch(container, event) {
  const touch = event.touches ? event.touches[0] : null;
  if (!touch) return;
  const range = getRangeFromPoint(touch.clientX, touch.clientY);
  if (!range || !container.contains(range.startContainer)) return;
  highlightTouchStartRange = range;
  highlightTouchStartX = touch.clientX;
  highlightTouchStartY = touch.clientY;
  highlightTouchMoved = false;
  highlightTouchContainer = container;
}

function moveHighlightTouch(event) {
  const touch = event.touches ? event.touches[0] : null;
  if (!touch || !highlightTouchStartRange || !highlightTouchContainer) return;
  const dx = Math.abs(touch.clientX - highlightTouchStartX);
  const dy = Math.abs(touch.clientY - highlightTouchStartY);
  if (dx > 6 || dy > 6) {
    highlightTouchMoved = true;
    cancelStudyPress();
  }
}

function endHighlightTouch(event) {
  const touch = event.changedTouches ? event.changedTouches[0] : null;
  if (!touch || !highlightTouchMoved || !highlightTouchStartRange || !highlightTouchContainer) {
    highlightTouchStartRange = null;
    highlightTouchContainer = null;
    highlightTouchMoved = false;
    return;
  }
  const endRange = getRangeFromPoint(touch.clientX, touch.clientY);
  if (!endRange || !highlightTouchContainer.contains(endRange.startContainer)) {
    highlightTouchStartRange = null;
    highlightTouchContainer = null;
    highlightTouchMoved = false;
    return;
  }
  const combined = document.createRange();
  try {
    combined.setStart(highlightTouchStartRange.startContainer, highlightTouchStartRange.startOffset);
    combined.setEnd(endRange.startContainer, endRange.startOffset);
  } catch {
    highlightTouchStartRange = null;
    highlightTouchContainer = null;
    highlightTouchMoved = false;
    return;
  }
  const offsets = getSelectionOffsets(highlightTouchContainer, combined);
  if (offsets.end - offsets.start >= 2) {
    activeHighlightRange = offsets;
    applyHighlight();
  }
  highlightTouchStartRange = null;
  highlightTouchContainer = null;
  highlightTouchMoved = false;
}

addListener(studyDot, "click", () => openStudyEditorSheet("note"));
addListener(studyActions, "click", (event) => {
  if (event.target === studyActions) closeStudyActions();
});
addListener(studyEditor, "click", (event) => {
  if (event.target === studyEditor) closeStudyEditorSheet();
});
addListener(studyActionClose, "click", closeStudyActions);
addListener(studyActionNote, "click", () => openStudyEditorSheet("note"));
addListener(studyActionSermon, "click", () => openStudyEditorSheet("date"));
addListener(studyActionDelete, "click", deleteStudyForCurrent);
addListener(studySave, "click", saveStudyFromEditor);
addListener(studyNewNote, "click", newStudyNote);
addListener(studyDeleteNote, "click", deleteActiveStudyNote);
addListener(studyCancel, "click", closeStudyEditorSheet);

addListener(resultEl, "touchstart", onStudyTouchStart, { passive: true });
addListener(resultEl, "touchmove", onStudyTouchMove, { passive: true });
addListener(resultEl, "touchend", onStudyTouchEnd, { passive: true });
addListener(resultEl, "touchcancel", onStudyTouchEnd, { passive: true });
addListener(resultEl, "mousedown", onStudyMouseDown);
addListener(verseEl, "mouseup", () => maybeShowHighlightButton(verseEl));
addListener(verseEl, "touchstart", (event) => startHighlightTouch(verseEl, event));
addListener(verseEl, "touchmove", moveHighlightTouch);
addListener(verseEl, "touchend", (event) => {
  endHighlightTouch(event);
});
addListener(verseEl, "click", removeHighlightFromClick);
addListener(zenText, "mouseup", () => maybeShowHighlightButton(zenText));
addListener(zenText, "touchstart", (event) => startHighlightTouch(zenText, event));
addListener(zenText, "touchmove", moveHighlightTouch);
addListener(zenText, "touchend", (event) => {
  endHighlightTouch(event);
});
addListener(zenText, "click", removeHighlightFromClick);
addListener(document, "selectionchange", () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideHighlightButton();
    return;
  }
  const range = selection.getRangeAt(0);
  if (verseEl && verseEl.contains(range.commonAncestorContainer)) {
    maybeShowHighlightButton(verseEl);
    cancelStudyPress();
    return;
  }
  if (zenText && zenText.contains(range.commonAncestorContainer)) {
    maybeShowHighlightButton(zenText);
    cancelStudyPress();
    return;
  }
  hideHighlightButton();
});
addListener(highlightBtn, "click", applyHighlight);

addListener(menuBtn, "click", openMenu);
addListener(menuClose, "click", closeMenu);
addListener(sideMenu, "click", (event) => {
  if (event.target === sideMenu) closeMenu();
});
addListener(helpOpen, "click", () => {
  closeMenu();
  openHelp();
});
addListener(helpClose, "click", closeHelp);
addListener(helpOverlay, "click", (event) => {
  if (event.target === helpOverlay) closeHelp();
});
addListener(installButton, "click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  try {
    await deferredInstallPrompt.userChoice;
  } catch {
    // ignore
  }
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});
window.addEventListener("appinstalled", () => {
  trackEvent("app_installed");
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

addListener(queryInput, "input", () => {
  updateSuggestions();
  requestTextSuggestions(queryInput.value);
});
addListener(queryInput, "focus", () => {
  updateSuggestions();
  requestTextSuggestions(queryInput.value);
});
addListener(document, "click", (event) => {
  if (!querySuggestions) return;
  if (event.target === queryInput || querySuggestions.contains(event.target)) return;
  querySuggestions.hidden = true;
});
addListener(querySuggestions, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("suggestion-item")) return;
  const value = target.dataset.value || "";
  queryInput.value = value;
  queryInput.focus();
  querySuggestions.hidden = true;
});


if (themeCheckboxes.length) {
  const saved = getSelectedThemes();
  themeCheckboxes.forEach((cb) => {
    cb.checked = saved.includes(cb.value);
  });
  addListener(themesSave, "click", () => {
    const selected = themeCheckboxes.filter((cb) => cb.checked).map((cb) => cb.value);
    setSelectedThemes(selected);
    showDailyVerse();
  });
}

initVersions();
restoreLastQuery();
initSplash();
function buildFetchUrls(url) {
  const encoded = encodeURIComponent(url);
  const urls = [
    `${location.origin}/proxy?url=${encoded}`,
    `https://readbible-production.up.railway.app/?url=${encoded}`,
    `https://corsproxy.io/?url=${encoded}`,
    `https://corsproxy.org/?${encoded}`,
    `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`
  ];
  if (location.hostname.endsWith("github.io")) {
    return orderProxies(urls.slice(1));
  }
  return orderProxies(urls);
}

function anyResolve(promises) {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    if (!pending) {
      reject(new Error("No promises"));
      return;
    }
    promises.forEach((p) => {
      Promise.resolve(p).then(resolve, (err) => {
        pending -= 1;
        if (pending === 0) reject(err);
      });
    });
  });
}

async function fetchWithTimeout(url, timeoutMs, controller) {
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("bad response");
    const text = await response.text();
    if (!text || text.length <= 500) throw new Error("short response");
    recordProxyTiming(url, performance.now() - start, true);
    if (isProxyDebugEnabled()) {
      console.log("[proxy ok]", Math.round(performance.now() - start), "ms", url);
    }
    return text;
  } catch (error) {
    if (error && error.name === "AbortError") {
      if (isProxyDebugEnabled()) {
        console.log("[proxy abort]", Math.round(performance.now() - start), "ms", url);
      }
      throw error;
    }
    recordProxyTiming(url, performance.now() - start, false);
    if (isProxyDebugEnabled()) {
      console.log("[proxy fail]", Math.round(performance.now() - start), "ms", url);
    }
    throw new Error("fetch failed");
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFirstHtml(urls, timeoutMs) {
  const ordered = orderProxies(urls);
  const controllers = ordered.map(() => new AbortController());
  try {
    const staggerMs = 250;
    const attempts = ordered.map((url, index) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        fetchWithTimeout(url, timeoutMs, controllers[index]).then(resolve, reject);
      }, index * staggerMs);
      controllers[index].signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    }));
    const html = await anyResolve(attempts);
    controllers.forEach((ctrl) => ctrl.abort());
    return html;
  } catch {
    controllers.forEach((ctrl) => ctrl.abort());
    return "";
  }
}

function initSplash() {
  splash.hidden = false;
  const timer = setTimeout(() => closeSplash(timer), 2800);
  splash.addEventListener("click", () => closeSplash(timer), { once: true });
  splash.addEventListener("touchstart", () => closeSplash(timer), { once: true });
  startSplashAnimation();
}

function startSplashAnimation() {
  if (splashAnimationStarted || !splashCanvas) return;
  splashAnimationStarted = true;

  const canvas = splashCanvas;
  const ctx = canvas.getContext("2d", { alpha: false });

  const DPR = () => Math.min(2, window.devicePixelRatio || 1);
  let W = 0;
  let H = 0;
  let dpr = 1;

  function resize() {
    dpr = DPR();
    W = Math.floor(window.innerWidth * dpr);
    H = Math.floor(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
  }
  window.addEventListener("resize", resize);
  resize();

  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const isSmall = window.matchMedia("(max-width: 700px)").matches;
  const isMobile = isCoarse || isSmall;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BG = {
    a: [58, 42, 24],
    b: [178, 122, 51],
    c: [242, 192, 96]
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rand = (min, max) => min + Math.random() * (max - min);

  const SVG_LOGO = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3a2a18"/>
      <stop offset="50%" stop-color="#b27a33"/>
      <stop offset="100%" stop-color="#f2c060"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="centerGlow" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="90" ry="90" fill="url(#bgGradient)"/>
  <ellipse cx="256" cy="220" rx="120" ry="160" fill="url(#centerGlow)"/>
  <g transform="translate(256, 240)" filter="url(#glow)">
    <circle cx="0" cy="-160" r="16" fill="#ffffff"/>
    <circle cx="0" cy="-110" r="12" fill="#ffffff"/>
    <circle cx="0" cy="-55" r="24" fill="#ffffff"/>
    <circle cx="0" cy="5" r="12" fill="#ffffff"/>
    <circle cx="0" cy="65" r="12" fill="#ffffff"/>
    <circle cx="0" cy="125" r="12" fill="#ffffff"/>
    <circle cx="0" cy="185" r="16" fill="#ffffff"/>
    <circle cx="-110" cy="-55" r="16" fill="#ffffff"/>
    <circle cx="-55" cy="-55" r="12" fill="#ffffff"/>
    <circle cx="55" cy="-55" r="12" fill="#ffffff"/>
    <circle cx="110" cy="-55" r="16" fill="#ffffff"/>
  </g>
</svg>`;

  const logoImg = new Image();
  logoImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG_LOGO);

  const crossCircles = [
    { x: 0, y: -160, r: 16 },
    { x: 0, y: -110, r: 12 },
    { x: 0, y: -55, r: 24 },
    { x: 0, y: 5, r: 12 },
    { x: 0, y: 65, r: 12 },
    { x: 0, y: 125, r: 12 },
    { x: 0, y: 185, r: 16 },
    { x: -110, y: -55, r: 16 },
    { x: -55, y: -55, r: 12 },
    { x: 55, y: -55, r: 12 },
    { x: 110, y: -55, r: 16 }
  ];

  function buildCrossTargets(pxScale, density) {
    const targets = [];
    crossCircles.forEach((c) => {
      const area = Math.PI * c.r * c.r;
      const n = Math.floor(area * density);
      for (let i = 0; i < n; i += 1) {
        const t = Math.random() * Math.PI * 2;
        const u = Math.random();
        const rr = Math.sqrt(u) * c.r;
        targets.push({
          x: (c.x + Math.cos(t) * rr) * pxScale,
          y: (c.y + Math.sin(t) * rr) * pxScale
        });
      }
    });
    const step = isMobile ? 8 : 6;
    for (let y = -160; y <= 185; y += step) targets.push({ x: 0 * pxScale, y: y * pxScale });
    for (let x = -110; x <= 110; x += step) targets.push({ x: x * pxScale, y: -55 * pxScale });
    return targets;
  }

  let particles = [];
  let crossTargets = [];

  const DUR_GALAXY = prefersReducedMotion ? 0.25 : 1.2;
  const DUR_SPHERE = prefersReducedMotion ? 0.15 : 0.6;
  const DUR_IMPLODE = prefersReducedMotion ? 0.35 : 1.2;
  const DUR_HOLD = prefersReducedMotion ? 0.25 : 0.8;
  const TOTAL = DUR_GALAXY + DUR_SPHERE + DUR_IMPLODE + DUR_HOLD;

  function particleBudget() {
    if (isMobile) {
      return {
        cross: clamp(Math.floor((W * H) / (900 * 900) * 680), 560, 860),
        bg: 140,
        halo: 14 * dpr
      };
    }
    return {
      cross: clamp(Math.floor((W * H) / (900 * 900) * 1150), 900, 1500),
      bg: 260,
      halo: 22 * dpr
    };
  }

  let startTime = performance.now();
  let lastNow = performance.now();
  let finished = false;

  function init() {
    const budget = particleBudget();
    const logoHeightSvg = 420;
    const desiredLogoH = Math.min(H * 0.44, W * 0.44);
    const pxScale = desiredLogoH / logoHeightSvg;

    const density = isMobile ? 1.9 : 2.5;
    crossTargets = buildCrossTargets(pxScale, density);

    const CROSS_N = Math.min(budget.cross, crossTargets.length);
    const BG_N = budget.bg;
    const N = CROSS_N + BG_N;

    const targets = crossTargets.slice();
    for (let i = targets.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }

    particles = new Array(N).fill(0).map((_, i) => {
      const arm = i % 3;
      const ang0 = rand(0, Math.PI * 2) + arm * (Math.PI * 2 / 3);
      const rad0 = Math.pow(Math.random(), 0.55);
      const r = rad0;
      const twist = 7.0;
      const theta = ang0 + r * twist;
      const y = rand(-0.13, 0.13) * (1 - r);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const phi = Math.acos(rand(-1, 1));
      const th = rand(0, Math.PI * 2);

      const isCross = i < CROSS_N;
      const tgt = targets[i % targets.length];

      return {
        x, y, z,
        vx: 0, vy: 0, vz: 0,
        phi, th,
        size: isCross ? rand(1.0, 2.0) : rand(0.7, 1.4),
        alpha: isCross ? rand(0.55, 1.0) : rand(0.12, 0.5),
        tx: tgt.x,
        ty: tgt.y,
        isCross
      };
    });

    startTime = performance.now();
    lastNow = startTime;
    finished = false;
  }

  function project(p, cx, cy, scale, rotY, rotX) {
    const cyy = Math.cos(rotY);
    const syy = Math.sin(rotY);
    const x1 = p.x * cyy + p.z * syy;
    const z1 = -p.x * syy + p.z * cyy;

    const cxx = Math.cos(rotX);
    const sxx = Math.sin(rotX);
    const y2 = p.y * cxx - z1 * sxx;
    const z2 = p.y * sxx + z1 * cxx;

    const persp = 1.6;
    const k = scale / (persp - z2);
    return { sx: cx + x1 * k, sy: cy + y2 * k, z: z2 };
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `rgb(${BG.a.join(",")})`);
    g.addColorStop(0.5, `rgb(${BG.b.join(",")})`);
    g.addColorStop(1, `rgb(${BG.c.join(",")})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.min(W, H) * 0.3);
    rg.addColorStop(0, isMobile ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.16)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function getPhase(t) {
    if (t < DUR_GALAXY) return { id: 0, k: t / DUR_GALAXY };
    if (t < DUR_GALAXY + DUR_SPHERE) return { id: 1, k: (t - DUR_GALAXY) / DUR_SPHERE };
    if (t < DUR_GALAXY + DUR_SPHERE + DUR_IMPLODE) {
      return { id: 2, k: (t - DUR_GALAXY - DUR_SPHERE) / DUR_IMPLODE };
    }
    return { id: 3, k: (t - DUR_GALAXY - DUR_SPHERE - DUR_IMPLODE) / DUR_HOLD };
  }

  function springTo(p, tx, ty, tz, strength, damping, dt) {
    const ax = (tx - p.x) * strength;
    const ay = (ty - p.y) * strength;
    const az = (tz - p.z) * strength;

    p.vx = (p.vx + ax * dt) * damping;
    p.vy = (p.vy + ay * dt) * damping;
    p.vz = (p.vz + az * dt) * damping;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }

  function drawLogoOverlay(cx, cy, sizePx, alpha) {
    if (!logoImg.complete) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(255,255,255,0.45)";
    ctx.shadowBlur = (isMobile ? 10 : 16) * dpr;
    const x = cx - sizePx / 2;
    const y = cy - sizePx / 2;
    ctx.drawImage(logoImg, x, y, sizePx, sizePx);
    ctx.restore();
  }

  function step(now) {
    const dt = clamp((now - lastNow) / 1000, 0, 0.033);
    lastNow = now;
    const t = (now - startTime) / 1000;
    const tt = clamp(t, 0, TOTAL);
    const ph = getPhase(tt);

    drawBackground();

    const cx = W * 0.5;
    const cy = H * 0.47;

    const budget = particleBudget();
    const sphereRadiusPx = Math.min(W, H) * 0.19;
    const logoSize = Math.min(W, H) * (isMobile ? 0.46 : 0.4);

    const rotBrake = ph.id >= 2 ? lerp(1, 0.1, smooth(clamp((ph.k - 0.35) / 0.65, 0, 1))) : 1;
    const rotY = (tt * 3.2) * 0.18 * rotBrake;
    const rotX = (Math.sin(tt * 2.0) * 0.18) * rotBrake;

    const toSphere = ph.id === 0 ? smooth(ph.k) : 1;
    const implodeT = ph.id === 2 ? easeInOutCubic(ph.k) : (ph.id > 2 ? 1 : 0);
    const snap = ph.id === 3 ? 1 : clamp((implodeT - 0.88) / 0.12, 0, 1);
    const logoFade = ph.id === 2 ? smooth(clamp((ph.k - 0.55) / 0.45, 0, 1)) : (ph.id === 3 ? 1 : 0);
    const particlesDim = ph.id === 3 ? lerp(0.55, 0.2, smooth(ph.k)) : lerp(1, 0.55, logoFade);

    const projected = [];

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const th = p.th + tt * 2.1;
      const phi = p.phi;
      const sx = Math.cos(th) * Math.sin(phi);
      const sy = Math.cos(phi) * 0.85;
      const sz = Math.sin(th) * Math.sin(phi);

      const rr = Math.sqrt(p.x * p.x + p.z * p.z);
      const swirlAng = rr * 7.4 + tt * 6.0;
      const gx = Math.cos(swirlAng) * rr;
      const gz = Math.sin(swirlAng) * rr;
      const gy = p.y;

      let bx = lerp(gx, sx, toSphere);
      let by = lerp(gy, sy, toSphere);
      let bz = lerp(gz, sz, toSphere);

      const txN = p.tx / sphereRadiusPx;
      const tyN = p.ty / sphereRadiusPx;

      if (implodeT > 0) {
        if (p.isCross) {
          const strength = lerp(40, 95, implodeT);
          const damping = lerp(0.86, 0.8, implodeT);
          if (ph.id === 2 && implodeT < 0.08) {
            p.x = bx; p.y = by; p.z = bz;
            p.vx = p.vy = p.vz = 0;
          }
          springTo(p, txN, tyN, 0, strength, damping, dt);
          if (snap > 0) {
            p.x = lerp(p.x, txN, snap);
            p.y = lerp(p.y, tyN, snap);
            p.z = lerp(p.z, 0, snap);
            p.vx = p.vy = p.vz = 0;
          }
          bx = p.x; by = p.y; bz = p.z;
        } else {
          bx = lerp(bx, 0, implodeT);
          by = lerp(by, 0, implodeT);
          bz = lerp(bz, 0, implodeT);
        }
      }

      const breath = 1 + Math.sin(tt * 5.0 + i * 0.002) * 0.012;
      const pr = project({ x: bx, y: by, z: bz }, cx, cy, sphereRadiusPx * breath, rotY, rotX);

      let a = p.alpha;
      if (implodeT > 0) {
        if (p.isCross) a *= lerp(1.0, 1.35, implodeT);
        else a *= lerp(1.0, 0.02, smooth(implodeT));
      }
      a *= particlesDim;

      const sBoost = p.isCross ? lerp(1.0, 1.2, smooth(implodeT)) : 1.0;
      const size = (p.size * dpr) * (0.85 + pr.z * 0.0) * sBoost;

      projected.push({ x: pr.sx, y: pr.sy, z: pr.z, a: clamp(a, 0, 1), s: size, isCross: p.isCross });
    }

    projected.sort((a, b) => a.z - b.z);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    projected.forEach((q) => {
      if (q.a <= 0.002) return;
      ctx.globalAlpha = q.a;
      ctx.fillStyle = q.isCross ? "rgba(255,248,235,1)" : "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    if (implodeT > 0.7) {
      ctx.save();
      ctx.globalAlpha = (isMobile ? 0.14 : 0.2) * smooth(clamp((implodeT - 0.7) / 0.3, 0, 1));
      ctx.globalCompositeOperation = "screen";
      ctx.shadowColor = "rgba(255,255,255,0.60)";
      ctx.shadowBlur = budget.halo;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const logoHeightSvg = 420;
      const desiredLogoH = Math.min(H * 0.44, W * 0.44);
      const logoScale = desiredLogoH / logoHeightSvg;
      ctx.translate(cx, cy);
      crossCircles.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x * logoScale, c.y * logoScale, c.r * logoScale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (logoFade > 0) {
      drawLogoOverlay(cx, cy, logoSize, easeOutCubic(logoFade));
    }

    if (!finished && t >= TOTAL) {
      finished = true;
      return;
    }

    requestAnimationFrame(step);
  }

  init();
  requestAnimationFrame(step);
}

function initNamePrompt() {
  const name = getUserName();
  if (name) return;
  namePrompt.hidden = false;
  saveNameBtn.addEventListener("click", () => {
    const value = nameInput.value.trim();
    if (!value) return;
    setUserName(value);
    namePrompt.hidden = true;
  }, { once: true });
}

function getUserName() {
  return localStorage.getItem("userName");
}

function setUserName(name) {
  try {
    localStorage.setItem("userName", name);
  } catch {
    // ignore
  }
}

function closeSplash(timer) {
  if (timer) clearTimeout(timer);
  splash.hidden = true;
  initNamePrompt();
  showDailyVerse();
  showHelpIfFirstTime();
}

async function showDailyVerse() {
  let reference = "";
  let verseText = "";
  try {
    const verses = await fetchJson("daily_verses.json");
    if (!Array.isArray(verses) || !verses.length) {
      throw new Error("daily verses empty");
    }
    const dayIndex = dayOfYearIndex();
    const idx = dailyIndexForUser(dayIndex, verses.length);
    const verse = verses[idx];
    reference = sanitizeReferenceString(verse.reference || "");
    verseText = verse.text || "";
    if (!verseText && reference) {
      verseText = await fetchVerseByReference(reference, DAILY_VERSION);
    }
    if (verseText || reference) {
      writeDailyVerseCache({ text: verseText, reference, version: DAILY_VERSION });
    }
  } catch {
    const cached = readDailyVerseCache();
    if (cached) {
      verseText = cached.text || "";
      reference = cached.reference || "";
    }
  }
  const name = getUserName();
  if (name) {
    dailyGreeting.textContent = `Hola ${name}`;
    dailyGreeting.hidden = false;
  } else {
    dailyGreeting.hidden = true;
  }
  dailyText.textContent = verseText || "No se pudo cargar el versiculo.";
  if (reference) {
    dailyRef.textContent = `— ${reference} (${DAILY_VERSION})`;
  } else {
    dailyRef.textContent = "";
  }
  dailyVerse.hidden = false;
  dailyClose.addEventListener("click", closeDailyVerse, { once: true });
  dailyVerse.addEventListener("click", closeDailyVerse, { once: true });
  dailyVerse.addEventListener("touchstart", closeDailyVerse, { once: true });
}

function closeDailyVerse() {
  dailyVerse.hidden = true;
}

function openMenu() {
  if (!sideMenu) return;
  sideMenu.hidden = false;
}

function closeMenu() {
  if (!sideMenu) return;
  sideMenu.hidden = true;
}

function openHelp() {
  if (!helpOverlay) return;
  helpOverlay.hidden = false;
  trackEvent("open_help");
}

function closeHelp() {
  if (!helpOverlay) return;
  helpOverlay.hidden = true;
}

function showHelpIfFirstTime() {
  try {
    const seen = localStorage.getItem("helpSeen");
    if (seen) return;
    localStorage.setItem("helpSeen", "1");
    openHelp();
  } catch {
    openHelp();
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("fetch failed");
  return response.json();
}

async function fetchVerseByReference(reference, version) {
  const parsed = parseReference(reference);
  if (!parsed) return "";
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}:${parsed.verseStart}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;
  const fetchUrls = buildFetchUrls(url);
  const html = await fetchFirstHtml(fetchUrls, 7000);
  if (!html) return "";
  return parseHTML(html, parsed) || "";
}

function dayOfYearIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function shareVerseAsPng() {
  if (resultEl.hidden) return;
  const now = Date.now();
  if (now - lastShareAt < 2000) return;
  lastShareAt = now;
  trackEvent("share_png");

  const text = verseEl.textContent.trim();
  const reference = refEl.textContent.trim();
  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 1080;
  const height = 1350;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#1a120c";
  ctx.fillRect(0, 0, width, height);

  const lineHeight = 48;
  const textSize = 38;
  const refSize = 28;
  const refGap = 40;
  const refPaddingBottom = 120;

  ctx.fillStyle = "#fff7e6";
  ctx.font = `600 ${textSize}px 'Cormorant Garamond', serif`;
  const lines = wrapTextCentered(ctx, text, width, 0, width - 160, lineHeight);

  const textBlockHeight = lines.length * lineHeight;
  const refBlockHeight = refSize + refGap;
  const totalBlockHeight = textBlockHeight + refBlockHeight;
  const startY = Math.max(140, (height - totalBlockHeight - refPaddingBottom) / 2);
  wrapTextCentered(ctx, text, width, startY, width - 160, lineHeight, true);

  ctx.fillStyle = "#f39c12";
  ctx.font = `italic ${refSize}px 'Cormorant Garamond', serif`;
  const refY = Math.min(height - refPaddingBottom, startY + textBlockHeight + refGap);
  drawCenteredText(ctx, reference, width, refY);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "bibleapp.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "BibleApp" });
        return;
      } catch {
        // fall back to download
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bibleapp.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function wrapTextCentered(ctx, text, totalWidth, y, maxWidth, lineHeight, draw = false) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      if (draw) {
        drawCenteredText(ctx, line.trim(), totalWidth, y + lines * lineHeight);
      }
      line = words[i] + " ";
      lines += 1;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    if (draw) {
      drawCenteredText(ctx, line.trim(), totalWidth, y + lines * lineHeight);
    }
    lines += 1;
  }
  return new Array(lines);
}

function drawCenteredText(ctx, text, totalWidth, y) {
  const metrics = ctx.measureText(text);
  const x = (totalWidth - metrics.width) / 2;
  ctx.fillText(text, x, y);
}

function buildCacheKey(parsed, version) {
  return `verse:${parsed.book}:${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}:${version}`;
}

function buildChapterCacheKey(parsed, version) {
  return `chapter:${parsed.book}:${parsed.chapter}:${version}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    // ignore cache failures
  }
}
