const APP_VERSION = "1.4.0";

const versions = [
  "RVR1960", "RVC", "NVI", "NBLA", "LBLA", "NTV",
  "NBLH", "DHH", "TLA", "PDT", "BLPH", "NBD",
  "RVR2000", "JBS", "NRSV",
  "ARA", "ARC", "NVI-PT", "NTLH", "NVT", "TB"
];

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const DAILY_VERSION = "RVR1960";
const RECENT_LIMIT = 5;
const BOOKMARKS_KEY = "bookmarks";
const OLD_TESTAMENT_BOOKS = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
  "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes",
  "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos",
  "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
  "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas",
  "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías"
];
const NEW_TESTAMENT_BOOKS = [
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "1 Corintios",
  "2 Corintios", "Gálatas", "Efesios", "Filipenses", "Colosenses",
  "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo",
  "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro", "2 Pedro",
  "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis"
];
const BOOKS = [...OLD_TESTAMENT_BOOKS, ...NEW_TESTAMENT_BOOKS];

const TEXT_SUGGEST_LIMIT = 6;
const PUSH_SERVER_URL = "https://versiculodiario-production.up.railway.app";

const ReadBibleCore = typeof window !== "undefined" ? window.ReadBibleCore : null;
if (!ReadBibleCore) {
  console.error("ReadBibleCore missing. Ensure core.js is loaded before app.js.");
}
const {
  normalizeReferenceInput,
  parseReference,
  buildReference,
  formatBookDisplay,
  sanitizeReferenceString,
  buildReferenceInput,
  buildCacheKey,
  buildChapterCacheKey,
  parseStudyKey
} = ReadBibleCore || {};

const ReadBibleNet = typeof window !== "undefined" ? window.ReadBibleNet : null;
if (!ReadBibleNet) {
  console.error("ReadBibleNet missing. Ensure net.js is loaded before app.js.");
}
const {
  buildFetchUrls,
  fetchFirstHtml,
  fetchJson
} = ReadBibleNet || {};

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
const bookmarkBtn = document.getElementById("bookmarkBtn");
const resultDevotionalBtn = document.getElementById("resultDevotionalBtn");
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
const updateBanner = document.getElementById("updateBanner");
const tourOverlay = document.getElementById("tourOverlay");
const tourSpotlight = document.getElementById("tourSpotlight");
const tourTooltip = document.getElementById("tourTooltip");
const tourTitle = document.getElementById("tourTitle");
const tourText = document.getElementById("tourText");
const tourCounter = document.getElementById("tourCounter");
const tourSkip = document.getElementById("tourSkip");
const tourNext = document.getElementById("tourNext");
const ctxTip = document.getElementById("ctxTip");
const analytics = typeof window !== "undefined" ? window.umami : null;
const highlightBtn = document.getElementById("highlightBtn");
const themeCheckboxes = Array.from(document.querySelectorAll(".theme-chip input"));
const themesSave = document.getElementById("themesSave");
const installButton = document.getElementById("installButton");
const bookmarksList = document.getElementById("bookmarksList");
const bookmarksEmpty = document.getElementById("bookmarksEmpty");
const notesList = document.getElementById("notesList");
const notesEmpty = document.getElementById("notesEmpty");
const bigUiToggle = document.getElementById("bigUiToggle");
const pushToggle = document.getElementById("pushToggle");
const pushStatus = document.getElementById("pushStatus");
const pushDebug = document.getElementById("pushDebug");
const pushResubscribe = document.getElementById("pushResubscribe");
const communityIdentity = document.getElementById("communityIdentity");
const communityRole = document.getElementById("communityRole");
const communityCity = document.getElementById("communityCity");
const communityChurch = document.getElementById("communityChurch");
const communityAddress = document.getElementById("communityAddress");
const communityLocateBtn = document.getElementById("communityLocateBtn");
const communityLocationStatus = document.getElementById("communityLocationStatus");
const communityMiembrosList = document.getElementById("communityMiembrosList");
const communityMiembrosHint = document.getElementById("communityMiembrosHint");
const communityRefreshAdmin = document.getElementById("communityRefreshAdmin");
const communityAdminMetrics = document.getElementById("communityAdminMetrics");
const communitySave = document.getElementById("communitySave");
const communityRequestRole = document.getElementById("communityRequestRole");
const communitySummary = document.getElementById("communitySummary");
const communityForm = document.getElementById("communityForm");
const communityEdit = document.getElementById("communityEdit");
const communityOpen = document.getElementById("communityOpen");
const communityOverlay = document.getElementById("communityOverlay");
const communityClose = document.getElementById("communityClose");
const communityStatus = document.getElementById("communityStatus");
const communityRefresh = document.getElementById("communityRefresh");
const communityAdminSection = document.getElementById("communityAdminSection");
const communityAdminCodeGroup = document.getElementById("communityAdminCodeGroup");
const communityAdminCode = document.getElementById("communityAdminCode");
const communityRefreshRequests = document.getElementById("communityRefreshRequests");
const communityRoleRequestsList = document.getElementById("communityRoleRequestsList");
const communityApproveRole = document.getElementById("communityApproveRole");
const communityLocationsList = document.getElementById("communityLocationsList");
const communityMapFrame = document.getElementById("communityMapFrame");
const communityMapStatus = document.getElementById("communityMapStatus");
const communityUseMyLocation = document.getElementById("communityUseMyLocation");
const communityNearbyActions = document.getElementById("communityNearbyActions");
const communityEventsList = document.getElementById("communityEventsList");
const communityLocationForm = document.getElementById("communityLocationForm");
const communityLocationName = document.getElementById("communityLocationName");
const communityLocationAddress = document.getElementById("communityLocationAddress");
const communityCreateLocation = document.getElementById("communityCreateLocation");
const communityEventForm = document.getElementById("communityEventForm");
const communityEventLocation = document.getElementById("communityEventLocation");
const communityEventTitle = document.getElementById("communityEventTitle");
const communityEventStartsAt = document.getElementById("communityEventStartsAt");
const communityEventRecurrence = document.getElementById("communityEventRecurrence");
const communityCreateEvent = document.getElementById("communityCreateEvent");
const communityStudyCellsSection = document.getElementById("communityStudyCellsSection");
const communityRefreshCells = document.getElementById("communityRefreshCells");
const communityCellsList = document.getElementById("communityCellsList");
const communityCreateCellForm = document.getElementById("communityCreateCellForm");
const communityCellName = document.getElementById("communityCellName");
const communityCellDay = document.getElementById("communityCellDay");
const communityCellTime = document.getElementById("communityCellTime");
const communityCellLocation = document.getElementById("communityCellLocation");
const communityCreateCellBtn = document.getElementById("communityCreateCellBtn");
const communityMaterialsSection = document.getElementById("communityMaterialsSection");
const communityMaterialsTitle = document.getElementById("communityMaterialsTitle");
const communityMaterialsList = document.getElementById("communityMaterialsList");
const communityCloseMaterials = document.getElementById("communityCloseMaterials");
const communityMaterialForm = document.getElementById("communityMaterialForm");
const communityMaterialTitle = document.getElementById("communityMaterialTitle");
const communityMaterialReference = document.getElementById("communityMaterialReference");
const communityMaterialBody = document.getElementById("communityMaterialBody");
const communityCreateMaterial = document.getElementById("communityCreateMaterial");
const floatSearchBtn = document.getElementById("floatSearchBtn");
const floatMenuBtn = document.getElementById("floatMenuBtn");
const developerOverlay = document.getElementById("developerOverlay");
const developerClose = document.getElementById("developerClose");
const developerLoginSection = document.getElementById("developerLoginSection");
const developerCodeInput = document.getElementById("developerCodeInput");
const developerLoginBtn = document.getElementById("developerLoginBtn");
const developerPanel = document.getElementById("developerPanel");
const developerChurchList = document.getElementById("developerChurchList");
const developerCellList = document.getElementById("developerCellList");
const devRefreshChurches = document.getElementById("devRefreshChurches");
const developerOpen = document.getElementById("developerOpen");
const superadminOpen = document.getElementById("superadminOpen");
const superadminOverlay = document.getElementById("superadminOverlay");
const superadminClose = document.getElementById("superadminClose");
const superadminLoginSection = document.getElementById("superadminLoginSection");
const superadminEmailInput = document.getElementById("superadminEmailInput");
const superadminPasswordInput = document.getElementById("superadminPasswordInput");
const superadminLoginBtn = document.getElementById("superadminLoginBtn");
const superadminLoginStatus = document.getElementById("superadminLoginStatus");
const superadminPanel = document.getElementById("superadminPanel");
const superadminSettingsList = document.getElementById("superadminSettingsList");
const superadminConfigSection = document.getElementById("superadminConfigSection");
const superadminAccountSection = document.getElementById("superadminAccountSection");
const superadminCurrentPassword = document.getElementById("superadminCurrentPassword");
const superadminNewPassword = document.getElementById("superadminNewPassword");
const superadminChangePasswordBtn = document.getElementById("superadminChangePasswordBtn");
const superadminLogoutBtn = document.getElementById("superadminLogoutBtn");
const superadminSessionInfo = document.getElementById("superadminSessionInfo");
const superadminStatus = document.getElementById("superadminStatus");
const pickerBtn = document.getElementById("pickerBtn");
const pickerOverlay = document.getElementById("pickerOverlay");
const pickerClose = document.getElementById("pickerClose");
const pickerApply = document.getElementById("pickerApply");
const pickerOld = document.getElementById("pickerOld");
const pickerNew = document.getElementById("pickerNew");
const pickerBook = document.getElementById("pickerBook");
const pickerChapter = document.getElementById("pickerChapter");
const pickerVerse = document.getElementById("pickerVerse");

const zenOverlay = document.getElementById("zenOverlay");
const zenText = document.getElementById("zenText");
const zenRef = document.getElementById("zenRef");
const zenClose = document.getElementById("zenClose");
const splash = document.getElementById("splash");
const homeCards = document.getElementById("homeCards");
const homeGreeting = document.getElementById("homeGreeting");
const homeTitle = document.getElementById("homeTitle");
const homeSubtitle = document.getElementById("homeSubtitle");
const dailyCard = document.getElementById("dailyCard");
const dailyCardText = document.getElementById("dailyCardText");
const dailyCardRef = document.getElementById("dailyCardRef");
const dailyCardOpen = document.getElementById("dailyCardOpen");
const continueCard = document.getElementById("continueCard");
const continueRef = document.getElementById("continueRef");
const continueBtn = document.getElementById("continueBtn");
const communityInviteCard = document.getElementById("communityInviteCard");
const welcomeGate = document.getElementById("welcomeGate");
const googleSignInSlot = document.getElementById("googleSignInSlot");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const devSignInBtn = document.getElementById("devSignInBtn");
const legacyContinueBtn = document.getElementById("legacyContinueBtn");
const welcomeStatus = document.getElementById("welcomeStatus");
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
let currentResultMode = "verse";
let currentResultVersion = "";
let currentResultReference = "";
let activeHighlightRange = null;
let activeHighlightContainer = null;
let activeHighlightColor = "amarillo";
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
let communityState = {
  auth: null,
  profile: null,
  locations: [],
  events: [],
  attendance: [],
  pendingRoleRequests: [],
  cells: [],
  materials: [],
  selectedCellId: 0,
  developerChurches: [],
  selectedRoleRequestKey: "",
  selectedMapLocationId: 0,
  viewerCoords: null
};
let devSimulatedRole = "";
let devAuthenticated = false;
let developerCode = "";
let livePresenceTimer = 0;
let isProjOpen = false;
let projHideTimer = 0;
let projTouchStartX = 0;
let projTouchStartY = 0;
let pickerState = {
  bookIndex: 0,
  chapter: 1,
  verse: 1
};
let pickerTestament = "old";

function readBigUi() {
  try {
    return localStorage.getItem("bigUi") === "1";
  } catch {
    return false;
  }
}

function readCommunityInfo() {
  try {
    const raw = localStorage.getItem("communityInfo");
    if (!raw) return {
      communityKey: "",
      fullName: "",
      role: "feligres",
      isChurchAdmin: false,
      requestedRole: "",
      city: "",
      church: "",
      address: "",
      latitude: null,
      longitude: null
    };
    const parsed = JSON.parse(raw);
    return {
      communityKey: String(parsed.communityKey || ""),
      fullName: String(parsed.fullName || ""),
      role: String(parsed.role || "feligres"),
      isChurchAdmin: Boolean(parsed.isChurchAdmin),
      requestedRole: String(parsed.requestedRole || ""),
      city: String(parsed.city || ""),
      church: String(parsed.church || ""),
      address: String(parsed.address || ""),
      latitude: parsed.latitude != null ? Number(parsed.latitude) : null,
      longitude: parsed.longitude != null ? Number(parsed.longitude) : null
    };
  } catch {
    return {
      communityKey: "",
      fullName: "",
      role: "feligres",
      isChurchAdmin: false,
      requestedRole: "",
      city: "",
      church: "",
      address: "",
      latitude: null,
      longitude: null
    };
  }
}

function writeCommunityInfo(info) {
  try {
    localStorage.setItem("communityInfo", JSON.stringify(info));
  } catch {
    // ignore
  }
}

function updateCommunityUi(info) {
  const fullName = info.fullName ? info.fullName.trim() : "";
  const role = info.role ? info.role.trim() : "feligres";
  const isChurchAdmin = Boolean(info.isChurchAdmin);
  const requestedRole = info.requestedRole ? info.requestedRole.trim() : "";
  const city = info.city ? info.city.trim() : "";
  const church = info.church ? info.church.trim() : "";
  const address = info.address ? info.address.trim() : "";
  const hasData = Boolean(fullName || city || church);
  if (communitySummary) {
    const parts = [];
    if (fullName) parts.push(fullName);
    if (role) parts.push(`Rol activo: ${role}`);
    if (requestedRole && requestedRole !== role) parts.push(`Solicitud: ${requestedRole}`);
    if (city) parts.push(city);
    if (church) parts.push(church);
    communitySummary.textContent = hasData ? `Perfil actual: ${parts.join(" · ")}` : "";
    communitySummary.hidden = !hasData;
  }
  if (communityForm) communityForm.hidden = hasData;
  if (communityEdit) communityEdit.hidden = !hasData;
  renderCommunityIdentity();
  if (communityRole) communityRole.value = requestedRole || role || "feligres";
  if (communityCity) communityCity.value = city;
  if (communityChurch) communityChurch.value = church;
  if (communityAddress) communityAddress.value = address;
  const effectiveRole = devSimulatedRole || role;
  const isLeader = effectiveRole === "dirigente" || effectiveRole === "colaborador";
  const isDirigente = effectiveRole === "dirigente";
  const canModerateRoles = isDirigente || Boolean(communityState.auth && communityState.auth.roleApprovalMode === "admin_code");
  if (communityLocationForm) communityLocationForm.classList.toggle("role-hidden", !isLeader);
  if (communityEventForm) communityEventForm.classList.toggle("role-hidden", !isLeader);
  if (communityAdminSection) communityAdminSection.classList.toggle("role-hidden", !canModerateRoles);
  const moderacionTab = document.getElementById("communityTabModeracion");
  if (moderacionTab) moderacionTab.classList.toggle("role-hidden", !canModerateRoles);
  const miembrosTab = document.getElementById("communityTabMiembros");
  if (miembrosTab) miembrosTab.classList.toggle("role-hidden", !isDirigente);
  const miembrosSection = document.getElementById("communityMiembrosSection");
  if (miembrosSection) miembrosSection.classList.toggle("role-hidden", !isDirigente);
  const adminTab = document.getElementById("communityTabAdmin");
  if (adminTab) adminTab.classList.toggle("role-hidden", !isChurchAdmin);
  const adminDashboard = document.getElementById("communityAdminDashboard");
  if (adminDashboard) adminDashboard.classList.toggle("role-hidden", !isChurchAdmin);
  if (communityAdminCodeGroup) communityAdminCodeGroup.hidden = isDirigente;
  if (communityApproveRole) communityApproveRole.hidden = true;
  if (communityCreateCellForm) communityCreateCellForm.classList.toggle("role-hidden", !isDirigente);
  if (communityMaterialForm) communityMaterialForm.classList.toggle("role-hidden", !isLeader);

  const isDevRole = effectiveRole === "developer";
  if (developerOpen) developerOpen.hidden = !isDevRole && !devAuthenticated;
  const communityOpenBtn = document.getElementById("communityOpen");
  if (communityOpenBtn) communityOpenBtn.textContent = hasData ? "Mi comunidad" : "Unirme a la comunidad";
  const pushResubBtn = document.getElementById("pushResubscribe");
  if (pushResubBtn) pushResubBtn.hidden = !isDirigente && !isDevRole;
}

let communityActiveTab = "perfil";

function setCommunityTab(tab) {
  communityActiveTab = tab || "perfil";
  document.querySelectorAll("#communityTabs .community-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === communityActiveTab);
  });
  document.querySelectorAll("[data-community-tab]").forEach((el) => {
    el.classList.toggle("tab-hidden", el.dataset.communityTab !== communityActiveTab);
  });
  const sheet = document.querySelector(".community-sheet");
  if (sheet) sheet.scrollTop = 0;
}

function getCommunityKey() {
  const info = readCommunityInfo();
  if (info.communityKey) return info.communityKey;
  const generated = `community-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  writeCommunityInfo({ ...info, communityKey: generated });
  return generated;
}

// Secreto por usuario: prueba de identidad que viaja en cada accion.
// Vive en su propia clave para no perderse cuando se reescribe communityInfo.
function getCommunitySecret() {
  try {
    const existing = localStorage.getItem("communitySecret");
    if (existing) return existing;
  } catch {
    // ignore
  }
  let secret;
  try {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    secret = `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  try {
    localStorage.setItem("communitySecret", secret);
  } catch {
    // ignore
  }
  return secret;
}

