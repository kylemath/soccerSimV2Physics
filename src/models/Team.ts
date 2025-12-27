import { Position } from './Position';
import { Player } from './Player';
import { PlayerRole } from './Player';
import { Formation, FormationType, FormationPosition } from './Formation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Team strategy settings
 */
export interface TeamStrategy {
  // Defensive settings
  pressingIntensity: number;     // How aggressively to press (0-1)
  defensiveCompactness: number;  // How compact to be when defending (0-1)
  markingStyle: number;          // Zonal (0) to Man (1)
  
  // Offensive settings
  passingStyle: number;          // Direct (0) to Possession (1)
  attackingWidth: number;        // Narrow (0) to Wide (1)
  attackingSpeed: number;        // Slow (0) to Fast (1)
  
  // General settings
  riskTaking: number;            // Cautious (0) to Risky (1)
  offensivePositioning: number;  // Counter (0) to Attacking (1)
}

/**
 * Represents a team of players with formation and strategy
 */
export class Team {
  readonly id: string;
  name: string;
  players: Player[];
  formation: Formation;
  strategy: TeamStrategy;
  color: string;
  isHome: boolean;
  
  // Game state
  inPossession: boolean;
  
  // Designated ball controller
  designatedControllerId: string | null;
  
  /**
   * Create a new team
   */
  constructor(
    name: string,
    formation: Formation = new Formation(),
    color: string = '#3366CC',
    isHome: boolean = true
  ) {
    console.log('Team constructor called with:', { name, formation, color, isHome });
    this.id = uuidv4();
    this.name = name;
    console.log('Formation received:', formation);
    this.formation = formation;
    this.color = color;
    this.isHome = isHome;
    console.log('Creating default players...');
    this.players = this.createDefaultPlayers();
    
    // Set default strategy and override with provided values
    this.strategy = {
      pressingIntensity: 0.5,
      defensiveCompactness: 0.5,
      markingStyle: 0.5,
      passingStyle: 0.5,
      attackingWidth: 0.5,
      attackingSpeed: 0.5,
      riskTaking: 0.5,
      offensivePositioning: 0.5,
    };
    
    this.inPossession = false;
    this.designatedControllerId = null;
    console.log('Team construction completed:', this);
  }
  
  /**
   * Create default players for the team based on formation
   */
  private createDefaultPlayers(): Player[] {
    console.log('createDefaultPlayers called, formation:', this.formation);
    const players: Player[] = [];
    if (!this.formation) {
      console.error('Formation is undefined in createDefaultPlayers');
      return players;
    }
    
    try {
      const defaultPositions = this.formation.getAllPositions();
      console.log('Default positions from formation:', defaultPositions);

      defaultPositions.forEach((value, number) => {
        console.log('Creating player for position:', { number, value });
        const [position, role] = value;
        const player = new Player(
          `Player ${number}`,
          number,
          position,
          this.id,
          this.color,
          {},
          role
        );
        players.push(player);
      });
    } catch (error) {
      console.error('Error in createDefaultPlayers:', error);
    }

    console.log('Created players:', players);
    return players;
  }
  
  /**
   * Update team state
   */
  update(deltaTime: number, ballPosition: Position, hasPossession: boolean): void {
    // Update formation focus based on ball position
    this.formation.adjustFocus(ballPosition, hasPossession);

    // Update formation shape based on possession
    this.formation.adjustShape(hasPossession);

    // Get adapted positions for current game state
    const adaptedPositions = this.formation.getAdaptedPositions();

    // Update each player's target position
    this.players.forEach(player => {
      const formationPosition = adaptedPositions.find(
        pos => pos.positionName === `Player ${player.number}`
      );
      if (formationPosition) {
        player.targetPosition = formationPosition.position;
      }
    });

    // Update each player
    this.players.forEach(player => {
      player.update(deltaTime, ballPosition);
    });
    
    // Update possession state
    this.inPossession = hasPossession;
  }
  
