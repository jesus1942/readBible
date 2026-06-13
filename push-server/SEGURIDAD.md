# Seguridad de comunidad

## Modelo de identidad

Cada usuario tiene dos valores en su dispositivo (localStorage):

- `communityKey` — identificador publico de la cuenta.
- `communitySecret` — prueba de identidad (256 bits, se genera una sola vez).

El cliente manda ambos en cada accion que modifica datos. El backend exige que
`communityKey` + `communitySecret` coincidan con la fila del usuario. Conocer la
key de otro NO alcanza para hacerse pasar por el: sin el secreto, se rechaza.

El secreto viaja en el cuerpo (POST) o la query (GET), nunca en un header, para
no romper CORS si el backend todavia no tiene el ultimo deploy.

### Migracion de cuentas viejas (trust-on-first-use)

Las cuentas creadas antes de esta version no tienen secreto. La primera accion
que llega adopta el secreto presentado y a partir de ahi queda fijo. Hay una
ventana breve durante la cual quien actue primero reclama la cuenta; en la
practica el cliente legitimo la reclama sola al abrir la app.

## Endpoints

Todos los endpoints que crean o modifican datos exigen `requireCommunityAuth`.
`members-map` y `role-requests` tambien (ven datos sensibles). El mapa de
miembros nunca devuelve el `communityKey` de otros usuarios.

Un dirigente solo puede aprobar roles de usuarios de su propia iglesia.

## Variables de entorno en Railway

Configurar en el servicio del backend:

- `COMMUNITY_DEVELOPER_CODE` — codigo del panel de desarrollador. Si no se
  define en produccion, el panel queda deshabilitado (falla cerrado). El codigo
  ya NO viaja en el codigo del cliente.
- `COMMUNITY_ADMIN_CODE` — codigo alterno para aprobar roles sin ser dirigente.
  Opcional; si no se define, solo los dirigentes aprueban.
- `CRON_SECRET` — protege los endpoints de envio de notificaciones.

## Orden de despliegue recomendado

Hacer el redeploy del backend (Railway) antes o junto con el merge del frontend
a `main`. El frontend nuevo es compatible con el backend viejo (manda el secreto
igual, el backend viejo lo ignora), asi que no se rompe nada si el backend va
atrasado; solo que la verificacion del secreto recien aplica cuando el backend
toma el deploy.
