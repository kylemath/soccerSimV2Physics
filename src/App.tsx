import React from 'react';
import SimulationPage from './components/SimulationPage';

/**
 * Main App component
 */
const App: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
    }}>
      <SimulationPage />

      <style>
        {`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.5;
            color: #ffffff;
            background-color: #121212;
          }
          
          button {
            font-family: inherit;
          }

          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
          }

          input[type="range"]::-webkit-slider-runnable-track {
            background: #333;
            height: 6px;
            border-radius: 3px;
          }

          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            margin-top: -4px;
            background-color: #4CAF50;
            height: 14px;
            width: 14px;
            border-radius: 50%;
          }

          input[type="range"]:focus {
            outline: none;
          }

          input[type="range"]:focus::-webkit-slider-thumb {
            background-color: #45a049;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
          }
        `}
      </style>
    </div>
  );
};

export default App; 