function setCommunityStatus(message, isError) {
  if (!communityStatus) return;
  const text = String(message || "").trim();
  if (!text) {
    communityStatus.hidden = true;
    communityStatus.textContent = "";
    return;
  }
  communityStatus.hidden = false;
  communityStatus.textContent = text;
  communityStatus.style.borderColor = isError ? "#d59797" : "#e7d4b6";
  communityStatus.style.background = isError ? "#fff0f0" : "#fff4df";
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatCommunityDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function buildMapLink(location) {
  if (!location) return "#";
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const query = encodeURIComponent(`${lat},${lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  const text = [location.name, location.address, location.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

function isLocalhostOrigin() {
  if (typeof location === "undefined") return false;
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function isPrivilegedBrowserContext() {
  if (typeof window === "undefined") return false;
  return Boolean(window.isSecureContext || isLocalhostOrigin());
}

function buildCommunityMapEmbedUrl(location, viewerCoords) {
  const fallbackLat = viewerCoords && Number.isFinite(Number(viewerCoords.latitude))
    ? Number(viewerCoords.latitude)
    : -42.7692;
  const fallbackLng = viewerCoords && Number.isFinite(Number(viewerCoords.longitude))
    ? Number(viewerCoords.longitude)
    : -65.0385;
  const lat = location && Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : fallbackLat;
  const lng = location && Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : fallbackLng;
  const delta = 0.03;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  const marker = `${lat},${lng}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${marker}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(origin, location) {
  if (!origin || !location) return null;
  const lat1 = Number(origin.latitude);
  const lng1 = Number(origin.longitude);
  const lat2 = Number(location.latitude);
  const lng2 = Number(location.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistanceKm(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function findCommunityLocationById(locationId) {
  return (communityState.locations || []).find((location) => Number(location.id) === Number(locationId)) || null;
}

function renderCommunityMap() {
  if (!communityMapFrame || !communityNearbyActions || !communityMapStatus) return;
  const locations = communityState.locations || [];
  const viewerCoords = communityState.viewerCoords;
  if (!locations.length) {
    communityMapFrame.src = buildCommunityMapEmbedUrl(null, viewerCoords);
    communityNearbyActions.innerHTML = `<p class="community-empty">Todavia no hay sedes para mostrar en el mapa.</p>`;
    communityMapStatus.textContent = "Crea una sede para verla en el mapa.";
    return;
  }
  const selectedLocation = findCommunityLocationById(communityState.selectedMapLocationId) || locations[0];
  communityState.selectedMapLocationId = Number(selectedLocation.id);
  communityMapFrame.src = buildCommunityMapEmbedUrl(selectedLocation, viewerCoords);

  const sortedLocations = locations
    .map((location) => ({
      location,
      distanceKm: calculateDistanceKm(viewerCoords, location)
    }))
    .sort((a, b) => {
      if (Number.isFinite(a.distanceKm) && Number.isFinite(b.distanceKm)) return a.distanceKm - b.distanceKm;
      if (Number.isFinite(a.distanceKm)) return -1;
      if (Number.isFinite(b.distanceKm)) return 1;
      return String(a.location.name).localeCompare(String(b.location.name));
    })
    .slice(0, 6);

  communityNearbyActions.innerHTML = sortedLocations.map(({ location, distanceKm }) => {
    const isSelected = Number(location.id) === Number(selectedLocation.id);
    const distanceLabel = Number.isFinite(distanceKm) ? ` · ${formatDistanceKm(distanceKm)}` : "";
    return `<button class="ghost community-map-location-btn" type="button" data-location-id="${location.id}">${isSelected ? "Viendo" : "Ver"} ${escapeHtml(location.name)}${escapeHtml(distanceLabel)}</button>`;
  }).join("");

  const selectedDistance = calculateDistanceKm(viewerCoords, selectedLocation);
  if (Number.isFinite(selectedDistance)) {
    communityMapStatus.textContent = `Mostrando ${selectedLocation.name} a ${formatDistanceKm(selectedDistance)} de tu ubicacion.`;
    return;
  }
  communityMapStatus.textContent = isPrivilegedBrowserContext()
    ? `Mostrando ${selectedLocation.name}. Usa tu ubicacion para ordenar congregaciones cercanas.`
    : `Mostrando ${selectedLocation.name}. En esta URL el navegador no habilita ubicacion; para cercania real usa https o localhost.`;
}

function selectCommunityMapLocation(locationId) {
  communityState.selectedMapLocationId = Number(locationId) || 0;
  renderCommunityMap();
}

async function useCommunityViewerLocation() {
  if (!navigator.geolocation) {
    setCommunityStatus("Este dispositivo no permite geolocalizacion.", true);
    return;
  }
  if (!isPrivilegedBrowserContext()) {
    setCommunityStatus("La ubicacion del dispositivo solo funciona en https o en localhost.", true);
    if (communityMapStatus) {
      communityMapStatus.textContent = "En esta URL el navegador no habilita geolocalizacion. Probalo en https o localhost.";
    }
    return;
  }
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });
  communityState.viewerCoords = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  renderCommunityMap();
  setCommunityStatus("Ubicacion actual tomada para mostrar sedes cercanas.", false);
}

async function communityRequest(path, options) {
  const opts = { ...(options || {}) };
  const auth = window.ReadBibleAuth;
  if (auth && auth.hasSession()) {
    opts.headers = { ...(opts.headers || {}), Authorization: `Bearer ${auth.getSessionToken()}` };
  }
  const secret = getCommunitySecret();
  if (secret) {
    opts.headers = { ...(opts.headers || {}), "X-Community-Secret": secret };
  }
  const url = `${getPushServerUrl()}${path}`;
  let response;
  try {
    response = await fetch(url, opts);
  } catch (error) {
    throw new Error(`No pude conectar con la API en ${getPushServerUrl()}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `request failed (${response.status})`);
  }
  return data;
}

function findSelectedRoleRequest() {
  if (!communityState.selectedRoleRequestKey) return null;
  return (communityState.pendingRoleRequests || []).find((item) => item.communityKey === communityState.selectedRoleRequestKey) || null;
}

function selectCommunityRoleRequest(communityKey) {
  communityState.selectedRoleRequestKey = communityKey || "";
  renderCommunityRoleRequests();
}

function populateCommunityLocationSelect() {
  if (!communityEventLocation) return;
  const locations = communityState.locations || [];
  if (!locations.length) {
    communityEventLocation.innerHTML = `<option value="">No hay sedes</option>`;
    return;
  }
  communityEventLocation.innerHTML = locations.map((location) => (
    `<option value="${location.id}">${escapeHtml(location.name)}${location.city ? ` · ${escapeHtml(location.city)}` : ""}</option>`
  )).join("");
}

function renderCommunityLocations() {
  if (!communityLocationsList) return;
  const locations = communityState.locations || [];
  if (!locations.length) {
    communityLocationsList.innerHTML = `<p class="community-empty">Todavia no hay sedes registradas.</p>`;
    populateCommunityLocationSelect();
    return;
  }
  communityLocationsList.innerHTML = locations.map((location) => `
    <div class="community-card">
      <p class="community-card-title">${escapeHtml(location.name)}</p>
      <p>${escapeHtml([location.address, location.city, location.church].filter(Boolean).join(" · "))}</p>
      <div class="community-card-actions">
        <button class="ghost community-map-location-btn" type="button" data-location-id="${location.id}">Ver en mapa</button>
        <a class="ghost" href="${buildMapLink(location)}" target="_blank" rel="noopener">Abrir mapa</a>
      </div>
    </div>
  `).join("");
  populateCommunityLocationSelect();
  renderCommunityMap();
}

function renderCommunityEvents() {
  if (!communityEventsList) return;
  const events = communityState.events || [];
  const attendanceMap = new Map((communityState.attendance || []).map((item) => [item.eventId, item]));
  if (!events.length) {
    communityEventsList.innerHTML = `<p class="community-empty">Todavia no hay eventos activos.</p>`;
    return;
  }
  communityEventsList.innerHTML = events.map((event) => {
    const ownAttendance = attendanceMap.get(event.id);
    return `
      <div class="community-card" data-community-event-id="${event.id}">
        <p class="community-card-title">${escapeHtml(event.title)}</p>
        <p class="community-card-meta">${escapeHtml(event.location.name)} · ${escapeHtml(formatCommunityDate(event.startsAt))}</p>
        <p>${escapeHtml(event.description || "Sin descripcion por ahora.")}</p>
        <p class="community-card-meta">Presentes: ${event.attendance.total} · Dirigentes: ${event.attendance.dirigentes} · Colaboradores: ${event.attendance.colaboradores} · Feligreses: ${event.attendance.feligreses}</p>
        <div class="community-card-actions">
          <button class="ghost community-checkin-btn" type="button" data-event-id="${event.id}">${ownAttendance && ownAttendance.status === "checked_in" ? "Marcar salida" : "Estoy aqui"}</button>
          <a class="ghost" href="${buildMapLink(event.location)}" target="_blank" rel="noopener">Como llegar</a>
        </div>
      </div>
    `;
  }).join("");
}

function renderCommunityRoleRequests() {
  if (!communityRoleRequestsList) return;
  const requests = communityState.pendingRoleRequests || [];
  const selected = findSelectedRoleRequest();
  if (!requests.length) {
    communityRoleRequestsList.innerHTML = `<p class="community-empty">No hay solicitudes pendientes.</p>`;
    if (communityApproveRole) communityApproveRole.hidden = true;
    return;
  }
  communityRoleRequestsList.innerHTML = requests.map((request) => {
    const isSelected = request.communityKey === communityState.selectedRoleRequestKey;
    return `
      <div class="community-card${isSelected ? " selected" : ""}" data-role-request-key="${escapeHtml(request.communityKey)}">
        <p class="community-card-title">${escapeHtml(request.fullName || "Sin nombre")}</p>
        <p class="community-card-role">Solicita ${escapeHtml(request.requestedRole || "rol")}</p>
        <p>${escapeHtml([request.city, request.church].filter(Boolean).join(" · ") || "Sin ciudad ni iglesia cargadas.")}</p>
        <p class="community-card-meta">Rol actual: ${escapeHtml(request.role || "feligres")} · Pedido: ${escapeHtml(formatCommunityDate(request.requestedAt) || "recién")}</p>
        <div class="community-card-actions vertical">
          <button class="ghost community-role-request-select" type="button" data-community-key="${escapeHtml(request.communityKey)}">${isSelected ? "Solicitud seleccionada" : "Seleccionar solicitud"}</button>
        </div>
      </div>
    `;
  }).join("");
  if (communityApproveRole) {
    communityApproveRole.hidden = !selected;
    communityApproveRole.textContent = selected
      ? `Aprobar como ${selected.requestedRole}`
      : "Aprobar solicitud seleccionada";
  }
}

function getCommunityAdminCodeForRequests() {
  const typedCode = communityAdminCode ? communityAdminCode.value.trim() : "";
  if (typedCode) return typedCode;
  if (communityState.auth && communityState.auth.localAdminCodeHint) {
    return String(communityState.auth.localAdminCodeHint).trim();
  }
  return "";
}

async function loadCommunityRoleRequests(showMessage) {
  const info = readCommunityInfo();
  const role = info.role || "feligres";
  const adminCode = getCommunityAdminCodeForRequests();
  const canModerateRoles = role === "dirigente" || Boolean(communityState.auth && communityState.auth.roleApprovalMode === "admin_code");
  if (!canModerateRoles) {
    communityState.pendingRoleRequests = [];
    communityState.selectedRoleRequestKey = "";
    renderCommunityRoleRequests();
    return;
  }
  const query = new URLSearchParams({ communityKey: getCommunityKey() });
  if (role !== "dirigente" && adminCode) query.set("adminCode", adminCode);
  const data = await communityRequest(`/community/role-requests?${query.toString()}`);
  communityState.pendingRoleRequests = Array.isArray(data.requests) ? data.requests : [];
  if (communityState.selectedRoleRequestKey) {
    const selected = findSelectedRoleRequest();
    if (!selected) communityState.selectedRoleRequestKey = "";
  }
  renderCommunityRoleRequests();
  if (showMessage) {
    setCommunityStatus("Solicitudes actualizadas.", false);
  }
}

async function loadCommunityData(showMessage) {
  const communityKey = getCommunityKey();
  const data = await communityRequest(`/community/bootstrap?communityKey=${encodeURIComponent(communityKey)}`);
  communityState = {
    auth: data.auth || null,
    profile: data.profile || null,
    locations: Array.isArray(data.locations) ? data.locations : [],
    events: Array.isArray(data.events) ? data.events : [],
    attendance: Array.isArray(data.attendance) ? data.attendance : [],
    pendingRoleRequests: Array.isArray(data.pendingRoleRequests) ? data.pendingRoleRequests : [],
    cells: communityState.cells || [],
    materials: communityState.materials || [],
    selectedCellId: communityState.selectedCellId || 0,
    developerChurches: communityState.developerChurches || [],
    selectedRoleRequestKey: "",
    selectedMapLocationId: communityState.selectedMapLocationId,
    viewerCoords: communityState.viewerCoords
  };
  const localInfo = readCommunityInfo();
  if (data.profile) {
    const merged = {
      ...localInfo,
      communityKey,
      fullName: data.profile.fullName || localInfo.fullName || "",
      role: data.profile.role || localInfo.role || "feligres",
      isChurchAdmin: Boolean(data.profile.isChurchAdmin),
      requestedRole: data.profile.requestedRole || "",
      city: data.profile.city || localInfo.city || "",
      church: data.profile.church || localInfo.church || "",
      address: data.profile.address || localInfo.address || "",
      latitude: data.profile.latitude != null ? data.profile.latitude : localInfo.latitude,
      longitude: data.profile.longitude != null ? data.profile.longitude : localInfo.longitude
    };
    writeCommunityInfo(merged);
    updateCommunityUi(merged);
  } else {
    updateCommunityUi(localInfo);
  }
  renderCommunityLocations();
  renderCommunityEvents();
  renderCommunityRoleRequests();
  renderCommunityMap();
  loadStudyCells().catch(() => {});
  if (communityState.auth && communityState.auth.roleApprovalMode === "admin_code") {
    loadCommunityRoleRequests(false).catch(() => {
      // ignore role request refresh until the user needs it
    });
  }
  if (showMessage) {
    setCommunityStatus("Comunidad actualizada.", false);
  }
}

function renderCommunityIdentity() {
  if (!communityIdentity) return;
  const auth = window.ReadBibleAuth;
  const user = auth ? auth.getSessionUser() : null;
  if (!user) {
    communityIdentity.innerHTML = "";
    return;
  }
  const avatar = user.avatarUrl
    ? `<img class="account-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="account-avatar account-avatar-letter">${escapeHtml((user.fullName || "?").charAt(0).toUpperCase())}</span>`;
  communityIdentity.innerHTML = `
    <div class="account-row">
      ${avatar}
      <div>
        <p class="account-name">${escapeHtml(user.fullName || "")}</p>
        <p class="account-email">${escapeHtml(user.email || "")}</p>
      </div>
    </div>
  `;
}

async function saveCommunityProfile() {
  const communityKey = getCommunityKey();
  const city = communityCity ? communityCity.value.trim() : "";
  const church = communityChurch ? communityChurch.value.trim() : "";
  const address = communityAddress ? communityAddress.value.trim() : "";
  const localInfo = readCommunityInfo();
  const fullName = getUserName() || localInfo.fullName || "";
  if (!fullName) {
    setCommunityStatus("Inicia sesion para guardar tu perfil.", true);
    return;
  }
  const payload = {
    communityKey, fullName, city, church, status: "active", address,
    latitude: localInfo.latitude,
    longitude: localInfo.longitude
  };
  const data = await communityRequest("/community/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  writeCommunityInfo({
    communityKey,
    fullName: data.profile.fullName,
    role: data.profile.role,
    isChurchAdmin: Boolean(data.profile.isChurchAdmin),
    requestedRole: data.profile.requestedRole || "",
    city: data.profile.city || "",
    church: data.profile.church || "",
    address: data.profile.address || address,
    latitude: data.profile.latitude != null ? data.profile.latitude : localInfo.latitude,
    longitude: data.profile.longitude != null ? data.profile.longitude : localInfo.longitude
  });
  updateCommunityUi(readCommunityInfo());
  await updatePushPreferences().catch(() => {});
  await loadCommunityData(false);
  setCommunityStatus("Perfil guardado.", false);
}

function useCommunityProfileLocation() {
  if (!navigator.geolocation) {
    if (communityLocationStatus) {
      communityLocationStatus.textContent = "Geolocalizacion no disponible en este navegador.";
      communityLocationStatus.hidden = false;
    }
    return;
  }
  if (communityLocationStatus) {
    communityLocationStatus.textContent = "Obteniendo ubicacion...";
    communityLocationStatus.hidden = false;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const info = readCommunityInfo();
      writeCommunityInfo({ ...info, latitude: lat, longitude: lng });
      if (communityLocationStatus) {
        communityLocationStatus.textContent = `Ubicacion guardada (${lat.toFixed(4)}, ${lng.toFixed(4)}).`;
      }
    },
    () => {
      if (communityLocationStatus) {
        communityLocationStatus.textContent = "No se pudo obtener la ubicacion.";
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function loadCommunityMembers() {
  if (!communityMiembrosList) return;
  const communityKey = getCommunityKey();
  communityMiembrosList.innerHTML = "";
  if (communityMiembrosHint) communityMiembrosHint.hidden = false;
  const data = await communityRequest(`/community/members-map?communityKey=${encodeURIComponent(communityKey)}`);
  if (!data || !Array.isArray(data.members)) return;
  const localInfo = readCommunityInfo();
  const myLat = localInfo.latitude;
  const myLng = localInfo.longitude;
  const withDist = data.members.map((m) => {
    let dist = null;
    if (myLat != null && myLng != null && m.latitude != null && m.longitude != null) {
      dist = calculateDistanceKm(myLat, myLng, m.latitude, m.longitude);
    }
    return { ...m, dist };
  });
  withDist.sort((a, b) => {
    if (a.dist == null && b.dist == null) return 0;
    if (a.dist == null) return 1;
    if (b.dist == null) return -1;
    return a.dist - b.dist;
  });
  renderCommunityMembers(withDist);
  if (communityMiembrosHint) {
    communityMiembrosHint.textContent = myLat == null
      ? "Guarda tu ubicacion en el perfil para ver distancias."
      : `${withDist.length} miembro${withDist.length !== 1 ? "s" : ""} en tu iglesia.`;
    communityMiembrosHint.hidden = false;
  }
}

function renderCommunityMembers(members) {
  if (!communityMiembrosList) return;
  communityMiembrosList.innerHTML = "";
  if (!members.length) {
    communityMiembrosList.innerHTML = `<p class="community-note">Sin miembros registrados en tu iglesia.</p>`;
    return;
  }
  const groups = [
    { label: "Cerca (menos de 2 km)", members: members.filter((m) => m.dist != null && m.dist < 2) },
    { label: "A distancia media (2-10 km)", members: members.filter((m) => m.dist != null && m.dist >= 2 && m.dist < 10) },
    { label: "Lejos (mas de 10 km)", members: members.filter((m) => m.dist != null && m.dist >= 10) },
    { label: "Sin ubicacion", members: members.filter((m) => m.dist == null) }
  ];
  const canManage = Boolean(readCommunityInfo().isChurchAdmin);
  groups.forEach((group) => {
    if (!group.members.length) return;
    const header = document.createElement("p");
    header.className = "member-group-header";
    header.textContent = group.label;
    communityMiembrosList.appendChild(header);
    group.members.forEach((m) => {
      const initials = (m.fullName || m.displayName || "?").split(" ").map((w) => w[0]).join("").slice(0, 2);
      const distLabel = m.dist != null ? `${m.dist < 1 ? (m.dist * 1000).toFixed(0) + " m" : m.dist.toFixed(1) + " km"}` : "";
      const card = document.createElement("div");
      card.className = "member-card";
      const mapsUrl = m.latitude != null
        ? `https://maps.google.com/maps?q=${m.latitude},${m.longitude}`
        : m.address ? `https://maps.google.com/maps?q=${encodeURIComponent(m.address)}` : null;
      card.innerHTML = `
        <div class="member-avatar">${escapeHtml(initials.toUpperCase())}</div>
        <div class="member-info">
          <p class="member-name">${escapeHtml(m.fullName || m.displayName || "Sin nombre")}</p>
          ${m.address ? `<p class="member-address">${escapeHtml(m.address)}</p>` : ""}
        </div>
        ${distLabel ? `<span class="member-dist">${distLabel}</span>` : ""}
        ${mapsUrl ? `<a class="ghost" href="${mapsUrl}" target="_blank" rel="noopener" style="font-size:11px;padding:4px 8px">Ver</a>` : ""}
        ${canManage ? `
          <div class="member-admin-controls">
            <select class="member-role-select" aria-label="Rol de ${escapeHtml(m.fullName || "miembro")}">
              <option value="feligres"${m.role === "feligres" ? " selected" : ""}>Feligres</option>
              <option value="colaborador"${m.role === "colaborador" ? " selected" : ""}>Colaborador</option>
              <option value="dirigente"${m.role === "dirigente" ? " selected" : ""}>Dirigente</option>
            </select>
            <select class="member-status-select" aria-label="Estado de ${escapeHtml(m.fullName || "miembro")}">
              <option value="active"${m.status === "active" ? " selected" : ""}>Activo</option>
              <option value="inactive"${m.status === "inactive" ? " selected" : ""}>Inactivo</option>
              <option value="blocked"${m.status === "blocked" ? " selected" : ""}>Bloqueado</option>
            </select>
            <button class="ghost member-save-btn" type="button" data-member-id="${m.id}">Guardar</button>
          </div>
        ` : ""}
      `;
      communityMiembrosList.appendChild(card);
    });
  });
}

async function updateCommunityMember(card, memberId) {
  const roleSelect = card.querySelector(".member-role-select");
  const statusSelect = card.querySelector(".member-status-select");
  await communityRequest(`/community/admin/members/${memberId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      role: roleSelect ? roleSelect.value : null,
      status: statusSelect ? statusSelect.value : null
    })
  });
  await loadCommunityMembers();
  setCommunityStatus("Miembro actualizado.", false);
}

async function loadCommunityAdminSummary() {
  if (!communityAdminMetrics) return;
  const query = new URLSearchParams({ communityKey: getCommunityKey() });
  const data = await communityRequest(`/community/admin/summary?${query.toString()}`);
  const members = data.members || {};
  communityAdminMetrics.innerHTML = `
    <div><strong>${Number(members.total || 0)}</strong><span>Miembros</span></div>
    <div><strong>${Number(data.eventsThisMonth || 0)}</strong><span>Eventos este mes</span></div>
    <div><strong>${Number(data.checkInsThisMonth || 0)}</strong><span>Asistencias este mes</span></div>
    <div><strong>${Number(members.dirigentes || 0)}</strong><span>Dirigentes</span></div>
  `;
}

async function requestCommunityRole() {
  const requestedRole = communityRole ? communityRole.value : "feligres";
  if (!["colaborador", "dirigente"].includes(requestedRole)) {
    setCommunityStatus("Selecciona colaborador o dirigente para pedir elevacion.", true);
    return;
  }
  await saveCommunityProfile();
  const data = await communityRequest("/community/role-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      requestedRole
    })
  });
  const info = readCommunityInfo();
  writeCommunityInfo({
    ...info,
    role: data.profile.role,
    requestedRole: data.profile.requestedRole || requestedRole
  });
  updateCommunityUi(readCommunityInfo());
  await loadCommunityData(false);
  setCommunityStatus(`Solicitud enviada para rol ${requestedRole}.`, false);
}

async function approveCommunityRole() {
  const selectedRequest = findSelectedRoleRequest();
  const requestedRole = selectedRequest && selectedRequest.requestedRole ? selectedRequest.requestedRole : "";
  const adminCode = communityAdminCode ? communityAdminCode.value.trim() : "";
  const info = readCommunityInfo();
  const requiresCode = info.role !== "dirigente";
  if (!selectedRequest) {
    setCommunityStatus("Selecciona una solicitud antes de aprobar.", true);
    return;
  }
  if (requiresCode && !adminCode) {
    setCommunityStatus("Escribe el codigo admin local.", true);
    return;
  }
  const data = await communityRequest("/community/approve-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      targetCommunityKey: selectedRequest.communityKey,
      approvedRole: requestedRole,
      adminCode
    })
  });
  if (communityAdminCode) communityAdminCode.value = "";
  await loadCommunityData(false);
  await loadCommunityRoleRequests(false).catch(() => {
    // ignore
  });
  setCommunityStatus(`Rol aprobado para ${data.profile.fullName}: ${data.profile.role}.`, false);
}

async function createCommunityLocation() {
  const info = readCommunityInfo();
  const name = communityLocationName ? communityLocationName.value.trim() : "";
  const address = communityLocationAddress ? communityLocationAddress.value.trim() : "";
  if (!name) {
    setCommunityStatus("Escribe el nombre de la sede.", true);
    return;
  }
  await communityRequest("/community/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      name,
      address,
      city: info.city,
      church: info.church,
      latitude: info.latitude,
      longitude: info.longitude
    })
  });
  if (communityLocationName) communityLocationName.value = "";
  if (communityLocationAddress) communityLocationAddress.value = "";
  await loadCommunityData(false);
  setCommunityStatus("Sede creada.", false);
}

async function createCommunityEvent() {
  const title = communityEventTitle ? communityEventTitle.value.trim() : "";
  const startsAt = communityEventStartsAt ? communityEventStartsAt.value : "";
  const locationId = communityEventLocation ? Number(communityEventLocation.value) : 0;
  if (!title || !startsAt || !locationId) {
    setCommunityStatus("Completa sede, titulo y fecha del evento.", true);
    return;
  }
  await communityRequest("/community/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      locationId,
      title,
      startsAt: new Date(startsAt).toISOString(),
      recurrence: communityEventRecurrence ? communityEventRecurrence.value : "none",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    })
  });
  if (communityEventTitle) communityEventTitle.value = "";
  await loadCommunityData(false);
  setCommunityStatus("Evento creado.", false);
}

async function checkInToCommunityEvent(eventId) {
  const current = (communityState.attendance || []).find((item) => Number(item.eventId) === Number(eventId));
  if (current && current.status === "checked_in") {
    await communityRequest(`/community/events/${eventId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityKey: getCommunityKey() })
    });
    if (livePresenceTimer) clearInterval(livePresenceTimer);
    livePresenceTimer = 0;
    await loadCommunityData(false);
    setCommunityStatus("Salida registrada.", false);
    return;
  }
  let coords = communityState.viewerCoords;
  if (!coords && navigator.geolocation && isPrivilegedBrowserContext()) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        });
      });
      coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      communityState.viewerCoords = coords;
    } catch {
      // Si la persona no autoriza ubicacion, queda disponible el respaldo manual.
    }
  }
  const data = await communityRequest(`/community/events/${eventId}/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      latitude: coords ? coords.latitude : null,
      longitude: coords ? coords.longitude : null
    })
  });
  if (coords && data.attendance && data.attendance.method === "geo") {
    startLivePresence(eventId, coords);
  }
  await loadCommunityData(false);
  const detail = data.attendance && data.attendance.distanceMeters != null
    ? ` a ${data.attendance.distanceMeters} m de la sede`
    : " en modo manual";
  setCommunityStatus(`Check-in registrado${detail}.`, false);
}

function startLivePresence(eventId, coords) {
  if (livePresenceTimer) clearInterval(livePresenceTimer);
  const ping = () => {
    if (document.visibilityState !== "visible") return;
    communityRequest("/community/live-presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityKey: getCommunityKey(),
        eventId,
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    }).catch(() => {});
  };
  ping();
  livePresenceTimer = window.setInterval(ping, 120000);
}

function populateCellLocationSelect() {
  if (!communityCellLocation) return;
  const locations = communityState.locations || [];
  if (!locations.length) {
    communityCellLocation.innerHTML = `<option value="">No hay sedes</option>`;
    return;
  }
  communityCellLocation.innerHTML = locations.map((loc) => (
    `<option value="${loc.id}">${escapeHtml(loc.name)}${loc.city ? ` · ${escapeHtml(loc.city)}` : ""}</option>`
  )).join("");
}

function renderStudyCells() {
  if (!communityCellsList) return;
  const cells = communityState.cells || [];
  populateCellLocationSelect();
  if (!cells.length) {
    communityCellsList.innerHTML = `<p class="community-empty">No hay celulas de estudio registradas.</p>`;
    return;
  }
  communityCellsList.innerHTML = cells.map((cell) => {
    const location = (communityState.locations || []).find((l) => Number(l.id) === Number(cell.locationId));
    const schedule = [cell.meetingDay, cell.meetingTime].filter(Boolean).join(" ");
    return `
      <div class="study-cell-card" data-cell-id="${cell.id}">
        <p class="community-card-title">${escapeHtml(cell.name)}</p>
        ${schedule ? `<span class="study-cell-schedule">${escapeHtml(schedule)}</span>` : ""}
        ${location ? `<p class="community-card-meta">${escapeHtml(location.name)}</p>` : ""}
        ${cell.leader ? `<p class="community-card-meta">Lider: ${escapeHtml(cell.leader)}</p>` : ""}
        <div class="community-card-actions">
          <button class="ghost community-cell-view-btn" type="button" data-cell-id="${cell.id}">Ver materiales</button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadStudyCells() {
  try {
    const info = readCommunityInfo();
    const q = new URLSearchParams({ communityKey: getCommunityKey() });
    if (info.church) q.set("church", info.church);
    const data = await communityRequest(`/community/study-cells?${q.toString()}`);
    communityState.cells = Array.isArray(data.cells) ? data.cells : [];
    renderStudyCells();
  } catch {
    communityState.cells = [];
    renderStudyCells();
  }
}

async function createStudyCell() {
  const name = communityCellName ? communityCellName.value.trim() : "";
  const day = communityCellDay ? communityCellDay.value : "";
  const time = communityCellTime ? communityCellTime.value : "";
  const locationId = communityCellLocation ? Number(communityCellLocation.value) : 0;
  if (!name) {
    setCommunityStatus("Escribe el nombre de la celula.", true);
    return;
  }
  const info = readCommunityInfo();
  await communityRequest("/community/study-cells", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityKey: getCommunityKey(),
      name,
      meetingDay: day,
      meetingTime: time,
      locationId: locationId || null,
      church: info.church,
      city: info.city
    })
  });
  if (communityCellName) communityCellName.value = "";
  await loadStudyCells();
  setCommunityStatus("Celula de estudio creada.", false);
}

