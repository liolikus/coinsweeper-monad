import React, { useState, useEffect } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { usePrivyWeb3 } from '../contexts/PrivyWeb3Context';
import {
  getEncryptedTokenInfo,
  getContractConfig,
  getCoinSweeperContract,
} from "../utils/web3Utils";
import { FHEUtils } from "../utils/zamaFHE";
import { EncryptedTokenInfo } from "../types/web3";
import "./FHETokenInfo.css";

const FHETokenInfo: React.FC = () => {
  const { wallet, gameStats } = useWeb3();
  const { 
    isConnected, 
    monadGamesUser, 
    playerStats, 
    leaderboard,
    isCorrectNetwork 
  } = usePrivyWeb3();
  const [tokenInfo, setTokenInfo] = useState<EncryptedTokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fheStatus, setFheStatus] = useState({
    isSupported: false,
    isAvailable: false,
    error: null as string | null,
  });

  useEffect(() => {
    const checkFHEStatus = async () => {
      // Wait a bit for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const isAvailable = FHEUtils.isAvailable();
      const status = FHEUtils.getStatus();

      console.log("FHE Status:", status);
      console.log("FHE Available:", isAvailable);

      setFheStatus({
        isSupported: true, // Zama FHE is supported on all networks
        isAvailable,
        error: null,
      });
    };

    checkFHEStatus();
  }, []);

  useEffect(() => {
    const loadTokenInfo = async () => {
      if (!wallet.isConnected || !wallet.signer || !wallet.address) {
        setTokenInfo(null);
        return;
      }

      try {
        setIsLoading(true);
        // Get token address from game contract
        const contractConfig = getContractConfig(wallet.chainId!);
        const gameContract = getCoinSweeperContract(
          wallet.signer,
          contractConfig.address,
        );
        const tokenAddress = await gameContract.rewardToken();

        // Check if token address is valid (not zero address)
        if (
          !tokenAddress ||
          tokenAddress === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            "No reward token configured. Please contact the contract owner to set up the reward token.",
          );
        }

        const info = await getEncryptedTokenInfo(
          wallet.signer,
          tokenAddress,
          wallet.address,
          wallet.chainId!,
        );

        setTokenInfo(info);
      } catch (error: any) {
        console.error("Error loading token info:", error);
        setFheStatus((prev) => ({
          ...prev,
          error: error.message || "Failed to load token information",
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadTokenInfo();
  }, [wallet.isConnected, wallet.signer, wallet.address, wallet.chainId]);

  if (!wallet.isConnected) {
    return (
      <div className="fhe-token-info">
        <div className="fhe-header">
          <h3>🔐 Zama FHE Token Info</h3>
        </div>
        <div className="fhe-warning">
          <h3>🔗 Connect Your Wallet</h3>
          <p>
            Connect your wallet to view encrypted token information and FHE
            features.
          </p>
          <p>
            This component will display your encrypted token balances and Zama
            FHE status once connected.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fhe-token-info">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading encrypted token info...</span>
        </div>
      </div>
    );
  }

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
          {monadGamesUser?.username ? (
            <div className="profile-info">
              <div className="username-display">
                <span className="label">Username:</span>
                <span className="value">{monadGamesUser.username}</span>
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
      {playerStats && (
        <div className="info-section">
          <h3>📊 Your Stats</h3>
          <div className="info-content">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{playerStats.gamesPlayed}</span>
                <span className="stat-label">Games Played</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{playerStats.gamesWon}</span>
                <span className="stat-label">Games Won</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {playerStats.gamesPlayed > 0 
                    ? Math.round((playerStats.gamesWon / playerStats.gamesPlayed) * 100)
                    : 0}%
                </span>
                <span className="stat-label">Win Rate</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{playerStats.totalCoinsFound}</span>
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
              <span className="value">100 MON</span>
            </div>
            <div className="reward-item">
              <span className="label">Total Earned:</span>
              <span className="value">
                {playerStats ? `${playerStats.gamesWon * 100} MON` : '0 MON'}
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
                    {player.player.slice(0, 6)}...{player.player.slice(-4)}
                  </span>
                  <span className="score">{player.gamesWon}W</span>
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

      {/* FHE Token Info */}
      <div className="info-section">
        <h3>🔐 Zama FHE Token Info</h3>
        <div className="info-content">
          {tokenInfo && (
            <div className="token-details">
              <div className="token-basic">
                <div className="token-name">
                  <span className="label">Token:</span>
                  <span className="value">
                    {tokenInfo.name} ({tokenInfo.symbol})
                  </span>
                </div>
                <div className="token-decimals">
                  <span className="label">Decimals:</span>
                  <span className="value">{tokenInfo.decimals}</span>
                </div>
              </div>

              <div className="token-balances">
                <div className="balance-item">
                  <span className="label">🔒 Your Encrypted Balance:</span>
                  <span className="value encrypted">
                    {parseInt(tokenInfo.encryptedBalance).toLocaleString()}{" "}
                    {tokenInfo.symbol}
                  </span>
                </div>

                {gameStats && (
                  <div className="balance-item">
                    <span className="label">💰 Total Rewards Earned:</span>
                    <span className="value">
                      {parseFloat(gameStats.totalRewards).toFixed(2)}{" "}
                      {tokenInfo.symbol}
                    </span>
                  </div>
                )}

                <div className="balance-item">
                  <span className="label">🌐 Total Supply:</span>
                  <span className="value">
                    {parseInt(tokenInfo.totalSupply).toLocaleString()}{" "}
                    {tokenInfo.symbol}
                  </span>
                </div>
              </div>

              <div className="fhe-features">
                <h4>🔐 Zama FHE Features</h4>
                <ul>
                  <li>✅ Encrypted token balances</li>
                  <li>✅ Private transfers via Zama relayer</li>
                  <li>✅ Confidential leaderboard</li>
                  <li>✅ Secure reward distribution</li>
                  <li>✅ Homomorphic operations on encrypted data</li>
                </ul>
              </div>

              <div className="zama-info">
                <h4>🚀 Zama Protocol on Sepolia</h4>
                <p>
                  This integration uses the official Zama relayer SDK to handle
                  encrypted operations on Sepolia testnet. The Zama protocol
                  provides a decentralized network of relayers that process FHE
                  operations, ensuring your data remains private while enabling
                  complex computations for development and testing purposes.
                </p>
                <div className="zama-links">
                  <a
                    href="https://docs.zama.ai/protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📚 Zama Documentation
                  </a>
                  <a
                    href="https://github.com/zama-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🔗 Zama GitHub
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FHETokenInfo;
