export interface WaveDefinition {
  creepCount: number;
  creepHp: number;
  creepSpeed: number; // multiplier on base speed
  spawnInterval: number; // ms between spawns
  isBoss: boolean;
}

export function generateWaves(count: number): WaveDefinition[] {
  const waves: WaveDefinition[] = [];

  for (let i = 0; i < count; i++) {
    const waveNum = i + 1;
    const isBoss = waveNum % 10 === 0;

    if (isBoss) {
      waves.push({
        creepCount: 1,
        creepHp: 50 + waveNum * 30,
        creepSpeed: 0.6,
        spawnInterval: 0,
        isBoss: true,
      });
    } else {
      waves.push({
        creepCount: 5 + Math.floor(waveNum * 1.5),
        creepHp: 20 + waveNum * 8,
        creepSpeed: 1 + waveNum * 0.02,
        spawnInterval: 600 - Math.min(waveNum * 10, 400),
        isBoss: false,
      });
    }
  }

  return waves;
}
