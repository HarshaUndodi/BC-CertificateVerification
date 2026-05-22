import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import CertificateRenderer from './CertificateTemplates';

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
      } else if (result.data.includes('|')) {
        const parts = result.data.split('|');
        certData.course = parts[0]?.split(':')[1]?.trim() || result.data;
        certData.grade  = parts[1]?.split(':')[1]?.trim() || 'N/A';
        certData.date   = parts[2]?.split(':')[1]?.trim() || 'N/A';
      } else {
        certData.course = result.data;
      }

      setVerificationResult(certData);

      if (!result.isValid) {
        setPdfStatus('❌ Certificate NOT Found on Blockchain!');
        alert('Certificate NOT Found or Invalid! ❌');
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

      {verificationResult && verificationResult.isValid && (
        <div className="certificate-container">
          <button
            className="download-btn"
            onClick={downloadPDF}
            disabled={downloading}
          >
            {downloading ? 'Generating PDF...' : '📥 Download Official PDF'}
          </button>

          {/* The certificate card — passes data to the correct template */}
          <div ref={certRef}>
            <CertificateRenderer
              data={verificationResult}
              qrUrl={shareableURL}
            />
          </div>
        </div>
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
