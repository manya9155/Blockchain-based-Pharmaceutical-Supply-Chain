const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PharmaTraceability...");

  const PharmaTraceability = await ethers.getContractFactory("PharmaTraceability");

  // Deploy the contract
  const contract = await PharmaTraceability.deploy();

  // Wait for deployment (ethers v6)
  await contract.waitForDeployment();

  // Get deployed address
  const address = await contract.getAddress();

  console.log("PharmaTraceability deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
