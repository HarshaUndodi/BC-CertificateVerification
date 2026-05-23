require("@nomicfoundation/hardhat-toolbox");

const { vars } = require("hardhat/config");

// Safe retrieval of environment variables
const INFURA_API_KEY = vars.has("INFURA_API_KEY") ? vars.get("INFURA_API_KEY") : "";
const SEPOLIA_PRIVATE_KEY = vars.has("SEPOLIA_PRIVATE_KEY") ? vars.get("SEPOLIA_PRIVATE_KEY") : "";

const config = {
  solidity: "0.8.24",
  networks: {},
};

if (SEPOLIA_PRIVATE_KEY) {
  // Use public RPC as primary (works without API key)
  config.networks.sepolia = {
    url: INFURA_API_KEY
      ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
      : `https://ethereum-sepolia-rpc.publicnode.com`,
    accounts: [SEPOLIA_PRIVATE_KEY],
  };
}

module.exports = config;