import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WORLD } from "@/lib/physics";
import { type ClawEvent, type Sim, advance, createSim, grab, nearestCatch, nudge, seekTo, sight } from "@/quest/claw";

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

describe("the claw", () => {
  it("parks over the prize chute, where there is nothing to take", () => {
    const sim = createSim();
    assert.equal(sim.claw.x, WORLD.homeX);
    assert.equal(sight(sim).target, null);
    assert.notEqual(nearestCatch(sim), null);
  });

  it("goes and finds a ball when a grab is asked for with nothing under it", () => {
    const sim = createSim();
    grab(sim, quiet);
    assert.equal(sim.dropOnArrival, true, "it sets off for the nearest ball instead of dropping on nothing");
    const { events, prize } = play(sim);
    assert.ok(prize, "a ball came down the chute");
    assert.ok(!events.includes("miss"), "and it did not miss on the way");
  });

  it("never comes up empty: 150 grabs in a row, no steering", () => {
    const sim = createSim();
    for (let round = 1; round <= 150; round++) {
      grab(sim, quiet);
      const { events, prize } = play(sim);
      assert.ok(prize, `grab ${round} won a ball (${sim.bodies.length} left in the bin)`);
      assert.ok(!events.includes("miss"), `grab ${round} did not miss`);
      // Let the claw ride home and the bin settle or refill before the next one.
      for (let i = 0; i < 200; i++) advance(sim, false, quiet);
      assert.equal(sim.claw.phase, "idle");
    }
  });

  it("wins a ball from wherever along the rail it is dropped, on a pile that is still settling", () => {
    // 20 fresh piles, 34 places along the rail each: 680 grabs. A freshly poured pile is still
    // shifting, which is how about one grab in 400 used to miss before the claw learned to
    // follow its ball down and close on whatever is really between its prongs.
    for (let pile = 0; pile < 20; pile++) {
      for (let x = WORLD.minX; x <= WORLD.maxX; x += 5) {
        const sim = createSim();
        sim.claw.x = x;
        grab(sim, quiet);
        const { events, prize } = play(sim);
        assert.ok(prize && !events.includes("miss"), `pile ${pile}: a grab at x=${x} won a ball`);
      }
    }
  });

  it("goes again by itself if the ball it went for is gone when it gets there", () => {
    const sim = createSim();
    sim.claw.x = 90;
    let descents = 0;
    grab(sim, (event) => void (descents += event === "descend" ? 1 : 0));
    assert.equal(descents, 1, "there was a ball under it, so it dropped at once");
    // Whisk away that whole side of the pile while the claw is on its way down. What is left
    // is too far off to roll underneath before the prongs close.
    for (let i = 0; i < 12; i++) advance(sim, false, quiet);
    sim.bodies = sim.bodies.filter((b) => b.x > 150);
    assert.ok(sim.bodies.length > 4, "there are balls left, over on the right");
    const { events, prize } = play(sim, 3000);
    assert.ok(prize, "it still came back with a ball");
    assert.ok(!events.includes("miss"), "without ever calling it a miss");
    assert.ok(events.includes("descend"), "by going down a second time");
  });

  it("admits a miss only when there is nothing left to take", () => {
    const sim = createSim();
    sim.claw.x = 120;
    sim.bodies = [];
    sim.refillIn = 100000;
    grab(sim, quiet);
    const { events, prize } = play(sim, 1200);
    assert.equal(prize, null);
    assert.equal(events.filter((e) => e === "miss").length, 1);
    assert.equal(sim.claw.phase, "idle");
    assert.equal(sim.claw.x, WORLD.homeX, "and it rides home");
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

  it("lets the player take over on the way to a ball", () => {
    const sim = createSim();
    grab(sim, quiet);
    advance(sim, false, quiet);
    sim.keys.right = true;
    advance(sim, false, quiet);
    assert.equal(sim.dropOnArrival, false);
    assert.equal(sim.seek, null);
    assert.equal(sim.claw.phase, "idle", "it is steering now, not dropping");
  });

  it("slides to a tap on the glass and waits there", () => {
    const sim = createSim();
    seekTo(sim, 120);
    for (let i = 0; i < 200; i++) advance(sim, false, quiet);
    assert.equal(sim.claw.x, 120);
    assert.equal(sim.claw.phase, "idle");
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
    // Locked from here on, as it is once the ball lands: the claw still comes home.
    for (let i = 0; i < 1500; i++) advance(sim, i > 30, quiet);
    assert.equal(sim.claw.phase, "idle");
    assert.equal(sim.claw.x, WORLD.homeX);
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
