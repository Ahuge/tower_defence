await import('../src/headless/harness/jsdom-setup.ts');
const { getFactionTowerIds } = await import('../src/systems/bots/learning/FactionVocab.ts');
const ids = getFactionTowerIds('arcane');
console.log('arcane slot -> id:');
for (let i = 0; i < ids.length; i++) console.log(`  slot ${i}: ${ids[i]}`);
