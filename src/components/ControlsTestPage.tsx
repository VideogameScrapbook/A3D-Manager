import { useState } from 'react';
import { OptionSelector, ToggleSwitch } from './controls';
import './ControlsTestPage.css';

export function ControlsTestPage() {
  // Option Selector states
  const [displayMode, setDisplayMode] = useState('BVM');
  const [colorProfile, setColorProfile] = useState('Professional');
  const [colorMode, setColorMode] = useState('Professional');
  const [bitColor, setBitColor] = useState('Auto');

  // Toggle states
  const [deBlur, setDeBlur] = useState(true);
  const [disableTextureFiltering, setDisableTextureFiltering] = useState(false);
  const [disableAntialiasing, setDisableAntialiasing] = useState(false);

  const displayModeOptions = ['CRT', 'BVM', 'LCD', 'OLED'];
  const colorProfileOptions = ['Standard', 'Professional', 'Vivid', 'Natural'];
  const bitColorOptions = ['Off', 'Auto', 'On'];

  return (
    <div className="controls-test-page">
      <div className="page-header">
        <h2>Controls Test</h2>
      </div>

      {/* Display Settings Section */}
      <section className="settings-section">
        <h2 className="settings-section-header">Display Settings</h2>

        <OptionSelector
          label="Display Mode"
          options={displayModeOptions}
          value={displayMode}
          onChange={setDisplayMode}
        />

        <OptionSelector
          label="Color Profile"
          options={colorProfileOptions}
          value={colorProfile}
          onChange={setColorProfile}
        />

        <OptionSelector
          label="Color Mode"
          options={colorProfileOptions}
          value={colorMode}
          onChange={setColorMode}
        />
      </section>

      {/* Advanced Video Processing Section */}
      <section className="settings-section">
        <h2 className="settings-section-header">Advanced Video Processing</h2>

        <ToggleSwitch
          label="De-Blur"
          checked={deBlur}
          onChange={setDeBlur}
        />

        <OptionSelector
          label="32bit Color"
          options={bitColorOptions}
          value={bitColor}
          onChange={setBitColor}
        />

        <ToggleSwitch
          label="Disable Texture Filtering"
          checked={disableTextureFiltering}
          onChange={setDisableTextureFiltering}
        />

        <ToggleSwitch
          label="Disable Antialiasing"
          checked={disableAntialiasing}
          onChange={setDisableAntialiasing}
        />
      </section>

      {/* Current State Debug */}
      <section className="settings-section debug-section">
        <h2 className="settings-section-header">Current State</h2>
        <pre className="debug-output">
{JSON.stringify({
  displayMode,
  colorProfile,
  colorMode,
  bitColor,
  deBlur,
  disableTextureFiltering,
  disableAntialiasing,
}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
