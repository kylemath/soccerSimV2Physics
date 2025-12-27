import { openDB, IDBPDatabase } from 'idb';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { Formation, FormationType } from '../models/Formation';
import { SimulationResult } from './SimulationService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database schema version
 */
const DB_VERSION = 1;

/**
 * Database name
 */
const DB_NAME = 'soccer-sim-db';

/**
 * Store names for database entities
 */
enum StoreNames {
  MATCHES = 'matches',
  TEAMS = 'teams',
  FORMATIONS = 'formations',
  RESULTS = 'results'
}

/**
 * Database schema
 */
interface DatabaseSchema {
  [StoreNames.MATCHES]: {
    key: string;
    value: any;
  };
  [StoreNames.TEAMS]: {
    key: string;
    value: any;
  };
  [StoreNames.FORMATIONS]: {
    key: string;
    value: any;
  };
  [StoreNames.RESULTS]: {
    key: string;
    value: SimulationResult;
  };
}

/**
 * Service for database operations
 */
export class DatabaseService {
  private db: IDBPDatabase<DatabaseSchema> | null = null;
  
  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    try {
      this.db = await openDB<DatabaseSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains(StoreNames.MATCHES)) {
            db.createObjectStore(StoreNames.MATCHES, { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains(StoreNames.TEAMS)) {
            db.createObjectStore(StoreNames.TEAMS, { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains(StoreNames.FORMATIONS)) {
            db.createObjectStore(StoreNames.FORMATIONS, { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains(StoreNames.RESULTS)) {
            db.createObjectStore(StoreNames.RESULTS, { keyPath: 'id' });
          }
        }
      });
      
      console.log('Database initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  /**
   * Check if database is initialized
   */
  private ensureDbIsOpen(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }
  
  /**
   * Save a match to the database
   */
  async saveMatch(match: Match): Promise<string> {
    this.ensureDbIsOpen();
    
    // Convert match to a serializable object
    const matchData = match.toJSON();
    
    // Save to database
    await this.db!.put(StoreNames.MATCHES, matchData);
    
    return match.id;
  }
  
  /**
   * Load a match from the database
   */
  async loadMatch(id: string): Promise<Match | null> {
    this.ensureDbIsOpen();
    
    // Get match data from database
    const matchData = await this.db!.get(StoreNames.MATCHES, id);
    
    if (!matchData) {
      return null;
    }
    
    // Recreate match from JSON
    return Match.fromJSON(matchData);
  }
  
  /**
   * Get all matches from the database
   */
  async getAllMatches(): Promise<Array<{id: string, homeTeam: string, awayTeam: string, date: string}>> {
    this.ensureDbIsOpen();
    
    // Get all match data from database, but only include summary information
    const matches = await this.db!.getAll(StoreNames.MATCHES);
    
    return matches.map(match => ({
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      date: new Date(match.time * 1000).toISOString() // Convert simulation time to date
    }));
  }
  
  /**
   * Delete a match from the database
   */
  async deleteMatch(id: string): Promise<void> {
    this.ensureDbIsOpen();
    
    await this.db!.delete(StoreNames.MATCHES, id);
  }
  
  /**
   * Save a team to the database
   */
  async saveTeam(team: Team): Promise<string> {
    this.ensureDbIsOpen();
    
    // Convert team to a serializable object
    const teamData = team.toJSON();
    
    // Save to database
    await this.db!.put(StoreNames.TEAMS, teamData);
    
    return team.id;
  }
  
  /**
   * Load a team from the database
   */
  async loadTeam(id: string): Promise<Team | null> {
    this.ensureDbIsOpen();
    
    // Get team data from database
    const teamData = await this.db!.get(StoreNames.TEAMS, id);
    
    if (!teamData) {
      return null;
    }
    
    // Recreate team from JSON
    return Team.fromJSON(teamData);
  }
  
  /**
   * Get all teams from the database
   */
  async getAllTeams(): Promise<Array<{id: string, name: string, formationType: FormationType}>> {
    this.ensureDbIsOpen();
    
    // Get all team data from database, but only include summary information
    const teams = await this.db!.getAll(StoreNames.TEAMS);
    
    return teams.map(team => ({
      id: team.id,
      name: team.name,
      formationType: team.formation.type
    }));
  }
  
  /**
   * Delete a team from the database
   */
  async deleteTeam(id: string): Promise<void> {
    this.ensureDbIsOpen();
    
    await this.db!.delete(StoreNames.TEAMS, id);
  }
  
  /**
   * Save a formation to the database
   */
  async saveFormation(formation: Formation): Promise<string> {
    this.ensureDbIsOpen();
    
    // Create a unique ID for the formation if it doesn't have one
    const formationData = {
      id: formation.name,
      ...formation.toJSON()
    };
    
    // Save to database
    await this.db!.put(StoreNames.FORMATIONS, formationData);
    
    return formationData.id;
  }
  
  /**
   * Load a formation from the database
   */
  async loadFormation(id: string): Promise<Formation | null> {
    this.ensureDbIsOpen();
    
    // Get formation data from database
    const formationData = await this.db!.get(StoreNames.FORMATIONS, id);
    
    if (!formationData) {
      return null;
    }
    
    // Recreate formation from JSON
    return Formation.fromJSON(formationData);
  }
  
  /**
   * Get all formations from the database
   */
  async getAllFormations(): Promise<Array<{id: string, name: string, type: FormationType}>> {
    this.ensureDbIsOpen();
    
    // Get all formation data from database, but only include summary information
    const formations = await this.db!.getAll(StoreNames.FORMATIONS);
    
    return formations.map(f => ({ id: f.id, name: f.name, type: f.type }));
  }
  
  /**
   * Delete a formation from the database
   */
  async deleteFormation(id: string): Promise<void> {
    this.ensureDbIsOpen();
    await this.db!.delete(StoreNames.FORMATIONS, id);
  }
  
  /**
   * Save a simulation result to the database
   */
  async saveSimulationResult(result: SimulationResult): Promise<string> {
    this.ensureDbIsOpen();
    
    // Ensure result has an ID (generate if missing, though SimulationService should provide one)
    const resultData = { ...result };
    if (!resultData.id) {
        resultData.id = uuidv4(); 
    }
    
    await this.db!.put(StoreNames.RESULTS, resultData);
    return resultData.id;
  }
  
  /**
   * Load a simulation result from the database
   */
  async loadSimulationResult(id: string): Promise<SimulationResult | null> {
    this.ensureDbIsOpen();
    const resultData = await this.db!.get(StoreNames.RESULTS, id);
    return resultData || null;
  }
  
  /**
   * Get all simulation results from the database
   */
  async getAllSimulationResults(): Promise<SimulationResult[]> {
    this.ensureDbIsOpen();
    return await this.db!.getAll(StoreNames.RESULTS);
  }
  
  /**
   * Delete a simulation result from the database
   */
  async deleteSimulationResult(id: string): Promise<void> {
    this.ensureDbIsOpen();
    await this.db!.delete(StoreNames.RESULTS, id);
  }
  
  /**
   * Import data into the database
   */
  async importData(data: {
    matches?: any[],
    teams?: any[],
    formations?: any[],
    results?: SimulationResult[]
  }): Promise<void> {
    this.ensureDbIsOpen();
    
    // Use a transaction to ensure all or nothing is imported
    const tx = this.db!.transaction(
      [StoreNames.MATCHES, StoreNames.TEAMS, StoreNames.FORMATIONS, StoreNames.RESULTS],
      'readwrite'
    );
    
    try {
      // Import matches
      if (data.matches && data.matches.length > 0) {
        const matchStore = tx.objectStore(StoreNames.MATCHES);
        for (const match of data.matches) {
          await matchStore.put(match);
        }
      }
      
      // Import teams
      if (data.teams && data.teams.length > 0) {
        const teamStore = tx.objectStore(StoreNames.TEAMS);
        for (const team of data.teams) {
          await teamStore.put(team);
        }
      }
      
      // Import formations
      if (data.formations && data.formations.length > 0) {
        const formationStore = tx.objectStore(StoreNames.FORMATIONS);
        for (const formation of data.formations) {
          await formationStore.put(formation);
        }
      }
      
      // Import results
      if (data.results && data.results.length > 0) {
        const resultStore = tx.objectStore(StoreNames.RESULTS);
        for (const result of data.results) {
          await resultStore.put(result);
        }
      }
      
      // Commit transaction
      await tx.done;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
  
  /**
   * Export all data from the database
   */
  async exportData(): Promise<{
    matches: any[],
    teams: any[],
    formations: any[],
    results: SimulationResult[]
  }> {
    this.ensureDbIsOpen();
    
    // Get all data from database
    const matches = await this.db!.getAll(StoreNames.MATCHES);
    const teams = await this.db!.getAll(StoreNames.TEAMS);
    const formations = await this.db!.getAll(StoreNames.FORMATIONS);
    const results = await this.db!.getAll(StoreNames.RESULTS);
    
    return {
      matches,
      teams,
      formations,
      results
    };
  }
  
  /**
   * Clear all data from the database
   */
  async clearAllData(): Promise<void> {
    this.ensureDbIsOpen();
    
    // Use a transaction to ensure all or nothing is cleared
    const tx = this.db!.transaction(
      [StoreNames.MATCHES, StoreNames.TEAMS, StoreNames.FORMATIONS, StoreNames.RESULTS],
      'readwrite'
    );
    
    await tx.objectStore(StoreNames.MATCHES).clear();
    await tx.objectStore(StoreNames.TEAMS).clear();
    await tx.objectStore(StoreNames.FORMATIONS).clear();
    await tx.objectStore(StoreNames.RESULTS).clear();
    
    // Commit transaction
    await tx.done;
  }
} 