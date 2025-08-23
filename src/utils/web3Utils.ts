import { ethers } from "ethers";
import detectEthereumProvider from "@metamask/detect-provider";
import {
  WalletState,
  GameStats,
  LeaderboardEntry,
  COINSWEEPER_ABI,
  ERC20_ABI,
  NETWORKS,
  CONTRACT_ADDRESSES,
  MONAD_GAMES_CONFIG,
  TokenInfo,
} from "../types/web3";

// MetaMask provider detection
export const detectProvider = async () => {
  const provider = await detectEthereumProvider();
  if (!provider) {
    throw new Error("MetaMask not found! Please install MetaMask extension.");
  }
  return provider as any;
};

// Connect wallet
export const connectWallet = async (): Promise<WalletState> => {
  try {
    const provider = await detectProvider();

    // Request account access
    await (provider as any).request({ method: "eth_requestAccounts" });

    // Create ethers provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider as any);
    const signer = await ethersProvider.getSigner();

    // Get account details
    const address = await signer.getAddress();
    const balance = await ethersProvider.getBalance(address);
    const network = await ethersProvider.getNetwork();

    return {
      isConnected: true,
      address,
      balance: ethers.formatEther(balance),
      chainId: Number(network.chainId),
      provider: ethersProvider,
      signer,
    };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = (): WalletState => {
  return {
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    provider: null,
    signer: null,
  };
};

// Get contract instance
export const getContract = (
  signer: ethers.Signer,
  contractAddress: string,
  abi: any[],
) => {
  return new ethers.Contract(contractAddress, abi, signer);
};

// Get CoinSweeper contract
export const getCoinSweeperContract = (
  signer: ethers.Signer,
  contractAddress: string,
) => {
  return getContract(signer, contractAddress, COINSWEEPER_ABI);
};

// Get ERC20 contract
export const getERC20Contract = (
  signer: ethers.Signer,
  contractAddress: string,
) => {
  return getContract(signer, contractAddress, ERC20_ABI);
};

// Switch network
export const switchNetwork = async (chainId: number) => {
  const provider = await detectProvider();

  try {
    await (provider as any).request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      const network = Object.values(NETWORKS).find(
        (n) => n.chainId === chainId,
      );
      if (network) {
        await (provider as any).request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.explorer ? [network.explorer] : [],
            },
          ],
        });
      }
    } else {
      throw switchError;
    }
  }
};

// Get player stats from contract
export const getPlayerStats = async (
  signer: ethers.Signer,
  contractAddress: string,
  playerAddress: string,
): Promise<GameStats> => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const stats = await contract.getPlayerStats(playerAddress);

  // Get pending balance
  const pendingBalance = await contract.getPlayerBalance(playerAddress);

  return {
    gamesPlayed: Number(stats.gamesPlayed),
    gamesWon: Number(stats.gamesWon),
    totalCoinsFound: Number(stats.totalCoinsFound),
    bestTime: Number(stats.bestTime),
    totalRewards: ethers.formatEther(stats.totalRewards),
    pendingBalance: ethers.formatEther(pendingBalance),
  };
};

// Get leaderboard from contract
export const getLeaderboard = async (
  signer: ethers.Signer,
  contractAddress: string,
): Promise<LeaderboardEntry[]> => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const count = await contract.leaderboardCount();
  const leaderboard: LeaderboardEntry[] = [];

  for (let i = 0; i < Math.min(Number(count), 10); i++) {
    const entry = await contract.getLeaderboardEntry(i);
    leaderboard.push({
      player: entry.player,
      score: ethers.formatEther(entry.score),
      timestamp: Number(entry.timestamp),
    });
  }

  return leaderboard;
};

// Get token info
export const getTokenInfo = async (
  signer: ethers.Signer,
  tokenAddress: string,
  playerAddress: string,
): Promise<TokenInfo> => {
  const contract = getERC20Contract(signer, tokenAddress);

  // Get basic token info
  const [name, symbol, decimals, totalSupply, balance] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
    contract.balanceOf(playerAddress),
  ]);

  return {
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
    balance: balance.toString(),
  };
};

// Start game on blockchain
export const startGameOnChain = async (
  signer: ethers.Signer,
  contractAddress: string,
  difficulty: number,
) => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const tx = await contract.startGame(difficulty);
  return await tx.wait();
};

// Record win on blockchain
export const recordWinOnChain = async (
  signer: ethers.Signer,
  contractAddress: string,
  difficulty: number,
  time: number,
  coinsFound: number,
) => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const tx = await contract.recordWin(difficulty, time, coinsFound);
  return await tx.wait();
};

// Record loss on blockchain
export const recordLossOnChain = async (
  signer: ethers.Signer,
  contractAddress: string,
  difficulty: number,
) => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const tx = await contract.recordLoss(difficulty);
  return await tx.wait();
};

// Submit score to Monad Games ID system
export const submitScoreOnChain = async (
  signer: ethers.Signer,
  contractAddress: string,
  score: number,
  transactionCount: number,
) => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const scoreInWei = ethers.parseEther(score.toString());
  const tx = await contract.submitScore(scoreInWei, transactionCount);
  return await tx.wait();
};

// Claim rewards from the game contract
export const claimRewards = async (
  signer: ethers.Signer,
  contractAddress: string,
) => {
  const contract = getCoinSweeperContract(signer, contractAddress);
  const tx = await contract.claimRewards();
  return await tx.wait();
};

// Get contract configuration for current network
export const getContractConfig = (
  chainId: number,
): { address: string; abi: any[] } => {
  const network = Object.values(NETWORKS).find((n) => n.chainId === chainId);
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  // Find the network key by chainId
  const networkKey = Object.keys(NETWORKS).find(
    (key) => (NETWORKS as any)[key].chainId === chainId,
  );

  if (!networkKey) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  const contractAddress = (CONTRACT_ADDRESSES as any)[networkKey];
  if (!contractAddress) {
    throw new Error(`No contract deployed on network: ${chainId}`);
  }

  return {
    address: contractAddress,
    abi: COINSWEEPER_ABI,
  };
};

// Check if Monad Games ID is supported on current network
export const isMonadGamesIDSupported = (chainId: number): boolean => {
  return MONAD_GAMES_CONFIG.supportedNetworks.includes(chainId);
};

// Format address for display
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format timestamp for display
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

// Setup wallet event listeners
export const setupWalletListeners = (
  provider: any,
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void,
) => {
  // Check if the provider supports these events
  if (provider && provider.on && typeof provider.on === "function") {
    // Listen to the MetaMask provider directly
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);

    return () => {
      if (
        provider.removeListener &&
        typeof provider.removeListener === "function"
      ) {
        provider.removeListener("accountsChanged", onAccountsChanged);
        provider.removeListener("chainChanged", onChainChanged);
      }
    };
  }

  // Fallback: return empty cleanup function
  return () => {};
};

// Monad Games ID specific functions
export const openMonadGamesLeaderboard = () => {
  window.open(MONAD_GAMES_CONFIG.leaderboardUrl, '_blank');
};
