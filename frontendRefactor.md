# Soccer Simulation Frontend Refactoring Plan

## Current Issues

- Players are lining up at the half line and snapping back to their positions
- Movement lacks physics-based properties like momentum, acceleration and inertia
- Collision detection and resolution is simplistic
- Players follow rigid formation positions rather than adapting to game situations

## Conceptual Solution: Separate Physics from Visual Representation

Drawing from game development principles, we need to separate:
1. **Simulation Objects**: Handle physics and game logic (invisible)
2. **Character Entities**: Visual representation of players on screen

This separation allows for smooth visual movement while maintaining proper physics.

## Implementation Steps

### Step 1: Create Physics Engine Module

Create a new file `src/physics/PhysicsEngine.ts` to handle all physics calculations:

```typescript
import { Position } from '../models/Position';

export interface PhysicsObject {
  position: Position;
  velocity: Position;
  acceleration: Position;
  mass: number;
  update(deltaTime: number): void;
}

export class PhysicsEngine {
  private objects: PhysicsObject[] = [];
  
  addObject(object: PhysicsObject): void {
    this.objects.push(object);
  }
  
  removeObject(object: PhysicsObject): void {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }
  
  update(deltaTime: number): void {
    this.objects.forEach(obj => obj.update(deltaTime));
    this.resolveCollisions();
  }
  
  private resolveCollisions(): void {
    // Simple collision detection for now
    // Check each pair of objects
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const objA = this.objects[i];
        const objB = this.objects[j];
        
        // Simple distance check
        const distance = objA.position.distanceTo(objB.position);
        const minDistance = 0.05; // Minimum separation distance
        
        if (distance < minDistance) {
          // Objects are colliding, calculate separation vector
          const separation = objA.position.subtract(objB.position);
          const normalizedSeparation = separation.normalize();
          const overlap = minDistance - distance;
          
          // Push objects apart based on mass (heavier objects move less)
          const totalMass = objA.mass + objB.mass;
          const ratioA = objB.mass / totalMass;
          const ratioB = objA.mass / totalMass;
          
          // Apply displacement
          objA.position = objA.position.add(normalizedSeparation.multiply(overlap * ratioA));
          objB.position = objB.position.add(normalizedSeparation.multiply(-overlap * ratioB));
          
          // Modify velocities for bouncing effect
          const relativeVelocity = objA.velocity.subtract(objB.velocity);
          const velocityAlongNormal = relativeVelocity.dot(normalizedSeparation);
          
          // Only separate if objects are moving toward each other
          if (velocityAlongNormal < 0) {
            const restitution = 0.3; // Bounciness factor
            const impulseScalar = -(1 + restitution) * velocityAlongNormal / totalMass;
            
            objA.velocity = objA.velocity.add(normalizedSeparation.multiply(impulseScalar * objB.mass));
            objB.velocity = objB.velocity.add(normalizedSeparation.multiply(-impulseScalar * objA.mass));
          }
        }
      }
    }
  }
}
```

### Step 2: Implement Player Simulation Object

Create `src/physics/PlayerSimulation.ts` for physics-based player movement:

```typescript
import { Position } from '../models/Position';
import { PhysicsObject } from './PhysicsEngine';

export class PlayerSimulation implements PhysicsObject {
  position: Position;
  velocity: Position = new Position(0, 0);
  acceleration: Position = new Position(0, 0);
  mass: number = 70; // kg
  
  // Movement parameters
  maxSpeed: number = 0.05;
  maxAcceleration: number = 0.01;
  friction: number = 0.1;
  
  constructor(initialPosition: Position) {
    this.position = initialPosition.clone();
  }
  
  applyForce(force: Position): void {
    // F = ma, so a = F/m
    const accelerationChange = force.multiply(1/this.mass);
    this.acceleration = this.acceleration.add(accelerationChange);
  }
  
  moveTo(targetPosition: Position, strength: number): void {
    // Calculate desired velocity
    const desired = targetPosition.subtract(this.position);
    const distance = desired.length();
    
    // Variable speed based on distance
    let targetSpeed = this.maxSpeed;
    if (distance < 0.1) {
      targetSpeed = this.maxSpeed * (distance / 0.1);
    }
    
    // If desired is zero length, skip steering calculation
    if (distance < 0.001) {
      return;
    }
    
    const desiredVelocity = desired.normalize().multiply(targetSpeed);
    
    // Calculate steering force
    const steeringForce = desiredVelocity.subtract(this.velocity).multiply(strength);
    this.applyForce(steeringForce);
  }
  
  update(deltaTime: number): void {
    // Apply friction
    this.velocity = this.velocity.multiply(1 - this.friction * deltaTime);
    
    // Update velocity
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    
    // Limit velocity
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
    }
    
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    
    // Reset acceleration
    this.acceleration = new Position(0, 0);
  }
}
```

