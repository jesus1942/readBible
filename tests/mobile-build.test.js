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
