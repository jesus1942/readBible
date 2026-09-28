import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = await readFile("app.js", "utf8");
const shareFunction = source.slice(source.indexOf("function shareVerseAsPng("), source.indexOf("function wrapTextCentered("));

function setup({ hidden = true, navigator = {} } = {}) {
  const draw = vi.fn();
  const click = vi.fn();
  let encode;
  const ctx = { scale() {}, fillRect() {} };
  const canvas = { getContext: () => ctx, toBlob: (callback) => { encode = callback; } };
  const context = vm.createContext({
    resultEl: { hidden }, verseEl: { textContent: "Otro pasaje" }, refEl: { textContent: "Otra referencia" },
    lastShareAt: 0, trackEvent: vi.fn(), navigator,
    File: class { constructor(parts, name) { this.name = name; } },
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    document: { createElement: (tag) => tag === "canvas" ? canvas : { click, remove() {} }, body: { appendChild() {} } },
    wrapTextCentered: (...args) => { draw(...args); return 1; }, drawCenteredText: draw
  });
  vm.runInContext(shareFunction, context);
  return { share: context.shareVerseAsPng, draw, click, encode: () => encode({}) };
}

describe("compartir versículos", () => {
  it("genera el diario aunque no haya una lectura abierta, sin compartir otro pasaje", async () => {
    const test = setup();
    test.share({ text: "Texto diario", reference: "Salmos 23:1" });
    expect(test.draw.mock.calls.some((call) => call[1] === "Texto diario")).toBe(true);
    expect(test.draw.mock.calls.some((call) => call[1] === "Otro pasaje")).toBe(false);
    await test.encode();
    expect(test.click).toHaveBeenCalledOnce();
  });

  it("conserva compartir la lectura actual", async () => {
    const share = vi.fn().mockResolvedValue();
    const test = setup({ hidden: false, navigator: { canShare: () => true, share } });
    test.share();
    await test.encode();
    expect(share).toHaveBeenCalledOnce();
    expect(test.click).not.toHaveBeenCalled();
  });

  it("no descarga una imagen cuando el usuario cancela compartir", async () => {
    const test = setup({ navigator: { canShare: () => true, share: vi.fn().mockRejectedValue({ name: "AbortError" }) } });
    test.share({ text: "Texto diario", reference: "Salmos 23:1" });
    await test.encode();
    expect(test.click).not.toHaveBeenCalled();
  });
});
