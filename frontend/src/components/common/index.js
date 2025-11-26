// Composants Button et LoadingSpinner
import React from 'react';

export const Button = ({ children, className, disabled, ...props }) => (
  <button
    className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

export const LoadingSpinner = ({ className }) => (
  <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
);
