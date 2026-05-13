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
  // No MetaMask needed for users scanning the QR code!
  const publicProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12ede4456168");
  return { signer: publicProvider }; // In read-only mode, we use provider as the 'caller'
}

export default getBlockchain;