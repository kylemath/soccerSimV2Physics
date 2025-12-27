import React from 'react';

interface MatchControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onReset?: () => void;
}

/**
 * Component for controlling a match simulation
 */
const MatchControls: React.FC<MatchControlsProps> = ({
  isPlaying,
  isPaused,
  simulationSpeed,
  onPlayPause,
  onStop,
  onSpeedChange,
  onReset
}) => {
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    onSpeedChange(speed);
  };

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e27c4a',
  };

  const inactiveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#666',
    cursor: 'not-allowed',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
      }}>
        <button
          onClick={onPlayPause}
          style={isPlaying && !isPaused ? activeButtonStyle : inactiveButtonStyle}
        >
          {isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Start'}
        </button>

        <button
          onClick={onStop}
          disabled={!isPlaying}
          style={!isPlaying ? disabledButtonStyle : inactiveButtonStyle}
        >
          Stop
        </button>

        {onReset && (
          <button
            onClick={onReset}
            style={inactiveButtonStyle}
          >
            Reset
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
      }}>
        <label
          htmlFor="speed-slider"
          style={{
            color: '#ffffff',
            fontSize: '14px',
            textAlign: 'center' as const,
          }}
        >
          Simulation Speed: {simulationSpeed}x
        </label>
        <input
          id="speed-slider"
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={simulationSpeed}
          onChange={handleSpeedChange}
          style={{
            width: '100%',
            accentColor: '#4CAF50',
          }}
        />
      </div>
    </div>
  );
};

export default MatchControls; 