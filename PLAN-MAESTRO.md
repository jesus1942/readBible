# Plan maestro para terminar readBible

> Estado actualizado: 22 de julio de 2026. El bloque base ya esta implementado:
> aislamiento por iglesia, ciclo de eventos, check-in geografico y checkout,
> presencia viva, materiales de celulas, gestion de miembros y KPIs, eventos
> recurrentes, control developer de iglesias y estructura de login multiplataforma.
> La integracion comercial de MercadoPago sigue deliberadamente desactivada
> hasta contar con credenciales reales y validar el flujo de cobro.

Fecha: 2026-07-10
Rama de trabajo: `claude/religious-app-plan-efbls4` — Produccion: `main`
(frontend en GitHub Pages, backend Express+PostgreSQL en Railway:
`versiculodiario-production.up.railway.app`, deploy automatico desde `main`).

## 1. Auditoria del estado actual

### Lo que ya funciona en produccion
- Lectura biblica, versiculos diarios, push notifications con temas y zonas horarias.
- Identidad de comunidad liviana: `communityKey` + `communitySecret` generados
  en el dispositivo y guardados en `localStorage`. Sin contrasena, sin email:
  la cuenta vive atada a un solo dispositivo/navegador.
- Roles: `feligres`, `colaborador`, `dirigente` + modo `developer` por codigo.
  Solicitud y aprobacion de roles ya implementada.
- Sedes (`community_locations`) con latitud/longitud, eventos
  (`community_events`) con tipos (`culto`, `oracion`, `estudio`, etc.),
  `notify_radius_meters` y estados (`scheduled`, `live`, `finished`).
- Asistencia (`community_event_attendance`) con check-in, pero hoy el endpoint
  solo registra `check_in_method = 'manual'` aunque el esquema ya soporta
  `'geo'`, `'qr'` y `'admin'`. No valida coordenadas.
- Mapa de sedes y mapa de miembros (solo direcciones declaradas en el perfil).
- Celulas de estudio y materiales.
- Boton de donacion con link estatico de MercadoPago.
- Empaquetado Capacitor (Android/iOS), sistema de ayuda, panel developer.

### Brechas contra la vision
1. No existe el modulo de devocionales (cero codigo, cero tablas).
2. No hay cuentas reales: sin login el usuario pierde todo al cambiar de
   dispositivo, y no se puede cobrar una suscripcion a un "usuario" que no
   puede volver a entrar.
3. El check-in no usa geolocalizacion real ni valida distancia a la sede.
4. No hay presencia en vivo: el mapa no muestra cuanta gente esta reunida
   ahora en cada punto, ni diferencia feligreses de personal.
5. No hay KPIs ni vista de administrador de iglesia.
6. No hay grupos pequenos de oracion recurrentes con conteo mensual geografico.
7. No hay suscripcion recurrente de MercadoPago (solo donacion por link).

## 2. Estrategia general

Orden elegido para que cada fase entregue valor por si sola y la siguiente se
apoye en la anterior:

    Consola superadmin (HECHA)          <- carga de credenciales del dueno
    Fase 0: Cuentas reales (login)      <- requisito de todo lo demas
    Fase 1: Devocionales                <- retiene usuarios, usa las cuentas
    Fase 2: Geo-presencia y mapa vivo   <- genera los datos de asistencia
    Fase 3: Vista admin + KPIs          <- consume los datos de la fase 2
    Fase 4: Suscripcion MercadoPago     <- cobra por la vista de la fase 3
    Fase 5: Endurecimiento y pulido

Cada fase se desarrolla en la rama asignada, se prueba y se mergea a `main`
en commits chicos y reversibles. El backend ya crea/migra tablas con
`CREATE TABLE IF NOT EXISTS` + `ALTER` al arrancar, asi que las migraciones
siguen ese mismo patron sin herramienta externa.

## 3. Fases en detalle

### Consola superadmin (implementada el 2026-07-10)

Vista exclusiva del dueno (boton "Superadmin" en el menu lateral, junto a
"Panel dev"). Login con email y contrasena propia (hash scrypt en la tabla
`superadmin_account`, sesiones de 7 dias en `superadmin_sessions`, rate
limit de 5 intentos por 15 minutos). Pestana Configuracion: carga de
credenciales de integraciones (client IDs de Google, tokens de MercadoPago,
precio del plan) en la tabla `app_settings`; el backend las lee con
`getAppSetting()` con fallback a variables de entorno; los valores secretos
se muestran enmascarados. Pestana Cuenta: cambio de contrasena y cierre de
sesion. Las fases 0 y 4 consumen estas credenciales.

