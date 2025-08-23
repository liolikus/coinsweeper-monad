import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyWeb3 } from '../contexts/PrivyWeb3Context';
import './WalletConnect.css';

const WalletConnect: React.FC = () => {
  const { login, logout, authenticated, user, connectWallet } = usePrivy();
  const { 
    isConnected, 
    address, 
    chainId, 
    monadGamesUser, 
    switchToMonadTestnet,
    isCorrectNetwork 
  } = usePrivyWeb3();

  const handleSignInWithMonadGamesID = () => {
    login({
      loginMethods: ['cross_app']
    });
  };

  const handleConnectWallet = () => {
    login({
      loginMethods: ['wallet']
    });
  };

  const handleConnectEmail = () => {
    login({
      loginMethods: ['email']
    });
  };

  const handleDisconnect = () => {
    logout();
  };

  const handleNetworkSwitch = () => {
    switchToMonadTestnet();
  };

  if (!authenticated || !isConnected) {
    return (
      <div className="wallet-connect">
        <div className="wallet-status disconnected">
          <h3>🔗 Connect to Play</h3>
          <p>Choose your preferred way to connect and compete on the Monad Games leaderboard!</p>
          
          <div className="login-options">
            {/* Primary Monad Games ID Button */}
            <button 
              className="connect-button monad-games-primary"
              onClick={handleSignInWithMonadGamesID}
            >
              🎮 Sign in with Monad Games ID
            </button>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            {/* Alternative Login Methods */}
            <div className="alternative-methods">
              <button 
                className="connect-button wallet-method"
                onClick={handleConnectWallet}
              >
                👛 Connect Wallet
              </button>
              
              <button 
                className="connect-button email-method"
                onClick={handleConnectEmail}
              >
                📧 Sign in with Email
              </button>
            </div>
          </div>
          
          <div className="benefits-info">
            <h4>🎮 Monad Games ID Benefits:</h4>
            <ul>
              <li>✅ Cross-game username and identity</li>
              <li>🏆 Unified leaderboard across all games</li>
              <li>📊 Persistent game statistics</li>
              <li>🎁 Exclusive rewards and achievements</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-status connected">
        <h3>🎮 Monad Games ID</h3>
        
        {/* User Info */}
        <div className="user-info">
          {monadGamesUser?.username ? (
            <div className="username">
              <span className="label">Username:</span>
              <span className="value">{monadGamesUser.username}</span>
            </div>
          ) : (
            <div className="username">
              <span className="label">Status:</span>
              <span className="value">Guest Player</span>
            </div>
          )}
          
          <div className="wallet-address">
            <span className="label">Wallet:</span>
            <span className="value">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
            </span>
          </div>

          {/* Show connection method */}
          {user?.linkedAccounts && (
            <div className="connection-method">
              <span className="label">Connected via:</span>
              <span className="value">
                {user.linkedAccounts.some(account => account.type === 'cross_app') 
                  ? '🎮 Monad Games ID' 
                  : user.linkedAccounts.some(account => account.type === 'wallet')
                  ? '👛 Wallet'
                  : '📧 Email'
                }
              </span>
            </div>
          )}
        </div>

        {/* Network Status */}
        <div className="network-info">
          <div className="network-status">
            <span className="label">Network:</span>
            <span className={`network-indicator ${isCorrectNetwork ? 'correct' : 'incorrect'}`}>
              {chainId === 41454 ? 'Monad Testnet' : `Chain ${chainId}`}
            </span>
          </div>
          
          {!isCorrectNetwork && (
            <button 
              className="network-switch-button"
              onClick={handleNetworkSwitch}
            >
              Switch to Monad Testnet
            </button>
          )}
        </div>

        {/* Registration Status */}
        {monadGamesUser && (
          <div className="registration-info">
            <div className="registration-status">
              <span className="label">Game Registration:</span>
              <span className={`status ${monadGamesUser.isRegistered ? 'registered' : 'unregistered'}`}>
                {monadGamesUser.isRegistered ? '✅ Registered' : '⏳ Pending'}
              </span>
            </div>
            
            {monadGamesUser.isRegistered && (
              <div className="leaderboard-link">
                <a 
                  href="https://monad-games-id-site.vercel.app/leaderboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leaderboard-button"
                >
                  View Leaderboard
                </a>
              </div>
            )}
          </div>
        )}

        {/* Cross-app connection info */}
        {user?.linkedAccounts?.some(account => account.type === 'cross_app') && (
          <div className="cross-app-info">
            <div className="cross-app-status">
              <span className="icon">🎮</span>
              <span className="text">Connected to Monad Games ecosystem</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="wallet-actions">
          {!user?.linkedAccounts?.some(account => account.type === 'wallet') && (
            <button 
              className="link-wallet-button"
              onClick={() => connectWallet()}
            >
              Link Additional Wallet
            </button>
          )}
          
          <button 
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
