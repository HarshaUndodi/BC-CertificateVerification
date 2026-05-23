const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    const abi = ["function getOwner() view returns (address)"];
    const contract = new ethers.Contract("0x3F6C1E8d42724de4daBd3eB3310B74C69A84643c", abi, provider);
    const owner = await contract.getOwner();
    console.log("Contract Owner:", owner);
}
main().catch(console.error);
