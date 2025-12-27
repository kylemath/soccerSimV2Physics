import { Team } from './Team';
import { Ball } from './Ball';
import { Player, PlayerRole } from './Player';
import { Position } from './Position';
import { v4 as uuidv4 } from 'uuid';
import { KickoffManager } from './KickoffManager';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { TacticalManager } from './TacticalManager';

/**
 * Types of events that can occur in a match
 */
export enum MatchEventType {
  KICKOFF = 'KICKOFF',
  GOAL = 'GOAL',
  SHOT = 'SHOT',
  PASS = 'PASS',
  TACKLE = 'TACKLE',
  SAVE = 'SAVE',
  FOUL = 'FOUL',
  CARD = 'CARD',
  OFFSIDE = 'OFFSIDE',
  CORNER = 'CORNER',
  THROW_IN = 'THROW_IN',
  GOAL_KICK = 'GOAL_KICK',
  FREE_KICK = 'FREE_KICK',
  PENALTY = 'PENALTY',
  HALF_TIME = 'HALF_TIME',
  FULL_TIME = 'FULL_TIME'
}

/**
 * Represents an event that occurs during a match
 */
export interface MatchEvent {
  id: string;
  type: MatchEventType;
  time: number;              // Match time in seconds
  teamId: string | null;     // ID of the team involved
  playerId: string | null;   // ID of the player involved
  position: Position;        // Position on the field
  data?: any;                // Additional event data
}

/**
 * Match state snapshots for replay
 */
export interface MatchSnapshot {
  time: number;
  ballPosition: { x: number, y: number };
  ballVelocity: { x: number, y: number };
  homeTeamPlayers: Array<{
    id: string;
    position: { x: number, y: number };
    hasBall: boolean;
  }>;
  awayTeamPlayers: Array<{
    id: string;
    position: { x: number, y: number };
    hasBall: boolean;
  }>;
  score: { home: number, away: number };
  possession: { home: number, away: number };
}

/**
 * Match statistics
 */
export interface MatchStats {
  score: { home: number, away: number };
  possession: { home: number, away: number };
  shots: { home: number, away: number };
  shotsOnTarget: { home: number, away: number };
  passes: { home: number, away: number };
  passAccuracy: { home: number, away: number };
  tackles: { home: number, away: number };
  fouls: { home: number, away: number };
  yellowCards: { home: number, away: number };
  redCards: { home: number, away: number };
  corners: { home: number, away: number };
  offsides: { home: number, away: number };
}

/**
 * Match configuration options
 */
export interface MatchConfig {
  duration?: number;
  initialBallPosition?: Position;
  fieldWidth?: number;
  fieldHeight?: number;
}

interface PotentialAction {
  type: 'PASS' | 'SHOT';
  from: Position;
  to: Position;
  score: number;  // How good this action is (0-1)
  color: string;  // Line color for visualization
}

/**
 * Represents a soccer match between two teams
 */
export class Match {
  readonly id: string;
  readonly homeTeam: Team;
  readonly awayTeam: Team;
  readonly ball: Ball;
  readonly config: MatchConfig;
  
  // Match state
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _simulationSpeed: number = 1;
  private _elapsedTime: number = 0;
  
  // Clock and time control
  private _lastUpdateTime: number = 0;
  
  // Events and snapshots
  private _events: MatchEvent[] = [];
  private _snapshots: MatchSnapshot[] = [];
  
