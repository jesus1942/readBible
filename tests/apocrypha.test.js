import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const apocrypha = require("../apocrypha.js");

describe("libros antiguos y apocrifos", () => {
  it("normaliza aliases de Enoc y deuterocanonicos", () => {
    expect(apocrypha.canonicalBookName("Enoc")).toBe("1 Enoc");
    expect(apocrypha.canonicalBookName("1 Henoc")).toBe("1 Enoc");
    expect(apocrypha.canonicalBookName("Tobit")).toBe("Tobías");
    expect(apocrypha.canonicalBookName("Sirácida")).toBe("Eclesiástico");
    expect(apocrypha.isDeuterocanonicalBook("2 Macabeos")).toBe(true);
    expect(apocrypha.isEnochBook("1Enoc")).toBe(true);
  });

  it("limita 1 Enoc a 108 capitulos y arma el titulo de Wikisource", () => {
    expect(apocrypha.chapterPageTitle(1)).toBe("The_Book_of_Enoch_(Charles)/Chapter_01");
    expect(apocrypha.chapterPageTitle(108)).toBe("The_Book_of_Enoch_(Charles)/Chapter_108");
    expect(() => apocrypha.chapterPageTitle(109)).toThrow(RangeError);
  });

  it("extrae y selecciona rangos de versiculos de la edicion Charles", () => {
    const verses = apocrypha.extractVerseMapFromText(
      "CHAPTER I. 1. Alpha text. 2. Beta text continues. 3. Gamma text."
    );
    expect(verses[1]).toBe("Alpha text.");
    expect(verses[2]).toBe("Beta text continues.");
    expect(verses[3]).toBe("Gamma text.");
    expect(apocrypha.selectVerseRange(verses, 2, 3)).toBe("Beta text continues. Gamma text.");
    expect(apocrypha.verseCountFromMap(verses)).toBe(3);
  });

  it("parsea el formato TSV de la traduccion propia", () => {
    const chapters = apocrypha.parseEnochTsv(
      "# comentario\n1:1\tPrimer versiculo.\n1:2\tSegundo versiculo.\n2:1\tOtro capitulo.\n"
    );
    expect(chapters[1][1]).toBe("Primer versiculo.");
    expect(chapters[1][2]).toBe("Segundo versiculo.");
    expect(chapters[2][1]).toBe("Otro capitulo.");
    expect(apocrypha.spanishFileForChapter(108).path).toBe("data/enoch-es-91-108.tsv");
  });

  it("publica la extension y el texto espanol en el cache de la PWA", async () => {
    const sw = await readFile("service-worker.js", "utf8");
    expect(sw).toContain('bibleapp-pwa-v118');
    expect(sw).toContain('"./core.js?v=4"');
    expect(sw).toContain('"./apocrypha.js?v=2"');
    for (const file of apocrypha.ENOCH_ES_FILES) {
      expect(sw).toContain(`"./${file.url}"`);
    }
  });
});