function renderStudyMaterials() {
  if (!communityMaterialsList) return;
  const materials = communityState.materials || [];
  if (!materials.length) {
    communityMaterialsList.innerHTML = `<p class="community-empty">Todavia no hay materiales en esta celula.</p>`;
    return;
  }
  communityMaterialsList.innerHTML = materials.map((material) => `
    <article class="community-card study-material-card">
      <p class="community-card-title">${escapeHtml(material.title)}</p>
      ${material.bibleReference ? `<p class="study-cell-schedule">${escapeHtml(material.bibleReference)}</p>` : ""}
      ${material.body ? `<p class="study-material-body">${escapeHtml(material.body)}</p>` : ""}
      <p class="community-card-meta">${escapeHtml(formatCommunityDate(material.createdAt) || "")}</p>
    </article>
  `).join("");
}

async function openStudyMaterials(cellId) {
  const cell = (communityState.cells || []).find((item) => Number(item.id) === Number(cellId));
  if (!cell) return;
  communityState.selectedCellId = Number(cellId);
  if (communityMaterialsSection) communityMaterialsSection.hidden = false;
  if (communityMaterialsTitle) communityMaterialsTitle.textContent = `Materiales · ${cell.name}`;
  const query = new URLSearchParams({ communityKey: getCommunityKey(), cellId: String(cellId) });
  const data = await communityRequest(`/community/study-materials?${query.toString()}`);
  communityState.materials = Array.isArray(data.materials) ? data.materials : [];
  renderStudyMaterials();
  if (communityMaterialsSection) communityMaterialsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeStudyMaterials() {
  communityState.selectedCellId = 0;
  communityState.materials = [];
  if (communityMaterialsSection) communityMaterialsSection.hidden = true;
}

async function createStudyMaterial() {
  const cellId = Number(communityState.selectedCellId);
  const title = communityMaterialTitle ? communityMaterialTitle.value.trim() : "";
  const bibleReference = communityMaterialReference ? communityMaterialReference.value.trim() : "";
  const body = communityMaterialBody ? communityMaterialBody.value.trim() : "";
  if (!cellId || !title) {
    setCommunityStatus("Selecciona una celula y escribe el titulo.", true);
    return;
  }
  await communityRequest("/community/study-materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ communityKey: getCommunityKey(), cellId, title, bibleReference, body })
  });
  if (communityMaterialTitle) communityMaterialTitle.value = "";
  if (communityMaterialReference) communityMaterialReference.value = "";
  if (communityMaterialBody) communityMaterialBody.value = "";
  await openStudyMaterials(cellId);
  setCommunityStatus("Material guardado.", false);
}

function openDeveloperPanel() {
  if (!developerOverlay) return;
  developerOverlay.hidden = false;
  if (developerPanel) developerPanel.hidden = !devAuthenticated;
  if (developerLoginSection) developerLoginSection.hidden = devAuthenticated;
}

function closeDeveloperPanel() {
  if (!developerOverlay) return;
  developerOverlay.hidden = true;
}

async function developerLogin() {
  const code = developerCodeInput ? developerCodeInput.value.trim() : "";
  if (!code) {
    setCommunityStatus("Ingresa el codigo de desarrollador.", true);
    return;
  }
  try {
    await communityRequest("/community/developer-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
  } catch (error) {
    setCommunityStatus(error.message || "Codigo de desarrollador incorrecto.", true);
    return;
  }
  devAuthenticated = true;
  developerCode = code;
  if (developerPanel) developerPanel.hidden = false;
  if (developerLoginSection) developerLoginSection.hidden = true;
  await loadDeveloperChurches();
  renderDeveloperCells();
}

function renderDeveloperChurches() {
  if (!developerChurchList) return;
  const churches = communityState.developerChurches || [];
  if (!churches.length) {
    developerChurchList.innerHTML = `<p class="community-empty">No hay iglesias registradas.</p>`;
    return;
  }
  developerChurchList.innerHTML = churches.map((church) => `
    <div class="dev-church-item">
      <div>
        <p>${escapeHtml(church.name)}</p>
        <small>${church.locations} sedes · ${church.members} miembros</small>
      </div>
      <button class="ghost dev-church-toggle" type="button" data-church-key="${escapeHtml(church.churchKey)}" data-next-active="${church.isActive ? "false" : "true"}">
        ${church.isActive ? "Deshabilitar" : "Habilitar"}
      </button>
    </div>
  `).join("");
}

async function loadDeveloperChurches() {
  const data = await communityRequest("/community/developer/churches/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ developerCode })
  });
  communityState.developerChurches = Array.isArray(data.churches) ? data.churches : [];
  renderDeveloperChurches();
}

