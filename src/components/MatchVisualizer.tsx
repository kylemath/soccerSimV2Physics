import React, { useRef, useEffect, useCallback } from 'react';
import { Match } from '../models/Match';
import { Player } from '../models/Player';
import { Ball } from '../models/Ball';

interface MatchVisualizerProps {
  match: Match | null;
  width?: number;
  height?: number;
}

const MatchVisualizer: React.FC<MatchVisualizerProps> = ({
  match,
  width = 1000,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Convert normalized position (-1 to 1) to canvas coordinates
  const toCanvasX = useCallback((x: number): number => (x + 1) * width / 2, [width]);
  const toCanvasY = useCallback((y: number): number => (y + 1) * height / 2, [height]);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, player: Player) => {
    const x = toCanvasX(player.currentPosition.x);
    const y = toCanvasY(player.currentPosition.y);
    const radius = 10;

    // Draw player shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Draw player circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw player number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number.toString(), x, y);

    // Draw possession indicator
    if (player.hasBall) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw designated controller indicator
    if (player.isDesignatedController) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw direction indicator
      if (player.velocity.length() > 0.001) {
        const angle = Math.atan2(player.velocity.y, player.velocity.x);
        const indicatorLength = radius + 15;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x + Math.cos(angle) * indicatorLength,
          y + Math.sin(angle) * indicatorLength
        );
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [toCanvasX, toCanvasY]);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: Ball) => {
    const x = toCanvasX(ball.position.x);
    const y = toCanvasY(ball.position.y);
    const radius = 6;

    // Draw ball shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Draw ball
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw ball pattern
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y + radius);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Draw ball rotation effect
    if (ball.velocity.length() > 0.001) {
      const rotationAngle = Math.atan2(ball.velocity.y, ball.velocity.x);
      const spinRadius = radius * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, spinRadius, rotationAngle - Math.PI/4, rotationAngle + Math.PI/4);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [toCanvasX, toCanvasY]);

  const drawField = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw field background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2c8c2c');
    gradient.addColorStop(1, '#1f7a1f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add field texture
    ctx.strokeStyle = '#2a852a';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Set line style for field markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Draw field outline
    ctx.strokeRect(0, 0, width, height);

    // Draw halfway line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    const centerRadius = Math.min(width, height) * 0.15;
    ctx.arc(width / 2, height / 2, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw center spot
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Draw penalty boxes (18-yard box)
    const penaltyBoxWidth = width * 0.2;
    const penaltyBoxHeight = height * 0.6;
    // Left penalty box
    ctx.strokeRect(0, height / 2 - penaltyBoxHeight / 2, penaltyBoxWidth, penaltyBoxHeight);
    // Right penalty box
    ctx.strokeRect(width - penaltyBoxWidth, height / 2 - penaltyBoxHeight / 2, penaltyBoxWidth, penaltyBoxHeight);

    // Draw goal boxes (6-yard box)
    const goalBoxWidth = width * 0.08;
    const goalBoxHeight = height * 0.3;
    // Left goal box
    ctx.strokeRect(0, height / 2 - goalBoxHeight / 2, goalBoxWidth, goalBoxHeight);
    // Right goal box
    ctx.strokeRect(width - goalBoxWidth, height / 2 - goalBoxHeight / 2, goalBoxWidth, goalBoxHeight);

    // Draw penalty spots
    ctx.beginPath();
    ctx.arc(penaltyBoxWidth * 0.8, height / 2, 3, 0, Math.PI * 2);
    ctx.arc(width - penaltyBoxWidth * 0.8, height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw penalty arcs
    const penaltyArcRadius = centerRadius;
    ctx.beginPath();
    ctx.arc(penaltyBoxWidth * 0.8, height / 2, penaltyArcRadius, -0.3 * Math.PI, 0.3 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width - penaltyBoxWidth * 0.8, height / 2, penaltyArcRadius, 0.7 * Math.PI, 1.3 * Math.PI);
    ctx.stroke();

    // Draw goals
    const goalWidth = width * 0.02;
    const goalHeight = height * 0.2;
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 3;
    // Left goal
    ctx.strokeRect(-goalWidth, height / 2 - goalHeight / 2, goalWidth, goalHeight);
    // Right goal
    ctx.strokeRect(width, height / 2 - goalHeight / 2, goalWidth, goalHeight);

    // Draw corner arcs
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const cornerRadius = 20;
    // Top left
    ctx.beginPath();
    ctx.arc(0, 0, cornerRadius, 0, Math.PI / 2);
    ctx.stroke();
    // Top right
    ctx.beginPath();
    ctx.arc(width, 0, cornerRadius, Math.PI / 2, Math.PI);
    ctx.stroke();
    // Bottom left
    ctx.beginPath();
    ctx.arc(0, height, cornerRadius, -Math.PI / 2, 0);
    ctx.stroke();
    // Bottom right
    ctx.beginPath();
    ctx.arc(width, height, cornerRadius, Math.PI, -Math.PI / 2);
    ctx.stroke();
  }, [width, height]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !match) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawField(ctx);

    // Draw players
    match.homeTeam.players.forEach((player) => drawPlayer(ctx, player));
    match.awayTeam.players.forEach((player) => drawPlayer(ctx, player));

    // Draw ball
    drawBall(ctx, match.ball);

    animationFrameRef.current = requestAnimationFrame(render);
  }, [match, drawField, drawPlayer, drawBall]);

  useEffect(() => {
    render();
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '2px solid #333',
          borderRadius: '5px',
          backgroundColor: '#2c8c2c',
        }}
      />
    </div>
  );
};

export default MatchVisualizer; 