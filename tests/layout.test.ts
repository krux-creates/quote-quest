import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cabinetHeight, chooseLayout } from "@/quest/layout";

// Viewports as a browser really reports them: the screen size less the browser's own bars.
const cases: [name: string, vw: number, vh: number, family: string, minScale: number][] = [
  ["1080p desktop", 1920, 970, "beside", 1],
  ["the preview pane, wide", 1362, 1044, "beside", 1],
  ["1440 x 900 laptop", 1440, 790, "beside", 1],
  ["1366 x 768 laptop", 1366, 650, "split", 1],
  ["1280 x 720 laptop", 1280, 610, "split", 0.95],
  ["1024 x 768", 1024, 660, "split", 1],
  ["800 x 600 window", 800, 600, "split", 0.85],
  ["the preview pane, narrow", 803, 1044, "folded", 1],
  ["tablet, upright", 768, 1024, "folded", 1],
  ["phone, upright", 390, 844, "folded", 0.65],
  ["small phone, upright", 360, 740, "folded", 0.6],
  ["phone, sideways", 844, 390, "split", 0.85],
  ["4K screen", 3840, 2000, "beside", 2],
];

describe("chooseLayout", () => {
  for (const [name, vw, vh, family, minScale] of cases) {
    it(`${name} (${vw} x ${vh}) is ${family} at ${minScale} or better`, () => {
      const l = chooseLayout(vw, vh);
      assert.equal(l.family, family);
      assert.ok(l.scale >= minScale, `scale ${l.scale}`);
    });
  }

  it("always fits the window, with the cabinet standing clear of the bottom edge", () => {
    for (let vw = 320; vw <= 2600; vw += 37) {
      for (let vh = 320; vh <= 1500; vh += 41) {
        const l = chooseLayout(vw, vh);
        assert.ok(l.width * l.scale <= vw - 16 + 0.01, `${vw}x${vh} is too wide`);
        assert.ok(l.bar + l.height * l.scale + l.gap <= vh + 0.01, `${vw}x${vh} is too tall`);
        assert.ok(l.gap >= 8, `${vw}x${vh} has no floor`);
        assert.ok(Number.isInteger(l.art), `${vw}x${vh} has a fractional art pixel`);
      }
    }
  });

  it("is pixel-perfect whenever anything fits at full size", () => {
    // Every common laptop, desktop and tablet size, as the browser reports it.
    for (const [vw, vh] of [[1366, 650], [1440, 790], [1536, 730], [1680, 920], [1920, 970], [2560, 1300], [1024, 660], [803, 1044], [768, 1024], [820, 1180]]) {
      assert.equal(chooseLayout(vw, vh).scale, 1, `${vw}x${vh}`);
    }
  });

  it("keeps the mascot unless the window is a sliver", () => {
    assert.equal(chooseLayout(1280, 610).parts.mascot, true);
    assert.equal(chooseLayout(800, 600).parts.mascot, true);
    assert.equal(chooseLayout(844, 390).parts.mascot, false);
  });

  it("knows the height of each arrangement", () => {
    assert.equal(cabinetHeight({ mascot: true, marquee: "full", ledge: true, base: "full" }), 913);
    assert.equal(cabinetHeight({ mascot: true, marquee: "short", ledge: true, base: "none" }), 742);
    assert.equal(cabinetHeight({ mascot: false, marquee: "none", ledge: false, base: "none" }), 432);
  });
});

describe("the scenery", () => {
  it("knows how many of its rows a short window hides", () => {
    // 1920 x 1080 is exactly 4 screen pixels per art pixel: the whole stage shows.
    assert.equal(chooseLayout(1920, 1080).cut, 0);
    // A wide, short window: 3px art, 730 / 3 = 243.3 rows show, so 27 are hidden.
    assert.equal(chooseLayout(1536, 730).cut, 27);
  });
  it("hides a whole number of rows, never a negative one", () => {
    // Whole rows, so that whatever hangs from the top of the window lands on the pixel grid.
    for (let w = 320; w <= 2600; w += 97) {
      for (let h = 320; h <= 1500; h += 61) {
        const { cut } = chooseLayout(w, h);
        assert.ok(Number.isInteger(cut) && cut >= 0 && cut < 270, `${w}x${h} hides ${cut} rows`);
      }
    }
  });
});
