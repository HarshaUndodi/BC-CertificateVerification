import React, { useState } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';

function RevokeCertificate() {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  // ── Check certificate status before revoking ─────────
  const handleCheck = async () => {
    if (!certId) { alert('Enter a Certificate ID'); return; }
    setChecking(true);
    setResult(null);
    try {
      const { signer } = await getBlockchain(false);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const res = await contract.verifyCertificate(certId);

      if (!res.isValid) {
        setResult({ status: 'not-found', message: 'Certificate ID not found on the blockchain.' });
      } else if (res.revoked) {
        setResult({
          status: 'already-revoked',
          message: `Already revoked on ${new Date(Number(res.revokedAt) * 1000).toLocaleString()}`,
          issuer: res.issuer,
        });
      } else {
        setResult({
          status: 'active',
          message: 'Certificate is active and valid.',
          issuer: res.issuer,
          issuedBy: res.issuedBy,
        });
      }
    } catch (err) {
      console.error(err);
      setResult({ status: 'error', message: err.reason || err.message });
    } finally {
      setChecking(false);
    }
  };

  // ── Revoke ────────────────────────────────────────────
  const handleRevoke = async () => {
    if (!window.confirm(`Are you sure you want to permanently revoke certificate "${certId}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const { signer } = await getBlockchain(true);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const tx = await contract.revokeCertificate(certId);
      await tx.wait();
      setResult({
        status: 'revoked-now',
        message: `Certificate "${certId}" has been permanently revoked.`,
      });
      alert(`❌ Certificate "${certId}" revoked successfully.`);
    } catch (err) {
      console.error(err);
      alert('Revocation failed: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="form-header">
        <h2>🚫 Revoke Certificate</h2>
        <p>Invalidate a certificate that is expired, duplicate, or fraudulent. This action is permanent and recorded on-chain.</p>
      </div>

      <div className="admin-form">
        <div className="form-group">
          <label className="form-label">Certificate ID *</label>
          <input
            type="text"
            value={certId}
            onChange={e => setCertId(e.target.value)}
            placeholder="e.g. GRD-X7Y2Z9"
          />
        </div>

        <div className="input-row" style={{ gap: 10 }}>
          <button
            type="button"
            className="btn-outline"
            onClick={handleCheck}
            disabled={checking}
            style={{ flex: 1 }}
          >
            {checking ? 'Checking...' : '🔍 Check Status'}
          </button>
        </div>

        {/* ── Result Panel ── */}
        {result && (
          <div className={`revoke-result-panel ${result.status}`} style={{ marginTop: 20 }}>
            {result.status === 'not-found' && (
              <div className="revoke-result-inner">
                <span className="revoke-icon">❓</span>
                <p><strong>Not Found</strong></p>
                <p className="revoke-msg">{result.message}</p>
              </div>
            )}

            {result.status === 'already-revoked' && (
              <div className="revoke-result-inner">
                <span className="revoke-icon">🚫</span>
                <p><strong>Already Revoked</strong></p>
                <p className="revoke-msg">{result.message}</p>
                {result.issuer && <p className="revoke-meta">Issuer: {result.issuer}</p>}
              </div>
            )}

            {result.status === 'active' && (
              <div className="revoke-result-inner">
                <span className="revoke-icon">✅</span>
                <p><strong>Certificate Active</strong></p>
                <p className="revoke-msg">{result.message}</p>
                {result.issuer && <p className="revoke-meta">Issuer: {result.issuer}</p>}
                <button
                  className="btn-danger"
                  onClick={handleRevoke}
                  disabled={loading}
                  style={{ marginTop: 16 }}
                >
                  {loading ? <><div className="loading-spinner" style={{ width: 18, height: 18, display: 'inline-block', marginRight: 8 }} />Revoking...</> : '🚫 Permanently Revoke This Certificate'}
                </button>
              </div>
            )}

            {result.status === 'revoked-now' && (
              <div className="revoke-result-inner">
                <span className="revoke-icon" style={{ fontSize: '2.5rem' }}>❌</span>
                <p><strong>Revoked Successfully</strong></p>
                <p className="revoke-msg">{result.message}</p>
              </div>
            )}

            {result.status === 'error' && (
              <div className="revoke-result-inner">
                <span className="revoke-icon">⚠️</span>
                <p><strong>Error</strong></p>
                <p className="revoke-msg">{result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RevokeCertificate;
