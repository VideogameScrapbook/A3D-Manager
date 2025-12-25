import { useSDCard } from '../App';
import { ConnectionIndicator } from './ConnectionIndicator';
import './SDCardSelector.css';

export function SDCardSelector() {
  const { selectedSDCard } = useSDCard();
  const isConnected = selectedSDCard !== null;

  return (
    <div className="sd-card-status">
      <span className="sd-card-label text-pixel">
        {isConnected ? 'SD Card Connected' : 'SD Card Disconnected'}
      </span>
      <ConnectionIndicator connected={isConnected} />
    </div>
  );
}
