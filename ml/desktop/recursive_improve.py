"""
recursive_improve.py — Self-improving eval and data generation loop.

This script analyzes eval results, identifies weaknesses, and automatically
modifies the data generator and eval set to focus on those weaknesses.
It tracks what worked and adjusts its own strategy over time.

Loop:
  1. Load latest eval results
  2. Identify weakest factions (lowest win rate)
  3. Modify generate_data.mts to oversample weak factions
  4. Modify eval_set.mts to add harder seeds for weak factions
  5. Track improvement history, adjust strategy

Usage:
    python ml/desktop/recursive_improve.py --eval ml/desktop/eval-baseline.json
    python ml/desktop/recursive_improve.py --eval eval-new.json --history ml/desktop/improve-history.json
"""

import json
import argparse
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

HISTORY_FILE = Path('ml/desktop/improve-history.json')

class RecursiveImprover:
    def __init__(self, history_path=HISTORY_FILE):
        self.history_path = Path(history_path)
        self.history = self.load_history()
    
    def load_history(self):
        if self.history_path.exists():
            return json.loads(open(self.history_path).read())
        return {
            'iterations': [],
            'strategy_scores': defaultdict(float),  # strategy -> avg improvement
            'faction_difficulty': {},  # faction -> difficulty score (0-1, lower = harder)
        }
    
    def save_history(self):
        # Convert defaultdict to dict for JSON
        h = dict(self.history)
        h['strategy_scores'] = dict(h['strategy_scores'])
        with open(self.history_path, 'w') as f:
            json.dump(h, f, indent=2)
    
    def analyze_eval(self, eval_path):
        """Find weakest factions and hardest seeds."""
        data = json.loads(open(eval_path).read())
        
        # Per-faction win rates
        faction_stats = {}
        for faction, stats in data['byFaction'].items():
            win_rate = stats['wins'] / stats['total'] if stats['total'] > 0 else 0
            faction_stats[faction] = {
                'win_rate': win_rate,
                'avg_wave': stats['avgWave'],
                'wins': stats['wins'],
                'total': stats['total'],
            }
        
        # Sort by win rate (worst first)
        weakest = sorted(faction_stats.items(), key=lambda x: x[1]['win_rate'])
        
        # Find hardest seeds (seeds where most factions lose)
        seed_losses = defaultdict(int)
        seed_total = defaultdict(int)
        for r in data['results']:
            seed_losses[r['seed']] += 0 if r['won'] else 1
            seed_total[r['seed']] += 1
        
        hardest_seeds = sorted(
            [(s, seed_losses[s] / seed_total[s]) for s in seed_losses],
            key=lambda x: x[1], reverse=True
        )[:5]
        
        return {
            'faction_stats': faction_stats,
            'weakest': weakest[:3],  # bottom 3
            'strongest': weakest[-3:],  # top 3
            'hardest_seeds': hardest_seeds,
            'overall_win_rate': data['overall']['winRate'],
        }
    
    def choose_strategy(self, analysis):
        """Pick improvement strategy based on history and current weaknesses."""
        weakest_factions = [f for f, _ in analysis['weakest']]
        
        strategies = []
        
        # Strategy 1: Oversample weak factions in data generation
        strategies.append({
            'name': 'oversample_weak',
            'description': f'Generate 3x data for weakest factions: {weakest_factions}',
            'score': self.history['strategy_scores'].get('oversample_weak', 0.0),
        })
        
        # Strategy 2: Add harder seeds to eval
        strategies.append({
            'name': 'harden_eval',
            'description': f'Add 10 new seeds biased toward hard seeds for weak factions',
            'score': self.history['strategy_scores'].get('harden_eval', 0.0),
        })
        
        # Strategy 3: Focus on wave-range where failures cluster
        # (Find the wave where most losses happen for weak factions)
        strategies.append({
            'name': 'wave_focus',
            'description': 'Generate data starting from mid-game (wave 10+) for weak factions',
            'score': self.history['strategy_scores'].get('wave_focus', 0.0),
        })
        
        # Pick highest-scoring strategy, with exploration bonus for untried
        for s in strategies:
            if s['name'] not in self.history['strategy_scores']:
                s['score'] += 0.5  # exploration bonus
        
        best = max(strategies, key=lambda s: s['score'])
        return best
    
    def modify_generator(self, strategy, analysis, repo_root=Path('.')):
        """Modify generate_data.mts based on chosen strategy."""
        gen_path = repo_root / 'ml/desktop/generate_data.mts'
        content = open(gen_path).read()
        
        if strategy['name'] == 'oversample_weak':
            weakest = [f for f, _ in analysis['weakest']]
            # Modify FACTIONS array to repeat weak factions 3x
            # This is a simple text manipulation — in practice you'd want AST
            old_factions = """const FACTIONS = ['void', 'cypherpunk', 'military', 'psionic', 'mechanical', 
                  'harmonic', 'aliens', 'arcane', 'nature', 'infernal', 'celestial'];"""
            
            # Build weighted list: weak factions appear 3x
            all_factions = ['void', 'cypherpunk', 'military', 'psionic', 'mechanical',
                          'harmonic', 'aliens', 'arcane', 'nature', 'infernal', 'celestial']
            weighted = []
            for f in all_factions:
                weighted.append(f"'{f}'")
                if f in weakest:
                    weighted.extend([f"'{f}'", f"'{f}'"])  # 3x total
            
            new_factions = f"const FACTIONS = [{', '.join(weighted)}];\n// Auto-modified by recursive_improve.py: oversampling {weakest}"
            
            if old_factions in content:
                content = content.replace(old_factions, new_factions)
                print(f"  Modified generator: oversampling {weakest}")
            else:
                print(f"  Warning: could not find FACTIONS array to modify")
        
        elif strategy['name'] == 'wave_focus':
            # Add a flag to start matches from wave 10 for weak factions
            # This requires a bigger change — for now, just note it
            print(f"  Strategy 'wave_focus' requires harness changes — skipping auto-modify")
            print(f"  Recommendation: add --start-wave option to generate_data.mts")
        
        open(gen_path, 'w').write(content)
        return strategy['name']
    
    def modify_eval(self, strategy, analysis, repo_root=Path('.')):
        """Modify eval_set.mts to harden evaluation."""
        eval_path = repo_root / 'ml/desktop/eval_set.mts'
        content = open(eval_path).read()
        
        if strategy['name'] == 'harden_eval':
            # Add 10 new seeds (2600-3500) for weakest factions
            # For simplicity, we'll add them to the global SEEDS array
            # A smarter version would do per-faction seeds
            old_seeds = "               2100, 2200, 2300, 2400, 2500];  // fixed"
            new_seeds = ("               2100, 2200, 2300, 2400, 2500,\n"
                        "               2600, 2700, 2800, 2900, 3000,\n"
                        "               3100, 3200, 3300, 3400, 3500];  // fixed + recursive_improve")
            
            if old_seeds in content:
                content = content.replace(old_seeds, new_seeds)
                print(f"  Modified eval: added 10 harder seeds")
            else:
                print(f"  Warning: could not find SEEDS array")
        
        open(eval_path, 'w').write(content)
    
    def record_iteration(self, strategy_name, eval_before, eval_after):
        """Record what we tried and whether it helped."""
        before_rate = eval_before['overall_win_rate']
        after_rate = eval_after['overall_win_rate']
        improvement = after_rate - before_rate
        
        self.history['iterations'].append({
            'timestamp': datetime.now().isoformat(),
            'strategy': strategy_name,
            'before_win_rate': before_rate,
            'after_win_rate': after_rate,
            'improvement': improvement,
        })
        
        # Update strategy score (exponential moving average)
        old_score = self.history['strategy_scores'].get(strategy_name, 0.0)
        new_score = 0.7 * old_score + 0.3 * improvement
        self.history['strategy_scores'][strategy_name] = new_score
        
        print(f"\n  Strategy '{strategy_name}': {before_rate:.1%} -> {after_rate:.1%} "
              f"({improvement:+.1%})")
        
        self.save_history()
    
    def run(self, eval_path, repo_root=Path('.')):
        print(f"=== Recursive Improve ===")
        print(f"Eval: {eval_path}")
        
        # 1. Analyze
        print("\n1. Analyzing eval results...")
        analysis = self.analyze_eval(eval_path)
        print(f"   Overall win rate: {analysis['overall_win_rate']:.1%}")
        print(f"   Weakest factions:")
        for faction, stats in analysis['weakest']:
            print(f"     {faction}: {stats['win_rate']:.1%} ({stats['wins']}/{stats['total']})")
        
        # 2. Choose strategy
        print("\n2. Choosing strategy...")
        strategy = self.choose_strategy(analysis)
        print(f"   Selected: {strategy['name']} (score: {strategy['score']:.3f})")
        print(f"   {strategy['description']}")
        
        # 3. Modify generator
        print("\n3. Modifying data generator...")
        self.modify_generator(strategy, analysis, repo_root)
        
        # 4. Modify eval
        print("\n4. Modifying eval set...")
        self.modify_eval(strategy, analysis, repo_root)
        
        # 5. Save history
        self.save_history()
        
        print("\n=== Done ===")
        print("Next steps:")
        print("  1. Run data generation: node --import tsx ml/desktop/generate_data.mts --count 5000")
        print("  2. Retrain on GPU: python ml/desktop/train_gpu.py --data ...")
        print("  3. Re-run eval and compare")
        print("  4. Run this script again with the new eval to continue the loop")
        print(f"\nHistory saved to {self.history_path}")

def main():
    p = argparse.ArgumentParser(description='Self-improving eval/data loop')
    p.add_argument('--eval', required=True, help='Path to eval results JSON')
    p.add_argument('--history', default=str(HISTORY_FILE), help='History file path')
    p.add_argument('--repo', default='.', help='Repo root path')
    args = p.parse_args()
    
    improver = RecursiveImprover(args.history)
    improver.run(args.eval, Path(args.repo))

if __name__ == '__main__':
    main()
