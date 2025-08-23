const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CoinSweeper to Monad Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("Warning: Low balance. Make sure you have enough MON for deployment.");
  }

  // Deploy CoinSweeper contract
  console.log("\nDeploying CoinSweeper contract...");
  const CoinSweeper = await ethers.getContractFactory("CoinSweeper");
  
  // Deploy with constructor parameters (no parameters needed for simplified version)
  const coinSweeper = await CoinSweeper.deploy();
  await coinSweeper.waitForDeployment();

  const coinSweeperAddress = await coinSweeper.getAddress();
  console.log("CoinSweeper deployed to:", coinSweeperAddress);

  // Register game with Monad Games ID (placeholder - actual registration would be done through their system)
  console.log("\nRegistering game with Monad Games ID...");
  try {
    const registerTx = await coinSweeper.registerGame(
      "CoinSweeper",
      deployer.address // Using deployer as registrar for now
    );
    await registerTx.wait();
    console.log("Game registered successfully!");
  } catch (error) {
    console.error("Failed to register game:", error.message);
  }

  // Set initial configuration
  console.log("\nSetting initial configuration...");
  
  // Set reward per win (100 MON in wei)
  const rewardPerWin = ethers.parseEther("100");
  const setRewardTx = await coinSweeper.setRewardPerWin(rewardPerWin);
  await setRewardTx.wait();
  console.log("Reward per win set to:", ethers.formatEther(rewardPerWin), "MON");

  // Fund contract with initial rewards (1000 MON)
  const fundAmount = ethers.parseEther("1000");
  console.log("\nFunding contract with", ethers.formatEther(fundAmount), "MON...");
  
  const fundTx = await deployer.sendTransaction({
    to: coinSweeperAddress,
    value: fundAmount,
  });
  await fundTx.wait();
  console.log("Contract funded successfully!");

  // Verify contract balance
  const contractBalance = await deployer.provider.getBalance(coinSweeperAddress);
  console.log("Contract balance:", ethers.formatEther(contractBalance), "MON");

  // Display deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Monad Testnet");
  console.log("CoinSweeper Contract:", coinSweeperAddress);
  console.log("Deployer:", deployer.address);
  console.log("Contract Balance:", ethers.formatEther(contractBalance), "MON");
  console.log("Reward per Win:", ethers.formatEther(rewardPerWin), "MON");

  // Save deployment info
  const deploymentInfo = {
    network: "monadTestnet",
    chainId: 41454,
    contractAddress: coinSweeperAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contractBalance: ethers.formatEther(contractBalance),
    rewardPerWin: ethers.formatEther(rewardPerWin),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-monad.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-monad.json");

  console.log("\n=== Next Steps ===");
  console.log("1. Update CONTRACT_ADDRESSES in src/types/web3.ts with the deployed address");
  console.log("2. Register the game officially with Monad Games ID system");
  console.log("3. Test the integration on Monad Testnet");
  console.log("4. Submit scores to verify leaderboard integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
