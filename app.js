const versions = [
  "RVR1960", "NVI", "LBLA", "NRSV", "DHH", "TLA",
  "NBD", "BLPH", "JBS", "PDT", "NTV", "RVR2000", "NBLA"
];

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

const zenOverlay = document.getElementById("zenOverlay");
const zenText = document.getElementById("zenText");
const zenRef = document.getElementById("zenRef");
const zenClose = document.getElementById("zenClose");
let touchStartX = 0;
let touchStartY = 0;
let isZenOpen = false;

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

async function fetchVerse() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) {
    showStatus("Formato invalido. Usa Libro Capitulo:Verso", true);
    return;
  }

  const version = versionSelect.value;
  const search = `${parsed.book} ${parsed.chapter}:${parsed.verseStart}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;

  const proxyBase = getProxyBase();
  const fetchUrl = `${proxyBase}${encodeURIComponent(url)}`;

  showStatus("Buscando...", false);
  try {
    const response = await fetch(fetchUrl);
    const html = await response.text();
    const verseText = parseHTML(html, parsed);
    if (!verseText) {
      showStatus("No se pudo extraer el versiculo.", true);
      return;
    }
    const reference = buildReference(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd, version);
    showResult(verseText, reference);
  } catch (err) {
    showStatus("Error de red al conectar con el servidor local.", true);
  }
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

function openZen() {
  if (resultEl.hidden) return;
  zenText.textContent = verseEl.textContent;
  zenRef.textContent = refEl.textContent;
  zenOverlay.hidden = false;
  isZenOpen = true;
}

function closeZen() {
  zenOverlay.hidden = true;
  isZenOpen = false;
}


document.getElementById("searchBtn").addEventListener("click", fetchVerse);
document.getElementById("prevBtn").addEventListener("click", goPrev);
document.getElementById("nextBtn").addEventListener("click", goNext);
document.getElementById("zenBtn").addEventListener("click", openZen);
zenClose.addEventListener("click", closeZen);
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
  if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;
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

initVersions();
function getProxyBase() {
  return `${location.origin}/proxy?url=`;
}
