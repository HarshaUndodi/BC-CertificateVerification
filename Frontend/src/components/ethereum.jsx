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
  const infuraId = import.meta.env.VITE_INFURA_ID;
  const publicProvider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraId}`);
  return { signer: publicProvider }; 
}

export default getBlockchain;