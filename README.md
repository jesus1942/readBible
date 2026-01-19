# BibleApp PWA

Una Progressive Web App (PWA) minimalista para leer la Biblia, diseñada para una experiencia de lectura plena y sin distracciones.

## Características

*   **Lectura Zen**: Modo de lectura sin distracciones.
*   **Búsqueda Rápida**: Busca por libro, capítulo y versículo.
*   **Múltiples Versiones**: Soporte para RVR1960, NVI, LBLA, y más.
*   **Offline First**: Funciona sin conexión una vez cargada (gracias al Service Worker).
*   **Versículo del Día**: Inspiración diaria.
*   **Compartir**: Genera imágenes de versículos para compartir en redes sociales.

## Desarrollo Local

Para ejecutar la aplicación localmente, necesitas Python 3 instalado.

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/jesus1942/readBible.git
    cd readBible
    ```

2.  Inicia el servidor:
    ```bash
    ./start_pwa_server.sh
    ```
    O manualmente:
    ```bash
    python3 server.py --port 8080
    ```

3.  Abre tu navegador en `http://localhost:8080`.

## Estructura

*   `app.js`: Lógica principal de la aplicación.
*   `server.py`: Servidor de desarrollo local con proxy CORS integrado.
*   `daily_verses.json`: Base de datos de versículos diarios.
