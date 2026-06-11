# readBible — Guia del proyecto para Claude

## Identidad del proyecto
App biblica PWA en espanol. Sin framework externo. JavaScript vanilla + CSS + HTML + Node.js backend (Express + PostgreSQL). Deploy en GitHub Pages (frontend) y Railway (backend).

## Estetica visual
- Sin emojis ni emoticones en la UI, comentarios, commits ni documentacion.
- Para describir cambios de UI, usar descripciones de trazos o mockups ASCII a mano alzada.
- Botones redondos (pill) en grilla 2 columnas, estilo dibujado a mano (bordes ligeramente irregulares via SVG filter, sin sombras gruesas).
- Paleta: pergamino (#f4f0e6), dorado (#f39c12), texto oscuro (#1c1a16), marron calido (#5f5a50).
- Tipografia: Cormorant Garamond, Times New Roman (serif).

## Roles de usuario
- `feligres` (default): solo ve su perfil, eventos activos y sedes. Sin acceso a configuracion de iglesia.
- `colaborador`: puede crear sedes y eventos ademas de lo del feligres.
- `dirigente`: liderazgo completo — aprueba roles, crea celulas de estudio, gestiona materiales.
- `developer` (super-admin, solo yo): habilita/deshabilita iglesias, administracion general, vista de pruebas para simular cualquier rol.

## Arquitectura
- `index.html` — estructura completa con overlays hidden/not-hidden
- `styles.css` — todo el CSS (sin CSS-in-JS ni preprocesadores)
- `app.js` — logica principal (~3600 lineas, vanilla JS)
- `core.js` — parsing de referencias biblicas
- `net.js` — manejo de fetch con proxies y retry
- `push-server/server.js` — backend Express con PostgreSQL
- `push-server/schema.sql` — esquema de base de datos

## Convenciones de codigo
- Sin comentarios salvo cuando el WHY no es obvio.
- Sin abstracciones prematuras.
- Vanilla JS, sin transpilacion.
- El estado de comunidad vive en `communityState` (objeto global).
- Persistencia local con `localStorage`.

## Git
- Desarrollar en la rama asignada (ej. `claude/church-app-nav-communities-2uu0d7`).
- La rama de produccion es `main`.
- Commits a nombre de jesus1942.
- Mensajes de commit en espanol, concisos, en tiempo presente/imperativo.
- Nunca hacer force push a main.
- Siempre `git push -u origin <rama>`.

## Versiculos diarios
- Los versiculos deben ser pensamientos completos que se entiendan sin contexto adicional.
- Preferir rangos (ej. "Juan 3:16-17") si el texto unico resulta muy breve o fragmentado.
- No incluir versiculos documentales, genealogias ni referencias de fechas historicas sin mensaje espiritual claro.
