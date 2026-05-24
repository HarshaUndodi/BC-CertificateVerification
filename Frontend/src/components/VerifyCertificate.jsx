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
import { parseUniversityCertificate } from '../utils/ocrParser';

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

  // ── Anti-Fraud State ──
  const [photoCheck,     setPhotoCheck]     = useState(null);
  const [signatureCheck, setSignatureCheck] = useState(null);
  const [revocationInfo, setRevocationInfo] = useState(null);
  const [institutionName, setInstitutionName] = useState('');

  // ── PDF Tamper Detection State ──
  const [pdfTamperDetected, setPdfTamperDetected] = useState(false);
  const [pdfExtractedPhoto, setPdfExtractedPhoto] = useState('');

  // ── Universal OCR State ──
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);

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
    setPdfTamperDetected(false);
    setPdfExtractedPhoto('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Extract images from the PDF
      setPdfStatus('🔍 Extracting photos from PDF...');
      const pdfImages = await extractImagesFromPdf(pdf);
      console.log(`Extracted ${pdfImages.length} image(s) from PDF`);
      
      // Extract text to find certificate ID
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
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
        // Pass images directly to avoid stale closure issue
        handleVerifyWithId(extractedId, pdfImages);
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
  // pdfImages parameter: array of base64 images extracted from an uploaded PDF
  const handleVerifyWithId = async (certId, pdfImages = []) => {
    if (!certId) return;
    setLoading(true);
    setVerificationResult(null);
    setPhotoCheck(null);
    setSignatureCheck(null);
    setRevocationInfo(null);
    setInstitutionName('');
    setPdfTamperDetected(false);
    setPdfExtractedPhoto('');
    
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
      // ANTI-FRAUD CHECKS
      // ══════════════════════════════════════

      // ── 1. Photo Hash Verification ──
      const onChainPhotoHash = result.photoHash;
      const isPdfMode = pdfImages.length > 0;
      
      if (onChainPhotoHash && onChainPhotoHash !== '0x' + '0'.repeat(64)) {
        if (isPdfMode) {
          // ═══ PDF MODE: Compare photos extracted from the uploaded PDF ═══
          let authentic = false;
          let bestDistance = 64;
          let bestImage = '';
          
          for (const imgSrc of pdfImages) {
            try {
              const computedHash = await computePhotoHash(imgSrc);
              const photoResult = isPhotoAuthentic(onChainPhotoHash, computedHash);
              if (photoResult.distance < bestDistance) {
                bestDistance = photoResult.distance;
                bestImage = imgSrc;
              }
              if (photoResult.authentic) {
                authentic = true;
                break;
              }
            } catch (e) {
              console.warn('Hash error for extracted image', e);
            }
          }
          
          if (authentic) {
            setPhotoCheck({ authentic: true, distance: bestDistance, reason: `PDF photo matches blockchain record (distance: ${bestDistance})` });
          } else {
            // ⚠️ TAMPER DETECTED!
            setPhotoCheck({ authentic: false, distance: bestDistance, reason: `🚨 FRAUD ALERT: The photo in the uploaded PDF has been REPLACED. It does not match the original photo stored on the blockchain.` });
            setPdfTamperDetected(true);
            if (bestImage) setPdfExtractedPhoto(bestImage);
          }
        } else if (certData.photo) {
          // ═══ ID MODE: Compare IPFS photo against on-chain hash ═══
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

      // ── 3. Compute Trust Score ──
      // We need to read the latest state values, but since setState is async,
      // we compute directly from local variables.
      const localPhotoCheck = photoCheck; // will be set by now via await
      // Build trust score from the checks we just performed
      // Note: we recalculate using the local vars since state may not be updated yet
      let finalPhotoCheck = null;
      let finalSigCheck = null;
      
      // Re-derive photo check result for trust score
      if (onChainPhotoHash && onChainPhotoHash !== '0x' + '0'.repeat(64)) {
        if (isPdfMode) {
          let auth = false;
          let bestDist = 64;
          for (const imgSrc of pdfImages) {
            try {
              const h = await computePhotoHash(imgSrc);
              const r = isPhotoAuthentic(onChainPhotoHash, h);
              if (r.distance < bestDist) bestDist = r.distance;
              if (r.authentic) { auth = true; break; }
            } catch {}
          }
          finalPhotoCheck = { authentic: auth };
        } else if (certData.photo) {
          try {
            const h = await computePhotoHash(certData.photo);
            finalPhotoCheck = isPhotoAuthentic(onChainPhotoHash, h);
          } catch { finalPhotoCheck = { authentic: null }; }
        }
      }
      
      if (adminSig && adminSig !== '0x') {
        try {
          const msg = JSON.stringify({ id: certId, ipfsHash: result.data, photoHash: onChainPhotoHash, issuer: result.issuer, recipient: certData.recipient, certType: certData.certType || certData.type });
          const recovered = ethers.verifyMessage(msg, adminSig);
          finalSigCheck = { valid: recovered.toLowerCase() === result.issuedBy.toLowerCase() };
        } catch { finalSigCheck = { valid: false }; }
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

  // ── Universal OCR Handler ──
  const handleUniversalUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrResult(null);
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const result = await parseUniversityCertificate(file, setOcrProgress);
      setOcrResult(result);
      // If a CertiSafe ID was found, auto-verify it
      if (result.parsed.certificateId) {
        setId(result.parsed.certificateId);
        setVerifyMode('id');
        handleVerifyWithId(result.parsed.certificateId);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrResult({ rawText: '', parsed: {}, error: 'Failed to parse certificate' });
    } finally {
      setOcrLoading(false);
    }
  };

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
            <button
              className={`tab-btn ${verifyMode === 'universal' ? 'active' : ''}`}
              onClick={() => setVerifyMode('universal')}
            >
              🌐 Universal Verify
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

          {verifyMode === 'universal' && (
            <div className="pdf-upload-box">
              <label className="upload-label">
                <span className="upload-icon">🌐</span>
                <span>Upload Any Certificate (PDF/Image)</span>
                <input type="file" accept=".pdf,image/*" onChange={handleUniversalUpload} hidden />
              </label>
              <p className="pdf-status" style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                AI-powered OCR will extract text from any university certificate
              </p>
              {ocrLoading && (
                <div className="ocr-progress-bar">
                  <div className="ocr-progress-fill" style={{ width: `${ocrProgress}%` }} />
                  <span className="ocr-progress-text">🔍 Scanning... {ocrProgress}%</span>
                </div>
              )}
              {ocrResult && !ocrResult.error && (
                <div className="ocr-result-card">
                  <h3 className="ocr-result-title">📝 AI-Extracted Fields</h3>
                  <div className="ocr-fields-grid">
                    {ocrResult.parsed.candidateName && (
                      <div className="ocr-field"><span className="ocr-field-label">Name</span><span className="ocr-field-value">{ocrResult.parsed.candidateName}</span></div>
                    )}
                    {ocrResult.parsed.institution && (
                      <div className="ocr-field"><span className="ocr-field-label">Institution</span><span className="ocr-field-value">{ocrResult.parsed.institution}</span></div>
                    )}
                    {ocrResult.parsed.degree && (
                      <div className="ocr-field"><span className="ocr-field-label">Degree</span><span className="ocr-field-value">{ocrResult.parsed.degree}</span></div>
                    )}
                    {ocrResult.parsed.course && (
                      <div className="ocr-field"><span className="ocr-field-label">Course</span><span className="ocr-field-value">{ocrResult.parsed.course}</span></div>
                    )}
                    {ocrResult.parsed.date && (
                      <div className="ocr-field"><span className="ocr-field-label">Date</span><span className="ocr-field-value">{ocrResult.parsed.date}</span></div>
                    )}
                    {ocrResult.parsed.grade && (
                      <div className="ocr-field"><span className="ocr-field-label">Grade</span><span className="ocr-field-value">{ocrResult.parsed.grade}</span></div>
                    )}
                    {ocrResult.parsed.certificateId && (
                      <div className="ocr-field"><span className="ocr-field-label">Cert ID</span><span className="ocr-field-value">{ocrResult.parsed.certificateId}</span></div>
                    )}
                    <div className="ocr-field"><span className="ocr-field-label">Type</span><span className="ocr-field-value">{ocrResult.parsed.type || 'Unknown'}</span></div>
                  </div>
                  {ocrResult.parsed.certificateId && (
                    <p className="ocr-blockchain-match">✅ CertiSafe ID detected — auto-verifying on blockchain...</p>
                  )}
                  {!ocrResult.parsed.certificateId && (
                    <p className="ocr-no-match">⚠️ No CertiSafe ID found. This certificate was not issued through our platform.</p>
                  )}
                </div>
              )}
              {ocrResult?.error && (
                <p className="pdf-status">❌ {ocrResult.error}</p>
              )}
            </div>
          )}
        </>
      )}

      {loading && autoVerify && <div className="loading-spinner" />}

      {/* ═══════════════════════════════════════════════
          FRAUD ALERT — PDF Photo Tamper Detection
      ═══════════════════════════════════════════════ */}
      {pdfTamperDetected && verificationResult && verificationResult.isValid && (
        <div className="fraud-alert-banner">
          <div className="fraud-alert-header">
            <span className="fraud-alert-icon">🚨</span>
            <div>
              <strong>FRAUD DETECTED — Photo Replaced in PDF</strong>
              <p>The photo inside the uploaded PDF does <strong>NOT</strong> match the original photo stored on the blockchain. Someone has tampered with this certificate.</p>
            </div>
          </div>
          <div className="fraud-photo-comparison">
            <div className="fraud-photo-card fake">
              <div className="fraud-photo-label">❌ FAKE — From Uploaded PDF</div>
              {pdfExtractedPhoto && <img src={pdfExtractedPhoto} alt="Fake photo from PDF" />}
            </div>
            <div className="fraud-photo-vs">VS</div>
            <div className="fraud-photo-card real">
              <div className="fraud-photo-label">✅ REAL — From Blockchain</div>
              {verificationResult.photo && <img src={verificationResult.photo} alt="Original photo from blockchain" />}
            </div>
          </div>
        </div>
      )}

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
              disabled={downloading || revocationInfo?.revoked || pdfTamperDetected}
            >
              {downloading ? 'Generating PDF...' : 
               revocationInfo?.revoked ? '🚫 Download Disabled (Revoked)' : 
               pdfTamperDetected ? '🚫 Download Disabled (Tampered PDF)' :
               '📥 Download Official PDF'}
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
              {/* Tampered Watermark Overlay */}
              {pdfTamperDetected && (
                <div className="revoked-watermark-overlay">
                  <span style={{ color: 'rgba(220, 38, 38, 0.25)', borderColor: 'rgba(220, 38, 38, 0.2)' }}>TAMPERED</span>
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
