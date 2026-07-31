import { useEffect, useState } from 'react';
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user.imageUrl]);

  const showImage = Boolean(user.imageUrl) && !failed;

  return (
    <div className={`avatar ${size === 'lg' ? 'lg' : ''}`} aria-hidden={!showImage}>
      {showImage ? (
        <img
          src={user.imageUrl!}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(user.name)}</span>
      )}
    </div>
  );
}
