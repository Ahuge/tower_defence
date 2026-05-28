await import('../src/headless/harness/jsdom-setup.ts');
const { TOWER_TYPES } = await import('../src/data/TowerTypes.ts');
const { getTowerRole } = await import('../src/data/TowerRoles.ts');
const faction = process.argv[2] ?? 'arcane';
const arc = Object.values(TOWER_TYPES).filter(t => t.faction === faction);
console.log(`${faction}: ${arc.length} towers`);
for (const t of arc) console.log(t.id.padEnd(20), 'cost='+String(t.cost).padEnd(5), getTowerRole(t));
