import { useState } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { ShardWallet, BattlePass, StorePersistence, BATTLE_PASS_SHARD_COST, BP_MAX_LEVEL, PREMIUM_PERKS } from '../../systems/monetization';
import { PassReward, PerkId } from '../../systems/monetization/BattlePass';

export function BattlePassScreen() {
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);
  const season = BattlePass.getCurrentSeason();
  const level = BattlePass.getLevel();
  const progress = BattlePass.getLevelProgress();
  const isPremium = BattlePass.isPremium();

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title text-pass">BATTLE PASS</div>
        <ShardBadge />
      </div>
      <div class="ui-section" style={{ textAlign: 'center' }}>
        <div class="text-dim text-sm">{season?.name ?? 'No Active Season'}</div>
        <div style={{ fontSize: '24px', color: '#fff', margin: '8px 0 4px' }}>Level {level}</div>
        <div class="progress-bar" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div class="progress-fill" style={{ width: level >= BP_MAX_LEVEL ? '100%' : `${(progress.current / progress.required) * 100}%` }} />
          <div class="progress-text">{level >= BP_MAX_LEVEL ? 'MAX LEVEL' : `${progress.current} / ${progress.required} XP`}</div>
        </div>
        <div class="mt-2">
          {isPremium
            ? <div class="text-green" style={{ fontSize: '13px', fontWeight: 'bold' }}>PREMIUM PASS ACTIVE</div>
            : <button class={`btn btn-primary btn-large mt-2 ${!ShardWallet.canAfford(BATTLE_PASS_SHARD_COST) ? 'btn-disabled' : ''}`}
                onClick={() => { if (BattlePass.purchasePremium()) rerender(); }}>Upgrade to Premium — {BATTLE_PASS_SHARD_COST} Shards</button>}
        </div>
        {isPremium && <div class="text-sm mt-2" style={{ color: '#88cc88' }}>
          {Object.entries(PREMIUM_PERKS).filter(([id]) => BattlePass.hasPerk(id as PerkId)).map(([, p]) => p.label).join(' · ') || 'Keep leveling to unlock perks!'}
        </div>}
      </div>
      <div class="ui-section"><div class="ui-section-title">Free Track</div><RewardTrack rewards={season?.freeTrack ?? []} isPremTrack={false} level={level} rerender={rerender} /></div>
      <div class="ui-section"><div class="ui-section-title" style={{ color: 'var(--accent-pass)' }}>Premium Track</div><RewardTrack rewards={season?.premiumTrack ?? []} isPremTrack={true} level={level} rerender={rerender} /></div>
      <div class="ui-section"><ChallengeSection /></div>
    </>
  );
}

function RewardTrack({ rewards, isPremTrack, level, rerender }: { rewards: PassReward[]; isPremTrack: boolean; level: number; rerender: () => void }) {
  if (!rewards.length) return <div class="text-dim text-sm">No active season</div>;
  const state = StorePersistence.load();
  const claimed = new Set(isPremTrack ? state.claimedPremiumRewards : state.claimedFreeRewards);
  const passOwned = BattlePass.isPremium();
  return (
    <div class="reward-track">
      {rewards.map(r => {
        const reached = level >= r.level;
        const isClaimed = claimed.has(r.level);
        const canClaim = reached && !isClaimed && (!isPremTrack || passOwned);
        return (
          <div key={r.level} class={`reward-node ${reached ? 'reached' : ''} ${isClaimed ? 'claimed' : ''}`}>
            <div class="reward-level">Lv.{r.level}</div>
            <div class="reward-label">{r.label}</div>
            <div class="reward-action">
              {isClaimed ? <span class="text-green text-xs">Claimed</span>
              : canClaim ? <button class="btn btn-gold" style={{ fontSize: '9px', padding: '2px 6px' }} onClick={() => { isPremTrack ? BattlePass.claimPremiumReward(r.level) : BattlePass.claimFreeReward(r.level); rerender(); }}>Claim</button>
              : isPremTrack && !passOwned ? <span class="text-pass text-xs">Premium</span>
              : !reached ? <span class="text-dim text-xs">Lv.{r.level}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeSection() {
  const dailies = BattlePass.getDailyChallenges();
  const weeklies = BattlePass.getWeeklyChallenges();
  const renderList = (list: typeof dailies) => list.map(ch => {
    const t = BattlePass.getChallengeTemplate(ch.challengeId);
    return (
      <div key={ch.challengeId} class={`challenge-row ${ch.completed ? 'completed' : ''}`}>
        <div class="challenge-desc">{t?.description ?? ch.challengeId}</div>
        <div class="challenge-progress">{ch.completed ? 'DONE' : `${ch.current}/${ch.target}`}</div>
        <div class="challenge-xp">+{t?.xpReward ?? 0} XP</div>
      </div>
    );
  });
  return (
    <>
      <div class="ui-section-title">Challenges</div>
      <div class="text-dim text-sm mb-2">Daily</div>
      {renderList(dailies)}
      <div class="text-dim text-sm mb-2 mt-4">Weekly</div>
      {renderList(weeklies)}
    </>
  );
}
