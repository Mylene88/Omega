import React from 'react';
import './UserDisplay.css';

export default function UserDisplay({
  name,
  username,
  isActive = true,
  fallback = 'N/A',
  className = '',
  prefix = ''
}) {
  const displayName = name || username || fallback;

  if (!displayName) {
    return fallback;
  }

  return (
    <span className={`user-display ${className}`.trim()}>
      <span className="user-display__name">
        {prefix}
        {displayName}
      </span>
      {isActive === false && (
        <span
          className="user-display__badge"
          title="Cet utilisateur ne fait plus partie de la DDT"
        >
          Inactif
        </span>
      )}
    </span>
  );
}
