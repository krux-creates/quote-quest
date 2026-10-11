"use client";

// Every piece of Quote Quest art on one page, at the scale the game uses.
import { useEffect, useState } from "react";

import { Art, type Ink, SPARKLES, cloud, heart, icon, letter, sparkle, star, tiger } from "@/quest/art";
import { BALLS, BallArt, BallShadow, RARITY_LABEL } from "@/quest/balls";
import { CARD_STYLES, renderCard } from "@/quest/cards";
import { QUEST_QUOTES } from "@/quest/quotes";
import "@/quest/quest.css";
import { WorldThumb } from "@/quest/scenery";
import * as S from "@/quest/scenery-art";
import { WorldWipe } from "@/quest/transition";
import { WORLDS } from "@/quest/worlds";

function Group({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`qq-box qq-card p-5 ${className}`}>
      <h2 className="qq-tag mb-4">{title}</h2>
      <div className="flex flex-wrap items-end gap-5">{children}</div>
    </section>
  );
}

const ICONS = ["arm", "sprout", "bulb", "target", "compass", "yin", "heart", "pad", "arrowL", "arrowR", "prev", "next", "heartLine", "heartFull", "copyMono", "x", "soundOn", "soundOff", "pip", "note", "down", "check", "globe", "starlet"];

/** The picture the Download button saves, one per world, drawn here so it can be looked at without downloading anything. */
function Cards() {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const picks = ["c5", "g4", "a5", "r4", "w5"];
    Promise.all(WORLDS.map((w, i) => renderCard(QUEST_QUOTES.find((q) => q.id === picks[i]) ?? QUEST_QUOTES[0], BALLS[(i * 2 + 1) % BALLS.length], w))).then((all) => {
      if (live) setUrls(all.map((cv) => cv?.toDataURL("image/png") ?? ""));
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      {WORLDS.map((w, i) => (
        <figure key={w.id} className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made on this page */}
          {urls[i] ? <img src={urls[i]} alt={`${CARD_STYLES[w.id].name} card`} width={408} height={340} /> : <div style={{ width: 408, height: 340 }} />}
          <figcaption className="text-[9px]">
            {w.name} · {CARD_STYLES[w.id].name}
          </figcaption>
        </figure>
      ))}
    </>
  );
}

