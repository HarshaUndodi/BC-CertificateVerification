import { ethers } from 'ethers';

export async function getBlockchain(needSigner = false) {
  // If we need to write/mint (Admin only), we need MetaMask
  if (needSigner) {
    if (typeof window.ethereum !== 'undefined') {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return { signer };
    }
    throw new Error("MetaMask is required for this action.");
  }

  // PUBLIC READ-ONLY PROVIDER (For Verification)
  // Free public RPC - no API key needed!
  const publicProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  return { signer: publicProvider }; 
}

export default getBlockchain;