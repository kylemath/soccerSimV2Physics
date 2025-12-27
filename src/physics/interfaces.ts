import { Position } from '../models/Position';

/**
 * Interface for any object that can be simulated in the physics engine
 */
export interface PhysicsObject {
  position: Position;
  velocity: Position;
  acceleration: Position;
  mass: number;
  friction: number;
  restitution: number;  // Bounciness factor (0-1)
  
  // Bounding information for collision detection
  radius: number;  // For circular collision detection
  
  // Physics update method
  updatePhysics(deltaTime: number): void;
}

/**
 * Interface for handling collisions between physics objects
 */
export interface CollisionSystem {
  // Check if two objects are colliding
  checkCollision(obj1: PhysicsObject, obj2: PhysicsObject): boolean;
  
  // Resolve a collision between two objects
  resolveCollision(obj1: PhysicsObject, obj2: PhysicsObject): void;
  
  // Get all potential collisions using spatial partitioning
  getPotentialCollisions(objects: PhysicsObject[]): [PhysicsObject, PhysicsObject][];
}

/**
 * Interface for controlling movement of physics objects
 */
export interface MovementController {
  // Apply a force to the object
  applyForce(force: Position): void;
  
  // Apply an impulse (instant change in velocity)
  applyImpulse(impulse: Position): void;
  
  // Set maximum speed limit
  setMaxSpeed(speed: number): void;
  
  // Get current movement state
  getState(): {
    position: Position;
    velocity: Position;
    acceleration: Position;
    speed: number;
  };
}

/**
 * Interface for configurable physics parameters
 */
export interface PhysicsConfig {
  gravity: number;
  airResistance: number;
  groundFriction: number;
  maxSpeed: number;
  deltaTime: number;
} 