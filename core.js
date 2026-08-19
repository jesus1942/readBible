(function (global) {
  function normalizeReferenceInput(text) {
    return text.replace(/\s+/g, " ").trim().replace(/^(\d)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1$2");
  }

  function normalizeBookAlias(book) {
    const trimmed = String(book || "").replace(/\s+/g, " ").trim();
    const lower = trimmed.toLowerCase();
    if (lower === "salmo" || lower === "sal") return "Salmos";
    return trimmed;
  }

  function parseReference(text) {
    const normalized = normalizeReferenceInput(text);
    const pattern = /^([0-9]?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/;
    const match = normalized.match(pattern);
    if (!match) return null;
    const book = normalizeBookAlias(match[1]);
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

  function buildReferenceInput(book, chapter, verseStart, verseEnd) {
    const bookDisplay = formatBookDisplay(book);
    const versePart = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
    return `${bookDisplay} ${chapter}:${versePart}`;
  }

  function sanitizeReferenceString(reference) {
    if (!reference) return "";
    let cleaned = reference.split(";")[0].trim();
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned;
  }

  function buildCacheKey(parsed, version) {
    return `verse:${parsed.book}:${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}:${version}`;
  }

  function buildChapterCacheKey(parsed, version) {
    return `chapter:${parsed.book}:${parsed.chapter}:${version}`;
  }

  function parseStudyKey(key) {
    if (!key || !key.startsWith("study:verse:")) return null;
    const parts = key.split(":");
    if (parts.length < 6) return null;
    const book = parts[2];
    const chapter = Number(parts[3]);
    if (!Number.isFinite(chapter)) return null;
    const verseRange = parts[4];
    const version = parts.slice(5).join(":");
    const [startRaw, endRaw] = verseRange.split("-");
    const verseStart = Number(startRaw);
    const verseEnd = Number(endRaw || startRaw);
    if (!Number.isFinite(verseStart) || !Number.isFinite(verseEnd)) return null;
    return { book, chapter, verseStart, verseEnd, version };
  }

  const api = {
    normalizeReferenceInput,
    parseReference,
    formatBookDisplay,
    buildReference,
    buildReferenceInput,
    sanitizeReferenceString,
    buildCacheKey,
    buildChapterCacheKey,
    parseStudyKey,
    normalizeBookAlias
  };

  global.ReadBibleCore = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  // La extension de libros antiguos se carga despues de app.js para poder
  // reutilizar el buscador, el selector, marcadores, notas y navegacion.
  function loadAncientBooksExtension() {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-readbible-apocrypha="1"]')) return;
    const script = document.createElement("script");
    script.src = "apocrypha.js?v=2";
    script.async = false;
    script.dataset.readbibleApocrypha = "1";
    document.body.appendChild(script);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadAncientBooksExtension, { once: true });
    } else {
      loadAncientBooksExtension();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
