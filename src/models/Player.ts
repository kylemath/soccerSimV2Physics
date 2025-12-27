import { Position } from './Position';
import { v4 as uuidv4 } from 'uuid';
import { PlayerSimulation } from '../physics/PlayerSimulation';
import { MovementController } from '../physics/MovementController';

export enum PlayerRole {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  STRIKER = 'STRIKER'
} 

/**
 * Player attributes based on EA Sports style
 */
export interface PlayerAttributes {
  // Physical attributes
  pace: number;       // Speed and acceleration
  strength: number;   // Physical strength
  stamina: number;    // Endurance and fitness
  agility: number;    // Ability to change direction

  // Technical attributes
  dribbling: number;  // Ball control while moving
  passing: number;    // Passing accuracy and range
  shooting: number;   // Shooting power and accuracy
  heading: number;    // Aerial ability
  tackling: number;   // Defensive ability
  
  // Mental attributes
  vision: number;     // Ability to see opportunities
  positioning: number; // Ability to find space
  decisions: number;  // Decision making quality
  aggression: number; // Willingness to be physical
}

export enum PlayerState {
  POSITIONING = 'POSITIONING',
  ATTACKING = 'ATTACKING',
  SUPPORTING = 'SUPPORTING',
  DEFENDING = 'DEFENDING',
  RECOVERING = 'RECOVERING',
  PRESSING = 'PRESSING'
}

export interface PlayerBehavior {
  state: PlayerState;
  confidence: number;  // 0-1 scale
  urgency: number;    // 0-1 scale
  stamina: number;    // 0-1 scale
}

/**
 * Interface for the Ball object that players interact with
 */
interface Ball {
  position: Position;
  velocity: Position;
}

/**
 * Interface for Team reference
 */
interface Team {
  id: string;
  isHome: boolean;
}

/**
 * Represents a player in the soccer simulation
 */
export class Player {
  // Unique identifier
  readonly id: string;
  
  // Team information
  teamId: string | null = null; // Added: ID of the team the player belongs to
  color: string = '#CCCCCC'; // Added: Player color for visualization
  
  // Basic information
  name: string;
  number: number;      // Jersey number (1-11)
  
  // Position information
  currentPosition: Position;
  targetPosition: Position;
  formationPosition: Position;
  
  // Movement information
  velocity: Position;
  maxSpeed: number;
  
  // Game state
  hasBall: boolean;
  isDesignatedController: boolean;
  timeToBall: number | null;
  
  // Attributes
  attributes: PlayerAttributes;
  role: PlayerRole;
  
  // Position property
  position: Position;
  previousPosition: Position;
  
  private behavior: PlayerBehavior;
  private lastStateChange: number;
  private stateHistory: PlayerState[] = [];
  
  // Add ball and team references
  private ball: Ball | null = null;
  private team: Team | null = null;
  
  // Add new physics properties
  simulation: PlayerSimulation;
  movementController: MovementController;
  
  /**
   * Create a new player
   */
  constructor(
    name: string,
    number: number,
    formationPosition: Position,
    teamId: string,
    color: string,
    attributes: Partial<PlayerAttributes> = {},
    role: PlayerRole = PlayerRole.MIDFIELDER
  ) {
    this.id = uuidv4();
    this.name = name;
    this.number = number;
    this.teamId = teamId; // Set teamId
    this.color = color; // Set color
    
    this.currentPosition = formationPosition.clone();
    this.targetPosition = formationPosition.clone();
    this.formationPosition = formationPosition.clone();
    
    this.velocity = new Position(0, 0);
    this.maxSpeed = 0.05; // Default max speed
    
    this.hasBall = false;
    this.isDesignatedController = false;
    this.timeToBall = null;
    
    // Set default attributes based on role
    this.attributes = this.getDefaultAttributes(role);
    
    // Override with provided attributes
    Object.assign(this.attributes, attributes);
    
    this.role = role;
    
    // Initialize position property
    this.position = formationPosition.clone();
    this.previousPosition = formationPosition.clone();
    
    // Initialize behavior
    this.behavior = {
      state: PlayerState.POSITIONING,
      confidence: 1.0,
      urgency: 0.5,
      stamina: 1.0
    };
    this.lastStateChange = 0;
    
    // Initialize physics simulation
    this.simulation = new PlayerSimulation(this.currentPosition.clone());
    this.movementController = new MovementController(this, this.simulation);
  }
  
