import React from 'react';
import { Match } from '../models/Match';
import { Position } from '../models/Position';

interface Props {
  match: Match;
  width: number;
  height: number;
}

const MatchVisualization: React.FC<Props> = ({ match, width, height }) => {
  // Convert field coordinates (-1 to 1) to screen coordinates
  const fieldToScreenX = (x: number) => (x + 1) * width / 2;
  const fieldToScreenY = (y: number) => (y + 1) * height / 2;

  return (
    <svg width={width} height={height}>
      {/* Draw field */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#2E7D32"  // Dark green for field
      />
      
      {/* Draw field lines */}
      <g stroke="white" strokeWidth="2" fill="none">
        {/* Center line */}
        <line x1={width/2} y1={0} x2={width/2} y2={height} />
        
        {/* Center circle */}
        <circle cx={width/2} cy={height/2} r={height/10} />
        
        {/* Left penalty area */}
        <rect x={0} y={height/4} width={width/6} height={height/2} />
        
        {/* Right penalty area */}
        <rect x={width*5/6} y={height/4} width={width/6} height={height/2} />
        
        {/* Field outline */}
        <rect x={0} y={0} width={width} height={height} />
      </g>

      {/* Draw potential actions */}
      {match.currentPotentialActions.map((action, index) => {
        const fromX = fieldToScreenX(action.from.x);
        const fromY = fieldToScreenY(action.from.y);
        const toX = fieldToScreenX(action.to.x);
        const toY = fieldToScreenY(action.to.y);
        
        // Calculate line opacity based on action score
        const opacity = 0.3 + action.score * 0.7;
        
        return (
          <g key={`action-${index}`}>
            {/* Draw dashed line for the action */}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={action.color}
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={opacity}
            />
            {/* Draw arrow head */}
            <circle
              cx={toX}
              cy={toY}
              r={3}
              fill={action.color}
              opacity={opacity}
            />
          </g>
        );
      })}

      {/* Draw ball */}
      <circle
        cx={fieldToScreenX(match.ball.position.x)}
        cy={fieldToScreenY(match.ball.position.y)}
        r={5}
        fill="white"
      />

      {/* Draw players */}
      {match.homeTeam.players.map(player => (
        <g key={player.id}>
          <circle
            cx={fieldToScreenX(player.currentPosition.x)}
            cy={fieldToScreenY(player.currentPosition.y)}
            r={10}
            fill={player.color}
            stroke={player.hasBall ? "white" : "none"}
            strokeWidth={2}
          />
          <text
            x={fieldToScreenX(player.currentPosition.x)}
            y={fieldToScreenY(player.currentPosition.y)}
            textAnchor="middle"
            dy=".3em"
            fill="white"
            fontSize="12px"
          >
            {player.number}
          </text>
        </g>
      ))}
      
      {match.awayTeam.players.map(player => (
        <g key={player.id}>
          <circle
            cx={fieldToScreenX(player.currentPosition.x)}
            cy={fieldToScreenY(player.currentPosition.y)}
            r={10}
            fill={player.color}
            stroke={player.hasBall ? "white" : "none"}
            strokeWidth={2}
          />
          <text
            x={fieldToScreenX(player.currentPosition.x)}
            y={fieldToScreenY(player.currentPosition.y)}
            textAnchor="middle"
            dy=".3em"
            fill="white"
            fontSize="12px"
          >
            {player.number}
          </text>
        </g>
      ))}
    </svg>
  );
};

export default MatchVisualization; 