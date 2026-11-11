export function shouldShowInstallBanner({ installed, standalone, native, dismissedAt, now }: {
  installed: boolean;
  standalone: boolean;
  native: boolean;
  dismissedAt: number;
  now: number;
}) {
  if (installed || standalone || native) return false;
  if (dismissedAt > 0 && new Date(dismissedAt).toDateString() === new Date(now).toDateString()) return false;
  return true;
}