export default function AssetSheet() {
  return (
    <main className="qq qq-sheet p-8">
      <h1 className="mb-6 text-[18px] tracking-[0.06em]">QUOTE QUEST · ASSET SHEET</h1>
      <div className="grid max-w-[1320px] grid-cols-2 gap-6">
        <Group title="Mascot: thirteen faces, six poses" className="col-span-2">
          {(["happy", "blink", "lookL", "lookR", "wink", "wow", "sad", "love", "stars", "laugh", "purr", "sleep", "cool"] as const).map((m) => (
            <figure key={m} className="flex flex-col items-center gap-1">
              <Art sprite={tiger(m)} px={3} />
              <figcaption className="text-[8px]">{m}</figcaption>
            </figure>
          ))}
          {(
            [
              ["wave", "happy", { paw: "wave" }],
              ["knead 1", "purr", { paw: "kneadL" }],
              ["knead 2", "purr", { paw: "kneadR" }],
              ["ear flick", "happy", { ears: true }],
              ["tilt", "wink", { tilt: -1 }],
              ["tilt back", "purr", { tilt: 1 }],
            ] as const
          ).map(([label, mood, pose]) => (
            <figure key={label} className="flex flex-col items-center gap-1">
              <Art sprite={tiger(mood, pose)} px={3} />
              <figcaption className="text-[8px]">{label}</figcaption>
            </figure>
          ))}
        </Group>
        <Group title="Balls: eight designs, four rarities" className="col-span-2">
          {BALLS.map((b) => (
            <figure key={b.id} className="flex flex-col items-center gap-2">
              <BallArt id={b.id} px={5} />
              <figcaption className="text-center text-[9px] leading-[1.7]">
                {b.name}
                <br />
                <span className="opacity-60">{RARITY_LABEL[b.rarity]}</span>
              </figcaption>
            </figure>
          ))}
          <BallShadow px={5} />
        </Group>
        <Group title="Marquee lettering, one set of inks per world" className="col-span-2">
          <div className="flex flex-col gap-3">
            {WORLDS.map((w) => (
              <div key={w.id} className="flex items-center gap-4">
                <WorldThumb world={w.id} px={2} />
                <span className="flex" style={{ background: "#3a3660", padding: 6 }}>
                  {[..."QUOTEQUEST"].map((ch, i) => (
                    <Art key={i} sprite={letter(ch, w.inks[i] as Ink)} px={3} className={i ? "-ml-1" : ""} />
                  ))}
                </span>
                <span className="text-[10px]">
                  World {w.stage} · {w.name}
                </span>
              </div>
            ))}
          </div>
        </Group>
        <Group title="Dreamland">
          <Art sprite={S.island(64)} px={3} />
          <Art sprite={S.cake(52)} px={3} />
          <Art sprite={S.puffTree(13)} px={3} />
          <Art sprite={S.lolli(8)} px={3} />
          <Art sprite={S.gumdrop(16)} px={3} />
          <Art sprite={cloud(34)} px={3} />
          <Art sprite={heart(10)} px={3} />
          <Art sprite={star(12, false)} px={3} />
        </Group>
        <Group title="Mushroom Hills">
          <Art sprite={S.mushroom(40)} px={3} />
          <Art sprite={S.mushroom(22, "#ffc93a", "#d9952a", "#fff0a8")} px={3} />
          <Art sprite={S.block("brick")} px={3} />
          <Art sprite={S.block("prize")} px={3} />
          <Art sprite={S.coin()} px={3} />
          <Art sprite={S.bush(30)} px={3} />
          <Art sprite={S.flower()} px={3} />
        </Group>
        <Group title="Cosmic Arcade">
          <Art sprite={S.planet(24, ["#ffc98a", "#f9a86a", "#f08a5d", "#e87a5a", "#d96a4a", "#c9584a"], "#7a2f4a", ["#ffe1a8", "#f0b87a"])} px={3} />
          <Art sprite={S.moon(12)} px={3} />
          <Art sprite={S.rocket()} px={3} />
          <Art sprite={S.ufo()} px={3} />
          <Art sprite={S.satellite()} px={3} />
          <Art sprite={S.rock(44, "#5a52a6", "#8f88dc", "#3f3888", "#1f1c52")} px={3} />
        </Group>
        <Group title="Neon Circuit">
          <Art sprite={S.car("#ee2f4a", "#ff8a96", "#a81a30", 1)} px={4} />
          <Art sprite={S.car("#3f7af0", "#9fc0ff", "#2550b8", -1)} px={4} />
          <Art sprite={S.car("#ffd23f", "#fff0a8", "#d9952a")} px={4} />
          <Art sprite={S.flag()} px={3} />
          <Art sprite={S.lampPost(26)} px={3} />
        </Group>
        <Group title="Dungeon Quest" className="col-span-2">
          <Art sprite={S.crystal("emerald", 28)} px={3} />
          <Art sprite={S.crystal("violet", 20)} px={3} />
          <Art sprite={S.crystal("cyan", 16)} px={3} />
          <Art sprite={S.chest()} px={3} />
          <Art sprite={S.goldPile(20)} px={3} />
          <Art sprite={S.torchBracket()} px={3} />
          <Art sprite={S.flame(0)} px={3} />
          <Art sprite={S.flame(1)} px={3} />
          <Art sprite={S.bat(0)} px={3} />
          <Art sprite={S.bat(1)} px={3} />
          <Art sprite={S.block("stone")} px={3} />
        </Group>
        <Group title="World transitions, caught halfway: each world closes over the last in its own way" className="col-span-2">
          {WORLDS.map((w) => (
            <figure key={w.id} className="flex flex-col gap-2">
              <div className="relative overflow-hidden" style={{ width: 240, height: 135, background: "#b9a6f2" }}>
                <WorldWipe world={w.id} stage="in" at={0.55} />
              </div>
              <figcaption className="text-[9px]">{w.name}</figcaption>
            </figure>
          ))}
        </Group>
        <Group title="Things that move" className="col-span-2">
          <Art sprite={S.balloon("#ff9ec6", "#fff6fa")} px={3} />
          <Art sprite={S.bird(0)} px={3} />
          <Art sprite={S.bird(1)} px={3} />
          <Art sprite={S.blob("#ff9ec6", "#ffd9e8", "#c9619a")} px={3} />
          <Art sprite={S.blob("#4f9cf0", "#b6dcff", "#1f4a8a")} px={3} />
          <Art sprite={S.butterfly(0)} px={3} />
          <Art sprite={S.butterfly(1)} px={3} />
          <Art sprite={S.goalFlag(0)} px={3} />
          <Art sprite={S.plank()} px={3} />
          <Art sprite={S.asteroid(7, 0)} px={3} />
          <Art sprite={S.astronaut()} px={3} />
          <Art sprite={S.rover()} px={3} />
          <Art sprite={S.palm()} px={3} />
          <Art sprite={S.blimp()} px={3} />
          <Art sprite={S.spider()} px={3} />
          <Art sprite={S.rat()} px={3} />
          <Art sprite={S.flame(0, "#ffffff", "#8fe6ff", "#4fa0ff")} px={3} />
        </Group>
        <Group title="World furniture" className="col-span-2">
          <Art sprite={S.cupcake()} px={3} />
          <Art sprite={S.candyCane()} px={3} />
          <Art sprite={S.signpost()} px={3} />
          <Art sprite={S.fence(24)} px={3} />
          <Art sprite={S.dome()} px={3} />
          <Art sprite={S.moonFlag()} px={3} />
          <Art sprite={S.billboard()} px={3} />
          <Art sprite={S.cone()} px={3} />
          <Art sprite={S.tires()} px={3} />
          <Art sprite={S.barrel()} px={3} />
          <Art sprite={S.crate()} px={3} />
          <Art sprite={S.bones()} px={3} />
          <Art sprite={S.banner()} px={3} />
          <Art sprite={S.cobweb()} px={3} />
        </Group>
        <Group title="Downloaded pictures: one card style per world" className="col-span-2">
          <Cards />
        </Group>
        <Group title="Sparkles">
          {(Object.keys(SPARKLES) as (keyof typeof SPARKLES)[]).map((c, i) => (
            <Art key={c} sprite={sparkle(c, i % 2 ? 9 : 7)} />
          ))}
        </Group>
        <Group title="Icons">
          {ICONS.map((n) => (
            <Art key={n} sprite={icon(n)} px={3} />
          ))}
        </Group>
      </div>
    </main>
  );
}