### Fase 0 — Cuentas reales con Google Sign-In (decision confirmada)

Objetivo: que el usuario inicie sesion con su cuenta de Google desde cualquier
dispositivo y recupere su espacio.

Backend:
- Extender `community_users`: `google_sub TEXT UNIQUE` (ID estable de Google),
  `email` ya existe (UNIQUE), `avatar_url TEXT`.
- Tabla nueva `community_sessions` (token aleatorio hasheado, user_id,
  expires_at, device_label). Token en header `Authorization: Bearer`.
- Endpoints: `POST /auth/google` (recibe el ID token de Google, verifica la
  firma contra las claves publicas JWKS de Google con `crypto` de Node, sin
  dependencias nuevas, y crea/actualiza el usuario + sesion propia),
  `POST /auth/logout`, `GET /auth/me`.
- Compatibilidad: al iniciar sesion en un dispositivo que ya tenia
  `communityKey`, se vincula esa clave a la cuenta de Google (merge de
  perfil). Los usuarios existentes no pierden nada.

Frontend:
- PWA web: boton "Continuar con Google" via Google Identity Services (script
  oficial `accounts.google.com/gsi/client`).
- Capacitor Android/iOS: plugin de Google Auth para el mismo flujo nativo
  (el backend valida el mismo ID token, un solo endpoint para todo).
- Landing: "Continuar con Google" / "Continuar como invitado" (modo actual).
- El estado `communityState.auth` pasa a incluir el token de sesion.

Prerequisito operativo (lo haces vos, te guio): crear el proyecto y el OAuth
Client ID en Google Cloud Console, con los origenes autorizados
(`jesus1942.github.io`) y los client IDs de Android/iOS para Capacitor.

Mockup de la landing de sesion:

    +----------------------------------+
    |          readBible               |
    |   "Lampara es a mis pies..."     |
    |                                  |
    |  [ G  Continuar con Google  ]    |
    |  ( continuar como invitado )     |
    +----------------------------------+

### Fase 1 — Modulo de devocionales

Objetivo: espacio personal de trabajo donde cada usuario hace su devocional
diario. Requiere sesion iniciada.

Backend:
- Tabla `devotionals`:
  `id, user_id, devotional_date DATE, passage_reference TEXT, title TEXT,
  observation TEXT, application TEXT, prayer TEXT, mood TEXT,
  is_private BOOLEAN DEFAULT TRUE, shared_with_cell BOOLEAN DEFAULT FALSE,
  created_at, updated_at, UNIQUE (user_id, devotional_date)`.
- Endpoints: `GET /devotionals?month=`, `GET /devotionals/:date`,
  `PUT /devotionals/:date` (upsert), `DELETE /devotionals/:date`,
  `GET /devotionals/streak` (racha y totales).
- Recordatorio: reutilizar el push diario existente agregando el tipo
  "recordatorio de devocional" con hora elegida por el usuario.

Frontend (overlay nuevo `devotionalOverlay`, estetica pergamino):
- Estructura guiada tipo "Lectura - Observacion - Aplicacion - Oracion",
  precargada con el versiculo del dia (ya existe `daily_verses.json`) o con el
  pasaje que el usuario este leyendo (boton "Hacer devocional de este pasaje"
  desde el lector).
- Historial: calendario mensual con dias marcados, racha de dias seguidos,
  busqueda por pasaje.
- Borrador local en `localStorage` con sincronizacion al guardar (funciona
  offline, se sube cuando hay red).

Mockup del espacio de devocional:

    +----------------------------------+
    | Mi devocional        10 jul 2026 |
    |----------------------------------|
    | Pasaje: [ Juan 15:1-8        ]   |
    | (texto del pasaje plegable)      |
    |                                  |
    | Que observo...                   |
    | [__________________________]    |
    | Como lo aplico hoy...            |
    | [__________________________]    |
    | Mi oracion...                    |
    | [__________________________]    |
    |                                  |
    | [ Guardar ]   racha: 12 dias     |
    |----------------------------------|
    | < calendario del mes con marcas >|
    +----------------------------------+

### Fase 2 — Geolocalizacion real, presencia en vivo y mapa con puntos

Objetivo: cuando hay reunion, el mapa de cada sede muestra cuantas personas
con la app estan reunidas alli, diferenciando feligreses del personal.

Backend:
- Check-in geo: `POST /community/events/:id/check-in` acepta `latitude`,
  `longitude`, calcula distancia Haversine a la sede y si esta dentro del
  radio (`notify_radius_meters`, default 150 m) registra
  `check_in_method = 'geo'`. Fuera de radio: rechaza con distancia informada.
  El check-in manual queda como respaldo con `method = 'manual'`.
