import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';

function PublicVerify() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading', 'verified', 'failed'
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  useEffect(() => {
    if (id) verifyOnChain();
  }, [id]);

  const verifyOnChain = async () => {
    try {
      const { signer } = await getBlockchain(false);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const result = await contract.verifyCertificate(id);

      if (!result.isValid) {
        setStatus('failed');
        setError('This certificate ID does not exist on the blockchain.');
        return;
      }

      let certDetails = {
        id: id,
        issuer: result.issuer,
        course: result.data,
        grade: 'N/A',
        date: 'N/A',
      };

      // If data is an IPFS hash, fetch full details
      if (result.data.startsWith('Qm')) {
        try {
          const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${result.data}`);
          const ipfs = response.data;
          certDetails = {
            id: id,
            issuer: ipfs.issuer || result.issuer,
            recipient: ipfs.recipient || 'N/A',
            course: ipfs.course || 'N/A',
            grade: ipfs.grade || 'N/A',
            date: ipfs.date || 'N/A',
            type: ipfs.type || 'Academic Certificate',
          };
        } catch (e) {
          console.warn("IPFS fetch failed, using on-chain data", e);
        }
      } else if (result.data.includes('|')) {
        // Parse combined string format: "Course: X | Grade: Y | Date: Z"
        const parts = result.data.split('|');
        certDetails.course = parts[0]?.split(':')[1]?.trim() || result.data;
        certDetails.grade = parts[1]?.split(':')[1]?.trim() || 'N/A';
        certDetails.date = parts[2]?.split(':')[1]?.trim() || 'N/A';
      }

      setDetails(certDetails);
      setStatus('verified');
    } catch (err) {
      console.error(err);
      setStatus('failed');
      setError(err.reason || err.message || 'Verification failed.');
    }
  };

  return (
    <div className="public-verify-page">
      <div className="public-card">
        <div className="public-logo">🛡️ CertiSafe</div>

        {status === 'loading' && (
          <div className="public-loading">
            <div className="loading-spinner"></div>
            <p>Verifying on Blockchain...</p>
          </div>
        )}

        {status === 'verified' && details && (
          <div className="public-result">
            <div className="verified-badge">
              <span className="check-icon">✅</span>
              <h2>Verified Successfully</h2>
              <p className="verified-sub">This credential is authentic and recorded on the Ethereum Blockchain.</p>
            </div>

            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-label">Certificate ID</span>
                <span className="detail-value">{details.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Institution</span>
                <span className="detail-value">{details.issuer}</span>
              </div>
              {details.recipient && details.recipient !== 'N/A' && (
                <div className="detail-row">
                  <span className="detail-label">Recipient</span>
                  <span className="detail-value">{details.recipient}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Course</span>
                <span className="detail-value">{details.course}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Grade</span>
                <span className="detail-value">{details.grade}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-value">{details.date}</span>
              </div>
              {details.type && (
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{details.type}</span>
                </div>
              )}
            </div>

            <div className="blockchain-badge">
              🔗 Verified on Sepolia Testnet
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="public-result">
            <div className="failed-badge">
              <span className="check-icon">❌</span>
              <h2>Verification Failed</h2>
              <p className="verified-sub">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicVerify;
