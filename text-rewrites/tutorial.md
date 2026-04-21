# Tutorial — Steps + Track Metadata

Every tutorial step's title, body, and CTA label, plus the track-level name/summary. Ordered by source file appearance — which matches gameplay order within each track.

Extracted by `scripts/extract-game-text.mjs` — re-run after source edits to refresh this file. Each entry shows the source location; apply edits by hand back to the TS source, then regenerate to confirm.

**Entries**: 66

---
### `id=skip_hint`
<sub>src/systems/Tutorial/TutorialTracks.ts:203</sub>

**name**:

> Tutorials Can Be Replayed

**summary**:

> Reminder that the ? button opens the tutorial list.

---

### `id=hint`
<sub>src/systems/Tutorial/TutorialTracks.ts:208</sub>

**title**:

> Come Back Any Time

**body**:

> Changed your mind about the tour? Tap this ? button to replay any tutorial — including the guided practice match.

---

### `id=basics`
<sub>src/systems/Tutorial/TutorialTracks.ts:220</sub>

**name**:

> Welcome Tour

**summary**:

> What tower defence is and what makes this one different.

---

### `id=intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:225</sub>

**title**:

> Welcome, Commander

**body**:

> Quick tour — under a minute. You'll learn how the game works and what's unique about it. Skip anytime.

---

### `id=td_basics`
<sub>src/systems/Tutorial/TutorialTracks.ts:231</sub>

**title**:

> The Basics

**body**:

> Creeps walk from spawn to base. You place towers along the way, towers kill creeps, dead creeps drop gold, gold buys more towers. Miss too many and you lose.

---

### `id=mazing`
<sub>src/systems/Tutorial/TutorialTracks.ts:237</sub>

**title**:

> What's Different: Mazing

**body**:

> Towers block creep paths. Place them smartly and you force creeps to snake through your killzone. Mazing is the whole game — it's more important than which towers you pick.

---

### `id=income`
<sub>src/systems/Tutorial/TutorialTracks.ts:243</sub>

**title**:

> What's Different: Income

**body**:

> On Normal and above, just killing creeps is not enough gold. You also earn income each wave via self-sent creeps (risky) or Frontier buildings (safer). More on that in-game.

---

### `id=factions`
<sub>src/systems/Tutorial/TutorialTracks.ts:249</sub>

**title**:

> 11 Factions

**body**:

> Each faction plays differently — Arcane crits, Nature poisons, Infernal sacrifices. When you pick one for the first time, you'll get a short primer.

---

### `id=map`
<sub>src/systems/Tutorial/TutorialTracks.ts:255</sub>

**title**:

> Pick a Map

**body**:

> Maps have different layouts, entry points, and constraints. Plains is a safe first pick.

---

### `id=modes`
<sub>src/systems/Tutorial/TutorialTracks.ts:262</sub>

**title**:

> Game Modes

**body**:

> Standard is the classic mode. Others change the economy or add heroes. You’ll see a short primer the first time you pick a different mode.

---

### `id=encyclopedia`
<sub>src/systems/Tutorial/TutorialTracks.ts:269</sub>

**title**:

> Encyclopedia

**body**:

> Documents every tower, creep, and hero — stats, traits, and ability descriptions. Open it any time you want to read before you fight.

---

### `id=store`
<sub>src/systems/Tutorial/TutorialTracks.ts:276</sub>

**title**:

> Store

**body**:

> Cosmetic skins for towers, heroes, and creeps, plus unlocks for the premium factions. Nothing in here is pay-to-win.

---

### `id=done`
<sub>src/systems/Tutorial/TutorialTracks.ts:283</sub>

**title**:

> You're Ready

**body**:

> Start with Standard on Plains with Normal difficulty — or take the guided practice match first.

---

### (anonymous)
<sub>src/systems/Tutorial/TutorialTracks.ts:289</sub>

**label**:

> Play Tutorial Match

---

### `id=tutorial_match`
<sub>src/systems/Tutorial/TutorialTracks.ts:301</sub>

**name**:

> Tutorial Match

**summary**:

> A scripted round as Arcane: maze, run a wave, send, frontier.

---

### `id=welcome`
<sub>src/systems/Tutorial/TutorialTracks.ts:308</sub>

**title**:

> Welcome

**body**:

> A short sandbox round — a few minutes, can't lose. We'll place towers, run three waves, and use the income systems at least once each.

