Arquitectura del proyecto readBible

1) Vista general
- App PWA estática (HTML/CSS/JS) servida desde GitHub Pages.
- No hay build tool; assets y lógica están en archivos planos.
- Service Worker para cache offline.
- Datos locales (daily_verses.json, efemerides.json).

2) Estructura de archivos
- index.html: estructura principal, overlays, menú, ayuda, script Umami, splash canvas.
- styles.css: estilo global, overlays, botones, animaciones.
- app.js: lógica principal (búsqueda, parsing, cache, UI state, resaltado, sugerencias).
- service-worker.js: precache de assets (versionado por CACHE_NAME).
- daily_verses.json: 365 referencias del versículo del día.
- efemerides.json: efemérides (si aplica).
- icons/: iconos PWA (generados desde assets/icon.svg).
- assets/: recursos varios (icon.svg, etc.).

3) Flujo principal de búsqueda
- Usuario ingresa referencia → parseReference.
- Construye URL BibleGateway → fetchFirstHtml con proxies.
- parseHTML limpia contenido y extrae texto.
- showResult actualiza UI y guarda en cache local.
- Si no hay resultados (quicksearch HTML), muestra mensaje “No existe esa referencia”.

4) Cache y almacenamiento
- Cache de versículos en localStorage con TTL (CACHE_TTL_MS = 24h).
- Estudios/Notas: localStorage con key por versículo.
- Resaltados: localStorage con key highlight:verse:... o highlight:chapter:...
- Última búsqueda y recientes: localStorage.
- Preferencias de temas del versículo diario + seed por usuario.

5) Versículo del día
- daily_verses.json (solo referencias).
- showDailyVerse obtiene referencia y pide texto a BibleGateway.
- Índice personalizado por usuario: seed + temas + día del año.

6) Gestos
- Long‑press: abre sheet de estudio.
- Tap + deslizar: resaltar texto en móvil.
- Lectura plena: swipe izquierda/derecha para anterior/siguiente, swipe arriba para compartir.

7) Splash
- Canvas fullscreen con animación “galaxia → esfera → cruz”.
- Logo final overlay (SVG inline en app.js).
- Duración corta, adaptativa a móvil y reduce motion.

8) PWA/Service Worker
- Precache de assets principales.
- CACHE_NAME versionado para invalidar caches.
- skipWaiting + clients.claim para actualización rápida.

9) Analítica
- Umami self‑hosted en Railway.
- Script en index.html.
- Eventos custom: search_verse, search_chapter, open_zen, open_help, share_png, app_installed.

10) Integraciones externas
- BibleGateway para contenido bíblico.
- Proxies CORS: allorigins, corsproxy.
- WhatsApp + Mercado Pago para contacto/propina.

11) Riesgos conocidos
- Dependencia de proxies públicos (pueden fallar).
- Adblockers pueden bloquear Umami.
- BibleGateway puede cambiar HTML (parseHTML depende de estructura).

