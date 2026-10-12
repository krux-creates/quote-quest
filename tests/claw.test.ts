import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WORLD } from "@/lib/physics";
import { type ClawEvent, type Sim, advance, createSim, grab, nudge, restSpot, seekTo, sight } from "@/quest/claw";

/** Run the machine until a ball comes down the chute, or give up. Returns what happened on the way. */
function play(sim: Sim, steps = 1500) {
  const events: ClawEvent[] = [];
  let prize: string | null = null;
  for (let i = 0; i < steps && !prize; i++) {
    advance(sim, false, (event, ball) => {
      events.push(event);
      if (event === "prize") prize = ball ?? null;
    });
  }
  return { events, prize };
}
const quiet = () => {};
/** Let the claw finish its round and settle. */
const rest = (sim: Sim) => {
  for (let i = 0; i < 260; i++) advance(sim, false, quiet);
};

describe("the claw", () => {
  it("rests over the pile, with a ball under it, not over the empty prize chute", () => {
    const sim = createSim();
    assert.ok(sim.claw.x > WORLD.dividerX + 8, `it starts at x=${sim.claw.x}, clear of the chute`);
    assert.ok(sight(sim).target, "there is a ball under it before anyone has steered");
    assert.equal(sight(sim, WORLD.homeX).target, null, "and nothing to take over the chute");
  });

  it("drops straight down when the button is pressed: it never travels sideways by itself", () => {
    const sim = createSim();
    for (const x of [sim.claw.x, WORLD.homeX, 150]) {
      sim.claw.x = x;
      grab(sim, quiet);
      assert.equal(sim.claw.phase, "down", `at x=${x} it goes down at once`);
      // Down, close and back up: the claw is on the same line all the way.
      const going = (): string => sim.claw.phase;
      while (["down", "close", "up"].includes(going())) {
        assert.equal(sim.claw.x, x);
        advance(sim, false, quiet);
      }
      rest(sim);
    }
  });

  it("wins a ball on every press when nobody steers: 150 grabs in a row", () => {
    const sim = createSim();
    for (let round = 1; round <= 150; round++) {
      grab(sim, quiet);
      const { events, prize } = play(sim);
      assert.ok(prize, `grab ${round} won a ball (${sim.bodies.length} left in the bin)`);
      assert.ok(!events.includes("miss"), `grab ${round} did not miss`);
      rest(sim);
      assert.equal(sim.claw.phase, "idle");
      assert.ok(sight(sim).target, `after round ${round} it is resting over a ball again`);
    }
  });

  it("wins the ball it is over, wherever along the rail that is, on a pile that is still settling", () => {
    // 20 fresh piles, every 5px along the rail. A freshly poured pile is still shifting, which
    // is how about one aimed grab in 400 used to miss before the claw learned to follow its
    // ball down and close on whatever is really between its prongs.
    let aimed = 0;
    for (let pile = 0; pile < 20; pile++) {
      for (let x = WORLD.minX; x <= WORLD.maxX; x += 5) {
        const sim = createSim();
        sim.claw.x = x;
        if (!sight(sim).target) continue;
        aimed++;
        grab(sim, quiet);
        const { events, prize } = play(sim);
        assert.ok(prize && !events.includes("miss"), `pile ${pile}: a grab at x=${x}, over a ball, won it`);
      }
    }
    assert.ok(aimed > 400, `${aimed} aimed grabs were tried`);
  });

  it("comes up empty when it is aimed at nothing, says so once, and waits there", () => {
    const sim = createSim();
    sim.claw.x = WORLD.homeX;
    grab(sim, quiet);
    const { events, prize } = play(sim, 400);
    assert.equal(prize, null);
    assert.equal(events.filter((e) => e === "miss").length, 1);
    assert.equal(sim.claw.phase, "idle");
    assert.equal(sim.claw.x, WORLD.homeX, "it did not go looking for a ball");
    assert.equal(sim.claw.open, true);
  });

  it("goes back to rest over the pile after delivering a prize", () => {
    const sim = createSim();
    grab(sim, quiet);
    assert.ok(play(sim).prize);
    rest(sim);
    assert.equal(sim.claw.phase, "idle");
    assert.equal(sim.claw.x, sim.claw.restX, "it is where it chose to rest");
    assert.ok(sim.claw.x > WORLD.dividerX + 8, "which is over the pile, not the chute");
    assert.ok(sight(sim).target, "with a ball under it");
    assert.ok(Math.abs(restSpot(sim) - sim.claw.x) < 30, "near the middle of the bin");
  });

  it("stops at each end of the rail", () => {
    const sim = createSim();
    sim.keys.right = true;
    for (let i = 0; i < 400; i++) advance(sim, false, quiet);
    assert.equal(sim.claw.x, WORLD.maxX);
    sim.keys.right = false;
    sim.keys.left = true;
    for (let i = 0; i < 400; i++) advance(sim, false, quiet);
    assert.equal(sim.claw.x, WORLD.minX);
  });

  it("slides to a tap on the glass and waits there, unless an arrow takes over", () => {
    const sim = createSim();
    seekTo(sim, 120);
    for (let i = 0; i < 200; i++) advance(sim, false, quiet);
    assert.equal(sim.claw.x, 120);
    assert.equal(sim.claw.phase, "idle");
    seekTo(sim, 60);
    advance(sim, false, quiet);
    sim.keys.right = true;
    advance(sim, false, quiet);
    assert.equal(sim.seek, null, "the arrow cancelled the tap");
    assert.ok(sim.claw.x > 118);
  });

  it("takes no steering while a prize is on screen, but finishes what it started", () => {
    const sim = createSim();
    const x = sim.claw.x;
    sim.keys.right = true;
    for (let i = 0; i < 60; i++) advance(sim, true, quiet);
    assert.equal(sim.claw.x, x, "locked: the arrow does nothing");
    sim.keys.right = false;
    assert.equal(nudge(sim, "right", quiet), true);
    grab(sim, quiet);
    // Locked from here on, as it is once the ball lands: the claw still delivers and goes to rest.
    for (let i = 0; i < 1500; i++) advance(sim, i > 30, quiet);
    assert.equal(sim.claw.phase, "idle");
    assert.equal(sim.claw.x, sim.claw.restX);
  });

  it("tops the bin up before it runs dry", () => {
    const sim = createSim();
    sim.bodies = sim.bodies.slice(0, 4);
    advance(sim, false, quiet);
    assert.equal(sim.bodies.length, 16, "twelve more tumble in");
    advance(sim, false, quiet);
    assert.equal(sim.bodies.length, 16, "and only once");
  });
});
