import type { User } from '../types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  user,
  size = 'md',
}: {
  user: Pick<User, 'name' | 'imageUrl'>;
  size?: 'md' | 'lg';
}) {
  return (
    <div className={`avatar ${size === 'lg' ? 'lg' : ''}`} aria-hidden={!user.imageUrl}>
      {user.imageUrl ? (
        <img src={user.imageUrl} alt="" />
      ) : (
        <span>{initials(user.name)}</span>
      )}
    </div>
  );
}