  /**
   * Get the nearest player to a position
   */
  getNearestPlayer(position: Position, excludeIds: string[] = []): Player | null {
    let nearest: Player | null = null;
    let minDistance = Infinity;

    this.players.forEach(player => {
      if (excludeIds.includes(player.id)) return;

      const distance = player.currentPosition.distanceTo(position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }
  
  /**
   * Get players in a specific role
   */
  getPlayersByRole(role: PlayerRole): Player[] {
    return this.players.filter(player => player.role === role);
  }
  
  /**
   * Clone the team
   */
  clone(): Team {
    console.log('Cloning team:', this);
    if (!this.formation) {
      console.error('Formation is undefined in clone()');
      throw new Error('Cannot clone team: formation is undefined');
    }
    
    try {
      console.log('Cloning formation:', this.formation);
      const clonedFormation = this.formation.clone();
      console.log('Cloned formation:', clonedFormation);
      
      const clonedTeam = new Team(
        this.name,
        clonedFormation,
        this.color,
        this.isHome
      );

      console.log('Cloning players...');
      clonedTeam.players = this.players.map(player => {
        console.log('Cloning player:', player);
        const clonedPlayer = new Player(
          player.name,
          player.number,
          player.currentPosition.clone(),
          clonedTeam.id,
          this.color,
          player.attributes,
          player.role
        );
        return clonedPlayer;
      });

      console.log('Clone completed:', clonedTeam);
      return clonedTeam;
    } catch (error) {
      console.error('Error in clone():', error);
      throw error;
    }
  }
  
  /**
   * Convert team to JSON
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      formation: this.formation.toJSON(),
      color: this.color,
      isHome: this.isHome,
      players: this.players.map(player => player.toJSON())
    };
  }
  
  /**
   * Create team from JSON
   */
  static fromJSON(json: any): Team {
    console.log('Creating team from JSON:', json);
    try {
      if (!json.formation) {
        console.error('Formation is missing in JSON');
        throw new Error('Formation is required in team JSON');
      }
      
      console.log('Creating formation from JSON:', json.formation);
      const formation = Formation.fromJSON(json.formation);
      console.log('Created formation:', formation);
      
      const team = new Team(
        json.name,
        formation,
        json.color,
        json.isHome
      );
      
      console.log('Restoring players from JSON...');
      team.players = json.players.map((playerJson: any) => {
        console.log('Restoring player:', playerJson);
        const player = Player.fromJSON(playerJson);
        const positionAndRole = team.formation.getPositionAndRole(player.number);
        if (positionAndRole) {
          player.targetPosition = positionAndRole[0];
        }
        return player;
      });
      
      console.log('Team creation from JSON completed:', team);
      return team;
    } catch (error) {
      console.error('Error creating team from JSON:', error);
      throw error;
    }
  }
  
  /**
   * Update the designated controller for the ball
   */
  private updateDesignatedController(): void {
    // This would normally be done based on player positions relative to the ball
    // For now, just ensure there is a designated controller
    if (!this.designatedControllerId || !this.getPlayerById(this.designatedControllerId)) {
      // Set the first player as the controller by default
      if (this.players.length > 0) {
        this.designatedControllerId = this.players[0].id;
        this.players[0].isDesignatedController = true;
      }
    }
  }
  
  /**
   * Get a player by their ID
   */
  getPlayerById(id: string): Player | undefined {
    return this.players.find(p => p.id === id);
  }
  
  /**
   * Calculate time to ball for all players
   * @param ballPosition Current ball position
   * @param predictedBallPosition Predicted future ball position
   */
  calculateTimeToBall(ballPosition: Position, predictedBallPosition: Position): void {
    for (const player of this.players) {
      // Calculate time needed to reach current and predicted ball positions
      const timeToCurrentBall = player.calculateTimeToPosition(ballPosition);
      const timeToPredictedBall = player.calculateTimeToPosition(predictedBallPosition);
      
      // Use the better of the two times
      player.timeToBall = Math.min(timeToCurrentBall, timeToPredictedBall);
    }
  }
  
  /**
   * Find the player who can reach the ball first
   */
  findClosestPlayerToBall(): Player | undefined {
    return this.players.reduce((closest, current) => {
      if (!closest) return current;
      if (!current.timeToBall) return closest;
      if (!closest.timeToBall) return current;
      return current.timeToBall < closest.timeToBall ? current : closest;
    }, undefined as Player | undefined);
  }
  
  /**
   * Set the designated controller for the ball
   */
  setDesignatedController(playerId: string): void {
    // Clear previous controller
    if (this.designatedControllerId) {
      const previousController = this.getPlayerById(this.designatedControllerId);
      if (previousController) {
        previousController.isDesignatedController = false;
      }
    }
    
    // Set new controller
    const newController = this.getPlayerById(playerId);
    if (newController) {
      this.designatedControllerId = playerId;
      newController.isDesignatedController = true;
    }
  }
  
  /**
   * Change the team's formation
   */
  changeFormation(formationType: FormationType): void {
    // Create new formation
    const newFormation = new Formation(formationType);
    
    // Get positions using public method
    const newPositions = newFormation.getAllPositions();
    
    // Update player positions
    newPositions.forEach((value, number) => {
      const player = this.players.find(p => p.number === number);
      if (player) {
        const [position, role] = value;
        player.formationPosition = position.clone();
        player.role = role;
      }
    });
    
    this.formation = newFormation;
  }

  /**
   * Add a player to the team
   */
  addPlayer(playerData: Partial<Player>): Player {
    const player = new Player(
      playerData.name || `Player ${this.players.length + 1}`,
      playerData.number || this.players.length + 1,
      playerData.position || new Position(0, 0),
      this.id,
      this.color,
      playerData.attributes,
      playerData.role || PlayerRole.MIDFIELDER
    );

    this.players.push(player);
    return player;
  }
} 