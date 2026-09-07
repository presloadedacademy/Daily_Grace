import React from 'react';

export function Alert({ type = 'info', message, children, className = '' }) {
  if (!message && !children) return null;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <div>{message || children}</div>
    </div>
  );
}
