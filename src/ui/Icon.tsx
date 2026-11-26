import { ICONS, type IconName } from './assets';

export function Icon({ name, small = false, className = '' }: { name: IconName; small?: boolean; className?: string }) {
  return (
    <span
      className={`${small ? 'sw-icon-sm' : 'sw-icon'} ${className}`.trim()}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }}
    />
  );
}
