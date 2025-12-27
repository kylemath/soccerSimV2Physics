import { Match, MatchConfig } from '../models/Match';
import { Team } from '../models/Team';
import { Formation, FormationType } from '../models/Formation';
import { Position } from '../models/Position';
import { v4 as uuidv4 } from 'uuid';
import { PlayerRole } from '../models/Player';
import { Player } from '../models/Player';

/**
 * Simulation result with match data and statistics
 */
export interface SimulationResult {
  id: string;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  score: { home: number, away: number };
  possession: { home: number, away: number };
  shots: { home: number, away: number };
  shotsOnTarget: { home: number, away: number };
  passes: { home: number, away: number };
  fouls: { home: number, away: number };
  cards: { home: number, away: number };
  corners: { home: number, away: number };
  offsides: { home: number, away: number };
  date: string;
  duration: number;
}

/**
 * Service responsible for simulating matches and managing results
 */
export class SimulationService {
  private activeMatches: Map<string, Match>;
  private simulationResults: SimulationResult[];
  private animationFrameIds: Map<string, number>;
  
  constructor() {
    this.activeMatches = new Map();
    this.simulationResults = [];
    this.animationFrameIds = new Map();
  }
  
  /**
   * Create and set up a new match between two teams
   */
  createMatch(
    homeTeam: Team,
    awayTeam: Team,
    config: Partial<MatchConfig> = {}
  ): Match {
    const match = new Match(homeTeam, awayTeam, config);
    this.activeMatches.set(match.id, match);
    return match;
  }
  
  /**
   * Create a quick match with default teams
   */
  createQuickMatch(
    homeFormation: FormationType = FormationType.F_442,
    awayFormation: FormationType = FormationType.F_433,
    config: Partial<MatchConfig> = {}
  ): Match {
    // Create teams with formations and distinct colors
    const homeTeam = new Team(
      'Home Team',
      new Formation(homeFormation),
      '#3366CC', // Home team blue
      true // isHome
    );
    
    const awayTeam = new Team(
      'Away Team',
      new Formation(awayFormation),
      '#CC3366', // Away team red
      false // isHome
    );

    // Create default players for both teams
    const createDefaultPlayers = (team: Team, isHome: boolean) => {
      // Clear any existing players to prevent duplicates
      team.players = [];
      
      const positions = team.formation.getDefaultPositions();
      positions.forEach((value, index) => {
        const [position, role] = value;
        const player = Player.createRandomized(
          `Player ${index + 1}`,
          index + 1,
          position,
          role
        );

        // Calculate initial position, mirroring for away team
        const basePosX = position.x;
        const basePosY = position.y;
        
        // For away team: mirror X position (flip horizontally)
        const initialX = isHome ? basePosX : -basePosX;
        // Y position stays the same for both teams after 90-degree rotation
        const initialY = basePosY;
        
        // Set player's team context BEFORE setting positions
        player.setTeamContext(team.id, team.color);
        
        // Set positions after team context
        player.currentPosition = new Position(initialX, initialY);
        player.targetPosition = new Position(initialX, initialY);
        player.formationPosition = new Position(initialX, initialY);
        
        team.players.push(player);
      });
    };

    // Create players for each team
    createDefaultPlayers(homeTeam, true);
    createDefaultPlayers(awayTeam, false);
    
    // Create match with initial ball position at center and default duration
    const match = this.createMatch(homeTeam, awayTeam, {
      ...config,
      initialBallPosition: new Position(0, 0),
      duration: config.duration || 90 * 60 // 90 minutes in seconds
    });

    // Initialize match state
    match.resetPositions();
    
    // Initialize possession
    this.updateInitialPossession(match);
    
    return match;
  }
  
  /**
   * Initialize possession for a new match
   */
  private updateInitialPossession(match: Match): void {
    // Randomly decide which team starts with possession
    const homeTeamStarts = Math.random() > 0.5;
    
    if (homeTeamStarts) {
      match.homeTeam.inPossession = true;
      match.awayTeam.inPossession = false;
      const centerForward = match.homeTeam.players.find(p => p.role === PlayerRole.STRIKER);
      if (centerForward) {
        match.homeTeam.setDesignatedController(centerForward.id);
      }
    } else {
      match.homeTeam.inPossession = false;
      match.awayTeam.inPossession = true;
      const centerForward = match.awayTeam.players.find(p => p.role === PlayerRole.STRIKER);
      if (centerForward) {
        match.awayTeam.setDesignatedController(centerForward.id);
      }
    }
  }
  
