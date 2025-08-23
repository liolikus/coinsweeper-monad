import { ethers } from "ethers";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalCoinsFound: number;
  bestTime: number;
  totalRewards: string;
  pendingBalance: string;
  username?: string; // Monad Games ID username
}

export interface LeaderboardEntry {
  player: string;
  username?: string; // Monad Games ID username
  score: string;
  timestamp: number;
}

export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface Web3GameState {
  wallet: WalletState;
  gameStats: GameStats | null;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
}

export interface TransactionState {
  isPending: boolean;
  hash: string | null;
  error: string | null;
}

// Monad Games ID interfaces
export interface MonadGamesUser {
  username: string | null;
  walletAddress: string | null;
  isRegistered: boolean;
  crossAppId: string | null;
  providerAppId: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  balance: string;
}

// Contract ABI for CoinSweeper (simplified without FHE)
export const COINSWEEPER_ABI = [
  "function startGame(uint256 difficulty) external",
  "function recordWin(uint256 difficulty, uint256 time, uint256 coinsFound) external",
  "function recordLoss(uint256 difficulty) external",
  "function getPlayerStats(address player) external view returns (uint256 gamesPlayed, uint256 gamesWon, uint256 totalCoinsFound, uint256 bestTime, uint256 totalRewards)",
  "function getLeaderboardEntry(uint256 index) external view returns (address player, uint256 score, uint256 timestamp)",
  "function getPlayerBalance(address player) external view returns (uint256)",
  "function leaderboardCount() external view returns (uint256)",
  "function rewardPerWin() external view returns (uint256)",
  "function difficultyMultipliers(uint256) external view returns (uint256)",
  "function minTimeForBonus() external view returns (uint256)",
  "function bonusMultiplier() external view returns (uint256)",
  "function claimRewards() external",
  "event GameStarted(address indexed player, uint256 difficulty)",
  "event GameWon(address indexed player, uint256 difficulty, uint256 time, uint256 reward)",
  "event GameLost(address indexed player, uint256 difficulty)",
  "event RewardClaimed(address indexed player, uint256 amount)",
];

// Contract ABI for standard ERC20
export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

// Network configurations
export const NETWORKS = {
  monadTestnet: {
    chainId: 41454,
    name: "Monad Testnet",
    rpcUrl: "https://testnet1.monad.xyz",
    explorer: "https://testnet1.monad.xyz",
    nativeCurrency: {
      name: "MON",
      symbol: "MON",
      decimals: 18,
    },
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet", 
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
    explorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH", 
      decimals: 18,
    },
  },
};

// Contract addresses
export const CONTRACT_ADDRESSES = {
  monadTestnet: "0x0000000000000000000000000000000000000000", // To be deployed
  sepolia: "0xB45D181c2F51700a489754993D9E2A0F6032504F", // Existing deployment
};

// Monad Games ID Configuration
export const MONAD_GAMES_CONFIG = {
  leaderboardUrl: "https://monad-games-id-site.vercel.app/leaderboard",
  registrationRequired: true,
  supportedNetworks: [41454], // Monad Testnet
};
