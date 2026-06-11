# Estado de sesion — traspaso de contexto

Fecha: 2026-06-11
Rama de trabajo: `claude/church-app-nav-communities-2uu0d7`
Ultimo commit de la sesion: `f0fa50d` "Mejora UI, comunidades y versiculos diarios"

## IMPORTANTE: por que el usuario no ve los cambios
Los cambios estan pusheados en la rama `claude/church-app-nav-communities-2uu0d7`,
NO en `main`. GitHub Pages publica desde `main`, asi que la app en vivo no refleja
nada hasta mergear. **Pendiente: mergear la rama a `main` (o crear PR) cuando el
usuario lo apruebe.**

## Repo y entorno
- Repo: `jesus1942/readBible` (verificado, es el correcto)
- Frontend: GitHub Pages desde `main` — vanilla JS, sin framework
- Backend: `push-server/server.js` (Express + PostgreSQL) deployado en Railway
  (`https://versiculodiario-production.up.railway.app`). Los cambios de backend
  requieren redeploy en Railway para tener efecto.
- Commits a nombre de jesus1942 (`git config user.name "jesus1942"`).

## Lo que se hizo en esta sesion (commit f0fa50d)

### 1. CLAUDE.md (nuevo, en raiz)
Guias del proyecto: sin emojis/emoticones, mockups a mano alzada, paleta,
roles, convenciones de git.

### 2. UI (styles.css + index.html)
- Botones pill (`border-radius: 999px`), grilla 2 columnas en `.actions`
  (primer boton ocupa fila completa).
- Filtro SVG `#sketch` (feTurbulence + feDisplacementMap) definido en
  `index.html` body para efecto dibujado a mano en botones. Sin sombras gruesas
  (se quitaron los box-shadow de botones).
- Animaciones de scroll: `.card` y `.hero` con clase `.visible` via
  `initScrollObserver()` (IntersectionObserver, delay escalonado 60ms).
- Nav flotante inferior `#floatingNav` (Buscar / Comunidad / Menu): aparece
  cuando el hero sale del viewport, via `initFloatingNav()`.

### 3. Celulas de estudio (frontend app.js + index.html)
- Seccion `#communityStudyCellsSection` visible para todos; formulario
  `#communityCreateCellForm` solo para dirigente.
- Funciones: `loadStudyCells()`, `createStudyCell()`, `renderStudyCells()`,
  `populateCellLocationSelect()`.
- `communityState.cells` agregado al estado global.

### 4. Backend (push-server/server.js)
- Tablas nuevas en `ensureSchema()`: `community_study_cells` y
  `community_study_materials` (material puede venir de reunion `event_id` o
  del lider `source: 'leader'`).
- Endpoints nuevos:
  - `GET /community/study-cells?church=X` — lista celulas
  - `POST /community/study-cells` — crear (solo rol dirigente, validado en DB)
  - `POST /community/study-materials` — crear material (dirigente o colaborador)

### 5. Panel desarrollador (app.js + index.html)
- Boton "Panel dev" al final del menu lateral (`#developerOpen`).
- Overlay `#developerOverlay` con login por codigo. Codigo: viene de
  `communityState.auth.developerCode` si el backend lo manda, fallback
  hardcodeado `"dev2024"` (MEJORAR: mover a env var del backend).
- Simulador de roles (`devSimulatedRole`): cambia la vista sin tocar el perfil
  real. `updateCommunityUi()` usa `effectiveRole = devSimulatedRole || role`.
- Lista iglesias (derivadas de sedes) y celulas con badges activa/inactiva.
- PENDIENTE: habilitar/deshabilitar iglesias es solo visual; falta endpoint
  backend para persistir el estado activo/inactivo de una iglesia.

### 6. Versiculos diarios (daily_verses.json + app.js)
- Pedido del usuario: versos con sentido completo, usar rangos si hace falta,
  nada de referencias documentales/geograficas/genealogicas.
- Se reemplazo el JSON completo: 125 referencias curadas, muchas con rango
  (ej. "Juan 3:16-17", "Salmos 23:1-3").
- `showDailyVerse()` ahora soporta campo opcional `context` en cada entrada
  del JSON (texto secundario debajo del verso).

## Pendientes / proximos pasos
1. **Mergear a `main`** para que se publique en GitHub Pages (consultar al usuario).
2. Redeploy del backend en Railway para activar los endpoints de celulas.
3. Mover el codigo developer `"dev2024"` a una variable de entorno
   (`DEVELOPER_CODE`) y exponerla via `/community/bootstrap` en `auth`.
4. Persistir habilitar/deshabilitar iglesias (tabla o flag en backend).
5. Vincular materiales de reuniones (eventos) a celulas en la UI: el backend ya
   acepta `eventId` en `/community/study-materials`, falta la pantalla.
6. Vista de materiales dentro de cada celula (boton "Ver materiales" hoy solo
   muestra un status; falta overlay/lista real con `GET` de materiales —
   tambien falta el endpoint GET de materiales).
7. Verificar el filtro SVG `#sketch` en Safari/iOS (los filtros SVG referenciados
   por URL a veces fallan; tener fallback `filter: none`).

## Preferencias del usuario (recordar siempre)
- Sin emojis ni emoticones en UI, codigo, commits, docs.
- Mockups a mano alzada para describir UI.
- Commits y push a nombre de jesus1942, en la rama correspondiente.
- Todo en espanol.
- Roles: feligres (sin config de iglesia), colaborador, dirigente (crea
  celulas, gestiona material), developer (solo el usuario: pruebas, habilitar/
  deshabilitar iglesias, administracion general).
