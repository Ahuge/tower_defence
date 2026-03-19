/** Faction lore paragraphs */
export const FACTION_LORE: Record<string, string> = {
  arcane: 'The Arcane Order traces its roots to the first mages who discovered how to weave raw mana into destructive force. Their towers channel ancient ley-line energy through crystalline focuses, each one a miniature storm of controlled destruction. Where other factions rely on brute force or trickery, the Arcane Order understands that precision and amplification are the true paths to power.',
  mechanical: 'Born in the smoke-stacked foundries of the Iron Compact, Mechanical engineers believe that any problem can be solved with enough gears, pressure, and firepower. Their towers are marvels of steampunk ingenuity — from the humble turret that learns its target to the devastating Titan Cannon that can level a city block. They build not just defenses, but systems.',
  nature: 'The Verdant Circle draws power from the living world itself. Their towers grow from enchanted seeds, roots spreading deep into the earth to form networks of symbiotic defense. A single Thorn is unremarkable. A grove of Thorns, nurtured by Blossom and fed by Spore, becomes an impenetrable wall of poison and pain that grows stronger with every passing wave.',
  void: 'Those who peer into the Void see infinite possibility — and infinite risk. Void towers tap into the space between dimensions, where probability is a suggestion and gold flows from nowhere. Every shot from a Void tower is a gamble. Every investment is a leap of faith. But those who embrace the chaos are rewarded with power that defies conventional understanding.',
  military: 'The Steel Legion deploys boots on the ground. While other factions hide behind static defenses, Military commanders send soldiers directly into the fray. Their mobile units move with purpose, engaging threats wherever they appear. The Sandbags and Barbed Wire hold the line; the Riflemen and Brawlers break it. And when the Commander arrives, the entire battlefield shifts.',
  aliens: 'They came from the dark between stars. The Spawn are not individuals — they are a hive, a hunger, a flood of chitinous bodies that overwhelm through sheer volume. A single Spitter is barely a threat. Ten thousand of them, firing in concert, their acid burning through the strongest armor, their Brood Mothers endlessly spawning replacements — that is extinction.',
  cypherpunk: 'In the digital underground, hackers learned that reality itself has a source code. Cypherpunk towers don\'t just attack — they rewrite. Firewalls create barriers of pure data that burn anything passing through. Viruses spread from creep to creep. Backdoors flip a target\'s sense of direction. And when a Rootkit disables a mage\'s abilities, the look on its face is priceless.',
  infernal: 'The Infernal Pact is not a faction — it is a transaction. Every flame costs something. Imps arrive burning with borrowed time, their power fading with each wave. Hellfire towers blaze bright but inevitably dim. Even the Fiend, that screaming ball of demonic fury, pays the ultimate price for a single devastating explosion. But for those who can manage the constant cycle of creation and destruction, the power is unmatched.',
  celestial: 'The Celestial Order believes in one truth: the light endures. While others destroy, the Celestial defends. Their Acolytes channel holy energy that can restore lost lives. Their Wards silence the dark magic of enemy mages. Their Sanctuary can absorb the loss of a leaked creep entirely. Playing Celestial means playing the long game — you may take hits early, but the light always prevails.',
  psionic: 'The Psionic Collective abandoned the physical world long ago. Their attacks bypass armor entirely — what use is a steel plate against an assault on your mind? Probes deliver true damage that no defense can mitigate. Mesmers twist a creep\'s sense of direction, sending them stumbling backward. And the Overmind... when it opens fully, every mind in range shatters.',
  harmonic: 'The Harmonic Choir discovered that power is not in the note, but in the chord. A single Resonator hums quietly. Place an Amplifier nearby and it begins to sing. Add a Quickener and the melody quickens. Thread a Conduit between them and suddenly the entire field resonates with destructive force. The Choir does not build towers — they compose symphonies of destruction.',
};