  /**
   * Start a match simulation
   */
  startSimulation(matchId: string, callback?: (match: Match) => void): void {
    const match = this.activeMatches.get(matchId);
    
    if (!match) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    // Start the match
    match.start();
    
    let lastTime = performance.now();
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    // Create animation frame loop
    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;
      
      // Only update if enough time has passed for next frame
      if (elapsed >= frameInterval) {
        const deltaTime = elapsed / 1000; // Convert to seconds
        lastTime = currentTime;
        
        // Update match state with proper delta time scaling
        match.update(deltaTime);
        
        if (callback) {
          callback(match);
        }
      }
      
      if (match.isPlaying && !match.isPaused) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrameIds.set(matchId, frameId);
      } else if (!match.isPlaying) {
        // Match ended, save result
        this.saveSimulationResult(match);
      }
    };
    
    // Start animation loop
    const frameId = requestAnimationFrame(animate);
    this.animationFrameIds.set(matchId, frameId);
  }
  
  /**
   * Pause a running simulation
   */
  pauseSimulation(matchId: string): void {
    const match = this.activeMatches.get(matchId);
    
    if (!match) {
      return;
    }
    
    match.pause();
  }
  
  /**
   * Resume a paused simulation
   */
  resumeSimulation(matchId: string): void {
    const match = this.activeMatches.get(matchId);
    
    if (!match) {
      return;
    }
    
    match.resume();
  }
  
  /**
   * Stop a running simulation
   */
  stopSimulation(matchId: string): void {
    const match = this.activeMatches.get(matchId);
    const frameId = this.animationFrameIds.get(matchId);
    
    if (match) {
      match.stop();
    }
    
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrameIds.delete(matchId);
    }
    
    // Save the result if the match exists
    if (match) {
      this.saveSimulationResult(match);
    }
  }
  
  /**
   * Run a match simulation at maximum speed without UI updates
   */
  async runSimulationToCompletion(
    homeTeam: Team,
    awayTeam: Team,
    config: Partial<MatchConfig> = {}
  ): Promise<SimulationResult> {
    // Create match
    const match = this.createMatch(homeTeam, awayTeam, {
      ...config,
      duration: config.duration || 90 * 60 // Default 90 minutes
    });
    
    // Start match
    match.start();
    
    // Set high simulation speed
    match.simulationSpeed = 50; // 50x normal speed
    
    // Run simulation until match is complete
    while (match.isPlaying) {
      // Provide a fixed deltaTime for non-realtime simulation
      match.update(1 / 60); 
      
      // Add a small delay to avoid blocking the main thread completely
      if (match.time % 100 === 0) { // Every 100 simulation seconds
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Save and return result
    return this.saveSimulationResult(match);
  }
  
  /**
   * Run multiple simulations and compile statistics
   */
  async runMultipleSimulations(
    homeTeam: Team,
    awayTeam: Team,
    count: number,
    config: Partial<MatchConfig> = {}
  ): Promise<{
    homeWins: number,
    awayWins: number,
    draws: number,
    averageScore: { home: number, away: number },
    results: SimulationResult[]
  }> {
    const results: SimulationResult[] = [];
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let totalHomeGoals = 0;
    let totalAwayGoals = 0;
    
    // Run each simulation
    for (let i = 0; i < count; i++) {
      // Clone teams to avoid state persistence between simulations
      const homeTeamClone = this.cloneTeam(homeTeam);
      const awayTeamClone = this.cloneTeam(awayTeam);
      
      // Run simulation
      const result = await this.runSimulationToCompletion(
        homeTeamClone,
        awayTeamClone,
        config
      );
      
      // Collect statistics
      results.push(result);
      
      if (result.score.home > result.score.away) {
        homeWins++;
      } else if (result.score.home < result.score.away) {
        awayWins++;
      } else {
        draws++;
      }
      
      totalHomeGoals += result.score.home;
      totalAwayGoals += result.score.away;
    }
    
    // Calculate average score
    const averageScore = {
      home: totalHomeGoals / count,
      away: totalAwayGoals / count
    };
    
    return {
      homeWins,
      awayWins,
      draws,
      averageScore,
      results
    };
  }
  
  /**
   * Get a match by ID
   */
  getMatch(matchId: string): Match | undefined {
    return this.activeMatches.get(matchId);
  }
  
  /**
   * Get all simulation results
   */
  getSimulationResults(): SimulationResult[] {
    return [...this.simulationResults];
  }
  
  /**
   * Save simulation result
   */
  private saveSimulationResult(match: Match): SimulationResult {
    const result: SimulationResult = {
      id: uuidv4(),
      matchId: match.id,
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
      score: { ...match.stats.score },
      possession: { ...match.stats.possession },
      shots: { ...match.stats.shots },
      shotsOnTarget: { ...match.stats.shotsOnTarget },
      passes: { ...match.stats.passes },
      fouls: { ...match.stats.fouls },
      cards: { 
        home: match.stats.yellowCards.home + match.stats.redCards.home,
        away: match.stats.yellowCards.away + match.stats.redCards.away
      },
      corners: { ...match.stats.corners },
      offsides: { ...match.stats.offsides },
      date: new Date().toISOString(),
      duration: match.time
    };
    
    this.simulationResults.push(result);
    return result;
  }
  
  /**
   * Clone a team object deeply to prevent state sharing
   */
  private cloneTeam(team: Team): Team {
    // Use the Team's static fromJSON method for a reliable deep clone
    const teamJSON = team.toJSON();
    return Team.fromJSON(teamJSON);
  }
  
  /**
   * Clean up any resources used by the service
   * (e.g., stop any running simulations, clear intervals)
   */
  destroy(): void {
    // Stop all active simulations
    this.animationFrameIds.forEach((frameId, matchId) => {
      cancelAnimationFrame(frameId);
      const match = this.activeMatches.get(matchId);
      if (match && match.isPlaying) {
        match.stop();
      }
    });
    this.animationFrameIds.clear();
    this.activeMatches.clear();
    console.log('SimulationService destroyed');
  }
} 