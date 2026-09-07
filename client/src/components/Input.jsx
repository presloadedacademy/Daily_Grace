import React from 'react';

export function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  autoComplete,
  className = '',
  ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          <span>
            {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
          </span>
        </label>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`form-input ${error ? 'has-error' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={`${id}-helper`} className="form-helper">
          {helperText}
        </span>
      )}
    </div>
  );
}
