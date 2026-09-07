import React from 'react';

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
      <div className="spinner" aria-hidden="true" />
      {text && (
        <p className="text-muted text-sm" style={{ marginTop: '1rem' }}>
          {text}
        </p>
      )}
    </div>
  );
}
