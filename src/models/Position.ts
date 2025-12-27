/**
 * Represents a position on the soccer field
 * X-coordinate: -1 to 1 from left to right
 * Y-coordinate: -1 to 1 from bottom to top
 */
export class Position {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /**
   * Create a new position from this one
   */
  clone(): Position {
    return new Position(this.x, this.y);
  }

  /**
   * Calculate distance to another position
   */
  distanceTo(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Add another position to this one
   */
  add(other: Position): Position {
    return new Position(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another position from this one
   */
  subtract(other: Position): Position {
    return new Position(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply position by a scalar
   */
  multiply(scalar: number): Position {
    return new Position(this.x * scalar, this.y * scalar);
  }

  /**
   * Normalize the position (make it a unit vector)
   */
  normalize(): Position {
    const length = this.length();
    if (length === 0) {
      return new Position(0, 0);
    }
    return new Position(this.x / length, this.y / length);
  }

  /**
   * Calculate the length of the position vector
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Calculate the dot product with another position
   */
  dot(other: Position): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Interpolate between this position and another
   * @param other The other position
   * @param t The interpolation factor (0-1)
   */
  lerp(other: Position, t: number): Position {
    return new Position(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  /**
   * Constrain position to be within the field (-1 to 1 for both x and y)
   */
  constrainToField(): Position {
    return new Position(
      Math.max(-1, Math.min(1, this.x)),
      Math.max(-1, Math.min(1, this.y))
    );
  }

  /**
   * Convert position to a formatted string
   */
  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  /**
   * Convert position data to a JSON-serializable object
   */
  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Create a Position instance from JSON data
   */
  static fromJSON(data: { x: number; y: number }): Position {
    return new Position(data.x, data.y);
  }

  /**
   * Calculate squared distance to another position
   */
  distanceToSquared(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }
} 