const versions = [
  "RVR1960", "NVI", "LBLA", "NRSV", "DHH", "TLA",
  "NBD", "BLPH", "JBS", "PDT", "NTV", "RVR2000", "NBLA"
];

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

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
let lastShareAt = 0;

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

  const cacheKey = buildCacheKey(parsed, version);
  const cached = readCache(cacheKey);
  if (cached) {
    showResult(cached.text, cached.reference);
    return;
  }
  const fetchUrls = buildFetchUrls(url);

  showStatus("Buscando...", false);
  try {
    let html = "";
    for (const fetchUrl of fetchUrls) {
      const response = await fetch(fetchUrl);
      if (!response.ok) continue;
      const text = await response.text();
      if (text && text.length > 500) {
        html = text;
        break;
      }
    }
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

initVersions();
function buildFetchUrls(url) {
  if (location.hostname.endsWith("github.io")) {
    return [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://thingproxy.freeboard.io/fetch/${url}`
    ];
  }
  return [`${location.origin}/proxy?url=${encodeURIComponent(url)}`];
}

function shareVerseAsPng() {
  if (resultEl.hidden) return;
  const now = Date.now();
  if (now - lastShareAt < 2000) return;
  lastShareAt = now;

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

  ctx.fillStyle = "#fff7e6";
  ctx.font = "600 38px 'Cormorant Garamond', serif";
  const lines = wrapTextCentered(ctx, text, width, 140, width - 160, 48);

  ctx.fillStyle = "#f39c12";
  ctx.font = "italic 28px 'Cormorant Garamond', serif";
  const refY = Math.min(height - 120, 140 + lines.length * 48 + 40);
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

function wrapTextCentered(ctx, text, totalWidth, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      drawCenteredText(ctx, line.trim(), totalWidth, y + lines * lineHeight);
      line = words[i] + " ";
      lines += 1;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    drawCenteredText(ctx, line.trim(), totalWidth, y + lines * lineHeight);
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