async function toggleDeveloperChurch(churchKey, isActive) {
  await communityRequest(`/community/developer/churches/${encodeURIComponent(churchKey)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ developerCode, isActive })
  });
  await loadDeveloperChurches();
}

function renderDeveloperCells() {
  if (!developerCellList) return;
  const cells = communityState.cells || [];
  if (!cells.length) {
    developerCellList.innerHTML = `<p class="community-empty">Sin celulas registradas.</p>`;
    return;
  }
  developerCellList.innerHTML = cells.map((cell) => `
    <div class="dev-church-item">
      <div>
        <p>${escapeHtml(cell.name)}</p>
        <small>${[cell.meetingDay, cell.meetingTime].filter(Boolean).join(" ") || "Sin horario"}</small>
      </div>
      <span class="dev-badge active">activa</span>
    </div>
  `).join("");
}

function getSuperadminToken() {
  try {
    return localStorage.getItem("superadminToken") || "";
  } catch {
    return "";
  }
}

function setSuperadminToken(token) {
  try {
    if (token) localStorage.setItem("superadminToken", token);
    else localStorage.removeItem("superadminToken");
  } catch {
    // sin storage disponible, la sesion dura lo que dure la pagina
  }
}

function setSuperadminStatus(message, isError) {
  if (!superadminStatus) return;
  superadminStatus.textContent = message || "";
  superadminStatus.style.color = isError ? "#a33" : "";
}

async function superadminRequest(path, options) {
  const opts = { ...(options || {}) };
  opts.headers = { ...(opts.headers || {}) };
  const token = getSuperadminToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (opts.body && !opts.headers["Content-Type"]) {
    opts.headers["Content-Type"] = "application/json";
  }
  let response;
  try {
    response = await fetch(`${getPushServerUrl()}${path}`, opts);
  } catch {
    throw new Error(`No pude conectar con la API en ${getPushServerUrl()}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/superadmin/login") {
    setSuperadminToken("");
    showSuperadminLogin();
    throw new Error("La sesion expiro. Ingresa de nuevo.");
  }
  if (!response.ok) {
    throw new Error(data.error || `request failed (${response.status})`);
  }
  return data;
}

function showSuperadminLogin() {
  if (superadminLoginSection) superadminLoginSection.hidden = false;
  if (superadminPanel) superadminPanel.hidden = true;
}

function showSuperadminPanel() {
  if (superadminLoginSection) superadminLoginSection.hidden = true;
  if (superadminPanel) superadminPanel.hidden = false;
}

async function openSuperadminPanel() {
  if (!superadminOverlay) return;
  superadminOverlay.hidden = false;
  setSuperadminStatus("");
  if (superadminLoginStatus) superadminLoginStatus.textContent = "";
  if (getSuperadminToken()) {
    showSuperadminPanel();
    try {
      await loadSuperadminSettings();
    } catch (error) {
      setSuperadminStatus(error.message, true);
    }
  } else {
    showSuperadminLogin();
  }
}

function closeSuperadminPanel() {
  if (superadminOverlay) superadminOverlay.hidden = true;
}

async function superadminLogin() {
  const email = superadminEmailInput ? superadminEmailInput.value.trim() : "";
  const password = superadminPasswordInput ? superadminPasswordInput.value : "";
  if (!email || !password) {
    if (superadminLoginStatus) superadminLoginStatus.textContent = "Completa email y contrasena.";
    return;
  }
  if (superadminLoginStatus) superadminLoginStatus.textContent = "Verificando...";
  try {
    const data = await superadminRequest("/superadmin/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setSuperadminToken(data.token);
    if (superadminPasswordInput) superadminPasswordInput.value = "";
    if (superadminLoginStatus) superadminLoginStatus.textContent = "";
    if (superadminSessionInfo) {
      superadminSessionInfo.textContent = `Sesion de ${data.email}, valida por ${data.expiresDays} dias en este dispositivo.`;
    }
    showSuperadminPanel();
    await loadSuperadminSettings();
  } catch (error) {
    if (superadminLoginStatus) superadminLoginStatus.textContent = error.message || "No pude iniciar sesion.";
  }
}

async function loadSuperadminSettings() {
  if (!superadminSettingsList) return;
  superadminSettingsList.innerHTML = `<p class="community-empty">Cargando configuracion...</p>`;
  const data = await superadminRequest("/superadmin/settings");
  const settings = data.settings || [];
  superadminSettingsList.innerHTML = settings.map((item) => {
    const state = item.configured
      ? `<span class="dev-badge active">configurado</span>`
      : `<span class="dev-badge">pendiente</span>`;
    const current = item.configured
      ? `<small class="sa-current">Actual: ${escapeHtml(item.preview)}${item.source === "env" ? " (variable de entorno)" : ""}</small>`
      : "";
    const guide = (item.guide || []).length
      ? `<details class="sa-guide">
          <summary>Como conseguirlo, paso a paso</summary>
          <ol>${item.guide.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </details>`
      : "";
    return `
      <div class="sa-field" data-setting-key="${escapeHtml(item.key)}">
        <div class="sa-field-head">
          <p>${escapeHtml(item.label)}</p>
          ${state}
        </div>
        <small>${escapeHtml(item.hint)}</small>
        ${guide}
        ${current}
        <div class="sa-field-row">
          <input type="${item.secret ? "password" : "text"}" class="sa-setting-input" placeholder="${item.configured ? "Nuevo valor (vacio no cambia nada)" : "Pegar valor aqui"}" />
          <button class="sa-setting-save" type="button">Guardar</button>
        </div>
      </div>
    `;
  }).join("");
}

async function saveSuperadminSetting(fieldEl) {
  const key = fieldEl.getAttribute("data-setting-key");
  const input = fieldEl.querySelector(".sa-setting-input");
  const value = input ? input.value.trim() : "";
  if (!value) {
    setSuperadminStatus("Pega el valor antes de guardar.", true);
    return;
  }
  try {
    await superadminRequest("/superadmin/settings", {
      method: "POST",
      body: JSON.stringify({ key, value })
    });
    setSuperadminStatus(`Guardado: ${key}`, false);
    await loadSuperadminSettings();
  } catch (error) {
    setSuperadminStatus(error.message, true);
  }
}

async function superadminChangePassword() {
  const current = superadminCurrentPassword ? superadminCurrentPassword.value : "";
  const next = superadminNewPassword ? superadminNewPassword.value : "";
  if (next.length < 8) {
    setSuperadminStatus("La contrasena nueva debe tener al menos 8 caracteres.", true);
    return;
  }
  try {
    await superadminRequest("/superadmin/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    });
    if (superadminCurrentPassword) superadminCurrentPassword.value = "";
    if (superadminNewPassword) superadminNewPassword.value = "";
    setSuperadminStatus("Contrasena cambiada. Las otras sesiones se cerraron.", false);
  } catch (error) {
    setSuperadminStatus(error.message, true);
  }
}

async function superadminLogout() {
  try {
    await superadminRequest("/superadmin/logout", { method: "POST" });
  } catch {
    // igual se limpia el token local
  }
  setSuperadminToken("");
  showSuperadminLogin();
  setSuperadminStatus("");
}

function switchSuperadminTab(tab) {
  const isConfig = tab === "config";
  if (superadminConfigSection) superadminConfigSection.hidden = !isConfig;
  if (superadminAccountSection) superadminAccountSection.hidden = isConfig;
  document.querySelectorAll(".sa-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-sa-tab") === tab);
  });
}

function applyDevRole(role) {
  devSimulatedRole = role || "";
  const info = readCommunityInfo();
  updateCommunityUi(info);
  const label = role ? `Vista simulada: ${role}` : "Vista real";
  setCommunityStatus(label, false);
}

function initScrollObserver() {
  const toAnimate = document.querySelectorAll(".card, .hero");
  if (!("IntersectionObserver" in window)) {
    toAnimate.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });

  toAnimate.forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
    observer.observe(el);
  });
}

function initFooterNav() {
  const floatHomeBtn = document.getElementById("floatHomeBtn");
  const floatDevotionalBtn = document.getElementById("floatDevotionalBtn");
  if (floatHomeBtn) {
    floatHomeBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (floatSearchBtn) {
    floatSearchBtn.addEventListener("click", () => {
      const searchSection = document.querySelector(".search");
      if (searchSection) {
        searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          const q = document.getElementById("query");
          if (q) q.focus();
        }, 350);
      }
    });
  }
  if (floatDevotionalBtn) {
    floatDevotionalBtn.addEventListener("click", () => openDevotionalOverlay());
  }
  if (floatMenuBtn) {
    floatMenuBtn.addEventListener("click", () => openMenu());
  }
}

