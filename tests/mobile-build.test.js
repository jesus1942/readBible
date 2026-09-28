import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("empaquetado Capacitor", () => {
  it("incluye todos los scripts locales que referencia index.html", async () => {
    await execFileAsync(process.execPath, ["scripts/build-www.mjs"], { cwd: process.cwd() });
    const html = await readFile("www/index.html", "utf8");
    const scripts = [...html.matchAll(/<script[^>]+src="([^"?]+)(?:\?[^\"]*)?"/g)]
      .map((match) => match[1])
      .filter((src) => !src.startsWith("http"));
    expect(scripts).toContain("auth.js");
    await Promise.all(scripts.map((src) => access(`www/${src}`)));
  });
});

describe("recursos de lectura sin conexión", () => {
  it("empaqueta la extensión dinámica y los 108 capítulos de Enoc", async () => {
    await execFileAsync(process.execPath, ["scripts/build-www.mjs"], { cwd: process.cwd() });
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const apocrypha = require("../apocrypha.js");
    await access("www/apocrypha.js");
    const chapters = {};
    for (const file of apocrypha.ENOCH_ES_FILES) {
      Object.assign(chapters, apocrypha.parseEnochTsv(await readFile(`www/${file.path}`, "utf8")));
    }
    expect(Object.keys(chapters)).toHaveLength(108);
  });
});
