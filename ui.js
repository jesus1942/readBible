(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const library = $("libraryDialog");
  const support = $("supportDialog");
  const bookList = $("libraryBooks");
  const chapterSection = $("libraryChapters");
  let collection = "old";
  let searchMode = "reference";
  let searchRequest = 0;
  let readerSize = 24;
  try { readerSize = Math.max(18, Math.min(38, Number(localStorage.getItem("readerFontSize")) || 24)); } catch {}
  const icon = (key) => `<img src="assets/ui/${key || "more"}.svg" width="20" height="20" alt="" />`;
  document.querySelectorAll(".nav-item, .footer-nav-btn").forEach((button) => {
    const key = button.dataset.uiAction || ({ floatHomeBtn: "read", floatSearchBtn: "search", floatMenuBtn: "more", floatDevotionalBtn: "devotional" })[button.id];
    button.insertAdjacentHTML("afterbegin", icon(key));
  });
  $("supportPayment").href = $("donationBtn").href;
  document.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  [library, support].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  function setNav(action) {
    document.querySelectorAll(".nav-item, .footer-nav-btn").forEach((button) => {
      const own = button.dataset.uiAction || ({ floatHomeBtn: "read", floatSearchBtn: "search", floatMenuBtn: "settings", floatDevotionalBtn: "devotional" })[button.id];
      button.classList.toggle("is-current", own === action);
      if (own === action) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  function menuSection(id) {
    openMenu();
    document.querySelectorAll(".side-menu-about.is-focused").forEach((node) => node.classList.remove("is-focused"));
    const section = $(id)?.closest(".side-menu-about");
    if (section) {
      section.classList.add("is-focused");
      section.scrollIntoView({ block: "start" });
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    }
  }
  function navigate(action) {
    setNav(action);
    if (action !== "settings" && action !== "notes" && action !== "bookmarks") closeMenu();
    if (action === "books") { renderBooks(); if (!library.open) library.showModal(); }
    if (action === "read") $("readingArea").scrollIntoView({ block: "start", behavior: "smooth" });
    if (action === "search") { document.querySelector(".search").scrollIntoView({ block: "start", behavior: "smooth" }); queryInput.focus({ preventScroll: true }); }
    if (action === "notes") menuSection("notesList");
    if (action === "bookmarks") menuSection("bookmarksList");
    if (action === "settings") { openMenu(); document.querySelector(".side-menu-panel").scrollTop = 0; }
    if (action === "devotional") openDevotionalOverlay();
    if (action === "community") openCommunity();
    if (action === "projection") openProjection();
    if (action === "support" && !support.open) support.showModal();
  }
  document.querySelectorAll("[data-ui-action]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.uiAction)));
  $("floatHomeBtn").addEventListener("click", () => setNav("read"));
  $("floatSearchBtn").addEventListener("click", () => setNav("search"));
  $("floatMenuBtn").addEventListener("click", () => setNav("settings"));
  function booksForCollection() {
    if (collection === "ancient") return window.ReadBibleApocrypha?.ANCIENT_BOOKS || [];
    return collection === "old" ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;
  }
  function renderBooks() {
    chapterSection.hidden = true;
    bookList.hidden = false;
    $("bookFilter").hidden = false;
    bookList.replaceChildren();
    const filter = normalizeForMatch($("bookFilter").value);
    const books = booksForCollection().filter((book) => normalizeForMatch(book).includes(filter));
    books.forEach((book) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = book;
      const meta = document.createElement("small");
      meta.textContent = `${BOOK_CHAPTERS[book]} ${BOOK_CHAPTERS[book] === 1 ? "capítulo" : "capítulos"}`;
      button.appendChild(meta);
      button.addEventListener("click", () => showChapters(book));
      bookList.appendChild(button);
    });
    $("librarySource").textContent = !books.length ? "No se encontraron libros en esta colección." : collection === "ancient" ? "Deuterocanónicos y otros textos antiguos. 1 Enoc está disponible en español y en su fuente inglesa; cada lectura indica su procedencia." : `${books.length} libros para explorar.`;
  }
  function showChapters(book) {
    bookList.hidden = true;
    $("bookFilter").hidden = true;
    chapterSection.hidden = false;
    $("libraryBookTitle").textContent = book;
    $("chapterGrid").replaceChildren();
    for (let chapter = 1; chapter <= BOOK_CHAPTERS[book]; chapter++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(chapter);
      button.setAttribute("aria-label", `${book}, capítulo ${chapter}`);
      button.addEventListener("click", () => {
        queryInput.value = buildReferenceInput(book, chapter, 1, 1);
        library.close();
        setSearchMode("reference");
        fetchChapter();
        navigate("read");
      });
      $("chapterGrid").appendChild(button);
    }
    $("libraryBack").focus();
  }
  document.querySelectorAll("[data-collection]").forEach((button) => button.addEventListener("click", () => {
    collection = button.dataset.collection;
    $("bookFilter").value = "";
    document.querySelectorAll("[data-collection]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
    renderBooks();
  }));
  $("bookFilter").addEventListener("input", renderBooks);
  $("libraryBack").addEventListener("click", renderBooks);
  $("libraryWheel").addEventListener("click", () => { library.close(); openPicker(); });
  function applyReaderSize() {
    document.documentElement.style.setProperty("--reader-size", `${readerSize}px`);
    $("readerSmaller").disabled = readerSize <= 18;
    $("readerLarger").disabled = readerSize >= 38;
    try { localStorage.setItem("readerFontSize", String(readerSize)); } catch {}
  }
  $("readerSmaller").addEventListener("click", () => { readerSize = Math.max(18, readerSize - 2); applyReaderSize(); });
  $("readerLarger").addEventListener("click", () => { readerSize = Math.min(38, readerSize + 2); applyReaderSize(); });
  $("readerNote").addEventListener("click", () => openStudyEditorSheet("note"));
  const syncReading = () => {
    $("readingTitle").textContent = resultEl.hidden ? "La Palabra, cerca tuyo." : (refEl.textContent || "Tu lectura").replace(/^[—\s]+/, "").replace(/\s*\([^)]*\)$/, "");
    $("readerNote").disabled = resultEl.hidden;
  };
  new MutationObserver(syncReading).observe(resultEl, { attributes: true, attributeFilter: ["hidden"], childList: true, subtree: true, characterData: true });
  function setSearchMode(mode) {
    searchMode = mode;
    document.querySelectorAll("[data-search-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.searchMode === mode)));
    $("queryLabel").textContent = mode === "text" ? "Palabra o frase del pasaje" : "Libro, capítulo y versículo";
    queryInput.placeholder = mode === "text" ? "Ej. el amor es paciente" : "Ej. Juan 3:16 o Salmos 23:1-6";
  }
  document.querySelectorAll("[data-search-mode]").forEach((button) => button.addEventListener("click", () => { setSearchMode(button.dataset.searchMode); queryInput.focus(); }));
  async function searchText() {
    const term = queryInput.value.trim();
    if (!term) { queryInput.focus(); return; }
    const request = ++searchRequest;
    showStatus("Buscando pasajes con esas palabras…", false);
    try {
      const refs = await fetchTextSuggestions(term);
      if (request !== searchRequest || queryInput.value.trim() !== term) return;
      textSuggestResults = refs;
      querySuggestions.innerHTML = refs.length ? buildSuggestionGroup("Pasajes encontrados", refs) : "";
      querySuggestions.hidden = !refs.length;
      showStatus(refs.length ? "Elegí una referencia de los resultados y tocá Buscar para leerla." : "No se encontraron pasajes. Probá otra frase o buscá por referencia.", false);
    } catch {
      if (request === searchRequest) showStatus("No se pudo completar la búsqueda. Revisá tu conexión e intentá otra vez.", true);
    }
  }
  $("searchBtn").addEventListener("click", (event) => {
    if (searchMode !== "text" || parseReference(queryInput.value)) return;
    event.preventDefault(); event.stopImmediatePropagation(); searchText();
  }, true);
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); $("searchBtn").click(); }
  });
  applyReaderSize();
  syncReading();
})();
