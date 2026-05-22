import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import CertificateRenderer from './CertificateTemplates';

function PublicVerify() {
  const { id }  = useParams();
  const [status,  setStatus]  = useState('loading');
  const [details, setDetails] = useState(null);
  const [error,   setError]   = useState('');

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI     = abi.abi;

  useEffect(() => { if (id) verifyOnChain(); }, [id]);

  const verifyOnChain = async () => {
    try {
      const { signer } = await getBlockchain(false);
      const contract   = new ethers.Contract(contractAddress, ContractABI, signer);
      const result     = await contract.verifyCertificate(id);

      if (!result.isValid) {
        setStatus('failed');
        setError('This certificate ID does not exist on the blockchain.');
        return;
      }

      let certDetails = { id, issuer: result.issuer, course: result.data };

      if (result.data.startsWith('Qm')) {
        try {
          const response = await axios.get(
            `https://gateway.pinata.cloud/ipfs/${result.data}`
          );
          certDetails = { id, issuer: result.issuer, ...response.data };
        } catch (e) {
          console.warn('IPFS fetch failed, using on-chain data', e);
        }
      } else if (result.data.includes('|')) {
        const parts = result.data.split('|');
        certDetails.course = parts[0]?.split(':')[1]?.trim() || result.data;
        certDetails.grade  = parts[1]?.split(':')[1]?.trim() || 'N/A';
        certDetails.date   = parts[2]?.split(':')[1]?.trim() || 'N/A';
      }

      setDetails(certDetails);
      setStatus('verified');
    } catch (err) {
      console.error(err);
      setStatus('failed');
      setError(err.reason || err.message || 'Verification failed.');
    }
  };

  const qrUrl = `${window.location.origin}/verify/${id}`;

  /* ─── Loading ─── */
  if (status === 'loading') {
    return (
      <div className="public-verify-page">
        <div className="public-card">
          <div className="public-logo">🛡️ CertiSafe</div>
          <div className="public-loading">
            <div className="loading-spinner" />
            <p>Verifying on Blockchain...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Failed ─── */
  if (status === 'failed') {
    return (
      <div className="public-verify-page">
        <div className="public-card">
          <div className="public-logo">🛡️ CertiSafe</div>
          <div className="public-result">
            <div className="failed-badge">
              <span className="check-icon">❌</span>
              <h2>Verification Failed</h2>
              <p className="verified-sub">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Verified — show full certificate template ─── */
  return (
    <div className="public-verify-page public-verified-page">
      {/* Small status banner */}
      <div className="public-verified-banner">
        <span>✅ <strong>Blockchain Verified</strong> — This credential is authentic.</span>
        <span className="public-banner-chain">🔗 Sepolia Testnet</span>
      </div>

      {/* Full certificate */}
      <div className="public-cert-wrapper">
        <CertificateRenderer data={details} qrUrl={qrUrl} />
      </div>
    </div>
  );
}

export default PublicVerify;
