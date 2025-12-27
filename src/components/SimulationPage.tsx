import React, { useState, useEffect, useCallback } from 'react';
import MatchVisualizer from './MatchVisualizer';
import MatchControls from './MatchControls';
import MatchStats from './MatchStats';
import { SimulationService } from '../services/SimulationService';
import { DatabaseService } from '../services/DatabaseService';
import { FormationType } from '../models/Formation';
import { Match } from '../models/Match';

/**
 * Main simulation page component
 */
const SimulationPage: React.FC = () => {
  // Services
  const [simulationService] = useState(() => new SimulationService());
  const [databaseService] = useState(() => new DatabaseService());
  
  // Match state
  const [match, setMatch] = useState<Match | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize services and create default match
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Initialize database
        await databaseService.init();
        
        // Create a quick match with default teams
        const newMatch = simulationService.createQuickMatch(
          FormationType.F_442,
          FormationType.F_433
        );
        
        // Set up simulation
        setMatch(newMatch);
        
      } catch (err) {
        setError(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
    
    // Clean up simulation service when component unmounts
    return () => {
      simulationService.destroy();
    };
  }, [simulationService, databaseService]);
  
  // Update match speed when changed
  useEffect(() => {
    if (match) {
      match.simulationSpeed = simulationSpeed;
    }
  }, [match, simulationSpeed]);
  
  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!match) return;
    
    if (!match.isPlaying) {
      // Start simulation
      simulationService.startSimulation(match.id, (updatedMatch) => {
        // Revert to original method to maintain Match instance type
        // Create a new instance for React state update but copy properties
        const currentMatchState = new Match(updatedMatch.homeTeam, updatedMatch.awayTeam, updatedMatch.config);
        Object.assign(currentMatchState, updatedMatch);
        setMatch(currentMatchState); 
      });
    } else if (match.isPaused) {
      // Resume simulation
      simulationService.resumeSimulation(match.id);
    } else {
      // Pause simulation
      simulationService.pauseSimulation(match.id);
    }
  }, [match, simulationService]);
  
  // Handle stop
  const handleStop = useCallback(() => {
    if (!match) return;
    
    simulationService.stopSimulation(match.id);
    
    // Save match to database
    databaseService.saveMatch(match)
      .catch(err => console.error('Failed to save match:', err));
  }, [match, simulationService, databaseService]);
  
  // Handle reset
  const handleReset = useCallback(async () => {
    if (!match) return;
    
    // Stop current simulation if running
    if (match.isPlaying) {
      simulationService.stopSimulation(match.id);
    }
    
    // Create a new match with the same teams and configurations
    const newMatch = simulationService.createMatch(
      match.homeTeam,
      match.awayTeam,
      match.config
    );
    
    setMatch(newMatch);
  }, [match, simulationService]);
  
  // Handle simulation speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setSimulationSpeed(speed);
  }, []);
  
  // Run multiple simulations
  const handleRunMultipleSimulations = useCallback(async () => {
    if (!match) return;
    
    try {
      setLoading(true);
      
      // Stop current simulation if running
      if (match.isPlaying) {
        simulationService.stopSimulation(match.id);
      }
      
      // Run 10 simulations with the same teams
      const results = await simulationService.runMultipleSimulations(
        match.homeTeam,
        match.awayTeam,
        10
      );
      
      console.log('Multiple simulation results:', results);
      
      // Save results to database
      for (const result of results.results) {
        await databaseService.saveSimulationResult(result);
      }
      
      alert(`Simulations completed:
        Home wins: ${results.homeWins}
        Away wins: ${results.awayWins}
        Draws: ${results.draws}
        Average score: ${results.averageScore.home.toFixed(1)} - ${results.averageScore.away.toFixed(1)}
      `);
      
    } catch (err) {
      setError(`Failed to run simulations: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [match, simulationService, databaseService]);
  
  // Show loading indicator
  if (loading) {
    return (
      <div className="simulation-page" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#ffffff',
      }}>
        <div className="loading" style={{
          fontSize: '24px',
          fontWeight: 'bold',
        }}>
          Loading simulation...
        </div>
      </div>
    );
  }
  
  // Show error message
  if (error) {
    return (
      <div className="simulation-page" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#ff4444',
      }}>
        <div className="error" style={{
          fontSize: '24px',
          fontWeight: 'bold',
        }}>
          Error: {error}
        </div>
      </div>
    );
  }
  
  // Show simulation
  return (
    <div className="simulation-page" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      padding: '20px',
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#4CAF50',
          margin: 0,
        }}>Soccer Tactics Simulator</h1>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {match ? (
          <>
            <section className="match-section" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              <MatchControls
                isPlaying={match.isPlaying}
                isPaused={match.isPaused}
                simulationSpeed={simulationSpeed}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onSpeedChange={handleSpeedChange}
                onReset={handleReset}
              />

              <MatchStats match={match} />
              
              <MatchVisualizer match={match} />
            </section>

            <section className="actions-section" style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
            }}>
              <button
                className="action-button"
                onClick={handleRunMultipleSimulations}
                disabled={match.isPlaying}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: match.isPlaying ? '#666' : '#4CAF50',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: match.isPlaying ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                Run Multiple Simulations
              </button>
            </section>
          </>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            fontSize: '24px',
            fontWeight: 'bold',
          }}>
            No match loaded
          </div>
        )}
      </main>
    </div>
  );
};

export default SimulationPage; 