# Lectura Viva

PWA de lectura biblica con modo offline, busqueda por referencia, lectura plena,
marcadores, notas, devocionales sincronizados y espacios de comunidad para
iglesias. El mismo frontend se empaqueta para Android e iOS con Capacitor.

## Componentes

- Frontend estatico: `index.html`, `app.js`, `auth.js`, `core.js`, `net.js` y
  `styles.css`. GitHub Pages publica `main`.
- API: `push-server/server.js`, Express y PostgreSQL. Railway debe usar
  `push-server` como directorio raiz y ejecutar `npm start`.
- Aplicaciones moviles: proyectos `android/` e `ios/`; `npm run sync` genera y
  copia el contenido de `www/`.

## Funciones actuales

- Lectura, busqueda, resaltados, notas, marcadores y funcionamiento offline.
- Login web con Google, sesion persistente y migracion de datos locales.
- Estructura de login nativo separada para Android e iOS, desactivada hasta
  instalar el adaptador y cargar sus Client IDs.
- Devocionales con calendario, racha, titulo, estado de animo, privacidad,
  borrador offline y borrado.
- Iglesias aisladas entre si, sedes, eventos simples o recurrentes, ciclo
  automatico de estados, geolocalizacion, check-in, checkout y presencia viva.
- Celulas y materiales de estudio consultables desde la aplicacion.
- Gestion de iglesia con indicadores mensuales, miembros, roles y estados.
- Panel developer para habilitar o deshabilitar iglesias.
- Consola superadmin para configuracion de integraciones sin secretos en Git.

## Desarrollo local

Requisitos: Node.js 20 o superior, Python 3 y PostgreSQL.

```bash
npm install
./start_local_stack.sh
```

La PWA queda en `http://localhost:8080` y usa el proxy local `/api` hacia la API.
Las variables necesarias para el backend estan documentadas en
`push-server/.env.example`.

## Pruebas y build

```bash
npm test
npm run build:www
node --check push-server/server.js
```

La prueba de empaquetado verifica que todos los scripts locales referenciados
por `index.html`, incluido `auth.js`, existan dentro de `www/`.

## Despliegue

- Un push a `main` actualiza GitHub Pages y dispara el deploy configurado en
  Railway.
- Railway ejecuta las migraciones idempotentes incluidas en `ensureSchema()` al
  iniciar la API.
- Las credenciales se cargan como variables de Railway o desde superadmin; nunca
  deben agregarse al repositorio.

Para compilar las aplicaciones de tiendas, ver `GUIA-APP-MOVIL.md`.
