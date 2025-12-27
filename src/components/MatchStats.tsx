import React from 'react';
import { Match } from '../models/Match';

interface MatchStatsProps {
  match: Match;
}

const MatchStats: React.FC<MatchStatsProps> = ({ match }) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Early return if match or stats are not available
  if (!match || !match.stats) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '10px',
        padding: '20px',
        color: '#ffffff',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        Loading match stats...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      padding: '20px',
      color: '#ffffff',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        fontSize: '24px',
        fontWeight: 'bold',
      }}>
        <div style={{ color: match.homeTeam.color }}>{match.homeTeam.name}</div>
        <div style={{ fontSize: '32px' }}>
          {match.stats.score.home ?? 0} - {match.stats.score.away ?? 0}
        </div>
        <div style={{ color: match.awayTeam.color }}>{match.awayTeam.name}</div>
      </div>

      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '20px',
      }}>
        {formatTime(match.elapsedTime)}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '10px',
        fontSize: '14px',
      }}>
        <div style={{ textAlign: 'right' }}>{Math.round((match.stats.possession.home ?? 0) * 100)}%</div>
        <div style={{ color: '#888' }}>Possession</div>
        <div style={{ textAlign: 'left' }}>{Math.round((match.stats.possession.away ?? 0) * 100)}%</div>

        <div style={{ textAlign: 'right' }}>{match.stats.shots?.home ?? 0}</div>
        <div style={{ color: '#888' }}>Shots</div>
        <div style={{ textAlign: 'left' }}>{match.stats.shots?.away ?? 0}</div>

        <div style={{ textAlign: 'right' }}>{match.stats.shotsOnTarget?.home ?? 0}</div>
        <div style={{ color: '#888' }}>Shots on Target</div>
        <div style={{ textAlign: 'left' }}>{match.stats.shotsOnTarget?.away ?? 0}</div>

        <div style={{ textAlign: 'right' }}>{match.stats.passes?.home ?? 0}</div>
        <div style={{ color: '#888' }}>Passes</div>
        <div style={{ textAlign: 'left' }}>{match.stats.passes?.away ?? 0}</div>

        <div style={{ textAlign: 'right' }}>{Math.round((match.stats.passAccuracy?.home ?? 0) * 100)}%</div>
        <div style={{ color: '#888' }}>Pass Accuracy</div>
        <div style={{ textAlign: 'left' }}>{Math.round((match.stats.passAccuracy?.away ?? 0) * 100)}%</div>

        <div style={{ textAlign: 'right' }}>{match.stats.fouls?.home ?? 0}</div>
        <div style={{ color: '#888' }}>Fouls</div>
        <div style={{ textAlign: 'left' }}>{match.stats.fouls?.away ?? 0}</div>
      </div>
    </div>
  );
};

export default MatchStats; 