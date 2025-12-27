import { Position } from '../models/Position';
import { Player } from '../models/Player';
import { Ball } from '../models/Ball';
import { PlayerRole } from '../models/Player';

export class KickoffManager {
  private static readonly CENTER_CIRCLE_RADIUS = 0.1; // 10% of field width
  private static readonly KICKOFF_POSITION = new Position(0, 0);
  private kickoffTeamIsHome: boolean;
  private hasKickoffStarted: boolean = false;

  constructor(kickoffTeamIsHome: boolean) {
    this.kickoffTeamIsHome = kickoffTeamIsHome;
  }

  /**
   * Set up players and ball for kickoff
   */
  setupKickoff(homePlayers: Player[], awayPlayers: Player[], ball: Ball): void {
    // Reset kickoff state
    this.hasKickoffStarted = false;
    ball.position = new Position(0, 0);
    ball.velocity = new Position(0, 0);

    // Position kickoff team (one player at center, rest behind center line)
    const kickoffPlayers = this.kickoffTeamIsHome ? homePlayers : awayPlayers;
    const nonKickoffPlayers = this.kickoffTeamIsHome ? awayPlayers : homePlayers;
    
    // Position kickoff team
    this.positionKickoffTeam(kickoffPlayers);
    
    // Position non-kickoff team
    this.positionNonKickoffTeam(nonKickoffPlayers);
  }

  /**
   * Position the team taking the kickoff
   */
  private positionKickoffTeam(players: Player[]): void {
    // Find the striker or midfielder for kickoff
    const kickoffPlayer = players.find(p => 
      p.role === PlayerRole.STRIKER || p.role === PlayerRole.MIDFIELDER
    ) || players[0];

    // Position kickoff player at center
    kickoffPlayer.position = KickoffManager.KICKOFF_POSITION;

    // Position other players behind center line on their side
    const xOffset = this.kickoffTeamIsHome ? -0.1 : 0.1;
    players.forEach(player => {
      if (player !== kickoffPlayer) {
        const currentPos = player.position;
        const newX = this.kickoffTeamIsHome ? 
          Math.min(currentPos.x, -Math.abs(xOffset)) : 
          Math.max(currentPos.x, Math.abs(xOffset));
        player.position = new Position(newX, currentPos.y);
      }
    });
  }

  /**
   * Position the team not taking the kickoff
   */
  private positionNonKickoffTeam(players: Player[]): void {
    // All players must be behind center line and outside center circle on their side
    const xOffset = this.kickoffTeamIsHome ? 0.1 : -0.1;
    players.forEach(player => {
      const currentPos = player.position;
      // Ensure players are on correct side
      const newX = this.kickoffTeamIsHome ? 
        Math.max(currentPos.x, Math.abs(xOffset)) : 
        Math.min(currentPos.x, -Math.abs(xOffset));
      
      // Keep players outside center circle
      const distanceFromCenter = Math.sqrt(newX * newX + currentPos.y * currentPos.y);
      if (distanceFromCenter < KickoffManager.CENTER_CIRCLE_RADIUS) {
        // Move player outside circle
        const angle = Math.atan2(currentPos.y, newX);
        const newPos = new Position(
          Math.cos(angle) * (KickoffManager.CENTER_CIRCLE_RADIUS + 0.01),
          Math.sin(angle) * (KickoffManager.CENTER_CIRCLE_RADIUS + 0.01)
        );
        player.position = newPos;
      } else {
        player.position = new Position(newX, currentPos.y);
      }
    });
  }

  /**
   * Check if a player's position is valid during kickoff
   */
  isPositionValid(player: Player, isHomeTeam: boolean): boolean {
    if (this.hasKickoffStarted) return true;

    const pos = player.position;
    const isKickoffTeam = isHomeTeam === this.kickoffTeamIsHome;

    if (isKickoffTeam) {
      // Kickoff team must stay behind center line except for kickoff taker
      return pos.x <= 0 || this.isKickoffPosition(pos);
    } else {
      // Non-kickoff team must stay on their side and outside center circle
      const correctSide = this.kickoffTeamIsHome ? pos.x >= 0 : pos.x <= 0;
      const outsideCircle = Math.sqrt(pos.x * pos.x + pos.y * pos.y) >= KickoffManager.CENTER_CIRCLE_RADIUS;
      return correctSide && outsideCircle;
    }
  }

  /**
   * Start the kickoff when ball is first moved
   */
  startKickoff(): void {
    this.hasKickoffStarted = true;
  }

  /**
   * Check if kickoff has started
   */
  hasStarted(): boolean {
    return this.hasKickoffStarted;
  }

  /**
   * Check if position is the kickoff position
   */
  private isKickoffPosition(pos: Position): boolean {
    return pos.x === KickoffManager.KICKOFF_POSITION.x && pos.y === KickoffManager.KICKOFF_POSITION.y;
  }
} 