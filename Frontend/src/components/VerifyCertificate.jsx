import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function VerifyCertificate({ defaultId = '', autoVerify = false }) {
  const certRef = useRef();
  const [id, setId] = useState(defaultId);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const element = certRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
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
      pdf.save(`Certificate-${verificationResult.id}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Check console.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (autoVerify && defaultId) {
      handleVerify();
    }
  }, [defaultId]);

  const handleVerify = async () => {
    const targetId = id || defaultId;
    if (!targetId) {
      alert("Please enter a Certificate ID");
      return;
    }
    setLoading(true);
    try {
      if (!contractAddress) {
        throw new Error("VITE_CONTRACT_ADDRESS is not set in Render environment variables!");
      }
      const { signer } = await getBlockchain(false); // Public read-only
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const result = await contract.verifyCertificate(targetId);
      
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
        id: targetId
      });

      if (!result.isValid) {
        alert("Certificate NOT Found or Invalid! ❌");
      }
    } catch (error) {
      console.error(error);
      alert("Verification Failed: " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Construct a shareable URL for the QR code
  // Note: For phone scanning, 'localhost' must be replaced by your computer's IP address
  const shareableURL = `${window.location.origin}/verify/${id || defaultId}`;

  return (
    <div className="section">
      {!autoVerify && <h2>Verify Certificate</h2>}
      {!autoVerify && (
        <div className="search-box">
          <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="Enter Certificate ID (e.g. CERT-101)" />
          <button onClick={handleVerify} disabled={loading}>
            {loading ? <div className="loading-spinner"></div> : "Verify"}
          </button>
        </div>
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
