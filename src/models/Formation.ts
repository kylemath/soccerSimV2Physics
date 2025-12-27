import { Position } from './Position';
import { Player } from './Player';
import { PlayerRole } from './Player';

/**
 * Standard formation types
 */
export enum FormationType {
  F_442 = '4-4-2',
  F_433 = '4-3-3',
  F_352 = '3-5-2',
  F_4231 = '4-2-3-1',
  F_4321 = '4-3-2-1',
  F_532 = '5-3-2',
  F_343 = '3-4-3',
  F_541 = '5-4-1',
  CUSTOM = 'Custom'
}

/**
 * Formation player position definition
 */
export interface FormationPosition {
  position: Position;
  role: PlayerRole;
  positionName: string;
}

/**
 * Represents a team formation with player positions
 */
export class Formation {
  name: string;
  type: FormationType;
  private positions: Map<number, Position>;
  private roles: Map<number, PlayerRole>;
  
  // Focus position for team movement (-1, -1 to 1, 1)
  // This is used to shift the formation around the field
  focusPosition: Position;
  
  // Formation width and depth scaling
  widthScale: number;
  depthScale: number;
  
  /**
   * Create a new formation
   */
  constructor(
    type: FormationType = FormationType.F_442,
    name: string = FormationType.F_442
  ) {
    this.type = type;
    this.name = name;
    this.positions = new Map();
    this.roles = new Map();
    
    this.focusPosition = new Position(0, 0);
    this.widthScale = 0.8;  // 80% of field width
    this.depthScale = 0.7;  // 70% of field depth

    // Initialize default positions
    const defaultPositions = this.getDefaultPositions();
    defaultPositions.forEach((value, number) => {
      const [position, role] = value;
      this.setPosition(number, position, role);
    });
  }
  
  /**
   * Get the number of positions in the formation
   */
  getPositionCount(): number {
    return this.positions.size;
  }
  
  /**
   * Get all position numbers in the formation
   */
  getPositionNumbers(): number[] {
    return Array.from(this.positions.keys());
  }
  
  /**
   * Get default positions for this formation
   */
  getDefaultPositions(): Map<number, [Position, PlayerRole]> {
    const positions = new Map<number, [Position, PlayerRole]>();
    
    // Goalkeeper
    positions.set(1, [new Position(0.9, 0), PlayerRole.GOALKEEPER]);
    
    // Defenders (4)
    positions.set(2, [new Position(0.7, -0.3), PlayerRole.DEFENDER]);  // Right back
    positions.set(3, [new Position(0.7, -0.1), PlayerRole.DEFENDER]);  // Right center back
    positions.set(4, [new Position(0.7, 0.1), PlayerRole.DEFENDER]);   // Left center back
    positions.set(5, [new Position(0.7, 0.3), PlayerRole.DEFENDER]);   // Left back
    
    // Midfielders (4)
    positions.set(6, [new Position(0.4, -0.3), PlayerRole.MIDFIELDER]);  // Right midfielder
    positions.set(7, [new Position(0.4, -0.1), PlayerRole.MIDFIELDER]);  // Right center mid
    positions.set(8, [new Position(0.4, 0.1), PlayerRole.MIDFIELDER]);   // Left center mid
    positions.set(9, [new Position(0.4, 0.3), PlayerRole.MIDFIELDER]);   // Left midfielder
    
    // Strikers (2)
    positions.set(10, [new Position(0.2, -0.1), PlayerRole.STRIKER]);  // Right striker
    positions.set(11, [new Position(0.2, 0.1), PlayerRole.STRIKER]);   // Left striker

    return positions;
  }
  
  /**
   * Set a player's position in the formation
   */
  setPosition(number: number, position: Position, role: PlayerRole): void {
    this.positions.set(number, position);
    this.roles.set(number, role);
  }
  
  /**
   * Get a player's position in the formation
   */
  getPosition(number: number): Position | undefined {
    return this.positions.get(number);
  }
  
  /**
   * Get a player's role in the formation
   */
  getRole(number: number): PlayerRole | undefined {
    return this.roles.get(number);
  }
  
  /**
   * Get adapted player positions based on the current focus
   */
  getAdaptedPositions(): FormationPosition[] {
    const positions: FormationPosition[] = [];
    
    this.positions.forEach((position, number) => {
      const role = this.roles.get(number);
      if (role) {
        // Scale position based on width and depth settings
        const scaledPos = new Position(
          position.x * this.widthScale,
          position.y * this.depthScale
        );
        
        // Adjust based on focus position
        const adaptedPos = new Position(
          scaledPos.x + this.focusPosition.x * (1 - Math.abs(scaledPos.x)),
          scaledPos.y + this.focusPosition.y * (1 - Math.abs(scaledPos.y))
        );
        
        positions.push({
          position: adaptedPos,
          role: role,
          positionName: `Player ${number}`
        });
      }
    });
    
    return positions;
  }
  