### Step 3: Create Ball Simulation

Create `src/physics/BallSimulation.ts` for better ball physics:

```typescript
import { Position } from '../models/Position';
import { PhysicsObject } from './PhysicsEngine';

export class BallSimulation implements PhysicsObject {
  position: Position;
  velocity: Position = new Position(0, 0);
  acceleration: Position = new Position(0, 0);
  mass: number = 0.45; // kg - regulation soccer ball
  
  // Ball parameters
  airResistance: number = 0.03;
  groundFriction: number = 0.08;
  bounciness: number = 0.7; // Coefficient of restitution
  maxSpeed: number = 0.15; // Faster than players
  
  constructor(initialPosition: Position) {
    this.position = initialPosition.clone();
  }
  
  applyForce(force: Position): void {
    const accelerationChange = force.multiply(1/this.mass);
    this.acceleration = this.acceleration.add(accelerationChange);
  }
  
  kick(direction: Position, power: number): void {
    // Reset current velocity and apply kick force
    const kickForce = direction.normalize().multiply(power);
    this.velocity = kickForce.multiply(1/this.mass);
  }
  
  update(deltaTime: number): void {
    // Apply air resistance
    this.velocity = this.velocity.multiply(1 - this.airResistance * deltaTime);
    
    // Apply ground friction (higher than air resistance)
    this.velocity = this.velocity.multiply(1 - this.groundFriction * deltaTime);
    
    // Update velocity
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    
    // Limit velocity
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
    }
    
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    
    // Reset acceleration
    this.acceleration = new Position(0, 0);
  }
}
```

### Step 4: Create Movement Controller

Create `src/physics/MovementController.ts` to handle player movement logic:

```typescript
import { Position } from '../models/Position';
import { PlayerSimulation } from './PlayerSimulation';
import { Player } from '../models/Player';

export class MovementController {
  private player: Player;
  private simulation: PlayerSimulation;
  
  // Movement weights
  private formationWeight: number = 0.6;
  private ballWeight: number = 0.4;
  private CHASE_THRESHOLD: number = 0.3;
  
  constructor(player: Player, simulation: PlayerSimulation) {
    this.player = player;
    this.simulation = simulation;
  }
  
  update(deltaTime: number, ballPosition: Position): void {
    // Calculate formation influence
    const formationInfluence = this.calculateFormationInfluence();
    
    // Calculate ball influence
    const ballInfluence = this.calculateBallInfluence(ballPosition);
    
    // Calculate final target
    const targetPosition = formationInfluence.multiply(this.formationWeight)
      .add(ballInfluence.multiply(this.ballWeight));
    
    // Apply movement
    this.simulation.moveTo(targetPosition, 1.0);
    
    // Update simulation
    this.simulation.update(deltaTime);
    
    // Update visual position with adjustment/smoothing
    this.updatePlayerPosition(deltaTime);
  }
  
  private calculateFormationInfluence(): Position {
    return this.player.targetPosition.clone();
  }
  
  private calculateBallInfluence(ballPosition: Position): Position {
    const distanceToBall = this.player.currentPosition.distanceTo(ballPosition);
    
    if (distanceToBall < this.CHASE_THRESHOLD || this.player.isDesignatedController) {
      return ballPosition.clone();
    }
    
    return this.player.targetPosition.clone();
  }
  
  private updatePlayerPosition(deltaTime: number): void {
    // Smoothly move visual position toward simulation position using damped adjustment
    // From theorangeduck.com - this creates a better looking visual result
    const diff = this.simulation.position.subtract(this.player.currentPosition);
    const halflife = 0.1; // Adjust this value to control smoothness
    const adjustmentFactor = 1.0 - Math.exp(-deltaTime * (0.69314718056 / halflife));
    
    // Apply adjustment to player's visual position
    const adjustment = diff.multiply(adjustmentFactor);
    this.player.currentPosition = this.player.currentPosition.add(adjustment);
  }
  
  // Allow adjusting the weights dynamically
  setWeights(formationWeight: number, ballWeight: number): void {
    this.formationWeight = formationWeight;
    this.ballWeight = ballWeight;
  }
}
```