  // Statistics
  private _stats: MatchStats = {
    score: { home: 0, away: 0 },
    possession: { home: 0, away: 0 },
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    passes: { home: 0, away: 0 },
    passAccuracy: { home: 0, away: 0 },
    tackles: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 }
  };
  
  private ballController: Player | null = null;
  private ballControllerTeam: Team | null = null;
  private lastPassTime: number = 0;
  
  // Add new property to track potential actions
  private potentialActions: PotentialAction[] = [];
  
  private kickoffManager: KickoffManager;
  private homeTeamKickoff: boolean;
  
  // Add physics and tactical managers
  private physicsEngine: PhysicsEngine;
  private homeTacticalManager: TacticalManager;
  private awayTacticalManager: TacticalManager;
  
  constructor(homeTeam: Team, awayTeam: Team, config: Partial<MatchConfig> = {}) {
    this.id = uuidv4();
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.config = {
      duration: config.duration || 90 * 60, // 90 minutes in seconds
      initialBallPosition: config.initialBallPosition || new Position(0, 0),
      fieldWidth: config.fieldWidth || 2, // -1 to 1
      fieldHeight: config.fieldHeight || 2, // -1 to 1
    };
    this.ball = new Ball(this.config.initialBallPosition);
    
    // Initialize with home team taking first kickoff
    this.homeTeamKickoff = true;
    this.kickoffManager = new KickoffManager(this.homeTeamKickoff);
    
    // Set up initial kickoff
    this.setupKickoff();
    
    // Initialize physics engine
    this.physicsEngine = new PhysicsEngine();
    
    // Add ball physics
    this.physicsEngine.addObject(this.ball.simulation);
    
    // Add player physics
    this.homeTeam.players.forEach(player => {
      this.physicsEngine.addObject(player.simulation);
    });
    this.awayTeam.players.forEach(player => {
      this.physicsEngine.addObject(player.simulation);
    });
    
    // Initialize tactical managers
    this.homeTacticalManager = new TacticalManager(this.homeTeam);
    this.awayTacticalManager = new TacticalManager(this.awayTeam);
  }
  
  get isPlaying(): boolean {
    return this._isPlaying;
  }
  
  get isPaused(): boolean {
    return this._isPaused;
  }
  
  get simulationSpeed(): number {
    return this._simulationSpeed;
  }
  
  set simulationSpeed(value: number) {
    this._simulationSpeed = Math.max(0.1, Math.min(10, value));
  }
  
  get elapsedTime(): number {
    return this._elapsedTime;
  }
  
  get stats(): MatchStats {
    return this._stats;
  }
  
  // Add getter for potential actions
  get currentPotentialActions(): PotentialAction[] {
    return this.potentialActions;
  }
  
  /**
   * Start the match
   */
  start(): void {
    if (!this._isPlaying) {
      this._isPlaying = true;
      this._isPaused = false;
      this._lastUpdateTime = Date.now();
      this.resetPositions();
      this.updateInitialPossession();
      this.kickoffManager.startKickoff();
      this.createEvent(MatchEventType.KICKOFF, 
                       this.ballControllerTeam === this.homeTeam ? this.homeTeam.id : this.awayTeam.id, 
                       this.ballController?.id);
    }
  }
  
  /**
   * Pause the match
   */
  pause(): void {
    if (this._isPlaying && !this._isPaused) {
      this._isPaused = true;
    }
  }
  
  /**
   * Resume the match
   */
  resume(): void {
    if (this._isPlaying && this._isPaused) {
      this._isPaused = false;
      this._lastUpdateTime = Date.now();
    }
  }
  
  /**
   * Stop the match
   */
  stop(): void {
    if (this._isPlaying) {
      this._isPlaying = false;
      this._isPaused = false;
      this.createEvent(MatchEventType.FULL_TIME, null, null);
    }
  }
  
  /**
   * Update the match simulation
   */
  update(deltaTime: number): void {
    if (!this._isPlaying || this._isPaused) return;
    
    // Scale deltaTime by simulation speed
    const scaledDelta = deltaTime * this._simulationSpeed;
    
    // Update tactical positioning
    this.homeTacticalManager.update(
      this.ball.position,
      this.ballControllerTeam === this.homeTeam
    );
    
    this.awayTacticalManager.update(
      this.ball.position,
      this.ballControllerTeam === this.awayTeam
    );
    
    // Update physics first
    this.physicsEngine.update(scaledDelta);
    
    // Then update visual representations
    if (!this.ballController) {
      this.ball.update(scaledDelta);
    } else {
      // Update ball position based on controller
      this.updateBallWithController();
    }
    
    // Update teams
    this.homeTeam.update(scaledDelta, this.ball.position, this.ballControllerTeam === this.homeTeam);
    this.awayTeam.update(scaledDelta, this.ball.position, this.ballControllerTeam === this.awayTeam);
    
    // Handle ball control and actions
    this.handleBallControlAndActions(scaledDelta);
    
    // Update match state
    this._elapsedTime += scaledDelta;
    this.checkForEvents();
    this.updateStats();
    this.createSnapshot();
  }
  
  private handleBallControlAndActions(deltaTime: number): void {
    const BALL_CONTROL_RADIUS = 0.1;
    const TACKLE_RADIUS = 0.08;
    const PASS_COOLDOWN = 0.5; // Reduced from 1.0 to encourage more frequent passing
    const SHOOTING_DISTANCE = 0.6;
    const MAX_PASS_DISTANCE = 0.8;
    
    // Clear previous potential actions
    this.potentialActions = [];
    
    const allPlayers = [...this.homeTeam.players, ...this.awayTeam.players];
    const playerDistances = allPlayers.map(player => ({
      player,
      distance: player.currentPosition.distanceTo(this.ball.position)
    }));
    
    playerDistances.sort((a, b) => a.distance - b.distance);
    const closestPlayerInfo = playerDistances[0];
    const secondClosestInfo = playerDistances[1];
    
    if (!closestPlayerInfo) return;
    
    const closestPlayer = closestPlayerInfo.player;
    const closestDistance = closestPlayerInfo.distance;
    
    // If ball is loose (no controller) and closest player is near
    if (!this.ballController && closestDistance < BALL_CONTROL_RADIUS) {
      this.giveBallToPlayer(closestPlayer);
    }
    // If a player has the ball
    else if (this.ballController) {
      const controllerDistance = this.ballController.currentPosition.distanceTo(this.ball.position);
      
      // Check if controller lost the ball due to distance
      if (controllerDistance > BALL_CONTROL_RADIUS * 1.5) {
        this.releaseBall();
        return;
      }
      
      // Check for tackle attempts by nearby opponents
      const nearbyOpponents = playerDistances
        .filter(info => info.player.teamId !== this.ballController!.teamId && 
                       info.distance < TACKLE_RADIUS)
        .sort((a, b) => a.distance - b.distance);
      
      if (nearbyOpponents.length > 0) {
        const tackler = nearbyOpponents[0].player;
        
        // Calculate base tackle success chance
        const baseTackleChance = (tackler.attributes.tackling / 100) * 0.5;
        
        // Strength comparison factor
        const strengthFactor = (tackler.attributes.strength / this.ballController.attributes.strength);
        
        // Dribbling defense factor
        const dribblingFactor = 1 - (this.ballController.attributes.dribbling / 150);
        
        // Calculate different outcome probabilities
        const knockAwayChance = baseTackleChance * strengthFactor * dribblingFactor;
        const takeControlChance = knockAwayChance * 0.7; // 70% of knock away chance
        
        const random = Math.random();
        
        if (random < takeControlChance) {
          // Successful tackle with possession
          this.createEvent(MatchEventType.TACKLE, tackler.teamId, tackler.id);
          this.giveBallToPlayer(tackler);
          return;
        } else if (random < knockAwayChance) {
          // Successful tackle without possession (knock away)
          this.createEvent(MatchEventType.TACKLE, tackler.teamId, tackler.id);
          this.releaseBall();
          // Add some random velocity to the ball
          const randomAngle = Math.random() * Math.PI * 2;
          const knockPower = 0.2 + Math.random() * 0.3;
          this.ball.velocity = new Position(
            Math.cos(randomAngle) * knockPower,
            Math.sin(randomAngle) * knockPower
          );
          return;
        }
      }
      
      // Update ball position to follow controller with slight lag
      const lerpFactor = 0.8;
      this.ball.position = this.ball.position.lerp(this.ballController.currentPosition, lerpFactor);
      this.ball.velocity = this.ballController.velocity.clone();
      
      // Calculate and show potential actions
      const controllerTeam = this.ballController.teamId === this.homeTeam.id ? this.homeTeam : this.awayTeam;
      const isHomeTeam = controllerTeam === this.homeTeam;
      const goalX = isHomeTeam ? 1 : -1;
      
      // Show shot opportunity if close to goal
      const distanceToGoal = Math.abs(this.ballController.currentPosition.x - goalX);
      if (distanceToGoal < SHOOTING_DISTANCE * 1.5) {
        const shotQuality = 1 - (distanceToGoal / (SHOOTING_DISTANCE * 1.5));
        this.potentialActions.push({
          type: 'SHOT',
          from: this.ballController.currentPosition.clone(),
          to: new Position(goalX, 0),
          score: shotQuality,
          color: '#FF0000'  // Red for shots
        });
      }
      
      // Show passing opportunities
      const teammates = controllerTeam.players.filter(p => p !== this.ballController);
      teammates.forEach(teammate => {
        const passDistance = this.ballController!.currentPosition.distanceTo(teammate.currentPosition);
        if (passDistance <= MAX_PASS_DISTANCE) {
          const passQuality = this.evaluatePassingOption(this.ballController!, teammate);
          if (passQuality > 0.2) { // Only show reasonable passing options
            this.potentialActions.push({
              type: 'PASS',
              from: this.ballController!.currentPosition.clone(),
              to: teammate.currentPosition.clone(),
              score: passQuality,
              color: '#00FF00'  // Green for passes
            });
          }
        }
      });
      
      // Attempt shot if close to goal and in a good position
      if (distanceToGoal < SHOOTING_DISTANCE && 
          Math.abs(this.ballController.currentPosition.y) < 0.5 &&
          Math.random() < this.ballController.attributes.decisions / 100) { // Increased shooting probability
        this.attemptShot(this.ballController, goalX);
        return;
      }
      
      // Consider passing if enough time has elapsed
      if (this._elapsedTime - this.lastPassTime > PASS_COOLDOWN) {
        // Increase pass probability when under pressure or good options available
        const underPressure = nearbyOpponents.length > 0;
        const passThreshold = underPressure ? 0.3 : 0.4; // Lower thresholds to encourage more passing
        
        if (this.attemptPass(this.ballController, this.ballControllerTeam!, passThreshold)) {
          this.lastPassTime = this._elapsedTime;
          return;
        }
      }
    }
  }

  private releaseBall(): void {
    if (this.ballController) {
      // Add some randomization to ball velocity when released
      const randomVelocity = new Position(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      this.ball.velocity = this.ballController.velocity.add(randomVelocity);
      
      this.ballController.hasBall = false;
      this.ballController.isDesignatedController = false;
      this.ballController = null;
      this.ballControllerTeam = null;
      this.ball.isControlled = false;
      this.ball.controllingPlayerId = null;
    }
  }
  
  private giveBallToPlayer(player: Player): void {
    if (this.ballController && this.ballController !== player) {
        this.releaseBall();
    }
    
    this.ballController = player;
    this.ballControllerTeam = player.teamId === this.homeTeam.id ? this.homeTeam : this.awayTeam;
    player.hasBall = true;
    player.isDesignatedController = true;
    this.ball.isControlled = true; 
    this.ball.controllingPlayerId = player.id;

    this.homeTeam.inPossession = player.teamId === this.homeTeam.id;
    this.awayTeam.inPossession = player.teamId === this.awayTeam.id;

    this.ballControllerTeam.players.forEach(p => {
      if (p !== player) {
        p.isDesignatedController = false;
      }
    });
    const opposingTeam = this.ballControllerTeam === this.homeTeam ? this.awayTeam : this.homeTeam;
    opposingTeam.players.forEach(p => { p.isDesignatedController = false; });
  }

  private attemptShot(player: Player, goalX: number): void {
    const shootingPower = 0.5 + (player.attributes.shooting / 100) * 0.5;
    const accuracy = player.attributes.shooting / 100;
    
    const targetY = (Math.random() - 0.5) * 0.4;
    const target = new Position(goalX, targetY);
    
    const randomization = new Position(
      (Math.random() - 0.5) * (1 - accuracy) * 0.2,
      (Math.random() - 0.5) * (1 - accuracy) * 0.4
    );
    target.add(randomization);
    
    const direction = target.subtract(this.ball.position).normalize();
    const shotVelocity = direction.multiply(shootingPower);
    
    this.releaseBall();
    this.ball.kick(direction, shootingPower);
    this.lastPassTime = this._elapsedTime;

    const team = player.teamId === this.homeTeam.id ? this.homeTeam : this.awayTeam;
    if (team === this.homeTeam) {
      this._stats.shots.home++;
    } else {
      this._stats.shots.away++;
    }
  }

  private attemptPass(player: Player, team: Team, threshold: number = 0.5): boolean {
    // Find teammates in good positions
    const teammates = team.players
      .filter(p => p !== player)
      .map(p => ({
        player: p,
        score: this.evaluatePassingOption(player, p)
      }))
      .sort((a, b) => b.score - a.score);

    if (teammates.length > 0 && teammates[0].score > threshold) {
      const target = teammates[0].player;
      const passPower = 0.3 + (player.attributes.passing / 100) * 0.3;
      const accuracy = player.attributes.passing / 100;
      
      // Calculate pass direction with error based on accuracy
      const direction = target.currentPosition.subtract(player.currentPosition);
      const randomization = new Position(
        (Math.random() - 0.5) * (1 - accuracy) * 0.2,
        (Math.random() - 0.5) * (1 - accuracy) * 0.2
      );
      direction.add(randomization).normalize();
      
      // Release ball and apply pass velocity
      this.releaseBall();
      this.ball.kick(direction, passPower);
      
      // Make target player the designated controller to receive the pass
      target.isDesignatedController = true;
      
      // Create pass event and update stats
      this.createEvent(MatchEventType.PASS, team.id, player.id);
      if (team === this.homeTeam) {
        this._stats.passes.home++;
      } else {
        this._stats.passes.away++;
      }
      
      return true;
    }
    return false;
  }

  private evaluatePassingOption(passer: Player, target: Player): number {
    const passDistance = passer.currentPosition.distanceTo(target.currentPosition);
    const MAX_PASS_DISTANCE = 0.8;
    
    // Base score on distance (closer is better, but not too close)
    let score = 1 - (passDistance / MAX_PASS_DISTANCE);
    
    // Evaluate space around the target
    const spaceScore = this.evaluateSpace(passer.currentPosition, target.currentPosition);
    
    // Consider if pass moves ball forward
    const isHomeTeam = passer.teamId === this.homeTeam.id;
    const forwardDirection = isHomeTeam ? 1 : -1;
    const progressScore = (target.currentPosition.x - passer.currentPosition.x) * forwardDirection;
    
    // Weight the components
    score = score * 0.3 + // Distance factor
            spaceScore * 0.4 + // Space factor
            Math.max(0, progressScore) * 0.3; // Forward progress factor
    
    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  private evaluateSpace(from: Position, to: Position): number {
    const opponents = [...this.homeTeam.players, ...this.awayTeam.players]
      .filter(p => p.teamId !== this.homeTeam.id);
    
    let clearest = 1.0;
    
    opponents.forEach(opponent => {
      const distToPath = this.pointToLineDistance(
        opponent.currentPosition,
        from,
        to
      );
      clearest = Math.min(clearest, distToPath);
    });
    
    return clearest;
  }

  private pointToLineDistance(point: Position, lineStart: Position, lineEnd: Position): number {
    const L2 = lineStart.distanceToSquared(lineEnd);
    if (L2 === 0) return point.distanceTo(lineStart);
    
    let t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
            (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / L2;
    t = Math.max(0, Math.min(1, t));
    
    const projection = new Position(
      lineStart.x + t * (lineEnd.x - lineStart.x),
      lineStart.y + t * (lineEnd.y - lineStart.y)
    );
    
    return point.distanceTo(projection);
  }
  
  private updateStats(): void {
    const possessionUpdateRate = 0.1;
    if (this.homeTeam.inPossession) {
      this._stats.possession.home += (1 - this._stats.possession.home) * possessionUpdateRate;
      this._stats.possession.away = 1 - this._stats.possession.home;
    } else if (this.awayTeam.inPossession) {
      this._stats.possession.away += (1 - this._stats.possession.away) * possessionUpdateRate;
      this._stats.possession.home = 1 - this._stats.possession.away;
    }
  }
  
  private checkForEvents(): void {
    const goalWidth = 0.2;
    const goalHeight = 0.4;

    if (this.ball.position.x <= -1 && 
        Math.abs(this.ball.position.y) < goalHeight/2) {
      this._stats.score.away++;
      this.createEvent(MatchEventType.GOAL, this.awayTeam.id, null);
      this.resetAfterGoal(true);
    } else if (this.ball.position.x >= 1 && 
               Math.abs(this.ball.position.y) < goalHeight/2) {
      this._stats.score.home++;
      this.createEvent(MatchEventType.GOAL, this.homeTeam.id, null);
      this.resetAfterGoal(false);
    }
    
    if (Math.abs(this.ball.position.x) > 1 || Math.abs(this.ball.position.y) > 1) {
      this.handleOutOfBounds();
    }
  }
  
  private handleOutOfBounds(): void {
    if (Math.abs(this.ball.position.x) > 1) {
      if (Math.abs(this.ball.position.y) < 0.4) {
        const isGoalKick = this.ball.position.x > 0 ? 
          this.ball.velocity.x > 0 : this.ball.velocity.x < 0;
        
        if (isGoalKick) {
          this.createEvent(MatchEventType.GOAL_KICK, 
            this.ball.position.x > 0 ? this.awayTeam.id : this.homeTeam.id, 
            null);
        } else {
          this.createEvent(MatchEventType.CORNER, 
            this.ball.position.x > 0 ? this.homeTeam.id : this.awayTeam.id, 
            null);
        }
      }
    } else {
      this.createEvent(MatchEventType.THROW_IN, 
        this.ball.position.y > 0 ? this.homeTeam.id : this.awayTeam.id, 
        null);
    }

    this.resetBallPosition();
  }
  
  private resetAfterGoal(awayTeamScored: boolean): void {
    this.resetPositions();
    this.updateInitialPossession();
  }
  
  private resetBallPosition(): void {
    const margin = 0.05;
    
    this.ball.position = new Position(
      Math.min(1 - margin, Math.max(-1 + margin, this.ball.position.x)),
      Math.min(1 - margin, Math.max(-1 + margin, this.ball.position.y))
    );
    
    this.ball.velocity = new Position(0, 0);
  }
  
  private createEvent(
    type: MatchEventType,
    teamId: string | null = null,
    playerId: string | null = null,
    data: any = {}
  ): void {
    const event: MatchEvent = {
      id: uuidv4(),
      type,
      time: this._elapsedTime,
      teamId,
      playerId,
      position: this.ball.position.clone(),
      data
    };
    
    this._events.push(event);
    
    switch (type) {
      case MatchEventType.GOAL:
        break;
      case MatchEventType.FULL_TIME:
        break;
      default:
        break;
    }
    
    console.log(`Match event: ${type} at ${Math.floor(this._elapsedTime / 60)}:${Math.floor(this._elapsedTime % 60)}`);
  }
  
  private createSnapshot(): void {
    const snapshot: MatchSnapshot = {
      time: this._elapsedTime,
      ballPosition: { x: this.ball.position.x, y: this.ball.position.y },
      ballVelocity: { x: this.ball.velocity.x, y: this.ball.velocity.y },
      homeTeamPlayers: this.homeTeam.players.map(player => ({
        id: player.id,
        position: { x: player.currentPosition.x, y: player.currentPosition.y },
        hasBall: player.hasBall
      })),
      awayTeamPlayers: this.awayTeam.players.map(player => ({
        id: player.id,
        position: { x: player.currentPosition.x, y: player.currentPosition.y },
        hasBall: player.hasBall
      })),
      score: { ...this._stats.score },
      possession: { ...this._stats.possession }
    };
    
    this._snapshots.push(snapshot);
    
    const maxSnapshots = 10000;
    if (this._snapshots.length > maxSnapshots) {
      this._snapshots.shift();
    }
  }
  
  toJSON(): any {
    return {
      id: this.id,
      time: this._elapsedTime,
      homeTeam: this.homeTeam.toJSON(),
      awayTeam: this.awayTeam.toJSON(),
      ball: {
        position: { x: this.ball.position.x, y: this.ball.position.y },
        velocity: { x: this.ball.velocity.x, y: this.ball.velocity.y },
        rotation: { x: this.ball.rotation.x, y: this.ball.rotation.y },
        isControlled: this.ball.isControlled,
        controllingPlayerId: this.ball.controllingPlayerId
      },
      config: { ...this.config },
      stats: { ...this._stats },
      events: this._events.map(event => ({
        id: event.id,
        type: event.type,
        time: event.time,
        teamId: event.teamId,
        playerId: event.playerId,
        position: { x: event.position.x, y: event.position.y },
        data: event.data
      })),
      snapshots: this._snapshots.slice(-10)
    };
  }
  
  static fromJSON(json: any): Match {
    const homeTeam = Team.fromJSON(json.homeTeam);
    const awayTeam = Team.fromJSON(json.awayTeam);
    
    const match = new Match(homeTeam, awayTeam, json.config);
    
    match._elapsedTime = json.time;
    
    match.ball.position = new Position(json.ball.position.x, json.ball.position.y);
    match.ball.velocity = new Position(json.ball.velocity.x, json.ball.velocity.y);
    match.ball.rotation = new Position(json.ball.rotation.x, json.ball.rotation.y);
    match.ball.isControlled = json.ball.isControlled;
    match.ball.controllingPlayerId = json.ball.controllingPlayerId;
    
    match._stats = { ...json.stats };
    
    match._events = json.events.map((eventData: any) => ({
      id: eventData.id,
      type: eventData.type,
      time: eventData.time,
      teamId: eventData.teamId,
      playerId: eventData.playerId,
      position: new Position(eventData.position.x, eventData.position.y),
      data: eventData.data
    }));
    
    match._snapshots = json.snapshots.map((snapshotData: any) => ({
      time: snapshotData.time,
      ballPosition: snapshotData.ballPosition,
      ballVelocity: snapshotData.ballVelocity,
      homeTeamPlayers: snapshotData.homeTeamPlayers,
      awayTeamPlayers: snapshotData.awayTeamPlayers,
      score: snapshotData.score,
      possession: snapshotData.possession
    }));
    
    return match;
  }

  get time(): number {
    return this._elapsedTime;
  }

  private updateInitialPossession(): void {
    const homeTeamStarts = Math.random() > 0.5;
    const startingTeam = homeTeamStarts ? this.homeTeam : this.awayTeam;
    const startingPlayer = startingTeam.players.find(p => p.role === PlayerRole.STRIKER) || startingTeam.players[0];
    
    if (startingPlayer) {
        this.giveBallToPlayer(startingPlayer);
    } else {
        this.homeTeam.inPossession = false;
        this.awayTeam.inPossession = false;
    }
  }

  /**
   * Reset all player positions and ball state
   */
  resetPositions(): void {
    // Reset ball to center
    this.ball.position = new Position(0, 0);
    this.ball.velocity = new Position(0, 0);
    this.ball.isControlled = false;
    this.ball.controllingPlayerId = null;
    
    // Only enforce kickoff positions if the game hasn't started yet
    const isInitialKickoff = !this._isPlaying;
    
    // Reset home team to their side
    this.homeTeam.players.forEach(player => {
      const formationPos = player.formationPosition.clone();
      
      if (isInitialKickoff) {
        // Apply kickoff restrictions only during initial kickoff
        if (this.kickoffManager.isKickingOff(this.homeTeam)) {
          // If this team is kicking off, position strikers behind center line
          if (player.role === PlayerRole.STRIKER) {
            formationPos.x = Math.min(formationPos.x, -0.05); // Slightly behind center
          } else {
            formationPos.x = Math.min(formationPos.x, -0.1); // Other players further back
          }
        } else {
          // If defending, stay in own half
          formationPos.x = Math.min(formationPos.x, -0.1);
        }
      }
      
      player.currentPosition = formationPos;
      player.targetPosition = formationPos.clone();
    });

    // Reset away team to their side
    this.awayTeam.players.forEach(player => {
      const formationPos = player.formationPosition.clone();
      formationPos.x = -formationPos.x; // Mirror X position
      
      if (isInitialKickoff) {
        // Apply kickoff restrictions only during initial kickoff
        if (this.kickoffManager.isKickingOff(this.awayTeam)) {
          // If this team is kicking off, position strikers behind center line
          if (player.role === PlayerRole.STRIKER) {
            formationPos.x = Math.max(formationPos.x, 0.05); // Slightly behind center
          } else {
            formationPos.x = Math.max(formationPos.x, 0.1); // Other players further back
          }
        } else {
          // If defending, stay in own half
          formationPos.x = Math.max(formationPos.x, 0.1);
        }
      }
      
      player.currentPosition = formationPos;
      player.targetPosition = formationPos.clone();
    });

    // Set up initial ball controller for kickoff
    if (isInitialKickoff) {
      const kickoffTeam = this.kickoffManager.isKickingOff(this.homeTeam) ? this.homeTeam : this.awayTeam;
      const striker = kickoffTeam.players.find(p => p.role === PlayerRole.STRIKER);
      if (striker) {
        this.ball.isControlled = true;
        this.ball.controllingPlayerId = striker.id;
        kickoffTeam.setDesignatedController(striker.id);
        kickoffTeam.inPossession = true;
        
        // Position the striker right behind the ball
        const kickoffPos = new Position(
          this.kickoffManager.isKickingOff(this.homeTeam) ? -0.05 : 0.05,
          0
        );
        striker.currentPosition = kickoffPos;
        striker.targetPosition = kickoffPos.clone();
      }
    }
  }

  /**
   * Set up kickoff positions
   */
  private setupKickoff(): void {
    this.kickoffManager.setupKickoff(this.homeTeam.players, this.awayTeam.players, this.ball);
  }

  /**
   * Update ball position when it's being controlled by a player
   */
  private updateBallWithController(): void {
    if (!this.ballController) return;
    
    // Position ball slightly in front of the controlling player
    const playerDirection = this.ballController.velocity.length() > 0.001 ?
      this.ballController.velocity.normalize() :
      new Position(this.ballControllerTeam === this.homeTeam ? 1 : -1, 0);
    
    const ballOffset = playerDirection.multiply(0.03); // Ball stays slightly ahead of player
    this.ball.position = this.ballController.currentPosition.add(ballOffset);
    
    // Match ball velocity to player
    this.ball.velocity = this.ballController.velocity.clone();
    
    // Update ball simulation position
    this.ball.simulation.position = this.ball.position.clone();
    this.ball.simulation.velocity = this.ball.velocity.clone();
  }
} 