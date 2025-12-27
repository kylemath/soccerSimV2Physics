import { Position } from '../models/Position';
import { PhysicsObject } from './interfaces';

export class BallSimulation implements PhysicsObject {
  position: Position;
  velocity: Position = new Position(0, 0);
  acceleration: Position = new Position(0, 0);
  mass: number = 0.45; // kg - regulation soccer ball
  friction: number = 0.08;
  restitution: number = 0.7; // Bounciness factor
  radius: number = 0.01; // Ball radius in normalized field coordinates
  
  // Ball parameters
  private maxSpeed: number = 0.15; // Faster than players
  
  constructor(initialPosition: Position) {
    this.position = initialPosition.clone();
  }
  
  updatePhysics(deltaTime: number): void {
    // Additional ball-specific physics updates can go here
    // Base physics (velocity, position, etc.) are handled by PhysicsEngine
  }
  
  kick(direction: Position, power: number): void {
    // Convert kick power to velocity
    // Power is expected to be between 0 and 1
    const kickStrength = Math.min(Math.max(power, 0), 1);
    const kickVelocity = direction.normalize().multiply(this.maxSpeed * kickStrength);
    
    // Set the ball's velocity directly
    this.velocity = kickVelocity;
  }
  
  setMaxSpeed(speed: number): void {
    this.maxSpeed = speed;
  }
} 