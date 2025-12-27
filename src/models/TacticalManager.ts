import { Position } from './Position';
import { Player } from './Player';
import { Team } from './Team';

export enum PlayerRole {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  STRIKER = 'STRIKER'
}

export class TacticalManager {
  private team: Team;
  private ballPosition: Position;
  private hasPossession: boolean;
  private defensiveLineHeight: number = 0.4; // Base defensive line height
  private attackingLineHeight: number = 0.7; // Base attacking line height
  
  constructor(team: Team) {
    this.team = team;
    this.ballPosition = new Position(0, 0);
    this.hasPossession = false;
  }
  
  update(ballPosition: Position, hasPossession: boolean): void {
    this.ballPosition = ballPosition;
    this.hasPossession = hasPossession;
    
    // Calculate target positions for each player
    this.calculateTargetPositions();
  }
  
  private calculateTargetPositions(): void {
    // Field progress is a value from 0 to 1 representing how far up the field the ball is
    const fieldProgress = this.team.isHome ? 
      (this.ballPosition.x + 1) / 2 :
      1 - (this.ballPosition.x + 1) / 2;
    
    // Make line heights more dynamic and responsive
    const lineHeightModifier = this.hasPossession ? 0.3 : -0.05;
    const fieldProgressInfluence = this.hasPossession ? 
      fieldProgress * 0.5 : // More aggressive when in possession
      fieldProgress * 0.3;  // More conservative when defending
    
    const defensiveHeight = this.defensiveLineHeight + lineHeightModifier + fieldProgressInfluence;
    const attackingHeight = this.attackingLineHeight + lineHeightModifier + fieldProgressInfluence;
    
    // Update each player's target position
    this.team.players.forEach(player => {
      const formationPos = player.formationPosition.clone();
      
      // Base position from formation
      const baseX = this.team.isHome ? formationPos.x : -formationPos.x;
      let targetX = baseX;
      let movementRange = 0.3; // Allow more movement range
      
      // Calculate position based on role with more fluid ranges
      switch(player.role) {
        case PlayerRole.GOALKEEPER:
          // Goalkeepers have limited forward movement
          const gkRange = 0.15;
          targetX = this.team.isHome ? 
            -0.95 + (this.hasPossession ? gkRange : 0) :
            0.95 - (this.hasPossession ? gkRange : 0);
          break;
          
        case PlayerRole.DEFENDER:
          // Defenders can move up more when in possession
          movementRange = this.hasPossession ? 0.5 : 0.3;
          targetX = this.team.isHome ?
            baseX + (defensiveHeight * movementRange) :
            baseX - (defensiveHeight * movementRange);
          break;
          
        case PlayerRole.MIDFIELDER:
          // Midfielders have the most freedom to move
          movementRange = 0.6;
          const midProgress = fieldProgress * movementRange;
          targetX = this.team.isHome ?
            baseX + midProgress :
            baseX - midProgress;
          break;
          
        case PlayerRole.STRIKER:
          // Strikers push up but maintain some structure
          movementRange = this.hasPossession ? 0.4 : 0.3;
          targetX = this.team.isHome ?
            baseX + (attackingHeight * movementRange) :
            baseX - (attackingHeight * movementRange);
          break;
      }
      
      // Add more dynamic Y-axis movement
      const ballYInfluence = (this.ballPosition.y - formationPos.y) * 0.3;
      const yMovementRange = 0.4; // Increased Y movement range
      const targetY = Math.max(-yMovementRange, Math.min(yMovementRange, 
        formationPos.y + ballYInfluence
      ));
      
      // Gradually update target position to prevent snapping
      const currentTarget = player.targetPosition;
      const smoothing = 0.1; // Lower value = smoother transition
      
      const newX = currentTarget.x + (targetX - currentTarget.x) * smoothing;
      const newY = currentTarget.y + (targetY - currentTarget.y) * smoothing;
      
      // Update player's target position
      player.targetPosition = new Position(newX, newY);
    });
  }
} 