# Guia: Lectura Viva como app movil (Android + iOS)

Esta app se empaqueta con Capacitor. El codigo web (HTML/CSS/JS) sigue siendo
el mismo que el PWA; Capacitor lo envuelve en proyectos nativos para Google Play
y App Store. No se reescribio nada.

## Que quedo configurado

- `capacitor.config.json` — identidad de la app (appId `com.lecturaviva.app`,
  nombre "Lectura Viva", color de fondo).
- `scripts/build-www.mjs` — copia el shell web a `www/` (lo que se empaqueta).
- `android/` — proyecto nativo de Android (se abre con Android Studio).
- `ios/` — proyecto nativo de iOS (se abre con Xcode, requiere Mac).
- Scripts en `package.json`: `build:www`, `sync`, `open:android`, `open:ios`.
- `auth.js` se incluye en `www/` y la prueba `tests/mobile-build.test.js`
  evita que vuelva a quedar afuera.

## Login movil

El backend ya acepta audiencias distintas para web, Android e iOS y `/auth/config`
entrega el Client ID correspondiente a cada plataforma. `auth.js` detecta
Capacitor y llama a `window.ReadBibleNativeAuth.getGoogleCredential(...)`.

Antes de publicar el login nativo faltan dos pasos que requieren credenciales:

1. Crear y cargar `GOOGLE_CLIENT_ID_ANDROID` y `GOOGLE_CLIENT_ID_IOS`.
2. Instalar un plugin de Google Sign-In para Capacitor y registrar un adaptador
   `ReadBibleNativeAuth` que devuelva el ID token. Sin ese adaptador, la app
   muestra un mensaje controlado y no expone ninguna clave.

La carpeta `www/` y las copias dentro de los proyectos nativos NO se versionan:
se regeneran con `npm run sync`.

## Primera vez (en tu maquina)

Al clonar el repo, instalar dependencias una vez:

    npm install

## Flujo de trabajo diario

Cada vez que cambia el codigo web y queres llevarlo a las apps:

    npm run sync

Eso arma `www/` y copia los assets dentro de android/ e ios/. Despues abris el
proyecto nativo y compilas.

## Requisitos

Android:
- Android Studio (incluye el SDK de Android y Gradle).
- Java JDK 17 o superior (Android Studio lo trae).

iOS (solo en Mac):
- macOS con Xcode instalado.
- Cuenta de desarrollador de Apple para firmar y publicar.

## Android: compilar y probar

    npm run sync
    npm run open:android        # abre Android Studio

En Android Studio: elegir un emulador o telefono conectado y pulsar Run.
Para generar el archivo de la tienda (AAB):
Build > Generate Signed Bundle / APK > Android App Bundle.

## iOS: compilar y probar (en Mac)

    npm run sync
    npm run open:ios            # abre Xcode

En Xcode: elegir un simulador o iPhone conectado y pulsar Run.
Para subir a la tienda: Product > Archive > Distribute App.

## Iconos y splash

Hoy usan los placeholder de Capacitor. Para poner el icono de Lectura Viva,
la forma mas simple es generar todos los tamanos desde una imagen de 1024x1024:

    npm install --save-dev @capacitor/assets
    npx capacitor-assets generate --iconBackgroundColor "#0f1412"

(coloca la imagen fuente en `assets/icon.png` 1024x1024 antes de correrlo).

## Publicar en las tiendas

Google Play:
1. Crear cuenta de Google Play Console (pago unico de 25 USD).
2. Generar el AAB firmado desde Android Studio.
3. Crear la ficha de la app (nombre, descripcion, capturas, politica de privacidad).
4. Subir el AAB y enviar a revision (suele aprobarse en horas o pocos dias).

App Store:
1. Cuenta de Apple Developer (99 USD por ano).
2. Archive desde Xcode y subir con Distribute App.
3. Completar la ficha en App Store Connect (capturas, descripcion, privacidad).
4. Enviar a revision (suele tardar 1 a 3 dias).

Ambas tiendas piden una politica de privacidad publica, porque la app pide
ubicacion (mapa de miembros) y puede enviar notificaciones.

## Importante: como se actualiza cada cosa

- El PWA web (GitHub Pages): se sigue actualizando solo, al instante, con cada
  merge a `main`. Nada cambia respecto a como veniamos trabajando.
- Las apps de las tiendas: NO se actualizan solas. Cada vez que querramos llevar
  cambios web a los usuarios de las apps hay que correr `npm run sync`, recompilar
  y subir una version nueva a la tienda (con su revision). Las apps son "fotos"
  periodicas del PWA.

Mas adelante se puede agregar actualizacion en caliente (OTA) para que los cambios
web lleguen a las apps sin pasar por revision, pero eso es un paso posterior.