  /**
   * Get default attributes based on player role
   */
  private getDefaultAttributes(role: PlayerRole): PlayerAttributes {
    // Default average attributes
    const defaultAttributes: PlayerAttributes = {
      pace: 70,
      strength: 70,
      stamina: 70,
      agility: 70,
      dribbling: 70,
      passing: 70,
      shooting: 70,
      heading: 70,
      tackling: 70,
      vision: 70,
      positioning: 70,
      decisions: 70,
      aggression: 70
    };
    
    // Modify based on role
    switch (role) {
      case PlayerRole.GOALKEEPER:
        return {
          ...defaultAttributes,
          pace: 50,
          strength: 80,
          stamina: 70,
          agility: 75,
          dribbling: 30,
          passing: 60,
          shooting: 20,
          heading: 70,
          tackling: 20,
          vision: 60,
          positioning: 80,
          decisions: 80,
          aggression: 60
        };
        
      case PlayerRole.DEFENDER:
        return {
          ...defaultAttributes,
          pace: 65,
          strength: 80,
          stamina: 75,
          agility: 65,
          dribbling: 60,
          passing: 65,
          shooting: 50,
          heading: 80,
          tackling: 85,
          vision: 70,
          positioning: 80,
          decisions: 75,
          aggression: 80
        };
        
      case PlayerRole.MIDFIELDER:
        return {
          ...defaultAttributes,
          pace: 70,
          strength: 70,
          stamina: 85,
          agility: 75,
          dribbling: 75,
          passing: 80,
          shooting: 65,
          heading: 65,
          tackling: 70,
          vision: 80,
          positioning: 75,
          decisions: 80,
          aggression: 70
        };
        
      case PlayerRole.STRIKER:
        return {
          ...defaultAttributes,
          pace: 85,
          strength: 70,
          stamina: 75,
          agility: 80,
          dribbling: 80,
          passing: 70,
          shooting: 85,
          heading: 75,
          tackling: 40,
          vision: 75,
          positioning: 85,
          decisions: 80,
          aggression: 75
        };
    }
  }
  
  /**
   * Update player state
   */
  update(deltaTime: number, ballPosition: Position): void {
    // Store previous position for collision resolution
    this.previousPosition = this.currentPosition.clone();
    
    // Update movement controller
    this.movementController.update(deltaTime, ballPosition);
    
    // Update behavior state
    this.updateBehaviorState(ballPosition);
  }
  
  /**
   * Update player's behavior state based on game situation
   */
  private updateBehaviorState(ballPosition: Position): void {
    const distanceToBall = this.currentPosition.distanceTo(ballPosition);
    const isNearBall = distanceToBall < 0.3;
    
    // Update behavior state based on game situation
    if (this.hasBall) {
      this.behavior.state = PlayerState.ATTACKING;
      this.behavior.urgency = 0.8;
    } else if (isNearBall) {
      if (this.team?.isHome === true) {
        this.behavior.state = PlayerState.PRESSING;
        this.behavior.urgency = 0.9;
      } else {
        this.behavior.state = PlayerState.DEFENDING;
        this.behavior.urgency = 0.7;
      }
    } else {
      this.behavior.state = PlayerState.POSITIONING;
      this.behavior.urgency = 0.5;
    }
    
    // Update stamina based on urgency
    this.behavior.stamina = Math.max(0, this.behavior.stamina - (this.behavior.urgency * 0.001));
  }
  
  /**
   * Calculate how the ball position should influence the player's movement
   */
  private calculateBallInfluence(ballPosition: Position): Position {
    const distanceToBall = this.currentPosition.distanceTo(ballPosition);
    const maxInfluence = 0.3; // Maximum distance to move from formation position
    const influenceFalloff = 0.5; // How quickly influence decreases with distance
    
    // Calculate influence strength (decreases with distance)
    const influenceStrength = Math.max(0, maxInfluence * (1 - distanceToBall * influenceFalloff));
    
    // Calculate direction to ball
    const directionToBall = ballPosition.subtract(this.currentPosition).normalize();
    
    // Modify influence based on player role
    let roleModifier = 1.0;
    switch (this.role) {
      case PlayerRole.STRIKER:
        roleModifier = 1.5; // Strikers are more attracted to the ball
        break;
      case PlayerRole.MIDFIELDER:
        roleModifier = 1.2; // Midfielders balance between position and ball
        break;
      case PlayerRole.DEFENDER:
        roleModifier = 0.8; // Defenders stay more positionally disciplined
        break;
      case PlayerRole.GOALKEEPER:
        roleModifier = 0.3; // Goalkeeper rarely moves for the ball
        break;
    }
    
    return directionToBall.multiply(influenceStrength * roleModifier);
  }
  