---

### `id=pick_tower`
<sub>src/systems/Tutorial/TutorialTracks.ts:314</sub>

**title**:

> Pick a Tower

**body**:

> Click Arcane Bolt — the glowing card in the dock. Hotkey 1 works too.

---

### `id=place_first`
<sub>src/systems/Tutorial/TutorialTracks.ts:326</sub>

**title**:

> Place It Here

**body**:

> Drop the tower on the path anywhere in the highlighted strip. Watch what happens to the creep route.

---

### `id=mazing`
<sub>src/systems/Tutorial/TutorialTracks.ts:337</sub>

**title**:

> That's Mazing

**body**:

> The path bent around your tower. Every tower you drop reshapes the route — the longer you make creeps walk, the more time your towers have to shoot them.

---

### `id=pick_bolt_2`
<sub>src/systems/Tutorial/TutorialTracks.ts:343</sub>

**title**:

> Pick Bolt Again

**body**:

> Select Arcane Bolt again — we need a second one to extend the maze.

---

### `id=place_second`
<sub>src/systems/Tutorial/TutorialTracks.ts:356</sub>

**title**:

> Extend the Maze

**body**:

> Drop the Bolt in the highlighted strip — that's right along the new route. You want creeps to walk past your towers as long as possible.

---

### `id=start_wave_1`
<sub>src/systems/Tutorial/TutorialTracks.ts:366</sub>

**title**:

> Start Wave 1

**body**:

> Click Next Wave. Five slow creeps — your two Bolts handle them easily. Then we'll add some variety.

---

### `id=watch_wave_1`
<sub>src/systems/Tutorial/TutorialTracks.ts:374</sub>

**title**:

> Kills Drop Gold

**body**:

> Every creep you kill pays out. Watch your Gold go up. Wait for the wave to finish.

---

### `id=income_bonus`
<sub>src/systems/Tutorial/TutorialTracks.ts:382</sub>

**title**:

> Wave Income

**body**:

> See the +10/w next to your gold? That's income — you get it at the end of every wave regardless of kills. Sends and Frontier buildings both raise it.

---

### `id=pick_frost`
<sub>src/systems/Tutorial/TutorialTracks.ts:389</sub>

**title**:

> Try the Frost Tower

**body**:

> Not every tower deals damage. Arcane Frost slows creeps it hits — pair it with your Bolts and creeps crawl through your killzone. Select it from the dock (hotkey 2).

---

### `id=place_frost`
<sub>src/systems/Tutorial/TutorialTracks.ts:397</sub>

**title**:

> Place the Frost

**body**:

> Drop it in the highlighted strip so it hits the detoured creeps. Wave 2 brings fast creeps — you'll see the slow effect clearly.

---

### `id=buy_send`
<sub>src/systems/Tutorial/TutorialTracks.ts:407</sub>

**title**:

> Buy a Send

**body**:

> On the Sends tab, pick a Standard send and queue it. A send spawns an extra creep on your own wave — risky, but it permanently raises your income. Hotkey Z.

---

### `id=start_wave_2`
<sub>src/systems/Tutorial/TutorialTracks.ts:420</sub>

**title**:

> Start Wave 2

**body**:

> Fast creeps incoming — they're twice as quick as standards. Watch your Frost tower drag them down to a crawl.

---

### `id=watch_wave_2`
<sub>src/systems/Tutorial/TutorialTracks.ts:431</sub>

**title**:

> Next Wave Running

**body**:

> See the fast creeps bogging down in the frost zone? That's the synergy — slow them, then hit them while they're stuck. Next we try the safer income source.

---

### `id=pick_bolt_reinforce`
<sub>src/systems/Tutorial/TutorialTracks.ts:439</sub>

**title**:

> Pick Bolt

**body**:

> One more Bolt for the final wave. Select it from the dock.

---

### `id=place_fourth`
<sub>src/systems/Tutorial/TutorialTracks.ts:450</sub>

**title**:

> Reinforce

**body**:

> Wave 3 brings a heavier creep. Extend the maze one more step — the highlight shows the next row along your current detour.

---

### `id=frontier_intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:461</sub>

**title**:

> Frontier — Safe Income

**body**:

> Every faction has a Frontier building: passive income that ticks up every wave, no risk, no extra creeps to fight. It's the quiet, reliable counterpart to Sends. Over a long match, Frontier investments compound into most of your gold. For Arcane, that's the Leyline Nexus — we'll buy one next.

