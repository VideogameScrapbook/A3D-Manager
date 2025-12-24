import './controls.css';

interface OptionSelectorProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function OptionSelector({ label, options, value, onChange }: OptionSelectorProps) {
  const currentIndex = options.indexOf(value);
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < options.length - 1;

  const handleLeft = () => {
    if (canGoLeft) {
      onChange(options[currentIndex - 1]);
    }
  };

  const handleRight = () => {
    if (canGoRight) {
      onChange(options[currentIndex + 1]);
    }
  };

  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="option-selector">
        <button
          className={`arrow-btn ${!canGoLeft ? 'disabled' : ''}`}
          onClick={handleLeft}
          disabled={!canGoLeft}
          aria-label="Previous option"
        >
          <img src="/pixel-arrow-left.png" alt="" className="arrow-icon" />
        </button>
        <span className="option-value">{value}</span>
        <button
          className={`arrow-btn ${!canGoRight ? 'disabled' : ''}`}
          onClick={handleRight}
          disabled={!canGoRight}
          aria-label="Next option"
        >
          <img src="/pixel-arrow-right.png" alt="" className="arrow-icon" />
        </button>
      </div>
    </div>
  );
}
