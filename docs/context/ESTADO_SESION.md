# Estado actual del proyecto

Fecha: 2026-07-22
Rama de produccion: `main`
Aplicacion: Lectura Viva 1.4.0

## Arquitectura de despliegue

- GitHub Pages publica el frontend desde `main`.
- Railway despliega la API Express ubicada en `push-server/`.
- PostgreSQL se migra al arrancar mediante operaciones idempotentes de
  `ensureSchema()`.
- Capacitor genera las aplicaciones Android/iOS desde `www/`.

## Funciones listas

- Login Google web y sesiones persistentes.
- Estructura para Client IDs y adaptador nativo Android/iOS.
- Datos personales sincronizados y devocionales.
- Aislamiento de sedes, eventos, solicitudes, celulas y materiales por iglesia.
- Eventos con estado automatico, recurrencia, asistencia geografica, salida y
  presencia viva temporal.
- Panel de gestion de iglesia con KPIs y administracion de miembros.
- Panel developer con activacion y desactivacion persistente de iglesias.
- Superadmin sin email ni hash inicial hardcodeados en el repositorio.
- Pruebas unitarias del dominio y prueba de empaquetado movil.

## Configuracion pendiente externa

- Cargar Client IDs de Google reales y, para movil, instalar el adaptador nativo.
- Configurar credenciales de MercadoPago antes de desarrollar o habilitar cobros.
- Mantener en Railway los secretos detallados en `push-server/.env.example`.

## Regla de seguridad

La iglesia aplicable siempre se obtiene del usuario autenticado. El backend no
confia en un nombre de iglesia enviado por el frontend para autorizar consultas
o escrituras.
