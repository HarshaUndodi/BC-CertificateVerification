import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import CertificateRenderer from './CertificateTemplates';
import { computePhotoHash, isPhotoAuthentic } from '../utils/photoHash';
import { extractImagesFromPdf } from '../utils/pdfImages';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function VerifyCertificate({ defaultId = '', autoVerify = false }) {
  const certRef = useRef();
  const [id,                 setId]                 = useState(defaultId);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading,            setLoading]            = useState(false);
  const [downloading,        setDownloading]        = useState(false);
  const [verifyMode,         setVerifyMode]         = useState('id');
  const [pdfStatus,          setPdfStatus]          = useState('');
  const [extractedPdfImages, setExtractedPdfImages] = useState([]);

  // ── Anti-Fraud State ──
  const [photoCheck,     setPhotoCheck]     = useState(null); // { authentic, distance, reason }
  const [signatureCheck, setSignatureCheck] = useState(null); // { valid, signerAddress, reason }
  const [revocationInfo, setRevocationInfo] = useState(null); // { revoked, revokedAt }
  const [auditLog,       setAuditLog]       = useState([]);
  const [institutionName, setInstitutionName] = useState('');

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI     = abi.abi;

  // ── Download as PDF ──────────────────────────────────────────
  const downloadPDF = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({
        orientation: 'landscape',
        unit:        'px',
        format:      [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      // Embed hidden cert ID so PDF-upload verification can extract it
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text(
        `Certificate ID: ${verificationResult.id}`,
        canvas.width - 20,
        canvas.height - 10,
        { align: 'right' }
      );
      pdf.save(`Certificate-${verificationResult.id}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF. Check console.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Upload PDF to verify ─────────────────────────────────────
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    setPdfStatus('📖 Reading PDF...');
    try {
      const arrayBuffer  = await file.arrayBuffer();
      const pdf          = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setPdfStatus('📖 Extracting embedded images...');
      const images = await extractImagesFromPdf(pdf);
      setExtractedPdfImages(images);
      
      let fullText       = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page        = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }
      let match = fullText.match(/(?:CERT|GRD|CRS|SKL|ACH|INT)-[A-Z0-9]+/i);
      if (!match) {
        const fileMatch = file.name.match(/(?:CERT|GRD|CRS|SKL|ACH|INT)-[A-Z0-9]+/i);
        if (fileMatch) match = fileMatch;
      }
      if (match) {
        const extractedId = match[0];
        setPdfStatus(`✅ Found ID: ${extractedId} — Verifying on Blockchain...`);
        setId(extractedId);
        setTimeout(() => handleVerifyWithId(extractedId), 500);
      } else {
        setPdfStatus('❌ No Certificate ID found. Ensure this is a CertiSafe PDF.');
      }
    } catch (err) {
      console.error('PDF Parse Error:', err);
      setPdfStatus('❌ Failed to read PDF. Try a different file.');
    }
  };

  useEffect(() => {
    if (autoVerify && defaultId) handleVerify();
  }, [defaultId]);

  // ── Core Verify ──────────────────────────────────────────────
  const handleVerifyWithId = async (certId) => {
    if (!certId) return;
    setLoading(true);
    setVerificationResult(null);
    setPhotoCheck(null);
    setSignatureCheck(null);
    setRevocationInfo(null);
    setInstitutionName('');
    try {
      if (!contractAddress) throw new Error('VITE_CONTRACT_ADDRESS is not set!');

      const { signer } = await getBlockchain(false);
      const contract   = new ethers.Contract(contractAddress, ContractABI, signer);
      const result     = await contract.verifyCertificate(certId);

      let certData = {
        id:    certId,
        issuer: result.issuer,
        isValid: result.isValid,
      };

      // ── Revocation check ──
      const revoked = result.revoked;
      const revokedAt = result.revokedAt ? new Date(Number(result.revokedAt) * 1000) : null;
      setRevocationInfo({ revoked, revokedAt });

      // ── Institution info ──
      if (result.issuedBy && result.issuedBy !== ethers.ZeroAddress) {
        try {
          const inst = await contract.institutions(result.issuedBy);
          setInstitutionName(inst.name || '');
        } catch { /* ignore */ }
        certData.issuedBy = result.issuedBy;
        certData.issuedAt = result.issuedAt ? new Date(Number(result.issuedAt) * 1000).toLocaleString() : '';
      }

      // ── IPFS Fetch ──
      if (result.isValid && result.data.startsWith('Qm')) {
        try {
          const response = await axios.get(
            `https://gateway.pinata.cloud/ipfs/${result.data}`
          );
          certData = { ...certData, ...response.data };
        } catch (e) {
          console.warn('IPFS fetch failed, using on-chain data', e);
          certData.course = result.data;
        }
      } else if (result.data && result.data.includes('|')) {
        const parts = result.data.split('|');
        certData.course = parts[0]?.split(':')[1]?.trim() || result.data;
        certData.grade  = parts[1]?.split(':')[1]?.trim() || 'N/A';
        certData.date   = parts[2]?.split(':')[1]?.trim() || 'N/A';
      } else {
        certData.course = result.data;
      }

      setVerificationResult(certData);

      // ══════════════════════════════════════
      // ANTI-FRAUD CHECKS (async, non-blocking)
      // ══════════════════════════════════════

      // ── 1. Photo Hash Verification ──
      const onChainPhotoHash = result.photoHash;
      if (onChainPhotoHash && onChainPhotoHash !== '0x' + '0'.repeat(64)) {
        if (verifyMode === 'pdf' && extractedPdfImages.length > 0) {
          // Verify against images extracted from the uploaded PDF
          let authentic = false;
          let bestDistance = 64;
          for (const imgSrc of extractedPdfImages) {
            try {
              const computedHash = await computePhotoHash(imgSrc);
              const photoResult = isPhotoAuthentic(onChainPhotoHash, computedHash);
              if (photoResult.distance < bestDistance) bestDistance = photoResult.distance;
              if (photoResult.authentic) {
                authentic = true;
                break;
              }
            } catch (e) {
              console.warn('Hash error for extracted image', e);
            }
          }
          if (authentic) {
            setPhotoCheck({ authentic: true, reason: `PDF Photo verified (distance: ${bestDistance})` });
          } else {
            setPhotoCheck({ authentic: false, reason: `PHOTO TAMPERED: Uploaded PDF photo does not match blockchain record` });
          }
        } else if (certData.photo) {
          // Default IPFS verification
          try {
            const computedHash = await computePhotoHash(certData.photo);
            const photoResult = isPhotoAuthentic(onChainPhotoHash, computedHash);
            setPhotoCheck(photoResult);
          } catch (err) {
            console.warn('Photo hash check failed:', err);
            setPhotoCheck({ authentic: null, reason: 'Could not verify photo hash' });
          }
        } else {
          setPhotoCheck({ authentic: null, reason: 'Photo hash stored but no photo in IPFS metadata' });
        }
      } else {
        setPhotoCheck({ authentic: null, reason: 'No photo hash recorded for this certificate' });
      }

      // ── 2. Digital Signature Verification ──
      const adminSig = result.adminSignature;
      if (adminSig && adminSig !== '0x') {
        try {
          const messageToVerify = JSON.stringify({
            id: certId,
            ipfsHash: result.data,
            photoHash: onChainPhotoHash,
            issuer: result.issuer,
            recipient: certData.recipient,
            certType: certData.certType || certData.type,
          });
          const recoveredAddress = ethers.verifyMessage(messageToVerify, adminSig);
          const isFromIssuer = recoveredAddress.toLowerCase() === result.issuedBy.toLowerCase();
          setSignatureCheck({
            valid: isFromIssuer,
            signerAddress: recoveredAddress,
            expectedAddress: result.issuedBy,
            reason: isFromIssuer
              ? `Valid — signed by ${recoveredAddress.substring(0, 10)}...`
              : `INVALID — expected ${result.issuedBy.substring(0, 10)}..., got ${recoveredAddress.substring(0, 10)}...`,
          });
        } catch (err) {
          console.warn('Signature verification failed:', err);
          setSignatureCheck({ valid: false, reason: 'Signature verification error: ' + err.message });
        }
      } else {
        setSignatureCheck({ valid: null, reason: 'No digital signature recorded' });
      }

      if (!result.isValid) {
        setPdfStatus('❌ Certificate NOT Found on Blockchain!');
        alert('Certificate NOT Found or Invalid! ❌');
      } else if (revoked) {
        setPdfStatus('🚫 Certificate is REVOKED!');
      } else {
        setPdfStatus('✅ Certificate Verified Successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Verification Failed: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const targetId = id || defaultId;
    if (!targetId) { alert('Please enter a Certificate ID'); return; }
    await handleVerifyWithId(targetId);
  };

  const shareableURL = `${window.location.origin}/verify/${id || defaultId}`;

  return (
    <div className="section">
      {!autoVerify && <h2>Verify Certificate</h2>}

      {!autoVerify && (
        <>
          <div className="verify-tabs">
            <button
              className={`tab-btn ${verifyMode === 'id' ? 'active' : ''}`}
              onClick={() => setVerifyMode('id')}
            >
              🔑 Enter ID
            </button>
            <button
              className={`tab-btn ${verifyMode === 'pdf' ? 'active' : ''}`}
              onClick={() => setVerifyMode('pdf')}
            >
              📄 Upload PDF
            </button>
          </div>

          {verifyMode === 'id' && (
            <div className="search-box">
              <input
                type="text"
                value={id}
                onChange={e => setId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. GRD-X7Y2Z9)"
              />
              <button onClick={handleVerify} disabled={loading}>
                {loading ? <div className="loading-spinner" /> : 'Verify'}
              </button>
            </div>
          )}

          {verifyMode === 'pdf' && (
            <div className="pdf-upload-box">
              <label className="upload-label">
                <span className="upload-icon">📁</span>
                <span>Choose Certificate PDF</span>
                <input type="file" accept=".pdf" onChange={handlePdfUpload} hidden />
              </label>
              {pdfStatus && <p className="pdf-status">{pdfStatus}</p>}
            </div>
          )}
        </>
      )}

      {loading && autoVerify && <div className="loading-spinner" />}

      {/* ═══════════════════════════════════════════════
          SECURITY DASHBOARD — Anti-Fraud Results
      ═══════════════════════════════════════════════ */}
      {verificationResult && verificationResult.isValid && (
        <>
          {/* ── Revocation Banner ── */}
          {revocationInfo?.revoked && (
            <div className="revoked-overlay-banner">
              <span className="revoked-icon-large">🚫</span>
              <div>
                <strong>CERTIFICATE REVOKED</strong>
                <p>This certificate was revoked on {revocationInfo.revokedAt?.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* ── Security Panel ── */}
          <div className="security-dashboard">
            <h3 className="security-dashboard-title">🔐 Anti-Fraud Verification Report</h3>

            <div className="security-checks-grid">
              {/* Blockchain Status */}
              <div className={`security-check-card ${revocationInfo?.revoked ? 'danger' : 'success'}`}>
                <div className="security-check-icon">{revocationInfo?.revoked ? '🚫' : '⛓️'}</div>
                <div className="security-check-label">Blockchain</div>
                <div className="security-check-value">{revocationInfo?.revoked ? 'REVOKED' : 'VERIFIED'}</div>
              </div>

              {/* Photo Hash */}
              <div className={`security-check-card ${
                photoCheck?.authentic === true ? 'success' :
                photoCheck?.authentic === false ? 'danger' : 'neutral'
              }`}>
                <div className="security-check-icon">
                  {photoCheck?.authentic === true ? '🟢' :
                   photoCheck?.authentic === false ? '🔴' : '⚪'}
                </div>
                <div className="security-check-label">Photo Hash</div>
                <div className="security-check-value">
                  {photoCheck?.authentic === true ? 'AUTHENTIC' :
                   photoCheck?.authentic === false ? 'TAMPERED!' :
                   'N/A'}
                </div>
              </div>

              {/* Digital Signature */}
              <div className={`security-check-card ${
                signatureCheck?.valid === true ? 'success' :
                signatureCheck?.valid === false ? 'danger' : 'neutral'
              }`}>
                <div className="security-check-icon">
                  {signatureCheck?.valid === true ? '✍️' :
                   signatureCheck?.valid === false ? '🔴' : '⚪'}
                </div>
                <div className="security-check-label">Signature</div>
                <div className="security-check-value">
                  {signatureCheck?.valid === true ? 'VALID' :
                   signatureCheck?.valid === false ? 'INVALID!' :
                   'N/A'}
                </div>
              </div>

              {/* Institution */}
              <div className={`security-check-card ${institutionName ? 'success' : 'neutral'}`}>
                <div className="security-check-icon">🏛️</div>
                <div className="security-check-label">Institution</div>
                <div className="security-check-value">{institutionName || 'Unknown'}</div>
              </div>
            </div>

            {/* ── Detailed Results ── */}
            <div className="security-details">
              {photoCheck && (
                <div className="security-detail-row">
                  <span className="security-detail-label">Photo Integrity:</span>
                  <span className={`security-detail-value ${photoCheck.authentic === false ? 'text-danger' : ''}`}>
                    {photoCheck.reason}
                  </span>
                </div>
              )}
              {signatureCheck && (
                <div className="security-detail-row">
                  <span className="security-detail-label">Digital Signature:</span>
                  <span className={`security-detail-value ${signatureCheck.valid === false ? 'text-danger' : ''}`}>
                    {signatureCheck.reason}
                  </span>
                </div>
              )}
              {verificationResult.issuedAt && (
                <div className="security-detail-row">
                  <span className="security-detail-label">Issued On-Chain:</span>
                  <span className="security-detail-value">{verificationResult.issuedAt}</span>
                </div>
              )}
              {verificationResult.issuedBy && (
                <div className="security-detail-row">
                  <span className="security-detail-label">Issuer Address:</span>
                  <span className="security-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {verificationResult.issuedBy}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Certificate Display ── */}
          <div className="certificate-container" style={{ position: 'relative' }}>
            <button
              className="download-btn"
              onClick={downloadPDF}
              disabled={downloading || revocationInfo?.revoked}
            >
              {downloading ? 'Generating PDF...' : revocationInfo?.revoked ? '🚫 Download Disabled (Revoked)' : '📥 Download Official PDF'}
            </button>

            <div ref={certRef} style={{ position: 'relative' }}>
              <CertificateRenderer
                data={verificationResult}
                qrUrl={shareableURL}
              />
              {/* Revoked Watermark Overlay */}
              {revocationInfo?.revoked && (
                <div className="revoked-watermark-overlay">
                  <span>REVOKED</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {verificationResult && !verificationResult.isValid && (
        <div className="verify-invalid-msg">
          <p>❌ <strong>Certificate Not Found.</strong> This ID is not on the blockchain.</p>
        </div>
      )}
    </div>
  );
}

export default VerifyCertificate;
