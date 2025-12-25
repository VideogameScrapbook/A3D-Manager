import './ProgressBar.css';

export interface TransferDetails {
  bytesWritten: string;
  totalBytes: string;
  speed?: string;
  eta?: string;
}

export interface ProgressBarProps {
  /** Progress percentage (0-100). If undefined, shows indeterminate animation. */
  progress?: number;
  /** Whether to show the percentage value (e.g., "17%") */
  showPercentage?: boolean;
  /** Optional label shown on the right (e.g., "labels.db") */
  label?: string;
  /** Optional transfer details (bytes, speed, ETA) */
  transferDetails?: TransferDetails;
  /** Additional class name for the container */
  className?: string;
}

export function ProgressBar({
  progress,
  showPercentage = false,
  label,
  transferDetails,
  className = '',
}: ProgressBarProps) {
  const isIndeterminate = progress === undefined;
  const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, progress));
  const hasMetadata = showPercentage || label;
  const hasTransferDetails = transferDetails && transferDetails.bytesWritten;

  return (
    <div className={`progress-bar-container ${className}`.trim()}>
      {/* The bar */}
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''}`}
          style={!isIndeterminate ? { width: `${percentage}%` } : undefined}
        />
      </div>

      {/* Percentage and label row */}
      {hasMetadata && (
        <div className="progress-bar-meta">
          {showPercentage && (
            <span className="progress-bar-percentage text-pixel text-accent">
              {percentage}%
            </span>
          )}
          {label && (
            <span className="progress-bar-label text-mono-small text-muted">
              {label}
            </span>
          )}
        </div>
      )}

      {/* Transfer details row */}
      {hasTransferDetails && (
        <div className="progress-bar-details">
          <span className="progress-bar-bytes text-mono-small">
            {transferDetails.bytesWritten} / {transferDetails.totalBytes}
          </span>
          {transferDetails.speed && (
            <>
              <span className="progress-bar-separator">•</span>
              <span className="progress-bar-speed text-mono-small text-accent">
                {transferDetails.speed}
              </span>
            </>
          )}
          {transferDetails.eta && transferDetails.eta !== '0ms' && (
            <>
              <span className="progress-bar-separator">•</span>
              <span className="progress-bar-eta">~{transferDetails.eta} remaining</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