  /**
   * Calculate offset from formation position based on tactical considerations
   */
  private calculateFormationOffset(): Position {
    const isHomeTeam = this.color === '#3366CC';
    const goalX = isHomeTeam ? 1 : -1;
    
    // Base offset depends on role
    let xOffset = 0;
    let yOffset = 0;
    
    switch (this.role) {
      case PlayerRole.STRIKER:
        // Strikers make forward runs
        xOffset = goalX * 0.1;
        yOffset = (Math.random() - 0.5) * 0.2;
        break;
      case PlayerRole.MIDFIELDER:
        // Midfielders shift slightly based on ball position
        xOffset = goalX * 0.05;
        yOffset = (Math.random() - 0.5) * 0.1;
        break;
      case PlayerRole.DEFENDER:
        // Defenders maintain more rigid positioning
        xOffset = goalX * 0.02;
        yOffset = (Math.random() - 0.5) * 0.05;
        break;
    }
    
    return new Position(xOffset, yOffset);
  }
  
  /**
   * Calculate time needed to reach a target position
   */
  calculateTimeToPosition(target: Position): number {
    const distance = this.currentPosition.distanceTo(target);
    const speedFactor = this.attributes.pace / 100;
    const speed = this.maxSpeed * speedFactor;
    
    // Factor in current velocity and direction
    const currentDirection = this.velocity.length() > 0 ? 
      this.velocity.normalize() : new Position(0, 0);
    const targetDirection = target.subtract(this.currentPosition).normalize();
    const directionAlignment = currentDirection.dot(targetDirection);
    
    // Adjust time based on direction alignment (-1 to 1)
    const directionFactor = 1 + (1 - directionAlignment) * 0.5;
    
    // Avoid division by zero
    if (speed === 0) {
      return Infinity;
    }
    
    return (distance * directionFactor) / speed;
  }
  
  /**
   * Set a new target position for the player to move towards
   */
  setTargetPosition(position: Position): void {
    this.targetPosition = position.clone();
  }
  
  /**
   * Create a player with randomized attributes based on role
   */
  static createRandomized(
    name: string,
    number: number,
    formationPosition: Position,
    role: PlayerRole
  ): Player {
    // Create random attributes with role-appropriate ranges
    const randomizeAttribute = (base: number, variance: number): number => {
      return Math.max(1, Math.min(99, Math.floor(base + (Math.random() * variance * 2) - variance)));
    };
    
    // Get base attributes for the role
    const player = new Player(name, number, formationPosition, '', '', {}, role);
    const baseAttributes = player.attributes;
    
    // Randomize each attribute with a variance of ±10
    const randomAttributes: PlayerAttributes = {
      pace: randomizeAttribute(baseAttributes.pace, 10),
      strength: randomizeAttribute(baseAttributes.strength, 10),
      stamina: randomizeAttribute(baseAttributes.stamina, 10),
      agility: randomizeAttribute(baseAttributes.agility, 10),
      dribbling: randomizeAttribute(baseAttributes.dribbling, 10),
      passing: randomizeAttribute(baseAttributes.passing, 10),
      shooting: randomizeAttribute(baseAttributes.shooting, 10),
      heading: randomizeAttribute(baseAttributes.heading, 10),
      tackling: randomizeAttribute(baseAttributes.tackling, 10),
      vision: randomizeAttribute(baseAttributes.vision, 10),
      positioning: randomizeAttribute(baseAttributes.positioning, 10),
      decisions: randomizeAttribute(baseAttributes.decisions, 10),
      aggression: randomizeAttribute(baseAttributes.aggression, 10)
    };
    
    // Apply randomized attributes
    player.attributes = randomAttributes;
    
    return player;
  }
  
  /**
   * Set the team context for the player
   * @param teamId The ID of the team
   * @param color The color of the team
   */
  setTeamContext(teamId: string, color: string): void {
    this.teamId = teamId;
    this.color = color;
  }
  
  /**
   * Convert player data to a JSON-serializable object
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      number: this.number,
      teamId: this.teamId, // Added
      color: this.color, // Added
      currentPosition: this.currentPosition.toJSON(),
      targetPosition: this.targetPosition.toJSON(),
      formationPosition: this.formationPosition.toJSON(),
      velocity: this.velocity.toJSON(),
      maxSpeed: this.maxSpeed,
      hasBall: this.hasBall,
      isDesignatedController: this.isDesignatedController,
      timeToBall: this.timeToBall,
      attributes: this.attributes,
      role: this.role,
      position: this.position.toJSON(),
    };
  }

  /**
   * Create a Player instance from JSON data
   */
  static fromJSON(data: any): Player {
    const player = new Player(
      data.name,
      data.number,
      Position.fromJSON(data.formationPosition),
      data.teamId || uuidv4(), // Use existing or generate if missing
      data.color || '#CCCCCC', // Use existing or default if missing
      data.attributes,
      data.role
    );
    // Overwrite other properties
    Object.assign(player, {
      id: data.id,
      currentPosition: Position.fromJSON(data.currentPosition),
      targetPosition: Position.fromJSON(data.targetPosition),
      velocity: Position.fromJSON(data.velocity),
      maxSpeed: data.maxSpeed,
      hasBall: data.hasBall,
      isDesignatedController: data.isDesignatedController,
      timeToBall: data.timeToBall,
      position: Position.fromJSON(data.position),
    });
    return player;
  }