/** Tower flavor text */
export const TOWER_LORE: Record<string, string> = {
  // Arcane
  arcane_bolt: 'A focused lance of pure arcane energy. Simple, reliable, and the backbone of any Arcane defense.',
  arcane_frost: 'Draws moisture from the air and flash-freezes it around targets. No upgrade needed — cold is cold.',
  arcane_storm: 'Channels atmospheric mana into crackling lightning that arcs across groups of enemies.',
  arcane_focus: 'A precision instrument. The Focus crystal magnifies arcane energy into devastating singular beams.',
  arcane_drain: 'Developed specifically to counter boss-class shielding. Drains magical barriers instantly.',
  arcane_meteor: 'Pulls a fragment from the elemental plane of fire. Takes a moment to arrive, but nothing survives the impact.',
  arcane_nova: 'The pinnacle of arcane weaponry. Everything the school teaches, concentrated into one devastating burst.',

  // Mechanical
  mech_wall: 'A pile of reinforced steel plates. Not much to look at, but it gets the job done.',
  mech_turret: 'Adaptive targeting algorithms let this turret fire faster the longer it tracks a single target.',
  mech_flamethrower: 'Pressurized alchemical fuel sprayed through a spark igniter. Burns hot, burns long.',
  mech_tesla: 'Nikola would be proud. Lightning arcs between conductors, chaining from target to target.',
  mech_mortar: 'Extreme-range ballistic artillery. The shell takes a while to arrive, but the blast radius makes up for it.',
  mech_shredder: 'A high-RPM rotary cutter that strips armor plating faster than it can be regenerated.',
  mech_railgun: 'Electromagnetic acceleration pushes a tungsten slug to hypersonic speed. Penetrates everything in its path.',
  mech_titan: 'The ultimate war machine. Engineering perfection. One shot changes the entire battlefield.',

  // Nature
  nature_thorn: 'A simple thorn-throwing plant. Easy to grow, and it never stops getting bigger.',
  nature_root: 'Entangling roots erupt from the ground, slowing anything caught in their grasp to a crawl.',
  nature_blossom: 'The Blossom doesn\'t fight. It nurtures. Every tower near it grows stronger, faster, more deadly.',
  nature_spore: 'Releases a cloud of toxic spores that poison everything near the tower. Area denial at its finest.',
  nature_vine: 'Whip-like vines lash out and occasionally wrap completely around a target, freezing it in place.',
  nature_elder: 'Planted as a seed, it grows forever. Given enough time, an Elder Treant becomes unstoppable.',

  // Void
  void_gambler: 'Flip a coin with the universe. Sometimes you win big. Sometimes you get nothing. Always exciting.',
  void_spike: 'Each shot is pulled from a different dimension, each with slightly different laws of physics.',
  void_siphon: 'Drains not just health but wealth from its targets. The gold has to come from somewhere.',
  void_rift: 'Tears a hole in space, depositing targets further back on their path. Cruel, but effective.',
  void_oblivion: 'A window into the end of everything. Stare into it long enough, and it stares back — with gold.',

  // Military
  mil_sandbag: 'Standard-issue field fortification. Place it, forget it, maze with it.',
  mil_wire: 'Razor wire strung between posts. Not glamorous, but anything walking through it regrets the decision.',
  mil_rifleman: 'A trained soldier who moves to engage threats at range before falling back to position.',
  mil_brawler: 'Close-quarters combat specialist. Gets in their face and hits hard.',
  mil_heavy: 'Suppressive fire specialist. Slow, but everything around takes damage.',
  mil_commander: 'The presence of a Commander on the field inspires every unit nearby to fight harder.',

  // Aliens
  alien_spitter: 'The most basic hive organism. Individually worthless. En masse, unstoppable.',
  alien_stinger: 'Barbed projectiles coated in a mild neurotoxin. The poison is weak, but relentless.',
  alien_swarm_node: 'A pheromone broadcaster that drives nearby organisms into a frenzy of accelerated firing.',
  alien_acid: 'Concentrated acid that dissolves armor and flesh alike. Short range, devastating effect.',
  alien_hive_spire: 'A neural relay tower. Bioelectric pulses chain from target to target with terrifying speed.',
  alien_brood_mother: 'A living factory. Every wave, she births new warriors to defend the hive.',
  alien_swarmling: 'Born to fight, born to die. The swarmling charges without hesitation and bites without mercy.',
  alien_overmind: 'The psychic heart of the hive. Its mere presence accelerates every organism nearby.',

  // Cypherpunk
  cyber_ping: 'A simple network probe. Low damage, but it can see across the entire map.',
  cyber_firewall: 'Place two and a data barrier forms between them. Anything crossing it gets burned.',
  cyber_virus: 'Injects malicious code that spreads to adjacent targets. The infected become carriers.',
  cyber_backdoor: 'Exploits a cognitive vulnerability, literally reversing the target\'s direction.',
  cyber_ddos: 'Overloads the local processing capacity. Everything in range locks up briefly.',
  cyber_rootkit: 'Deep-level system compromise. Strips abilities and armor from its target.',
  cyber_zeroday: 'An undiscovered exploit in reality itself. Combines every hack into one devastating attack.',

  // Infernal
  infernal_imp: 'Summoned from the lowest pits. Burns bright for a few waves, then returns to ash.',
  infernal_hellfire: 'Demonic flame that grows dimmer with each passing wave. Use it while it lasts.',
  infernal_soul_drain: 'Feeds on the death of nearby creatures, converting their essence to gold.',
  infernal_bomber: 'A screaming ball of demonic fury. Charges the nearest enemy and detonates. Single use.',
  infernal_immolate: 'A contained inferno. Powerful on its own, devastating when sacrificed.',
  infernal_apocalypse: 'The final fire. When this tower falls silent, nothing else needs to speak.',

  // Celestial
  celestial_acolyte: 'A humble servant of the light. Each kill has a small chance to restore what was lost.',
  celestial_ward: 'Projects a field of holy silence. Enemy mages within range find their powers muted.',
  celestial_smite: 'Holy wrath focused on the powerful. Bosses and shielded targets take significantly more damage.',
  celestial_sanctuary: 'A miracle made manifest. Can absorb the loss of a leaked creep, preventing life loss entirely.',
  celestial_absolution: 'The light\'s final answer. Heals, silences, smites, and forgives — all at once.',

  // Psionic
  psi_probe: 'A psychic needle. Passes through all physical defenses like they aren\'t there.',
  psi_mesmer: 'Implants a false memory of the path, sending the target stumbling backward in confusion.',
  psi_terror: 'Broadcasts a psychic scream that slows everything in range to a terrified crawl.',
  psi_mind_spike: 'A focused psychic lance that strikes from extreme range. Mage-class targets are especially vulnerable.',
  psi_overmind: 'Opens every mind in range simultaneously. The confusion is absolute. The damage is lethal.',

  // Harmonic
  harmonic_resonator: 'A tuning fork for destruction. Alone it barely hums. Surrounded by auras, it screams.',
  harmonic_amplifier: 'Broadcasts a damage resonance field. Every tower within earns feels the boost.',
  harmonic_quickener: 'Accelerates the rhythm of nearby towers. Everything fires just a little faster.',
  harmonic_reach: 'Extends the harmonic field outward, letting nearby towers project their attacks further.',
  harmonic_critical_mass: 'Generates probability harmonics. Nearby towers find their shots landing critical hits more often.',
  harmonic_conduit: 'The linchpin. Links aura towers together, sharing their effects across the network.',
  harmonic_crescendo: 'The crescendo of the symphony. Every aura touching it reaches its peak.',
};

