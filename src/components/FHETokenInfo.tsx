import React from "react";
import { usePrivyWeb3 } from '../contexts/PrivyWeb3Context';
import "./FHETokenInfo.css";

const MonadGamesInfo: React.FC = () => {
  const { 
    isConnected, 
    monadUser, 
    gameStats, 
    leaderboard,
    isCorrectNetwork 
  } = usePrivyWeb3();

  if (!isConnected || !isCorrectNetwork) {
    return (
      <div className="fhe-token-info">
        <div className="info-section">
          <h3>🎮 Monad Games ID</h3>
          <div className="info-content">
            <p>Connect to Monad Testnet to view your gaming profile and compete on the leaderboard!</p>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="icon">🏆</span>
                <span>Unified Leaderboard</span>
              </div>
              <div className="feature-item">
                <span className="icon">👤</span>
                <span>Cross-Game Identity</span>
              </div>
              <div className="feature-item">
                <span className="icon">💰</span>
                <span>MON Token Rewards</span>
              </div>
              <div className="feature-item">
                <span className="icon">📊</span>
                <span>Game Statistics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fhe-token-info">
      {/* User Profile Section */}
      <div className="info-section">
        <h3>👤 Player Profile</h3>
        <div className="info-content">
          {monadUser?.username ? (
            <div className="profile-info">
              <div className="username-display">
                <span className="label">Username:</span>
                <span className="value">{monadUser.username}</span>
              </div>
              <div className="registration-status">
                <span className="label">Status:</span>
                <span className="status registered">✅ Registered</span>
              </div>
            </div>
          ) : (
            <div className="profile-info">
              <div className="guest-status">
                <span className="status unregistered">👤 Guest Player</span>
                <p>Register with Monad Games ID to save your progress and compete on the leaderboard!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Statistics */}
      {gameStats && (
        <div className="info-section">
          <h3>📊 Your Stats</h3>
          <div className="info-content">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{gameStats.gamesPlayed}</span>
                <span className="stat-label">Games Played</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{gameStats.gamesWon}</span>
                <span className="stat-label">Games Won</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {gameStats.gamesPlayed > 0 
                    ? Math.round((gameStats.gamesWon / gameStats.gamesPlayed) * 100)
                    : 0}%
                </span>
                <span className="stat-label">Win Rate</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{gameStats.totalCoinsFound}</span>
                <span className="stat-label">Coins Found</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Section */}
      <div className="info-section">
        <h3>💰 Rewards</h3>
        <div className="info-content">
          <div className="reward-info">
            <div className="reward-item">
              <span className="label">Reward per Win:</span>
              <span className="value">0.01 MON</span>
            </div>
            <div className="reward-item">
              <span className="label">Total Earned:</span>
              <span className="value">
                {gameStats ? `${(gameStats.gamesWon * 0.01).toFixed(2)} MON` : '0 MON'}
              </span>
            </div>
          </div>
          
          <div className="reward-note">
            <p>💡 Win games to earn MON tokens directly to your wallet!</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Preview */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="info-section">
          <h3>🏆 Top Players</h3>
          <div className="info-content">
            <div className="leaderboard-preview">
              {leaderboard.slice(0, 5).map((player, index) => (
                <div key={player.player} className="leaderboard-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="player-name">
                    {player.username || `${player.player.slice(0, 6)}...${player.player.slice(-4)}`}
                  </span>
                  <span className="score">{player.score}</span>
                </div>
              ))}
            </div>
            
            <div className="leaderboard-link">
              <a 
                href="https://monad-games-id-site.vercel.app/leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="view-full-leaderboard"
              >
                View Full Leaderboard →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Monad Games ID Info */}
      <div className="info-section">
        <h3>ℹ️ About Monad Games</h3>
        <div className="info-content">
          <div className="about-info">
            <p>Monad Games ID provides a unified identity across all games in the Monad ecosystem.</p>
            
            <div className="links">
              <a 
                href="https://monad.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="info-link"
              >
                Learn about Monad →
              </a>
              <a 
                href="https://monad-games-id-site.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="info-link"
              >
                Monad Games Hub →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonadGamesInfo;
