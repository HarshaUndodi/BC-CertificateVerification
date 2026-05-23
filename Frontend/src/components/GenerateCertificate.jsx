import React, { useState } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';
import { uploadToIPFS } from '../utils/ipfs';
import { computePhotoHash } from '../utils/photoHash';

const CERT_TYPES = [
  { value: 'graduation',    label: '🎓 Graduation Degree' },
  { value: 'course',        label: '📚 Course Completion' },
  { value: 'skill',         label: '🛡️ Skill / Professional Certification' },
  { value: 'achievement',   label: '🏆 Achievement / Honour Award' },
  { value: 'internship',    label: '💼 Internship / Work Experience' },
];

// Helper: compress & convert uploaded image to base64 data-URL
function readImageAsBase64(file, maxPx = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function GenerateCertificate() {
  // ── Common fields
  const [certType,      setCertType]      = useState('graduation');
  const [id,            setId]            = useState('');
  const [issuer,        setIssuer]        = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [recipient,     setRecipient]     = useState('');
  const [course,        setCourse]        = useState('');
  const [grade,         setGrade]         = useState('');
  const [date,          setDate]          = useState('');
  const [photoBase64,   setPhotoBase64]   = useState('');
  const [photoPreview,  setPhotoPreview]  = useState('');

  // ── Type-specific
  const [degree,          setDegree]          = useState('');   // graduation
  const [graduationYear,  setGraduationYear]  = useState('');   // graduation
  const [duration,        setDuration]        = useState('');   // course / internship
  const [skills,          setSkills]          = useState('');   // skill / internship
  const [level,           setLevel]           = useState('');   // skill
  const [validUntil,      setValidUntil]      = useState('');   // skill
  const [awardTitle,      setAwardTitle]      = useState('');   // achievement
  const [role,            setRole]            = useState('');   // internship
  const [department,      setDepartment]      = useState('');   // internship
  const [location,        setLocation]        = useState('');   // internship
  const [startDate,       setStartDate]       = useState('');   // internship
  const [endDate,         setEndDate]         = useState('');   // internship

  const [isUploading, setIsUploading] = useState(false);
  const [mintStatus,  setMintStatus]  = useState('');

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  const generateRandomID = () => {
    const prefix = {
      graduation:  'GRD',
      course:      'CRS',
      skill:       'SKL',
      achievement: 'ACH',
      internship:  'INT',
    }[certType] || 'CERT';
    setId(`${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await readImageAsBase64(file);
      setPhotoBase64(b64);
      setPhotoPreview(b64);
    } catch {
      alert('Could not read image. Try another file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !issuer || !recipient || !course && certType !== 'achievement') {
      alert('Please fill all mandatory fields.');
      return;
    }

    setIsUploading(true);
    setMintStatus('');
    try {
      const skillsArr = skills
        ? skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // ── Step 1: Compute Photo Hash ──
      setMintStatus('🔐 Step 1/4: Computing photo hash...');
      const photoHash = await computePhotoHash(photoBase64);

      const metadata = {
        id,
        certType,
        issuer,
        recipient,
        candidateName,
        course,
        grade:          grade          || 'N/A',
        date:           date           || new Date().toLocaleDateString(),
        photo:          photoBase64    || '',
        photoHash,      // Store in IPFS too for reference
        // Graduation
        degree,
        graduationYear,
        // Course
        duration,
        // Skill
        skills:         skillsArr,
        level,
        validUntil,
        // Achievement
        awardTitle,
        // Internship
        role,
        department,
        location,
        startDate,
        endDate,
        // Meta
        type:      certType,
        timestamp: Date.now(),
      };

      // ── Step 2: Upload to IPFS ──
      setMintStatus('📦 Step 2/4: Uploading to IPFS...');
      const ipfsHash = await uploadToIPFS(metadata);

      // ── Step 3: Sign metadata (Admin Digital Signature) ──
      setMintStatus('✍️ Step 3/4: Signing certificate metadata...');
      const { signer } = await getBlockchain(true);

      // Create a deterministic message to sign (certId + ipfsHash + photoHash)
      const messageToSign = JSON.stringify({
        id,
        ipfsHash,
        photoHash,
        issuer,
        recipient,
        certType,
      });
      const adminSignature = await signer.signMessage(messageToSign);

      // ── Step 4: Store on Blockchain ──
      setMintStatus('⛓️ Step 4/4: Minting on blockchain...');
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const tx = await contract.generateCertificateSecure(
        id,
        issuer,
        recipient,
        ipfsHash,
        photoHash,
        adminSignature,
      );
      await tx.wait();

      setMintStatus('');
      alert(`✅ Certificate secured with anti-fraud protection!\n\nID: ${id}\nCID: ${ipfsHash}\nPhoto Hash: ${photoHash.substring(0, 18)}...\nSignature: ${adminSignature.substring(0, 18)}...`);
    } catch (error) {
      console.error(error);
      setMintStatus('');
      alert('Failed: ' + (error.reason || error.message || 'Check console.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="section">
      <div className="form-header">
        <h2>Issue New Credential</h2>
        <p>Fill all details to mint a tamper-proof certificate on the Ethereum blockchain.</p>
        <div className="security-features-banner">
          <span>🔐 Anti-Fraud Protection Active:</span>
          <span className="security-tag">Photo Hash</span>
          <span className="security-tag">Digital Signature</span>
          <span className="security-tag">IPFS Storage</span>
          <span className="security-tag">On-Chain Record</span>
        </div>
      </div>

      {/* ── Mint Status Bar ── */}
      {mintStatus && (
        <div className="mint-status-bar">
          <div className="loading-spinner" style={{ width: 18, height: 18 }} />
          <span>{mintStatus}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">

        {/* ── Certificate Type ── */}
        <div className="form-group">
          <label className="form-label">Certificate Type *</label>
          <select
            className="form-select"
            value={certType}
            onChange={e => { setCertType(e.target.value); setId(''); }}
          >
            {CERT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* ── Certificate ID ── */}
        <div className="form-group">
          <label className="form-label">Certificate ID *</label>
          <div className="input-row">
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="e.g. GRD-X7Y2Z9"
              style={{ marginBottom: 0 }}
            />
            <button type="button" className="btn-outline" onClick={generateRandomID}>
              Auto-Generate
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="form-section-title">Candidate Details</div>

        {/* ── Candidate Photo ── */}
        <div className="form-group">
          <label className="form-label">Candidate Photo <span className="security-hint">(pHash computed for tamper detection)</span></label>
          <div className="photo-upload-row">
            <label className="photo-upload-btn">
              📷 Choose Photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
            </label>
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            )}
            {!photoPreview && (
              <span className="photo-hint">JPG / PNG — will be hashed & stored on IPFS</span>
            )}
          </div>
        </div>

        {/* ── Candidate Name ── */}
        <div className="form-group">
          <label className="form-label">Candidate Full Name *</label>
          <input
            type="text"
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            placeholder="e.g. Harsha Kumar"
          />
        </div>

        {/* ── Recipient Wallet ── */}
        <div className="form-group">
          <label className="form-label">Recipient Wallet Address *</label>
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="0x..."
          />
        </div>

        {/* ── Divider ── */}
        <div className="form-section-title">Institution & Course</div>

        {/* ── Issuer ── */}
        <div className="form-group">
          <label className="form-label">Issuing Institution *</label>
          <input
            type="text"
            value={issuer}
            onChange={e => setIssuer(e.target.value)}
            placeholder="e.g. IIT Bengaluru"
          />
        </div>

        {/* ── Course / Subject ── */}
        <div className="form-group">
          <label className="form-label">
            {certType === 'internship' ? 'Project / Work Description' :
             certType === 'achievement' ? 'Achievement Description' :
             'Course / Subject Name'} *
          </label>
          <input
            type="text"
            value={course}
            onChange={e => setCourse(e.target.value)}
            placeholder={
              certType === 'internship'   ? 'e.g. Blockchain Development Projects'
              : certType === 'achievement' ? 'e.g. Outstanding performance in Decentralized Systems'
              : 'e.g. Full-Stack Blockchain Engineering'
            }
          />
        </div>

        {/* ── Grade / Score ── */}
        <div className="form-group">
          <label className="form-label">Grade / Performance</label>
          <input
            type="text"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            placeholder="e.g. Distinction / Outstanding / A+"
          />
        </div>

        {/* ── Date ── */}
        <div className="form-group">
          <label className="form-label">Issue Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* ════════════════════════════════════════════════
            TYPE-SPECIFIC FIELDS
        ════════════════════════════════════════════════ */}

        {/* GRADUATION */}
        {certType === 'graduation' && (
          <>
            <div className="form-section-title">Graduation Details</div>
            <div className="form-group">
              <label className="form-label">Degree Title</label>
              <input
                type="text"
                value={degree}
                onChange={e => setDegree(e.target.value)}
                placeholder="e.g. Bachelor of Technology"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Graduation Year</label>
              <input
                type="text"
                value={graduationYear}
                onChange={e => setGraduationYear(e.target.value)}
                placeholder="e.g. 2025"
              />
            </div>
          </>
        )}

        {/* COURSE COMPLETION */}
        {certType === 'course' && (
          <>
            <div className="form-section-title">Course Details</div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="e.g. 120 hrs"
              />
            </div>
          </>
        )}

        {/* SKILL / PROFESSIONAL */}
        {certType === 'skill' && (
          <>
            <div className="form-section-title">Certification Details</div>
            <div className="form-group">
              <label className="form-label">Skills / Technologies (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Solidity, React.js, IPFS, Web3.js"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Certification Level</label>
              <input
                type="text"
                value={level}
                onChange={e => setLevel(e.target.value)}
                placeholder="e.g. Professional / Associate / Expert"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valid Until</label>
              <input
                type="text"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                placeholder="e.g. May 2027 / Lifetime"
              />
            </div>
          </>
        )}

        {/* ACHIEVEMENT */}
        {certType === 'achievement' && (
          <>
            <div className="form-section-title">Award Details</div>
            <div className="form-group">
              <label className="form-label">Award Title</label>
              <input
                type="text"
                value={awardTitle}
                onChange={e => setAwardTitle(e.target.value)}
                placeholder="e.g. Award of Excellence"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Award Tags (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Academic Excellence, Top 1% Cohort"
              />
            </div>
          </>
        )}

        {/* INTERNSHIP */}
        {certType === 'internship' && (
          <>
            <div className="form-section-title">Internship Details</div>
            <div className="form-group">
              <label className="form-label">Role / Designation</label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Software Engineering Intern"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Blockchain Division"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, KA"
              />
            </div>
            <div className="input-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Date</label>
                <input
                  type="text"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="e.g. Jun 2024"
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Date</label>
                <input
                  type="text"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  placeholder="e.g. Dec 2024"
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="e.g. 6 months"
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Skills / Technologies (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Solidity, React.js, Node.js"
              />
            </div>
          </>
        )}

        <button type="submit" disabled={isUploading} style={{ marginTop: '16px' }}>
          {isUploading
            ? <><div className="loading-spinner" style={{ width: 20, height: 20, display: 'inline-block', marginRight: 8 }} />Securing...</>
            : '🔒 Mint & Secure Credential'
          }
        </button>
      </form>
    </div>
  );
}

export default GenerateCertificate;