### Step 5: Create Tactical Manager

Create `src/models/TacticalManager.ts` for better team positioning:

```typescript
import { Position } from './Position';
import { Player, PlayerRole } from './Player';
import { Team } from './Team';

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
    // For home team (left to right): 0 = our goal, 1 = opponent goal
    // For away team (right to left): 1 = our goal, 0 = opponent goal
    const fieldProgress = this.team.isHome ? 
      (this.ballPosition.x + 1) / 2 :
      1 - (this.ballPosition.x + 1) / 2;
    
    // Line height adjusts based on possession and field position
    const lineHeightModifier = this.hasPossession ? 0.2 : -0.1;
    const fieldProgressInfluence = this.hasPossession ? fieldProgress * 0.3 : fieldProgress * 0.5;
    
    const defensiveHeight = this.defensiveLineHeight + lineHeightModifier + fieldProgressInfluence;
    const attackingHeight = this.attackingLineHeight + lineHeightModifier + (fieldProgressInfluence * 0.5);
    
    // Update each player's target position
    this.team.players.forEach(player => {
      const formationPos = player.formationPosition.clone();
      
      // Flip X for away team
      const baseX = this.team.isHome ? formationPos.x : -formationPos.x;
      let targetX = baseX;
      
      // Adjust X position based on role and game state
      switch(player.role) {
        case PlayerRole.GOALKEEPER:
          // Goalkeepers stay back but come forward slightly when team is attacking
          targetX = this.team.isHome ? 
            -0.9 + (this.hasPossession ? 0.1 : 0) :
            0.9 - (this.hasPossession ? 0.1 : 0);
          break;
          
        case PlayerRole.DEFENDER:
          // Defenders form a line that moves up and down based on possession
          targetX = this.team.isHome ?
            -0.6 + (defensiveHeight * 0.8) :
            0.6 - (defensiveHeight * 0.8);
          break;
          
        case PlayerRole.MIDFIELDER:
          // Midfielders position themselves based on ball position
          targetX = this.team.isHome ?
            -0.3 + (fieldProgress * 0.6) :
            0.3 - (fieldProgress * 0.6);
          break;
          
        case PlayerRole.STRIKER:
          // Strikers push high up the field when in possession
          targetX = this.team.isHome ?
            0.1 + (attackingHeight * 0.6) :
            -0.1 - (attackingHeight * 0.6);
          break;
      }
      
      // Maintain Y position from formation with some adjustments based on ball position
      // This makes players shift slightly toward the ball's Y position
      const ballYInfluence = (this.ballPosition.y - player.formationPosition.y) * 0.2;
      const targetY = formationPos.y + ballYInfluence;
      
      // Update player's target position
      player.targetPosition = new Position(targetX, targetY);
    });
  }
}
```

### Step 6: Update Player Class

Modify `src/models/Player.ts` to integrate with the new physics system:

```typescript
// Add these imports to Player.ts
import { MovementController } from '../physics/MovementController';
import { PlayerSimulation } from '../physics/PlayerSimulation';

// Add these properties to the Player class
simulation: PlayerSimulation;
movementController: MovementController;

// Inside constructor, add:
this.simulation = new PlayerSimulation(this.currentPosition.clone());
this.movementController = new MovementController(this, this.simulation);

// Replace the update method with:
update(deltaTime: number, ballPosition: Position): void {
  // Use movement controller instead of direct movement
  this.movementController.update(deltaTime, ballPosition);
  
  // Store previous position for collision resolution
  this.previousPosition = this.currentPosition.clone();
}

// Add a method for collision resolution
resolveCollision(otherPlayer: Player): void {
  // Now handled by physics engine
  // This method remains for compatibility
}
```

