/**
 * Shared `<Header>` for every full-screen UI (Menu, Store, Faction
 * Select, etc.). Replaces 13 inline copies of the `.ui-header`
 * markup — one definition, one place to add / adjust header features.
 *
 * Contract:
 *   - `title` is required. Optional `titleStyle` / `titleClassName`
 *     let screens customise colour (win-in-teal, defeat-in-red,
 *     enemy-select-in-red, gauntlet-in-red, battle-pass-in-pass-
 *     purple) without bypassing the header structure.
 *   - `back` is optional. When provided, renders the `< Back` button
 *     on the left that calls it. Menu / GameOver screens omit it.
 *   - `rightContent` is optional. Inserted to the left of the always-
 *     rendered `<ProfileAvatar>`. Screens that want `<ShardBadge/>`,
 *     `<TutorialMenuButton/>`, or any other right-side element pass
 *     them here.
 *   - `wrap` flips the container to `flex-wrap: wrap` for
 *     EncyclopediaScreen, which needs tab buttons to overflow onto a
 *     second row on narrow viewports.
 *
 * The embedded `<ProfileAvatar>` is clickable on every screen and
 * navigates to the new `'settings'` screen. On web builds where
 * there's no signed-in profile the avatar shows an initials
 * placeholder ('?'); tapping still opens Settings.
 */
import { ComponentChildren } from 'preact';
import { UIBridge } from '../UIBridge';
import { ProfileAvatar } from './ProfileAvatar';

interface Props {
  title: string;
  titleStyle?: Record<string, string>;
  titleClassName?: string;
  back?: () => void;
  rightContent?: ComponentChildren;
  wrap?: boolean;
}

export function Header({
  title,
  titleStyle,
  titleClassName,
  back,
  rightContent,
  wrap,
}: Props) {
  const titleClasses = ['ui-header-title'];
  if (titleClassName) titleClasses.push(titleClassName);

  const containerStyle = wrap ? { flexWrap: 'wrap', gap: '6px' } : undefined;

  return (
    <div class="ui-header" style={containerStyle as Record<string, string> | undefined}>
      {back ? (
        <button class="ui-header-back" onClick={back}>{'< Back'}</button>
      ) : (
        // Invisible spacer when there's no back button — keeps the
        // title centred-ish via flex space-between without shifting
        // right when the back button is absent.
        <span style={{ minWidth: '1px' }} />
      )}
      <div class={titleClasses.join(' ')} style={titleStyle}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {rightContent}
        <ProfileAvatar onClickOverride={() => UIBridge.show('settings')} />
      </div>
    </div>
  );
}
