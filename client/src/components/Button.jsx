import React from 'react';

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  isFullWidth = false,
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    isFullWidth ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
