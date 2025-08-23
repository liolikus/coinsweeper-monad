// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CoinSweeper is Ownable, ReentrancyGuard {
    // Game statistics for each player
    struct GameStats {
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 totalCoinsFound;
        uint256 bestTime;
        uint256 totalScore;
        uint256 pendingRewards;
    }
    
    // Leaderboard entry
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        string username; // For Monad Games ID integration
    }
    
    // Events for Monad Games ID integration
    event GameStarted(address indexed player, uint256 difficulty, uint256 timestamp);
    event GameWon(address indexed player, uint256 difficulty, uint256 time, uint256 coinsFound, uint256 score);
    event GameLost(address indexed player, uint256 difficulty);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 transactionCount, string username);
    event RewardClaimed(address indexed player, uint256 amount);
    event GameRegistered(string gameName, address registrar);
    
    // State variables
    mapping(address => GameStats) public playerStats;
    mapping(uint256 => LeaderboardEntry) public leaderboard;
    mapping(address => string) public playerUsernames; // Monad Games ID usernames
    uint256 public leaderboardCount;
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;
    
    // Reward configuration
    uint256 public rewardPerWin = 100 ether; // 100 MON tokens
    uint256 public minTimeForBonus = 300; // 5 minutes for time bonus
    uint256 public bonusMultiplier = 2; // 2x bonus for fast completion
    
    // Difficulty multipliers (1=Easy, 2=Medium, 3=Hard)
    mapping(uint256 => uint256) public difficultyMultipliers;
    
    // Monad Games ID registration
    bool public gameRegistered;
    string public gameName;
    address public gameRegistrar;
    
    constructor() Ownable(msg.sender) {
        // Initialize difficulty multipliers
        difficultyMultipliers[1] = 1;   // Easy: 1x
        difficultyMultipliers[2] = 2;   // Medium: 2x  
        difficultyMultipliers[3] = 4;   // Hard: 4x
        
        // Initialize game info
        gameName = "CoinSweeper";
        gameRegistered = false;
    }
    
    // Register game with Monad Games ID (owner only)
    function registerGame(string memory _gameName, address _registrar) external onlyOwner {
        gameName = _gameName;
        gameRegistrar = _registrar;
        gameRegistered = true;
        
        emit GameRegistered(_gameName, _registrar);
    }
    
    // Set player username from Monad Games ID
    function setPlayerUsername(address player, string memory username) external {
        require(gameRegistered, "Game not registered with Monad Games ID");
        require(msg.sender == gameRegistrar || msg.sender == player, "Unauthorized");
        
        playerUsernames[player] = username;
    }
    
    // Start a new game
    function startGame(uint256 difficulty) external {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        
        playerStats[msg.sender].gamesPlayed++;
        
        emit GameStarted(msg.sender, difficulty, block.timestamp);
    }
    
    // Record a game win with score calculation
    function recordWin(
        uint256 difficulty,
        uint256 gameTime,
        uint256 coinsFound
    ) external nonReentrant {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        require(gameTime > 0, "Invalid game time");
        
        GameStats storage stats = playerStats[msg.sender];
        stats.gamesWon++;
        stats.totalCoinsFound += coinsFound;
        
        // Update best time
        if (stats.bestTime == 0 || gameTime < stats.bestTime) {
            stats.bestTime = gameTime;
        }
        
        // Calculate score based on difficulty, time, and coins found
        uint256 baseScore = 1000 * difficultyMultipliers[difficulty];
        uint256 timeBonus = gameTime <= minTimeForBonus ? baseScore * bonusMultiplier : baseScore;
        uint256 coinBonus = coinsFound * 10 * difficultyMultipliers[difficulty];
        uint256 finalScore = timeBonus + coinBonus;
        
        stats.totalScore += finalScore;
        
        // Calculate MON reward
        uint256 reward = rewardPerWin * difficultyMultipliers[difficulty];
        if (gameTime <= minTimeForBonus) {
            reward *= bonusMultiplier;
        }
        stats.pendingRewards += reward;
        
        // Update leaderboard
        updateLeaderboard(msg.sender, finalScore);
        
        emit GameWon(msg.sender, difficulty, gameTime, coinsFound, finalScore);
    }
    
    // Record a game loss
    function recordLoss(uint256 difficulty) external {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        
        emit GameLost(msg.sender, difficulty);
    }
    
    // Submit score to Monad Games ID leaderboard
    function submitScore(uint256 score, uint256 transactionCount) external {
        require(gameRegistered, "Game not registered with Monad Games ID");
        
        string memory username = playerUsernames[msg.sender];
        if (bytes(username).length == 0) {
            username = "Anonymous";
        }
        
        // Update leaderboard with submitted score
        updateLeaderboard(msg.sender, score);
        
        emit ScoreSubmitted(msg.sender, score, transactionCount, username);
    }
    
    // Update leaderboard with new score
    function updateLeaderboard(address player, uint256 score) internal {
        string memory username = playerUsernames[player];
        if (bytes(username).length == 0) {
            username = "Anonymous";
        }
        
        if (leaderboardCount < MAX_LEADERBOARD_SIZE) {
            // Add new entry
            leaderboard[leaderboardCount] = LeaderboardEntry({
                player: player,
                score: score,
                timestamp: block.timestamp,
                username: username
            });
            leaderboardCount++;
        } else {
            // Find lowest score and replace if new score is higher
            uint256 lowestIndex = 0;
            uint256 lowestScore = leaderboard[0].score;
            
            for (uint256 i = 1; i < leaderboardCount; i++) {
                if (leaderboard[i].score < lowestScore) {
                    lowestScore = leaderboard[i].score;
                    lowestIndex = i;
                }
            }
            
            if (score > lowestScore) {
                leaderboard[lowestIndex] = LeaderboardEntry({
                    player: player,
                    score: score,
                    timestamp: block.timestamp,
                    username: username
                });
            }
        }
    }
    
    // Claim pending MON rewards
    function claimRewards() external nonReentrant {
        GameStats storage stats = playerStats[msg.sender];
        uint256 pending = stats.pendingRewards;
        require(pending > 0, "No rewards to claim");
        
        stats.pendingRewards = 0;
        
        // Transfer MON tokens (native currency on Monad)
        require(address(this).balance >= pending, "Insufficient contract balance");
        payable(msg.sender).transfer(pending);
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    // Get player statistics
    function getPlayerStats(address player) external view returns (
        uint256 gamesPlayed,
        uint256 gamesWon,
        uint256 totalCoinsFound,
        uint256 bestTime,
        uint256 totalScore,
        uint256 pendingRewards
    ) {
        GameStats memory stats = playerStats[player];
        return (
            stats.gamesPlayed,
            stats.gamesWon,
            stats.totalCoinsFound,
            stats.bestTime,
            stats.totalScore,
            stats.pendingRewards
        );
    }
    
    // Get leaderboard entry
    function getLeaderboardEntry(uint256 index) external view returns (
        address player,
        uint256 score,
        uint256 timestamp,
        string memory username
    ) {
        require(index < leaderboardCount, "Index out of bounds");
        LeaderboardEntry memory entry = leaderboard[index];
        return (entry.player, entry.score, entry.timestamp, entry.username);
    }
    
    // Get player username
    function getPlayerUsername(address player) external view returns (string memory) {
        return playerUsernames[player];
    }
    
    // Owner functions for configuration
    function setRewardPerWin(uint256 _rewardPerWin) external onlyOwner {
        rewardPerWin = _rewardPerWin;
    }
    
    function setDifficultyMultiplier(uint256 difficulty, uint256 multiplier) external onlyOwner {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        difficultyMultipliers[difficulty] = multiplier;
    }
    
    function setMinTimeForBonus(uint256 _minTimeForBonus) external onlyOwner {
        minTimeForBonus = _minTimeForBonus;
    }
    
    function setBonusMultiplier(uint256 _bonusMultiplier) external onlyOwner {
        bonusMultiplier = _bonusMultiplier;
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // Fund contract with MON for rewards
    receive() external payable {}
    
    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
