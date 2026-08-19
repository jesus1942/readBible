(function (global) {
  "use strict";

  const DEUTEROCANONICAL_BOOKS = [
    "Tobías",
    "Judit",
    "Sabiduría",
    "Eclesiástico",
    "Baruc",
    "1 Macabeos",
    "2 Macabeos"
  ];
  const OTHER_ANCIENT_BOOKS = ["1 Enoc"];
  const ANCIENT_BOOKS = [...DEUTEROCANONICAL_BOOKS, ...OTHER_ANCIENT_BOOKS];
  const ANCIENT_BOOK_CHAPTERS = {
    "Tobías": 14,
    "Judit": 16,
    "Sabiduría": 19,
    "Eclesiástico": 51,
    "Baruc": 6,
    "1 Macabeos": 16,
    "2 Macabeos": 15,
    "1 Enoc": 108
  };

  const ENOCH_ES_VERSION = "ENOC-RB-ES-1";
  const ENOCH_EN_VERSION = "ENOC-RHC-1917";
  const ENOCH_VERSION = ENOCH_ES_VERSION;
  const ENOCH_ES_LABEL = "ReadBible · español";
  const ENOCH_EN_LABEL = "R.H. Charles 1917 · inglés";
  const ENOCH_ES_FILES = [
    { from: 1, to: 36, path: "data/enoch-es-01-36.tsv", url: "data/enoch-es-01-36.tsv?v=1" },
    { from: 37, to: 71, path: "data/enoch-es-37-71.tsv", url: "data/enoch-es-37-71.tsv?v=1" },
    { from: 72, to: 90, path: "data/enoch-es-72-90.tsv", url: "data/enoch-es-72-90.tsv?v=1" },
    { from: 91, to: 108, path: "data/enoch-es-91-108.tsv", url: "data/enoch-es-91-108.tsv?v=1" }
  ];
  const DEUTEROCANONICAL_FALLBACK_VERSION = "DHH";
  const DEUTEROCANONICAL_VERSIONS = new Set(["DHH", "TLA"]);
  const enochSpanishChapterCache = new Map();
  const enochEnglishChapterCache = new Map();
  const enochSpanishFileCache = new Map();

  function normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  const BOOK_ALIASES = new Map([
    ["tobias", "Tobías"],
    ["tobit", "Tobías"],
    ["judit", "Judit"],
    ["judith", "Judit"],
    ["sabiduria", "Sabiduría"],
    ["wisdom", "Sabiduría"],
    ["eclesiastico", "Eclesiástico"],
    ["siracida", "Eclesiástico"],
    ["sirac", "Eclesiástico"],
    ["sirach", "Eclesiástico"],
    ["baruc", "Baruc"],
    ["baruch", "Baruc"],
    ["1macabeos", "1 Macabeos"],
    ["1macabeo", "1 Macabeos"],
    ["1maccabees", "1 Macabeos"],
    ["2macabeos", "2 Macabeos"],
    ["2macabeo", "2 Macabeos"],
    ["2maccabees", "2 Macabeos"],
    ["enoc", "1 Enoc"],
    ["henoc", "1 Enoc"],
    ["1enoc", "1 Enoc"],
    ["1henoc", "1 Enoc"],
    ["enoch", "1 Enoc"],
    ["1enoch", "1 Enoc"]
  ]);

  ANCIENT_BOOKS.forEach((book) => BOOK_ALIASES.set(normalizeKey(book), book));

  function canonicalBookName(book) {
    return BOOK_ALIASES.get(normalizeKey(book)) || String(book || "").trim();
  }

  function isEnochBook(book) {
    return canonicalBookName(book) === "1 Enoc";
  }

  function isDeuterocanonicalBook(book) {
    return DEUTEROCANONICAL_BOOKS.includes(canonicalBookName(book));
  }

  function isAncientBook(book) {
    const canonical = canonicalBookName(book);
    return ANCIENT_BOOKS.includes(canonical);
  }

  function chapterPageTitle(chapter) {
    const value = Number(chapter);
    if (!Number.isInteger(value) || value < 1 || value > 108) {
      throw new RangeError("1 Enoc tiene capítulos del 1 al 108.");
    }
    return `The_Book_of_Enoch_(Charles)/Chapter_${String(value).padStart(2, "0")}`;
  }

  function extractVerseMapFromText(text) {
    const normalized = String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\t\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return {};

    const marker = /(?:^|\s)(\d{1,3})\.\s+/g;
    const matches = Array.from(normalized.matchAll(marker));
    const verses = {};
    matches.forEach((match, index) => {
      const number = Number(match[1]);
      if (!Number.isInteger(number) || number < 1) return;
      const start = Number(match.index) + match[0].length;
      const next = matches[index + 1];
      const end = next ? Number(next.index) : normalized.length;
      const content = normalized.slice(start, end).trim();
      if (content && !verses[number]) verses[number] = content;
    });
    return verses;
  }

  function parseEnochTsv(text) {
    const chapters = {};
    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trimEnd();
      if (!line || line.trimStart().startsWith("#")) return;
      const tab = line.indexOf("\t");
      if (tab <= 0) return;
      const ref = line.slice(0, tab).trim();
      const body = line.slice(tab + 1).trim();
      const match = ref.match(/^(\d{1,3}):(\d{1,3})$/);
      if (!match || !body) return;
      const chapter = Number(match[1]);
      const verse = Number(match[2]);
      if (!Number.isInteger(chapter) || chapter < 1 || chapter > 108) return;
      if (!Number.isInteger(verse) || verse < 1) return;
      if (!chapters[chapter]) chapters[chapter] = {};
      chapters[chapter][verse] = body;
    });
    return chapters;
  }

  function selectVerseRange(verses, verseStart, verseEnd) {
    const start = Number(verseStart);
    const end = Number(verseEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) return "";
    const parts = [];
    for (let verse = start; verse <= end; verse += 1) {
      const text = verses && verses[verse] ? String(verses[verse]).trim() : "";
      if (!text) return "";
      parts.push(text);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function verseCountFromMap(verses) {
    const numbers = Object.keys(verses || {}).map(Number).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) : 0;
  }

  function spanishFileForChapter(chapter) {
    const value = Number(chapter);
    return ENOCH_ES_FILES.find((file) => value >= file.from && value <= file.to) || null;
  }

  const api = {
    DEUTEROCANONICAL_BOOKS,
    OTHER_ANCIENT_BOOKS,
    ANCIENT_BOOKS,
    ANCIENT_BOOK_CHAPTERS,
    ENOCH_VERSION,
    ENOCH_ES_VERSION,
    ENOCH_EN_VERSION,
    ENOCH_ES_FILES,
    normalizeKey,
    canonicalBookName,
    isEnochBook,
    isDeuterocanonicalBook,
    isAncientBook,
    chapterPageTitle,
    extractVerseMapFromText,
    parseEnochTsv,
    selectVerseRange,
    verseCountFromMap,
    spanishFileForChapter
  };

  global.ReadBibleApocrypha = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document === "undefined" || typeof window === "undefined") return;

  function readEnochLanguage() {
    try {
      return localStorage.getItem("enochLanguage") === "en" ? "en" : "es";
    } catch {
      return "es";
    }
  }

  let enochLanguage = readEnochLanguage();

  function setEnochLanguage(language) {
    enochLanguage = language === "en" ? "en" : "es";
    try {
      localStorage.setItem("enochLanguage", enochLanguage);
    } catch {
      // ignore storage errors
    }
    refreshEnochLanguageToggle();
  }

  function enochVersionForLanguage(language) {
    return language === "en" ? ENOCH_EN_VERSION : ENOCH_ES_VERSION;
  }

  function enochLabelForLanguage(language) {
    return language === "en" ? ENOCH_EN_LABEL : ENOCH_ES_LABEL;
  }

  function normalizedBookIndex(book) {
    const key = normalizeKey(book);
    return BOOKS.findIndex((item) => normalizeKey(item) === key);
  }

  function canonicalParsedReference(parsed) {
    if (!parsed) return null;
    const displayBook = canonicalBookName(parsed.book);
    const internalBook = displayBook.replace(/^(\d)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1$2");
    return { ...parsed, book: internalBook };
  }

  function sourceNoteElement() {
    let note = document.getElementById("ancientSourceNote");
    if (note) return note;
    note = document.createElement("p");
    note.id = "ancientSourceNote";
    note.className = "status";
    note.style.marginTop = "10px";
    note.style.fontSize = "0.82rem";
    note.style.lineHeight = "1.35";
    note.hidden = true;
    if (resultDevotionalBtn && resultDevotionalBtn.parentNode) {
      resultDevotionalBtn.parentNode.insertBefore(note, resultDevotionalBtn);
    } else if (resultEl) {
      resultEl.appendChild(note);
    }
    return note;
  }

  function enochLanguageToggleElement() {
    let button = document.getElementById("enochLanguageToggle");
    if (button) return button;
    button = document.createElement("button");
    button.id = "enochLanguageToggle";
    button.className = "ghost";
    button.type = "button";
    button.style.marginTop = "8px";
    button.style.width = "100%";
    button.hidden = true;
    const note = sourceNoteElement();
    if (note.parentNode) note.insertAdjacentElement("afterend", button);
    button.addEventListener("click", async () => {
      const parsed = parseReference(queryInput.value);
      if (!parsed || !isEnochBook(parsed.book)) return;
      setEnochLanguage(enochLanguage === "es" ? "en" : "es");
      if (currentResultMode === "chapter") {
        await fetchEnochFullChapter(parsed);
      } else {
        await fetchEnochVerse(parsed);
      }
    });
    return button;
  }

  function refreshEnochLanguageToggle() {
    const button = document.getElementById("enochLanguageToggle");
    if (!button) return;
    button.textContent = enochLanguage === "es" ? "Ver original en inglés" : "Ver traducción en español";
  }

  function showEnochLanguageToggle() {
    const button = enochLanguageToggleElement();
    refreshEnochLanguageToggle();
    button.hidden = false;
  }

  function hideEnochLanguageToggle() {
    const button = document.getElementById("enochLanguageToggle");
    if (button) button.hidden = true;
  }

  function showSourceNote(text) {
    const note = sourceNoteElement();
    note.textContent = text;
    note.hidden = false;
  }

  function hideSourceNote() {
    const note = document.getElementById("ancientSourceNote");
    if (note) note.hidden = true;
    hideEnochLanguageToggle();
  }

  function showEnochSourceNote(language, fallbackToEnglish = false) {
    if (language === "es") {
      showSourceNote("1 Enoc · Traducción propia de ReadBible al español basada en R.H. Charles (1917), texto fuente de dominio público. Canon etíope; apócrifo/pseudoepígrafo en otras tradiciones.");
    } else if (fallbackToEnglish) {
      showSourceNote("No se pudo cargar la traducción local en español. Mostrando el original inglés de R.H. Charles (1917), de dominio público, desde Wikisource.");
    } else {
      showSourceNote("1 Enoc · Original inglés de R.H. Charles (1917), texto de dominio público. Canon etíope; apócrifo/pseudoepígrafo en otras tradiciones. Fuente: Wikisource.");
    }
    showEnochLanguageToggle();
  }

  function enochApiUrl(chapter) {
    const params = new URLSearchParams({
      action: "parse",
      page: chapterPageTitle(chapter),
      prop: "text",
      format: "json",
      origin: "*"
    });
    return `https://en.wikisource.org/w/api.php?${params.toString()}`;
  }

  function verseMapFromWikisourceHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const root = doc.querySelector(".mw-parser-output") || doc.body;
    root.querySelectorAll(
      "script, style, table, nav, .mw-editsection, .ws-noexport, .references, .licenseContainer, .printfooter"
    ).forEach((node) => node.remove());
    return extractVerseMapFromText(root.textContent || "");
  }

  async function fetchEnochSpanishChapterMap(chapter) {
    const value = Number(chapter);
    chapterPageTitle(value);
    if (enochSpanishChapterCache.has(value)) return enochSpanishChapterCache.get(value);
    const file = spanishFileForChapter(value);
    if (!file) throw new Error("No se encontró el paquete español de este capítulo.");

    let chapters = enochSpanishFileCache.get(file.path);
    if (!chapters) {
      const response = await fetch(file.url, { cache: "force-cache" });
      if (!response.ok) throw new Error("No se pudo cargar la traducción local de 1 Enoc.");
      chapters = parseEnochTsv(await response.text());
      enochSpanishFileCache.set(file.path, chapters);
    }
    const verses = chapters[value] || {};
    if (!verseCountFromMap(verses)) throw new Error("La traducción local no contiene este capítulo.");
    enochSpanishChapterCache.set(value, verses);
    return verses;
  }

  async function fetchEnochEnglishChapterMap(chapter) {
    const value = Number(chapter);
    chapterPageTitle(value);
    if (enochEnglishChapterCache.has(value)) return enochEnglishChapterCache.get(value);

    const response = await fetch(enochApiUrl(value), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("No se pudo leer el original de 1 Enoc desde Wikisource.");
    const payload = await response.json();
    const html = payload && payload.parse && payload.parse.text ? payload.parse.text["*"] : "";
    if (!html) throw new Error("Wikisource no devolvió el capítulo solicitado.");
    const verses = verseMapFromWikisourceHtml(html);
    if (!verseCountFromMap(verses)) throw new Error("No se pudieron identificar los versículos del original de 1 Enoc.");
    enochEnglishChapterCache.set(value, verses);
    return verses;
  }

  async function loadEnochChapter(chapter, preferredLanguage = enochLanguage) {
    if (preferredLanguage === "en") {
      return { verses: await fetchEnochEnglishChapterMap(chapter), language: "en", fallback: false };
    }
    try {
      return { verses: await fetchEnochSpanishChapterMap(chapter), language: "es", fallback: false };
    } catch (spanishError) {
      try {
        return { verses: await fetchEnochEnglishChapterMap(chapter), language: "en", fallback: true };
      } catch {
        throw spanishError;
      }
    }
  }

  function buildEnochReference(parsed, chapterOnly, language) {
    const book = "1 Enoc";
    const label = enochLabelForLanguage(language);
    if (chapterOnly) return `${book} ${parsed.chapter} (${label})`;
    const versePart = parsed.verseEnd > parsed.verseStart
      ? `${parsed.verseStart}-${parsed.verseEnd}`
      : `${parsed.verseStart}`;
    return `${book} ${parsed.chapter}:${versePart} (${label})`;
  }

  function setCurrentEnochContext(parsed, mode, language) {
    const version = enochVersionForLanguage(language);
    currentStudyParsed = parsed;
    currentStudyVersion = version;
    currentResultMode = mode;
    currentResultVersion = version;
    currentResultKey = mode === "chapter"
      ? buildChapterCacheKey(parsed, version)
      : buildCacheKey(parsed, version);
    return version;
  }

  async function fetchEnochVerse(parsed) {
    const canonical = canonicalParsedReference(parsed);
    if (!canonical) return false;
    if (canonical.chapter < 1 || canonical.chapter > ANCIENT_BOOK_CHAPTERS["1 Enoc"]) {
      showStatus("1 Enoc tiene capítulos del 1 al 108.", true);
      return false;
    }

    queryInput.value = buildReferenceInput("1 Enoc", canonical.chapter, canonical.verseStart, canonical.verseEnd);
    const preferredLanguage = enochLanguage;
    const preferredVersion = setCurrentEnochContext(canonical, "verse", preferredLanguage);
    trackEvent("search_ancient_verse", { book: "1 Enoc", chapter: canonical.chapter, language: preferredLanguage });

    const preferredKey = buildCacheKey(canonical, preferredVersion);
    const cached = readCache(preferredKey);
    if (cached) {
      currentResultKey = preferredKey;
      showResult(cached.text, cached.reference);
      showEnochSourceNote(preferredLanguage, false);
      return true;
    }

    showStatus(preferredLanguage === "es" ? "Abriendo 1 Enoc en español..." : "Buscando el original de 1 Enoc...", false);
    try {
      const loaded = await loadEnochChapter(canonical.chapter, preferredLanguage);
      const text = selectVerseRange(loaded.verses, canonical.verseStart, canonical.verseEnd);
      if (!text) {
        showStatus("No existe ese versículo en 1 Enoc.", true);
        return false;
      }
      const actualVersion = setCurrentEnochContext(canonical, "verse", loaded.language);
      const cacheKey = buildCacheKey(canonical, actualVersion);
      const actualCached = readCache(cacheKey);
      if (actualCached) {
        currentResultKey = cacheKey;
        showResult(actualCached.text, actualCached.reference);
        showEnochSourceNote(loaded.language, loaded.fallback);
        return true;
      }
      const reference = buildEnochReference(canonical, false, loaded.language);
      writeCache(cacheKey, { text, reference });
      showResult(text, reference);
      showEnochSourceNote(loaded.language, loaded.fallback);
      return true;
    } catch (error) {
      showStatus(error && error.message ? error.message : "No se pudo obtener 1 Enoc.", true);
      return false;
    }
  }

  async function fetchEnochFullChapter(parsed) {
    const canonical = canonicalParsedReference(parsed);
    if (!canonical) return false;
    if (canonical.chapter < 1 || canonical.chapter > ANCIENT_BOOK_CHAPTERS["1 Enoc"]) {
      showStatus("1 Enoc tiene capítulos del 1 al 108.", true);
      return false;
    }

    queryInput.value = buildReferenceInput("1 Enoc", canonical.chapter, canonical.verseStart, canonical.verseEnd);
    const preferredLanguage = enochLanguage;
    const preferredVersion = setCurrentEnochContext(canonical, "chapter", preferredLanguage);
    trackEvent("search_ancient_chapter", { book: "1 Enoc", chapter: canonical.chapter, language: preferredLanguage });

    const preferredKey = buildChapterCacheKey(canonical, preferredVersion);
    const cached = readCache(preferredKey);
    if (cached) {
      currentResultKey = preferredKey;
      showResult(cached.text, cached.reference);
      showEnochSourceNote(preferredLanguage, false);
      return true;
    }

    showStatus(preferredLanguage === "es" ? "Abriendo capítulo de 1 Enoc en español..." : "Buscando capítulo original de 1 Enoc...", false);
    try {
      const loaded = await loadEnochChapter(canonical.chapter, preferredLanguage);
      const verseNumbers = Object.keys(loaded.verses).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      const text = verseNumbers.map((verse) => `${verse}. ${loaded.verses[verse]}`).join(" ").trim();
      if (!text) {
        showStatus("No se pudo leer ese capítulo de 1 Enoc.", true);
        return false;
      }
      const actualVersion = setCurrentEnochContext(canonical, "chapter", loaded.language);
      const cacheKey = buildChapterCacheKey(canonical, actualVersion);
      const actualCached = readCache(cacheKey);
      if (actualCached) {
        currentResultKey = cacheKey;
        showResult(actualCached.text, actualCached.reference);
        showEnochSourceNote(loaded.language, loaded.fallback);
        return true;
      }
      const reference = buildEnochReference(canonical, true, loaded.language);
      writeCache(cacheKey, { text, reference });
      showResult(text, reference);
      showEnochSourceNote(loaded.language, loaded.fallback);
      return true;
    } catch (error) {
      showStatus(error && error.message ? error.message : "No se pudo obtener 1 Enoc.", true);
      return false;
    }
  }

  function normalizeAncientQuery(parsed) {
    const canonical = canonicalBookName(parsed.book);
    queryInput.value = buildReferenceInput(canonical, parsed.chapter, parsed.verseStart, parsed.verseEnd);
    return canonical;
  }

  function ensureDeuterocanonicalVersion() {
    const selected = versionSelect.value || DAILY_VERSION;
    if (DEUTEROCANONICAL_VERSIONS.has(selected)) {
      return { selected, effective: selected, changed: false };
    }
    versionSelect.value = DEUTEROCANONICAL_FALLBACK_VERSION;
    return { selected, effective: DEUTEROCANONICAL_FALLBACK_VERSION, changed: true };
  }

  function showDeuterocanonicalNote(versionInfo) {
    hideEnochLanguageToggle();
    if (versionInfo.changed) {
      showSourceNote(`Libro deuterocanónico · no disponible en ${versionInfo.selected}; mostrando ${versionInfo.effective} desde BibleGateway.`);
      return;
    }
    showSourceNote(`Libro deuterocanónico · ${versionInfo.effective} · contenido obtenido mediante BibleGateway.`);
  }

  const baseFetchVerse = fetchVerse;
  fetchVerse = async function fetchVerseWithAncientBooks() {
    const parsed = parseReference(queryInput.value);
    if (!parsed || !isAncientBook(parsed.book)) {
      hideSourceNote();
      return baseFetchVerse();
    }
    if (isEnochBook(parsed.book)) return fetchEnochVerse(parsed);

    normalizeAncientQuery(parsed);
    const versionInfo = ensureDeuterocanonicalVersion();
    const ok = await baseFetchVerse();
    if (ok) showDeuterocanonicalNote(versionInfo);
    return ok;
  };

  const baseFetchChapter = fetchChapter;
  fetchChapter = async function fetchChapterWithAncientBooks() {
    const parsed = parseReference(queryInput.value);
    if (!parsed || !isAncientBook(parsed.book)) {
      hideSourceNote();
      return baseFetchChapter();
    }
    if (isEnochBook(parsed.book)) return fetchEnochFullChapter(parsed);

    normalizeAncientQuery(parsed);
    const versionInfo = ensureDeuterocanonicalVersion();
    await baseFetchChapter();
    if (!resultEl.hidden) showDeuterocanonicalNote(versionInfo);
    return !resultEl.hidden;
  };

  const baseFetchVerseCount = fetchVerseCount;
  fetchVerseCount = async function fetchVerseCountWithAncientBooks(book, chapter, version) {
    if (isEnochBook(book)) {
      try {
        const verses = await fetchEnochSpanishChapterMap(chapter);
        return verseCountFromMap(verses) || null;
      } catch {
        try {
          const verses = await fetchEnochEnglishChapterMap(chapter);
          return verseCountFromMap(verses) || null;
        } catch {
          return null;
        }
      }
    }
    if (isDeuterocanonicalBook(book)) {
      const effective = DEUTEROCANONICAL_VERSIONS.has(version) ? version : DEUTEROCANONICAL_FALLBACK_VERSION;
      return baseFetchVerseCount(canonicalBookName(book), chapter, effective);
    }
    return baseFetchVerseCount(book, chapter, version);
  };

  // Los libros adicionales participan del selector y de la navegación existente.
  ANCIENT_BOOKS.forEach((book) => {
    if (normalizedBookIndex(book) === -1) BOOKS.push(book);
    BOOK_CHAPTERS[book] = ANCIENT_BOOK_CHAPTERS[book];
  });

  const baseGetCurrentPickerBooks = getCurrentPickerBooks;
  getCurrentPickerBooks = function getCurrentPickerBooksWithAncient() {
    if (pickerTestament === "ancient") return ANCIENT_BOOKS;
    return baseGetCurrentPickerBooks();
  };

  let pickerAncient = document.getElementById("pickerAncient");
  if (!pickerAncient && pickerNew && pickerNew.parentNode) {
    pickerAncient = document.createElement("button");
    pickerAncient.id = "pickerAncient";
    pickerAncient.className = "picker-tab";
    pickerAncient.type = "button";
    pickerAncient.setAttribute("aria-pressed", "false");
    pickerAncient.textContent = "Otros";
    pickerNew.insertAdjacentElement("afterend", pickerAncient);
    pickerNew.parentElement.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    pickerAncient.addEventListener("click", () => setPickerTestament("ancient"));
  }

  const baseUpdatePickerTestamentButtons = updatePickerTestamentButtons;
  updatePickerTestamentButtons = function updatePickerTestamentButtonsWithAncient() {
    baseUpdatePickerTestamentButtons();
    if (pickerAncient) {
      const active = pickerTestament === "ancient";
      pickerAncient.classList.toggle("active", active);
      pickerAncient.setAttribute("aria-pressed", active ? "true" : "false");
    }
  };

  const baseInitPickerStateFromInput = initPickerStateFromInput;
  initPickerStateFromInput = async function initPickerStateFromInputWithAncient() {
    const parsed = parseReference(queryInput.value);
    if (parsed && isAncientBook(parsed.book)) {
      const canonical = canonicalBookName(parsed.book);
      const index = normalizedBookIndex(canonical);
      if (index >= 0) pickerState.bookIndex = index;
      pickerState.chapter = parsed.chapter;
      pickerState.verse = parsed.verseStart;
      pickerTestament = "ancient";
      updatePickerBooks();
      updatePickerChapters();
      await updatePickerVerses();
      return;
    }
    return baseInitPickerStateFromInput();
  };

  const baseUpdateSuggestions = updateSuggestions;
  updateSuggestions = function updateSuggestionsWithAncient() {
    baseUpdateSuggestions();
    if (!querySuggestions) return;
    const input = normalizeForMatch(queryInput.value || "");
    if (!input) return;
    const matches = ANCIENT_BOOKS.filter((book) => normalizeForMatch(book).startsWith(input)).slice(0, RECENT_LIMIT);
    if (!matches.length) return;
    const group = buildSuggestionGroup("Otros libros antiguos", matches.map((book) => `${book} `));
    querySuggestions.insertAdjacentHTML("beforeend", group);
    querySuggestions.hidden = false;
  };

  const baseRenderNotesIndex = renderNotesIndex;
  renderNotesIndex = function renderNotesIndexWithAncient() {
    baseRenderNotesIndex();
    if (!notesList) return;
    const ancientButtons = Array.from(notesList.querySelectorAll("button.note-link[data-study-key]"))
      .filter((button) => {
        const parsed = parseStudyKey(button.dataset.studyKey || "");
        return parsed && isAncientBook(parsed.book);
      });
    if (!ancientButtons.length) return;

    ancientButtons.forEach((button) => button.remove());
    Array.from(notesList.querySelectorAll(".notes-group")).forEach((heading) => {
      let node = heading.nextElementSibling;
      let hasNote = false;
      while (node && !node.classList.contains("notes-group")) {
        if (node.matches("button.note-link")) hasNote = true;
        node = node.nextElementSibling;
      }
      if (!hasNote) heading.remove();
    });

    const heading = document.createElement("div");
    heading.className = "notes-group";
    heading.textContent = "Otros libros antiguos";
    notesList.appendChild(heading);
    ancientButtons.forEach((button) => notesList.appendChild(button));
  };

  const baseOpenBookmark = openBookmark;
  openBookmark = function openBookmarkWithEnochLanguage(id) {
    const bookmark = readBookmarks().find((item) => item.id === id);
    if (bookmark && isEnochBook((parseReference(bookmark.query) || {}).book)) {
      if (bookmark.version === ENOCH_EN_VERSION) setEnochLanguage("en");
      if (bookmark.version === ENOCH_ES_VERSION) setEnochLanguage("es");
    }
    return baseOpenBookmark(id);
  };

  const baseOpenNoteFromIndex = openNoteFromIndex;
  openNoteFromIndex = function openNoteFromIndexWithEnochLanguage(key) {
    const parsed = parseStudyKey(key);
    if (parsed && isEnochBook(parsed.book)) {
      if (parsed.version === ENOCH_EN_VERSION) setEnochLanguage("en");
      if (parsed.version === ENOCH_ES_VERSION) setEnochLanguage("es");
    }
    return baseOpenNoteFromIndex(key);
  };

  // Los listeners originales de Buscar/Capítulo capturaron la función anterior.
  // En los libros antiguos interceptamos antes de que ese listener se ejecute.
  const searchButton = document.getElementById("searchBtn");
  const chapterButton = document.getElementById("chapterBtn");
  if (searchButton) {
    searchButton.addEventListener("click", (event) => {
      const parsed = parseReference(queryInput.value);
      if (!parsed || !isAncientBook(parsed.book)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      fetchVerse();
    }, true);
  }
  if (chapterButton) {
    chapterButton.addEventListener("click", (event) => {
      const parsed = parseReference(queryInput.value);
      if (!parsed || !isAncientBook(parsed.book)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      fetchChapter();
    }, true);
  }

  enochLanguageToggleElement();
  refreshEnochLanguageToggle();
  renderNotesIndex();
})(typeof globalThis !== "undefined" ? globalThis : window);
