// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CoinSweeper is Ownable, ReentrancyGuard {
    // Game statistics
    struct GameStats {
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 totalCoinsFound;
        uint256 bestTime;
        uint256 totalRewards;
        uint256 pendingRewards;
    }
    
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }
    
    // Events
    event GameStarted(address indexed player, uint256 difficulty);
    event GameWon(address indexed player, uint256 difficulty, uint256 time, uint256 reward);
    event GameLost(address indexed player, uint256 difficulty);
    event RewardClaimed(address indexed player, uint256 amount);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 transactionCount);
    
    // State variables
    mapping(address => GameStats) public playerStats;
    mapping(uint256 => LeaderboardEntry) public leaderboard;
    uint256 public leaderboardCount;
    
    // Reward configuration
    uint256 public rewardPerWin = 100 ether; // Base reward amount in wei
    uint256 public minTimeForBonus = 300; // 5 minutes for bonus
    uint256 public bonusMultiplier = 2; // 2x bonus for fast wins
    
    // Difficulty multipliers
    mapping(uint256 => uint256) public difficultyMultipliers;
    
    // Optional reward token (can be address(0) for ETH rewards)
    IERC20 public rewardToken;
    
    // Game registration for Monad Games ID
    bool public gameRegistered;
    string public gameName;
    address public gameRegistrar;
    
    constructor() Ownable(msg.sender) {
        // Set difficulty multipliers (1 = Easy, 2 = Medium, 3 = Hard)
        difficultyMultipliers[1] = 1;   // Easy: 1x
        difficultyMultipliers[2] = 2;   // Medium: 2x
        difficultyMultipliers[3] = 4;   // Hard: 4x
        
        // Initialize game registration
        gameName = "CoinSweeper";
        gameRegistered = false;
    }
    
    // Register game with Monad Games ID (owner only)
    function registerGame(string memory _gameName, address _registrar) external onlyOwner {
        gameName = _gameName;
        gameRegistrar = _registrar;
        gameRegistered = true;
    }
    
    // Start a new game
    function startGame(uint256 difficulty) external {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        
        playerStats[msg.sender].gamesPlayed++;
        emit GameStarted(msg.sender, difficulty);
    }
    
    // Record a game win
    function recordWin(uint256 difficulty, uint256 time, uint256 coinsFound) 
        external 
        nonReentrant 
    {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        require(time > 0, "Invalid time");
        
        GameStats storage stats = playerStats[msg.sender];
        stats.gamesWon++;
        stats.totalCoinsFound += coinsFound;
        
        // Update best time if better
        if (stats.bestTime == 0 || time < stats.bestTime) {
            stats.bestTime = time;
        }
        
        // Calculate reward
        uint256 baseReward = rewardPerWin * difficultyMultipliers[difficulty];
        uint256 finalReward = baseReward;
        
        // Bonus for fast completion
        if (time <= minTimeForBonus) {
            finalReward = baseReward * bonusMultiplier;
        }
        
        // Add to pending rewards
        stats.pendingRewards += finalReward;
        stats.totalRewards += finalReward;
        
        // Update leaderboard
        updateLeaderboard(msg.sender, finalReward);
        
        emit GameWon(msg.sender, difficulty, time, finalReward);
    }
    
    // Record a game loss
    function recordLoss(uint256 difficulty) external {
        require(difficulty >= 1 && difficulty <= 3, "Invalid difficulty");
        emit GameLost(msg.sender, difficulty);
    }
    
    // Submit score and transaction count to Monad Games ID system
    function submitScore(uint256 score, uint256 transactionCount) external {
        require(gameRegistered, "Game not registered with Monad Games ID");
        
        // Update leaderboard with submitted score
        updateLeaderboard(msg.sender, score);
        
        emit ScoreSubmitted(msg.sender, score, transactionCount);
    }
    
    // Claim pending rewards
    function claimRewards() external nonReentrant {
        GameStats storage stats = playerStats[msg.sender];
        uint256 pending = stats.pendingRewards;
        require(pending > 0, "No rewards to claim");
        
        stats.pendingRewards = 0;
        
        if (address(rewardToken) != address(0)) {
            // Transfer ERC20 tokens
            require(rewardToken.transfer(msg.sender, pending), "Token transfer failed");
        } else {
            // Transfer ETH
            require(address(this).balance >= pending, "Insufficient contract balance");
            payable(msg.sender).transfer(pending);
        }
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    // Get player stats
    function getPlayerStats(address player) external view returns (
        uint256 gamesPlayed,
        uint256 gamesWon,
        uint256 totalCoinsFound,
        uint256 bestTime,
        uint256 totalRewards
    ) {
        GameStats memory stats = playerStats[player];
        return (
            stats.gamesPlayed,
            stats.gamesWon,
            stats.totalCoinsFound,
            stats.bestTime,
            stats.totalRewards
        );
    }
    
    // Get player balance (pending rewards)
    function getPlayerBalance(address player) external view returns (uint256) {
        return playerStats[player].pendingRewards;
    }
    
    // Get leaderboard entry
    function getLeaderboardEntry(uint256 index) external view returns (
        address player,
        uint256 score,
        uint256 timestamp
    ) {
        require(index < leaderboardCount, "Index out of bounds");
        LeaderboardEntry memory entry = leaderboard[index];
        return (
            entry.player,
            entry.score,
            entry.timestamp
        );
    }
    
    // Update leaderboard
    function updateLeaderboard(address player, uint256 score) internal {
        // Simple leaderboard implementation - adds new entries up to limit
        if (leaderboardCount < 100) {
            leaderboard[leaderboardCount] = LeaderboardEntry({
                player: player,
                score: score,
                timestamp: block.timestamp
            });
            leaderboardCount++;
        } else {
            // Replace lowest score if new score is higher
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
                    timestamp: block.timestamp
                });
            }
        }
    }
    
    // Owner functions
    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
    }
    
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
    
    function emergencyWithdrawTokens(address token) external onlyOwner {
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance > 0, "No token balance to withdraw");
        require(tokenContract.transfer(owner(), balance), "Token transfer failed");
    }
    
    // Fund contract with ETH for rewards
    receive() external payable {}
    
    // Fund contract with tokens for rewards
    function fundWithTokens(uint256 amount) external {
        require(address(rewardToken) != address(0), "No reward token set");
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
    }
}