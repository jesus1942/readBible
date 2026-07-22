import { readFile } from "node:fs/promises";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

describe("interfaz mobile-first", () => {
  it("mantiene una hoja valida con reglas base moviles y mejoras progresivas", async () => {
    const css = await readFile("styles.css", "utf8");

    expect(() => postcss.parse(css)).not.toThrow();
    expect(css).toContain("MOBILE-FIRST FOUNDATION");
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(css).toContain("width: min(88vw, 360px)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("100dvh");
    expect(css).toContain("@media (min-width: 720px)");
  });

  it("publica la misma version de estilos en HTML y service worker", async () => {
    const [html, serviceWorker] = await Promise.all([
      readFile("index.html", "utf8"),
      readFile("service-worker.js", "utf8")
    ]);
    const stylesheet = html.match(/href="styles\.css\?v=(\d+)"/);

    expect(html).toContain("viewport-fit=cover");
    expect(stylesheet).not.toBeNull();
    expect(serviceWorker).toContain(`"./styles.css?v=${stylesheet[1]}"`);
  });

  it("no repite identificadores de controles", async () => {
    const html = await readFile("index.html", "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
  });
});
