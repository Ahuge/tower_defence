import { ShardWallet, BattlePass } from '../../systems/monetization';

export function ShardBadge() {
  return (
    <div>
      <div class="shard-badge">
        <span class="shard-icon" />
        {ShardWallet.getBalance().toLocaleString()}
      </div>
      <div class="pass-level">Lv.{BattlePass.getLevel()}</div>
    </div>
  );
}
