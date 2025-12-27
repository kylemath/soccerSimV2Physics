import { Position } from '../models/Position';
import { PhysicsObject } from './interfaces';

export class PlayerSimulation implements PhysicsObject {
  position: Position;
  velocity: Position = new Position(0, 0);
  acceleration: Position = new Position(0, 0);
  mass: number = 70; // kg
  friction: number = 0.1;
  restitution: number = 0.3;
  radius: number = 0.02; // Player collision radius in normalized field coordinates
  
  // Movement parameters
  private maxSpeed: number = 0.05;
  private maxAcceleration: number = 0.01;
  
  constructor(initialPosition: Position) {
    this.position = initialPosition.clone();
  }
  
  updatePhysics(deltaTime: number): void {
    // Additional player-specific physics updates can go here
    // Base physics (velocity, position, etc.) are handled by PhysicsEngine
  }
  
  moveTo(targetPosition: Position, strength: number = 1.0): void {
    // Calculate desired velocity
    const desired = targetPosition.subtract(this.position);
    const distance = desired.length();
    
    // Variable speed based on distance
    let targetSpeed = this.maxSpeed;
    if (distance < 0.1) {
      targetSpeed = this.maxSpeed * (distance / 0.1);
    }
    
    // If desired is zero length, skip steering calculation
    if (distance < 0.001) {
      return;
    }
    
    const desiredVelocity = desired.normalize().multiply(targetSpeed);
    
    // Calculate steering force
    const steeringForce = desiredVelocity.subtract(this.velocity).multiply(strength);
    
    // Apply force capped by max acceleration
    const forceMagnitude = steeringForce.length();
    if (forceMagnitude > this.maxAcceleration) {
      steeringForce.multiply(this.maxAcceleration / forceMagnitude);
    }
    
    this.acceleration = this.acceleration.add(steeringForce);
  }
  
  setMaxSpeed(speed: number): void {
    this.maxSpeed = speed;
  }
  
  setMaxAcceleration(acceleration: number): void {
    this.maxAcceleration = acceleration;
  }
} 