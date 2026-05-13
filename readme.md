# 🛡️ CertiSafe: Blockchain Certificate Verification System

CertiSafe is a professional decentralized application (dApp) designed to issue and verify tamper-proof academic credentials. By combining the **Ethereum Blockchain (Sepolia)** with **IPFS (InterPlanetary File System)**, CertiSafe ensures that certificates are secure, permanent, and easily verifiable via QR codes.

## 🌟 Key Features

-   **Decentralized Storage**: Certificate metadata is stored on IPFS, ensuring data longevity and reducing on-chain gas costs.
-   **Immutable Records**: All issuance events are recorded on the Ethereum Sepolia Testnet.
-   **Regal UI/UX**: A premium dashboard featuring glass-morphism, custom typography, and official academic styling.
-   **Scan-to-Verify**: Integrated QR codes that lead to a mobile-responsive public verification page.
-   **PDF Export**: High-resolution "Official Diploma" generation for students to download and print.
-   **Security First**: Environment variable management to protect sensitive API keys.

## 🛠️ Technology Stack

-   **Smart Contracts**: Solidity, Hardhat
-   **Frontend**: React.js, Vite, React Router
-   **Blockchain Interaction**: Ethers.js (v6)
-   **Storage**: IPFS (via Pinata API)
-   **Deployment**: Sepolia Testnet

## 🚀 Getting Started

### 1. Smart Contract (Hardhat)
```bash
# Install dependencies
npm install

# Compile the contract
npx hardhat compile

# Deploy to Sepolia
npx hardhat ignition deploy ./ignition/modules/CertificateModule.js --network sepolia
```

### 2. Frontend (React)
```bash
cd Frontend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file and add:
# VITE_PINATA_JWT=your_jwt_here
# VITE_CONTRACT_ADDRESS=your_deployed_address_here

# Run locally
npm run dev
```

## 📜 How to Verify
Candidates can share their **Certificate ID** or the **QR Code**. 
- Scanning the QR code leads to: `https://[your-domain]/verify/[ID]`
- The system automatically cross-references the Blockchain and IPFS to confirm authenticity.

---

### 🛡️ Security Note
The `.env` file and `vars.json` are excluded from this repository to protect private keys. Always use your own API keys for production deployments.

---
Created with ❤️ for the Blockchain Lab Presentation.