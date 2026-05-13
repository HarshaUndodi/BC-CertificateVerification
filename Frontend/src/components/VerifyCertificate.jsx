import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker (v3.x compatible)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function VerifyCertificate({ defaultId = '', autoVerify = false }) {
  const certRef = useRef();
  const [id, setId] = useState(defaultId);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifyMode, setVerifyMode] = useState('id'); // 'id' or 'pdf'
  const [pdfStatus, setPdfStatus] = useState('');
  
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const element = certRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Embed Certificate ID as real text (tiny, bottom-right corner)
      // This allows the PDF upload parser to extract the ID
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text(`Certificate ID: ${verificationResult.id}`, canvas.width - 20, canvas.height - 10, { align: 'right' });
      
      pdf.save(`Certificate-${verificationResult.id}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Check console.");
    } finally {
      setDownloading(false);
    }
  };

  // Extract Certificate ID from uploaded PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.");
      return;
    }

    setPdfStatus('📖 Reading PDF...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }

      console.log("Extracted PDF text:", fullText);

      // Method 1: Look for CERT-XXXXXXX pattern in PDF text content
      let match = fullText.match(/CERT-[A-Z0-9]+/i);
      
      // Method 2: Fallback - extract from filename (e.g. "Certificate-CERT-XT1FPEN0.pdf")
      if (!match) {
        const fileMatch = file.name.match(/CERT-[A-Z0-9]+/i);
        if (fileMatch) match = fileMatch;
      }

      if (match) {
        const extractedId = match[0];
        setPdfStatus(`✅ Found ID: ${extractedId} — Verifying on Blockchain...`);
        setId(extractedId);
        setTimeout(() => {
          handleVerifyWithId(extractedId);
        }, 500);
      } else {
        setPdfStatus('❌ No Certificate ID found. Please ensure this is a CertiSafe PDF.');
      }
    } catch (error) {
      console.error("PDF Parse Error:", error);
      setPdfStatus('❌ Failed to read PDF. Try a different file.');
    }
  };

  useEffect(() => {
    if (autoVerify && defaultId) {
      handleVerify();
    }
  }, [defaultId]);

  const handleVerifyWithId = async (certId) => {
    if (!certId) return;
    setLoading(true);
    setVerificationResult(null);
    try {
      if (!contractAddress) {
        throw new Error("VITE_CONTRACT_ADDRESS is not set!");
      }
      const { signer } = await getBlockchain(false);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const result = await contract.verifyCertificate(certId);
      
      let finalData = result.data;
      
      if (result.isValid && result.data.startsWith('Qm')) {
        try {
          const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${result.data}`);
          const ipfsData = response.data;
          finalData = `Course: ${ipfsData.course} | Grade: ${ipfsData.grade} | Date: ${ipfsData.date}`;
        } catch (e) {
          console.warn("Could not fetch from IPFS, showing raw hash", e);
        }
      }

      setVerificationResult({
        isValid: result.isValid,
        issuer: result.issuer,
        data: finalData,
        id: certId
      });

      if (!result.isValid) {
        setPdfStatus('❌ Certificate NOT Found on Blockchain!');
        alert("Certificate NOT Found or Invalid! ❌");
      } else {
        setPdfStatus('✅ Certificate Verified Successfully!');
      }
    } catch (error) {
      console.error(error);
      alert("Verification Failed: " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const targetId = id || defaultId;
    if (!targetId) {
      alert("Please enter a Certificate ID");
      return;
    }
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
              <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="Enter Certificate ID (e.g. CERT-101)" />
              <button onClick={handleVerify} disabled={loading}>
                {loading ? <div className="loading-spinner"></div> : "Verify"}
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

      {loading && autoVerify && <div className="loading-spinner"></div>}

      {verificationResult && verificationResult.isValid && (
        <div className="certificate-container">
          <button 
            className="download-btn" 
            onClick={downloadPDF}
            disabled={downloading}
          >
            {downloading ? "Generating PDF..." : "📥 Download Official PDF"}
          </button>

          <div className="certificate-card" ref={certRef}>
            <div className="cert-header">
              <h3>Certificate of Excellence</h3>
              <div className="sub-header">Official Blockchain Credential</div>
            </div>
            
            <div className="cert-body">
              <p className="main-text">This is to certify that the digital record for ID:</p>
              <div className="cert-id">{verificationResult.id}</div>
              
              <p className="main-text">has been officially recorded as a</p>
              <h1 className="course-text">
                {verificationResult.data.split('|')[0].split(':')[1]?.trim()}
              </h1>
              
              <div className="cert-details-grid">
                <div className="detail-item">
                   <span className="label">Institution</span>
                   <span className="value">{verificationResult.issuer}</span>
                </div>
                <div className="detail-item">
                   <span className="label">Grade / Status</span>
                   <span className="value">{verificationResult.data.split('|')[1].split(':')[1]?.trim()}</span>
                </div>
              </div>

              <div className="gold-seal">
                 <div className="seal-text">OFFICIAL SEAL<br/>CERTIFIED<br/>TRUST</div>
              </div>

              <div className="cert-footer">
                <div className="sig-block">
                   <div className="signature-line"></div>
                   <span className="sig-label">Registrar</span>
                </div>

                <div className="qr-block">
                   <QRCodeSVG value={shareableURL} size={70} />
                   <span className="qr-label">SCAN TO VERIFY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyCertificate;
