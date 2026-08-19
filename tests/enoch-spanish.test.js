import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const apocrypha = require("../apocrypha.js");

async function loadSpanishEnoch() {
  const chapters = {};
  for (const file of apocrypha.ENOCH_ES_FILES) {
    const text = await readFile(file.path, "utf8");
    const parsed = apocrypha.parseEnochTsv(text);
    Object.entries(parsed).forEach(([chapter, verses]) => {
      chapters[Number(chapter)] = verses;
    });
  }
  return chapters;
}

describe("1 Enoc en espanol", () => {
  it("incluye los 108 capitulos con al menos un versiculo", async () => {
    const chapters = await loadSpanishEnoch();
    expect(Object.keys(chapters).map(Number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 108 }, (_, index) => index + 1)
    );
    for (let chapter = 1; chapter <= 108; chapter += 1) {
      expect(apocrypha.verseCountFromMap(chapters[chapter])).toBeGreaterThan(0);
    }
  });

  it("conserva referencias criticas que Charles imprime fuera de secuencia", async () => {
    const chapters = await loadSpanishEnoch();
    expect(chapters[5][6]).toBeTruthy();
    expect(chapters[10][2]).toBeTruthy();
    expect(chapters[39][6]).toBeTruthy();
    expect(chapters[60][25]).toBeTruthy();
    for (let verse = 13; verse <= 19; verse += 1) expect(chapters[90][verse]).toBeTruthy();
    for (let verse = 15; verse <= 17; verse += 1) expect(chapters[106][verse]).toBeTruthy();
    expect(chapters[108][15]).toBeTruthy();
  });

  it("identifica la traduccion propia separada del original ingles", () => {
    expect(apocrypha.ENOCH_VERSION).toBe("ENOC-RB-ES-1");
    expect(apocrypha.ENOCH_ES_VERSION).not.toBe(apocrypha.ENOCH_EN_VERSION);
  });
});
