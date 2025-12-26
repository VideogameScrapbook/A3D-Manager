import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** The content to show in the tooltip */
  content: string;
  /** Preferred position of the tooltip relative to children */
  position?: TooltipPosition;
  /** The trigger element(s) */
  children: ReactNode;
  /** Optional className for the wrapper */
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  actualPosition: TooltipPosition;
}

const TOOLTIP_OFFSET = 8;
const VIEWPORT_PADDING = 12;

export function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Try positions in order of preference
    const positions: TooltipPosition[] = [position];
    if (position === 'top') positions.push('bottom', 'left', 'right');
    else if (position === 'bottom') positions.push('top', 'left', 'right');
    else if (position === 'left') positions.push('right', 'top', 'bottom');
    else if (position === 'right') positions.push('left', 'top', 'bottom');

    for (const pos of positions) {
      let top = 0;
      let left = 0;

      switch (pos) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + TOOLTIP_OFFSET;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + TOOLTIP_OFFSET;
          break;
      }

      // Check if tooltip fits in viewport with this position
      const fitsTop = top >= VIEWPORT_PADDING;
      const fitsBottom = top + tooltipRect.height <= viewportHeight - VIEWPORT_PADDING;
      const fitsLeft = left >= VIEWPORT_PADDING;
      const fitsRight = left + tooltipRect.width <= viewportWidth - VIEWPORT_PADDING;

      if (fitsTop && fitsBottom && fitsLeft && fitsRight) {
        setCoords({ top, left, actualPosition: pos });
        return;
      }
    }

    // Fallback: use preferred position but clamp to viewport
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + TOOLTIP_OFFSET;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + TOOLTIP_OFFSET;
        break;
    }

    // Clamp to viewport
    left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - tooltipRect.width - VIEWPORT_PADDING));
    top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - tooltipRect.height - VIEWPORT_PADDING));

    setCoords({ top, left, actualPosition: position });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure tooltip is rendered before measuring
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [isVisible, calculatePosition]);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => {
    setIsVisible(false);
    setCoords(null);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`tooltip-trigger ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`tooltip-content tooltip-content--${coords?.actualPosition || position}`}
            style={
              coords
                ? { top: coords.top, left: coords.left, opacity: 1 }
                : { opacity: 0, pointerEvents: 'none' }
            }
          >
            {content}
          </div>,
          document.body
        )}
    </>
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
