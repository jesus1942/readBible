# Investigacion de mercado y tecnica (previa a la implementacion)

Fecha: 2026-07-10. Complementa a `PLAN-MAESTRO.md`.

## 1. Apps de gestion de iglesias (competencia directa del panel admin)

### Mercado en ingles
- Planning Center: el lider. Modular, se paga por modulo usado (People,
  Check-Ins, Giving, Groups), desde 0 hasta ~1.400 USD/mes. Su modulo
  Check-Ins usa estaciones (tablet/telefono en la puerta) y codigos QR, no
  geolocalizacion pasiva. Su app gratuita Headcounts convierte el telefono en
  un contador manual de asistentes con alertas de capacidad.
- Tithe.ly / Breeze: plan plano ~72 USD/mes con usuarios ilimitados; fuerte
  en donaciones online, check-in de ninos, mensajeria SMS/email.
- Leccion: nadie del mercado grande cuenta asistencia por geolocalizacion
  automatica; todos usan QR o conteo manual. Nuestro enfoque geo con puntos
  anonimos en vivo es un diferenciador real, y ademas mas barato de operar
  (sin hardware en la puerta).

### Mercado en espanol / Latinoamerica
- SARA (saraapp.io): la referencia regional. Eventos, miembros, grupos,
  oracion, donaciones; acepta MercadoPago; desde ~89.500 COP/mes (~22 USD).
- Ekklesia (Argentina): miembros, grupos y asistencias, usuarios ilimitados.
- ChurchTrac: desde 9 USD/mes segun cantidad de personas.
- Tecnoiglesia One: freemium, desde gratis.
- Leccion: el rango de precio aceptado en la region es 10-25 USD/mes
  (12.000-30.000 ARS aprox segun cambio). Entrar por debajo de SARA con un
  panel enfocado en asistencia geo + KPIs es una propuesta clara. Nadie de
  esta lista tiene mapa de presencia en vivo.

## 2. Apps de devocionales (referencia de UX para la fase 1)

- YouVersion: el estandar. Planes de lectura, racha de dias, versiculo del
  dia. La racha es su motor de habito.
- Glorify: flujo diario guiado corto (cita, pasaje, reflexion). Decision de
  diseno destacada: sin "verguenza de racha" — si perdes un dia no te
  castiga ni te muestra el contador en rojo; consistencia por amabilidad,
  no por culpa. Encaja con nuestra estetica serena de pergamino.
- Lectio 365: estructura guiada con ritmo P.R.A.Y (Pause, Rejoice, Ask,
  Yield) manana/mediodia/noche. Confirma que una estructura fija guiada
  (nosotros: Lectura - Observacion - Aplicacion - Oracion) es el patron
  ganador, no un editor libre en blanco.
- Psalmlog y similares: diario devocional personal con busqueda por pasaje.
- Decisiones adoptadas para nuestra fase 1:
  1. Estructura guiada de 4 campos, no texto libre unico.
  2. Racha visible pero amable: se muestra el progreso, nunca reproche por
     dias perdidos.
  3. Precarga del versiculo del dia o del pasaje que se esta leyendo.
  4. Funciona offline con borrador local (ventaja PWA sobre varias de estas).

## 3. Verificaciones tecnicas

### MercadoPago suscripciones (fase 4)
Confirmado en la documentacion oficial de Mercado Pago Developers:
- El objeto Preapproval soporta `auto_recurring.free_trial` con
  `{ frequency: 1, frequency_type: "months" }`: exactamente el modelo
  decidido (medio de pago autorizado el dia uno, primer cobro al dia 31).
- Webhooks: hay que suscribirse a los topicos `subscription_preapproval`
  (altas/cambios de la suscripcion), `subscription_authorized_payment`
  (cobros recurrentes autorizados) y `payments` (estado de cada pago).
- Se necesita: `MP_ACCESS_TOKEN` (privado, va en la consola superadmin),
  `MP_PUBLIC_KEY` y la clave secreta del webhook para validar la firma.

### Google Sign-In (fase 0)
Confirmado en la documentacion de Google Identity:
- Flujo correcto: el cliente (PWA via script oficial GSI, o Capacitor via
  plugin nativo) obtiene un ID token y lo manda por HTTPS al backend; el
  backend verifica firma contra las claves publicas de Google (JWKS),
  `aud` (nuestro client ID), `iss` (accounts.google.com) y `exp`.
- Google recomienda su libreria `google-auth-library` para Node; es una
  dependencia chica y mantenida, se agrega al push-server en la fase 0.
- Se necesita: OAuth Client ID web + client IDs Android/iOS (van en la
  consola superadmin).

## 4. Consecuencia arquitectonica: consola superadmin

Todas las integraciones anteriores requieren credenciales (client IDs de
Google, tokens de MercadoPago, precio del plan). Para no depender de tocar
variables de entorno en Railway en cada paso, se agrega una consola de
superadmin dentro de la app (vista exclusiva del developer/dueno):

- Login propio con email y contrasena (hash scrypt en la base, nunca en
  texto plano; el repo es publico).
- Pestana Configuracion: carga y edicion de todas las credenciales, que se
  guardan en la tabla `app_settings` de PostgreSQL. El backend las lee de
  ahi con fallback a variables de entorno.
- Los valores secretos se muestran enmascarados (solo ultimos caracteres).
- Pestana Cuenta: cambio de contrasena.
- Esta consola es el paso previo a las fases 0 y 4 del plan maestro.

## Fuentes

- https://www.planningcenter.com/check-ins
- https://www.planningcenter.com/headcounts
- https://www.capterra.com/compare/76708-132513/Planning-Center-vs-Breeze-ChMS
- https://theleadpastor.com/tools/best-church-attendance-software/
- https://saraapp.io/
- https://www.ekklesia.com.ar/
- https://www.churchtrac.com/spanish
- https://tecnoiglesia.com/precios
- https://learnofchrist.com/resources/glorify
- https://bibleinyear.com/blog/best-daily-devotional-apps
- https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post
- https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/sign-in/web/backend-auth
