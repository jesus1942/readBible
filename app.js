const versions = [
  "RVR1960", "NVI", "LBLA", "NRSV", "DHH", "TLA",
  "NBD", "BLPH", "JBS", "PDT", "NTV", "RVR2000", "NBLA",
  "ARA", "ARC", "NVI-PT", "NTLH", "NVT", "TB"
];

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const DAILY_VERSION = "RVR1960";

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

function cleanText(text) {
  let cleaned = text;
  unwantedTexts.forEach((u) => {
    cleaned = cleaned.replaceAll(u, "");
  });
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
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

async function fetchVerse() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) {
    showStatus("Formato invalido. Usa Libro Capitulo:Verso", true);
    return;
  }

  const version = versionSelect.value;
  currentStudyParsed = parsed;
  currentStudyVersion = version;
  trackEvent("search_chapter", { version, query: queryInput.value.trim() });
  trackEvent("search_verse", { version, query: queryInput.value.trim() });
  const verseQuery = parsed.verseEnd > parsed.verseStart
    ? `${parsed.verseStart}-${parsed.verseEnd}`
    : `${parsed.verseStart}`;
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}:${verseQuery}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;

  const cacheKey = buildCacheKey(parsed, version);
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

  const version = versionSelect.value;
  currentStudyParsed = parsed;
  currentStudyVersion = version;
  const bookQuery = formatBookDisplay(parsed.book);
  const search = `${bookQuery} ${parsed.chapter}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;

  const cacheKey = buildChapterCacheKey(parsed, version);
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
  verseEl.textContent = text;
  refEl.textContent = `— ${reference}`;
  resultEl.hidden = false;
  if (isZenOpen) {
    zenText.textContent = text;
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
  zenText.textContent = verseEl.textContent;
  zenRef.textContent = refEl.textContent;
  zenOverlay.hidden = false;
  isZenOpen = true;
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
  resultEl.classList.add("no-select");
  studyPressTimer = setTimeout(() => {
    studyPressTimer = null;
    if (!studyPressActive) return;
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
window.addEventListener("appinstalled", () => {
  trackEvent("app_installed");
});

initVersions();
restoreLastQuery();
initSplash();
function buildFetchUrls(url) {
  const encoded = encodeURIComponent(url);
  const urls = [
    `${location.origin}/proxy?url=${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
    `https://corsproxy.io/?${encoded}`
  ];
  if (location.hostname.endsWith("github.io")) {
    return urls.slice(1);
  }
  return urls;
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
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("bad response");
    const text = await response.text();
    if (!text || text.length <= 500) throw new Error("short response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFirstHtml(urls, timeoutMs) {
  const controllers = urls.map(() => new AbortController());
  try {
    const attempts = urls.map((url, index) =>
      fetchWithTimeout(url, timeoutMs, controllers[index])
    );
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
  try {
    const verses = await fetchJson("daily_verses.json");
    const dayIndex = dayOfYearIndex();
    const verse = verses[dayIndex % verses.length];
    const reference = sanitizeReferenceString(verse.reference || "");
    let verseText = verse.text || "";
    if (!verseText && reference) {
      verseText = await fetchVerseByReference(reference, DAILY_VERSION);
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
  } catch {
    // ignore daily verse errors
  }
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