  /**
   * Check collision with another player and resolve it
   */
  resolveCollision(other: Player): void {
    const COLLISION_RADIUS = 0.1; // Minimum distance between players
    const distance = this.currentPosition.distanceTo(other.currentPosition);
    
    if (distance < COLLISION_RADIUS) {
      // Calculate collision response
      const direction = this.currentPosition.subtract(other.currentPosition).normalize();
      const overlap = COLLISION_RADIUS - distance;
      
      // Move players apart based on their relative strength
      const totalStrength = this.attributes.strength + other.attributes.strength;
      const myStrengthRatio = this.attributes.strength / totalStrength;
      const otherStrengthRatio = other.attributes.strength / totalStrength;
      
      // Move this player
      this.currentPosition = this.currentPosition.add(
        direction.multiply(overlap * otherStrengthRatio)
      );
      
      // Move other player
      other.currentPosition = other.currentPosition.subtract(
        direction.multiply(overlap * myStrengthRatio)
      );
      
      // Handle ball possession in collision
      if (this.hasBall || other.hasBall) {
        const ballHolder = this.hasBall ? this : other;
        const challenger = this.hasBall ? other : this;
        
        // Chance to lose ball based on attributes
        const tackleSuccess = Math.random() < 
          (challenger.attributes.tackling / 100) * 0.3 * // Base tackle chance
          (1 + challenger.attributes.strength / ballHolder.attributes.strength) * // Strength factor
          (1 - ballHolder.attributes.dribbling / 150); // Dribbling defense
        
        if (tackleSuccess) {
          ballHolder.hasBall = false;
          ballHolder.isDesignatedController = false;
          // Ball becomes loose rather than immediately possessed
          challenger.isDesignatedController = true; // Make challenger chase the loose ball
        }
      }
      
      // Reduce velocities after collision
      this.velocity = this.velocity.multiply(0.5);
      other.velocity = other.velocity.multiply(0.5);
    }
  }

  private calculateFormationInfluence(): Position {
    const direction = this.formationPosition.subtract(this.currentPosition);
    return direction.normalize().multiply(0.1);
  }

  private calculateTeammateRepulsion(): Position {
    // Simple repulsion to avoid crowding
    return new Position(0, 0); // To be implemented with teammate awareness
  }

  private calculateAttackingMove(): Position {
    const goalX = this.isHomeTeam ? 1 : -1;
    return new Position(goalX * 0.1, 0);
  }

  private calculatePressingMove(): Position {
    // Move to intercept based on ball position
    if (!this.ball?.position) return new Position(0, 0);
    const toBall = this.ball.position.subtract(this.currentPosition);
    return toBall.normalize().multiply(0.15);
  }

  private calculateSupportingMove(): Position {
    // Find space ahead of ball carrier
    if (!this.ball?.position) return new Position(0, 0);
    const isHomeTeam = this.isHomeTeam;
    const forwardX = isHomeTeam ? 0.1 : -0.1;
    return new Position(forwardX, (Math.random() - 0.5) * 0.1);
  }

  private calculateDefendingMove(): Position {
    // Move to block attacking lanes
    if (!this.ball?.position) return new Position(0, 0);
    const isHomeTeam = this.isHomeTeam;
    const defendX = isHomeTeam ? -0.1 : 0.1;
    return new Position(defendX, 0);
  }

  /**
   * Set the ball reference for the player
   */
  setBall(ball: Ball): void {
    this.ball = ball;
  }

  /**
   * Set the team reference for the player
   */
  setTeam(team: Team): void {
    this.team = team;
  }

  /**
   * Check if player is on home team
   */
  private get isHomeTeam(): boolean {
    return this.team?.isHome ?? false;
  }

  /**
   * Update player's position and store previous position
   */
  updatePosition(newPosition: Position): void {
    this.previousPosition = this.position;
    this.position = newPosition;
  }

  /**
   * Get the current behavior state
   */
  getBehavior(): PlayerBehavior {
    return { ...this.behavior };
  }

  /**
   * Update the behavior state
   */
  updateBehavior(newBehavior: Partial<PlayerBehavior>): void {
    this.behavior = { ...this.behavior, ...newBehavior };
  }
} 