function initFooterFlame() {
  const canvas = document.querySelector(".footer-flame-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const COLORS = ["#f39c12", "#c0641a", "#7a1a0a", "#f5c96b", "#e07828", "#a03010", "#6b2008"];
  const particles = [];

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function spawn() {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + 2,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -(0.45 + Math.random() * 0.75),
      r: 0.7 + Math.random() * 2.2,
      life: 0.65 + Math.random() * 0.35,
      decay: 0.006 + Math.random() * 0.007,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    while (particles.length < 95) spawn();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx + Math.sin(p.y * 0.06 + i) * 0.12;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
}

function applyBigUi(enabled) {
  document.body.classList.toggle("ui-large", enabled);
  if (bigUiToggle) bigUiToggle.checked = enabled;
}

function getPushServerUrl() {
  try {
    const override = localStorage.getItem("pushServerUrl");
    if (override && override.trim()) return override.trim();
  } catch {
    // ignore
  }
  if (typeof location !== "undefined") {
    if (location.protocol === "http:" && !location.hostname.endsWith("github.io")) {
      return `${location.origin}/api`;
    }
  }
  return PUSH_SERVER_URL;
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function pushAllowedInCurrentContext() {
  return pushSupported() && isPrivilegedBrowserContext();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidKey() {
  const url = `${getPushServerUrl()}/vapid-public-key`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("vapid fetch failed");
  const data = await response.json();
  return data.key;
}

async function getPushSubscription() {
  if (!pushAllowedInCurrentContext()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

function setPushStatus(text) {
  if (pushStatus) pushStatus.textContent = text;
}

function setPushDebug(lines) {
  if (!pushDebug) return;
  pushDebug.textContent = lines.filter(Boolean).join("\n");
}

async function refreshPushStatus() {
  if (!pushSupported()) {
    setPushStatus("Notificaciones no soportadas en este dispositivo.");
    if (pushToggle) pushToggle.disabled = true;
    setPushDebug([
      `Soporte Push: no`,
      `Service Worker: ${"serviceWorker" in navigator ? "si" : "no"}`,
      `PushManager: ${"PushManager" in window ? "si" : "no"}`,
      `Notification: ${"Notification" in window ? "si" : "no"}`
    ]);
    return;
  }
  if (!isPrivilegedBrowserContext()) {
    setPushStatus("Notificaciones disponibles solo en https o localhost.");
    if (pushToggle) {
      pushToggle.textContent = "Requiere https o localhost";
      pushToggle.disabled = true;
    }
    if (pushResubscribe) {
      pushResubscribe.disabled = true;
      pushResubscribe.textContent = "Recrear suscripcion";
    }
    setPushDebug([
      "Push bloqueado por contexto inseguro.",
      `URL actual: ${typeof location !== "undefined" ? location.origin : ""}`,
      "Abri esta app en https o en http://localhost para probar permisos y suscripcion."
    ]);
    return;
  }
  const permission = Notification.permission;
  if (permission === "denied") {
    setPushStatus("Notificaciones bloqueadas en el navegador.");
    if (pushToggle) {
      pushToggle.textContent = "Notificaciones bloqueadas";
      pushToggle.disabled = true;
    }
    setPushDebug([
      `Soporte Push: si`,
      `Permiso: denied`,
      `Servidor: ${getPushServerUrl()}`
    ]);
    if (pushResubscribe) {
      pushResubscribe.disabled = true;
      pushResubscribe.textContent = "Recrear suscripcion";
    }
    return;
  }
  const sub = await getPushSubscription();
  if (sub) {
    setPushStatus("Notificaciones diarias activas.");
    if (pushToggle) {
      pushToggle.textContent = "Desactivar notificaciones";
      pushToggle.disabled = false;
    }
  } else {
    setPushStatus("Notificaciones diarias apagadas.");
    if (pushToggle) {
      pushToggle.textContent = "Activar notificaciones diarias";
      pushToggle.disabled = false;
    }
  }
  if (pushResubscribe) {
    pushResubscribe.disabled = !sub;
    pushResubscribe.textContent = sub ? "Recrear suscripcion" : "Recrear suscripcion";
  }
  setPushDebug([
    `Soporte Push: si`,
    `Permiso: ${permission}`,
    `Service Worker: listo`,
    `Servidor: ${getPushServerUrl()}`,
    `Suscripcion: ${sub ? "activa" : "ninguna"}`,
    "Recrear suscripcion sirve para borrar la suscripcion actual y pedir una nueva cuando el navegador o el endpoint quedaron desincronizados."
  ]);
}

async function subscribeToPush() {
  if (!isPrivilegedBrowserContext()) {
    setPushStatus("No se pueden activar notificaciones en esta URL.");
    setPushDebug([
      "El navegador no permite service worker push en contexto inseguro.",
      "Usa https o localhost."
    ]);
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await refreshPushStatus();
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = await fetchVapidKey();
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
    const community = readCommunityInfo();
    const payload = {
      subscription,
      userSeed: getUserSeed(),
      themes: getSelectedThemes(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      city: community.city,
      church: community.church
    };
    const response = await fetch(`${getPushServerUrl()}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`subscribe failed (${response.status})`);
    }
    await refreshPushStatus();
  } catch (error) {
    let keyInfo = "";
    try {
      const key = await fetchVapidKey();
      keyInfo = `VAPID length: ${String(key || "").length}`;
    } catch (keyErr) {
      keyInfo = `VAPID fetch: ${String(keyErr && keyErr.message ? keyErr.message : keyErr)}`;
    }
    const errorName = error && error.name ? error.name : "";
    const errorCode = error && typeof error.code !== "undefined" ? String(error.code) : "";
    const errorStack = error && error.stack ? String(error.stack).split("\n")[0] : "";
    setPushStatus("No se pudo activar notificaciones.");
    setPushDebug([
      "Error al suscribir:",
      String(error && error.message ? error.message : error),
      errorName ? `Nombre: ${errorName}` : "",
      errorCode ? `Codigo: ${errorCode}` : "",
      errorStack ? `Stack: ${errorStack}` : "",
      keyInfo,
      `Permiso: ${Notification.permission}`
    ]);
  }
}

async function unsubscribeFromPush() {
  try {
    const sub = await getPushSubscription();
    if (!sub) return refreshPushStatus();
    const response = await fetch(`${getPushServerUrl()}/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint })
    });
    if (!response.ok) {
      throw new Error(`unsubscribe failed (${response.status})`);
    }
    await sub.unsubscribe();
    await refreshPushStatus();
  } catch (error) {
    setPushStatus("No se pudo desactivar notificaciones.");
    setPushDebug([
      "Error al desuscribir:",
      String(error && error.message ? error.message : error)
    ]);
  }
}

async function togglePushNotifications() {
  if (!pushAllowedInCurrentContext()) {
    await refreshPushStatus();
    return;
  }
  const sub = await getPushSubscription();
  if (sub) {
    await unsubscribeFromPush();
  } else {
    await subscribeToPush();
  }
}

async function resubscribePushNotifications() {
  if (!pushAllowedInCurrentContext()) {
    await refreshPushStatus();
    return;
  }
  try {
    const sub = await getPushSubscription();
    if (sub) {
      await fetch(`${getPushServerUrl()}/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  } catch {
    // ignore and attempt to subscribe anyway
  }
  await subscribeToPush();
}

async function updatePushPreferences() {
  const sub = await getPushSubscription();
  if (!sub) return;
  const community = readCommunityInfo();
  const payload = {
    subscription: sub,
    userSeed: getUserSeed(),
    themes: getSelectedThemes(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    city: community.city,
    church: community.church
  };
  await fetch(`${getPushServerUrl()}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

const PICKER_ITEM_HEIGHT = 36;
const BOOK_CHAPTERS = {
  "Génesis": 50,
  "Éxodo": 40,
  "Levítico": 27,
  "Números": 36,
  "Deuteronomio": 34,
  "Josué": 24,
  "Jueces": 21,
  "Rut": 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Reyes": 22,
  "2 Reyes": 25,
  "1 Crónicas": 29,
  "2 Crónicas": 36,
  "Esdras": 10,
  "Nehemías": 13,
  "Ester": 10,
  "Job": 42,
  "Salmos": 150,
  "Proverbios": 31,
  "Eclesiastés": 12,
  "Cantares": 8,
  "Isaías": 66,
  "Jeremías": 52,
  "Lamentaciones": 5,
  "Ezequiel": 48,
  "Daniel": 12,
  "Oseas": 14,
  "Joel": 3,
  "Amós": 9,
  "Abdías": 1,
  "Jonás": 4,
  "Miqueas": 7,
  "Nahúm": 3,
  "Habacuc": 3,
  "Sofonías": 3,
  "Hageo": 2,
  "Zacarías": 14,
  "Malaquías": 4,
  "Mateo": 28,
  "Marcos": 16,
  "Lucas": 24,
  "Juan": 21,
  "Hechos": 28,
  "Romanos": 16,
  "1 Corintios": 16,
  "2 Corintios": 13,
  "Gálatas": 6,
  "Efesios": 6,
  "Filipenses": 4,
  "Colosenses": 4,
  "1 Tesalonicenses": 5,
  "2 Tesalonicenses": 3,
  "1 Timoteo": 6,
  "2 Timoteo": 4,
  "Tito": 3,
  "Filemón": 1,
  "Hebreos": 13,
  "Santiago": 5,
  "1 Pedro": 5,
  "2 Pedro": 3,
  "1 Juan": 5,
  "2 Juan": 1,
  "3 Juan": 1,
  "Judas": 1,
  "Apocalipsis": 22
};

function initVersions() {
  versions.forEach((v) => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    versionSelect.appendChild(option);
  });
  applyBigUi(readBigUi());
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
  queuePrefsSync();
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
  if (key.startsWith("highlight:")) {
    queueSync("highlight", key.slice(10), highlights, !highlights.length);
  }
}

const HIGHLIGHT_COLORS = ["amarillo", "verde", "azul", "rosa"];

function normalizeHighlights(highlights, maxLen) {
  const cleaned = highlights
    .map((h) => ({
      start: Math.max(0, Math.min(maxLen, Number(h.start))),
      end: Math.max(0, Math.min(maxLen, Number(h.end))),
      color: HIGHLIGHT_COLORS.includes(h.color) ? h.color : "amarillo"
    }))
    .filter((h) => Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  cleaned.forEach((h) => {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end && last.color === h.color) {
      last.end = Math.max(last.end, h.end);
    } else {
      merged.push({ start: h.start, end: h.end, color: h.color });
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
    html += `<span class="highlight highlight-${h.color}" data-index="${idx}" data-start="${h.start}" data-end="${h.end}">${chunk}</span>`;
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

function getBookTestament(book) {
  return OLD_TESTAMENT_BOOKS.includes(book) ? "old" : "new";
}

function getTestamentLabel(testament) {
  return testament === "old" ? "Antiguo Testamento" : "Nuevo Testamento";
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

  const oldMatches = OLD_TESTAMENT_BOOKS.filter((book) =>
    normalizeForMatch(book).startsWith(input)
  ).slice(0, RECENT_LIMIT);
  const newMatches = NEW_TESTAMENT_BOOKS.filter((book) =>
    normalizeForMatch(book).startsWith(input)
  ).slice(0, RECENT_LIMIT);

  const recentMatches = getRecentQueries()
    .filter((q) => normalizeForMatch(q).includes(input))
    .slice(0, RECENT_LIMIT);

  const textMatches = isTextSearchInput(raw) ? textSuggestResults : [];

  const html = [
    buildSuggestionGroup(getTestamentLabel("old"), oldMatches.map((b) => `${b} `)),
    buildSuggestionGroup(getTestamentLabel("new"), newMatches.map((b) => `${b} `)),
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
    return false;
  }
  textSuggestResults = [];
  if (querySuggestions) querySuggestions.hidden = true;

  const version = versionSelect.value;
  currentStudyParsed = parsed;
  currentStudyVersion = version;
  currentResultMode = "verse";
  currentResultVersion = version;
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
    return true;
  }
  const fetchUrls = buildFetchUrls(url);

  showStatus("Buscando...", false);
  try {
    const html = await fetchFirstHtml(fetchUrls, 7000);
    if (!html) {
      showStatus("No se pudo obtener contenido del servidor.", true);
      return false;
    }
    if (isNoResults(html)) {
      return false;
    }
    const verseText = parseHTML(html, parsed);
    if (!verseText) {
      return false;
    }
    const reference = buildReference(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd, version);
    writeCache(cacheKey, { text: verseText, reference });
    showResult(verseText, reference);
    return true;
  } catch (err) {
    showStatus("Error de red al conectar con el servidor local.", true);
    return false;
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
  currentResultMode = "chapter";
  currentResultVersion = version;
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
  if (bookmarkBtn) bookmarkBtn.hidden = true;
  if (resultDevotionalBtn) resultDevotionalBtn.hidden = true;
}

function showResult(text, reference) {
  statusEl.textContent = "";
  currentResultText = text;
  currentResultReference = reference;
  updateHighlightedViews();
  refEl.textContent = `— ${reference}`;
  resultEl.hidden = false;
  if (bookmarkBtn) bookmarkBtn.hidden = false;
  if (resultDevotionalBtn) resultDevotionalBtn.hidden = false;
  if (isZenOpen) {
    updateHighlightedViews();
    zenRef.textContent = `— ${reference}`;
  }
  if (isProjOpen && projTextEl && projRefEl) {
    projTextEl.textContent = text;
    projRefEl.textContent = `— ${reference}`;
  }
  persistLastQuery();
  refreshStudyDot();
  refreshBookmarkButton();
}

function normalizeBookKey(name) {
  return String(name || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim();
}

function showZenBookTransition(bookName) {
  return new Promise((resolve) => {
    if (!isZenOpen || !zenText || !zenRef) { resolve(); return; }
    zenText.textContent = bookName;
    zenRef.textContent = "";
    setTimeout(resolve, 1400);
  });
}

async function goPrev() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) return;
  const book = parsed.book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");
  const version = versionSelect.value;

  if (parsed.verseStart > 1) {
    queryInput.value = `${book} ${parsed.chapter}:${parsed.verseStart - 1}`;
    await fetchVerse();
    return;
  }

  if (parsed.chapter > 1) {
    const prevChapter = parsed.chapter - 1;
    const lastVerse = await fetchVerseCount(book, prevChapter, version);
    queryInput.value = `${book} ${prevChapter}:${lastVerse || 1}`;
    await fetchVerse();
    return;
  }

  const bookIndex = BOOKS.findIndex((b) => normalizeBookKey(b) === normalizeBookKey(book));
  if (bookIndex > 0) {
    const prevBook = BOOKS[bookIndex - 1];
    await showZenBookTransition(prevBook);
    const lastChapter = BOOK_CHAPTERS[prevBook] || 1;
    const lastVerse = await fetchVerseCount(prevBook, lastChapter, version);
    queryInput.value = `${prevBook} ${lastChapter}:${lastVerse || 1}`;
    await fetchVerse();
  }
}

async function goNext() {
  const parsed = parseReference(queryInput.value);
  if (!parsed) return;
  const book = parsed.book.replace(/^(\d)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "$1 $2");

  queryInput.value = `${book} ${parsed.chapter}:${parsed.verseEnd + 1}`;
  const ok = await fetchVerse();
  if (ok) return;

  queryInput.value = `${book} ${parsed.chapter + 1}:1`;
  const ok2 = await fetchVerse();
  if (ok2) return;

  const bookIndex = BOOKS.findIndex((b) => normalizeBookKey(b) === normalizeBookKey(book));
  if (bookIndex >= 0 && bookIndex < BOOKS.length - 1) {
    const nextBook = BOOKS[bookIndex + 1];
    await showZenBookTransition(nextBook);
    queryInput.value = `${nextBook} 1:1`;
    await fetchVerse();
  }
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
  queuePrefsSync();
}

function buildBookmarkId(query, version, mode) {
  return `${mode}:${query}:${version}`;
}

function readBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || buildBookmarkId(item.query || "", item.version || "", item.mode || "verse")),
        query: String(item.query || "").trim(),
        version: String(item.version || DAILY_VERSION).trim(),
        mode: item.mode === "chapter" ? "chapter" : "verse",
        reference: String(item.reference || "").trim(),
        preview: String(item.preview || "").trim(),
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now()
      }))
      .filter((item) => item.query && item.reference);
  } catch {
    return [];
  }
}

function writeBookmarksRaw(items) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function writeBookmarks(items) {
  const previous = readBookmarks();
  writeBookmarksRaw(items);
  const nextIds = new Set(items.map((item) => item.id));
  for (const item of items) {
    queueSync("bookmark", item.id, item, false);
  }
  for (const old of previous) {
    if (!nextIds.has(old.id)) {
      queueSync("bookmark", old.id, null, true);
    }
  }
}

function currentBookmarkEntry() {
  if (resultEl.hidden) return null;
  const query = queryInput.value.trim();
  const version = currentResultVersion || versionSelect.value;
  if (!query || !version || !currentResultReference) return null;
  return {
    id: buildBookmarkId(query, version, currentResultMode),
    query,
    version,
    mode: currentResultMode,
    reference: currentResultReference,
    preview: currentResultText
      ? `${currentResultText.slice(0, 110).trim()}${currentResultText.length > 110 ? "..." : ""}`
      : "",
    updatedAt: Date.now()
  };
}

function isCurrentBookmarked() {
  const entry = currentBookmarkEntry();
  if (!entry) return false;
  return readBookmarks().some((item) => item.id === entry.id);
}

function refreshBookmarkButton() {
  if (!bookmarkBtn) return;
  const active = isCurrentBookmarked();
  bookmarkBtn.classList.toggle("active", active);
  bookmarkBtn.setAttribute("aria-label", active ? "Quitar marcador" : "Guardar marcador");
  bookmarkBtn.title = active ? "Quitar marcador" : "Guardar marcador";
}

function toggleCurrentBookmark() {
  const entry = currentBookmarkEntry();
  if (!entry) return;
  const bookmarks = readBookmarks();
  const idx = bookmarks.findIndex((item) => item.id === entry.id);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.unshift(entry);
  }
  writeBookmarks(bookmarks.slice(0, 40));
  refreshBookmarkButton();
  renderBookmarksIndex();
}

function renderBookmarksIndex() {
  if (!bookmarksList || !bookmarksEmpty) return;
  const entries = readBookmarks().sort((a, b) => b.updatedAt - a.updatedAt);
  bookmarksList.innerHTML = "";
  bookmarksEmpty.hidden = entries.length > 0;
  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-link bookmark-link";
    button.dataset.bookmarkId = entry.id;
    button.textContent = entry.reference;
    const meta = document.createElement("small");
    const modeLabel = entry.mode === "chapter" ? "Capitulo" : "Versiculo";
    meta.textContent = entry.preview ? `${modeLabel} · ${entry.preview}` : modeLabel;
    button.appendChild(meta);
    bookmarksList.appendChild(button);
  });
}

function openBookmark(id) {
  const bookmark = readBookmarks().find((item) => item.id === id);
  if (!bookmark) return;
  queryInput.value = bookmark.query;
  if (versions.includes(bookmark.version)) {
    versionSelect.value = bookmark.version;
  }
  closeMenu();
  if (bookmark.mode === "chapter") {
    fetchChapter();
    return;
  }
  fetchVerse();
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
  showCtxTip("lectura_plena");
  trackEvent("open_zen");
}

function closeZen() {
  zenOverlay.hidden = true;
  isZenOpen = false;
}

const projectionOverlay = document.getElementById("projectionOverlay");
const projTextEl = document.getElementById("projText");
const projRefEl = document.getElementById("projRef");
const projControlsEl = document.getElementById("projControls");

function openProjection() {
  const verseText = (isZenOpen ? zenText?.textContent : null)
    || document.getElementById("verseText")?.textContent || "";
  const rawRef = (isZenOpen ? zenRef?.textContent : null)
    || document.getElementById("reference")?.textContent || "";
  const refText = rawRef.replace(/^[—\s]+/, "");
  if (!verseText) return;

  if (projTextEl) projTextEl.textContent = verseText;
  if (projRefEl) projRefEl.textContent = `— ${refText}`;
  if (projectionOverlay) projectionOverlay.hidden = false;
  isProjOpen = true;
  scheduleProjHide();
}

function closeProjection() {
  if (projectionOverlay) projectionOverlay.hidden = true;
  isProjOpen = false;
  clearTimeout(projHideTimer);
}

function scheduleProjHide() {
  clearTimeout(projHideTimer);
  if (projControlsEl) projControlsEl.classList.remove("fade-out");
  projHideTimer = setTimeout(() => {
    if (projControlsEl) projControlsEl.classList.add("fade-out");
  }, 3500);
}

function updateProjectionText() {
  if (!isProjOpen) return;
  const verseText = document.getElementById("verseText")?.textContent || "";
  const rawRef = document.getElementById("reference")?.textContent || "";
  const refText = rawRef.replace(/^[—\s]+/, "");
  if (projTextEl) projTextEl.textContent = verseText;
  if (projRefEl) projRefEl.textContent = `— ${refText}`;
}

function showZenHint(msg) {
  let hint = document.getElementById("zenHint");
  if (!hint) {
    hint = document.createElement("p");
    hint.id = "zenHint";
    hint.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);"
      + "color:rgba(255,247,230,0.6);font-size:13px;letter-spacing:0.05em;"
      + "text-transform:uppercase;text-align:center;pointer-events:none;"
      + "transition:opacity 400ms;white-space:nowrap;margin:0";
    zenOverlay.appendChild(hint);
  }
  hint.textContent = msg;
  hint.style.opacity = "1";
  clearTimeout(hint._timer);
  hint._timer = setTimeout(() => { hint.style.opacity = "0"; }, 3500);
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
    const stored = { ...normalized, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(stored));
    if (key.startsWith("study:")) {
      queueSync("study", key.slice(6), stored, false);
    }
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
  if (key && key.startsWith("study:")) {
    queueSync("study", key.slice(6), null, true);
  }
}

function hasStudyData(data) {
  if (!data) return false;
  if (Array.isArray(data.notes) && data.notes.some((n) => n && n.text && n.text.trim())) return true;
  if (data.sermonDate && String(data.sermonDate).trim()) return true;
  return false;
}

function readVerseCountCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.count !== "number") return null;
    return parsed.count;
  } catch {
    return null;
  }
}

