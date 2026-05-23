import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import CertificateRenderer from './CertificateTemplates';
import { computePhotoHash, isPhotoAuthentic } from '../utils/photoHash';

function PublicVerify() {
  const { id }  = useParams();
  const [status,  setStatus]  = useState('loading');
  const [details, setDetails] = useState(null);
  const [error,   setError]   = useState('');

  // ── Anti-Fraud State ──
  const [photoCheck,     setPhotoCheck]     = useState(null);
  const [signatureCheck, setSignatureCheck] = useState(null);
  const [revocationInfo, setRevocationInfo] = useState(null);
  const [institutionName, setInstitutionName] = useState('');

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

      // ── Revocation ──
      setRevocationInfo({
        revoked: result.revoked,
        revokedAt: result.revokedAt ? new Date(Number(result.revokedAt) * 1000) : null,
      });

      // ── Institution ──
      if (result.issuedBy && result.issuedBy !== ethers.ZeroAddress) {
        try {
          const inst = await contract.institutions(result.issuedBy);
          setInstitutionName(inst.name || '');
        } catch { /* ignore */ }
      }

      let certDetails = {
        id,
        issuer: result.issuer,
        course: result.data,
        issuedBy: result.issuedBy,
        issuedAt: result.issuedAt ? new Date(Number(result.issuedAt) * 1000).toLocaleString() : '',
      };

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

      // ── Photo Hash Check ──
      const onChainPhotoHash = result.photoHash;
      if (onChainPhotoHash && onChainPhotoHash !== '0x' + '0'.repeat(64) && certDetails.photo) {
        try {
          const computedHash = await computePhotoHash(certDetails.photo);
          setPhotoCheck(isPhotoAuthentic(onChainPhotoHash, computedHash));
        } catch {
          setPhotoCheck({ authentic: null, reason: 'Could not verify photo hash' });
        }
      }

      // ── Signature Check ──
      const adminSig = result.adminSignature;
      if (adminSig && adminSig !== '0x') {
        try {
          const messageToVerify = JSON.stringify({
            id,
            ipfsHash: result.data,
            photoHash: onChainPhotoHash,
            issuer: result.issuer,
            recipient: certDetails.recipient,
            certType: certDetails.certType || certDetails.type,
          });
          const recoveredAddress = ethers.verifyMessage(messageToVerify, adminSig);
          const isFromIssuer = recoveredAddress.toLowerCase() === result.issuedBy.toLowerCase();
          setSignatureCheck({
            valid: isFromIssuer,
            reason: isFromIssuer
              ? `Valid — signed by issuing institution`
              : `INVALID — signature does not match issuer`,
          });
        } catch {
          setSignatureCheck({ valid: false, reason: 'Signature verification error' });
        }
      }

      setStatus(result.revoked ? 'revoked' : 'verified');
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

  /* ─── Verified / Revoked — show full certificate template ─── */
  return (
    <div className="public-verify-page public-verified-page">
      {/* Status banner */}
      {revocationInfo?.revoked ? (
        <div className="public-verified-banner" style={{ background: '#fef2f2', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
          <span>🚫 <strong>CERTIFICATE REVOKED</strong> — This credential has been invalidated.</span>
          <span className="public-banner-chain">Revoked: {revocationInfo.revokedAt?.toLocaleDateString()}</span>
        </div>
      ) : (
        <div className="public-verified-banner">
          <span>✅ <strong>Blockchain Verified</strong> — This credential is authentic.</span>
          <span className="public-banner-chain">🔗 Sepolia Testnet</span>
        </div>
      )}

      {/* ── Security Summary for Public ── */}
      <div className="public-security-summary">
        <div className={`public-security-item ${revocationInfo?.revoked ? 'danger' : 'success'}`}>
          {revocationInfo?.revoked ? '🚫 Revoked' : '⛓️ On-Chain'}
        </div>
        {photoCheck && (
          <div className={`public-security-item ${
            photoCheck.authentic === true ? 'success' :
            photoCheck.authentic === false ? 'danger' : 'neutral'
          }`}>
            {photoCheck.authentic === true ? '🟢 Photo OK' :
             photoCheck.authentic === false ? '🔴 Photo Tampered' : '⚪ No Photo Hash'}
          </div>
        )}
        {signatureCheck && (
          <div className={`public-security-item ${
            signatureCheck.valid === true ? 'success' :
            signatureCheck.valid === false ? 'danger' : 'neutral'
          }`}>
            {signatureCheck.valid === true ? '✍️ Signed' :
             signatureCheck.valid === false ? '🔴 Bad Signature' : '⚪ No Signature'}
          </div>
        )}
        {institutionName && (
          <div className="public-security-item success">🏛️ {institutionName}</div>
        )}
      </div>

      {/* Full certificate */}
      <div className="public-cert-wrapper" style={{ position: 'relative' }}>
        <CertificateRenderer data={details} qrUrl={qrUrl} />
        {revocationInfo?.revoked && (
          <div className="revoked-watermark-overlay">
            <span>REVOKED</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicVerify;