---

### `id=leyline_nexus_intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:468</sub>

**title**:

> The Leyline Nexus

**body**:

> The Nexus generates steady income and has an Overcharge button you can hit for a 3× gold burst — at the cost of two dormant waves after. Other factions have their own flavour: Mechanical digs (more gold, collapse risk), Nature grows and harvests on a cycle, Void gambles for a jackpot. They all fill the same slot in the economy.

---

### `id=buy_frontier`
<sub>src/systems/Tutorial/TutorialTracks.ts:475</sub>

**title**:

> Buy the Nexus

**body**:

> Tap the Frontier tab and buy a Leyline Nexus. You'll see your +w income jump at the end of the next wave.

---

### `id=start_wave_3`
<sub>src/systems/Tutorial/TutorialTracks.ts:487</sub>

**title**:

> Final Wave

**body**:

> One heavier creep in this one. If it leaks you'll barely notice — you have 99 lives here.

---

### `id=watch_wave_3`
<sub>src/systems/Tutorial/TutorialTracks.ts:498</sub>

**title**:

> Bring It Home

**body**:

> Let the final wave finish.

---

### `id=done`
<sub>src/systems/Tutorial/TutorialTracks.ts:506</sub>

**title**:

> You've Got It

**body**:

> Place towers to maze, kill for gold, invest in income. Pick a faction and run a real match — Plains, Standard, Normal is a clean first pick.

---

### (anonymous)
<sub>src/systems/Tutorial/TutorialTracks.ts:511</sub>

**label**:

> Back to Menu

---

### `id=income_standard`
<sub>src/systems/Tutorial/TutorialTracks.ts:520</sub>

**name**:

> Economy — Standard

**summary**:

> Sends, Frontier, and why income matters on Normal and above.

---

### `id=status_gold`
<sub>src/systems/Tutorial/TutorialTracks.ts:525</sub>

**title**:

> Gold

**body**:

> Your balance. Spend it on towers, upgrades, sends, or Frontier buildings.

---

### `id=status_income`
<sub>src/systems/Tutorial/TutorialTracks.ts:532</sub>

**title**:

> Income Per Wave

**body**:

> See the +10/w figure? That's extra gold you'll get at the end of every wave, on top of kill rewards. Grow it fast.

---

### `id=economy_panel`
<sub>src/systems/Tutorial/TutorialTracks.ts:539</sub>

**title**:

> Economy Panel

**body**:

> Here are your send options and Frontier buildings. Sends spawn creeps on your own map for permanent income (risk + reward). Frontier buildings grow income safely over time.

---

### `id=start_wave`
<sub>src/systems/Tutorial/TutorialTracks.ts:547</sub>

**title**:

> Start Wave

**body**:

> When you are ready, start the next wave. Harder difficulties need higher income — early sends pay off massively by the late game.

---

### `id=income_battle`
<sub>src/systems/Tutorial/TutorialTracks.ts:558</sub>

**name**:

> Economy — Essence

**summary**:

> Dual economy: gold + essence.

---

### `id=essence_intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:563</sub>

**title**:

> Essence Mode

**body**:

> You have two resources now. Gold buys towers as usual. Essence ticks in real time and buys special sends that convert back into income.

---

### `id=essence_panel`
<sub>src/systems/Tutorial/TutorialTracks.ts:569</sub>

**title**:

> Essence Generators

**body**:

> Buy generators early — they compound. Spend essence on sends to boost your gold income. The loop: gold → generators → essence → sends → income → gold.

---

### `id=income_hero`
<sub>src/systems/Tutorial/TutorialTracks.ts:580</sub>

**name**:

> Economy — Hero Defense

**summary**:

> Hero shop walkthrough: items, tomes, accessories, abilities.

---

### `id=hero_intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:585</sub>

**title**:

> Hero Defense

**body**:

> You control a hero in a 12-row arena — 10x creeps, elites at waves 10/20/30. Economy is simpler: a percentage of unspent gold returns as interest between waves. Most of your gold goes into the hero shop.

---

### `id=shop_overview`
<sub>src/systems/Tutorial/TutorialTracks.ts:591</sub>

**title**:

> The Hero Shop

**body**:

> Everything for your hero lives in the ECONOMY panel: stats, XP, items, tomes, accessories, and abilities. You'll spend most of your gold here instead of on towers.

