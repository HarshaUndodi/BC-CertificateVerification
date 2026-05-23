const { ethers } = require("ethers");
const { vars } = require("hardhat/config");

const pk = vars.get("SEPOLIA_PRIVATE_KEY");
if (pk) {
    const wallet = new ethers.Wallet(pk);
    console.log("Deployer Address:", wallet.address);
} else {
    console.log("No private key found in vars");
}
