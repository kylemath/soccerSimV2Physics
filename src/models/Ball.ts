import { Position } from './Position';
import { BallSimulation } from '../physics/BallSimulation';

/**
 * Represents the ball in the soccer simulation with physics properties
 */
export class Ball {
  // Current state
  position: Position;
  velocity: Position;
  
  // Rotation (for swerve)
  rotation: Position;
  
  // Physical properties
  radius: number;
  mass: number;
  
  // Physics constants
  airResistance: number;
  rollingResistance: number;
  bounceFactor: number;
  
  // Control info
  isControlled: boolean;
  controllingPlayerId: string | null;
  
  // Future position prediction cache
  private futurePositions: Position[];
  private futureVelocities: Position[];
  private lastPredictionTime: number;
  
  // Physics simulation
  simulation: BallSimulation;
  
  private friction: number = 0.98;
  private bounceDamping: number = 0.8;
  
  /**
   * Create a new ball
   */
  constructor(initialPosition: Position = new Position(0, 0)) {
    // Initialize at specified position or center field
    this.position = initialPosition.clone();
    this.velocity = new Position(0, 0);
    this.rotation = new Position(0, 0);
    
    // Physical properties
    this.radius = 0.02; // Relative to field size
    this.mass = 0.45;   // kg (standard soccer ball)
    
    // Physics constants
    this.airResistance = 0.03;
    this.rollingResistance = 0.06;
    this.bounceFactor = 0.7;
    
    // Control info
    this.isControlled = false;
    this.controllingPlayerId = null;
    
    // Initialize prediction cache
    this.futurePositions = [];
    this.futureVelocities = [];
    this.lastPredictionTime = 0;
    
    // Initialize physics simulation
    this.simulation = new BallSimulation(this.position.clone());
  }
  