---

### `id=shop_items`
<sub>src/systems/Tutorial/TutorialTracks.ts:599</sub>

**title**:

> Items

**body**:

> Six slot-based items. First purchase fills the slot at tier 1; subsequent purchases tier it up to the cap. Pick the slot, not the individual item — each slot has one fixed item per hero.

---

### `id=shop_tomes`
<sub>src/systems/Tutorial/TutorialTracks.ts:607</sub>

**title**:

> Tomes

**body**:

> One-shot stat boosts. Usually cheaper early-game purchases that add raw HP / damage / attack speed to your hero. Costs climb as you buy more.

---

### `id=shop_accessories`
<sub>src/systems/Tutorial/TutorialTracks.ts:615</sub>

**title**:

> Accessories

**body**:

> Up to 3 equipped at once. [P] are passive; [A] are active — press T in-game to trigger the active one. The offer pool rotates every few waves, so grab what fits your build.

---

### `id=shop_abilities`
<sub>src/systems/Tutorial/TutorialTracks.ts:623</sub>

**title**:

> Abilities

**body**:

> Three abilities bound to Q/W/E, plus an ultimate at R (unlocks at hero level 6). Level up to earn upgrade points — spend them with the [+] icon on any ability.

---

### `id=start_wave`
<sub>src/systems/Tutorial/TutorialTracks.ts:631</sub>

**title**:

> Start Wave

**body**:

> Saved gold isn't wasted — it comes back as interest. Don't overbuy early; a hero that survives wave 10 is worth more than a decked-out hero that dies at 5.

---

### `id=multiplayer`
<sub>src/systems/Tutorial/TutorialTracks.ts:642</sub>

**name**:

> Online Play

**summary**:

> Versus 1v1 and Circle Co-op — no server, P2P.

---

### `id=mp_intro`
<sub>src/systems/Tutorial/TutorialTracks.ts:647</sub>

**title**:

> P2P Multiplayer

**body**:

> No accounts, no server. You and your friend exchange connection codes directly. One of you hosts, the other joins with the host code.

---

### `id=mp_versus`
<sub>src/systems/Tutorial/TutorialTracks.ts:653</sub>

**title**:

> Versus 1v1

**body**:

> In Versus, each player builds on their own map. Creeps you send attack your opponent. You lose income but they lose lives — use sends aggressively.

---

### `id=mp_circle`
<sub>src/systems/Tutorial/TutorialTracks.ts:659</sub>

**title**:

> Circle Co-op

**body**:

> 2–4 players share a circular map. Everyone defends together — coordinate who handles which lane.

---

### `id=mode:endless`
<sub>src/systems/Tutorial/TutorialTracks.ts:708</sub>

**name**:

> Endless Primer

**summary**:

> No wave cap.

---

### `id=s`
<sub>src/systems/Tutorial/TutorialTracks.ts:713</sub>

**title**:

> Endless

**body**:

> Waves scale forever. Economy, towers, and sends work as in Standard — just no end. Score is the wave you die on.

---

### `id=mode:battle`
<sub>src/systems/Tutorial/TutorialTracks.ts:716</sub>

**name**:

> Essence Primer

**summary**:

> Dual economy.

---

### `id=s`
<sub>src/systems/Tutorial/TutorialTracks.ts:721</sub>

**title**:

> Essence (Battle)

**body**:

> Gold + Essence. Essence generators tick in real time, essence sends convert back to gold income. Snowball mode.

---

### `id=mode:hero_defense`
<sub>src/systems/Tutorial/TutorialTracks.ts:724</sub>

**name**:

> Hero Defense Primer

**summary**:

> Arena + hero.

---

### `id=s`
<sub>src/systems/Tutorial/TutorialTracks.ts:729</sub>

**title**:

> Hero Defense

**body**:

> 12-row arena, one hero under your control, simpler carryover economy. Use Q/W/E/R abilities and items.

---

### `id=mode:gauntlet`
<sub>src/systems/Tutorial/TutorialTracks.ts:732</sub>

**name**:

> Gauntlet Primer

**summary**:

> 100 waves through every faction.

---

### `id=s`
<sub>src/systems/Tutorial/TutorialTracks.ts:737</sub>

**title**:

> Gauntlet

**body**:

> 100 waves, each faction’s creep pool rotates. Draft a modifier at the start. Longest run in the game.
