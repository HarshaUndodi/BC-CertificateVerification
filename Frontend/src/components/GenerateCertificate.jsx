import React, { useState } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import { uploadToIPFS } from '../utils/ipfs';

function GenerateCertificate() {
  const [id, setId] = useState('');
  const [issuer, setIssuer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [course, setCourse] = useState('');
  const [grade, setGrade] = useState('');
  const [date, setDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  const generateRandomID = () => {
    const hash = 'CERT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setId(hash);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !issuer || !recipient || !course) {
      alert("Please fill mandatory fields");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Prepare Metadata for IPFS
      const metadata = {
        id,
        issuer,
        recipient,
        course,
        grade: grade || 'N/A',
        date: date || new Date().toLocaleDateString(),
        type: "Academic Certificate",
        timestamp: Date.now()
      };

      // 2. Upload to IPFS
      alert("Step 1/2: Uploading Certificate to IPFS...");
      const ipfsHash = await uploadToIPFS(metadata);
      console.log("IPFS CID:", ipfsHash);

      // 3. Store the IPFS Hash on Blockchain
      alert("Step 2/2: Storing CID on Blockchain...");
      const { signer } = await getBlockchain();
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      
      // We store the ipfsHash in the 'data' field of our contract
      const tx = await contract.generateCertificate(id, issuer, recipient, ipfsHash);
      await tx.wait();
      
      alert(`Success! Certificate secured on IPFS & Blockchain! ✅\nCID: ${ipfsHash}`);
    } catch (error) {
      console.error(error);
      alert("Integration Failed: " + (error.reason || error.message || "IPFS Key error? Check console."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="section">
      <div className="form-header">
        <h2>Issue New Credential</h2>
        <p>Enter details to mint a tamper-proof certificate on the Ethereum blockchain.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{display: 'flex', gap: '10px', width: '100%', maxWidth: '500px'}}>
          <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="Certificate ID / Hash" />
          <button type="button" onClick={generateRandomID} style={{width: 'auto', padding: '10px'}}>Generate</button>
        </div>
        <input type="text" value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="Issuing Institution (e.g. IIT Bombay)" />
        <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient Wallet Address" />
        <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="Course Name" />
        <div style={{display: 'flex', gap: '10px', width: '100%', maxWidth: '500px'}}>
           <input type="text" value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade (Optional)" />
           <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button type="submit" disabled={isUploading}>
           {isUploading ? <div className="loading-spinner"></div> : "🔒 Mint & Secure Credential"}
        </button>
      </form>
    </div>
  );
}

export default GenerateCertificate;
