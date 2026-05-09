import { useEffect, useState } from 'preact/hooks';

/** True when the viewport's aspect ratio is portrait (height > width).
 *  Used by every full-bleed art consumer to swap between landscape and
 *  portrait splash crops. Same media query was previously inlined in
 *  LoadingScreen and AnnouncementModal. */
export function useIsPortraitViewport(): boolean {
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-aspect-ratio: 1/1)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-aspect-ratio: 1/1)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return portrait;
}
