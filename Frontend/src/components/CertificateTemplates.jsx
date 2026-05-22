import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

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
            ? <img src={data.photo} alt="Candidate" className="grad-photo-img" />
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
            ? <img src={data.photo} alt="Candidate" className="course-sidebar-photo" />
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

        <div className="course-qr-bottom">
          <QRCodeSVG value={qrUrl} size={55} fgColor="#1e3a8a" bgColor="transparent" />
          <span className="course-qr-label">Scan to verify</span>
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
              ? <img src={data.photo} alt="Candidate" className="skill-photo-img" />
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
        <span className="skill-footer-label">CERTIFYING AUTHORITY</span>
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
            ? <img src={data.photo} alt="Candidate" className="ach-photo-img" />
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
          <div className="ach-sig-line" />
          <span className="ach-sig-label">DIRECTOR</span>
        </div>
        <p className="ach-verify-url">
          ID: {data.id} · certisafe.app/verify/{data.id}
        </p>
        <div className="ach-sig">
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
              ? <img src={data.photo} alt="Candidate" className="intern-photo-img" />
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
            <div className="intern-sig-line" />
            <span>HR MANAGER</span>
          </div>
          <div className="intern-sig-item">
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
