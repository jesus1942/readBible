// Arma la carpeta www/ que Capacitor empaqueta dentro de las apps nativas.
// No transpila ni procesa nada: copia los archivos del shell tal cual.
// La fuente de verdad sigue siendo la raiz del repo (que GitHub Pages publica).

import { rm, mkdir, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

// Allowlist: solo lo que la app necesita en runtime.
const ENTRIES = [
  "index.html",
  "styles.css",
  "core.js",
  "net.js",
  "app.js",
  "daily_verses.json",
  "efemerides.json",
  "manifest.json",
  "service-worker.js",
  "icons",
  "assets"
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ENTRIES) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}

console.log(`www/ armado con ${ENTRIES.length} entradas.`);
