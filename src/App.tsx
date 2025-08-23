import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { createConfig } from 'wagmi';
import './App.css';
import CoinsweeperGame from './components/CoinsweeperGame';
import WalletConnect from './components/WalletConnect';
import FHETokenInfo from './components/FHETokenInfo';
import BlockchainStats from './components/BlockchainStats';
import { PrivyWeb3Provider } from './contexts/PrivyWeb3Context';

// Define Monad Testnet chain
const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet1.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet1.monad.xyz',
    },
  },
  testnet: true,
} as const;

// Create Wagmi config
const config = createConfig({
  chains: [monadTestnet, sepolia, mainnet],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

// Create Query Client
const queryClient = new QueryClient();

function App() {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'your-privy-app-id'}
      config={{
        loginMethodsAndOrder: [
          'wallet',
          'email',
          'sms',
          'cross_app'
        ],
        crossAppProviders: [
          {
            providerAppId: 'cmd8euall0037le0my79qpz42'
          }
        ],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/coin.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet, sepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <PrivyWeb3Provider>
            <div className="App">
              <div className="container">
                <div className="header">
                  <h1>🎮 CoinSweeper - Monad Games</h1>
                  <p>Play CoinSweeper and compete on the Monad Games ID leaderboard!</p>
                </div>

                <div className="main-content">
                  <div className="sidebar-left">
                    <FHETokenInfo />
                  </div>

                  <div className="game-area">
                    <CoinsweeperGame />
                  </div>

                  <div className="sidebar-right">
                    <WalletConnect />
                    <BlockchainStats />
                  </div>
                </div>
              </div>
            </div>
          </PrivyWeb3Provider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