  /**
   * Update ball physics
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Skip if ball is being controlled by a player
    if (this.isControlled) {
      return;
    }
    
    // Update simulation
    this.simulation.updatePhysics(deltaTime);
    
    // Update visual position with gentle smoothing
    const diff = this.simulation.position.subtract(this.position);
    const halflife = 0.05; // Faster smoothing for ball
    const adjustmentFactor = 1.0 - Math.exp(-deltaTime * (0.69314718056 / halflife));
    
    // Apply adjustment
    const adjustment = diff.multiply(adjustmentFactor);
    this.position = this.position.add(adjustment);
    
    // Update velocity from simulation
    this.velocity = this.simulation.velocity.clone();
    
    // Decay rotation over time
    this.rotation = this.rotation.multiply(0.95);
    
    // Clear prediction cache since we've moved
    this.clearPredictionCache();
  }
  
  /**
   * Handle collisions with field boundaries
   */
  private handleBoundaryCollisions(): void {
    // Field boundary (-1 to 1 in both axes)
    const boundsX = 1 - this.radius;
    const boundsY = 1 - this.radius;
    
    // Check if the ball hit a boundary and bounce
    let hitBoundary = false;
    
    if (Math.abs(this.position.x) > boundsX) {
      this.position.x = Math.sign(this.position.x) * boundsX;
      this.velocity.x *= -this.bounceDamping;
      hitBoundary = true;
    }
    
    if (Math.abs(this.position.y) > boundsY) {
      this.position.y = Math.sign(this.position.y) * boundsY;
      this.velocity.y *= -this.bounceDamping;
      hitBoundary = true;
    }
    
    // Add some random rotation on bounce
    if (hitBoundary) {
      this.rotation = new Position(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
    }
  }
  
  /**
   * Apply a force to the ball
   * @param force The force vector to apply
   */
  applyForce(force: Position): void {
    // F = ma, so a = F/m
    const acceleration = force.multiply(1 / this.mass);
    
    // v = v + at
    this.velocity = this.velocity.add(acceleration);
    
    // Clear prediction cache since we've changed velocity
    this.clearPredictionCache();
  }
  
  /**
   * Kick the ball in a direction with a specific power
   * @param direction Direction to kick
   * @param power Power of the kick (0-1)
   * @param spin Amount of spin/swerve to apply (-1 to 1 for both axes)
   */
  kick(direction: Position, power: number, spin: Position = new Position(0, 0)): void {
    // Ball is no longer controlled after being kicked
    this.isControlled = false;
    this.controllingPlayerId = null;
    
    // Apply kick to simulation
    this.simulation.kick(direction, power);
    
    // Apply spin
    this.rotation = spin.multiply(0.1);
    
    // Clear prediction cache
    this.clearPredictionCache();
  }
  
  /**
   * Predict future ball positions
   * @param timeSteps Number of time steps to predict
   * @param deltaTime Time interval for each step
   * @returns Array of predicted positions
   */
  predictFuturePositions(timeSteps: number, deltaTime: number): Position[] {
    // Reuse cache if we've already calculated this
    const currentTime = Date.now();
    if (
      this.futurePositions.length === timeSteps &&
      currentTime - this.lastPredictionTime < 100 // Only use cache for 100ms
    ) {
      return [...this.futurePositions];
    }
    
    // Clear previous predictions
    this.futurePositions = [];
    this.futureVelocities = [];
    
    // Start with current state
    let pos = this.position.clone();
    let vel = this.velocity.clone();
    let rot = this.rotation.clone();
    
    // Predict each time step
    for (let i = 0; i < timeSteps; i++) {
      // Apply physics similar to update method
      
      // Air resistance
      const speed = vel.length();
      if (speed > 0) {
        const resistanceFactor = Math.pow(1 - this.airResistance, deltaTime);
        vel = vel.multiply(resistanceFactor);
      }
      
      // Rolling resistance
      const rollingResistanceFactor = Math.pow(1 - this.rollingResistance, deltaTime);
      vel = vel.multiply(rollingResistanceFactor);
      
      // Rotation effect
      const swerveEffect = rot.multiply(0.01 * deltaTime);
      vel = vel.add(swerveEffect);
      
      // Update position
      pos = pos.add(vel.multiply(deltaTime));
      
      // Simulate boundary collisions
      this.simulateBounce(pos, vel);
      
      // Decay rotation
      rot = rot.multiply(0.95);
      
      // Store prediction
      this.futurePositions.push(pos.clone());
      this.futureVelocities.push(vel.clone());
    }
    
    // Update cache timestamp
    this.lastPredictionTime = currentTime;
    
    return [...this.futurePositions];
  }
  
  /**
   * Simulate boundary bounce for prediction
   * (A copy of handleBoundaryCollisions but for simulation)
   */
  private simulateBounce(pos: Position, vel: Position): void {
    const boundsX = 1 - this.radius;
    const boundsY = 1 - this.radius;
    
    if (Math.abs(pos.x) > boundsX) {
      pos.x = Math.sign(pos.x) * boundsX;
      vel.x = -vel.x * this.bounceFactor;
    }
    
    if (Math.abs(pos.y) > boundsY) {
      pos.y = Math.sign(pos.y) * boundsY;
      vel.y = -vel.y * this.bounceFactor;
    }
  }
  
  /**
   * Check if a position is near the ball
   * @param position Position to check
   * @param threshold Distance threshold for "nearness"
   * @returns true if the position is within the threshold distance
   */
  isNear(position: Position, threshold: number): boolean {
    return this.position.distanceTo(position) <= threshold;
  }

  /**
   * Get predicted position after a time interval
   * @param timeAhead Time in seconds to predict ahead
   * @returns Predicted position
   */
  getPredictedPositionAt(timeAhead: number): Position {
    // Use the prediction system with just one step
    const predictions = this.predictFuturePositions(1, timeAhead);
    return predictions[0] || this.position.clone();
  }
  
  /**
   * Clear the prediction cache
   */
  private clearPredictionCache(): void {
    this.futurePositions = [];
    this.futureVelocities = [];
    this.lastPredictionTime = 0;
  }
} 