/** Creep flavor text */
export const CREEP_LORE: Record<string, string> = {
  standard: 'The rank and file. No tricks, no surprises. Just a steady march toward the exit.',
  fast: 'Light armor, double speed. They slip through gaps before towers can react.',
  armored: 'Walking fortresses. Physical attacks bounce off their plating. Magic is the answer.',
  swarm: 'They come in threes, tiny and numerous. Individually nothing, collectively a problem.',
  healer: 'Keeps its allies alive with a regenerative aura. Kill it first, or watch your progress undo itself.',
  boss: 'Massive HP, heavy armor, energy shields. Everything about it is designed to survive.',
  group: 'Arrives in tight clusters of four. Splash damage is the counter.',
  splitter: 'Kill it and two smaller versions emerge from the corpse. The problem doesn\'t end — it multiplies.',
  splitter_child: 'The offspring of a Splitter. Fast, fragile, and already running toward the exit.',
  shielded: 'An energy barrier limits incoming damage to 1 per hit. Fast attacks or Mana Drain are essential.',
  mage_armor: 'Projects an aura that hardens the armor of nearby creeps. Priority target.',
  mage_speed: 'A haste field accelerates everything nearby. Your maze suddenly isn\'t long enough.',
  mage_evasion: 'Grants nearby creeps a chance to dodge attacks entirely. Extremely frustrating.',
  mage_heal: 'Periodically heals nearby creeps for a flat amount. Sustained, reliable, dangerous.',
  evasive: 'One in four attacks simply misses. High fire-rate towers improve the odds.',
  regenerator: 'Thick-skinned and self-healing. Chip damage means nothing — you need sustained, overwhelming firepower.',
  flying: 'Ignores your carefully constructed maze. Flies in a straight line to the exit. Plan accordingly.',
};