### Step 7: Update Ball Class

Modify `src/models/Ball.ts` to use the physics system:

```typescript
// Add these imports to Ball.ts
import { BallSimulation } from '../physics/BallSimulation';

// Add this property to the Ball class
simulation: BallSimulation;

// Inside constructor, add:
this.simulation = new BallSimulation(this.position.clone());

// Replace the update method with:
update(deltaTime: number): void {
  // Update simulation
  this.simulation.update(deltaTime);
  
  // Update visual position with gentle smoothing
  const diff = this.simulation.position.subtract(this.position);
  const halflife = 0.05; // Faster smoothing for ball
  const adjustmentFactor = 1.0 - Math.exp(-deltaTime * (0.69314718056 / halflife));
  
  // Apply adjustment
  const adjustment = diff.multiply(adjustmentFactor);
  this.position = this.position.add(adjustment);
}

// Update the kick method:
kick(direction: Position, power: number): void {
  this.simulation.kick(direction, power);
}
```

### Step 8: Update Match Class

Modify `src/models/Match.ts` to integrate all components:

```typescript
// Add these imports at the top
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { TacticalManager } from './TacticalManager';

// Add these properties to the Match class
private physicsEngine: PhysicsEngine;
private homeTacticalManager: TacticalManager;
private awayTacticalManager: TacticalManager;

// Inside constructor, add:
this.physicsEngine = new PhysicsEngine();
this.homeTacticalManager = new TacticalManager(this.homeTeam);
this.awayTacticalManager = new TacticalManager(this.awayTeam);

// Add ball physics
this.physicsEngine.addObject(this.ball.simulation);

// Add player physics
this.homeTeam.players.forEach(player => {
  this.physicsEngine.addObject(player.simulation);
});

this.awayTeam.players.forEach(player => {
  this.physicsEngine.addObject(player.simulation);
});

// Replace the update method with:
update(deltaTime: number): void {
  if (!this._isPlaying || this._isPaused) return;

  // Update tactical positioning
  this.homeTacticalManager.update(
    this.ball.position,
    this.homeTeam.inPossession
  );
  
  this.awayTacticalManager.update(
    this.ball.position,
    this.awayTeam.inPossession
  );
  
  // Update physics first
  this.physicsEngine.update(deltaTime);
  
  // Then update visual representations
  if (!this.ballController) {
    this.ball.update(deltaTime);
  } else {
    // Update ball position based on controller
    this.updateBallWithController();
  }
  
  // Update teams
  this.homeTeam.update(deltaTime, this.ball.position, this.homeTeam.inPossession);
  this.awayTeam.update(deltaTime, this.ball.position, this.awayTeam.inPossession);
  
  // Handle ball control and actions
  this.handleBallControlAndActions();
  
  // Update match state
  this.elapsedTime += deltaTime;
  this.checkForEvents();
}
```

### Step 9: Modify Team Class

Update `src/models/Team.ts` to work with the new system:

```typescript
// Update the update method:
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
}
```

## Expected Results

After implementing these changes:

1. Players will move with proper physics (acceleration, momentum, inertia)
2. No more snapping back at half line due to separation between physics and visuals
3. Players will maintain formation while also responding to ball position
4. Collisions will be handled properly through the physics engine
5. Ball movement will be more realistic with proper physics
6. Teams will adapt to possession state and field position

## Testing & Validation

1. Test kickoff scenario - ensure players move smoothly after kickoff
2. Test player movement - verify physics-based movement with proper acceleration
3. Test collisions - verify players collide and separate naturally
4. Test ball control - verify smooth transitions between players
5. Test tactical positioning - verify players adjust positions based on game state

## Future Improvements

1. Add player fatigue system that affects movement speed over time
2. Implement advanced off-ball movement like runs behind defense
3. Add tactical patterns for specific game situations
4. Improve ball physics with spin effects and more realistic bounces 