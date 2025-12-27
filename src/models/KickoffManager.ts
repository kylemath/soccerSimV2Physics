import { Team } from './Team';
import { Player } from './Player';
import { Ball } from './Ball';
import { Position } from './Position';

export class KickoffManager {
  private kickoffTeamIsHome: boolean;
  private inKickoffState: boolean;
  private hasStartedKickoff: boolean = false;

  constructor(homeTeamKicksOff: boolean = true) {
    this.kickoffTeamIsHome = homeTeamKicksOff;
    this.inKickoffState = true;
    this.hasStartedKickoff = false;
  }

  /**
   * Check if a team is the one kicking off
   */
  isKickingOff(team: Team): boolean {
    return team.isHome === this.kickoffTeamIsHome;
  }

  /**
   * Check if we're in kickoff state
   */
  isInKickoffState(): boolean {
    return this.inKickoffState;
  }

  /**
   * Check if kickoff has started
   */
  hasStarted(): boolean {
    return this.hasStartedKickoff;
  }

  /**
   * Start the kickoff
   */
  startKickoff(): void {
    this.hasStartedKickoff = true;
  }

  /**
   * End the kickoff state
   */
  endKickoff(): void {
    this.inKickoffState = false;
    this.hasStartedKickoff = false;
  }

  /**
   * Reset kickoff state (e.g., after a goal)
   */
  resetKickoff(homeTeamKicksOff: boolean): void {
    this.kickoffTeamIsHome = homeTeamKicksOff;
    this.inKickoffState = true;
    this.hasStartedKickoff = false;
  }

  /**
   * Check if a player's position is valid for kickoff
   */
  isPositionValid(player: Player, isHome: boolean): boolean {
    // If kickoff has started, all positions are valid
    if (this.hasStartedKickoff) {
      return true;
    }
    
    // During kickoff setup, players must be in their own half
    const xPos = player.currentPosition.x;
    
    if (isHome) {
      // Home team players must be in negative X (left side)
      if (this.kickoffTeamIsHome) {
        // If home team is kicking off, strikers can be at center line
        return player.role === 'STRIKER' ? xPos <= 0 : xPos < -0.1;
      } else {
        // If defending, all players must be in own half
        return xPos < -0.1;
      }
    } else {
      // Away team players must be in positive X (right side)
      if (!this.kickoffTeamIsHome) {
        // If away team is kicking off, strikers can be at center line
        return player.role === 'STRIKER' ? xPos >= 0 : xPos > 0.1;
      } else {
        // If defending, all players must be in own half
        return xPos > 0.1;
      }
    }
  }

  /**
   * Set up kickoff positions
   */
  setupKickoff(homePlayers: Player[], awayPlayers: Player[], ball: Ball): void {
    // Reset ball position
    ball.position = new Position(0, 0);
    ball.velocity = new Position(0, 0);
    
    // Position players according to kickoff rules
    homePlayers.forEach(player => {
      if (!this.isPositionValid(player, true)) {
        // Move player to valid position if needed
        const currentY = player.currentPosition.y;
        player.currentPosition = new Position(
          this.kickoffTeamIsHome ? -0.1 : -0.2,
          currentY
        );
      }
    });

    awayPlayers.forEach(player => {
      if (!this.isPositionValid(player, false)) {
        // Move player to valid position if needed
        const currentY = player.currentPosition.y;
        player.currentPosition = new Position(
          this.kickoffTeamIsHome ? 0.2 : 0.1,
          currentY
        );
      }
    });
  }
} 