- Presencia en vivo: tabla `community_presence`
  (`event_id, user_id, role, latitude, longitude, last_ping_at`,
  UNIQUE(event_id, user_id)). El cliente manda un ping con su posicion cada
  3 minutos mientras el evento esta `live` y la app abierta; una presencia
  expira a los 10 minutos sin ping. Al salir del evento se hace check-out.
- Endpoint `GET /community/live-map` (decision confirmada: puntos
  individuales anonimos): por cada sede con evento en vivo devuelve
  `{ locationId, points: [{ lat, lng, kind: 'feligres'|'personal' }] }`
  (personal = colaborador + dirigente). Anonimato estricto: sin nombres, sin
  user_id, sin rol exacto; solo se aceptan y devuelven posiciones dentro del
  radio de la sede; las posiciones crudas se borran al finalizar el evento
  (queda solo la asistencia agregada para KPIs).
- Transicion automatica de eventos `scheduled -> live -> finished` segun
  `starts_at`/`ends_at` (job en el mismo intervalo que ya usa el push diario).

Frontend:
- En el mapa de sedes, cada sede con evento en vivo muestra los puntos
  individuales anonimos en su posicion real: dorados (#f39c12) para
  feligreses, marrones (#5f5a50) para personal, con el conteo total al lado.
  Actualizacion cada 60 s.
- Flujo del asistente: llega a la sede, la app detecta evento en vivo cercano
  y ofrece "Registrar mi llegada" (pide permiso de geolocalizacion solo ahi).

Mockup del mapa en vivo:

    +----------------------------------+
    | Mapa de reuniones     (en vivo)  |
    |----------------------------------|
    |        o o                       |
    |      o(12)o     <- Sede Central  |
    |        * *         12 feligreses |
    |                    3 personal    |
    |                                  |
    |   o(4)*         <- Anexo Norte   |
    |                    4 feligreses  |
    |                    1 personal    |
    |----------------------------------|
    | o feligres   * personal          |
    +----------------------------------+

### Fase 3 — Vista exclusiva del administrador de iglesia + KPIs

Objetivo: panel por iglesia, visible en la landing al iniciar sesion, para el
administrador de eventos de esa iglesia. Sera la funcion de pago.

Modelo:
- Nuevo campo en `community_users`: `is_church_admin BOOLEAN DEFAULT FALSE`
  (se mantiene el rol espiritual aparte: un dirigente puede ser admin, pero
  admin es un permiso operativo, no un rol nuevo en el check constraint).
  Lo asigna el developer o un dirigente de esa iglesia.
- El scope del panel es la `church` del usuario: solo ve datos de su iglesia.

Backend — endpoints de KPIs (todos filtrados por iglesia y por suscripcion
activa a partir de la fase 4):
- `GET /admin/kpis/monthly?month=`: asistentes unicos del mes, desglose
  feligreses vs colaboradores vs dirigentes, total de check-ins, promedio por
  culto, comparativa contra el mes anterior.
- `GET /admin/kpis/by-location?month=`: asistencia mensual por punto
  geografico (sede o grupo pequeno).
- `GET /admin/members?month=`: colaboradores y feligreses activos del mes.
- Creacion desde el panel: citas de dias de culto (eventos `culto`
  recurrentes: se guardan como serie con `recurrence_rule` en metadata y el
  job las materializa semana a semana) y grupos pequenos de oracion
  (eventos `oracion` recurrentes asociados a una ubicacion propia, con geo
  check-in activado igual que las sedes).

Frontend — panel admin (overlay `adminOverlay`, acceso desde la landing):

    +----------------------------------+
    | Panel de mi iglesia     jul 2026 |
    |----------------------------------|
    | [ 87 ]      [ 12 ]     [ 342 ]   |
    | feligreses  colabor.   check-ins |
    | activos     activos    del mes   |
    |----------------------------------|
    | Asistencia por punto:            |
    |  Sede Central      ████████ 214  |
    |  Anexo Norte       ███ 71        |
    |  Oracion mie (GPS) ██ 57         |
    |----------------------------------|
    | [ Crear dia de culto ]           |
    | [ Crear grupo de oracion ]       |
    +----------------------------------+

- Los graficos se dibujan con SVG/CSS propios (sin librerias, consistente con
  el proyecto).

### Fase 4 — Suscripcion recurrente con MercadoPago

Objetivo (decision confirmada): el panel se habilita solo despues de
autorizar la suscripcion en MercadoPago, con 30 dias de prueba gratis. El
medio de pago queda cargado y autorizado desde el dia uno; el primer cobro
real cae al dia 31. MercadoPago Preapproval soporta esto nativamente con
`free_trial` en el plan de suscripcion.

Backend:
- Tabla `church_subscriptions`:
  `id, church TEXT UNIQUE,
  status ('trialing','active','past_due','cancelled'),
  trial_ends_at, mp_preapproval_id TEXT, current_period_end,
  created_by_user_id, created_at, updated_at`.
  `trialing` = preapproval autorizado, dentro de los 30 dias sin cobro.
- Integracion MercadoPago Preapproval (suscripcion recurrente):
  - `POST /billing/subscribe`: crea el preapproval via API de MercadoPago y
    devuelve el `init_point` para redirigir al checkout.
  - `POST /billing/webhook`: recibe notificaciones de MercadoPago
    (authorized / paused / cancelled / payment) y actualiza el estado.
    Verificacion de firma del webhook.
  - `GET /billing/status`: estado para mostrar en el panel.
- Middleware `requireActiveSubscription(church)` que protege los endpoints
  `/admin/*` (pasa con `trialing` o `active`; sin preapproval autorizado no
  hay acceso, ni siquiera en prueba).
- Variables de entorno nuevas en Railway: `MP_ACCESS_TOKEN`,
  `MP_WEBHOOK_SECRET`, `ADMIN_PLAN_PRICE`.

Frontend:
- En la landing, si el usuario es admin de iglesia: tarjeta "Panel de mi
  iglesia" con estado (en prueba con dias restantes, activa, vencida, sin
  suscripcion) y boton "Activar 30 dias gratis" que abre el checkout de
  MercadoPago para autorizar el medio de pago.
- Sin suscripcion: el panel se muestra bloqueado con vista previa borrosa de
  los KPIs y el llamado a suscribirse.

### Fase 5 — Endurecimiento y pulido

- Rate limiting basico en endpoints de auth y billing (contador en memoria).
- Indices para las queries de KPIs (`attendance (checked_in_at)`,
  `presence (last_ping_at)`).
- Revision de privacidad: borrar presencias viejas (retencion 90 dias de
  datos crudos; los agregados mensuales se conservan).
- Bump de version del service worker y aviso de actualizacion (sistema ya
  existente).
- Actualizar el sistema de ayuda (tour y tips) con los modulos nuevos.
- Actualizar CLAUDE.md y README con la arquitectura final.

## 4. Secuencia de entregas (merges a main)

| # | Entrega | Contenido | Tamano estimado |
|---|---------|-----------|-----------------|
| 1 | Auth backend | sesiones + verificacion de ID token de Google | chico |
| 2 | Auth frontend | boton Google en landing + vinculacion de communityKey | mediano |
| 3 | Devocionales backend | tabla + CRUD + racha | chico |
| 4 | Devocionales frontend | overlay, calendario, borrador offline | grande |
| 5 | Geo check-in | validacion Haversine + metodo geo | chico |
| 6 | Presencia en vivo | pings + expiracion + endpoint live-map | mediano |
| 7 | Mapa con puntos | racimos dorado/marron + conteos | mediano |
| 8 | Panel admin | is_church_admin + KPIs + vista | grande |
| 9 | Cultos y grupos recurrentes | series de eventos + conteo mensual geo | mediano |
| 10 | MercadoPago | preapproval + webhook + gate del panel | mediano |
| 11 | Endurecimiento | fase 5 completa | chico |

Cada entrega deja produccion funcionando; ninguna rompe a los usuarios
actuales (la identidad por dispositivo sigue valida como modo invitado).

## 5. Decisiones confirmadas (2026-07-10)

1. Login: Google Sign-In. Requiere que el dueno cree el OAuth Client ID en
   Google Cloud Console (guiado en la fase 0).
2. Mapa en vivo: puntos individuales anonimos en su posicion real, con
   anonimato estricto (sin nombres ni identificadores) y borrado de
   posiciones crudas al finalizar cada evento.
3. Cobro del panel admin: 30 dias de prueba gratis, pero con el medio de
   pago de MercadoPago cargado y autorizado desde el dia uno (preapproval
   con free_trial); el primer cobro cae al dia 31. Precio mensual por
   iglesia en ARS a definir antes de la fase 4.

Pendiente menor: quien asigna el admin de iglesia. Propuesta por defecto:
developer y dirigentes de esa iglesia pueden asignarlo.
