import { Position } from '../models/Position';
import { PhysicsObject, PhysicsConfig } from './interfaces';

export class PhysicsEngine {
  private objects: Set<PhysicsObject> = new Set();
  private config: PhysicsConfig;

  constructor(config: Partial<PhysicsConfig> = {}) {
    // Default physics configuration
    this.config = {
      gravity: 0,  // No vertical gravity for top-down soccer
      airResistance: 0.01,
      groundFriction: 0.1,
      maxSpeed: 10,
      deltaTime: 1/60,
      ...config
    };
  }

  /**
   * Add an object to be simulated by the physics engine
   */
  addObject(obj: PhysicsObject): void {
    this.objects.add(obj);
  }

  /**
   * Remove an object from the physics simulation
   */
  removeObject(obj: PhysicsObject): void {
    this.objects.delete(obj);
  }

  /**
   * Update physics for all objects
   * @param deltaTime Time step in seconds
   */
  update(deltaTime: number): void {
    // Scale deltaTime to maintain consistent physics regardless of frame rate
    const scaledDelta = Math.min(deltaTime, this.config.deltaTime);
    
    // Update each object's physics
    for (const obj of this.objects) {
      this.updateObjectPhysics(obj, scaledDelta);
    }
  }

  /**
   * Update physics for a single object
   */
  private updateObjectPhysics(obj: PhysicsObject, deltaTime: number): void {
    // Apply air resistance
    const airResistance = obj.velocity.multiply(
      -this.config.airResistance * obj.velocity.length()
    );
    obj.acceleration = obj.acceleration.add(airResistance);

    // Apply ground friction
    const friction = obj.velocity.multiply(
      -this.config.groundFriction * obj.friction
    );
    obj.acceleration = obj.acceleration.add(friction);

    // Update velocity using acceleration
    obj.velocity = obj.velocity.add(obj.acceleration.multiply(deltaTime));

    // Limit speed to max speed
    const speed = obj.velocity.length();
    if (speed > this.config.maxSpeed) {
      obj.velocity = obj.velocity.multiply(this.config.maxSpeed / speed);
    }

    // Update position using velocity
    obj.position = obj.position.add(obj.velocity.multiply(deltaTime));

    // Reset acceleration for next frame
    obj.acceleration = new Position(0, 0);

    // Call object's own physics update for additional behavior
    obj.updatePhysics(deltaTime);
  }

  /**
   * Apply a force to an object
   */
  applyForce(obj: PhysicsObject, force: Position): void {
    // F = ma, so a = F/m
    const acceleration = force.multiply(1 / obj.mass);
    obj.acceleration = obj.acceleration.add(acceleration);
  }

  /**
   * Apply an instantaneous change in velocity (impulse)
   */
  applyImpulse(obj: PhysicsObject, impulse: Position): void {
    // Direct velocity change
    obj.velocity = obj.velocity.add(impulse.multiply(1 / obj.mass));
  }

  /**
   * Get current config
   */
  getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  setConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }
} 