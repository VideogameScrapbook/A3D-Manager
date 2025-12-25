import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: 'ghost' | 'subtle';
  /** Size of the button */
  size?: 'sm' | 'md';
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`icon-button icon-button--${variant} icon-button--${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
