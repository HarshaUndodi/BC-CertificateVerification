import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ── Handwritten-style SVG Signatures ──────────────────────────
const SignatureA = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 32C12 18 18 10 28 12C38 14 30 28 24 30C18 32 20 22 26 18C32 14 42 10 48 14C54 18 50 28 44 30C40 31 46 20 56 16C62 13 68 16 72 20C76 24 74 30 68 32C64 33 70 18 80 14C86 12 92 16 96 20C100 24 104 18 108 14" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M95 20C98 22 102 20 106 18" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

const SignatureB = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 28C16 14 24 8 32 12C36 14 34 22 28 26C24 28 30 16 38 12C44 9 50 14 52 20C54 26 48 30 44 28C40 26 52 12 62 10C68 9 72 14 74 20C76 26 72 30 68 28C66 27 78 10 88 12C94 13 98 18 100 24C102 28 106 24 110 20" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const SignatureC = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 30C10 22 16 14 22 12C28 10 32 16 30 22C28 28 22 30 20 26C18 22 24 14 34 12C40 11 44 16 46 22C48 28 44 32 40 30C38 29 48 14 58 12C64 11 68 16 70 22" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M70 22C72 26 76 28 80 26C84 24 82 18 78 16C74 14 84 12 92 14C98 16 102 22 100 26C98 30 94 28 96 24C98 20 104 18 110 20" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const SignatureD = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 26C14 14 22 8 30 10C34 11 36 18 32 24C28 30 22 28 24 22C26 16 34 12 44 14C50 15 54 20 52 26C50 30 46 28 48 22C50 16 58 12 66 14C72 16 76 22 74 28" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M74 28C72 32 76 30 80 24C84 18 90 14 96 16C100 18 102 24 98 28C96 30 100 22 106 18C110 16 114 18 114 22" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const SignatureE = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 30C14 20 20 12 28 10C34 8 38 14 36 20C34 26 28 28 26 24C24 20 32 10 42 8C48 7 52 12 54 18C56 24 52 28 48 26" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M48 26C46 24 56 10 66 10C72 10 76 16 74 22C72 28 68 26 70 20C72 14 80 10 88 12C94 14 96 20 94 26C92 30 98 22 104 16C108 12 112 14 112 18" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// TEMPLATE 1 — GRADUATION DEGREE  (Gold / Parchment)
// ─────────────────────────────────────────────────────────────
export function GraduationTemplate({ data, qrUrl }) {
  const tags = Array.isArray(data.skills) ? data.skills : [];
  return (
    <div className="tmpl tmpl-graduation">
      {/* Header row */}
      <div className="grad-header">
        <div className="grad-logo-box">
          <span className="grad-logo-icon">🎓</span>
        </div>

        <div className="grad-title-area">
          <p className="grad-institution">{data.issuer}</p>
          <h2 className="grad-main-title">Degree Certificate</h2>
          <p className="grad-subtitle">
            {data.degree || 'Bachelor of Technology'} · {data.course}
          </p>
        </div>

        <div className="grad-photo-box">
          {data.photo
            ? <img src={data.photo} alt="Candidate" className="grad-photo-img" crossOrigin="anonymous" />
            : <span className="photo-placeholder-icon">👤<br/><small>Photo</small></span>
          }
        </div>
      </div>

      <div className="grad-divider" />

      {/* Body */}
      <div className="grad-body">
        <p className="grad-certify-text">This is to certify that</p>
        <h1 className="grad-name">{data.candidateName || data.recipient}</h1>
        <p className="grad-award-text">
          has been awarded the degree of <strong>{data.degree || 'Bachelor of Technology'}</strong>
        </p>
        <p className="grad-class-text">
          having fulfilled all academic requirements with distinction · Class of {data.graduationYear || new Date(data.date).getFullYear() || '2025'}
        </p>
      </div>

      <div className="grad-divider" />

      {/* Footer */}
      <div className="grad-footer">
        <div className="grad-sig">
          <SignatureA />
          <div className="grad-sig-line" />
          <span className="grad-sig-label">REGISTRAR</span>
        </div>

        <div className="grad-seal">
          <div className="grad-seal-circle">
            <span>UNIV<br/>SEAL</span>
          </div>
        </div>

        <div className="grad-qr-area">
          <QRCodeSVG value={qrUrl} size={60} fgColor="#7a5c00" bgColor="transparent" />
          <span className="grad-qr-label">Scan to verify</span>
        </div>

        <div className="grad-sig grad-sig-right">
          <SignatureB />
          <div className="grad-sig-line" />
          <span className="grad-sig-label">VICE CHANCELLOR</span>
        </div>
      </div>

      {/* Cert ID watermark */}
      <p className="tmpl-cert-id-footer">Certificate ID: {data.id}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 2 — COURSE COMPLETION  (Navy Blue)
// ─────────────────────────────────────────────────────────────
export function CourseCompletionTemplate({ data, qrUrl }) {
  return (
    <div className="tmpl tmpl-course">
      {/* Left navy sidebar */}
      <div className="course-sidebar">
        <div className="course-sidebar-initials">
          {(data.course || 'CS').substring(0, 2).toUpperCase()}
        </div>
        <div className="course-sidebar-photo-wrap">
          {data.photo
            ? <img src={data.photo} alt="Candidate" className="course-sidebar-photo" crossOrigin="anonymous" />
            : <span className="photo-placeholder-icon small">👤<br/><small>Photo</small></span>
          }
        </div>
        <div className="course-sidebar-label">COMPLETION</div>
      </div>

      {/* Right content */}
      <div className="course-content">
        <div className="course-top-row">
          <span className="course-badge-pill">CERTIFICATE OF COMPLETION</span>
          <span className="course-cert-id">ID: {data.id}</span>
        </div>

        <p className="course-certifies-label">THIS CERTIFIES THAT</p>
        <h1 className="course-name">{data.candidateName || data.recipient}</h1>
        <p className="course-completed-text">has successfully completed the course</p>
        <p className="course-title-blue">
          {data.course} · {data.duration || '120 hrs'}
        </p>

        <div className="course-meta-row">
          <div className="course-meta-item">
            <span className="course-meta-label">INSTITUTION</span>
            <span className="course-meta-value">{data.issuer}</span>
          </div>
          <div className="course-meta-item">
            <span className="course-meta-label">DATE</span>
            <span className="course-meta-value">{data.date}</span>
          </div>
          <div className="course-meta-item">
            <span className="course-meta-label">GRADE</span>
            <span className="course-meta-value">{data.grade || 'Distinction'}</span>
          </div>
        </div>

        <div className="course-footer-row">
          <div className="course-sig-block">
            <SignatureC />
            <div className="course-sig-line" />
            <span className="course-sig-label">COURSE DIRECTOR</span>
          </div>
          <div className="course-qr-bottom">
            <QRCodeSVG value={qrUrl} size={55} fgColor="#1e3a8a" bgColor="transparent" />
            <span className="course-qr-label">Scan to verify</span>
          </div>
          <div className="course-sig-block">
            <SignatureD />
            <div className="course-sig-line" />
            <span className="course-sig-label">HEAD OF DEPT.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 3 — SKILL / PROFESSIONAL CERTIFICATION  (Teal/Green)
// ─────────────────────────────────────────────────────────────
export function SkillTemplate({ data, qrUrl }) {
  const skills = Array.isArray(data.skills) ? data.skills
    : typeof data.skills === 'string' ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="tmpl tmpl-skill">
      {/* Top bar */}
      <div className="skill-topbar">
        <div className="skill-topbar-brand">
          <span className="skill-shield">🛡</span>
          <span className="skill-brand-name">CertiSafe Professional</span>
        </div>
        <span className="skill-badge-pill">Skill Certification</span>
      </div>

      {/* Body */}
      <div className="skill-body">
        {/* Left column */}
        <div className="skill-left">
          <div className="skill-photo-wrap">
            {data.photo
              ? <img src={data.photo} alt="Candidate" className="skill-photo-img" crossOrigin="anonymous" />
              : <span className="photo-placeholder-icon">👤<br/><small>Photo</small></span>
            }
          </div>
          <div className="skill-qr-wrap">
            <QRCodeSVG value={qrUrl} size={65} fgColor="#0d9488" bgColor="transparent" />
            <span className="skill-qr-label">Scan to verify</span>
          </div>
        </div>

        {/* Right column */}
        <div className="skill-right">
          <p className="skill-certified-label">CERTIFIED PROFESSIONAL</p>
          <h1 className="skill-name">{data.candidateName || data.recipient}</h1>

          {skills.length > 0 && (
            <div className="skill-tags-row">
              {skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
            </div>
          )}

          <div className="skill-grid">
            <div className="skill-grid-item">
              <span className="skill-grid-label">ISSUED BY</span>
              <span className="skill-grid-value">{data.issuer}</span>
            </div>
            <div className="skill-grid-item">
              <span className="skill-grid-label">VALID UNTIL</span>
              <span className="skill-grid-value">{data.validUntil || 'Lifetime'}</span>
            </div>
            <div className="skill-grid-item">
              <span className="skill-grid-label">LEVEL</span>
              <span className="skill-grid-value">{data.level || 'Professional'}</span>
            </div>
            <div className="skill-grid-item">
              <span className="skill-grid-label">CERT ID</span>
              <span className="skill-grid-value">{data.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="skill-footer">
        <div className="skill-sig-block">
          <SignatureE />
          <div className="skill-sig-line" />
          <span className="skill-footer-label">CERTIFYING AUTHORITY</span>
        </div>
        <span className="skill-verified-badge">✅ Blockchain verified</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 4 — ACHIEVEMENT / HONOR AWARD  (Purple)
// ─────────────────────────────────────────────────────────────
export function AchievementTemplate({ data, qrUrl }) {
  const tags = Array.isArray(data.skills) ? data.skills
    : typeof data.skills === 'string' ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="tmpl tmpl-achievement">
      {/* Top area */}
      <div className="ach-top">
        <div className="ach-award-icon-circle">🏆</div>
        <p className="ach-cert-type-label">CERTIFICATE OF ACHIEVEMENT</p>
        <h2 className="ach-title">{data.awardTitle || 'Award of Excellence'}</h2>
        <p className="ach-institution">{data.issuer}</p>
        <div className="ach-photo-wrap">
          {data.photo
            ? <img src={data.photo} alt="Candidate" className="ach-photo-img" crossOrigin="anonymous" />
            : <span className="photo-placeholder-icon">👤<br/><small>Photo</small></span>
          }
        </div>
        <div className="ach-qr-wrap">
          <QRCodeSVG value={qrUrl} size={60} fgColor="#7c3aed" bgColor="transparent" />
          <span className="ach-qr-label">Scan to verify</span>
        </div>
      </div>

      {/* Purple divider */}
      <div className="ach-divider" />

      {/* Body */}
      <div className="ach-body">
        <p className="ach-awarded-to-label">PROUDLY AWARDED TO</p>
        <h1 className="ach-name">{data.candidateName || data.recipient}</h1>
        <p className="ach-description">
          {data.course || 'In recognition of outstanding performance and exceptional contribution'}
        </p>

        {tags.length > 0 && (
          <div className="ach-tags-row">
            {tags.map((t, i) => <span key={i} className="ach-tag">{t}</span>)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="ach-footer">
        <div className="ach-sig">
          <SignatureA />
          <div className="ach-sig-line" />
          <span className="ach-sig-label">DIRECTOR</span>
        </div>
        <p className="ach-verify-url">
          ID: {data.id} · certisafe.app/verify/{data.id}
        </p>
        <div className="ach-sig">
          <SignatureC />
          <div className="ach-sig-line" />
          <span className="ach-sig-label">DEAN</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 5 — INTERNSHIP / WORK EXPERIENCE  (Dark / Monochrome)
// ─────────────────────────────────────────────────────────────
export function InternshipTemplate({ data, qrUrl }) {
  const skills = Array.isArray(data.skills) ? data.skills
    : typeof data.skills === 'string' ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="tmpl tmpl-internship">
      {/* Dark top bar */}
      <div className="intern-topbar">
        <div className="intern-company-area">
          <span className="intern-company-icon">🏢</span>
          <div>
            <p className="intern-company-name">{data.issuer}</p>
            <p className="intern-company-sub">{data.department || 'Technology'} · {data.location || 'India'}</p>
          </div>
        </div>
        <span className="intern-duration-pill">
          {data.startDate || 'Jun 2024'} – {data.endDate || 'Dec 2024'} · {data.duration || '6 months'}
        </span>
      </div>

      {/* White body */}
      <div className="intern-body">
        {/* Left */}
        <div className="intern-left">
          <div className="intern-photo-wrap">
            {data.photo
              ? <img src={data.photo} alt="Candidate" className="intern-photo-img" crossOrigin="anonymous" />
              : <span className="photo-placeholder-icon">👤<br/><small>Photo</small></span>
            }
          </div>
          <div className="intern-qr-wrap">
            <QRCodeSVG value={qrUrl} size={60} fgColor="#1a1a1a" bgColor="transparent" />
            <span className="intern-qr-label">Scan to verify</span>
          </div>
        </div>

        {/* Right */}
        <div className="intern-right">
          <p className="intern-cert-type">INTERNSHIP CERTIFICATE</p>
          <h1 className="intern-name">{data.candidateName || data.recipient}</h1>
          <p className="intern-role-text">
            {data.role || 'Software Engineering Intern'} · {data.department || 'Blockchain Division'}
          </p>

          {skills.length > 0 && (
            <div className="intern-tags-row">
              {skills.map((s, i) => <span key={i} className="intern-tag">{s}</span>)}
            </div>
          )}

          <div className="intern-grid">
            <div className="intern-grid-item">
              <span className="intern-grid-label">DEPT.</span>
              <span className="intern-grid-value">{data.department || 'Engineering'}</span>
            </div>
            <div className="intern-grid-item">
              <span className="intern-grid-label">PERFORMANCE</span>
              <span className="intern-grid-value">{data.grade || 'Outstanding'}</span>
            </div>
            <div className="intern-grid-item">
              <span className="intern-grid-label">CERT ID</span>
              <span className="intern-grid-value">{data.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="intern-footer">
        <div className="intern-sigs">
          <div className="intern-sig-item">
            <SignatureB />
            <div className="intern-sig-line" />
            <span>HR MANAGER</span>
          </div>
          <div className="intern-sig-item">
            <SignatureD />
            <div className="intern-sig-line" />
            <span>CTO</span>
          </div>
        </div>
        <span className="intern-verified-badge">✅ Verified on blockchain</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROUTER — picks the right template
// ─────────────────────────────────────────────────────────────
export default function CertificateRenderer({ data, qrUrl }) {
  const type = (data?.certType || data?.type || '').toLowerCase();

  if (type.includes('graduation') || type.includes('degree'))
    return <GraduationTemplate data={data} qrUrl={qrUrl} />;
  if (type.includes('course') || type.includes('completion'))
    return <CourseCompletionTemplate data={data} qrUrl={qrUrl} />;
  if (type.includes('skill') || type.includes('professional'))
    return <SkillTemplate data={data} qrUrl={qrUrl} />;
  if (type.includes('achievement') || type.includes('honor') || type.includes('award'))
    return <AchievementTemplate data={data} qrUrl={qrUrl} />;
  if (type.includes('internship') || type.includes('work'))
    return <InternshipTemplate data={data} qrUrl={qrUrl} />;

  // fallback → graduation
  return <GraduationTemplate data={data} qrUrl={qrUrl} />;
}
