import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { createConfig } from 'wagmi';
import './App.css';
import CoinsweeperGame from './components/CoinsweeperGame';
import WalletConnect from './components/WalletConnect';
import MonadGamesInfo from './components/FHETokenInfo';
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
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
} as const;

// Define Sepolia chain
const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'SepoliaETH',
    symbol: 'SEP',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://sepolia.etherscan.io',
    },
  },
  testnet: true,
} as const;

// Create Wagmi config
const config = createConfig({
  chains: [monadTestnet, sepolia],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// Create Query Client
const queryClient = new QueryClient();

function App() {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'cmeoanfz20194js0bjbdecqtn'}
      config={{
        loginMethodsAndOrder: {
          primary: [
            'email',
            'google',
            'privy:cmd8euall0037le0my79qpz42'
          ]
        },
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
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
                    <MonadGamesInfo />
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
