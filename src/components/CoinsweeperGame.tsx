import React, { useState, useEffect, useCallback } from "react";
import { GameState, Difficulty, DIFFICULTIES } from "../types/game";
import { usePrivyWeb3 } from "../contexts/PrivyWeb3Context";
import {
  initializeGame,
  revealCell,
  toggleFlag,
  checkGameWon,
  countCoinsFound,
  countFlagsPlaced,
} from "../utils/gameLogic";
import GameBoard from "./GameBoard";
import GameInfo from "./GameInfo";
import "./CoinsweeperGame.css";

const CoinsweeperGame: React.FC = () => {
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(
    DIFFICULTIES[0],
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGame(DIFFICULTIES[0]),
  );
  const {
    isConnected,
    isCorrectNetwork,
    startGameOnChain,
    recordWinOnChain,
    recordLossOnChain,
    error: web3Error,
  } = usePrivyWeb3();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (gameState.startTime && !gameState.gameOver && !gameState.gameWon) {
      interval = setInterval(() => {
        setGameState((prev) => ({ ...prev }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.startTime, gameState.gameOver, gameState.gameWon]);

  const startNewGame = useCallback(async () => {
    const newGameState = initializeGame(currentDifficulty);
    setGameState(newGameState);

    // Record game start on blockchain if wallet is connected and on correct network
    if (isConnected && isCorrectNetwork) {
      try {
        const difficultyNumber =
          DIFFICULTIES.findIndex((d) => d.name === currentDifficulty.name) + 1;
        await startGameOnChain(difficultyNumber);
      } catch (error) {
        console.error("Failed to record game start on blockchain:", error);
      }
    }
  }, [currentDifficulty, isConnected, isCorrectNetwork, startGameOnChain]);

  const handleDifficultyChange = useCallback((difficulty: Difficulty) => {
    setCurrentDifficulty(difficulty);
    const newGameState = initializeGame(difficulty);
    setGameState(newGameState);
  }, []);

  const handleCellLeftClick = useCallback(
    async (row: number, col: number) => {
      if (gameState.gameOver || gameState.gameWon) return;

      const cell = gameState.board[row][col];
      if (cell.isFlagged || cell.isRevealed) return;

      // Start timer on first click
      const startTime = gameState.startTime || Date.now();

      let newBoard = revealCell(gameState.board, row, col);

      // Check if game is over (found a coin)
      const isGameOver = cell.hasCoin;

      // Check if game is won
      const isGameWon = !isGameOver && checkGameWon(newBoard);

      const newGameState: GameState = {
        ...gameState,
        board: newBoard,
        gameOver: isGameOver,
        gameWon: isGameWon,
        coinsFound: countCoinsFound(newBoard),
        flagsPlaced: countFlagsPlaced(newBoard),
        startTime,
        endTime: isGameOver || isGameWon ? Date.now() : null,
      };

      setGameState(newGameState);

      // Record game result on blockchain if wallet is connected and on correct network
      if (isConnected && isCorrectNetwork && (isGameOver || isGameWon)) {
        try {
          const difficultyNumber =
            DIFFICULTIES.findIndex((d) => d.name === currentDifficulty.name) +
            1;
          const gameTime = Math.floor(
            (newGameState.endTime! - startTime) / 1000,
          );

          if (isGameWon) {
            await recordWinOnChain(
              difficultyNumber,
              gameTime,
              newGameState.coinsFound,
            );
          } else {
            await recordLossOnChain(difficultyNumber);
          }
        } catch (error) {
          console.error("Failed to record game result on blockchain:", error);
        }
      }
    },
    [
      gameState,
      currentDifficulty,
      isConnected,
      isCorrectNetwork,
      recordWinOnChain,
      recordLossOnChain,
    ],
  );

  const handleCellRightClick = useCallback(
    (row: number, col: number) => {
      if (gameState.gameOver || gameState.gameWon) return;

      const cell = gameState.board[row][col];
      if (cell.isRevealed) return;

      const newBoard = toggleFlag(gameState.board, row, col);

      const newGameState: GameState = {
        ...gameState,
        board: newBoard,
        flagsPlaced: countFlagsPlaced(newBoard),
      };

      setGameState(newGameState);
    },
    [gameState],
  );

  return (
    <div className="coinsweeper-game">
      {!isCorrectNetwork && isConnected && (
        <div className="network-warning">
          <span>⚠️ Please switch to Monad Testnet to play and earn rewards</span>
        </div>
      )}

      <GameBoard
        gameState={gameState}
        onCellLeftClick={handleCellLeftClick}
        onCellRightClick={handleCellRightClick}
        onNewGame={startNewGame}
      />

      <GameInfo
        gameState={gameState}
        currentDifficulty={currentDifficulty}
        onDifficultyChange={handleDifficultyChange}
        difficulties={DIFFICULTIES}
      />
    </div>
  );
};

export default CoinsweeperGame;
