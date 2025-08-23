import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  WalletState,
  Web3GameState,
  GameStats,
  LeaderboardEntry,
  TransactionState,
  MonadGamesUser,
} from "../types/web3";
import {
  getPlayerStats,
  getLeaderboard,
  getContractConfig,
  startGameOnChain,
  recordWinOnChain,
  recordLossOnChain,
  submitScoreOnChain,
  claimRewards,
  isMonadGamesIDSupported,
} from "../utils/web3Utils";

// Extended state interface
interface ExtendedWeb3State extends Web3GameState {
  monadUser: MonadGamesUser | null;
  transaction: TransactionState;
}

// Action types
type Web3Action =
  | { type: "SET_WALLET"; payload: WalletState }
  | { type: "SET_GAME_STATS"; payload: GameStats | null }
  | { type: "SET_LEADERBOARD"; payload: LeaderboardEntry[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TRANSACTION"; payload: TransactionState }
  | { type: "SET_MONAD_USER"; payload: MonadGamesUser | null }
  | { type: "CLEAR_ERROR" };

// Initial state
const initialState: ExtendedWeb3State = {
  wallet: {
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    provider: null,
    signer: null,
  },
  gameStats: null,
  leaderboard: [],
  isLoading: false,
  error: null,
  monadUser: null,
  transaction: {
    isPending: false,
    hash: null,
    error: null,
  },
};

// Reducer
const web3Reducer = (
  state: ExtendedWeb3State,
  action: Web3Action
): ExtendedWeb3State => {
  switch (action.type) {
    case "SET_WALLET":
      return { ...state, wallet: action.payload };
    case "SET_GAME_STATS":
      return { ...state, gameStats: action.payload };
    case "SET_LEADERBOARD":
      return { ...state, leaderboard: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_TRANSACTION":
      return { ...state, transaction: action.payload };
    case "SET_MONAD_USER":
      return { ...state, monadUser: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
};

// Context interface
interface PrivyWeb3ContextType extends ExtendedWeb3State {
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToMonadTestnet: () => Promise<void>;
  
  // Game methods
  startGameOnChain: (difficulty: number) => Promise<void>;
  recordWinOnChain: (difficulty: number, time: number, coinsFound: number) => Promise<void>;
  recordLossOnChain: (difficulty: number) => Promise<void>;
  submitScore: (score: number, transactionCount: number) => Promise<void>;
  claimRewards: () => Promise<void>;
  
  // Data methods
  refreshStats: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  
  // Computed properties
  isConnected: boolean;
  isCorrectNetwork: boolean;
  address: string | null;
  chainId: number | null;
  clearError: () => void;
}

const PrivyWeb3Context = createContext<PrivyWeb3ContextType | undefined>(undefined);

// Provider component
export const PrivyWeb3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(web3Reducer, initialState);
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Extract Monad Games ID user info from cross-app account
  const getMonadGamesUser = useCallback((): MonadGamesUser | null => {
    if (!user?.linkedAccounts) return null;
    
    // Find cross-app account linked to Monad Games ID
    const crossAppAccount = user.linkedAccounts.find(
      (account: any) => account.type === 'cross_app' && 
      account.providerAppId === 'cmd8euall0037le0my79qpz42'
    );
    
    if (!crossAppAccount) return null;
    
    // Extract user data from cross-app account
    const userData = crossAppAccount as any;
    
    return {
      username: userData.username || userData.subject || null,
      walletAddress: state.wallet.address || null,
      isRegistered: Boolean(userData.username),
      crossAppId: userData.subject || null,
      providerAppId: 'cmd8euall0037le0my79qpz42'
    };
  }, [user, state.wallet.address]);

  // Update wallet state when Privy state changes
  useEffect(() => {
    const updateWalletState = async (): Promise<void> => {
      if (!authenticated || wallets.length === 0) {
        dispatch({
          type: "SET_WALLET",
          payload: {
            isConnected: false,
            address: null,
            balance: null,
            chainId: null,
            provider: null,
            signer: null,
          },
        });
        dispatch({ type: "SET_MONAD_USER", payload: null });
        return;
      }

      try {
        const wallet = wallets.find((w) => w.walletClientType === "privy");
        if (!wallet) {
          throw new Error("No Privy wallet found");
        }

        // Get provider and signer
        const provider = await wallet.getEthersProvider();
        const signer = provider.getSigner();
        
        // Get account details
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const network = await provider.getNetwork();

        const walletState: WalletState = {
          isConnected: true,
          address,
          balance: ethers.formatEther(balance),
          chainId: Number(network.chainId),
          provider,
          signer,
        };

        dispatch({ type: "SET_WALLET", payload: walletState });

        // Set Monad Games user info
        const monadGamesUser = getMonadGamesUser();
        dispatch({ type: "SET_MONAD_USER", payload: monadGamesUser });

        // Load initial data if on supported network
        if (isMonadGamesIDSupported(Number(network.chainId))) {
          await refreshStats();
          await refreshLeaderboard();
        }
      } catch (error) {
        console.error("Error updating wallet state:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet";
        dispatch({ type: "SET_ERROR", payload: errorMessage });
      }
    };

    updateWalletState();
  }, [authenticated, wallets, getMonadGamesUser]);

  // Connect wallet using Privy
  const connect = async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      if (!authenticated) {
        await login();
        return;
      }

      // Get the connected wallet
      const wallet = wallets.find((w) => w.walletClientType === "privy");
      if (!wallet) {
        throw new Error("No Privy wallet found");
      }

      // Get provider and signer
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();
      
      // Get account details
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();

      const walletState: WalletState = {
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        provider,
        signer,
      };

      dispatch({ type: "SET_WALLET", payload: walletState });

      // Set Monad Games user info
      const monadGamesUser = getMonadGamesUser();
      dispatch({ type: "SET_MONAD_USER", payload: monadGamesUser });

      // Load initial data if on supported network
      if (isMonadGamesIDSupported(Number(network.chainId))) {
        await refreshStats();
        await refreshLeaderboard();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Disconnect wallet
  const disconnect = async (): Promise<void> => {
    await logout();
    dispatch({ type: "SET_WALLET", payload: {
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      provider: null,
      signer: null,
    }});
    dispatch({ type: "SET_GAME_STATS", payload: null });
    dispatch({ type: "SET_LEADERBOARD", payload: [] });
    dispatch({ type: "SET_MONAD_USER", payload: null });
  };

  // Switch to Monad Testnet
  const switchToMonadTestnet = async (): Promise<void> => {
    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      throw new Error("No wallet connected");
    }

    try {
      await wallet.switchChain(41454); // Monad Testnet chain ID
      // Reconnect after chain switch
      await connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to switch network";
      dispatch({ type: "SET_ERROR", payload: `Failed to switch to Monad Testnet: ${errorMessage}` });
    }
  };

  // Refresh player stats
  const refreshStats = async (): Promise<void> => {
    if (
      !state.wallet.isConnected ||
      !state.wallet.signer ||
      !state.wallet.address ||
      !state.wallet.chainId
    ) {
      return;
    }

    try {
      const contractConfig = getContractConfig(state.wallet.chainId);
      const stats = await getPlayerStats(
        state.wallet.signer,
        contractConfig.address,
        state.wallet.address,
      );
      
      // Add username from Monad Games ID
      if (state.monadUser?.username) {
        stats.username = state.monadUser.username;
      }
      
      dispatch({ type: "SET_GAME_STATS", payload: stats });
    } catch (error) {
      console.error("Error loading stats:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load game stats" });
    }
  };

  // Refresh leaderboard
  const refreshLeaderboard = async (): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      return;
    }

    try {
      const contractConfig = getContractConfig(state.wallet.chainId);
      const leaderboard = await getLeaderboard(
        state.wallet.signer,
        contractConfig.address,
      );
      dispatch({ type: "SET_LEADERBOARD", payload: leaderboard });
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load leaderboard" });
    }
  };

  // Game functions with the same signatures as before
  const startGame = async (difficulty: number): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      throw new Error("Wallet not connected");
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const contractConfig = getContractConfig(state.wallet.chainId);
      
      await startGameOnChain(
        state.wallet.signer,
        contractConfig.address,
        difficulty,
      );

      await refreshStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start game";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const recordWin = async (
    difficulty: number,
    time: number,
    coinsFound: number,
  ): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      throw new Error("Wallet not connected");
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const contractConfig = getContractConfig(state.wallet.chainId);

      await recordWinOnChain(
        state.wallet.signer,
        contractConfig.address,
        difficulty,
        time,
        coinsFound,
      );

      await refreshStats();
      await refreshLeaderboard();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to record win";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const recordLoss = async (difficulty: number): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      throw new Error("Wallet not connected");
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const contractConfig = getContractConfig(state.wallet.chainId);

      await recordLossOnChain(
        state.wallet.signer,
        contractConfig.address,
        difficulty,
      );

      await refreshStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to record loss";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Submit score to Monad Games ID
  const submitScore = async (score: number, transactionCount: number): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      throw new Error("Wallet not connected");
    }

    if (!isMonadGamesIDSupported(state.wallet.chainId)) {
      throw new Error("Monad Games ID not supported on this network");
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const contractConfig = getContractConfig(state.wallet.chainId);

      await submitScoreOnChain(
        state.wallet.signer,
        contractConfig.address,
        score,
        transactionCount,
      );

      await refreshLeaderboard();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit score";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const claimPlayerRewards = async (): Promise<void> => {
    if (!state.wallet.isConnected || !state.wallet.signer || !state.wallet.chainId) {
      throw new Error("Wallet not connected");
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const contractConfig = getContractConfig(state.wallet.chainId);

      await claimRewards(state.wallet.signer, contractConfig.address);

      await refreshStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to claim rewards";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  // Auto-connect when Privy is ready and user is authenticated
  useEffect(() => {
    if (ready && authenticated && !state.wallet.isConnected) {
      connect();
    }
  }, [ready, authenticated, state.wallet.isConnected]);

  const contextValue: PrivyWeb3ContextType = {
    ...state,
    connect,
    disconnect,
    refreshStats,
    refreshLeaderboard,
    startGameOnChain: startGame,
    recordWinOnChain: recordWin,
    recordLossOnChain: recordLoss,
    submitScore,
    claimRewards: claimPlayerRewards,
    clearError,
    switchToMonadTestnet,
    isConnected: state.wallet.isConnected,
    isCorrectNetwork: state.wallet.chainId === 41454,
    address: state.wallet.address,
    chainId: state.wallet.chainId,
  };

  return (
    <PrivyWeb3Context.Provider value={contextValue}>
      {children}
    </PrivyWeb3Context.Provider>
  );
};

// Hook to use Privy Web3 context
export const usePrivyWeb3 = (): PrivyWeb3ContextType => {
  const context = useContext(PrivyWeb3Context);
  if (context === undefined) {
    throw new Error("usePrivyWeb3 must be used within a PrivyWeb3Provider");
  }
  return context;
};
