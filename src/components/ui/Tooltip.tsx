import type { ReactNode } from 'react';
import './Tooltip.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** The content to show in the tooltip */
  content: string;
  /** Position of the tooltip relative to children */
  position?: TooltipPosition;
  /** The trigger element(s) */
  children: ReactNode;
  /** Optional className for the wrapper */
  className?: string;
}

export function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
}: TooltipProps) {
  return (
    <div
      className={`tooltip-wrapper tooltip-wrapper--${position} ${className}`}
      data-tooltip={content}
    >
      {children}
    </div>
  );
}

interface TooltipIconProps {
  /** The content to show in the tooltip */
  content: string;
  /** Position of the tooltip relative to icon */
  position?: TooltipPosition;
  /** Optional className */
  className?: string;
}

/**
 * A small "?" icon with a tooltip - useful for inline help
 */
export function TooltipIcon({
  content,
  position = 'top',
  className = '',
}: TooltipIconProps) {
  return (
    <Tooltip content={content} position={position} className={className}>
      <span className="tooltip-icon">?</span>
    </Tooltip>
  );
}
