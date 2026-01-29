Contexto del proyecto: readBible

Resumen general
- PWA publicada en GitHub Pages: https://jesus1942.github.io/readBible/
- Service Worker activo con cache versionado (último: v61).
- JS principal versionado en index.html (último: app.js?v=48).
- Archivo de contexto local (no se commitea).

Funcionalidades actuales
- Búsqueda de versículos por referencia (ej: Juan 3:16).
- Rangos de versículos (ej: 1 Pedro 3:8-12).
- Capítulo completo (botón dedicado).
- Lectura plena (modo zen).
- Versículo del día: referencias en daily_verses.json (365 únicas, español RVR1960); texto se obtiene desde BibleGateway.
- Personalización del versículo diario por usuario:
  - Semilla local + temas seleccionados + día del año.
  - Temas se eligen en el menú lateral.
- Notas/estudio con long‑press (sheet con notas y fecha de culto).
- Compartir versículo como imagen (swipe up en lectura plena).
- Resaltado de texto con marcador translúcido, guardado en localStorage.
  - Móvil: tap + deslizar para resaltar.
  - Tap sobre resaltado para quitar.
- Menú lateral con Ayuda guiada y Acerca de (versión v1.0.0).
- Botones en footer: saludo por WhatsApp y propina por Mercado Pago.
- Sugerencias inteligentes en búsqueda: libros + recientes.
- Sugerencias por texto: frases largas consultan BibleGateway Quicksearch y muestran referencias.
- Splash animado (canvas) integrado con animación “galaxia → esfera → cruz” y logo final.

Analítica (Umami)
- URL: https://umami-production-b559.up.railway.app
- Website ID: 76cecf2a-92bb-43d2-ae8f-053da8117110
- Script insertado en index.html con data-host-url.
- Eventos trackeados: search_verse, search_chapter, open_zen, open_help, share_png, app_installed.
- Puede ser bloqueado por adblockers; en incógnito funciona.

Datos y fuentes
- BibleGateway para obtener texto bíblico (RVR1960 por defecto para daily).
- daily_verses.json: 365 referencias únicas (temas: no temas, paz, esperanza, fortaleza, confianza, amor, fidelidad, consuelo, guía, protección, etc.).

Proxies usados
- https://api.allorigins.win/raw
- https://corsproxy.io/
- https://api.codetabs.com/v1/proxy
- https://corsproxy.org/
- https://proxy.cors.sh/
- Se eliminó thingproxy (inestable).
- Sistema de fallback con 5 proxies en paralelo para mayor velocidad y confiabilidad.

Resaltado (detalles)
- Guarda por versículo/capítulo (key localStorage: highlight:verse:... / highlight:chapter:...).
- Marcador translúcido en span.highlight.

Sugerencias de búsqueda
- Dropdown con libros y recientes (RECENT_LIMIT = 5).
- Sugerencias por texto (TEXT_SUGGEST_LIMIT = 6) usando Quicksearch.

UI/UX
- Estética cálida con serif (Cormorant Garamond), fondos tipo papel.
- Transiciones suavizadas en overlays (zen, splash, daily, side menu, help).
- Splash canvas reemplaza el card anterior.

Iconos
- Se usan PNGs generados desde assets/icon.svg (icon-192, icon-512, apple-touch-icon).

Cambios recientes relevantes
- Personalización del versículo diario (temas + seed por usuario).
- Sugerencias por texto en buscador.
- Animación de splash integrada.
- Mensajes específicos si la referencia/capítulo no existen.

Pendientes / próximos pasos
- Premium con Stripe + backend (Railway + Postgres). Orden deseado:
  1) Notas con etiquetas
  2) Sincronización en la nube
  3) Resaltado con colores
  4) Plan de lectura avanzado
  5) Libros de estudio personalizados
- Backend en Railway, pagos con Stripe (cuenta aún no creada).
- Posible proxy propio para estabilidad.