  /**
   * Get all positions with their roles
   */
  getAllPositions(): Map<number, [Position, PlayerRole]> {
    const result = new Map<number, [Position, PlayerRole]>();
    this.positions.forEach((position, number) => {
      const role = this.roles.get(number);
      if (role) {
        result.set(number, [position.clone(), role]);
      }
    });
    return result;
  }
  
  /**
   * Adjust the formation focus based on ball position and team state
   * @param ballPosition Current ball position
   * @param inPossession Whether the team is in possession
   * @param intensity How intensely to follow the ball (0-1)
   */
  adjustFocus(ballPosition: Position, inPossession: boolean, intensity: number = 0.5): void {
    // Target focus (where we want the formation to move toward)
    let targetFocus = new Position(
      ballPosition.x * 0.8, // Limit horizontal shift to 80% of ball position
      inPossession ? ballPosition.y * 0.5 : ballPosition.y * 0.7 // Move up less when attacking
    );
    
    // Constrain the focus to valid range
    targetFocus = targetFocus.constrainToField();
    
    // Smoothly transition to the target focus
    this.focusPosition = this.focusPosition.lerp(targetFocus, intensity);
  }
  
  /**
   * Adjust formation width and depth based on game situation
   * @param inPossession Whether the team is in possession
   * @param defensive Emphasis on defensive compactness (0-1)
   */
  adjustShape(inPossession: boolean, defensive: number = 0.5): void {
    if (inPossession) {
      // When in possession, spread out more
      this.widthScale = 0.7 + (1 - defensive) * 0.2; // 0.7-0.9
      this.depthScale = 0.6 + (1 - defensive) * 0.3; // 0.6-0.9
    } else {
      // When defending, become more compact
      this.widthScale = 0.6 + (1 - defensive) * 0.2; // 0.6-0.8
      this.depthScale = 0.5 + (1 - defensive) * 0.2; // 0.5-0.7
    }
  }
  
  /**
   * Create a clone of this formation
   */
  clone(): Formation {
    const cloned = new Formation(this.type, this.name);
    
    this.positions.forEach((position, number) => {
      const role = this.roles.get(number);
      if (role) {
        cloned.setPosition(number, position.clone(), role);
      }
    });
    
    cloned.focusPosition = this.focusPosition.clone();
    cloned.widthScale = this.widthScale;
    cloned.depthScale = this.depthScale;
    
    return cloned;
  }
  
  /**
   * Convert formation to a JSON-serializable object
   */
  toJSON(): any {
    const positions: { [key: number]: { position: any; role: PlayerRole } } = {};
    this.positions.forEach((position, number) => {
      const role = this.roles.get(number);
      if (role) {
        positions[number] = {
          position: position.toJSON(),
          role: role
        };
      }
    });

    return {
      name: this.name,
      type: this.type,
      positions,
      focusPosition: this.focusPosition.toJSON(),
      widthScale: this.widthScale,
      depthScale: this.depthScale
    };
  }
  
  /**
   * Create a formation from a JSON object
   */
  static fromJSON(json: any): Formation {
    const formation = new Formation(json.type as FormationType, json.name);

    Object.entries(json.positions).forEach(([number, data]: [string, any]) => {
      formation.setPosition(
        parseInt(number),
        Position.fromJSON(data.position),
        data.role as PlayerRole
      );
    });

    formation.focusPosition = Position.fromJSON(json.focusPosition);
    formation.widthScale = json.widthScale;
    formation.depthScale = json.depthScale;

    return formation;
  }
  
  /**
   * Mirror positions for away team (flip x coordinates)
   */
  mirror(): Formation {
    const mirrored = new Formation(this.type, this.name);
    
    this.positions.forEach((position, number) => {
      const role = this.roles.get(number);
      if (role) {
        mirrored.setPosition(
          number,
          new Position(-position.x, position.y),
          role
        );
      }
    });
    
    // Mirror focus position by negating x coordinate
    mirrored.focusPosition = new Position(-this.focusPosition.x, this.focusPosition.y);
    mirrored.widthScale = this.widthScale;
    mirrored.depthScale = this.depthScale;
    
    return mirrored;
  }

  /**
   * Get position and role for a specific number
   */
  getPositionAndRole(number: number): [Position, PlayerRole] | undefined {
    const position = this.positions.get(number);
    const role = this.roles.get(number);
    if (position && role) {
      return [position.clone(), role];
    }
    return undefined;
  }
} 