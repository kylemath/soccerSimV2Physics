import { Position } from '../models/Position';
import { PlayerSimulation } from './PlayerSimulation';
import { Player } from '../models/Player';

export class MovementController {
  private player: Player;
  private simulation: PlayerSimulation;
  
  // Zero out most weights for testing
  private formationWeight: number = 1.0;  // Only use formation influence for now
  private ballWeight: number = 0.0;       // Disable ball influence
  private readonly CHASE_THRESHOLD: number = 0.4;
  
  // Logging (in-memory for browser compatibility)
  private logEntries: string[] = [];
  private logInterval: number = 10; // Log every 10 frames
  private frameCount: number = 0;
  
  constructor(player: Player, simulation: PlayerSimulation) {
    this.player = player;
    this.simulation = simulation;
    
    // Initialize log with header
    this.log('timestamp,currentX,currentY,targetX,targetY,formationX,formationY,ballX,ballY\n');
  }
  
  private log(message: string) {
    this.logEntries.push(message);
    // Keep only last 1000 entries to prevent memory issues
    if (this.logEntries.length > 1000) {
      this.logEntries.shift();
    }
  }
  
  /**
   * Get log entries (for debugging)
   */
  getLogs(): string[] {
    return [...this.logEntries];
  }
  
  /**
   * Download logs as CSV (browser-compatible)
   */
  downloadLogs(): void {
    const csvContent = this.logEntries.join('');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player_${this.player.id}_movement.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  update(deltaTime: number, ballPosition: Position): void {
    // Calculate influences
    const formationInfluence = this.calculateFormationInfluence();
    const ballInfluence = this.calculateBallInfluence(ballPosition);
    
    // Calculate final target (simplified to mostly formation for now)
    const targetPosition = formationInfluence.multiply(this.formationWeight)
      .add(ballInfluence.multiply(this.ballWeight));
    
    // Log positions periodically
    this.frameCount++;
    if (this.frameCount % this.logInterval === 0) {
      this.log(`${Date.now()},${
        this.player.currentPosition.x.toFixed(3)},${this.player.currentPosition.y.toFixed(3)},${
        targetPosition.x.toFixed(3)},${targetPosition.y.toFixed(3)},${
        this.player.formationPosition.x.toFixed(3)},${this.player.formationPosition.y.toFixed(3)},${
        ballPosition.x.toFixed(3)},${ballPosition.y.toFixed(3)}\n`
      );
      
      // Debug log when player crosses or approaches center line
      if (Math.abs(this.player.currentPosition.x) < 0.1) {
        console.log(`Player ${this.player.id} near center line:`, {
          currentPos: this.player.currentPosition,
          targetPos: targetPosition,
          formationPos: this.player.formationPosition
        });
      }
    }
    
    // Apply movement (reduced strength)
    const movementStrength = 0.7;
    this.simulation.moveTo(targetPosition, movementStrength);
    
    // Update visual position
    this.updatePlayerPosition(deltaTime);
  }
  
  private calculateFormationInfluence(): Position {
    const currentPos = this.player.currentPosition;
    const targetPos = this.player.targetPosition;
    
    // Log when target position changes significantly
    const targetDiff = targetPos.distanceTo(currentPos);
    if (targetDiff > 0.2) {
      console.log(`Large target position change for player ${this.player.id}:`, {
        currentPos,
        targetPos,
        diff: targetDiff
      });
    }
    
    // Simplified to just return target position for now
    return targetPos.clone();
  }
  
  private calculateBallInfluence(ballPosition: Position): Position {
    // Simplified to just return current position (since weight is 0)
    return this.player.currentPosition.clone();
  }
  
  private updatePlayerPosition(deltaTime: number): void {
    const diff = this.simulation.position.subtract(this.player.currentPosition);
    const halflife = 0.15;
    const adjustmentFactor = 1.0 - Math.exp(-deltaTime * (0.69314718056 / halflife));
    
    // Log large position adjustments
    if (diff.length() > 0.1) {
      console.log(`Large position adjustment for player ${this.player.id}:`, {
        from: this.player.currentPosition,
        to: this.simulation.position,
        adjustment: diff
      });
    }
    
    const adjustment = diff.multiply(adjustmentFactor);
    this.player.currentPosition = this.player.currentPosition.add(adjustment);
  }
  
  setWeights(formationWeight: number, ballWeight: number): void {
    this.formationWeight = formationWeight;
    this.ballWeight = ballWeight;
    console.log(`Weights updated for player ${this.player.id}:`, {
      formationWeight,
      ballWeight
    });
  }
} 