import './ConnectionIndicator.css';

interface ConnectionIndicatorProps {
  connected: boolean;
  className?: string;
}

export function ConnectionIndicator({ connected, className = '' }: ConnectionIndicatorProps) {
  return (
    <span
      className={`connection-indicator ${connected ? 'connected' : 'disconnected'} ${className}`}
      aria-label={connected ? 'Connected' : 'Disconnected'}
    />
  );
}