function writeVerseCountCache(key, count) {
  try {
    localStorage.setItem(key, JSON.stringify({ count, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function parseVerseCount(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const passage = doc.querySelector("div.passage-text");
  if (!passage) return null;
  const spans = passage.querySelectorAll("span.text");
  let maxVerse = 0;
  spans.forEach((span) => {
    span.classList.forEach((cls) => {
      const rangeMatch = cls.match(/-(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (end > maxVerse) maxVerse = end;
        if (start > maxVerse) maxVerse = start;
        return;
      }
      const singleMatch = cls.match(/-(\d+)$/);
      if (singleMatch) {
        const num = parseInt(singleMatch[1], 10);
        if (num > maxVerse) maxVerse = num;
      }
    });
  });
  return maxVerse || null;
}

async function fetchVerseCount(book, chapter, version) {
  const cacheKey = `verseCount:${book}:${chapter}:${version}`;
  const cached = readVerseCountCache(cacheKey);
  if (cached) return cached;
  const bookQuery = formatBookDisplay(book);
  const search = `${bookQuery} ${chapter}`;
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`;
  const html = await fetchFirstHtml(buildFetchUrls(url), 7000);
  if (!html) return null;
  const count = parseVerseCount(html);
  if (count) writeVerseCountCache(cacheKey, count);
  return count;
}

function buildPickerItems(count, start = 1) {
  const items = [];
  for (let i = start; i <= count; i += 1) {
    items.push(String(i));
  }
  return items;
}

function renderPickerColumn(el, items, selectedIndex) {
  if (!el) return;
  el.innerHTML = "";
  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-item";
    btn.textContent = item;
    btn.dataset.index = String(index);
    el.appendChild(btn);
  });
  requestAnimationFrame(() => {
    el.scrollTop = Math.max(0, selectedIndex * PICKER_ITEM_HEIGHT);
    updatePickerActive(el, selectedIndex);
  });
}

function updatePickerActive(el, selectedIndex) {
  if (!el) return;
  const nodes = el.querySelectorAll(".picker-item");
  nodes.forEach((node, index) => {
    node.classList.toggle("active", index === selectedIndex);
  });
}

function getPickerIndex(el) {
  if (!el) return 0;
  return Math.max(0, Math.round(el.scrollTop / PICKER_ITEM_HEIGHT));
}

function attachPickerScroll(el, onChange) {
  if (!el) return;
  let raf = 0;
  let scrollEndTimer = 0;
  let lastSnapIndex = 0;
  el.addEventListener("scroll", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const idx = getPickerIndex(el);
      updatePickerActive(el, idx);
      onChange(idx);
    });
    if (scrollEndTimer) clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const idx = getPickerIndex(el);
      if (idx !== lastSnapIndex) {
        lastSnapIndex = idx;
        vibrateSnap();
      }
    }, 140);
  });
  el.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest(".picker-item");
    if (!item) return;
    const idx = Number(item.dataset.index || "0");
    el.scrollTo({ top: idx * PICKER_ITEM_HEIGHT, behavior: "smooth" });
    vibrateTap();
  });
}

async function updatePickerVerses() {
  const book = BOOKS[pickerState.bookIndex];
  const chapterCount = BOOK_CHAPTERS[book] || 1;
  const chapter = Math.min(Math.max(1, pickerState.chapter), chapterCount);
  pickerState.chapter = chapter;
  const version = versionSelect.value || DAILY_VERSION;
  let verseCount = await fetchVerseCount(book, chapter, version);
  if (!verseCount) verseCount = 176;
  const verseItems = buildPickerItems(verseCount);
  const verseIndex = Math.max(0, Math.min(verseItems.length - 1, pickerState.verse - 1));
  pickerState.verse = verseIndex + 1;
  renderPickerColumn(pickerVerse, verseItems, verseIndex);
}

function updatePickerChapters() {
  const book = BOOKS[pickerState.bookIndex];
  const count = BOOK_CHAPTERS[book] || 1;
  const chapterItems = buildPickerItems(count);
  const chapterIndex = Math.max(0, Math.min(count - 1, pickerState.chapter - 1));
  pickerState.chapter = chapterIndex + 1;
  renderPickerColumn(pickerChapter, chapterItems, chapterIndex);
}

function getCurrentPickerBooks() {
  return pickerTestament === "old" ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;
}

function updatePickerTestamentButtons() {
  if (pickerOld) {
    pickerOld.classList.toggle("active", pickerTestament === "old");
    pickerOld.setAttribute("aria-pressed", pickerTestament === "old" ? "true" : "false");
  }
  if (pickerNew) {
    pickerNew.classList.toggle("active", pickerTestament === "new");
    pickerNew.setAttribute("aria-pressed", pickerTestament === "new" ? "true" : "false");
  }
}

async function setPickerTestament(next) {
  if (next === pickerTestament) return;
  pickerTestament = next;
  const bookItems = getCurrentPickerBooks();
  const currentBook = BOOKS[pickerState.bookIndex];
  if (!bookItems.includes(currentBook)) {
    pickerState.bookIndex = BOOKS.indexOf(bookItems[0]);
    pickerState.chapter = 1;
    pickerState.verse = 1;
    updatePickerChapters();
    await updatePickerVerses();
  }
  updatePickerBooks();
}

function updatePickerBooks() {
  const bookItems = getCurrentPickerBooks();
  const currentBook = BOOKS[pickerState.bookIndex];
  let bookIndex = bookItems.indexOf(currentBook);
  if (bookIndex === -1) {
    bookIndex = 0;
    pickerState.bookIndex = BOOKS.indexOf(bookItems[0]);
  }
  renderPickerColumn(pickerBook, bookItems, bookIndex);
  updatePickerTestamentButtons();
}

async function initPickerStateFromInput() {
  const parsed = parseReference(queryInput.value);
  if (parsed && BOOKS.includes(parsed.book)) {
    pickerState.bookIndex = BOOKS.indexOf(parsed.book);
    pickerState.chapter = parsed.chapter;
    pickerState.verse = parsed.verseStart;
    pickerTestament = getBookTestament(parsed.book);
  } else {
    pickerTestament = getBookTestament(BOOKS[pickerState.bookIndex]);
  }
  updatePickerBooks();
  updatePickerChapters();
  await updatePickerVerses();
}

function openPicker() {
  if (!pickerOverlay) return;
  if (querySuggestions) querySuggestions.hidden = true;
  initPickerStateFromInput();
  pickerOverlay.hidden = false;
}

function closePicker() {
  if (!pickerOverlay) return;
  pickerOverlay.hidden = true;
}

function applyPickerSelection() {
  const book = BOOKS[pickerState.bookIndex];
  const chapter = pickerState.chapter;
  const verse = pickerState.verse;
  queryInput.value = buildReferenceInput(book, chapter, verse, verse);
  closePicker();
  vibrateTap();
  fetchVerse();
}

function vibrateTap() {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate(12);
  } catch {
    // ignore
  }
}

function vibrateSnap() {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate(8);
  } catch {
    // ignore
  }
}

function renderNotesIndex() {
  if (!notesList || !notesEmpty) return;
  const entries = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("study:")) continue;
      const data = readStudy(key);
      if (!hasStudyData(data)) continue;
      const parsed = parseStudyKey(key);
      if (!parsed) continue;
      entries.push({
        key,
        parsed,
        updatedAt: data.updatedAt || 0,
        notesCount: Array.isArray(data.notes) ? data.notes.filter((n) => n && n.text && n.text.trim()).length : 0
      });
    }
  } catch {
    // ignore
  }
  entries.sort((a, b) => b.updatedAt - a.updatedAt);
  notesList.innerHTML = "";
  notesEmpty.hidden = entries.length > 0;
  const grouped = {
    old: [],
    new: []
  };
  entries.forEach((entry) => {
    const testament = getBookTestament(entry.parsed.book);
    grouped[testament].push(entry);
  });
  const renderGroup = (label, group) => {
    if (!group.length) return;
    const heading = document.createElement("div");
    heading.className = "notes-group";
    heading.textContent = label;
    notesList.appendChild(heading);
    group.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-link";
      button.dataset.studyKey = entry.key;
      button.textContent = buildReference(entry.parsed.book, entry.parsed.chapter, entry.parsed.verseStart, entry.parsed.verseEnd, entry.parsed.version);
      if (entry.notesCount > 0) {
        const meta = document.createElement("small");
        meta.textContent = entry.notesCount === 1 ? "1 nota" : `${entry.notesCount} notas`;
        button.appendChild(meta);
      }
      notesList.appendChild(button);
    });
  };
  renderGroup(getTestamentLabel("old"), grouped.old);
  renderGroup(getTestamentLabel("new"), grouped.new);
}

function openNoteFromIndex(key) {
  const parsed = parseStudyKey(key);
  if (!parsed) return;
  queryInput.value = buildReferenceInput(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd);
  if (versions.includes(parsed.version)) {
    versionSelect.value = parsed.version;
  }
  closeMenu();
  fetchVerse();
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
  renderNotesIndex();
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
    renderNotesIndex();
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
  renderNotesIndex();
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
  renderNotesIndex();
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
addListener(document.getElementById("zenProject"), "click", openProjection);
// touchend directo sobre cada boton — imprescindible en iOS donde el handler
// del overlay padre no recibe el toque correctamente sobre elementos hijos
zenClose.addEventListener("touchend", (e) => { e.stopPropagation(); closeZen(); });
const zenProjectBtn = document.getElementById("zenProject");
if (zenProjectBtn) {
  zenProjectBtn.addEventListener("touchend", (e) => { e.stopPropagation(); openProjection(); });
}
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
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) {
    if (dy < -80) shareVerseAsPng();
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
  if (isProjOpen && event.key === "Escape") closeProjection();
  if (isProjOpen && event.key === "ArrowLeft") goPrev();
  if (isProjOpen && event.key === "ArrowRight") goNext();
});

// Proyeccion — controles
if (projectionOverlay) {
  const projCloseBtn = document.getElementById("projClose");
  const projPrevBtn = document.getElementById("projPrev");
  const projNextBtn = document.getElementById("projNext");

  [projCloseBtn, projPrevBtn, projNextBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("touchend", (e) => {
      e.stopPropagation();
      scheduleProjHide();
      if (btn === projCloseBtn) closeProjection();
      if (btn === projPrevBtn) goPrev();
      if (btn === projNextBtn) goNext();
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      scheduleProjHide();
      if (btn === projCloseBtn) closeProjection();
      if (btn === projPrevBtn) goPrev();
      if (btn === projNextBtn) goNext();
    });
  });

  projectionOverlay.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    projTouchStartX = e.touches[0].clientX;
    projTouchStartY = e.touches[0].clientY;
    scheduleProjHide();
  }, { passive: true });

  projectionOverlay.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - projTouchStartX;
    const dy = touch.clientY - projTouchStartY;
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) goPrev(); else goNext();
  }, { passive: true });

  projectionOverlay.addEventListener("click", scheduleProjHide);
}

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

function applyHighlight(color) {
  if (!activeHighlightRange || !currentResultKey) return;
  const useColor = HIGHLIGHT_COLORS.includes(color) ? color : activeHighlightColor;
  const highlights = readHighlights(highlightStorageKey());
  if (!color) {
    // Erase: remove any highlight that overlaps the active range
    const next = highlights.filter((h) => h.end <= activeHighlightRange.start || h.start >= activeHighlightRange.end);
    writeHighlights(highlightStorageKey(), normalizeHighlights(next, currentResultText.length));
  } else {
    highlights.push({ ...activeHighlightRange, color: useColor });
    writeHighlights(highlightStorageKey(), normalizeHighlights(highlights, currentResultText.length));
    showCtxTip("resaltado");
  }
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
  // Show color picker at tap position so the user can change color or erase
  activeHighlightRange = { start, end };
  activeHighlightContainer = target.closest("[data-highlight-host]") || verseEl;
  const rect = target.getBoundingClientRect();
  const top = Math.max(12, rect.top + window.scrollY - 46);
  const left = Math.min(window.innerWidth - 200, rect.left + window.scrollX);
  if (highlightBtn) {
    highlightBtn.style.top = `${top}px`;
    highlightBtn.style.left = `${left}px`;
    highlightBtn.hidden = false;
  }
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
  applyHighlight(activeHighlightColor);
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
  applyHighlight(activeHighlightColor);
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
    applyHighlight(activeHighlightColor);
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
addListener(highlightBtn, "click", (event) => {
  const swatch = event.target.closest(".hl-swatch");
  if (!swatch) return;
  const color = swatch.dataset.color;
  activeHighlightColor = HIGHLIGHT_COLORS.includes(color) ? color : activeHighlightColor;
  applyHighlight(color || null);
});

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
addListener(pushToggle, "click", () => {
  togglePushNotifications().catch(() => {
    setPushStatus("No se pudo activar notificaciones.");
  });
});
addListener(pushResubscribe, "click", () => {
  resubscribePushNotifications().catch(() => {
    setPushStatus("No se pudo reintentar notificaciones.");
  });
});
addListener(communitySave, "click", () => {
  saveCommunityProfile().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityRequestRole, "click", () => {
  requestCommunityRole().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityEdit, "click", () => {
  const info = readCommunityInfo();
  if (communityForm) communityForm.hidden = false;
  if (communityEdit) communityEdit.hidden = true;
  if (communitySummary) communitySummary.hidden = true;
  renderCommunityIdentity();
  if (communityRole) communityRole.value = info.requestedRole || info.role || "feligres";
  if (communityCity) communityCity.value = info.city || "";
  if (communityChurch) communityChurch.value = info.church || "";
});
function openCommunity() {
  closeMenu();
  const info = readCommunityInfo();
  updateCommunityUi(info);
  setCommunityTab(communityActiveTab);
  if (communityOverlay) communityOverlay.hidden = false;
  showCtxTip("comunidad");
  loadCommunityData(false).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
}

addListener(document.getElementById("communityTabs"), "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const tabBtn = target.closest(".community-tab");
  if (!tabBtn) return;
  setCommunityTab(tabBtn.dataset.tab);
  if (tabBtn.dataset.tab === "miembros") {
    loadCommunityMembers().catch(() => {});
  }
  if (tabBtn.dataset.tab === "admin") {
    loadCommunityAdminSummary().catch((error) => {
      setCommunityStatus(String(error && error.message ? error.message : error), true);
    });
  }
});

addListener(communityOpen, "click", () => {
  openCommunity();
});
addListener(communityClose, "click", () => {
  if (communityOverlay) communityOverlay.hidden = true;
});
addListener(communityOverlay, "click", (event) => {
  if (event.target === communityOverlay) communityOverlay.hidden = true;
});
addListener(communityRefresh, "click", () => {
  loadCommunityData(true).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityRefreshRequests, "click", () => {
  loadCommunityRoleRequests(true).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityApproveRole, "click", () => {
  approveCommunityRole().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityRoleRequestsList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".community-role-request-select");
  if (!button) return;
  const communityKey = button.getAttribute("data-community-key");
  if (!communityKey) return;
  selectCommunityRoleRequest(communityKey);
});
addListener(communityUseMyLocation, "click", () => {
  useCommunityViewerLocation().catch((error) => {
    const message = error && error.message ? error.message : "No pude obtener tu ubicacion.";
    setCommunityStatus(String(message), true);
  });
});
addListener(communityLocationsList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".community-map-location-btn");
  if (!button) return;
  const locationId = Number(button.getAttribute("data-location-id"));
  if (!locationId) return;
  selectCommunityMapLocation(locationId);
});
addListener(communityNearbyActions, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".community-map-location-btn");
  if (!button) return;
  const locationId = Number(button.getAttribute("data-location-id"));
  if (!locationId) return;
  selectCommunityMapLocation(locationId);
});
addListener(communityCreateLocation, "click", () => {
  createCommunityLocation().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityCreateEvent, "click", () => {
  createCommunityEvent().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityEventsList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".community-checkin-btn");
  if (!button) return;
  const eventId = Number(button.getAttribute("data-event-id"));
  if (!eventId) return;
  checkInToCommunityEvent(eventId).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityLocateBtn, "click", useCommunityProfileLocation);
addListener(document.getElementById("communityRefreshMembers"), "click", () => {
  loadCommunityMembers().catch((err) => {
    setCommunityStatus(String(err && err.message ? err.message : err), true);
  });
});
addListener(communityMiembrosList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".member-save-btn");
  if (!button) return;
  const card = button.closest(".member-card");
  const memberId = Number(button.getAttribute("data-member-id"));
  if (!card || !memberId) return;
  updateCommunityMember(card, memberId).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(communityRefreshAdmin, "click", () => {
  loadCommunityAdminSummary().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});
addListener(bigUiToggle, "change", () => {
  const enabled = !!bigUiToggle && bigUiToggle.checked;
  applyBigUi(enabled);
  try {
    localStorage.setItem("bigUi", enabled ? "1" : "0");
  } catch {
    // ignore
  }
});
addListener(notesList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".note-link");
  if (!button) return;
  const key = button.dataset.studyKey;
  if (!key) return;
  openNoteFromIndex(key);
});
addListener(bookmarkBtn, "click", toggleCurrentBookmark);
addListener(resultDevotionalBtn, "click", () => {
  openDevotionalOverlay(currentResultReference);
});
addListener(bookmarksList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".bookmark-link");
  if (!button) return;
  const id = button.dataset.bookmarkId;
  if (!id) return;
  openBookmark(id);
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
addListener(pickerBtn, "click", openPicker);
addListener(pickerClose, "click", closePicker);
addListener(pickerOverlay, "click", (event) => {
  if (event.target === pickerOverlay) closePicker();
});
addListener(pickerApply, "click", applyPickerSelection);
addListener(pickerOld, "click", () => setPickerTestament("old"));
addListener(pickerNew, "click", () => setPickerTestament("new"));

attachPickerScroll(pickerBook, async (index) => {
  const bookItems = getCurrentPickerBooks();
  const book = bookItems[index];
  if (!book) return;
  pickerState.bookIndex = BOOKS.indexOf(book);
  pickerState.chapter = 1;
  pickerState.verse = 1;
  updatePickerChapters();
  await updatePickerVerses();
});
attachPickerScroll(pickerChapter, async (index) => {
  pickerState.chapter = index + 1;
  pickerState.verse = 1;
  await updatePickerVerses();
});
attachPickerScroll(pickerVerse, (index) => {
  pickerState.verse = index + 1;
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
    renderHomeCards();
    updatePushPreferences().catch(() => {
      // ignore
    });
  });
}

addListener(communityRefreshCells, "click", () => {
  loadStudyCells().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});

addListener(communityCreateCellBtn, "click", () => {
  createStudyCell().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});

addListener(communityCellsList, "click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest(".community-cell-view-btn");
  if (!btn) return;
  const cellId = Number(btn.getAttribute("data-cell-id"));
  if (!cellId) return;
  openStudyMaterials(cellId).catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});

addListener(communityCloseMaterials, "click", closeStudyMaterials);

addListener(communityCreateMaterial, "click", () => {
  createStudyMaterial().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
});

addListener(developerOpen, "click", () => {
  closeMenu();
  openDeveloperPanel();
});

addListener(developerClose, "click", closeDeveloperPanel);

addListener(developerOverlay, "click", (event) => {
  if (event.target === developerOverlay) closeDeveloperPanel();
});

addListener(developerLoginBtn, "click", () => {
  developerLogin();
});

addListener(developerCodeInput, "keydown", (event) => {
  if (event.key === "Enter") developerLogin();
});

addListener(devRefreshChurches, "click", () => {
  loadDeveloperChurches().catch((error) => {
    setCommunityStatus(String(error && error.message ? error.message : error), true);
  });
  renderDeveloperCells();
});

addListener(superadminOpen, "click", () => {
  closeMenu();
  openSuperadminPanel();
});

addListener(document.getElementById("logoutBtn"), "click", () => {
  logoutSession();
});

addListener(superadminClose, "click", closeSuperadminPanel);

addListener(superadminOverlay, "click", (event) => {
  if (event.target === superadminOverlay) closeSuperadminPanel();
});

addListener(superadminLoginBtn, "click", () => {
  superadminLogin();
});

addListener(superadminPasswordInput, "keydown", (event) => {
  if (event.key === "Enter") superadminLogin();
});

addListener(superadminChangePasswordBtn, "click", () => {
  superadminChangePassword();
});

addListener(superadminLogoutBtn, "click", () => {
  superadminLogout();
});

if (superadminPanel) {
  superadminPanel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tabBtn = target.closest(".sa-tab[data-sa-tab]");
    if (tabBtn) {
      switchSuperadminTab(tabBtn.getAttribute("data-sa-tab"));
      return;
    }
    const saveBtn = target.closest(".sa-setting-save");
    if (saveBtn) {
      const field = saveBtn.closest(".sa-field");
      if (field) saveSuperadminSetting(field);
    }
  });
}

if (developerPanel) {
  developerPanel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const churchToggle = target.closest(".dev-church-toggle");
    if (churchToggle) {
      const churchKey = churchToggle.getAttribute("data-church-key");
      const isActive = churchToggle.getAttribute("data-next-active") === "true";
      toggleDeveloperChurch(churchKey, isActive).catch((error) => {
        setCommunityStatus(String(error && error.message ? error.message : error), true);
      });
      return;
    }
    const btn = target.closest(".dev-role-btn[data-dev-role]");
    if (!btn) return;
    const role = btn.getAttribute("data-dev-role");
    applyDevRole(role);
  });
}

initVersions();
initSplash();
initScrollObserver();
initFooterFlame();
initHelpTabs();
initTour();
initUpdateBanner();

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
    initEmbers();
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

  const EMBER_COLORS = ["#f39c12","#c0641a","#e07828","#f5c96b","#a03010","#7a1a0a","#f2a040","#ffcc44"];
  const EMBER_COUNT = isMobile ? 160 : 280;
  let embers = [];

  function makeEmber() {
    return {
      x: rand(-W * 0.05, W * 1.05),
      y: rand(H * 0.5, H * 1.15),
      vx: rand(-0.5, 0.5) * dpr,
      vy: rand(-3.2, -1.0) * dpr,
      life: 0,
      maxLife: rand(1.4, 3.2),
      size: rand(0.9, 3.8) * dpr,
      colorIdx: (Math.random() * EMBER_COLORS.length) | 0,
      freq1: rand(2.8, 5.8),
      freq2: rand(1.4, 3.4),
      freq3: rand(6.0, 12.0),
      amp1: rand(1.2, 3.2) * dpr,
      amp2: rand(0.5, 1.4) * dpr,
      amp3: rand(0.15, 0.55) * dpr,
      phase1: rand(0, Math.PI * 2),
      phase2: rand(0, Math.PI * 2),
      phase3: rand(0, Math.PI * 2),
      spiral: Math.random() < 0.35,
      spiralR: rand(1.0, 2.5) * dpr,
      spiralFreq: rand(3.5, 8.0) * (Math.random() < 0.5 ? 1 : -1),
      drift: rand(-0.12, 0.12) * dpr
    };
  }

  function initEmbers() {
    embers = [];
    for (let i = 0; i < EMBER_COUNT; i++) {
      const e = makeEmber();
      e.life = rand(0, e.maxLife * 0.9);
      e.y = rand(0, H * 1.1);
      embers.push(e);
    }
  }

  function stepAndDrawEmbers(dt) {
    if (prefersReducedMotion) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.life += dt;
      if (e.life >= e.maxLife) {
        embers[i] = makeEmber();
        continue;
      }

      const lf = e.life / e.maxLife;

      const tx = e.amp1 * Math.sin(e.freq1 * e.life + e.phase1)
               + e.amp2 * Math.sin(e.freq2 * e.life * 2.7 + e.phase2)
               + e.amp3 * Math.sin(e.freq3 * e.life + e.phase3)
               + (e.spiral ? e.spiralR * Math.cos(e.spiralFreq * e.life) : 0);

      e.x += (e.vx + tx + e.drift) * dt * 60;
      e.y += e.vy * dt * 60;
      if (lf < 0.45) e.vy -= 0.055 * dpr * dt * 60;

      let a;
      if (lf < 0.12) a = lf / 0.12;
      else if (lf < 0.72) a = 1.0;
      else a = 1 - (lf - 0.72) / 0.28;
      a = clamp(a, 0, 1) * 0.42;

      const s = e.size * (0.55 + 0.7 * Math.sin(Math.PI * lf));
      if (a <= 0.004 || s <= 0.3) continue;

      const color = EMBER_COLORS[e.colorIdx];

      ctx.globalAlpha = a * 0.28;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, s * 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, s * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = a;
      ctx.fillStyle = lf < 0.55 ? "#fff8e4" : color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(0.4, s * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    stepAndDrawEmbers(dt);

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

// --- Sincronizacion del espacio personal (local-first) ---
// localStorage sigue siendo la fuente inmediata; el servidor es el respaldo
// multi-dispositivo. Cola deduplicada por type|key con last-write-wins.
const SYNC_QUEUE_KEY = "syncQueue";
let syncFlushTimer = 0;

function readSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function queueSync(type, key, data, deleted) {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession() || !key) return;
  const queue = readSyncQueue();
  queue[`${type}|${key}`] = {
    type,
    key,
    data: deleted ? null : data,
    deleted: Boolean(deleted),
    updatedAtMs: Date.now()
  };
  writeSyncQueue(queue);
  clearTimeout(syncFlushTimer);
  syncFlushTimer = setTimeout(() => {
    flushSyncQueue();
  }, 3000);
}

async function flushSyncQueue() {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession()) return;
  const queue = readSyncQueue();
  const entries = Object.entries(queue).slice(0, 500);
  if (!entries.length) return;
  const items = entries.map(([, value]) => ({
    type: value.type,
    key: value.key,
    data: value.data,
    updatedAtMs: value.updatedAtMs,
    deleted: value.deleted
  }));
  try {
    await auth.authFetch("/me/space/sync", {
      method: "POST",
      body: JSON.stringify({ items })
    });
    const current = readSyncQueue();
    for (const [queueKey, sent] of entries) {
      if (current[queueKey] && current[queueKey].updatedAtMs === sent.updatedAtMs) {
        delete current[queueKey];
      }
    }
    writeSyncQueue(current);
  } catch {
    // sin red o backend caido: la cola queda y se reintenta
  }
}

async function pullSpace() {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession()) return;
  const data = await auth.authFetch("/me/space");
  const queue = readSyncQueue();
  const localIsNewer = (type, key, serverMs) => {
    const pending = queue[`${type}|${key}`];
    return pending && pending.updatedAtMs > serverMs;
  };
  for (const item of data.highlights || []) {
    if (localIsNewer("highlight", item.key, item.updatedAtMs)) continue;
    try {
      localStorage.setItem(`highlight:${item.key}`, JSON.stringify(item.data));
    } catch {
      // ignore
    }
  }
  for (const item of data.studies || []) {
    if (localIsNewer("study", item.key, item.updatedAtMs)) continue;
    try {
      localStorage.setItem(`study:${item.key}`, JSON.stringify(item.data));
    } catch {
      // ignore
    }
  }
  if ((data.bookmarks || []).length) {
    const local = readBookmarks();
    const byId = new Map(local.map((bookmark) => [bookmark.id, bookmark]));
    for (const item of data.bookmarks || []) {
      if (localIsNewer("bookmark", item.key, item.updatedAtMs)) continue;
      byId.set(item.key, { id: item.key, ...(item.data || {}) });
    }
    writeBookmarksRaw([...byId.values()].slice(0, 60));
  }
  if (data.prefs && !localIsNewer("prefs", "prefs", data.prefs.updatedAtMs)) {
    try {
      if (data.prefs.lastQuery && !localStorage.getItem("lastQuery")) {
        localStorage.setItem("lastQuery", JSON.stringify(data.prefs.lastQuery));
      }
      if (Array.isArray(data.prefs.dailyThemes) && data.prefs.dailyThemes.length) {
        localStorage.setItem("dailyThemes", JSON.stringify(data.prefs.dailyThemes));
      }
    } catch {
      // ignore
    }
  }
}

function readLastQueryRaw() {
  try {
    const raw = localStorage.getItem("lastQuery");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function queuePrefsSync() {
  queueSync("prefs", "prefs", {
    lastQuery: readLastQueryRaw(),
    dailyThemes: getSelectedThemes()
  });
}

// Primer login en un dispositivo con datos previos: sube todo con
// updatedAtMs=0 (o el updatedAt real si existe) para nunca pisar datos
// mas nuevos ya sincronizados desde otro dispositivo.
async function migrateLegacySpace() {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession()) return;
  if (localStorage.getItem("migrationDone") === "1") return;
  const items = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const storageKey = localStorage.key(i);
    if (!storageKey) continue;
    if (storageKey.startsWith("highlight:")) {
      const data = readHighlights(storageKey);
      if (data.length) {
        items.push({ type: "highlight", key: storageKey.slice(10), data, updatedAtMs: 0 });
      }
    } else if (storageKey.startsWith("study:")) {
      try {
        const data = JSON.parse(localStorage.getItem(storageKey));
        if (hasStudyData(data)) {
          items.push({
            type: "study",
            key: storageKey.slice(6),
            data,
            updatedAtMs: Number(data.updatedAt) || 0
          });
        }
      } catch {
        // entrada corrupta: se ignora
      }
    }
  }
  for (const bookmark of readBookmarks()) {
    items.push({ type: "bookmark", key: bookmark.id, data: bookmark, updatedAtMs: Number(bookmark.updatedAt) || 0 });
  }
  const lastQuery = readLastQueryRaw();
  const themes = getSelectedThemes();
  if (lastQuery || themes.length) {
    items.push({ type: "prefs", key: "prefs", data: { lastQuery, dailyThemes: themes }, updatedAtMs: 0 });
  }
  if (!items.length) {
    try {
      localStorage.setItem("migrationDone", "1");
    } catch {
      // ignore
    }
    return;
  }
  for (let i = 0; i < items.length; i += 400) {
    await auth.authFetch("/me/space/sync", {
      method: "POST",
      body: JSON.stringify({ items: items.slice(i, i + 400) })
    });
  }
  try {
    localStorage.setItem("migrationDone", "1");
  } catch {
    // ignore
  }
}

let spaceSyncStarted = false;

function startSpaceSync() {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession() || spaceSyncStarted) return;
  spaceSyncStarted = true;
  migrateLegacySpace()
    .catch(() => {
      // sin red: se reintenta en el proximo inicio
    })
    .then(() => pullSpace())
    .catch(() => {
      // ignore
    })
    .finally(() => {
      flushSyncQueue();
    });
  window.addEventListener("online", () => {
    flushSyncQueue();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSyncQueue();
  });
}

function getUserName() {
  const auth = window.ReadBibleAuth;
  const user = auth ? auth.getSessionUser() : null;
  if (user && user.fullName) return user.fullName;
  return localStorage.getItem("userName");
}

function closeSplash(timer) {
  if (timer) clearTimeout(timer);
  splash.hidden = true;
  resolveAuthGate();
}

let loggedInInitDone = false;

function onLoggedIn() {
  if (welcomeGate) welcomeGate.hidden = true;
  if (loggedInInitDone) return;
  loggedInInitDone = true;
  restoreLastQuery();
  initFooterNav();
  refreshPushStatus().catch(() => {
    // ignore
  });
  updateCommunityUi(readCommunityInfo());
  getCommunityKey();
  if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    loadCommunityData(false).catch(() => {
      // ignore initial local bootstrap errors
    });
  }
  startSpaceSync();
  renderHomeCards();
  const homeDevotionalBtn = document.getElementById("homeDevotionalBtn");
  const homeCommunityBtn = document.getElementById("homeCommunityBtn");
  if (homeDevotionalBtn) homeDevotionalBtn.addEventListener("click", () => openDevotionalOverlay());
  if (homeCommunityBtn) homeCommunityBtn.addEventListener("click", () => openCommunity());
  showHelpIfFirstTime();
}

async function resolveAuthGate() {
  const auth = window.ReadBibleAuth;
  if (!auth) {
    onLoggedIn();
    return;
  }
  const redirectCredential = auth.consumeRedirectCredential();
  if (redirectCredential) {
    try {
      await auth.loginWithCredential(redirectCredential);
    } catch {
      // credencial de redirect invalida: cae al gate
    }
  }
  if (auth.hasSession()) {
    onLoggedIn();
    auth.validateSession().then((state) => {
      if (state === "invalid") showWelcomeGate();
    }).catch(() => {
      // sin red: se sigue con la sesion local
    });
    return;
  }
  showWelcomeGate();
}

function setWelcomeStatus(message) {
  if (!welcomeStatus) return;
  welcomeStatus.textContent = message || "";
  welcomeStatus.hidden = !message;
}

function showGoogleFallbackButton(clientId) {
  if (!googleSignInBtn) return;
  googleSignInBtn.hidden = false;
  googleSignInBtn.onclick = () => window.ReadBibleAuth.startRedirectLogin(clientId);
}

async function handleGoogleCredential(credential) {
  setWelcomeStatus("Ingresando...");
  try {
    await window.ReadBibleAuth.loginWithCredential(credential);
    setWelcomeStatus("");
    onLoggedIn();
  } catch (error) {
    setWelcomeStatus(error.message || "No pude iniciar sesion. Proba de nuevo.");
  }
}

async function showWelcomeGate() {
  if (!welcomeGate) {
    onLoggedIn();
    return;
  }
  const auth = window.ReadBibleAuth;
  welcomeGate.hidden = false;
  setWelcomeStatus("");
  if (devSignInBtn && auth.isLocalhost()) {
    devSignInBtn.hidden = false;
    devSignInBtn.onclick = () => handleGoogleCredential(auth.buildDevCredential());
  }
  let clientId = "";
  let authConfig = {};
  try {
    authConfig = await auth.authFetch("/auth/config");
    clientId = auth.selectGoogleClientId(authConfig);
  } catch {
    // sin red o backend sin desplegar: rige el interruptor de abajo
  }
  if (!clientId) {
    // Interruptor anti-lockout: sin client ID configurado la app sigue
    // funcionando en modo legado para no dejar a nadie afuera.
    setWelcomeStatus("El ingreso con Google se habilita pronto.");
    if (legacyContinueBtn) {
      legacyContinueBtn.hidden = false;
      legacyContinueBtn.onclick = () => onLoggedIn();
    }
    return;
  }
  if (auth.getNativePlatform() !== "web") {
    if (googleSignInBtn) {
      googleSignInBtn.hidden = false;
      googleSignInBtn.onclick = async () => {
        try {
          const credential = await auth.requestNativeGoogleCredential(clientId);
          await handleGoogleCredential(credential);
        } catch (error) {
          setWelcomeStatus(error.message || "No pude iniciar sesion en este dispositivo.");
        }
      };
    }
    return;
  }
  if (auth.isStandaloneIos()) {
    showGoogleFallbackButton(clientId);
    return;
  }
  try {
    await auth.loadGisScript();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleGoogleCredential(response.credential),
      use_fedcm_for_prompt: true
    });
    window.google.accounts.id.renderButton(googleSignInSlot, {
      theme: "outline",
      text: "continue_with",
      shape: "pill",
      locale: "es",
      width: 280
    });
  } catch {
    showGoogleFallbackButton(clientId);
  }
}

async function logoutSession() {
  const auth = window.ReadBibleAuth;
  if (auth) await auth.logout();
  location.reload();
}

async function loadDailyVerseData() {
  try {
    const verses = await fetchJson("daily_verses.json");
    if (!Array.isArray(verses) || !verses.length) {
      throw new Error("daily verses empty");
    }
    const dayIndex = dayOfYearIndex();
    const idx = dailyIndexForUser(dayIndex, verses.length);
    const verse = verses[idx];
    const reference = sanitizeReferenceString(verse.reference || "");
    let verseText = verse.text || "";
    const contextText = verse.context || "";
    if (!verseText && reference) {
      verseText = await fetchVerseByReference(reference, DAILY_VERSION);
    }
    if (verseText || reference) {
      writeDailyVerseCache({ text: verseText, reference, context: contextText, version: DAILY_VERSION });
    }
    return { reference, verseText, contextText };
  } catch {
    const cached = readDailyVerseCache();
    if (cached) {
      return {
        reference: cached.reference || "",
        verseText: cached.text || "",
        contextText: cached.context || ""
      };
    }
    return { reference: "", verseText: "", contextText: "" };
  }
}

function firstName(fullName) {
  return String(fullName || "").trim().split(/\s+/)[0] || "";
}

// --- Devocionales ---
const devotionalState = {
  month: "",
  selectedDate: "",
  entries: new Map(),
  streak: null
};

function localIsoDate(date) {
  const d = date || new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function devotionalDraftKey(date) {
  return `devotionalDraft:${date}`;
}

function readDevotionalDraft(date) {
  try {
    const raw = localStorage.getItem(devotionalDraftKey(date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDevotionalDraft(date, data) {
  try {
    if (data) localStorage.setItem(devotionalDraftKey(date), JSON.stringify(data));
    else localStorage.removeItem(devotionalDraftKey(date));
  } catch {
    // ignore
  }
}

function devotionalFormData() {
  return {
    title: (document.getElementById("devotionalTitle") || {}).value || "",
    passageReference: (document.getElementById("devotionalPassage") || {}).value || "",
    observation: (document.getElementById("devotionalObservation") || {}).value || "",
    application: (document.getElementById("devotionalApplication") || {}).value || "",
    prayer: (document.getElementById("devotionalPrayer") || {}).value || "",
    mood: (document.getElementById("devotionalMood") || {}).value || "",
    isPrivate: Boolean((document.getElementById("devotionalPrivate") || {}).checked)
  };
}

function fillDevotionalForm(data) {
  const fields = {
    devotionalTitle: data && data.title,
    devotionalPassage: data && data.passageReference,
    devotionalObservation: data && data.observation,
    devotionalApplication: data && data.application,
    devotionalPrayer: data && data.prayer
  };
  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }
  const mood = document.getElementById("devotionalMood");
  if (mood) mood.value = data && data.mood ? data.mood : "";
  const privateInput = document.getElementById("devotionalPrivate");
  if (privateInput) privateInput.checked = !data || data.isPrivate !== false;
}

function hasDevotionalContent(data) {
  return Boolean(
    (data.observation && data.observation.trim()) ||
    (data.application && data.application.trim()) ||
    (data.prayer && data.prayer.trim())
  );
}

async function deleteDevotional() {
  const date = devotionalState.selectedDate;
  if (!date) return;
  const auth = window.ReadBibleAuth;
  if (auth && auth.hasSession()) {
    await auth.authFetch(`/me/devotionals/${date}/delete`, { method: "POST" });
  }
  writeDevotionalDraft(date, null);
  devotionalState.entries.delete(date);
  fillDevotionalForm(null);
  renderDevotionalCalendar();
  setDevotionalStatus("Devocional borrado.");
  await loadDevotionalMonth(devotionalState.month);
}

function setDevotionalStatus(message, isError) {
  const el = document.getElementById("devotionalStatus");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#a33" : "";
}

function renderDevotionalStreak() {
  const el = document.getElementById("devotionalStreak");
  if (!el) return;
  const streak = devotionalState.streak;
  if (!streak || !streak.totalDays) {
    el.textContent = "Hoy es un buen dia para tu primer devocional.";
    return;
  }
  if (streak.current > 1) {
    el.textContent = `Llevas ${streak.current} dias seguidos. ${streak.totalDays} devocionales en total.`;
  } else if (streak.current === 1) {
    el.textContent = `Hoy sumaste un dia mas. ${streak.totalDays} devocionales en total.`;
  } else {
    el.textContent = `Tenes ${streak.totalDays} devocionales guardados. Retoma hoy cuando quieras.`;
  }
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function renderDevotionalCalendar() {
  const container = document.getElementById("devotionalCalendar");
  const label = document.getElementById("devotionalMonthLabel");
  if (!container || !devotionalState.month) return;
  const [year, month] = devotionalState.month.split("-").map(Number);
  if (label) label.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayIso = localIsoDate();
  let html = ["D", "L", "M", "M", "J", "V", "S"].map((d) => `<span class="devcal-head">${d}</span>`).join("");
  for (let i = 0; i < firstDay.getDay(); i += 1) html += "<span></span>";
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const classes = ["devcal-day"];
    if (devotionalState.entries.has(iso)) classes.push("has-entry");
    if (iso === devotionalState.selectedDate) classes.push("selected");
    if (iso === todayIso) classes.push("today");
    const disabled = iso > todayIso ? "disabled" : "";
    html += `<button type="button" class="${classes.join(" ")}" data-dev-date="${iso}" ${disabled}>${day}</button>`;
  }
  container.innerHTML = html;
}

async function loadDevotionalMonth(month) {
  const auth = window.ReadBibleAuth;
  devotionalState.month = month;
  if (!auth || !auth.hasSession()) {
    devotionalState.entries = new Map();
    renderDevotionalCalendar();
    return;
  }
  try {
    const data = await auth.authFetch(`/me/devotionals?month=${month}&today=${localIsoDate()}`);
    devotionalState.entries = new Map((data.devotionals || []).map((item) => [item.date, item]));
    devotionalState.streak = data.streak || null;
  } catch {
    devotionalState.entries = new Map();
  }
  renderDevotionalCalendar();
  renderDevotionalStreak();
}

async function selectDevotionalDate(date) {
  devotionalState.selectedDate = date;
  const label = document.getElementById("devotionalDateLabel");
  if (label) {
    const [y, m, d] = date.split("-").map(Number);
    label.textContent = date === localIsoDate() ? "Hoy" : `${d} de ${MONTH_NAMES[m - 1].toLowerCase()} de ${y}`;
  }
  renderDevotionalCalendar();
  const draft = readDevotionalDraft(date);
  if (draft) {
    fillDevotionalForm(draft);
    setDevotionalStatus(draft.pendingUpload ? "Borrador guardado en este dispositivo, se sube cuando haya conexion." : "Borrador sin guardar.");
    return;
  }
  const entry = devotionalState.entries.get(date);
  if (entry) {
    fillDevotionalForm(entry);
    setDevotionalStatus("");
    return;
  }
  fillDevotionalForm(null);
  setDevotionalStatus("");
  if (date === localIsoDate()) {
    const { reference } = await loadDailyVerseData();
    const passage = document.getElementById("devotionalPassage");
    if (passage && !passage.value && reference) passage.value = reference;
  }
}

async function saveDevotional() {
  const date = devotionalState.selectedDate;
  if (!date) return;
  const data = devotionalFormData();
  if (!hasDevotionalContent(data)) {
    setDevotionalStatus("Escribi al menos una observacion, aplicacion u oracion.", true);
    return;
  }
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession()) {
    writeDevotionalDraft(date, { ...data, pendingUpload: true });
    setDevotionalStatus("Guardado en este dispositivo. Inicia sesion para sincronizarlo.");
    return;
  }
  setDevotionalStatus("Guardando...");
  try {
    const result = await auth.authFetch(`/me/devotionals/${date}`, {
      method: "POST",
      body: JSON.stringify({ ...data, updatedAtMs: Date.now() })
    });
    if (result.devotional) devotionalState.entries.set(date, result.devotional);
    writeDevotionalDraft(date, null);
    setDevotionalStatus("Devocional guardado.");
    loadDevotionalMonth(devotionalState.month);
  } catch {
    writeDevotionalDraft(date, { ...data, pendingUpload: true });
    setDevotionalStatus("Sin conexion: quedo guardado aca y se sube solo cuando vuelva la red.");
  }
}

async function flushDevotionalDrafts() {
  const auth = window.ReadBibleAuth;
  if (!auth || !auth.hasSession()) return;
  const pending = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith("devotionalDraft:")) {
      const draft = readDevotionalDraft(key.slice(16));
      if (draft && draft.pendingUpload) pending.push([key.slice(16), draft]);
    }
  }
  for (const [date, draft] of pending) {
    try {
      await auth.authFetch(`/me/devotionals/${date}`, {
        method: "POST",
        body: JSON.stringify({ ...draft, pendingUpload: undefined, updatedAtMs: Date.now() })
      });
      writeDevotionalDraft(date, null);
    } catch {
      // se reintenta en el proximo inicio
    }
  }
}

let devotionalWired = false;

function wireDevotionalOverlay() {
  if (devotionalWired) return;
  devotionalWired = true;
  const overlay = document.getElementById("devotionalOverlay");
  addListener(document.getElementById("devotionalClose"), "click", () => {
    if (overlay) overlay.hidden = true;
  });
  addListener(overlay, "click", (event) => {
    if (event.target === overlay) overlay.hidden = true;
  });
  addListener(document.getElementById("devotionalSave"), "click", () => {
    saveDevotional();
  });
  addListener(document.getElementById("devotionalDelete"), "click", () => {
    deleteDevotional().catch((error) => setDevotionalStatus(error.message || "No pude borrarlo.", true));
  });
  addListener(document.getElementById("devotionalUseDaily"), "click", async () => {
    const { reference } = await loadDailyVerseData();
    const passage = document.getElementById("devotionalPassage");
    if (passage && reference) passage.value = reference;
  });
  const calendar = document.getElementById("devotionalCalendar");
  addListener(calendar, "click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("[data-dev-date]");
    if (btn && !btn.disabled) selectDevotionalDate(btn.getAttribute("data-dev-date"));
  });
  addListener(document.getElementById("devotionalPrevMonth"), "click", () => shiftDevotionalMonth(-1));
  addListener(document.getElementById("devotionalNextMonth"), "click", () => shiftDevotionalMonth(1));
  for (const id of ["devotionalTitle", "devotionalPassage", "devotionalObservation", "devotionalApplication", "devotionalPrayer", "devotionalMood", "devotionalPrivate"]) {
    addListener(document.getElementById(id), "input", () => {
      const date = devotionalState.selectedDate;
      if (!date) return;
      const data = devotionalFormData();
      const existing = readDevotionalDraft(date);
      writeDevotionalDraft(date, { ...data, pendingUpload: Boolean(existing && existing.pendingUpload) });
    });
  }
}

function shiftDevotionalMonth(delta) {
  const [year, month] = devotionalState.month.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  loadDevotionalMonth(nextMonth);
}

async function openDevotionalOverlay(passageReference) {
  const overlay = document.getElementById("devotionalOverlay");
  if (!overlay) return;
  wireDevotionalOverlay();
  overlay.hidden = false;
  const today = localIsoDate();
  await loadDevotionalMonth(today.slice(0, 7));
  await selectDevotionalDate(today);
  if (passageReference) {
    const passage = document.getElementById("devotionalPassage");
    if (passage) passage.value = passageReference.replace(/\s*\([^)]*\)\s*$/, "");
  }
  flushDevotionalDrafts().then(() => loadDevotionalMonth(devotionalState.month)).catch(() => {
    // ignore
  });
  trackEvent("open_devotional");
}

function renderHomeGreeting() {
  if (!homeGreeting) return;
  const auth = window.ReadBibleAuth;
  const user = auth ? auth.getSessionUser() : null;
  const name = firstName(user && user.fullName ? user.fullName : getUserName());
  if (!name) {
    homeGreeting.hidden = true;
    if (homeTitle) homeTitle.hidden = false;
    return;
  }
  const avatar = user && user.avatarUrl
    ? `<img class="home-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="home-avatar home-avatar-letter">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
  homeGreeting.innerHTML = `${avatar}<span class="home-hello">Hola, ${escapeHtml(name)}</span>`;
  homeGreeting.hidden = false;
  if (homeTitle) homeTitle.hidden = true;
  if (homeSubtitle) homeSubtitle.hidden = true;
}

async function renderHomeCards() {
  if (!homeCards) return;
  homeCards.hidden = false;
  renderHomeGreeting();
  renderContinueCard();
  renderCommunityInviteCard();
  const { reference, verseText, contextText } = await loadDailyVerseData();
  if (!dailyCard) return;
  if (!verseText && !reference) {
    dailyCard.hidden = true;
    return;
  }
  if (contextText) {
    dailyCardText.innerHTML = `<span>${escapeHtml(verseText || "")}</span><span class="daily-home-context">${escapeHtml(contextText)}</span>`;
  } else {
    dailyCardText.textContent = verseText || "";
  }
  dailyCardRef.textContent = reference ? `${reference} (${DAILY_VERSION})` : "";
  dailyCard.hidden = false;
  if (dailyCardOpen) {
    dailyCardOpen.hidden = !reference;
    dailyCardOpen.onclick = () => {
      if (queryInput) queryInput.value = reference;
      fetchVerse();
      const searchSection = document.querySelector(".search");
      if (searchSection) searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
}

function renderContinueCard() {
  if (!continueCard) return;
  const last = readLastQueryRaw();
  if (!last || !last.query) {
    continueCard.hidden = true;
    return;
  }
  continueRef.textContent = `${last.query}${last.version ? ` (${last.version})` : ""}`;
  continueCard.hidden = false;
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (queryInput) queryInput.value = last.query;
      if (last.version && versionSelect) versionSelect.value = last.version;
      fetchVerse();
      const searchSection = document.querySelector(".search");
      if (searchSection) searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
}

function renderCommunityInviteCard() {
  if (!communityInviteCard) return;
  const info = readCommunityInfo();
  const hasProfile = Boolean(info.church || info.city);
  communityInviteCard.hidden = hasProfile;
  const inviteBtn = document.getElementById("communityInviteBtn");
  if (inviteBtn) inviteBtn.onclick = () => openCommunity();
}

function renderAccountInfo() {
  const container = document.getElementById("accountInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!container) return;
  const auth = window.ReadBibleAuth;
  const user = auth ? auth.getSessionUser() : null;
  if (!user) {
    container.innerHTML = `<p class="about-text">Sin sesion iniciada.</p>`;
    if (logoutBtn) logoutBtn.hidden = true;
    return;
  }
  if (logoutBtn) logoutBtn.hidden = false;
  const avatar = user.avatarUrl
    ? `<img class="account-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="account-avatar account-avatar-letter">${escapeHtml((user.fullName || "?").charAt(0).toUpperCase())}</span>`;
  container.innerHTML = `
    <div class="account-row">
      ${avatar}
      <div>
        <p class="account-name">${escapeHtml(user.fullName || "")}</p>
        <p class="account-email">${escapeHtml(user.email || "")}</p>
      </div>
    </div>
  `;
}

function openMenu() {
  if (!sideMenu) return;
  renderBookmarksIndex();
  renderNotesIndex();
  renderAccountInfo();
  refreshPushStatus().catch(() => {
    // ignore
  });
  sideMenu.hidden = false;
}

function closeMenu() {
  if (!sideMenu) return;
  sideMenu.hidden = true;
}

/* ---- Sistema de actualizaciones ---- */
let swRegistration = null;
let updateBannerShown = false;

function onSwRegistered(reg) {
  swRegistration = reg;
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    showUpdateBanner();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED" && hadController) {
      showUpdateBanner();
    }
  });

  setInterval(() => {
    reg.update().catch(() => {});
  }, 30 * 60 * 1000);
}

function showUpdateBanner() {
  if (updateBannerShown || !updateBanner) return;
  updateBannerShown = true;
  updateBanner.hidden = false;
}

function initUpdateBanner() {
  const versionEl = document.getElementById("appVersionDisplay");
  if (versionEl) versionEl.textContent = APP_VERSION;

  const reloadBtn = document.getElementById("updateReloadBtn");
  const dismissBtn = document.getElementById("updateDismissBtn");
  const checkBtn = document.getElementById("checkUpdateBtn");

  if (reloadBtn) reloadBtn.addEventListener("click", () => window.location.reload());
  if (dismissBtn) dismissBtn.addEventListener("click", () => { if (updateBanner) updateBanner.hidden = true; });
  if (checkBtn) checkBtn.addEventListener("click", checkForUpdate);
}

function checkForUpdate() {
  const btn = document.getElementById("checkUpdateBtn");
  if (!swRegistration) {
    showCtxTip("upToDate");
    return;
  }
  if (btn) btn.textContent = "Buscando...";
  let found = false;
  const onFound = () => { found = true; };
  swRegistration.addEventListener("updatefound", onFound, { once: true });
  swRegistration.update().then(() => {
    setTimeout(() => {
      swRegistration.removeEventListener("updatefound", onFound);
      if (btn) btn.textContent = "Buscar actualizaciones";
      if (!found && !updateBannerShown) showCtxTip("upToDate");
    }, 3500);
  }).catch(() => {
    if (btn) btn.textContent = "Buscar actualizaciones";
    showCtxTip("updateError");
  });
}

function openHelp(tab) {
  if (!helpOverlay) return;
  if (tab) switchHelpTab(tab);
  helpOverlay.hidden = false;
  trackEvent("open_help");
}

function closeHelp() {
  if (!helpOverlay) return;
  helpOverlay.hidden = true;
}

function switchHelpTab(name) {
  helpOverlay.querySelectorAll(".help-tab").forEach((btn) => {
    btn.classList.toggle("help-tab-active", btn.dataset.helpTab === name);
  });
  helpOverlay.querySelectorAll(".help-tab-content").forEach((panel) => {
    panel.hidden = panel.dataset.helpPanel !== name;
  });
}

function initHelpTabs() {
  helpOverlay.querySelectorAll(".help-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchHelpTab(btn.dataset.helpTab));
  });
  const tourBtn = document.getElementById("helpStartTour");
  if (tourBtn) tourBtn.addEventListener("click", () => { closeHelp(); startTour(); });
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

/* ---- Tour guiado ---- */
const TOUR_STEPS = [
  {
    sel: "#verseInput",
    title: "Buscar un versiculo",
    text: "Escribe cualquier referencia biblica. Por ejemplo: Juan 3:16 o Salmos 23:1-3.",
    pad: 10
  },
  {
    sel: "#searchBtn",
    title: "Boton Buscar",
    text: "Toca Buscar o presiona Enter. La app encuentra el versiculo en segundos.",
    pad: 8
  },
  {
    sel: "#result",
    title: "Resultado",
    text: "El texto aparece aqui. Toca y arrastra para resaltar. Manten presionado para agregar una nota de estudio.",
    pad: 10,
    whenVisible: true
  },
  {
    sel: ".footer-nav",
    title: "Barra de navegacion",
    text: "Desde aqui accedes rapidamente al inicio, la busqueda, tu devocional y el menu lateral.",
    pad: 6
  },
  {
    sel: "#floatDevotionalBtn",
    title: "Tu devocional",
    text: "Tu espacio personal para el devocional de cada dia: lectura, observacion, aplicacion y oracion.",
    pad: 10
  },
  {
    sel: "#floatMenuBtn",
    title: "Menu lateral",
    text: "Notificaciones, temas, ajustes, ayuda y mas. Todo lo que no esta en la pantalla principal.",
    pad: 10
  }
];

let tourStep = 0;
let tourActive = false;
let ctxTipTimer = null;

function startTour() {
  if (!tourOverlay) return;
  tourStep = 0;
  tourActive = true;
  tourOverlay.hidden = false;
  showTourStep(0);
  trackEvent("tour_start");
}

function endTour() {
  tourActive = false;
  if (tourOverlay) tourOverlay.hidden = true;
  try { localStorage.setItem("tourDone", "1"); } catch { }
  trackEvent("tour_end");
}

function showTourStep(idx) {
  const step = TOUR_STEPS[idx];
  if (!step) { endTour(); return; }

  const el = document.querySelector(step.sel);
  const pad = step.pad || 8;

  tourTitle.textContent = step.title;
  tourText.textContent = step.text;
  tourCounter.textContent = `${idx + 1} / ${TOUR_STEPS.length}`;
  tourNext.textContent = idx === TOUR_STEPS.length - 1 ? "Finalizar" : "Siguiente";

  if (!el || (step.whenVisible && el.hidden)) {
    positionSpotlight(null);
    positionTooltip(null);
    return;
  }

  const rect = el.getBoundingClientRect();
  positionSpotlight({ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, radius: 10 });
  positionTooltip(rect);
}

function positionSpotlight(r) {
  if (!tourSpotlight) return;
  if (!r) {
    tourSpotlight.style.top = "45%";
    tourSpotlight.style.left = "50%";
    tourSpotlight.style.width = "0px";
    tourSpotlight.style.height = "0px";
    return;
  }
  tourSpotlight.style.top = r.top + "px";
  tourSpotlight.style.left = r.left + "px";
  tourSpotlight.style.width = r.width + "px";
  tourSpotlight.style.height = r.height + "px";
  tourSpotlight.style.borderRadius = r.radius + "px";
}

function positionTooltip(targetRect) {
  if (!tourTooltip) return;
  const tw = tourTooltip.offsetWidth || 300;
  const th = tourTooltip.offsetHeight || 120;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;

  let top, left;

  if (!targetRect) {
    top = vh / 2 - th / 2;
    left = vw / 2 - tw / 2;
  } else {
    const spaceBelow = vh - targetRect.bottom;
    const spaceAbove = targetRect.top;
    if (spaceBelow >= th + margin + 8) {
      top = targetRect.bottom + margin;
    } else if (spaceAbove >= th + margin + 8) {
      top = targetRect.top - th - margin;
    } else {
      top = vh / 2 - th / 2;
    }
    left = targetRect.left + targetRect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(vw - tw - margin, left));
    top = Math.max(margin, Math.min(vh - th - margin, top));
  }

  tourTooltip.style.top = top + "px";
  tourTooltip.style.left = left + "px";
}

function initTour() {
  if (!tourNext || !tourSkip) return;
  tourNext.addEventListener("click", () => {
    tourStep += 1;
    if (tourStep >= TOUR_STEPS.length) endTour();
    else showTourStep(tourStep);
  });
  tourSkip.addEventListener("click", endTour);
}

/* ---- Tips contextuales ---- */
const CTX_TIPS = {
  comunidad: "Completa tu perfil de comunidad para aparecer en el mapa de tu iglesia.",
  lectura_plena: "En lectura plena, desliza hacia arriba para compartir el versiculo.",
  resaltado: "Arrastra sobre el texto para resaltar versiculos. Mantelo presionado para notas.",
  upToDate: "Ya tenes la ultima version instalada.",
  updateError: "No se pudo verificar. Revisa tu conexion."
};

function showCtxTip(key) {
  if (!ctxTip) return;
  try {
    if (localStorage.getItem("ctxTip_" + key)) return;
    localStorage.setItem("ctxTip_" + key, "1");
  } catch { }
  if (ctxTipTimer) clearTimeout(ctxTipTimer);
  ctxTip.textContent = CTX_TIPS[key] || "";
  ctxTip.hidden = false;
  ctxTipTimer = setTimeout(() => { if (ctxTip) ctxTip.hidden = true; }, 4200);
}

ctxTip && ctxTip.addEventListener("click", () => { ctxTip.hidden = true; });


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
